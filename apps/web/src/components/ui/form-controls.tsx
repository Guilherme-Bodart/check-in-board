"use client";

import * as React from "react";
import type {
  ChangeEvent,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../../lib/utils";
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const EMPTY_SELECT_SENTINEL = "__CIB_EMPTY_OPTION__";

const controlClasses =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary shadow-2xs outline-none transition-all duration-150 placeholder:text-text-muted hover:border-primary/50 focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10", controlClasses, className)} {...props} />;
}

interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function extractSelectOptions(children: ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.type === React.Fragment) {
      const fragmentProps = child.props as { children?: ReactNode };
      options.push(...extractSelectOptions(fragmentProps.children));
      return;
    }

    if (child.type === "option") {
      const optionProps = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };
      const rawValue =
        optionProps.value !== undefined
          ? String(optionProps.value)
          : typeof optionProps.children === "string"
            ? optionProps.children
            : "";

      options.push({
        value: rawValue === "" ? EMPTY_SELECT_SENTINEL : rawValue,
        label: optionProps.children,
        disabled: optionProps.disabled,
      });
    }
  });

  return options;
}

export function Select({
  "aria-label": ariaLabel,
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onChange,
  onValueChange,
  placeholder,
  value,
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  onValueChange?: (value: string) => void;
  placeholder?: string;
}) {
  const options = React.useMemo(() => extractSelectOptions(children), [children]);

  const normalizedValue =
    value !== undefined
      ? String(value) === ""
        ? EMPTY_SELECT_SENTINEL
        : String(value)
      : undefined;

  const normalizedDefaultValue =
    defaultValue !== undefined
      ? String(defaultValue) === ""
        ? EMPTY_SELECT_SENTINEL
        : String(defaultValue)
      : undefined;

  function handleValueChange(nextInternalValue: string) {
    const resolvedValue =
      nextInternalValue === EMPTY_SELECT_SENTINEL ? "" : nextInternalValue;

    onValueChange?.(resolvedValue);

    if (onChange) {
      const syntheticEvent = {
        target: { value: resolvedValue, name: name ?? "" },
        currentTarget: { value: resolvedValue, name: name ?? "" },
      } as ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  }

  return (
    <RadixSelect
      defaultValue={normalizedDefaultValue}
      disabled={disabled}
      name={name}
      onValueChange={handleValueChange}
      value={normalizedValue}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("h-10 text-sm font-medium", className)}
        id={id}
      >
        <SelectValue placeholder={placeholder ?? "Selecione..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem
            disabled={opt.disabled}
            key={opt.value}
            value={opt.value}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </RadixSelect>
  );
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
