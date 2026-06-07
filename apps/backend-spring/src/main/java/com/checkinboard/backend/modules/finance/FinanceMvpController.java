package com.checkinboard.backend.modules.finance;

import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.FinanceMvpSummaryResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.MarkSettlementRequest;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.SettlementEnvelope;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.SettlementsResponse;
import com.checkinboard.backend.modules.finance.service.FinanceMvpService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FinanceMvpController {

    private final FinanceMvpService financeMvpService;

    public FinanceMvpController(FinanceMvpService financeMvpService) {
        this.financeMvpService = financeMvpService;
    }

    @GetMapping("/finance-mvp/summary")
    FinanceMvpSummaryResponse summary(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String month,
        @RequestParam(required = false) String apartmentId,
        @RequestParam(required = false) String ownerId
    ) {
        return financeMvpService.summary(
            principal.userId(),
            month,
            apartmentId,
            ownerId
        );
    }

    @GetMapping("/finance-mvp/export.csv")
    ResponseEntity<String> exportCsv(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String month,
        @RequestParam(required = false) String apartmentId,
        @RequestParam(required = false) String ownerId
    ) {
        return ResponseEntity
            .ok()
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=finance-mvp.csv"
            )
            .contentType(new MediaType("text", "csv"))
            .body(
                financeMvpService.exportCsv(
                    principal.userId(),
                    month,
                    apartmentId,
                    ownerId
                )
            );
    }

    @GetMapping("/settlements")
    SettlementsResponse settlements(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String month
    ) {
        return financeMvpService.settlements(principal.userId(), month);
    }

    @PostMapping("/settlements/mark-paid")
    SettlementEnvelope markPaid(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody MarkSettlementRequest request
    ) {
        return financeMvpService.markPaid(principal.userId(), request);
    }

    @PostMapping("/settlements/mark-unpaid")
    SettlementEnvelope markUnpaid(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody MarkSettlementRequest request
    ) {
        return financeMvpService.markUnpaid(principal.userId(), request);
    }
}
