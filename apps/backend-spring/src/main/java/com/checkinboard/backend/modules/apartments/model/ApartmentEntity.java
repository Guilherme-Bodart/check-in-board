package com.checkinboard.backend.modules.apartments.model;

import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "apartments")
public class ApartmentEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private OrganizationEntity organization;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String timezone;

    @Column(name = "management_commission_bps", nullable = false)
    private int managementCommissionBps;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private OwnerEntity owner;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "apartment")
    @OrderBy("createdAt asc")
    private List<ApartmentMembershipEntity> memberships = new ArrayList<>();

    protected ApartmentEntity() {}

    public ApartmentEntity(
        String id,
        OrganizationEntity organization,
        OwnerEntity owner,
        String name,
        String timezone,
        int managementCommissionBps
    ) {
        this.id = id;
        this.organization = organization;
        this.owner = owner;
        this.name = name;
        this.timezone = timezone;
        this.managementCommissionBps = managementCommissionBps;
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

    public String getTimezone() {
        return timezone;
    }

    public OwnerEntity getOwner() {
        return owner;
    }

    public int getManagementCommissionBps() {
        return managementCommissionBps;
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

    public List<ApartmentMembershipEntity> getMemberships() {
        return memberships;
    }

    public void updateDetails(
        String name,
        String timezone,
        OwnerEntity owner,
        int managementCommissionBps
    ) {
        this.name = name;
        this.timezone = timezone;
        this.owner = owner;
        this.managementCommissionBps = managementCommissionBps;
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
