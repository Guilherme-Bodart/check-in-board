import type { BoardSectionViewModel } from "../types";
import { ReservationCard } from "./reservation-card";

export function BoardSectionCard({ section }: { section: BoardSectionViewModel }) {
  return (
    <article className={`boardSectionCard ${section.tone}`}>
      <header>
        <div>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
        <strong>{section.count}</strong>
      </header>
      <div className="reservationList">
        {section.reservations.length === 0 ? (
          <p className="mutedText">Nenhuma reserva.</p>
        ) : (
          section.reservations.map((reservation) => (
            <ReservationCard
              key={`${reservation.id}-${reservation.startsAt}-${section.id}`}
              reservation={reservation}
            />
          ))
        )}
      </div>
    </article>
  );
}
