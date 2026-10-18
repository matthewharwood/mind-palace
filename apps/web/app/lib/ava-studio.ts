import { AvaLearningSubjectSchema } from "@mind-palace/schemas";
import * as z from "zod";
export const AvaStudioSceneSpecSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  action: z.string().min(1),
  subject: AvaLearningSubjectSchema,
  label: z.string().min(1),
});
export type AvaStudioSceneSpec = z.infer<typeof AvaStudioSceneSpecSchema>;
export const AvaStudioManifestSchema = z.array(AvaStudioSceneSpecSchema);
