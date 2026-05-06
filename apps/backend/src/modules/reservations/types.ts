export type ReservationSummary = {
  id: string;
  apartmentId: string;
  icalSourceId: string;
  externalEventKey: string;
  externalUid: string | null;
  status: "confirmed" | "cancelled" | "missing_in_feed";
  startsAt: string;
  endsAt: string;
  rawSummary: string | null;
  provider: string | null;
};

export type UpsertReservationInput = {
  apartmentId: string;
  icalSourceId: string;
  externalEventKey: string;
  externalUid: string | null;
  startsAt: Date;
  endsAt: Date;
  rawSummary: string | null;
  rawPayload: unknown;
};

export type IcalSourceSyncTarget = {
  id: string;
  apartmentId: string;
  provider: string;
  icalUrlEncrypted: string;
  canView: boolean;
  canManageIntegrations: boolean;
  role: string;
};

export type AccessibleReservationSummary = ReservationSummary & {
  apartmentName: string;
};
