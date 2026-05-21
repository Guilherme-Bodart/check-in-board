package com.checkinboard.backend.modules.auth.service;

import com.checkinboard.backend.modules.auth.dto.AuthDtos.AuthResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.AuthUserResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.MeResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.MembershipResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.OrganizationResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.SignInRequest;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.SignUpRequest;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.model.UserEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.auth.repository.OrganizationRepository;
import com.checkinboard.backend.modules.auth.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        UserRepository userRepository,
        OrganizationRepository organizationRepository,
        OrganizationMembershipRepository membershipRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signUp(SignUpRequest request) {
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository.findByEmail(email).orElse(null);

        if (user != null && user.getPasswordHash() != null) {
            throw new AuthServiceException(
                HttpStatus.CONFLICT,
                "EMAIL_ALREADY_REGISTERED",
                "This email already has an account. Try signing in."
            );
        }

        if (user == null) {
            user =
                new UserEntity(
                    newId(),
                    "password",
                    "password:" + email,
                    request.fullName().trim(),
                    email,
                    passwordEncoder.encode(request.password())
                );
            user = userRepository.save(user);
        } else {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user = userRepository.save(user);
        }

        OrganizationMembershipEntity membership = getPrimaryMembership(user);

        if (membership == null) {
            OrganizationEntity organization = organizationRepository.save(
                new OrganizationEntity(
                    newId(),
                    defaultIfBlank(
                        request.organizationName(),
                        request.fullName().trim() + " Organization"
                    )
                )
            );

            membership =
                membershipRepository.save(
                    new OrganizationMembershipEntity(
                        newId(),
                        organization,
                        user,
                        AuthRole.host_admin
                    )
                );
        }

        return toAuthResponse(
            userRepository.findWithOrganizationMembershipsById(user.getId()).orElse(user),
            membership
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse signIn(SignInRequest request) {
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository
            .findByEmail(email)
            .orElseThrow(this::invalidCredentials);

        if (
            user.getPasswordHash() == null ||
            !passwordEncoder.matches(request.password(), user.getPasswordHash())
        ) {
            throw invalidCredentials();
        }

        OrganizationMembershipEntity membership = getPrimaryMembership(user);

        if (membership == null) {
            throw new IllegalStateException("AUTH_USER_WITHOUT_MEMBERSHIP");
        }

        return toAuthResponse(user, membership);
    }

    @Transactional(readOnly = true)
    public MeResponse me(String userId) {
        UserEntity user = userRepository
            .findWithOrganizationMembershipsById(userId)
            .orElseThrow(() ->
                new AuthServiceException(
                    HttpStatus.UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Authentication is required."
                )
            );

        return new MeResponse(toUserResponse(user), toMembershipResponses(user));
    }

    private AuthResponse toAuthResponse(UserEntity user, OrganizationMembershipEntity membership) {
        return new AuthResponse(
            jwtService.issueAccessToken(user),
            toUserResponse(user),
            toOrganizationResponse(membership.getOrganization())
        );
    }

    private AuthUserResponse toUserResponse(UserEntity user) {
        return new AuthUserResponse(user.getId(), user.getEmail(), user.getFullName());
    }

    private OrganizationResponse toOrganizationResponse(OrganizationEntity organization) {
        return new OrganizationResponse(organization.getId(), organization.getName());
    }

    private List<MembershipResponse> toMembershipResponses(UserEntity user) {
        return user
            .getOrganizationMemberships()
            .stream()
            .sorted(Comparator.comparing(OrganizationMembershipEntity::getCreatedAt))
            .map(membership ->
                new MembershipResponse(
                    membership.getId(),
                    membership.getRole(),
                    membership.isActive(),
                    toOrganizationResponse(membership.getOrganization())
                )
            )
            .toList();
    }

    private OrganizationMembershipEntity getPrimaryMembership(UserEntity user) {
        return user
            .getOrganizationMemberships()
            .stream()
            .filter(OrganizationMembershipEntity::isActive)
            .findFirst()
            .orElseGet(() ->
                user.getOrganizationMemberships().isEmpty()
                    ? null
                    : user.getOrganizationMemberships().get(0)
            );
    }

    private AuthServiceException invalidCredentials() {
        return new AuthServiceException(
            HttpStatus.UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect."
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
