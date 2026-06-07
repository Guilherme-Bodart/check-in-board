"use client";

import { FormEvent, useEffect, useState } from "react";

import { signIn, signUp, type AuthResponse } from "../../lib/api";
import { clearSession, readStoredSession, storeSession } from "../../lib/session";
import { FinanceDashboard } from "../dashboard/finance-dashboard";

type AuthMode = "sign-in" | "sign-up";

export function LoginPanel() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
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
      const nextSession =
        mode === "sign-in"
          ? await signIn(email.trim(), password)
          : await signUp({
              email: email.trim(),
              fullName: fullName.trim(),
              organizationName: organizationName.trim(),
              password,
            });
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
      <h1>{mode === "sign-in" ? "Entrar no financeiro" : "Criar conta"}</h1>
      {mode === "sign-up" ? (
        <>
          <label>
            Nome
            <input
              autoComplete="name"
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
          <label>
            Nome da operação
            <input
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Ex: Operação da Ana"
              required
              value={organizationName}
            />
          </label>
        </>
      ) : null}
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
        {isLoading
          ? mode === "sign-in"
            ? "Entrando..."
            : "Criando..."
          : mode === "sign-in"
            ? "Entrar"
            : "Criar conta"}
      </button>
      <button
        className="secondary-button"
        onClick={() => {
          setMessage("");
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
        }}
        type="button"
      >
        {mode === "sign-in" ? "Criar uma conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
