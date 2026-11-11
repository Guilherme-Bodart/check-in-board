"use client";

import { AlertTriangle } from "lucide-react";

import { messages } from "../../i18n";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

export function ConfirmDialog({
  confirmLabel = messages.common.confirm,
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md p-6">
        <div className="flex items-start gap-4 pr-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
            <AlertTriangle aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold text-text-primary">{title}</DialogTitle>
            <p className="mt-1.5 text-sm leading-6 text-text-secondary">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary"
            disabled={isWorking}
            onClick={onCancel}
            type="button"
          >
            {messages.common.cancel}
          </button>
          <button
            className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isWorking}
            onClick={onConfirm}
            type="button"
          >
            {isWorking ? messages.common.removing : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
