package com.checkinboard.backend.integrations.ical;

import java.io.StringReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.List;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.component.VEvent;
import org.springframework.stereotype.Component;

@Component
public class IcalReservationParser {

    public List<ParsedIcalReservation> parse(String icsText) {
        try {
            Calendar calendar = new CalendarBuilder().build(new StringReader(icsText));
            List<ParsedIcalReservation> reservations = new ArrayList<>();
            List<VEvent> events = calendar.getComponents(VEvent.VEVENT);

            for (int index = 0; index < events.size(); index++) {
                VEvent event = events.get(index);
                String uid = event.getUid().map(property -> property.getValue()).orElse(null);
                String summary = event.getSummary() != null
                    ? event.getSummary().getValue()
                    : null;
                Instant startsAt = toInstant(event.getStartDate().get().getDate());
                Instant endsAt = toInstant(event.getEndDate().get().getDate());
                String externalEventKey = uid != null
                    ? uid
                    : startsAt + "-" + endsAt + "-" + index;

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
                        )
                    )
                );
            }

            return reservations;
        } catch (Exception exception) {
            throw new IcalReservationParserException("Invalid iCal payload.", exception);
        }
    }

    private String jsonString(String value) {
        if (value == null) {
            return "null";
        }

        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private Instant toInstant(Temporal temporal) {
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
            return localDateTime.toInstant(ZoneOffset.UTC);
        }

        if (temporal instanceof LocalDate localDate) {
            return localDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        }

        return Instant.parse(temporal.toString());
    }
}
