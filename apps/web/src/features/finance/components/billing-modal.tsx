"use client";

import { FormEvent, useState } from "react";
import { DollarSign } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
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
          occurredOn: data.checkOut.slice(0, 10),
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
    <Dialog open={isOpen && Boolean(data)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border bg-surface-muted/40 px-5 py-4 pr-14 shrink-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <DollarSign aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-base font-bold text-text-primary truncate">
              Faturar Reserva
            </DialogTitle>
            {data && (
              <p className="text-xs text-text-muted truncate">
                {data.guestName} ({new Date(data.checkIn).toLocaleDateString("pt-BR")} a{" "}
                {new Date(data.checkOut).toLocaleDateString("pt-BR")})
              </p>
            )}
          </div>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <MessageBanner isError message={message} />

            <Field label="Valor Total da Reserva (R$)">
              <Input
                autoFocus
                inputMode="decimal"
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="1.412,62"
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
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-surface-muted/40 px-5 py-3.5 shrink-0">
            <Button disabled={isSaving} onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Faturando..." : "Faturar Reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
