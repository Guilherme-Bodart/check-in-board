"use client";

import {
  AlertTriangle,
  Building2,
  Clock,
  DollarSign,
  User,
  Users,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/form-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { formatMoney } from "../../finance/money";
import { formatDateBR, type ReservationListItem } from "../../reservations/reservation-view-model";

export type ReservationFormState = {
  apartmentId: string;
  guestName: string;
  guestCount: string;
  startsAt: string;
  endsAt: string;
  checkInTime: string;
  checkOutTime: string;
  rentAmount: string;
  notes: string;
};

export type ReservationDetailsTabProps = {
  isEditing: boolean;
  isIcal: boolean;
  isGenericAirbnbSummary: boolean;
  reservationMode: "guest" | "owner_block";
  onSelectReservationMode: (mode: "guest" | "owner_block") => void;
  apartments: Apartment[];
  apartmentName?: string;
  form: ReservationFormState;
  onUpdateForm: (patch: Partial<ReservationFormState>) => void;
  totalNights: number;
  averageDailyRate: number;
  conflictingReservation?: ReservationListItem | null;
  existingStay?: RentalStay | null;
};

export function ReservationDetailsTab({
  isEditing,
  isIcal,
  isGenericAirbnbSummary,
  reservationMode,
  onSelectReservationMode,
  apartments,
  apartmentName,
  form,
  onUpdateForm,
  totalNights,
  averageDailyRate,
  conflictingReservation,
  existingStay,
}: ReservationDetailsTabProps) {
  return (
    <div className="space-y-4">
      {conflictingReservation && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0">
            <strong>Conflito de Datas!</strong> Já existe reserva de{" "}
            <strong>{conflictingReservation.guestName || conflictingReservation.rawSummary}</strong> (
            {formatDateBR(conflictingReservation.startsAt)} a{" "}
            {formatDateBR(conflictingReservation.endsAt)}).
          </div>
        </div>
      )}

      {!isIcal && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-muted/40 p-1.5">
          <Button
            aria-pressed={reservationMode === "guest"}
            className={`min-w-[140px] flex-1 ${
              reservationMode === "guest"
                ? "border-primary/25 bg-surface text-primary shadow-2xs hover:border-primary/35 hover:bg-surface hover:text-primary"
                : "border-transparent bg-transparent text-text-secondary shadow-none hover:bg-surface/60 hover:text-text-primary"
            }`}
            onClick={() => onSelectReservationMode("guest")}
            size="xs"
            type="button"
            variant="ghost"
          >
            Reserva de Hóspede
          </Button>
          <Button
            aria-pressed={reservationMode === "owner_block"}
            className={`min-w-[160px] flex-1 ${
              reservationMode === "owner_block"
                ? "border-warning/35 bg-surface text-warning shadow-2xs hover:border-warning/45 hover:bg-surface hover:text-warning"
                : "border-transparent bg-transparent text-text-secondary shadow-none hover:bg-surface/60 hover:text-text-primary"
            }`}
            onClick={() => onSelectReservationMode("owner_block")}
            size="xs"
            type="button"
            variant="ghost"
          >
            Bloqueio / Uso do Proprietário
          </Button>
        </div>
      )}

      {/* Seção 1: Imóvel e Período */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Building2 className="h-3.5 w-3.5 text-text-muted" />
            Imóvel da Hospedagem
          </label>
          {!isEditing ? (
            <Select
              onValueChange={(apartmentId) => onUpdateForm({ apartmentId })}
              value={form.apartmentId}
            >
              <SelectTrigger className="h-10 w-full text-sm font-medium">
                <SelectValue placeholder="Selecione o apartamento..." />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((apt) => (
                  <SelectItem key={apt.id} value={apt.id}>
                    {apt.name} ({apt.owner?.name ?? "Sem proprietário"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-10 items-center rounded-xl border border-border bg-surface-muted/40 px-3 text-sm font-bold text-text-primary">
              {apartmentName}
            </div>
          )}
        </div>

        {/* Datas de Check-in e Check-out */}
        <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-2 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Check-in (Entrada)
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
              {!isIcal ? (
                <Input
                  className="h-10 w-full min-w-0 px-3 text-xs font-medium sm:text-sm"
                  onChange={(e) => onUpdateForm({ startsAt: e.target.value })}
                  required
                  type="date"
                  value={form.startsAt}
                />
              ) : (
                <span className="flex h-10 items-center truncate rounded-xl border border-border bg-surface-muted/30 px-3 text-sm font-bold text-text-primary">
                  {formatDateBR(form.startsAt)}
                </span>
              )}
              <Input
                className="h-10 w-full px-2.5 text-xs font-semibold sm:text-sm"
                onChange={(e) => onUpdateForm({ checkInTime: e.target.value })}
                title="Horário de Check-in"
                type="time"
                value={form.checkInTime}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary">
              Check-out (Saída)
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
              {!isIcal ? (
                <Input
                  className="h-10 w-full min-w-0 px-3 text-xs font-medium sm:text-sm"
                  onChange={(e) => onUpdateForm({ endsAt: e.target.value })}
                  required
                  type="date"
                  value={form.endsAt}
                />
              ) : (
                <span className="flex h-10 items-center truncate rounded-xl border border-border bg-surface-muted/30 px-3 text-sm font-bold text-text-primary">
                  {formatDateBR(form.endsAt)}
                </span>
              )}
              <Input
                className="h-10 w-full px-2.5 text-xs font-semibold sm:text-sm"
                onChange={(e) => onUpdateForm({ checkOutTime: e.target.value })}
                title="Horário de Check-out"
                type="time"
                value={form.checkOutTime}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted/60 px-3.5 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-text-primary">
            <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            {totalNights} {totalNights === 1 ? "diária selecionada" : "diárias selecionadas"}
          </span>
          <span className="text-text-secondary">
            Diária Média:{" "}
            <strong className="font-bold text-text-primary">
              {averageDailyRate > 0 ? formatMoney(averageDailyRate) : "—"}
            </strong>
          </span>
        </div>
      </div>

      {/* Seção 2: Hóspede e Valor Financeiro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <User className="h-3.5 w-3.5 text-text-muted" />
              Hóspede Titular
            </span>
            {isGenericAirbnbSummary && (
              <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Sem nome no iCal
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">
                Nome Completo
              </label>
              <Input
                className="h-10 w-full text-sm"
                onChange={(e) => onUpdateForm({ guestName: e.target.value })}
                placeholder="Ex: Mariana Costa"
                required={!isIcal}
                value={form.guestName}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-text-muted">
                <Users className="h-3 w-3" /> Quantidade de Hóspedes
              </label>
              <Input
                className="h-10 w-full text-sm"
                min={1}
                onChange={(e) => onUpdateForm({ guestCount: e.target.value })}
                placeholder="1"
                type="number"
                value={form.guestCount}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <DollarSign className="h-3.5 w-3.5 text-text-muted" />
              Valor & Faturamento
            </span>
            {existingStay && (
              <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                {formatMoney(existingStay.rentAmountCents)}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">
                Valor Total da Reserva (R$)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                  R$
                </span>
                <Input
                  className="h-10 w-full pl-9 text-sm font-bold text-text-primary"
                  inputMode="decimal"
                  onChange={(e) => onUpdateForm({ rentAmount: e.target.value })}
                  placeholder="1.500,00"
                  value={form.rentAmount}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">
                Observações / Senha da Porta
              </label>
              <Input
                className="h-10 w-full text-sm"
                onChange={(e) => onUpdateForm({ notes: e.target.value })}
                placeholder="Ex: Senha 4892#"
                value={form.notes}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
