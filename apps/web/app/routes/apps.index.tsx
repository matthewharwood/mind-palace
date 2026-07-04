import { createFileRoute } from "@tanstack/react-router";

import { AppHub } from "~/components/app-hub";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

const BASE_URL = import.meta.env.BASE_URL;

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps",
      title: "Dungeon Master Apps",
      description: "Parent-run companion apps for printable learning adventures.",
    }),
    links: buildSeoLinks({ path: "/apps" }),
  }),
  component: AppsIndex,
});

function AppsIndex() {
  return (
    <AppHub
      title="Dungeon Master Apps"
      description="Small parent-run tools that sit beside the learning paths. They stay static, local-first, and printable."
      items={[
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
