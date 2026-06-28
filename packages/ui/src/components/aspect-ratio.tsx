import { AspectRatio as AspectRatioPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

// AspectRatio — Radix aspect-ratio box (constrains children to a ratio).
export function AspectRatio(props: ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root {...props} />;
}
