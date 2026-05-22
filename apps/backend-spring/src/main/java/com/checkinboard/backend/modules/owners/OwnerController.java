package com.checkinboard.backend.modules.owners;

import com.checkinboard.backend.modules.owners.dto.OwnerDtos.CreateOwnerRequest;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.OwnerEnvelope;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.OwnersResponse;
import com.checkinboard.backend.modules.owners.dto.OwnerDtos.UpdateOwnerRequest;
import com.checkinboard.backend.modules.owners.service.OwnerService;
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
@RequestMapping("/owners")
public class OwnerController {

    private final OwnerService ownerService;

    public OwnerController(OwnerService ownerService) {
        this.ownerService = ownerService;
    }

    @GetMapping
    OwnersResponse list(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ownerService.list(principal.userId());
    }

    @PostMapping
    ResponseEntity<OwnerEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateOwnerRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ownerService.create(principal.userId(), request));
    }

    @GetMapping("/{ownerId}")
    OwnerEnvelope get(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String ownerId
    ) {
        return ownerService.get(principal.userId(), ownerId);
    }

    @PutMapping("/{ownerId}")
    OwnerEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String ownerId,
        @Valid @RequestBody UpdateOwnerRequest request
    ) {
        return ownerService.update(principal.userId(), ownerId, request);
    }

    @DeleteMapping("/{ownerId}")
    ResponseEntity<Void> delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String ownerId
    ) {
        ownerService.delete(principal.userId(), ownerId);
        return ResponseEntity.noContent().build();
    }
}
