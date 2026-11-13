package com.checkinboard.backend.modules.reservations.service;

import com.checkinboard.backend.integrations.ical.IcalFeedClient;
import com.checkinboard.backend.integrations.ical.IcalFeedFetchException;
import com.checkinboard.backend.integrations.ical.IcalReservationParser;
import com.checkinboard.backend.integrations.ical.IcalReservationParserException;
import com.checkinboard.backend.integrations.ical.ParsedIcalReservation;
import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import com.checkinboard.backend.modules.icalsources.repository.IcalSourceRepository;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicy;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicyException;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.AutoSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.CreateManualReservationRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.UpdateReservationRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncSummary;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardSection;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardTotals;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationsResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncChangeItemResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncNotificationsResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncRunResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncRunsResponse;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import com.checkinboard.backend.modules.reservations.model.ReservationStatus;
import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import com.checkinboard.backend.modules.reservations.model.SyncRunStatus;
import com.checkinboard.backend.modules.reservations.repository.ReservationRepository;
import com.checkinboard.backend.modules.reservations.repository.SyncRunRepository;
import com.checkinboard.backend.shared.crypto.SecretEncryptionService;
import com.checkinboard.backend.shared.error.ApiException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ReservationService {

    private static final int MAX_RECORDED_CHANGES = 20;
    private static final String DEFAULT_TIMEZONE = "America/Sao_Paulo";
    private static final Comparator<BoardEntry> CHECK_IN_COMPARATOR = Comparator
        .comparing((BoardEntry entry) -> entry.response().startsAt())
        .thenComparing(BoardEntry::apartmentName, String.CASE_INSENSITIVE_ORDER)
        .thenComparing(entry -> entry.response().id());
    private static final Comparator<BoardEntry> CHECK_OUT_COMPARATOR = Comparator
        .comparing((BoardEntry entry) -> entry.response().endsAt())
        .thenComparing((BoardEntry entry) -> entry.response().startsAt())
        .thenComparing(BoardEntry::apartmentName, String.CASE_INSENSITIVE_ORDER)
        .thenComparing(entry -> entry.response().id());

    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final IcalSourceRepository icalSourceRepository;
    private final ReservationRepository reservationRepository;
    private final SyncRunRepository syncRunRepository;
    private final IcalReservationParser icalReservationParser;
    private final SecretEncryptionService secretEncryptionService;
    private final IcalUrlPolicy icalUrlPolicy;
    private final IcalFeedClient icalFeedClient;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public ReservationService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        OrganizationMembershipRepository organizationMembershipRepository,
        IcalSourceRepository icalSourceRepository,
        ReservationRepository reservationRepository,
        SyncRunRepository syncRunRepository,
        IcalReservationParser icalReservationParser,
        SecretEncryptionService secretEncryptionService,
        IcalUrlPolicy icalUrlPolicy,
        IcalFeedClient icalFeedClient,
        ObjectMapper objectMapper,
        PlatformTransactionManager transactionManager
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.icalSourceRepository = icalSourceRepository;
        this.reservationRepository = reservationRepository;
        this.syncRunRepository = syncRunRepository;
        this.icalReservationParser = icalReservationParser;
        this.secretEncryptionService = secretEncryptionService;
        this.icalUrlPolicy = icalUrlPolicy;
        this.icalFeedClient = icalFeedClient;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Transactional(readOnly = true)
    public ReservationsResponse list(String userId, String apartmentId) {
        assertCanView(userId, apartmentId);

        return new ReservationsResponse(
            reservationRepository
                .findByApartment_IdOrderByStartsAtAsc(apartmentId)
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional(readOnly = true)
    public OperationsBoardResponse operationsBoardAll(
        String userId,
        LocalDate date,
        int days
    ) {
        validateBoardDays(days);

        List<ApartmentEntity> apartments = visibleApartments(userId);
        ZoneId defaultZone = apartments.isEmpty()
            ? ZoneId.of(DEFAULT_TIMEZONE)
            : ZoneId.of(apartments.get(0).getTimezone());
        LocalDate boardDate = date != null ? date : LocalDate.now(defaultZone);

        BoardBuckets buckets = new BoardBuckets();
        for (ApartmentEntity apartment : apartments) {
            collectApartmentBoard(apartment, boardDate, days, buckets);
        }
        buckets.sortAll();

        return buildOperationsBoardResponse(
            "all",
            boardDate,
            days,
            resolveAggregateTimezone(apartments),
            buckets
        );
    }

    @Transactional(readOnly = true)
    public OperationsBoardResponse operationsBoard(
        String userId,
        String apartmentId,
        LocalDate date,
        int days
    ) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (!membership.canView()) {
            throw forbiddenApartmentAccess();
        }

        validateBoardDays(days);

        ApartmentEntity apartment = membership.getApartment();
        ZoneId zoneId = ZoneId.of(apartment.getTimezone());
        LocalDate boardDate = date != null ? date : LocalDate.now(zoneId);
        BoardBuckets buckets = new BoardBuckets();
        collectApartmentBoard(apartment, boardDate, days, buckets);

        return buildOperationsBoardResponse(
            apartmentId,
            boardDate,
            days,
            zoneId.getId(),
            buckets
        );
    }

    public ManualSyncResponse sync(
        String userId,
        String icalSourceId,
        ManualSyncRequest request
    ) {
        PreparedSyncContext context = transactionTemplate.execute(status -> {
            IcalSourceEntity icalSource = findIcalSource(icalSourceId);
            ApartmentMembershipEntity membership = getMembership(
                userId,
                icalSource.getApartment().getId()
            );

            if (!canManageSync(membership)) {
                throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "You do not have permission to sync this iCal source."
                );
            }

            if (request != null && request.icsText() != null && request.icsText().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid sync payload.");
            }

            SyncRunEntity syncRun = syncRunRepository.save(new SyncRunEntity(newId(), icalSource));

            if (!icalSource.isSyncEnabled()) {
                String reason = "iCal source sync is paused.";
                syncRun.markSkipped(reason);
                syncRunRepository.save(syncRun);

                return new PreparedSyncContext(
                    syncRun.getId(),
                    icalSource.getId(),
                    null,
                    null,
                    new ManualSyncResponse(
                        List.of(),
                        new ManualSyncSummary(0, 0, 0, 0, 0, true, reason)
                    )
                );
            }

            return new PreparedSyncContext(
                syncRun.getId(),
                icalSource.getId(),
                icalSource.getIcalUrlEncrypted(),
                icalSource.getApartment().getTimezone(),
                null
            );
        });

        if (context.skippedResponse() != null) {
            return context.skippedResponse();
        }

        return executeSyncForSource(context, request, true).manualSyncResponse();
    }

    public AutoSyncResponse autoSync(String userId) {
        AutoSyncPreparation preparation = transactionTemplate.execute(status -> {
            List<String> apartmentIds = viewableApartmentIds(userId);

            if (apartmentIds.isEmpty()) {
                return new AutoSyncPreparation(0, List.of());
            }

            List<IcalSourceEntity> activeSources = icalSourceRepository
                .findByApartment_IdInAndSyncEnabledTrueAndDeletedAtIsNullOrderByCreatedAtAsc(
                    apartmentIds
                );

            int sourcesChecked = activeSources.size();
            List<PreparedSyncContext> dueContexts = new ArrayList<>();
            Instant cutoff = Instant.now().minusSeconds(3600);

            for (IcalSourceEntity source : activeSources) {
                if (!isDueForAutoSync(source, cutoff)) {
                    continue;
                }
                SyncRunEntity syncRun = syncRunRepository.save(new SyncRunEntity(newId(), source));
                dueContexts.add(
                    new PreparedSyncContext(
                        syncRun.getId(),
                        source.getId(),
                        source.getIcalUrlEncrypted(),
                        source.getApartment().getTimezone(),
                        null
                    )
                );
            }

            return new AutoSyncPreparation(sourcesChecked, dueContexts);
        });

        if (preparation.dueContexts().isEmpty()) {
            return new AutoSyncResponse(preparation.sourcesChecked(), 0, List.of());
        }

        List<SyncRunResponse> notableRuns = new ArrayList<>();
        for (PreparedSyncContext context : preparation.dueContexts()) {
            SyncExecutionOutcome outcome = executeSyncForSource(context, null, false);
            if (outcome.notableSyncRun() != null) {
                notableRuns.add(outcome.notableSyncRun());
            }
        }

        return new AutoSyncResponse(
            preparation.sourcesChecked(),
            preparation.dueContexts().size(),
            notableRuns
        );
    }

    @Transactional(readOnly = true)
    public SyncNotificationsResponse syncNotifications(String userId) {
        List<String> apartmentIds = viewableApartmentIds(userId);

        if (apartmentIds.isEmpty()) {
            return new SyncNotificationsResponse(List.of());
        }

        return new SyncNotificationsResponse(
            syncRunRepository
                .findNotableByApartmentIds(apartmentIds, PageRequest.of(0, 50))
                .stream()
                .map(this::toSyncRunResponse)
                .toList()
        );
    }

    private SyncExecutionOutcome executeSyncForSource(
        PreparedSyncContext context,
        ManualSyncRequest request,
        boolean throwOnError
    ) {
        try {
            String icsText = resolveIcsText(context.icalUrlEncrypted(), request);
            ZoneId apartmentZone = ZoneId.of(context.apartmentTimezone());
            List<ParsedIcalReservation> parsedReservations = icalReservationParser.parse(
                icsText,
                apartmentZone
            );

            return transactionTemplate.execute(status ->
                completeSyncSuccess(context, parsedReservations)
            );
        } catch (IcalReservationParserException exception) {
            SyncRunResponse failedRun = recordSyncFailure(context, exception.getMessage());
            if (throwOnError) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", exception.getMessage());
            }
            return new SyncExecutionOutcome(null, failedRun);
        } catch (IcalFeedFetchException exception) {
            SyncRunResponse failedRun = recordSyncFailure(context, exception.getMessage());
            if (throwOnError) {
                throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "ICAL_FETCH_FAILED",
                    exception.getMessage()
                );
            }
            return new SyncExecutionOutcome(null, failedRun);
        } catch (IcalUrlPolicyException | IllegalArgumentException | IllegalStateException exception) {
            SyncRunResponse failedRun = recordSyncFailure(context, "Stored iCal URL is invalid.");
            if (throwOnError) {
                throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "UNSAFE_ICAL_URL",
                    "Stored iCal URL is invalid."
                );
            }
            return new SyncExecutionOutcome(null, failedRun);
        }
    }

    private SyncExecutionOutcome completeSyncSuccess(
        PreparedSyncContext context,
        List<ParsedIcalReservation> parsedReservations
    ) {
        IcalSourceEntity icalSource = icalSourceRepository
            .findById(context.icalSourceId())
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "ICAL_SOURCE_NOT_FOUND",
                    "iCal source was not found."
                )
            );
        SyncRunEntity syncRun = syncRunRepository
            .findById(context.syncRunId())
            .orElseThrow();

        UpsertDiffResult diff = upsertReservationsWithDiff(icalSource, parsedReservations);

        syncRun.markSucceeded(
            parsedReservations.size(),
            diff.reservations().size(),
            diff.createdCount(),
            diff.updatedCount(),
            diff.cancelledCount(),
            serializeChanges(diff.changes())
        );
        icalSource.markSyncSuccess();
        syncRunRepository.save(syncRun);
        icalSourceRepository.save(icalSource);

        ManualSyncResponse manualSyncResponse = new ManualSyncResponse(
            diff.reservations(),
            new ManualSyncSummary(
                parsedReservations.size(),
                diff.reservations().size(),
                diff.createdCount(),
                diff.updatedCount(),
                diff.cancelledCount(),
                false,
                null
            )
        );
        SyncRunResponse notableSyncRun = isNotableRun(syncRun)
            ? toSyncRunResponse(syncRun)
            : null;

        return new SyncExecutionOutcome(manualSyncResponse, notableSyncRun);
    }

    private SyncRunResponse recordSyncFailure(
        PreparedSyncContext context,
        String errorMessage
    ) {
        return transactionTemplate.execute(status -> {
            IcalSourceEntity icalSource = icalSourceRepository
                .findById(context.icalSourceId())
                .orElseThrow();
            SyncRunEntity syncRun = syncRunRepository
                .findById(context.syncRunId())
                .orElseThrow();

            syncRun.markFailed(errorMessage);
            icalSource.markSyncFailure();
            syncRunRepository.save(syncRun);
            icalSourceRepository.save(icalSource);

            return isNotableRun(syncRun) ? toSyncRunResponse(syncRun) : null;
        });
    }

    @Transactional
    public ReservationResponse createManualReservation(
        String userId,
        String apartmentId,
        CreateManualReservationRequest request
    ) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);
        if (!membership.canView()) {
            throw forbiddenApartmentAccess();
        }

        if (request.startsAt().isAfter(request.endsAt()) || request.startsAt().equals(request.endsAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid date range.");
        }

        ReservationEntity reservation = new ReservationEntity(
            newId(),
            membership.getApartment(),
            request.startsAt(),
            request.endsAt(),
            request.guestName(),
            request.guestCount()
        );

        reservationRepository.save(reservation);
        return toResponse(reservation);
    }

    @Transactional
    public ReservationResponse updateReservation(
        String userId,
        String apartmentId,
        String reservationId,
        UpdateReservationRequest request
    ) {
        assertCanView(userId, apartmentId);

        ReservationEntity reservation = reservationRepository
            .findById(reservationId)
            .filter(r -> r.getApartment().getId().equals(apartmentId))
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Reservation not found."));

        reservation.updateManualFields(request.guestName(), request.guestCount());
        reservationRepository.save(reservation);
        
        return toResponse(reservation);
    }

    @Transactional(readOnly = true)
    public SyncRunsResponse syncRuns(String userId, String icalSourceId) {
        IcalSourceEntity icalSource = findIcalSource(icalSourceId);
        ApartmentMembershipEntity membership = getMembership(
            userId,
            icalSource.getApartment().getId()
        );

        if (!membership.canView()) {
            throw forbiddenApartmentAccess();
        }

        return new SyncRunsResponse(
            syncRunRepository
                .findTop10ByIcalSource_IdOrderByStartedAtDesc(icalSourceId)
                .stream()
                .map(this::toSyncRunResponse)
                .toList()
        );
    }

    private String resolveIcsText(String icalUrlEncrypted, ManualSyncRequest request) {
        if (request != null && request.icsText() != null) {
            return request.icsText();
        }

        String decryptedUrl = secretEncryptionService.decrypt(icalUrlEncrypted);
        URI safeUri = icalUrlPolicy.assertSafe(decryptedUrl);
        return icalFeedClient.fetch(safeUri);
    }

    private UpsertDiffResult upsertReservationsWithDiff(
        IcalSourceEntity icalSource,
        List<ParsedIcalReservation> parsedReservations
    ) {
        List<ReservationEntity> existingForSource = reservationRepository
            .findByIcalSource_IdOrderByStartsAtAsc(icalSource.getId());
        Map<String, ReservationEntity> existingByKey = new LinkedHashMap<>();
        for (ReservationEntity existing : existingForSource) {
            if (existing.getExternalEventKey() != null) {
                existingByKey.put(existing.getExternalEventKey(), existing);
            }
        }

        List<ReservationResponse> reservations = new ArrayList<>();
        List<SyncChangeItemResponse> changes = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();
        int createdCount = 0;
        int updatedCount = 0;
        int cancelledCount = 0;

        for (ParsedIcalReservation parsedReservation : parsedReservations) {
            seenKeys.add(parsedReservation.externalEventKey());
            ReservationEntity existing = existingByKey.get(parsedReservation.externalEventKey());
            boolean isNew = existing == null;
            ReservationStatus previousStatus = isNew ? null : existing.getStatus();

            ReservationEntity reservation = isNew
                ? new ReservationEntity(
                    newId(),
                    icalSource.getApartment(),
                    icalSource,
                    parsedReservation.externalEventKey()
                )
                : existing;

            reservation.applyFeedData(
                parsedReservation.externalUid(),
                parsedReservation.startsAt(),
                parsedReservation.endsAt(),
                parsedReservation.rawSummary(),
                parsedReservation.rawPayload()
            );

            if (parsedReservation.cancelled()) {
                reservation.markCancelled();
            }

            ReservationEntity saved = reservationRepository.save(reservation);
            reservations.add(toResponse(saved));

            if (parsedReservation.cancelled()) {
                if (isNew || previousStatus != ReservationStatus.cancelled) {
                    cancelledCount++;
                    addChangeIfUnderLimit(changes, saved, "cancelled");
                } else {
                    updatedCount++;
                }
            } else if (isNew) {
                createdCount++;
                addChangeIfUnderLimit(changes, saved, "created");
            } else {
                updatedCount++;
            }
        }

        for (ReservationEntity existing : existingForSource) {
            if (
                existing.getExternalEventKey() != null &&
                !seenKeys.contains(existing.getExternalEventKey()) &&
                existing.getStatus() == ReservationStatus.confirmed
            ) {
                existing.markCancelled();
                ReservationEntity saved = reservationRepository.save(existing);
                cancelledCount++;
                addChangeIfUnderLimit(changes, saved, "cancelled");
            }
        }

        return new UpsertDiffResult(
            reservations,
            createdCount,
            updatedCount,
            cancelledCount,
            changes
        );
    }

    private void addChangeIfUnderLimit(
        List<SyncChangeItemResponse> changes,
        ReservationEntity reservation,
        String changeType
    ) {
        if (changes.size() >= MAX_RECORDED_CHANGES) {
            return;
        }
        changes.add(
            new SyncChangeItemResponse(
                reservation.getId(),
                changeType,
                reservation.getGuestName(),
                reservation.getRawSummary(),
                reservation.getStartsAt(),
                reservation.getEndsAt()
            )
        );
    }

    private String serializeChanges(List<SyncChangeItemResponse> changes) {
        if (changes == null || changes.isEmpty()) {
            return null;
        }
        try {
            List<SyncChangeItemResponse> current = new ArrayList<>(changes);
            while (!current.isEmpty()) {
                String json = objectMapper.writeValueAsString(current);
                if (json.length() <= 3900) {
                    return json;
                }
                current.remove(current.size() - 1);
            }
            return null;
        } catch (Exception exception) {
            return null;
        }
    }

    private List<SyncChangeItemResponse> deserializeChanges(String diffDetailsJson) {
        if (diffDetailsJson == null || diffDetailsJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                diffDetailsJson,
                new TypeReference<List<SyncChangeItemResponse>>() {}
            );
        } catch (Exception exception) {
            return List.of();
        }
    }

    private List<String> viewableApartmentIds(String userId) {
        return apartmentMembershipRepository
            .findByUser_IdAndCanViewTrue(userId)
            .stream()
            .map(ApartmentMembershipEntity::getApartment)
            .filter(apartment -> apartment.getDeletedAt() == null)
            .map(ApartmentEntity::getId)
            .distinct()
            .toList();
    }

    private boolean isDueForAutoSync(IcalSourceEntity source, Instant cutoff) {
        Instant lastSuccess = source.getLastSuccessAt();
        Instant lastFailure = source.getLastFailureAt();
        if (lastSuccess == null && lastFailure == null) {
            return true;
        }
        Instant mostRecent;
        if (lastSuccess == null) {
            mostRecent = lastFailure;
        } else if (lastFailure == null) {
            mostRecent = lastSuccess;
        } else {
            mostRecent = lastSuccess.isAfter(lastFailure) ? lastSuccess : lastFailure;
        }
        return mostRecent.isBefore(cutoff);
    }

    private boolean isNotableRun(SyncRunEntity syncRun) {
        return (
            syncRun.getReservationsCreated() > 0 ||
            syncRun.getReservationsCancelled() > 0 ||
            syncRun.getStatus() == SyncRunStatus.failed
        );
    }

    private record PreparedSyncContext(
        String syncRunId,
        String icalSourceId,
        String icalUrlEncrypted,
        String apartmentTimezone,
        ManualSyncResponse skippedResponse
    ) {}

    private record AutoSyncPreparation(
        int sourcesChecked,
        List<PreparedSyncContext> dueContexts
    ) {}

    private record SyncExecutionOutcome(
        ManualSyncResponse manualSyncResponse,
        SyncRunResponse notableSyncRun
    ) {}

    private record UpsertDiffResult(
        List<ReservationResponse> reservations,
        int createdCount,
        int updatedCount,
        int cancelledCount,
        List<SyncChangeItemResponse> changes
    ) {}

    private IcalSourceEntity findIcalSource(String icalSourceId) {
        return icalSourceRepository
            .findByIdAndDeletedAtIsNull(icalSourceId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "ICAL_SOURCE_NOT_FOUND",
                    "iCal source was not found."
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

    private boolean canManageSync(ApartmentMembershipEntity membership) {
        return (
            membership.getRole() == AuthRole.host_admin ||
            membership.canManageIntegrations()
        );
    }

    private ReservationResponse toResponse(ReservationEntity reservation) {
        return new ReservationResponse(
            reservation.getId(),
            reservation.getApartment().getId(),
            reservation.getIcalSource() != null ? reservation.getIcalSource().getId() : null,
            reservation.getExternalEventKey(),
            reservation.getExternalUid(),
            reservation.getStatus(),
            reservation.getStartsAt(),
            reservation.getEndsAt(),
            reservation.getRawSummary(),
            reservation.getIcalSource() != null ? reservation.getIcalSource().getProvider() : "manual",
            reservation.getGuestName(),
            reservation.getGuestCount()
        );
    }

    private void validateBoardDays(int days) {
        if (days < 1 || days > 31) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Board window must be between 1 and 31 days."
            );
        }
    }

    private List<ApartmentEntity> visibleApartments(String userId) {
        OrganizationMembershipEntity orgMembership = organizationMembershipRepository
            .findPrimaryByUserId(userId)
            .orElse(null);

        if (orgMembership == null || !orgMembership.isActive()) {
            throw forbiddenApartmentAccess();
        }

        String organizationId = orgMembership.getOrganization().getId();
        if (orgMembership.getRole() == AuthRole.host_admin) {
            return apartmentRepository.findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(
                organizationId
            );
        }

        return apartmentMembershipRepository
            .findByUserIdAndOrganizationId(userId, organizationId)
            .stream()
            .filter(membership ->
                membership.canView() &&
                membership.getApartment().getDeletedAt() == null
            )
            .map(ApartmentMembershipEntity::getApartment)
            .toList();
    }

    private void collectApartmentBoard(
        ApartmentEntity apartment,
        LocalDate boardDate,
        int days,
        BoardBuckets buckets
    ) {
        ZoneId zoneId = ZoneId.of(apartment.getTimezone());
        Instant dayStart = boardDate.atStartOfDay(zoneId).toInstant();
        Instant nextDayStart = boardDate.plusDays(1).atStartOfDay(zoneId).toInstant();
        Instant windowEnd = boardDate.plusDays(days).atStartOfDay(zoneId).toInstant();
        List<ReservationEntity> reservations = reservationRepository
            .findByApartment_IdAndEndsAtAfterAndStartsAtBeforeOrderByStartsAtAsc(
                apartment.getId(),
                dayStart,
                windowEnd
            );
        String apartmentName = apartment.getName();

        for (ReservationEntity reservation : reservations) {
            OperationsBoardReservationResponse response = toBoardReservationResponse(
                reservation
            );
            LocalDate startsOn = reservation.getStartsAt().atZone(zoneId).toLocalDate();
            LocalDate endsOn = reservation.getEndsAt().atZone(zoneId).toLocalDate();

            if (startsOn.equals(boardDate)) {
                buckets.checkIns.add(new BoardEntry(response, apartmentName));
            }

            if (endsOn.equals(boardDate)) {
                buckets.checkOuts.add(new BoardEntry(response, apartmentName));
            }

            if (
                reservation.getStartsAt().isBefore(nextDayStart) &&
                reservation.getEndsAt().isAfter(dayStart)
            ) {
                buckets.inHouse.add(new BoardEntry(response, apartmentName));
            } else if (reservation.getStartsAt().isAfter(nextDayStart.minusNanos(1))) {
                buckets.upcoming.add(new BoardEntry(response, apartmentName));
            }
        }
    }

    private OperationsBoardResponse buildOperationsBoardResponse(
        String apartmentId,
        LocalDate boardDate,
        int days,
        String timezone,
        BoardBuckets buckets
    ) {
        List<OperationsBoardReservationResponse> checkIns = buckets.toResponses(buckets.checkIns);
        List<OperationsBoardReservationResponse> checkOuts = buckets.toResponses(buckets.checkOuts);
        List<OperationsBoardReservationResponse> inHouse = buckets.toResponses(buckets.inHouse);
        List<OperationsBoardReservationResponse> upcoming = buckets.toResponses(buckets.upcoming);

        return new OperationsBoardResponse(
            apartmentId,
            boardDate,
            days,
            timezone,
            section(checkIns),
            section(checkOuts),
            section(inHouse),
            section(upcoming),
            new OperationsBoardTotals(
                checkIns.size(),
                checkOuts.size(),
                inHouse.size(),
                upcoming.size()
            )
        );
    }

    private String resolveAggregateTimezone(List<ApartmentEntity> apartments) {
        if (apartments.isEmpty()) {
            return DEFAULT_TIMEZONE;
        }
        Set<String> timezones = apartments
            .stream()
            .map(ApartmentEntity::getTimezone)
            .collect(Collectors.toSet());
        return timezones.size() == 1 ? timezones.iterator().next() : "Todos";
    }

    private record BoardEntry(
        OperationsBoardReservationResponse response,
        String apartmentName
    ) {}

    private static final class BoardBuckets {

        private final List<BoardEntry> checkIns = new ArrayList<>();
        private final List<BoardEntry> checkOuts = new ArrayList<>();
        private final List<BoardEntry> inHouse = new ArrayList<>();
        private final List<BoardEntry> upcoming = new ArrayList<>();

        private void sortAll() {
            checkIns.sort(CHECK_IN_COMPARATOR);
            checkOuts.sort(CHECK_OUT_COMPARATOR);
            inHouse.sort(CHECK_IN_COMPARATOR);
            upcoming.sort(CHECK_IN_COMPARATOR);
        }

        private List<OperationsBoardReservationResponse> toResponses(List<BoardEntry> entries) {
            return entries.stream().map(BoardEntry::response).toList();
        }
    }

    private OperationsBoardSection section(
        List<OperationsBoardReservationResponse> reservations
    ) {
        return new OperationsBoardSection(reservations.size(), reservations);
    }

    private OperationsBoardReservationResponse toBoardReservationResponse(
        ReservationEntity reservation
    ) {
        return new OperationsBoardReservationResponse(
            reservation.getId(),
            reservation.getApartment().getId(),
            reservation.getIcalSource() != null ? reservation.getIcalSource().getId() : null,
            reservation.getIcalSource() != null ? reservation.getIcalSource().getProvider() : "manual",
            reservation.getStatus(),
            reservation.getStartsAt(),
            reservation.getEndsAt(),
            reservation.getRawSummary(),
            reservation.getGuestName(),
            reservation.getGuestCount()
        );
    }

    private SyncRunResponse toSyncRunResponse(SyncRunEntity syncRun) {
        IcalSourceEntity source = syncRun.getIcalSource();
        ApartmentEntity apartment = source.getApartment();
        return new SyncRunResponse(
            syncRun.getId(),
            source.getId(),
            apartment.getId(),
            apartment.getName(),
            source.getProvider(),
            source.getLabel(),
            syncRun.getStatus(),
            syncRun.getStartedAt(),
            syncRun.getFinishedAt(),
            syncRun.getEventsSeen(),
            syncRun.getReservationsUpserted(),
            syncRun.getReservationsCreated(),
            syncRun.getReservationsUpdated(),
            syncRun.getReservationsCancelled(),
            syncRun.getErrorMessage(),
            deserializeChanges(syncRun.getDiffDetailsJson())
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
