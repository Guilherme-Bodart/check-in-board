"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import type { MeResponse } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import { changePassword, fetchMe } from "../auth/auth-api";

const roleLabels: Record<string, string> = {
  co_host: "Co-host",
  host_admin: "Administrador",
  team: "Equipe",
};

export function SettingsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadAccount() {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      setMe(await fetchMe(session.token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar conta.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  const primaryMembership = useMemo(
    () => me?.memberships.find((membership) => membership.isActive) ?? null,
    [me],
  );

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    setMessage("");
    setSuccessMessage("");

    if (!session) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("A confirmacao de senha nao confere.");
      return;
    }

    setIsSaving(true);

    try {
      await changePassword(session.token, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Senha alterada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao alterar senha.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={UserRound}
          label="Usuario"
          value={me?.user.fullName ?? "Carregando"}
        />
        <InfoCard
          icon={Building2}
          label="Organizacao"
          value={primaryMembership?.organization.name ?? "Carregando"}
        />
        <InfoCard
          icon={ShieldCheck}
          label="Perfil"
          value={
            primaryMembership
              ? roleLabels[primaryMembership.role] ?? primaryMembership.role
              : "Carregando"
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Conta
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            Dados da sua sessao
          </h2>

          {message ? (
            <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {message}
            </p>
          ) : null}
          {successMessage ? (
            <p className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
              {successMessage}
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <tbody className="divide-y divide-border bg-surface">
                <AccountRow label="Nome" value={me?.user.fullName} loading={isLoading} />
                <AccountRow label="Email" value={me?.user.email} loading={isLoading} />
                <AccountRow
                  label="Organizacao"
                  value={primaryMembership?.organization.name}
                  loading={isLoading}
                />
                <AccountRow
                  label="Permissao"
                  value={
                    primaryMembership
                      ? roleLabels[primaryMembership.role] ?? primaryMembership.role
                      : undefined
                  }
                  loading={isLoading}
                />
              </tbody>
            </table>
          </div>
        </div>

        <form
          className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
          onSubmit={submitPassword}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <KeyRound aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Seguranca
              </p>
              <h2 className="text-lg font-semibold text-text-primary">
                Alterar senha
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Senha atual">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                minLength={8}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </Field>
            <Field label="Nova senha">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </Field>
          </div>

          <button
            className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Salvando..." : "Alterar senha"}
          </button>
        </form>
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block truncate text-xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}

function AccountRow({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value?: string;
}) {
  return (
    <tr>
      <th className="w-44 bg-surface-muted px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </th>
      <td className="px-4 py-4 text-text-secondary">
        {loading ? "Carregando..." : value ?? "-"}
      </td>
    </tr>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary">
      {label}
      {children}
    </label>
  );
}
