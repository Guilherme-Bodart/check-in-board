"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Home, Search } from "lucide-react";

import type { Apartment } from "../../api";
import { fetchApartments } from "../dashboard/dashboard-api";
import { readStoredSession } from "../../lib/session-storage";
import { fetchReservations } from "../reservations/reservations-api";
import {
  attachApartmentDetails,
  reservationLocalDate,
  type ReservationListItem,
} from "../reservations/reservation-view-model";

const allApartmentsValue = "all";
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function CalendarPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCalendar(nextApartmentId = selectedApartmentId) {
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
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar calendário.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setMonth(currentMonthInput());
    void loadCalendar(allApartmentsValue);
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);

  const monthReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const range = monthRange(month);

    if (!range) {
      return [];
    }

    return reservations.filter((reservation) => {
      const startDate = reservationLocalDate(reservation.startsAt);
      const endDate = reservationLocalDate(reservation.endsAt);
      const overlapsMonth = startDate < range.nextMonth && endDate > range.monthStart;
      const matchesQuery =
        !normalizedQuery ||
        [
          reservation.rawSummary,
          reservation.apartmentName,
          reservation.ownerName,
          reservation.provider,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      return overlapsMonth && matchesQuery;
    });
  }, [month, query, reservations]);

  const reservationsByDay = useMemo(() => {
    const grouped = new Map<string, ReservationListItem[]>();

    for (const day of calendarDays) {
      grouped.set(
        day.date,
        monthReservations.filter((reservation) => {
          const startDate = reservationLocalDate(reservation.startsAt);
          const endDate = reservationLocalDate(reservation.endsAt);

          return day.date >= startDate && day.date < endDate;
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

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Calendário
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              Ocupacao mensal
            </h2>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft lg:w-64"
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
            <div className="flex items-center gap-2">
              <button
                aria-label="Mes anterior"
                className="grid h-11 w-11 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={() => shiftMonth(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <input
                aria-label="Mes"
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setMonth(event.target.value)}
                type="month"
                value={month}
              />
              <button
                aria-label="Próximo mês"
                className="grid h-11 w-11 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={() => shiftMonth(1)}
                type="button"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-7 overflow-hidden rounded-2xl border border-border">
          {weekDays.map((day) => (
            <div
              className="border-b border-border bg-surface-muted px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted"
              key={day}
            >
              {day}
            </div>
          ))}

          {isLoading ? (
            <div className="col-span-7 px-4 py-10 text-center text-sm text-text-secondary">
              Carregando calendário...
            </div>
          ) : calendarDays.length === 0 ? (
            <div className="col-span-7 px-4 py-10 text-center text-sm text-text-secondary">
              Selecione um mês para ver o calendário.
            </div>
          ) : (
            calendarDays.map((day) => (
              <CalendarCell
                day={day}
                key={day.date}
                reservations={reservationsByDay.get(day.date) ?? []}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Resumo
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
              Reservas no mês
            </h2>
          </div>
          <CalendarDays aria-hidden className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-5 grid gap-3">
          {monthReservations.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhuma reserva encontrada para esse periodo.
            </p>
          ) : (
            monthReservations.map((reservation) => (
              <article
                className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                key={reservation.id}
              >
                <div>
                  <strong className="text-sm font-semibold text-text-primary">
                    {reservation.rawSummary ?? "Reserva"}
                  </strong>
                  <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <Home aria-hidden className="h-4 w-4 text-primary" />
                    {reservation.apartmentName} | {reservation.ownerName}
                  </p>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                  {reservation.provider}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CalendarCell({
  day,
  reservations,
}: {
  day: CalendarDay;
  reservations: ReservationListItem[];
}) {
  return (
    <div
      className={`min-h-32 border-b border-r border-border bg-surface p-2 ${
        day.isCurrentMonth ? "" : "bg-surface-muted/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold ${
            day.isCurrentMonth ? "text-text-primary" : "text-text-muted"
          }`}
        >
          {day.dayNumber}
        </span>
        {reservations.length > 0 ? (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
            {reservations.length}
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid gap-1">
        {reservations.slice(0, 3).map((reservation) => (
          <div
            className="truncate rounded-lg bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary"
            key={`${reservation.id}-${day.date}`}
            title={`${reservation.apartmentName} - ${reservation.rawSummary ?? "Reserva"}`}
          >
            {reservation.apartmentName}
          </div>
        ))}
        {reservations.length > 3 ? (
          <span className="px-2 text-[11px] font-medium text-text-muted">
            +{reservations.length - 3}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function buildCalendarDays(month: string): CalendarDay[] {
  const range = monthRange(month);

  if (!range) {
    return [];
  }

  const firstWeekday = new Date(`${range.monthStart}T12:00:00`).getDay();
  const start = addDays(range.monthStart, -firstWeekday);
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);

    days.push({
      date,
      dayNumber: Number(date.slice(8, 10)),
      isCurrentMonth: date >= range.monthStart && date < range.nextMonth,
    });
  }

  return days;
}

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

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
