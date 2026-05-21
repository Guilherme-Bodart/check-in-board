package com.checkinboard.backend.config;

import com.checkinboard.backend.shared.security.JsonSecurityErrorHandler;
import com.checkinboard.backend.shared.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JsonSecurityErrorHandler securityErrorHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
        JsonSecurityErrorHandler securityErrorHandler,
        JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.securityErrorHandler = securityErrorHandler;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(authorize ->
                authorize
                    .requestMatchers(
                        "/health",
                        "/actuator/health",
                        "/auth/sign-up",
                        "/auth/sign-in",
                        "/v3/api-docs/**",
                        "/swagger-ui.html",
                        "/swagger-ui/**"
                    )
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            )
            .exceptionHandling(exceptions ->
                exceptions
                    .authenticationEntryPoint((request, response, exception) ->
                        securityErrorHandler.write(
                            response,
                            HttpStatus.UNAUTHORIZED,
                            "UNAUTHORIZED",
                            "Authentication is required."
                        )
                    )
                    .accessDeniedHandler((request, response, exception) ->
                        securityErrorHandler.write(
                            response,
                            HttpStatus.FORBIDDEN,
                            "FORBIDDEN",
                            "You do not have access to this resource."
                        )
                    )
            )
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
