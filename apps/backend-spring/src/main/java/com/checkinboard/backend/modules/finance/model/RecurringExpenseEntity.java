package com.checkinboard.backend.modules.finance.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
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
@Table(name = "recurring_expenses")
public class RecurringExpenseEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private OrganizationEntity organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "day_of_month", nullable = false)
    private int dayOfMonth;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RecurringExpenseEntity() {}

    public RecurringExpenseEntity(
        String id,
        OrganizationEntity organization,
        ApartmentEntity apartment,
        String title,
        String category,
        long amountCents,
        int dayOfMonth,
        String notes,
        boolean active
    ) {
        this.id = id;
        this.organization = organization;
        this.apartment = apartment;
        this.title = title;
        this.category = category;
        this.amountCents = amountCents;
        this.dayOfMonth = dayOfMonth;
        this.notes = notes;
        this.active = active;
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

    public String getTitle() {
        return title;
    }

    public String getCategory() {
        return category;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public int getDayOfMonth() {
        return dayOfMonth;
    }

    public String getNotes() {
        return notes;
    }

    public boolean isActive() {
        return active;
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
        String title,
        String category,
        long amountCents,
        int dayOfMonth,
        String notes,
        boolean active
    ) {
        this.title = title;
        this.category = category;
        this.amountCents = amountCents;
        this.dayOfMonth = dayOfMonth;
        this.notes = notes;
        this.active = active;
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
