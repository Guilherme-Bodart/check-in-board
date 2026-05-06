import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export async function changePassword(
  session: AuthSession | null,
  input: {
    currentPassword: string;
    newPassword: string;
  },
) {
  if (!useDevAuthApi) {
    return;
  }

  await apiClient.post(
    "/auth/change-password",
    {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
    {
      headers: getAuthorizationHeaders(session),
    },
  );
}

export async function requestPasswordReset(email: string) {
  if (!useDevAuthApi) {
    return {};
  }

  return await apiClient.post<{ resetToken?: string | null }>(
    "/auth/password-reset/request",
    { email },
  );
}

export async function resetPassword(input: {
  newPassword: string;
  token: string;
}) {
  if (!useDevAuthApi) {
    return;
  }

  await apiClient.post("/auth/password-reset/confirm", input);
}
