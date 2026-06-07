package com.checkinboard.backend.modules.finance.dto;

import com.checkinboard.backend.modules.finance.model.SettlementStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class FinanceMvpDtos {

    private FinanceMvpDtos() {}

    public record FinanceMvpSummaryResponse(
        String periodMonth,
        long rentCents,
        long extraRevenueCents,
        long expenseCents,
        long netCents,
        long commissionCents,
        long payoutCents,
        long stayCount,
        List<FinanceMvpSummaryItem> byOwner,
        List<FinanceMvpSummaryItem> byApartment,
        List<FinanceMvpStayItem> byStay
    ) {}

    public record FinanceMvpSummaryItem(
        String id,
        String name,
        String ownerId,
        String ownerName,
        String apartmentId,
        String apartmentName,
        int managementCommissionBps,
        long rentCents,
        long extraRevenueCents,
        long expenseCents,
        long netCents,
        long commissionCents,
        long payoutCents,
        long stayCount,
        SettlementStatus settlementStatus,
        Instant paidAt
    ) {}

    public record FinanceMvpStayItem(
        String id,
        String apartmentId,
        String apartmentName,
        String ownerId,
        String ownerName,
        String guestName,
        long rentCents,
        long expenseCents,
        long netCents,
        long commissionCents,
        long payoutCents,
        long stayCount
    ) {}

    public record SettlementResponse(
        String id,
        String periodMonth,
        String apartmentId,
        String apartmentName,
        String ownerId,
        String ownerName,
        SettlementStatus status,
        Instant paidAt,
        String notes
    ) {}

    public record SettlementsResponse(List<SettlementResponse> settlements) {}

    public record MarkSettlementRequest(
        @NotBlank @Size(max = 7) String periodMonth,
        @NotBlank @Size(max = 64) String apartmentId,
        @NotBlank @Size(max = 64) String ownerId,
        @Size(max = 1000) String notes
    ) {}

    public record SettlementEnvelope(SettlementResponse settlement) {}
}
