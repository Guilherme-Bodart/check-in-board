import { ApartmentFinancePage } from "../../../../../features/finance/apartment-finance-page";

export const metadata = {
  title: "Financeiro | Check-in Board",
};

export default function FinanceRoute({ params }: { params: { apartmentId: string } }) {
  return <ApartmentFinancePage apartmentId={params.apartmentId} />;
}
