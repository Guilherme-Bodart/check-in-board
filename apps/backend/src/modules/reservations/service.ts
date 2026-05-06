import { parseIcalReservations } from "../../integrations/ical/parser.js";
import type { ReservationsRepository } from "./repository.js";

export class ReservationsServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "BAD_REQUEST" | "SYNC_FETCH_FAILED",
    message: string,
  ) {
    super(message);
  }
}

function decodeIcalUrl(icalUrlEncrypted: string): string {
  // Mirrors the MVP placeholder encoding used when creating iCal sources.
  return Buffer.from(icalUrlEncrypted, "base64").toString("utf8");
}

function canManageSync(target: { canManageIntegrations: boolean; role: string }) {
  return target.role === "host_admin" || target.canManageIntegrations;
}

async function fetchIcalText(icalUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(icalUrl, {
      headers: {
        Accept: "text/calendar,text/plain,*/*",
        "User-Agent": "Check-In Board iCal Sync/0.1",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ReservationsServiceError(
        "SYNC_FETCH_FAILED",
        `iCal source returned HTTP ${response.status}.`,
      );
    }

    return await response.text();
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

export async function listReservationsForApartment(
  userId: string,
  apartmentId: string,
  repository: ReservationsRepository,
) {
  const canView = await repository.getApartmentCanView(userId, apartmentId);

  if (!canView) {
    throw new ReservationsServiceError(
      "FORBIDDEN",
      "You do not have access to this apartment.",
    );
  }

  return await repository.listReservations(apartmentId);
}

export async function syncIcalSourceFromText(
  userId: string,
  icalSourceId: string,
  icsText: string | undefined,
  repository: ReservationsRepository,
) {
  const target = await repository.getIcalSourceSyncTarget(userId, icalSourceId);

  if (!target || !canManageSync(target)) {
    throw new ReservationsServiceError(
      "FORBIDDEN",
      "You do not have permission to sync this iCal source.",
    );
  }

  const reservations = [];
  let eventsSeen = 0;

  try {
    const feedText =
      icsText ?? (await fetchIcalText(decodeIcalUrl(target.icalUrlEncrypted)));
    const parsedReservations = parseIcalReservations(feedText);

    eventsSeen = parsedReservations.length;

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
  } catch (error) {
    await repository.markIcalSourceSyncFailure(target.id, new Date());
    throw error;
  }

  return {
    reservations,
    summary: {
      eventsSeen,
      reservationsUpserted: reservations.length,
    },
  };
}
