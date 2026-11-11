import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

type BadgeTone = "danger" | "info" | "neutral" | "primary" | "success" | "warning";

const toneClasses: Record<BadgeTone, string> = {
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "border border-border/60 bg-surface-muted text-text-secondary",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

export function Badge({
  children,
  className,
  tone = "primary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
