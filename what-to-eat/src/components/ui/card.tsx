import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border bg-card p-5 text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}
