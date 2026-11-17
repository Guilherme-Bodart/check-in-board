package com.checkinboard.backend.modules.reservations.service;

import com.checkinboard.backend.integrations.ical.IcalFeedClient;
import com.checkinboard.backend.integrations.ical.IcalFeedFetchException;
import com.checkinboard.backend.integrations.ical.IcalReservationParser;
import com.checkinboard.backend.integrations.ical.IcalReservationParserException;
import com.checkinboard.backend.integrations.ical.ParsedIcalReservation;
import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import com.checkinboard.backend.modules.icalsources.repository.IcalSourceRepository;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicy;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicyException;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.AutoSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncSummary;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationResponse;
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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class IcalSyncService {

    private static final int MAX_RECORDED_CHANGES = 20;

    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final IcalSourceRepository icalSourceRepository;
    private final ReservationRepository reservationRepository;
    private final SyncRunRepository syncRunRepository;
    private final IcalReservationParser icalReservationParser;
    private final SecretEncryptionService secretEncryptionService;
    private final IcalUrlPolicy icalUrlPolicy;
    private final IcalFeedClient icalFeedClient;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public IcalSyncService(
        ApartmentMembershipRepository apartmentMembershipRepository,
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
        this.apartmentMembershipRepository = apartmentMembershipRepository;
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
        } catch (RuntimeException exception) {
            SyncRunResponse failedRun = recordSyncFailure(
                context,
                "Unexpected error during iCal sync."
            );
            if (throwOnError) {
                throw exception;
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
            Instant previousStartsAt = isNew ? null : existing.getStartsAt();
            Instant previousEndsAt = isNew ? null : existing.getEndsAt();

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
                boolean wasReactivated = previousStatus != ReservationStatus.confirmed;
                boolean datesChanged =
                    !Objects.equals(previousStartsAt, saved.getStartsAt()) ||
                    !Objects.equals(previousEndsAt, saved.getEndsAt());
                if (wasReactivated) {
                    addChangeIfUnderLimit(changes, saved, "created");
                } else if (datesChanged) {
                    addChangeIfUnderLimit(changes, saved, "updated");
                }
            }
        }

        Instant now = Instant.now();
        for (ReservationEntity existing : existingForSource) {
            if (
                existing.getExternalEventKey() != null &&
                !seenKeys.contains(existing.getExternalEventKey()) &&
                existing.getStatus() == ReservationStatus.confirmed &&
                existing.getEndsAt() != null &&
                existing.getEndsAt().isAfter(now)
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
            (syncRun.getDiffDetailsJson() != null && !syncRun.getDiffDetailsJson().isBlank()) ||
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
