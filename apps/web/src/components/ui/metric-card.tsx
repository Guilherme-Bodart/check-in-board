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
        "min-w-0 rounded-2xl border p-3.5 sm:p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        classes.card,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-text-secondary truncate">{label}</span>
        <span className={cn("grid h-8 w-8 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl", classes.icon)}>
          <Icon aria-hidden className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      <strong className={cn("mt-3 sm:mt-4 block text-2xl sm:text-4xl font-bold leading-none truncate", classes.value)}>
        {value}
      </strong>
    </article>
  );
}
