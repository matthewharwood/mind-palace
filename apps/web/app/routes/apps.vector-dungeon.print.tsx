import { createFileRoute } from "@tanstack/react-router";

import { VectorDungeonGuide } from "~/components/vector-dungeon-guide";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

export const Route = createFileRoute("/apps/vector-dungeon/print")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps/vector-dungeon/print",
      title: "Dean's Vector Dungeon Printable",
      description: "Printable coordinate-grid guide for the Vector Dungeon adventure.",
    }),
    links: buildSeoLinks({ path: "/apps/vector-dungeon/print" }),
  }),
  component: VectorDungeonPrint,
});

function VectorDungeonPrint() {
  return <VectorDungeonGuide title="Dean's Vector Dungeon" />;
}
