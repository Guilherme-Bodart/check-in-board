package com.checkinboard.backend.modules.reservations.model;

import com.checkinboard.backend.modules.icalsources.model.IcalSourceEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sync_runs")
public class SyncRunEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ical_source_id", nullable = false)
    private IcalSourceEntity icalSource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SyncRunStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "events_seen", nullable = false)
    private int eventsSeen;

    @Column(name = "reservations_upserted", nullable = false)
    private int reservationsUpserted;

    @Column(name = "error_message")
    private String errorMessage;

    protected SyncRunEntity() {}

    public SyncRunEntity(String id, IcalSourceEntity icalSource) {
        this.id = id;
        this.icalSource = icalSource;
        status = SyncRunStatus.running;
    }

    @PrePersist
    void prePersist() {
        startedAt = Instant.now();
    }

    public void markSucceeded(int eventsSeen, int reservationsUpserted) {
        status = SyncRunStatus.succeeded;
        finishedAt = Instant.now();
        this.eventsSeen = eventsSeen;
        this.reservationsUpserted = reservationsUpserted;
    }

    public void markFailed(String errorMessage) {
        status = SyncRunStatus.failed;
        finishedAt = Instant.now();
        this.errorMessage = errorMessage;
    }

    public void markSkipped(String reason) {
        status = SyncRunStatus.skipped;
        finishedAt = Instant.now();
        errorMessage = reason;
    }

    public String getId() {
        return id;
    }

    public IcalSourceEntity getIcalSource() {
        return icalSource;
    }

    public SyncRunStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public int getEventsSeen() {
        return eventsSeen;
    }

    public int getReservationsUpserted() {
        return reservationsUpserted;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
