import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AvaLearning } from "~/components/ava-learning";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { getAvaLearningSessionAtom } from "~/state/atoms";

const sessionAtom = getAvaLearningSessionAtom("ava-needs");
export const Route = createFileRoute("/apps/ava-needs")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-needs",
      title: "Ava’s My Wants & Needs",
      description:
        "Practice useful words for asking, choosing, stopping, and telling someone how you feel.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-needs" }),
  }),
  component: LearningRoute,
});
function LearningRoute() {
  const [session, setSession] = useAtom(sessionAtom);
  return <AvaLearning session={session} onSessionChange={setSession} />;
}
