package com.checkinboard.backend.modules.reservations;

import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncRequest;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ManualSyncResponse;
import com.checkinboard.backend.modules.reservations.dto.ReservationDtos.ReservationsResponse;
import com.checkinboard.backend.modules.reservations.service.ReservationService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/ical-sources/{icalSourceId}/sync")
    ManualSyncResponse sync(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String icalSourceId,
        @Valid @RequestBody ManualSyncRequest request
    ) {
        return reservationService.syncFromText(principal.userId(), icalSourceId, request);
    }
}
