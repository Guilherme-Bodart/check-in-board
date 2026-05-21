package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, String> {
    @EntityGraph(attributePaths = {
        "organizationMemberships",
        "organizationMemberships.organization",
    })
    Optional<UserEntity> findByEmail(String email);

    @EntityGraph(attributePaths = {
        "organizationMemberships",
        "organizationMemberships.organization",
    })
    Optional<UserEntity> findWithOrganizationMembershipsById(String id);
}
