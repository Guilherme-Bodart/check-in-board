import type {
  BoardItemCardData,
  SummaryCardData,
  TodayBoardNotice,
  TodayBoardScenario,
  TodayBoardViewState,
} from "./types";

const baseContent = {
  lastSyncLabel: "Last sync 09:18",
  notices: [
    {
      tone: "success",
      title: "Morning sync completed",
      description:
        "Reservations and tasks look up to date for the morning shift.",
    },
    {
      tone: "warning",
      title: "1 item needs manual check",
      description:
        "Cobertura 7 is still waiting for confirmation photos before the next guest.",
    },
  ] satisfies TodayBoardNotice[],
  summaryCards: [
    {
      label: "Check-ins",
      value: "3",
      helper: "First arrival at 14:00",
      status: "checkInToday",
    },
    {
      label: "Check-outs",
      value: "2",
      helper: "One unit still pending review",
      status: "checkOutToday",
    },
    {
      label: "Pending tasks",
      value: "4",
      helper: "2 need action before noon",
      status: "pending",
    },
  ] satisfies SummaryCardData[],
};

export const todayBoardScenarios: Record<
  TodayBoardViewState,
  TodayBoardScenario
> = {
  content: {
    ...baseContent,
    state: "content",
    boardItems: [
      {
        apartment: "Apto 204",
        apartmentId: "apt-1",
        id: "mock-board-1",
        kind: "reservation",
        time: "11:00",
        status: "checkOutToday",
        headline: "Guest leaves before cleaning starts",
        notes: "Laundry pickup and minibar check still open.",
        assignee: "Ana",
        actionLabel: "Open apartment",
      },
      {
        apartment: "Studio 12B",
        apartmentId: "apt-2",
        id: "mock-board-2",
        kind: "reservation",
        time: "14:00",
        status: "checkInToday",
        headline: "Prepare self check-in message",
        notes: "Code was updated after lock battery swap.",
        assignee: "Guilherme",
        actionLabel: "Open apartment",
      },
      {
        apartment: "Cobertura 7",
        apartmentId: "apt-3",
        id: "mock-board-3",
        kind: "task",
        taskStatus: "pending",
        time: "16:30",
        status: "pending",
        headline: "Replace towels and confirm inspection photos",
        notes: "Owner visit tomorrow, keep living room staged.",
        assignee: "Equipe limpeza",
        actionLabel: "Mark done",
      },
    ] satisfies BoardItemCardData[],
  },
  empty: {
    ...baseContent,
    state: "empty",
    boardItems: [],
    emptyState: {
      title: "Nothing urgent on the board",
      description:
        "Today looks calm. You can review apartments or wait for the next sync.",
      actionLabel: "Refresh board",
    },
  },
  loading: {
    ...baseContent,
    state: "loading",
    boardItems: [],
  },
  error: {
    ...baseContent,
    state: "error",
    boardItems: [],
    errorMessage:
      "We could not refresh today's board. Try again after your next sync.",
  },
};

// Change this constant locally to preview other mocked states:
// "content" | "empty" | "loading" | "error"
export const todayBoardPreviewState: TodayBoardViewState = "content";
