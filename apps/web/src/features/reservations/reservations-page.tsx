"use client";

import { useEffect, useMemo, useState } from "react";
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

import type { Apartment, RentalStay } from "../../api";
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

const allApartmentsValue = "all";

export function ReservationsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedReservation, setSelectedReservation] = useState<ReservationListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadReservations(nextApartmentId = selectedApartmentId) {
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
      setMessage(error instanceof Error ? error.message : messages.reservations.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReservations(allApartmentsValue);
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
    if (!normalizedQuery) return reservations;

    return reservations.filter((reservation) =>
      [
        reservation.rawSummary,
        reservation.guestName,
        reservation.apartmentName,
        reservation.ownerName,
        reservation.provider,
        reservation.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, reservations]);

  const summary = useMemo(() => {
    let totalRev = 0;
    for (const stay of rentalStays) {
      totalRev += stay.rentAmountCents;
    }
    return {
      total: reservations.length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      providers: new Set(reservations.map((r) => r.provider)).size,
      totalRevenue: totalRev,
    };
  }, [reservations, rentalStays]);

  function changeApartment(apartmentId: string) {
    setSelectedApartmentId(apartmentId);
    void loadReservations(apartmentId);
  }

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="Total de Reservas"
          value={String(summary.total)}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Reservas Confirmadas"
          value={String(summary.confirmed)}
        />
        <SummaryCard
          icon={DollarSign}
          label="Faturamento Total"
          value={formatMoney(summary.totalRevenue)}
        />
        <SummaryCard
          icon={UsersRound}
          label="Canais Conectados"
          value={String(summary.providers)}
        />
      </section>

      {/* Main Table Panel */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                Gestão Geral
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
              Todas as Reservas Importadas & Manuais
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
              onClick={() => {
                setSelectedReservation(null);
                setIsModalOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Nova Reserva
            </button>

            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft sm:w-64"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar hóspede, apto..."
                value={query}
              />
            </div>

            <select
              className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              onChange={(event) => changeApartment(event.target.value)}
              value={selectedApartmentId}
            >
              <option value={allApartmentsValue}>{messages.reservations.allApartments}</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
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
                ? "bg-[#FFE4E6] text-[#BE123C] ring-1 ring-[#FECDD3]"
                : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
            }`}
          >
            {isAirbnb ? "Airbnb" : "Manual"}
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
    <article className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-3 block text-2xl font-bold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
