import { RefreshCw } from "lucide-react";

import type { Apartment, OperationsBoard } from "../../../api";
import { messages } from "../../../i18n";
import type { BoardSectionViewModel } from "../types";
import { BoardSectionCard } from "./board-section-card";

export function OperationsBoardPanel({
  board,
  boardDate,
  boardSections,
  onRefresh,
  selectedApartment,
  selectedApartmentId,
}: {
  board: OperationsBoard | null;
  boardDate: string;
  boardSections: BoardSectionViewModel[];
  onRefresh: () => void;
  selectedApartment: Apartment | null;
  selectedApartmentId: string;
}) {
  const metaItems = [
    board?.date ?? boardDate,
    messages.dashboard.boardMetaDays(board?.days ?? 7),
    board?.timezone ?? selectedApartment?.timezone ?? "America/Sao_Paulo",
  ];

  return (
    <div
      className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm"
      id="reservas"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {metaItems.map((item) => (
              <span
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-text-primary">
            {messages.dashboard.boardSectionTitle}
          </h2>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedApartmentId}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          {messages.dashboard.refresh}
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {boardSections.map((section) => (
          <BoardSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
