"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Apartment, FinancialEntryType } from "../../api";
import { Button } from "../../components/ui/button";
import { Field, Input, Select, Textarea } from "../../components/ui/form-controls";
import { FormPageLayout } from "../../components/ui/form-page-layout";
import { MessageBanner } from "../../components/ui/message-banner";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartments } from "../dashboard/dashboard-api";
import {
  createFinancialEntry,
  fetchFinancialEntry,
  updateFinancialEntry,
} from "./finance-api";
import { parseMoneyToCents } from "./money";

type FinanceFormState = {
  apartmentId: string;
  type: FinancialEntryType;
  category: string;
  description: string;
  amount: string;
  currency: string;
  occurredOn: string;
};

const expenseCategories = [
  "limpeza",
  "consumo",
  "enxoval",
  "manutencao",
  "condominio",
  "contas",
  "taxas",
  "outros",
];

const emptyForm: FinanceFormState = {
  apartmentId: "",
  type: "revenue",
  category: "",
  description: "",
  amount: "",
  currency: "BRL",
  occurredOn: new Date().toISOString().slice(0, 10),
};

export function FinanceEntryFormPage({ entryId }: { entryId?: string }) {
  const router = useRouter();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [form, setForm] = useState<FinanceFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(entryId);

  useEffect(() => {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    const currentSession = session;
    const currentEntryId = entryId;

    async function loadFormData() {
      setIsLoading(true);
      setMessage("");

      try {
        const nextApartments = await fetchApartments(currentSession.token);
        setApartments(nextApartments);

        if (currentEntryId) {
          const entry = await fetchFinancialEntry(currentSession.token, currentEntryId);
          setForm({
            amount: String((entry.amountCents / 100).toFixed(2)).replace(".", ","),
            apartmentId: entry.apartmentId,
            category: entry.category,
            currency: entry.currency,
            description: entry.description ?? "",
            occurredOn: entry.occurredOn,
            type: entry.type,
          });
        } else {
          setForm({
            ...emptyForm,
            apartmentId: nextApartments[0]?.id ?? "",
            occurredOn: new Date().toISOString().slice(0, 10),
          });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar lançamento.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFormData();
  }, [entryId]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    const amountCents = parseMoneyToCents(form.amount);

    if (!session || !form.apartmentId || amountCents <= 0) {
      setMessage("Informe apartamento e valor válido.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const payload = {
        amountCents,
        apartmentId: form.apartmentId,
        category: form.category,
        currency: form.currency,
        description: form.description,
        occurredOn: form.occurredOn,
        type: form.type,
      };

      if (entryId) {
        await updateFinancialEntry(session.token, entryId, payload);
      } else {
        await createFinancialEntry(session.token, payload);
      }

      router.push("/financeiro");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar lançamento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPageLayout
      backHref="/financeiro"
      description="Registre receitas e despesas manuais ligadas a um apartamento."
      title={isEditing ? "Editar lançamento" : "Novo lançamento"}
    >
      <MessageBanner isError message={message} />

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando lançamento...</p>
      ) : (
        <form className="grid gap-4" onSubmit={submitEntry}>
          <Field label="Apartamento">
            <Select
              disabled={apartments.length === 0}
              onChange={(event) => setForm({ ...form, apartmentId: event.target.value })}
              required
              value={form.apartmentId}
            >
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: "",
                    type: event.target.value as FinancialEntryType,
                  })
                }
                value={form.type}
              >
                <option value="revenue">Receita</option>
                <option value="expense">Despesa</option>
              </Select>
            </Field>

            <Field label="Categoria">
              {form.type === "expense" ? (
                <Select
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  required
                  value={form.category}
                >
                  <option value="">Selecione</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Hospedagem"
                  required
                  value={form.category}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor">
              <Input
                inputMode="decimal"
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="1200,00"
                required
                value={form.amount}
              />
            </Field>
            <Field label="Data">
              <Input
                onChange={(event) => setForm({ ...form, occurredOn: event.target.value })}
                required
                type="date"
                value={form.occurredOn}
              />
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              value={form.description}
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              onClick={() => router.push("/financeiro")}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={isSaving || apartments.length === 0} type="submit">
              {isSaving ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}
