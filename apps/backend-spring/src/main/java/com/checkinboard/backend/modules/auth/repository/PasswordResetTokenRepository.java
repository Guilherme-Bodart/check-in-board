package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.PasswordResetTokenEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository
    extends JpaRepository<PasswordResetTokenEntity, String> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);
}
