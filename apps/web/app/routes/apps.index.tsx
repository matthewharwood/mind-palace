import { createFileRoute } from "@tanstack/react-router";

import { AppHub } from "~/components/app-hub";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

const BASE_URL = import.meta.env.BASE_URL;

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps",
      title: "Learning Apps",
      description: "Parent-run local learning apps for study, play, and practice.",
    }),
    links: buildSeoLinks({ path: "/apps" }),
  }),
  component: AppsIndex,
});

function AppsIndex() {
  return (
    <AppHub
      title="Learning Apps"
      description="Small parent-run learning tools that stay static, local-first, and ready for a phone or tablet."
      items={[
        {
          title: "Ava's Shape Sounds",
          description:
            "Teacher-led shape and color flashcards with spaced repetition and a musical cue for every combination.",
          href: `${BASE_URL}apps/ava-shapes`,
          kind: "study",
          cta: "Practice shapes",
        },
        {
          title: "Vector Dungeon",
          description:
            "Teach one-step coordinate vectors with a fantasy grid, a d20, and a printable map.",
          href: `${BASE_URL}apps/vector-dungeon`,
          kind: "dm",
          cta: "Run the adventure",
        },
      ]}
    />
  );
}
