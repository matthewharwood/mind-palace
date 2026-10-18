import { AvaSymbolRepresentationSchema } from "@mind-palace/schemas";
import type { ReactNode } from "react";
import * as z from "zod";

import { AvaScene } from "~/components/ava-scene";
import { AvaSymbolCardSchema, buildAvaSymbolImage, getAvaSymbolLabel } from "~/lib/ava-symbols";
import { defineComponent } from "~/lib/define-component";

const AvaSymbolPicturePropsSchema = z.object({
  card: AvaSymbolCardSchema,
  representation: AvaSymbolRepresentationSchema,
  mode: z.enum(["2d", "3d"]),
});

export const AvaSymbolPicture = defineComponent(
  AvaSymbolPicturePropsSchema,
  ({ card, representation, mode }): ReactNode => {
    const imageUrl = buildAvaSymbolImage(card, representation);
    const label = getAvaSymbolLabel(card);
    if (mode === "3d")
      return (
        <AvaScene
          sceneId={`${card.kind}-${card.id}`}
          label={label}
          variant={representation}
          ariaLabel={`${label} shown as a lit 3D card`}
        />
      );
    return (
      <div className="relative grid size-full min-h-0 place-items-center overflow-hidden bg-[#fffaf0]">
        <img
          src={imageUrl}
          alt={`${label}: ${representation} representation`}
          className="absolute inset-0 size-full object-contain"
        />
      </div>
    );
  },
);
