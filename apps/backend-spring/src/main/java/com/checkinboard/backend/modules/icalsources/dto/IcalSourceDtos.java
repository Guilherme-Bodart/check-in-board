package com.checkinboard.backend.modules.icalsources.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class IcalSourceDtos {

    private IcalSourceDtos() {}

    public record CreateIcalSourceRequest(
        @NotBlank @Size(max = 80) String provider,
        @NotBlank @Size(max = 120) String label,
        @NotBlank @Size(max = 2048) String icalUrl
    ) {}

    public record IcalSourceResponse(
        String id,
        String provider,
        String label,
        boolean syncEnabled,
        Instant lastSuccessAt,
        Instant lastFailureAt
    ) {}

    public record IcalSourceEnvelope(IcalSourceResponse icalSource) {}

    public record IcalSourcesResponse(List<IcalSourceResponse> icalSources) {}
}
