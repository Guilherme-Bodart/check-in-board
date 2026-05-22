import type { Apartment, OperationsBoard } from "../../../api";
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
  return (
    <div
      className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm"
      id="reservas"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {board?.date ?? boardDate} | {board?.days ?? 7} dias |{" "}
            {board?.timezone ?? selectedApartment?.timezone ?? "America/Sao_Paulo"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
            Reservas por seção
          </h2>
        </div>
        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedApartmentId}
          onClick={onRefresh}
          type="button"
        >
          Atualizar
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
