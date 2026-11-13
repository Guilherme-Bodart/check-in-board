import { DoorClosed, DoorOpen, RefreshCw } from "lucide-react";

import type { Apartment, OperationsBoard, ReservationCard } from "../../../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { messages } from "../../../i18n";
import { formatIsoDateOnly } from "../../../lib/date-formatters";
import { cn } from "../../../lib/utils";
import type { BoardSectionViewModel } from "../types";
import { BoardSectionCard } from "./board-section-card";

function formatApartmentCountLabel(count: number) {
  return `${count} ${count === 1 ? "apartamento" : "apartamentos"}`;
}

function getGuestLabel(reservation: ReservationCard) {
  return (
    reservation.guestName?.trim() ||
    reservation.rawSummary?.trim() ||
    messages.reservations.reservation
  );
}

function TodayMovementBox({
  apartmentNameById,
  count,
  emptyLabel,
  fallbackApartmentName,
  reservations,
  title,
  tone,
}: {
  apartmentNameById: Map<string, string>;
  count: number;
  emptyLabel: string;
  fallbackApartmentName?: string;
  reservations: ReservationCard[];
  title: string;
  tone: "success" | "warning";
}) {
  const isCheckIn = tone === "success";
  const Icon = isCheckIn ? DoorOpen : DoorClosed;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-3.5 sm:p-4",
        isCheckIn
          ? "border-success/30 bg-success-soft/25"
          : "border-warning/30 bg-warning-soft/25",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              isCheckIn ? "bg-success" : "bg-warning",
            )}
          />
          <Icon
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0",
              isCheckIn ? "text-success" : "text-warning",
            )}
          />
          <h4 className="truncate text-sm font-semibold text-text-primary">{title}</h4>
        </div>
        <Badge tone={tone}>{formatApartmentCountLabel(count)}</Badge>
      </div>

      {reservations.length === 0 ? (
        <p className="rounded-lg border border-border/70 bg-surface/80 px-3 py-2.5 text-sm text-text-secondary">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid gap-2">
          {reservations.map((reservation) => {
            const apartmentName =
              apartmentNameById.get(reservation.apartmentId) ??
              fallbackApartmentName ??
              "Apartamento";

            return (
              <li
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2"
                key={`${reservation.id}-${reservation.startsAt}-${title}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {apartmentName}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {getGuestLabel(reservation)}
                  </p>
                </div>
                <Badge tone="neutral">{reservation.provider}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function OperationsBoardPanel({
  apartments = [],
  board,
  boardDate,
  boardSections,
  onRefresh,
  selectedApartment,
  selectedApartmentId,
}: {
  apartments?: Apartment[];
  board: OperationsBoard | null;
  boardDate: string;
  boardSections: BoardSectionViewModel[];
  onRefresh: () => void;
  selectedApartment: Apartment | null;
  selectedApartmentId: string;
}) {
  const effectiveDate = board?.date ?? boardDate;
  const metaItems = [
    effectiveDate,
    messages.dashboard.boardMetaDays(board?.days ?? 7),
    board?.timezone ?? selectedApartment?.timezone ?? "America/Sao_Paulo",
  ];

  const apartmentNameById = new Map(
    apartments.map((apartment) => [apartment.id, apartment.name]),
  );

  const checkInsSection = boardSections.find((section) => section.id === "checkIns");
  const checkOutsSection = boardSections.find((section) => section.id === "checkOuts");

  const checkIns = checkInsSection?.reservations ?? [];
  const checkOuts = checkOutsSection?.reservations ?? [];

  const checkInApartmentCount =
    checkIns.length > 0
      ? new Set(checkIns.map((reservation) => reservation.apartmentId)).size
      : (checkInsSection?.count ?? 0);
  const checkOutApartmentCount =
    checkOuts.length > 0
      ? new Set(checkOuts.map((reservation) => reservation.apartmentId)).size
      : (checkOutsSection?.count ?? 0);

  return (
    <div
      className="grid gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm"
      id="reservas"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {metaItems.map((item) => (
              <span
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-text-primary">
            {messages.dashboard.boardSectionTitle}
          </h2>
        </div>
        <Button
          disabled={!selectedApartmentId}
          onClick={onRefresh}
          size="lg"
          variant="primary"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          {messages.dashboard.refresh}
        </Button>
      </div>

      <section
        aria-label="Resumo direto de hoje"
        className="grid gap-3 rounded-2xl border border-border bg-surface-muted/40 p-3.5 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text-primary">
            Quem Entra e Quem Sai Hoje
          </h3>
          {effectiveDate ? (
            <Badge tone="neutral">{formatIsoDateOnly(effectiveDate)}</Badge>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TodayMovementBox
            apartmentNameById={apartmentNameById}
            count={checkInApartmentCount}
            emptyLabel="Nenhum check-in hoje"
            fallbackApartmentName={selectedApartment?.name}
            reservations={checkIns}
            title="Check-ins Hoje"
            tone="success"
          />
          <TodayMovementBox
            apartmentNameById={apartmentNameById}
            count={checkOutApartmentCount}
            emptyLabel="Nenhum check-out hoje"
            fallbackApartmentName={selectedApartment?.name}
            reservations={checkOuts}
            title="Check-outs Hoje"
            tone="warning"
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {boardSections.map((section) => (
          <BoardSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
