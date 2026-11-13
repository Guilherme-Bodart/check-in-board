"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Layers,
  Plus,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { formatMoney } from "../../finance/money";
import {
  formatDateBR,
  reservationLocalDate,
  type ReservationListItem,
} from "../../reservations/reservation-view-model";

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
  apartments?: Apartment[];
  onSelectApartment?: (apartmentId: string) => void;
  onReservationClick: (reservation: ReservationListItem) => void;
  onDayClick?: (date: string) => void;
  isLoading: boolean;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function hasDayConflict(reservations: ReservationListItem[], date: string): boolean {
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
        if (!isTurnover && date >= aStart && date <= aEnd && date >= bStart && date <= bEnd) {
          return true;
        }
      }
    }
  }
  return false;
}

function getReservationMeta(reservation: ReservationListItem, date: string) {
  const startDate = reservationLocalDate(reservation.startsAt);
  const endDate = reservationLocalDate(reservation.endsAt);
  const isCheckIn = date === startDate;
  const isCheckOut = date === endDate;
  const isAirbnb = reservation.provider?.toLowerCase() === "airbnb";
  const isGenericName =
    !reservation.guestName ||
    reservation.rawSummary?.toLowerCase().includes("reserved") ||
    reservation.rawSummary?.toLowerCase().includes("airbnb");

  return {
    startDate,
    endDate,
    isCheckIn,
    isCheckOut,
    isAirbnb,
    isGenericName,
  };
}

export function CalendarGridView({
  calendarDays,
  reservationsByDay,
  rentalStaysMap,
  selectedApartmentId,
  apartments = [],
  onSelectApartment,
  onReservationClick,
  onDayClick,
  isLoading,
}: CalendarGridViewProps) {
  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);

  const activeDayReservations = useMemo(
    () => (activeDayDate ? (reservationsByDay.get(activeDayDate) ?? []) : []),
    [activeDayDate, reservationsByDay],
  );

  const showMobileApartmentBar =
    selectedApartmentId === "all" && apartments.length > 1 && Boolean(onSelectApartment);

  return (
    <div className="min-w-0 w-full max-w-full">
      {/* Mobile single-apartment quick switcher when viewing all apartments */}
      {showMobileApartmentBar && onSelectApartment && (
        <div
          aria-label="Filtro rápido de apartamento"
          className="mb-2.5 flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 md:hidden"
        >
          <Button
            className="shrink-0 rounded-full"
            onClick={() => onSelectApartment("all")}
            size="xs"
            variant={selectedApartmentId === "all" ? "primary" : "secondary"}
          >
            Todos ({apartments.length})
          </Button>
          {apartments.map((apartment) => (
            <Button
              className="shrink-0 rounded-full"
              key={apartment.id}
              onClick={() => onSelectApartment(apartment.id)}
              size="xs"
              variant={selectedApartmentId === apartment.id ? "primary" : "secondary"}
            >
              {apartment.name}
            </Button>
          ))}
        </div>
      )}

      <div className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
          <div className="min-w-0 w-full">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60 text-center">
              {weekDays.map((day, idx) => (
                <div
                  className={`min-w-0 py-2 text-[10px] font-bold uppercase tracking-wider md:py-3 md:text-xs ${
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
                  <p className="mt-3 text-sm text-text-muted">
                    Carregando calendário de reservas...
                  </p>
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
                      onDayClick={onDayClick}
                      onMoreClick={setActiveDayDate}
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
        </div>
      </div>

      <DayReservationsModal
        date={activeDayDate}
        onClose={() => setActiveDayDate(null)}
        onCreateReservation={onDayClick}
        onReservationClick={onReservationClick}
        rentalStaysMap={rentalStaysMap}
        reservations={activeDayReservations}
      />
    </div>
  );
}

function CalendarCell({
  day,
  reservations,
  rentalStaysMap,
  onReservationClick,
  onMoreClick,
  onDayClick,
  showApartmentName,
}: {
  day: CalendarDay;
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
  onReservationClick: (r: ReservationListItem) => void;
  onMoreClick: (date: string) => void;
  onDayClick?: (date: string) => void;
  showApartmentName: boolean;
}) {
  const hasConflict = useMemo(
    () => hasDayConflict(reservations, day.date),
    [reservations, day.date],
  );

  return (
    <div
      className={`group relative flex min-h-[78px] min-w-0 cursor-pointer flex-col overflow-hidden p-1 transition-all hover:bg-primary-soft/10 md:min-h-[126px] md:p-2 ${
        hasConflict
          ? "border-red-400 bg-red-50/50 ring-2 ring-red-400/60"
          : day.isCurrentMonth
            ? day.isWeekend
              ? "bg-surface-muted/30"
              : "bg-surface"
            : "bg-surface-muted/70 opacity-60"
      } ${day.isToday ? "ring-2 ring-inset ring-primary/40" : ""}`}
      onClick={() => onDayClick?.(day.date)}
      title={`Clique para criar nova reserva em ${day.date}`}
    >
      {/* Cell Header */}
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition md:h-6 md:w-6 md:text-xs ${
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
          <>
            <span
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-700 animate-pulse md:hidden"
              title="Conflito de reservas"
            >
              !
            </span>
            <span className="hidden shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 animate-pulse md:inline-flex">
              ⚠️ Conflito
            </span>
          </>
        ) : reservations.length > 0 ? (
          <span className="hidden shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-muted md:inline-flex">
            {reservations.length} {reservations.length === 1 ? "reserva" : "reservas"}
          </span>
        ) : null}
      </div>

      {/* Reservation Chips (max 1 on mobile <md, max 2 on desktop >=md) */}
      <div className="mt-1 flex min-w-0 flex-1 flex-col gap-1 md:mt-1.5 md:gap-1.5">
        {reservations.slice(0, 2).map((reservation, index) => {
          const stay = rentalStaysMap.get(reservation.id);
          const { isCheckIn, isCheckOut, isAirbnb, isGenericName } = getReservationMeta(
            reservation,
            day.date,
          );

          const visibilityClass =
            index === 0 ? "block" : index === 1 ? "hidden md:block" : "hidden";

          return (
            <button
              className={`${visibilityClass} group/item w-full min-w-0 cursor-pointer rounded-lg border p-1 text-left text-[10px] transition-all hover:shadow-sm active:scale-[0.98] md:rounded-xl md:p-1.5 md:text-[11px] ${
                isAirbnb
                  ? "border-blue-200 bg-blue-50/90 text-blue-900 hover:bg-blue-100/80"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100/80"
              }`}
              key={`${reservation.id}-${day.date}`}
              onClick={(e) => {
                e.stopPropagation();
                onReservationClick(reservation);
              }}
              title={`${reservation.apartmentName} - ${
                reservation.guestName || reservation.rawSummary || "Reserva"
              } (${stay ? formatMoney(stay.rentAmountCents) : "Sem preço"})`}
              type="button"
            >
              {/* Row 1: Channel + Check-in/out tag + Price */}
              <div className="flex min-w-0 items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-0.5 font-bold md:gap-1">
                  {isCheckIn && (
                    <span
                      className="flex shrink-0 items-center text-[9px] font-semibold text-emerald-700 md:text-[10px]"
                      title="Check-in"
                    >
                      <ArrowDownLeft className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="hidden md:inline">In</span>
                    </span>
                  )}
                  {isCheckOut && (
                    <span
                      className="flex shrink-0 items-center text-[9px] font-semibold text-slate-600 md:text-[10px]"
                      title="Check-out"
                    >
                      <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="hidden md:inline">Out</span>
                    </span>
                  )}
                  <span
                    className={`truncate rounded px-1 text-[8px] font-extrabold uppercase md:text-[9px] ${
                      isAirbnb ? "bg-blue-100 text-blue-800" : "bg-emerald-200 text-emerald-800"
                    }`}
                  >
                    <span className="md:hidden">{isAirbnb ? "Air" : "Dir"}</span>
                    <span className="hidden md:inline">{isAirbnb ? "Airbnb" : "Direto"}</span>
                  </span>
                </span>

                <span className="hidden shrink-0 md:inline">
                  {stay ? (
                    <span className="text-[10px] font-bold text-emerald-700">
                      {formatMoney(stay.rentAmountCents)}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-800">
                      S/ Preço
                    </span>
                  )}
                </span>
              </div>

              {/* Row 2: Guest Name or Warning */}
              <div className="mt-0.5 truncate font-semibold leading-tight md:mt-1">
                {isGenericName && !reservation.guestName ? (
                  <span className="flex min-w-0 items-center gap-0.5 font-medium text-amber-700 md:gap-1">
                    <AlertCircle className="hidden h-3 w-3 shrink-0 md:inline" />
                    <span className="truncate">
                      {reservation.rawSummary || "Definir hóspede"}
                    </span>
                  </span>
                ) : (
                  <span className="block truncate">
                    {reservation.guestName || reservation.rawSummary}
                  </span>
                )}
              </div>

              {/* Row 3: Apartment (desktop only when showing all) */}
              {showApartmentName && (
                <div className="mt-0.5 hidden truncate text-[10px] text-text-muted md:block">
                  {reservation.apartmentName}
                </div>
              )}
            </button>
          );
        })}

        {reservations.length > 1 && (
          <button
            className={`mt-auto inline-flex w-full min-w-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-primary/25 bg-primary-soft/65 px-1 py-0.5 text-[10px] font-bold text-primary transition-all hover:border-primary/50 hover:bg-primary-soft active:scale-[0.98] md:rounded-lg md:px-2 md:py-1 md:text-[11px] ${
              reservations.length <= 2 ? "md:hidden" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onMoreClick(day.date);
            }}
            title="Ver todas as reservas deste dia"
            type="button"
          >
            <span className="inline-flex items-center gap-0.5 md:hidden">
              <Layers className="h-2.5 w-2.5 shrink-0" />
              <span>+{reservations.length - 1}</span>
            </span>
            {reservations.length > 2 && (
              <span className="hidden items-center gap-1 md:inline-flex">
                <Layers className="h-3 w-3 shrink-0" />
                <span>
                  +{reservations.length - 2}{" "}
                  {reservations.length - 2 === 1 ? "reserva" : "reservas"}
                </span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function DayReservationsModal({
  date,
  reservations,
  rentalStaysMap,
  onClose,
  onReservationClick,
  onCreateReservation,
}: {
  date: string | null;
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
  onClose: () => void;
  onReservationClick: (reservation: ReservationListItem) => void;
  onCreateReservation?: (date: string) => void;
}) {
  const hasConflict = useMemo(
    () => (date ? hasDayConflict(reservations, date) : false),
    [date, reservations],
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={Boolean(date)}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
            <span>Reservas em {date ? formatDateBR(date) : ""}</span>
          </DialogTitle>
          <DialogDescription>
            {reservations.length} {reservations.length === 1 ? "reserva" : "reservas"} neste dia.
            Toque em uma reserva para editar detalhes ou precificar.
          </DialogDescription>
        </DialogHeader>

        {hasConflict && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>Atenção: há reservas sobrepostas no mesmo apartamento neste dia.</span>
          </div>
        )}

        <div className="mt-4 flex max-h-[55vh] flex-col gap-2.5 overflow-y-auto pr-0.5">
          {date &&
            reservations.map((reservation) => {
              const stay = rentalStaysMap.get(reservation.id);
              const { startDate, endDate, isCheckIn, isCheckOut, isAirbnb, isGenericName } =
                getReservationMeta(reservation, date);

              return (
                <button
                  className="group flex w-full min-w-0 cursor-pointer flex-col gap-2 rounded-xl border border-border bg-surface-muted/40 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary-soft/15 active:scale-[0.99]"
                  key={`${reservation.id}-modal`}
                  onClick={() => {
                    onClose();
                    onReservationClick(reservation);
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isAirbnb
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isAirbnb ? "Airbnb" : "Direto"}
                      </span>

                      {isCheckIn && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <ArrowDownLeft className="h-3 w-3" /> Check-in
                        </span>
                      )}
                      {isCheckOut && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          <ArrowUpRight className="h-3 w-3" /> Check-out
                        </span>
                      )}
                      {!isCheckIn && !isCheckOut && (
                        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                          Em estadia
                        </span>
                      )}
                    </div>

                    {stay ? (
                      <span className="shrink-0 whitespace-nowrap text-xs font-bold text-emerald-700">
                        {formatMoney(stay.rentAmountCents)}
                      </span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Sem preço
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary group-hover:text-primary">
                      {isGenericName && !reservation.guestName ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{reservation.rawSummary || "Definir hóspede"}</span>
                        </span>
                      ) : (
                        reservation.guestName || reservation.rawSummary || "Reserva"
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                      <span className="inline-flex min-w-0 items-center gap-1 truncate font-medium">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{reservation.apartmentName}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-text-muted">
                        {formatDateBR(startDate)} → {formatDateBR(endDate)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        <DialogFooter className="mt-5 gap-2 sm:gap-0">
          <Button onClick={onClose} size="sm" variant="secondary">
            Fechar
          </Button>
          {date && onCreateReservation && (
            <Button
              onClick={() => {
                onClose();
                onCreateReservation(date);
              }}
              size="sm"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Nova reserva neste dia
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
