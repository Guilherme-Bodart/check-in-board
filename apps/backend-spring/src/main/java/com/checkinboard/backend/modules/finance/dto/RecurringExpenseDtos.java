package com.checkinboard.backend.modules.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class RecurringExpenseDtos {

    private RecurringExpenseDtos() {}

    public record CreateRecurringExpenseRequest(
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 80) String category,
        @Min(1) long amountCents,
        @Min(1) @Max(28) Integer dayOfMonth,
        @Size(max = 500) String notes,
        Boolean active
    ) {}

    public record UpdateRecurringExpenseRequest(
        @Size(max = 160) String title,
        @Size(max = 80) String category,
        @Min(1) Long amountCents,
        @Min(1) @Max(28) Integer dayOfMonth,
        @Size(max = 500) String notes,
        Boolean active
    ) {}

    public record RecurringExpenseItemResponse(
        String id,
        String apartmentId,
        String title,
        String category,
        long amountCents,
        int dayOfMonth,
        String notes,
        boolean active
    ) {}

    public record RecurringExpenseEnvelope(RecurringExpenseItemResponse item) {}

    public record RecurringExpensesListResponse(
        String apartmentId,
        List<RecurringExpenseItemResponse> items
    ) {}

    public record ApplyRecurringExpensesRequest(
        @NotBlank @Size(min = 7, max = 7) String month
    ) {}

    public record ApplyRecurringExpensesResponse(
        String month,
        int createdCount,
        int skippedCount,
        List<String> createdEntryIds
    ) {}
}
