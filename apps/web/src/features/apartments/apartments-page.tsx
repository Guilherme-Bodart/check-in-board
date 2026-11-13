"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { isAbortError, type Apartment, type AuthRole } from "../../api";
import { Badge } from "../../components/ui/badge";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { Input } from "../../components/ui/form-controls";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { Toolbar } from "../../components/ui/toolbar";
import { messages } from "../../i18n";
import { readStoredSession } from "../../lib/session-storage";
import { fetchMe } from "../auth/auth-api";
import { deleteApartment, fetchApartments } from "../dashboard/dashboard-api";

export function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [userRole, setUserRole] = useState<AuthRole | null>(null);
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<"all" | "internal" | "client">("all");
  const loadAbortRef = useRef<AbortController | null>(null);

  const isHostAdmin = userRole === "host_admin";

  async function loadData() {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    const session = readStoredSession();

    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const [loadedApartments, me] = await Promise.all([
        fetchApartments(session.token),
        fetchMe(session.token).catch((error) => {
          if (isAbortError(error)) {
            throw error;
          }
          return null;
        }),
      ]);
      if (controller.signal.aborted) {
        return;
      }

      setApartments(loadedApartments);
      if (me) {
        const activeMembership =
          me.memberships.find((membership) => membership.isActive) ?? me.memberships[0];
        setUserRole(activeMembership?.role ?? null);
      }
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }
      setMessage(error instanceof Error ? error.message : messages.apartments.loadFailed);
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
  }

  useEffect(() => {
    void loadData();

    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  const filteredApartments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return apartments.filter((apartment) => {
      if (ownerTypeFilter === "internal" && apartment.owner?.type !== "internal") {
        return false;
      }
      if (ownerTypeFilter === "client" && apartment.owner?.type !== "client") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [apartment.name, apartment.owner?.name, apartment.timezone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [apartments, query, ownerTypeFilter]);

  const summary = useMemo(
    () => ({
      total: apartments.length,
      internal: apartments.filter((apartment) => apartment.owner?.type === "internal")
        .length,
      client: apartments.filter((apartment) => apartment.owner?.type === "client")
        .length,
    }),
    [apartments],
  );

  async function removeApartment() {
    const session = readStoredSession();

    if (!session || !apartmentToDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deleteApartment(session.token, apartmentToDelete.id);
      setApartmentToDelete(null);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : messages.apartments.removeFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actionHref={isHostAdmin ? "/apartamentos/novo" : undefined}
        actionIcon={isHostAdmin ? Plus : undefined}
        actionLabel={isHostAdmin ? "Novo apartamento" : undefined}
        description="Gerencie os imóveis da operação e acesse configurações específicas de cada apartamento."
        eyebrow="Imóveis"
        title="Apartamentos"
      />

      {/* 3-Column Summary Bar on Desktop Only */}
      <section className="hidden md:grid md:grid-cols-3 md:gap-4">
        <SummaryCard label={messages.apartments.apartments} value={summary.total} />
        <SummaryCard label={messages.apartments.owned} value={summary.internal} />
        <SummaryCard label={messages.apartments.clientsOwned} value={summary.client} />
      </section>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              className="pl-9 w-full"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.apartments.searchPlaceholder}
              value={query}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
                ownerTypeFilter === "all"
                  ? "bg-text-primary text-surface"
                  : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setOwnerTypeFilter("all")}
              type="button"
            >
              Todos ({summary.total})
            </button>
            <button
              className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
                ownerTypeFilter === "internal"
                  ? "bg-text-primary text-surface"
                  : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setOwnerTypeFilter("internal")}
              type="button"
            >
              Próprios ({summary.internal})
            </button>
            <button
              className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
                ownerTypeFilter === "client"
                  ? "bg-text-primary text-surface"
                  : "border border-border bg-surface-muted/60 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setOwnerTypeFilter("client")}
              type="button"
            >
              Clientes ({summary.client})
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-5">
          {isLoading || filteredApartments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl bg-surface-muted" />
                ))
              ) : (
                filteredApartments.map((apartment) => (
                  <article
                    key={apartment.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-muted/40 p-4 transition-all hover:border-primary/40 hover:bg-surface"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary shadow-2xs">
                            <Building2 aria-hidden className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              className="block truncate text-base font-bold tracking-tight text-text-primary outline-none transition hover:text-primary"
                              href={`/apartamentos/${apartment.id}`}
                            >
                              {apartment.name}
                            </Link>
                            <p className="mt-0.5 truncate text-xs font-medium text-text-secondary">
                              Proprietário: {apartment.owner?.name ?? messages.apartments.noOwner}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            tone={apartment.owner?.type === "client" ? "info" : "primary"}
                          >
                            {apartment.owner?.type === "client"
                              ? messages.apartments.client
                              : messages.apartments.own}
                          </Badge>
                          {isHostAdmin ? (
                            <IconButton
                              aria-label={messages.apartments.deleteConfirm}
                              icon={Trash2}
                              onClick={() => setApartmentToDelete(apartment)}
                              variant="danger"
                            />
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{apartment.timezone}</Badge>
                        <Badge tone="neutral">
                          Comissão:{" "}
                          {((apartment.managementCommissionBps ?? 0) / 100).toLocaleString(
                            "pt-BR",
                          )}
                          %
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
                      <Link
                        className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                        href={`/apartamentos/${apartment.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver Ficha
                      </Link>
                      {isHostAdmin ? (
                        <Link
                          className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                          href={`/apartamentos/${apartment.id}/editar`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                      ) : null}
                      <Link
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-primary-soft px-2.5 text-xs font-bold text-primary transition hover:brightness-95"
                        href={`/apartamentos/${apartment.id}/ical`}
                        title={messages.apartments.manageIcal}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        iCal
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <EmptyState
              actionHref={isHostAdmin ? "/apartamentos/novo" : undefined}
              actionLabel={isHostAdmin ? "Adicionar apartamento" : undefined}
              description={
                isHostAdmin
                  ? "Cadastre o primeiro imóvel para importar reservas e organizar tarefas."
                  : "Nenhum apartamento vinculado encontrado para sua conta."
              }
              icon={Building2}
              title="Nenhum apartamento encontrado"
            />
          )}
        </div>
      </Panel>

      <ConfirmDialog
        confirmLabel={messages.apartments.deleteConfirm}
        description={messages.apartments.deleteDescription(apartmentToDelete?.name ?? "")}
        isOpen={Boolean(apartmentToDelete)}
        isWorking={isDeleting}
        onCancel={() => setApartmentToDelete(null)}
        onConfirm={() => void removeApartment()}
        title={messages.apartments.deleteTitle}
      />
    </div>
  );
}

function IconLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
      href={href}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </Link>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-3 sm:p-4 text-center sm:text-left shadow-2xs">
      <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted truncate">
        {label}
      </span>
      <strong className="mt-1 block text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
