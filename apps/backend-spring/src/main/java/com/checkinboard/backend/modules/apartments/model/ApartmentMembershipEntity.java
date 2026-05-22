package com.checkinboard.backend.modules.apartments.model;

import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.UserEntity;
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
@Table(name = "apartment_memberships")
public class ApartmentMembershipEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthRole role;

    @Column(name = "can_view", nullable = false)
    private boolean canView = true;

    @Column(name = "can_update_task_status", nullable = false)
    private boolean canUpdateTaskStatus;

    @Column(name = "can_manage_integrations", nullable = false)
    private boolean canManageIntegrations;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ApartmentMembershipEntity() {}

    public ApartmentMembershipEntity(
        String id,
        ApartmentEntity apartment,
        UserEntity user,
        AuthRole role,
        boolean canView,
        boolean canUpdateTaskStatus,
        boolean canManageIntegrations
    ) {
        this.id = id;
        this.apartment = apartment;
        this.user = user;
        this.role = role;
        this.canView = canView;
        this.canUpdateTaskStatus = canUpdateTaskStatus;
        this.canManageIntegrations = canManageIntegrations;
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

    public String getId() {
        return id;
    }

    public ApartmentEntity getApartment() {
        return apartment;
    }

    public UserEntity getUser() {
        return user;
    }

    public AuthRole getRole() {
        return role;
    }

    public boolean canView() {
        return canView;
    }

    public boolean canUpdateTaskStatus() {
        return canUpdateTaskStatus;
    }

    public boolean canManageIntegrations() {
        return canManageIntegrations;
    }

    public void updatePermissions(
        AuthRole role,
        boolean canView,
        boolean canUpdateTaskStatus,
        boolean canManageIntegrations
    ) {
        this.role = role;
        this.canView = canView;
        this.canUpdateTaskStatus = canUpdateTaskStatus;
        this.canManageIntegrations = canManageIntegrations;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
