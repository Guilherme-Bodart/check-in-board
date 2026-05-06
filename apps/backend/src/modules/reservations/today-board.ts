import type { OperationStatus } from "./today-board-types.js";
import type { AccessibleReservationSummary } from "./types.js";

export type TodayBoardItem = {
  id: string;
  apartmentId: string;
  apartment: string;
  time: string;
  status: OperationStatus;
  headline: string;
  notes: string;
  assignee: string;
  actionLabel: string;
};

export type TodayBoardSummaryCard = {
  label: string;
  value: string;
  helper: string;
  status: OperationStatus;
};

export type TodayBoardPayload = {
  boardItems: TodayBoardItem[];
  lastSyncLabel: string;
  notices: Array<{
    tone: "success" | "warning";
    title: string;
    description: string;
  }>;
  summaryCards: TodayBoardSummaryCard[];
};

function isSameLocalDate(date: Date, targetDate: Date) {
  return (
    date.toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10)
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getReservationStatus(
  reservation: AccessibleReservationSummary,
  targetDate: Date,
): OperationStatus {
  const startsAt = new Date(reservation.startsAt);
  const endsAt = new Date(reservation.endsAt);

  if (isSameLocalDate(startsAt, targetDate)) {
    return "checkInToday";
  }

  if (isSameLocalDate(endsAt, targetDate)) {
    return "checkOutToday";
  }

  if (startsAt < targetDate && endsAt > targetDate) {
    return "inStay";
  }

  return "upcoming";
}

function getHeadline(status: OperationStatus) {
  if (status === "checkInToday") {
    return "Guest arrives today";
  }

  if (status === "checkOutToday") {
    return "Guest leaves today";
  }

  if (status === "inStay") {
    return "Guest is currently in stay";
  }

  return "Upcoming reservation";
}

export function buildTodayBoardPayload(
  reservations: AccessibleReservationSummary[],
  targetDate = new Date(),
): TodayBoardPayload {
  const items = reservations.map((reservation) => {
    const status = getReservationStatus(reservation, targetDate);

    return {
      actionLabel: "Open apartment",
      apartment: reservation.apartmentName,
      apartmentId: reservation.apartmentId,
      assignee: reservation.provider?.toUpperCase() ?? "Calendar",
      headline: reservation.rawSummary ?? getHeadline(status),
      id: reservation.id,
      notes: `${getHeadline(status)} via ${
        reservation.provider?.toUpperCase() ?? "calendar"
      }.`,
      status,
      time:
        status === "checkOutToday"
          ? formatTime(reservation.endsAt)
          : formatTime(reservation.startsAt),
    };
  });

  const checkIns = items.filter((item) => item.status === "checkInToday");
  const checkOuts = items.filter((item) => item.status === "checkOutToday");
  const inStays = items.filter((item) => item.status === "inStay");

  return {
    boardItems: items,
    lastSyncLabel: "Reservations loaded",
    notices: [
      {
        description:
          items.length > 0
            ? "Reservations are feeding the operational board."
            : "No reservation-driven actions were found for today.",
        title: "Reservation board refreshed",
        tone: "success",
      },
    ],
    summaryCards: [
      {
        helper:
          checkIns[0]?.time != null
            ? `First arrival at ${checkIns[0].time}`
            : "No arrivals today",
        label: "Check-ins",
        status: "checkInToday",
        value: String(checkIns.length),
      },
      {
        helper:
          checkOuts[0]?.time != null
            ? `First departure at ${checkOuts[0].time}`
            : "No departures today",
        label: "Check-outs",
        status: "checkOutToday",
        value: String(checkOuts.length),
      },
      {
        helper: `${inStays.length} active stays right now`,
        label: "In stay",
        status: "inStay",
        value: String(inStays.length),
      },
    ],
  };
}
