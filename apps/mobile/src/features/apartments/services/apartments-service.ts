import { apiClient, ApiClientError } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { Apartment, CreateApartmentInput } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

let mockApartments: Apartment[] = [
  {
    id: "apt-1",
    name: "Apto 204",
    status: "active",
    timezone: "America/Sao_Paulo",
  },
  {
    id: "apt-2",
    name: "Studio 12B",
    status: "active",
    timezone: "America/Sao_Paulo",
  },
];

type ApiApartment = {
  id: string;
  name: string;
  timezone: string;
};

type ApartmentsApiResponse =
  | ApiApartment[]
  | {
      apartments?: ApiApartment[];
      data?: ApiApartment[];
    };

type CreateApartmentApiResponse =
  | ApiApartment
  | {
      apartment?: ApiApartment;
      data?: ApiApartment;
    };

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

function normalizeApartment(apartment: ApiApartment): Apartment {
  return {
    id: apartment.id,
    name: apartment.name,
    status: "active",
    timezone: apartment.timezone,
  };
}

function mapApartmentsResponse(response: ApartmentsApiResponse) {
  if (Array.isArray(response)) {
    return response.map(normalizeApartment);
  }

  if (Array.isArray(response.apartments)) {
    return response.apartments.map(normalizeApartment);
  }

  if (Array.isArray(response.data)) {
    return response.data.map(normalizeApartment);
  }

  return [];
}

function mapCreateApartmentResponse(response: CreateApartmentApiResponse) {
  if ("id" in response) {
    return normalizeApartment(response);
  }

  if (response.apartment) {
    return normalizeApartment(response.apartment);
  }

  if (response.data) {
    return normalizeApartment(response.data);
  }

  throw new ApiClientError(
    "Apartment creation response shape is not supported yet.",
    500,
  );
}

function createMockApartment(input: CreateApartmentInput) {
  const apartment: Apartment = {
    id: `apt-${Date.now()}`,
    name: input.name,
    status: "active",
    timezone: input.timezone,
  };

  mockApartments = [apartment, ...mockApartments];

  return apartment;
}

export const apartmentsRuntime = {
  mode: useDevAuthApi ? "api" : "mock",
} as const;

export async function listApartments(session: AuthSession | null) {
  if (!useDevAuthApi) {
    return [...mockApartments];
  }

  const response = await apiClient.get<ApartmentsApiResponse>("/apartments", {
    headers: getAuthorizationHeaders(session),
  });

  return mapApartmentsResponse(response);
}

export async function getApartmentById(
  session: AuthSession | null,
  apartmentId: string,
) {
  const apartments = await listApartments(session);

  return apartments.find((apartment) => apartment.id === apartmentId) ?? null;
}

export async function createApartment(
  session: AuthSession | null,
  input: CreateApartmentInput,
) {
  if (!useDevAuthApi) {
    return createMockApartment(input);
  }

  const response = await apiClient.post<CreateApartmentApiResponse>(
    "/apartments",
    input,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return mapCreateApartmentResponse(response);
}
