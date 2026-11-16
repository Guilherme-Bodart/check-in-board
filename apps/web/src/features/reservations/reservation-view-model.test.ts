import { describe, expect, it } from "vitest";
import type { Apartment, RentalStay, Reservation } from "../../api";
import {
  attachApartmentDetails,
  findConflictingReservation,
  getReservationDisplayGuest,
  hasDayReservationConflict,
  isGenericGuestReservation,
  needsReservationAttention,
  nightsBetween,
  reservationLocalDate,
} from "./reservation-view-model";

describe("reservationLocalDate", () => {
  it("extracts YYYY-MM-DD from string starting with ISO date format", () => {
    expect(reservationLocalDate("2026-06-15")).toBe("2026-06-15");
    expect(reservationLocalDate("2026-06-15T14:30:00Z")).toBe("2026-06-15");
    expect(reservationLocalDate("2026-12-31 23:59:59")).toBe("2026-12-31");
  });

  it("returns empty string when input is empty or nullish", () => {
    expect(reservationLocalDate("")).toBe("");
  });

  it("parses other date string formats via Date fallback", () => {
    const parsed = reservationLocalDate("2026/05/20");
    expect(parsed).toMatch(/^2026-05-\d{2}$/);
  });

  it("falls back to slice(0, 10) on invalid date string", () => {
    expect(reservationLocalDate("not-a-date-value")).toBe("not-a-date");
  });
});

describe("nightsBetween", () => {
  it("calculates positive nights between check-in and check-out", () => {
    expect(nightsBetween("2026-06-10", "2026-06-15")).toBe(5);
    expect(nightsBetween("2026-06-10", "2026-06-11")).toBe(1);
    expect(nightsBetween("2026-06-28", "2026-07-03")).toBe(5);
  });

  it("handles ISO datetime strings", () => {
    expect(
      nightsBetween("2026-07-01T15:00:00Z", "2026-07-04T11:00:00Z"),
    ).toBe(3);
  });

  it("returns 0 for same-day check-in and check-out", () => {
    expect(nightsBetween("2026-06-10", "2026-06-10")).toBe(0);
  });

  it("returns 0 when check-out is before check-in", () => {
    expect(nightsBetween("2026-06-15", "2026-06-10")).toBe(0);
  });

  it("returns 0 for invalid date strings", () => {
    expect(nightsBetween("invalid", "2026-06-15")).toBe(0);
    expect(nightsBetween("2026-06-10", "invalid")).toBe(0);
    expect(nightsBetween("", "")).toBe(0);
  });
});

describe("isGenericGuestReservation", () => {
  it("returns true when guestName is missing or whitespace only", () => {
    expect(
      isGenericGuestReservation({ guestName: null, rawSummary: "Reserva" }),
    ).toBe(true);
    expect(
      isGenericGuestReservation({ guestName: "", rawSummary: "Reserva" }),
    ).toBe(true);
    expect(
      isGenericGuestReservation({ guestName: "   ", rawSummary: "Reserva" }),
    ).toBe(true);
  });

  it("returns true when rawSummary contains 'reserved' case-insensitively", () => {
    expect(
      isGenericGuestReservation({
        guestName: "João",
        rawSummary: "Reserved by owner",
      }),
    ).toBe(true);
    expect(
      isGenericGuestReservation({
        guestName: "Maria",
        rawSummary: "RESERVED - iCal",
      }),
    ).toBe(true);
  });

  it("returns true when rawSummary contains 'airbnb' case-insensitively", () => {
    expect(
      isGenericGuestReservation({
        guestName: "Lucas",
        rawSummary: "Airbnb (Not available)",
      }),
    ).toBe(true);
    expect(
      isGenericGuestReservation({
        guestName: "Ana",
        rawSummary: "AIRBNB RESERVATION",
      }),
    ).toBe(true);
  });

  it("returns false for valid guest with non-generic summary", () => {
    expect(
      isGenericGuestReservation({
        guestName: "Carlos Silva",
        rawSummary: "Reserva Particular Família Silva",
      }),
    ).toBe(false);
    expect(
      isGenericGuestReservation({
        guestName: "Beatriz Oliveira",
        rawSummary: null,
      }),
    ).toBe(false);
  });
});

describe("getReservationDisplayGuest", () => {
  it("returns trimmed guestName when present", () => {
    expect(
      getReservationDisplayGuest({
        guestName: "  Juliana Paes  ",
        rawSummary: "Reserva iCal",
      }),
    ).toBe("Juliana Paes");
  });

  it("falls back to trimmed rawSummary when guestName is empty", () => {
    expect(
      getReservationDisplayGuest({
        guestName: null,
        rawSummary: "  Reserva Booking.com  ",
      }),
    ).toBe("Reserva Booking.com");
  });

  it("returns default fallback when both guestName and rawSummary are missing", () => {
    expect(
      getReservationDisplayGuest({
        guestName: null,
        rawSummary: null,
      }),
    ).toBe("Hóspede Não Identificado");
    expect(
      getReservationDisplayGuest({
        guestName: "   ",
        rawSummary: "",
      }),
    ).toBe("Hóspede Não Identificado");
  });

  it("supports custom fallback text", () => {
    expect(
      getReservationDisplayGuest(
        { guestName: "", rawSummary: "" },
        "Hóspede Anônimo",
      ),
    ).toBe("Hóspede Anônimo");
  });
});

describe("needsReservationAttention", () => {
  const validReservation = {
    guestName: "Renata Flores",
    rawSummary: "Reserva Direta",
  };

  const validStay: RentalStay = {
    id: "stay-1",
    apartmentId: "apt-1",
    apartmentName: "Apto 101",
    ownerId: "owner-1",
    ownerName: "Pedro Alvares",
    checkIn: "2026-06-10",
    checkOut: "2026-06-15",
    rentAmountCents: 150000,
    currency: "BRL",
  };

  it("returns true when rental stay is missing or null", () => {
    expect(needsReservationAttention(validReservation, null)).toBe(true);
    expect(needsReservationAttention(validReservation, undefined)).toBe(true);
  });

  it("returns true when stay has zero or negative rentAmountCents", () => {
    expect(
      needsReservationAttention(validReservation, {
        ...validStay,
        rentAmountCents: 0,
      }),
    ).toBe(true);
    expect(
      needsReservationAttention(validReservation, {
        ...validStay,
        rentAmountCents: -500,
      }),
    ).toBe(true);
  });

  it("returns true when reservation has generic guest even with valid stay", () => {
    const genericReservation = {
      guestName: "Reserved",
      rawSummary: "Airbnb (Not available)",
    };
    expect(needsReservationAttention(genericReservation, validStay)).toBe(true);
  });

  it("returns false when reservation has valid guest and stay has positive rent", () => {
    expect(needsReservationAttention(validReservation, validStay)).toBe(false);
  });
});

describe("findConflictingReservation", () => {
  const baseReservation: Reservation = {
    id: "res-1",
    apartmentId: "apt-101",
    icalSourceId: "ical-1",
    provider: "airbnb",
    status: "confirmed",
    startsAt: "2026-06-10",
    endsAt: "2026-06-15",
    rawSummary: "Hóspede A",
    guestName: "Hóspede A",
    guestCount: 2,
    externalEventKey: "key-1",
    externalUid: "uid-1",
  };

  it("returns null if candidate lacks apartmentId or dates", () => {
    expect(
      findConflictingReservation([baseReservation], {
        apartmentId: "",
        startsAt: "2026-06-10",
        endsAt: "2026-06-15",
      }),
    ).toBeNull();

    expect(
      findConflictingReservation([baseReservation], {
        apartmentId: "apt-101",
        startsAt: "",
        endsAt: "2026-06-15",
      }),
    ).toBeNull();
  });

  it("permits same-day turnover without conflict (same apartment)", () => {
    // res-1: 2026-06-10 -> 2026-06-15
    // candidate starts when res-1 ends (turnover checkout/checkin on 15th)
    const afterTurnover = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-15",
      endsAt: "2026-06-20",
    });
    expect(afterTurnover).toBeNull();

    // candidate ends when res-1 starts (turnover checkout/checkin on 10th)
    const beforeTurnover = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-05",
      endsAt: "2026-06-10",
    });
    expect(beforeTurnover).toBeNull();
  });

  it("detects overlap when dates intersect within the same apartment", () => {
    // Overlap at the end (14th to 18th overlaps with 10th-15th)
    const overlapEnd = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-14",
      endsAt: "2026-06-18",
    });
    expect(overlapEnd).toBe(baseReservation);

    // Overlap at the start (8th to 12th overlaps with 10th-15th)
    const overlapStart = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-08",
      endsAt: "2026-06-12",
    });
    expect(overlapStart).toBe(baseReservation);

    // Encompassing existing reservation
    const encompassing = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-01",
      endsAt: "2026-06-20",
    });
    expect(encompassing).toBe(baseReservation);

    // Completely inside existing reservation
    const inside = findConflictingReservation([baseReservation], {
      apartmentId: "apt-101",
      startsAt: "2026-06-11",
      endsAt: "2026-06-14",
    });
    expect(inside).toBe(baseReservation);
  });

  it("does not flag conflict for overlapping dates in different apartments", () => {
    const diffApartment = findConflictingReservation([baseReservation], {
      apartmentId: "apt-202",
      startsAt: "2026-06-10",
      endsAt: "2026-06-15",
    });
    expect(diffApartment).toBeNull();
  });

  it("ignores self-conflict when candidate id matches existing reservation id", () => {
    const selfUpdate = findConflictingReservation([baseReservation], {
      id: "res-1",
      apartmentId: "apt-101",
      startsAt: "2026-06-10",
      endsAt: "2026-06-15",
    });
    expect(selfUpdate).toBeNull();
  });
});

describe("hasDayReservationConflict", () => {
  const resA: Reservation = {
    id: "res-a",
    apartmentId: "apt-101",
    icalSourceId: "ical-1",
    provider: "airbnb",
    status: "confirmed",
    startsAt: "2026-06-10",
    endsAt: "2026-06-15",
    rawSummary: "Guest A",
    guestName: "Guest A",
    guestCount: 2,
    externalEventKey: "key-a",
    externalUid: "uid-a",
  };

  const resBOverlapping: Reservation = {
    id: "res-b",
    apartmentId: "apt-101",
    icalSourceId: "ical-2",
    provider: "booking",
    status: "confirmed",
    startsAt: "2026-06-12",
    endsAt: "2026-06-17",
    rawSummary: "Guest B",
    guestName: "Guest B",
    guestCount: 1,
    externalEventKey: "key-b",
    externalUid: "uid-b",
  };

  const resCTurnover: Reservation = {
    id: "res-c",
    apartmentId: "apt-101",
    icalSourceId: "ical-3",
    provider: "manual",
    status: "confirmed",
    startsAt: "2026-06-15",
    endsAt: "2026-06-20",
    rawSummary: "Guest C",
    guestName: "Guest C",
    guestCount: 2,
    externalEventKey: "key-c",
    externalUid: "uid-c",
  };

  it("returns false when reservations array has fewer than 2 reservations", () => {
    expect(hasDayReservationConflict([], "2026-06-12")).toBe(false);
    expect(hasDayReservationConflict([resA], "2026-06-12")).toBe(false);
  });

  it("returns false when date is empty", () => {
    expect(hasDayReservationConflict([resA, resBOverlapping], "")).toBe(false);
  });

  it("returns true on overlapping days between reservations of the same apartment", () => {
    // Both resA (10-15) and resB (12-17) are present on 2026-06-13
    expect(
      hasDayReservationConflict([resA, resBOverlapping], "2026-06-13"),
    ).toBe(true);
    // On 2026-06-11 only resA is present -> no conflict on that date
    expect(
      hasDayReservationConflict([resA, resBOverlapping], "2026-06-11"),
    ).toBe(false);
  });

  it("returns false on same-day turnover date (checkout of resA and checkin of resC)", () => {
    // resA ends on 2026-06-15, resC starts on 2026-06-15
    expect(hasDayReservationConflict([resA, resCTurnover], "2026-06-15")).toBe(
      false,
    );
  });

  it("returns false when overlapping reservations belong to different apartments", () => {
    const resDifferentApt: Reservation = {
      ...resBOverlapping,
      apartmentId: "apt-different",
    };
    expect(
      hasDayReservationConflict([resA, resDifferentApt], "2026-06-13"),
    ).toBe(false);
  });
});

describe("attachApartmentDetails", () => {
  const apartments: Apartment[] = [
    {
      id: "apt-1",
      name: "Loft Copacabana",
      organizationId: "org-1",
      timezone: "America/Sao_Paulo",
      managementCommissionBps: 2000,
      owner: {
        id: "owner-1",
        name: "Carlos Drummond",
        type: "client",
      },
      membership: {
        id: "mem-1",
        role: "host_admin",
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
      },
    },
    {
      id: "apt-2",
      name: "Studio Ipanema",
      organizationId: "org-1",
      timezone: "America/Sao_Paulo",
      managementCommissionBps: 1500,
      owner: null as unknown as Apartment["owner"],
      membership: {
        id: "mem-2",
        role: "host_admin",
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
      },
    },
  ];

  const reservations: Reservation[] = [
    {
      id: "res-late",
      apartmentId: "apt-1",
      icalSourceId: "ical-1",
      provider: "airbnb",
      status: "confirmed",
      startsAt: "2026-07-20",
      endsAt: "2026-07-25",
      rawSummary: "Reserva Julho",
      guestName: "Julho Guest",
      guestCount: 2,
      externalEventKey: "key-late",
      externalUid: "uid-late",
    },
    {
      id: "res-early",
      apartmentId: "apt-2",
      icalSourceId: "ical-2",
      provider: "booking",
      status: "confirmed",
      startsAt: "2026-06-01",
      endsAt: "2026-06-05",
      rawSummary: "Reserva Junho",
      guestName: "Junho Guest",
      guestCount: 1,
      externalEventKey: "key-early",
      externalUid: "uid-early",
    },
    {
      id: "res-missing-apt",
      apartmentId: "apt-unknown",
      icalSourceId: "ical-3",
      provider: "direct",
      status: "confirmed",
      startsAt: "2026-06-15",
      endsAt: "2026-06-18",
      rawSummary: "Reserva Desconhecida",
      guestName: "Desconhecido",
      guestCount: 1,
      externalEventKey: "key-unknown",
      externalUid: "uid-unknown",
    },
  ];

  it("attaches apartment metadata and sorts chronologically by startsAt", () => {
    const result = attachApartmentDetails(reservations, apartments);

    expect(result).toHaveLength(3);
    // Chronological order: 2026-06-01, 2026-06-15, 2026-07-20
    expect(result[0].id).toBe("res-early");
    expect(result[1].id).toBe("res-missing-apt");
    expect(result[2].id).toBe("res-late");

    // Check matched apartment and owner
    expect(result[2].apartmentName).toBe("Loft Copacabana");
    expect(result[2].ownerName).toBe("Carlos Drummond");
    expect(result[2].apartment?.id).toBe("apt-1");
  });

  it("falls back to localized strings when apartment or owner is missing", () => {
    const result = attachApartmentDetails(reservations, apartments);

    // res-early has apt-2 whose owner is null
    const studioItem = result.find((item) => item.id === "res-early");
    expect(studioItem?.apartmentName).toBe("Studio Ipanema");
    expect(studioItem?.ownerName).toBe("Sem proprietário");

    // res-missing-apt has no matching apartment in the map
    const unknownItem = result.find((item) => item.id === "res-missing-apt");
    expect(unknownItem?.apartment).toBeUndefined();
    expect(unknownItem?.apartmentName).toBe("Apartamento removido");
    expect(unknownItem?.ownerName).toBe("Sem proprietário");
  });
});
