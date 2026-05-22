"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CalendarCheck, Plus, Search } from "lucide-react";

import type { Apartment } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import {
  createApartment,
  createIcalSource,
  fetchApartments,
} from "../dashboard/dashboard-api";

type ApartmentListItem = Apartment & {
  nickname?: string;
  owner?: {
    id: string;
    name: string;
    type: "internal" | "client";
  };
  ical?: {
    enabled: boolean;
    provider: string | null;
    lastFailureAt: string | null;
    lastSuccessAt: string | null;
  };
};

const timezones = ["America/Sao_Paulo", "America/New_York", "Europe/Lisbon"];

export function ApartmentsPage() {
  const [apartments, setApartments] = useState<ApartmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [ownerName, setOwnerName] = useState("");
  const [ownerType, setOwnerType] = useState<"internal" | "client">("internal");
  const [icalUrl, setIcalUrl] = useState("");
  const [icalProvider, setIcalProvider] = useState("airbnb");

  async function loadApartments() {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetchApartments(session.token);
      setApartments(response);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar apartamentos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApartments();
  }, []);

  const filteredApartments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return apartments;
    }

    return apartments.filter((apartment) =>
      [apartment.name, apartment.nickname, apartment.owner?.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [apartments, query]);

  async function submitApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session || !name.trim()) {
      return;
    }

    setMessage("");

    try {
      const apartment = await createApartment(session.token, name.trim(), timezone);

      if (icalUrl.trim()) {
        await createIcalSource(session.token, apartment.id, {
          label: `${icalProvider.toUpperCase()} - ${name.trim()}`,
          url: icalUrl.trim(),
        });
      }

      setName("");
      setNickname("");
      setOwnerName("");
      setOwnerType("internal");
      setIcalUrl("");
      setIcalProvider("airbnb");
      setTimezone("America/Sao_Paulo");
      await loadApartments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar apartamento.");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Imóveis
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                Lista de apartamentos
              </h2>
            </div>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft md:w-72"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por imóvel ou proprietário"
                value={query}
              />
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
                  <th className="px-4 py-3 font-semibold">Apartamento</th>
                  <th className="px-4 py-3 font-semibold">Proprietário</th>
                  <th className="px-4 py-3 font-semibold">Timezone</th>
                  <th className="px-4 py-3 font-semibold">iCal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Carregando apartamentos...
                    </td>
                  </tr>
                ) : filteredApartments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      Nenhum apartamento encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredApartments.map((apartment) => (
                    <tr key={apartment.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                            <Building2 aria-hidden className="h-4 w-4" />
                          </span>
                          <div>
                            <strong className="block font-semibold text-text-primary">
                              {apartment.name}
                            </strong>
                            <span className="text-xs text-text-muted">
                              {apartment.nickname ?? "Sem apelido"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {apartment.owner?.name ?? "Proprietário não vinculado"}
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {apartment.timezone}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                          {apartment.ical?.enabled ? "Ativo" : "Manual"}
                        </span>
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
          onSubmit={submitApartment}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Plus aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Novo imóvel
              </p>
              <h2 className="text-lg font-semibold text-text-primary">
                Adicionar apartamento
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Nome do apartamento">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setName(event.target.value)}
                placeholder="Apto 204"
                required
                value={name}
              />
            </Field>
            <Field label="Apelido interno">
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Centro 204"
                value={nickname}
              />
            </Field>
            <Field label="Timezone">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setTimezone(event.target.value)}
                value={timezone}
              >
                {timezones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4">
              <Field label="Proprietário">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Guilherme Properties ou Cliente João"
                  value={ownerName}
                />
              </Field>
              <Field label="Tipo de proprietário">
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) =>
                    setOwnerType(event.target.value as "internal" | "client")
                  }
                  value={ownerType}
                >
                  <option value="internal">Próprio</option>
                  <option value="client">Cliente</option>
                </select>
              </Field>
              <p className="text-xs leading-5 text-text-muted">
                O vínculo de proprietário será persistido quando o backend de Owners
                estiver implementado.
              </p>
            </div>
            <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CalendarCheck aria-hidden className="h-4 w-4 text-primary" />
                iCal opcional
              </div>
              <Field label="Provider">
                <select
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => setIcalProvider(event.target.value)}
                  value={icalProvider}
                >
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                </select>
              </Field>
              <Field label="URL iCal">
                <input
                  className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  onChange={(event) => setIcalUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={icalUrl}
                />
              </Field>
            </div>
          </div>

          <button
            className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
            type="submit"
          >
            Salvar apartamento
          </button>
        </form>
      </section>
    </div>
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
