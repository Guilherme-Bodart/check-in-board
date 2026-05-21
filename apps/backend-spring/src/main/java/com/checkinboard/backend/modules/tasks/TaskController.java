package com.checkinboard.backend.modules.tasks;

import com.checkinboard.backend.modules.tasks.dto.TaskDtos.CreateTaskRequest;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TaskEnvelope;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TasksResponse;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.TodayTasksResponse;
import com.checkinboard.backend.modules.tasks.dto.TaskDtos.UpdateTaskStatusRequest;
import com.checkinboard.backend.modules.tasks.service.TaskService;
import com.checkinboard.backend.shared.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks/today")
    TodayTasksResponse today(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return taskService.today(principal.userId(), date);
    }

    @GetMapping("/apartments/{apartmentId}/tasks")
    TasksResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId
    ) {
        return taskService.list(principal.userId(), apartmentId);
    }

    @PostMapping("/apartments/{apartmentId}/tasks")
    ResponseEntity<TaskEnvelope> create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String apartmentId,
        @Valid @RequestBody CreateTaskRequest request
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(taskService.create(principal.userId(), apartmentId, request));
    }

    @PatchMapping("/tasks/{taskId}/status")
    TaskEnvelope updateStatus(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable String taskId,
        @Valid @RequestBody UpdateTaskStatusRequest request
    ) {
        return taskService.updateStatus(principal.userId(), taskId, request);
    }
}
