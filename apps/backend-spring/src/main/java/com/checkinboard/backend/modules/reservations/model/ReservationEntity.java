package com.checkinboard.backend.modules.reservations.model;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "reservations")
public class ReservationEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private ApartmentEntity apartment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ical_source_id", nullable = false)
    private IcalSourceEntity icalSource;

    @Column(name = "external_event_key", nullable = false)
    private String externalEventKey;

    @Column(name = "external_uid")
    private String externalUid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status = ReservationStatus.confirmed;

    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "raw_summary")
    private String rawSummary;

    @Column(name = "raw_payload")
    private String rawPayload;

    @Column(name = "last_seen_in_feed_at")
    private Instant lastSeenInFeedAt;

    @Column(name = "missing_in_feed_count", nullable = false)
    private int missingInFeedCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReservationEntity() {}

    public ReservationEntity(
        String id,
        ApartmentEntity apartment,
        IcalSourceEntity icalSource,
        String externalEventKey
    ) {
        this.id = id;
        this.apartment = apartment;
        this.icalSource = icalSource;
        this.externalEventKey = externalEventKey;
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

    public void applyFeedData(
        String externalUid,
        Instant startsAt,
        Instant endsAt,
        String rawSummary,
        String rawPayload
    ) {
        this.externalUid = externalUid;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.rawSummary = rawSummary;
        this.rawPayload = rawPayload;
        status = ReservationStatus.confirmed;
        lastSeenInFeedAt = Instant.now();
        missingInFeedCount = 0;
    }

    public String getId() {
        return id;
    }

    public ApartmentEntity getApartment() {
        return apartment;
    }

    public IcalSourceEntity getIcalSource() {
        return icalSource;
    }

    public String getExternalEventKey() {
        return externalEventKey;
    }

    public String getExternalUid() {
        return externalUid;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public String getGuestName() {
        return guestName;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public String getRawSummary() {
        return rawSummary;
    }

    public String getRawPayload() {
        return rawPayload;
    }
}
