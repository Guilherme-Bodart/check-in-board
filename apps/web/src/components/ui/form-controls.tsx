import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../../lib/utils";

const controlClasses =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11", controlClasses, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-11", controlClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 resize-none py-3", controlClasses, className)}
      {...props}
    />
  );
}

export function Field({
  children,
  className,
  error,
  hint,
  label,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-text-secondary", className)} {...props}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-text-muted">{hint}</span> : null}
      {error ? <span className="text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}
