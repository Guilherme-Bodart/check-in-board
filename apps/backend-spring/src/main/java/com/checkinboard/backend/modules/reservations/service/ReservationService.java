package com.checkinboard.backend.modules.reservations.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.CreateManualReservationRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardSection;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardTotals;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationsResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.UpdateReservationRequest;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import com.checkinboard.backend.modules.reservations.repository.ReservationRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {

    private static final String DEFAULT_TIMEZONE = "America/Sao_Paulo";
    private static final Instant MIN_WINDOW_INSTANT = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant MAX_WINDOW_INSTANT = Instant.parse("2100-01-01T00:00:00Z");
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
    private final ReservationRepository reservationRepository;

    public ReservationService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        OrganizationMembershipRepository organizationMembershipRepository,
        ReservationRepository reservationRepository
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.reservationRepository = reservationRepository;
    }

    @Transactional(readOnly = true)
    public ReservationsResponse listAll(
        String userId,
        String apartmentId,
        LocalDate from,
        LocalDate to
    ) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid date range.");
        }

        List<String> apartmentIds;
        if (apartmentId != null && !apartmentId.isBlank() && !"all".equalsIgnoreCase(apartmentId.trim())) {
            String targetApartmentId = apartmentId.trim();
            assertCanView(userId, targetApartmentId);
            apartmentIds = List.of(targetApartmentId);
        } else {
            apartmentIds = visibleApartments(userId)
                .stream()
                .map(ApartmentEntity::getId)
                .toList();
        }

        if (apartmentIds.isEmpty()) {
            return new ReservationsResponse(List.of());
        }

        List<ReservationEntity> entities;
        if (from == null && to == null) {
            entities = reservationRepository.findByApartment_IdInOrderByStartsAtAsc(apartmentIds);
        } else {
            Instant windowStart = from != null
                ? from.minusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
                : MIN_WINDOW_INSTANT;
            Instant windowEnd = to != null
                ? to.plusDays(2).atStartOfDay(ZoneOffset.UTC).toInstant()
                : MAX_WINDOW_INSTANT;
            entities = reservationRepository
                .findByApartment_IdInAndEndsAtAfterAndStartsAtBeforeOrderByStartsAtAsc(
                    apartmentIds,
                    windowStart,
                    windowEnd
                );
        }

        return new ReservationsResponse(
            entities.stream().map(this::toResponse).toList()
        );
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

    @Transactional
    public ReservationResponse createManualReservation(
        String userId,
        String apartmentId,
        CreateManualReservationRequest request
    ) {
        ApartmentEntity apartment = requireHostAdminForApartment(userId, apartmentId);

        if (request.startsAt().isAfter(request.endsAt()) || request.startsAt().equals(request.endsAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid date range.");
        }

        ReservationEntity reservation = new ReservationEntity(
            newId(),
            apartment,
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
        requireHostAdminForApartment(userId, apartmentId);

        ReservationEntity reservation = reservationRepository
            .findById(reservationId)
            .filter(r -> r.getApartment().getId().equals(apartmentId))
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Reservation not found."));

        reservation.updateManualFields(request.guestName(), request.guestCount());
        reservationRepository.save(reservation);

        return toResponse(reservation);
    }

    private ApartmentEntity requireHostAdminForApartment(String userId, String apartmentId) {
        ApartmentEntity apartment = apartmentRepository
            .findByIdAndDeletedAtIsNull(apartmentId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "APARTMENT_NOT_FOUND",
                    "Apartment was not found."
                )
            );

        boolean isHostAdmin = organizationMembershipRepository.existsActiveRole(
            userId,
            apartment.getOrganization().getId(),
            AuthRole.host_admin
        );

        if (!isHostAdmin) {
            throw forbiddenApartmentAccess();
        }

        return apartment;
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
