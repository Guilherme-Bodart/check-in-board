package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganizationMembershipRepository
    extends JpaRepository<OrganizationMembershipEntity, String> {
    @EntityGraph(attributePaths = { "organization", "user" })
    Optional<OrganizationMembershipEntity> findFirstByUser_IdOrderByActiveDescCreatedAtAsc(
        String userId
    );

    @EntityGraph(attributePaths = { "organization", "user" })
    Optional<OrganizationMembershipEntity> findFirstByUser_IdAndActiveTrueOrderByCreatedAtAsc(
        String userId
    );

    default Optional<OrganizationMembershipEntity> findPrimaryByUserId(String userId) {
        return findFirstByUser_IdOrderByActiveDescCreatedAtAsc(userId);
    }

    @Query(
        """
        select membership
        from OrganizationMembershipEntity membership
        join fetch membership.organization
        join fetch membership.user
        where membership.organization.id = :organizationId
        order by membership.createdAt asc
        """
    )
    List<OrganizationMembershipEntity> findByOrganizationIdWithUser(
        @Param("organizationId") String organizationId
    );

    @Query(
        """
        select membership
        from OrganizationMembershipEntity membership
        join fetch membership.organization
        join fetch membership.user
        where membership.id = :membershipId
        """
    )
    Optional<OrganizationMembershipEntity> findByIdWithUserAndOrganization(
        @Param("membershipId") String membershipId
    );

    Optional<OrganizationMembershipEntity> findByOrganization_IdAndUser_Id(
        String organizationId,
        String userId
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
