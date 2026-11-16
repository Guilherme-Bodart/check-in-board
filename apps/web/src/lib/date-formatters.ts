export function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function currentMonthInput(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function addMonths(month: string, amount: number): string {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const date = new Date(Date.UTC(yearValue, monthValue - 1 + amount, 1));
  const year = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${nextMonth}`;
}

export function addDays(date: string, amount: number): string {
  const [yearValue, monthValue, dayValue] = date.slice(0, 10).split("-").map(Number);
  const nextDate = new Date(Date.UTC(yearValue, monthValue - 1, dayValue + amount));
  return nextDate.toISOString().slice(0, 10);
}

export function monthRange(
  month: string,
): { monthStart: string; nextMonth: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const monthStart = `${month}-01`;
  const nextMonth = `${addMonths(month, 1)}-01`;
  return { monthStart, nextMonth };
}

export function formatDateBR(value: string): string {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatIsoDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function formatReservationDateRange(startsAt: string, endsAt: string) {
  return `${formatIsoDateOnly(startsAt)} - ${formatIsoDateOnly(endsAt)}`;
}
