"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Percent,
  Sparkles,
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
  // Days in month
  const daysInMonth = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return 30;
    const [year, m] = month.split("-").map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  // Number of active apartments in view
  const activeApartmentsCount = useMemo(() => {
    if (selectedApartmentId === "all") return Math.max(1, apartments.length);
    return 1;
  }, [selectedApartmentId, apartments.length]);

  // Total possible nights = daysInMonth * activeApartments
  const totalPossibleNights = daysInMonth * activeApartmentsCount;

  // Booked nights in this month
  const { bookedNights, totalRevenueCents, pendingCount } = useMemo(() => {
    const monthPrefix = month;
    let nights = 0;
    let rev = 0;
    let pending = 0;

    const staysMap = new Map<string, RentalStay>();
    for (const stay of rentalStays) {
      staysMap.set(stay.id, stay);
    }

    for (const res of reservations) {
      const stay = staysMap.get(res.id);

      // Check if price is billed
      if (stay && stay.rentAmountCents > 0) {
        rev += stay.rentAmountCents;
      } else {
        pending += 1;
      }

      // Check if guest name is generic Airbnb "Reserved"
      const isGenericName =
        !res.guestName ||
        res.rawSummary?.toLowerCase().includes("reserved") ||
        res.rawSummary?.toLowerCase().includes("airbnb");

      if (isGenericName && !stay) {
        // already counted in pending
      } else if (isGenericName && !res.guestName) {
        pending += 1;
      }

      // Calculate nights overlap in this month
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
  }, [month, reservations, rentalStays]);

  // Occupancy percentage
  const occupancyPercent = useMemo(() => {
    if (totalPossibleNights <= 0) return 0;
    const pct = Math.round((bookedNights / totalPossibleNights) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [bookedNights, totalPossibleNights]);

  // ADR (Average Daily Rate)
  const averageDailyRateCents = useMemo(() => {
    if (bookedNights <= 0 || totalRevenueCents <= 0) return 0;
    return Math.round(totalRevenueCents / bookedNights);
  }, [bookedNights, totalRevenueCents]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Taxa de Ocupação */}
      <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Taxa de Ocupação
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
            <Percent className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-2xl font-bold tracking-tight text-text-primary">
            {occupancyPercent}%
          </strong>
          <span className="text-xs text-text-muted">
            {bookedNights} de {totalPossibleNights} diárias
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </article>

      {/* 2. Receita Confirmada do Mês */}
      <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Receita no Mês
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <DollarSign className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-2xl font-bold tracking-tight text-emerald-700">
            {formatMoney(totalRevenueCents)}
          </strong>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {rentalStays.length} {rentalStays.length === 1 ? "reserva faturada" : "reservas faturadas"}
        </p>
      </article>

      {/* 3. Diária Média (ADR) */}
      <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Diária Média (ADR)
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-2xl font-bold tracking-tight text-text-primary">
            {averageDailyRateCents > 0 ? formatMoney(averageDailyRateCents) : "—"}
          </strong>
          <span className="text-xs text-text-muted">/ noite</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Com base nas diárias com preço
        </p>
      </article>

      {/* 4. Pendências de Atenção (Filtro Rápido) */}
      <article
        className={`relative cursor-pointer overflow-hidden rounded-2xl border p-4.5 shadow-sm transition hover:shadow-md ${
          pendingCount > 0
            ? isPendingFilterActive
              ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/50"
              : "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70"
            : "border-border bg-surface"
        }`}
        onClick={onTogglePendingFilter}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Pendências Airbnb
          </span>
          <span
            className={`grid h-8 w-8 place-items-center rounded-xl ${
              pendingCount > 0
                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                : "bg-surface-muted text-text-muted"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <strong
            className={`text-2xl font-bold tracking-tight ${
              pendingCount > 0 ? "text-amber-900" : "text-text-primary"
            }`}
          >
            {pendingCount}
          </strong>
          <span className="text-xs text-amber-800">
            {pendingCount === 1 ? "reserva requer atenção" : "reservas requerem atenção"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-amber-800/90">
          <span>Sem preço ou sem nome</span>
          <span className="font-semibold underline">
            {isPendingFilterActive ? "Remover filtro" : "Filtrar"}
          </span>
        </div>
      </article>
    </div>
  );
}
