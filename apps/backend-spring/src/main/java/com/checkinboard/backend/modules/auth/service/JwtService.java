package com.checkinboard.backend.modules.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.checkinboard.backend.config.AppProperties;
import com.checkinboard.backend.modules.auth.model.UserEntity;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final Algorithm algorithm;
    private final String serviceName;

    public JwtService(AppProperties appProperties) {
        this.algorithm = Algorithm.HMAC256(appProperties.authJwtSecret());
        this.serviceName = appProperties.serviceName();
    }

    public String issueAccessToken(UserEntity user) {
        Instant now = Instant.now();

        return JWT
            .create()
            .withIssuer(serviceName)
            .withAudience(serviceName)
            .withSubject(user.getId())
            .withClaim("email", user.getEmail())
            .withClaim("type", "access")
            .withIssuedAt(now)
            .withExpiresAt(now.plusSeconds(12 * 60 * 60))
            .sign(algorithm);
    }

    public String verifyAccessToken(String token) {
        JWTVerifier verifier = JWT
            .require(algorithm)
            .withIssuer(serviceName)
            .withAudience(serviceName)
            .withClaim("type", "access")
            .build();

        try {
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getSubject();
        } catch (JWTVerificationException exception) {
            throw new AuthServiceException(
                org.springframework.http.HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED",
                "Authentication is required."
            );
        }
    }
}
