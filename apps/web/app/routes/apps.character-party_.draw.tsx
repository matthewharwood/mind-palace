import { CHARACTER_PARTY_SESSION_DEFAULT } from "@mind-palace/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { DrawCharacterRound } from "~/components/draw-character-round";
import {
  advanceCharacterPartySession,
  CHARACTER_LIBRARY,
  configureCharacterPartySession,
  endCharacterPartySession,
  findCharacter,
  revealCurrentCharacter,
  skipCurrentCharacter,
  startCharacterPartySession,
  startCharacterRoundTimer,
} from "~/lib/character-party";
import { hasCharacterReference, loadCharacterReference } from "~/lib/character-reference";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { useHydrated } from "~/lib/use-hydrated";
import { characterPartySessionAtom } from "~/state/atoms";

const HOME_URL = `${import.meta.env.BASE_URL}apps/character-party`;
const DRAWING_CHARACTERS = CHARACTER_LIBRARY.filter(hasCharacterReference);

export const Route = createFileRoute("/apps/character-party_/draw")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/character-party/draw",
      title: "Draw the Character",
      description:
        "A mobile-first family drawing game with giant character prompts, optional timers, skips, and reference-image reveals.",
    }),
    links: buildSeoLinks({ path: "/apps/character-party/draw" }),
  }),
  component: DrawCharacterRoute,
});

function DrawCharacterRoute() {
  const [persistedSession, setSession] = useAtom(characterPartySessionAtom);
  const hydrated = useHydrated();
  const session = hydrated ? persistedSession : CHARACTER_PARTY_SESSION_DEFAULT;
  const character = findCharacter(DRAWING_CHARACTERS, session.currentCharacterId);

  return (
    <DrawCharacterRound
      session={session}
      character={character}
      characterCount={DRAWING_CHARACTERS.length}
      homeHref={HOME_URL}
      loadReference={loadCharacterReference}
      onConfigure={(options) =>
        setSession((current) => configureCharacterPartySession(current, options))
      }
      onStart={() =>
        setSession((current) => startCharacterPartySession(current, DRAWING_CHARACTERS, Date.now()))
      }
      onReveal={() => setSession((current) => revealCurrentCharacter(current, Date.now()))}
      onSkip={() => setSession((current) => skipCurrentCharacter(current, DRAWING_CHARACTERS))}
      onNext={() =>
        setSession((current) => advanceCharacterPartySession(current, DRAWING_CHARACTERS))
      }
      onStartTimer={() => setSession((current) => startCharacterRoundTimer(current, Date.now()))}
      onEnd={() => setSession((current) => endCharacterPartySession(current))}
    />
  );
}
