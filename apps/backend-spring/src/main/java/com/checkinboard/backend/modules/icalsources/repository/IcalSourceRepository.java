package com.checkinboard.backend.modules.icalsources.repository;

import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IcalSourceRepository extends JpaRepository<IcalSourceEntity, String> {
    List<IcalSourceEntity> findByApartment_IdAndDeletedAtIsNullOrderByCreatedAtDesc(
        String apartmentId
    );

    @EntityGraph(attributePaths = { "apartment", "apartment.organization" })
    Optional<IcalSourceEntity> findByIdAndDeletedAtIsNull(String id);
}
