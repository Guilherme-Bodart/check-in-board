import type { ReactNode, TableHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function DataTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableStateRow({
  children,
  colSpan,
}: {
  children: ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td className="px-4 py-5 text-text-secondary" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
