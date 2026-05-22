package com.checkinboard.backend.modules.finance.repository;

import com.checkinboard.backend.modules.finance.model.FinancialEntryEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialEntryRepository
    extends JpaRepository<FinancialEntryEntity, String> {
    @EntityGraph(attributePaths = { "apartment", "owner", "organization" })
    Optional<FinancialEntryEntity> findByIdAndDeletedAtIsNull(String id);

    @Query(
        """
        select entry
        from FinancialEntryEntity entry
        join fetch entry.apartment
        join fetch entry.owner
        where entry.organization.id = :organizationId
            and entry.deletedAt is null
            and entry.occurredOn >= :dateFrom
            and entry.occurredOn <= :dateTo
            and (:apartmentId is null or entry.apartment.id = :apartmentId)
            and (:ownerId is null or entry.owner.id = :ownerId)
        order by entry.occurredOn desc, entry.createdAt desc
        """
    )
    List<FinancialEntryEntity> findByFilters(
        @Param("organizationId") String organizationId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,
        @Param("apartmentId") String apartmentId,
        @Param("ownerId") String ownerId
    );
}
