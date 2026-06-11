import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  actionHref,
  actionIcon: ActionIcon,
  actionLabel,
  description,
  eyebrow,
  title,
}: {
  actionHref?: string;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary-soft"
          href={actionHref}
        >
          {ActionIcon ? <ActionIcon aria-hidden className="h-4 w-4" /> : null}
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}
