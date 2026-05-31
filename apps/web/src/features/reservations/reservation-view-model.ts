import type { Apartment, Reservation } from "../../api";
import { messages } from "../../i18n";

export type ReservationListItem = Reservation & {
  apartmentName: string;
  ownerName: string;
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
        apartmentName: apartment?.name ?? messages.reservations.apartmentRemoved,
        ownerName: apartment?.owner?.name ?? messages.reservations.ownerMissing,
      };
    })
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

export function reservationLocalDate(value: string) {
  return value.slice(0, 10);
}

export function nightsBetween(startsAt: string, endsAt: string) {
  const start = Date.parse(reservationLocalDate(startsAt));
  const end = Date.parse(reservationLocalDate(endsAt));

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 86_400_000);
}
