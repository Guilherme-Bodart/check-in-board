"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Copy,
  DollarSign,
  Sparkles,
  User,
  Users,
  X,
  AlertCircle,
  AlertTriangle,
  Clock,
  Building2,
  ShieldCheck,
  Tag,
  CheckSquare,
  Sparkle,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Field, Input, Select } from "../../../components/ui/form-controls";
import { MessageBanner } from "../../../components/ui/message-banner";
import { readStoredSession } from "../../../lib/session-storage";
import { createTask } from "../../dashboard/dashboard-api";
import { createRentalStay, updateRentalStay } from "../../finance/rental-stay-api";
import { createFinancialEntry } from "../../finance/finance-api";
import { formatMoney, parseMoneyToCents } from "../../finance/money";
import { createManualReservation, updateReservation } from "../../reservations/reservations-api";
import { formatDateBR, nightsBetween, type ReservationListItem } from "../../reservations/reservation-view-model";

export type ReservationUnifiedModalProps = {
  isOpen: boolean;
  reservation?: ReservationListItem | null;
  existingStay?: RentalStay | null;
  apartments: Apartment[];
  allReservations?: ReservationListItem[];
  defaultApartmentId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ReservationUnifiedModal({
  isOpen,
  reservation,
  existingStay,
  apartments,
  allReservations = [],
  defaultApartmentId = "all",
  onClose,
  onSaved,
}: ReservationUnifiedModalProps) {
  const isEditing = Boolean(reservation);
  const isIcal = isEditing && reservation?.provider !== "manual";
  const provider = reservation?.provider?.toLowerCase() ?? "manual";
  const isAirbnb = provider === "airbnb";

  // Form states
  const [formApartmentId, setFormApartmentId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [cleaningFee, setCleaningFee] = useState("190,00");
  const [scheduleCleaningTask, setScheduleCleaningTask] = useState(true);
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Selected apartment info
  const selectedApartment = useMemo(() => {
    return apartments.find((apt) => apt.id === formApartmentId);
  }, [apartments, formApartmentId]);

  // Calculated nights
  const totalNights = useMemo(() => {
    if (!startsAt || !endsAt) return 0;
    return nightsBetween(startsAt, endsAt);
  }, [startsAt, endsAt]);

  // Calculated daily rate
  const averageDailyRate = useMemo(() => {
    const cents = parseMoneyToCents(rentAmount);
    if (cents <= 0 || totalNights <= 0) return 0;
    return cents / totalNights;
  }, [rentAmount, totalNights]);

  // Overbooking / Date Conflict Detection
  const conflictingReservation = useMemo(() => {
    if (!formApartmentId || !startsAt || !endsAt) return null;

    return allReservations.find((res) => {
      // Don't conflict with itself
      if (reservation && res.id === reservation.id) return false;
      // Must be same apartment
      if (res.apartmentId !== formApartmentId) return false;

      const resStart = res.startsAt.slice(0, 10);
      const resEnd = res.endsAt.slice(0, 10);

      // Overlap: A starts before B ends AND A ends after B starts
      // Note: Same-day turnover (resEnd === startsAt or resStart === endsAt) is allowed!
      const hasConflict = startsAt < resEnd && endsAt > resStart;
      return hasConflict;
    });
  }, [allReservations, formApartmentId, startsAt, endsAt, reservation]);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setIsSuccess(false);
      setCopiedCode(false);

      if (reservation) {
        setFormApartmentId(reservation.apartmentId);
        setGuestName(reservation.guestName || "");
        setGuestCount(reservation.guestCount ? String(reservation.guestCount) : "1");
        setStartsAt(reservation.startsAt.substring(0, 10));
        setEndsAt(reservation.endsAt.substring(0, 10));

        if (existingStay) {
          setRentAmount(
            existingStay.rentAmountCents > 0
              ? (existingStay.rentAmountCents / 100).toFixed(2).replace(".", ",")
              : "",
          );
          setNotes(existingStay.notes || "");
        } else {
          setRentAmount("");
          setNotes("");
        }
        setCleaningFee("190,00");
        setScheduleCleaningTask(true);
        setCleaningNotes("Limpeza e lavanderia pós check-out");
      } else {
        const initialAptId =
          defaultApartmentId && defaultApartmentId !== "all"
            ? defaultApartmentId
            : apartments[0]?.id || "";
        setFormApartmentId(initialAptId);
        setGuestName("");
        setGuestCount("1");
        setRentAmount("");
        setCleaningFee("190,00");
        setScheduleCleaningTask(true);
        setCleaningNotes("Limpeza e lavanderia pós check-out");
        setNotes("");

        const today = new Date().toISOString().substring(0, 10);
        setStartsAt(today);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        setEndsAt(tomorrow.toISOString().substring(0, 10));
      }
    }
  }, [isOpen, reservation, existingStay, apartments, defaultApartmentId]);

  if (!isOpen) return null;

  const isGenericAirbnbSummary =
    isAirbnb &&
    (!reservation?.guestName || reservation.guestName.trim() === "") &&
    Boolean(
      reservation?.rawSummary?.toLowerCase().includes("reserved") ||
        reservation?.rawSummary?.toLowerCase().includes("airbnb"),
    );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    if (!session) return;

    setIsSaving(true);
    setMessage("");

    try {
      if (!formApartmentId) {
        throw new Error("Selecione um apartamento.");
      }

      if (conflictingReservation && !isIcal) {
        const confirmOverbook = window.confirm(
          `Atenção: Já existe uma reserva no período selecionado (${conflictingReservation.startsAt.slice(0, 10)} a ${conflictingReservation.endsAt.slice(0, 10)}) para "${conflictingReservation.guestName || conflictingReservation.rawSummary}". Deseja continuar mesmo com o risco de overbooking?`,
        );
        if (!confirmOverbook) {
          setIsSaving(false);
          return;
        }
      }

      const rentAmountCents = parseMoneyToCents(rentAmount);
      const parsedGuestCount = guestCount ? parseInt(guestCount, 10) : 1;
      const effectiveGuestName = guestName.trim() || reservation?.rawSummary || "Hóspede";

      let reservationId = reservation?.id;

      if (isEditing && reservationId) {
        // 1. Update guest name and guest count on reservation
        await updateReservation(session.token, formApartmentId, reservationId, {
          guestName: guestName.trim(),
          guestCount: parsedGuestCount,
        });

        // 2. If rent amount is filled, create or update RentalStay
        if (rentAmountCents > 0) {
          const stayData = {
            id: reservationId,
            apartmentId: formApartmentId,
            guestName: effectiveGuestName,
            channel: reservation?.provider || "airbnb",
            checkIn: startsAt,
            checkOut: endsAt,
            rentAmountCents,
            currency: "BRL",
            notes: notes.trim() || undefined,
          };

          if (existingStay) {
            await updateRentalStay(session.token, existingStay.id, stayData);
          } else {
            await createRentalStay(session.token, stayData);
          }
        }
      } else {
        // Create manual reservation
        const newReservation = await createManualReservation(
          session.token,
          formApartmentId,
          {
            guestName: effectiveGuestName,
            guestCount: parsedGuestCount,
            startsAt: new Date(startsAt + "T14:00:00").toISOString(),
            endsAt: new Date(endsAt + "T11:00:00").toISOString(),
          },
        );
        reservationId = newReservation.id;

        // If rent amount filled, create RentalStay
        if (rentAmountCents > 0 && reservationId) {
          await createRentalStay(session.token, {
            id: reservationId,
            apartmentId: formApartmentId,
            guestName: effectiveGuestName,
            channel: "manual",
            checkIn: startsAt,
            checkOut: endsAt,
            rentAmountCents,
            currency: "BRL",
            notes: notes.trim() || undefined,
          });
        }
      }

      // 3. Limpeza & Lavanderia: Lançamento de despesa e Tarefa Operacional no Check-out
      const cleaningFeeCents = parseMoneyToCents(cleaningFee);
      if (reservationId && scheduleCleaningTask && cleaningFeeCents > 0) {
        // Create financial expense entry (for the owner statement deduction)
        await createFinancialEntry(session.token, {
          apartmentId: formApartmentId,
          rentalStayId: reservationId,
          type: "expense",
          category: "limpeza",
          description: `Limpeza e lavanderia - ${effectiveGuestName}`,
          amountCents: cleaningFeeCents,
          currency: "BRL",
          occurredOn: endsAt,
        });

        // Create operational task for team on checkout date
        try {
          await createTask(session.token, formApartmentId, {
            reservationId,
            title: `Limpeza Check-out - ${effectiveGuestName}`,
            description: `${cleaningNotes || "Limpeza e lavanderia pós check-out"}. Valor da faxina: ${formatMoney(cleaningFeeCents)}`,
            dueAt: new Date(endsAt + "T11:00:00").toISOString(),
          });
        } catch {
          // Task created if supported
        }
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar dados da reserva.");
    } finally {
      setIsSaving(false);
    }
  }

  function copyReservationCode() {
    const code = reservation?.externalEventKey || reservation?.id || "";
    if (code) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <section className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold ${
                isAirbnb
                  ? "bg-[#FFF1F2] text-[#E11D48] ring-1 ring-[#FECDD3]"
                  : provider === "manual"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
              }`}
            >
              {isAirbnb ? "Ab" : provider === "manual" ? "Mn" : "Bk"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-text-primary">
                  {isEditing ? "Gestão da Reserva" : "Nova Reserva Manual"}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                    isAirbnb
                      ? "bg-[#FFE4E6] text-[#BE123C]"
                      : provider === "manual"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isAirbnb ? "Airbnb iCal" : provider === "manual" ? "Manual" : provider}
                </span>
                {existingStay ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Faturado
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Pendente de Preço
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {isEditing
                  ? `ID: ${reservation?.id?.slice(0, 8)}... • Sincronização oficial Airbnb`
                  : "Cadastre uma reserva direta fora de plataformas"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {reservation?.externalEventKey && (
              <button
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={copyReservationCode}
                title="Copiar código externo da reserva"
                type="button"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedCode ? "Copiado!" : "Cód. Airbnb"}
              </button>
            )}
            <button
              aria-label="Fechar"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={handleSubmit}>
          <div className="space-y-6 p-6">
            {message && <MessageBanner isError message={message} />}

            {/* Overbooking / Date Conflict Alert */}
            {conflictingReservation && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm animate-pulse">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <strong className="block text-sm font-bold">
                    Alerta de Conflito de Datas (Overbooking)!
                  </strong>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-800">
                    Este apartamento já possui uma reserva confirmada para{" "}
                    <strong>{conflictingReservation.guestName || conflictingReservation.rawSummary}</strong>{" "}
                    no período de{" "}
                    <strong>{formatDateBR(conflictingReservation.startsAt)} a {formatDateBR(conflictingReservation.endsAt)}</strong>.
                    Verifique as datas para não sobrepor hóspedes no mesmo imóvel.
                  </p>
                </div>
              </div>
            )}

            {/* Imóvel & Locador Principal Card */}
            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-surface to-surface-muted/40 p-4.5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Apartamento */}
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Imóvel & Apartamento
                    </span>
                    {!isEditing ? (
                      <div className="mt-1">
                        <Select
                          className="h-9 font-medium"
                          onChange={(e) => setFormApartmentId(e.target.value)}
                          required
                          value={formApartmentId}
                        >
                          {apartments.map((apt) => (
                            <option key={apt.id} value={apt.id}>
                              {apt.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <strong className="block text-base font-bold text-text-primary">
                        {reservation?.apartmentName}
                      </strong>
                    )}
                  </div>
                </div>

                {/* Locador Principal / Proprietário */}
                <div className="flex items-start gap-3 rounded-xl bg-surface px-3.5 py-2.5 ring-1 ring-border sm:min-w-56">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Locador Principal (Proprietário)
                    </span>
                    <strong className="text-xs font-bold text-text-primary">
                      {selectedApartment?.owner?.name ??
                        reservation?.ownerName ??
                        "Não informado"}
                    </strong>
                    <span className="block text-[10px] text-text-secondary">
                      {selectedApartment?.owner?.type === "internal"
                        ? "Imóvel Próprio"
                        : "Cliente / Terceiro"}
                      {selectedApartment?.managementCommissionBps
                        ? ` • Taxa de Gestão: ${selectedApartment.managementCommissionBps / 100}%`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datas da Estadia */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 sm:grid-cols-4">
                <div>
                  <span className="block text-[11px] font-medium text-text-muted">Check-in</span>
                  {!isIcal ? (
                    <Input
                      className="h-8 text-xs"
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                      type="date"
                      value={startsAt}
                    />
                  ) : (
                    <strong className="text-sm font-semibold text-text-primary">
                      {formatDateBR(startsAt)} (a partir 14h)
                    </strong>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-text-muted">Check-out</span>
                  {!isIcal ? (
                    <Input
                      className="h-8 text-xs"
                      onChange={(e) => setEndsAt(e.target.value)}
                      required
                      type="date"
                      value={endsAt}
                    />
                  ) : (
                    <strong className="text-sm font-semibold text-text-primary">
                      {formatDateBR(endsAt)} (até 11h)
                    </strong>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-text-muted">Duração</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    {totalNights} {totalNights === 1 ? "diária" : "diárias"}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-text-muted">Diária Média</span>
                  <span className="text-sm font-bold text-text-primary">
                    {averageDailyRate > 0 ? formatMoney(averageDailyRate) : "—"}
                  </span>
                </div>
              </div>

              {isIcal && (
                <p className="mt-3 text-[11px] text-text-muted">
                  🔒 As datas desta estadia são sincronizadas automaticamente pelo iCal do{" "}
                  <strong className="text-text-secondary">{reservation?.provider}</strong>.
                </p>
              )}
            </div>

            {/* SEÇÃO 1: Dados do Hóspede Principal (Locatário) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-primary">
                  <User className="h-4 w-4 text-primary" />
                  Hóspede Principal (Locatário Titular)
                </h3>
                {isGenericAirbnbSummary && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                    <AlertCircle className="h-3 w-3" /> Requer identificação
                  </span>
                )}
              </div>

              {isGenericAirbnbSummary && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                  O Airbnb sincronizou esta reserva como{" "}
                  <span className="font-semibold underline">
                    "{reservation?.rawSummary || "Reserved"}"
                  </span>
                  . Digite o nome real do hóspede abaixo para atualizar no calendário e relatórios:
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome Completo do Hóspede Titular">
                  <Input
                    autoFocus={isGenericAirbnbSummary}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ex: João Carlos da Silva"
                    required={!isIcal}
                    value={guestName}
                  />
                </Field>

                <Field label="Quantidade Total de Hóspedes">
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <Input
                      className="pl-9"
                      min={1}
                      onChange={(e) => setGuestCount(e.target.value)}
                      placeholder="Ex: 2"
                      type="number"
                      value={guestCount}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* SEÇÃO 2: Financeiro & Preço */}
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-primary">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Preço da Reserva
                </h3>
                {existingStay ? (
                  <span className="text-xs font-semibold text-emerald-600">
                    Valor faturado: {formatMoney(existingStay.rentAmountCents)}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">
                    Preencha o valor para faturar no financeiro
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor Total da Reserva (R$)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">
                      R$
                    </span>
                    <Input
                      className="pl-9 font-semibold text-emerald-700"
                      inputMode="decimal"
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="1850,00"
                      value={rentAmount}
                    />
                  </div>
                </Field>

                <Field label="Observações & Notas Internas">
                  <Input
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Pago via Airbnb; código do cofre 4455"
                    value={notes}
                  />
                </Field>
              </div>
            </div>

            {/* SEÇÃO 3: Tarefa de Limpeza Automática & Valor */}
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    checked={scheduleCleaningTask}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                    onChange={(e) => setScheduleCleaningTask(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm font-bold text-text-primary">
                    Agendar Tarefa de Limpeza no Check-out
                  </span>
                </label>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Governança
                </span>
              </div>

              {scheduleCleaningTask && (
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <Field label="Valor da Limpeza e Lavanderia (R$)">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">
                        R$
                      </span>
                      <Input
                        className="pl-9 font-medium"
                        inputMode="decimal"
                        onChange={(e) => setCleaningFee(e.target.value)}
                        placeholder="190,00"
                        value={cleaningFee}
                      />
                    </div>
                  </Field>

                  <Field label="Instruções para a Equipe de Limpeza">
                    <Input
                      onChange={(e) => setCleaningNotes(e.target.value)}
                      placeholder="Ex: Troca de roupa de cama e toalhas"
                      value={cleaningNotes}
                    />
                  </Field>
                </div>
              )}
              <p className="text-[11px] text-text-muted">
                A tarefa será agendada automaticamente para a data de saída ({endsAt || "check-out"}) às 11h e o valor será deduzido como despesa de limpeza no Demonstrativo do Proprietário.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex flex-col-reverse justify-between gap-3 border-t border-border bg-surface-muted/40 p-4 sm:flex-row sm:items-center">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>

            <div className="flex items-center gap-3">
              <Button disabled={isSaving || isSuccess} type="submit">
                {isSaving ? "Salvando..." : isSuccess ? "Salvo com sucesso!" : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
