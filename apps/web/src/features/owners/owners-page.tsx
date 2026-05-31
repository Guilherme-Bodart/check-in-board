"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  X,
} from "lucide-react";

import type { Owner, OwnerType } from "../../api";
import { ApiClientError } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import {
  createOwner,
  deleteOwner,
  fetchOwners,
  updateOwner,
  type OwnerFormValues,
} from "./owners-api";

type OwnerFormState = OwnerFormValues;

const emptyOwnerForm: OwnerFormState = {
  name: "",
  type: "client",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

const ownerTypeLabels: Record<OwnerType, string> = {
  internal: "Próprio",
  client: "Cliente",
};

export function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [form, setForm] = useState<OwnerFormState>(emptyOwnerForm);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<OwnerType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadOwners() {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      setOwners(await fetchOwners(session.token));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar proprietários.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOwners();
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

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingOwnerId) {
        await updateOwner(session.token, editingOwnerId, form);
      } else {
        await createOwner(session.token, form);
      }

      cancelEdit();
      await loadOwners();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar proprietário.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeOwner(owner: Owner) {
    const session = readStoredSession();

    if (!session || owner.apartmentCount > 0) {
      return;
    }

    setMessage("");

    try {
      await deleteOwner(session.token, owner.id);
      await loadOwners();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "OWNER_HAS_APARTMENTS") {
        setMessage("Esse proprietário ainda tem apartamentos vinculados.");
      } else {
        setMessage(
          error instanceof Error ? error.message : "Falha ao remover proprietário.",
        );
      }
    }
  }

  function startEdit(owner: Owner) {
    setEditingOwnerId(owner.id);
    setForm({
      name: owner.name,
      type: owner.type,
      contactName: owner.contactName ?? "",
      email: owner.email ?? "",
      phone: owner.phone ?? "",
      notes: owner.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingOwnerId(null);
    setForm(emptyOwnerForm);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Proprietarios" value={summary.total} icon={UsersRound} />
        <SummaryCard label="Clientes" value={summary.clients} icon={BriefcaseBusiness} />
        <SummaryCard label="Próprios" value={summary.internal} icon={UserRound} />
        <SummaryCard label="Apartamentos" value={summary.apartments} icon={Building2} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Clientes
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                Proprietários e donos de imóveis
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                />
                <input
                  className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft sm:w-72"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar proprietário"
                  value={query}
                />
              </div>
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setTypeFilter(event.target.value as OwnerType | "all")
                }
                value={typeFilter}
              >
                <option value="all">Todos</option>
                <option value="client">Clientes</option>
                <option value="internal">Próprios</option>
              </select>
            </div>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {message}
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.12em] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Proprietario</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Apartamentos</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Carregando proprietários...
                    </td>
                  </tr>
                ) : filteredOwners.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Nenhum proprietário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOwners.map((owner) => (
                    <tr key={owner.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
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
                            <span className="text-xs text-text-muted">
                              {ownerTypeLabels[owner.type]}
                            </span>
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
                          <button
                            aria-label="Editar proprietário"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => startEdit(owner)}
                            type="button"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Remover proprietário"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={owner.apartmentCount > 0}
                            onClick={() => void removeOwner(owner)}
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
        </div>

        <form
          className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
          onSubmit={submitOwner}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plus aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {editingOwnerId ? "Edição" : "Novo"}
                </p>
                <h2 className="text-lg font-semibold text-text-primary">
                  {editingOwnerId ? "Editar proprietário" : "Adicionar proprietário"}
                </h2>
              </div>
            </div>
            {editingOwnerId ? (
              <button
                aria-label="Cancelar edição"
                className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={cancelEdit}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Nome do proprietário">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Cliente João ou meus imóveis"
                required
                value={form.name}
              />
            </Field>
            <Field label="Tipo">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as OwnerType })
                }
                value={form.type}
              >
                <option value="client">Cliente</option>
                <option value="internal">Próprio</option>
              </select>
            </Field>
            <Field label="Nome do contato">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, contactName: event.target.value })
                }
                placeholder="João Silva"
                value={form.contactName}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Email">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="joao@email.com"
                  type="email"
                  value={form.email}
                />
              </Field>
              <Field label="Telefone">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="+55 11 99999-0000"
                  value={form.phone}
                />
              </Field>
            </div>
            <Field label="Observações">
              <textarea
                className="min-h-24 resize-none rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Preferencias, regras comerciais ou detalhes internos"
                value={form.notes}
              />
            </Field>
          </div>

          <button
            className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Salvando..." : editingOwnerId ? "Salvar alterações" : "Criar"}
          </button>
        </form>
      </section>
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
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary">
      {label}
      {children}
    </label>
  );
}
