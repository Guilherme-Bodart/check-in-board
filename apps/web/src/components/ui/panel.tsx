import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Panel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm", className)}
      {...props}
    >
      {children}
    </section>
  );
}
