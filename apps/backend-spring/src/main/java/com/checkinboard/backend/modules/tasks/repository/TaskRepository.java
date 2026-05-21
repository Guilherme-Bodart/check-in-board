package com.checkinboard.backend.modules.tasks.repository;

import com.checkinboard.backend.modules.tasks.model.TaskEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<TaskEntity, String> {
    @EntityGraph(attributePaths = {
        "apartment",
        "reservation",
        "completedByUser",
        "assignedUser",
    })
    List<TaskEntity> findByApartment_IdOrderByDueAtAsc(String apartmentId);

    @EntityGraph(attributePaths = {
        "apartment",
        "reservation",
        "completedByUser",
        "assignedUser",
    })
    List<TaskEntity> findByApartment_IdInAndDueAtGreaterThanEqualAndDueAtLessThanOrderByDueAtAsc(
        List<String> apartmentIds,
        Instant dueAfter,
        Instant dueBefore
    );
}
