import { CalendarClock, DoorClosed, DoorOpen, Home } from "lucide-react";

import type { OperationsBoard } from "../../../api";
import { MetricCard } from "../../../components/ui/metric-card";
import { messages } from "../../../i18n";

export function OperationsMetrics({ totals }: { totals: OperationsBoard["totals"] }) {
  return (
    <section
      aria-label={messages.dashboard.operationalSummary}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <MetricCard icon={DoorOpen} label="Check-ins" tone="info" value={totals.checkIns} />
      <MetricCard
        icon={DoorClosed}
        label="Check-outs"
        tone="warning"
        value={totals.checkOuts}
      />
      <MetricCard icon={Home} label="Em estadia" tone="success" value={totals.inHouse} />
      <MetricCard
        icon={CalendarClock}
        label="Próximas"
        tone="primary"
        value={totals.upcoming}
      />
    </section>
  );
}
