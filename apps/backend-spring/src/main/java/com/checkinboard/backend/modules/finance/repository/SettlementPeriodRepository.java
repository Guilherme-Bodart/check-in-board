package com.checkinboard.backend.modules.finance.repository;

import com.checkinboard.backend.modules.finance.model.SettlementPeriodEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementPeriodRepository
    extends JpaRepository<SettlementPeriodEntity, String> {
    @EntityGraph(attributePaths = { "apartment", "owner" })
    List<SettlementPeriodEntity> findByOrganization_IdAndPeriodMonth(
        String organizationId,
        String periodMonth
    );

    Optional<SettlementPeriodEntity> findByOrganization_IdAndApartment_IdAndOwner_IdAndPeriodMonth(
        String organizationId,
        String apartmentId,
        String ownerId,
        String periodMonth
    );
}
