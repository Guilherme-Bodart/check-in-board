package com.checkinboard.backend.modules.finance.repository;

import com.checkinboard.backend.modules.finance.model.RecurringExpenseApplicationEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecurringExpenseApplicationRepository
    extends JpaRepository<RecurringExpenseApplicationEntity, String> {
    boolean existsByRecurringExpense_IdAndAppliedMonth(
        String recurringExpenseId,
        String appliedMonth
    );

    Optional<RecurringExpenseApplicationEntity> findByRecurringExpense_IdAndAppliedMonth(
        String recurringExpenseId,
        String appliedMonth
    );
}
