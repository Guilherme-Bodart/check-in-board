package com.checkinboard.backend.modules.reservations.repository;

import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncRunRepository extends JpaRepository<SyncRunEntity, String> {
    @EntityGraph(attributePaths = { "icalSource" })
    List<SyncRunEntity> findTop10ByIcalSource_IdOrderByStartedAtDesc(String icalSourceId);
}
