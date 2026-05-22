"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, ClipboardList, Search, UsersRound } from "lucide-react";

import type { Apartment, Reservation } from "../../api";
import { fetchApartments } from "../dashboard/dashboard-api";
import { formatReservationDateRange } from "../../lib/date-formatters";
import { readStoredSession } from "../../lib/session-storage";
import { fetchReservations } from "./reservations-api";
import {
  attachApartmentDetails,
  nightsBetween,
  type ReservationListItem,
} from "./reservation-view-model";

const allApartmentsValue = "all";

export function ReservationsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadReservations(nextApartmentId = selectedApartmentId) {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const nextApartments = await fetchApartments(session.token);
      const apartmentIds =
        nextApartmentId === allApartmentsValue
          ? nextApartments.map((apartment) => apartment.id)
          : [nextApartmentId];
      const reservationGroups = await Promise.all(
        apartmentIds.map((apartmentId) =>
          fetchReservations(session.token, apartmentId),
        ),
      );

      setApartments(nextApartments);
      setReservations(
        attachApartmentDetails(reservationGroups.flat(), nextApartments),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar reservas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReservations(allApartmentsValue);
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return reservations;
    }

    return reservations.filter((reservation) =>
      [
        reservation.rawSummary,
        reservation.apartmentName,
        reservation.ownerName,
        reservation.provider,
        reservation.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, reservations]);

  const summary = useMemo(
    () => ({
      total: reservations.length,
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed")
        .length,
      providers: new Set(reservations.map((reservation) => reservation.provider)).size,
    }),
    [reservations],
  );

  function changeApartment(apartmentId: string) {
    setSelectedApartmentId(apartmentId);
    void loadReservations(apartmentId);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Reservas" value={summary.total} icon={ClipboardList} />
        <SummaryCard label="Confirmadas" value={summary.confirmed} icon={CalendarDays} />
        <SummaryCard label="Canais" value={summary.providers} icon={UsersRound} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Reservas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              Todas as reservas importadas
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft sm:w-72"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar reserva"
                value={query}
              />
            </div>
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) => changeApartment(event.target.value)}
              value={selectedApartmentId}
            >
              <option value={allApartmentsValue}>Todos os apartamentos</option>
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
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Reserva</th>
                <th className="px-4 py-3 font-semibold">Apartamento</th>
                <th className="px-4 py-3 font-semibold">Periodo</th>
                <th className="px-4 py-3 font-semibold">Noites</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-text-secondary" colSpan={5}>
                    Carregando reservas...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-text-secondary" colSpan={5}>
                    Nenhuma reserva encontrada.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((reservation) => (
                  <ReservationRow key={reservation.id} reservation={reservation} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReservationRow({ reservation }: { reservation: ReservationListItem }) {
  return (
    <tr>
      <td className="px-4 py-4">
        <strong className="block font-semibold text-text-primary">
          {reservation.rawSummary ?? "Reserva"}
        </strong>
        <span className="text-xs text-text-muted">{reservation.provider}</span>
      </td>
      <td className="px-4 py-4 text-text-secondary">
        <div className="flex items-center gap-2">
          <Building2 aria-hidden className="h-4 w-4 text-primary" />
          <div>
            <span className="block">{reservation.apartmentName}</span>
            <span className="text-xs text-text-muted">{reservation.ownerName}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-text-secondary">
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </td>
      <td className="px-4 py-4 text-text-secondary">
        {nightsBetween(reservation.startsAt, reservation.endsAt)}
      </td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
          {reservation.status}
        </span>
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
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
