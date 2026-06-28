// oxlint-disable react-doctor/tanstack-start-missing-head-content -- The
// `<HeadContent />` element lives in <RootShell /> in ~/lib/root-shell.tsx
// (extracted to keep `only-export-components` green). react-doctor's static
// analyzer only inspects the route file itself, so it can't follow the
// component into the shell. The route-level `head()` callback IS wired and
// is verified end-to-end by `tests/seo.app.spec.ts`, which asserts on real
// rendered meta tags after build/prerender.
import { createRootRoute } from "@tanstack/react-router";
import { RootShell } from "~/lib/root-shell";
import { NotFound, RouteError } from "~/lib/route-boundaries";
import { buildJsonLd, buildSeoMeta } from "~/lib/seo";
import ppOldRegular from "~/styles/fonts/PPEditorialOld-Regular.woff2?url";
import ppSansMedium from "~/styles/fonts/PPEditorialSans-Medium.woff2?url";
// Global CSS as an explicit `?url` stylesheet link (the TanStack Start pattern):
// it lands in the prerendered <head> as a render-blocking <link> AND is a real
// blocking stylesheet in dev — eliminating the flash of unstyled content that a
// bare side-effect import (injected via JS) produces. The two brand fonts used
// at first paint are preloaded so they're ready before paint (no font swap).
import appCss from "~/styles/index.css?url";

// This file is route config only — components live in ~/lib/root-shell and
// ~/lib/route-boundaries. react-doctor's `only-export-components` rule treats
// any mix of component + non-component exports (or any local component
// alongside a non-component export) as a fast-refresh boundary bug, so this
// file's single export stays the `Route` definition.

export const Route = createRootRoute({
  head: () => ({
    // Defaults for every route. Children override per-tag (title, description,
    // og:*, twitter:*) by returning their own buildSeoMeta({ path, title, ... })
    // — TanStack Router deep-merges head entries by key.
    //
    // Canonical link is intentionally NOT emitted here: link entries with the
    // same `rel` do not deduplicate, so emitting it at the root would produce
    // two <link rel="canonical"> on every leaf page. Each route owns its own
    // canonical via buildSeoLinks({ path }).
    meta: buildSeoMeta({ path: "/" }),
    links: [
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: ppOldRegular,
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: ppSansMedium,
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      // Inline data-URI favicon — silences the browser's auto `/favicon.ico`
      // request without needing a public/ asset.
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%231f1f3f'/%3E%3C/svg%3E",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildJsonLd()),
      },
    ],
  }),
  component: RootShell,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});
