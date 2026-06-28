import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils";
import { buttonVariants } from "./button-variants";

// Button — shadcn-compatible variants/sizes (see ./button-variants). `asChild`
// renders the child as the button (Radix Slot) so a <Link> can be styled as one.
export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child as the button (merges props onto it). */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
