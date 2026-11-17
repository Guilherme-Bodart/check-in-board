import type { Apartment, RentalStay, Reservation } from "../../api";
import { messages } from "../../i18n";
export { formatDateBR } from "../../lib/date-formatters";

export type ReservationListItem = Reservation & {
  apartmentName: string;
  ownerName: string;
  apartment?: Apartment;
};

export function attachApartmentDetails(
  reservations: Reservation[],
  apartments: Apartment[],
) {
  const apartmentById = new Map(
    apartments.map((apartment) => [apartment.id, apartment]),
  );

  return reservations
    .map((reservation) => {
      const apartment = apartmentById.get(reservation.apartmentId);

      return {
        ...reservation,
        apartment,
        apartmentName: apartment?.name ?? messages.reservations.apartmentRemoved,
        ownerName: apartment?.owner?.name ?? messages.reservations.ownerMissing,
      };
    })
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

export function reservationLocalDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value.slice(0, 10);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return value.slice(0, 10);
  }
}

export function nightsBetween(startsAt: string, endsAt: string) {
  const startYmd = reservationLocalDate(startsAt);
  const endYmd = reservationLocalDate(endsAt);

  const start = Date.parse(`${startYmd}T00:00:00Z`);
  const end = Date.parse(`${endYmd}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 86_400_000);
}

export function isGenericGuestReservation(
  reservation: Pick<Reservation, "guestName" | "rawSummary">,
): boolean {
  const summary = reservation.rawSummary?.toLowerCase() ?? "";
  return (
    !reservation.guestName?.trim() ||
    summary.includes("reserved") ||
    summary.includes("airbnb")
  );
}

export function getReservationDisplayGuest(
  reservation: Pick<Reservation, "guestName" | "rawSummary">,
  fallback = "Hóspede Não Identificado",
): string {
  return (
    reservation.guestName?.trim() ||
    reservation.rawSummary?.trim() ||
    fallback
  );
}

export function needsReservationAttention(
  reservation: Pick<Reservation, "guestName" | "rawSummary">,
  stay?: RentalStay | null,
): boolean {
  return (
    !stay ||
    stay.rentAmountCents <= 0 ||
    isGenericGuestReservation(reservation)
  );
}

export function isCancelledReservation(
  reservation: Pick<Reservation, "status">,
): boolean {
  return reservation.status?.toLowerCase() === "cancelled";
}

export function filterActiveReservations<T extends Pick<Reservation, "status">>(
  reservations: T[],
): T[] {
  return reservations.filter((reservation) => !isCancelledReservation(reservation));
}

export function findConflictingReservation<T extends Reservation>(
  reservations: T[],
  candidate: { id?: string; apartmentId: string; startsAt: string; endsAt: string },
): T | null {
  const candidateStart = reservationLocalDate(candidate.startsAt);
  const candidateEnd = reservationLocalDate(candidate.endsAt);

  if (!candidate.apartmentId || !candidateStart || !candidateEnd) {
    return null;
  }

  for (const reservation of reservations) {
    if (isCancelledReservation(reservation)) {
      continue;
    }
    if (candidate.id && reservation.id === candidate.id) {
      continue;
    }
    if (reservation.apartmentId !== candidate.apartmentId) {
      continue;
    }

    const resStart = reservationLocalDate(reservation.startsAt);
    const resEnd = reservationLocalDate(reservation.endsAt);
    if (!resStart || !resEnd) {
      continue;
    }

    const isTurnover = resEnd === candidateStart || candidateEnd === resStart;
    if (!isTurnover && candidateStart < resEnd && candidateEnd > resStart) {
      return reservation;
    }
  }

  return null;
}

export function hasDayReservationConflict(
  reservations: Reservation[],
  date: string,
): boolean {
  const targetDate = reservationLocalDate(date);
  const activeReservations = filterActiveReservations(reservations);
  if (!targetDate || activeReservations.length < 2) {
    return false;
  }

  for (let i = 0; i < activeReservations.length; i += 1) {
    const a = activeReservations[i];
    const aStart = reservationLocalDate(a.startsAt);
    const aEnd = reservationLocalDate(a.endsAt);

    for (let j = i + 1; j < activeReservations.length; j += 1) {
      const b = activeReservations[j];
      if (a.apartmentId !== b.apartmentId) {
        continue;
      }

      const bStart = reservationLocalDate(b.startsAt);
      const bEnd = reservationLocalDate(b.endsAt);
      const isTurnover = aEnd === bStart || bEnd === aStart;

      if (
        !isTurnover &&
        targetDate >= aStart &&
        targetDate <= aEnd &&
        targetDate >= bStart &&
        targetDate <= bEnd
      ) {
        return true;
      }
    }
  }

  return false;
}
