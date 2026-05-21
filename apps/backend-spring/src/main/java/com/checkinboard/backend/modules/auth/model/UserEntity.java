package com.checkinboard.backend.modules.auth.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    private String id;

    @Column(name = "auth_provider", nullable = false)
    private String authProvider;

    @Column(name = "auth_subject", nullable = false)
    private String authSubject;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    private String phone;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "user")
    @OrderBy("createdAt asc")
    private List<OrganizationMembershipEntity> organizationMemberships = new ArrayList<>();

    protected UserEntity() {}

    public UserEntity(
        String id,
        String authProvider,
        String authSubject,
        String fullName,
        String email,
        String passwordHash
    ) {
        this.id = id;
        this.authProvider = authProvider;
        this.authSubject = authSubject;
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
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

    public String getAuthProvider() {
        return authProvider;
    }

    public String getAuthSubject() {
        return authSubject;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getPhone() {
        return phone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<OrganizationMembershipEntity> getOrganizationMemberships() {
        return organizationMemberships;
    }
}
