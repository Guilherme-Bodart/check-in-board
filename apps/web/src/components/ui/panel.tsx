import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Panel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      className={cn("min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm", className)}
      {...props}
    >
      {children}
    </section>
  );
}
