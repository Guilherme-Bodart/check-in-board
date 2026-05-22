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
    <header className="topbar" id="board">
      <div>
        <p className="eyebrow">{email}</p>
        <h1>Board de hospedagem</h1>
      </div>
      <div className="toolbar">
        <input
          aria-label="Data do board"
          onChange={(event) => onBoardDateChange(event.target.value)}
          type="date"
          value={boardDate}
        />
        <select
          aria-label="Apartamento"
          onChange={(event) => onSelectedApartmentChange(event.target.value)}
          value={selectedApartmentId}
        >
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
