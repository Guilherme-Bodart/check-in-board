"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  DollarSign,
  Percent,
  TrendingUp,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { formatMoney } from "../../finance/money";
import { nightsBetween, type ReservationListItem } from "../../reservations/reservation-view-model";

export type CalendarStatsProps = {
  month: string; // YYYY-MM
  apartments: Apartment[];
  selectedApartmentId: string;
  reservations: ReservationListItem[];
  rentalStays: RentalStay[];
  isPendingFilterActive: boolean;
  onTogglePendingFilter: () => void;
};

export function CalendarStats({
  month,
  apartments,
  selectedApartmentId,
  reservations,
  rentalStays,
  isPendingFilterActive,
  onTogglePendingFilter,
}: CalendarStatsProps) {
  const daysInMonth = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return 30;
    const [year, m] = month.split("-").map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  const activeApartmentsCount = useMemo(() => {
    if (selectedApartmentId === "all") return Math.max(1, apartments.length);
    return 1;
  }, [selectedApartmentId, apartments.length]);

  const totalPossibleNights = daysInMonth * activeApartmentsCount;

  const { bookedNights, totalRevenueCents, pendingCount } = useMemo(() => {
    let nights = 0;
    let rev = 0;
    let pending = 0;

    const staysMap = new Map<string, RentalStay>();
    for (const stay of rentalStays) {
      staysMap.set(stay.id, stay);
    }

    for (const res of reservations) {
      const stay = staysMap.get(res.id);

      if (stay && stay.rentAmountCents > 0) {
        rev += stay.rentAmountCents;
      } else {
        pending += 1;
      }

      const isGenericName =
        !res.guestName ||
        res.rawSummary?.toLowerCase().includes("reserved") ||
        res.rawSummary?.toLowerCase().includes("airbnb");

      if (isGenericName && !stay) {
        // already counted
      } else if (isGenericName && !res.guestName) {
        pending += 1;
      }

      const start = res.startsAt.slice(0, 10);
      const end = res.endsAt.slice(0, 10);
      const n = nightsBetween(start, end);
      nights += n;
    }

    return {
      bookedNights: nights,
      totalRevenueCents: rev,
      pendingCount: pending,
    };
  }, [reservations, rentalStays]);

  const occupancyPercent = useMemo(() => {
    if (totalPossibleNights <= 0) return 0;
    const pct = Math.round((bookedNights / totalPossibleNights) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [bookedNights, totalPossibleNights]);

  const averageDailyRateCents = useMemo(() => {
    if (bookedNights <= 0 || totalRevenueCents <= 0) return 0;
    return Math.round(totalRevenueCents / bookedNights);
  }, [bookedNights, totalRevenueCents]);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {/* 1. Taxa de Ocupação */}
      <article className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Ocupação
          </span>
          <Percent className="h-4 w-4 text-text-muted" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {occupancyPercent}%
          </strong>
          <span className="text-[11px] text-text-muted truncate">
            {bookedNights}/{totalPossibleNights} diárias
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </article>

      {/* 2. Receita no Mês */}
      <article className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Receita no Mês
          </span>
          <DollarSign className="h-4 w-4 text-text-muted" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {formatMoney(totalRevenueCents)}
          </strong>
        </div>
        <p className="mt-1 text-[11px] text-text-muted truncate">
          {rentalStays.length} {rentalStays.length === 1 ? "reserva faturada" : "reservas faturadas"}
        </p>
      </article>

      {/* 3. Diária Média */}
      <article className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Diária Média
          </span>
          <TrendingUp className="h-4 w-4 text-text-muted" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {averageDailyRateCents > 0 ? formatMoney(averageDailyRateCents) : "—"}
          </strong>
          <span className="text-[11px] text-text-muted">/ noite</span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted truncate">
          Média das diárias faturadas
        </p>
      </article>

      {/* 4. Pendências */}
      <article
        className={`cursor-pointer rounded-xl border p-3.5 shadow-2xs transition ${
          pendingCount > 0
            ? isPendingFilterActive
              ? "border-amber-500 bg-amber-50/70"
              : "border-border bg-surface hover:bg-surface-muted/40"
            : "border-border bg-surface"
        }`}
        onClick={onTogglePendingFilter}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Pendências
          </span>
          <AlertCircle
            className={`h-4 w-4 ${pendingCount > 0 ? "text-amber-600" : "text-text-muted"}`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <strong
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              pendingCount > 0 ? "text-amber-700" : "text-text-primary"
            }`}
          >
            {pendingCount}
          </strong>
          <span className="text-[11px] text-text-muted truncate">
            {pendingCount === 1 ? "requer atenção" : "requerem atenção"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
          <span className="truncate">Sem preço ou titular</span>
          <span className="font-semibold text-primary underline shrink-0 ml-1">
            {isPendingFilterActive ? "Limpar" : "Filtrar"}
          </span>
        </div>
      </article>
    </div>
  );
}
