package com.checkinboard.backend.modules.apartments.dto;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import jakarta.validation.constraints.NotBlank;
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
