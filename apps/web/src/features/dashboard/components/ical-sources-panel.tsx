"use client";

import { FormEvent, useState } from "react";

import type { IcalSource } from "../../../api";
import { formatDateTime } from "../../../lib/date-formatters";
import type { CreateIcalSourceValues } from "../types";

export function IcalSourcesPanel({
  icalSources,
  isSaving,
  message,
  onCreateSource,
  onSyncSource,
  selectedApartmentId,
}: {
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
    <div className="panel compact" id="sync">
      <div className="panelHeader">
        <h2>Fontes iCal</h2>
      </div>
      <form className="formStack compactForm" onSubmit={submitSource}>
        <input
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Airbnb Apto 204"
          type="text"
          value={label}
        />
        <input
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          required
          type="url"
          value={url}
        />
        <button disabled={isSaving || !selectedApartmentId} type="submit">
          {isSaving ? "Adicionando..." : "Adicionar iCal"}
        </button>
      </form>
      {message ? <p className="inlineMessage">{message}</p> : null}
      <div className="syncList">
        {icalSources.map((source) => (
          <div className="syncRow" key={source.id}>
            <span>{source.label}</span>
            <strong>{source.lastFailureAt ? "Atenção" : "OK"}</strong>
            <button onClick={() => onSyncSource(source.id)} type="button">
              Sync
            </button>
            <time>{formatDateTime(source.lastSuccessAt)}</time>
          </div>
        ))}
      </div>
    </div>
  );
}
