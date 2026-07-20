package com.checkinboard.backend.modules.reservations;

import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.OperationsBoardResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationsResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.SyncRunsResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.CreateManualReservationRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.UpdateReservationRequest;
import com.checkinboard.backend.modules.reservations.service.ReservationService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping("/apartments/{apartmentId}/reservations")
    ReservationsResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        return reservationService.list(principal.userId(), apartmentId);
    }

    @PostMapping("/apartments/{apartmentId}/reservations")
    ReservationResponse createManualReservation(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody CreateManualReservationRequest request
    ) {
        return reservationService.createManualReservation(principal.userId(), apartmentId, request);
    }

    @PatchMapping("/apartments/{apartmentId}/reservations/{reservationId}")
    ReservationResponse updateReservation(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @PathVariable String reservationId,
        @Valid @RequestBody UpdateReservationRequest request
    ) {
        return reservationService.updateReservation(principal.userId(), apartmentId, reservationId, request);
    }

    @GetMapping("/apartments/{apartmentId}/operations-board")
    OperationsBoardResponse operationsBoard(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(defaultValue = "7") int days
    ) {
        return reservationService.operationsBoard(
            principal.userId(),
            apartmentId,
            date,
            days
        );
    }

    @PostMapping("/ical-sources/{icalSourceId}/sync")
    ManualSyncResponse sync(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String icalSourceId,
        @Valid @RequestBody(required = false) ManualSyncRequest request
    ) {
        return reservationService.sync(principal.userId(), icalSourceId, request);
    }

    @GetMapping("/ical-sources/{icalSourceId}/sync-runs")
    SyncRunsResponse syncRuns(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String icalSourceId
    ) {
        return reservationService.syncRuns(principal.userId(), icalSourceId);
    }
}
