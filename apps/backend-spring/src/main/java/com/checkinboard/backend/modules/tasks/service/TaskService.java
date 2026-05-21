package com.checkinboard.backend.modules.tasks.service;

import com.checkinboard.backend.modules.apartments.model.ApartmentEntity;
import com.checkinboard.backend.modules.apartments.model.ApartmentMembershipEntity;
import com.checkinboard.backend.modules.apartments.repository.ApartmentMembershipRepository;
import com.checkinboard.backend.modules.apartments.repository.ApartmentRepository;
import com.checkinboard.backend.modules.auth.model.AuthRole;
import com.checkinboard.backend.modules.auth.model.UserEntity;
import com.checkinboard.backend.modules.auth.repository.UserRepository;
import com.checkinboard.backend.modules.reservations.model.ReservationEntity;
import com.checkinboard.backend.modules.reservations.repository.ReservationRepository;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.CreateTaskRequest;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TaskEnvelope;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TaskResponse;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TasksResponse;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TodayTaskBoardItem;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TodayTasksResponse;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.UpdateTaskStatusRequest;
import com.checkinboard.backend.modules.tasks.model.TaskEntity;
import com.checkinboard.backend.modules.tasks.model.TaskStatus;
import com.checkinboard.backend.modules.tasks.repository.TaskRepository;
import com.checkinboard.backend.shared.error.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private static final DateTimeFormatter BOARD_TIME_FORMATTER = DateTimeFormatter
        .ofPattern("HH:mm")
        .withZone(ZoneOffset.UTC);

    private final ApartmentRepository apartmentRepository;
    private final ApartmentMembershipRepository apartmentMembershipRepository;
    private final ReservationRepository reservationRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(
        ApartmentRepository apartmentRepository,
        ApartmentMembershipRepository apartmentMembershipRepository,
        ReservationRepository reservationRepository,
        TaskRepository taskRepository,
        UserRepository userRepository
    ) {
        this.apartmentRepository = apartmentRepository;
        this.apartmentMembershipRepository = apartmentMembershipRepository;
        this.reservationRepository = reservationRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public TasksResponse list(String userId, String apartmentId) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (!membership.canView()) {
            throw forbiddenTaskAccess();
        }

        return new TasksResponse(
            taskRepository
                .findByApartment_IdOrderByDueAtAsc(apartmentId)
                .stream()
                .map(this::toResponse)
                .toList()
        );
    }

    @Transactional
    public TaskEnvelope create(String userId, String apartmentId, CreateTaskRequest request) {
        ApartmentMembershipEntity membership = getMembership(userId, apartmentId);

        if (membership.getRole() != AuthRole.host_admin) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to create tasks."
            );
        }

        ApartmentEntity apartment = apartmentRepository
            .findByIdAndDeletedAtIsNull(apartmentId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "APARTMENT_NOT_FOUND",
                    "Apartment was not found."
                )
            );
        UserEntity createdByUser = findUser(userId);
        ReservationEntity reservation = findReservationForApartment(
            request.reservationId(),
            apartmentId
        );
        TaskEntity task = taskRepository.save(
            new TaskEntity(
                newId(),
                apartment,
                reservation,
                request.title().trim(),
                trimToNull(request.description()),
                request.dueAt(),
                createdByUser
            )
        );

        return new TaskEnvelope(toResponse(task));
    }

    @Transactional
    public TaskEnvelope updateStatus(
        String userId,
        String taskId,
        UpdateTaskStatusRequest request
    ) {
        TaskEntity task = taskRepository
            .findById(taskId)
            .orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task was not found.")
            );
        ApartmentMembershipEntity membership = getMembership(
            userId,
            task.getApartment().getId()
        );

        if (
            membership.getRole() != AuthRole.host_admin &&
            !membership.canUpdateTaskStatus()
        ) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to update this task."
            );
        }

        if (request.status() != TaskStatus.done && request.status() != TaskStatus.not_done) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Invalid task status payload."
            );
        }

        String note = trimToNull(request.note());

        if (request.status() == TaskStatus.not_done && note == null) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "A note is required when marking a task as not done."
            );
        }

        task.updateStatus(request.status(), note, findUser(userId));

        return new TaskEnvelope(toResponse(taskRepository.save(task)));
    }

    @Transactional(readOnly = true)
    public TodayTasksResponse today(String userId, LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        Instant dueAfter = targetDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant dueBefore = targetDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<String> apartmentIds = apartmentMembershipRepository
            .findByUser_IdAndCanViewTrue(userId)
            .stream()
            .map(membership -> membership.getApartment().getId())
            .toList();

        if (apartmentIds.isEmpty()) {
            return new TodayTasksResponse(targetDate, List.of());
        }

        return new TodayTasksResponse(
            targetDate,
            taskRepository
                .findByApartment_IdInAndDueAtGreaterThanEqualAndDueAtLessThanOrderByDueAtAsc(
                    apartmentIds,
                    dueAfter,
                    dueBefore
                )
                .stream()
                .map(task -> toBoardItem(task, Instant.now()))
                .toList()
        );
    }

    private ReservationEntity findReservationForApartment(
        String reservationId,
        String apartmentId
    ) {
        if (reservationId == null || reservationId.isBlank()) {
            return null;
        }

        ReservationEntity reservation = reservationRepository
            .findById(reservationId)
            .orElseThrow(() ->
                new ApiException(
                    HttpStatus.NOT_FOUND,
                    "RESERVATION_NOT_FOUND",
                    "Reservation was not found."
                )
            );

        if (!reservation.getApartment().getId().equals(apartmentId)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "BAD_REQUEST",
                "Reservation does not belong to this apartment."
            );
        }

        return reservation;
    }

    private ApartmentMembershipEntity getMembership(String userId, String apartmentId) {
        return apartmentMembershipRepository
            .findByApartment_IdAndUser_Id(apartmentId, userId)
            .orElseThrow(this::forbiddenTaskAccess);
    }

    private UserEntity findUser(String userId) {
        return userRepository
            .findById(userId)
            .orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User was not found.")
            );
    }

    private TaskResponse toResponse(TaskEntity task) {
        return new TaskResponse(
            task.getId(),
            task.getApartment().getId(),
            task.getApartment().getName(),
            task.getReservation() != null ? task.getReservation().getId() : null,
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getStatusNote(),
            task.getDueAt(),
            task.getCompletedAt(),
            task.getCompletedByUser() != null ? task.getCompletedByUser().getId() : null,
            task.getAssignedUser() != null ? task.getAssignedUser().getId() : null
        );
    }

    private TodayTaskBoardItem toBoardItem(TaskEntity task, Instant referenceTime) {
        return new TodayTaskBoardItem(
            task.getId(),
            "task",
            task.getApartment().getName(),
            task.getApartment().getId(),
            task.getTitle(),
            task.getDescription() != null
                ? task.getDescription()
                : "Operational task due today.",
            task.getAssignedUser() != null ? "Assigned" : "Team",
            boardStatus(task, referenceTime),
            task.getStatus(),
            task.getStatus() == TaskStatus.pending ? "Mark done" : "View task",
            BOARD_TIME_FORMATTER.format(task.getDueAt())
        );
    }

    private String boardStatus(TaskEntity task, Instant referenceTime) {
        if (task.getStatus() == TaskStatus.done) {
            return "completed";
        }

        if (task.getStatus() == TaskStatus.not_done) {
            return "failed";
        }

        if (task.getDueAt().isBefore(referenceTime)) {
            return "overdue";
        }

        return "pending";
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private ApiException forbiddenTaskAccess() {
        return new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "You do not have access to these tasks."
        );
    }

    private String newId() {
        return UUID.randomUUID().toString();
    }
}
