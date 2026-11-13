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
  rentalStayId: string;
  type: FinancialEntryType;
  category: string;
  description: string;
  amount: string;
  currency: string;
  occurredOn: string;
};

type CategoryOption = {
  value: string;
  label: string;
};

const expenseCategoryOptions: CategoryOption[] = [
  { value: "consumo", label: "🛒 Consumo / Mercado" },
  { value: "limpeza", label: "🧹 Limpeza & Lavanderia" },
  { value: "manutencao", label: "🔧 Manutenção & Reparos" },
  { value: "enxoval", label: "🛏️ Enxoval" },
  { value: "condominio", label: "🏢 Condomínio" },
  { value: "contas", label: "⚡ Energia / Internet / Contas" },
  { value: "taxas", label: "📄 Taxas" },
  { value: "outros", label: "📌 Outros" },
];

const revenueCategoryOptions: CategoryOption[] = [
  { value: "Hospedagem Extra", label: "🏨 Hospedagem Extra" },
  { value: "Taxa de Limpeza", label: "🧹 Taxa de Limpeza" },
  { value: "Taxa Pet", label: "🐾 Taxa Pet" },
  { value: "Outra Receita", label: "📌 Outra Receita" },
];

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayAndYesterday() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return {
    today: toLocalDateInput(today),
    yesterday: toLocalDateInput(yesterday),
  };
}

const emptyForm: FinanceFormState = {
  apartmentId: "",
  rentalStayId: "",
  type: "expense",
  category: "consumo",
  description: "",
  amount: "",
  currency: "BRL",
  occurredOn: toLocalDateInput(new Date()),
};

export function FinanceEntryFormPage({ entryId }: { entryId?: string }) {
  const router = useRouter();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rentalStays, setRentalStays] = useState<any[]>([]); // We will refine this later
  const [form, setForm] = useState<FinanceFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(entryId);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    
    // Fetch rental stays whenever apartmentId changes
    async function loadStays() {
      if (!form.apartmentId || !session) {
        setRentalStays([]);
        return;
      }
      try {
        const { fetchRentalStays } = await import("./rental-stay-api");
        const dateFrom = new Date();
        dateFrom.setMonth(dateFrom.getMonth() - 2);
        const dateTo = new Date();
        dateTo.setMonth(dateTo.getMonth() + 2);
        
        const stays = await fetchRentalStays(session.token, {
          dateFrom: dateFrom.toISOString().slice(0, 10),
          dateTo: dateTo.toISOString().slice(0, 10),
          apartmentId: form.apartmentId,
        });
        setRentalStays(stays);
      } catch (err) {
        console.error("Failed to fetch rental stays", err);
      }
    }
    loadStays();
  }, [form.apartmentId]);

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
            rentalStayId: entry.rentalStayId ?? "",
            category: entry.category,
            currency: entry.currency,
            description: entry.description ?? "",
            occurredOn: entry.occurredOn,
            type: entry.type,
          });
        } else {
          const searchParams =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search)
              : null;
          const paramType = searchParams?.get("type");
          const initialType: FinancialEntryType =
            paramType === "revenue" || paramType === "expense" ? paramType : "expense";
          const paramCategory = searchParams?.get("category")?.trim();
          const initialCategory =
            paramCategory ||
            (initialType === "expense" ? "consumo" : "Hospedagem Extra");
          const paramApartmentId = searchParams?.get("apartmentId");
          const initialApartmentId =
            paramApartmentId &&
            nextApartments.some((apartment) => apartment.id === paramApartmentId)
              ? paramApartmentId
              : (nextApartments[0]?.id ?? "");

          setForm({
            ...emptyForm,
            apartmentId: initialApartmentId,
            category: initialCategory,
            occurredOn: toLocalDateInput(new Date()),
            type: initialType,
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
    const trimmedCategory = form.category.trim();

    if (!session || !form.apartmentId || !trimmedCategory || amountCents <= 0) {
      setMessage("Informe apartamento, categoria e valor válido.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const payload = {
        amountCents,
        apartmentId: form.apartmentId,
        rentalStayId: form.rentalStayId || undefined,
        category: trimmedCategory,
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
          <div className="grid gap-2">
            <span className="text-sm font-medium text-text-secondary">Tipo</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-muted p-1.5">
              <Button
                aria-pressed={form.type === "expense"}
                className={
                  form.type === "expense"
                    ? "min-h-11 border-danger/40 bg-danger-soft text-danger shadow-2xs hover:border-danger/60 hover:bg-danger-soft hover:text-danger"
                    : "min-h-11 border-transparent bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: "expense",
                    category: expenseCategoryOptions.some((opt) => opt.value === prev.category)
                      ? prev.category
                      : "consumo",
                  }))
                }
                size="md"
                type="button"
                variant="ghost"
              >
                - Despesa / Compra
              </Button>
              <Button
                aria-pressed={form.type === "revenue"}
                className={
                  form.type === "revenue"
                    ? "min-h-11 border-success/40 bg-success-soft text-success shadow-2xs hover:border-success/60 hover:bg-success-soft hover:text-success"
                    : "min-h-11 border-transparent bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: "revenue",
                    category:
                      prev.type === "revenue" && prev.category
                        ? prev.category
                        : "Hospedagem Extra",
                  }))
                }
                size="md"
                type="button"
                variant="ghost"
              >
                + Receita Extra
              </Button>
            </div>
          </div>

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

          {rentalStays.length > 0 && (
            <Field label="Vincular a uma hospedagem (opcional)">
              <Select
                onChange={(event) => setForm({ ...form, rentalStayId: event.target.value })}
                value={form.rentalStayId}
              >
                <option value="">Não vincular</option>
                {rentalStays.map((stay) => (
                  <option key={stay.id} value={stay.id}>
                    {stay.guestName || "Hóspede"} ({new Date(stay.checkIn).toLocaleDateString()} a {new Date(stay.checkOut).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-2 min-w-0">
            <span className="text-sm font-medium text-text-secondary">Categoria</span>
            {form.type === "expense" ? (
              <div className="flex flex-wrap gap-2">
                {expenseCategoryOptions.map((option) => {
                  const isSelected = form.category === option.value;
                  return (
                    <Button
                      aria-pressed={isSelected}
                      className={
                        isSelected
                          ? "border-primary bg-primary-soft text-primary hover:border-primary hover:bg-primary-soft"
                          : ""
                      }
                      key={option.value}
                      onClick={() => setForm({ ...form, category: option.value })}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {option.label}
                    </Button>
                  );
                })}
                {form.category &&
                !expenseCategoryOptions.some((option) => option.value === form.category) ? (
                  <Button
                    aria-pressed
                    className="border-primary bg-primary-soft text-primary hover:border-primary hover:bg-primary-soft"
                    onClick={() => setForm({ ...form, category: form.category })}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {form.category}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2.5 min-w-0">
                <div className="flex flex-wrap gap-2">
                  {revenueCategoryOptions.map((option) => {
                    const isSelected = form.category === option.value;
                    return (
                      <Button
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? "border-success/50 bg-success-soft text-success hover:border-success/70 hover:bg-success-soft hover:text-success"
                            : ""
                        }
                        key={option.value}
                        onClick={() => setForm({ ...form, category: option.value })}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <Input
                  aria-label="Categoria personalizada"
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Ou digite uma categoria personalizada"
                  required
                  value={form.category}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="min-w-0" label="Valor">
              <Input
                inputMode="decimal"
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="120,00"
                required
                value={form.amount}
              />
            </Field>
            <div className="grid gap-2 min-w-0">
              <span className="text-sm font-medium text-text-secondary">Data</span>
              {(() => {
                const { today, yesterday } = getTodayAndYesterday();
                return (
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Input
                      aria-label="Data"
                      className="min-w-[140px] flex-1"
                      onChange={(event) => setForm({ ...form, occurredOn: event.target.value })}
                      required
                      type="date"
                      value={form.occurredOn}
                    />
                    <Button
                      aria-pressed={form.occurredOn === today}
                      size="sm"
                      type="button"
                      variant={form.occurredOn === today ? "primary" : "secondary"}
                      onClick={() => setForm({ ...form, occurredOn: today })}
                    >
                      Hoje
                    </Button>
                    <Button
                      aria-pressed={form.occurredOn === yesterday}
                      size="sm"
                      type="button"
                      variant={form.occurredOn === yesterday ? "primary" : "secondary"}
                      onClick={() => setForm({ ...form, occurredOn: yesterday })}
                    >
                      Ontem
                    </Button>
                  </div>
                );
              })()}
            </div>
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
