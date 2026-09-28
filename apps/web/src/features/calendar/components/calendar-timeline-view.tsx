"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  ShieldCheck,
  User,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { formatMoney } from "../../finance/money";
import {
  nightsBetween,
  reservationLocalDate,
  type ReservationListItem,
} from "../../reservations/reservation-view-model";

export type CalendarTimelineViewProps = {
  month: string; // YYYY-MM
  apartments: Apartment[];
  selectedApartmentId: string;
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
  onReservationClick: (reservation: ReservationListItem) => void;
  isLoading: boolean;
};

export function CalendarTimelineView({
  month,
  apartments,
  selectedApartmentId,
  reservations,
  rentalStaysMap,
  onReservationClick,
  isLoading,
}: CalendarTimelineViewProps) {
  // Filter apartments
  const displayApartments = useMemo(() => {
    if (selectedApartmentId === "all") return apartments;
    return apartments.filter((apt) => apt.id === selectedApartmentId);
  }, [apartments, selectedApartmentId]);

  // Generate days in month
  const days = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return [];
    const [year, m] = month.split("-").map(Number);
    const count = new Date(year, m, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    const list = [];
    for (let dayNum = 1; dayNum <= count; dayNum++) {
      const dayStr = String(dayNum).padStart(2, "0");
      const dateStr = `${month}-${dayStr}`;
      const dayDate = new Date(`${dateStr}T12:00:00`);
      const weekDay = dayDate.getDay(); // 0 = Dom, 6 = Sáb

      list.push({
        dayNumber: dayNum,
        date: dateStr,
        isToday: dateStr === todayStr,
        isWeekend: weekDay === 0 || weekDay === 6,
        weekDayShort: ["D", "S", "T", "Q", "Q", "S", "S"][weekDay],
      });
    }
    return list;
  }, [month]);

  // Group reservations by apartment
  const reservationsByApartment = useMemo(() => {
    const map = new Map<string, ReservationListItem[]>();
    for (const apt of displayApartments) {
      map.set(apt.id, []);
    }
    for (const res of reservations) {
      const list = map.get(res.apartmentId);
      if (list) {
        list.push(res);
      }
    }
    return map;
  }, [displayApartments, reservations]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-text-muted">Carregando cronograma de ocupação...</p>
      </div>
    );
  }

  if (displayApartments.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-text-muted">
        Nenhum apartamento encontrado para este filtro.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row: Days of Month */}
          <div className="grid grid-cols-[220px_1fr] border-b border-border bg-surface-muted/70">
            <div className="border-r border-border p-3 text-xs font-bold uppercase tracking-wider text-text-muted">
              Imóvel / Locador
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${days.length}, minmax(36px, 1fr))`,
              }}
            >
              {days.map((day) => (
                <div
                  className={`flex flex-col items-center justify-center border-r border-border/50 py-2 text-center transition ${
                    day.isToday
                      ? "bg-primary-soft/80 font-bold text-primary"
                      : day.isWeekend
                        ? "bg-surface-muted text-text-muted"
                        : "text-text-secondary"
                  }`}
                  key={day.date}
                >
                  <span className="text-[10px] font-semibold">{day.weekDayShort}</span>
                  <span
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                      day.isToday ? "bg-primary text-white" : ""
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows: Each Apartment */}
          <div className="divide-y divide-border">
            {displayApartments.map((apartment) => {
              const aptReservations = reservationsByApartment.get(apartment.id) ?? [];

              return (
                <div className="grid grid-cols-[220px_1fr] group/row hover:bg-surface-muted/20" key={apartment.id}>
                  {/* Left Column: Apartment and Owner info */}
                  <div className="border-r border-border p-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <strong className="truncate text-xs font-bold text-text-primary" title={apartment.name}>
                        {apartment.name}
                      </strong>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-info" />
                      <span className="truncate" title={`Locador: ${apartment.owner?.name ?? "Não informado"}`}>
                        {apartment.owner?.name ?? "Sem locador"}
                      </span>
                      {apartment.managementCommissionBps ? (
                        <span className="shrink-0 text-[10px] text-text-muted/80">
                          ({apartment.managementCommissionBps / 100}%)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Right Column: Timeline Bar Grid */}
                  <div
                    className="relative grid"
                    style={{
                      gridTemplateColumns: `repeat(${days.length}, minmax(36px, 1fr))`,
                    }}
                  >
                    {/* Background Day Columns */}
                    {days.map((day) => (
                      <div
                        className={`border-r border-border/40 min-h-[64px] ${
                          day.isToday
                            ? "bg-primary-soft/20"
                            : day.isWeekend
                              ? "bg-surface-muted/30"
                              : ""
                        }`}
                        key={day.date}
                      />
                    ))}

                    {/* Horizontal Spanning Reservation Bars */}
                    <div className="absolute inset-y-1.5 inset-x-0 pointer-events-none">
                      {aptReservations.map((reservation) => {
                        const stay = rentalStaysMap.get(reservation.id);
                        const startDate = reservationLocalDate(reservation.startsAt);
                        const endDate = reservationLocalDate(reservation.endsAt);
                        const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";

                        // Find start and end day indices
                        const startIndex = days.findIndex((d) => d.date === startDate);
                        const endIndex = days.findIndex((d) => d.date === endDate);

                        // If out of current month bounds, clamp
                        const effectiveStart = startIndex !== -1 ? startIndex : 0;
                        const effectiveEnd =
                          endIndex !== -1
                            ? endIndex
                            : days[days.length - 1].date < startDate
                              ? -1
                              : days.length;

                        if (effectiveStart > days.length || effectiveEnd < 0) return null;

                        const spanDays = Math.max(1, effectiveEnd - effectiveStart);
                        const leftPercent = (effectiveStart / days.length) * 100;
                        const widthPercent = (spanDays / days.length) * 100;

                        const isGenericName =
                          !reservation.guestName ||
                          reservation.rawSummary?.toLowerCase().includes("reserved") ||
                          reservation.rawSummary?.toLowerCase().includes("airbnb");

                        const hasConflict = aptReservations.some((other) => {
                          if (other.id === reservation.id) return false;
                          const oStart = reservationLocalDate(other.startsAt);
                          const oEnd = reservationLocalDate(other.endsAt);
                          const isTurnover = oEnd === startDate || oStart === endDate;
                          return !isTurnover && startDate < oEnd && endDate > oStart;
                        });

                        return (
                          <div
                            className={`group/bar pointer-events-auto absolute top-1 bottom-1 flex cursor-pointer items-center justify-between overflow-hidden rounded-xl border px-2.5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md hover:z-20 ${
                              hasConflict
                                ? "border-red-400 bg-red-100 text-red-900 ring-2 ring-red-400/50"
                                : isAirbnb
                                  ? "border-[#FECDD3] bg-gradient-to-r from-[#FFF1F2] to-[#FFE4E6] text-[#9F1239]"
                                  : "border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-900"
                            }`}
                            key={reservation.id}
                            onClick={() => onReservationClick(reservation)}
                            style={{
                              left: `${leftPercent}%`,
                              width: `calc(${widthPercent}% - 4px)`,
                              marginLeft: "2px",
                            }}
                            title={`${reservation.guestName || reservation.rawSummary} (${startDate} a ${endDate}) - ${
                              stay ? formatMoney(stay.rentAmountCents) : "Sem preço"
                            }`}
                          >
                            {/* Left: Badge + Guest */}
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className={`rounded px-1 text-[9px] font-extrabold uppercase shrink-0 ${
                                  isAirbnb
                                    ? "bg-[#FFE4E6] text-[#BE123C]"
                                    : "bg-emerald-200 text-emerald-800"
                                }`}
                              >
                                {isAirbnb ? "Airbnb" : "Manual"}
                              </span>
                              <span className="truncate text-xs font-bold">
                                {isGenericName && !reservation.guestName ? (
                                  <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {reservation.rawSummary || "Definir hóspede"}
                                  </span>
                                ) : (
                                  reservation.guestName || reservation.rawSummary
                                )}
                              </span>
                            </div>

                            {/* Right: Price */}
                            <div className="shrink-0 pl-1">
                              {stay ? (
                                <span className="text-[11px] font-bold text-emerald-800">
                                  {formatMoney(stay.rentAmountCents)}
                                </span>
                              ) : (
                                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                                  S/ Preço
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
