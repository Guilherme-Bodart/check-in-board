package com.checkinboard.backend.modules.finance.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialEntriesResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialEntryEnvelope;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialEntryResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialSummaryItem;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.FinancialSummaryResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceDtos.UpsertFinancialEntryRequest;
import com.checkinboard.backend.modules.finance.model.FinancialEntryEntity;
import com.checkinboard.backend.modules.finance.model.FinancialEntryType;
import com.checkinboard.backend.modules.finance.model.RentalStayEntity;
import com.checkinboard.backend.modules.finance.repository.FinancialEntryRepository;
import com.checkinboard.backend.modules.finance.repository.RentalStayRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceService {

    private final FinancialEntryRepository financialEntryRepository;
    private final RentalStayRepository rentalStayRepository;
    private final ApartmentRepository apartmentRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
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

    public FinanceService(
        FinancialEntryRepository financialEntryRepository,
        RentalStayRepository rentalStayRepository,
        ApartmentRepository apartmentRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.financialEntryRepository = financialEntryRepository;
        this.rentalStayRepository = rentalStayRepository;
        this.apartmentRepository = apartmentRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public FinancialEntriesResponse list(
        String userId,
        LocalDate dateFrom,
        LocalDate dateTo,
        String apartmentId,
        String ownerId
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        DateRange dateRange = normalizeDateRange(dateFrom, dateTo);

        return new FinancialEntriesResponse(
            filteredEntries(
                membership,
                dateRange,
                normalizeOptional(apartmentId),
                normalizeOptional(ownerId)
            )
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional(readOnly = true)
    public FinancialSummaryResponse summary(
        String userId,
        LocalDate dateFrom,
        LocalDate dateTo,
        String apartmentId,
        String ownerId
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        DateRange dateRange = normalizeDateRange(dateFrom, dateTo);
        List<FinancialEntryEntity> entries = filteredEntries(
            membership,
            dateRange,
            normalizeOptional(apartmentId),
            normalizeOptional(ownerId)
        );

        return new FinancialSummaryResponse(
            dateRange.dateFrom(),
            dateRange.dateTo(),
            revenue(entries),
            expense(entries),
            profit(entries),
            summarize(
                entries,
                entry -> entry.getOwner().getId(),
                entry -> entry.getOwner().getName()
            ),
            summarize(
                entries,
                entry -> entry.getApartment().getId(),
                entry -> entry.getApartment().getName()
            )
        );
    }

    @Transactional(readOnly = true)
    public FinancialEntryEnvelope get(String userId, String entryId) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        FinancialEntryEntity entry = findEntryInOrganization(
            entryId,
            membership.getOrganization().getId()
        );

        return new FinancialEntryEnvelope(toResponse(entry));
    }

    @Transactional
    public FinancialEntryEnvelope create(
        String userId,
        UpsertFinancialEntryRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        ApartmentEntity apartment = findApartmentInOrganization(
            request.apartmentId(),
            membership.getOrganization().getId()
        );
        FinancialEntryEntity entry = financialEntryRepository.save(
            new FinancialEntryEntity(
                newId(),
                membership.getOrganization(),
                apartment,
                apartment.getOwner(),
                resolveRentalStay(
                    request.rentalStayId(),
                    membership.getOrganization().getId(),
                    apartment.getId()
                ),
                request.type(),
                normalizeCategory(request.type(), request.category()),
                normalizeOptional(request.description()),
                request.amountCents(),
                normalizeCurrency(request.currency()),
                request.occurredOn()
            )
        );

        return new FinancialEntryEnvelope(toResponse(entry));
    }

    @Transactional
    public FinancialEntryEnvelope update(
        String userId,
        String entryId,
        UpsertFinancialEntryRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        FinancialEntryEntity entry = findEntryInOrganization(
            entryId,
            membership.getOrganization().getId()
        );
        ApartmentEntity apartment = findApartmentInOrganization(
            request.apartmentId(),
            membership.getOrganization().getId()
        );

        entry.updateDetails(
            apartment,
            apartment.getOwner(),
            resolveRentalStay(
                request.rentalStayId(),
                membership.getOrganization().getId(),
                apartment.getId()
            ),
            request.type(),
            normalizeCategory(request.type(), request.category()),
            normalizeOptional(request.description()),
            request.amountCents(),
            normalizeCurrency(request.currency()),
            request.occurredOn()
        );

        return new FinancialEntryEnvelope(toResponse(financialEntryRepository.save(entry)));
    }

    @Transactional
    public void delete(String userId, String entryId) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        FinancialEntryEntity entry = findEntryInOrganization(
            entryId,
            membership.getOrganization().getId()
        );
        entry.markDeleted();
        financialEntryRepository.save(entry);
    }

    private List<FinancialEntryEntity> filteredEntries(
        OrganizationMembershipEntity membership,
        DateRange dateRange,
        String apartmentId,
        String ownerId
    ) {
        return financialEntryRepository.findByFilters(
            membership.getOrganization().getId(),
            dateRange.dateFrom(),
            dateRange.dateTo(),
            apartmentId,
            ownerId
        );
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

    private FinancialEntryEntity findEntryInOrganization(
        String entryId,
        String organizationId
    ) {
        FinancialEntryEntity entry = financialEntryRepository
            .findByIdAndDeletedAtIsNull(entryId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "FINANCIAL_ENTRY_NOT_FOUND",
                    "Financial entry was not found."
                )
            );

        if (!entry.getOrganization().getId().equals(organizationId)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have access to this financial entry."
            );
        }

        return entry;
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

    private FinancialEntryResponse toResponse(FinancialEntryEntity entry) {
        return new FinancialEntryResponse(
            entry.getId(),
            entry.getApartment().getId(),
            entry.getApartment().getName(),
            entry.getOwner().getId(),
            entry.getOwner().getName(),
            entry.getRentalStay() == null ? null : entry.getRentalStay().getId(),
            entry.getType(),
            entry.getCategory(),
            entry.getDescription(),
            entry.getAmountCents(),
            entry.getCurrency(),
            entry.getOccurredOn()
        );
    }

    private List<FinancialSummaryItem> summarize(
        List<FinancialEntryEntity> entries,
        java.util.function.Function<FinancialEntryEntity, String> idSelector,
        java.util.function.Function<FinancialEntryEntity, String> nameSelector
    ) {
        Map<String, SummaryBucket> buckets = new LinkedHashMap<>();

        for (FinancialEntryEntity entry : entries) {
            SummaryBucket bucket = buckets.computeIfAbsent(
                idSelector.apply(entry),
                id -> new SummaryBucket(id, nameSelector.apply(entry))
            );
            bucket.add(entry);
        }

        return buckets
            .values()
            .stream()
            .map(SummaryBucket::toItem)
            .sorted(Comparator.comparing(FinancialSummaryItem::name))
            .toList();
    }

    private long revenue(List<FinancialEntryEntity> entries) {
        return entries
            .stream()
            .filter(entry -> entry.getType() == FinancialEntryType.revenue)
            .mapToLong(FinancialEntryEntity::getAmountCents)
            .sum();
    }

    private long expense(List<FinancialEntryEntity> entries) {
        return entries
            .stream()
            .filter(entry -> entry.getType() == FinancialEntryType.expense)
            .mapToLong(FinancialEntryEntity::getAmountCents)
            .sum();
    }

    private long profit(List<FinancialEntryEntity> entries) {
        return revenue(entries) - expense(entries);
    }

    private DateRange normalizeDateRange(LocalDate dateFrom, LocalDate dateTo) {
        LocalDate start = dateFrom == null
            ? YearMonth.now().atDay(1)
            : dateFrom;
        LocalDate end = dateTo == null
            ? YearMonth.from(start).atEndOfMonth()
            : dateTo;

        if (end.isBefore(start)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "dateTo must be after dateFrom."
            );
        }

        return new DateRange(start, end);
    }

    private String normalizeRequired(String value) {
        return value.trim();
    }

    private String normalizeCategory(FinancialEntryType type, String value) {
        String normalized = normalizeRequired(value);

        if (type != FinancialEntryType.expense) {
            return normalized;
        }

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

    private RentalStayEntity resolveRentalStay(
        String rentalStayId,
        String organizationId,
        String apartmentId
    ) {
        String normalized = normalizeOptional(rentalStayId);

        if (normalized == null) {
            return null;
        }

        RentalStayEntity stay = rentalStayRepository
            .findByIdAndDeletedAtIsNull(normalized)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "RENTAL_STAY_NOT_FOUND",
                    "Rental stay was not found."
                )
            );

        if (
            !stay.getOrganization().getId().equals(organizationId) ||
            !stay.getApartment().getId().equals(apartmentId)
        ) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "RENTAL_STAY_APARTMENT_MISMATCH",
                "Rental stay must belong to the selected apartment."
            );
        }

        return stay;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeCurrency(String value) {
        return value == null || value.isBlank()
            ? "BRL"
            : value.trim().toUpperCase(Locale.ROOT);
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }

    private record DateRange(LocalDate dateFrom, LocalDate dateTo) {}

    private static final class SummaryBucket {

        private final String id;
        private final String name;
        private long revenueCents;
        private long expenseCents;

        private SummaryBucket(String id, String name) {
            this.id = id;
            this.name = name;
        }

        private void add(FinancialEntryEntity entry) {
            if (entry.getType() == FinancialEntryType.revenue) {
                revenueCents += entry.getAmountCents();
            } else {
                expenseCents += entry.getAmountCents();
            }
        }

        private FinancialSummaryItem toItem() {
            return new FinancialSummaryItem(
                id,
                name,
                revenueCents,
                expenseCents,
                revenueCents - expenseCents
            );
        }
    }
}
