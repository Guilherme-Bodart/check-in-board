"use client";

import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  confirmLabel = "Confirmar",
  description,
  isOpen,
  isWorking = false,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  isWorking?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-text-primary/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
            <AlertTriangle aria-hidden className="h-5 w-5" />
          </span>
          <button
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-text-secondary transition hover:border-primary hover:text-primary"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary"
            disabled={isWorking}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isWorking}
            onClick={onConfirm}
            type="button"
          >
            {isWorking ? "Removendo..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
