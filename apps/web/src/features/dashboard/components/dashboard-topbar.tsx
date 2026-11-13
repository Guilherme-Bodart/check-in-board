import type { Apartment } from "../../../api";
import { Input, Select } from "../../../components/ui/form-controls";
import { messages } from "../../../i18n";

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
          {messages.dashboard.boardTitle}
        </h2>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          aria-label={messages.dashboard.boardDateLabel}
          className="h-10 sm:w-44"
          onChange={(event) => onBoardDateChange(event.target.value)}
          type="date"
          value={boardDate}
        />
        <div className="min-w-0 sm:w-64">
          <Select
            aria-label={messages.dashboard.apartmentLabel}
            className="h-10"
            onChange={(event) => onSelectedApartmentChange(event.target.value)}
            value={selectedApartmentId}
          >
            <option value="all">{messages.dashboard.allApartments}</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </header>
  );
}
