import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";
import { addMockReservationForApartment } from "@/features/reservations/services/reservations-service";

import type {
  CreateIcalSourceInput,
  IcalSource,
  IcalSyncSummary,
} from "../types";

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
type SyncIcalSourceApiResponse = {
  summary?: IcalSyncSummary;
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

function createDemoReservationDates() {
  const startsAt = new Date();

  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(18, 0, 0, 0);

  const endsAt = new Date(startsAt);

  endsAt.setDate(endsAt.getDate() + 1);
  endsAt.setHours(15, 0, 0, 0);

  return { endsAt, startsAt };
}

function updateMockSourceLastSuccess(apartmentId: string, sourceId: string) {
  const sources = mockSourcesByApartment.get(apartmentId) ?? [];
  const syncedAt = new Date().toISOString();

  mockSourcesByApartment.set(
    apartmentId,
    sources.map((source) =>
      source.id === sourceId
        ? {
            ...source,
            lastFailureAt: null,
            lastSuccessAt: syncedAt,
          }
        : source,
    ),
  );
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

export async function syncIcalSource(
  session: AuthSession | null,
  apartmentId: string,
  source: IcalSource,
) {
  const { endsAt, startsAt } = createDemoReservationDates();
  const uid = `demo-${source.id}-${Date.now()}@check-in-board.local`;
  const summary = "Reserved - Demo Sync";

  if (!useDevAuthApi) {
    updateMockSourceLastSuccess(apartmentId, source.id);
    addMockReservationForApartment(apartmentId, {
      apartmentId,
      endsAt: endsAt.toISOString(),
      externalEventKey: uid,
      externalUid: uid,
      icalSourceId: source.id,
      id: `reservation-${Date.now()}`,
      provider: source.provider,
      rawSummary: summary,
      startsAt: startsAt.toISOString(),
      status: "confirmed",
    });

    return {
      eventsSeen: 1,
      reservationsUpserted: 1,
    } satisfies IcalSyncSummary;
  }

  const response = await apiClient.post<SyncIcalSourceApiResponse>(
    `/ical-sources/${source.id}/sync`,
    {},
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return (
    response.summary ?? {
      eventsSeen: 0,
      reservationsUpserted: 0,
    }
  );
}
