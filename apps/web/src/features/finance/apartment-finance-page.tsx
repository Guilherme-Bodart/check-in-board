"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import Link from "next/link";

import type { Apartment, RentalStay, FinancialEntry } from "../../api";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartment } from "../dashboard/dashboard-api";
import { fetchReservations } from "../reservations/reservations-api";
import { attachApartmentDetails, reservationLocalDate, type ReservationListItem } from "../reservations/reservation-view-model";
import { fetchRentalStays } from "./rental-stay-api";
import { fetchFinancialEntries } from "./finance-api";
import { BillingModal, type BillingData } from "./components/billing-modal";
import { messages } from "../../i18n";

export function ApartmentFinancePage({ apartmentId }: { apartmentId: string }) {
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  
  const [month, setMonth] = useState("");
  const [activeTab, setActiveTab] = useState<"statement" | "pending">("statement");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);

  useEffect(() => {
    if (!month) return;
    void loadData();
  }, [apartmentId, month]);

  async function loadData() {
    const session = readStoredSession();
    if (!session) return;

    setIsLoading(true);
    setMessage("");

    try {
      const apt = await fetchApartment(session.token, apartmentId);
      setApartment(apt);

      // Fetch reservations and stays for the month + some margin
      const dateFrom = new Date(`${month}-01T12:00:00`);
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      const dateTo = new Date(`${month}-01T12:00:00`);
      dateTo.setMonth(dateTo.getMonth() + 2);

      const reservationGroups = await fetchReservations(session.token, apartmentId);
      const stays = await fetchRentalStays(session.token, {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        apartmentId,
      });

      // Fetch exact month entries for the statement
      const monthStart = `${month}-01`;
      const [yearValue, monthValue] = month.split("-").map(Number);
      const endOfMonthDate = new Date(yearValue, monthValue, 0); // Last day of month
      const monthEnd = endOfMonthDate.toISOString().slice(0, 10);

      const entries = await fetchFinancialEntries(session.token, {
        dateFrom: monthStart,
        dateTo: monthEnd,
        apartmentId,
      });

      setFinancialEntries(entries);
      setRentalStays(stays);
      setReservations(attachApartmentDetails(reservationGroups, [apt]));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados financeiros.");
    } finally {
      setIsLoading(false);
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
      <div className="flex items-center gap-4">
        <Link
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary"
          href={`/apartamentos/${apartmentId}`}
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </Link>
        <PageHeader
          description={`Gestão financeira do ${apartment?.name ?? "Apartamento"}`}
          eyebrow="Financeiro"
          title="Financeiro"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-surface-muted p-1">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "statement"
                ? "bg-surface text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setActiveTab("statement")}
            type="button"
          >
            Demonstrativo Mensal
          </button>
          <button
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
        ) : activeTab === "pending" ? (
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
                  <div>
                    <strong className="text-sm font-semibold text-text-primary">
                      {reservation.rawSummary ?? messages.calendar.reservationFallback}
                    </strong>
                    <p className="mt-1 text-sm text-text-secondary">
                      {new Date(reservation.startsAt).toLocaleDateString()} a {new Date(reservation.endsAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                      {reservation.provider}
                    </span>
                    <button
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
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
                      type="button"
                    >
                      Faturar
                    </button>
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

      <BillingModal
        data={billingData}
        isOpen={billingData !== null}
        onClose={() => setBillingData(null)}
        onSuccess={() => {
          setBillingData(null);
          void loadData();
        }}
      />
    </div>
  );
}
