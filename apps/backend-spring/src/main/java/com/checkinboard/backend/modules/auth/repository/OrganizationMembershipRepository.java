package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationMembershipRepository
    extends JpaRepository<OrganizationMembershipEntity, String> {}
