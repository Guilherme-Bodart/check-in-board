import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { CreateTaskInput, OperationalTask, TaskBoardItem } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

const mockTaskBoardItems = new Map<string, TaskBoardItem>([
  [
    "mock-task-1",
    {
      actionLabel: "Mark done",
      apartment: "Cobertura 7",
      apartmentId: "apt-3",
      assignee: "Team",
      headline: "Replace towels and confirm inspection photos",
      id: "mock-task-1",
      kind: "task",
      notes: "Owner visit tomorrow, keep living room staged.",
      status: "pending",
      taskStatus: "pending",
      time: "16:30",
    },
  ],
]);
const mockTasksByApartment = new Map<string, OperationalTask[]>([
  [
    "apt-3",
    [
      {
        apartmentId: "apt-3",
        apartmentName: "Cobertura 7",
        assignedUserId: null,
        completedAt: null,
        completedByUserId: null,
        description: "Owner visit tomorrow, keep living room staged.",
        dueAt: "2026-05-05T16:30:00.000Z",
        id: "mock-task-1",
        reservationId: null,
        status: "pending",
        statusNote: null,
        title: "Replace towels and confirm inspection photos",
      },
    ],
  ],
]);

type TodayTasksResponse = {
  boardItems?: TaskBoardItem[];
};
type TasksResponse = {
  tasks?: OperationalTask[];
};
type CreateTaskResponse = {
  task?: OperationalTask;
};
type UpdateTaskResponse = {
  task?: OperationalTask;
};

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export const tasksRuntime = {
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function listTodayTaskBoardItems(session: AuthSession | null) {
  if (!useDevAuthApi) {
    return [...mockTaskBoardItems.values()];
  }

  const response = await apiClient.get<TodayTasksResponse>("/tasks/today", {
    headers: getAuthorizationHeaders(session),
  });

  return response.boardItems ?? [];
}

export async function listApartmentTasks(
  session: AuthSession | null,
  apartmentId: string,
) {
  if (!useDevAuthApi) {
    return [...(mockTasksByApartment.get(apartmentId) ?? [])];
  }

  const response = await apiClient.get<TasksResponse>(
    `/apartments/${apartmentId}/tasks`,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return response.tasks ?? [];
}

export async function createApartmentTask(
  session: AuthSession | null,
  apartmentId: string,
  input: CreateTaskInput,
) {
  if (!useDevAuthApi) {
    const task: OperationalTask = {
      apartmentId,
      apartmentName: null,
      assignedUserId: null,
      completedAt: null,
      completedByUserId: null,
      description: input.description ?? null,
      dueAt: input.dueAt,
      id: `mock-task-${Date.now()}`,
      reservationId: null,
      status: "pending",
      statusNote: null,
      title: input.title,
    };
    const currentTasks = mockTasksByApartment.get(apartmentId) ?? [];

    mockTasksByApartment.set(apartmentId, [task, ...currentTasks]);

    return task;
  }

  const response = await apiClient.post<CreateTaskResponse>(
    `/apartments/${apartmentId}/tasks`,
    input,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  if (!response.task) {
    throw new ApiClientError("Task creation response is invalid.", 500);
  }

  return response.task;
}

export async function markTaskStatus(
  session: AuthSession | null,
  taskId: string,
  status: "done" | "not_done",
  note?: string,
) {
  if (!useDevAuthApi) {
    for (const [apartmentId, tasks] of mockTasksByApartment.entries()) {
      const existingTask = tasks.find((task) => task.id === taskId);

      if (existingTask) {
        const updatedTask: OperationalTask = {
          ...existingTask,
          completedAt: new Date().toISOString(),
          status,
          statusNote: status === "not_done" ? (note ?? null) : null,
        };

        mockTasksByApartment.set(
          apartmentId,
          tasks.map((task) => (task.id === taskId ? updatedTask : task)),
        );

        return updatedTask;
      }
    }

    const task = mockTaskBoardItems.get(taskId);

    if (!task) {
      throw new ApiClientError("Task was not found.", 404);
    }

    const updatedTask: TaskBoardItem = {
      ...task,
      actionLabel: "View task",
      status: status === "done" ? "completed" : "failed",
      taskStatus: status,
    };

    mockTaskBoardItems.set(taskId, updatedTask);

    return undefined;
  }

  const response = await apiClient.patch<UpdateTaskResponse>(
    `/tasks/${taskId}/status`,
    { note, status },
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return response.task;
}
