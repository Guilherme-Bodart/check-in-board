package com.checkinboard.backend.modules.finance.repository;

import com.checkinboard.backend.modules.finance.model.RentalStayEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RentalStayRepository extends JpaRepository<RentalStayEntity, String> {
    @EntityGraph(attributePaths = { "organization", "apartment", "owner" })
    Optional<RentalStayEntity> findByIdAndDeletedAtIsNull(String id);

    @Query(
        """
        select stay
        from RentalStayEntity stay
        join fetch stay.apartment
        join fetch stay.owner
        where stay.organization.id = :organizationId
            and stay.deletedAt is null
            and stay.checkIn >= :dateFrom
            and stay.checkIn <= :dateTo
            and (:apartmentId is null or stay.apartment.id = :apartmentId)
            and (:ownerId is null or stay.owner.id = :ownerId)
        order by stay.checkIn desc, stay.createdAt desc
        """
    )
    List<RentalStayEntity> findByFilters(
        @Param("organizationId") String organizationId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,
        @Param("apartmentId") String apartmentId,
        @Param("ownerId") String ownerId
    );
}
