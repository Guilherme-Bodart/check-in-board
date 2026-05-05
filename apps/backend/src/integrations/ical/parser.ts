import ICAL from "ical.js";

export type ParsedIcalReservation = {
  externalEventKey: string;
  externalUid: string | null;
  startsAt: Date;
  endsAt: Date;
  rawSummary: string | null;
  rawPayload: {
    uid: string | null;
    summary: string | null;
  };
};

export function parseIcalReservations(icsText: string): ParsedIcalReservation[] {
  const calendar = new ICAL.Component(ICAL.parse(icsText));
  const events = calendar.getAllSubcomponents("vevent");

  return events.map((component, index) => {
    const event = new ICAL.Event(component);
    const uid = event.uid || null;
    const summary = event.summary || null;
    const startsAt = event.startDate.toJSDate();
    const endsAt = event.endDate.toJSDate();

    return {
      endsAt,
      externalEventKey:
        uid ?? `${startsAt.toISOString()}-${endsAt.toISOString()}-${index}`,
      externalUid: uid,
      rawPayload: {
        summary,
        uid,
      },
      rawSummary: summary,
      startsAt,
    };
  });
}
