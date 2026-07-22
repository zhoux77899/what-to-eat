import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { ButtonSkin, type ButtonSkinTone } from "@/components/ui/button-skin";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "app-button-surface home-paper-button inline-flex items-center justify-center gap-2 font-semibold transition-[filter,opacity,translate] duration-150 focus-visible:outline-none disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "app-button-tone-primary",
        secondary: "app-button-tone-secondary",
        danger: "app-button-tone-danger",
        ghost: "app-button-ghost"
      },
      size: {
        compact: "app-button-size-compact",
        default: "app-button-size-default",
        hero: "app-button-size-hero",
        provider: "app-button-size-provider"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", asChild = false, children, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    const skinTone = variant === "ghost" ? null : (variant as ButtonSkinTone);

    return (
      <Component
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {skinTone ? <ButtonSkin tone={skinTone} /> : null}
        <Slottable>{children}</Slottable>
      </Component>
    );
  }
);

Button.displayName = "Button";
