import type { BoardSectionViewModel } from "../types";
import { ReservationCard } from "./reservation-card";
import { cn } from "../../../lib/utils";

const borderClasses: Record<BoardSectionViewModel["tone"], string> = {
  info: "border-info/40",
  warning: "border-warning/40",
  success: "border-success/40",
  primary: "border-primary/40",
};

export function BoardSectionCard({ section }: { section: BoardSectionViewModel }) {
  return (
    <article
      className={cn(
        "grid min-h-56 gap-4 rounded-2xl border bg-surface p-5 shadow-sm",
        borderClasses[section.tone],
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{section.title}</h3>
          <p className="mt-1 text-sm leading-5 text-text-secondary">
            {section.description}
          </p>
        </div>
        <strong className="text-3xl font-semibold leading-none text-text-primary">
          {section.count}
        </strong>
      </header>
      <div className="mt-6 grid gap-3">
        {section.reservations.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma reserva.</p>
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
