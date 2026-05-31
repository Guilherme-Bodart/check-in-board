"use client";

import { FormEvent, useState } from "react";

import { messages } from "../../../i18n";

export function CreateApartmentPanel({
  onCreateApartment,
}: {
  onCreateApartment: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");

  async function submitApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await onCreateApartment(name);

    if (created) {
      setName("");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">
        {messages.dashboard.createFirstApartment}
      </h2>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={submitApartment}>
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => setName(event.target.value)}
          placeholder={messages.dashboard.apartmentPlaceholder}
          type="text"
          value={name}
        />
        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
          type="submit"
        >
          {messages.common.create}
        </button>
      </form>
    </section>
  );
}
