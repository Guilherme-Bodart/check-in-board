import type { BoardTone } from "../../features/dashboard/types";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

const toneClasses: Record<
  BoardTone,
  { card: string; icon: string; value: string }
> = {
  info: {
    card: "border-info/25 bg-info-soft/45",
    icon: "bg-info text-white",
    value: "text-info",
  },
  warning: {
    card: "border-warning/25 bg-warning-soft/60",
    icon: "bg-warning text-white",
    value: "text-warning",
  },
  success: {
    card: "border-success/25 bg-success-soft/60",
    icon: "bg-success text-white",
    value: "text-success",
  },
  primary: {
    card: "border-primary/25 bg-primary-soft",
    icon: "bg-primary text-primary-foreground",
    value: "text-primary",
  },
};

export function MetricCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: BoardTone;
  value: number;
}) {
  const classes = toneClasses[tone];

  return (
    <article
      className={cn(
        "min-h-32 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        classes.card,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", classes.icon)}>
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
      <strong className={cn("mt-5 block text-4xl font-semibold leading-none", classes.value)}>
        {value}
      </strong>
    </article>
  );
}
