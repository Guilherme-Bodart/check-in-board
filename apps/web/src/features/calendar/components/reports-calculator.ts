import type { Apartment, FinancialEntry, RentalStay } from "../../../api";
import { formatMoney } from "../../finance/money";
import {
  filterActiveReservations,
  formatDateBR,
  reservationLocalDate,
  type ReservationListItem,
} from "../../reservations/reservation-view-model";

export { filterActiveReservations };

export type ReportType =
  | "owner-statement"
  | "cleaning-schedule"
  | "building-reception";

export type PeriodPreset = "last-month" | "last-week" | "selected-month";

export type PeriodPresetInput =
  | PeriodPreset
  | "current_month"
  | "last_month"
  | "last_week";

export type PeriodRange = {
  dateFrom: string;
  dateTo: string;
  label: string;
};

export type OwnerStatementReservationItem = {
  id: string;
  index: number;
  guestName: string;
  period: string;
  rentAmountCents: number;
  commissionCents: number;
  linkedExpenses: FinancialEntry[];
  totalExpensesCents: number;
};

export type OwnerStatementData = {
  items: OwnerStatementReservationItem[];
  otherExpenses: FinancialEntry[];
  otherRevenues: FinancialEntry[];
  stayGrossCents: number;
  extraRevenueCents: number;
  totalGrossCents: number;
  totalCommissionCents: number;
  totalStayExpensesCents: number;
  totalOtherExpensesCents: number;
  totalDueCents: number;
  netPayoutCents: number;
  commissionPercent: number;
};

export type CleaningScheduleItem = {
  id: string;
  sortDate: string;
  apartmentName: string;
  checkoutDate: string;
  checkoutTime: string;
  guestName: string;
  cleaningFeeCents: number | null;
  provider: ReservationListItem["provider"];
};

export type GatekeeperScheduleItem = {
  id: string;
  apartmentName: string;
  guestName: string;
  guestCountLabel: string;
  checkInDate: string;
  checkOutDate: string;
};

export type BuildWhatsAppOwnerSummaryInput = {
  apartmentName?: string;
  ownerName?: string;
  periodLabel: string;
  statement: OwnerStatementData;
};

export function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d + deltaDays, 12);
  return toLocalYmd(date);
}

/**
 * Computes `{ dateFrom, dateTo, label }` for the selected report period preset.
 */
export function computePeriodRange(
  preset: PeriodPresetInput,
  month?: string,
  referenceDate: Date = new Date(),
): PeriodRange {
  if (preset === "last-month" || preset === "last_month") {
    const start = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
      12,
    );
    const end = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      0,
      12,
    );
    const dateFrom = toLocalYmd(start);
    const dateTo = toLocalYmd(end);
    return {
      dateFrom,
      dateTo,
      label: `${formatDateBR(dateFrom)} a ${formatDateBR(dateTo)}`,
    };
  }

  if (preset === "last-week" || preset === "last_week") {
    // Previous Monday through Sunday (7-day operational week)
    const dayOfWeekMon0 = (referenceDate.getDay() + 6) % 7;
    const end = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - (dayOfWeekMon0 + 1),
      12,
    );
    const start = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate() - 6,
      12,
    );
    const dateFrom = toLocalYmd(start);
    const dateTo = toLocalYmd(end);
    return {
      dateFrom,
      dateTo,
      label: `${formatDateBR(dateFrom)} a ${formatDateBR(dateTo)}`,
    };
  }

  const fallbackMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  const validMonth =
    preset === "selected-month" && month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : fallbackMonth;
  const [year, m] = validMonth.split("-").map(Number);
  const start = new Date(year, m - 1, 1, 12);
  const end = new Date(year, m, 0, 12);
  const dateFrom = toLocalYmd(start);
  const dateTo = toLocalYmd(end);

  return {
    dateFrom,
    dateTo,
    label: `${formatDateBR(dateFrom)} a ${formatDateBR(dateTo)}`,
  };
}

export function buildEffectiveStaysMap(
  rentalStaysMap: Map<string, RentalStay>,
  periodRentalStays: RentalStay[] | null,
): Map<string, RentalStay> {
  const map = new Map<string, RentalStay>(rentalStaysMap);
  if (periodRentalStays) {
    for (const stay of periodRentalStays) {
      map.set(stay.id, stay);
    }
  }
  return map;
}

export function filterPeriodReservations(
  activeReservations: ReservationListItem[],
  dateFrom: string,
  dateTo: string,
): ReservationListItem[] {
  return activeReservations
    .filter((res) => {
      const startYmd = reservationLocalDate(res.startsAt);
      const endYmd = reservationLocalDate(res.endsAt);
      return startYmd <= dateTo && endYmd > dateFrom;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function getApartmentCommissionPercent(apartment?: Apartment): number {
  if (!apartment) return 15;
  return (apartment.managementCommissionBps ?? 1500) / 100;
}

/**
 * Calculates the financial statement for a single apartment within a date range.
 */
export function buildOwnerStatementData(params: {
  apartment?: Apartment;
  periodReservations: ReservationListItem[];
  periodEntries: FinancialEntry[];
  effectiveStaysMap: Map<string, RentalStay>;
  dateFrom: string;
  dateTo: string;
}): OwnerStatementData {
  const {
    apartment,
    periodReservations,
    periodEntries,
    effectiveStaysMap,
    dateFrom,
    dateTo,
  } = params;

  const commissionPercent = getApartmentCommissionPercent(apartment);
  const aptReservations = apartment
    ? periodReservations.filter((res) => res.apartmentId === apartment.id)
    : [];

  const aptEntries = apartment
    ? periodEntries.filter(
        (entry) =>
          entry.apartmentId === apartment.id &&
          entry.occurredOn >= dateFrom &&
          entry.occurredOn <= dateTo,
      )
    : [];

  const matchedReservationIds = new Set(aptReservations.map((r) => r.id));

  const items: OwnerStatementReservationItem[] = aptReservations.map(
    (res, index) => {
      const stay = effectiveStaysMap.get(res.id);
      const rentAmountCents = stay?.rentAmountCents || 0;
      const commissionCents = Math.round(
        (rentAmountCents * commissionPercent) / 100,
      );
      const linkedExpenses = aptEntries.filter(
        (entry) => entry.type === "expense" && entry.rentalStayId === res.id,
      );
      const linkedExpensesCents = linkedExpenses.reduce(
        (acc, entry) => acc + entry.amountCents,
        0,
      );

      return {
        id: res.id,
        index: index + 1,
        guestName: res.guestName || res.rawSummary || "Hóspede",
        period: `${formatDateBR(res.startsAt)} a ${formatDateBR(res.endsAt)}`,
        rentAmountCents,
        commissionCents,
        linkedExpenses,
        totalExpensesCents: commissionCents + linkedExpensesCents,
      };
    },
  );

  const otherExpenses = aptEntries.filter(
    (entry) =>
      entry.type === "expense" &&
      (!entry.rentalStayId || !matchedReservationIds.has(entry.rentalStayId)),
  );

  const otherRevenues = aptEntries.filter(
    (entry) =>
      entry.type === "revenue" &&
      (!entry.rentalStayId || !matchedReservationIds.has(entry.rentalStayId)),
  );

  const stayGrossCents = items.reduce(
    (acc, curr) => acc + curr.rentAmountCents,
    0,
  );
  const extraRevenueCents = otherRevenues.reduce(
    (acc, curr) => acc + curr.amountCents,
    0,
  );
  const totalGrossCents = stayGrossCents + extraRevenueCents;

  const totalCommissionCents = items.reduce(
    (acc, curr) => acc + curr.commissionCents,
    0,
  );
  const totalStayExpensesCents = items.reduce(
    (acc, curr) => acc + curr.totalExpensesCents,
    0,
  );
  const totalOtherExpensesCents = otherExpenses.reduce(
    (acc, curr) => acc + curr.amountCents,
    0,
  );
  const totalDueCents = totalStayExpensesCents + totalOtherExpensesCents;
  const netPayoutCents = totalGrossCents - totalDueCents;

  return {
    items,
    otherExpenses,
    otherRevenues,
    stayGrossCents,
    extraRevenueCents,
    totalGrossCents,
    totalCommissionCents,
    totalStayExpensesCents,
    totalOtherExpensesCents,
    totalDueCents,
    netPayoutCents,
    commissionPercent,
  };
}

/**
 * Builds the check-out cleaning schedule sorted chronologically.
 */
export function buildCleaningSchedule(
  activeReservations: ReservationListItem[],
  periodEntries: FinancialEntry[],
  dateFrom: string,
  dateTo: string,
): CleaningScheduleItem[] {
  return activeReservations
    .filter((res) => {
      const endYmd = reservationLocalDate(res.endsAt);
      return endYmd >= dateFrom && endYmd <= dateTo;
    })
    .map((res) => {
      const endYmd = reservationLocalDate(res.endsAt);
      const cleaningEntries = periodEntries.filter(
        (entry) =>
          entry.type === "expense" &&
          entry.rentalStayId === res.id &&
          entry.category.toLowerCase().includes("limpeza"),
      );
      const cleaningFeeCents =
        cleaningEntries.length > 0
          ? cleaningEntries.reduce((sum, entry) => sum + entry.amountCents, 0)
          : null;

      return {
        id: res.id,
        sortDate: endYmd,
        apartmentName: res.apartmentName,
        checkoutDate: formatDateBR(res.endsAt),
        checkoutTime: "10:00",
        guestName: res.guestName || res.rawSummary || "Hóspede",
        cleaningFeeCents,
        provider: res.provider,
      };
    })
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

/**
 * Builds the gatekeeper / building reception guest access list.
 */
export function buildGatekeeperSchedule(
  periodReservations: ReservationListItem[],
): GatekeeperScheduleItem[] {
  return periodReservations.map((res) => {
    const guestCount = res.guestCount && res.guestCount > 0 ? res.guestCount : 1;
    return {
      id: res.id,
      apartmentName: res.apartmentName,
      guestName: res.guestName || res.rawSummary || "Hóspede",
      guestCountLabel: guestCount === 1 ? "1 pessoa" : `${guestCount} pessoas`,
      checkInDate: formatDateBR(res.startsAt),
      checkOutDate: formatDateBR(res.endsAt),
    };
  });
}

/**
 * Formats a concise Portuguese financial summary ready to paste into WhatsApp.
 */
export function buildWhatsAppOwnerSummary({
  apartmentName,
  ownerName,
  periodLabel,
  statement,
}: BuildWhatsAppOwnerSummaryInput): string {
  const target = apartmentName?.trim() || "Imóveis";
  const lines: string[] = [
    `*Resumo Financeiro - ${target}*`,
    ...(ownerName?.trim() ? [`Proprietário: ${ownerName.trim()}`] : []),
    `Período: ${periodLabel}`,
    "",
  ];

  if (statement.items.length === 0) {
    lines.push("Reservas: Nenhuma reserva no período.");
  } else {
    lines.push(`*Reservas (${statement.items.length}):*`);
    for (const item of statement.items) {
      lines.push(
        `• ${item.guestName} (${item.period}): ${formatMoney(item.rentAmountCents)}`,
      );
    }
  }

  lines.push("");
  lines.push(`*Receitas:* ${formatMoney(statement.totalGrossCents)}`);
  lines.push(`*Despesas:* ${formatMoney(statement.totalDueCents)}`);

  if (statement.totalCommissionCents > 0) {
    lines.push(
      `Comissão (${statement.commissionPercent}%): ${formatMoney(statement.totalCommissionCents)}`,
    );
  }

  lines.push(`*Saldo líquido:* ${formatMoney(statement.netPayoutCents)}`);

  return lines.join("\n");
}

/**
 * Formats the cleaning schedule as a WhatsApp-friendly checklist.
 */
export function buildWhatsAppCleaningSummary(
  periodLabel: string,
  items: CleaningScheduleItem[],
): string {
  const lines: string[] = [
    "*Escala de Limpeza*",
    `Período: ${periodLabel}`,
    "",
  ];

  if (items.length === 0) {
    lines.push("Nenhum check-out previsto no período.");
    return lines.join("\n");
  }

  for (const item of items) {
    const fee =
      item.cleaningFeeCents !== null
        ? ` • ${formatMoney(item.cleaningFeeCents)}`
        : "";
    lines.push(
      `• ${item.checkoutDate} (${item.checkoutTime}) — *${item.apartmentName}* | ${item.guestName}${fee}`,
    );
  }

  return lines.join("\n");
}

/**
 * Formats the building reception schedule as a WhatsApp-friendly message.
 */
export function buildWhatsAppGatekeeperSummary(
  periodLabel: string,
  items: GatekeeperScheduleItem[],
): string {
  const lines: string[] = [
    "*Escala de Portaria & Acesso*",
    `Período: ${periodLabel}`,
    "",
  ];

  if (items.length === 0) {
    lines.push("Nenhuma hospedagem encontrada no período.");
    return lines.join("\n");
  }

  for (const item of items) {
    lines.push(
      `• *${item.apartmentName}* — ${item.guestName} (${item.guestCountLabel}) | ${item.checkInDate} a ${item.checkOutDate}`,
    );
  }

  return lines.join("\n");
}
