package com.checkinboard.backend.modules.owners.dto;

import com.checkinboard.backend.modules.owners.model.OwnerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class OwnerDtos {

    private OwnerDtos() {}

    public record CreateOwnerRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull OwnerType type,
        @Size(max = 160) String contactName,
        @Email @Size(max = 180) String email,
        @Size(max = 60) String phone,
        @Size(max = 2000) String notes,
        @Min(0) @Max(10000) Integer defaultCommissionBps
    ) {}

    public record UpdateOwnerRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull OwnerType type,
        @Size(max = 160) String contactName,
        @Email @Size(max = 180) String email,
        @Size(max = 60) String phone,
        @Size(max = 2000) String notes,
        @Min(0) @Max(10000) Integer defaultCommissionBps
    ) {}

    public record OwnerResponse(
        String id,
        String organizationId,
        String name,
        OwnerType type,
        String contactName,
        String email,
        String phone,
        String notes,
        long apartmentCount,
        int defaultCommissionBps
    ) {}

    public record OwnerEnvelope(OwnerResponse owner) {}

    public record OwnersResponse(List<OwnerResponse> owners) {}
}
