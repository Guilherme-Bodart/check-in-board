"use client";

import { useParams } from "next/navigation";

import { FinanceEntryFormPage } from "../../../../../../features/finance/finance-entry-form-page";

export default function EditFinancialEntryRoute() {
  const params = useParams<{ entryId: string }>();
  const entryId = params?.entryId;

  if (!entryId) return null;

  return <FinanceEntryFormPage entryId={entryId} />;
}
