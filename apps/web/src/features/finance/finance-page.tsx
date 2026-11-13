"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Info,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  isAbortError,
  type Apartment,
  type AuthRole,
  type FinancialEntry,
  type FinancialSummary,
} from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { Input, Select } from "../../components/ui/form-controls";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { Toolbar } from "../../components/ui/toolbar";
import { fetchMe } from "../auth/auth-api";
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

type PeriodPreset = "current_month" | "last_month" | "last_week";

const periodPresets: { id: PeriodPreset; label: string }[] = [
  { id: "current_month", label: "Mês Atual" },
  { id: "last_month", label: "Mês Passado" },
  { id: "last_week", label: "Semana Passada" },
];

const categoryLabels: Record<string, string> = {
  consumo: "Consumo / Mercado",
  manutencao: "Manutenção",
  condominio: "Condomínio",
  limpeza: "Limpeza",
  enxoval: "Enxoval",
  contas: "Contas / Energia",
  taxas: "Taxas",
  outros: "Outros",
};

function formatCategoryLabel(category: string): string {
  const trimmed = category.trim();
  return categoryLabels[trimmed.toLowerCase()] ?? trimmed;
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodPresetRange(preset: PeriodPreset): { dateFrom: string; dateTo: string } {
  const today = new Date();

  if (preset === "current_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { dateFrom: toLocalDateInput(start), dateTo: toLocalDateInput(end) };
  }

  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { dateFrom: toLocalDateInput(start), dateTo: toLocalDateInput(end) };
  }

  const dayOfWeek = today.getDay();
  const diffToCurrentMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - diffToCurrentMonday,
  );
  const prevMonday = new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate() - 7,
  );
  const prevSunday = new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate() - 1,
  );
  return { dateFrom: toLocalDateInput(prevMonday), dateTo: toLocalDateInput(prevSunday) };
}

export function FinancePage() {
  const [userRole, setUserRole] = useState<AuthRole | null>(null);
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
  const loadAbortRef = useRef<AbortController | null>(null);

  const isHostAdmin = userRole === "host_admin";

  async function loadFinance(nextFilters: FinanceFilters = currentFilters()) {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    const session = readStoredSession();

    if (!session || !nextFilters.dateFrom || !nextFilters.dateTo) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");
    let isAborted = false;

    try {
      let resolvedRole = userRole;
      if (!resolvedRole) {
        const me = await fetchMe(session.token);
        if (controller.signal.aborted) return;
        resolvedRole = me.memberships.find((m) => m.isActive)?.role ?? null;
        setUserRole(resolvedRole);
      }

      const [nextApartments, nextEntries, nextSummary] = await Promise.all([
        fetchApartments(session.token),
        fetchFinancialEntries(session.token, nextFilters),
        fetchFinancialSummary(session.token, nextFilters),
      ]);

      if (controller.signal.aborted) return;

      if (resolvedRole === "host_admin") {
        const nextOwners = await fetchOwners(session.token);
        if (controller.signal.aborted) return;
        setOwners(nextOwners.map((owner) => ({ id: owner.id, name: owner.name })));
      } else {
        const uniqueOwners = new Map<string, string>();
        for (const apartment of nextApartments) {
          uniqueOwners.set(apartment.owner.id, apartment.owner.name);
        }
        setOwners(
          Array.from(uniqueOwners.entries()).map(([id, name]) => ({ id, name })),
        );
      }

      setApartments(nextApartments);
      setEntries(nextEntries);
      setSummary(nextSummary);
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        isAborted = true;
        return;
      }
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar financeiro.",
      );
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        if (!controller.signal.aborted && !isAborted) {
          setIsLoading(false);
        }
      }
    }
  }

  useEffect(() => {
    const initialRange = getPeriodPresetRange("current_month");
    setDateFrom(initialRange.dateFrom);
    setDateTo(initialRange.dateTo);
    void loadFinance(initialRange);

    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.apartmentName,
        entry.ownerName,
        entry.category,
        formatCategoryLabel(entry.category),
        entry.description,
      ]
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

  function applyPeriodPreset(preset: PeriodPreset) {
    const nextRange = getPeriodPresetRange(preset);
    setDateFrom(nextRange.dateFrom);
    setDateTo(nextRange.dateTo);
    void loadFinance({
      ...currentFilters(),
      dateFrom: nextRange.dateFrom,
      dateTo: nextRange.dateTo,
    });
  }

  function handleApartmentFilterChange(nextApartment: string) {
    setApartmentFilter(nextApartment);
    void loadFinance({
      ...currentFilters(),
      apartmentId: nextApartment === allValue ? undefined : nextApartment,
    });
  }

  function handleOwnerFilterChange(nextOwner: string) {
    setOwnerFilter(nextOwner);
    void loadFinance({
      ...currentFilters(),
      ownerId: nextOwner === allValue ? undefined : nextOwner,
    });
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
      if (isAbortError(error)) return;
      setMessage(
        error instanceof Error ? error.message : "Falha ao remover lançamento.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          description="Acompanhe receitas, despesas e resultado por período e apartamento."
          eyebrow="Financeiro"
          title="Lançamentos e resultado"
        />

        {isHostAdmin ? (
          <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap shrink-0">
            <Button asChild className="flex-1 sm:flex-initial" size="md" variant="primary">
              <Link href="/financeiro/lancamentos/novo?type=expense&category=consumo">
                <ShoppingCart aria-hidden className="h-4 w-4" />
                + Compra / Despesa
              </Link>
            </Button>
            <Button asChild className="flex-1 sm:flex-initial" size="md" variant="secondary">
              <Link href="/financeiro/lancamentos/novo">
                <Plus aria-hidden className="h-4 w-4" />
                Novo lançamento
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary shadow-2xs">
        <Badge tone="info">Demonstrativo Gerencial</Badge>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Info aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span>
            Os valores exibidos são demonstrativos/gerenciais para controle e transparência — não há processamento de pagamentos dentro da plataforma.
          </span>
        </span>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryCard
          icon={TrendingUp}
          label="Receita Bruta"
          tone="success"
          value={formatMoney(summary?.revenueCents ?? 0)}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Despesas"
          tone="danger"
          value={formatMoney(summary?.expenseCents ?? 0)}
        />
        <div className="col-span-2 md:col-span-1">
          <SummaryCard
            icon={Banknote}
            label="Resultado Operacional (Lucro)"
            tone="primary"
            value={formatMoney(summary?.profitCents ?? 0)}
          />
        </div>
      </section>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {periodPresets.map((preset) => {
            const range = getPeriodPresetRange(preset.id);
            const isActive = dateFrom === range.dateFrom && dateTo === range.dateTo;
            return (
              <Button
                aria-pressed={isActive}
                key={preset.id}
                onClick={() => applyPeriodPreset(preset.id)}
                size="sm"
                type="button"
                variant={isActive ? "primary" : "secondary"}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <Toolbar>
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
          <Button onClick={reloadWithFilters} size="md">
            Atualizar
          </Button>
        </Toolbar>

        <div
          className={`mt-4 grid gap-3 ${
            isHostAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"
          }`}
        >
          <div className="relative min-w-0">
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
            onChange={(event) => handleApartmentFilterChange(event.target.value)}
            value={apartmentFilter}
          >
            <option value={allValue}>Todos os apartamentos</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </Select>
          {isHostAdmin ? (
            <Select
              onChange={(event) => handleOwnerFilterChange(event.target.value)}
              value={ownerFilter}
            >
              <option value={allValue}>Todos os proprietários</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-5">
          {isLoading || filteredEntries.length > 0 ? (
            <>
              {/* Mobile-First Financial Entry Cards (< 768px) */}
              <div className="grid gap-3 md:hidden">
                {isLoading ? (
                  <div className="rounded-xl border border-border py-10 text-center text-xs text-text-muted">
                    Carregando financeiro...
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <article
                      className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface-muted/40 p-3.5"
                      key={entry.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                entry.type === "revenue"
                                  ? "bg-success-soft text-success"
                                  : "bg-danger-soft text-danger"
                              }`}
                            >
                              {entry.type === "revenue" ? "Receita" : "Despesa"}
                            </span>
                            <span className="text-xs font-medium text-text-muted">
                              {entry.occurredOn}
                            </span>
                          </div>
                          <strong className="mt-1.5 block truncate text-sm font-bold text-text-primary">
                            {formatCategoryLabel(entry.category)}
                          </strong>
                          <p className="truncate text-xs text-text-secondary">
                            {entry.apartmentName} • {entry.ownerName}
                          </p>
                        </div>

                        <strong
                          className={`shrink-0 text-sm font-bold ${
                            entry.type === "revenue" ? "text-success" : "text-danger"
                          }`}
                        >
                          {entry.type === "revenue" ? "+ " : "- "}
                          {formatMoney(entry.amountCents, entry.currency)}
                        </strong>
                      </div>

                      {isHostAdmin ? (
                        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                          <Link
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                            href={`/financeiro/lancamentos/${entry.id}/editar`}
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                          <IconButton
                            aria-label="Remover lançamento"
                            icon={Trash2}
                            onClick={() => setEntryToDelete(entry)}
                            variant="danger"
                          />
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block">
                <DataTable>
                  <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Lançamento</th>
                      <th className="px-4 py-3 font-semibold">Apartamento</th>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      {isHostAdmin ? (
                        <th className="px-4 py-3 font-semibold">Ações</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {isLoading ? (
                      <TableStateRow colSpan={isHostAdmin ? 5 : 4}>
                        Carregando financeiro...
                      </TableStateRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-4">
                            <strong className="block font-semibold text-text-primary">
                              {formatCategoryLabel(entry.category)}
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
                          {isHostAdmin ? (
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
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </DataTable>
              </div>
            </>
          ) : (
            <EmptyState
              actionHref={isHostAdmin ? "/financeiro/lancamentos/novo" : undefined}
              actionLabel={isHostAdmin ? "Criar lançamento" : undefined}
              description={
                isHostAdmin
                  ? "Registre uma receita ou despesa para o período selecionado."
                  : "Não há lançamentos registrados para seus apartamentos no período selecionado."
              }
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
        description={`O lançamento ${entryToDelete ? formatCategoryLabel(entryToDelete.category) : ""} será removido do resultado financeiro.`}
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
    <article className="relative overflow-hidden rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-2xs">
      {tone === "primary" ? (
        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted truncate">
          {label}
        </span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon aria-hidden className="h-3.5 w-3.5" />
        </span>
      </div>
      <strong className="mt-1.5 block text-lg sm:text-2xl font-bold tracking-tight text-text-primary truncate">
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
