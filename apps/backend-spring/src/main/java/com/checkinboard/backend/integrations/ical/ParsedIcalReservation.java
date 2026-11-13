package com.checkinboard.backend.integrations.ical;

import java.time.Instant;

public record ParsedIcalReservation(
    String externalEventKey,
    String externalUid,
    Instant startsAt,
    Instant endsAt,
    String rawSummary,
    String rawPayload,
    boolean cancelled
) {
    public ParsedIcalReservation(
        String externalEventKey,
        String externalUid,
        Instant startsAt,
        Instant endsAt,
        String rawSummary,
        String rawPayload
    ) {
        this(externalEventKey, externalUid, startsAt, endsAt, rawSummary, rawPayload, false);
    }
}
