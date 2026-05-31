"use client";

import { FormEvent, useState } from "react";

import { apiBaseUrl } from "../../api";
import { messages } from "../../i18n";
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
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {messages.common.appName}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
            {mode === "sign-in" ? messages.auth.signInTitle : messages.auth.signUpTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {messages.auth.supportingText}
          </p>
        </div>

        <form className="mt-7 grid gap-4" onSubmit={submitAuth}>
          <label className="grid gap-2 text-sm font-medium text-text-secondary">
            {messages.auth.email}
            <input
              autoComplete="email"
              className="h-11 rounded-xl border border-border bg-surface px-3 text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) => updateField("email", event.target.value)}
              required
              type="email"
              value={values.email}
            />
          </label>
          {mode === "sign-up" ? (
            <>
              <label className="grid gap-2 text-sm font-medium text-text-secondary">
                {messages.auth.fullName}
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  required
                  type="text"
                  value={values.fullName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-text-secondary">
                {messages.auth.organizationName}
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => updateField("organizationName", event.target.value)}
                  type="text"
                  value={values.organizationName}
                />
              </label>
            </>
          ) : null}
          <label className="grid gap-2 text-sm font-medium text-text-secondary">
            {messages.auth.password}
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="h-11 rounded-xl border border-border bg-surface px-3 text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              minLength={8}
              onChange={(event) => updateField("password", event.target.value)}
              required
              type="password"
              value={values.password}
            />
          </label>
          <button
            className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
            type="submit"
          >
            {mode === "sign-in" ? messages.auth.signInCta : messages.auth.signUpCta}
          </button>
        </form>

        <button
          className="mt-3 h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          type="button"
        >
          {mode === "sign-in" ? messages.auth.switchToSignUp : messages.auth.switchToSignIn}
        </button>

        {message ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}
        <p className="mt-5 rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-medium text-text-muted">
          {messages.auth.apiBaseUrlLabel}: {apiBaseUrl}
        </p>
      </section>
    </main>
  );
}
