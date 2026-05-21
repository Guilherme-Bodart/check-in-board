package com.checkinboard.backend.modules.icalsources.repository;

import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IcalSourceRepository extends JpaRepository<IcalSourceEntity, String> {
    List<IcalSourceEntity> findByApartment_IdAndDeletedAtIsNullOrderByCreatedAtDesc(
        String apartmentId
    );
}
