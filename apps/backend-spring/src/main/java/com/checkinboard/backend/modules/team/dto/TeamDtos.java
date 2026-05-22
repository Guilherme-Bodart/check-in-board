package com.checkinboard.backend.modules.team.dto;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class TeamDtos {

    private TeamDtos() {}

    public record ApartmentPermissionRequest(
        @NotBlank @Size(max = 64) String apartmentId,
        boolean canView,
        boolean canUpdateTaskStatus,
        boolean canManageIntegrations
    ) {}

    public record CreateTeamMemberRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotNull AuthRole role,
        @Valid List<ApartmentPermissionRequest> apartmentPermissions
    ) {}

    public record UpdateTeamMemberRequest(
        @NotNull AuthRole role,
        boolean active,
        @Valid List<ApartmentPermissionRequest> apartmentPermissions
    ) {}

    public record TeamApartmentPermissionResponse(
        String apartmentId,
        String apartmentName,
        boolean canView,
        boolean canUpdateTaskStatus,
        boolean canManageIntegrations
    ) {}

    public record TeamMemberResponse(
        String membershipId,
        String userId,
        String email,
        String fullName,
        AuthRole role,
        boolean active,
        List<TeamApartmentPermissionResponse> apartmentPermissions
    ) {}

    public record TeamMemberEnvelope(TeamMemberResponse teamMember) {}

    public record TeamMembersResponse(List<TeamMemberResponse> teamMembers) {}
}
