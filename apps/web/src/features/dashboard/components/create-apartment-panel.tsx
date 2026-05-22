"use client";

import { FormEvent, useState } from "react";

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
    <section className="panel emptyPanel">
      <h2>Crie o primeiro apartamento</h2>
      <form className="inlineForm" onSubmit={submitApartment}>
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder="Apto 204"
          type="text"
          value={name}
        />
        <button type="submit">Criar</button>
      </form>
    </section>
  );
}
