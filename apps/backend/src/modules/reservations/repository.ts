import type {
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
  listReservations(apartmentId: string): Promise<ReservationSummary[]>;
  upsertReservation(input: UpsertReservationInput): Promise<ReservationSummary>;
}
