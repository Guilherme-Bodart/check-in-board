import {
  apiRequest,
  type FinancialEntry,
  type FinancialEntryType,
  type FinancialSummary,
} from "../../api";

export type FinanceFilters = {
  dateFrom: string;
  dateTo: string;
  apartmentId?: string;
  ownerId?: string;
};

export type FinancialEntryValues = {
  apartmentId: string;
  type: FinancialEntryType;
  category: string;
  description?: string;
  amountCents: number;
  currency: string;
  occurredOn: string;
};

export async function fetchFinancialEntries(token: string, filters: FinanceFilters) {
  const response = await apiRequest<{ financialEntries: FinancialEntry[] }>(
    `/financial-entries?${filterParams(filters)}`,
    { token },
  );

  return response.financialEntries;
}

export async function fetchFinancialSummary(token: string, filters: FinanceFilters) {
  return apiRequest<FinancialSummary>(`/financial-summary?${filterParams(filters)}`, {
    token,
  });
}

export async function fetchFinancialEntry(token: string, entryId: string) {
  const response = await apiRequest<{ financialEntry: FinancialEntry }>(
    `/financial-entries/${entryId}`,
    { token },
  );

  return response.financialEntry;
}

export async function createFinancialEntry(
  token: string,
  values: FinancialEntryValues,
) {
  const response = await apiRequest<{ financialEntry: FinancialEntry }>(
    "/financial-entries",
    {
      method: "POST",
      token,
      body: normalizePayload(values),
    },
  );

  return response.financialEntry;
}

export async function updateFinancialEntry(
  token: string,
  entryId: string,
  values: FinancialEntryValues,
) {
  const response = await apiRequest<{ financialEntry: FinancialEntry }>(
    `/financial-entries/${entryId}`,
    {
      method: "PUT",
      token,
      body: normalizePayload(values),
    },
  );

  return response.financialEntry;
}

export async function deleteFinancialEntry(token: string, entryId: string) {
  await apiRequest<void>(`/financial-entries/${entryId}`, {
    method: "DELETE",
    token,
  });
}

function filterParams(filters: FinanceFilters) {
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

  return params.toString();
}

function normalizePayload(values: FinancialEntryValues) {
  return {
    ...values,
    category: values.category.trim(),
    description: values.description?.trim() || null,
    currency: values.currency.trim().toUpperCase(),
  };
}
