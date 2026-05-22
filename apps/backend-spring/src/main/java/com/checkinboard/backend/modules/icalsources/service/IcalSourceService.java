package com.checkinboard.backend.modules.icalsources.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.CreateIcalSourceRequest;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.IcalSourceEnvelope;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.IcalSourceResponse;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.IcalSourcesResponse;
import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import com.checkinboard.backend.modules.icalsources.repository.IcalSourceRepository;
import com.checkinboard.backend.shared.crypto.SecretEncryptionService;
import com.checkinboard.backend.shared.error.ApiException;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IcalSourceService {

    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final IcalSourceRepository icalSourceRepository;
    private final IcalUrlPolicy icalUrlPolicy;
    private final SecretEncryptionService secretEncryptionService;

    public IcalSourceService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        IcalSourceRepository icalSourceRepository,
        IcalUrlPolicy icalUrlPolicy,
        SecretEncryptionService secretEncryptionService
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.icalSourceRepository = icalSourceRepository;
        this.icalUrlPolicy = icalUrlPolicy;
        this.secretEncryptionService = secretEncryptionService;
    }

    @Transactional(readOnly = true)
    public IcalSourcesResponse list(String userId, String apartmentId) {
        assertCanView(userId, apartmentId);

        return new IcalSourcesResponse(
            icalSourceRepository
                .findByApartment_IdAndDeletedAtIsNullOrderByCreatedAtDesc(apartmentId)
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional
    public IcalSourceEnvelope create(
        String userId,
        String apartmentId,
        CreateIcalSourceRequest request
    ) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (!canManageIcalSources(membership)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage iCal sources."
            );
        }

        ApartmentEntity apartment = findActiveApartment(apartmentId);
        URI icalUrl = safeIcalUrl(request.icalUrl());
        IcalSourceEntity icalSource = icalSourceRepository.save(
            new IcalSourceEntity(
                newId(),
                apartment,
                request.provider().trim(),
                request.label().trim(),
                secretEncryptionService.encrypt(icalUrl.toString())
            )
        );

        return new IcalSourceEnvelope(toResponse(icalSource));
    }

    @Transactional
    public void delete(String userId, String apartmentId, String icalSourceId) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (!canManageIcalSources(membership)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage iCal sources."
            );
        }

        IcalSourceEntity icalSource = icalSourceRepository
            .findByIdAndDeletedAtIsNull(icalSourceId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "ICAL_SOURCE_NOT_FOUND",
                    "iCal source was not found."
                )
            );

        if (!icalSource.getApartment().getId().equals(apartmentId)) {
            throw forbiddenApartmentAccess();
        }

        icalSource.markDeleted();
        icalSourceRepository.save(icalSource);
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

    private void assertCanView(String userId, String apartmentId) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (!membership.canView()) {
            throw forbiddenApartmentAccess();
        }
    }

    private ApartmentMembershipEntity getMembership(String userId, String apartmentId) {
        return apartmentMembershipRepository
            .findByApartment_IdAndUser_Id(apartmentId, userId)
            .orElseThrow(this::forbiddenApartmentAccess);
    }

    private boolean canManageIcalSources(ApartmentMembershipEntity membership) {
        return (
            membership.getRole() == AuthRole.host_admin ||
            membership.canManageIntegrations()
        );
    }

    private URI safeIcalUrl(String rawUrl) {
        try {
            return icalUrlPolicy.assertSafe(rawUrl);
        } catch (IcalUrlPolicyException exception) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "UNSAFE_ICAL_URL",
                exception.getMessage()
            );
        }
    }

    private IcalSourceResponse toResponse(IcalSourceEntity icalSource) {
        return new IcalSourceResponse(
            icalSource.getId(),
            icalSource.getProvider(),
            icalSource.getLabel(),
            icalSource.isSyncEnabled(),
            icalSource.getLastSuccessAt(),
            icalSource.getLastFailureAt()
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
