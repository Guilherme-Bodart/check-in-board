package com.checkinboard.backend.modules.finance.repository;

import com.checkinboard.backend.modules.finance.model.RecurringExpenseEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecurringExpenseRepository
    extends JpaRepository<RecurringExpenseEntity, String> {
    @EntityGraph(attributePaths = { "apartment", "organization" })
    Optional<RecurringExpenseEntity> findByIdAndDeletedAtIsNull(String id);

    @EntityGraph(attributePaths = { "apartment", "organization" })
    List<RecurringExpenseEntity> findByApartment_IdAndDeletedAtIsNullOrderByDayOfMonthAscTitleAsc(
        String apartmentId
    );

    @EntityGraph(attributePaths = { "apartment", "organization" })
    List<RecurringExpenseEntity> findByApartment_IdAndActiveTrueAndDeletedAtIsNullOrderByDayOfMonthAscTitleAsc(
        String apartmentId
    );
}
