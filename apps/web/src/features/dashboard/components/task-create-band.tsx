"use client";

import { FormEvent, useState } from "react";

import type { CreateTaskValues } from "../types";

export function TaskCreateBand({
  onCreateTask,
}: {
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
    <section className="taskBand" id="tarefas">
      <div>
        <p className="eyebrow">Equipe em campo</p>
        <h2>Tarefas rápidas</h2>
      </div>
      <form className="taskActions" onSubmit={submitTask}>
        <input
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Comprar café"
          type="text"
          value={title}
        />
        <input
          onChange={(event) => setDueAt(event.target.value)}
          type="datetime-local"
          value={dueAt}
        />
        <button type="submit">Adicionar</button>
      </form>
    </section>
  );
}
