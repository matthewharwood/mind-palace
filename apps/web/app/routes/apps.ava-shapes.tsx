import { AVA_SHAPES_SESSION_DEFAULT } from "@mind-palace/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useState } from "react";

import { AvaShapes } from "~/components/ava-shapes";
import { rateAvaShapeCard } from "~/lib/ava-shapes";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { avaShapesSessionAtom } from "~/state/atoms";

export const Route = createFileRoute("/apps/ava-shapes")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-shapes",
      title: "Ava's Shape Sounds",
      description:
        "A teacher-led, mobile-first shape and color flashcard app with spaced repetition and musical cues.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-shapes" }),
  }),
  component: AvaShapesRoute,
});

function AvaShapesRoute() {
  const [session, setSession] = useAtom(avaShapesSessionAtom);
  const [now, setNow] = useState(() => Date.now());

  return (
    <AvaShapes
      session={session}
      now={now}
      onRate={(cardId, rating) => {
        const reviewedAt = Date.now();
        const next = rateAvaShapeCard(session, cardId, rating, reviewedAt);
        setSession(next);
        setNow(reviewedAt);
        return next;
      }}
      onReset={() => {
        setSession(AVA_SHAPES_SESSION_DEFAULT);
        setNow(Date.now());
      }}
    />
  );
}
