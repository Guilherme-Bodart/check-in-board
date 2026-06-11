"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { Apartment, FinancialEntry, FinancialSummary } from "../../api";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { Input, Select } from "../../components/ui/form-controls";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { Toolbar } from "../../components/ui/toolbar";
import { fetchApartments } from "../dashboard/dashboard-api";
import { fetchOwners } from "../owners/owners-api";
import { readStoredSession } from "../../lib/session-storage";
import {
  deleteFinancialEntry,
  fetchFinancialEntries,
  fetchFinancialSummary,
  type FinanceFilters,
} from "./finance-api";
import { formatMoney } from "./money";

const allValue = "all";

export function FinancePage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState(allValue);
  const [ownerFilter, setOwnerFilter] = useState(allValue);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="grid gap-6">
      <PageHeader
        actionHref="/financeiro/lancamentos/novo"
        actionIcon={Plus}
        actionLabel="Novo lançamento"
        description="Acompanhe receitas, despesas e resultado por período, proprietário e apartamento."
        eyebrow="Financeiro"
        title="Lançamentos e resultado"
      />

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

      <Panel>
        <Toolbar
          actions={
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary-soft"
              href="/financeiro/lancamentos/novo"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Novo
            </Link>
          }
        >
          <Input
            className="sm:w-40"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
          <Input
            className="sm:w-40"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
          <button
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
            onClick={reloadWithFilters}
            type="button"
          >
            Atualizar
          </button>
        </Toolbar>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar lançamento"
              value={query}
            />
          </div>
          <Select
            onChange={(event) => setApartmentFilter(event.target.value)}
            value={apartmentFilter}
          >
            <option value={allValue}>Todos os apartamentos</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </Select>
          <Select
            onChange={(event) => setOwnerFilter(event.target.value)}
            value={ownerFilter}
          >
            <option value={allValue}>Todos os proprietários</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-5">
          {isLoading || filteredEntries.length > 0 ? (
            <DataTable>
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Lançamento</th>
                  <th className="px-4 py-3 font-semibold">Apartamento</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <TableStateRow colSpan={5}>Carregando financeiro...</TableStateRow>
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
                          <Link
                            aria-label="Editar lançamento"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                            href={`/financeiro/lancamentos/${entry.id}/editar`}
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </Link>
                          <IconButton
                            aria-label="Remover lançamento"
                            icon={Trash2}
                            onClick={() => setEntryToDelete(entry)}
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
              actionHref="/financeiro/lancamentos/novo"
              actionLabel="Criar lançamento"
              description="Registre uma receita ou despesa para o período selecionado."
              icon={Banknote}
              title="Nenhum lançamento encontrado"
            />
          )}
        </div>
      </Panel>

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
    <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
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
    <Panel>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary">Sem dados no período.</p>
        ) : (
          items.map((item) => (
            <article
              className="grid gap-2 rounded-lg border border-border bg-surface-muted p-4"
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
    </Panel>
  );
}
