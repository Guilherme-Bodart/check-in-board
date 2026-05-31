"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";

import type { Apartment, FinancialEntry, FinancialEntryType, FinancialSummary } from "../../api";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { fetchApartments } from "../dashboard/dashboard-api";
import { fetchOwners } from "../owners/owners-api";
import { readStoredSession } from "../../lib/session-storage";
import {
  createFinancialEntry,
  deleteFinancialEntry,
  fetchFinancialEntries,
  fetchFinancialSummary,
  updateFinancialEntry,
  type FinanceFilters,
} from "./finance-api";
import { formatMoney, parseMoneyToCents } from "./money";

type FinanceFormState = {
  apartmentId: string;
  type: FinancialEntryType;
  category: string;
  description: string;
  amount: string;
  currency: string;
  occurredOn: string;
};

const allValue = "all";

const emptyForm: FinanceFormState = {
  apartmentId: "",
  type: "revenue",
  category: "",
  description: "",
  amount: "",
  currency: "BRL",
  occurredOn: "",
};

export function FinancePage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [form, setForm] = useState<FinanceFormState>(emptyForm);
  const [editingEntryId, setEditingEntryId] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState(allValue);
  const [ownerFilter, setOwnerFilter] = useState(allValue);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFinance(nextFilters: FinanceFilters = currentFilters()) {
    const session = readStoredSession();

    if (!session || !nextFilters.dateFrom || !nextFilters.dateTo) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const [nextApartments, nextOwners, nextEntries, nextSummary] =
        await Promise.all([
          fetchApartments(session.token),
          fetchOwners(session.token),
          fetchFinancialEntries(session.token, nextFilters),
          fetchFinancialSummary(session.token, nextFilters),
        ]);

      setApartments(nextApartments);
      setOwners(nextOwners.map((owner) => ({ id: owner.id, name: owner.name })));
      setEntries(nextEntries);
      setSummary(nextSummary);
      setForm((current) => ({
        ...current,
        apartmentId: current.apartmentId || nextApartments[0]?.id || "",
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar financeiro.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const initialDateFrom = `${currentMonth}-01`;
    const initialDateTo = new Date(
      Number(currentMonth.slice(0, 4)),
      Number(currentMonth.slice(5, 7)),
      0,
    )
      .toISOString()
      .slice(0, 10);

    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setForm((current) => ({
      ...current,
      occurredOn: new Date().toISOString().slice(0, 10),
    }));
    void loadFinance({ dateFrom: initialDateFrom, dateTo: initialDateTo });
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.apartmentName, entry.ownerName, entry.category, entry.description]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [entries, query]);

  function currentFilters() {
    return {
      apartmentId: apartmentFilter === allValue ? undefined : apartmentFilter,
      dateFrom,
      dateTo,
      ownerId: ownerFilter === allValue ? undefined : ownerFilter,
    };
  }

  function reloadWithFilters() {
    void loadFinance(currentFilters());
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    const amountCents = parseMoneyToCents(form.amount);

    if (!session || !form.apartmentId || amountCents <= 0) {
      setMessage("Informe apartamento e valor valido.");
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

      if (editingEntryId) {
        await updateFinancialEntry(session.token, editingEntryId, payload);
      } else {
        await createFinancialEntry(session.token, payload);
      }

      cancelEdit();
      await loadFinance(currentFilters());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao salvar lançamento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeEntry() {
    const session = readStoredSession();

    if (!session || !entryToDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deleteFinancialEntry(session.token, entryToDelete.id);
      setEntryToDelete(null);
      await loadFinance(currentFilters());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao remover lançamento.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function startEdit(entry: FinancialEntry) {
    setEditingEntryId(entry.id);
    setForm({
      amount: String((entry.amountCents / 100).toFixed(2)).replace(".", ","),
      apartmentId: entry.apartmentId,
      category: entry.category,
      currency: entry.currency,
      description: entry.description ?? "",
      occurredOn: entry.occurredOn,
      type: entry.type,
    });
  }

  function cancelEdit() {
    setEditingEntryId("");
    setForm({
      ...emptyForm,
      apartmentId: apartments[0]?.id ?? "",
      occurredOn: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={TrendingUp}
          label="Receitas"
          tone="success"
          value={formatMoney(summary?.revenueCents ?? 0)}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Despesas"
          tone="danger"
          value={formatMoney(summary?.expenseCents ?? 0)}
        />
        <SummaryCard
          icon={Banknote}
          label="Lucro"
          tone="primary"
          value={formatMoney(summary?.profitCents ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Financeiro
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                Lancamentos e resultado
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setDateFrom(event.target.value)}
                type="date"
                value={dateFrom}
              />
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setDateTo(event.target.value)}
                type="date"
                value={dateTo}
              />
              <button
                className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
                onClick={reloadWithFilters}
                type="button"
              >
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar lançamento"
                value={query}
              />
            </div>
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) => setApartmentFilter(event.target.value)}
              value={apartmentFilter}
            >
              <option value={allValue}>Todos os apartamentos</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) => setOwnerFilter(event.target.value)}
              value={ownerFilter}
            >
              <option value={allValue}>Todos os proprietários</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
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
                  <th className="px-4 py-3 font-semibold">Lancamento</th>
                  <th className="px-4 py-3 font-semibold">Apartamento</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={5}>
                      Carregando financeiro...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={5}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-4">
                        <strong className="block font-semibold text-text-primary">
                          {entry.category}
                        </strong>
                        <span className="text-xs text-text-muted">
                          {entry.type === "revenue" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        <span className="block">{entry.apartmentName}</span>
                        <span className="text-xs text-text-muted">{entry.ownerName}</span>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {entry.occurredOn}
                      </td>
                      <td
                        className={`px-4 py-4 font-semibold ${
                          entry.type === "revenue" ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatMoney(entry.amountCents, entry.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            aria-label="Editar lançamento"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => startEdit(entry)}
                            type="button"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Remover lançamento"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-danger hover:text-danger"
                            onClick={() => setEntryToDelete(entry)}
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
          onSubmit={submitEntry}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plus aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {editingEntryId ? "Edição" : "Manual"}
                </p>
                <h3 className="text-lg font-semibold text-text-primary">
                  {editingEntryId ? "Editar lançamento" : "Novo lançamento"}
                </h3>
              </div>
            </div>
            {editingEntryId ? (
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
            <Field label="Apartamento">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, apartmentId: event.target.value })
                }
                required
                value={form.apartmentId}
              >
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as FinancialEntryType })
                }
                value={form.type}
              >
                <option value="revenue">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </Field>
            <Field label="Categoria">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="Hospedagem, limpeza, manutencao"
                required
                value={form.category}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  inputMode="decimal"
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="1200,00"
                  required
                  value={form.amount}
                />
              </Field>
              <Field label="Data">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) =>
                    setForm({ ...form, occurredOn: event.target.value })
                  }
                  required
                  type="date"
                  value={form.occurredOn}
                />
              </Field>
            </div>
            <Field label="Descricao">
              <textarea
                className="min-h-24 resize-none rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                value={form.description}
              />
            </Field>
          </div>

          <button
            className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Salvando..." : editingEntryId ? "Salvar" : "Criar"}
          </button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SummaryList title="Resultado por proprietário" items={summary?.byOwner ?? []} />
        <SummaryList title="Resultado por apartamento" items={summary?.byApartment ?? []} />
      </section>

      <ConfirmDialog
        confirmLabel="Remover"
        description={`O lançamento ${entryToDelete?.category ?? ""} será removido do resultado financeiro.`}
        isOpen={Boolean(entryToDelete)}
        isWorking={isDeleting}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => void removeEntry()}
        title="Remover lançamento?"
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  tone: "danger" | "primary" | "success";
  value: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "danger"
        ? "bg-danger-soft text-danger"
        : "bg-primary-soft text-primary";

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}

function SummaryList({
  items,
  title,
}: {
  items: NonNullable<FinancialSummary["byOwner"]>;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">Sem dados no periodo.</p>
        ) : (
          items.map((item) => (
            <article
              className="grid gap-2 rounded-xl border border-border bg-surface-muted p-4"
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-text-primary">{item.name}</strong>
                <span className="text-sm font-semibold text-text-primary">
                  {formatMoney(item.profitCents)}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Receita {formatMoney(item.revenueCents)} | Despesa{" "}
                {formatMoney(item.expenseCents)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
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
