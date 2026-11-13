package com.checkinboard.backend.modules.finance.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "recurring_expense_applications")
public class RecurringExpenseApplicationEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recurring_expense_id", nullable = false)
    private RecurringExpenseEntity recurringExpense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "financial_entry_id", nullable = false)
    private FinancialEntryEntity financialEntry;

    @Column(name = "applied_month", nullable = false, length = 7)
    private String appliedMonth;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RecurringExpenseApplicationEntity() {}

    public RecurringExpenseApplicationEntity(
        String id,
        RecurringExpenseEntity recurringExpense,
        FinancialEntryEntity financialEntry,
        String appliedMonth
    ) {
        this.id = id;
        this.recurringExpense = recurringExpense;
        this.financialEntry = financialEntry;
        this.appliedMonth = appliedMonth;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getId() {
        return id;
    }

    public RecurringExpenseEntity getRecurringExpense() {
        return recurringExpense;
    }

    public FinancialEntryEntity getFinancialEntry() {
        return financialEntry;
    }

    public String getAppliedMonth() {
        return appliedMonth;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
