"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, UsersRound, X } from "lucide-react";

import type { Apartment, AuthRole, TeamMember } from "../../api";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { fetchApartments } from "../dashboard/dashboard-api";
import { readStoredSession } from "../../lib/session-storage";
import {
  createTeamMember,
  deactivateTeamMember,
  fetchTeamMembers,
  updateTeamMember,
  type TeamApartmentPermissionValues,
} from "./team-api";

type TeamFormState = {
  email: string;
  fullName: string;
  password: string;
  role: AuthRole;
  active: boolean;
  apartmentPermissions: TeamApartmentPermissionValues[];
};

const emptyForm: TeamFormState = {
  email: "",
  fullName: "",
  password: "",
  role: "team",
  active: true,
  apartmentPermissions: [],
};

const roleLabels: Record<AuthRole, string> = {
  co_host: "Co-host",
  host_admin: "Administrador",
  team: "Equipe",
};

export function TeamManagementPanel() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<TeamFormState>(emptyForm);
  const [editingMembershipId, setEditingMembershipId] = useState("");
  const [memberToDeactivate, setMemberToDeactivate] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      const [nextApartments, nextMembers] = await Promise.all([
        fetchApartments(session.token),
        fetchTeamMembers(session.token),
      ]);

      setApartments(nextApartments);
      setTeamMembers(nextMembers);
      setForm((current) => ({
        ...current,
        apartmentPermissions:
          current.apartmentPermissions.length > 0
            ? current.apartmentPermissions
            : defaultPermissions(nextApartments),
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar equipe.",
      );
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

  async function submitTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingMembershipId) {
        await updateTeamMember(session.token, editingMembershipId, {
          role: form.role,
          active: form.active,
          apartmentPermissions: form.apartmentPermissions,
        });
      } else {
        await createTeamMember(session.token, {
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          role: form.role,
          apartmentPermissions: form.apartmentPermissions,
        });
      }

      cancelEdit();
      await loadTeam();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar membro.");
    } finally {
      setIsSaving(false);
    }
  }

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
      setMessage(
        error instanceof Error ? error.message : "Falha ao desativar membro.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function startEdit(member: TeamMember) {
    setEditingMembershipId(member.membershipId);
    setForm({
      email: member.email,
      fullName: member.fullName,
      password: "",
      role: member.role,
      active: member.active,
      apartmentPermissions: mergePermissions(apartments, member),
    });
  }

  function cancelEdit() {
    setEditingMembershipId("");
    setForm({
      ...emptyForm,
      apartmentPermissions: defaultPermissions(apartments),
    });
  }

  function updatePermission(
    apartmentId: string,
    key: keyof Omit<TeamApartmentPermissionValues, "apartmentId">,
    value: boolean,
  ) {
    setForm((current) => ({
      ...current,
      apartmentPermissions: current.apartmentPermissions.map((permission) =>
        permission.apartmentId === apartmentId
          ? {
              ...permission,
              [key]: value,
              canView: key === "canView" ? value : permission.canView || value,
            }
          : permission,
      ),
    }));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Equipe
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              Membros e permissões
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Total" value={summary.total} />
            <MiniMetric label="Ativos" value={summary.active} />
            <MiniMetric label="Admins" value={summary.admins} />
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Membro</th>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Apartamentos</th>
                <th className="px-4 py-3 font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                    Carregando equipe...
                  </td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                    Nenhum membro encontrado.
                  </td>
                </tr>
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
                        <button
                          aria-label="Editar membro"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                          onClick={() => startEdit(member)}
                          type="button"
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Desativar membro"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!member.active}
                          onClick={() => setMemberToDeactivate(member)}
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form
        className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
        onSubmit={submitTeamMember}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <UserPlus aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {editingMembershipId ? "Edição" : "Novo membro"}
              </p>
              <h3 className="text-lg font-semibold text-text-primary">
                {editingMembershipId ? "Editar permissões" : "Adicionar membro"}
              </h3>
            </div>
          </div>
          {editingMembershipId ? (
            <button
              aria-label="Cancelar edição"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
              onClick={cancelEdit}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4">
          <Field label="Nome">
            <input
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:bg-surface-muted"
              disabled={Boolean(editingMembershipId)}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
              value={form.fullName}
            />
          </Field>
          <Field label="Email">
            <input
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:bg-surface-muted"
              disabled={Boolean(editingMembershipId)}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              type="email"
              value={form.email}
            />
          </Field>
          {!editingMembershipId ? (
            <Field label="Senha inicial">
              <div className="relative">
                <KeyRound
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                />
                <input
                  className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  minLength={8}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  required
                  type="password"
                  value={form.password}
                />
              </div>
            </Field>
          ) : null}
          <Field label="Perfil">
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as AuthRole })
              }
              value={form.role}
            >
              <option value="team">Equipe</option>
              <option value="co_host">Co-host</option>
              <option value="host_admin">Administrador</option>
            </select>
          </Field>
          {editingMembershipId ? (
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <input
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                type="checkbox"
              />
              Membro ativo
            </label>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ShieldCheck aria-hidden className="h-4 w-4 text-primary" />
              Apartamentos
            </div>
            {apartments.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Crie um apartamento antes de configurar acessos.
              </p>
            ) : (
              form.apartmentPermissions.map((permission) => {
                const apartment = apartments.find(
                  (item) => item.id === permission.apartmentId,
                );

                return (
                  <div
                    className="grid gap-2 rounded-xl border border-border bg-surface p-3"
                    key={permission.apartmentId}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <input
                        checked={permission.canView}
                        onChange={(event) =>
                          updatePermission(
                            permission.apartmentId,
                            "canView",
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      {apartment?.name ?? "Apartamento"}
                    </label>
                    <div className="grid gap-2 pl-6 text-xs font-medium text-text-secondary">
                      <label className="flex items-center gap-2">
                        <input
                          checked={permission.canUpdateTaskStatus}
                          onChange={(event) =>
                            updatePermission(
                              permission.apartmentId,
                              "canUpdateTaskStatus",
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                        Atualizar tarefas
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          checked={permission.canManageIntegrations}
                          onChange={(event) =>
                            updatePermission(
                              permission.apartmentId,
                              "canManageIntegrations",
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                        Gerenciar iCal
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Salvando..." : editingMembershipId ? "Salvar" : "Criar membro"}
        </button>
      </form>

      <ConfirmDialog
        confirmLabel="Desativar"
        description={`O membro ${memberToDeactivate?.fullName ?? ""} perdera o acesso aos apartamentos desta organizacao.`}
        isOpen={Boolean(memberToDeactivate)}
        isWorking={isDeleting}
        onCancel={() => setMemberToDeactivate(null)}
        onConfirm={() => void deactivateMember()}
        title="Desativar membro?"
      />
    </section>
  );
}

function defaultPermissions(apartments: Apartment[]): TeamApartmentPermissionValues[] {
  return apartments.map((apartment) => ({
    apartmentId: apartment.id,
    canView: true,
    canUpdateTaskStatus: true,
    canManageIntegrations: false,
  }));
}

function mergePermissions(apartments: Apartment[], member: TeamMember) {
  return apartments.map((apartment) => {
    const current = member.apartmentPermissions.find(
      (permission) => permission.apartmentId === apartment.id,
    );

    return {
      apartmentId: apartment.id,
      canView: current?.canView ?? false,
      canUpdateTaskStatus: current?.canUpdateTaskStatus ?? false,
      canManageIntegrations: current?.canManageIntegrations ?? false,
    };
  });
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-3 py-2">
      <strong className="block text-lg font-semibold text-text-primary">{value}</strong>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </span>
    </div>
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
