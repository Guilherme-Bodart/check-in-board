"use client";

import { FormEvent, useState } from "react";

import {
  createApartment,
  createFinancialEntry,
  createOwner,
  createRentalStay,
  expenseCategories,
  type Apartment,
  type Owner,
  type RentalStay,
} from "../../lib/finance-api";
import { currentMonth, parseMoneyToCents } from "../../lib/format";

type QuickCreatePanelProps = {
  token: string;
  apartments: Apartment[];
  owners: Owner[];
  rentalStays: RentalStay[];
  onSaved: () => void;
};

export function QuickCreatePanel({
  apartments,
  onSaved,
  owners,
  rentalStays,
  token,
}: QuickCreatePanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [message, setMessage] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [apartmentOwnerId, setApartmentOwnerId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("20");
  const [stayApartmentId, setStayApartmentId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(today);
  const [rentAmount, setRentAmount] = useState("");
  const [expenseApartmentId, setExpenseApartmentId] = useState("");
  const [expenseStayId, setExpenseStayId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("consumo");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseAmount, setExpenseAmount] = useState("");

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(async () => {
      await createOwner(token, { name: ownerName, type: "client" });
      setOwnerName("");
    });
  }

  async function submitApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(async () => {
      await createApartment(token, {
        name: apartmentName,
        ownerId: apartmentOwnerId || owners[0]?.id || "",
        managementCommissionBps: Math.round(Number(commissionPercent) * 100),
      });
      setApartmentName("");
    });
  }

  async function submitStay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(async () => {
      await createRentalStay(token, {
        apartmentId: stayApartmentId || apartments[0]?.id || "",
        guestName,
        checkIn,
        checkOut,
        rentAmountCents: parseMoneyToCents(rentAmount),
      });
      setGuestName("");
      setRentAmount("");
    });
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(async () => {
      await createFinancialEntry(token, {
        apartmentId: expenseApartmentId || apartments[0]?.id || "",
        rentalStayId: expenseStayId || undefined,
        type: "expense",
        category: expenseCategory,
        description: expenseDescription,
        amountCents: parseMoneyToCents(expenseAmount),
        occurredOn: expenseDate,
      });
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseStayId("");
    });
  }

  async function save(action: () => Promise<void>) {
    setMessage("");

    try {
      await action();
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    }
  }

  return (
    <section className="quick-grid">
      {message ? <p className="error quick-message">{message}</p> : null}
      <form className="quick-card" onSubmit={submitOwner}>
        <h2>Novo cliente</h2>
        <input
          onChange={(event) => setOwnerName(event.target.value)}
          placeholder="Nome do proprietário"
          required
          value={ownerName}
        />
        <button type="submit">Adicionar</button>
      </form>

      <form className="quick-card" onSubmit={submitApartment}>
        <h2>Novo apartamento</h2>
        <input
          onChange={(event) => setApartmentName(event.target.value)}
          placeholder="Nome do apartamento"
          required
          value={apartmentName}
        />
        <select
          onChange={(event) => setApartmentOwnerId(event.target.value)}
          required
          value={apartmentOwnerId || owners[0]?.id || ""}
        >
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
        <input
          inputMode="decimal"
          onChange={(event) => setCommissionPercent(event.target.value)}
          placeholder="Comissão %"
          required
          value={commissionPercent}
        />
        <button disabled={owners.length === 0} type="submit">
          Adicionar
        </button>
      </form>

      <form className="quick-card" onSubmit={submitStay}>
        <h2>Nova estadia</h2>
        <select
          onChange={(event) => setStayApartmentId(event.target.value)}
          required
          value={stayApartmentId || apartments[0]?.id || ""}
        >
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {apartment.name}
            </option>
          ))}
        </select>
        <input
          onChange={(event) => setGuestName(event.target.value)}
          placeholder="Hóspede"
          value={guestName}
        />
        <DateRangeField
          endLabel="Check-out"
          endValue={checkOut}
          onEndChange={setCheckOut}
          onStartChange={setCheckIn}
          startLabel="Check-in"
          startValue={checkIn}
        />
        <input
          inputMode="decimal"
          onChange={(event) => setRentAmount(event.target.value)}
          placeholder="Valor do aluguel"
          required
          value={rentAmount}
        />
        <button disabled={apartments.length === 0} type="submit">
          Adicionar
        </button>
      </form>

      <form className="quick-card" onSubmit={submitExpense}>
        <h2>Nova despesa</h2>
        <select
          onChange={(event) => setExpenseApartmentId(event.target.value)}
          required
          value={expenseApartmentId || apartments[0]?.id || ""}
        >
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {apartment.name}
            </option>
          ))}
        </select>
        <select
          onChange={(event) => setExpenseCategory(event.target.value)}
          value={expenseCategory}
        >
          {expenseCategories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <select
          onChange={(event) => setExpenseStayId(event.target.value)}
          value={expenseStayId}
        >
          <option value="">Sem estadia vinculada</option>
          {rentalStays.map((stay) => (
            <option key={stay.id} value={stay.id}>
              {stay.guestName || "Estadia"} · {stay.apartmentName}
            </option>
          ))}
        </select>
        <input
          onChange={(event) => setExpenseDescription(event.target.value)}
          placeholder="Descrição"
          required
          value={expenseDescription}
        />
        <div className="two-col">
          <input
            onChange={(event) => setExpenseDate(event.target.value)}
            required
            type="date"
            value={expenseDate || `${currentMonth()}-01`}
          />
          <input
            inputMode="decimal"
            onChange={(event) => setExpenseAmount(event.target.value)}
            placeholder="Valor"
            required
            value={expenseAmount}
          />
        </div>
        <button disabled={apartments.length === 0} type="submit">
          Adicionar
        </button>
      </form>
    </section>
  );
}

function DateRangeField({
  endLabel,
  endValue,
  onEndChange,
  onStartChange,
  startLabel,
  startValue,
}: {
  endLabel: string;
  endValue: string;
  onEndChange: (value: string) => void;
  onStartChange: (value: string) => void;
  startLabel: string;
  startValue: string;
}) {
  return (
    <fieldset className="date-range-field">
      <legend>Período</legend>
      <label>
        {startLabel}
        <input
          onChange={(event) => onStartChange(event.target.value)}
          required
          type="date"
          value={startValue}
        />
      </label>
      <span aria-hidden>→</span>
      <label>
        {endLabel}
        <input
          onChange={(event) => onEndChange(event.target.value)}
          required
          type="date"
          value={endValue}
        />
      </label>
    </fieldset>
  );
}
