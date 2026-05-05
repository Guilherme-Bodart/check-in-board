import { describe, expect, it } from "vitest";

import { parseIcalReservations } from "./parser.js";

describe("parseIcalReservations", () => {
  it("extracts UID, DTSTART, DTEND, and SUMMARY from VEVENT", () => {
    const reservations = parseIcalReservations(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.com
DTSTART:20260510T180000Z
DTEND:20260512T150000Z
SUMMARY:Reserved - Airbnb
END:VEVENT
END:VCALENDAR`);

    expect(reservations).toEqual([
      {
        endsAt: new Date("2026-05-12T15:00:00.000Z"),
        externalEventKey: "reservation-1@example.com",
        externalUid: "reservation-1@example.com",
        rawPayload: {
          summary: "Reserved - Airbnb",
          uid: "reservation-1@example.com",
        },
        rawSummary: "Reserved - Airbnb",
        startsAt: new Date("2026-05-10T18:00:00.000Z"),
      },
    ]);
  });
});
