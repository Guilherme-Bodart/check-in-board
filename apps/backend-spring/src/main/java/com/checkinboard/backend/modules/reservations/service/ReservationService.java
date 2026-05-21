package com.checkinboard.backend.modules.reservations.service;

import com.checkinboard.backend.integrations.ical.IcalReservationParser;
import com.checkinboard.backend.integrations.ical.IcalReservationParserException;
import com.checkinboard.backend.integrations.ical.ParsedIcalReservation;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import com.checkinboard.backend.modules.icalsources.repository.IcalSourceRepository;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncSummary;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationsResponse;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import com.checkinboard.backend.modules.reservations.repository.ReservationRepository;
import com.checkinboard.backend.modules.reservations.repository.SyncRunRepository;
import com.checkinboard.backend.shared.error.ApiException;
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

    public ReservationService(
        ApartmentMembershipRepository apartmentMembershipRepository,
        IcalSourceRepository icalSourceRepository,
        ReservationRepository reservationRepository,
        SyncRunRepository syncRunRepository,
        IcalReservationParser icalReservationParser
    ) {
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.icalSourceRepository = icalSourceRepository;
        this.reservationRepository = reservationRepository;
        this.syncRunRepository = syncRunRepository;
        this.icalReservationParser = icalReservationParser;
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

    @Transactional
    public ManualSyncResponse syncFromText(
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

        if (request.icsText() == null || request.icsText().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid sync payload.");
        }

        SyncRunEntity syncRun = syncRunRepository.save(new SyncRunEntity(newId(), icalSource));

        try {
            List<ParsedIcalReservation> parsedReservations = icalReservationParser.parse(
                request.icsText()
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
        }
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
            reservation.getIcalSource().getId(),
            reservation.getExternalEventKey(),
            reservation.getExternalUid(),
            reservation.getStatus(),
            reservation.getStartsAt(),
            reservation.getEndsAt(),
            reservation.getRawSummary(),
            reservation.getIcalSource().getProvider()
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
