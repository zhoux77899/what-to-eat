import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[8px] border-2 border-border bg-card p-5 text-card-foreground shadow-[4px_4px_0_var(--color-outline)]",
        className
      )}
      {...props}
    />
  );
}
