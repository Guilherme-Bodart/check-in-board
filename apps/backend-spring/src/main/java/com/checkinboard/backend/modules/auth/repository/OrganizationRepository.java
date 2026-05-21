package com.checkinboard.backend.modules.auth.repository;

import com.checkinboard.backend.modules.auth.model.OrganizationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<OrganizationEntity, String> {}
