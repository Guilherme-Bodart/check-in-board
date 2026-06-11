import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Toolbar({
  actions,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>
      {actions ? <div className="flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
    </div>
  );
}
