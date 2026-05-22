import type { ReservationCard as ReservationCardType } from "../../../api";
import { formatReservationDateRange } from "../../../lib/date-formatters";

export function ReservationCard({ reservation }: { reservation: ReservationCardType }) {
  return (
    <article className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <strong className="block text-sm font-semibold text-text-primary">
          {reservation.rawSummary ?? "Reserva"}
        </strong>
        <span className="mt-1 block text-sm text-text-secondary">
          {reservation.provider} | {reservation.status}
        </span>
      </div>
      <time className="text-sm font-medium text-text-secondary">
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </time>
    </article>
  );
}
