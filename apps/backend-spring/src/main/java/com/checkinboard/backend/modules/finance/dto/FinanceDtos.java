package com.checkinboard.backend.modules.finance.dto;

import com.checkinboard.backend.modules.finance.model.FinancialEntryType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public final class FinanceDtos {

    private FinanceDtos() {}

    public record UpsertFinancialEntryRequest(
        @NotBlank @Size(max = 64) String apartmentId,
        @Size(max = 64) String rentalStayId,
        @NotNull FinancialEntryType type,
        @NotBlank @Size(max = 80) String category,
        @Size(max = 500) String description,
        @Min(1) long amountCents,
        @Size(min = 3, max = 3) String currency,
        @NotNull LocalDate occurredOn
    ) {}

    public record FinancialEntryResponse(
        String id,
        String apartmentId,
        String apartmentName,
        String ownerId,
        String ownerName,
        String rentalStayId,
        FinancialEntryType type,
        String category,
        String description,
        long amountCents,
        String currency,
        LocalDate occurredOn
    ) {}

    public record FinancialEntryEnvelope(FinancialEntryResponse financialEntry) {}

    public record FinancialEntriesResponse(List<FinancialEntryResponse> financialEntries) {}

    public record FinancialSummaryItem(
        String id,
        String name,
        long revenueCents,
        long expenseCents,
        long profitCents
    ) {}

    public record FinancialSummaryResponse(
        LocalDate dateFrom,
        LocalDate dateTo,
        long revenueCents,
        long expenseCents,
        long profitCents,
        List<FinancialSummaryItem> byOwner,
        List<FinancialSummaryItem> byApartment
    ) {}
}
