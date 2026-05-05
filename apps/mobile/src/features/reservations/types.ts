export type Reservation = {
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
