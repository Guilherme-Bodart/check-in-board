package com.checkinboard.backend.modules.icalsources.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "ical_sources")
public class IcalSourceEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String label;

    @Column(name = "ical_url_encrypted", nullable = false)
    private String icalUrlEncrypted;

    @Column(name = "sync_enabled", nullable = false)
    private boolean syncEnabled = true;

    private String etag;

    @Column(name = "last_modified_at")
    private Instant lastModifiedAt;

    @Column(name = "last_success_at")
    private Instant lastSuccessAt;

    @Column(name = "last_failure_at")
    private Instant lastFailureAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected IcalSourceEntity() {}

    public IcalSourceEntity(
        String id,
        ApartmentEntity apartment,
        String provider,
        String label,
        String icalUrlEncrypted
    ) {
        this.id = id;
        this.apartment = apartment;
        this.provider = provider;
        this.label = label;
        this.icalUrlEncrypted = icalUrlEncrypted;
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

    public String getProvider() {
        return provider;
    }

    public String getLabel() {
        return label;
    }

    public String getIcalUrlEncrypted() {
        return icalUrlEncrypted;
    }

    public boolean isSyncEnabled() {
        return syncEnabled;
    }

    public String getEtag() {
        return etag;
    }

    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    public Instant getLastSuccessAt() {
        return lastSuccessAt;
    }

    public Instant getLastFailureAt() {
        return lastFailureAt;
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

    public void markSyncSuccess() {
        lastSuccessAt = Instant.now();
        lastFailureAt = null;
    }

    public void markSyncFailure() {
        lastFailureAt = Instant.now();
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
