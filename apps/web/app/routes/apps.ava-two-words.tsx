import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AvaLearning } from "~/components/ava-learning";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { getAvaLearningSessionAtom } from "~/state/atoms";

const sessionAtom = getAvaLearningSessionAtom("ava-two-words");
export const Route = createFileRoute("/apps/ava-two-words")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/ava-two-words",
      title: "Ava’s Two Words Together",
      description: "Combine familiar people, actions, and descriptions into twenty little phrases.",
    }),
    links: buildSeoLinks({ path: "/apps/ava-two-words" }),
  }),
  component: LearningRoute,
});
function LearningRoute() {
  const [session, setSession] = useAtom(sessionAtom);
  return <AvaLearning session={session} onSessionChange={setSession} />;
}
