"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellOff,
  Calendar,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { MessageBanner } from "../../components/ui/message-banner";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { cn } from "../../lib/utils";
import {
  fetchSyncNotifications,
  getLastAutoSyncAt,
  getReadSyncNotificationIds,
  markAllSyncNotificationsAsRead,
  markSyncNotificationAsRead,
  triggerAutoSync,
  type SyncNotificationItem,
} from "./notifications-api";

type NotificationFilter = "all" | "unread" | "changes" | "failed";

const providerLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  manual: "Manual",
  other: "iCal",
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<SyncNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    const session = readStoredSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const items = await fetchSyncNotifications(session.token);
      setNotifications(items);
      setReadIds(getReadSyncNotificationIds());
      setLastSyncAt(getLastAutoSyncAt());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao carregar notificações de sincronização.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const counts = useMemo(() => {
    let unread = 0;
    let changes = 0;
    let failed = 0;

    for (const item of notifications) {
      if (!readSet.has(item.id)) {
        unread += 1;
      }
      if (item.status === "failed") {
        failed += 1;
      } else if (item.reservationsCreated > 0 || item.reservationsCancelled > 0) {
        changes += 1;
      }
    }

    return {
      all: notifications.length,
      unread,
      changes,
      failed,
    };
  }, [notifications, readSet]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "unread") {
        return !readSet.has(item.id);
      }
      if (filter === "failed") {
        return item.status === "failed";
      }
      if (filter === "changes") {
        return (
          item.status !== "failed" &&
          (item.reservationsCreated > 0 || item.reservationsCancelled > 0)
        );
      }
      return true;
    });
  }, [filter, notifications, readSet]);

  async function handleVerifySyncNow() {
    const session = readStoredSession();
    if (!session) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const result = await triggerAutoSync(session.token);
      setLastSyncAt(getLastAutoSyncAt());
      const items = await fetchSyncNotifications(session.token);
      setNotifications(items);
      setReadIds(getReadSyncNotificationIds());

      if (result.sourcesChecked === 0) {
        setFeedbackMessage("Nenhuma fonte iCal ativa encontrada para verificar.");
      } else if (result.sourcesSynced === 0) {
        setFeedbackMessage(
          `${result.sourcesChecked} fonte(s) verificada(s). Todas já haviam sido sincronizadas há menos de 1 hora.`,
        );
      } else if (result.notableRuns.length === 0) {
        setFeedbackMessage(
          `${result.sourcesSynced} fonte(s) sincronizada(s) com sucesso e sem novas alterações.`,
        );
      } else {
        setFeedbackMessage(
          `${result.sourcesSynced} fonte(s) sincronizada(s) com ${result.notableRuns.length} alerta(s) relevante(s).`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao verificar sincronização iCal.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function handleMarkAllAsRead() {
    const next = markAllSyncNotificationsAsRead(notifications.map((item) => item.id));
    setReadIds(next);
  }

  function handleToggleCard(item: SyncNotificationItem) {
    setExpandedId((current) => (current === item.id ? null : item.id));
    if (!readSet.has(item.id)) {
      setReadIds(markSyncNotificationAsRead(item.id));
    }
  }

  const filterOptions: Array<{ key: NotificationFilter; label: string; count: number }> = [
    { key: "all", label: "Todas", count: counts.all },
    { key: "unread", label: "Não lidas", count: counts.unread },
    { key: "changes", label: "Novas Reservas / Cancelamentos", count: counts.changes },
    { key: "failed", label: "Falhas", count: counts.failed },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Sincronização e alertas
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            Notificações do Sistema
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            O sistema sincroniza seus calendários iCal automaticamente ao entrar (a cada
            1h) e só notifica quando há novas reservas, cancelamentos ou falhas.
          </p>
          {lastSyncAt ? (
            <p className="mt-1.5 text-xs font-medium text-text-muted">
              Última verificação automática: {formatDateTime(new Date(lastSyncAt).toISOString())}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            disabled={isSyncing}
            onClick={() => void handleVerifySyncNow()}
            size="sm"
            variant="secondary"
          >
            <RefreshCw
              aria-hidden
              className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
            />
            {isSyncing ? "Verificando..." : "Verificar sincronização agora"}
          </Button>
          <Button
            disabled={counts.unread === 0}
            onClick={handleMarkAllAsRead}
            size="sm"
            variant="outline"
          >
            <CheckCheck aria-hidden className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        </div>
      </header>

      <MessageBanner isError message={errorMessage} />
      <MessageBanner message={feedbackMessage} />

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = filter === option.key;
          return (
            <button
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.98]",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-surface text-text-secondary hover:border-primary/60 hover:text-primary",
              )}
              key={option.key}
              onClick={() => setFilter(option.key)}
              type="button"
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-muted text-text-muted",
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      <Panel>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-muted">
            Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            description="Tudo está sincronizado. Seguindo a Regra de Silêncio, notificações aparecem somente quando novas reservas entram, reservas são canceladas ou ocorre uma falha de leitura do calendário iCal."
            icon={BellOff}
            title="Tudo em silêncio e sincronizado"
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            description="Não existem alertas para o filtro selecionado no momento."
            icon={CheckCheck}
            title="Nenhuma notificação neste filtro"
          >
            <Button onClick={() => setFilter("all")} size="sm" variant="secondary">
              Ver todas as notificações
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-3">
            {filteredNotifications.map((item) => {
              const isExpanded = expandedId === item.id;
              const isUnread = !readSet.has(item.id);
              const isFailed = item.status === "failed";
              const providerLabel =
                providerLabels[item.provider.toLowerCase()] ?? item.provider;

              return (
                <article
                  className={cn(
                    "min-w-0 overflow-hidden rounded-xl border transition-colors",
                    isUnread
                      ? "border-primary/45 bg-primary-soft/15"
                      : "border-border bg-surface",
                  )}
                  key={item.id}
                >
                  <button
                    aria-expanded={isExpanded}
                    className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left transition hover:bg-surface-muted/50"
                    onClick={() => handleToggleCard(item)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={isFailed ? "danger" : "success"}>
                          {isFailed ? "Falha de Sync" : "Sucesso com Novidades"}
                        </Badge>
                        {isUnread ? <Badge tone="primary">Não lida</Badge> : null}
                        <span className="text-xs font-medium text-text-muted">
                          {formatDateTime(item.startedAt)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-text-primary sm:text-base">
                        {buildHeadline(item)}
                      </h3>

                      <p className="truncate text-xs text-text-secondary">
                        <span className="font-semibold text-text-primary">
                          {item.apartmentName}
                        </span>
                        {" · "}
                        <span>
                          {providerLabel}
                          {item.sourceLabel ? ` (${item.sourceLabel})` : ""}
                        </span>
                      </p>
                    </div>

                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text-secondary">
                      {isExpanded ? (
                        <ChevronUp aria-hidden className="h-4 w-4" />
                      ) : (
                        <ChevronDown aria-hidden className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="grid gap-4 border-t border-border/70 bg-surface-muted/35 p-4">
                      {isFailed ? (
                        <div className="grid gap-3">
                          <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft/50 p-3 text-xs text-danger">
                            <AlertTriangle
                              aria-hidden
                              className="mt-0.5 h-4 w-4 shrink-0"
                            />
                            <div className="min-w-0 space-y-1">
                              <p className="font-semibold">Erro reportado na sincronização</p>
                              <p className="break-words text-text-primary">
                                {item.errorMessage ??
                                  "Não foi possível acessar ou interpretar o arquivo iCal desta fonte."}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button asChild size="xs" variant="secondary">
                              <Link href={`/apartamentos/${item.apartmentId}/ical`}>
                                Corrigir integração iCal
                                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button asChild size="xs" variant="outline">
                              <Link href={`/apartamentos/${item.apartmentId}`}>
                                <Home aria-hidden className="h-3.5 w-3.5" />
                                Ver apartamento
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {item.changes && item.changes.length > 0 ? (
                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                                Alterações detectadas ({item.changes.length})
                              </p>
                              <ul className="grid gap-2">
                                {item.changes.map((change) => {
                                  const isCreated = change.changeType === "created";
                                  return (
                                    <li
                                      className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                                      key={`${change.reservationId}-${change.changeType}`}
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Badge tone={isCreated ? "success" : "danger"}>
                                          {isCreated ? "Nova Reserva" : "Cancelada"}
                                        </Badge>
                                        <span className="truncate text-sm font-medium text-text-primary">
                                          {change.guestName ||
                                            change.rawSummary ||
                                            "Reserva iCal"}
                                        </span>
                                      </div>
                                      <span className="shrink-0 text-xs font-medium text-text-secondary">
                                        {formatShortDate(change.startsAt)} →{" "}
                                        {formatShortDate(change.endsAt)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-text-secondary">
                              {item.eventsSeen} eventos verificados ·{" "}
                              {item.reservationsCreated} nova(s) ·{" "}
                              {item.reservationsCancelled} cancelada(s).
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button asChild size="xs" variant="secondary">
                              <Link href="/calendario">
                                <Calendar aria-hidden className="h-3.5 w-3.5" />
                                Abrir Calendário
                              </Link>
                            </Button>
                            <Button asChild size="xs" variant="outline">
                              <Link href={`/apartamentos/${item.apartmentId}`}>
                                <Home aria-hidden className="h-3.5 w-3.5" />
                                Ver Apartamento
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function buildHeadline(item: SyncNotificationItem): string {
  if (item.status === "failed") {
    return "Falha ao sincronizar calendário iCal";
  }

  const parts: string[] = [];

  if (item.reservationsCreated > 0) {
    parts.push(
      item.reservationsCreated === 1
        ? "1 nova reserva"
        : `${item.reservationsCreated} novas reservas`,
    );
  }

  if (item.reservationsCancelled > 0) {
    parts.push(
      item.reservationsCancelled === 1
        ? "1 cancelamento"
        : `${item.reservationsCancelled} cancelamentos`,
    );
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return "Atualização de sincronização iCal";
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
