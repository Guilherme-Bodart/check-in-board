import type { TasksRepository } from "./repository.js";
import type { CreateTaskInput, TaskSummary, UpdateTaskStatusInput } from "./types.js";

export class TasksServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

function assertCanView(access: { canView: boolean } | null) {
  if (!access?.canView) {
    throw new TasksServiceError(
      "FORBIDDEN",
      "You do not have access to these tasks.",
    );
  }
}

function assertCanCreate(access: { role: string } | null) {
  if (access?.role !== "host_admin") {
    throw new TasksServiceError(
      "FORBIDDEN",
      "You do not have permission to create tasks.",
    );
  }
}

function assertCanUpdateStatus(
  access: { canUpdateTaskStatus: boolean; role: string } | null,
) {
  if (!access || (access.role !== "host_admin" && !access.canUpdateTaskStatus)) {
    throw new TasksServiceError(
      "FORBIDDEN",
      "You do not have permission to update this task.",
    );
  }
}

export async function listTasksForApartment(
  userId: string,
  apartmentId: string,
  repository: TasksRepository,
) {
  assertCanView(await repository.getApartmentAccess(userId, apartmentId));

  return await repository.listTasks(apartmentId);
}

export async function createTaskForApartment(
  userId: string,
  input: CreateTaskInput,
  repository: TasksRepository,
) {
  assertCanCreate(await repository.getApartmentAccess(userId, input.apartmentId));

  return await repository.createTask(input);
}

export async function updateTaskStatusForUser(
  input: UpdateTaskStatusInput,
  repository: TasksRepository,
) {
  assertCanUpdateStatus(await repository.getTaskAccess(input.userId, input.taskId));

  return await repository.updateTaskStatus(input);
}

function formatTaskTime(dueAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(dueAt));
}

function getTaskBoardStatus(task: TaskSummary, referenceDate: Date) {
  if (task.status === "done") {
    return "completed" as const;
  }

  if (task.status === "not_done") {
    return "failed" as const;
  }

  if (new Date(task.dueAt) < referenceDate) {
    return "overdue" as const;
  }

  return "pending" as const;
}

export async function listTodayTaskBoardItems(
  userId: string,
  dueBefore: Date,
  dueAfter: Date,
  repository: TasksRepository,
  referenceDate = new Date(),
) {
  const tasks = await repository.listAccessibleTasksForDate(
    userId,
    dueBefore,
    dueAfter,
  );

  return tasks.map((task) => ({
    actionLabel: task.status === "pending" ? "Mark done" : "View task",
    apartment: task.apartmentName ?? "Apartment",
    apartmentId: task.apartmentId,
    assignee: task.assignedUserId ? "Assigned" : "Team",
    headline: task.title,
    id: task.id,
    kind: "task" as const,
    notes: task.description ?? "Operational task due today.",
    status: getTaskBoardStatus(task, referenceDate),
    taskStatus: task.status,
    time: formatTaskTime(task.dueAt),
  }));
}
