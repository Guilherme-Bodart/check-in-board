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
  listApartmentSyncTargets(
    userId: string,
    apartmentId: string,
  ): Promise<IcalSourceSyncTarget[]>;
  listAccessibleReservationsForDate(
    userId: string,
    startsBefore: Date,
    endsAfter: Date,
  ): Promise<AccessibleReservationSummary[]>;
  listReservations(apartmentId: string): Promise<ReservationSummary[]>;
  markIcalSourceSyncFailure(
    icalSourceId: string,
    failedAt: Date,
  ): Promise<void>;
  markIcalSourceSyncSuccess(
    icalSourceId: string,
    syncedAt: Date,
  ): Promise<void>;
  upsertReservation(input: UpsertReservationInput): Promise<ReservationSummary>;
}
