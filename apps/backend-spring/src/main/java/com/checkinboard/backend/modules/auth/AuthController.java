package com.checkinboard.backend.modules.auth;

import com.checkinboard.backend.modules.auth.dto.AuthDtos.AuthResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.ChangePasswordRequest;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.MeResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.OkResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.PasswordResetRequestedResponse;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.RequestPasswordResetRequest;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.ResetPasswordRequest;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.SignInRequest;
import com.checkinboard.backend.modules.auth.dto.AuthDtos.SignUpRequest;
import com.checkinboard.backend.modules.auth.service.AuthService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/sign-up")
    ResponseEntity<AuthResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signUp(request));
    }

    @PostMapping("/sign-in")
    AuthResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }

    @GetMapping("/me")
    MeResponse me(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return authService.me(principal.userId());
    }

    @PostMapping("/change-password")
    OkResponse changePassword(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        return authService.changePassword(principal.userId(), request);
    }

    @PostMapping("/password-reset/request")
    ResponseEntity<PasswordResetRequestedResponse> requestPasswordReset(
        @Valid @RequestBody RequestPasswordResetRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.ACCEPTED)
            .body(authService.requestPasswordReset(request));
    }

    @PostMapping("/password-reset/confirm")
    OkResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}
