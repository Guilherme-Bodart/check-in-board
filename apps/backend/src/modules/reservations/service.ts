import { parseIcalReservations } from "../../integrations/ical/parser.js";
import type { ReservationsRepository } from "./repository.js";

export class ReservationsServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
  }
}

function canManageSync(target: { canManageIntegrations: boolean; role: string }) {
  return target.role === "host_admin" || target.canManageIntegrations;
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
  if (!icsText) {
    throw new ReservationsServiceError(
      "BAD_REQUEST",
      "Manual sync requires icsText in this development endpoint.",
    );
  }

  const target = await repository.getIcalSourceSyncTarget(userId, icalSourceId);

  if (!target || !canManageSync(target)) {
    throw new ReservationsServiceError(
      "FORBIDDEN",
      "You do not have permission to sync this iCal source.",
    );
  }

  const parsedReservations = parseIcalReservations(icsText);
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

  return {
    reservations,
    summary: {
      eventsSeen: parsedReservations.length,
      reservationsUpserted: reservations.length,
    },
  };
}
