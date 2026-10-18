import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AvaLearning } from "~/components/ava-learning";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { getAvaLearningSessionAtom } from "~/state/atoms";

const sessionAtom = getAvaLearningSessionAtom("ava-positions");
export const Route = createFileRoute("/apps/ava-positions")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-positions",
      title: "Ava’s Where Is It?",
      description: "Explore twelve location words by moving around real three-dimensional scenes.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-positions" }),
  }),
  component: LearningRoute,
});
function LearningRoute() {
  const [session, setSession] = useAtom(sessionAtom);
  return <AvaLearning session={session} onSessionChange={setSession} />;
}
