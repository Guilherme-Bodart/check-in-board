import { parseIcalReservations } from "../../integrations/ical/parser.js";
import { decryptSecret } from "../../shared/encryption.js";
import type { Env } from "../../shared/env.js";
import {
  assertSafeIcalUrl,
  IcalUrlPolicyError,
} from "../ical-sources/url-policy.js";
import type { ReservationsRepository } from "./repository.js";
import type { IcalSourceSyncTarget } from "./types.js";

const maxIcalBytes = 2_000_000;
const syncIntervalMs = 30 * 60 * 1000;

export class ReservationsServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "BAD_REQUEST" | "SYNC_FETCH_FAILED",
    message: string,
  ) {
    super(message);
  }
}

function canManageSync(target: {
  canManageIntegrations: boolean;
  role: string;
}) {
  return target.role === "host_admin" || target.canManageIntegrations;
}

async function fetchIcalText(icalUrl: string) {
  try {
    await assertSafeIcalUrl(icalUrl);
  } catch (error) {
    if (error instanceof IcalUrlPolicyError) {
      throw new ReservationsServiceError("SYNC_FETCH_FAILED", error.message);
    }

    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(icalUrl, {
      headers: {
        Accept: "text/calendar,text/plain,*/*",
        "User-Agent": "Check-In Board iCal Sync/0.1",
      },
      redirect: "manual",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ReservationsServiceError(
        "SYNC_FETCH_FAILED",
        `iCal source returned HTTP ${response.status}.`,
      );
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (contentLength > maxIcalBytes) {
      throw new ReservationsServiceError(
        "SYNC_FETCH_FAILED",
        "iCal source is too large.",
      );
    }

    const reader = response.body?.getReader();

    if (!reader) {
      return await response.text();
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.length;

      if (totalBytes > maxIcalBytes) {
        throw new ReservationsServiceError(
          "SYNC_FETCH_FAILED",
          "iCal source is too large.",
        );
      }

      chunks.push(value);
    }

    return new TextDecoder().decode(Buffer.concat(chunks));
  } catch (error) {
    if (error instanceof ReservationsServiceError) {
      throw error;
    }

    throw new ReservationsServiceError(
      "SYNC_FETCH_FAILED",
      "Could not fetch this iCal source right now.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getLastSyncAttemptAt(target: IcalSourceSyncTarget): Date | null {
  const attempts = [target.lastSuccessAt, target.lastFailureAt]
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (attempts.length === 0) {
    return null;
  }

  return attempts.sort((left, right) => right.getTime() - left.getTime())[0];
}

function canRunStoredSync(target: IcalSourceSyncTarget, now = new Date()) {
  if (!target.syncEnabled) {
    return false;
  }

  const lastAttempt = getLastSyncAttemptAt(target);

  return (
    !lastAttempt || now.getTime() - lastAttempt.getTime() >= syncIntervalMs
  );
}

async function syncTargetReservations(
  target: IcalSourceSyncTarget,
  repository: ReservationsRepository,
  feedText: string,
  actorUserId: string | null,
) {
  const parsedReservations = parseIcalReservations(feedText);
  const reservations = [];

  for (const parsedReservation of parsedReservations) {
    reservations.push(
      await repository.upsertReservation({
        ...parsedReservation,
        apartmentId: target.apartmentId,
        icalSourceId: target.id,
      }),
    );
  }

  await repository.markIcalSourceSyncSuccess(target.id, new Date());
  await repository.recordIcalSyncAudit({
    actorUserId,
    apartmentId: target.apartmentId,
    icalSourceId: target.id,
    organizationId: target.organizationId,
    status: "succeeded",
  });

  return {
    reservations,
    summary: {
      eventsSeen: parsedReservations.length,
      reservationsUpserted: reservations.length,
      syncSkipped: false,
      syncSkippedReason: null,
    },
  };
}

export async function listReservationsForApartment(
  userId: string,
  apartmentId: string,
  repository: ReservationsRepository,
  env: Env,
) {
  const canView = await repository.getApartmentCanView(userId, apartmentId);

  if (!canView) {
    throw new ReservationsServiceError(
      "FORBIDDEN",
      "You do not have access to this apartment.",
    );
  }

  await syncStaleIcalSourcesForApartment(userId, apartmentId, repository, env);

  return await repository.listReservations(apartmentId);
}

export async function syncStaleIcalSourcesForApartment(
  userId: string,
  apartmentId: string,
  repository: ReservationsRepository,
  env: Env,
) {
  const targets = await repository.listApartmentSyncTargets(
    userId,
    apartmentId,
  );

  for (const target of targets.filter((source) => canRunStoredSync(source))) {
    try {
      await syncTargetReservations(
        target,
        repository,
        await fetchIcalText(decryptSecret(target.icalUrlEncrypted, env)),
        null,
      );
    } catch {
      await repository.markIcalSourceSyncFailure(target.id, new Date());
      await repository.recordIcalSyncAudit({
        actorUserId: null,
        apartmentId: target.apartmentId,
        icalSourceId: target.id,
        organizationId: target.organizationId,
        status: "failed",
      });
    }
  }
}

export async function syncIcalSourceFromText(
  userId: string,
  icalSourceId: string,
  icsText: string | undefined,
  repository: ReservationsRepository,
  env: Env,
) {
  const target = await repository.getIcalSourceSyncTarget(userId, icalSourceId);

  if (!target || !canManageSync(target)) {
    throw new ReservationsServiceError(
      "FORBIDDEN",
      "You do not have permission to sync this iCal source.",
    );
  }

  try {
    if (!icsText && !canRunStoredSync(target)) {
      await repository.recordIcalSyncAudit({
        actorUserId: userId,
        apartmentId: target.apartmentId,
        icalSourceId: target.id,
        organizationId: target.organizationId,
        status: "skipped",
      });

      return {
        reservations: [],
        summary: {
          eventsSeen: 0,
          reservationsUpserted: 0,
          syncSkipped: true,
          syncSkippedReason: "This iCal source was synced recently.",
        },
      };
    }

    const feedText =
      icsText ??
      (await fetchIcalText(decryptSecret(target.icalUrlEncrypted, env)));

    return await syncTargetReservations(target, repository, feedText, userId);
  } catch (error) {
    await repository.markIcalSourceSyncFailure(target.id, new Date());
    await repository.recordIcalSyncAudit({
      actorUserId: userId,
      apartmentId: target.apartmentId,
      icalSourceId: target.id,
      organizationId: target.organizationId,
      status: "failed",
    });
    throw error;
  }
}
