package com.checkinboard.backend.modules.reservations.repository;

import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncRunRepository extends JpaRepository<SyncRunEntity, String> {}
