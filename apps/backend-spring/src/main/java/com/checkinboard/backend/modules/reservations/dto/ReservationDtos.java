package com.checkinboard.backend.modules.reservations.dto;

import com.checkinboard.backend.modules.reservations.model.ReservationStatus;
import com.checkinboard.backend.modules.reservations.model.SyncRunStatus;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ReservationDtos {

    private ReservationDtos() {}

    public record ReservationResponse(
        String id,
        String apartmentId,
        String icalSourceId,
        String externalEventKey,
        String externalUid,
        ReservationStatus status,
        Instant startsAt,
        Instant endsAt,
        String rawSummary,
        String provider,
        String guestName,
        Integer guestCount
    ) {}

    public record ReservationsResponse(List<ReservationResponse> reservations) {}

    public record CreateManualReservationRequest(
        String guestName,
        Integer guestCount,
        Instant startsAt,
        Instant endsAt
    ) {}

    public record UpdateReservationRequest(
        String guestName,
        Integer guestCount
    ) {}

    public record ManualSyncRequest(@Size(min = 1, max = 2_000_000) String icsText) {}

    public record ManualSyncSummary(
        int eventsSeen,
        int reservationsUpserted,
        boolean syncSkipped,
        String syncSkippedReason
    ) {}

    public record ManualSyncResponse(
        List<ReservationResponse> reservations,
        ManualSyncSummary summary
    ) {}

    public record SyncRunResponse(
        String id,
        String icalSourceId,
        SyncRunStatus status,
        Instant startedAt,
        Instant finishedAt,
        int eventsSeen,
        int reservationsUpserted,
        String errorMessage
    ) {}

    public record SyncRunsResponse(List<SyncRunResponse> syncRuns) {}

    public record OperationsBoardReservationResponse(
        String id,
        String apartmentId,
        String icalSourceId,
        String provider,
        ReservationStatus status,
        Instant startsAt,
        Instant endsAt,
        String rawSummary,
        String guestName,
        Integer guestCount
    ) {}

    public record OperationsBoardSection(
        int count,
        List<OperationsBoardReservationResponse> reservations
    ) {}

    public record OperationsBoardTotals(
        int checkIns,
        int checkOuts,
        int inHouse,
        int upcoming
    ) {}

    public record OperationsBoardResponse(
        String apartmentId,
        LocalDate date,
        int days,
        String timezone,
        OperationsBoardSection checkIns,
        OperationsBoardSection checkOuts,
        OperationsBoardSection inHouse,
        OperationsBoardSection upcoming,
        OperationsBoardTotals totals
    ) {}
}
