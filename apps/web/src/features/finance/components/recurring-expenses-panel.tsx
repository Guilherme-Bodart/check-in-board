"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CalendarCheck2, Plus, Repeat, Trash2 } from "lucide-react";

import { isAbortError } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { DataTable } from "../../../components/ui/data-table";
import { Field, Input, Select } from "../../../components/ui/form-controls";
import { IconButton } from "../../../components/ui/icon-button";
import { MessageBanner } from "../../../components/ui/message-banner";
import { Panel } from "../../../components/ui/panel";
import { useAuthSession } from "../../auth/session-context";
import { formatMoney, parseMoneyToCents } from "../money";
import {
  applyRecurringExpensesForMonth,
  createRecurringExpense,
  deleteRecurringExpense,
  type RecurringExpenseItem,
} from "../recurring-expenses-api";

const recurringCategoryOptions = [
  { value: "condominio", label: "Condomínio" },
  { value: "contas", label: "Contas / Energia / Internet" },
  { value: "taxas", label: "Taxas / IPTU" },
  { value: "limpeza", label: "Limpeza" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
] as const;

const recurringCategoryLabels: Record<string, string> = {
  condominio: "Condomínio",
  contas: "Contas",
  taxas: "Taxas",
  limpeza: "Limpeza",
  manutencao: "Manutenção",
  outros: "Outros",
};

const recurringTitleSuggestions = [
  { title: "Condomínio", category: "condominio" },
  { title: "Internet", category: "contas" },
  { title: "Energia", category: "contas" },
  { title: "IPTU", category: "taxas" },
] as const;

function formatRecurringCategory(category: string): string {
  return recurringCategoryLabels[category.trim().toLowerCase()] ?? category;
}

export type RecurringExpensesPanelProps = {
  apartmentId: string;
  month: string;
  isHostAdmin: boolean;
  items: RecurringExpenseItem[];
  onRefresh: () => Promise<void> | void;
  signal?: AbortSignal;
  isLoading?: boolean;
};

export function RecurringExpensesPanel({
  apartmentId,
  month,
  isHostAdmin,
  items,
  onRefresh,
  signal,
  isLoading = false,
}: RecurringExpensesPanelProps) {
  const { session } = useAuthSession();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("condominio");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RecurringExpenseItem | null>(
    null,
  );
  const [banner, setBanner] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setBanner(null);
  }, [apartmentId, month]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !isHostAdmin) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setBanner({
        isError: true,
        message: "Informe o título da despesa fixa.",
      });
      return;
    }

    const amountCents = parseMoneyToCents(amount);
    if (amountCents <= 0) {
      setBanner({
        isError: true,
        message: "Informe um valor válido maior que zero.",
      });
      return;
    }

    const parsedDay = Number(dayOfMonth);
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      setBanner({
        isError: true,
        message: "O dia do vencimento deve ser entre 1 e 28.",
      });
      return;
    }

    setIsSaving(true);
    setBanner(null);

    try {
      const created = await createRecurringExpense(session.token, apartmentId, {
        title: trimmedTitle,
        category,
        amountCents,
        dayOfMonth: parsedDay,
        notes,
        active: true,
      });

      if (signal?.aborted) return;

      setTitle("");
      setAmount("");
      setNotes("");
      setDayOfMonth("5");
      await onRefresh();
      if (signal?.aborted) return;

      setBanner({
        isError: false,
        message: `Despesa fixa "${created.title}" adicionada.`,
      });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) return;
      setBanner({
        isError: true,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao adicionar despesa fixa.",
      });
    } finally {
      if (!signal?.aborted) {
        setIsSaving(false);
      }
    }
  }

  async function handleDelete() {
    if (!session || !isHostAdmin || !itemToDelete) return;

    setIsDeleting(true);
    setBanner(null);

    try {
      const removedTitle = itemToDelete.title;
      await deleteRecurringExpense(session.token, itemToDelete.id);
      if (signal?.aborted) return;

      setItemToDelete(null);
      await onRefresh();
      if (signal?.aborted) return;

      setBanner({
        isError: false,
        message: `Despesa fixa "${removedTitle}" removida.`,
      });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) return;
      setBanner({
        isError: true,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao remover despesa fixa.",
      });
    } finally {
      if (!signal?.aborted) {
        setIsDeleting(false);
      }
    }
  }

  async function handleApplyMonth() {
    if (!session || !isHostAdmin || !month) return;

    setIsApplying(true);
    setBanner(null);

    try {
      const result = await applyRecurringExpensesForMonth(
        session.token,
        apartmentId,
        month,
      );
      if (signal?.aborted) return;

      await onRefresh();
      if (signal?.aborted) return;

      setBanner({
        isError: false,
        message: `${result.createdCount} ${result.createdCount === 1 ? "lançada" : "lançadas"}, ${result.skippedCount} já ${result.skippedCount === 1 ? "aplicada" : "aplicadas"} neste mês (${result.month}).`,
      });
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) return;
      setBanner({
        isError: true,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao lançar despesas fixas do mês.",
      });
    } finally {
      if (!signal?.aborted) {
        setIsApplying(false);
      }
    }
  }

  const activeCount = items.filter((item) => item.active).length;

  return (
    <>
      <Panel className="grid gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Repeat aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-text-primary">
                  Despesas Fixas Mensais
                </h2>
                <Badge tone="neutral">
                  {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Custos recorrentes do imóvel.{" "}
                {isHostAdmin
                  ? "Lance todas as despesas ativas no mês selecionado com 1 clique."
                  : "Visualização das despesas fixas configuradas para este apartamento."}
              </p>
            </div>
          </div>

          {isHostAdmin ? (
            <Button
              className="shrink-0"
              disabled={isApplying || isLoading || !month || activeCount === 0}
              onClick={() => void handleApplyMonth()}
              size="md"
              variant="primary"
            >
              <CalendarCheck2 aria-hidden className="h-4 w-4" />
              {isApplying ? "Lançando..." : "Lançar Fixas do Mês"}
            </Button>
          ) : null}
        </div>

        <MessageBanner
          isError={banner?.isError ?? false}
          message={banner?.message ?? ""}
        />

        {isHostAdmin ? (
          <form
            className="grid gap-4 rounded-xl border border-border bg-surface-muted/40 p-4"
            onSubmit={handleCreate}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">
                Sugestões rápidas:
              </span>
              {recurringTitleSuggestions.map((suggestion) => {
                const isSelected =
                  title.trim().toLowerCase() === suggestion.title.toLowerCase();
                return (
                  <Button
                    key={suggestion.title}
                    onClick={() => {
                      setTitle(suggestion.title);
                      setCategory(suggestion.category);
                    }}
                    size="xs"
                    type="button"
                    variant={isSelected ? "primary" : "secondary"}
                  >
                    {suggestion.title}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)]">
              <Field className="min-w-0" label="Título">
                <Input
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: Condomínio"
                  required
                  value={title}
                />
              </Field>

              <Field className="min-w-0" label="Categoria">
                <Select
                  aria-label="Categoria da despesa fixa"
                  onValueChange={setCategory}
                  value={category}
                >
                  {recurringCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field className="min-w-0" label="Valor (R$)">
                <Input
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="650,00"
                  required
                  value={amount}
                />
              </Field>

              <Field className="min-w-0" label="Dia (1–28)">
                <Input
                  max={28}
                  min={1}
                  onChange={(event) => setDayOfMonth(event.target.value)}
                  required
                  type="number"
                  value={dayOfMonth}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="min-w-0 flex-1" label="Observações (opcional)">
                <Input
                  maxLength={500}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex: Boleto mensal com vencimento fixo"
                  value={notes}
                />
              </Field>

              <Button
                className="shrink-0"
                disabled={isSaving}
                size="md"
                type="submit"
                variant="secondary"
              >
                <Plus aria-hidden className="h-4 w-4" />
                {isSaving ? "Adicionando..." : "Adicionar Despesa Fixa"}
              </Button>
            </div>
          </form>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center text-sm text-text-secondary">
            Nenhuma despesa fixa mensal cadastrada para este apartamento.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {items.map((item) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 p-3.5"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {formatRecurringCategory(item.category)}
                        </Badge>
                        <Badge tone={item.active ? "info" : "warning"}>
                          {item.active ? `Dia ${item.dayOfMonth}` : "Inativa"}
                        </Badge>
                      </div>
                      <strong className="mt-1.5 block truncate text-sm font-bold text-text-primary">
                        {item.title}
                      </strong>
                      {item.notes ? (
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <strong className="shrink-0 text-sm font-bold text-danger">
                      {formatMoney(item.amountCents)}
                    </strong>
                  </div>

                  {isHostAdmin ? (
                    <div className="flex justify-end border-t border-border/60 pt-2">
                      <IconButton
                        aria-label={`Remover ${item.title}`}
                        icon={Trash2}
                        onClick={() => setItemToDelete(item)}
                        variant="danger"
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <DataTable>
                <thead className="bg-surface-muted text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Despesa</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    {isHostAdmin ? (
                      <th className="px-4 py-3 text-right font-semibold">
                        Ações
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {items.map((item) => (
                    <tr
                      className="transition hover:bg-surface-muted/40"
                      key={item.id}
                    >
                      <td className="px-4 py-3">
                        <strong className="block font-semibold text-text-primary">
                          {item.title}
                        </strong>
                        {item.notes ? (
                          <span className="block text-xs text-text-muted">
                            {item.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">
                          {formatRecurringCategory(item.category)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={item.active ? "info" : "warning"}>
                          {item.active
                            ? `Todo dia ${item.dayOfMonth}`
                            : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">
                        {formatMoney(item.amountCents)}
                      </td>
                      {isHostAdmin ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <IconButton
                              aria-label={`Remover ${item.title}`}
                              icon={Trash2}
                              onClick={() => setItemToDelete(item)}
                              variant="danger"
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </Panel>

      {isHostAdmin ? (
        <ConfirmDialog
          confirmLabel="Remover"
          description={`A despesa fixa "${itemToDelete?.title ?? ""}" será removida deste apartamento. Lançamentos já aplicados em meses anteriores serão mantidos.`}
          isOpen={Boolean(itemToDelete)}
          isWorking={isDeleting}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => void handleDelete()}
          title="Remover despesa fixa?"
        />
      ) : null}
    </>
  );
}
