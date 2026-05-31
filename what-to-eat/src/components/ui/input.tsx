import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);

Input.displayName = "Input";
