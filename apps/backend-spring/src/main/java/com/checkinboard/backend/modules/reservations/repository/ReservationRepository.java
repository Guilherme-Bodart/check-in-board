package com.checkinboard.backend.modules.reservations.repository;

import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<ReservationEntity, String> {
    @EntityGraph(attributePaths = { "apartment", "icalSource" })
    List<ReservationEntity> findByApartment_IdOrderByStartsAtAsc(String apartmentId);

    @EntityGraph(attributePaths = { "apartment", "icalSource" })
    Optional<ReservationEntity> findByIcalSource_IdAndExternalEventKey(
        String icalSourceId,
        String externalEventKey
    );

    @EntityGraph(attributePaths = { "apartment", "icalSource" })
    List<ReservationEntity> findByApartment_IdAndEndsAtAfterAndStartsAtBeforeOrderByStartsAtAsc(
        String apartmentId,
        Instant windowStart,
        Instant windowEnd
    );
}
