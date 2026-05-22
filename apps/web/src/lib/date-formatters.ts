export function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
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
