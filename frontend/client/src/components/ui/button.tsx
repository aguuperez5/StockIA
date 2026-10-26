import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-brand-ink border border-transparent shadow-xs hover:bg-brand-hover hover:shadow-card active:bg-brand-active",
        primary:
          "bg-brand text-brand-ink border border-transparent shadow-xs hover:bg-brand-hover hover:shadow-card active:bg-brand-active",
        destructive:
          "bg-status-critical text-status-critical-ink border border-transparent shadow-xs hover:opacity-90 active:opacity-95 focus-visible:ring-status-critical/40",
        outline:
          "border border-line bg-surface text-ink shadow-xs hover:bg-surface-hover hover:border-line-strong",
        secondary:
          "border border-line bg-surface text-ink shadow-xs hover:bg-surface-hover hover:border-line-strong active:bg-surface-sunken",
        ghost:
          "text-muted-ink hover:text-ink hover:bg-surface-hover active:bg-surface-sunken",
        link:
          "text-brand-text underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 text-xs sm:text-sm",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4 text-sm",
        icon: "size-9 rounded-lg",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
