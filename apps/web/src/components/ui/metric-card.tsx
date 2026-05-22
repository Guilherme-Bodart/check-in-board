import type { BoardTone } from "../../features/dashboard/types";
import { cn } from "../../lib/utils";

const toneClasses: Record<BoardTone, string> = {
  info: "border-info/30 bg-info-soft/50 text-info",
  warning: "border-warning/30 bg-warning-soft/70 text-warning",
  success: "border-success/30 bg-success-soft/70 text-success",
  primary: "border-primary/30 bg-primary-soft text-primary",
};

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
    <article
      className={cn(
        "rounded-2xl border bg-surface p-5 shadow-sm",
        toneClasses[tone],
      )}
    >
      <span className="block text-sm font-medium text-text-secondary">{label}</span>
      <strong className="mt-4 block text-4xl font-semibold leading-none text-text-primary">
        {String(value).padStart(2, "0")}
      </strong>
    </article>
  );
}
