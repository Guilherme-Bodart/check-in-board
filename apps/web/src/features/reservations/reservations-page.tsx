"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { isAbortError, type Apartment, type RentalStay } from "../../api";
import { messages } from "../../i18n";
import { fetchApartments } from "../dashboard/dashboard-api";
import { formatReservationDateRange } from "../../lib/date-formatters";
import { readStoredSession } from "../../lib/session-storage";
import { formatMoney } from "../finance/money";
import { fetchRentalStays } from "../finance/rental-stay-api";
import { fetchReservations } from "./reservations-api";
import {
  attachApartmentDetails,
  nightsBetween,
  type ReservationListItem,
} from "./reservation-view-model";
import { ReservationUnifiedModal } from "../calendar/components/reservation-unified-modal";
import { EmptyState } from "../../components/ui/empty-state";
import { Select } from "../../components/ui/form-controls";

const allApartmentsValue = "all";

export function ReservationsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "priced" | "unpriced">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const loadAbortRef = useRef<AbortController | null>(null);

  const [selectedReservation, setSelectedReservation] = useState<ReservationListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadReservations(nextApartmentId = selectedApartmentId) {
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
      const nextApartments = await fetchApartments(session.token);
      if (controller.signal.aborted) return;

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
      if (controller.signal.aborted) return;

      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 6);
      const dateTo = new Date();
      dateTo.setMonth(dateTo.getMonth() + 6);

      const stays = await fetchRentalStays(session.token, {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        apartmentId: nextApartmentId === allApartmentsValue ? undefined : nextApartmentId,
      });
      if (controller.signal.aborted) return;

      setApartments(nextApartments);
      setRentalStays(stays);
      setReservations(attachApartmentDetails(reservationGroups.flat(), nextApartments));
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        isAborted = true;
        return;
      }
      setMessage(error instanceof Error ? error.message : messages.reservations.loadFailed);
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
    void loadReservations(allApartmentsValue);

    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  const rentalStaysMap = useMemo(() => {
    const map = new Map<string, RentalStay>();
    for (const stay of rentalStays) {
      map.set(stay.id, stay);
    }
    return map;
  }, [rentalStays]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const stay = rentalStaysMap.get(reservation.id);
      const isPriced = Boolean(stay && stay.rentAmountCents > 0);

      if (statusFilter === "priced" && !isPriced) return false;
      if (statusFilter === "unpriced" && isPriced) return false;

      if (!normalizedQuery) return true;

      return [
        reservation.rawSummary,
        reservation.guestName,
        reservation.apartmentName,
        reservation.ownerName,
        reservation.provider,
        reservation.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [query, reservations, rentalStaysMap, statusFilter]);

  const summary = useMemo(() => {
    let totalRev = 0;
    for (const stay of rentalStays) {
      totalRev += stay.rentAmountCents;
    }
    const pricedCount = reservations.filter((r) => {
      const stay = rentalStaysMap.get(r.id);
      return Boolean(stay && stay.rentAmountCents > 0);
    }).length;
    return {
      total: reservations.length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      priced: pricedCount,
      unpriced: Math.max(0, reservations.length - pricedCount),
      providers: new Set(reservations.map((r) => r.provider)).size,
      totalRevenue: totalRev,
    };
  }, [reservations, rentalStays, rentalStaysMap]);

  function changeApartment(apartmentId: string) {
    setSelectedApartmentId(apartmentId);
    void loadReservations(apartmentId);
  }

  return (
    <div className="grid gap-5">
      {/* KPI Cards (Desktop Grid Only — Hidden on Mobile for Direct List View) */}
      <section className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="Total Reservas"
          value={String(summary.total)}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Confirmadas"
          value={String(summary.confirmed)}
        />
        <SummaryCard
          icon={DollarSign}
          label="Faturamento"
          value={formatMoney(summary.totalRevenue)}
        />
        <SummaryCard
          icon={UsersRound}
          label="Canais Ativos"
          value={String(summary.providers)}
        />
      </section>

      {/* Main Panel */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center rounded bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Gestão Geral
              </span>
              <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                Reservas Importadas & Manuais
              </h2>
            </div>

            <button
              className="inline-flex xl:hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-95"
              onClick={() => {
                setSelectedReservation(null);
                setIsModalOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Reserva
            </button>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-64">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-10 w-full rounded-lg border border-border bg-surface-muted/50 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:bg-surface"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar hóspede, código ou imóvel..."
                value={query}
              />
            </div>

            <div className="min-w-[200px] sm:w-56">
              <Select
                className="h-10 rounded-lg border-border bg-surface-muted/50 px-3 text-xs font-semibold text-text-primary"
                onChange={(event) => changeApartment(event.target.value)}
                value={selectedApartmentId}
              >
                <option value={allApartmentsValue}>{messages.reservations.allApartments}</option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.name}
                  </option>
                ))}
              </Select>
            </div>

            <button
              className="hidden xl:inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-95"
              onClick={() => {
                setSelectedReservation(null);
                setIsModalOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Nova Reserva
            </button>
          </div>
        </div>

        {/* Status Filter Chips (Stitch Mobile Pattern) */}
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-text-primary text-surface"
                : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setStatusFilter("all")}
            type="button"
          >
            Todas ({summary.total})
          </button>
          <button
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
              statusFilter === "priced"
                ? "bg-text-primary text-surface"
                : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setStatusFilter("priced")}
            type="button"
          >
            Faturadas ({summary.priced})
          </button>
          <button
            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
              statusFilter === "unpriced"
                ? "bg-amber-600 text-white"
                : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => setStatusFilter("unpriced")}
            type="button"
          >
            Pendentes de Preço ({summary.unpriced})
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-xs font-medium text-danger">
            {message}
          </p>
        ) : null}

        {!isLoading && apartments.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              actionHref="/apartamentos/novo"
              actionLabel="Cadastrar apartamento"
              description="Cadastre seu primeiro imóvel para começar a registrar ou importar reservas do Airbnb."
              icon={Building2}
              title="Nenhum apartamento cadastrado"
            />
          </div>
        ) : (
          <>
            {/* Mobile-First Cards View (< 768px) */}
            <div className="mt-4 grid gap-3 md:hidden">
              {isLoading ? (
                <div className="rounded-xl border border-border py-10 text-center text-xs text-text-muted">
                  Carregando reservas...
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-text-muted">
                  Nenhuma reserva encontrada para os filtros selecionados.
                </div>
              ) : (
                filteredReservations.map((reservation) => {
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
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-3.5 transition hover:border-primary/40"
                      key={reservation.id}
                    >
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

                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface p-2.5 text-xs">
                        <span className="font-semibold text-text-primary">
                          {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
                        </span>
                        <span className="shrink-0 font-bold text-primary">
                          {nights} {nights === 1 ? "noite" : "noites"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Total da Reserva
                          </span>
                          {stay ? (
                            <strong className="text-base font-bold text-text-primary">
                              {formatMoney(stay.rentAmountCents)}
                            </strong>
                          ) : (
                            <strong className="text-xs font-bold text-amber-700">
                              Preço Pendente
                            </strong>
                          )}
                        </div>

                        <button
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-bold text-white shadow-2xs transition hover:brightness-95 active:scale-95"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setIsModalOpen(true);
                          }}
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

            {/* Desktop Table View (>= 768px) */}
            <div className="mt-5 hidden overflow-hidden rounded-xl border border-border md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-surface-muted/80 text-xs font-bold uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-4 py-3.5">Canal & Hóspede</th>
                      <th className="px-4 py-3.5">Imóvel & Locador</th>
                      <th className="px-4 py-3.5">Período</th>
                      <th className="px-4 py-3.5">Noites</th>
                      <th className="px-4 py-3.5">Valor / Faturamento</th>
                      <th className="px-4 py-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-text-muted" colSpan={6}>
                          Carregando reservas...
                        </td>
                      </tr>
                    ) : filteredReservations.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-text-muted" colSpan={6}>
                          Nenhuma reserva encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => {
                        const stay = rentalStaysMap.get(reservation.id);
                        return (
                          <ReservationRow
                            key={reservation.id}
                            onEdit={() => {
                              setSelectedReservation(reservation);
                              setIsModalOpen(true);
                            }}
                            reservation={reservation}
                            stay={stay}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Unified Edit & Create Modal */}
      <ReservationUnifiedModal
        apartments={apartments}
        defaultApartmentId={selectedApartmentId}
        existingStay={selectedReservation ? rentalStaysMap.get(selectedReservation.id) : null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          void loadReservations();
        }}
        reservation={selectedReservation}
      />
    </div>
  );
}

function ReservationRow({
  reservation,
  stay,
  onEdit,
}: {
  reservation: ReservationListItem;
  stay?: RentalStay;
  onEdit: () => void;
}) {
  const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";
  const isGenericName =
    !reservation.guestName ||
    reservation.rawSummary?.toLowerCase().includes("reserved") ||
    reservation.rawSummary?.toLowerCase().includes("airbnb");

  return (
    <tr className="transition hover:bg-surface-muted/30">
      {/* Col 1: Canal & Hóspede */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase shrink-0 ${
              isAirbnb
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            }`}
          >
            {isAirbnb ? "Airbnb" : "Direto"}
          </span>
          <strong className="block font-bold text-text-primary">
            {isGenericName && !reservation.guestName ? (
              <span className="flex items-center gap-1 text-amber-800">
                <AlertCircle className="h-3.5 w-3.5" />
                {reservation.rawSummary || "Hóspede Não Identificado"}
              </span>
            ) : (
              reservation.guestName || reservation.rawSummary || "Reserva"
            )}
          </strong>
        </div>
        {reservation.guestCount ? (
          <span className="mt-0.5 block text-xs text-text-muted">
            {reservation.guestCount} {reservation.guestCount === 1 ? "hóspede" : "hóspedes"}
          </span>
        ) : null}
      </td>

      {/* Col 2: Imóvel & Locador */}
      <td className="px-4 py-4 text-text-secondary">
        <div className="flex items-start gap-2">
          <Building2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <strong className="block text-xs font-semibold text-text-primary">
              {reservation.apartmentName}
            </strong>
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <ShieldCheck className="h-3 w-3 text-info" />
              Locador: {reservation.ownerName}
            </span>
          </div>
        </div>
      </td>

      {/* Col 3: Período */}
      <td className="px-4 py-4 text-xs font-medium text-text-secondary">
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </td>

      {/* Col 4: Noites */}
      <td className="px-4 py-4 text-xs font-bold text-primary">
        {nightsBetween(reservation.startsAt, reservation.endsAt)} noites
      </td>

      {/* Col 5: Valor */}
      <td className="px-4 py-4">
        {stay ? (
          <div>
            <strong className="block text-xs font-bold text-emerald-700">
              {formatMoney(stay.rentAmountCents)}
            </strong>
            <span className="text-[10px] text-emerald-800 font-medium">Faturado</span>
          </div>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            S/ Preço
          </span>
        )}
      </td>

      {/* Col 6: Ação */}
      <td className="px-4 py-4 text-right">
        <button
          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-primary shadow-sm transition hover:border-primary hover:text-primary active:scale-95"
          onClick={onEdit}
          type="button"
        >
          Editar & Precificar
        </button>
      </td>
    </tr>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
}) {
  return (
    <article className="w-44 shrink-0 snap-start rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:w-auto sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <Icon aria-hidden className="h-4 w-4 text-primary" />
      </div>
      <strong className="mt-1.5 block text-xl sm:text-2xl font-bold tracking-tight text-text-primary truncate">
        {value}
      </strong>
    </article>
  );
}
