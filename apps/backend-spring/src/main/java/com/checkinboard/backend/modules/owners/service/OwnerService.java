package com.checkinboard.backend.modules.owners.service;

import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.CreateOwnerRequest;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.OwnerEnvelope;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.OwnerResponse;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.OwnersResponse;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.UpdateOwnerRequest;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
import com.checkinboard.backend.modules.owners.repository.OwnerRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OwnerService {

    private final OwnerRepository ownerRepository;
    private final ApartmentRepository apartmentRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public OwnerService(
        OwnerRepository ownerRepository,
        ApartmentRepository apartmentRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.ownerRepository = ownerRepository;
        this.apartmentRepository = apartmentRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public OwnersResponse list(String userId) {
        OrganizationMembershipEntity membership = getActiveMembership(userId);

        return new OwnersResponse(
            ownerRepository
                .findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(
                    membership.getOrganization().getId()
                )
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional
    public OwnerEnvelope create(String userId, CreateOwnerRequest request) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        OwnerEntity owner = ownerRepository.save(
            new OwnerEntity(
                newId(),
                membership.getOrganization(),
                normalizeRequired(request.name()),
                request.type(),
                normalizeOptional(request.contactName()),
                normalizeOptional(request.email()),
                normalizeOptional(request.phone()),
                normalizeOptional(request.notes())
            )
        );

        return new OwnerEnvelope(toResponse(owner));
    }

    @Transactional(readOnly = true)
    public OwnerEnvelope get(String userId, String ownerId) {
        OwnerEntity owner = findOwner(ownerId);
        assertSameOrganization(userId, owner);

        return new OwnerEnvelope(toResponse(owner));
    }

    @Transactional
    public OwnerEnvelope update(String userId, String ownerId, UpdateOwnerRequest request) {
        OwnerEntity owner = findOwner(ownerId);
        assertCanManage(userId, owner);
        owner.updateDetails(
            normalizeRequired(request.name()),
            request.type(),
            normalizeOptional(request.contactName()),
            normalizeOptional(request.email()),
            normalizeOptional(request.phone()),
            normalizeOptional(request.notes())
        );

        return new OwnerEnvelope(toResponse(ownerRepository.save(owner)));
    }

    @Transactional
    public void delete(String userId, String ownerId) {
        OwnerEntity owner = findOwner(ownerId);
        assertCanManage(userId, owner);
        long apartmentCount = apartmentRepository.countByOwner_IdAndDeletedAtIsNull(
            owner.getId()
        );

        if (apartmentCount > 0) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "OWNER_HAS_APARTMENTS",
                "Owner cannot be deleted while apartments are linked."
            );
        }

        owner.markDeleted();
        ownerRepository.save(owner);
    }

    private OwnerEntity findOwner(String ownerId) {
        return ownerRepository
            .findByIdAndDeletedAtIsNull(ownerId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "OWNER_NOT_FOUND",
                    "Owner was not found."
                )
            );
    }

    private OrganizationMembershipEntity getActiveMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (membership == null || !membership.isActive()) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to owners."
            );
        }

        return membership;
    }

    private OrganizationMembershipEntity getHostAdminMembership(String userId) {
        OrganizationMembershipEntity membership = getActiveMembership(userId);

        if (membership.getRole() != AuthRole.host_admin) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage owners."
            );
        }

        return membership;
    }

    private void assertSameOrganization(String userId, OwnerEntity owner) {
        OrganizationMembershipEntity membership = getActiveMembership(userId);

        if (!membership.getOrganization().getId().equals(owner.getOrganization().getId())) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this owner."
            );
        }
    }

    private void assertCanManage(String userId, OwnerEntity owner) {
        boolean canManage = organizationMembershipRepository.existsActiveRole(
            userId,
            owner.getOrganization().getId(),
            AuthRole.host_admin
        );

        if (!canManage) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage this owner."
            );
        }
    }

    private OwnerResponse toResponse(OwnerEntity owner) {
        return new OwnerResponse(
            owner.getId(),
            owner.getOrganization().getId(),
            owner.getName(),
            owner.getType(),
            owner.getContactName(),
            owner.getEmail(),
            owner.getPhone(),
            owner.getNotes(),
            apartmentRepository.countByOwner_IdAndDeletedAtIsNull(owner.getId())
        );
    }

    private String normalizeRequired(String value) {
        return value.trim();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
