import {
  ApiClientError,
  apiClient,
  getApiBaseUrl,
} from "@/services/api-client";

import type { AuthSession, AuthSubmitInput } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";
const devAuthPath =
  process.env.EXPO_PUBLIC_DEV_AUTH_PATH || "/auth/dev/sign-up";

type DevAuthApiResponse = {
  accessToken?: string;
  organization?: {
    name?: string;
  };
  organizationName?: string;
  session?: Partial<AuthSession>;
  token?: string;
  user?: {
    email?: string;
    fullName?: string;
    id?: string;
    name?: string;
  };
};

function getDefaultName(email: string) {
  const localPart = email.split("@")[0] || "Operator";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (!normalized) {
    return "Operator";
  }

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createMockSession(input: AuthSubmitInput): AuthSession {
  const createdAt = new Date().toISOString();

  return {
    accessToken: `mock-${Date.now()}`,
    authSource: "mock",
    createdAt,
    organizationName: input.organizationName || "Check-In Board Dev Workspace",
    user: {
      email: input.email,
      id: `mock-user-${input.email}`,
      name: input.name || getDefaultName(input.email),
    },
  };
}

function mapApiSession(
  response: DevAuthApiResponse,
  input: AuthSubmitInput,
): AuthSession {
  if (response.session?.user && response.session.accessToken) {
    return {
      accessToken: response.session.accessToken,
      authSource: "api",
      createdAt: response.session.createdAt || new Date().toISOString(),
      organizationName:
        response.session.organizationName || input.organizationName,
      user: {
        email: response.session.user.email || input.email,
        id: response.session.user.id || `api-user-${input.email}`,
        name:
          response.session.user.name ||
          input.name ||
          getDefaultName(input.email),
      },
    };
  }

  if ((response.accessToken || response.token) && response.user) {
    return {
      accessToken: response.accessToken || response.token || "",
      authSource: "api",
      createdAt: new Date().toISOString(),
      organizationName:
        response.organization?.name ||
        response.organizationName ||
        input.organizationName,
      user: {
        email: response.user.email || input.email,
        id: response.user.id || `api-user-${input.email}`,
        name:
          response.user.name ||
          response.user.fullName ||
          input.name ||
          getDefaultName(input.email),
      },
    };
  }

  throw new ApiClientError(
    "Dev auth response shape is not supported by the mobile client yet.",
    500,
  );
}

export const authRuntime = {
  apiBaseUrl: getApiBaseUrl(),
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function authenticateWithDevAuth(input: AuthSubmitInput) {
  if (!useDevAuthApi) {
    return createMockSession(input);
  }

  const response = await apiClient.post<DevAuthApiResponse>(devAuthPath, {
    email: input.email,
    fullName: input.name || getDefaultName(input.email),
    organizationName: input.organizationName,
  });
  return mapApiSession(response, input);
}
