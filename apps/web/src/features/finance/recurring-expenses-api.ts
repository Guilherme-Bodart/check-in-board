import { apiRequest } from "../../api";

export type RecurringExpenseItem = {
  id: string;
  apartmentId: string;
  title: string;
  category: string;
  amountCents: number;
  dayOfMonth: number;
  notes: string | null;
  active: boolean;
};

export type CreateRecurringExpenseInput = {
  title: string;
  category: string;
  amountCents: number;
  dayOfMonth: number;
  notes?: string | null;
  active?: boolean;
};

export type ApplyRecurringExpensesResult = {
  month: string;
  createdCount: number;
  skippedCount: number;
  createdEntryIds: string[];
};

export async function fetchRecurringExpenses(token: string, apartmentId: string) {
  const response = await apiRequest<{
    apartmentId: string;
    items: RecurringExpenseItem[];
  }>(`/apartments/${apartmentId}/recurring-expenses`, {
    token,
  });

  return response.items;
}

export async function createRecurringExpense(
  token: string,
  apartmentId: string,
  values: CreateRecurringExpenseInput,
) {
  const response = await apiRequest<{ item: RecurringExpenseItem }>(
    `/apartments/${apartmentId}/recurring-expenses`,
    {
      method: "POST",
      token,
      body: {
        title: values.title.trim(),
        category: values.category.trim(),
        amountCents: values.amountCents,
        dayOfMonth: values.dayOfMonth,
        notes: values.notes?.trim() || null,
        active: values.active ?? true,
      },
    },
  );

  return response.item;
}

export async function deleteRecurringExpense(token: string, id: string) {
  await apiRequest<void>(`/recurring-expenses/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function applyRecurringExpensesForMonth(
  token: string,
  apartmentId: string,
  month: string,
) {
  return apiRequest<ApplyRecurringExpensesResult>(
    `/apartments/${apartmentId}/recurring-expenses/apply-month`,
    {
      method: "POST",
      token,
      body: { month },
    },
  );
}
