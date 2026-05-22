"use client";

import { FormEvent, useState } from "react";

import type { CreateTaskValues } from "../types";

export function TaskCreateBand({
  disabled,
  onCreateTask,
}: {
  disabled: boolean;
  onCreateTask: (values: CreateTaskValues) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await onCreateTask({ title, dueAt });

    if (created) {
      setTitle("");
      setDueAt("");
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl bg-primary-soft p-6 lg:flex-row lg:items-center lg:justify-between"
      id="tarefas"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Equipe em campo
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
          Tarefas rápidas
        </h2>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitTask}>
        <input
          className="h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft sm:w-64"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Comprar café"
          type="text"
          value={title}
        />
        <input
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => setDueAt(event.target.value)}
          type="datetime-local"
          value={dueAt}
        />
        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          type="submit"
        >
          Adicionar
        </button>
      </form>
    </section>
  );
}
