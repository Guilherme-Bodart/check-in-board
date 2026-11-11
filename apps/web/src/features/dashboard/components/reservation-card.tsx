import type { ReservationCard as ReservationCardType } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { messages } from "../../../i18n";
import { formatReservationDateRange } from "../../../lib/date-formatters";

export function ReservationCard({ reservation }: { reservation: ReservationCardType }) {
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface/80 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-text-primary">
          {reservation.rawSummary ?? messages.reservations.reservation}
        </strong>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{reservation.provider}</Badge>
          <Badge tone={reservation.status === "confirmed" ? "success" : "neutral"}>
            {reservation.status}
          </Badge>
        </div>
      </div>
      <time className="shrink-0 whitespace-nowrap rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-secondary">
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </time>
    </article>
  );
}
