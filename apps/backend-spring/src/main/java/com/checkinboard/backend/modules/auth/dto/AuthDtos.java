package com.checkinboard.backend.modules.auth.dto;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class AuthDtos {

    private AuthDtos() {}

    public record SignUpRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(max = 120) String fullName,
        @Size(max = 120) String organizationName,
        @NotBlank @Size(min = 8, max = 128) String password
    ) {}

    public record SignInRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 128) String password
    ) {}

    public record AuthUserResponse(String id, String email, String fullName) {}

    public record OrganizationResponse(String id, String name) {}

    public record MembershipResponse(
        String id,
        AuthRole role,
        boolean isActive,
        OrganizationResponse organization
    ) {}

    public record AuthResponse(
        String accessToken,
        AuthUserResponse user,
        OrganizationResponse organization
    ) {}

    public record MeResponse(AuthUserResponse user, List<MembershipResponse> memberships) {}
}
