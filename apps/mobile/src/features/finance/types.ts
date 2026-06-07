export type FinanceApartment = {
  id: string;
  name: string;
};

export type FinanceRentalStay = {
  id: string;
  apartmentId: string;
  apartmentName: string;
  guestName: string | null;
};

export type ExpenseCategory =
  | "limpeza"
  | "consumo"
  | "enxoval"
  | "manutencao"
  | "condominio"
  | "contas"
  | "taxas"
  | "outros";

export const expenseCategoryOptions: Array<{
  label: string;
  value: ExpenseCategory;
}> = [
  { label: "Limpeza", value: "limpeza" },
  { label: "Consumo", value: "consumo" },
  { label: "Enxoval", value: "enxoval" },
  { label: "Manutenção", value: "manutencao" },
  { label: "Condomínio", value: "condominio" },
  { label: "Contas", value: "contas" },
  { label: "Taxas", value: "taxas" },
  { label: "Outros", value: "outros" },
];
