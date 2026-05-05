import type { OperationStatus } from "@/theme";

export type TodayBoardViewState = "content" | "empty" | "loading" | "error";

export type SummaryCardData = {
  label: string;
  value: string;
  helper: string;
  status: OperationStatus;
};

export type BoardItemCardData = {
  id: string;
  apartment: string;
  time: string;
  status: OperationStatus;
  headline: string;
  notes: string;
  assignee: string;
  actionLabel: string;
};

export type TodayBoardNotice = {
  tone: "success" | "warning";
  title: string;
  description: string;
};

export type TodayBoardEmptyState = {
  title: string;
  description: string;
  actionLabel: string;
};

export type TodayBoardContent = {
  summaryCards: SummaryCardData[];
  boardItems: BoardItemCardData[];
  notices: TodayBoardNotice[];
  lastSyncLabel: string;
};

export type TodayBoardScenario = {
  state: TodayBoardViewState;
  emptyState?: TodayBoardEmptyState;
  errorMessage?: string;
} & TodayBoardContent;
