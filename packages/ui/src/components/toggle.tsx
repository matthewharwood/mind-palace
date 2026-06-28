import type { VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils";
import { toggleVariants } from "./toggle-variants";

// Toggle — a two-state pressable (Radix), variants in ./toggle-variants.
export type ToggleProps = ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;

export function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <TogglePrimitive.Root className={cn(toggleVariants({ variant, size, className }))} {...props} />
  );
}
