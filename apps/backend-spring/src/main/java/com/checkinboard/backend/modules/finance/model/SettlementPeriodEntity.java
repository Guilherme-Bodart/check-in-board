package com.checkinboard.backend.modules.finance.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
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
@Table(name = "settlement_periods")
public class SettlementPeriodEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private OrganizationEntity organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private OwnerEntity owner;

    @Column(name = "period_month", nullable = false)
    private String periodMonth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @Column(name = "paid_at")
    private Instant paidAt;

    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SettlementPeriodEntity() {}

    public SettlementPeriodEntity(
        String id,
        OrganizationEntity organization,
        ApartmentEntity apartment,
        OwnerEntity owner,
        String periodMonth
    ) {
        this.id = id;
        this.organization = organization;
        this.apartment = apartment;
        this.owner = owner;
        this.periodMonth = periodMonth;
        markPending(null);
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

    public OwnerEntity getOwner() {
        return owner;
    }

    public String getPeriodMonth() {
        return periodMonth;
    }

    public SettlementStatus getStatus() {
        return status;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public String getNotes() {
        return notes;
    }

    public void markPaid(String notes) {
        status = SettlementStatus.paid;
        paidAt = Instant.now();
        this.notes = notes;
    }

    public void markPending(String notes) {
        status = SettlementStatus.pending;
        paidAt = null;
        this.notes = notes;
    }
}
