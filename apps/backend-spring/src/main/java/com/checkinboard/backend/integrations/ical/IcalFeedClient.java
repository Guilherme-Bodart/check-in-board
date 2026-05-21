package com.checkinboard.backend.integrations.ical;

import com.checkinboard.backend.config.AppProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Component;

@Component
public class IcalFeedClient {

    private static final int MIN_BACKOFF_MILLIS = 120;
    private static final int BACKOFF_JITTER_MILLIS = 180;

    private final HttpClient httpClient;
    private final Duration timeout;
    private final int maxAttempts;

    public IcalFeedClient(AppProperties appProperties) {
        timeout = Duration.ofSeconds(Math.max(1, appProperties.icalFetchTimeoutSeconds()));
        maxAttempts = Math.max(1, appProperties.icalFetchMaxAttempts());
        httpClient = HttpClient
            .newBuilder()
            .connectTimeout(timeout)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    public String fetch(URI uri) {
        IcalFeedFetchException lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return fetchOnce(uri);
            } catch (IcalFeedFetchException exception) {
                lastException = exception;

                if (attempt < maxAttempts) {
                    sleepBeforeRetry();
                }
            }
        }

        throw lastException != null
            ? lastException
            : new IcalFeedFetchException("iCal feed could not be fetched.");
    }

    private String fetchOnce(URI uri) {
        HttpRequest request = HttpRequest
            .newBuilder(uri)
            .timeout(timeout)
            .header("Accept", "text/calendar,text/plain,*/*")
            .GET()
            .build();

        try {
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            int status = response.statusCode();

            if (status >= 200 && status < 300) {
                return response.body();
            }

            if (status >= 300 && status < 400) {
                throw new IcalFeedFetchException("iCal feed redirects are not allowed.");
            }

            throw new IcalFeedFetchException("iCal feed returned HTTP " + status + ".");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IcalFeedFetchException("iCal feed fetch was interrupted.", exception);
        } catch (IOException exception) {
            throw new IcalFeedFetchException("iCal feed could not be fetched.", exception);
        }
    }

    private void sleepBeforeRetry() {
        int delayMillis =
            MIN_BACKOFF_MILLIS +
            ThreadLocalRandom.current().nextInt(BACKOFF_JITTER_MILLIS + 1);

        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IcalFeedFetchException("iCal feed fetch was interrupted.", exception);
        }
    }
}
