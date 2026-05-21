package com.checkinboard.backend.modules.apartments;

import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentEnvelope;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.ApartmentsResponse;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.CreateApartmentRequest;
import com.checkinboard.backend.modules.apartments.dto.ApartmentDtos.UpdateApartmentRequest;
import com.checkinboard.backend.modules.apartments.service.ApartmentService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/apartments")
public class ApartmentController {

    private final ApartmentService apartmentService;

    public ApartmentController(ApartmentService apartmentService) {
        this.apartmentService = apartmentService;
    }

    @GetMapping
    ApartmentsResponse list(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return apartmentService.listAccessible(principal.userId());
    }

    @PostMapping
    ResponseEntity<ApartmentEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateApartmentRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(apartmentService.create(principal.userId(), request));
    }

    @GetMapping("/{apartmentId}")
    ApartmentEnvelope get(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        return apartmentService.get(principal.userId(), apartmentId);
    }

    @PutMapping("/{apartmentId}")
    ApartmentEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody UpdateApartmentRequest request
    ) {
        return apartmentService.update(principal.userId(), apartmentId, request);
    }

    @DeleteMapping("/{apartmentId}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        apartmentService.delete(principal.userId(), apartmentId);
        return ResponseEntity.noContent().build();
    }
}
