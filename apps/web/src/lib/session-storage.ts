import type { AuthResponse } from "../api";

const sessionStorageKey = "check-in-board-web-session";

export type Session = {
  token: string;
  user: AuthResponse["user"];
};

export function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(sessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as Session;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function writeStoredSession(session: Session) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(sessionStorageKey);
}
