import { apiRequest } from "../../api";

export type SyncChangeItem = {
  reservationId: string;
  changeType: "created" | "cancelled";
  guestName: string | null;
  rawSummary: string | null;
  startsAt: string;
  endsAt: string;
};

export type SyncNotificationItem = {
  id: string;
  icalSourceId: string;
  apartmentId: string;
  apartmentName: string;
  provider: string;
  sourceLabel: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string | null;
  eventsSeen: number;
  reservationsUpserted: number;
  reservationsCreated: number;
  reservationsUpdated: number;
  reservationsCancelled: number;
  errorMessage: string | null;
  changes: SyncChangeItem[];
};

export type AutoSyncResponse = {
  sourcesChecked: number;
  sourcesSynced: number;
  notableRuns: SyncNotificationItem[];
};

export type SyncNotificationsResponse = {
  notifications: SyncNotificationItem[];
};

export const READ_SYNC_NOTIFICATIONS_KEY = "cib-read-sync-notifications";
export const LAST_AUTO_SYNC_AT_KEY = "cib-last-auto-sync-at";
export const NOTIFICATIONS_UPDATED_EVENT = "cib-sync-notifications-updated";

export async function fetchSyncNotifications(
  token: string,
): Promise<SyncNotificationItem[]> {
  const response = await apiRequest<SyncNotificationsResponse>("/notifications/sync", {
    token,
  });

  return response.notifications;
}

export async function triggerAutoSync(token: string): Promise<AutoSyncResponse> {
  const response = await apiRequest<AutoSyncResponse>("/ical-sources/auto-sync", {
    method: "POST",
    token,
  });

  setLastAutoSyncAt();
  return response;
}

export function getReadSyncNotificationIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(READ_SYNC_NOTIFICATIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function markSyncNotificationAsRead(id: string): string[] {
  const current = getReadSyncNotificationIds();
  if (current.includes(id)) {
    return current;
  }

  const next = [...current, id];
  persistReadIds(next);
  return next;
}

export function markAllSyncNotificationsAsRead(ids: string[]): string[] {
  const current = new Set(getReadSyncNotificationIds());
  for (const id of ids) {
    current.add(id);
  }

  const next = Array.from(current);
  persistReadIds(next);
  return next;
}

export function getLastAutoSyncAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LAST_AUTO_SYNC_AT_KEY);
  if (!raw) {
    return null;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function setLastAutoSyncAt(timestamp = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAST_AUTO_SYNC_AT_KEY, String(timestamp));
}

function persistReadIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(READ_SYNC_NOTIFICATIONS_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}
