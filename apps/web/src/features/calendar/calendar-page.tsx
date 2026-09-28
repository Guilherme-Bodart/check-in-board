"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Home,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  ShieldCheck,
  Building2,
  DollarSign,
  UserCheck,
  FileText,
  CheckCircle2,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../api";
import { messages } from "../../i18n";
import { formatMoney } from "../finance/money";
import { fetchRentalStays } from "../finance/rental-stay-api";
import { readStoredSession } from "../../lib/session-storage";
import {
  fetchApartments,
  fetchIcalSources,
  syncIcalSource,
} from "../dashboard/dashboard-api";
import { fetchReservations } from "../reservations/reservations-api";
import {
  attachApartmentDetails,
  nightsBetween,
  reservationLocalDate,
  type ReservationListItem,
} from "../reservations/reservation-view-model";

import { CalendarStats } from "./components/calendar-stats";
import { CalendarGridView, type CalendarDay } from "./components/calendar-grid-view";
import { CalendarTimelineView } from "./components/calendar-timeline-view";
import { ReservationUnifiedModal } from "./components/reservation-unified-modal";
import { CalendarReportsModal } from "./components/calendar-reports-modal";

const allApartmentsValue = "all";

export function CalendarPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "airbnb" | "manual">("all");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [isPendingFilterActive, setIsPendingFilterActive] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAirbnb, setIsSyncingAirbnb] = useState(false);
  const [syncNotification, setSyncNotification] = useState("");
  const [message, setMessage] = useState("");

  // Modals state
  const [selectedReservation, setSelectedReservation] = useState<ReservationListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  async function loadCalendar(nextApartmentId = selectedApartmentId) {
    const session = readStoredSession();
    if (!session) return;

    setIsLoading(true);
    setMessage("");

    try {
      const nextApartments = await fetchApartments(session.token);
      const apartmentIds =
        nextApartmentId === allApartmentsValue
          ? nextApartments.map((apartment) => apartment.id)
          : [nextApartmentId];

      const reservationGroups = await Promise.all(
        apartmentIds.map((apartmentId) => fetchReservations(session.token, apartmentId)),
      );

      // Fetch rental stays in a wider window to ensure price coverage
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 6);
      const dateTo = new Date();
      dateTo.setMonth(dateTo.getMonth() + 6);

      const stays = await fetchRentalStays(session.token, {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        apartmentId: nextApartmentId === allApartmentsValue ? undefined : nextApartmentId,
      });

      setApartments(nextApartments);
      setRentalStays(stays);
      setReservations(attachApartmentDetails(reservationGroups.flat(), nextApartments));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : messages.calendar.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setMonth(currentMonthInput());
    void loadCalendar(allApartmentsValue);
  }, []);

  // Quick lookup map: reservation.id -> RentalStay
  const rentalStaysMap = useMemo(() => {
    const map = new Map<string, RentalStay>();
    for (const stay of rentalStays) {
      map.set(stay.id, stay);
    }
    return map;
  }, [rentalStays]);

  // Calendar days for month grid
  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);

  // Filter reservations in month with query, channel and pending filters
  const monthReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const range = monthRange(month);
    if (!range) return [];

    return reservations.filter((reservation) => {
      const startDate = reservationLocalDate(reservation.startsAt);
      const endDate = reservationLocalDate(reservation.endsAt);
      const overlapsMonth = startDate < range.nextMonth && endDate > range.monthStart;
      if (!overlapsMonth) return false;

      // Channel filter
      if (channelFilter !== "all") {
        const provider = reservation.provider?.toLowerCase() ?? "manual";
        if (provider !== channelFilter) return false;
      }

      // Pending filter
      if (isPendingFilterActive) {
        const stay = rentalStaysMap.get(reservation.id);
        const hasPrice = stay && stay.rentAmountCents > 0;
        const isGenericName =
          !reservation.guestName ||
          reservation.rawSummary?.toLowerCase().includes("reserved") ||
          reservation.rawSummary?.toLowerCase().includes("airbnb");
        const needsAttention = !hasPrice || isGenericName;
        if (!needsAttention) return false;
      }

      // Search query
      const matchesQuery =
        !normalizedQuery ||
        [
          reservation.rawSummary,
          reservation.guestName,
          reservation.apartmentName,
          reservation.ownerName,
          reservation.provider,
          reservation.externalEventKey,
        ]
          .filter(Boolean)
          .some((val) => val?.toLowerCase().includes(normalizedQuery));

      return matchesQuery;
    });
  }, [month, query, reservations, channelFilter, isPendingFilterActive, rentalStaysMap]);

  // Group reservations by day for the grid view
  const reservationsByDay = useMemo(() => {
    const grouped = new Map<string, ReservationListItem[]>();
    for (const day of calendarDays) {
      grouped.set(
        day.date,
        monthReservations.filter((reservation) => {
          const startDate = reservationLocalDate(reservation.startsAt);
          const endDate = reservationLocalDate(reservation.endsAt);
          return day.date >= startDate && day.date <= endDate;
        }),
      );
    }
    return grouped;
  }, [calendarDays, monthReservations]);

  function changeApartment(apartmentId: string) {
    setSelectedApartmentId(apartmentId);
    void loadCalendar(apartmentId);
  }

  function shiftMonth(amount: number) {
    setMonth((current) => addMonths(current || currentMonthInput(), amount));
  }

  function handleResetToCurrentMonth() {
    setMonth(currentMonthInput());
  }

  function handleOpenCreateModal() {
    setSelectedReservation(null);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(reservation: ReservationListItem) {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  }

  // Trigger real-time Airbnb iCal sync
  async function handleSyncAirbnb() {
    const session = readStoredSession();
    if (!session) return;

    setIsSyncingAirbnb(true);
    setMessage("");
    setSyncNotification("");

    try {
      const apartmentIds =
        selectedApartmentId === allApartmentsValue
          ? apartments.map((a) => a.id)
          : [selectedApartmentId];

      let totalUpserted = 0;
      for (const aptId of apartmentIds) {
        const sources = await fetchIcalSources(session.token, aptId);
        for (const src of sources) {
          if (src.syncEnabled) {
            const res = await syncIcalSource(session.token, src.id);
            totalUpserted += res.summary.reservationsUpserted;
          }
        }
      }

      await loadCalendar();
      setSyncNotification(
        totalUpserted > 0
          ? `Sincronização concluída! ${totalUpserted} reserva(s) atualizadas com o Airbnb.`
          : "Airbnb sincronizado com sucesso. Nenhuma nova reserva no momento.",
      );
      setTimeout(() => setSyncNotification(""), 5000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao sincronizar com o Airbnb.");
    } finally {
      setIsSyncingAirbnb(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Top Header & Global Controls */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Top Row: Title, Eyebrow & Main Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 items-center rounded-full bg-primary-soft px-2.5 text-xs font-bold uppercase tracking-wider text-primary">
                  Airbnb & Gestão Direta
                </span>
                <span className="text-xs text-text-muted">
                  {apartments.length} {apartments.length === 1 ? "imóvel conectado" : "imóveis conectados"}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Calendário & Ocupação
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sincronizar Airbnb Agora */}
              <button
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs font-bold text-text-primary shadow-sm transition hover:border-primary hover:text-primary active:scale-95 disabled:opacity-50"
                disabled={isSyncingAirbnb}
                onClick={handleSyncAirbnb}
                title="Sincronizar reservas iCal do Airbnb agora"
                type="button"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isSyncingAirbnb ? "animate-spin text-primary" : ""}`} />
                {isSyncingAirbnb ? "Sincronizando..." : "Sincronizar Airbnb"}
              </button>

              {/* Relatórios & Prestação de Contas */}
              <button
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs font-bold text-text-primary shadow-sm transition hover:border-primary hover:text-primary active:scale-95"
                onClick={() => setIsReportsModalOpen(true)}
                title="Gerar Demonstrativo do Proprietário, Escala de Limpeza ou Portaria"
                type="button"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                Relatórios
              </button>

              {/* View Mode Toggle: Grid vs Timeline */}
              <div className="flex rounded-xl border border-border bg-surface-muted/60 p-1">
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setViewMode("grid")}
                  type="button"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Mês (Grade)
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "timeline"
                      ? "bg-surface text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setViewMode("timeline")}
                  type="button"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Cronograma (Tape Chart)
                </button>
              </div>

              {/* + Nova Reserva Manual */}
              <button
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                onClick={handleOpenCreateModal}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Nova Reserva
              </button>
            </div>
          </div>

          {/* Sincronização Sucesso Notification */}
          {syncNotification && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{syncNotification}</span>
            </div>
          )}

          {/* KPI Metrics Cards */}
          <CalendarStats
            apartments={apartments}
            isPendingFilterActive={isPendingFilterActive}
            month={month}
            onTogglePendingFilter={() => setIsPendingFilterActive((prev) => !prev)}
            rentalStays={rentalStays}
            reservations={monthReservations}
            selectedApartmentId={selectedApartmentId}
          />

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 border-t border-border/80 pt-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Search & Filter Dropdowns */}
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar hóspede, código ou apartamento..."
                  value={query}
                />
              </div>

              {/* Apartment Select */}
              <select
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                onChange={(e) => changeApartment(e.target.value)}
                value={selectedApartmentId}
              >
                <option value={allApartmentsValue}>🏢 Todos os Apartamentos</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name} ({apt.owner?.name ?? "Sem locador"})
                  </option>
                ))}
              </select>

              {/* Channel Filter */}
              <select
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                onChange={(e) => setChannelFilter(e.target.value as any)}
                value={channelFilter}
              >
                <option value="all">🌐 Todos os Canais</option>
                <option value="airbnb">Airbnb (iCal)</option>
                <option value="manual">Manual / Direta</option>
              </select>
            </div>

            {/* Right: Month Navigation & Today Button */}
            <div className="flex items-center gap-2">
              <button
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-text-secondary transition hover:border-primary hover:text-primary active:scale-95"
                onClick={handleResetToCurrentMonth}
                title="Ir para o mês atual"
                type="button"
              >
                Hoje
              </button>

              <button
                aria-label="Mês anterior"
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary active:scale-95"
                onClick={() => shiftMonth(-1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                aria-label="Selecionar mês"
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                onChange={(e) => setMonth(e.target.value)}
                type="month"
                value={month}
              />

              <button
                aria-label="Próximo mês"
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary active:scale-95"
                onClick={() => shiftMonth(1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        )}

        {/* Calendar Main View (Grid or Timeline) */}
        <div className="mt-6">
          {viewMode === "grid" ? (
            <CalendarGridView
              calendarDays={calendarDays}
              isLoading={isLoading}
              onReservationClick={handleOpenEditModal}
              rentalStaysMap={rentalStaysMap}
              reservationsByDay={reservationsByDay}
              selectedApartmentId={selectedApartmentId}
            />
          ) : (
            <CalendarTimelineView
              apartments={apartments}
              isLoading={isLoading}
              month={month}
              onReservationClick={handleOpenEditModal}
              rentalStaysMap={rentalStaysMap}
              reservations={monthReservations}
              selectedApartmentId={selectedApartmentId}
            />
          )}
        </div>
      </section>

      {/* Bottom Section: Detailed Reservation List for the Month */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Detalhamento de Reservas
            </p>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Reservas no Mês ({monthReservations.length})
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            Clique em "Editar & Precificar" para atualizar hóspede titular, preço e dados
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {monthReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-text-muted">
              Nenhuma reserva encontrada para os filtros selecionados.
            </div>
          ) : (
            monthReservations.map((reservation) => {
              const stay = rentalStaysMap.get(reservation.id);
              const nights = nightsBetween(reservation.startsAt, reservation.endsAt);
              const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";

              const isGenericName =
                !reservation.guestName ||
                reservation.rawSummary?.toLowerCase().includes("reserved") ||
                reservation.rawSummary?.toLowerCase().includes("airbnb");

              return (
                <article
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-surface-muted/60 md:flex-row md:items-center"
                  key={reservation.id}
                >
                  {/* Left: Guest, Apartment & Locador */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          isAirbnb
                            ? "bg-[#FFE4E6] text-[#BE123C] ring-1 ring-[#FECDD3]"
                            : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                        }`}
                      >
                        {isAirbnb ? "Airbnb" : "Manual"}
                      </span>

                      <strong className="text-sm font-bold text-text-primary">
                        {isGenericName && !reservation.guestName ? (
                          <span className="text-amber-800 underline decoration-amber-400">
                            {reservation.rawSummary || "Hóspede Não Identificado"}
                          </span>
                        ) : (
                          reservation.guestName || reservation.rawSummary || "Reserva"
                        )}
                      </strong>

                      {reservation.guestCount ? (
                        <span className="text-xs text-text-muted">
                          ({reservation.guestCount} {reservation.guestCount === 1 ? "hóspede" : "hóspedes"})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {reservation.apartmentName}
                      </span>
                      <span className="flex items-center gap-1 text-text-muted">
                        <ShieldCheck className="h-3.5 w-3.5 text-info" />
                        Locador: {reservation.ownerName}
                      </span>
                      <span className="text-text-muted">
                        📅 {new Date(reservation.startsAt).toLocaleDateString("pt-BR")} a{" "}
                        {new Date(reservation.endsAt).toLocaleDateString("pt-BR")} ({nights} noites)
                      </span>
                    </div>
                  </div>

                  {/* Right: Price & Quick Action */}
                  <div className="flex flex-wrap items-center gap-3">
                    {stay ? (
                      <div className="text-right">
                        <span className="block text-sm font-bold text-emerald-700">
                          {formatMoney(stay.rentAmountCents)}
                        </span>
                        <span className="block text-[10px] font-medium text-emerald-800">
                          Faturado
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Preço Pendente
                      </span>
                    )}

                    <button
                      className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-text-primary shadow-sm transition hover:border-primary hover:text-primary active:scale-95"
                      onClick={() => handleOpenEditModal(reservation)}
                      type="button"
                    >
                      Editar & Precificar
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Unified Edit & Create Modal with Overbooking and Cleaning Task */}
      <ReservationUnifiedModal
        allReservations={reservations}
        apartments={apartments}
        defaultApartmentId={selectedApartmentId}
        existingStay={selectedReservation ? rentalStaysMap.get(selectedReservation.id) : null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          void loadCalendar();
        }}
        reservation={selectedReservation}
      />

      {/* Reports & Owner Statement Modal */}
      <CalendarReportsModal
        apartments={apartments}
        isOpen={isReportsModalOpen}
        month={month}
        onClose={() => setIsReportsModalOpen(false)}
        rentalStaysMap={rentalStaysMap}
        reservations={monthReservations}
        selectedApartmentId={selectedApartmentId}
      />
    </div>
  );
}

function buildCalendarDays(month: string): CalendarDay[] {
  const range = monthRange(month);
  if (!range) return [];

  const firstWeekday = new Date(`${range.monthStart}T12:00:00`).getDay();
  const start = addDays(range.monthStart, -firstWeekday);
  const todayStr = new Date().toISOString().slice(0, 10);
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const dayDate = new Date(`${date}T12:00:00`);
    const weekDay = dayDate.getDay();

    days.push({
      date,
      dayNumber: Number(date.slice(8, 10)),
      isCurrentMonth: date >= range.monthStart && date < range.nextMonth,
      isToday: date === todayStr,
      isWeekend: weekDay === 0 || weekDay === 6,
    });
  }

  return days;
}

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const monthStart = `${month}-01`;
  const nextMonth = addMonths(month, 1) + "-01";
  return { monthStart, nextMonth };
}

function currentMonthInput() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(month: string, amount: number) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const date = new Date(yearValue, monthValue - 1 + amount, 1, 12);
  const year = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${nextMonth}`;
}

function addDays(date: string, amount: number) {
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate.toISOString().slice(0, 10);
}
