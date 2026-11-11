"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

import type { Apartment } from "../../api";
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
import { deleteApartment, fetchApartments } from "../dashboard/dashboard-api";

export function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  async function loadData() {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      setApartments(await fetchApartments(session.token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : messages.apartments.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredApartments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return apartments;
    }

    return apartments.filter((apartment) =>
      [apartment.name, apartment.owner?.name, apartment.timezone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [apartments, query]);

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
        actionHref="/apartamentos/novo"
        actionIcon={Plus}
        actionLabel="Novo apartamento"
        description="Gerencie os imóveis da operação e acesse configurações específicas de cada apartamento."
        eyebrow="Imóveis"
        title="Apartamentos"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={messages.apartments.apartments} value={summary.total} />
        <SummaryCard label={messages.apartments.owned} value={summary.internal} />
        <SummaryCard label={messages.apartments.clientsOwned} value={summary.client} />
      </section>

      <Panel>
        <Toolbar>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              className="pl-9 sm:w-80"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.apartments.searchPlaceholder}
              value={query}
            />
          </div>
        </Toolbar>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-8">
          {isLoading || filteredApartments.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
                ))
              ) : (
                filteredApartments.map((apartment) => (
                  <article
                    key={apartment.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
                          <Building2 aria-hidden className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <IconButton
                            aria-label={messages.apartments.deleteConfirm}
                            icon={Trash2}
                            onClick={() => setApartmentToDelete(apartment)}
                            variant="danger"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 min-w-0">
                        <Link
                          className="block truncate text-xl font-bold tracking-tight text-text-primary outline-none transition hover:text-primary focus:text-primary focus:underline"
                          href={`/apartamentos/${apartment.id}`}
                        >
                          {apartment.name}
                        </Link>
                        <p className="mt-1 truncate text-sm font-medium text-text-secondary">
                          {apartment.owner?.name ?? messages.apartments.noOwner}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={apartment.owner?.type === "client" ? "info" : "primary"}
                        >
                          {apartment.owner?.type === "client"
                            ? messages.apartments.client
                            : messages.apartments.own}
                        </Badge>
                        <Badge tone="neutral">{apartment.timezone}</Badge>
                        <Badge tone="neutral">
                          {((apartment.managementCommissionBps ?? 0) / 100).toLocaleString(
                            "pt-BR",
                          )}
                          %
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border bg-surface-muted/30 px-6 py-4">
                      <IconLink
                        href={`/apartamentos/${apartment.id}/ical`}
                        icon={CalendarDays}
                        label={messages.apartments.manageIcal}
                      />
                      <div className="flex items-center gap-2">
                        <IconLink
                          href={`/apartamentos/${apartment.id}`}
                          icon={Eye}
                          label="Ver detalhes"
                        />
                        <IconLink
                          href={`/apartamentos/${apartment.id}/editar`}
                          icon={Pencil}
                          label={messages.apartments.editApartment}
                        />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <EmptyState
              actionHref="/apartamentos/novo"
              actionLabel="Adicionar apartamento"
              description="Cadastre o primeiro imóvel para importar reservas e organizar tarefas."
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
    <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
          <UserRound aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
