"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Owner } from "../../api";
import { Button } from "../../components/ui/button";
import { Field, Input, Select } from "../../components/ui/form-controls";
import { FormPageLayout } from "../../components/ui/form-page-layout";
import { MessageBanner } from "../../components/ui/message-banner";
import { readStoredSession } from "../../lib/session-storage";
import {
  createApartment,
  createIcalSource,
  fetchApartment,
  syncIcalSource,
  updateApartment,
} from "../dashboard/dashboard-api";
import { fetchOwners } from "../owners/owners-api";

type ApartmentFormState = {
  name: string;
  timezone: string;
  ownerId: string;
  managementCommissionPercent: string;
  icalUrl: string;
  icalProvider: string;
};

const emptyApartmentForm: ApartmentFormState = {
  name: "",
  timezone: "America/Sao_Paulo",
  ownerId: "",
  managementCommissionPercent: "0",
  icalUrl: "",
  icalProvider: "airbnb",
};

const timezones = ["America/Sao_Paulo", "America/New_York", "Europe/Lisbon"];

export function ApartmentFormPage({ apartmentId }: { apartmentId?: string }) {
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [form, setForm] = useState<ApartmentFormState>(emptyApartmentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(apartmentId);

  useEffect(() => {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    const currentSession = session;
    const currentApartmentId = apartmentId;

    async function loadFormData() {
      setIsLoading(true);
      setMessage("");

      try {
        const nextOwners = await fetchOwners(currentSession.token);
        setOwners(nextOwners);

        if (currentApartmentId) {
          const apartment = await fetchApartment(
            currentSession.token,
            currentApartmentId,
          );
          setForm({
            name: apartment.name,
            timezone: apartment.timezone,
            ownerId: apartment.owner?.id ?? nextOwners[0]?.id ?? "",
            managementCommissionPercent: String(
              (apartment.managementCommissionBps ?? 0) / 100,
            ).replace(".", ","),
            icalUrl: "",
            icalProvider: "airbnb",
          });
        } else {
          setForm({
            ...emptyApartmentForm,
            ownerId: nextOwners[0]?.id ?? "",
          });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFormData();
  }, [apartmentId]);

  async function submitApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    const managementCommissionBps = parseCommissionBps(
      form.managementCommissionPercent,
    );

    if (!session || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (apartmentId) {
        await updateApartment(session.token, apartmentId, {
          name: form.name.trim(),
          timezone: form.timezone,
          ownerId: form.ownerId || undefined,
          managementCommissionBps,
        });
      } else {
        const apartment = await createApartment(session.token, {
          name: form.name.trim(),
          timezone: form.timezone,
          ownerId: form.ownerId || undefined,
          managementCommissionBps,
        });

        if (form.icalUrl.trim()) {
          const response = await createIcalSource(session.token, apartment.id, {
            provider: form.icalProvider,
            label: `${form.icalProvider.toUpperCase()} - ${form.name.trim()}`,
            url: form.icalUrl.trim(),
          });
          
          try {
            await syncIcalSource(session.token, response.icalSource.id);
          } catch (error) {
            console.error("Failed to sync initial iCal:", error);
          }
        }
      }

      router.push("/apartamentos");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar apartamento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPageLayout
      backHref="/apartamentos"
      description="Cadastre o imóvel operacional, vincule ao proprietário e defina a comissão usada no financeiro."
      title={isEditing ? "Editar apartamento" : "Novo apartamento"}
    >
      <MessageBanner isError message={message} />

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando apartamento...</p>
      ) : (
        <form className="grid gap-4" onSubmit={submitApartment}>
          <Field label="Nome do apartamento">
            <Input
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Apto 204"
              required
              value={form.name}
            />
          </Field>

          <Field label="Proprietário">
            <Select
              disabled={owners.length === 0}
              onChange={(event) => setForm({ ...form, ownerId: event.target.value })}
              required
              value={form.ownerId}
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} - {owner.type === "client" ? "cliente" : "próprio"}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone">
              <Select
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                value={form.timezone}
              >
                {timezones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Comissão de gestão (%)">
              <Input
                inputMode="decimal"
                onChange={(event) =>
                  setForm({
                    ...form,
                    managementCommissionPercent: event.target.value,
                  })
                }
                placeholder="20"
                value={form.managementCommissionPercent}
              />
            </Field>
          </div>

          {isEditing ? null : (
            <div className="grid gap-4 rounded-lg border border-border bg-surface-muted p-4">
              <p className="text-sm font-semibold text-text-primary">iCal opcional</p>
              <Field label="Provider">
                <Select
                  onChange={(event) =>
                    setForm({ ...form, icalProvider: event.target.value })
                  }
                  value={form.icalProvider}
                >
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                </Select>
              </Field>
              <Field label="URL iCal">
                <Input
                  onChange={(event) => setForm({ ...form, icalUrl: event.target.value })}
                  placeholder="https://..."
                  type="url"
                  value={form.icalUrl}
                />
              </Field>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => router.push("/apartamentos")}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={isSaving || owners.length === 0} type="submit">
              {isSaving ? "Salvando..." : "Salvar apartamento"}
            </Button>
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}

function parseCommissionBps(value: string) {
  const normalized = Number(value.replace(",", "."));

  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }

  return Math.round(normalized * 100);
}
