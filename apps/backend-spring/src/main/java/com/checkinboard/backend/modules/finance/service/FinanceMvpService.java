package com.checkinboard.backend.modules.finance.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.OrganizationMembershipEntity;
import com.checkinboard.backend.modules.auth.repository.OrganizationMembershipRepository;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.FinanceMvpStayItem;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.FinanceMvpSummaryItem;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.FinanceMvpSummaryResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.MarkSettlementRequest;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.SettlementEnvelope;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.SettlementResponse;
import com.checkinboard.backend.modules.finance.dto.FinanceMvpDtos.SettlementsResponse;
import com.checkinboard.backend.modules.finance.model.FinancialEntryEntity;
import com.checkinboard.backend.modules.finance.model.FinancialEntryType;
import com.checkinboard.backend.modules.finance.model.RentalStayEntity;
import com.checkinboard.backend.modules.finance.model.SettlementPeriodEntity;
import com.checkinboard.backend.modules.finance.model.SettlementStatus;
import com.checkinboard.backend.modules.finance.repository.FinancialEntryRepository;
import com.checkinboard.backend.modules.finance.repository.RentalStayRepository;
import com.checkinboard.backend.modules.finance.repository.SettlementPeriodRepository;
import com.checkinboard.backend.modules.owners.model.OwnerEntity;
import com.checkinboard.backend.modules.owners.repository.OwnerRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceMvpService {

    private final RentalStayRepository rentalStayRepository;
    private final FinancialEntryRepository financialEntryRepository;
    private final SettlementPeriodRepository settlementPeriodRepository;
    private final ApartmentRepository apartmentRepository;
    private final OwnerRepository ownerRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;

    public FinanceMvpService(
        RentalStayRepository rentalStayRepository,
        FinancialEntryRepository financialEntryRepository,
        SettlementPeriodRepository settlementPeriodRepository,
        ApartmentRepository apartmentRepository,
        OwnerRepository ownerRepository,
        OrganizationMembershipRepository organizationMembershipRepository
    ) {
        this.rentalStayRepository = rentalStayRepository;
        this.financialEntryRepository = financialEntryRepository;
        this.settlementPeriodRepository = settlementPeriodRepository;
        this.apartmentRepository = apartmentRepository;
        this.ownerRepository = ownerRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
    }

    @Transactional(readOnly = true)
    public FinanceMvpSummaryResponse summary(
        String userId,
        String month,
        String apartmentId,
        String ownerId
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        Period period = normalizeMonth(month);
        String normalizedApartmentId = normalizeOptional(apartmentId);
        String normalizedOwnerId = normalizeOptional(ownerId);
        String organizationId = membership.getOrganization().getId();
        List<RentalStayEntity> stays = rentalStayRepository.findByFilters(
            organizationId,
            period.start(),
            period.end(),
            normalizedApartmentId,
            normalizedOwnerId
        );
        List<FinancialEntryEntity> entries = financialEntryRepository.findByFilters(
            organizationId,
            period.start(),
            period.end(),
            normalizedApartmentId,
            normalizedOwnerId
        );
        Map<String, SettlementPeriodEntity> settlements = settlementsByApartmentOwner(
            organizationId,
            period.month()
        );
        SummaryAccumulator total = new SummaryAccumulator();
        Map<String, SummaryAccumulator> byOwner = new LinkedHashMap<>();
        Map<String, SummaryAccumulator> byApartment = new LinkedHashMap<>();
        Map<String, SummaryAccumulator> byStay = new LinkedHashMap<>();

        for (RentalStayEntity stay : stays) {
            addStayRent(total, byOwner, byApartment, byStay, stay);
        }

        for (FinancialEntryEntity entry : entries) {
            addEntry(total, byOwner, byApartment, byStay, entry);
        }

        return new FinanceMvpSummaryResponse(
            period.month(),
            total.rentCents,
            total.extraRevenueCents,
            total.expenseCents,
            total.netCents(),
            total.commissionCents(),
            total.payoutCents(),
            byOwner
                .values()
                .stream()
                .map(bucket -> bucket.toItem(settlements.get(bucket.settlementKey())))
                .sorted(Comparator.comparing(FinanceMvpSummaryItem::name))
                .toList(),
            byApartment
                .values()
                .stream()
                .map(bucket -> bucket.toItem(settlements.get(bucket.settlementKey())))
                .sorted(Comparator.comparing(FinanceMvpSummaryItem::name))
                .toList(),
            byStay
                .values()
                .stream()
                .map(SummaryAccumulator::toStayItem)
                .sorted(Comparator.comparing(FinanceMvpStayItem::guestName, Comparator.nullsLast(String::compareTo)))
                .toList()
        );
    }

    @Transactional(readOnly = true)
    public SettlementsResponse settlements(String userId, String month) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        Period period = normalizeMonth(month);

        return new SettlementsResponse(
            settlementPeriodRepository
                .findByOrganization_IdAndPeriodMonth(
                    membership.getOrganization().getId(),
                    period.month()
                )
                .stream()
                .map(this::toSettlementResponse)
                .toList()
        );
    }

    @Transactional
    public SettlementEnvelope markPaid(String userId, MarkSettlementRequest request) {
        SettlementPeriodEntity settlement = resolveSettlement(userId, request);
        settlement.markPaid(normalizeOptional(request.notes()));
        return new SettlementEnvelope(
            toSettlementResponse(settlementPeriodRepository.save(settlement))
        );
    }

    @Transactional
    public SettlementEnvelope markUnpaid(String userId, MarkSettlementRequest request) {
        SettlementPeriodEntity settlement = resolveSettlement(userId, request);
        settlement.markPending(normalizeOptional(request.notes()));
        return new SettlementEnvelope(
            toSettlementResponse(settlementPeriodRepository.save(settlement))
        );
    }

    @Transactional(readOnly = true)
    public String exportCsv(
        String userId,
        String month,
        String apartmentId,
        String ownerId
    ) {
        FinanceMvpSummaryResponse response = summary(userId, month, apartmentId, ownerId);
        StringBuilder csv = new StringBuilder(
            "tipo,nome,cliente,apartamento,alugueis,receitas_extras,despesas,liquido,comissao,repasse,status\n"
        );

        for (FinanceMvpSummaryItem item : response.byOwner()) {
            appendCsvRow(csv, "cliente", item);
        }

        for (FinanceMvpSummaryItem item : response.byApartment()) {
            appendCsvRow(csv, "apartamento", item);
        }

        return csv.toString();
    }

    private void addStayRent(
        SummaryAccumulator total,
        Map<String, SummaryAccumulator> byOwner,
        Map<String, SummaryAccumulator> byApartment,
        Map<String, SummaryAccumulator> byStay,
        RentalStayEntity stay
    ) {
        SummaryAccumulator[] buckets = {
            total,
            ownerBucket(byOwner, stay.getOwner()),
            apartmentBucket(byApartment, stay.getApartment()),
            stayBucket(byStay, stay),
        };

        for (SummaryAccumulator bucket : buckets) {
            bucket.addRent(stay.getRentAmountCents(), stay.getApartment());
        }
    }

    private void addEntry(
        SummaryAccumulator total,
        Map<String, SummaryAccumulator> byOwner,
        Map<String, SummaryAccumulator> byApartment,
        Map<String, SummaryAccumulator> byStay,
        FinancialEntryEntity entry
    ) {
        SummaryAccumulator[] buckets = entry.getRentalStay() == null
            ? new SummaryAccumulator[] {
                total,
                ownerBucket(byOwner, entry.getOwner()),
                apartmentBucket(byApartment, entry.getApartment()),
            }
            : new SummaryAccumulator[] {
                total,
                ownerBucket(byOwner, entry.getOwner()),
                apartmentBucket(byApartment, entry.getApartment()),
                stayBucket(byStay, entry.getRentalStay()),
            };

        for (SummaryAccumulator bucket : buckets) {
            if (entry.getType() == FinancialEntryType.revenue) {
                bucket.addExtraRevenue(entry.getAmountCents(), entry.getApartment());
            } else {
                bucket.addExpense(entry.getAmountCents(), entry.getApartment());
            }
        }
    }

    private SummaryAccumulator ownerBucket(
        Map<String, SummaryAccumulator> buckets,
        OwnerEntity owner
    ) {
        return buckets.computeIfAbsent(
            owner.getId(),
            id -> SummaryAccumulator.forOwner(id, owner.getName())
        );
    }

    private SummaryAccumulator apartmentBucket(
        Map<String, SummaryAccumulator> buckets,
        ApartmentEntity apartment
    ) {
        return buckets.computeIfAbsent(
            apartment.getId(),
            id -> SummaryAccumulator.forApartment(apartment)
        );
    }

    private SummaryAccumulator stayBucket(
        Map<String, SummaryAccumulator> buckets,
        RentalStayEntity stay
    ) {
        return buckets.computeIfAbsent(
            stay.getId(),
            id -> SummaryAccumulator.forStay(stay)
        );
    }

    private SettlementPeriodEntity resolveSettlement(
        String userId,
        MarkSettlementRequest request
    ) {
        OrganizationMembershipEntity membership = getHostAdminMembership(userId);
        Period period = normalizeMonth(request.periodMonth());
        ApartmentEntity apartment = findApartment(
            request.apartmentId(),
            membership.getOrganization().getId()
        );
        OwnerEntity owner = findOwner(
            request.ownerId(),
            membership.getOrganization().getId()
        );

        if (!apartment.getOwner().getId().equals(owner.getId())) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "SETTLEMENT_OWNER_MISMATCH",
                "Settlement owner must match the apartment owner."
            );
        }

        return settlementPeriodRepository
            .findByOrganization_IdAndApartment_IdAndOwner_IdAndPeriodMonth(
                membership.getOrganization().getId(),
                apartment.getId(),
                owner.getId(),
                period.month()
            )
            .orElseGet(() ->
                new SettlementPeriodEntity(
                    UUID.randomUUID().toString(),
                    membership.getOrganization(),
                    apartment,
                    owner,
                    period.month()
                )
            );
    }

    private Map<String, SettlementPeriodEntity> settlementsByApartmentOwner(
        String organizationId,
        String periodMonth
    ) {
        Map<String, SettlementPeriodEntity> result = new LinkedHashMap<>();

        for (SettlementPeriodEntity settlement : settlementPeriodRepository.findByOrganization_IdAndPeriodMonth(
            organizationId,
            periodMonth
        )) {
            result.put(
                settlement.getApartment().getId() + ":" + settlement.getOwner().getId(),
                settlement
            );
        }

        return result;
    }

    private ApartmentEntity findApartment(String apartmentId, String organizationId) {
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
            throw forbidden();
        }

        return apartment;
    }

    private OwnerEntity findOwner(String ownerId, String organizationId) {
        OwnerEntity owner = ownerRepository
            .findByIdAndDeletedAtIsNull(ownerId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "OWNER_NOT_FOUND",
                    "Owner was not found."
                )
            );

        if (!owner.getOrganization().getId().equals(organizationId)) {
            throw forbidden();
        }

        return owner;
    }

    private SettlementResponse toSettlementResponse(SettlementPeriodEntity settlement) {
        return new SettlementResponse(
            settlement.getId(),
            settlement.getPeriodMonth(),
            settlement.getApartment().getId(),
            settlement.getApartment().getName(),
            settlement.getOwner().getId(),
            settlement.getOwner().getName(),
            settlement.getStatus(),
            settlement.getPaidAt(),
            settlement.getNotes()
        );
    }

    private OrganizationMembershipEntity getHostAdminMembership(String userId) {
        OrganizationMembershipEntity membership =
            organizationMembershipRepository.findPrimaryByUserId(userId).orElse(null);

        if (
            membership == null ||
            !membership.isActive() ||
            membership.getRole() != AuthRole.host_admin
        ) {
            throw forbidden();
        }

        return membership;
    }

    private Period normalizeMonth(String month) {
        YearMonth yearMonth;

        try {
            yearMonth = month == null || month.isBlank()
                ? YearMonth.now()
                : YearMonth.parse(month.trim());
        } catch (RuntimeException exception) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "month must use YYYY-MM format."
            );
        }

        return new Period(
            yearMonth.toString(),
            yearMonth.atDay(1),
            yearMonth.atEndOfMonth()
        );
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ApiException forbidden() {
        return new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "You do not have permission to manage financial data."
        );
    }

    private void appendCsvRow(
        StringBuilder csv,
        String type,
        FinanceMvpSummaryItem item
    ) {
        csv
            .append(escapeCsv(type))
            .append(',')
            .append(escapeCsv(item.name()))
            .append(',')
            .append(escapeCsv(item.ownerName()))
            .append(',')
            .append(escapeCsv(item.apartmentName()))
            .append(',')
            .append(item.rentCents())
            .append(',')
            .append(item.extraRevenueCents())
            .append(',')
            .append(item.expenseCents())
            .append(',')
            .append(item.netCents())
            .append(',')
            .append(item.commissionCents())
            .append(',')
            .append(item.payoutCents())
            .append(',')
            .append(item.settlementStatus())
            .append('\n');
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private record Period(String month, LocalDate start, LocalDate end) {}

    private static final class SummaryAccumulator {

        private String id;
        private String name;
        private String ownerId;
        private String ownerName;
        private String apartmentId;
        private String apartmentName;
        private String guestName;
        private int managementCommissionBps;
        private long rentCents;
        private long extraRevenueCents;
        private long expenseCents;
        private long commissionCents;

        static SummaryAccumulator forOwner(String id, String name) {
            SummaryAccumulator bucket = new SummaryAccumulator();
            bucket.id = id;
            bucket.name = name;
            bucket.ownerId = id;
            bucket.ownerName = name;
            return bucket;
        }

        static SummaryAccumulator forApartment(ApartmentEntity apartment) {
            SummaryAccumulator bucket = new SummaryAccumulator();
            bucket.id = apartment.getId();
            bucket.name = apartment.getName();
            bucket.ownerId = apartment.getOwner().getId();
            bucket.ownerName = apartment.getOwner().getName();
            bucket.apartmentId = apartment.getId();
            bucket.apartmentName = apartment.getName();
            bucket.managementCommissionBps = apartment.getManagementCommissionBps();
            return bucket;
        }

        static SummaryAccumulator forStay(RentalStayEntity stay) {
            SummaryAccumulator bucket = new SummaryAccumulator();
            bucket.id = stay.getId();
            bucket.name = stay.getGuestName() == null ? "Estadia manual" : stay.getGuestName();
            bucket.ownerId = stay.getOwner().getId();
            bucket.ownerName = stay.getOwner().getName();
            bucket.apartmentId = stay.getApartment().getId();
            bucket.apartmentName = stay.getApartment().getName();
            bucket.guestName = stay.getGuestName();
            bucket.managementCommissionBps = stay.getApartment().getManagementCommissionBps();
            return bucket;
        }

        long netCents() {
            return rentCents + extraRevenueCents - expenseCents;
        }

        void addRent(long amountCents, ApartmentEntity apartment) {
            rentCents += amountCents;
            commissionCents += commissionFor(amountCents, apartment);
        }

        void addExtraRevenue(long amountCents, ApartmentEntity apartment) {
            extraRevenueCents += amountCents;
            commissionCents += commissionFor(amountCents, apartment);
        }

        void addExpense(long amountCents, ApartmentEntity apartment) {
            expenseCents += amountCents;
            commissionCents -= commissionFor(amountCents, apartment);
        }

        long commissionCents() {
            return commissionCents;
        }

        long payoutCents() {
            return netCents() - commissionCents();
        }

        String settlementKey() {
            return apartmentId == null || ownerId == null ? null : apartmentId + ":" + ownerId;
        }

        FinanceMvpSummaryItem toItem(SettlementPeriodEntity settlement) {
            return new FinanceMvpSummaryItem(
                id,
                name,
                ownerId,
                ownerName,
                apartmentId,
                apartmentName,
                managementCommissionBps,
                rentCents,
                extraRevenueCents,
                expenseCents,
                netCents(),
                commissionCents(),
                payoutCents(),
                settlement == null ? SettlementStatus.pending : settlement.getStatus(),
                settlement == null ? null : settlement.getPaidAt()
            );
        }

        FinanceMvpStayItem toStayItem() {
            return new FinanceMvpStayItem(
                id,
                apartmentId,
                apartmentName,
                ownerId,
                ownerName,
                guestName,
                rentCents,
                expenseCents,
                netCents(),
                commissionCents(),
                payoutCents()
            );
        }

        private long commissionFor(long amountCents, ApartmentEntity apartment) {
            return Math.round(
                amountCents * (apartment.getManagementCommissionBps() / 10000.0)
            );
        }
    }
}
