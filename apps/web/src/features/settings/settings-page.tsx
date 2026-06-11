"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, KeyRound, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import type { MeResponse } from "../../api";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { fetchMe } from "../auth/auth-api";

const roleLabels: Record<string, string> = {
  co_host: "Co-host",
  host_admin: "Administrador",
  team: "Equipe",
};

export function SettingsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Acesse dados da conta, segurança e gerenciamento da equipe."
        eyebrow="Conta"
        title="Configurações"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={UserRound}
          label="Usuário"
          value={me?.user.fullName ?? "Carregando"}
        />
        <InfoCard
          icon={Building2}
          label="Organização"
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

      <Panel>
        {message ? (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <tbody className="divide-y divide-border bg-surface">
              <AccountRow label="Nome" value={me?.user.fullName} loading={isLoading} />
              <AccountRow label="Email" value={me?.user.email} loading={isLoading} />
              <AccountRow
                label="Organização"
                value={primaryMembership?.organization.name}
                loading={isLoading}
              />
              <AccountRow
                label="Permissão"
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
      </Panel>

      <section className="grid gap-4 md:grid-cols-2">
        <SettingsLink
          description="Troque sua senha de acesso."
          href="/configuracoes/seguranca"
          icon={KeyRound}
          title="Segurança"
        />
        <SettingsLink
          description="Gerencie membros, papéis e permissões por apartamento."
          href="/configuracoes/equipe"
          icon={UsersRound}
          title="Equipe"
        />
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
    <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
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

function SettingsLink({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: typeof KeyRound;
  title: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-surface p-5 shadow-sm transition hover:border-primary"
      href={href}
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
    </Link>
  );
}
