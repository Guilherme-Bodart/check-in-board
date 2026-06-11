import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";

export function EmptyState({
  actionHref,
  actionLabel,
  children,
  className,
  description,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center",
        className,
      )}
    >
      <div className="grid max-w-md justify-items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary-soft"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
