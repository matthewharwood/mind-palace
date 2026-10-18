import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AvaLearning } from "~/components/ava-learning";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { getAvaLearningSessionAtom } from "~/state/atoms";

const sessionAtom = getAvaLearningSessionAtom("ava-actions");
export const Route = createFileRoute("/apps/ava-actions")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-actions",
      title: "Ava’s Action Words",
      description:
        "Discover twenty everyday actions, recognize movements, and combine words with familiar people.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-actions" }),
  }),
  component: LearningRoute,
});
function LearningRoute() {
  const [session, setSession] = useAtom(sessionAtom);
  return <AvaLearning session={session} onSessionChange={setSession} />;
}
