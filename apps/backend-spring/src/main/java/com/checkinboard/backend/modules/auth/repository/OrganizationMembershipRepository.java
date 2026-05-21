package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganizationMembershipRepository
    extends JpaRepository<OrganizationMembershipEntity, String> {
    @Query(
        """
        select membership
        from OrganizationMembershipEntity membership
        join fetch membership.organization
        join fetch membership.user
        where membership.user.id = :userId
        order by membership.createdAt asc
        """
    )
    Optional<OrganizationMembershipEntity> findPrimaryByUserId(
        @Param("userId") String userId
    );

    @Query(
        """
        select count(membership) > 0
        from OrganizationMembershipEntity membership
        where membership.user.id = :userId
            and membership.organization.id = :organizationId
            and membership.active = true
            and membership.role = :role
        """
    )
    boolean existsActiveRole(
        @Param("userId") String userId,
        @Param("organizationId") String organizationId,
        @Param("role") AuthRole role
    );
}
