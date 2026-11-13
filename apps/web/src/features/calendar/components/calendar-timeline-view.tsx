"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertCircle, BedDouble, KeyRound, UserRound } from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { formatMoney } from "../../finance/money";
import {
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
  onCellClick?: (date: string, apartmentId: string) => void;
  isLoading: boolean;
};

const weekDayUpper = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const weekDayTitle = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarTimelineView({
  month,
  apartments,
  selectedApartmentId,
  reservations,
  rentalStaysMap,
  onReservationClick,
  onCellClick,
  isLoading,
}: CalendarTimelineViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      const weekDay = dayDate.getDay();

      list.push({
        dayNumber: dayNum,
        date: dateStr,
        isToday: dateStr === todayStr,
        isWeekend: weekDay === 0 || weekDay === 6,
        weekDayUpper: weekDayUpper[weekDay],
        weekDayTitle: weekDayTitle[weekDay],
      });
    }
    return list;
  }, [month]);

  // Auto-scroll to Today (or 1 day before Today) when opening/changing month
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || days.length === 0) return;

    const todayIndex = days.findIndex((d) => d.isToday);
    if (todayIndex > 0) {
      const targetIndex = Math.max(0, todayIndex - 1);
      const dayWidth = window.innerWidth < 640 ? 78 : 88;
      container.scrollTo({
        left: targetIndex * dayWidth,
        behavior: "smooth",
      });
    } else {
      container.scrollTo({ left: 0 });
    }
  }, [days]);

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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs font-medium text-text-muted">
          Carregando cronograma de ocupação...
        </p>
      </div>
    );
  }

  if (displayApartments.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-text-muted">
        Nenhum imóvel encontrado para este filtro.
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs">
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain" ref={scrollContainerRef}>
        <div className="inline-block min-w-full align-middle">
          {/* Header Row: UNIDADE + Days of Month */}
          <div className="flex border-b border-border bg-surface-muted/80">
            <div className="sticky left-0 z-20 flex w-[115px] sm:w-[190px] shrink-0 items-center border-r border-border bg-surface-muted px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Unidade
            </div>
            <div className="flex flex-1">
              {days.map((day) => (
                <div
                  className={`flex w-[78px] sm:w-[88px] shrink-0 flex-col items-center justify-center border-r border-border/60 py-2 text-center transition ${
                    day.isToday
                      ? "bg-primary-soft border-b-2 border-b-primary text-primary"
                      : day.isWeekend
                        ? "bg-surface-muted/60 text-text-muted"
                        : "bg-surface-muted/30 text-text-secondary"
                  }`}
                  key={day.date}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      day.isToday ? "text-primary font-extrabold" : "text-text-muted"
                    }`}
                  >
                    {day.isToday ? "HOJE" : day.weekDayUpper}
                  </span>
                  <span
                    className={`mt-0.5 text-xs sm:text-sm font-bold ${
                      day.isToday ? "text-primary font-extrabold" : "text-text-primary"
                    }`}
                  >
                    {day.isToday ? `${day.dayNumber} ${day.weekDayTitle}` : day.dayNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows: Each Apartment */}
          <div className="divide-y divide-border">
            {displayApartments.map((apartment) => {
              const aptReservations = reservationsByApartment.get(apartment.id) ?? [];
              const isSelectedRow = selectedApartmentId === apartment.id;

              return (
                <div
                  className="flex group/row hover:bg-surface-muted/20 transition-colors"
                  key={apartment.id}
                >
                  {/* Sticky Left Column: Unit Name & Subtitle */}
                  <div
                    className={`sticky left-0 z-20 flex w-[115px] sm:w-[190px] shrink-0 flex-col justify-center border-r border-border px-3 py-3 transition-colors ${
                      isSelectedRow
                        ? "bg-primary-soft/90"
                        : "bg-surface group-hover/row:bg-surface-muted/40"
                    }`}
                  >
                    <strong
                      className="block truncate text-xs sm:text-sm font-bold text-text-primary"
                      title={apartment.name}
                    >
                      {apartment.name}
                    </strong>
                    <span
                      className={`mt-0.5 block truncate text-[11px] font-medium ${
                        isSelectedRow ? "text-primary" : "text-text-muted"
                      }`}
                      title={apartment.owner?.name ?? "Próprio"}
                    >
                      {apartment.owner?.name ?? "Próprio"}
                    </span>
                  </div>

                  {/* Right Column: Day Cells + Spanning Reservation Bars */}
                  <div className="relative flex flex-1">
                    {days.map((day) => {
                      const isOccupied = aptReservations.some((r) => {
                        const s = reservationLocalDate(r.startsAt);
                        const e = reservationLocalDate(r.endsAt);
                        return day.date >= s && day.date < e;
                      });

                      return (
                        <div
                          className={`group/cell flex w-[78px] sm:w-[88px] shrink-0 min-h-[64px] cursor-pointer items-center justify-center border-r border-border/50 p-1 transition-colors hover:bg-primary-soft/30 ${
                            day.isToday
                              ? "bg-primary-soft/20"
                              : day.isWeekend
                                ? "bg-surface-muted/25"
                                : "bg-surface"
                          }`}
                          key={day.date}
                          onClick={() => onCellClick?.(day.date, apartment.id)}
                          title={`Criar reserva em ${apartment.name} (${day.date})`}
                        >
                          {!isOccupied && aptReservations.length > 0 && (
                            <span className="rounded-md bg-surface-muted/80 px-2 py-1 text-[10px] font-medium text-text-muted opacity-70 transition group-hover/cell:bg-primary-soft group-hover/cell:text-primary group-hover/cell:opacity-100">
                              Livre
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* When Apartment is 100% Free in the Month */}
                    {aptReservations.length === 0 && (
                      <div className="pointer-events-none absolute inset-y-2 left-3 flex items-center">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" />
                          Totalmente livre neste período
                        </div>
                      </div>
                    )}

                    {/* Horizontal Spanning Reservation Bars */}
                    <div className="pointer-events-none absolute inset-y-2 inset-x-0">
                      {aptReservations.map((reservation) => {
                        const stay = rentalStaysMap.get(reservation.id);
                        const startDate = reservationLocalDate(reservation.startsAt);
                        const endDate = reservationLocalDate(reservation.endsAt);
                        const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";
                        const isManual =
                          !reservation.provider ||
                          reservation.provider.toLowerCase() === "manual";

                        const startIndex = days.findIndex((d) => d.date === startDate);
                        const endIndex = days.findIndex((d) => d.date === endDate);

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

                        // Serious, solid color blocks matching the reference design
                        const barStyle = hasConflict
                          ? "bg-red-700 text-white ring-2 ring-red-400"
                          : isManual
                            ? "bg-[#15803D] hover:bg-[#166534] text-white"
                            : isAirbnb
                              ? "bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                              : "bg-[#1E293B] hover:bg-[#0F172A] text-white";

                        const displayName =
                          isGenericName && !reservation.guestName
                            ? reservation.rawSummary || "Definir hóspede"
                            : reservation.guestName || reservation.rawSummary || "Reserva";

                        return (
                          <div
                            className={`pointer-events-auto absolute top-0.5 bottom-0.5 flex cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-lg px-2.5 sm:px-3 shadow-sm transition-all hover:z-30 hover:shadow-md ${barStyle}`}
                            key={reservation.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReservationClick(reservation);
                            }}
                            style={{
                              left: `calc(${leftPercent}% + 3px)`,
                              width: `calc(${widthPercent}% - 6px)`,
                            }}
                            title={`${displayName} (${startDate} a ${endDate}) - ${
                              stay ? formatMoney(stay.rentAmountCents) : "Sem preço"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isManual ? (
                                <UserRound className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              ) : isAirbnb ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                              ) : (
                                <BedDouble className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              )}
                              <span className="truncate text-xs font-semibold tracking-tight">
                                {displayName}
                                {isManual ? " (Direto)" : ""}
                              </span>
                            </div>

                            {spanDays >= 2 && (
                              <div className="hidden sm:flex items-center shrink-0">
                                {stay ? (
                                  <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/95">
                                    {formatMoney(stay.rentAmountCents)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    S/ Preço
                                  </span>
                                )}
                              </div>
                            )}
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
