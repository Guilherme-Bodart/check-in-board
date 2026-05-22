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
    <div className="panel boardPanel" id="reservas">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">
            {board?.date ?? boardDate} | {board?.days ?? 7} dias |{" "}
            {board?.timezone ?? selectedApartment?.timezone ?? "America/Sao_Paulo"}
          </p>
          <h2>Reservas por seção</h2>
        </div>
        <button disabled={!selectedApartmentId} onClick={onRefresh} type="button">
          Atualizar
        </button>
      </div>
      <div className="boardSectionGrid">
        {boardSections.map((section) => (
          <BoardSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
