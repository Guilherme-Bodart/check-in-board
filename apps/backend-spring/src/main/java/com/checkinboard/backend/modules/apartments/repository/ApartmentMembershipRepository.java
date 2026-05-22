package com.checkinboard.backend.modules.apartments.repository;

import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApartmentMembershipRepository
    extends JpaRepository<ApartmentMembershipEntity, String> {
    Optional<ApartmentMembershipEntity> findByApartment_IdAndUser_Id(
        String apartmentId,
        String userId
    );

    List<ApartmentMembershipEntity> findByUser_IdAndCanViewTrue(String userId);

    @Query(
        """
        select membership
        from ApartmentMembershipEntity membership
        join fetch membership.apartment
        where membership.user.id = :userId
            and membership.apartment.organization.id = :organizationId
        order by membership.apartment.name asc
        """
    )
    List<ApartmentMembershipEntity> findByUserIdAndOrganizationId(
        @Param("userId") String userId,
        @Param("organizationId") String organizationId
    );

    Optional<ApartmentMembershipEntity> findByApartment_IdAndUser_IdAndApartment_Organization_Id(
        String apartmentId,
        String userId,
        String organizationId
    );

    void deleteByUser_IdAndApartment_Organization_Id(String userId, String organizationId);
}
