import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, ShoppingCart } from "lucide-react";

import type { Apartment } from "../../../api";
import { Button } from "../../../components/ui/button";
import { Input, Select } from "../../../components/ui/form-controls";
import { IconButton } from "../../../components/ui/icon-button";
import { messages } from "../../../i18n";
import { formatDateInput } from "../../../lib/date-formatters";

function shiftIsoDate(value: string, deltaDays: number) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : formatDateInput();
  const [year, month, day] = base.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));

  return shifted.toISOString().slice(0, 10);
}

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
  const isToday = Boolean(boardDate) && boardDate === formatDateInput();

  return (
    <header
      className="flex flex-col gap-3 sm:gap-4 rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm"
      id="board"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="hidden sm:block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {email}
          </p>
          <h2 className="text-lg sm:mt-2 sm:text-2xl font-semibold tracking-tight text-text-primary">
            <span className="md:hidden">Hoje</span>
            <span className="hidden md:inline">{messages.dashboard.boardTitle}</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <IconButton
              aria-label="Dia anterior"
              className="h-10 w-10 shrink-0"
              icon={ChevronLeft}
              onClick={() => onBoardDateChange(shiftIsoDate(boardDate, -1))}
              title="Dia anterior"
              variant="secondary"
            />
            <Input
              aria-label={messages.dashboard.boardDateLabel}
              className="h-10 min-w-[140px] flex-1 sm:w-40 sm:flex-initial"
              onChange={(event) => onBoardDateChange(event.target.value)}
              type="date"
              value={boardDate}
            />
            <Button
              aria-label="Ir para hoje"
              className="h-10 shrink-0 px-3"
              onClick={() => onBoardDateChange(formatDateInput())}
              size="sm"
              variant={isToday ? "subtle" : "secondary"}
            >
              Hoje
            </Button>
            <IconButton
              aria-label="Próximo dia"
              className="h-10 w-10 shrink-0"
              icon={ChevronRight}
              onClick={() => onBoardDateChange(shiftIsoDate(boardDate, 1))}
              title="Próximo dia"
              variant="secondary"
            />
          </div>
          <div className="min-w-0 w-full sm:w-60">
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
      </div>

      <div
        aria-label="Ações rápidas"
        className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3"
      >
        <Button
          asChild
          className="w-full min-w-0 justify-center sm:w-auto"
          size="md"
          variant="primary"
        >
          <Link href="/financeiro/lancamentos/novo?type=expense&category=consumo">
            <ShoppingCart aria-hidden className="h-4 w-4" />
            <span className="truncate">+ Compra / Consumo</span>
          </Link>
        </Button>
        <Button
          asChild
          className="w-full min-w-0 justify-center sm:w-auto"
          size="md"
          variant="secondary"
        >
          <Link href="/calendario?openReports=1">
            <FileText aria-hidden className="h-4 w-4" />
            <span className="truncate">Relatório PDF Proprietário</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
