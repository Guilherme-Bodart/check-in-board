"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, CheckCircle2, Copy, Wrench } from "lucide-react";

import { apiRequest, type Apartment, type FinancialEntry, type RentalStay, type Task } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { MessageBanner } from "../../../components/ui/message-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { readStoredSession } from "../../../lib/session-storage";
import { createTask } from "../../dashboard/dashboard-api";
import { createFinancialEntry, fetchFinancialEntries } from "../../finance/finance-api";
import { formatMoney, parseMoneyToCents } from "../../finance/money";
import { createRentalStay, updateRentalStay } from "../../finance/rental-stay-api";
import { createManualReservation, updateReservation } from "../../reservations/reservations-api";
import { nightsBetween, type ReservationListItem } from "../../reservations/reservation-view-model";
import { ReservationDetailsTab, type ReservationFormState } from "./reservation-details-tab";
import {
  operationalCategoryLabels,
  ReservationItemsTab,
  type OperationalCategory,
  type OperationalItem,
  type OperationalPreset,
} from "./reservation-items-tab";

export type { OperationalCategory, OperationalItem };

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

const EMPTY_FORM: ReservationFormState = {
  apartmentId: "",
  guestName: "",
  guestCount: "1",
  startsAt: "",
  endsAt: "",
  checkInTime: "14:00",
  checkOutTime: "10:00",
  rentAmount: "",
  notes: "",
};

const OWNER_BLOCK_GUEST_NAME = "Uso do Proprietário / Manutenção";

function createOperationalItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function fetchTasks(token: string, apartmentId: string): Promise<Task[]> {
  const response = await apiRequest<{ tasks: Task[] }>(`/apartments/${apartmentId}/tasks`, { token });
  return response.tasks;
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
  const [form, setForm] = useState<ReservationFormState>(EMPTY_FORM);

  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [existingEntries, setExistingEntries] = useState<FinancialEntry[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(true);
  const [operationalItems, setOperationalItems] = useState<OperationalItem[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const updateForm = (patch: Partial<ReservationFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const selectedApartment = useMemo(
    () => apartments.find((apt) => apt.id === form.apartmentId),
    [apartments, form.apartmentId],
  );

  const totalNights = useMemo(
    () => (form.startsAt && form.endsAt ? nightsBetween(form.startsAt, form.endsAt) : 0),
    [form.startsAt, form.endsAt],
  );

  const averageDailyRate = useMemo(() => {
    const cents = parseMoneyToCents(form.rentAmount);
    return cents > 0 && totalNights > 0 ? cents / totalNights : 0;
  }, [form.rentAmount, totalNights]);

  const totalOperationalExpensesCents = useMemo(
    () => operationalItems.reduce((sum, item) => sum + parseMoneyToCents(item.amount), 0),
    [operationalItems],
  );

  const existingOperationalExpensesCents = useMemo(
    () =>
      existingEntries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amountCents, 0),
    [existingEntries],
  );

  const existingCount = existingTasks.length + existingEntries.length;

  const conflictingReservation = useMemo(() => {
    if (!form.apartmentId || !form.startsAt || !form.endsAt) return null;
    return allReservations.find((res) => {
      if (reservation && res.id === reservation.id) return false;
      if (res.apartmentId !== form.apartmentId) return false;
      const resStart = res.startsAt.slice(0, 10);
      const resEnd = res.endsAt.slice(0, 10);
      return form.startsAt < resEnd && form.endsAt > resStart;
    });
  }, [allReservations, form.apartmentId, form.startsAt, form.endsAt, reservation]);

  useEffect(() => {
    if (!isOpen) return;

    setMessage("");
    setIsSuccess(false);
    setCopiedCode(false);
    setActiveTab("main");

    if (reservation) {
      setReservationMode(
        reservation.guestName === OWNER_BLOCK_GUEST_NAME &&
          (!existingStay || existingStay.rentAmountCents === 0)
          ? "owner_block"
          : "guest",
      );
      setForm({
        apartmentId: reservation.apartmentId,
        guestName: reservation.guestName || "",
        guestCount: reservation.guestCount ? String(reservation.guestCount) : "1",
        startsAt: reservation.startsAt.substring(0, 10),
        endsAt: reservation.endsAt.substring(0, 10),
        checkInTime: "14:00",
        checkOutTime: "10:00",
        rentAmount:
          existingStay && existingStay.rentAmountCents > 0
            ? (existingStay.rentAmountCents / 100).toFixed(2).replace(".", ",")
            : "",
        notes: existingStay?.notes || "",
      });
      // Never pre-populate a default item when editing so saves don't duplicate existing tasks/expenses
      setOperationalItems([]);
      setIsAddSectionOpen(false);
      return;
    }

    const start = initialStartDate || new Date().toISOString().substring(0, 10);
    let end = initialEndDate;
    if (!end) {
      const d = new Date(`${start}T12:00:00`);
      d.setDate(d.getDate() + 2);
      end = d.toISOString().substring(0, 10);
    }

    setReservationMode("guest");
    setForm({
      ...EMPTY_FORM,
      apartmentId:
        defaultApartmentId && defaultApartmentId !== "all"
          ? defaultApartmentId
          : apartments[0]?.id || "",
      startsAt: start,
      endsAt: end,
    });
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

    Promise.all([
      fetchTasks(session.token, reservation.apartmentId).catch(() => [] as Task[]),
      fetchFinancialEntries(session.token, {
        apartmentId: reservation.apartmentId,
        dateFrom: fromDate.toISOString().slice(0, 10),
        dateTo: toDate.toISOString().slice(0, 10),
      }).catch(() => [] as FinancialEntry[]),
    ])
      .then(([tasks, entries]) => {
        if (cancelled) return;
        setExistingTasks(tasks.filter((task) => task.reservationId === reservation.id));
        setExistingEntries(entries.filter((entry) => entry.rentalStayId === reservation.id));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, reservation]);

  const isGenericAirbnbSummary = Boolean(
    isAirbnb &&
      (!reservation?.guestName || reservation.guestName.trim() === "") &&
      (reservation?.rawSummary?.toLowerCase().includes("reserved") ||
        reservation?.rawSummary?.toLowerCase().includes("airbnb")),
  );

  function selectReservationMode(mode: "guest" | "owner_block") {
    setReservationMode(mode);
    if (mode === "owner_block") {
      updateForm({ guestName: OWNER_BLOCK_GUEST_NAME, rentAmount: "0,00" });
    } else {
      updateForm({
        guestName: form.guestName === OWNER_BLOCK_GUEST_NAME ? "" : form.guestName,
        rentAmount: form.rentAmount === "0,00" ? "" : form.rentAmount,
      });
    }
  }

  function addOperationalItem() {
    setIsAddSectionOpen(true);
    setOperationalItems((prev) => [
      ...prev,
      { id: createOperationalItemId(), category: "manutencao", title: "", amount: "0,00", scheduleOn: "checkout" },
    ]);
  }

  function addOperationalPreset(preset: OperationalPreset) {
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
    setOperationalItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    if (!session) return;

    if (!form.apartmentId) {
      setMessage("Selecione um imóvel para continuar.");
      return;
    }

    if (!form.startsAt || !form.endsAt || form.endsAt <= form.startsAt) {
      setMessage("A data de check-out deve ser posterior à data de check-in.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const rentAmountCents = parseMoneyToCents(form.rentAmount);
      const parsedGuestCount = form.guestCount ? parseInt(form.guestCount, 10) : 1;
      const effectiveGuestName =
        form.guestName.trim() || reservation?.rawSummary || "Hóspede Confirmado";

      const startDateTimeStr = `${form.startsAt}T${form.checkInTime || "14:00"}:00`;
      const endDateTimeStr = `${form.endsAt}T${form.checkOutTime || "10:00"}:00`;

      let reservationId = reservation?.id;

      if (isEditing && reservationId) {
        await updateReservation(session.token, form.apartmentId, reservationId, {
          guestName: form.guestName.trim(),
          guestCount: parsedGuestCount,
        });

        if (rentAmountCents > 0) {
          const stayData = {
            id: reservationId,
            apartmentId: form.apartmentId,
            guestName: effectiveGuestName,
            channel: reservation?.provider || "airbnb",
            checkIn: form.startsAt,
            checkOut: form.endsAt,
            rentAmountCents,
            currency: "BRL",
            notes: form.notes.trim() || undefined,
          };

          if (existingStay) {
            await updateRentalStay(session.token, existingStay.id, stayData);
          } else {
            await createRentalStay(session.token, stayData);
          }
        }
      } else {
        const newReservation = await createManualReservation(session.token, form.apartmentId, {
          guestName: effectiveGuestName,
          guestCount: parsedGuestCount,
          startsAt: new Date(startDateTimeStr).toISOString(),
          endsAt: new Date(endDateTimeStr).toISOString(),
        });
        reservationId = newReservation.id;

        if (rentAmountCents > 0 && reservationId) {
          await createRentalStay(session.token, {
            id: reservationId,
            apartmentId: form.apartmentId,
            guestName: effectiveGuestName,
            channel: "manual",
            checkIn: form.startsAt,
            checkOut: form.endsAt,
            rentAmountCents,
            currency: "BRL",
            notes: form.notes.trim() || undefined,
          });
        }
      }

      if (reservationId) {
        for (const item of operationalItems) {
          const cents = parseMoneyToCents(item.amount);
          if (cents <= 0 && !item.title.trim()) continue;

          const occurredOnDate =
            item.scheduleOn === "checkin"
              ? form.startsAt
              : item.scheduleOn === "checkout"
              ? form.endsAt
              : new Date().toISOString().slice(0, 10);

          const scheduledDateTime =
            item.scheduleOn === "checkin"
              ? startDateTimeStr
              : item.scheduleOn === "checkout"
              ? endDateTimeStr
              : new Date().toISOString();

          if (cents > 0) {
            await createFinancialEntry(session.token, {
              apartmentId: form.apartmentId,
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
            await createTask(session.token, form.apartmentId, {
              reservationId,
              title: `${operationalCategoryLabels[item.category].split(" ")[1] ?? "Tarefa"} - ${effectiveGuestName}`,
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
    if (!code) return;
    void navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden border-border bg-surface p-0 shadow-2xl">
        {/* Header Fixo */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-5 py-4 pr-14">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary shadow-2xs">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-base font-bold tracking-tight text-text-primary sm:text-lg">
                  {isEditing ? "Detalhes da Reserva" : "Nova Reserva"}
                </DialogTitle>
                <span
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Faturado
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Pendente
                  </span>
                )}
              </div>
              {selectedApartment && (
                <p className="mt-0.5 truncate text-xs text-text-muted">
                  Proprietário:{" "}
                  <strong className="font-medium text-text-secondary">
                    {selectedApartment.owner?.name ?? "Não informado"}
                  </strong>
                </p>
              )}
            </div>
          </div>

          {reservation?.externalEventKey && (
            <Button
              className="hidden shrink-0 sm:inline-flex"
              onClick={copyReservationCode}
              size="xs"
              title="Copiar código da reserva"
              type="button"
              variant="secondary"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedCode ? "Copiado!" : "Código"}
            </Button>
          )}
        </div>

        {/* Form Body & Tabs */}
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <Tabs
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onValueChange={(value) => setActiveTab(value as "main" | "operational")}
            value={activeTab}
          >
            <div className="shrink-0 border-b border-border bg-surface px-5 pb-2.5 pt-3">
              <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
                <TabsTrigger className="cursor-pointer gap-1.5 text-xs" value="main">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Reserva & Financeiro
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer gap-1.5 text-xs" value="operational">
                  <Wrench className="h-3.5 w-3.5" />
                  Tarefas & Despesas (
                  {isEditing
                    ? `${existingCount}${operationalItems.length > 0 ? ` + ${operationalItems.length}` : ""}`
                    : operationalItems.length}
                  )
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-5">
              {message && <MessageBanner isError message={message} />}

              <TabsContent className="mt-0 focus-visible:ring-0" value="main">
                <ReservationDetailsTab
                  apartmentName={reservation?.apartmentName}
                  apartments={apartments}
                  averageDailyRate={averageDailyRate}
                  conflictingReservation={conflictingReservation}
                  existingStay={existingStay}
                  form={form}
                  isEditing={isEditing}
                  isGenericAirbnbSummary={isGenericAirbnbSummary}
                  isIcal={isIcal}
                  onSelectReservationMode={selectReservationMode}
                  onUpdateForm={updateForm}
                  reservationMode={reservationMode}
                  totalNights={totalNights}
                />
              </TabsContent>

              <TabsContent className="mt-0 focus-visible:ring-0" value="operational">
                <ReservationItemsTab
                  checkInTime={form.checkInTime}
                  checkOutTime={form.checkOutTime}
                  existingCount={existingCount}
                  existingEntries={existingEntries}
                  existingOperationalExpensesCents={existingOperationalExpensesCents}
                  existingTasks={existingTasks}
                  isAddSectionOpen={isAddSectionOpen}
                  isEditing={isEditing}
                  isLoadingExisting={isLoadingExisting}
                  onAddOperationalItem={addOperationalItem}
                  onAddOperationalPreset={addOperationalPreset}
                  onOpenAddSection={() => setIsAddSectionOpen(true)}
                  onRemoveOperationalItem={removeOperationalItem}
                  onUpdateOperationalItem={updateOperationalItem}
                  operationalItems={operationalItems}
                  totalOperationalExpensesCents={totalOperationalExpensesCents}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer Fixo */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-muted/40 px-5 py-3.5">
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
