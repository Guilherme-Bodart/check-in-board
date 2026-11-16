"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AuthRole } from "../../api";
import { readStoredSession, type Session } from "../../lib/session-storage";

export type SessionContextValue = {
  session: Session | null;
  userRole: AuthRole | null;
  isHostAdmin: boolean;
  isCoHost: boolean;
  isReady: boolean;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function noop() {}

export function SessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useAuthSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (context) {
    return context;
  }

  return {
    session: readStoredSession(),
    userRole: null,
    isHostAdmin: false,
    isCoHost: false,
    isReady: false,
    signOut: noop,
  };
}
