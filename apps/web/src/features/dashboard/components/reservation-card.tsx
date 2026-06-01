import type { ReservationCard as ReservationCardType } from "../../../api";
import { messages } from "../../../i18n";
import { formatReservationDateRange } from "../../../lib/date-formatters";

export function ReservationCard({ reservation }: { reservation: ReservationCardType }) {
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface/80 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <strong className="block text-sm font-semibold text-text-primary">
          {reservation.rawSummary ?? messages.reservations.reservation}
        </strong>
        <span className="mt-1 block text-sm text-text-secondary">
          {reservation.provider} | {reservation.status}
        </span>
      </div>
      <time className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-semibold text-text-secondary">
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </time>
    </article>
  );
}
