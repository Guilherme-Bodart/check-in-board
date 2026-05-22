package com.checkinboard.backend.modules.team;

import com.checkinboard.backend.modules.team.dto.TeamDtos.CreateTeamMemberRequest;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamMemberEnvelope;
import com.checkinboard.backend.modules.team.dto.TeamDtos.TeamMembersResponse;
import com.checkinboard.backend.modules.team.dto.TeamDtos.UpdateTeamMemberRequest;
import com.checkinboard.backend.modules.team.service.TeamService;
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
@RequestMapping("/team-members")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping
    TeamMembersResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return teamService.list(principal.userId());
    }

    @PostMapping
    ResponseEntity<TeamMemberEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody CreateTeamMemberRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(teamService.create(principal.userId(), request));
    }

    @PutMapping("/{membershipId}")
    TeamMemberEnvelope update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String membershipId,
        @Valid @RequestBody UpdateTeamMemberRequest request
    ) {
        return teamService.update(principal.userId(), membershipId, request);
    }

    @DeleteMapping("/{membershipId}")
    ResponseEntity<Void> deactivate(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String membershipId
    ) {
        teamService.deactivate(principal.userId(), membershipId);
        return ResponseEntity.noContent().build();
    }
}
