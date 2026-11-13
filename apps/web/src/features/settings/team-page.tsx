"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserPlus, UsersRound } from "lucide-react";

import type { AuthRole, TeamMember } from "../../api";
import { Badge } from "../../components/ui/badge";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { deactivateTeamMember, fetchTeamMembers } from "./team-api";

const roleLabels: Record<AuthRole, string> = {
  co_host: "Admin-Proprietário",
  host_admin: "Admin Geral",
  team: "Equipe",
};

export function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberToDeactivate, setMemberToDeactivate] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTeam() {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      setTeamMembers(await fetchTeamMembers(session.token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar equipe.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, []);

  const summary = useMemo(
    () => ({
      total: teamMembers.length,
      coHosts: teamMembers.filter((member) => member.role === "co_host").length,
      admins: teamMembers.filter((member) => member.role === "host_admin").length,
    }),
    [teamMembers],
  );

  async function deactivateMember() {
    const session = readStoredSession();

    if (!session || !memberToDeactivate) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deactivateTeamMember(session.token, memberToDeactivate.membershipId);
      setMemberToDeactivate(null);
      await loadTeam();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao desativar membro.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actionHref="/configuracoes/equipe/novo"
        actionIcon={Plus}
        actionLabel="Novo acesso"
        description="Gerencie acessos de Admin Geral e de Admin-Proprietário. Cada proprietário convidado visualiza apenas a agenda, as reservas e os resultados financeiros dos apartamentos vinculados a ele."
        eyebrow="Configurações"
        title="Administradores & Proprietários Convidados"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniMetric label="Total de acessos" value={summary.total} />
        <MiniMetric label="Admin Geral" value={summary.admins} />
        <MiniMetric label="Proprietários Convidados" value={summary.coHosts} />
      </section>

      <Panel>
        {message ? (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        {isLoading || teamMembers.length > 0 ? (
          <>
            {/* Mobile cards (< 768px) */}
            <div className="grid gap-3 md:hidden">
              {isLoading ? (
                <div className="rounded-xl border border-border py-10 text-center text-xs text-text-muted">
                  Carregando acessos...
                </div>
              ) : (
                teamMembers.map((member) => (
                  <article
                    className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 p-4"
                    key={member.membershipId}
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-semibold text-text-primary">
                        {member.fullName}
                      </strong>
                      <span className="block truncate text-xs text-text-muted">
                        {member.email}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={member.role === "host_admin" ? "primary" : "info"}
                      >
                        {roleLabels[member.role]}
                      </Badge>
                      <Badge tone={member.active ? "success" : "neutral"}>
                        {member.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        {member.role === "host_admin"
                          ? "Acesso total"
                          : `${member.apartmentPermissions.length} apartamento(s)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                      <Link
                        aria-label="Editar acesso"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                        href={`/configuracoes/equipe/${member.membershipId}/editar`}
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <IconButton
                        aria-label="Desativar acesso"
                        disabled={!member.active}
                        icon={Trash2}
                        onClick={() => setMemberToDeactivate(member)}
                        variant="danger"
                      />
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Desktop table (>= 768px) */}
            <div className="hidden md:block">
              <DataTable>
                <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuário</th>
                    <th className="px-4 py-3 font-semibold">Perfil</th>
                    <th className="px-4 py-3 font-semibold">Escopo de Apartamentos</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {isLoading ? (
                    <TableStateRow colSpan={4}>Carregando acessos...</TableStateRow>
                  ) : (
                    teamMembers.map((member) => (
                      <tr key={member.membershipId}>
                        <td className="px-4 py-4">
                          <strong className="block font-semibold text-text-primary">
                            {member.fullName}
                          </strong>
                          <span className="text-xs text-text-muted">{member.email}</span>
                        </td>
                        <td className="px-4 py-4 text-text-secondary">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              tone={member.role === "host_admin" ? "primary" : "info"}
                            >
                              {roleLabels[member.role]}
                            </Badge>
                            <Badge tone={member.active ? "success" : "neutral"}>
                              {member.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-secondary">
                          {member.role === "host_admin"
                            ? "Todos os apartamentos"
                            : `${member.apartmentPermissions.length} vinculado(s)`}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              aria-label="Editar acesso"
                              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                              href={`/configuracoes/equipe/${member.membershipId}/editar`}
                            >
                              <Pencil aria-hidden className="h-4 w-4" />
                            </Link>
                            <IconButton
                              aria-label="Desativar acesso"
                              disabled={!member.active}
                              icon={Trash2}
                              onClick={() => setMemberToDeactivate(member)}
                              variant="danger"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </div>
          </>
        ) : (
          <EmptyState
            actionHref="/configuracoes/equipe/novo"
            actionLabel="Convidar proprietário ou admin"
            description="Convide um proprietário (Admin-Proprietário) para acompanhar apenas os apartamentos dele ou adicione outro Admin Geral."
            icon={UsersRound}
            title="Nenhum acesso cadastrado"
          />
        )}
      </Panel>

      <ConfirmDialog
        confirmLabel="Desativar"
        description={`O acesso de ${memberToDeactivate?.fullName ?? ""} aos apartamentos desta organização será revogado.`}
        isOpen={Boolean(memberToDeactivate)}
        isWorking={isDeleting}
        onCancel={() => setMemberToDeactivate(null)}
        onConfirm={() => void deactivateMember()}
        title="Desativar acesso?"
      />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
          <UserPlus aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
