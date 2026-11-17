package com.checkinboard.backend.integrations.ical;

import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.component.VEvent;
import org.springframework.stereotype.Component;

@Component
public class IcalReservationParser {

    public List<ParsedIcalReservation> parse(String icsText, ZoneId defaultZone) {
        try {
            Calendar calendar = new CalendarBuilder().build(new StringReader(icsText));
            List<ParsedIcalReservation> reservations = new ArrayList<>();
            List<VEvent> events = calendar.getComponents(VEvent.VEVENT);

            for (VEvent event : events) {
                var startProperty = event.getStartDate().orElse(null);
                if (startProperty == null || startProperty.getDate() == null) {
                    continue;
                }

                Temporal startTemporal = startProperty.getDate();
                Instant startsAt = toInstant(startTemporal, defaultZone);
                Instant endsAt = resolveEndsAt(event, startTemporal, startsAt, defaultZone);
                if (endsAt == null || !endsAt.isAfter(startsAt)) {
                    continue;
                }

                String uid = event
                    .getUid()
                    .map(Property::getValue)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .orElse(null);
                String summary = event.getSummary() != null
                    ? event.getSummary().getValue()
                    : null;
                boolean cancelled = event
                    .getProperty("STATUS")
                    .map(property -> "CANCELLED".equalsIgnoreCase(property.getValue()))
                    .orElse(false);
                String externalEventKey = uid != null
                    ? uid
                    : fallbackEventKey(startsAt, endsAt, summary);

                reservations.add(
                    new ParsedIcalReservation(
                        externalEventKey,
                        uid,
                        startsAt,
                        endsAt,
                        summary,
                        "{\"uid\":%s,\"summary\":%s}".formatted(
                            jsonString(uid),
                            jsonString(summary)
                        ),
                        cancelled
                    )
                );
            }

            return reservations;
        } catch (Exception exception) {
            throw new IcalReservationParserException("Invalid iCal payload.", exception);
        }
    }

    private Instant resolveEndsAt(
        VEvent event,
        Temporal startTemporal,
        Instant startsAt,
        ZoneId defaultZone
    ) {
        var endProperty = event.getEndDate().orElse(null);
        if (endProperty != null && endProperty.getDate() != null) {
            return toInstant(endProperty.getDate(), defaultZone);
        }

        String durationValue = event
            .getProperty("DURATION")
            .map(Property::getValue)
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .orElse(null);
        if (durationValue == null) {
            return null;
        }

        return applyDuration(startTemporal, startsAt, durationValue, defaultZone);
    }

    private Instant applyDuration(
        Temporal startTemporal,
        Instant startsAt,
        String durationValue,
        ZoneId defaultZone
    ) {
        try {
            if (!durationValue.contains("T")) {
                Period period = Period.parse(durationValue);
                if (startTemporal instanceof LocalDate localDate) {
                    return localDate.plus(period).atStartOfDay(defaultZone).toInstant();
                }
                return startsAt.atZone(defaultZone).plus(period).toInstant();
            }

            if (durationValue.startsWith("PT") || durationValue.startsWith("-PT") || durationValue.startsWith("+PT")) {
                return startsAt.plus(Duration.parse(durationValue));
            }

            int timeSeparatorIndex = durationValue.indexOf('T');
            String datePart = durationValue.substring(0, timeSeparatorIndex);
            String timePart = "PT" + durationValue.substring(timeSeparatorIndex + 1);
            ZonedDateTime zoned = startsAt
                .atZone(defaultZone)
                .plus(Period.parse(datePart));
            return zoned.toInstant().plus(Duration.parse(timePart));
        } catch (Exception exception) {
            return null;
        }
    }

    private String fallbackEventKey(Instant startsAt, Instant endsAt, String summary) {
        String fingerprint = startsAt + "|" + endsAt + "|" + Objects.toString(summary, "").trim();
        return "anon-" + UUID.nameUUIDFromBytes(fingerprint.getBytes(StandardCharsets.UTF_8));
    }

    private String jsonString(String value) {
        if (value == null) {
            return "null";
        }

        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private Instant toInstant(Temporal temporal, ZoneId defaultZone) {
        if (temporal instanceof Instant instant) {
            return instant;
        }

        if (temporal instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime.toInstant();
        }

        if (temporal instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }

        if (temporal instanceof LocalDateTime localDateTime) {
            return localDateTime.atZone(defaultZone).toInstant();
        }

        if (temporal instanceof LocalDate localDate) {
            return localDate.atStartOfDay(defaultZone).toInstant();
        }

        return Instant.parse(temporal.toString());
    }
}
