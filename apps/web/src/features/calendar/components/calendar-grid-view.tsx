"use client";

import { useMemo } from "react";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, DollarSign, Home, User } from "lucide-react";

import type { RentalStay } from "../../../api";
import { formatMoney } from "../../finance/money";
import { reservationLocalDate, type ReservationListItem } from "../../reservations/reservation-view-model";

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
};

export type CalendarGridViewProps = {
  calendarDays: CalendarDay[];
  reservationsByDay: Map<string, ReservationListItem[]>;
  rentalStaysMap: Map<string, RentalStay>;
  selectedApartmentId: string;
  onReservationClick: (reservation: ReservationListItem) => void;
  isLoading: boolean;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarGridView({
  calendarDays,
  reservationsByDay,
  rentalStaysMap,
  selectedApartmentId,
  onReservationClick,
  isLoading,
}: CalendarGridViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60 text-center">
        {weekDays.map((day, idx) => (
          <div
            className={`py-3 text-xs font-bold uppercase tracking-wider ${
              idx === 0 || idx === 6 ? "text-text-muted/80" : "text-text-secondary"
            }`}
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border bg-surface">
        {isLoading ? (
          <div className="col-span-7 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-text-muted">Carregando calendário de reservas...</p>
          </div>
        ) : calendarDays.length === 0 ? (
          <div className="col-span-7 py-16 text-center text-sm text-text-secondary">
            Nenhum dia para exibir no mês selecionado.
          </div>
        ) : (
          calendarDays.map((day) => {
            const dayReservations = reservationsByDay.get(day.date) ?? [];

            return (
              <CalendarCell
                day={day}
                key={day.date}
                onReservationClick={onReservationClick}
                rentalStaysMap={rentalStaysMap}
                reservations={dayReservations}
                showApartmentName={selectedApartmentId === "all"}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function CalendarCell({
  day,
  reservations,
  rentalStaysMap,
  onReservationClick,
  showApartmentName,
}: {
  day: CalendarDay;
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
  onReservationClick: (r: ReservationListItem) => void;
  showApartmentName: boolean;
}) {
  const hasConflict = useMemo(() => {
    if (reservations.length < 2) return false;
    for (let i = 0; i < reservations.length; i++) {
      for (let j = i + 1; j < reservations.length; j++) {
        const a = reservations[i];
        const b = reservations[j];
        if (a.apartmentId === b.apartmentId) {
          const aStart = reservationLocalDate(a.startsAt);
          const aEnd = reservationLocalDate(a.endsAt);
          const bStart = reservationLocalDate(b.startsAt);
          const bEnd = reservationLocalDate(b.endsAt);
          const isTurnover = aEnd === bStart || bEnd === aStart;
          if (!isTurnover && day.date >= aStart && day.date <= aEnd && day.date >= bStart && day.date <= bEnd) {
            return true;
          }
        }
      }
    }
    return false;
  }, [reservations, day.date]);

  return (
    <div
      className={`group relative flex min-h-[135px] flex-col p-2 transition-colors ${
        hasConflict
          ? "border-red-400 bg-red-50/50 ring-2 ring-red-400/60"
          : day.isCurrentMonth
            ? day.isWeekend
              ? "bg-surface-muted/30"
              : "bg-surface"
            : "bg-surface-muted/70 opacity-60"
      } ${day.isToday ? "ring-2 ring-inset ring-primary/40" : ""}`}
    >
      {/* Cell Header */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
            day.isToday
              ? "bg-primary text-white shadow-sm"
              : day.isCurrentMonth
                ? "text-text-primary group-hover:text-primary"
                : "text-text-muted"
          }`}
        >
          {day.dayNumber}
        </span>

        {hasConflict ? (
          <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 animate-pulse">
            ⚠️ Conflito
          </span>
        ) : reservations.length > 0 ? (
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
            {reservations.length} {reservations.length === 1 ? "reserva" : "reservas"}
          </span>
        ) : null}
      </div>

      {/* Reservation Chips */}
      <div className="mt-1.5 flex flex-1 flex-col gap-1.5">
        {reservations.slice(0, 3).map((reservation) => {
          const stay = rentalStaysMap.get(reservation.id);
          const startDate = reservationLocalDate(reservation.startsAt);
          const endDate = reservationLocalDate(reservation.endsAt);
          const isCheckIn = day.date === startDate;
          const isCheckOut = day.date === endDate;
          const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";

          const isGenericName =
            !reservation.guestName ||
            reservation.rawSummary?.toLowerCase().includes("reserved") ||
            reservation.rawSummary?.toLowerCase().includes("airbnb");

          return (
            <div
              className={`group/item cursor-pointer rounded-xl border p-1.5 text-left text-[11px] transition-all hover:scale-[1.02] hover:shadow-md ${
                isAirbnb
                  ? "border-[#FECDD3] bg-[#FFF1F2]/90 text-[#9F1239] hover:bg-[#FFE4E6]"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100"
              }`}
              key={`${reservation.id}-${day.date}`}
              onClick={() => onReservationClick(reservation)}
              title={`${reservation.apartmentName} - ${
                reservation.guestName || reservation.rawSummary || "Reserva"
              } (${stay ? formatMoney(stay.rentAmountCents) : "Sem preço"})`}
            >
              {/* Row 1: Channel + Check-in/out tag */}
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 font-bold">
                  {isCheckIn && (
                    <span className="flex items-center text-[10px] text-emerald-600 font-semibold" title="Check-in">
                      <ArrowDownLeft className="h-3 w-3" /> In
                    </span>
                  )}
                  {isCheckOut && (
                    <span className="flex items-center text-[10px] text-rose-600 font-semibold" title="Check-out">
                      <ArrowUpRight className="h-3 w-3" /> Out
                    </span>
                  )}
                  <span
                    className={`rounded px-1 text-[9px] font-extrabold uppercase ${
                      isAirbnb ? "bg-[#FFE4E6] text-[#BE123C]" : "bg-emerald-200 text-emerald-800"
                    }`}
                  >
                    {isAirbnb ? "Airbnb" : "Manual"}
                  </span>
                </span>

                {stay ? (
                  <span className="text-[10px] font-bold text-emerald-700">
                    {formatMoney(stay.rentAmountCents)}
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-800">
                    S/ Preço
                  </span>
                )}
              </div>

              {/* Row 2: Guest Name or Warning */}
              <div className="mt-1 truncate font-semibold">
                {isGenericName && !reservation.guestName ? (
                  <span className="flex items-center gap-1 text-amber-700 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {reservation.rawSummary || "Definir hóspede"}
                  </span>
                ) : (
                  <span>{reservation.guestName || reservation.rawSummary}</span>
                )}
              </div>

              {/* Row 3: Apartment (if showing all) */}
              {showApartmentName && (
                <div className="mt-0.5 truncate text-[10px] text-text-muted">
                  {reservation.apartmentName}
                </div>
              )}
            </div>
          );
        })}

        {reservations.length > 3 && (
          <div className="mt-auto text-center text-[10px] font-semibold text-primary">
            +{reservations.length - 3} mais
          </div>
        )}
      </div>
    </div>
  );
}
