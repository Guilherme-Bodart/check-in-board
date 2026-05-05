import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { Reservation } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

const mockReservationsByApartment = new Map<string, Reservation[]>([
  [
    "apt-1",
    [
      {
        apartmentId: "apt-1",
        endsAt: "2026-05-12T15:00:00.000Z",
        externalEventKey: "reservation-1@example.com",
        externalUid: "reservation-1@example.com",
        icalSourceId: "ical-1",
        id: "reservation-1",
        provider: "airbnb",
        rawSummary: "Reserved - Airbnb",
        startsAt: "2026-05-10T18:00:00.000Z",
        status: "confirmed",
      },
    ],
  ],
]);

export function addMockReservationForApartment(
  apartmentId: string,
  reservation: Reservation,
) {
  const currentReservations = mockReservationsByApartment.get(apartmentId) ?? [];

  mockReservationsByApartment.set(apartmentId, [
    reservation,
    ...currentReservations,
  ]);
}

type ReservationsApiResponse =
  | Reservation[]
  | {
      data?: Reservation[];
      reservations?: Reservation[];
    };

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

function mapReservationsResponse(response: ReservationsApiResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.reservations)) {
    return response.reservations;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

export const reservationsRuntime = {
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function listReservations(
  session: AuthSession | null,
  apartmentId: string,
) {
  if (!useDevAuthApi) {
    return [...(mockReservationsByApartment.get(apartmentId) ?? [])];
  }

  const response = await apiClient.get<ReservationsApiResponse>(
    `/apartments/${apartmentId}/reservations`,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return mapReservationsResponse(response);
}
