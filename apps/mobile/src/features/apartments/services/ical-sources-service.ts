import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { CreateIcalSourceInput, IcalSource } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

const mockSourcesByApartment = new Map<string, IcalSource[]>([
  [
    "apt-1",
    [
      {
        id: "ical-1",
        label: "Airbnb main",
        lastFailureAt: null,
        lastSuccessAt: "2026-05-04T12:18:00.000Z",
        provider: "airbnb",
        syncEnabled: true,
      },
    ],
  ],
]);

type IcalSourcesApiResponse =
  | IcalSource[]
  | {
      data?: IcalSource[];
      icalSources?: IcalSource[];
    };

type CreateIcalSourceApiResponse =
  | IcalSource
  | {
      data?: IcalSource;
      icalSource?: IcalSource;
    };

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

function mapIcalSourcesResponse(response: IcalSourcesApiResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.icalSources)) {
    return response.icalSources;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function mapCreateIcalSourceResponse(response: CreateIcalSourceApiResponse) {
  if ("id" in response) {
    return response;
  }

  if (response.icalSource) {
    return response.icalSource;
  }

  if (response.data) {
    return response.data;
  }

  throw new ApiClientError(
    "iCal source creation response shape is not supported yet.",
    500,
  );
}

function createMockIcalSource(
  apartmentId: string,
  input: CreateIcalSourceInput,
) {
  const source: IcalSource = {
    id: `ical-${Date.now()}`,
    label: input.label,
    lastFailureAt: null,
    lastSuccessAt: null,
    provider: input.provider,
    syncEnabled: true,
  };
  const currentSources = mockSourcesByApartment.get(apartmentId) ?? [];

  mockSourcesByApartment.set(apartmentId, [source, ...currentSources]);

  return source;
}

export const icalSourcesRuntime = {
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function listIcalSources(
  session: AuthSession | null,
  apartmentId: string,
) {
  if (!useDevAuthApi) {
    return [...(mockSourcesByApartment.get(apartmentId) ?? [])];
  }

  const response = await apiClient.get<IcalSourcesApiResponse>(
    `/apartments/${apartmentId}/ical-sources`,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return mapIcalSourcesResponse(response);
}

export async function createIcalSource(
  session: AuthSession | null,
  apartmentId: string,
  input: CreateIcalSourceInput,
) {
  if (!useDevAuthApi) {
    return createMockIcalSource(apartmentId, input);
  }

  const response = await apiClient.post<CreateIcalSourceApiResponse>(
    `/apartments/${apartmentId}/ical-sources`,
    input,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return mapCreateIcalSourceResponse(response);
}
