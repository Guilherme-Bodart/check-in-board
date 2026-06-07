import { apiBaseUrl, apiRequest } from "./api";

export type OwnerType = "internal" | "client";

export type Owner = {
  id: string;
  name: string;
  type: OwnerType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  apartmentCount: number;
};

export type Apartment = {
  id: string;
  name: string;
  timezone: string;
  managementCommissionBps: number;
  owner: {
    id: string;
    name: string;
    type: OwnerType;
  };
};

export type RentalStay = {
  id: string;
  apartmentId: string;
  apartmentName: string;
  ownerId: string;
  ownerName: string;
  guestName: string | null;
  channel: string | null;
  checkIn: string;
  checkOut: string;
  rentAmountCents: number;
  currency: string;
  notes: string | null;
};

export type FinancialEntryType = "revenue" | "expense";

export type ExpenseCategory =
  | "limpeza"
  | "consumo"
  | "enxoval"
  | "manutencao"
  | "condominio"
  | "contas"
  | "taxas"
  | "outros";

export const expenseCategories: Array<{
  value: ExpenseCategory;
  label: string;
}> = [
  { value: "limpeza", label: "Limpeza" },
  { value: "consumo", label: "Consumo" },
  { value: "enxoval", label: "Enxoval" },
  { value: "manutencao", label: "Manutenção" },
  { value: "condominio", label: "Condomínio" },
  { value: "contas", label: "Contas" },
  { value: "taxas", label: "Taxas" },
  { value: "outros", label: "Outros" },
];

export type FinancialEntry = {
  id: string;
  apartmentId: string;
  apartmentName: string;
  ownerId: string;
  ownerName: string;
  rentalStayId: string | null;
  type: FinancialEntryType;
  category: string;
  description: string | null;
  amountCents: number;
  currency: string;
  occurredOn: string;
};

export type FinanceSummaryItem = {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  apartmentId: string | null;
  apartmentName: string | null;
  managementCommissionBps: number;
  rentCents: number;
  extraRevenueCents: number;
  expenseCents: number;
  netCents: number;
  commissionCents: number;
  payoutCents: number;
  settlementStatus: "pending" | "paid";
  paidAt: string | null;
};

export type FinanceSummary = {
  periodMonth: string;
  rentCents: number;
  extraRevenueCents: number;
  expenseCents: number;
  netCents: number;
  commissionCents: number;
  payoutCents: number;
  byOwner: FinanceSummaryItem[];
  byApartment: FinanceSummaryItem[];
  byStay: Array<{
    id: string;
    apartmentId: string;
    apartmentName: string;
    ownerId: string;
    ownerName: string;
    guestName: string | null;
    rentCents: number;
    expenseCents: number;
    netCents: number;
    commissionCents: number;
    payoutCents: number;
  }>;
};

export type FinanceFilters = {
  month: string;
  apartmentId?: string;
  ownerId?: string;
};

export function financeQuery(filters: FinanceFilters) {
  const params = new URLSearchParams({ month: filters.month });

  if (filters.apartmentId) {
    params.set("apartmentId", filters.apartmentId);
  }

  if (filters.ownerId) {
    params.set("ownerId", filters.ownerId);
  }

  return params.toString();
}

export async function fetchOwners(token: string) {
  const response = await apiRequest<{ owners: Owner[] }>("/owners", { token });
  return response.owners;
}

export async function fetchApartments(token: string) {
  const response = await apiRequest<{ apartments: Apartment[] }>("/apartments", {
    token,
  });
  return response.apartments;
}

export async function fetchRentalStays(token: string, filters: FinanceFilters) {
  const { dateFrom, dateTo } = monthRange(filters.month);
  const params = new URLSearchParams({ dateFrom, dateTo });

  if (filters.apartmentId) {
    params.set("apartmentId", filters.apartmentId);
  }

  if (filters.ownerId) {
    params.set("ownerId", filters.ownerId);
  }

  const response = await apiRequest<{ rentalStays: RentalStay[] }>(
    `/rental-stays?${params}`,
    { token },
  );
  return response.rentalStays;
}

export async function fetchFinancialEntries(
  token: string,
  filters: FinanceFilters,
) {
  const { dateFrom, dateTo } = monthRange(filters.month);
  const params = new URLSearchParams({ dateFrom, dateTo });

  if (filters.apartmentId) {
    params.set("apartmentId", filters.apartmentId);
  }

  if (filters.ownerId) {
    params.set("ownerId", filters.ownerId);
  }

  const response = await apiRequest<{ financialEntries: FinancialEntry[] }>(
    `/financial-entries?${params}`,
    { token },
  );
  return response.financialEntries;
}

export async function fetchFinanceSummary(token: string, filters: FinanceFilters) {
  return apiRequest<FinanceSummary>(`/finance-mvp/summary?${financeQuery(filters)}`, {
    token,
  });
}

export function exportCsvUrl(filters: FinanceFilters) {
  return `/finance-mvp/export.csv?${financeQuery(filters)}`;
}

export async function downloadFinanceCsv(token: string, filters: FinanceFilters) {
  const response = await fetch(`${apiBaseUrl}${exportCsvUrl(filters)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao exportar CSV.");
  }

  return response.blob();
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const dateFrom = `${month}-01`;
  const dateTo = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  return { dateFrom, dateTo };
}
