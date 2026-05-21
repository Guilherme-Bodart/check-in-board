package com.checkinboard.backend.modules.health;

import java.time.Instant;

public record HealthResponse(String service, String status, Instant timestamp) {}
