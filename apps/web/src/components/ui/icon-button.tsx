import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";

type IconButtonVariant = "danger" | "ghost" | "secondary";

const variantClasses: Record<IconButtonVariant, string> = {
  danger: "border-border text-text-secondary hover:border-danger hover:text-danger",
  ghost: "border-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
  secondary: "border-border text-text-secondary hover:border-primary hover:text-primary",
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
        "grid h-9 w-9 place-items-center rounded-lg border bg-surface transition focus:outline-none focus:ring-4 focus:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-50",
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
