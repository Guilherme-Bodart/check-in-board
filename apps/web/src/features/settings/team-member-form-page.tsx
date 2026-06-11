"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Apartment, AuthRole, TeamMember } from "../../api";
import { Button } from "../../components/ui/button";
import { Field, Input, Select } from "../../components/ui/form-controls";
import { FormPageLayout } from "../../components/ui/form-page-layout";
import { MessageBanner } from "../../components/ui/message-banner";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartments } from "../dashboard/dashboard-api";
import {
  createTeamMember,
  fetchTeamMember,
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

export function TeamMemberFormPage({ membershipId }: { membershipId?: string }) {
  const router = useRouter();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [form, setForm] = useState<TeamFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(membershipId);

  useEffect(() => {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    const currentSession = session;
    const currentMembershipId = membershipId;

    async function loadFormData() {
      setIsLoading(true);
      setMessage("");

      try {
        const nextApartments = await fetchApartments(currentSession.token);
        setApartments(nextApartments);

        if (currentMembershipId) {
          const member = await fetchTeamMember(currentSession.token, currentMembershipId);
          setForm({
            email: member.email,
            fullName: member.fullName,
            password: "",
            role: member.role,
            active: member.active,
            apartmentPermissions: mergePermissions(nextApartments, member),
          });
        } else {
          setForm({
            ...emptyForm,
            apartmentPermissions: defaultPermissions(nextApartments),
          });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar membro.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFormData();
  }, [membershipId]);

  async function submitTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (membershipId) {
        await updateTeamMember(session.token, membershipId, {
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

      router.push("/configuracoes/equipe");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar membro.");
    } finally {
      setIsSaving(false);
    }
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
    <FormPageLayout
      backHref="/configuracoes/equipe"
      description="Defina papel e permissões por apartamento."
      title={isEditing ? "Editar membro" : "Novo membro"}
    >
      <MessageBanner isError message={message} />

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando membro...</p>
      ) : (
        <form className="grid gap-4" onSubmit={submitTeamMember}>
          <Field label="Nome">
            <Input
              disabled={isEditing}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
              value={form.fullName}
            />
          </Field>
          <Field label="Email">
            <Input
              disabled={isEditing}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              type="email"
              value={form.email}
            />
          </Field>
          {isEditing ? null : (
            <Field label="Senha inicial">
              <Input
                minLength={8}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                type="password"
                value={form.password}
              />
            </Field>
          )}
          <Field label="Perfil">
            <Select
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as AuthRole })
              }
              value={form.role}
            >
              <option value="team">Equipe</option>
              <option value="co_host">Co-host</option>
              <option value="host_admin">Administrador</option>
            </Select>
          </Field>
          {isEditing ? (
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <input
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                type="checkbox"
              />
              Membro ativo
            </label>
          ) : null}

          <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-text-primary">Apartamentos</p>
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
                    className="grid gap-2 rounded-lg border border-border bg-surface p-3"
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

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => router.push("/configuracoes/equipe")}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar membro"}
            </Button>
          </div>
        </form>
      )}
    </FormPageLayout>
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
