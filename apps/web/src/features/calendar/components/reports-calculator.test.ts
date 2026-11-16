import { describe, expect, it } from "vitest";
import type { Apartment, FinancialEntry, RentalStay } from "../../../api";
import {
  buildCleaningSchedule,
  buildGatekeeperSchedule,
  buildOwnerStatementData,
  buildWhatsAppCleaningSummary,
  buildWhatsAppGatekeeperSummary,
  buildWhatsAppOwnerSummary,
  computePeriodRange,
  filterActiveReservations,
  filterPeriodReservations,
  getApartmentCommissionPercent,
  shiftYmd,
  toLocalYmd,
  type OwnerStatementData,
} from "./reports-calculator";
import type { ReservationListItem } from "../../reservations/reservation-view-model";

function normalizeSpaces(str: string): string {
  return str.replace(/\u00A0|\u202F/g, " ");
}

describe("toLocalYmd & shiftYmd", () => {
  it("formats Date instance to YYYY-MM-DD", () => {
    const d = new Date(2026, 4, 15, 12, 0, 0);
    expect(toLocalYmd(d)).toBe("2026-05-15");
  });

  it("shifts YMD forward by delta days across month boundaries", () => {
    expect(shiftYmd("2026-05-28", 5)).toBe("2026-06-02");
  });

  it("shifts YMD backward by delta days across year boundaries", () => {
    expect(shiftYmd("2026-01-02", -5)).toBe("2025-12-28");
  });
});

describe("computePeriodRange", () => {
  // Reference date: Wednesday, May 20, 2026
  const refDate = new Date(2026, 4, 20, 12, 0, 0);

  it("computes current_month preset", () => {
    const range = computePeriodRange("current_month", undefined, refDate);
    expect(range.dateFrom).toBe("2026-05-01");
    expect(range.dateTo).toBe("2026-05-31");
    expect(range.label).toBe("01/05/2026 a 31/05/2026");
  });

  it("computes last_month and last-month preset", () => {
    const rangeUnder = computePeriodRange("last_month", undefined, refDate);
    expect(rangeUnder.dateFrom).toBe("2026-04-01");
    expect(rangeUnder.dateTo).toBe("2026-04-30");
    expect(rangeUnder.label).toBe("01/04/2026 a 30/04/2026");

    const rangeHyphen = computePeriodRange("last-month", undefined, refDate);
    expect(rangeHyphen.dateFrom).toBe("2026-04-01");
    expect(rangeHyphen.dateTo).toBe("2026-04-30");
    expect(rangeHyphen.label).toBe("01/04/2026 a 30/04/2026");
  });

  it("handles year rollover for last_month in January", () => {
    const janRef = new Date(2026, 0, 15, 12, 0, 0);
    const range = computePeriodRange("last_month", undefined, janRef);
    expect(range.dateFrom).toBe("2025-12-01");
    expect(range.dateTo).toBe("2025-12-31");
    expect(range.label).toBe("01/12/2025 a 31/12/2025");
  });

  it("computes last_week and last-week preset (previous Monday through Sunday)", () => {
    // 2026-05-20 is Wednesday (dayOfWeekMon0 = 2)
    // End should be Sunday May 17, 2026
    // Start should be Monday May 11, 2026
    const rangeUnder = computePeriodRange("last_week", undefined, refDate);
    expect(rangeUnder.dateFrom).toBe("2026-05-11");
    expect(rangeUnder.dateTo).toBe("2026-05-17");
    expect(rangeUnder.label).toBe("11/05/2026 a 17/05/2026");

    const rangeHyphen = computePeriodRange("last-week", undefined, refDate);
    expect(rangeHyphen.dateFrom).toBe("2026-05-11");
    expect(rangeHyphen.dateTo).toBe("2026-05-17");
  });

  it("computes selected-month preset with valid YYYY-MM", () => {
    const range = computePeriodRange("selected-month", "2026-02", refDate);
    expect(range.dateFrom).toBe("2026-02-01");
    expect(range.dateTo).toBe("2026-02-28");
    expect(range.label).toBe("01/02/2026 a 28/02/2026");
  });

  it("falls back to current month of reference date when selected-month format is invalid", () => {
    const range = computePeriodRange("selected-month", "invalid", refDate);
    expect(range.dateFrom).toBe("2026-05-01");
    expect(range.dateTo).toBe("2026-05-31");
  });
});

describe("getApartmentCommissionPercent", () => {
  it("defaults to 15% when apartment is undefined", () => {
    expect(getApartmentCommissionPercent(undefined)).toBe(15);
  });

  it("converts managementCommissionBps to percentage", () => {
    const apt = {
      managementCommissionBps: 2000,
    } as unknown as Apartment;
    expect(getApartmentCommissionPercent(apt)).toBe(20);

    const aptTen = {
      managementCommissionBps: 1000,
    } as unknown as Apartment;
    expect(getApartmentCommissionPercent(aptTen)).toBe(10);
  });

  it("defaults to 15% when managementCommissionBps is null/undefined on apartment", () => {
    const apt = {} as Apartment;
    expect(getApartmentCommissionPercent(apt)).toBe(15);
  });
});

describe("filterActiveReservations & filterPeriodReservations", () => {
  const activeRes: ReservationListItem = {
    id: "res-1",
    apartmentId: "apt-1",
    apartmentName: "Apto 101",
    ownerName: "Proprietário",
    icalSourceId: "ical-1",
    provider: "airbnb",
    status: "confirmed",
    startsAt: "2026-05-10",
    endsAt: "2026-05-15",
    rawSummary: "Active",
    guestName: "Active Guest",
    guestCount: 2,
    externalEventKey: "k1",
    externalUid: "u1",
  };

  const cancelledRes: ReservationListItem = {
    ...activeRes,
    id: "res-cancelled",
    status: "cancelled",
  };

  it("filters out cancelled reservations case-insensitively", () => {
    const filtered = filterActiveReservations([
      activeRes,
      cancelledRes,
      { ...cancelledRes, id: "res-cancelled-2", status: "CANCELLED" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("res-1");
  });

  it("filters reservations active in period date range", () => {
    const list: ReservationListItem[] = [
      activeRes, // 2026-05-10 to 2026-05-15 (inside)
      {
        ...activeRes,
        id: "res-early",
        startsAt: "2026-04-20",
        endsAt: "2026-05-01", // ends on start boundary
      },
      {
        ...activeRes,
        id: "res-overlap-start",
        startsAt: "2026-04-25",
        endsAt: "2026-05-05", // overlaps start
      },
      {
        ...activeRes,
        id: "res-future",
        startsAt: "2026-06-01",
        endsAt: "2026-06-10", // after period
      },
    ];

    const result = filterPeriodReservations(list, "2026-05-01", "2026-05-31");
    const ids = result.map((r) => r.id);
    expect(ids).toContain("res-1");
    expect(ids).toContain("res-overlap-start");
    expect(ids).not.toContain("res-early");
    expect(ids).not.toContain("res-future");
  });
});

describe("buildOwnerStatementData", () => {
  const apartment: Apartment = {
    id: "apt-101",
    name: "Apto 101 Vista Mar",
    organizationId: "org-1",
    timezone: "America/Sao_Paulo",
    managementCommissionBps: 2000, // 20% commission
    owner: {
      id: "owner-1",
      name: "Mariana Alencar",
      type: "client",
    },
    membership: {
      id: "mem-1",
      role: "host_admin",
      canManageIntegrations: true,
      canUpdateTaskStatus: true,
      canView: true,
    },
  };

  const periodReservations: ReservationListItem[] = [
    {
      id: "res-paid",
      apartmentId: "apt-101",
      apartmentName: "Apto 101 Vista Mar",
      ownerName: "Mariana Alencar",
      icalSourceId: "ical-1",
      provider: "airbnb",
      status: "confirmed",
      startsAt: "2026-05-05",
      endsAt: "2026-05-10",
      rawSummary: "Carlos Lima",
      guestName: "Carlos Lima",
      guestCount: 2,
      externalEventKey: "k1",
      externalUid: "u1",
    },
    {
      id: "res-zero-rent",
      apartmentId: "apt-101",
      apartmentName: "Apto 101 Vista Mar",
      ownerName: "Mariana Alencar",
      icalSourceId: "ical-1",
      provider: "manual",
      status: "confirmed",
      startsAt: "2026-05-12",
      endsAt: "2026-05-15",
      rawSummary: "Cortesía Família",
      guestName: "Família Alencar",
      guestCount: 3,
      externalEventKey: "k2",
      externalUid: "u2",
    },
    {
      id: "res-other-apt",
      apartmentId: "apt-999",
      apartmentName: "Outro Apto",
      ownerName: "Outro Dono",
      icalSourceId: "ical-2",
      provider: "booking",
      status: "confirmed",
      startsAt: "2026-05-05",
      endsAt: "2026-05-10",
      rawSummary: "Ignored Res",
      guestName: "Ignored Guest",
      guestCount: 1,
      externalEventKey: "k3",
      externalUid: "u3",
    },
  ];

  const effectiveStaysMap = new Map<string, RentalStay>([
    [
      "res-paid",
      {
        id: "res-paid",
        apartmentId: "apt-101",
        apartmentName: "Apto 101 Vista Mar",
        ownerId: "owner-1",
        ownerName: "Mariana Alencar",
        checkIn: "2026-05-05",
        checkOut: "2026-05-10",
        rentAmountCents: 200000, // R$ 2.000,00
        currency: "BRL",
      },
    ],
    // res-zero-rent has no stay mapped -> zero payment handling
  ]);

  const periodEntries: FinancialEntry[] = [
    {
      id: "entry-clean-res-paid",
      apartmentId: "apt-101",
      apartmentName: "Apto 101 Vista Mar",
      ownerId: "owner-1",
      ownerName: "Mariana Alencar",
      rentalStayId: "res-paid",
      type: "expense",
      category: "Limpeza Check-out",
      amountCents: 15000, // R$ 150,00
      currency: "BRL",
      occurredOn: "2026-05-10",
    },
    {
      id: "entry-maintenance",
      apartmentId: "apt-101",
      apartmentName: "Apto 101 Vista Mar",
      ownerId: "owner-1",
      ownerName: "Mariana Alencar",
      type: "expense",
      category: "Manutenção Fechadura",
      amountCents: 25000, // R$ 250,00 general expense (not tied to reservation)
      currency: "BRL",
      occurredOn: "2026-05-18",
    },
    {
      id: "entry-late-checkout-rev",
      apartmentId: "apt-101",
      apartmentName: "Apto 101 Vista Mar",
      ownerId: "owner-1",
      ownerName: "Mariana Alencar",
      type: "revenue",
      category: "Taxa Late Check-out",
      amountCents: 10000, // R$ 100,00 extra revenue
      currency: "BRL",
      occurredOn: "2026-05-20",
    },
    {
      id: "entry-other-apt",
      apartmentId: "apt-999",
      apartmentName: "Outro Apto",
      ownerId: "owner-2",
      ownerName: "Outro",
      type: "expense",
      category: "Taxa",
      amountCents: 50000,
      currency: "BRL",
      occurredOn: "2026-05-10",
    },
  ];

  it("calculates gross revenue, commission, stay expenses, and net payout correctly", () => {
    const data = buildOwnerStatementData({
      apartment,
      periodReservations,
      periodEntries,
      effectiveStaysMap,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });

    expect(data.commissionPercent).toBe(20);
    expect(data.items).toHaveLength(2); // Only apt-101 reservations

    // Item 1: res-paid
    const item1 = data.items[0];
    expect(item1.id).toBe("res-paid");
    expect(item1.rentAmountCents).toBe(200000);
    // 20% of 200000 = 40000
    expect(item1.commissionCents).toBe(40000);
    expect(item1.linkedExpenses).toHaveLength(1);
    // totalExpensesCents = commission (40000) + linkedExpense (15000) = 55000
    expect(item1.totalExpensesCents).toBe(55000);

    // Item 2: res-zero-rent (zero-payment handling)
    const item2 = data.items[1];
    expect(item2.id).toBe("res-zero-rent");
    expect(item2.rentAmountCents).toBe(0);
    expect(item2.commissionCents).toBe(0);
    expect(item2.totalExpensesCents).toBe(0);

    // Revenues
    expect(data.stayGrossCents).toBe(200000);
    expect(data.extraRevenueCents).toBe(10000);
    expect(data.totalGrossCents).toBe(210000); // 200000 + 10000

    // Expenses
    expect(data.totalCommissionCents).toBe(40000);
    expect(data.totalStayExpensesCents).toBe(55000);
    expect(data.totalOtherExpensesCents).toBe(25000); // entry-maintenance
    expect(data.totalDueCents).toBe(80000); // 55000 + 25000

    // Net Payout = 210000 - 80000 = 130000
    expect(data.netPayoutCents).toBe(130000);
  });

  it("handles undefined apartment gracefully", () => {
    const data = buildOwnerStatementData({
      apartment: undefined,
      periodReservations,
      periodEntries,
      effectiveStaysMap,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });

    expect(data.items).toEqual([]);
    expect(data.totalGrossCents).toBe(0);
    expect(data.totalDueCents).toBe(0);
    expect(data.netPayoutCents).toBe(0);
    expect(data.commissionPercent).toBe(15);
  });
});

describe("buildWhatsAppOwnerSummary", () => {
  const statementSample: OwnerStatementData = {
    items: [
      {
        id: "res-1",
        index: 1,
        guestName: "Roberto Justus",
        period: "05/05/2026 a 10/05/2026",
        rentAmountCents: 150000,
        commissionCents: 30000,
        linkedExpenses: [],
        totalExpensesCents: 30000,
      },
    ],
    otherExpenses: [],
    otherRevenues: [],
    stayGrossCents: 150000,
    extraRevenueCents: 0,
    totalGrossCents: 150000,
    totalCommissionCents: 30000,
    totalStayExpensesCents: 30000,
    totalOtherExpensesCents: 10000,
    totalDueCents: 40000,
    netPayoutCents: 110000,
    commissionPercent: 20,
  };

  it("formats Brazilian Portuguese summary with apartment, owner, reservations, and totals", () => {
    const summary = buildWhatsAppOwnerSummary({
      apartmentName: "Loft Copacabana 402",
      ownerName: "Mariana Alencar",
      periodLabel: "01/05/2026 a 31/05/2026",
      statement: statementSample,
    });

    const normalized = normalizeSpaces(summary);

    expect(normalized).toContain("*Resumo Financeiro - Loft Copacabana 402*");
    expect(normalized).toContain("Proprietário: Mariana Alencar");
    expect(normalized).toContain("Período: 01/05/2026 a 31/05/2026");
    expect(normalized).toContain("*Reservas (1):*");
    expect(normalized).toContain(
      "• Roberto Justus (05/05/2026 a 10/05/2026): R$ 1.500,00",
    );
    expect(normalized).toContain("*Receitas:* R$ 1.500,00");
    expect(normalized).toContain("*Despesas:* R$ 400,00");
    expect(normalized).toContain("Comissão (20%): R$ 300,00");
    expect(normalized).toContain("*Saldo líquido:* R$ 1.100,00");
  });

  it("handles empty reservations and omission of owner name gracefully", () => {
    const emptyStatement: OwnerStatementData = {
      ...statementSample,
      items: [],
      stayGrossCents: 0,
      totalGrossCents: 0,
      totalCommissionCents: 0,
      totalStayExpensesCents: 0,
      totalDueCents: 0,
      netPayoutCents: 0,
    };

    const summary = buildWhatsAppOwnerSummary({
      apartmentName: undefined,
      ownerName: undefined,
      periodLabel: "01/06/2026 a 30/06/2026",
      statement: emptyStatement,
    });

    const normalized = normalizeSpaces(summary);

    expect(normalized).toContain("*Resumo Financeiro - Imóveis*");
    expect(normalized).not.toContain("Proprietário:");
    expect(normalized).toContain("Reservas: Nenhuma reserva no período.");
    expect(normalized).toContain("*Receitas:* R$ 0,00");
    expect(normalized).toContain("*Despesas:* R$ 0,00");
    // Commission line omitted when totalCommissionCents is 0
    expect(normalized).not.toContain("Comissão");
    expect(normalized).toContain("*Saldo líquido:* R$ 0,00");
  });
});

describe("buildCleaningSchedule & buildWhatsAppCleaningSummary", () => {
  const activeReservations: ReservationListItem[] = [
    {
      id: "res-1",
      apartmentId: "apt-1",
      apartmentName: "Apto 101",
      ownerName: "Dono",
      icalSourceId: "ical-1",
      provider: "airbnb",
      status: "confirmed",
      startsAt: "2026-05-01",
      endsAt: "2026-05-05",
      rawSummary: "Alice",
      guestName: "Alice",
      guestCount: 2,
      externalEventKey: "k1",
      externalUid: "u1",
    },
    {
      id: "res-2",
      apartmentId: "apt-2",
      apartmentName: "Apto 202",
      ownerName: "Dono",
      icalSourceId: "ical-2",
      provider: "booking",
      status: "confirmed",
      startsAt: "2026-05-02",
      endsAt: "2026-05-08",
      rawSummary: "Bob",
      guestName: "Bob",
      guestCount: 1,
      externalEventKey: "k2",
      externalUid: "u2",
    },
  ];

  const entries: FinancialEntry[] = [
    {
      id: "clean-1",
      apartmentId: "apt-1",
      apartmentName: "Apto 101",
      ownerId: "o1",
      ownerName: "Dono",
      rentalStayId: "res-1",
      type: "expense",
      category: "Limpeza Faxina",
      amountCents: 18000,
      currency: "BRL",
      occurredOn: "2026-05-05",
    },
  ];

  it("builds check-out cleaning schedule sorted by checkout date", () => {
    const schedule = buildCleaningSchedule(
      activeReservations,
      entries,
      "2026-05-01",
      "2026-05-10",
    );
    expect(schedule).toHaveLength(2);
    expect(schedule[0].guestName).toBe("Alice");
    expect(schedule[0].cleaningFeeCents).toBe(18000);
    expect(schedule[1].guestName).toBe("Bob");
    expect(schedule[1].cleaningFeeCents).toBeNull();
  });

  it("formats WhatsApp cleaning summary checklist", () => {
    const schedule = buildCleaningSchedule(
      activeReservations,
      entries,
      "2026-05-01",
      "2026-05-10",
    );
    const summary = buildWhatsAppCleaningSummary(
      "01/05/2026 a 10/05/2026",
      schedule,
    );
    const normalized = normalizeSpaces(summary);

    expect(normalized).toContain("*Escala de Limpeza*");
    expect(normalized).toContain("Período: 01/05/2026 a 10/05/2026");
    expect(normalized).toContain("05/05/2026 (10:00) — *Apto 101* | Alice • R$ 180,00");
    expect(normalized).toContain("08/05/2026 (10:00) — *Apto 202* | Bob");
  });

  it("returns fallback message when cleaning checklist is empty", () => {
    const summary = buildWhatsAppCleaningSummary("01/06/2026 a 07/06/2026", []);
    expect(summary).toContain("Nenhum check-out previsto no período.");
  });
});

describe("buildGatekeeperSchedule & buildWhatsAppGatekeeperSummary", () => {
  const reservations: ReservationListItem[] = [
    {
      id: "res-1",
      apartmentId: "apt-1",
      apartmentName: "Apto 303",
      ownerName: "Dono",
      icalSourceId: "ical-1",
      provider: "airbnb",
      status: "confirmed",
      startsAt: "2026-05-10",
      endsAt: "2026-05-15",
      rawSummary: "Clarice",
      guestName: "Clarice Lispector",
      guestCount: 1,
      externalEventKey: "k1",
      externalUid: "u1",
    },
    {
      id: "res-2",
      apartmentId: "apt-1",
      apartmentName: "Apto 303",
      ownerName: "Dono",
      icalSourceId: "ical-1",
      provider: "airbnb",
      status: "confirmed",
      startsAt: "2026-05-16",
      endsAt: "2026-05-20",
      rawSummary: "Machado",
      guestName: "Machado de Assis",
      guestCount: 4,
      externalEventKey: "k2",
      externalUid: "u2",
    },
  ];

  it("builds gatekeeper schedule with guest count labels", () => {
    const list = buildGatekeeperSchedule(reservations);
    expect(list).toHaveLength(2);
    expect(list[0].guestCountLabel).toBe("1 pessoa");
    expect(list[1].guestCountLabel).toBe("4 pessoas");
  });

  it("formats WhatsApp gatekeeper message", () => {
    const list = buildGatekeeperSchedule(reservations);
    const summary = buildWhatsAppGatekeeperSummary(
      "10/05/2026 a 20/05/2026",
      list,
    );
    expect(summary).toContain("*Escala de Portaria & Acesso*");
    expect(summary).toContain(
      "• *Apto 303* — Clarice Lispector (1 pessoa) | 10/05/2026 a 15/05/2026",
    );
    expect(summary).toContain(
      "• *Apto 303* — Machado de Assis (4 pessoas) | 16/05/2026 a 20/05/2026",
    );
  });

  it("handles empty reception list", () => {
    const summary = buildWhatsAppGatekeeperSummary(
      "01/06/2026 a 05/06/2026",
      [],
    );
    expect(summary).toContain("Nenhuma hospedagem encontrada no período.");
  });
});
