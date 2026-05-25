package com.checkinboard.backend.modules.icalsources;

import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.CreateIcalSourceRequest;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.IcalSourceEnvelope;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.IcalSourcesResponse;
import com.checkinboard.backend.modules.icalsources.dto.IcalSourceDtos.UpdateIcalSourceRequest;
import com.checkinboard.backend.modules.icalsources.service.IcalSourceService;
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
@RequestMapping("/apartments/{apartmentId}/ical-sources")
public class IcalSourceController {

    private final IcalSourceService icalSourceService;

    public IcalSourceController(IcalSourceService icalSourceService) {
        this.icalSourceService = icalSourceService;
    }

    @GetMapping
    IcalSourcesResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        return icalSourceService.list(principal.userId(), apartmentId);
    }

    @PostMapping
    ResponseEntity<IcalSourceEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody CreateIcalSourceRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(icalSourceService.create(principal.userId(), apartmentId, request));
    }

    @PutMapping("/{icalSourceId}")
    IcalSourceEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @PathVariable String icalSourceId,
        @Valid @RequestBody UpdateIcalSourceRequest request
    ) {
        return icalSourceService.update(
            principal.userId(),
            apartmentId,
            icalSourceId,
            request
        );
    }

    @DeleteMapping("/{icalSourceId}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @PathVariable String icalSourceId
    ) {
        icalSourceService.delete(principal.userId(), apartmentId, icalSourceId);
        return ResponseEntity.noContent().build();
    }
}
