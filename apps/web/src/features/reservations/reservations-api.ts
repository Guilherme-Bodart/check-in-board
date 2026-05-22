import { apiRequest, type Reservation } from "../../api";

export async function fetchReservations(token: string, apartmentId: string) {
  const response = await apiRequest<{ reservations: Reservation[] }>(
    `/apartments/${apartmentId}/reservations`,
    { token },
  );

  return response.reservations;
}
