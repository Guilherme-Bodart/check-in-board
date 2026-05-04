import { createContext, useEffect, useState, type ReactNode } from "react";

import { authenticateWithDevAuth } from "./services/auth-service";
import {
  clearSessionStorage,
  persistSession,
  readSession,
} from "./services/session-storage";
import type { AuthContextValue, AuthSession, AuthSubmitInput } from "./types";

export const AuthSessionContext = createContext<AuthContextValue | null>(null);

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const storedSession = await readSession();

        if (mounted) {
          setSession(storedSession);
        }
      } finally {
        if (mounted) {
          setIsHydrating(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(input: AuthSubmitInput) {
    const nextSession = await authenticateWithDevAuth(input);
    setSession(nextSession);
    await persistSession(nextSession);
  }

  async function signOut() {
    setSession(null);
    await clearSessionStorage();
  }

  const value: AuthContextValue = {
    isHydrating,
    session,
    signIn,
    signOut,
  };

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
