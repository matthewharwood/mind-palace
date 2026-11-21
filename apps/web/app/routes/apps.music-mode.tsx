import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { MusicModeStudio } from "~/components/music-mode/music-mode-studio";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { musicModeSessionAtom } from "~/state/atoms";

export const Route = createFileRoute("/apps/music-mode")({
  ssr: false,
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/music-mode",
      title: "Music Mode — 30-Day Chopin Sight-Reading & Ear Training Studio",
      description:
        "A 30-day, 120-hour Ultralearning piano studio combining FSRS spaced repetition, look-ahead sight-reading, tactile blind keyboard training, and concert grand Web Audio synthesis.",
    }),
    links: buildSeoLinks({ path: "/apps/music-mode" }),
  }),
  component: MusicModeRoute,
});

function MusicModeRoute() {
  const [state, setState] = useAtom(musicModeSessionAtom);
  return <MusicModeStudio state={state} onUpdateState={setState} />;
}
