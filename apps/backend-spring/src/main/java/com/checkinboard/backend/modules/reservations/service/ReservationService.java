package com.checkinboard.backend.modules.reservations.service;

import com.checkinboard.backend.integrations.ical.IcalFeedClient;
import com.checkinboard.backend.integrations.ical.IcalFeedFetchException;
import com.checkinboard.backend.integrations.ical.IcalReservationParser;
import com.checkinboard.backend.integrations.ical.IcalReservationParserException;
import com.checkinboard.backend.integrations.ical.ParsedIcalReservation;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import com.checkinboard.backend.modules.icalsources.repository.IcalSourceRepository;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicy;
import com.checkinboard.backend.modules.icalsources.service.IcalUrlPolicyException;
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
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncRunResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncRunsResponse;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import com.checkinboard.backend.modules.reservations.repository.ReservationRepository;
import com.checkinboard.backend.modules.reservations.repository.SyncRunRepository;
import com.checkinboard.backend.shared.crypto.SecretEncryptionService;
import com.checkinboard.backend.shared.error.ApiException;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {

    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final IcalSourceRepository icalSourceRepository;
    private final ReservationRepository reservationRepository;
    private final SyncRunRepository syncRunRepository;
    private final IcalReservationParser icalReservationParser;
    private final SecretEncryptionService secretEncryptionService;
    private final IcalUrlPolicy icalUrlPolicy;
    private final IcalFeedClient icalFeedClient;

    public ReservationService(
        ApartmentMembershipRepository apartmentMembershipRepository,
        IcalSourceRepository icalSourceRepository,
        ReservationRepository reservationRepository,
        SyncRunRepository syncRunRepository,
        IcalReservationParser icalReservationParser,
        SecretEncryptionService secretEncryptionService,
        IcalUrlPolicy icalUrlPolicy,
        IcalFeedClient icalFeedClient
    ) {
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.icalSourceRepository = icalSourceRepository;
        this.reservationRepository = reservationRepository;
        this.syncRunRepository = syncRunRepository;
        this.icalReservationParser = icalReservationParser;
        this.secretEncryptionService = secretEncryptionService;
        this.icalUrlPolicy = icalUrlPolicy;
        this.icalFeedClient = icalFeedClient;
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

        if (days < 1 || days > 31) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Board window must be between 1 and 31 days."
            );
        }

        ZoneId zoneId = ZoneId.of(membership.getApartment().getTimezone());
        LocalDate boardDate = date != null ? date : LocalDate.now(zoneId);
        Instant dayStart = boardDate.atStartOfDay(zoneId).toInstant();
        Instant nextDayStart = boardDate.plusDays(1).atStartOfDay(zoneId).toInstant();
        Instant windowEnd = boardDate.plusDays(days).atStartOfDay(zoneId).toInstant();
        List<ReservationEntity> reservations = reservationRepository
            .findByApartment_IdAndEndsAtAfterAndStartsAtBeforeOrderByStartsAtAsc(
                apartmentId,
                dayStart,
                windowEnd
            );
        List<OperationsBoardReservationResponse> checkIns = new ArrayList<>();
        List<OperationsBoardReservationResponse> checkOuts = new ArrayList<>();
        List<OperationsBoardReservationResponse> inHouse = new ArrayList<>();
        List<OperationsBoardReservationResponse> upcoming = new ArrayList<>();

        for (ReservationEntity reservation : reservations) {
            OperationsBoardReservationResponse response = toBoardReservationResponse(
                reservation
            );
            LocalDate startsOn = reservation.getStartsAt().atZone(zoneId).toLocalDate();
            LocalDate endsOn = reservation.getEndsAt().atZone(zoneId).toLocalDate();

            if (startsOn.equals(boardDate)) {
                checkIns.add(response);
            }

            if (endsOn.equals(boardDate)) {
                checkOuts.add(response);
            }

            if (
                reservation.getStartsAt().isBefore(nextDayStart) &&
                reservation.getEndsAt().isAfter(dayStart)
            ) {
                inHouse.add(response);
            } else if (reservation.getStartsAt().isAfter(nextDayStart.minusNanos(1))) {
                upcoming.add(response);
            }
        }

        return new OperationsBoardResponse(
            apartmentId,
            boardDate,
            days,
            zoneId.getId(),
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

    @Transactional(noRollbackFor = ApiException.class)
    public ManualSyncResponse sync(
        String userId,
        String icalSourceId,
        ManualSyncRequest request
    ) {
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

            return new ManualSyncResponse(
                List.of(),
                new ManualSyncSummary(0, 0, true, reason)
            );
        }

        try {
            String icsText = resolveIcsText(icalSource, request);
            ZoneId apartmentZone = ZoneId.of(icalSource.getApartment().getTimezone());
            List<ParsedIcalReservation> parsedReservations = icalReservationParser.parse(
                icsText,
                apartmentZone
            );
            List<ReservationResponse> reservations = new ArrayList<>();

            for (ParsedIcalReservation parsedReservation : parsedReservations) {
                reservations.add(toResponse(upsertReservation(icalSource, parsedReservation)));
            }

            syncRun.markSucceeded(parsedReservations.size(), reservations.size());
            icalSource.markSyncSuccess();
            syncRunRepository.save(syncRun);
            icalSourceRepository.save(icalSource);

            return new ManualSyncResponse(
                reservations,
                new ManualSyncSummary(
                    parsedReservations.size(),
                    reservations.size(),
                    false,
                    null
                )
            );
        } catch (IcalReservationParserException exception) {
            syncRun.markFailed(exception.getMessage());
            icalSource.markSyncFailure();
            syncRunRepository.save(syncRun);
            icalSourceRepository.save(icalSource);
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", exception.getMessage());
        } catch (IcalFeedFetchException exception) {
            syncRun.markFailed(exception.getMessage());
            icalSource.markSyncFailure();
            syncRunRepository.save(syncRun);
            icalSourceRepository.save(icalSource);
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "ICAL_FETCH_FAILED",
                exception.getMessage()
            );
        } catch (IcalUrlPolicyException | IllegalArgumentException | IllegalStateException exception) {
            syncRun.markFailed("Stored iCal URL is invalid.");
            icalSource.markSyncFailure();
            syncRunRepository.save(syncRun);
            icalSourceRepository.save(icalSource);
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "UNSAFE_ICAL_URL",
                "Stored iCal URL is invalid."
            );
        }
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

    private String resolveIcsText(IcalSourceEntity icalSource, ManualSyncRequest request) {
        if (request != null && request.icsText() != null) {
            return request.icsText();
        }

        String decryptedUrl = secretEncryptionService.decrypt(
            icalSource.getIcalUrlEncrypted()
        );
        URI safeUri = icalUrlPolicy.assertSafe(decryptedUrl);
        return icalFeedClient.fetch(safeUri);
    }

    private ReservationEntity upsertReservation(
        IcalSourceEntity icalSource,
        ParsedIcalReservation parsedReservation
    ) {
        ReservationEntity reservation = reservationRepository
            .findByIcalSource_IdAndExternalEventKey(
                icalSource.getId(),
                parsedReservation.externalEventKey()
            )
            .orElseGet(() ->
                new ReservationEntity(
                    newId(),
                    icalSource.getApartment(),
                    icalSource,
                    parsedReservation.externalEventKey()
                )
            );

        reservation.applyFeedData(
            parsedReservation.externalUid(),
            parsedReservation.startsAt(),
            parsedReservation.endsAt(),
            parsedReservation.rawSummary(),
            parsedReservation.rawPayload()
        );

        return reservationRepository.save(reservation);
    }

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
        return new SyncRunResponse(
            syncRun.getId(),
            syncRun.getIcalSource().getId(),
            syncRun.getStatus(),
            syncRun.getStartedAt(),
            syncRun.getFinishedAt(),
            syncRun.getEventsSeen(),
            syncRun.getReservationsUpserted(),
            syncRun.getErrorMessage()
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
