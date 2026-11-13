import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground shadow-2xs hover:bg-[#0043CE] hover:border-[#0043CE] hover:shadow-sm",
        secondary:
          "border-border bg-surface text-text-primary shadow-2xs hover:border-primary/60 hover:bg-primary-soft/35 hover:text-primary",
        outline:
          "border-border bg-transparent text-text-secondary hover:border-primary/60 hover:bg-surface hover:text-primary",
        ghost:
          "border-transparent bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary",
        danger:
          "border-danger bg-danger text-white shadow-2xs hover:bg-[#B81922] hover:border-[#B81922] hover:shadow-sm",
        subtle:
          "border-transparent bg-primary-soft/70 text-primary hover:bg-primary-soft",
      },
      size: {
        xs: "h-8 rounded-lg px-2.5 text-xs",
        sm: "h-9 rounded-lg px-3 text-xs",
        md: "min-h-10 px-4 py-2 text-sm",
        lg: "min-h-11 px-5 py-2.5 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  asChild = false,
  children,
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    >
      {children}
    </Comp>
  );
}
