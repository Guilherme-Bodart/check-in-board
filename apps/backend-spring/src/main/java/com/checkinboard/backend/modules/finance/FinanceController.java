package com.checkinboard.backend.modules.finance;

import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialEntriesResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialEntryEnvelope;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialSummaryResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.UpsertFinancialEntryRequest;
import com.checkinboard.backend.modules.finance.service.FinanceService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/financial-entries")
    FinancialEntriesResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(required = false) String apartmentId,
        @RequestParam(required = false) String ownerId
    ) {
        return financeService.list(
            principal.userId(),
            dateFrom,
            dateTo,
            apartmentId,
            ownerId
        );
    }

    @GetMapping("/financial-summary")
    FinancialSummaryResponse summary(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(required = false) String apartmentId,
        @RequestParam(required = false) String ownerId
    ) {
        return financeService.summary(
            principal.userId(),
            dateFrom,
            dateTo,
            apartmentId,
            ownerId
        );
    }

    @PostMapping("/financial-entries")
    ResponseEntity<FinancialEntryEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody UpsertFinancialEntryRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(financeService.create(principal.userId(), request));
    }

    @PutMapping("/financial-entries/{entryId}")
    FinancialEntryEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String entryId,
        @Valid @RequestBody UpsertFinancialEntryRequest request
    ) {
        return financeService.update(principal.userId(), entryId, request);
    }

    @DeleteMapping("/financial-entries/{entryId}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String entryId
    ) {
        financeService.delete(principal.userId(), entryId);
        return ResponseEntity.noContent().build();
    }
}
