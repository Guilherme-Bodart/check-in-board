package com.checkinboard.backend.modules.finance;

import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.ApplyRecurringExpensesRequest;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.ApplyRecurringExpensesResponse;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.CreateRecurringExpenseRequest;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.RecurringExpenseEnvelope;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.RecurringExpensesListResponse;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.UpdateRecurringExpenseRequest;
import com.checkinboard.backend.modules.finance.service.RecurringExpenseService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RecurringExpenseController {

    private final RecurringExpenseService recurringExpenseService;

    public RecurringExpenseController(RecurringExpenseService recurringExpenseService) {
        this.recurringExpenseService = recurringExpenseService;
    }

    @GetMapping("/apartments/{apartmentId}/recurring-expenses")
    RecurringExpensesListResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        return recurringExpenseService.list(principal.userId(), apartmentId);
    }

    @PostMapping("/apartments/{apartmentId}/recurring-expenses")
    ResponseEntity<RecurringExpenseEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody CreateRecurringExpenseRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(recurringExpenseService.create(principal.userId(), apartmentId, request));
    }

    @PatchMapping("/recurring-expenses/{id}")
    RecurringExpenseEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String id,
        @Valid @RequestBody UpdateRecurringExpenseRequest request
    ) {
        return recurringExpenseService.update(principal.userId(), id, request);
    }

    @DeleteMapping("/recurring-expenses/{id}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String id
    ) {
        recurringExpenseService.delete(principal.userId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/apartments/{apartmentId}/recurring-expenses/apply-month")
    ApplyRecurringExpensesResponse applyMonth(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody ApplyRecurringExpensesRequest request
    ) {
        return recurringExpenseService.applyMonth(
            principal.userId(),
            apartmentId,
            request
        );
    }
}
