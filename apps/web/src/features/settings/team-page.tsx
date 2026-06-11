"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserPlus, UsersRound } from "lucide-react";

import type { AuthRole, TeamMember } from "../../api";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { deactivateTeamMember, fetchTeamMembers } from "./team-api";

const roleLabels: Record<AuthRole, string> = {
  co_host: "Co-host",
  host_admin: "Administrador",
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
      active: teamMembers.filter((member) => member.active).length,
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
        actionLabel="Novo membro"
        description="Gerencie membros, papéis e permissões por apartamento."
        eyebrow="Configurações"
        title="Equipe"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MiniMetric label="Total" value={summary.total} />
        <MiniMetric label="Ativos" value={summary.active} />
        <MiniMetric label="Admins" value={summary.admins} />
      </section>

      <Panel>
        {message ? (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        {isLoading || teamMembers.length > 0 ? (
          <DataTable>
            <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Membro</th>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Apartamentos</th>
                <th className="px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {isLoading ? (
                <TableStateRow colSpan={4}>Carregando equipe...</TableStateRow>
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
                      <div className="grid gap-1">
                        <span>{roleLabels[member.role]}</span>
                        <span className="text-xs text-text-muted">
                          {member.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {member.apartmentPermissions.length}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          aria-label="Editar membro"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                          href={`/configuracoes/equipe/${member.membershipId}/editar`}
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </Link>
                        <IconButton
                          aria-label="Desativar membro"
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
        ) : (
          <EmptyState
            actionHref="/configuracoes/equipe/novo"
            actionLabel="Adicionar membro"
            description="Convide a primeira pessoa para apoiar a operação dos apartamentos."
            icon={UsersRound}
            title="Nenhum membro encontrado"
          />
        )}
      </Panel>

      <ConfirmDialog
        confirmLabel="Desativar"
        description={`O membro ${memberToDeactivate?.fullName ?? ""} perderá o acesso aos apartamentos desta organização.`}
        isOpen={Boolean(memberToDeactivate)}
        isWorking={isDeleting}
        onCancel={() => setMemberToDeactivate(null)}
        onConfirm={() => void deactivateMember()}
        title="Desativar membro?"
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
