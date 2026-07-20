import { apiRequest, type Reservation } from "../../api";

export async function fetchReservations(token: string, apartmentId: string) {
  const response = await apiRequest<{ reservations: Reservation[] }>(
    `/apartments/${apartmentId}/reservations`,
    { token },
  );

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
