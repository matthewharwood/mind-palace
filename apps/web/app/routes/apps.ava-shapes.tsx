import {
  AVA_SHAPES_SESSION_DEFAULT,
  type AvaMediaMode,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { AvaShapes } from "~/components/ava-shapes";
import { nextAvaShapeDueAt, rateAvaShapeCard } from "~/lib/ava-shapes";
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
  const nextDueAt = nextAvaShapeDueAt(session);

  useEffect(() => {
    if (nextDueAt === undefined || nextDueAt <= now) return;
    const delay = Math.min(nextDueAt - Date.now(), 2_147_483_647);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [nextDueAt, now]);

  function changeMode(viewMode: AvaMediaMode): void {
    setSession((previous) => AvaShapesSessionSchema.parse({ ...previous, viewMode }));
  }

  return (
    <AvaShapes
      session={session}
      now={now}
      onModeChange={changeMode}
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
