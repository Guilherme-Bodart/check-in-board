"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  User,
  Users,
  Wrench,
} from "lucide-react";

import { apiRequest, type Apartment, type FinancialEntry, type RentalStay, type Task, type TaskStatus } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { Input, Select as FormSelect } from "../../../components/ui/form-controls";
import { MessageBanner } from "../../../components/ui/message-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { readStoredSession } from "../../../lib/session-storage";
import { createTask } from "../../dashboard/dashboard-api";
import { createFinancialEntry, fetchFinancialEntries } from "../../finance/finance-api";
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
  initialStartDate?: string;
  initialEndDate?: string;
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

const financialCategoryLabels: Record<string, string> = {
  ...categoryLabels,
  consumo: "🛒 Consumo / Mercado",
  enxoval: "🛏️ Enxoval",
  condominio: "🏢 Condomínio",
  contas: "⚡ Energia / Internet / Contas",
  taxas: "📄 Taxas",
};

const operationalPresets: Array<{
  label: string;
  category: OperationalCategory;
  title: string;
  amount: string;
  scheduleOn: OperationalItem["scheduleOn"];
}> = [
  {
    label: "+ 🧹 Limpeza",
    category: "limpeza",
    title: "Limpeza e lavanderia pós check-out",
    amount: "190,00",
    scheduleOn: "checkout",
  },
  {
    label: "+ 🛒 Consumo / Mercado",
    category: "cortesia",
    title: "Compra de insumos / mercado",
    amount: "",
    scheduleOn: "now",
  },
  {
    label: "+ 🔧 Manutenção",
    category: "manutencao",
    title: "Manutenção / reparo no imóvel",
    amount: "",
    scheduleOn: "now",
  },
  {
    label: "+ 📋 Vistoria",
    category: "inspecao",
    title: "Vistoria de check-out",
    amount: "0,00",
    scheduleOn: "checkout",
  },
];

const taskStatusMeta: Record<
  TaskStatus,
  { label: string; tone: "warning" | "success" | "danger" | "neutral" }
> = {
  pending: { label: "Pendente", tone: "warning" },
  done: { label: "Concluída", tone: "success" },
  not_done: { label: "Não concluída", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

async function fetchTasks(token: string, apartmentId: string): Promise<Task[]> {
  const response = await apiRequest<{ tasks: Task[] }>(
    `/apartments/${apartmentId}/tasks`,
    { token },
  );
  return response.tasks;
}

function createOperationalItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ReservationUnifiedModal({
  isOpen,
  reservation,
  existingStay,
  apartments,
  allReservations = [],
  defaultApartmentId = "all",
  initialStartDate,
  initialEndDate,
  onClose,
  onSaved,
}: ReservationUnifiedModalProps) {
  const isEditing = Boolean(reservation);
  const isIcal = isEditing && reservation?.provider !== "manual";
  const provider = reservation?.provider?.toLowerCase() ?? "manual";
  const isAirbnb = provider === "airbnb";

  const [activeTab, setActiveTab] = useState<"main" | "operational">("main");
  const [reservationMode, setReservationMode] = useState<"guest" | "owner_block">("guest");

  // Form states
  const [formApartmentId, setFormApartmentId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("10:00");
  const [rentAmount, setRentAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Operational items (existing & new)
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [existingEntries, setExistingEntries] = useState<FinancialEntry[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(true);
  const [operationalItems, setOperationalItems] = useState<OperationalItem[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedApartment = useMemo(() => {
    return apartments.find((apt) => apt.id === formApartmentId);
  }, [apartments, formApartmentId]);

  const totalNights = useMemo(() => {
    if (!startsAt || !endsAt) return 0;
    return nightsBetween(startsAt, endsAt);
  }, [startsAt, endsAt]);

  const averageDailyRate = useMemo(() => {
    const cents = parseMoneyToCents(rentAmount);
    if (cents <= 0 || totalNights <= 0) return 0;
    return cents / totalNights;
  }, [rentAmount, totalNights]);

  const totalOperationalExpensesCents = useMemo(() => {
    return operationalItems.reduce((sum, item) => sum + parseMoneyToCents(item.amount), 0);
  }, [operationalItems]);

  const existingOperationalExpensesCents = useMemo(() => {
    return existingEntries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
  }, [existingEntries]);

  const existingCount = existingTasks.length + existingEntries.length;

  const conflictingReservation = useMemo(() => {
    if (!formApartmentId || !startsAt || !endsAt) return null;

    return allReservations.find((res) => {
      if (reservation && res.id === reservation.id) return false;
      if (res.apartmentId !== formApartmentId) return false;

      const resStart = res.startsAt.slice(0, 10);
      const resEnd = res.endsAt.slice(0, 10);

      return startsAt < resEnd && endsAt > resStart;
    });
  }, [allReservations, formApartmentId, startsAt, endsAt, reservation]);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setIsSuccess(false);
      setCopiedCode(false);
      setActiveTab("main");

      if (reservation) {
        setFormApartmentId(reservation.apartmentId);
        setGuestName(reservation.guestName || "");
        setGuestCount(reservation.guestCount ? String(reservation.guestCount) : "1");
        setStartsAt(reservation.startsAt.substring(0, 10));
        setEndsAt(reservation.endsAt.substring(0, 10));
        setCheckInTime("14:00");
        setCheckOutTime("10:00");
        setReservationMode(
          reservation.guestName === "Uso do Proprietário / Manutenção" &&
            (!existingStay || existingStay.rentAmountCents === 0)
            ? "owner_block"
            : "guest",
        );

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

        // Never pre-populate a default item when editing so saves don't duplicate existing tasks/expenses
        setOperationalItems([]);
        setIsAddSectionOpen(false);
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
        setReservationMode("guest");

        const start = initialStartDate || new Date().toISOString().substring(0, 10);
        setStartsAt(start);
        if (initialEndDate) {
          setEndsAt(initialEndDate);
        } else {
          const d = new Date(`${start}T12:00:00`);
          d.setDate(d.getDate() + 2);
          setEndsAt(d.toISOString().substring(0, 10));
        }

        setIsAddSectionOpen(true);
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
  }, [isOpen, reservation, existingStay, apartments, defaultApartmentId, initialStartDate, initialEndDate]);

  useEffect(() => {
    if (!isOpen || !reservation) {
      setExistingTasks([]);
      setExistingEntries([]);
      setIsLoadingExisting(false);
      return;
    }

    const session = readStoredSession();
    if (!session) {
      setExistingTasks([]);
      setExistingEntries([]);
      setIsLoadingExisting(false);
      return;
    }

    let cancelled = false;
    setIsLoadingExisting(true);
    setExistingTasks([]);
    setExistingEntries([]);

    const startBase = new Date(reservation.startsAt);
    const safeStart = Number.isNaN(startBase.getTime()) ? new Date() : startBase;
    const fromDate = new Date(safeStart);
    fromDate.setDate(fromDate.getDate() - 60);

    const endBase = new Date(reservation.endsAt || reservation.startsAt);
    const safeEnd = Number.isNaN(endBase.getTime()) || endBase < safeStart ? safeStart : endBase;
    const toDate = new Date(safeEnd);
    toDate.setDate(toDate.getDate() + 60);

    const dateFrom = fromDate.toISOString().slice(0, 10);
    const dateTo = toDate.toISOString().slice(0, 10);

    Promise.all([
      fetchTasks(session.token, reservation.apartmentId).catch(() => [] as Task[]),
      fetchFinancialEntries(session.token, {
        apartmentId: reservation.apartmentId,
        dateFrom,
        dateTo,
      }).catch(() => [] as FinancialEntry[]),
    ])
      .then(([tasks, entries]) => {
        if (cancelled) return;
        setExistingTasks(tasks.filter((task) => task.reservationId === reservation.id));
        setExistingEntries(entries.filter((entry) => entry.rentalStayId === reservation.id));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingExisting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, reservation]);

  const isGenericAirbnbSummary =
    isAirbnb &&
    (!reservation?.guestName || reservation.guestName.trim() === "") &&
    (reservation?.rawSummary?.toLowerCase().includes("reserved") ||
      reservation?.rawSummary?.toLowerCase().includes("airbnb"));

  function selectReservationMode(mode: "guest" | "owner_block") {
    setReservationMode(mode);
    if (mode === "owner_block") {
      setGuestName("Uso do Proprietário / Manutenção");
      setRentAmount("0,00");
    } else {
      if (guestName === "Uso do Proprietário / Manutenção") {
        setGuestName("");
      }
      if (rentAmount === "0,00") {
        setRentAmount("");
      }
    }
  }

  function addOperationalItem() {
    setIsAddSectionOpen(true);
    setOperationalItems((prev) => [
      ...prev,
      {
        id: createOperationalItemId(),
        category: "manutencao",
        title: "",
        amount: "0,00",
        scheduleOn: "checkout",
      },
    ]);
  }

  function addOperationalPreset(preset: (typeof operationalPresets)[number]) {
    setIsAddSectionOpen(true);
    setOperationalItems((prev) => [
      ...prev,
      {
        id: createOperationalItemId(),
        category: preset.category,
        title: preset.title,
        amount: preset.amount,
        scheduleOn: preset.scheduleOn,
      },
    ]);
  }

  function removeOperationalItem(id: string) {
    setOperationalItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateOperationalItem(id: string, patch: Partial<OperationalItem>) {
    setOperationalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    if (!session) return;

    if (!formApartmentId) {
      setMessage("Selecione um imóvel para continuar.");
      return;
    }

    if (!startsAt || !endsAt || endsAt <= startsAt) {
      setMessage("A data de check-out deve ser posterior à data de check-in.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const rentAmountCents = parseMoneyToCents(rentAmount);
      const parsedGuestCount = guestCount ? parseInt(guestCount, 10) : 1;
      const effectiveGuestName =
        guestName.trim() || reservation?.rawSummary || "Hóspede Confirmado";

      const startDateTimeStr = `${startsAt}T${checkInTime || "14:00"}:00`;
      const endDateTimeStr = `${endsAt}T${checkOutTime || "10:00"}:00`;

      let reservationId = reservation?.id;

      if (isEditing && reservationId) {
        await updateReservation(session.token, formApartmentId, reservationId, {
          guestName: guestName.trim(),
          guestCount: parsedGuestCount,
        });

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
      }, 250);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-border bg-surface shadow-2xl">
        {/* Header Fixo */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-5 py-4 pr-14 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary shadow-2xs">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-text-primary truncate">
                  {isEditing ? "Detalhes da Reserva" : "Nova Reserva"}
                </DialogTitle>
                <span
                  className={`inline-flex items-center shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isAirbnb
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : provider === "manual"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-surface-muted text-text-secondary ring-1 ring-border"
                  }`}
                >
                  {isAirbnb ? "Airbnb" : provider === "manual" ? "Direto" : provider}
                </span>
                {existingStay ? (
                  <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Faturado
                  </span>
                ) : (
                  <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Pendente
                  </span>
                )}
              </div>
              {selectedApartment && (
                <p className="mt-0.5 text-xs text-text-muted truncate">
                  Proprietário: <strong className="font-medium text-text-secondary">{selectedApartment.owner?.name ?? "Não informado"}</strong>
                </p>
              )}
            </div>
          </div>

          {reservation?.externalEventKey && (
            <button
              className="hidden sm:flex items-center gap-1.5 shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-primary hover:text-primary"
              onClick={copyReservationCode}
              title="Copiar código da reserva"
              type="button"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedCode ? "Copiado!" : "Código"}
            </button>
          )}
        </div>

        {/* Form Body & Tabs */}
        <form className="flex flex-1 flex-col min-h-0 overflow-hidden" onSubmit={handleSubmit}>
          {/* Tab Selector Bar */}
          <div className="border-b border-border bg-surface px-5 pt-3 pb-2.5 shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "main" | "operational")}>
              <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger value="main" className="gap-1.5 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Reserva & Financeiro
                </TabsTrigger>
                <TabsTrigger value="operational" className="gap-1.5 text-xs">
                  <Wrench className="h-3.5 w-3.5" />
                  Tarefas & Limpeza (
                  {isEditing
                    ? `${existingCount}${operationalItems.length > 0 ? ` + ${operationalItems.length}` : ""}`
                    : operationalItems.length}
                  )
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">
            {message && <MessageBanner isError message={message} />}

            {/* Overbooking Alert */}
            {conflictingReservation && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div className="min-w-0">
                  <strong>Conflito de Datas!</strong> Já existe reserva de{" "}
                  <strong>{conflictingReservation.guestName || conflictingReservation.rawSummary}</strong> (
                  {formatDateBR(conflictingReservation.startsAt)} a {formatDateBR(conflictingReservation.endsAt)}).
                </div>
              </div>
            )}

            {activeTab === "main" ? (
              <div className="space-y-4">
                {!isIcal && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-muted/40 p-1.5">
                    <button
                      className={`flex-1 min-w-[140px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        reservationMode === "guest"
                          ? "bg-surface text-primary shadow-2xs ring-1 ring-primary/25"
                          : "text-text-secondary hover:bg-surface/60 hover:text-text-primary"
                      }`}
                      onClick={() => selectReservationMode("guest")}
                      type="button"
                    >
                      Reserva de Hóspede
                    </button>
                    <button
                      className={`flex-1 min-w-[160px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        reservationMode === "owner_block"
                          ? "bg-surface text-warning shadow-2xs ring-1 ring-warning/35"
                          : "text-text-secondary hover:bg-surface/60 hover:text-text-primary"
                      }`}
                      onClick={() => selectReservationMode("owner_block")}
                      type="button"
                    >
                      Bloqueio / Uso do Proprietário
                    </button>
                  </div>
                )}

                {/* Seção 1: Imóvel e Período */}
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                  {/* Imóvel */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
                      <Building2 className="h-3.5 w-3.5 text-text-muted" />
                      Imóvel da Hospedagem
                    </label>
                    {!isEditing ? (
                      <Select onValueChange={(val) => setFormApartmentId(val)} value={formApartmentId}>
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
                        {reservation?.apartmentName}
                      </div>
                    )}
                  </div>

                  {/* Datas de Check-in e Check-out (Cada uma em sua própria coluna larga) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                    {/* Check-in */}
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-semibold text-text-secondary">
                        Check-in (Entrada)
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
                        {!isIcal ? (
                          <Input
                            className="h-10 w-full min-w-0 px-3 text-xs sm:text-sm font-medium"
                            onChange={(e) => setStartsAt(e.target.value)}
                            required
                            type="date"
                            value={startsAt}
                          />
                        ) : (
                          <span className="h-10 flex items-center font-bold text-text-primary px-3 border border-border rounded-xl bg-surface-muted/30 text-sm truncate">
                            {formatDateBR(startsAt)}
                          </span>
                        )}
                        <Input
                          className="h-10 w-full px-2.5 text-xs sm:text-sm font-semibold"
                          onChange={(e) => setCheckInTime(e.target.value)}
                          title="Horário de Check-in"
                          type="time"
                          value={checkInTime}
                        />
                      </div>
                    </div>

                    {/* Check-out */}
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-semibold text-text-secondary">
                        Check-out (Saída)
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
                        {!isIcal ? (
                          <Input
                            className="h-10 w-full min-w-0 px-3 text-xs sm:text-sm font-medium"
                            onChange={(e) => setEndsAt(e.target.value)}
                            required
                            type="date"
                            value={endsAt}
                          />
                        ) : (
                          <span className="h-10 flex items-center font-bold text-text-primary px-3 border border-border rounded-xl bg-surface-muted/30 text-sm truncate">
                            {formatDateBR(endsAt)}
                          </span>
                        )}
                        <Input
                          className="h-10 w-full px-2.5 text-xs sm:text-sm font-semibold"
                          onChange={(e) => setCheckOutTime(e.target.value)}
                          title="Horário de Check-out"
                          type="time"
                          value={checkOutTime}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Diárias */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card Hóspede */}
                  <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
                        <User className="h-3.5 w-3.5 text-text-muted" />
                        Hóspede Titular
                      </span>
                      {isGenericAirbnbSummary && (
                        <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
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
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Ex: Mariana Costa"
                          required={!isIcal}
                          value={guestName}
                        />
                      </div>
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-text-muted">
                          <Users className="h-3 w-3" /> Quantidade de Hóspedes
                        </label>
                        <Input
                          className="h-10 w-full text-sm"
                          min={1}
                          onChange={(e) => setGuestCount(e.target.value)}
                          placeholder="1"
                          type="number"
                          value={guestCount}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Preço & Faturamento */}
                  <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
                        <DollarSign className="h-3.5 w-3.5 text-text-muted" />
                        Valor & Faturamento
                      </span>
                      {existingStay && (
                        <span className="inline-flex shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
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
                            onChange={(e) => setRentAmount(e.target.value)}
                            placeholder="1.500,00"
                            value={rentAmount}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-text-muted">
                          Observações / Senha da Porta
                        </label>
                        <Input
                          className="h-10 w-full text-sm"
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Ex: Senha 4892#"
                          value={notes}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ABA 2: Tarefas & Despesas Operacionais */
              <div className="space-y-4">
                {isEditing && (
                  <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Já registrado nesta reserva
                        </h4>
                        <p className="text-[11px] text-text-muted">
                          Tarefas de operação e lançamentos financeiros já vinculados a esta hospedagem.
                        </p>
                      </div>
                      {existingCount > 0 && (
                        <Badge tone="neutral">
                          {existingCount} {existingCount === 1 ? "registro" : "registros"}
                        </Badge>
                      )}
                    </div>

                    {isLoadingExisting ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/40 px-3.5 py-3 text-xs text-text-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        Carregando tarefas e lançamentos vinculados...
                      </div>
                    ) : existingTasks.length === 0 && existingEntries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-surface-muted/25 px-4 py-4 text-center text-xs text-text-muted">
                        Nenhuma tarefa ou despesa registrada ainda para esta reserva.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {existingTasks.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                              Tarefas ({existingTasks.length})
                            </p>
                            <div className="space-y-1.5">
                              {existingTasks.map((task) => {
                                const statusInfo = taskStatusMeta[task.status] ?? {
                                  label: task.status,
                                  tone: "neutral" as const,
                                };
                                return (
                                  <div
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2.5"
                                    key={task.id}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-text-primary truncate">
                                        {task.title}
                                      </p>
                                      {task.description && (
                                        <p className="text-[11px] text-text-muted truncate">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[11px] font-medium text-text-muted whitespace-nowrap">
                                        {formatDateBR(task.dueAt)}
                                      </span>
                                      <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {existingEntries.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                              Lançamentos Financeiros ({existingEntries.length})
                            </p>
                            <div className="space-y-1.5">
                              {existingEntries.map((entry) => {
                                const categoryLabel =
                                  financialCategoryLabels[entry.category] ?? entry.category;
                                const isExpense = entry.type === "expense";
                                return (
                                  <div
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2.5"
                                    key={entry.id}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Receipt className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                                        <p className="text-xs font-semibold text-text-primary truncate">
                                          {categoryLabel}
                                        </p>
                                      </div>
                                      {entry.description && (
                                        <p className="text-[11px] text-text-muted truncate pl-5">
                                          {entry.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[11px] font-medium text-text-muted whitespace-nowrap">
                                        {formatDateBR(entry.occurredOn)}
                                      </span>
                                      <Badge tone={isExpense ? "danger" : "success"}>
                                        {isExpense ? "-" : "+"} {formatMoney(entry.amountCents, entry.currency)}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Seção B: Adicionar novos itens */}
                <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Adicionar novos itens
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        Itens com valor geram lançamento automático no Financeiro e tarefa no Checklist.
                      </p>
                    </div>
                    {!isAddSectionOpen ? (
                      <Button
                        onClick={() => setIsAddSectionOpen(true)}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar tarefa ou despesa
                      </Button>
                    ) : (
                      <Button
                        onClick={addOperationalItem}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Item em branco
                      </Button>
                    )}
                  </div>

                  {isAddSectionOpen && (
                    <div className="space-y-3 pt-1">
                      {/* Atalhos rápidos 1-clique */}
                      <div className="flex flex-wrap gap-1.5">
                        {operationalPresets.map((preset) => (
                          <button
                            className="inline-flex cursor-pointer items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary shadow-2xs transition hover:border-primary/60 hover:bg-primary-soft/35 hover:text-primary active:scale-[0.98]"
                            key={preset.label}
                            onClick={() => addOperationalPreset(preset)}
                            type="button"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {operationalItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-xs text-text-muted">
                          Clique em um atalho acima ou em &ldquo;Item em branco&rdquo; para adicionar uma nova tarefa ou despesa.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {operationalItems.map((item) => (
                            <div
                              className="rounded-2xl border border-border bg-surface p-3.5 space-y-3 shadow-2xs"
                              key={item.id}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                  <div className="min-w-[165px]">
                                    <FormSelect
                                      className="h-8 rounded-lg border-border bg-surface-muted px-2.5 text-xs font-bold text-text-primary"
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
                                    </FormSelect>
                                  </div>

                                  <div className="min-w-[215px]">
                                    <FormSelect
                                      className="h-8 rounded-lg border-border bg-surface-muted px-2.5 text-xs font-medium text-text-secondary"
                                      onChange={(e) =>
                                        updateOperationalItem(item.id, {
                                          scheduleOn: e.target.value as "checkout" | "checkin" | "now",
                                        })
                                      }
                                      value={item.scheduleOn}
                                    >
                                      <option value="checkout">Agendar na Saída ({checkOutTime})</option>
                                      <option value="checkin">Agendar na Entrada ({checkInTime})</option>
                                      <option value="now">Execução Imediata</option>
                                    </FormSelect>
                                  </div>
                                </div>

                                <button
                                  aria-label="Remover tarefa"
                                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-border/60 text-text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                                  onClick={() => removeOperationalItem(item.id)}
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                <div className="sm:col-span-8 min-w-0">
                                  <Input
                                    className="h-9 w-full text-xs sm:text-sm"
                                    onChange={(e) =>
                                      updateOperationalItem(item.id, { title: e.target.value })
                                    }
                                    placeholder="Descrição da atividade (ex: Limpeza pós check-out)"
                                    value={item.title}
                                  />
                                </div>
                                <div className="sm:col-span-4 min-w-0">
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                                      R$
                                    </span>
                                    <Input
                                      className="h-9 w-full pl-8 text-xs sm:text-sm font-semibold text-emerald-700"
                                      inputMode="decimal"
                                      onChange={(e) =>
                                        updateOperationalItem(item.id, { amount: e.target.value })
                                      }
                                      placeholder="0,00"
                                      value={item.amount}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted/40 px-4 py-3 text-xs font-semibold text-text-primary">
                  <span>
                    {isEditing
                      ? "Novas Despesas a Lançar:"
                      : "Total de Despesas Operacionais:"}
                  </span>
                  <div className="flex items-center gap-3">
                    {isEditing && existingOperationalExpensesCents > 0 && (
                      <span className="text-[11px] font-medium text-text-muted">
                        Já lançado: {formatMoney(existingOperationalExpensesCents)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-emerald-700">
                      {formatMoney(totalOperationalExpensesCents)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Fixo */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted/40 px-5 py-3.5 shrink-0">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>

            <Button disabled={isSaving || isSuccess} type="submit">
              {isSaving ? "Salvando..." : isSuccess ? "Salvo com sucesso!" : "Salvar Reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
