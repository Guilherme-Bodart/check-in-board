package com.checkinboard.backend.modules.auth.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Shared RBAC and organization-scoping helper service for active memberships and apartment access.
 */
@Service
public class OrganizationAccessService {

    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;

    public OrganizationAccessService(
        OrganizationMembershipRepository organizationMembershipRepository,
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository
    ) {
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
    }

    /**
     * Requires an active primary organization membership with read access ({@code host_admin} or {@code co_host}).
     */
    public OrganizationMembershipEntity requireReadMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            (membership.getRole() != AuthRole.host_admin &&
                membership.getRole() != AuthRole.co_host)
        ) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to view financial data."
            );
        }

        return membership;
    }

    /**
     * Requires an active primary organization membership with {@code host_admin} role.
     */
    public OrganizationMembershipEntity requireHostAdminMembership(String userId) {
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
                "You do not have permission to manage financial data."
            );
        }

        return membership;
    }

    /**
     * Returns the set of non-deleted apartment IDs where the {@code co_host} user has {@code canView} permission.
     */
    public Set<String> allowedApartmentIdsForCoHost(String userId, String organizationId) {
        return apartmentMembershipRepository
            .findByUserIdAndOrganizationId(userId, organizationId)
            .stream()
            .filter(m -> m.canView() && m.getApartment().getDeletedAt() == null)
            .map(m -> m.getApartment().getId())
            .collect(Collectors.toSet());
    }

    /**
     * Finds a non-deleted apartment by ID and verifies it belongs to the specified organization.
     */
    public ApartmentEntity findApartmentInOrganization(
        String apartmentId,
        String organizationId
    ) {
        ApartmentEntity apartment = apartmentRepository
            .findByIdAndDeletedAtIsNull(apartmentId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "APARTMENT_NOT_FOUND",
                    "Apartment was not found."
                )
            );

        if (!apartment.getOrganization().getId().equals(organizationId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this apartment."
            );
        }

        return apartment;
    }

    /**
     * Asserts that a {@code co_host} member has view permission for the given apartment ID.
     */
    public void assertCanViewApartment(
        OrganizationMembershipEntity membership,
        String userId,
        String apartmentId
    ) {
        if (membership.getRole() != AuthRole.co_host || apartmentId == null) {
            return;
        }

        Set<String> allowedApartmentIds = allowedApartmentIdsForCoHost(
            userId,
            membership.getOrganization().getId()
        );
        if (!allowedApartmentIds.contains(apartmentId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this apartment."
            );
        }
    }
}
