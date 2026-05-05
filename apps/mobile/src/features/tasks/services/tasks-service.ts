import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { TaskBoardItem } from "../types";

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

type TodayTasksResponse = {
  boardItems?: TaskBoardItem[];
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

export async function markTaskStatus(
  session: AuthSession | null,
  taskId: string,
  status: "done" | "not_done",
) {
  if (!useDevAuthApi) {
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

    return updatedTask;
  }

  await apiClient.patch(`/tasks/${taskId}/status`, { status }, {
    headers: getAuthorizationHeaders(session),
  });
}
