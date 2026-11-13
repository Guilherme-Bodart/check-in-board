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
import { EmptyState } from "../../components/ui/empty-state";
import { Select } from "../../components/ui/form-controls";

const allApartmentsValue = "all";

export function CalendarPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "airbnb" | "manual">("all");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("timeline");
  const [isPendingFilterActive, setIsPendingFilterActive] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAirbnb, setIsSyncingAirbnb] = useState(false);
  const [syncNotification, setSyncNotification] = useState("");
  const [message, setMessage] = useState("");

  // Modals state
  const [selectedReservation, setSelectedReservation] = useState<ReservationListItem | null>(null);
  const [createInitialStartDate, setCreateInitialStartDate] = useState<string | undefined>(undefined);
  const [createInitialApartmentId, setCreateInitialApartmentId] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  async function loadCalendar(nextApartmentId = selectedApartmentId) {
    const session = readStoredSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const nextApartments = await fetchApartments(session.token);
      if (nextApartments.length === 0) {
        setApartments([]);
        setRentalStays([]);
        setReservations([]);
        return;
      }

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openReports") === "1") {
        setIsReportsModalOpen(true);
      }
    }
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

  function handleOpenCreateModal(startDate?: string, aptId?: string) {
    setSelectedReservation(null);
    setCreateInitialStartDate(startDate);
    setCreateInitialApartmentId(aptId);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(reservation: ReservationListItem) {
    setSelectedReservation(reservation);
    setCreateInitialStartDate(undefined);
    setCreateInitialApartmentId(undefined);
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

  const formattedMonthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return "Mês Atual";
    const [yearValue, monthValue] = month.split("-").map(Number);
    const date = new Date(yearValue, monthValue - 1, 1, 12);
    const formatted = date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(" de ", " ");
  }, [month]);

  return (
    <div className="grid gap-4">
      {/* 4-Col KPI Strip on Desktop Only (Hidden on Mobile for Immediate Schedule View) */}
      <div className="hidden md:block">
        <CalendarStats
          apartments={apartments}
          isPendingFilterActive={isPendingFilterActive}
          month={month}
          onTogglePendingFilter={() => setIsPendingFilterActive((prev) => !prev)}
          rentalStays={rentalStays}
          reservations={monthReservations}
          selectedApartmentId={selectedApartmentId}
        />
      </div>

      {/* Main Calendar Card (Mobile-First matching Stitch reference) */}
      <section className="rounded-xl border border-border bg-surface p-3.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col gap-3.5">
          {/* Row 1: View Switcher (Cronograma / Mês) + Primary "+ Reserva" Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div className="flex rounded-xl border border-border bg-surface-muted p-1">
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "timeline"
                    ? "bg-surface text-primary shadow-2xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setViewMode("timeline")}
                type="button"
              >
                <TableIcon className="h-3.5 w-3.5" />
                Cronograma
              </button>
              <button
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "grid"
                    ? "bg-surface text-primary shadow-2xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setViewMode("grid")}
                type="button"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Mês (Grade)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-secondary transition hover:border-primary hover:text-primary disabled:opacity-50"
                disabled={isSyncingAirbnb}
                onClick={handleSyncAirbnb}
                title="Sincronizar reservas iCal do Airbnb agora"
                type="button"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isSyncingAirbnb ? "animate-spin text-primary" : ""}`} />
                <span className="hidden sm:inline">
                  {isSyncingAirbnb ? "Sincronizando..." : "Sincronizar iCal"}
                </span>
              </button>

              <button
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-secondary transition hover:border-primary hover:text-primary active:scale-[0.98]"
                onClick={() => setIsReportsModalOpen(true)}
                title="Gerar Demonstrativo do Proprietário, Escala de Limpeza ou Portaria"
                type="button"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>PDF / Relatórios</span>
              </button>

              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-95"
                onClick={() => handleOpenCreateModal()}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Reserva
              </button>
            </div>
          </div>

          {/* Row 2: Month Navigation (< Outubro 2026 >) + Hoje + Search */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                aria-label="Mês anterior"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-primary transition hover:bg-border/60 active:scale-95"
                onClick={() => shiftMonth(-1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="min-w-[130px] text-center text-base sm:text-lg font-bold tracking-tight text-text-primary">
                {formattedMonthLabel}
              </span>

              <button
                aria-label="Próximo mês"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-primary transition hover:bg-border/60 active:scale-95"
                onClick={() => shiftMonth(1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden md:block w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  className="h-9 w-full rounded-lg border border-border bg-surface-muted/50 pl-8 pr-2.5 text-xs outline-none transition focus:border-primary focus:bg-surface"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar hóspede ou imóvel..."
                  value={query}
                />
              </div>

              <button
                className="h-9 shrink-0 rounded-lg bg-primary-soft px-3 text-xs font-bold text-primary transition hover:brightness-95 active:scale-95"
                onClick={handleResetToCurrentMonth}
                title="Ir para o mês atual"
                type="button"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Row 3: Horizontal Filter Pills (Todos os Apês / Canais / Pendências) */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {/* Apartment Filter Dropdown (Radix UI Select) */}
            <div className="min-w-[180px] sm:min-w-[210px]">
              <Select
                className="h-8 rounded-lg bg-slate-900 border-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 hover:border-slate-800 [&_svg]:text-slate-300"
                onChange={(e) => changeApartment(e.target.value)}
                value={selectedApartmentId}
              >
                <option value={allApartmentsValue}>
                  Todos os Apês ({apartments.length})
                </option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Channel Filter Dropdown (Radix UI Select) */}
            <div className="min-w-[155px]">
              <Select
                className="h-8 rounded-lg border-border bg-surface-muted/70 px-3 text-xs font-semibold text-text-primary hover:bg-surface-muted"
                onChange={(e) => setChannelFilter(e.target.value as "all" | "airbnb" | "manual")}
                value={channelFilter}
              >
                <option value="all">Airbnb / Direto</option>
                <option value="airbnb">Apenas Airbnb</option>
                <option value="manual">Apenas Direto</option>
              </Select>
            </div>

            {/* Quick Pending Filter Pill */}
            <button
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                isPendingFilterActive
                  ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold"
                  : "border-border bg-surface-muted/70 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setIsPendingFilterActive((prev) => !prev)}
              type="button"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-text-muted" />
              Apenas Pendências
            </button>
          </div>
        </div>

        {/* Sincronização Sucesso Notification */}
        {syncNotification && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{syncNotification}</span>
          </div>
        )}

        {message && (
          <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {message}
          </p>
        )}

        {!isLoading && apartments.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              actionHref="/apartamentos/novo"
              actionLabel="Cadastrar apartamento"
              description="Cadastre seu primeiro imóvel para visualizar reservas, ocupação e controle financeiro no calendário."
              icon={Building2}
              title="Nenhum apartamento cadastrado"
            />
          </div>
        ) : (
          /* Calendar Main View Immediately Visible */
          <div className="mt-3">
            {viewMode === "grid" ? (
              <CalendarGridView
                calendarDays={calendarDays}
                isLoading={isLoading}
                onDayClick={(date) => handleOpenCreateModal(date)}
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
                onCellClick={(date, aptId) => handleOpenCreateModal(date, aptId)}
                onReservationClick={handleOpenEditModal}
                rentalStaysMap={rentalStaysMap}
                reservations={monthReservations}
                selectedApartmentId={selectedApartmentId}
              />
            )}
          </div>
        )}
      </section>

      {/* Bottom Section: Detailed Reservation List for the Month (Stitch Mobile-First Cards) */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Detalhamento Operacional
            </p>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
              Reservas no Mês ({monthReservations.length})
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            Toque em "Editar & Precificar" para atualizar titular, valor e tarefas
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {monthReservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-muted">
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

              const codeSnippet = (reservation.externalEventKey || reservation.id)
                .slice(-6)
                .toUpperCase();

              return (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-3.5 sm:p-4 transition hover:border-primary/40"
                  key={reservation.id}
                >
                  {/* Top Row: Atomic Badges + Code */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isAirbnb
                            ? "bg-primary-soft text-primary"
                            : "bg-success-soft text-success"
                        }`}
                      >
                        {isAirbnb ? "Airbnb" : "Direto"}
                      </span>

                      <span
                        className={`inline-flex items-center shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          stay
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {stay ? "Faturada" : "Sem Preço"}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] font-semibold text-text-muted shrink-0">
                      #{codeSnippet}
                    </span>
                  </div>

                  {/* Middle Row: Guest Name + Apartment + Guest Count */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-base font-bold text-text-primary">
                        {isGenericName && !reservation.guestName ? (
                          <span className="text-amber-800 underline decoration-amber-400">
                            {reservation.rawSummary || "Hóspede Não Identificado"}
                          </span>
                        ) : (
                          reservation.guestName || reservation.rawSummary || "Reserva"
                        )}
                      </strong>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary truncate">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{reservation.apartmentName}</span>
                        <span className="text-text-muted">• {reservation.ownerName}</span>
                      </p>
                    </div>

                    {reservation.guestCount ? (
                      <span className="shrink-0 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary">
                        {reservation.guestCount}{" "}
                        {reservation.guestCount === 1 ? "hóspede" : "hóspedes"}
                      </span>
                    ) : null}
                  </div>

                  {/* Inner Box: Dates & Nights + Price & Action on Desktop */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-surface p-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" />
                      <div>
                        <span className="font-semibold text-text-primary">
                          {new Date(reservation.startsAt).toLocaleDateString("pt-BR")} a{" "}
                          {new Date(reservation.endsAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="ml-1.5 font-bold text-primary">
                          ({nights} {nights === 1 ? "noite" : "noites"})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2.5 sm:border-t-0 sm:pt-0">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Total da Reserva
                        </span>
                        {stay ? (
                          <strong className="text-sm font-bold text-text-primary">
                            {formatMoney(stay.rentAmountCents)}
                          </strong>
                        ) : (
                          <strong className="text-xs font-bold text-amber-700">
                            A definir
                          </strong>
                        )}
                      </div>

                      <button
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-95"
                        onClick={() => handleOpenEditModal(reservation)}
                        type="button"
                      >
                        Editar & Precificar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <p className="md:hidden text-[11px] text-text-muted text-center py-1">
        Dica: Acesse pelo computador para visualizar indicadores detalhados de ocupação e receita do mês.
      </p>

      {/* Unified Edit & Create Modal with Overbooking and Cleaning Task */}
      <ReservationUnifiedModal
        allReservations={reservations}
        apartments={apartments}
        defaultApartmentId={
          createInitialApartmentId ||
          (selectedApartmentId === allApartmentsValue ? "" : selectedApartmentId)
        }
        existingStay={selectedReservation ? rentalStaysMap.get(selectedReservation.id) : null}
        initialStartDate={createInitialStartDate}
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
        reservations={reservations}
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
