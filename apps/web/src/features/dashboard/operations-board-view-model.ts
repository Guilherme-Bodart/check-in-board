import type { OperationsBoard } from "../../api";
import { messages } from "../../i18n";
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
      title: messages.dashboard.boardSections.checkIns.title,
      description: messages.dashboard.boardSections.checkIns.description,
      tone: "info",
      count: board?.checkIns.count ?? 0,
      reservations: board?.checkIns.reservations ?? [],
    },
    {
      id: "checkOuts",
      title: messages.dashboard.boardSections.checkOuts.title,
      description: messages.dashboard.boardSections.checkOuts.description,
      tone: "warning",
      count: board?.checkOuts.count ?? 0,
      reservations: board?.checkOuts.reservations ?? [],
    },
    {
      id: "inHouse",
      title: messages.dashboard.boardSections.inHouse.title,
      description: messages.dashboard.boardSections.inHouse.description,
      tone: "success",
      count: board?.inHouse.count ?? 0,
      reservations: board?.inHouse.reservations ?? [],
    },
    {
      id: "upcoming",
      title: messages.dashboard.boardSections.upcoming.title,
      description: messages.dashboard.boardSections.upcoming.description,
      tone: "primary",
      count: board?.upcoming.count ?? 0,
      reservations: board?.upcoming.reservations ?? [],
    },
  ];
}
