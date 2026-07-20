package com.checkinboard.backend.modules.finance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public final class RentalStayDtos {

    private RentalStayDtos() {}

    public record UpsertRentalStayRequest(
        @Size(max = 64) String id,
        @NotBlank @Size(max = 64) String apartmentId,
        @Size(max = 160) String guestName,
        @Size(max = 80) String channel,
        @NotNull LocalDate checkIn,
        @NotNull LocalDate checkOut,
        @Min(1) long rentAmountCents,
        @Size(min = 3, max = 3) String currency,
        @Size(max = 1000) String notes
    ) {}

    public record RentalStayResponse(
        String id,
        String apartmentId,
        String apartmentName,
        String ownerId,
        String ownerName,
        String guestName,
        String channel,
        LocalDate checkIn,
        LocalDate checkOut,
        long rentAmountCents,
        String currency,
        String notes
    ) {}

    public record RentalStayEnvelope(RentalStayResponse rentalStay) {}

    public record RentalStaysResponse(List<RentalStayResponse> rentalStays) {}
}
