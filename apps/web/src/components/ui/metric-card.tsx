import type { BoardTone } from "../../features/dashboard/types";

export function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: BoardTone;
  value: number;
}) {
  return (
    <article className={`metricCard ${tone}`}>
      <span>{label}</span>
      <strong>{String(value).padStart(2, "0")}</strong>
    </article>
  );
}
