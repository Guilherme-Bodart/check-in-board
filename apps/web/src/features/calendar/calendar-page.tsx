"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Home, Search } from "lucide-react";

import type { Apartment } from "../../api";
import { messages } from "../../i18n";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartments } from "../dashboard/dashboard-api";
import { fetchReservations } from "../reservations/reservations-api";
import { attachApartmentDetails, reservationLocalDate, type ReservationListItem } from "../reservations/reservation-view-model";
import { fetchRentalStays } from "../finance/rental-stay-api";
import { BillingModal, type BillingData } from "../finance/components/billing-modal";
import { ReservationFormModal } from "../reservations/reservation-form-modal";
import type { RentalStay } from "../../api";

const allApartmentsValue = "all";

export function CalendarPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingReservation, setEditingReservation] = useState<ReservationListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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

      // Fetch rental stays to know which ones are billed
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 6); // Fetch last 6 months just in case
      const dateTo = new Date();
      dateTo.setMonth(dateTo.getMonth() + 6);
      
      const stays = await fetchRentalStays(session.token, {
        dateFrom: dateFrom.toISOString().slice(0, 10),
        dateTo: dateTo.toISOString().slice(0, 10),
        apartmentId: nextApartmentId === allApartmentsValue ? undefined : nextApartmentId,
      });

      setApartments(nextApartments);
      setRentalStays(stays);
      setReservations(
        attachApartmentDetails(reservationGroups.flat(), nextApartments),
      );
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
              {messages.calendar.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              {messages.calendar.monthlyOccupancy}
            </h2>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <button
              className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={() => {
                setEditingReservation(null);
                setIsFormOpen(true);
              }}
              type="button"
            >
              + Nova Reserva
            </button>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft lg:w-64"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={messages.calendar.searchPlaceholder}
                value={query}
              />
            </div>
            <select
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
              onChange={(event) => changeApartment(event.target.value)}
              value={selectedApartmentId}
            >
              <option value={allApartmentsValue}>{messages.calendar.allApartments}</option>
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                aria-label={messages.calendar.previousMonth}
                className="grid h-11 w-11 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={() => shiftMonth(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <input
                aria-label={messages.calendar.monthLabel}
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setMonth(event.target.value)}
                type="month"
                value={month}
              />
              <button
                aria-label={messages.calendar.nextMonth}
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
          {messages.calendar.weekDays.map((day) => (
            <div
              className="border-b border-border bg-surface-muted px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted"
              key={day}
            >
              {day}
            </div>
          ))}

          {isLoading ? (
            <div className="col-span-7 px-4 py-10 text-center text-sm text-text-secondary">
              {messages.calendar.loading}
            </div>
          ) : calendarDays.length === 0 ? (
            <div className="col-span-7 px-4 py-10 text-center text-sm text-text-secondary">
              {messages.calendar.emptyMonth}
            </div>
          ) : (
            calendarDays.map((day) => (
              <CalendarCell
                day={day}
                key={day.date}
                onReservationClick={(reservation) => {
                  setEditingReservation(reservation);
                  setIsFormOpen(true);
                }}
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
              {messages.calendar.summary}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
              {messages.calendar.reservationsInMonth}
            </h2>
          </div>
          <CalendarDays aria-hidden className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-5 grid gap-3">
          {monthReservations.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {messages.calendar.emptyReservations}
            </p>
          ) : (
            monthReservations.map((reservation) => {
              const stay = rentalStays.find((s) => s.id === reservation.id);
              
              return (
                <article
                  className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  key={reservation.id}
                >
                  <div>
                    <strong className="text-sm font-semibold text-text-primary">
                      {reservation.guestName || reservation.rawSummary || messages.calendar.reservationFallback}
                      {reservation.guestCount ? ` (${reservation.guestCount} hóspedes)` : ""}
                    </strong>
                    <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                      <Home aria-hidden className="h-4 w-4 text-primary" />
                      {reservation.apartmentName} | {reservation.ownerName}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:border-primary hover:text-primary"
                      onClick={() => {
                        setEditingReservation(reservation);
                        setIsFormOpen(true);
                      }}
                      type="button"
                    >
                      Editar Dados
                    </button>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                      {reservation.provider}
                    </span>
                    {stay ? (
                      <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                        Faturado ({new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stay.rentAmountCents / 100)})
                      </span>
                    ) : (
                      <button
                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110"
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
                        Faturar Reserva
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <BillingModal
        data={billingData}
        isOpen={billingData !== null}
        onClose={() => setBillingData(null)}
        onSuccess={() => {
          setBillingData(null);
          void loadCalendar(); // Reload to show updated status
        }}
      />

      <ReservationFormModal
        apartments={apartments}
        apartmentId={selectedApartmentId}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          setIsFormOpen(false);
          void loadCalendar();
        }}
        reservation={editingReservation as any}
      />
    </div>
  );
}

function CalendarCell({
  day,
  reservations,
  onReservationClick,
}: {
  day: CalendarDay;
  reservations: ReservationListItem[];
  onReservationClick: (r: ReservationListItem) => void;
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
            className="truncate rounded-lg bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary cursor-pointer hover:bg-primary-soft/80"
            key={`${reservation.id}-${day.date}`}
            onClick={() => onReservationClick(reservation)}
            title={`${reservation.apartmentName} - ${
              reservation.guestName || reservation.rawSummary || messages.calendar.reservationFallback
            }`}
          >
            {reservation.guestName || reservation.apartmentName}
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
