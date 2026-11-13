package com.checkinboard.backend.modules.notifications.service;

import com.checkinboard.backend.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TransactionalEmailService {

    private static final Logger log = LoggerFactory.getLogger(TransactionalEmailService.class);
    private static final URI RESEND_EMAILS_URI = URI.create("https://api.resend.com/emails");
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(5);
    private static final String DEFAULT_EMAIL_FROM = "Check-In Board <no-reply@checkinboard.local>";
    private static final String DEFAULT_APP_BASE_URL = "http://localhost:3000";

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TransactionalEmailService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(REQUEST_TIMEOUT).build();
    }

    public void sendPasswordResetEmail(String toEmail, String userName, String rawResetToken) {
        if (isBlank(toEmail) || isBlank(rawResetToken)) {
            return;
        }

        String displayName = isBlank(userName) ? "there" : userName.trim();
        String baseUrl = normalizeBaseUrl(appProperties.appBaseUrl());
        String encodedToken = URLEncoder.encode(rawResetToken, StandardCharsets.UTF_8);
        String resetUrl = baseUrl + "/reset-password?token=" + encodedToken;
        String subject = "Reset your Check-In Board password";

        String text =
            "Hi " +
            displayName +
            ",\n\n" +
            "We received a request to reset your Check-In Board password.\n" +
            "Use the link below to set a new password (valid for 30 minutes):\n" +
            resetUrl +
            "\n\n" +
            "If you did not request this, you can safely ignore this email.\n";

        String html =
            "<p>Hi " +
            escapeHtml(displayName) +
            ",</p>" +
            "<p>We received a request to reset your Check-In Board password.</p>" +
            "<p><a href=\"" +
            escapeHtml(resetUrl) +
            "\">Reset your password</a> (valid for 30 minutes)</p>" +
            "<p>If you did not request this, you can safely ignore this email.</p>";

        dispatchEmail(toEmail.trim(), subject, html, text);
    }

    public void sendTeamInviteEmail(
        String toEmail,
        String userName,
        String organizationName,
        String roleLabel
    ) {
        if (isBlank(toEmail)) {
            return;
        }

        String displayName = isBlank(userName) ? "there" : userName.trim();
        String orgName = isBlank(organizationName) ? "Check-In Board" : organizationName.trim();
        String role = isBlank(roleLabel) ? "team member" : roleLabel.trim();
        String baseUrl = normalizeBaseUrl(appProperties.appBaseUrl());
        String subject = "You were invited to " + orgName + " on Check-In Board";

        String text =
            "Hi " +
            displayName +
            ",\n\n" +
            "You have been added to " +
            orgName +
            " on Check-In Board with the role \"" +
            role +
            "\".\n" +
            "Sign in at: " +
            baseUrl +
            "\n\n" +
            "For your security, ask your administrator for your temporary password separately if needed.\n";

        String html =
            "<p>Hi " +
            escapeHtml(displayName) +
            ",</p>" +
            "<p>You have been added to <strong>" +
            escapeHtml(orgName) +
            "</strong> on Check-In Board with the role <strong>" +
            escapeHtml(role) +
            "</strong>.</p>" +
            "<p><a href=\"" +
            escapeHtml(baseUrl) +
            "\">Open Check-In Board</a></p>" +
            "<p>For your security, ask your administrator for your temporary password separately if needed.</p>";

        dispatchEmail(toEmail.trim(), subject, html, text);
    }

    private void dispatchEmail(String toEmail, String subject, String html, String text) {
        String apiKey = appProperties.resendApiKey();
        String maskedRecipient = maskEmail(toEmail);

        if (isBlank(apiKey)) {
            log.info(
                "Transactional email dry-run (RESEND_API_KEY not configured): to={}, subject=\"{}\"",
                maskedRecipient,
                subject
            );
            return;
        }

        String from = isBlank(appProperties.emailFrom())
            ? DEFAULT_EMAIL_FROM
            : appProperties.emailFrom().trim();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", from);
        payload.put("to", List.of(toEmail));
        payload.put("subject", subject);
        payload.put("html", html);
        payload.put("text", text);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest
                .newBuilder(RESEND_EMAILS_URI)
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + apiKey.trim())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() >= 400) {
                log.warn(
                    "Resend email delivery failed: status={}, to={}, subject=\"{}\"",
                    response.statusCode(),
                    maskedRecipient,
                    subject
                );
            } else {
                log.info(
                    "Transactional email sent via Resend: to={}, subject=\"{}\"",
                    maskedRecipient,
                    subject
                );
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn(
                "Transactional email interrupted: to={}, subject=\"{}\"",
                maskedRecipient,
                subject
            );
        } catch (Exception exception) {
            log.warn(
                "Transactional email dispatch error: to={}, subject=\"{}\", reason={}",
                maskedRecipient,
                subject,
                exception.getClass().getSimpleName()
            );
        }
    }

    private String normalizeBaseUrl(String baseUrl) {
        String resolved = isBlank(baseUrl) ? DEFAULT_APP_BASE_URL : baseUrl.trim();
        while (resolved.endsWith("/")) {
            resolved = resolved.substring(0, resolved.length() - 1);
        }
        return resolved;
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "***";
        }
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        String visible = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visible + "***" + domain;
    }

    private String escapeHtml(String value) {
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
