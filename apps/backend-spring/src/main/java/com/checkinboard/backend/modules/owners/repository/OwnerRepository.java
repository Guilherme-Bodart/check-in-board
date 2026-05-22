package com.checkinboard.backend.modules.owners.repository;

import com.checkinboard.backend.modules.owners.model.OwnerEntity;
import com.checkinboard.backend.modules.owners.model.OwnerType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnerRepository extends JpaRepository<OwnerEntity, String> {
    @EntityGraph(attributePaths = "organization")
    List<OwnerEntity> findByOrganization_IdAndDeletedAtIsNullOrderByNameAsc(
        String organizationId
    );

    @EntityGraph(attributePaths = "organization")
    Optional<OwnerEntity> findFirstByOrganization_IdAndTypeAndDeletedAtIsNullOrderByCreatedAtAsc(
        String organizationId,
        OwnerType type
    );

    @EntityGraph(attributePaths = "organization")
    Optional<OwnerEntity> findByIdAndDeletedAtIsNull(String id);
}
