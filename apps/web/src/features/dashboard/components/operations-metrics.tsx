import { MetricCard } from "../../../components/ui/metric-card";
import type { OperationsBoard } from "../../../api";

export function OperationsMetrics({ totals }: { totals: OperationsBoard["totals"] }) {
  return (
    <section className="metricGrid" aria-label="Resumo operacional">
      <MetricCard label="Check-ins" tone="info" value={totals.checkIns} />
      <MetricCard label="Check-outs" tone="warning" value={totals.checkOuts} />
      <MetricCard label="Em estadia" tone="success" value={totals.inHouse} />
      <MetricCard label="Próximas" tone="primary" value={totals.upcoming} />
    </section>
  );
}
