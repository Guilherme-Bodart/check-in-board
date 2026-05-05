import type {
  AccessibleReservationSummary,
  IcalSourceSyncTarget,
  ReservationSummary,
  UpsertReservationInput,
} from "./types.js";

export interface ReservationsRepository {
  getApartmentCanView(userId: string, apartmentId: string): Promise<boolean>;
  getIcalSourceSyncTarget(
    userId: string,
    icalSourceId: string,
  ): Promise<IcalSourceSyncTarget | null>;
  listAccessibleReservationsForDate(
    userId: string,
    startsBefore: Date,
    endsAfter: Date,
  ): Promise<AccessibleReservationSummary[]>;
  listReservations(apartmentId: string): Promise<ReservationSummary[]>;
  upsertReservation(input: UpsertReservationInput): Promise<ReservationSummary>;
}
