package com.checkinboard.backend.integrations.ical;

public class IcalFeedFetchException extends RuntimeException {

    public IcalFeedFetchException(String message) {
        super(message);
    }

    public IcalFeedFetchException(String message, Throwable cause) {
        super(message, cause);
    }
}
