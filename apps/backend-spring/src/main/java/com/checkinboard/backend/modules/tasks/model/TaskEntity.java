package com.checkinboard.backend.modules.tasks.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.auth.model.UserEntity;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "tasks")
public class TaskEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private ReservationEntity reservation;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.pending;

    @Column(name = "status_note")
    private String statusNote;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by_user_id")
    private UserEntity completedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private UserEntity assignedUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private UserEntity createdByUser;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TaskEntity() {}

    public TaskEntity(
        String id,
        ApartmentEntity apartment,
        ReservationEntity reservation,
        String title,
        String description,
        Instant dueAt,
        UserEntity createdByUser
    ) {
        this.id = id;
        this.apartment = apartment;
        this.reservation = reservation;
        this.title = title;
        this.description = description;
        this.dueAt = dueAt;
        this.createdByUser = createdByUser;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void updateStatus(TaskStatus status, String statusNote, UserEntity completedByUser) {
        this.status = status;
        this.statusNote = statusNote;
        this.completedByUser = completedByUser;
        completedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public ApartmentEntity getApartment() {
        return apartment;
    }

    public ReservationEntity getReservation() {
        return reservation;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public String getStatusNote() {
        return statusNote;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public UserEntity getCompletedByUser() {
        return completedByUser;
    }

    public UserEntity getAssignedUser() {
        return assignedUser;
    }
}
