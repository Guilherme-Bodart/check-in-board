export const roles = ["host_admin", "co_host", "team"] as const;

export const taskStatuses = ["pending", "done", "not_done", "cancelled"] as const;

export const reservationStatuses = [
  "confirmed",
  "cancelled",
  "missing_in_feed",
] as const;
