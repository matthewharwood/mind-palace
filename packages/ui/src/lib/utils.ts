import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// `cn` — merge conditional class lists and resolve Tailwind conflicts (the last
// utility in a conflicting group wins). The shadcn convention, kept here so the
// package is self-contained + portable.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
