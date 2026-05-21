package com.checkinboard.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "check-in-board")
public record AppProperties(
    String serviceName,
    String authJwtSecret,
    String icalUrlEncryptionKey,
    boolean authPasswordResetExposeToken
) {}
