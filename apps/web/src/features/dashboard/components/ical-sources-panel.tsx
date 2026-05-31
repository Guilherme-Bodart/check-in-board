"use client";

import { FormEvent, useState } from "react";

import type { IcalSource } from "../../../api";
import { messages } from "../../../i18n";
import { formatDateTime } from "../../../lib/date-formatters";
import type { CreateIcalSourceValues } from "../types";

export function IcalSourcesPanel({
  canCreateSource,
  icalSources,
  isSaving,
  message,
  onCreateSource,
  onSyncSource,
  selectedApartmentId,
}: {
  canCreateSource: boolean;
  icalSources: IcalSource[];
  isSaving: boolean;
  message: string;
  onCreateSource: (values: CreateIcalSourceValues) => Promise<boolean>;
  onSyncSource: (icalSourceId: string) => Promise<void>;
  selectedApartmentId: string;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  async function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await onCreateSource({ label, url });

    if (created) {
      setLabel("");
      setUrl("");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm" id="sync">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          {messages.dashboard.ical.title}
        </h2>
      </div>
      <form className="mt-5 grid gap-3" onSubmit={submitSource}>
        <input
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => setLabel(event.target.value)}
          placeholder={messages.dashboard.ical.labelPlaceholder}
          type="text"
          value={label}
        />
        <input
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          required
          type="url"
          value={url}
        />
        <button
          className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || !selectedApartmentId || !canCreateSource}
          type="submit"
        >
          {isSaving ? messages.dashboard.ical.addingButton : messages.dashboard.ical.addButton}
        </button>
      </form>
      {message ? (
        <p className="mt-4 rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium text-text-secondary">
          {message}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3">
        {icalSources.map((source) => (
          <div
            className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
            key={source.id}
          >
            <span className="font-medium text-text-primary">{source.label}</span>
            <strong className={source.lastFailureAt ? "text-warning" : "text-success"}>
              {source.lastFailureAt ? messages.dashboard.ical.attention : "OK"}
            </strong>
            <button
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
              onClick={() => onSyncSource(source.id)}
              type="button"
            >
              {messages.dashboard.ical.syncButton}
            </button>
            <time className="text-text-secondary">
              {formatDateTime(source.lastSuccessAt)}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
