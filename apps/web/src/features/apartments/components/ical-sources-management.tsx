"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarCheck,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import type { Apartment, IcalSource, SyncRun } from "../../../api";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { formatDateTime } from "../../../lib/date-formatters";
import { readStoredSession } from "../../../lib/session-storage";
import {
  createIcalSource,
  deleteIcalSource,
  fetchIcalSources,
  fetchIcalSyncRuns,
  syncIcalSource,
  updateIcalSource,
} from "../../dashboard/dashboard-api";

type IcalFormState = {
  provider: string;
  label: string;
  url: string;
  syncEnabled: boolean;
};

const emptyIcalForm: IcalFormState = {
  provider: "airbnb",
  label: "",
  url: "",
  syncEnabled: true,
};

const statusLabels: Record<SyncRun["status"], string> = {
  failed: "Falhou",
  running: "Rodando",
  skipped: "Ignorado",
  succeeded: "Sucesso",
};

export function IcalSourcesManagement({
  apartment,
  onClose,
}: {
  apartment: Apartment | null;
  onClose: () => void;
}) {
  const [sources, setSources] = useState<IcalSource[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [editingSourceId, setEditingSourceId] = useState("");
  const [form, setForm] = useState<IcalFormState>(emptyIcalForm);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState("");
  const [sourceToDelete, setSourceToDelete] = useState<IcalSource | null>(null);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  );

  const isEditing = Boolean(editingSourceId);

  async function loadSources(nextApartment = apartment, preferredSourceId = "") {
    const session = readStoredSession();

    if (!session || !nextApartment) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const nextSources = await fetchIcalSources(session.token, nextApartment.id);
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const candidate = preferredSourceId || current;
        const canKeepCandidate = nextSources.some(
          (source) => source.id === candidate,
        );

        return canKeepCandidate ? candidate : nextSources[0]?.id || "";
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar fontes iCal.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSyncRuns(sourceId = selectedSourceId) {
    const session = readStoredSession();

    if (!session || !sourceId) {
      setSyncRuns([]);
      return;
    }

    try {
      setSyncRuns(await fetchIcalSyncRuns(session.token, sourceId));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar histórico.",
      );
    }
  }

  useEffect(() => {
    setSources([]);
    setSyncRuns([]);
    setSelectedSourceId("");
    setEditingSourceId("");
    setForm(emptyIcalForm);
    setMessage("");
    void loadSources(apartment);
  }, [apartment?.id]);

  useEffect(() => {
    void loadSyncRuns();
  }, [selectedSourceId]);

  function startEditingSource(source: IcalSource) {
    setEditingSourceId(source.id);
    setSelectedSourceId(source.id);
    setForm({
      provider: source.provider,
      label: source.label,
      url: "",
      syncEnabled: source.syncEnabled,
    });
    setMessage("");
  }

  function cancelEditing() {
    setEditingSourceId("");
    setForm(emptyIcalForm);
    setMessage("");
  }

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session || !apartment || (!isEditing && !form.url.trim())) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const label =
        form.label.trim() || `${form.provider.toUpperCase()} - ${apartment.name}`;

      let savedSourceId = editingSourceId;

      if (isEditing) {
        const updatedSource = await updateIcalSource(
          session.token,
          apartment.id,
          editingSourceId,
          {
            provider: form.provider,
            label,
            syncEnabled: form.syncEnabled,
            url: form.url.trim() || undefined,
          },
        );
        savedSourceId = updatedSource.id;
      } else {
        const response = await createIcalSource(session.token, apartment.id, {
          provider: form.provider,
          label,
          url: form.url.trim(),
        });
        savedSourceId = response.icalSource.id;
      }

      setForm(emptyIcalForm);
      setEditingSourceId("");
      await loadSources(undefined, savedSourceId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao salvar fonte iCal.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function syncSource(source: IcalSource) {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setSyncingSourceId(source.id);
    setMessage("");

    try {
      await syncIcalSource(session.token, source.id);
      await loadSources(undefined, source.id);
      await loadSyncRuns(source.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao sincronizar fonte.",
      );
    } finally {
      setSyncingSourceId("");
    }
  }

  async function removeSource() {
    const session = readStoredSession();

    if (!session || !apartment || !sourceToDelete) {
      return;
    }

    setMessage("");

    try {
      await deleteIcalSource(session.token, apartment.id, sourceToDelete.id);
      setSourceToDelete(null);
      setEditingSourceId((current) =>
        current === sourceToDelete.id ? "" : current,
      );
      setForm((current) =>
        editingSourceId === sourceToDelete.id ? emptyIcalForm : current,
      );
      await loadSources();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao remover fonte iCal.",
      );
    }
  }

  if (!apartment) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center">
        <CalendarCheck
          aria-hidden
          className="mx-auto h-8 w-8 text-text-muted"
        />
        <h2 className="mt-3 text-lg font-semibold text-text-primary">
          Selecione um apartamento para gerenciar iCal
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          As fontes de calendário ficam separadas por imóvel para manter a operação
          diaria limpa no dashboard.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            iCal
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
            Calendários de {apartment.name}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Adicione fontes do Airbnb ou Booking, sincronize manualmente, pause
            importações e acompanhe o histórico sem poluir o dashboard operacional.
          </p>
        </div>
        <button
          aria-label="Fechar gestao de iCal"
          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="rounded-2xl border border-border bg-surface-muted p-4"
          onSubmit={submitSource}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {isEditing ? (
                <Pencil aria-hidden className="h-4 w-4 text-primary" />
              ) : (
                <Plus aria-hidden className="h-4 w-4 text-primary" />
              )}
              {isEditing ? "Editar fonte" : "Nova fonte"}
            </div>
            {isEditing ? (
              <button
                className="text-xs font-semibold text-text-muted transition hover:text-primary"
                onClick={cancelEditing}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            <Field label="Provider">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, provider: event.target.value })
                }
                value={form.provider}
              >
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking</option>
              </select>
            </Field>
            <Field label="Nome interno">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, label: event.target.value })}
                placeholder={`${form.provider.toUpperCase()} - ${apartment.name}`}
                value={form.label}
              />
            </Field>
            <Field label="URL iCal">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder={
                  isEditing ? "Deixe vazio para manter a URL atual" : "https://..."
                }
                required={!isEditing}
                type="url"
                value={form.url}
              />
            </Field>
            {isEditing ? (
              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-medium text-text-secondary">
                <span>Sincronizacao ativa</span>
                <input
                  checked={form.syncEnabled}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) =>
                    setForm({ ...form, syncEnabled: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
            ) : null}
          </div>
          <button
            className="mt-4 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving
              ? "Salvando..."
              : isEditing
                ? "Salvar alterações"
                : "Adicionar fonte"}
          </button>
        </form>

        <div className="grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fonte</th>
                  <th className="px-4 py-3 font-semibold">Ultima sync</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Carregando fontes...
                    </td>
                  </tr>
                ) : sources.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Nenhuma fonte iCal cadastrada.
                    </td>
                  </tr>
                ) : (
                  sources.map((source) => (
                    <tr
                      className={
                        selectedSourceId === source.id ? "bg-primary-soft/40" : ""
                      }
                      key={source.id}
                    >
                      <td className="px-4 py-4">
                        <button
                          className="text-left"
                          onClick={() => setSelectedSourceId(source.id)}
                          type="button"
                        >
                          <strong className="block font-semibold text-text-primary">
                            {source.label}
                          </strong>
                          <span className="text-xs text-text-muted">
                            {source.provider}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {formatDateTime(source.lastSuccessAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                          {source.syncEnabled ? "Ativo" : "Pausado"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            aria-label="Editar fonte"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => startEditingSource(source)}
                            type="button"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Sincronizar fonte"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={
                              syncingSourceId === source.id || !source.syncEnabled
                            }
                            onClick={() => void syncSource(source)}
                            type="button"
                          >
                            <RefreshCw
                              aria-hidden
                              className={`h-4 w-4 ${
                                syncingSourceId === source.id ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                          <button
                            aria-label="Ver histórico"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => setSelectedSourceId(source.id)}
                            type="button"
                          >
                            <History aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Remover fonte"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-danger hover:text-danger"
                            onClick={() => setSourceToDelete(source)}
                            type="button"
                          >
                            <Trash2 aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Histórico de sincronização
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  {selectedSource
                    ? selectedSource.label
                    : "Selecione uma fonte para ver o histórico."}
                </p>
              </div>
              <History aria-hidden className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 grid gap-3">
              {!selectedSource ? (
                <p className="text-sm text-text-secondary">Nenhuma fonte selecionada.</p>
              ) : syncRuns.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Ainda não há sincronizações registradas.
                </p>
              ) : (
                syncRuns.slice(0, 5).map((run) => (
                  <article
                    className="rounded-xl border border-border bg-surface p-3"
                    key={run.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <strong className="text-sm text-text-primary">
                        {statusLabels[run.status]}
                      </strong>
                      <span className="text-xs text-text-muted">
                        {formatDateTime(run.startedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-text-secondary">
                      {run.eventsSeen} eventos lidos, {run.reservationsUpserted} reservas
                      atualizadas.
                    </p>
                    {run.errorMessage ? (
                      <p className="mt-2 text-xs leading-5 text-danger">
                        {run.errorMessage}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Remover fonte"
        description={`A fonte ${sourceToDelete?.label ?? ""} deixará de sincronizar novas reservas. As reservas já importadas permanecem no sistema.`}
        isOpen={Boolean(sourceToDelete)}
        onCancel={() => setSourceToDelete(null)}
        onConfirm={() => void removeSource()}
        title="Remover fonte iCal?"
      />
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary">
      {label}
      {children}
    </label>
  );
}
