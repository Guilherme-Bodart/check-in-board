"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { OwnerType } from "../../api";
import { Button } from "../../components/ui/button";
import { Field, Input, Select, Textarea } from "../../components/ui/form-controls";
import { FormPageLayout } from "../../components/ui/form-page-layout";
import { MessageBanner } from "../../components/ui/message-banner";
import { readStoredSession } from "../../lib/session-storage";
import {
  createOwner,
  fetchOwner,
  updateOwner,
  type OwnerFormValues,
} from "./owners-api";

const emptyOwnerForm: OwnerFormValues = {
  name: "",
  type: "client",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

export function OwnerFormPage({ ownerId }: { ownerId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<OwnerFormValues>(emptyOwnerForm);
  const [isLoading, setIsLoading] = useState(Boolean(ownerId));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(ownerId);

  useEffect(() => {
    if (!ownerId) {
      return;
    }

    const session = readStoredSession();

    if (!session) {
      return;
    }

    const currentOwnerId = ownerId;
    const currentSession = session;

    async function loadOwner() {
      setIsLoading(true);
      setMessage("");

      try {
        const owner = await fetchOwner(currentSession.token, currentOwnerId);
        setForm({
          name: owner.name,
          type: owner.type,
          contactName: owner.contactName ?? "",
          email: owner.email ?? "",
          phone: owner.phone ?? "",
          notes: owner.notes ?? "",
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar proprietário.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOwner();
  }, [ownerId]);

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (ownerId) {
        await updateOwner(session.token, ownerId, form);
      } else {
        await createOwner(session.token, form);
      }

      router.push("/clientes");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar proprietário.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPageLayout
      backHref="/clientes"
      description="Mantenha os dados comerciais do proprietário separados dos apartamentos vinculados."
      title={isEditing ? "Editar proprietário" : "Novo proprietário"}
    >
      <MessageBanner isError message={message} />

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando proprietário...</p>
      ) : (
        <form className="grid gap-4" onSubmit={submitOwner}>
          <Field label="Nome do proprietário">
            <Input
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Cliente João ou meus imóveis"
              required
              value={form.name}
            />
          </Field>

          <Field label="Tipo">
            <Select
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as OwnerType })
              }
              value={form.type}
            >
              <option value="client">Cliente</option>
              <option value="internal">Próprio</option>
            </Select>
          </Field>

          <Field label="Nome do contato">
            <Input
              onChange={(event) =>
                setForm({ ...form, contactName: event.target.value })
              }
              placeholder="João Silva"
              value={form.contactName}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="joao@email.com"
                type="email"
                value={form.email}
              />
            </Field>
            <Field label="Telefone">
              <Input
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+55 11 99999-0000"
                value={form.phone}
              />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Preferências, regras comerciais ou detalhes internos"
              value={form.notes}
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => router.push("/clientes")}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar proprietário"}
            </Button>
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}
