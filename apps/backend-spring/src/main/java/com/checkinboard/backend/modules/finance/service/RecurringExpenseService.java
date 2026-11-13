package com.checkinboard.backend.modules.finance.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.ApplyRecurringExpensesRequest;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.ApplyRecurringExpensesResponse;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.CreateRecurringExpenseRequest;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.RecurringExpenseEnvelope;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.RecurringExpenseItemResponse;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.RecurringExpensesListResponse;
import com.checkinboard.backend.modules.finance.dto.RecurringExpenseDtos.UpdateRecurringExpenseRequest;
import com.checkinboard.backend.modules.finance.model.FinancialEntryEntity;
import com.checkinboard.backend.modules.finance.model.FinancialEntryType;
import com.checkinboard.backend.modules.finance.model.RecurringExpenseApplicationEntity;
import com.checkinboard.backend.modules.finance.model.RecurringExpenseEntity;
import com.checkinboard.backend.modules.finance.repository.FinancialEntryRepository;
import com.checkinboard.backend.modules.finance.repository.RecurringExpenseApplicationRepository;
import com.checkinboard.backend.modules.finance.repository.RecurringExpenseRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecurringExpenseService {

    private static final Set<String> EXPENSE_CATEGORIES = Set.of(
        "limpeza",
        "consumo",
        "enxoval",
        "manutencao",
        "condominio",
        "contas",
        "taxas",
        "outros"
    );

    private final RecurringExpenseRepository recurringExpenseRepository;
    private final RecurringExpenseApplicationRepository recurringExpenseApplicationRepository;
    private final FinancialEntryRepository financialEntryRepository;
    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public RecurringExpenseService(
        RecurringExpenseRepository recurringExpenseRepository,
        RecurringExpenseApplicationRepository recurringExpenseApplicationRepository,
        FinancialEntryRepository financialEntryRepository,
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.recurringExpenseRepository = recurringExpenseRepository;
        this.recurringExpenseApplicationRepository = recurringExpenseApplicationRepository;
        this.financialEntryRepository = financialEntryRepository;
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public RecurringExpensesListResponse list(String userId, String apartmentId) {
        OrganizationMembershipEntity membership = getReadMembership(userId);
        ApartmentEntity apartment = findApartmentInOrganization(
            apartmentId,
            membership.getOrganization().getId()
        );

        if (membership.getRole() == AuthRole.co_host) {
            Set<String> allowedApartmentIds = allowedApartmentIdsForCoHost(
                userId,
                membership.getOrganization().getId()
            );
            if (!allowedApartmentIds.contains(apartment.getId())) {
                throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "You do not have access to this apartment."
                );
            }
        }

        List<RecurringExpenseItemResponse> items = recurringExpenseRepository
            .findByApartment_IdAndDeletedAtIsNullOrderByDayOfMonthAscTitleAsc(apartment.getId())
            .stream()
            .map(this::toResponse)
            .toList();

        return new RecurringExpensesListResponse(apartment.getId(), items);
    }

    @Transactional
    public RecurringExpenseEnvelope create(
        String userId,
        String apartmentId,
        CreateRecurringExpenseRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        ApartmentEntity apartment = findApartmentInOrganization(
            apartmentId,
            membership.getOrganization().getId()
        );

        int dayOfMonth = request.dayOfMonth() == null ? 5 : request.dayOfMonth();
        validateDayOfMonth(dayOfMonth);
        boolean active = request.active() == null || request.active();

        RecurringExpenseEntity entity = recurringExpenseRepository.save(
            new RecurringExpenseEntity(
                newId(),
                membership.getOrganization(),
                apartment,
                normalizeRequired(request.title(), "title"),
                normalizeCategory(request.category()),
                request.amountCents(),
                dayOfMonth,
                normalizeOptional(request.notes()),
                active
            )
        );

        return new RecurringExpenseEnvelope(toResponse(entity));
    }

    @Transactional
    public RecurringExpenseEnvelope update(
        String userId,
        String expenseId,
        UpdateRecurringExpenseRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        RecurringExpenseEntity entity = findExpenseInOrganization(
            expenseId,
            membership.getOrganization().getId()
        );

        String title = request.title() != null
            ? normalizeRequired(request.title(), "title")
            : entity.getTitle();
        String category = request.category() != null
            ? normalizeCategory(request.category())
            : entity.getCategory();
        long amountCents = request.amountCents() != null
            ? request.amountCents()
            : entity.getAmountCents();
        if (amountCents <= 0) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "amountCents must be greater than zero."
            );
        }
        int dayOfMonth = request.dayOfMonth() != null
            ? request.dayOfMonth()
            : entity.getDayOfMonth();
        validateDayOfMonth(dayOfMonth);
        String notes = request.notes() != null
            ? normalizeOptional(request.notes())
            : entity.getNotes();
        boolean active = request.active() != null ? request.active() : entity.isActive();

        entity.updateDetails(title, category, amountCents, dayOfMonth, notes, active);

        return new RecurringExpenseEnvelope(
            toResponse(recurringExpenseRepository.save(entity))
        );
    }

    @Transactional
    public void delete(String userId, String expenseId) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        RecurringExpenseEntity entity = findExpenseInOrganization(
            expenseId,
            membership.getOrganization().getId()
        );
        entity.markDeleted();
        recurringExpenseRepository.save(entity);
    }

    @Transactional
    public ApplyRecurringExpensesResponse applyMonth(
        String userId,
        String apartmentId,
        ApplyRecurringExpensesRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        YearMonth yearMonth = parseYearMonth(request.month());
        String monthStr = yearMonth.toString();

        ApartmentEntity apartment = findApartmentInOrganization(
            apartmentId,
            membership.getOrganization().getId()
        );

        if (apartment.getOwner() == null) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "APARTMENT_OWNER_REQUIRED",
                "Apartment must have an owner before applying recurring expenses."
            );
        }

        List<RecurringExpenseEntity> activeExpenses = recurringExpenseRepository
            .findByApartment_IdAndActiveTrueAndDeletedAtIsNullOrderByDayOfMonthAscTitleAsc(
                apartment.getId()
            );

        int createdCount = 0;
        int skippedCount = 0;
        List<String> createdEntryIds = new ArrayList<>();

        for (RecurringExpenseEntity expense : activeExpenses) {
            boolean alreadyApplied = recurringExpenseApplicationRepository
                .existsByRecurringExpense_IdAndAppliedMonth(expense.getId(), monthStr);

            if (alreadyApplied) {
                skippedCount++;
                continue;
            }

            LocalDate occurredOn = yearMonth.atDay(
                Math.min(expense.getDayOfMonth(), yearMonth.lengthOfMonth())
            );
            String description = expense.getTitle() + " (Fixa " + monthStr + ")";

            FinancialEntryEntity entry = financialEntryRepository.save(
                new FinancialEntryEntity(
                    newId(),
                    membership.getOrganization(),
                    apartment,
                    apartment.getOwner(),
                    null,
                    FinancialEntryType.expense,
                    expense.getCategory(),
                    description,
                    expense.getAmountCents(),
                    "BRL",
                    occurredOn
                )
            );

            recurringExpenseApplicationRepository.save(
                new RecurringExpenseApplicationEntity(
                    newId(),
                    expense,
                    entry,
                    monthStr
                )
            );

            createdCount++;
            createdEntryIds.add(entry.getId());
        }

        return new ApplyRecurringExpensesResponse(
            monthStr,
            createdCount,
            skippedCount,
            createdEntryIds
        );
    }

    private RecurringExpenseItemResponse toResponse(RecurringExpenseEntity entity) {
        return new RecurringExpenseItemResponse(
            entity.getId(),
            entity.getApartment().getId(),
            entity.getTitle(),
            entity.getCategory(),
            entity.getAmountCents(),
            entity.getDayOfMonth(),
            entity.getNotes(),
            entity.isActive()
        );
    }

    private YearMonth parseYearMonth(String month) {
        if (month == null || month.isBlank()) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_MONTH",
                "month must be formatted as YYYY-MM."
            );
        }
        try {
            return YearMonth.parse(month.trim());
        } catch (DateTimeParseException ex) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_MONTH",
                "month must be formatted as YYYY-MM."
            );
        }
    }

    private void validateDayOfMonth(int dayOfMonth) {
        if (dayOfMonth < 1 || dayOfMonth > 28) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_DAY_OF_MONTH",
                "dayOfMonth must be between 1 and 28."
            );
        }
    }

    private String normalizeRequired(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                fieldName + " is required."
            );
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeCategory(String value) {
        String normalized = normalizeRequired(value, "category");
        String canonical = Normalizer
            .normalize(normalized, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .trim()
            .toLowerCase(Locale.ROOT);

        if (!EXPENSE_CATEGORIES.contains(canonical)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_EXPENSE_CATEGORY",
                "Expense category must be one of: limpeza, consumo, enxoval, manutencao, condominio, contas, taxas, outros."
            );
        }

        return canonical;
    }

    private Set<String> allowedApartmentIdsForCoHost(String userId, String organizationId) {
        return apartmentMembershipRepository
            .findByUserIdAndOrganizationId(userId, organizationId)
            .stream()
            .filter(m -> m.canView() && m.getApartment().getDeletedAt() == null)
            .map(m -> m.getApartment().getId())
            .collect(Collectors.toSet());
    }

    private ApartmentEntity findApartmentInOrganization(
        String apartmentId,
        String organizationId
    ) {
        ApartmentEntity apartment = apartmentRepository
            .findByIdAndDeletedAtIsNull(apartmentId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "APARTMENT_NOT_FOUND",
                    "Apartment was not found."
                )
            );

        if (!apartment.getOrganization().getId().equals(organizationId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this apartment."
            );
        }

        return apartment;
    }

    private RecurringExpenseEntity findExpenseInOrganization(
        String expenseId,
        String organizationId
    ) {
        RecurringExpenseEntity expense = recurringExpenseRepository
            .findByIdAndDeletedAtIsNull(expenseId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "RECURRING_EXPENSE_NOT_FOUND",
                    "Recurring expense was not found."
                )
            );

        if (!expense.getOrganization().getId().equals(organizationId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this recurring expense."
            );
        }

        return expense;
    }

    private OrganizationMembershipEntity getReadMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            (membership.getRole() != AuthRole.host_admin &&
                membership.getRole() != AuthRole.co_host)
        ) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to view financial data."
            );
        }

        return membership;
    }

    private OrganizationMembershipEntity getHostAdminMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            membership.getRole() != AuthRole.host_admin
        ) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to manage financial data."
            );
        }

        return membership;
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
