"use client";

import { FormEvent, useState } from "react";

import { apiBaseUrl } from "../../api";
import type { AuthFormValues, AuthMode } from "../dashboard/types";

type AuthPanelProps = {
  message: string;
  onSubmit: (mode: AuthMode, values: AuthFormValues) => Promise<void>;
};

const initialValues: AuthFormValues = {
  email: "",
  fullName: "",
  organizationName: "",
  password: "",
};

export function AuthPanel({ message, onSubmit }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [values, setValues] = useState<AuthFormValues>(initialValues);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(mode, values);
  }

  function updateField(field: keyof AuthFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="authShell">
      <section className="authPanel">
        <div>
          <p className="eyebrow">Check-In Board</p>
          <h1>{mode === "sign-in" ? "Entrar no painel" : "Criar primeira conta"}</h1>
        </div>

        <form className="formStack" onSubmit={submitAuth}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => updateField("email", event.target.value)}
              required
              type="email"
              value={values.email}
            />
          </label>
          {mode === "sign-up" ? (
            <>
              <label>
                Nome
                <input
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                  type="text"
                  value={values.fullName}
                />
              </label>
              <label>
                Organização
                <input
                  onChange={(event) => updateField("organizationName", event.target.value)}
                  type="text"
                  value={values.organizationName}
                />
              </label>
            </>
          ) : null}
          <label>
            Senha
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              onChange={(event) => updateField("password", event.target.value)}
              required
              type="password"
              value={values.password}
            />
          </label>
          <button type="submit">{mode === "sign-in" ? "Entrar" : "Criar conta"}</button>
        </form>

        <button
          className="ghostButton"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          type="button"
        >
          {mode === "sign-in" ? "Criar conta" : "Já tenho conta"}
        </button>

        {message ? <p className="message error">{message}</p> : null}
        <p className="apiPill">{apiBaseUrl}</p>
      </section>
    </main>
  );
}
