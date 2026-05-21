package com.checkinboard.backend.modules.apartments.service;

import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentEnvelope;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentMembershipResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentsResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.CreateApartmentRequest;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.UpdateApartmentRequest;
import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public ApartmentService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public ApartmentsResponse listAccessible(String userId) {
        return new ApartmentsResponse(
            apartmentRepository
                .findAccessibleByUserId(userId)
                .stream()
                .map(apartment -> toResponse(apartment, getViewMembership(apartment, userId)))
                .toList()
        );
    }

    @Transactional
    public ApartmentEnvelope create(String userId, CreateApartmentRequest request) {
        OrganizationMembershipEntity organizationAccess =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            organizationAccess == null ||
            !organizationAccess.isActive() ||
            organizationAccess.getRole() != AuthRole.host_admin
        ) {
            throw forbiddenCreate();
        }

        ApartmentEntity apartment = apartmentRepository.save(
            new ApartmentEntity(
                newId(),
                organizationAccess.getOrganization(),
                normalizeName(request.name()),
                normalizeTimezone(request.timezone())
            )
        );

        ApartmentMembershipEntity membership = apartmentMembershipRepository.save(
            new ApartmentMembershipEntity(
                newId(),
                apartment,
                organizationAccess.getUser(),
                AuthRole.host_admin,
                true,
                true,
                true
            )
        );

        return new ApartmentEnvelope(toResponse(apartment, membership));
    }

    @Transactional(readOnly = true)
    public ApartmentEnvelope get(String userId, String apartmentId) {
        ApartmentEntity apartment = findActiveApartment(apartmentId);
        ApartmentMembershipEntity membership = getRequiredViewMembership(apartment, userId);

        return new ApartmentEnvelope(toResponse(apartment, membership));
    }

    @Transactional
    public ApartmentEnvelope update(
        String userId,
        String apartmentId,
        UpdateApartmentRequest request
    ) {
        ApartmentEntity apartment = findActiveApartment(apartmentId);
        assertCanManageApartment(userId, apartment);
        apartment.updateDetails(
            normalizeName(request.name()),
            normalizeTimezone(request.timezone())
        );

        ApartmentEntity savedApartment = apartmentRepository.save(apartment);
        ApartmentMembershipEntity membership = getRequiredViewMembership(savedApartment, userId);

        return new ApartmentEnvelope(toResponse(savedApartment, membership));
    }

    @Transactional
    public void delete(String userId, String apartmentId) {
        ApartmentEntity apartment = findActiveApartment(apartmentId);
        assertCanManageApartment(userId, apartment);
        apartment.markDeleted();
        apartmentRepository.save(apartment);
    }

    private ApartmentEntity findActiveApartment(String apartmentId) {
        return apartmentRepository
            .findByIdAndDeletedAtIsNull(apartmentId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "APARTMENT_NOT_FOUND",
                    "Apartment was not found."
                )
            );
    }

    private ApartmentMembershipEntity getViewMembership(
        ApartmentEntity apartment,
        String userId
    ) {
        return apartment
            .getMemberships()
            .stream()
            .filter(membership ->
                membership.getUser().getId().equals(userId) && membership.canView()
            )
            .findFirst()
            .orElseThrow(this::forbiddenApartmentAccess);
    }

    private ApartmentMembershipEntity getRequiredViewMembership(
        ApartmentEntity apartment,
        String userId
    ) {
        return apartmentMembershipRepository
            .findByApartment_IdAndUser_Id(apartment.getId(), userId)
            .filter(ApartmentMembershipEntity::canView)
            .orElseThrow(this::forbiddenApartmentAccess);
    }

    private void assertCanManageApartment(String userId, ApartmentEntity apartment) {
        boolean canManage = organizationMembershipRepository.existsActiveRole(
            userId,
            apartment.getOrganization().getId(),
            AuthRole.host_admin
        );

        if (!canManage) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage this apartment."
            );
        }
    }

    private ApartmentResponse toResponse(
        ApartmentEntity apartment,
        ApartmentMembershipEntity membership
    ) {
        return new ApartmentResponse(
            apartment.getId(),
            new ApartmentMembershipResponse(
                membership.getId(),
                membership.getRole(),
                membership.canManageIntegrations(),
                membership.canUpdateTaskStatus(),
                membership.canView()
            ),
            apartment.getName(),
            apartment.getOrganization().getId(),
            apartment.getTimezone()
        );
    }

    private String normalizeName(String name) {
        return name.trim();
    }

    private String normalizeTimezone(String timezone) {
        String normalized = timezone.trim();

        try {
            ZoneId.of(normalized);
            return normalized;
        } catch (DateTimeException exception) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Invalid timezone."
            );
        }
    }

    private ApiException forbiddenCreate() {
        return new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "You do not have permission to create apartments."
        );
    }

    private ApiException forbiddenApartmentAccess() {
        return new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "You do not have access to this apartment."
        );
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
