package com.checkinboard.backend.modules.finance;

import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.RentalStayEnvelope;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.RentalStaysResponse;
import com.checkinboard.backend.modules.finance.dto.RentalStayDtos.UpsertRentalStayRequest;
import com.checkinboard.backend.modules.finance.service.RentalStayService;
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
public class RentalStayController {

    private final RentalStayService rentalStayService;

    public RentalStayController(RentalStayService rentalStayService) {
        this.rentalStayService = rentalStayService;
    }

    @GetMapping("/rental-stays")
    RentalStaysResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(required = false) String apartmentId,
        @RequestParam(required = false) String ownerId
    ) {
        return rentalStayService.list(
            principal.userId(),
            dateFrom,
            dateTo,
            apartmentId,
            ownerId
        );
    }

    @PostMapping("/rental-stays")
    ResponseEntity<RentalStayEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody UpsertRentalStayRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(rentalStayService.create(principal.userId(), request));
    }

    @PutMapping("/rental-stays/{rentalStayId}")
    RentalStayEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String rentalStayId,
        @Valid @RequestBody UpsertRentalStayRequest request
    ) {
        return rentalStayService.update(principal.userId(), rentalStayId, request);
    }

    @DeleteMapping("/rental-stays/{rentalStayId}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String rentalStayId
    ) {
        rentalStayService.delete(principal.userId(), rentalStayId);
        return ResponseEntity.noContent().build();
    }
}
