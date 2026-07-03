import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] border-2 border-border px-4 text-sm font-semibold shadow-[2px_2px_0_var(--color-outline)] transition-[background-color,color,box-shadow,translate] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-card text-foreground hover:bg-secondary",
        ghost: "bg-transparent shadow-none hover:bg-muted"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component className={cn(buttonVariants({ variant, className }))} ref={ref} {...props} />
    );
  }
);

Button.displayName = "Button";
