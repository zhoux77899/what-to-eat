import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "min-h-11 w-full rounded-[7px] border-2 border-input bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);

Input.displayName = "Input";
