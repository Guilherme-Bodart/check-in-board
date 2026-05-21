package com.checkinboard.backend.integrations.ical;

import java.time.Instant;

public record ParsedIcalReservation(
    String externalEventKey,
    String externalUid,
    Instant startsAt,
    Instant endsAt,
    String rawSummary,
    String rawPayload
) {}
