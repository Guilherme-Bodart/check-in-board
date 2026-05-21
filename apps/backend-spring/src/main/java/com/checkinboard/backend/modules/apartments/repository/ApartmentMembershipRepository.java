package com.checkinboard.backend.modules.apartments.repository;

import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApartmentMembershipRepository
    extends JpaRepository<ApartmentMembershipEntity, String> {
    Optional<ApartmentMembershipEntity> findByApartment_IdAndUser_Id(
        String apartmentId,
        String userId
    );
}
