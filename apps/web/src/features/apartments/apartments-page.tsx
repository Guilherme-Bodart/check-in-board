"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import type { Apartment, Owner } from "../../api";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { messages } from "../../i18n";
import { readStoredSession } from "../../lib/session-storage";
import {
  createApartment,
  createIcalSource,
  deleteApartment,
  fetchApartments,
  updateApartment,
} from "../dashboard/dashboard-api";
import { fetchOwners } from "../owners/owners-api";
import { IcalSourcesManagement } from "./components/ical-sources-management";

type ApartmentFormState = {
  name: string;
  timezone: string;
  ownerId: string;
  icalUrl: string;
  icalProvider: string;
};

const emptyApartmentForm: ApartmentFormState = {
  name: "",
  timezone: "America/Sao_Paulo",
  ownerId: "",
  icalUrl: "",
  icalProvider: "airbnb",
};

const timezones = ["America/Sao_Paulo", "America/New_York", "Europe/Lisbon"];

export function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [form, setForm] = useState<ApartmentFormState>(emptyApartmentForm);
  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);
  const [selectedIcalApartmentId, setSelectedIcalApartmentId] = useState("");
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      const [apartmentResponse, ownerResponse] = await Promise.all([
        fetchApartments(session.token),
        fetchOwners(session.token),
      ]);

      setApartments(apartmentResponse);
      setOwners(ownerResponse);
      setForm((current) => ({
        ...current,
        ownerId: current.ownerId || ownerResponse[0]?.id || "",
      }));
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

  const selectedIcalApartment =
    apartments.find((apartment) => apartment.id === selectedIcalApartmentId) ?? null;

  async function submitApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();

    if (!session || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingApartmentId) {
        await updateApartment(session.token, editingApartmentId, {
          name: form.name.trim(),
          timezone: form.timezone,
          ownerId: form.ownerId || undefined,
        });
      } else {
        const apartment = await createApartment(session.token, {
          name: form.name.trim(),
          timezone: form.timezone,
          ownerId: form.ownerId || undefined,
        });

        if (form.icalUrl.trim()) {
          await createIcalSource(session.token, apartment.id, {
            provider: form.icalProvider,
            label: `${form.icalProvider.toUpperCase()} - ${form.name.trim()}`,
            url: form.icalUrl.trim(),
          });
        }
      }

      cancelEdit();
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : messages.apartments.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

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
      if (selectedIcalApartmentId === apartmentToDelete.id) {
        setSelectedIcalApartmentId("");
      }
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : messages.apartments.removeFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  function startEdit(apartment: Apartment) {
    setEditingApartmentId(apartment.id);
    setForm({
      name: apartment.name,
      timezone: apartment.timezone,
      ownerId: apartment.owner?.id ?? owners[0]?.id ?? "",
      icalUrl: "",
      icalProvider: "airbnb",
    });
  }

  function cancelEdit() {
    setEditingApartmentId(null);
    setForm({
      ...emptyApartmentForm,
      ownerId: owners[0]?.id ?? "",
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={messages.apartments.apartments} value={summary.total} />
        <SummaryCard label={messages.apartments.owned} value={summary.internal} />
        <SummaryCard label={messages.apartments.clientsOwned} value={summary.client} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {messages.apartments.realEstateEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                {messages.apartments.listTitle}
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
                placeholder={messages.apartments.searchPlaceholder}
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
                  <th className="px-4 py-3 font-semibold">{messages.apartments.apartment}</th>
                  <th className="px-4 py-3 font-semibold">{messages.apartments.owner}</th>
                  <th className="px-4 py-3 font-semibold">Timezone</th>
                  <th className="px-4 py-3 font-semibold">{messages.apartments.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      {messages.apartments.loading}
                    </td>
                  </tr>
                ) : filteredApartments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-text-secondary" colSpan={4}>
                      {messages.apartments.empty}
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
                          <strong className="font-semibold text-text-primary">
                            {apartment.name}
                          </strong>
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
                        {apartment.timezone}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            aria-label={messages.apartments.manageIcal}
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => setSelectedIcalApartmentId(apartment.id)}
                            type="button"
                          >
                            <CalendarDays aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={messages.apartments.editApartment}
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                            onClick={() => startEdit(apartment)}
                            type="button"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={messages.apartments.deleteConfirm}
                            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-danger hover:text-danger"
                            onClick={() => setApartmentToDelete(apartment)}
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
          onSubmit={submitApartment}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plus aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {editingApartmentId
                    ? messages.apartments.editEyebrow
                    : messages.apartments.newEyebrow}
                </p>
                <h2 className="text-lg font-semibold text-text-primary">
                  {editingApartmentId
                    ? messages.apartments.editApartment
                    : messages.apartments.addApartment}
                </h2>
              </div>
            </div>
            {editingApartmentId ? (
              <button
                aria-label={messages.common.cancel}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
                onClick={cancelEdit}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <Field label={messages.apartments.nameField}>
              <input
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={messages.dashboard.apartmentPlaceholder}
                required
                value={form.name}
              />
            </Field>
            <Field label={messages.apartments.owner}>
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, ownerId: event.target.value })
                }
                value={form.ownerId}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} -{" "}
                    {owner.type === "client"
                      ? messages.apartments.clientOwner
                      : messages.apartments.ownLower}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                onChange={(event) =>
                  setForm({ ...form, timezone: event.target.value })
                }
                value={form.timezone}
              >
                {timezones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            {editingApartmentId ? null : (
              <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <CalendarCheck aria-hidden className="h-4 w-4 text-primary" />
                  {messages.apartments.icalOptional}
                </div>
                <Field label={messages.apartments.provider}>
                  <select
                    className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                    onChange={(event) =>
                      setForm({ ...form, icalProvider: event.target.value })
                    }
                    value={form.icalProvider}
                  >
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking</option>
                  </select>
                </Field>
                <Field label="URL iCal">
                  <input
                    className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
                    onChange={(event) =>
                      setForm({ ...form, icalUrl: event.target.value })
                    }
                    placeholder="https://..."
                    type="url"
                    value={form.icalUrl}
                  />
                </Field>
              </div>
            )}
          </div>

          <button
            className="mt-6 h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || owners.length === 0}
            type="submit"
          >
            {isSaving
              ? messages.apartments.saving
              : editingApartmentId
                ? messages.apartments.saveChanges
                : messages.apartments.saveApartment}
          </button>
        </form>
      </section>

      <IcalSourcesManagement
        apartment={selectedIcalApartment}
        onClose={() => setSelectedIcalApartmentId("")}
      />

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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <UserRound aria-hidden className="h-4 w-4" />
        </span>
      </div>
      <strong className="mt-4 block text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </strong>
    </article>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-text-secondary">
      {label}
      {children}
    </label>
  );
}
