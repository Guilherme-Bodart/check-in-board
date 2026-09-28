import type { Apartment, Reservation } from "../../api";
import { messages } from "../../i18n";

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

export function formatDateBR(value: string): string {
  if (!value) return "";
  const ymd = reservationLocalDate(value);
  const parts = ymd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return value;
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
