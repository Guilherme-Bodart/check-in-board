package com.checkinboard.backend.shared.security;

import com.checkinboard.backend.modules.auth.service.AuthServiceException;
import com.checkinboard.backend.modules.auth.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final JsonSecurityErrorHandler securityErrorHandler;

    public JwtAuthenticationFilter(
        JwtService jwtService,
        JsonSecurityErrorHandler securityErrorHandler
    ) {
        this.jwtService = jwtService;
        this.securityErrorHandler = securityErrorHandler;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");

        if (authorization == null || authorization.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authorization.startsWith("Bearer ")) {
            writeUnauthorized(response);
            return;
        }

        try {
            String token = authorization.substring("Bearer ".length()).trim();
            String userId = jwtService.verifyAccessToken(token);
            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId);

            SecurityContextHolder
                .getContext()
                .setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                        principal,
                        token,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    )
                );
        } catch (AuthServiceException exception) {
            writeUnauthorized(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        securityErrorHandler.write(
            response,
            HttpStatus.UNAUTHORIZED,
            "UNAUTHORIZED",
            "Authentication is required."
        );
    }
}
