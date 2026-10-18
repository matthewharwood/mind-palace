import { AvaMediaModeSchema } from "@mind-palace/schemas";
import type { ReactNode } from "react";
import * as z from "zod";

export type AvaMediaMode = z.infer<typeof AvaMediaModeSchema>;

export const AvaMediaPropsSchema = z.object({
  label: z.string().trim().min(1),
  mode: AvaMediaModeSchema,
  onModeChange: z.custom<(mode: AvaMediaMode) => void>(),
  twoDContent: z.custom<ReactNode>(),
  threeDContent: z.custom<ReactNode>(),
  videoSrc: z.string().min(1).optional(),
  videoPoster: z.string().min(1).optional(),
  videoFallback: z.custom<ReactNode>().optional(),
});

export type AvaMediaProps = z.infer<typeof AvaMediaPropsSchema>;
