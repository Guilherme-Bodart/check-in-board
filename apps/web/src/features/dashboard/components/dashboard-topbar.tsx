import type { Apartment } from "../../../api";

export function DashboardTopbar({
  apartments,
  boardDate,
  email,
  onBoardDateChange,
  onSelectedApartmentChange,
  selectedApartmentId,
}: {
  apartments: Apartment[];
  boardDate: string;
  email: string;
  onBoardDateChange: (date: string) => void;
  onSelectedApartmentChange: (apartmentId: string) => void;
  selectedApartmentId: string;
}) {
  return (
    <header
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"
      id="board"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          {email}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
          Board de hospedagem
        </h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Data do board"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => onBoardDateChange(event.target.value)}
          type="date"
          value={boardDate}
        />
        <select
          aria-label="Apartamento"
          className="h-11 min-w-56 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          onChange={(event) => onSelectedApartmentChange(event.target.value)}
          value={selectedApartmentId}
        >
          <option value="all">Todos os apartamentos</option>
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {apartment.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
