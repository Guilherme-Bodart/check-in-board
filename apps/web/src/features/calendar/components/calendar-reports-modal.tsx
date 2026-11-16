"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  Copy,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";

import type { Apartment, FinancialEntry, RentalStay } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { readStoredSession } from "../../../lib/session-storage";
import { fetchFinancialEntries } from "../../finance/finance-api";
import { formatMoney } from "../../finance/money";
import { fetchRentalStays } from "../../finance/rental-stay-api";
import { fetchReservations } from "../../reservations/reservations-api";
import {
  attachApartmentDetails,
  formatDateBR,
  type ReservationListItem,
} from "../../reservations/reservation-view-model";
import {
  buildCleaningSchedule,
  buildEffectiveStaysMap,
  buildGatekeeperSchedule,
  buildOwnerStatementData,
  buildWhatsAppCleaningSummary,
  buildWhatsAppGatekeeperSummary,
  buildWhatsAppOwnerSummary,
  computePeriodRange,
  filterActiveReservations,
  filterPeriodReservations,
  shiftYmd,
  type PeriodPreset,
  type ReportType,
} from "./reports-calculator";

export type CalendarReportsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  selectedApartmentId: string;
  month: string; // YYYY-MM
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
};

const PERIOD_PRESET_OPTIONS: ReadonlyArray<{ value: PeriodPreset; label: string }> = [
  { value: "last-month", label: "Mês Passado" },
  { value: "last-week", label: "Semana Passada" },
  { value: "selected-month", label: "Mês Selecionado" },
];

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for non-secure contexts
    }
  }
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
  return false;
}

export function CalendarReportsModal({
  isOpen,
  onClose,
  apartments,
  selectedApartmentId,
  month,
  reservations,
  rentalStaysMap,
}: CalendarReportsModalProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("owner-statement");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("selected-month");
  const [chosenApartmentId, setChosenApartmentId] = useState(
    selectedApartmentId !== "all" ? selectedApartmentId : apartments[0]?.id || "",
  );

  const [fetchedReservations, setFetchedReservations] = useState<ReservationListItem[] | null>(null);
  const [periodRentalStays, setPeriodRentalStays] = useState<RentalStay[] | null>(null);
  const [periodEntries, setPeriodEntries] = useState<FinancialEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Keep chosenApartmentId synchronized when apartments load or selectedApartmentId changes
  useEffect(() => {
    if (!isOpen) return;
    if (
      selectedApartmentId !== "all" &&
      apartments.some((apt) => apt.id === selectedApartmentId)
    ) {
      setChosenApartmentId(selectedApartmentId);
      return;
    }
    if (!chosenApartmentId || !apartments.some((apt) => apt.id === chosenApartmentId)) {
      setChosenApartmentId(apartments[0]?.id || "");
    }
  }, [isOpen, selectedApartmentId, apartments, chosenApartmentId]);

  const {
    dateFrom: periodStart,
    dateTo: periodEnd,
    label: periodLabel,
  } = useMemo(() => computePeriodRange(periodPreset, month), [periodPreset, month]);

  // Fetch all apartments' reservations once per open (in case calendar was filtered to 1 apartment)
  useEffect(() => {
    if (!isOpen || apartments.length === 0) return;

    const session = readStoredSession();
    if (!session) {
      setFetchedReservations(null);
      return;
    }

    if (selectedApartmentId === "all" && reservations.length > 0) {
      setFetchedReservations(reservations);
    }

    let cancelled = false;
    void (async () => {
      try {
        const groups = await Promise.all(
          apartments.map((apt) => fetchReservations(session.token, apt.id)),
        );
        if (!cancelled) {
          setFetchedReservations(attachApartmentDetails(groups.flat(), apartments));
        }
      } catch {
        // Keep prop fallback if fetch fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, apartments, selectedApartmentId, reservations]);

  // Fetch rentalStays and financialEntries for the exact active period window
  useEffect(() => {
    if (!isOpen || !periodStart || !periodEnd) return;

    const session = readStoredSession();
    if (!session) {
      setPeriodRentalStays(null);
      setPeriodEntries([]);
      return;
    }

    let cancelled = false;
    setIsLoadingData(true);
    setLoadError("");

    void (async () => {
      try {
        // Pad rentalStays dateFrom back 31 days so stays checking in before periodStart still match
        const stayDateFrom = shiftYmd(periodStart, -31);
        const [stays, entries] = await Promise.all([
          fetchRentalStays(session.token, {
            dateFrom: stayDateFrom,
            dateTo: periodEnd,
          }),
          fetchFinancialEntries(session.token, {
            dateFrom: periodStart,
            dateTo: periodEnd,
          }),
        ]);

        if (!cancelled) {
          setPeriodRentalStays(stays);
          setPeriodEntries(entries);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Não foi possível atualizar os lançamentos do período.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, periodStart, periodEnd]);

  const effectiveStaysMap = useMemo(
    () => buildEffectiveStaysMap(rentalStaysMap, periodRentalStays),
    [rentalStaysMap, periodRentalStays],
  );

  const activeReservations = useMemo(
    () => filterActiveReservations(fetchedReservations ?? reservations),
    [fetchedReservations, reservations],
  );

  const periodReservations = useMemo(
    () => filterPeriodReservations(activeReservations, periodStart, periodEnd),
    [activeReservations, periodStart, periodEnd],
  );

  const selectedApt = useMemo(
    () => apartments.find((a) => a.id === chosenApartmentId) || apartments[0],
    [apartments, chosenApartmentId],
  );

  const statementData = useMemo(
    () =>
      buildOwnerStatementData({
        apartment: selectedApt,
        periodReservations,
        periodEntries,
        effectiveStaysMap,
        dateFrom: periodStart,
        dateTo: periodEnd,
      }),
    [selectedApt, periodReservations, periodEntries, effectiveStaysMap, periodStart, periodEnd],
  );

  const cleaningSchedule = useMemo(
    () => buildCleaningSchedule(activeReservations, periodEntries, periodStart, periodEnd),
    [activeReservations, periodEntries, periodStart, periodEnd],
  );

  const gatekeeperSchedule = useMemo(
    () => buildGatekeeperSchedule(periodReservations),
    [periodReservations],
  );

  function handlePrint() {
    window.print();
  }

  async function handleCopyWhatsApp() {
    let summary: string;
    if (activeReport === "cleaning-schedule") {
      summary = buildWhatsAppCleaningSummary(periodLabel, cleaningSchedule);
    } else if (activeReport === "building-reception") {
      summary = buildWhatsAppGatekeeperSummary(periodLabel, gatekeeperSchedule);
    } else {
      summary = buildWhatsAppOwnerSummary({
        apartmentName: selectedApt?.name,
        ownerName: selectedApt?.owner?.name,
        periodLabel,
        statement: statementData,
      });
    }

    const copied = await copyTextToClipboard(summary);
    if (!copied) return;

    setCopiedWhatsApp(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedWhatsApp(false);
    }, 2000);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border bg-surface shadow-2xl print:static print:inset-auto print:translate-x-0 print:translate-y-0 print:max-h-none print:h-auto print:w-full print:max-w-none print:overflow-visible print:border-none print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border bg-surface-muted/40 px-4 py-3.5 pr-13 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 sm:pr-14 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-text-primary truncate">
                Central de Relatórios & Demonstrativos
              </DialogTitle>
              <p className="text-xs text-text-muted truncate">
                Prestação de contas aos proprietários, limpeza e portaria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => void handleCopyWhatsApp()}
              size="sm"
              variant="secondary"
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar p/ WhatsApp
                </>
              )}
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={handlePrint}
              size="sm"
              variant="primary"
            >
              <Printer className="h-3.5 w-3.5" />
              Baixar / Compartilhar PDF
            </Button>
          </div>
        </div>

        {/* Período do Relatório Selector Bar */}
        <div className="flex flex-col gap-2 border-b border-border bg-surface-muted/25 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 shrink-0 print:hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary shrink-0">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Período do Relatório
            </span>
            <Badge className="sm:hidden" tone="neutral">
              {periodLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {PERIOD_PRESET_OPTIONS.map((option) => (
              <Button
                key={option.value}
                className="w-full sm:w-auto px-2 sm:px-3 text-[11px] sm:text-xs"
                onClick={() => setPeriodPreset(option.value)}
                size="xs"
                variant={periodPreset === option.value ? "primary" : "secondary"}
              >
                <span className="truncate">{option.label}</span>
              </Button>
            ))}
            <Badge className="hidden sm:inline-flex" tone="neutral">
              {periodLabel}
            </Badge>
          </div>
        </div>

        {/* Report Type Tabs & Apartment Selector */}
        <div className="flex flex-col gap-2.5 border-b border-border bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 shrink-0 print:hidden">
          <Tabs value={activeReport} onValueChange={(val) => setActiveReport(val as ReportType)}>
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="owner-statement" className="text-xs px-2 sm:px-3">
                Proprietário
              </TabsTrigger>
              <TabsTrigger value="cleaning-schedule" className="text-xs px-2 sm:px-3">
                Limpeza
              </TabsTrigger>
              <TabsTrigger value="building-reception" className="text-xs px-2 sm:px-3">
                Portaria
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeReport === "owner-statement" && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-text-muted shrink-0">Imóvel:</span>
              <Select value={chosenApartmentId} onValueChange={(val) => setChosenApartmentId(val)}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-64 text-xs font-semibold">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name} ({apt.owner?.name ?? "Proprietário"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Content Body (A4 Paper Preview) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-neutral-100 p-3 sm:p-6 print:bg-white print:p-0 print:overflow-visible">
          {isLoadingData && (
            <div className="mx-auto mb-3 flex max-w-3xl items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary print:hidden">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span>Atualizando estadias e lançamentos para {periodLabel}...</span>
            </div>
          )}

          {loadError && (
            <div className="mx-auto mb-3 max-w-3xl rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger print:hidden">
              {loadError}
            </div>
          )}

          {activeReport === "owner-statement" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 underline decoration-neutral-300">
                  Demonstrativo do Proprietário
                </h1>
                <p className="mt-1 text-sm font-semibold text-neutral-800 break-words">
                  {selectedApt?.name ?? "Nenhum imóvel selecionado"} – Proprietário:{" "}
                  {selectedApt?.owner?.name ?? "Não informado"}
                </p>
                <p className="text-xs text-neutral-600">
                  Período de referência: {periodLabel}
                </p>
              </div>

              <div className="mt-5 space-y-6">
                {statementData.items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-500">
                    Nenhuma reserva encontrada para este imóvel no período selecionado.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                    {statementData.items.map((item) => (
                      <div
                        className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 min-w-0"
                        key={item.id}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
                          <span className="text-primary">▶</span>
                          <span>Reserva {String(item.index).padStart(2, "0")}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-800 break-words">
                          <span className="font-semibold">Hóspede:</span> {item.guestName}
                        </p>
                        <p className="text-xs text-neutral-800">
                          <span className="font-semibold">Período:</span> {item.period}
                        </p>
                        <p className="mt-1 text-xs font-bold text-neutral-900">
                          Valor da reserva: {formatMoney(item.rentAmountCents)}
                        </p>

                        <div className="mt-3 border-t border-neutral-200 pt-2 text-[11px] text-neutral-700">
                          <span className="font-semibold">Despesas e repasses</span>
                          <ul className="mt-1 space-y-0.5 pl-2">
                            <li>
                              ▪ Taxa de gestão ({statementData.commissionPercent}%):{" "}
                              {formatMoney(item.commissionCents)}
                            </li>
                            {item.linkedExpenses.map((exp) => (
                              <li key={exp.id} className="break-words">
                                ▪ {exp.description || exp.category}: {formatMoney(exp.amountCents)}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1.5 font-bold text-neutral-900">
                            Total de despesas da reserva: {formatMoney(item.totalExpensesCents)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 sm:mt-8 border-t border-neutral-300 pt-5 text-sm text-neutral-900">
                <h3 className="font-bold underline decoration-neutral-300">
                  Demonstrativo de Repasses e Despesas do Período
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-neutral-800">
                  <li className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="text-primary">▶</span>
                      <span>Comissão e despesas vinculadas às reservas:</span>
                    </span>
                    <strong className="shrink-0">
                      {formatMoney(statementData.totalStayExpensesCents)}
                    </strong>
                  </li>
                  {statementData.otherExpenses.map((exp) => (
                    <li className="flex items-start justify-between gap-2" key={exp.id}>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-primary shrink-0">▶</span>
                        <span className="break-words">
                          {exp.category}
                          {exp.description ? ` — ${exp.description}` : ""} ({formatDateBR(exp.occurredOn)}):
                        </span>
                      </span>
                      <strong className="shrink-0">{formatMoney(exp.amountCents)}</strong>
                    </li>
                  ))}
                  {statementData.otherRevenues.map((rev) => (
                    <li className="flex items-start justify-between gap-2 text-emerald-800" key={rev.id}>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0">+</span>
                        <span className="break-words">
                          Receita extra: {rev.category}
                          {rev.description ? ` — ${rev.description}` : ""} ({formatDateBR(rev.occurredOn)}):
                        </span>
                      </span>
                      <strong className="shrink-0">{formatMoney(rev.amountCents)}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-xs font-bold">
                  Total de despesas e repasses devidos: {formatMoney(statementData.totalDueCents)}
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-neutral-300 bg-neutral-50 p-4 text-sm">
                <h3 className="font-bold underline decoration-neutral-300 text-neutral-900">
                  Resumo do período ({periodLabel})
                </h3>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-700">Total recebido (reservas + receitas):</span>
                    <strong className="text-neutral-900 shrink-0">
                      {formatMoney(statementData.totalGrossCents)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-neutral-700">Total de despesas e repasses:</span>
                    <strong className="text-red-700 shrink-0">
                      - {formatMoney(statementData.totalDueCents)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-neutral-300 pt-2 text-sm font-bold">
                    <span className="text-neutral-900">Saldo líquido a repassar ao proprietário:</span>
                    <span className="text-emerald-700 shrink-0">
                      {formatMoney(statementData.netPayoutCents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === "cleaning-schedule" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
                  Escala de Limpeza & Governança (Check-outs)
                </h1>
                <p className="mt-1 text-xs text-neutral-600">
                  Período de referência: {periodLabel} • Programação para a equipe de limpeza e lavanderia
                </p>
              </div>

              {cleaningSchedule.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  Nenhum check-out previsto no período selecionado.
                </p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="mt-4 grid gap-3 md:hidden print:hidden">
                    {cleaningSchedule.map((item) => (
                      <div
                        className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs"
                        key={item.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-neutral-900">
                            {item.checkoutDate} • {item.checkoutTime}
                          </span>
                          <span className="font-bold text-emerald-700 shrink-0">
                            {item.cleaningFeeCents !== null
                              ? formatMoney(item.cleaningFeeCents)
                              : "Não lançado"}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-neutral-900 break-words">
                          {item.apartmentName}
                        </p>
                        <p className="text-neutral-600 break-words">
                          Hóspede saindo: {item.guestName}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Print Table */}
                  <div className="mt-5 hidden md:block print:block overflow-hidden rounded-xl border border-neutral-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 font-bold uppercase text-neutral-700">
                        <tr>
                          <th className="p-3">Data Saída</th>
                          <th className="p-3">Horário</th>
                          <th className="p-3">Apartamento</th>
                          <th className="p-3">Hóspede Saindo</th>
                          <th className="p-3 text-right">Valor Faxina</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {cleaningSchedule.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 font-bold text-neutral-900">{item.checkoutDate}</td>
                            <td className="p-3 text-neutral-600">{item.checkoutTime}</td>
                            <td className="p-3 font-semibold text-neutral-900">{item.apartmentName}</td>
                            <td className="p-3 text-neutral-700">{item.guestName}</td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              {item.cleaningFeeCents !== null
                                ? formatMoney(item.cleaningFeeCents)
                                : "Não lançado"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeReport === "building-reception" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
                  Autorização de Acesso & Escala de Hóspedes (Portaria)
                </h1>
                <p className="mt-1 text-xs text-neutral-600">
                  Período: {periodLabel} • Documento oficial para controle de portaria e segurança
                </p>
              </div>

              {gatekeeperSchedule.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  Nenhuma hospedagem encontrada no período selecionado.
                </p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="mt-4 grid gap-3 md:hidden print:hidden">
                    {gatekeeperSchedule.map((item) => (
                      <div
                        className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs"
                        key={item.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-neutral-900 break-words">
                            {item.apartmentName}
                          </span>
                          <Badge className="shrink-0" tone="neutral">
                            {item.guestCountLabel}
                          </Badge>
                        </div>
                        <p className="mt-1 font-semibold text-neutral-800 break-words">
                          {item.guestName}
                        </p>
                        <p className="mt-1 text-neutral-700">
                          Check-in: {item.checkInDate} (14h)
                        </p>
                        <p className="text-neutral-700">
                          Check-out: {item.checkOutDate} (10h)
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Print Table */}
                  <div className="mt-5 hidden md:block print:block overflow-hidden rounded-xl border border-neutral-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 font-bold uppercase text-neutral-700">
                        <tr>
                          <th className="p-3">Imóvel</th>
                          <th className="p-3">Hóspede Titular</th>
                          <th className="p-3">Qtd Hóspedes</th>
                          <th className="p-3">Check-in (Entrada)</th>
                          <th className="p-3">Check-out (Saída)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {gatekeeperSchedule.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 font-bold text-neutral-900">{item.apartmentName}</td>
                            <td className="p-3 font-semibold text-neutral-800">{item.guestName}</td>
                            <td className="p-3 text-neutral-600">{item.guestCountLabel}</td>
                            <td className="p-3 text-neutral-700 font-medium">
                              {item.checkInDate} (a partir das 14h)
                            </td>
                            <td className="p-3 text-neutral-700 font-medium">
                              {item.checkOutDate} (até 10h)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
