package com.checkinboard.backend.modules.team.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.model.UserEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.auth.repository.UserRepository;
import com.checkinboard.backend.modules.team.dto.TeamDtos.ApartmentPermissionRequest;
import com.checkinboard.backend.modules.team.dto.TeamDtos.CreateTeamMemberRequest;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamApartmentPermissionResponse;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamMemberEnvelope;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamMemberResponse;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamMembersResponse;
import com.checkinboard.backend.modules.team.dto.TeamDtos.UpdateTeamMemberRequest;
import com.checkinboard.backend.shared.error.ApiException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {

    private final UserRepository userRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final PasswordEncoder passwordEncoder;

    public TeamService(
        UserRepository userRepository,
        OrganizationMembershipRepository organizationMembershipRepository,
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public TeamMembersResponse list(String userId) {
        OrganizationMembershipEntity currentMembership = getHostAdminMembership(userId);
        String organizationId = currentMembership.getOrganization().getId();

        return new TeamMembersResponse(
            organizationMembershipRepository
                .findByOrganizationIdWithUser(organizationId)
                .stream()
                .map(membership -> toResponse(membership, organizationId))
                .toList()
        );
    }

    @Transactional
    public TeamMemberEnvelope create(String userId, CreateTeamMemberRequest request) {
        OrganizationMembershipEntity currentMembership = getHostAdminMembership(userId);
        String organizationId = currentMembership.getOrganization().getId();
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            user =
                userRepository.save(
                    new UserEntity(
                        newId(),
                        "password",
                        "password:" + email,
                        request.fullName().trim(),
                        email,
                        passwordEncoder.encode(request.password())
                    )
                );
        }

        OrganizationMembershipEntity existingMembership =
            organizationMembershipRepository
                .findByOrganization_IdAndUser_Id(organizationId, user.getId())
                .orElse(null);

        if (existingMembership != null && existingMembership.isActive()) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "TEAM_MEMBER_ALREADY_EXISTS",
                "This user is already a team member."
            );
        }

        OrganizationMembershipEntity membership =
            existingMembership == null
                ? new OrganizationMembershipEntity(
                    newId(),
                    currentMembership.getOrganization(),
                    user,
                    request.role()
                )
                : existingMembership;

        membership.updateRole(request.role());
        membership.activate();
        membership = organizationMembershipRepository.save(membership);
        replaceApartmentPermissions(
            user,
            organizationId,
            request.role(),
            request.apartmentPermissions()
        );

        return new TeamMemberEnvelope(toResponse(membership, organizationId));
    }

    @Transactional
    public TeamMemberEnvelope update(
        String userId,
        String membershipId,
        UpdateTeamMemberRequest request
    ) {
        OrganizationMembershipEntity currentMembership = getHostAdminMembership(userId);
        String organizationId = currentMembership.getOrganization().getId();
        OrganizationMembershipEntity membership = findMembershipInOrganization(
            membershipId,
            organizationId
        );

        if (membership.getUser().getId().equals(userId) && !request.active()) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "CANNOT_DEACTIVATE_SELF",
                "You cannot deactivate your own membership."
            );
        }

        membership.updateRole(request.role());

        if (request.active()) {
            membership.activate();
        } else {
            membership.deactivate();
        }

        membership = organizationMembershipRepository.save(membership);
        replaceApartmentPermissions(
            membership.getUser(),
            organizationId,
            request.role(),
            request.apartmentPermissions()
        );

        return new TeamMemberEnvelope(toResponse(membership, organizationId));
    }

    @Transactional
    public void deactivate(String userId, String membershipId) {
        OrganizationMembershipEntity currentMembership = getHostAdminMembership(userId);
        String organizationId = currentMembership.getOrganization().getId();
        OrganizationMembershipEntity membership = findMembershipInOrganization(
            membershipId,
            organizationId
        );

        if (membership.getUser().getId().equals(userId)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "CANNOT_DEACTIVATE_SELF",
                "You cannot deactivate your own membership."
            );
        }

        membership.deactivate();
        organizationMembershipRepository.save(membership);
        apartmentMembershipRepository.deleteByUser_IdAndApartment_Organization_Id(
            membership.getUser().getId(),
            organizationId
        );
    }

    private void replaceApartmentPermissions(
        UserEntity user,
        String organizationId,
        AuthRole role,
        List<ApartmentPermissionRequest> permissions
    ) {
        Map<String, ApartmentEntity> apartmentsById = apartmentRepository
            .findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(organizationId)
            .stream()
            .collect(Collectors.toMap(ApartmentEntity::getId, Function.identity()));

        List<ApartmentMembershipEntity> currentApartmentMemberships =
            apartmentMembershipRepository.findByUserIdAndOrganizationId(
                user.getId(),
                organizationId
            );
        apartmentMembershipRepository.deleteAll(currentApartmentMemberships);
        apartmentMembershipRepository.flush();

        if (permissions == null) {
            return;
        }

        permissions
            .stream()
            .filter(ApartmentPermissionRequest::canView)
            .forEach(permission -> {
                ApartmentEntity apartment = apartmentsById.get(permission.apartmentId());

                if (apartment == null) {
                    throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "APARTMENT_NOT_FOUND",
                        "Apartment was not found."
                    );
                }

                apartmentMembershipRepository.save(
                    new ApartmentMembershipEntity(
                        newId(),
                        apartment,
                        user,
                        role,
                        true,
                        permission.canUpdateTaskStatus(),
                        permission.canManageIntegrations()
                    )
                );
            });
    }

    private TeamMemberResponse toResponse(
        OrganizationMembershipEntity membership,
        String organizationId
    ) {
        UserEntity user = membership.getUser();

        return new TeamMemberResponse(
            membership.getId(),
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            membership.getRole(),
            membership.isActive(),
            apartmentMembershipRepository
                .findByUserIdAndOrganizationId(user.getId(), organizationId)
                .stream()
                .map(apartmentMembership ->
                    new TeamApartmentPermissionResponse(
                        apartmentMembership.getApartment().getId(),
                        apartmentMembership.getApartment().getName(),
                        apartmentMembership.canView(),
                        apartmentMembership.canUpdateTaskStatus(),
                        apartmentMembership.canManageIntegrations()
                    )
                )
                .toList()
        );
    }

    private OrganizationMembershipEntity findMembershipInOrganization(
        String membershipId,
        String organizationId
    ) {
        OrganizationMembershipEntity membership = organizationMembershipRepository
            .findByIdWithUserAndOrganization(membershipId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "TEAM_MEMBER_NOT_FOUND",
                    "Team member was not found."
                )
            );

        if (!membership.getOrganization().getId().equals(organizationId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this team member."
            );
        }

        return membership;
    }

    private OrganizationMembershipEntity getHostAdminMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            membership.getRole() != AuthRole.host_admin
        ) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage team members."
            );
        }

        return membership;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
