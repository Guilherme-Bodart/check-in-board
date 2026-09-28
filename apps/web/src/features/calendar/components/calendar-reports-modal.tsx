"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import type { Apartment, RentalStay } from "../../../api";
import { Button } from "../../../components/ui/button";
import { formatMoney } from "../../finance/money";
import {
  formatDateBR,
  nightsBetween,
  reservationLocalDate,
  type ReservationListItem,
} from "../../reservations/reservation-view-model";

export type CalendarReportsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  selectedApartmentId: string;
  month: string; // YYYY-MM
  reservations: ReservationListItem[];
  rentalStaysMap: Map<string, RentalStay>;
};

type ReportType =
  | "owner-statement"
  | "cleaning-schedule"
  | "building-reception"
  | "management-dre";

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
  const [chosenApartmentId, setChosenApartmentId] = useState(
    selectedApartmentId !== "all" ? selectedApartmentId : apartments[0]?.id || "",
  );

  const selectedApt = useMemo(() => {
    return apartments.find((a) => a.id === chosenApartmentId) || apartments[0];
  }, [apartments, chosenApartmentId]);

  // Commission % (e.g. 15% or 20%)
  const commissionPercent = useMemo(() => {
    if (!selectedApt) return 15;
    return selectedApt.managementCommissionBps
      ? selectedApt.managementCommissionBps / 100
      : 15;
  }, [selectedApt]);

  // Date range formatted
  const periodLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return "Mês atual";
    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    return `01/${String(m).padStart(2, "0")}/${year} à ${lastDay}/${String(m).padStart(2, "0")}/${year}`;
  }, [month]);

  // Filter reservations for chosen apartment in this month
  const aptReservations = useMemo(() => {
    return reservations
      .filter((r) => r.apartmentId === selectedApt?.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [reservations, selectedApt]);

  // Calculate Owner Statement values
  const statementData = useMemo(() => {
    const list = aptReservations.map((res, index) => {
      const stay = rentalStaysMap.get(res.id);
      const rentAmountCents = stay?.rentAmountCents || 0;
      const commissionCents = Math.round((rentAmountCents * commissionPercent) / 100);
      const cleaningCents = 19000; // R$ 190,00
      const welcomeGiftCents = 1000; // R$ 10,00
      const totalExpensesCents = commissionCents + cleaningCents + welcomeGiftCents;

      return {
        index: index + 1,
        guestName: res.guestName || res.rawSummary || "Hóspede",
        period: `${formatDateBR(res.startsAt)} a ${formatDateBR(res.endsAt)}`,
        rentAmountCents,
        commissionCents,
        cleaningCents,
        welcomeGiftCents,
        totalExpensesCents,
      };
    });

    const totalGrossCents = list.reduce((acc, curr) => acc + curr.rentAmountCents, 0);
    const totalExpensesCents = list.reduce((acc, curr) => acc + curr.totalExpensesCents, 0);
    const replacementFundCents = list.length > 0 ? 1500 : 0; // R$ 15,00
    const totalDueCents = totalExpensesCents + replacementFundCents;
    const netPayoutCents = totalGrossCents - totalDueCents;

    return {
      items: list,
      totalGrossCents,
      totalExpensesCents,
      replacementFundCents,
      totalDueCents,
      netPayoutCents,
    };
  }, [aptReservations, rentalStaysMap, commissionPercent]);

  // Cleaning schedule data
  const cleaningSchedule = useMemo(() => {
    return reservations
      .map((res) => {
        const stay = rentalStaysMap.get(res.id);
        return {
          id: res.id,
          apartmentName: res.apartmentName,
          checkoutDate: formatDateBR(res.endsAt),
          checkoutTime: "11:00",
          guestName: res.guestName || res.rawSummary || "Hóspede",
          cleaningFeeCents: 19000,
          provider: res.provider,
        };
      })
      .sort((a, b) => a.checkoutDate.localeCompare(b.checkoutDate));
  }, [reservations, rentalStaysMap]);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <section className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-6 py-4.5 print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary font-bold">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-text-primary">
                Central de Relatórios & Demonstrativos
              </h2>
              <p className="text-xs text-text-muted">
                Gere prestação de contas aos proprietários, escala de governança ou lista para portaria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button className="h-9 gap-1.5 text-xs font-semibold" onClick={handlePrint} variant="secondary">
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Salvar PDF
            </Button>
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

        {/* Tab Selector & Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border bg-surface px-6 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          {/* Report Type Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeReport === "owner-statement"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-muted text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveReport("owner-statement")}
              type="button"
            >
              📄 Prestação de Contas (Proprietário)
            </button>
            <button
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeReport === "cleaning-schedule"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-muted text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveReport("cleaning-schedule")}
              type="button"
            >
              🧹 Escala de Limpeza (Governança)
            </button>
            <button
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeReport === "building-reception"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-muted text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveReport("building-reception")}
              type="button"
            >
              🏢 Lista de Portaria (Condomínio)
            </button>
          </div>

          {/* Apartment Selector for Owner Statement */}
          {activeReport === "owner-statement" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">Imóvel:</span>
              <select
                className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary outline-none focus:border-primary"
                onChange={(e) => setChosenApartmentId(e.target.value)}
                value={chosenApartmentId}
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name} ({apt.owner?.name ?? "Proprietário"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Report Content Preview (A4 Paper Aesthetic) */}
        <div className="flex-1 overflow-y-auto bg-neutral-100 p-6 print:bg-white print:p-0">
          {/* REPORT 1: DEMONSTRATIVO DO PROPRIETÁRIO (EXATAMENTE COMO O ENVIADO PELO USUÁRIO) */}
          {activeReport === "owner-statement" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              {/* Document Header */}
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 underline decoration-neutral-300">
                  Demonstrativo de Reservas Concluídas
                </h1>
                <p className="mt-1 text-sm font-semibold text-neutral-800">
                  {selectedApt?.name} – Proprietário: {selectedApt?.owner?.name ?? "Não informado"}
                </p>
                <p className="text-xs text-neutral-600">
                  Período de referência: {periodLabel}
                </p>
              </div>

              {/* Reservations Grid */}
              <div className="mt-6 space-y-6">
                {statementData.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    Nenhuma reserva concluída encontrada para este imóvel no período selecionado.
                  </p>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {statementData.items.map((item) => (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4" key={item.index}>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
                          <span className="text-primary">▶</span>
                          <span>Reserva {String(item.index).padStart(2, "0")}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-800">
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
                            <li>▪ Taxa de gestão ({commissionPercent}%): {formatMoney(item.commissionCents)}</li>
                            <li>▪ Limpeza e lavanderia: {formatMoney(item.cleaningCents)}</li>
                            <li>▪ Cortesia de boas-vindas: {formatMoney(item.welcomeGiftCents)}</li>
                          </ul>
                          <p className="mt-1.5 font-bold text-neutral-900">
                            Total de despesas e repasses: {formatMoney(item.totalExpensesCents)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demonstrativo de Repasses Section */}
              <div className="mt-8 border-t border-neutral-300 pt-5 text-sm text-neutral-900">
                <h3 className="font-bold underline decoration-neutral-300">
                  Demonstrativo de Repasses
                </h3>
                <p className="mt-2 text-xs font-semibold text-neutral-700">
                  Valores devidos no período:
                </p>
                <ul className="mt-1 space-y-1 text-xs text-neutral-800">
                  <li className="flex items-center gap-1.5">
                    <span className="text-primary">▶</span>
                    <span>Fundo de reposição: {formatMoney(statementData.replacementFundCents)}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-primary">▶</span>
                    <span>Despesas e repasses das reservas concluídas: {formatMoney(statementData.totalExpensesCents)}</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs font-bold">
                  Total de valores devidos: {formatMoney(statementData.totalDueCents)}
                </p>
              </div>

              {/* Resumo do Período */}
              <div className="mt-6 rounded-xl border border-neutral-300 bg-neutral-50 p-4 text-sm">
                <h3 className="font-bold underline decoration-neutral-300 text-neutral-900">
                  Resumo do período
                </h3>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Total recebido em reservas:</span>
                    <strong className="text-neutral-900">{formatMoney(statementData.totalGrossCents)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Total de despesas e repasses:</span>
                    <strong className="text-red-700">- {formatMoney(statementData.totalDueCents)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-neutral-300 pt-2 text-sm font-bold">
                    <span className="text-neutral-900">Saldo líquido a repassar ao proprietário:</span>
                    <span className="text-emerald-700">{formatMoney(statementData.netPayoutCents)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 2: ESCALA DE LIMPEZA E GOVERNANÇA */}
          {activeReport === "cleaning-schedule" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  Escala de Limpeza & Governança (Check-outs)
                </h1>
                <p className="mt-1 text-xs text-neutral-600">
                  Período de referência: {periodLabel} • Programação para a equipe de limpeza e lavanderia
                </p>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
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
                          {formatMoney(item.cleaningFeeCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 3: LISTA DE PORTARIA E CONDOMÍNIO (SEM DADOS FINANCEIROS) */}
          {activeReport === "building-reception" && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-md print:max-w-none print:border-none print:p-0 print:shadow-none">
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  Autorização de Acesso & Escala de Hóspedes (Portaria)
                </h1>
                <p className="mt-1 text-xs text-neutral-600">
                  Período: {periodLabel} • Documento oficial para controle de portaria e segurança
                </p>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
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
                    {reservations.map((res) => (
                      <tr key={res.id}>
                        <td className="p-3 font-bold text-neutral-900">{res.apartmentName}</td>
                        <td className="p-3 font-semibold text-neutral-800">
                          {res.guestName || res.rawSummary || "Hóspede"}
                        </td>
                        <td className="p-3 text-neutral-600">
                          {res.guestCount ? `${res.guestCount} pessoas` : "1 pessoa"}
                        </td>
                        <td className="p-3 text-neutral-700 font-medium">
                          {formatDateBR(res.startsAt)} (a partir das 14h)
                        </td>
                        <td className="p-3 text-neutral-700 font-medium">
                          {formatDateBR(res.endsAt)} (até 11h)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
