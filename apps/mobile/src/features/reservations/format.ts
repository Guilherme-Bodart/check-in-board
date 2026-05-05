export function formatReservationPeriod(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(new Date(startsAt))} -> ${formatter.format(
    new Date(endsAt),
  )}`;
}
