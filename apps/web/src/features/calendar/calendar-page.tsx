"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Plus,
  RotateCw,
  Search,
  Table as TableIcon,
} from "lucide-react";

import { isAbortError, type Apartment, type RentalStay } from "../../api";
import { messages } from "../../i18n";
import { formatMoney } from "../finance/money";
import { fetchRentalStays } from "../finance/rental-stay-api";
import {
  addDays,
  addMonths,
  currentMonthInput,
  monthRange,
} from "../../lib/date-formatters";
import { readStoredSession } from "../../lib/session-storage";
import { useAuthSession } from "../auth/session-context";
import {
  fetchApartments,
  fetchIcalSources,
  syncIcalSource,
} from "../dashboard/dashboard-api";
import { fetchAllReservations } from "../reservations/reservations-api";
import {
  attachApartmentDetails,
  getReservationDisplayGuest,
  isGenericGuestReservation,
  needsReservationAttention,
  nightsBetween,
  reservationLocalDate,
  type ReservationListItem,
} from "../reservations/reservation-view-model";

import { CalendarStats } from "./components/calendar-stats";
import { CalendarGridView, type CalendarDay } from "./components/calendar-grid-view";
import { CalendarTimelineView } from "./components/calendar-timeline-view";
import { ReservationUnifiedModal } from "./components/reservation-unified-modal";
import { CalendarReportsModal } from "./components/calendar-reports-modal";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { Select } from "../../components/ui/form-controls";
import { IconButton } from "../../components/ui/icon-button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

const allApartmentsValue = "all";

export function CalendarPage() {
  const { session: authSession } = useAuthSession();
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
  const loadAbortRef = useRef<AbortController | null>(null);

  async function loadCalendar(nextApartmentId = selectedApartmentId) {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    const session = authSession ?? readStoredSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const nextApartments = await fetchApartments(session.token);
      if (controller.signal.aborted) {
        return;
      }

      if (nextApartments.length === 0) {
        setApartments([]);
        setRentalStays([]);
        setReservations([]);
        return;
      }

      const fetchedReservations = await fetchAllReservations(session.token, {
        apartmentId: nextApartmentId === allApartmentsValue ? undefined : nextApartmentId,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }

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
      if (controller.signal.aborted) {
        return;
      }

      setApartments(nextApartments);
      setRentalStays(stays);
      setReservations(attachApartmentDetails(fetchedReservations, nextApartments));
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }
      setMessage(error instanceof Error ? error.message : messages.calendar.loadFailed);
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
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

    return () => {
      loadAbortRef.current?.abort();
    };
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
        if (!needsReservationAttention(reservation, stay)) return false;
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
    const session = authSession ?? readStoredSession();
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
    <div className="grid min-w-0 max-w-full gap-4">
      {/* 4-Col KPI Strip on Desktop Only (Hidden on Mobile for Immediate Schedule View) */}
      <div className="hidden min-w-0 md:block">
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
      <section className="min-w-0 max-w-full rounded-xl border border-border bg-surface p-3.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col gap-3.5">
          {/* Row 1: View Switcher (Cronograma / Mês) + Primary "+ Reserva" Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
            <Tabs
              onValueChange={(value) => setViewMode(value as "grid" | "timeline")}
              value={viewMode}
            >
              <TabsList className="h-auto rounded-xl border border-border bg-surface-muted p-1">
                <TabsTrigger
                  className="cursor-pointer gap-1.5 px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs"
                  value="timeline"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Cronograma
                </TabsTrigger>
                <TabsTrigger
                  className="cursor-pointer gap-1.5 px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs"
                  value="grid"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Mês (Grade)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                className="gap-1.5 px-2.5 text-text-secondary shadow-none hover:border-primary hover:bg-surface hover:text-primary"
                disabled={isSyncingAirbnb}
                onClick={handleSyncAirbnb}
                size="sm"
                title="Sincronizar reservas iCal do Airbnb agora"
                variant="secondary"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isSyncingAirbnb ? "animate-spin text-primary" : ""}`} />
                <span className="hidden sm:inline">
                  {isSyncingAirbnb ? "Sincronizando..." : "Sincronizar iCal"}
                </span>
              </Button>

              <Button
                className="gap-1.5 px-2.5 text-text-secondary shadow-none hover:border-primary hover:bg-surface hover:text-primary"
                onClick={() => setIsReportsModalOpen(true)}
                size="sm"
                title="Gerar Demonstrativo do Proprietário, Escala de Limpeza ou Portaria"
                variant="secondary"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>PDF / Relatórios</span>
              </Button>

              <Button
                className="gap-1.5 px-3.5 font-bold"
                onClick={() => handleOpenCreateModal()}
                size="sm"
                variant="primary"
              >
                <Plus className="h-4 w-4" />
                Reserva
              </Button>
            </div>
          </div>

          {/* Row 2: Month Navigation (< Outubro 2026 >) + Hoje + Search */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="Mês anterior"
                className="shrink-0 bg-surface-muted text-text-primary shadow-none hover:bg-border/60"
                icon={ChevronLeft}
                onClick={() => shiftMonth(-1)}
                variant="ghost"
              />

              <span className="min-w-[130px] text-center text-base sm:text-lg font-bold tracking-tight text-text-primary">
                {formattedMonthLabel}
              </span>

              <IconButton
                aria-label="Próximo mês"
                className="shrink-0 bg-surface-muted text-text-primary shadow-none hover:bg-border/60"
                icon={ChevronRight}
                onClick={() => shiftMonth(1)}
                variant="ghost"
              />
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

              <Button
                className="shrink-0 bg-primary-soft font-bold hover:brightness-95"
                onClick={handleResetToCurrentMonth}
                size="sm"
                title="Ir para o mês atual"
                variant="subtle"
              >
                Hoje
              </Button>
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
            <Button
              aria-pressed={isPendingFilterActive}
              className={`shrink-0 gap-1.5 ${
                isPendingFilterActive
                  ? "border-amber-500 bg-amber-50 font-semibold text-amber-900 hover:border-amber-600 hover:bg-amber-100/70 hover:text-amber-900"
                  : "border-border bg-surface-muted/70 font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              }`}
              onClick={() => setIsPendingFilterActive((prev) => !prev)}
              size="xs"
              variant="outline"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-text-muted" />
              Apenas Pendências
            </Button>
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
          <div className="mt-3 min-w-0 max-w-full">
            {viewMode === "grid" ? (
              <CalendarGridView
                apartments={apartments}
                calendarDays={calendarDays}
                isLoading={isLoading}
                onDayClick={(date) => handleOpenCreateModal(date)}
                onReservationClick={handleOpenEditModal}
                onSelectApartment={changeApartment}
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
      <section className="min-w-0 max-w-full rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-2xs">
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

              const isGenericName = isGenericGuestReservation(reservation);
              const displayGuest = getReservationDisplayGuest(reservation);

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
                        {isGenericName && !reservation.guestName?.trim() ? (
                          <span className="text-amber-800 underline decoration-amber-400">
                            {displayGuest}
                          </span>
                        ) : (
                          displayGuest
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

                      <Button
                        className="shrink-0 px-3.5 font-bold"
                        onClick={() => handleOpenEditModal(reservation)}
                        size="sm"
                        variant="primary"
                      >
                        Editar & Precificar
                      </Button>
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
