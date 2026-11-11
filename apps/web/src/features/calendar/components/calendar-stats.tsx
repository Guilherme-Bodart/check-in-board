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
    <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
      {/* 1. Taxa de Ocupação */}
      <article className="w-44 shrink-0 snap-start rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:w-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Ocupação
          </span>
          <Percent className="h-3.5 w-3.5 text-text-muted" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {occupancyPercent}%
          </strong>
          <span className="text-[11px] text-text-muted truncate">
            {bookedNights}/{totalPossibleNights}d
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
      <article className="w-48 shrink-0 snap-start rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:w-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Receita Mês
          </span>
          <DollarSign className="h-3.5 w-3.5 text-success" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary truncate">
            {formatMoney(totalRevenueCents)}
          </strong>
        </div>
        <p className="mt-1 text-[11px] font-medium text-success truncate">
          {rentalStays.length} {rentalStays.length === 1 ? "faturada" : "faturadas"}
        </p>
      </article>

      {/* 3. Diária Média */}
      <article className="w-44 shrink-0 snap-start rounded-xl border border-border bg-surface p-3.5 shadow-2xs sm:w-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Diária Média
          </span>
          <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <strong className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary truncate">
            {averageDailyRateCents > 0 ? formatMoney(averageDailyRateCents) : "—"}
          </strong>
        </div>
        <p className="mt-1 text-[11px] text-text-muted truncate">
          Por noite ocupada
        </p>
      </article>

      {/* 4. Pendências */}
      <article
        className={`w-44 shrink-0 snap-start cursor-pointer rounded-xl border p-3.5 shadow-2xs transition sm:w-auto ${
          pendingCount > 0
            ? isPendingFilterActive
              ? "border-amber-500 bg-amber-50/70"
              : "border-border bg-surface hover:bg-surface-muted/40"
            : "border-border bg-surface"
        }`}
        onClick={onTogglePendingFilter}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Pendências
          </span>
          <AlertCircle
            className={`h-3.5 w-3.5 ${pendingCount > 0 ? "text-amber-600" : "text-text-muted"}`}
          />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <strong
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              pendingCount > 0 ? "text-amber-700" : "text-text-primary"
            }`}
          >
            {pendingCount}
          </strong>
          <span className="text-[11px] text-text-muted truncate">
            {pendingCount === 1 ? "pendente" : "pendentes"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
          <span className="truncate">S/ preço ou nome</span>
          <span className="font-semibold text-primary underline shrink-0 ml-1">
            {isPendingFilterActive ? "Limpar" : "Filtrar"}
          </span>
        </div>
      </article>
    </div>
  );
}
