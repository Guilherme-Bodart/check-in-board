"use client";

import React, { type FormEvent, useEffect, useRef, useState } from "react";
import { CalendarCheck2, CheckCircle2, ChevronLeft, ChevronRight, Info, Plus, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  isAbortError,
  type Apartment,
  type AuthRole,
  type RentalStay,
  type FinancialEntry,
} from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable } from "../../components/ui/data-table";
import { Field, Input, Select } from "../../components/ui/form-controls";
import { IconButton } from "../../components/ui/icon-button";
import { MessageBanner } from "../../components/ui/message-banner";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { fetchMe } from "../auth/auth-api";
import { fetchApartment } from "../dashboard/dashboard-api";
import { fetchReservations } from "../reservations/reservations-api";
import { attachApartmentDetails, reservationLocalDate, type ReservationListItem } from "../reservations/reservation-view-model";
import { fetchRentalStays } from "./rental-stay-api";
import { fetchFinancialEntries } from "./finance-api";
import { parseMoneyToCents } from "./money";
import {
  applyRecurringExpensesForMonth,
  createRecurringExpense,
  deleteRecurringExpense,
  fetchRecurringExpenses,
  type RecurringExpenseItem,
} from "./recurring-expenses-api";
import { BillingModal, type BillingData } from "./components/billing-modal";
import { messages } from "../../i18n";

const recurringCategoryOptions = [
  { value: "condominio", label: "Condomínio" },
  { value: "contas", label: "Contas / Energia / Internet" },
  { value: "taxas", label: "Taxas / IPTU" },
  { value: "limpeza", label: "Limpeza" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
] as const;

const recurringCategoryLabels: Record<string, string> = {
  condominio: "Condomínio",
  contas: "Contas",
  taxas: "Taxas",
  limpeza: "Limpeza",
  manutencao: "Manutenção",
  outros: "Outros",
};

const recurringTitleSuggestions = [
  { title: "Condomínio", category: "condominio" },
  { title: "Internet", category: "contas" },
  { title: "Energia", category: "contas" },
  { title: "IPTU", category: "taxas" },
] as const;

function formatRecurringCategory(category: string): string {
  return recurringCategoryLabels[category.trim().toLowerCase()] ?? category;
}

export function ApartmentFinancePage({ apartmentId }: { apartmentId: string }) {
  const [userRole, setUserRole] = useState<AuthRole | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseItem[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);

  const [month, setMonth] = useState("");
  const [activeTab, setActiveTab] = useState<"statement" | "pending">("statement");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringCategory, setRecurringCategory] = useState("condominio");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState("5");
  const [recurringNotes, setRecurringNotes] = useState("");
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [isApplyingRecurring, setIsApplyingRecurring] = useState(false);
  const [isDeletingRecurring, setIsDeletingRecurring] = useState(false);
  const [recurringToDelete, setRecurringToDelete] = useState<RecurringExpenseItem | null>(null);
  const [recurringBanner, setRecurringBanner] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);

  const isHostAdmin = userRole === "host_admin";
  const loadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);

  useEffect(() => {
    if (!month) return;
    setRecurringBanner(null);
    void loadData();

    return () => {
      loadAbortRef.current?.abort();
    };
  }, [apartmentId, month]);

  async function loadData() {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    const session = readStoredSession();
    if (!session) {
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

      const apt = await fetchApartment(session.token, apartmentId);
      if (controller.signal.aborted) return;
      setApartment(apt);

      // Fetch reservations and stays for the month + some margin
      const dateFrom = new Date(`${month}-01T12:00:00`);
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      const dateTo = new Date(`${month}-01T12:00:00`);
      dateTo.setMonth(dateTo.getMonth() + 2);

      const monthStart = `${month}-01`;
      const [yearValue, monthValue] = month.split("-").map(Number);
      const endOfMonthDate = new Date(yearValue, monthValue, 0); // Last day of month
      const monthEnd = endOfMonthDate.toISOString().slice(0, 10);

      const [reservationGroups, stays, entries, recurringItems] = await Promise.all([
        fetchReservations(session.token, apartmentId),
        fetchRentalStays(session.token, {
          dateFrom: dateFrom.toISOString().slice(0, 10),
          dateTo: dateTo.toISOString().slice(0, 10),
          apartmentId,
        }),
        fetchFinancialEntries(session.token, {
          dateFrom: monthStart,
          dateTo: monthEnd,
          apartmentId,
        }),
        fetchRecurringExpenses(session.token, apartmentId),
      ]);

      if (controller.signal.aborted) return;

      setFinancialEntries(entries);
      setRentalStays(stays);
      setReservations(attachApartmentDetails(reservationGroups, [apt]));
      setRecurringExpenses(recurringItems);
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        isAborted = true;
        return;
      }
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados financeiros.");
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        if (!controller.signal.aborted && !isAborted) {
          setIsLoading(false);
        }
      }
    }
  }

  async function handleCreateRecurringExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    if (!session || !isHostAdmin) return;

    const trimmedTitle = recurringTitle.trim();
    if (!trimmedTitle) {
      setRecurringBanner({
        isError: true,
        message: "Informe o título da despesa fixa.",
      });
      return;
    }

    const amountCents = parseMoneyToCents(recurringAmount);
    if (amountCents <= 0) {
      setRecurringBanner({
        isError: true,
        message: "Informe um valor válido maior que zero.",
      });
      return;
    }

    const dayOfMonth = Number(recurringDayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      setRecurringBanner({
        isError: true,
        message: "O dia do vencimento deve ser entre 1 e 28.",
      });
      return;
    }

    setIsSavingRecurring(true);
    setRecurringBanner(null);

    try {
      const created = await createRecurringExpense(session.token, apartmentId, {
        title: trimmedTitle,
        category: recurringCategory,
        amountCents,
        dayOfMonth,
        notes: recurringNotes,
        active: true,
      });

      setRecurringExpenses((prev) => [...prev, created]);
      setRecurringTitle("");
      setRecurringAmount("");
      setRecurringNotes("");
      setRecurringDayOfMonth("5");
      setRecurringBanner({
        isError: false,
        message: `Despesa fixa "${created.title}" adicionada.`,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      setRecurringBanner({
        isError: true,
        message:
          error instanceof Error ? error.message : "Falha ao adicionar despesa fixa.",
      });
    } finally {
      setIsSavingRecurring(false);
    }
  }

  async function handleDeleteRecurringExpense() {
    const session = readStoredSession();
    if (!session || !isHostAdmin || !recurringToDelete) return;

    setIsDeletingRecurring(true);
    setRecurringBanner(null);

    try {
      await deleteRecurringExpense(session.token, recurringToDelete.id);
      const removedTitle = recurringToDelete.title;
      setRecurringExpenses((prev) =>
        prev.filter((item) => item.id !== recurringToDelete.id),
      );
      setRecurringToDelete(null);
      setRecurringBanner({
        isError: false,
        message: `Despesa fixa "${removedTitle}" removida.`,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      setRecurringBanner({
        isError: true,
        message:
          error instanceof Error ? error.message : "Falha ao remover despesa fixa.",
      });
    } finally {
      setIsDeletingRecurring(false);
    }
  }

  async function handleApplyRecurringExpenses() {
    const session = readStoredSession();
    if (!session || !isHostAdmin || !month) return;

    setIsApplyingRecurring(true);
    setRecurringBanner(null);

    try {
      const result = await applyRecurringExpensesForMonth(
        session.token,
        apartmentId,
        month,
      );
      await loadData();
      setRecurringBanner({
        isError: false,
        message: `${result.createdCount} ${result.createdCount === 1 ? "lançada" : "lançadas"}, ${result.skippedCount} já ${result.skippedCount === 1 ? "aplicada" : "aplicadas"} neste mês (${result.month}).`,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      setRecurringBanner({
        isError: true,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao lançar despesas fixas do mês.",
      });
    } finally {
      setIsApplyingRecurring(false);
    }
  }

  function shiftMonth(amount: number) {
    const [yearValue, monthValue] = month.split("-").map(Number);
    const date = new Date(yearValue, monthValue - 1 + amount, 1, 12);
    const year = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    setMonth(`${year}-${nextMonth}`);
  }

  // Filter reservations in current month
  const monthStart = `${month}-01`;
  const nextMonthStart = (() => {
    const [yearValue, monthValue] = month.split("-").map(Number);
    const date = new Date(yearValue, monthValue, 1, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const currentMonthReservations = reservations.filter(res => {
    const start = reservationLocalDate(res.startsAt);
    const end = reservationLocalDate(res.endsAt);
    return start < nextMonthStart && end > monthStart;
  });

  const pendingReservations = currentMonthReservations.filter(
    (res) => !rentalStays.some((s) => s.id === res.id)
  );

  // Statement calculation
  const staysThisMonth = rentalStays.filter(s => {
    return s.checkOut.startsWith(month);
  });

  const statementData = staysThisMonth.map(stay => {
    const entries = financialEntries.filter(e => e.rentalStayId === stay.id);
    const managementFee = Math.round(stay.rentAmountCents * (apartment?.managementCommissionBps ?? 1500) / 10000);
    const rentRevenue = stay.rentAmountCents;
    const additionalRevenue = entries.filter(e => e.type === "revenue").reduce((acc, e) => acc + e.amountCents, 0);
    const expenses = entries.filter(e => e.type === "expense").reduce((acc, e) => acc + e.amountCents, 0);
    
    return {
      stay,
      entries,
      managementFee,
      rentRevenue,
      additionalRevenue,
      expenses,
      net: rentRevenue + additionalRevenue - managementFee - expenses,
      nights: Math.round((new Date(stay.checkOut).getTime() - new Date(stay.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
    };
  });

  const generalEntries = financialEntries.filter(e => !e.rentalStayId);
  const generalRevenue = generalEntries.filter(e => e.type === "revenue").reduce((acc, e) => acc + e.amountCents, 0);
  const generalExpenses = generalEntries.filter(e => e.type === "expense").reduce((acc, e) => acc + e.amountCents, 0);

  const totalNights = statementData.reduce((acc, s) => acc + s.nights, 0);
  const totalGross = statementData.reduce((acc, s) => acc + s.rentRevenue + s.additionalRevenue, 0) + generalRevenue;
  const totalManagementFee = statementData.reduce((acc, s) => acc + s.managementFee, 0);
  const totalStayExpenses = statementData.reduce((acc, s) => acc + s.expenses, 0);
  
  const grandTotalExpenses = totalManagementFee + totalStayExpenses + generalExpenses;
  const netProfit = totalGross - grandTotalExpenses;

  const formatMoney = (cents: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="grid gap-6">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary"
          href={`/apartamentos/${apartmentId}`}
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <PageHeader
            description={`Gestão financeira do ${apartment?.name ?? "Apartamento"}`}
            eyebrow="Financeiro"
            title="Financeiro"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary shadow-2xs">
        <Badge tone="info">Demonstrativo Gerencial</Badge>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Info aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span>
            Valores demonstrativos para conferência de resultados — nenhum processamento financeiro ou pagamento ocorre pela plataforma.
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-surface-muted p-1">
          <button
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "statement" || !isHostAdmin
                ? "bg-surface text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setActiveTab("statement")}
            type="button"
          >
            Demonstrativo Mensal
          </button>
          {isHostAdmin ? (
            <button
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "pending"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab("pending")}
              type="button"
            >
              Reservas a Faturar
              {pendingReservations.length > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-danger text-[10px] text-white">
                  {pendingReservations.length}
                </span>
              )}
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label={messages.calendar.previousMonth}
            className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary"
            onClick={() => shiftMonth(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <input
            aria-label={messages.calendar.monthLabel}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
          <button
            aria-label={messages.calendar.nextMonth}
            className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary"
            onClick={() => shiftMonth(1)}
            type="button"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Panel>
        {isLoading ? (
          <p className="text-sm text-text-secondary p-4">Carregando...</p>
        ) : message ? (
          <p className="text-sm text-danger p-4">{message}</p>
        ) : activeTab === "pending" && isHostAdmin ? (
          <div className="grid gap-4">
            {pendingReservations.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">Tudo certo!</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Não há reservas concluídas pendentes de faturamento neste mês.
                </p>
              </div>
            ) : (
              pendingReservations.map((reservation) => (
                <article
                  className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  key={reservation.id}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-text-primary">
                      {reservation.rawSummary ?? messages.calendar.reservationFallback}
                    </strong>
                    <p className="mt-1 text-sm text-text-secondary">
                      {new Date(reservation.startsAt).toLocaleDateString()} a {new Date(reservation.endsAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="neutral">{reservation.provider}</Badge>
                    <Button
                      onClick={() =>
                        setBillingData({
                          id: reservation.id,
                          apartmentId: reservation.apartmentId,
                          guestName: reservation.rawSummary || "Hóspede (Automático)",
                          channel: reservation.provider,
                          checkIn: reservation.startsAt,
                          checkOut: reservation.endsAt,
                        })
                      }
                      size="sm"
                    >
                      Faturar
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Entradas</p>
                <p className="mt-1 text-lg font-semibold text-success">{formatMoney(totalGross)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Saídas</p>
                <p className="mt-1 text-lg font-semibold text-danger">{formatMoney(grandTotalExpenses)}</p>
              </div>
              <div className="rounded-xl border border-border bg-primary-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Saldo Líquido</p>
                <p className="mt-1 text-lg font-semibold text-primary">{formatMoney(netProfit)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ocupação</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{totalNights} noites</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm text-text-secondary">
                <thead className="bg-surface-muted text-xs uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Data / Período</th>
                    <th className="px-4 py-3 font-semibold text-right">Entradas</th>
                    <th className="px-4 py-3 font-semibold text-right">Saídas</th>
                    <th className="px-4 py-3 font-semibold text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statementData.length === 0 && generalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        Nenhuma movimentação neste mês.
                      </td>
                    </tr>
                  ) : null}

                  {statementData.map((data) => (
                    <React.Fragment key={data.stay.id}>
                      <tr className="bg-surface hover:bg-surface-muted/50 transition">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          Hospedagem: {data.stay.guestName || "Hóspede"}
                          <br/><span className="text-xs font-normal text-text-muted">{data.stay.channel} ({data.nights} noites)</span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(data.stay.checkIn).toLocaleDateString()} a {new Date(data.stay.checkOut).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-success font-medium">
                          {formatMoney(data.rentRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3 text-right font-semibold text-text-primary"></td>
                      </tr>
                      {/* Taxa de Gestão */}
                      <tr className="bg-surface/50">
                        <td className="px-4 py-2 pl-8 text-sm text-text-secondary">↳ Taxa de Gestão ({(apartment?.managementCommissionBps ?? 1500) / 100}%)</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right text-danger">{formatMoney(data.managementFee)}</td>
                        <td className="px-4 py-2"></td>
                      </tr>
                      {/* Entradas Extras da Reserva */}
                      {data.entries.map((entry) => (
                        <tr key={entry.id} className="bg-surface/50">
                          <td className="px-4 py-2 pl-8 text-sm text-text-secondary">
                            ↳ {entry.category} {entry.description ? ` - ${entry.description}` : ""}
                          </td>
                          <td className="px-4 py-2 text-xs">{new Date(entry.occurredOn).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-right text-success">
                            {entry.type === "revenue" ? formatMoney(entry.amountCents) : ""}
                          </td>
                          <td className="px-4 py-2 text-right text-danger">
                            {entry.type === "expense" ? formatMoney(entry.amountCents) : ""}
                          </td>
                          <td className="px-4 py-2"></td>
                        </tr>
                      ))}
                      {/* Subtotal da Reserva */}
                      <tr className="bg-surface-muted/30 border-b-2 border-border">
                        <td className="px-4 py-2 text-right font-medium text-text-muted" colSpan={4}>Subtotal Reserva:</td>
                        <td className="px-4 py-2 text-right font-bold text-text-primary">{formatMoney(data.net)}</td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* General Entries */}
                  {generalEntries.length > 0 && (
                    <tr className="bg-surface-muted">
                      <td colSpan={5} className="px-4 py-3 font-semibold text-text-primary">
                        Despesas / Receitas Gerais do Apartamento
                      </td>
                    </tr>
                  )}
                  {generalEntries.map((entry) => (
                    <tr key={entry.id} className="bg-surface hover:bg-surface-muted/50 transition">
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">{entry.category}</span>
                        {entry.description && <span className="block text-xs text-text-muted">{entry.description}</span>}
                      </td>
                      <td className="px-4 py-3">{new Date(entry.occurredOn).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right text-success">
                        {entry.type === "revenue" ? formatMoney(entry.amountCents) : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-danger">
                        {entry.type === "expense" ? formatMoney(entry.amountCents) : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary">
                        {formatMoney(entry.type === "revenue" ? entry.amountCents : -entry.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <Panel className="grid gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Repeat aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-text-primary">
                  Despesas Fixas Mensais
                </h2>
                <Badge tone="neutral">
                  {recurringExpenses.filter((item) => item.active).length}{" "}
                  {recurringExpenses.filter((item) => item.active).length === 1
                    ? "ativa"
                    : "ativas"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Custos recorrentes do imóvel.{" "}
                {isHostAdmin
                  ? "Lance todas as despesas ativas no mês selecionado com 1 clique."
                  : "Visualização das despesas fixas configuradas para este apartamento."}
              </p>
            </div>
          </div>

          {isHostAdmin ? (
            <Button
              className="shrink-0"
              disabled={
                isApplyingRecurring ||
                isLoading ||
                !month ||
                recurringExpenses.every((item) => !item.active)
              }
              onClick={() => void handleApplyRecurringExpenses()}
              size="md"
              variant="primary"
            >
              <CalendarCheck2 aria-hidden className="h-4 w-4" />
              {isApplyingRecurring ? "Lançando..." : "Lançar Fixas do Mês"}
            </Button>
          ) : null}
        </div>

        <MessageBanner
          isError={recurringBanner?.isError ?? false}
          message={recurringBanner?.message ?? ""}
        />

        {isHostAdmin ? (
          <form
            className="grid gap-4 rounded-xl border border-border bg-surface-muted/40 p-4"
            onSubmit={handleCreateRecurringExpense}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">
                Sugestões rápidas:
              </span>
              {recurringTitleSuggestions.map((suggestion) => {
                const isSelected =
                  recurringTitle.trim().toLowerCase() ===
                  suggestion.title.toLowerCase();
                return (
                  <Button
                    key={suggestion.title}
                    onClick={() => {
                      setRecurringTitle(suggestion.title);
                      setRecurringCategory(suggestion.category);
                    }}
                    size="xs"
                    type="button"
                    variant={isSelected ? "primary" : "secondary"}
                  >
                    {suggestion.title}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)]">
              <Field className="min-w-0" label="Título">
                <Input
                  maxLength={160}
                  onChange={(event) => setRecurringTitle(event.target.value)}
                  placeholder="Ex: Condomínio"
                  required
                  value={recurringTitle}
                />
              </Field>

              <Field className="min-w-0" label="Categoria">
                <Select
                  aria-label="Categoria da despesa fixa"
                  onValueChange={setRecurringCategory}
                  value={recurringCategory}
                >
                  {recurringCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field className="min-w-0" label="Valor (R$)">
                <Input
                  inputMode="decimal"
                  onChange={(event) => setRecurringAmount(event.target.value)}
                  placeholder="650,00"
                  required
                  value={recurringAmount}
                />
              </Field>

              <Field className="min-w-0" label="Dia (1–28)">
                <Input
                  max={28}
                  min={1}
                  onChange={(event) => setRecurringDayOfMonth(event.target.value)}
                  required
                  type="number"
                  value={recurringDayOfMonth}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="min-w-0 flex-1" label="Observações (opcional)">
                <Input
                  maxLength={500}
                  onChange={(event) => setRecurringNotes(event.target.value)}
                  placeholder="Ex: Boleto mensal com vencimento fixo"
                  value={recurringNotes}
                />
              </Field>

              <Button
                className="shrink-0"
                disabled={isSavingRecurring}
                size="md"
                type="submit"
                variant="secondary"
              >
                <Plus aria-hidden className="h-4 w-4" />
                {isSavingRecurring ? "Adicionando..." : "Adicionar Despesa Fixa"}
              </Button>
            </div>
          </form>
        ) : null}

        {recurringExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center text-sm text-text-secondary">
            Nenhuma despesa fixa mensal cadastrada para este apartamento.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {recurringExpenses.map((item) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 p-3.5"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {formatRecurringCategory(item.category)}
                        </Badge>
                        <Badge tone={item.active ? "info" : "warning"}>
                          {item.active ? `Dia ${item.dayOfMonth}` : "Inativa"}
                        </Badge>
                      </div>
                      <strong className="mt-1.5 block truncate text-sm font-bold text-text-primary">
                        {item.title}
                      </strong>
                      {item.notes ? (
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <strong className="shrink-0 text-sm font-bold text-danger">
                      {formatMoney(item.amountCents)}
                    </strong>
                  </div>

                  {isHostAdmin ? (
                    <div className="flex justify-end border-t border-border/60 pt-2">
                      <IconButton
                        aria-label={`Remover ${item.title}`}
                        icon={Trash2}
                        onClick={() => setRecurringToDelete(item)}
                        variant="danger"
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <DataTable>
                <thead className="bg-surface-muted text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Despesa</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    {isHostAdmin ? (
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {recurringExpenses.map((item) => (
                    <tr className="transition hover:bg-surface-muted/40" key={item.id}>
                      <td className="px-4 py-3">
                        <strong className="block font-semibold text-text-primary">
                          {item.title}
                        </strong>
                        {item.notes ? (
                          <span className="block text-xs text-text-muted">
                            {item.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">
                          {formatRecurringCategory(item.category)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={item.active ? "info" : "warning"}>
                          {item.active ? `Todo dia ${item.dayOfMonth}` : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">
                        {formatMoney(item.amountCents)}
                      </td>
                      {isHostAdmin ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <IconButton
                              aria-label={`Remover ${item.title}`}
                              icon={Trash2}
                              onClick={() => setRecurringToDelete(item)}
                              variant="danger"
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </Panel>

      {isHostAdmin ? (
        <>
          <BillingModal
            data={billingData}
            isOpen={billingData !== null}
            onClose={() => setBillingData(null)}
            onSuccess={() => {
              setBillingData(null);
              void loadData();
            }}
          />

          <ConfirmDialog
            confirmLabel="Remover"
            description={`A despesa fixa "${recurringToDelete?.title ?? ""}" será removida deste apartamento. Lançamentos já aplicados em meses anteriores serão mantidos.`}
            isOpen={Boolean(recurringToDelete)}
            isWorking={isDeletingRecurring}
            onCancel={() => setRecurringToDelete(null)}
            onConfirm={() => void handleDeleteRecurringExpense()}
            title="Remover despesa fixa?"
          />
        </>
      ) : null}
    </div>
  );
}
