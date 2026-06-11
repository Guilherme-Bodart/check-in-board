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
        <Toolbar
          actions={
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary-soft"
              href="/apartamentos/novo"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Novo
            </Link>
          }
        >
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

        <div className="mt-5">
          {isLoading || filteredApartments.length > 0 ? (
            <DataTable>
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{messages.apartments.apartment}</th>
                  <th className="px-4 py-3 font-semibold">{messages.apartments.owner}</th>
                  <th className="px-4 py-3 font-semibold">Comissão</th>
                  <th className="px-4 py-3 font-semibold">Timezone</th>
                  <th className="px-4 py-3 font-semibold">{messages.apartments.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <TableStateRow colSpan={5}>{messages.apartments.loading}</TableStateRow>
                ) : (
                  filteredApartments.map((apartment) => (
                    <tr key={apartment.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                            <Building2 aria-hidden className="h-4 w-4" />
                          </span>
                          <Link
                            className="font-semibold text-text-primary transition hover:text-primary"
                            href={`/apartamentos/${apartment.id}`}
                          >
                            {apartment.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        <div className="grid gap-1">
                          <span>{apartment.owner?.name ?? messages.apartments.noOwner}</span>
                          <span className="text-xs text-text-muted">
                            {apartment.owner?.type === "client"
                              ? messages.apartments.client
                              : messages.apartments.own}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {((apartment.managementCommissionBps ?? 0) / 100).toLocaleString(
                          "pt-BR",
                        )}
                        %
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {apartment.timezone}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <IconLink
                            href={`/apartamentos/${apartment.id}`}
                            icon={Eye}
                            label="Ver apartamento"
                          />
                          <IconLink
                            href={`/apartamentos/${apartment.id}/ical`}
                            icon={CalendarDays}
                            label={messages.apartments.manageIcal}
                          />
                          <IconLink
                            href={`/apartamentos/${apartment.id}/editar`}
                            icon={Pencil}
                            label={messages.apartments.editApartment}
                          />
                          <IconButton
                            aria-label={messages.apartments.deleteConfirm}
                            icon={Trash2}
                            onClick={() => setApartmentToDelete(apartment)}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
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
