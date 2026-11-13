import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";

type IconButtonVariant = "danger" | "ghost" | "secondary";

const variantClasses: Record<IconButtonVariant, string> = {
  danger:
    "border-border bg-surface text-text-secondary hover:border-danger hover:bg-danger-soft/50 hover:text-danger",
  ghost:
    "border-transparent bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  secondary:
    "border-border bg-surface text-text-secondary hover:border-primary/60 hover:bg-primary-soft/40 hover:text-primary",
};

export function IconButton({
  "aria-label": ariaLabel,
  className,
  icon: Icon,
  variant = "secondary",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  "aria-label": string;
  icon: LucideIcon;
  variant?: IconButtonVariant;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "grid h-9 w-9 cursor-pointer select-none place-items-center rounded-lg border shadow-2xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25 active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      type="button"
      {...props}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
}
