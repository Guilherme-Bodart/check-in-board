package com.checkinboard.backend.modules.apartments.dto;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ApartmentDtos {

    private ApartmentDtos() {}

    public record CreateApartmentRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 120) String timezone,
        @Size(max = 64) String ownerId,
        Integer managementCommissionBps
    ) {}

    public record UpdateApartmentRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 120) String timezone,
        @Size(max = 64) String ownerId,
        Integer managementCommissionBps
    ) {}

    public record BatchImportApartmentItemRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 120) String timezone,
        @Size(max = 64) String ownerId,
        @Size(max = 160) String ownerName,
        @Size(max = 32) String ownerType,
        @Size(max = 180) String ownerEmail,
        @Size(max = 60) String ownerPhone,
        Integer managementCommissionBps
    ) {}

    public record BatchImportApartmentsRequest(
        @NotEmpty @Valid List<BatchImportApartmentItemRequest> items
    ) {}

    public record BatchImportApartmentsResponse(
        int createdCount,
        int skippedCount,
        int ownersCreatedCount,
        List<ApartmentResponse> apartments
    ) {}

    public record ApartmentMembershipResponse(
        String id,
        AuthRole role,
        boolean canManageIntegrations,
        boolean canUpdateTaskStatus,
        boolean canView
    ) {}

    public record ApartmentResponse(
        String id,
        ApartmentMembershipResponse membership,
        String name,
        String organizationId,
        ApartmentOwnerResponse owner,
        String timezone,
        int managementCommissionBps
    ) {}

    public record ApartmentOwnerResponse(String id, String name, String type) {}

    public record ApartmentEnvelope(ApartmentResponse apartment) {}

    public record ApartmentsResponse(List<ApartmentResponse> apartments) {}
}
