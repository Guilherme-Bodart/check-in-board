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
  role: "co_host",
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
            role: member.role === "host_admin" ? "host_admin" : "co_host",
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

  function toggleApartmentAccess(apartmentId: string, canView: boolean) {
    setForm((current) => ({
      ...current,
      apartmentPermissions: current.apartmentPermissions.map((permission) =>
        permission.apartmentId === apartmentId
          ? {
              ...permission,
              canView,
              canUpdateTaskStatus: false,
              canManageIntegrations: false,
            }
          : permission,
      ),
    }));
  }

  function setAllApartmentsAccess(canView: boolean) {
    setForm((current) => ({
      ...current,
      apartmentPermissions: current.apartmentPermissions.map((permission) => ({
        ...permission,
        canView,
        canUpdateTaskStatus: false,
        canManageIntegrations: false,
      })),
    }));
  }

  return (
    <FormPageLayout
      backHref="/configuracoes/equipe"
      description="Convide administradores gerais ou proprietários (Admin-Proprietário) vinculados aos seus apartamentos."
      title={isEditing ? "Editar acesso" : "Novo acesso"}
    >
      <MessageBanner isError message={message} />

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando dados do acesso...</p>
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
          <Field
            hint={
              form.role === "host_admin"
                ? "Admin Geral tem acesso irrestrito a todos os imóveis, financeiro e configurações."
                : "Admin-Proprietário visualiza reservas, calendário e demonstrativo financeiro (somente leitura) apenas dos apartamentos vinculados abaixo."
            }
            label="Perfil de acesso"
          >
            <Select
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as AuthRole })
              }
              value={form.role}
            >
              <option value="co_host">
                Admin-Proprietário — vê apenas os apartamentos vinculados e o financeiro deles
              </option>
              <option value="host_admin">
                Admin Geral — acesso total a todos os imóveis e financeiro
              </option>
            </Select>
          </Field>
          {isEditing ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-secondary">
              <input
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                type="checkbox"
              />
              Acesso ativo
            </label>
          ) : null}

          <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  Apartamentos vinculados
                </p>
                <p className="text-xs text-text-secondary">
                  {form.role === "co_host"
                    ? "Selecione os imóveis que este proprietário poderá acompanhar (reservas, calendário e financeiro)."
                    : "Admin Geral já possui acesso total; opcionalmente vincule os imóveis principais."}
                </p>
              </div>
              {apartments.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setAllApartmentsAccess(true)}
                    size="xs"
                    variant="outline"
                  >
                    Marcar todos
                  </Button>
                  <Button
                    onClick={() => setAllApartmentsAccess(false)}
                    size="xs"
                    variant="ghost"
                  >
                    Limpar
                  </Button>
                </div>
              ) : null}
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
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 transition hover:border-primary/60"
                    key={permission.apartmentId}
                  >
                    <input
                      checked={permission.canView}
                      className="mt-1 shrink-0"
                      onChange={(event) =>
                        toggleApartmentAccess(
                          permission.apartmentId,
                          event.target.checked,
                        )
                      }
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text-primary">
                        {apartment?.name ?? "Apartamento"}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {apartment?.owner.name
                          ? `Proprietário: ${apartment.owner.name} · `
                          : ""}
                        Reservas, calendário e demonstrativo financeiro
                      </span>
                    </div>
                  </label>
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
              {isSaving ? "Salvando..." : "Salvar acesso"}
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
    canView: false,
    canUpdateTaskStatus: false,
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
