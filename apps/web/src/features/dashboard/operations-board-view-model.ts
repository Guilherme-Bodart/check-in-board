import type { OperationsBoard } from "../../api";
import type { BoardSectionViewModel } from "./types";

export const emptyBoardTotals: OperationsBoard["totals"] = {
  checkIns: 0,
  checkOuts: 0,
  inHouse: 0,
  upcoming: 0,
};

export function createBoardSections(
  board: OperationsBoard | null,
): BoardSectionViewModel[] {
  return [
    {
      id: "checkIns",
      title: "Check-ins",
      description: "Reservas que começam na data selecionada.",
      tone: "info",
      count: board?.checkIns.count ?? 0,
      reservations: board?.checkIns.reservations ?? [],
    },
    {
      id: "checkOuts",
      title: "Check-outs",
      description: "Reservas que terminam na data selecionada.",
      tone: "warning",
      count: board?.checkOuts.count ?? 0,
      reservations: board?.checkOuts.reservations ?? [],
    },
    {
      id: "inHouse",
      title: "Em estadia",
      description: "Reservas que atravessam ou ocupam a data selecionada.",
      tone: "success",
      count: board?.inHouse.count ?? 0,
      reservations: board?.inHouse.reservations ?? [],
    },
    {
      id: "upcoming",
      title: "Próximas",
      description: "Reservas futuras dentro da janela do board.",
      tone: "primary",
      count: board?.upcoming.count ?? 0,
      reservations: board?.upcoming.reservations ?? [],
    },
  ];
}
