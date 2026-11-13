package com.checkinboard.backend.modules.reservations.repository;

import com.checkinboard.backend.modules.reservations.model.SyncRunEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SyncRunRepository extends JpaRepository<SyncRunEntity, String> {
    @EntityGraph(attributePaths = { "icalSource", "icalSource.apartment" })
    List<SyncRunEntity> findTop10ByIcalSource_IdOrderByStartedAtDesc(String icalSourceId);

    @Query(
        """
        select run
        from SyncRunEntity run
        join fetch run.icalSource source
        join fetch source.apartment apartment
        where apartment.id in :apartmentIds
            and apartment.deletedAt is null
            and source.deletedAt is null
            and (
                run.reservationsCreated > 0
                or run.reservationsCancelled > 0
                or run.status = com.checkinboard.backend.modules.reservations.model.SyncRunStatus.failed
            )
        order by run.startedAt desc
        """
    )
    List<SyncRunEntity> findNotableByApartmentIds(
        @Param("apartmentIds") Collection<String> apartmentIds,
        Pageable pageable
    );
}
