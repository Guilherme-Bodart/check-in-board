import type { ReservationCard as ReservationCardType } from "../../../api";
import { formatReservationDateRange } from "../../../lib/date-formatters";

export function ReservationCard({ reservation }: { reservation: ReservationCardType }) {
  return (
    <article className="reservationCard">
      <div>
        <strong>{reservation.rawSummary ?? "Reserva"}</strong>
        <span>
          {reservation.provider} | {reservation.status}
        </span>
      </div>
      <time>
        {formatReservationDateRange(reservation.startsAt, reservation.endsAt)}
      </time>
    </article>
  );
}
