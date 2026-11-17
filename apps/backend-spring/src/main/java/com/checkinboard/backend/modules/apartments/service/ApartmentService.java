package com.checkinboard.backend.modules.apartments.service;

import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentEnvelope;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentMembershipResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentOwnerResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentsResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.BatchImportApartmentItemRequest;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.BatchImportApartmentsRequest;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.BatchImportApartmentsResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.CreateApartmentRequest;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.UpdateApartmentRequest;
import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
import com.checkinboard.backend.modules.owners.model.OwnerType;
import com.checkinboard.backend.modules.owners.repository.OwnerRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApartmentService {

    private static final String DEFAULT_TIMEZONE = "America/Sao_Paulo";

    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final OwnerRepository ownerRepository;

    public ApartmentService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        OrganizationMembershipRepository organizationMembershipRepository,
        OwnerRepository ownerRepository
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.ownerRepository = ownerRepository;
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
        OrganizationMembershipEntity organizationAccess = requireHostAdminAccess(userId);

        ApartmentResponse response = saveApartmentWithHostMembership(
            organizationAccess,
            resolveOwner(organizationAccess, request.ownerId()),
            normalizeName(request.name()),
            normalizeTimezone(request.timezone()),
            normalizeCommissionBps(request.managementCommissionBps())
        );

        return new ApartmentEnvelope(response);
    }

    @Transactional
    public BatchImportApartmentsResponse batchImport(
        String userId,
        BatchImportApartmentsRequest request
    ) {
        OrganizationMembershipEntity organizationAccess = requireHostAdminAccess(userId);
        String organizationId = organizationAccess.getOrganization().getId();

        Map<String, OwnerEntity> ownersByName = loadOwnersByName(organizationId);
        Map<String, ApartmentResponse> existingApartmentsByName = loadExistingApartmentsByName(
            userId,
            organizationId
        );

        int createdCount = 0;
        int skippedCount = 0;
        int ownersCreatedCount = 0;
        List<ApartmentResponse> importedResponses = new ArrayList<>(request.items().size());

        for (BatchImportApartmentItemRequest item : request.items()) {
            String normalizedName = normalizeName(item.name());
            String nameKey = normalizeLookupKey(normalizedName);

            ApartmentResponse existing = existingApartmentsByName.get(nameKey);
            if (existing != null) {
                skippedCount++;
                importedResponses.add(existing);
                continue;
            }

            OwnerResolution ownerResolution = resolveBatchOwner(
                organizationAccess,
                item,
                ownersByName
            );
            OwnerEntity owner = ownerResolution.owner();
            if (ownerResolution.created()) {
                ownersCreatedCount++;
            }

            int commissionBps = item.managementCommissionBps() == null
                ? owner.getDefaultCommissionBps()
                : normalizeCommissionBps(item.managementCommissionBps());

            String timezone = item.timezone() == null || item.timezone().isBlank()
                ? DEFAULT_TIMEZONE
                : normalizeTimezone(item.timezone());

            ApartmentResponse response = saveApartmentWithHostMembership(
                organizationAccess,
                owner,
                normalizedName,
                timezone,
                commissionBps
            );
            existingApartmentsByName.put(nameKey, response);
            importedResponses.add(response);
            createdCount++;
        }

        return new BatchImportApartmentsResponse(
            createdCount,
            skippedCount,
            ownersCreatedCount,
            importedResponses
        );
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
            normalizeTimezone(request.timezone()),
            resolveOwner(apartment.getOrganization().getId(), request.ownerId()),
            normalizeCommissionBps(request.managementCommissionBps())
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
        return toResponse(
            apartment,
            new ApartmentMembershipResponse(
                membership.getId(),
                membership.getRole(),
                membership.canManageIntegrations(),
                membership.canUpdateTaskStatus(),
                membership.canView()
            )
        );
    }

    private ApartmentResponse toResponse(
        ApartmentEntity apartment,
        ApartmentMembershipResponse membershipResponse
    ) {
        return new ApartmentResponse(
            apartment.getId(),
            membershipResponse,
            apartment.getName(),
            apartment.getOrganization().getId(),
            new ApartmentOwnerResponse(
                apartment.getOwner().getId(),
                apartment.getOwner().getName(),
                apartment.getOwner().getType().name()
            ),
            apartment.getTimezone(),
            apartment.getManagementCommissionBps()
        );
    }

    private OrganizationMembershipEntity requireHostAdminAccess(String userId) {
        OrganizationMembershipEntity organizationAccess =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            organizationAccess == null ||
            !organizationAccess.isActive() ||
            organizationAccess.getRole() != AuthRole.host_admin
        ) {
            throw forbiddenCreate();
        }

        return organizationAccess;
    }

    private ApartmentResponse saveApartmentWithHostMembership(
        OrganizationMembershipEntity organizationAccess,
        OwnerEntity owner,
        String name,
        String timezone,
        int commissionBps
    ) {
        ApartmentEntity apartment = apartmentRepository.save(
            new ApartmentEntity(
                newId(),
                organizationAccess.getOrganization(),
                owner,
                name,
                timezone,
                commissionBps
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

        return toResponse(apartment, membership);
    }

    private Map<String, OwnerEntity> loadOwnersByName(String organizationId) {
        Map<String, OwnerEntity> ownersByName = new HashMap<>();
        for (OwnerEntity owner : ownerRepository.findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(
            organizationId
        )) {
            ownersByName.putIfAbsent(normalizeLookupKey(owner.getName()), owner);
        }
        return ownersByName;
    }

    private Map<String, ApartmentResponse> loadExistingApartmentsByName(
        String userId,
        String organizationId
    ) {
        Map<String, ApartmentMembershipEntity> membershipsByApartmentId = new HashMap<>();
        for (ApartmentMembershipEntity membership : apartmentMembershipRepository.findByUserIdAndOrganizationId(
            userId,
            organizationId
        )) {
            membershipsByApartmentId.putIfAbsent(membership.getApartment().getId(), membership);
        }

        Map<String, ApartmentResponse> existingApartmentsByName = new HashMap<>();
        for (ApartmentEntity existing : apartmentRepository.findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(
            organizationId
        )) {
            ApartmentMembershipEntity membership = membershipsByApartmentId.get(existing.getId());
            ApartmentResponse existingResponse = membership != null
                ? toResponse(existing, membership)
                : toResponse(
                    existing,
                    new ApartmentMembershipResponse(null, AuthRole.host_admin, true, true, true)
                );
            existingApartmentsByName.putIfAbsent(
                normalizeLookupKey(existing.getName()),
                existingResponse
            );
        }
        return existingApartmentsByName;
    }

    private OwnerResolution resolveBatchOwner(
        OrganizationMembershipEntity organizationAccess,
        BatchImportApartmentItemRequest item,
        Map<String, OwnerEntity> ownersByName
    ) {
        String organizationId = organizationAccess.getOrganization().getId();

        if (item.ownerId() != null && !item.ownerId().isBlank()) {
            return new OwnerResolution(resolveOwner(organizationId, item.ownerId()), false);
        }

        if (item.ownerName() == null || item.ownerName().isBlank()) {
            return new OwnerResolution(resolveOwner(organizationId, null), false);
        }

        String normalizedOwnerName = item.ownerName().trim();
        String ownerNameKey = normalizeLookupKey(normalizedOwnerName);
        OwnerEntity existing = ownersByName.get(ownerNameKey);
        if (existing != null) {
            return new OwnerResolution(existing, false);
        }

        OwnerType ownerType = isInternalOwnerType(item.ownerType())
            ? OwnerType.internal
            : OwnerType.client;
        OwnerEntity created = ownerRepository.save(
            new OwnerEntity(
                newId(),
                organizationAccess.getOrganization(),
                normalizedOwnerName,
                ownerType,
                null,
                normalizeOptional(item.ownerEmail()),
                normalizeOptional(item.ownerPhone()),
                null,
                normalizeCommissionBps(item.managementCommissionBps())
            )
        );
        ownersByName.put(ownerNameKey, created);
        return new OwnerResolution(created, true);
    }

    private record OwnerResolution(OwnerEntity owner, boolean created) {}

    private boolean isInternalOwnerType(String ownerType) {
        return ownerType != null && "internal".equalsIgnoreCase(ownerType.trim());
    }

    private String normalizeLookupKey(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private OwnerEntity resolveOwner(
        OrganizationMembershipEntity organizationAccess,
        String ownerId
    ) {
        return resolveOwner(organizationAccess.getOrganization().getId(), ownerId);
    }

    private OwnerEntity resolveOwner(String organizationId, String ownerId) {
        if (ownerId != null && !ownerId.isBlank()) {
            OwnerEntity owner = ownerRepository
                .findByIdAndDeletedAtIsNull(ownerId.trim())
                .orElseThrow(() ->
                    new ApiException(
                        HttpStatus.NOT_FOUND,
                        "OWNER_NOT_FOUND",
                        "Owner was not found."
                    )
                );

            if (!owner.getOrganization().getId().equals(organizationId)) {
                throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "You do not have permission to use this owner."
                );
            }

            return owner;
        }

        return ownerRepository
            .findFirstByOrganization_IdAndTypeAndDeletedAtIsNullOrderByCreatedAtAsc(
                organizationId,
                OwnerType.internal
            )
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "OWNER_NOT_CONFIGURED",
                    "Default owner was not configured."
                )
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

    private int normalizeCommissionBps(Integer value) {
        int normalized = value == null ? 0 : value;

        if (normalized < 0 || normalized > 10000) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Commission must be between 0 and 10000 basis points."
            );
        }

        return normalized;
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
