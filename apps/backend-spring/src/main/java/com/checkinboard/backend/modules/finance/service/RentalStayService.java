package com.checkinboard.backend.modules.finance.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.RentalStayEnvelope;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.RentalStayResponse;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.RentalStaysResponse;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.UpsertRentalStayRequest;
import com.checkinboard.backend.modules.finance.model.RentalStayEntity;
import com.checkinboard.backend.modules.finance.repository.RentalStayRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RentalStayService {

    private final RentalStayRepository rentalStayRepository;
    private final ApartmentRepository apartmentRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public RentalStayService(
        RentalStayRepository rentalStayRepository,
        ApartmentRepository apartmentRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.rentalStayRepository = rentalStayRepository;
        this.apartmentRepository = apartmentRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public RentalStaysResponse list(
        String userId,
        LocalDate dateFrom,
        LocalDate dateTo,
        String apartmentId,
        String ownerId
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        DateRange dateRange = normalizeDateRange(dateFrom, dateTo);

        return new RentalStaysResponse(
            rentalStayRepository
                .findByFilters(
                    membership.getOrganization().getId(),
                    dateRange.dateFrom(),
                    dateRange.dateTo(),
                    normalizeOptional(apartmentId),
                    normalizeOptional(ownerId)
                )
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional
    public RentalStayEnvelope create(String userId, UpsertRentalStayRequest request) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        ApartmentEntity apartment = findApartmentInOrganization(
            request.apartmentId(),
            membership.getOrganization().getId()
        );
        RentalStayEntity stay = rentalStayRepository.save(
            new RentalStayEntity(
                normalizeOptional(request.id()) != null ? request.id().trim() : newId(),
                membership.getOrganization(),
                apartment,
                apartment.getOwner(),
                normalizeOptional(request.guestName()),
                normalizeOptional(request.channel()),
                request.checkIn(),
                validateCheckOut(request.checkIn(), request.checkOut()),
                request.rentAmountCents(),
                normalizeCurrency(request.currency()),
                normalizeOptional(request.notes())
            )
        );

        return new RentalStayEnvelope(toResponse(stay));
    }

    @Transactional
    public RentalStayEnvelope update(
        String userId,
        String rentalStayId,
        UpsertRentalStayRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        RentalStayEntity stay = findStayInOrganization(
            rentalStayId,
            membership.getOrganization().getId()
        );
        ApartmentEntity apartment = findApartmentInOrganization(
            request.apartmentId(),
            membership.getOrganization().getId()
        );

        stay.updateDetails(
            apartment,
            apartment.getOwner(),
            normalizeOptional(request.guestName()),
            normalizeOptional(request.channel()),
            request.checkIn(),
            validateCheckOut(request.checkIn(), request.checkOut()),
            request.rentAmountCents(),
            normalizeCurrency(request.currency()),
            normalizeOptional(request.notes())
        );

        return new RentalStayEnvelope(toResponse(rentalStayRepository.save(stay)));
    }

    @Transactional
    public void delete(String userId, String rentalStayId) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        RentalStayEntity stay = findStayInOrganization(
            rentalStayId,
            membership.getOrganization().getId()
        );
        stay.markDeleted();
        rentalStayRepository.save(stay);
    }

    private RentalStayEntity findStayInOrganization(
        String rentalStayId,
        String organizationId
    ) {
        RentalStayEntity stay = rentalStayRepository
            .findByIdAndDeletedAtIsNull(rentalStayId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "RENTAL_STAY_NOT_FOUND",
                    "Rental stay was not found."
                )
            );

        if (!stay.getOrganization().getId().equals(organizationId)) {
            throw forbidden();
        }

        return stay;
    }

    private ApartmentEntity findApartmentInOrganization(
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
            throw forbidden();
        }

        return apartment;
    }

    private OrganizationMembershipEntity getHostAdminMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            membership.getRole() != AuthRole.host_admin
        ) {
            throw forbidden();
        }

        return membership;
    }

    private RentalStayResponse toResponse(RentalStayEntity stay) {
        return new RentalStayResponse(
            stay.getId(),
            stay.getApartment().getId(),
            stay.getApartment().getName(),
            stay.getOwner().getId(),
            stay.getOwner().getName(),
            stay.getGuestName(),
            stay.getChannel(),
            stay.getCheckIn(),
            stay.getCheckOut(),
            stay.getRentAmountCents(),
            stay.getCurrency(),
            stay.getNotes()
        );
    }

    private DateRange normalizeDateRange(LocalDate dateFrom, LocalDate dateTo) {
        LocalDate start = dateFrom == null
            ? YearMonth.now().atDay(1)
            : dateFrom;
        LocalDate end = dateTo == null ? YearMonth.from(start).atEndOfMonth() : dateTo;

        if (end.isBefore(start)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "dateTo must be after dateFrom."
            );
        }

        return new DateRange(start, end);
    }

    private LocalDate validateCheckOut(LocalDate checkIn, LocalDate checkOut) {
        if (checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "checkOut must be after checkIn."
            );
        }

        return checkOut;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeCurrency(String value) {
        return value == null || value.isBlank()
            ? "BRL"
            : value.trim().toUpperCase(Locale.ROOT);
    }

    private ApiException forbidden() {
        return new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "You do not have permission to manage rental stays."
        );
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }

    private record DateRange(LocalDate dateFrom, LocalDate dateTo) {}
}
