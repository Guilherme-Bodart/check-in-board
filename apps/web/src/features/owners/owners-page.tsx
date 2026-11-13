"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { ApiClientError, isAbortError, type Owner, type OwnerType } from "../../api";
import { Badge } from "../../components/ui/badge";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DataTable, TableStateRow } from "../../components/ui/data-table";
import { EmptyState } from "../../components/ui/empty-state";
import { IconButton } from "../../components/ui/icon-button";
import { Input, Select } from "../../components/ui/form-controls";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { Toolbar } from "../../components/ui/toolbar";
import { readStoredSession } from "../../lib/session-storage";
import { deleteOwner, fetchOwners } from "./owners-api";

const ownerTypeLabels: Record<OwnerType, string> = {
  internal: "Próprio",
  client: "Cliente",
};

export function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<OwnerType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const loadAbortRef = useRef<AbortController | null>(null);

  async function loadOwners() {
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
    let isAborted = false;

    try {
      const loadedOwners = await fetchOwners(session.token);
      if (controller.signal.aborted) return;
      setOwners(loadedOwners);
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        isAborted = true;
        return;
      }
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar proprietários.",
      );
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        if (!controller.signal.aborted && !isAborted) {
          setIsLoading(false);
        }
      }
    }
  }

  useEffect(() => {
    void loadOwners();

    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  const filteredOwners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return owners.filter((owner) => {
      const matchesType = typeFilter === "all" || owner.type === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        [owner.name, owner.contactName, owner.email, owner.phone]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      return matchesType && matchesQuery;
    });
  }, [owners, query, typeFilter]);

  const summary = useMemo(
    () => ({
      total: owners.length,
      clients: owners.filter((owner) => owner.type === "client").length,
      internal: owners.filter((owner) => owner.type === "internal").length,
      apartments: owners.reduce((total, owner) => total + owner.apartmentCount, 0),
    }),
    [owners],
  );

  async function removeOwner() {
    const session = readStoredSession();

    if (!session || !ownerToDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deleteOwner(session.token, ownerToDelete.id);
      setOwnerToDelete(null);
      await loadOwners();
    } catch (error) {
      if (isAbortError(error)) return;
      if (error instanceof ApiClientError && error.code === "OWNER_HAS_APARTMENTS") {
        setMessage("Esse proprietário ainda tem apartamentos vinculados.");
      } else {
        setMessage(
          error instanceof Error ? error.message : "Falha ao remover proprietário.",
        );
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actionHref="/clientes/novo"
        actionIcon={Plus}
        actionLabel="Novo proprietário"
        description="Organize os donos dos apartamentos antes de vincular imóveis, reservas e financeiro."
        eyebrow="Clientes"
        title="Proprietários"
      />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Proprietários" value={summary.total} icon={UsersRound} />
        <SummaryCard label="Clientes" value={summary.clients} icon={BriefcaseBusiness} />
        <SummaryCard label="Próprios" value={summary.internal} icon={UserRound} />
        <SummaryCard label="Apartamentos" value={summary.apartments} icon={Building2} />
      </section>

      <Panel>
        <Toolbar>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              className="pl-9 sm:w-72"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar proprietário"
              value={query}
            />
          </div>
          <Select
            className="sm:w-44"
            onChange={(event) => setTypeFilter(event.target.value as OwnerType | "all")}
            value={typeFilter}
          >
            <option value="all">Todos</option>
            <option value="client">Clientes</option>
            <option value="internal">Próprios</option>
          </Select>
        </Toolbar>

        {message ? (
          <p className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-5">
          {isLoading || filteredOwners.length > 0 ? (
            <>
              {/* Mobile-First Owner Cards (< 768px) */}
              <div className="grid gap-3 md:hidden">
                {isLoading ? (
                  <div className="rounded-xl border border-border py-10 text-center text-xs text-text-muted">
                    Carregando proprietários...
                  </div>
                ) : (
                  filteredOwners.map((owner) => (
                    <article
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 p-4"
                      key={owner.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-primary">
                            {owner.type === "client" ? (
                              <BriefcaseBusiness aria-hidden className="h-4 w-4" />
                            ) : (
                              <UserRound aria-hidden className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-base font-bold text-text-primary">
                              {owner.name}
                            </strong>
                            <p className="truncate text-xs text-text-secondary">
                              {owner.contactName ?? "Titular"}
                            </p>
                          </div>
                        </div>

                        <Badge tone={owner.type === "client" ? "info" : "primary"}>
                          {ownerTypeLabels[owner.type]}
                        </Badge>
                      </div>

                      <div className="grid gap-1.5 rounded-lg border border-border/70 bg-surface p-2.5 text-xs text-text-secondary">
                        {owner.email ? (
                          <span className="flex items-center gap-1.5 truncate">
                            <Mail aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                            <span className="truncate">{owner.email}</span>
                          </span>
                        ) : null}
                        {owner.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                            <span>{owner.phone}</span>
                          </span>
                        ) : null}
                        {!owner.email && !owner.phone ? (
                          <span className="text-text-muted">Sem e-mail ou telefone cadastrado</span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          {owner.apartmentCount}{" "}
                          {owner.apartmentCount === 1 ? "imóvel vinculado" : "imóveis vinculados"}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                            href={`/clientes/${owner.id}/editar`}
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                          <IconButton
                            aria-label="Remover proprietário"
                            disabled={owner.apartmentCount > 0}
                            icon={Trash2}
                            onClick={() => setOwnerToDelete(owner)}
                            variant="danger"
                          />
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="hidden md:block">
                <DataTable>
                  <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Proprietário</th>
                      <th className="px-4 py-3 font-semibold">Contato</th>
                      <th className="px-4 py-3 font-semibold">Apartamentos</th>
                      <th className="px-4 py-3 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {isLoading ? (
                      <TableStateRow colSpan={4}>Carregando proprietários...</TableStateRow>
                    ) : (
                      filteredOwners.map((owner) => (
                        <tr key={owner.id}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                                {owner.type === "client" ? (
                                  <BriefcaseBusiness aria-hidden className="h-4 w-4" />
                                ) : (
                                  <UserRound aria-hidden className="h-4 w-4" />
                                )}
                              </span>
                              <div>
                                <strong className="block font-semibold text-text-primary">
                                  {owner.name}
                                </strong>
                                <Badge tone={owner.type === "client" ? "info" : "primary"}>
                                  {ownerTypeLabels[owner.type]}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-text-secondary">
                            <div className="grid gap-1">
                              <span>{owner.contactName ?? "Sem contato"}</span>
                              {owner.email ? (
                                <span className="flex items-center gap-1 text-xs text-text-muted">
                                  <Mail aria-hidden className="h-3.5 w-3.5" />
                                  {owner.email}
                                </span>
                              ) : null}
                              {owner.phone ? (
                                <span className="flex items-center gap-1 text-xs text-text-muted">
                                  <Phone aria-hidden className="h-3.5 w-3.5" />
                                  {owner.phone}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-text-secondary">
                            {owner.apartmentCount}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                aria-label="Editar proprietário"
                                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                                href={`/clientes/${owner.id}/editar`}
                              >
                                <Pencil aria-hidden className="h-4 w-4" />
                              </Link>
                              <IconButton
                                aria-label="Remover proprietário"
                                disabled={owner.apartmentCount > 0}
                                icon={Trash2}
                                onClick={() => setOwnerToDelete(owner)}
                                variant="danger"
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </DataTable>
              </div>
            </>
          ) : (
            <EmptyState
              actionHref="/clientes/novo"
              actionLabel="Adicionar proprietário"
              description="Cadastre o primeiro proprietário para vincular apartamentos e acompanhar resultados."
              icon={UsersRound}
              title="Nenhum proprietário encontrado"
            />
          )}
        </div>
      </Panel>

      <ConfirmDialog
        confirmLabel="Remover"
        description={`O proprietário ${ownerToDelete?.name ?? ""} será removido da operação.`}
        isOpen={Boolean(ownerToDelete)}
        isWorking={isDeleting}
        onCancel={() => setOwnerToDelete(null)}
        onConfirm={() => void removeOwner()}
        title="Remover proprietário?"
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted truncate">
          {label}
        </span>
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <strong className="mt-1.5 block text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}
