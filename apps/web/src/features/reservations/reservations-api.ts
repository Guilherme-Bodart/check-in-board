import { apiRequest, type Reservation } from "../../api";

export async function fetchReservations(
  token: string,
  apartmentId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<{ reservations: Reservation[] }>(
    `/apartments/${apartmentId}/reservations`,
    { token, signal },
  );

  return response.reservations;
}

export async function fetchAllReservations(
  token: string,
  params?: {
    apartmentId?: string;
    from?: string;
    to?: string;
    signal?: AbortSignal;
  },
): Promise<Reservation[]> {
  const searchParams = new URLSearchParams();
  if (params?.apartmentId && params.apartmentId !== "all") {
    searchParams.set("apartmentId", params.apartmentId);
  }
  if (params?.from) {
    searchParams.set("from", params.from);
  }
  if (params?.to) {
    searchParams.set("to", params.to);
  }

  const query = searchParams.toString();
  const path = query ? `/reservations?${query}` : "/reservations";

  const response = await apiRequest<{ reservations: Reservation[] }>(path, {
    token,
    signal: params?.signal,
  });

  return response.reservations;
}

export async function createManualReservation(
  token: string,
  apartmentId: string,
  data: {
    guestName: string;
    guestCount: number;
    startsAt: string;
    endsAt: string;
  },
) {
  return apiRequest<Reservation>(`/apartments/${apartmentId}/reservations`, {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateReservation(
  token: string,
  apartmentId: string,
  reservationId: string,
  data: { guestName: string; guestCount: number },
) {
  return apiRequest<Reservation>(
    `/apartments/${apartmentId}/reservations/${reservationId}`,
    {
      method: "PATCH",
      token,
      body: data,
    },
  );
}
