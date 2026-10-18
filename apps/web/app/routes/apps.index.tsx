import { createFileRoute } from "@tanstack/react-router";

import { AvaWorld } from "~/components/ava-world";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/apps",
      title: "Kid apps",
      description:
        "Ava’s little world: shapes, words, numbers, letters, and growing conversations.",
    }),
    links: buildSeoLinks({ path: "/apps" }),
  }),
  component: AvaWorld,
});
