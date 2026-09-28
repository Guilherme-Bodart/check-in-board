"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Field, Input, Select } from "../../../components/ui/form-controls";
import { MessageBanner } from "../../../components/ui/message-banner";
import { readStoredSession } from "../../../lib/session-storage";
import { createTask } from "../../dashboard/dashboard-api";
import { createFinancialEntry } from "../../finance/finance-api";
import { formatMoney, parseMoneyToCents } from "../../finance/money";
import { createRentalStay, updateRentalStay } from "../../finance/rental-stay-api";
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

export type OperationalCategory = "limpeza" | "manutencao" | "inspecao" | "cortesia" | "outros";

export type OperationalItem = {
  id: string;
  category: OperationalCategory;
  title: string;
  amount: string;
  scheduleOn: "checkout" | "checkin" | "now";
};

const categoryLabels: Record<OperationalCategory, string> = {
  limpeza: "🧹 Limpeza & Lavanderia",
  manutencao: "🔧 Manutenção & Reparos",
  inspecao: "📋 Inspeção / Vistoria",
  cortesia: "🎁 Cortesia Boas-vindas",
  outros: "📌 Outra Tarefa / Despesa",
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
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("10:00");
  const [rentAmount, setRentAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Operational items (Limpeza, Manutenção, etc.)
  const [operationalItems, setOperationalItems] = useState<OperationalItem[]>([
    {
      id: "1",
      category: "limpeza",
      title: "Limpeza e lavanderia pós check-out",
      amount: "190,00",
      scheduleOn: "checkout",
    },
  ]);

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

  // Total operational expenses
  const totalOperationalExpensesCents = useMemo(() => {
    return operationalItems.reduce((sum, item) => sum + parseMoneyToCents(item.amount), 0);
  }, [operationalItems]);

  // Overbooking / Date Conflict Detection
  const conflictingReservation = useMemo(() => {
    if (!formApartmentId || !startsAt || !endsAt) return null;

    return allReservations.find((res) => {
      if (reservation && res.id === reservation.id) return false;
      if (res.apartmentId !== formApartmentId) return false;

      const resStart = res.startsAt.slice(0, 10);
      const resEnd = res.endsAt.slice(0, 10);

      // Overlap: A starts before B ends AND A ends after B starts
      return startsAt < resEnd && endsAt > resStart;
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
        setCheckInTime("14:00");
        setCheckOutTime("10:00");

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

        setOperationalItems([
          {
            id: "1",
            category: "limpeza",
            title: "Limpeza e lavanderia pós check-out",
            amount: "190,00",
            scheduleOn: "checkout",
          },
        ]);
      } else {
        const initialAptId =
          defaultApartmentId && defaultApartmentId !== "all"
            ? defaultApartmentId
            : apartments[0]?.id || "";
        setFormApartmentId(initialAptId);
        setGuestName("");
        setGuestCount("1");
        setRentAmount("");
        setCheckInTime("14:00");
        setCheckOutTime("10:00");
        setNotes("");

        const today = new Date().toISOString().substring(0, 10);
        setStartsAt(today);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        setEndsAt(tomorrow.toISOString().substring(0, 10));

        setOperationalItems([
          {
            id: "1",
            category: "limpeza",
            title: "Limpeza e lavanderia pós check-out",
            amount: "190,00",
            scheduleOn: "checkout",
          },
        ]);
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

  function addOperationalItem() {
    setOperationalItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        category: "manutencao",
        title: "Manutenção / Reparo rápido",
        amount: "50,00",
        scheduleOn: "checkout",
      },
    ]);
  }

  function removeOperationalItem(id: string) {
    setOperationalItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateOperationalItem(id: string, updates: Partial<OperationalItem>) {
    setOperationalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

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
          `Atenção: Já existe uma reserva no período selecionado (${formatDateBR(
            conflictingReservation.startsAt,
          )} a ${formatDateBR(conflictingReservation.endsAt)}) para "${
            conflictingReservation.guestName || conflictingReservation.rawSummary
          }". Deseja continuar com a reserva?`,
        );
        if (!confirmOverbook) {
          setIsSaving(false);
          return;
        }
      }

      const rentAmountCents = parseMoneyToCents(rentAmount);
      const parsedGuestCount = guestCount ? parseInt(guestCount, 10) : 1;
      const effectiveGuestName = guestName.trim() || reservation?.rawSummary || "Hóspede";

      const startDateTimeStr = `${startsAt}T${checkInTime || "14:00"}:00`;
      const endDateTimeStr = `${endsAt}T${checkOutTime || "10:00"}:00`;

      let reservationId = reservation?.id;

      if (isEditing && reservationId) {
        // 1. Update guest details
        await updateReservation(session.token, formApartmentId, reservationId, {
          guestName: guestName.trim(),
          guestCount: parsedGuestCount,
        });

        // 2. Financial stay
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
            startsAt: new Date(startDateTimeStr).toISOString(),
            endsAt: new Date(endDateTimeStr).toISOString(),
          },
        );
        reservationId = newReservation.id;

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

      // 3. Process Operational Items (Limpeza, Manutenção, Cortesia, etc.)
      if (reservationId) {
        for (const item of operationalItems) {
          const cents = parseMoneyToCents(item.amount);
          if (cents <= 0 && !item.title.trim()) continue;

          const occurredOnDate =
            item.scheduleOn === "checkin"
              ? startsAt
              : item.scheduleOn === "checkout"
              ? endsAt
              : new Date().toISOString().slice(0, 10);

          const scheduledDateTime =
            item.scheduleOn === "checkin"
              ? startDateTimeStr
              : item.scheduleOn === "checkout"
              ? endDateTimeStr
              : new Date().toISOString();

          // Financial expense entry
          if (cents > 0) {
            await createFinancialEntry(session.token, {
              apartmentId: formApartmentId,
              rentalStayId: reservationId,
              type: "expense",
              category: item.category,
              description: `${item.title} - ${effectiveGuestName}`,
              amountCents: cents,
              currency: "BRL",
              occurredOn: occurredOnDate,
            });
          }

          // Operational task
          try {
            await createTask(session.token, formApartmentId, {
              reservationId,
              title: `${categoryLabels[item.category].split(" ")[1] ?? "Tarefa"} - ${effectiveGuestName}`,
              description: `${item.title}. ${cents > 0 ? `Valor: ${formatMoney(cents)}` : ""}`,
              dueAt: new Date(scheduledDateTime).toISOString(),
            });
          } catch {
            // Task fallback
          }
        }
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 300);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <section className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
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
                <h2 className="text-base font-bold tracking-tight text-text-primary">
                  {isEditing ? "Gestão da Reserva" : "Nova Reserva Manual"}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Faturado
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {reservation?.externalEventKey && (
              <button
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:border-primary hover:text-primary"
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
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body - Compact 2-Column Grid */}
        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">
            {message && <MessageBanner isError message={message} />}

            {/* Overbooking Alert */}
            {conflictingReservation && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs text-red-900 shadow-sm animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <strong>Alerta de Conflito!</strong> Conflita com a reserva de{" "}
                  <strong>{conflictingReservation.guestName || conflictingReservation.rawSummary}</strong> (
                  {formatDateBR(conflictingReservation.startsAt)} a {formatDateBR(conflictingReservation.endsAt)}).
                </div>
              </div>
            )}

            {/* Main Grid: Left Column (Reserva & Financeiro), Right Column (Tarefas Operacionais) */}
            <div className="grid gap-4 lg:grid-cols-12">
              {/* LEFT COLUMN: Estadia, Hóspede & Preço (Span 7) */}
              <div className="lg:col-span-7 space-y-3">
                {/* Imóvel, Proprietário & Datas */}
                <div className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted/30 p-3 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {!isEditing ? (
                        <Select
                          className="h-8 text-xs font-semibold"
                          onChange={(e) => setFormApartmentId(e.target.value)}
                          required
                          value={formApartmentId}
                        >
                          {apartments.map((apt) => (
                            <option key={apt.id} value={apt.id}>
                              {apt.name} ({apt.owner?.name ?? "Proprietário"})
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-xs font-bold text-text-primary">
                          {reservation?.apartmentName}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-text-muted">
                      Proprietário: <strong>{selectedApartment?.owner?.name ?? "Não informado"}</strong>
                    </span>
                  </div>

                  {/* Datas & Horários (Check-in & Check-out Editáveis) */}
                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                    {/* Check-in */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-text-muted">Check-in (Entrada)</span>
                      <div className="flex items-center gap-1">
                        {!isIcal ? (
                          <Input
                            className="h-8 text-xs font-medium"
                            onChange={(e) => setStartsAt(e.target.value)}
                            required
                            type="date"
                            value={startsAt}
                          />
                        ) : (
                          <span className="h-8 flex items-center font-bold text-text-primary px-2 border rounded-md bg-surface-muted/30">
                            {formatDateBR(startsAt)}
                          </span>
                        )}
                        <Input
                          className="h-8 w-20 text-xs font-semibold text-center"
                          onChange={(e) => setCheckInTime(e.target.value)}
                          title="Horário de Check-in"
                          type="time"
                          value={checkInTime}
                        />
                      </div>
                    </div>

                    {/* Check-out */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-text-muted">Check-out (Saída)</span>
                      <div className="flex items-center gap-1">
                        {!isIcal ? (
                          <Input
                            className="h-8 text-xs font-medium"
                            onChange={(e) => setEndsAt(e.target.value)}
                            required
                            type="date"
                            value={endsAt}
                          />
                        ) : (
                          <span className="h-8 flex items-center font-bold text-text-primary px-2 border rounded-md bg-surface-muted/30">
                            {formatDateBR(endsAt)}
                          </span>
                        )}
                        <Input
                          className="h-8 w-20 text-xs font-semibold text-center"
                          onChange={(e) => setCheckOutTime(e.target.value)}
                          title="Horário de Check-out"
                          type="time"
                          value={checkOutTime}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Indicators */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      {totalNights} {totalNights === 1 ? "diária" : "diárias"}
                    </span>
                    <span>
                      Diária Média: <strong className="text-text-primary">{averageDailyRate > 0 ? formatMoney(averageDailyRate) : "—"}</strong>
                    </span>
                  </div>
                </div>

                {/* Hóspede Principal */}
                <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Hóspede Titular
                    </span>
                    {isGenericAirbnbSummary && (
                      <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ⚠ Airbnb importou como "{reservation?.rawSummary}"
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        className="h-8.5 text-xs"
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Nome do Hóspede Titular"
                        required={!isIcal}
                        value={guestName}
                      />
                    </div>
                    <div>
                      <Input
                        className="h-8.5 text-xs text-center"
                        min={1}
                        onChange={(e) => setGuestCount(e.target.value)}
                        placeholder="Pessoas"
                        type="number"
                        value={guestCount}
                      />
                    </div>
                  </div>
                </div>

                {/* Financeiro / Preço da Reserva */}
                <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      Preço & Faturamento
                    </span>
                    {existingStay ? (
                      <span className="text-[11px] font-bold text-emerald-700">
                        Faturado: {formatMoney(existingStay.rentAmountCents)}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                          R$
                        </span>
                        <Input
                          className="h-8.5 pl-8 text-xs font-bold text-emerald-700"
                          inputMode="decimal"
                          onChange={(e) => setRentAmount(e.target.value)}
                          placeholder="1500,00"
                          value={rentAmount}
                        />
                      </div>
                    </div>
                    <div>
                      <Input
                        className="h-8.5 text-xs"
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas/Cofre/Pagamento"
                        value={notes}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Tarefas & Despesas Operacionais (Span 5) */}
              <div className="lg:col-span-5 rounded-xl border border-border bg-surface-muted/30 p-3 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                      <Wrench className="h-3.5 w-3.5 text-primary" />
                      Tarefas & Despesas Operacionais
                    </span>
                    <button
                      className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      onClick={addOperationalItem}
                      type="button"
                    >
                      <Plus className="h-3 w-3" /> Adicionar
                    </button>
                  </div>

                  {/* List of Operational Items */}
                  <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {operationalItems.length === 0 ? (
                      <p className="py-6 text-center text-xs text-text-muted">
                        Nenhuma tarefa operacional ou despesa agendada.
                      </p>
                    ) : (
                      operationalItems.map((item) => (
                        <div
                          className="rounded-lg border border-border bg-surface p-2 text-xs space-y-1.5 shadow-2xs"
                          key={item.id}
                        >
                          <div className="flex items-center justify-between gap-1">
                            {/* Categoria */}
                            <select
                              className="h-6 rounded border border-border bg-surface-muted px-1.5 text-[10px] font-bold text-text-primary outline-none"
                              onChange={(e) =>
                                updateOperationalItem(item.id, {
                                  category: e.target.value as OperationalCategory,
                                })
                              }
                              value={item.category}
                            >
                              {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>

                            {/* Execução */}
                            <select
                              className="h-6 rounded border border-border bg-surface-muted px-1 text-[10px] font-semibold text-text-secondary outline-none"
                              onChange={(e) =>
                                updateOperationalItem(item.id, {
                                  scheduleOn: e.target.value as "checkout" | "checkin" | "now",
                                })
                              }
                              value={item.scheduleOn}
                            >
                              <option value="checkout">Na Saída ({checkOutTime})</option>
                              <option value="checkin">Na Entrada ({checkInTime})</option>
                              <option value="now">Imediata</option>
                            </select>

                            {/* Remover */}
                            <button
                              aria-label="Remover item"
                              className="text-text-muted hover:text-red-600 transition"
                              onClick={() => removeOperationalItem(item.id)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Título & Valor */}
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="col-span-2">
                              <Input
                                className="h-7 text-[11px]"
                                onChange={(e) => updateOperationalItem(item.id, { title: e.target.value })}
                                placeholder="Descrição da tarefa"
                                value={item.title}
                              />
                            </div>
                            <div>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted">
                                  R$
                                </span>
                                <Input
                                  className="h-7 pl-6 text-[11px] font-semibold text-emerald-700"
                                  inputMode="decimal"
                                  onChange={(e) => updateOperationalItem(item.id, { amount: e.target.value })}
                                  placeholder="0,00"
                                  value={item.amount}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total Despesas Operacionais */}
                <div className="border-t border-border pt-2 flex items-center justify-between text-xs font-semibold text-text-primary">
                  <span>Total Despesas Lançadas:</span>
                  <span className="font-bold text-emerald-700">
                    {formatMoney(totalOperationalExpensesCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex items-center justify-between border-t border-border bg-surface-muted/40 px-5 py-3 shrink-0">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button disabled={isSaving || isSuccess} type="submit">
                {isSaving ? "Salvando..." : isSuccess ? "Salvo com sucesso!" : "Salvar Reserva"}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
