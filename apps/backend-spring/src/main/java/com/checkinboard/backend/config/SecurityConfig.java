package com.checkinboard.backend.config;

import com.checkinboard.backend.shared.security.JsonSecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JsonSecurityErrorHandler securityErrorHandler;

    public SecurityConfig(JsonSecurityErrorHandler securityErrorHandler) {
        this.securityErrorHandler = securityErrorHandler;
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
            .logout(AbstractHttpConfigurer::disable);

        return http.build();
    }
}
