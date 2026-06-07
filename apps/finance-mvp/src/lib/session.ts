import type { AuthResponse } from "./api";

const storageKey = "finance-mvp-session";

export type StoredSession = AuthResponse;

export function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeSession(session: StoredSession) {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(storageKey);
}
