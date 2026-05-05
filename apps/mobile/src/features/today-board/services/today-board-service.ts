import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";
import { listTodayTaskBoardItems } from "@/features/tasks";

import { todayBoardScenarios } from "../mock-data";
import type { TodayBoardContent } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

type TodayBoardApiResponse = TodayBoardContent;

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export const todayBoardRuntime = {
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function getTodayBoard(session: AuthSession | null) {
  if (!useDevAuthApi) {
    return {
      ...todayBoardScenarios.content,
      boardItems: [
        ...todayBoardScenarios.content.boardItems.filter(
          (item) => item.kind !== "task",
        ),
        ...(await listTodayTaskBoardItems(session)),
      ],
    };
  }

  const [reservationBoard, taskBoardItems] = await Promise.all([
    apiClient.get<TodayBoardApiResponse>("/today-board", {
      headers: getAuthorizationHeaders(session),
    }),
    listTodayTaskBoardItems(session),
  ]);

  return {
    ...reservationBoard,
    boardItems: [...reservationBoard.boardItems, ...taskBoardItems],
  };
}
