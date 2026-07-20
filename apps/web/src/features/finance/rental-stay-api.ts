import { apiRequest, type RentalStay } from "../../api";
import type { FinanceFilters } from "./finance-api";

export type RentalStayValues = {
  id?: string;
  apartmentId: string;
  guestName?: string;
  channel?: string;
  checkIn: string;
  checkOut: string;
  rentAmountCents: number;
  currency: string;
  notes?: string;
};

export async function fetchRentalStays(token: string, filters: FinanceFilters) {
  const params = new URLSearchParams({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  if (filters.apartmentId) {
    params.set("apartmentId", filters.apartmentId);
  }

  if (filters.ownerId) {
    params.set("ownerId", filters.ownerId);
  }

  const response = await apiRequest<{ rentalStays: RentalStay[] }>(
    `/rental-stays?${params.toString()}`,
    { token },
  );

  return response.rentalStays;
}

export async function createRentalStay(token: string, values: RentalStayValues) {
  const response = await apiRequest<{ rentalStay: RentalStay }>(
    "/rental-stays",
    {
      method: "POST",
      token,
      body: normalizePayload(values),
    },
  );

  return response.rentalStay;
}

export async function updateRentalStay(
  token: string,
  rentalStayId: string,
  values: RentalStayValues,
) {
  const response = await apiRequest<{ rentalStay: RentalStay }>(
    `/rental-stays/${rentalStayId}`,
    {
      method: "PUT",
      token,
      body: normalizePayload(values),
    },
  );

  return response.rentalStay;
}

export async function deleteRentalStay(token: string, rentalStayId: string) {
  await apiRequest<void>(`/rental-stays/${rentalStayId}`, {
    method: "DELETE",
    token,
  });
}

function normalizePayload(values: RentalStayValues) {
  return {
    ...values,
    guestName: values.guestName?.trim() || null,
    channel: values.channel?.trim() || null,
    notes: values.notes?.trim() || null,
    currency: values.currency.trim().toUpperCase(),
  };
}
