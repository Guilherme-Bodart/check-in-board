package com.checkinboard.backend.modules.owners.model;

import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
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
@Table(name = "owners")
public class OwnerEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private OrganizationEntity organization;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OwnerType type;

    @Column(name = "contact_name")
    private String contactName;

    private String email;

    private String phone;

    private String notes;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected OwnerEntity() {}

    public OwnerEntity(
        String id,
        OrganizationEntity organization,
        String name,
        OwnerType type,
        String contactName,
        String email,
        String phone,
        String notes
    ) {
        this.id = id;
        this.organization = organization;
        this.name = name;
        this.type = type;
        this.contactName = contactName;
        this.email = email;
        this.phone = phone;
        this.notes = notes;
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

    public OrganizationEntity getOrganization() {
        return organization;
    }

    public String getName() {
        return name;
    }

    public OwnerType getType() {
        return type;
    }

    public String getContactName() {
        return contactName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateDetails(
        String name,
        OwnerType type,
        String contactName,
        String email,
        String phone,
        String notes
    ) {
        this.name = name;
        this.type = type;
        this.contactName = contactName;
        this.email = email;
        this.phone = phone;
        this.notes = notes;
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
