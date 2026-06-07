import { apiClient, ApiClientError } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type { FinanceRentalStay } from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

let mockRentalStays: FinanceRentalStay[] = [];

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

function currentMonthRange() {
  const month = new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);

  return {
    dateFrom: `${month}-01`,
    dateTo: new Date(year, monthNumber, 0).toISOString().slice(0, 10),
  };
}

export async function listRentalStays(session: AuthSession | null) {
  if (!useDevAuthApi) {
    return [...mockRentalStays];
  }

  const range = currentMonthRange();
  const response = await apiClient.get<{ rentalStays: FinanceRentalStay[] }>(
    `/rental-stays?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return response.rentalStays;
}

export async function createRentalStay(
  session: AuthSession | null,
  input: {
    apartmentId: string;
    apartmentName: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    rentAmountCents: number;
  },
) {
  if (!useDevAuthApi) {
    const stay: FinanceRentalStay = {
      id: `stay-${Date.now()}`,
      apartmentId: input.apartmentId,
      apartmentName: input.apartmentName,
      guestName: input.guestName || null,
    };
    mockRentalStays = [stay, ...mockRentalStays];
    return stay;
  }

  const response = await apiClient.post<{ rentalStay: FinanceRentalStay }>(
    "/rental-stays",
    {
      apartmentId: input.apartmentId,
      guestName: input.guestName || null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rentAmountCents: input.rentAmountCents,
      currency: "BRL",
    },
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return response.rentalStay;
}

export async function createExpense(
  session: AuthSession | null,
  input: {
    apartmentId: string;
    category: string;
    description: string;
    amountCents: number;
    occurredOn: string;
    rentalStayId?: string;
  },
) {
  if (!useDevAuthApi) {
    return;
  }

  await apiClient.post(
    "/financial-entries",
    {
      apartmentId: input.apartmentId,
      rentalStayId: input.rentalStayId || null,
      type: "expense",
      category: input.category,
      description: input.description,
      amountCents: input.amountCents,
      currency: "BRL",
      occurredOn: input.occurredOn,
    },
    {
      headers: getAuthorizationHeaders(session),
    },
  );
}
