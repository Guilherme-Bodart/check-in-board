import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";

const variantClasses: Record<ButtonVariant, string> = {
  danger:
    "border-danger bg-danger text-white hover:brightness-95 focus:ring-danger-soft",
  ghost:
    "border-transparent bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary focus:ring-primary-soft",
  primary:
    "border-primary bg-primary text-primary-foreground hover:brightness-95 focus:ring-primary-soft",
  secondary:
    "border-border bg-surface text-text-primary hover:border-primary hover:text-primary focus:ring-primary-soft",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
