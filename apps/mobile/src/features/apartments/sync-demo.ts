type DemoIcalReservationInput = {
  endsAt: Date;
  startsAt: Date;
  summary: string;
  uid: string;
};

function toIcalUtcDate(date: Date) {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(".000", "");
}

export function createDemoIcalText({
  endsAt,
  startsAt,
  summary,
  uid,
}: DemoIcalReservationInput) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Check-In Board//Demo Sync//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${toIcalUtcDate(startsAt)}`,
    `DTEND:${toIcalUtcDate(endsAt)}`,
    `SUMMARY:${summary}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
