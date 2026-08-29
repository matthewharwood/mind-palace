import {
  AVA_FIRST_WORDS_SESSION_DEFAULT,
  AvaFirstWordsSessionSchema,
  type AvaMediaMode,
} from "@mind-palace/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { AvaFirstWords } from "~/components/ava-first-words";
import { nextAvaFirstWordDueAt, rateAvaFirstWordCard } from "~/lib/ava-first-words";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { avaFirstWordsSessionAtom } from "~/state/atoms";

export const Route = createFileRoute("/apps/ava-first-words")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-first-words",
      title: "Ava's First 100 Words",
      description:
        "A teacher-led first-words game with generated picture cards, lit 3D views, short video reinforcement, and spaced repetition.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-first-words" }),
  }),
  component: AvaFirstWordsRoute,
});

function AvaFirstWordsRoute() {
  const [session, setSession] = useAtom(avaFirstWordsSessionAtom);
  const [now, setNow] = useState(() => Date.now());
  const nextDueAt = nextAvaFirstWordDueAt(session);

  useEffect(() => {
    if (nextDueAt === undefined || nextDueAt <= now) return;
    const delay = Math.min(nextDueAt - Date.now(), 2_147_483_647);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [nextDueAt, now]);

  function changeMode(viewMode: AvaMediaMode): void {
    setSession((previous) => AvaFirstWordsSessionSchema.parse({ ...previous, viewMode }));
  }

  return (
    <AvaFirstWords
      session={session}
      now={now}
      onModeChange={changeMode}
      onRate={(cardId, rating) => {
        const reviewedAt = Date.now();
        const next = rateAvaFirstWordCard(session, cardId, rating, reviewedAt);
        setSession(next);
        setNow(reviewedAt);
        return next;
      }}
      onReset={() => {
        setSession(AVA_FIRST_WORDS_SESSION_DEFAULT);
        setNow(Date.now());
      }}
    />
  );
}
