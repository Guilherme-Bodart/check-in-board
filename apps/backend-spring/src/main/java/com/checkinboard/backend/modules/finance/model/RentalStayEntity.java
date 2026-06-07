package com.checkinboard.backend.modules.finance.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
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
import java.time.LocalDate;

@Entity
@Table(name = "rental_stays")
public class RentalStayEntity {

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

    @Column(name = "guest_name")
    private String guestName;

    private String channel;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "rent_amount_cents", nullable = false)
    private long rentAmountCents;

    @Column(nullable = false)
    private String currency;

    private String notes;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RentalStayEntity() {}

    public RentalStayEntity(
        String id,
        OrganizationEntity organization,
        ApartmentEntity apartment,
        OwnerEntity owner,
        String guestName,
        String channel,
        LocalDate checkIn,
        LocalDate checkOut,
        long rentAmountCents,
        String currency,
        String notes
    ) {
        this.id = id;
        this.organization = organization;
        this.apartment = apartment;
        this.owner = owner;
        this.guestName = guestName;
        this.channel = channel;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.rentAmountCents = rentAmountCents;
        this.currency = currency;
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

    public ApartmentEntity getApartment() {
        return apartment;
    }

    public OwnerEntity getOwner() {
        return owner;
    }

    public String getGuestName() {
        return guestName;
    }

    public String getChannel() {
        return channel;
    }

    public LocalDate getCheckIn() {
        return checkIn;
    }

    public LocalDate getCheckOut() {
        return checkOut;
    }

    public long getRentAmountCents() {
        return rentAmountCents;
    }

    public String getCurrency() {
        return currency;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void updateDetails(
        ApartmentEntity apartment,
        OwnerEntity owner,
        String guestName,
        String channel,
        LocalDate checkIn,
        LocalDate checkOut,
        long rentAmountCents,
        String currency,
        String notes
    ) {
        this.apartment = apartment;
        this.owner = owner;
        this.guestName = guestName;
        this.channel = channel;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.rentAmountCents = rentAmountCents;
        this.currency = currency;
        this.notes = notes;
    }

    public void markDeleted() {
        deletedAt = Instant.now();
    }
}
