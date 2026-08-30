import { AvaMediaModeSchema } from "@mind-palace/schemas";
import type { ReactNode } from "react";
import * as z from "zod";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type AvaMediaMode = z.infer<typeof AvaMediaModeSchema>;

export const AvaMediaPropsSchema = z.object({
  label: z.string().trim().min(1),
  mode: AvaMediaModeSchema,
  onModeChange: z.custom<(mode: AvaMediaMode) => void>(),
  twoDContent: z.custom<ReactNode>(),
  threeDContent: z.custom<ReactNode>(),
  youtubeVideoId: z.string().regex(YOUTUBE_VIDEO_ID_PATTERN).nullish(),
  youtubeStartSeconds: z.int().min(0).optional(),
  youtubeSourceLabel: z.string().trim().min(1).optional(),
  videoFallback: z.custom<ReactNode>().optional(),
});

export type AvaMediaProps = z.infer<typeof AvaMediaPropsSchema>;

export { AvaMediaModeSchema };
