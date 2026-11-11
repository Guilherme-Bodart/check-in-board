"use client";

import { FormEvent, useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Field, Input, Select } from "../../components/ui/form-controls";
import type { Reservation, Apartment } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import { createManualReservation, updateReservation } from "./reservations-api";

export type ReservationFormModalProps = {
  isOpen: boolean;
  apartments: Apartment[];
  apartmentId: string;
  reservation?: Reservation | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ReservationFormModal({
  isOpen,
  apartments,
  apartmentId,
  reservation,
  onClose,
  onSaved,
}: ReservationFormModalProps) {
  const isEditing = Boolean(reservation);
  const isIcal = isEditing && reservation?.provider !== "manual";

  const [formApartmentId, setFormApartmentId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (reservation) {
        setFormApartmentId(reservation.apartmentId);
        setGuestName(reservation.guestName || "");
        setGuestCount(reservation.guestCount ? String(reservation.guestCount) : "");
        setStartsAt(reservation.startsAt.substring(0, 10));
        setEndsAt(reservation.endsAt.substring(0, 10));
      } else {
        setFormApartmentId(apartmentId === "all" ? (apartments[0]?.id || "") : apartmentId);
        setGuestName("");
        setGuestCount("");
        const today = new Date().toISOString().substring(0, 10);
        setStartsAt(today);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setEndsAt(tomorrow.toISOString().substring(0, 10));
      }
    }
  }, [isOpen, reservation, apartmentId, apartments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const session = readStoredSession();
    if (!session) return;

    setError("");
    setIsSaving(true);

    try {
      if (!formApartmentId) {
        throw new Error("Selecione um apartamento.");
      }

      if (isEditing) {
        await updateReservation(session.token, formApartmentId, reservation!.id, {
          guestName: guestName.trim(),
          guestCount: guestCount ? parseInt(guestCount, 10) : 0,
        });
      } else {
        await createManualReservation(session.token, formApartmentId, {
          guestName: guestName.trim(),
          guestCount: guestCount ? parseInt(guestCount, 10) : 0,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar reserva.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border bg-surface-muted/40 px-5 py-4 pr-14 shrink-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <CalendarIcon aria-hidden className="h-5 w-5" />
          </span>
          <DialogTitle className="text-base font-bold text-text-primary truncate">
            {isEditing ? "Editar Reserva" : "Nova Reserva Manual"}
          </DialogTitle>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
                {error}
              </div>
            )}

            {!isEditing && (
              <Field label="Apartamento">
                <Select
                  onChange={(e) => setFormApartmentId(e.target.value)}
                  required
                  value={formApartmentId}
                >
                  <option disabled value="">Selecione um apartamento...</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </Select>
              </Field>
            )}

            {!isIcal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Data de Check-in">
                  <Input
                    disabled={isEditing}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                    type="date"
                    value={startsAt}
                  />
                </Field>
                <Field label="Data de Check-out">
                  <Input
                    disabled={isEditing}
                    onChange={(e) => setEndsAt(e.target.value)}
                    required
                    type="date"
                    value={endsAt}
                  />
                </Field>
              </div>
            )}

            {isIcal && (
              <div className="rounded-xl border border-border bg-surface-muted p-3 text-xs text-text-secondary">
                Esta reserva foi importada via iCal ({reservation?.provider}). As datas não podem ser alteradas, mas você pode preencher os dados complementares abaixo.
              </div>
            )}

            <Field label="Nome do Hóspede Principal">
              <Input
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: João da Silva"
                required={!isIcal}
                value={guestName}
              />
            </Field>

            <Field label="Quantidade Total de Hóspedes">
              <Input
                min={1}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="Ex: 2"
                type="number"
                value={guestCount}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-surface-muted/40 px-5 py-3.5 shrink-0">
            <Button
              disabled={isSaving}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar Reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
