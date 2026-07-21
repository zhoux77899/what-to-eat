import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-[filter,opacity,translate] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        ghost: ""
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
