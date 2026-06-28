import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

// Skeleton — a pulsing placeholder block for loading states.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
