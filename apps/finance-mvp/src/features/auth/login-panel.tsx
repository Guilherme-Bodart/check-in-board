"use client";

import { FormEvent, useEffect, useState } from "react";

import { signIn, type AuthResponse } from "../../lib/api";
import { clearSession, readStoredSession, storeSession } from "../../lib/session";
import { FinanceDashboard } from "../dashboard/finance-dashboard";

export function LoginPanel() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const nextSession = await signIn(email.trim(), password);
      storeSession(nextSession);
      setSession(nextSession);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  if (session) {
    return <FinanceDashboard onLogout={logout} session={session} />;
  }

  return (
    <form className="panel" onSubmit={submit}>
      <p className="eyebrow">Check-In Board</p>
      <h1>Entrar no financeiro</h1>
      <label>
        Email
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Senha
        <input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {message ? <p className="error">{message}</p> : null}
      <button disabled={isLoading} type="submit">
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
