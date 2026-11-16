"use client";

import { Loader2, Plus, Receipt, Trash2 } from "lucide-react";

import type { FinancialEntry, Task, TaskStatus } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input, Select as FormSelect } from "../../../components/ui/form-controls";
import { IconButton } from "../../../components/ui/icon-button";
import { formatMoney } from "../../finance/money";
import { formatDateBR } from "../../reservations/reservation-view-model";

export type OperationalCategory =
  | "limpeza"
  | "manutencao"
  | "enxoval"
  | "inspecao"
  | "cortesia"
  | "outros";

export type OperationalItem = {
  id: string;
  category: OperationalCategory;
  title: string;
  amount: string;
  scheduleOn: "checkout" | "checkin" | "now";
};

export type OperationalPreset = {
  label: string;
  category: OperationalCategory;
  title: string;
  amount: string;
  scheduleOn: OperationalItem["scheduleOn"];
};

export const operationalCategoryLabels: Record<OperationalCategory, string> = {
  limpeza: "🧹 Limpeza & Lavanderia",
  manutencao: "🔧 Manutenção & Reparos",
  enxoval: "🛏️ Enxoval",
  inspecao: "📋 Inspeção / Vistoria",
  cortesia: "🎁 Cortesia Boas-vindas",
  outros: "📌 Outra Tarefa / Despesa",
};

const financialCategoryLabels: Record<string, string> = {
  ...operationalCategoryLabels,
  consumo: "🛒 Consumo / Mercado",
  condominio: "🏢 Condomínio",
  contas: "⚡ Energia / Internet / Contas",
  taxas: "📄 Taxas",
};

export const operationalPresets: OperationalPreset[] = [
  {
    label: "+ Limpeza",
    category: "limpeza",
    title: "Limpeza e lavanderia pós check-out",
    amount: "190,00",
    scheduleOn: "checkout",
  },
  {
    label: "+ Manutenção",
    category: "manutencao",
    title: "Manutenção / reparo no imóvel",
    amount: "",
    scheduleOn: "now",
  },
  {
    label: "+ Enxoval",
    category: "enxoval",
    title: "Troca / lavanderia de enxoval",
    amount: "",
    scheduleOn: "checkout",
  },
  {
    label: "+ Consumo / Mercado",
    category: "cortesia",
    title: "Compra de insumos / mercado",
    amount: "",
    scheduleOn: "now",
  },
  {
    label: "+ Vistoria",
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

export type ReservationItemsTabProps = {
  isEditing: boolean;
  isLoadingExisting: boolean;
  existingTasks: Task[];
  existingEntries: FinancialEntry[];
  existingCount: number;
  existingOperationalExpensesCents: number;
  isAddSectionOpen: boolean;
  onOpenAddSection: () => void;
  operationalItems: OperationalItem[];
  totalOperationalExpensesCents: number;
  checkInTime: string;
  checkOutTime: string;
  onAddOperationalItem: () => void;
  onAddOperationalPreset: (preset: OperationalPreset) => void;
  onRemoveOperationalItem: (id: string) => void;
  onUpdateOperationalItem: (id: string, patch: Partial<OperationalItem>) => void;
};

export function ReservationItemsTab({
  isEditing,
  isLoadingExisting,
  existingTasks,
  existingEntries,
  existingCount,
  existingOperationalExpensesCents,
  isAddSectionOpen,
  onOpenAddSection,
  operationalItems,
  totalOperationalExpensesCents,
  checkInTime,
  checkOutTime,
  onAddOperationalItem,
  onAddOperationalPreset,
  onRemoveOperationalItem,
  onUpdateOperationalItem,
}: ReservationItemsTabProps) {
  return (
    <div className="space-y-4">
      {isEditing && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
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
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
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
                            <p className="truncate text-xs font-semibold text-text-primary">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="truncate text-[11px] text-text-muted">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="whitespace-nowrap text-[11px] font-medium text-text-muted">
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
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Receipt className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                              <p className="truncate text-xs font-semibold text-text-primary">
                                {categoryLabel}
                              </p>
                            </div>
                            {entry.description && (
                              <p className="truncate pl-5 text-[11px] text-text-muted">
                                {entry.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="whitespace-nowrap text-[11px] font-medium text-text-muted">
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
      <div className="space-y-3 rounded-2xl border border-border bg-surface-muted/30 p-4">
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
              onClick={onOpenAddSection}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Novo
            </Button>
          ) : (
            <Button
              onClick={onAddOperationalItem}
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
                <Button
                  className="rounded-full"
                  key={preset.label}
                  onClick={() => onAddOperationalPreset(preset)}
                  size="xs"
                  type="button"
                  variant="secondary"
                >
                  {preset.label}
                </Button>
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
                    className="space-y-3 rounded-2xl border border-border bg-surface p-3.5 shadow-2xs"
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <div className="min-w-[165px]">
                          <FormSelect
                            className="h-8 rounded-lg border-border bg-surface-muted px-2.5 text-xs font-bold text-text-primary"
                            onChange={(e) =>
                              onUpdateOperationalItem(item.id, {
                                category: e.target.value as OperationalCategory,
                              })
                            }
                            value={item.category}
                          >
                            {Object.entries(operationalCategoryLabels).map(([key, label]) => (
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
                              onUpdateOperationalItem(item.id, {
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

                      <IconButton
                        aria-label="Remover tarefa"
                        className="h-8 w-8 shrink-0"
                        icon={Trash2}
                        onClick={() => onRemoveOperationalItem(item.id)}
                        variant="danger"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                      <div className="min-w-0 sm:col-span-8">
                        <Input
                          className="h-9 w-full text-xs sm:text-sm"
                          onChange={(e) =>
                            onUpdateOperationalItem(item.id, { title: e.target.value })
                          }
                          placeholder="Descrição da atividade (ex: Limpeza pós check-out)"
                          value={item.title}
                        />
                      </div>
                      <div className="min-w-0 sm:col-span-4">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                            R$
                          </span>
                          <Input
                            className="h-9 w-full pl-8 text-xs font-semibold text-emerald-700 sm:text-sm"
                            inputMode="decimal"
                            onChange={(e) =>
                              onUpdateOperationalItem(item.id, { amount: e.target.value })
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
  );
}
