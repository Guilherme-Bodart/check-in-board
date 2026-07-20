"use client";

import { FormEvent, useEffect, useState } from "react";
import { X, Calendar as CalendarIcon, User } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Field, Input, Select } from "../../components/ui/form-controls";
import type { Reservation, Apartment } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import { createManualReservation, updateReservation } from "./reservations-api";

export type ReservationFormModalProps = {
  isOpen: boolean;
  apartments: Apartment[];
  apartmentId: string;
  reservation?: Reservation | null; // se nulo, cria nova; se preenchido, edita
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
        setStartsAt(reservation.startsAt.substring(0, 10)); // YYYY-MM-DD
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
  }, [isOpen, reservation]);

  if (!isOpen) {
    return null;
  }

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-text-primary/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <CalendarIcon aria-hidden className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold text-text-primary">
              {isEditing ? "Editar Reserva" : "Nova Reserva Manual"}
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          {!isEditing && (
            <Field label="Apartamento">
              <Select
                onChange={(e) => setFormApartmentId(e.target.value)}
                required
                value={formApartmentId}
              >
                <option disabled value="">Selecione um apartamento...</option>
                {apartments.map(apt => (
                  <option key={apt.id} value={apt.id}>{apt.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {!isIcal && (
            <div className="grid grid-cols-2 gap-4">
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
             <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-text-secondary">
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

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      </section>
    </div>
  );
}
