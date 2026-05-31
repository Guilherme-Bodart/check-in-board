import type { ReservationSummary } from "./types.js";

type OperationsBoardSection = {
  count: number;
  reservations: ReservationSummary[];
};

function createSection(reservations: ReservationSummary[]): OperationsBoardSection {
  return {
    count: reservations.length,
    reservations,
  };
}

function startOfUtcDay(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  return start;
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function isSameUtcDay(value: Date, startOfDay: Date, endOfDay: Date) {
  return value >= startOfDay && value < endOfDay;
}

export function buildOperationsBoardPayload(input: {
  apartmentId: string;
  date: Date;
  days: number;
  reservations: ReservationSummary[];
  timezone: string;
}) {
  const startOfDay = startOfUtcDay(input.date);
  const endOfDay = addUtcDays(startOfDay, 1);
  const endOfWindow = addUtcDays(startOfDay, input.days);
  const confirmedReservations = input.reservations.filter(
    (reservation) => reservation.status === "confirmed",
  );

  const checkIns: ReservationSummary[] = [];
  const checkOuts: ReservationSummary[] = [];
  const inHouse: ReservationSummary[] = [];
  const upcoming: ReservationSummary[] = [];

  for (const reservation of confirmedReservations) {
    const startsAt = new Date(reservation.startsAt);
    const endsAt = new Date(reservation.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      continue;
    }

    if (isSameUtcDay(startsAt, startOfDay, endOfDay)) {
      checkIns.push(reservation);
    }

    if (isSameUtcDay(endsAt, startOfDay, endOfDay)) {
      checkOuts.push(reservation);
    }

    if (startsAt < startOfDay && endsAt > endOfDay) {
      inHouse.push(reservation);
    }

    if (startsAt >= endOfDay && startsAt < endOfWindow) {
      upcoming.push(reservation);
    }
  }

  return {
    apartmentId: input.apartmentId,
    checkIns: createSection(checkIns),
    checkOuts: createSection(checkOuts),
    date: startOfDay.toISOString().slice(0, 10),
    days: input.days,
    inHouse: createSection(inHouse),
    timezone: input.timezone,
    totals: {
      checkIns: checkIns.length,
      checkOuts: checkOuts.length,
      inHouse: inHouse.length,
      upcoming: upcoming.length,
    },
    upcoming: createSection(upcoming),
  };
}
