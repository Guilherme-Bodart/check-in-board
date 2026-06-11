"use client";

import { useParams } from "next/navigation";

import { FinanceEntryFormPage } from "../../../../../../features/finance/finance-entry-form-page";

export default function EditFinancialEntryRoute() {
  const params = useParams<{ entryId: string }>();

  return <FinanceEntryFormPage entryId={params.entryId} />;
}
