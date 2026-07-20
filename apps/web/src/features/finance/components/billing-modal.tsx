"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, DollarSign, X } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Field, Input } from "../../../components/ui/form-controls";
import { MessageBanner } from "../../../components/ui/message-banner";
import { readStoredSession } from "../../../lib/session-storage";
import { createRentalStay } from "../rental-stay-api";
import { createFinancialEntry } from "../finance-api";
import { parseMoneyToCents } from "../money";

export type BillingData = {
  id: string; // the reservation ID
  apartmentId: string;
  guestName: string;
  channel: string;
  checkIn: string;
  checkOut: string;
};

export function BillingModal({
  isOpen,
  data,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  data: BillingData | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rentAmount, setRentAmount] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen || !data) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readStoredSession();
    if (!session || !data) return;

    const rentAmountCents = parseMoneyToCents(rentAmount);
    if (rentAmountCents <= 0) {
      setMessage("Insira um valor válido para a reserva.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      // Create the rental stay with the exact same ID as the reservation
      await createRentalStay(session.token, {
        id: data.id,
        apartmentId: data.apartmentId,
        guestName: data.guestName,
        channel: data.channel,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        rentAmountCents,
        currency: "BRL",
      });

      // Optionally create a cleaning fee expense
      const cleaningFeeCents = parseMoneyToCents(cleaningFee);
      if (cleaningFeeCents > 0) {
        await createFinancialEntry(session.token, {
          apartmentId: data.apartmentId,
          rentalStayId: data.id,
          type: "expense",
          category: "limpeza",
          description: "Taxa de limpeza",
          amountCents: cleaningFeeCents,
          currency: "BRL",
          occurredOn: data.checkOut.slice(0, 10), // Occurred on check-out date
        });
      }

      onSuccess();
      setRentAmount("");
      setCleaningFee("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao faturar reserva.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-text-primary/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <DollarSign aria-hidden className="h-5 w-5" />
          </span>
          <button
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        
        <h2 className="mt-4 text-lg font-semibold text-text-primary">Faturar Reserva</h2>
        <p className="mt-1 text-sm leading-6 text-text-secondary">
          {data.guestName} ({new Date(data.checkIn).toLocaleDateString()} a {new Date(data.checkOut).toLocaleDateString()})
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <MessageBanner isError message={message} />
          
          <Field label="Valor Total da Reserva (R$)">
            <Input
              autoFocus
              inputMode="decimal"
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="1412,62"
              required
              value={rentAmount}
            />
          </Field>

          <Field label="Taxa de Limpeza (R$) - Opcional">
            <Input
              inputMode="decimal"
              onChange={(e) => setCleaningFee(e.target.value)}
              placeholder="190,00"
              value={cleaningFee}
            />
          </Field>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Faturando..." : "Faturar Reserva"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
