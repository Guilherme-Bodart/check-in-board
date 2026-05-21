package com.checkinboard.backend.modules.apartments.repository;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApartmentRepository extends JpaRepository<ApartmentEntity, String> {
    @Query(
        """
        select distinct apartment
        from ApartmentEntity apartment
        join fetch apartment.organization
        join fetch apartment.memberships membership
        where apartment.deletedAt is null
            and membership.user.id = :userId
            and membership.canView = true
        order by apartment.name asc
        """
    )
    List<ApartmentEntity> findAccessibleByUserId(@Param("userId") String userId);

    @EntityGraph(attributePaths = { "organization", "memberships" })
    Optional<ApartmentEntity> findByIdAndDeletedAtIsNull(String id);
}
