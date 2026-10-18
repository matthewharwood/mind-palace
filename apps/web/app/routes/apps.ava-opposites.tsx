import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AvaLearning } from "~/components/ava-learning";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { getAvaLearningSessionAtom } from "~/state/atoms";

const sessionAtom = getAvaLearningSessionAtom("ava-opposites");
export const Route = createFileRoute("/apps/ava-opposites")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-opposites",
      title: "Ava’s Opposites & Descriptions",
      description:
        "Explore ten pairs of contrasting descriptions in real three-dimensional scenes.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-opposites" }),
  }),
  component: LearningRoute,
});
function LearningRoute() {
  const [session, setSession] = useAtom(sessionAtom);
  return <AvaLearning session={session} onSessionChange={setSession} />;
}
