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
import java.time.LocalDate;

@Entity
@Table(name = "financial_entries")
public class FinancialEntryEntity {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_stay_id")
    private RentalStayEntity rentalStay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FinancialEntryType type;

    @Column(nullable = false)
    private String category;

    private String description;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(nullable = false)
    private String currency;

    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FinancialEntryEntity() {}

    public FinancialEntryEntity(
        String id,
        OrganizationEntity organization,
        ApartmentEntity apartment,
        OwnerEntity owner,
        RentalStayEntity rentalStay,
        FinancialEntryType type,
        String category,
        String description,
        long amountCents,
        String currency,
        LocalDate occurredOn
    ) {
        this.id = id;
        this.organization = organization;
        this.apartment = apartment;
        this.owner = owner;
        this.rentalStay = rentalStay;
        this.type = type;
        this.category = category;
        this.description = description;
        this.amountCents = amountCents;
        this.currency = currency;
        this.occurredOn = occurredOn;
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

    public ApartmentEntity getApartment() {
        return apartment;
    }

    public OwnerEntity getOwner() {
        return owner;
    }

    public RentalStayEntity getRentalStay() {
        return rentalStay;
    }

    public FinancialEntryType getType() {
        return type;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public String getCurrency() {
        return currency;
    }

    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void updateDetails(
        ApartmentEntity apartment,
        OwnerEntity owner,
        RentalStayEntity rentalStay,
        FinancialEntryType type,
        String category,
        String description,
        long amountCents,
        String currency,
        LocalDate occurredOn
    ) {
        this.apartment = apartment;
        this.owner = owner;
        this.rentalStay = rentalStay;
        this.type = type;
        this.category = category;
        this.description = description;
        this.amountCents = amountCents;
        this.currency = currency;
        this.occurredOn = occurredOn;
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
