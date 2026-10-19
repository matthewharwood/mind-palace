import { AvaSymbolRepresentationSchema } from "@mind-palace/schemas";
import type { ReactNode } from "react";
import * as z from "zod";
import { avaIllustrationId, avaIllustrationPath } from "~/lib/ava-illustrations";
import { defineComponent } from "~/lib/define-component";

const AvaIllustrationPropsSchema = z.object({
  sceneId: z.string().regex(/^[a-z0-9-]+$/),
  representation: AvaSymbolRepresentationSchema.optional(),
  label: z.string(),
});

export const AvaIllustration = defineComponent(
  AvaIllustrationPropsSchema,
  ({ sceneId, representation = "symbol", label }): ReactNode => (
    <img
      src={`${import.meta.env.BASE_URL}${avaIllustrationPath(sceneId, representation)}`}
      alt={label}
      data-ava-illustration={avaIllustrationId(sceneId, representation)}
      decoding="async"
      draggable={false}
      className="size-full min-h-0 object-contain"
    />
  ),
);
