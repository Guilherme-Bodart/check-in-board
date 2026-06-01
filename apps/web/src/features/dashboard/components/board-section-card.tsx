import { messages } from "../../../i18n";
import { cn } from "../../../lib/utils";
import type { BoardSectionViewModel } from "../types";
import { ReservationCard } from "./reservation-card";

const toneClasses: Record<BoardSectionViewModel["tone"], string> = {
  info: "border-info/30 bg-info-soft/20",
  warning: "border-warning/30 bg-warning-soft/25",
  success: "border-success/30 bg-success-soft/25",
  primary: "border-primary/30 bg-primary-soft/30",
};

export function BoardSectionCard({ section }: { section: BoardSectionViewModel }) {
  return (
    <article
      className={cn(
        "grid min-h-56 gap-4 rounded-2xl border p-5 shadow-sm",
        toneClasses[section.tone],
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
      <div className="mt-2 grid gap-3">
        {section.reservations.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface/70 px-3 py-3 text-sm text-text-secondary">
            {messages.dashboard.emptyReservation}
          </p>
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
