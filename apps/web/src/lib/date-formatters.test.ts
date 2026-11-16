import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  currentMonthInput,
  formatDateBR,
  formatDateInput,
  formatDateTime,
  formatIsoDateOnly,
  formatReservationDateRange,
  monthRange,
} from "./date-formatters";

describe("formatDateInput", () => {
  it("formats date to YYYY-MM-DD string", () => {
    const date = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));
    expect(formatDateInput(date)).toBe("2026-05-15");
  });

  it("defaults to current date when no argument provided", () => {
    const formatted = formatDateInput();
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("currentMonthInput", () => {
  it("formats date to YYYY-MM string", () => {
    const date = new Date(Date.UTC(2026, 10, 16));
    expect(currentMonthInput(date)).toBe("2026-11");
  });

  it("defaults to current month", () => {
    const result = currentMonthInput();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("addMonths", () => {
  it("adds months across calendar years", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-11", 14)).toBe("2028-01");
  });

  it("subtracts months across calendar years", () => {
    expect(addMonths("2026-02", -3)).toBe("2025-11");
  });

  it("preserves two-digit month formatting", () => {
    expect(addMonths("2026-01", 4)).toBe("2026-05");
  });
});

describe("addDays", () => {
  it("adds days forward correctly", () => {
    expect(addDays("2026-05-15", 5)).toBe("2026-05-20");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });

  it("subtracts days backward correctly", () => {
    expect(addDays("2026-03-02", -3)).toBe("2026-02-27");
  });
});

describe("monthRange", () => {
  it("returns monthStart and nextMonth boundary dates", () => {
    const range = monthRange("2026-05");
    expect(range).toEqual({
      monthStart: "2026-05-01",
      nextMonth: "2026-06-01",
    });
  });

  it("handles December rollover to next year", () => {
    const range = monthRange("2026-12");
    expect(range).toEqual({
      monthStart: "2026-12-01",
      nextMonth: "2027-01-01",
    });
  });

  it("returns null for invalid month string", () => {
    expect(monthRange("invalid")).toBeNull();
    expect(monthRange("2026-5")).toBeNull();
    expect(monthRange("")).toBeNull();
  });
});

describe("formatDateBR", () => {
  it("formats ISO date string (YYYY-MM-DD) to DD/MM/YYYY", () => {
    expect(formatDateBR("2026-11-16")).toBe("16/11/2026");
  });

  it("formats ISO datetime string to DD/MM/YYYY", () => {
    expect(formatDateBR("2026-05-04T14:30:00Z")).toBe("04/05/2026");
  });

  it("returns empty string when input is empty", () => {
    expect(formatDateBR("")).toBe("");
  });

  it("returns original input if unparseable", () => {
    expect(formatDateBR("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("returns 'Nunca' for null or empty input", () => {
    expect(formatDateTime(null)).toBe("Nunca");
    expect(formatDateTime("")).toBe("Nunca");
  });

  it("formats valid ISO timestamp to localized pt-BR datetime", () => {
    const formatted = formatDateTime("2026-11-16T15:30:00Z").replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe("formatIsoDateOnly", () => {
  it("converts YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatIsoDateOnly("2026-12-25")).toBe("25/12/2026");
  });

  it("converts ISO datetime prefix to DD/MM/YYYY", () => {
    expect(formatIsoDateOnly("2026-07-04T10:00:00Z")).toBe("04/07/2026");
  });

  it("returns original value when string is not valid date components", () => {
    expect(formatIsoDateOnly("2026-05")).toBe("2026-05");
  });
});

describe("formatReservationDateRange", () => {
  it("formats reservation check-in and check-out dates into range", () => {
    expect(
      formatReservationDateRange("2026-06-10", "2026-06-15")
    ).toBe("10/06/2026 - 15/06/2026");
  });

  it("handles ISO datetime strings in range", () => {
    expect(
      formatReservationDateRange("2026-08-01T14:00:00Z", "2026-08-05T11:00:00Z")
    ).toBe("01/08/2026 - 05/08/2026");
  });
});
