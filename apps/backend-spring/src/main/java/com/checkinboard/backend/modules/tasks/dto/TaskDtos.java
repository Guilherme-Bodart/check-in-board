package com.checkinboard.backend.modules.tasks.dto;

import com.checkinboard.backend.modules.tasks.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class TaskDtos {

    private TaskDtos() {}

    public record TaskResponse(
        String id,
        String apartmentId,
        String apartmentName,
        String reservationId,
        String title,
        String description,
        TaskStatus status,
        String statusNote,
        Instant dueAt,
        Instant completedAt,
        String completedByUserId,
        String assignedUserId
    ) {}

    public record TasksResponse(List<TaskResponse> tasks) {}

    public record TaskEnvelope(TaskResponse task) {}

    public record CreateTaskRequest(
        @Size(min = 1, max = 64) String reservationId,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 500) String description,
        @NotNull Instant dueAt
    ) {}

    public record UpdateTaskStatusRequest(
        @NotNull TaskStatus status,
        @Size(max = 500) String note
    ) {}

    public record TodayTaskBoardItem(
        String id,
        String kind,
        String apartment,
        String apartmentId,
        String headline,
        String notes,
        String assignee,
        String status,
        TaskStatus taskStatus,
        String actionLabel,
        String time
    ) {}

    public record TodayTasksResponse(
        LocalDate date,
        List<TodayTaskBoardItem> boardItems
    ) {}
}
