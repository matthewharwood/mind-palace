# Ava's generated 2D illustrations

All nine Ava apps use individually generated raster illustrations for their 2D teaching scenes. The shared `AvaIllustration` component resolves semantic scene IDs to self-hosted WebP files under `apps/web/public/ava-studio/illustrations/`. It uses the Vite base URL, so project GitHub Pages deployments resolve the same assets as local development.

## Art direction and coverage

The existing Action Words cover supplies the style reference: warm ivory backgrounds, soft lighting, tactile materials, friendly natural features, and orange and teal clothing. Ava has chestnut bobbed hair, an orange shirt, teal overalls, and cream shoes. These are fictional illustrated characters.

The collection contains 357 distinct illustrations:

| Content | Images |
| --- | ---: |
| Actions and subject combinations | 66 |
| Wants and needs | 20 |
| Opposites | 20 |
| Positions | 12 |
| Additional phrase objects | 5 |
| First words with unique scenes | 83 |
| Shapes and colors | 40 |
| Numbers 0–10, three representations each | 33 |
| Letters A–Z, three representations each | 78 |

Seventeen First Words cards reuse the corresponding action or needs illustration. This gives the same learned concept the same visual across collections. The mapping lives in `apps/web/app/data/ava-illustration-aliases.json`.

Actions include directional arrows, short motion strokes, and concise cues such as “Boing!”, “Munch!”, or “Whoosh!” where helpful. Requests use simple gestures and speech bubbles. Spatial scenes keep the object's relationship to a box or table visible. Shape cards preserve a clean silhouette and the requested color. Number cards distinguish the numeral, an exactly countable ten-frame, and the written number word. Letter cards distinguish uppercase, lowercase, and a familiar picture word.

## Generation and provenance

Each image was authored with a separate call to OpenAI's built-in `image_gen` tool. Most use the cover only as a style reference. A few corrected counting, lettering, and animal cards use written art direction or an existing illustration as their reference; these overrides are recorded per asset. These are independent images rather than crops from generated contact sheets. No generation service or credential is required by the application or its build.

- `apps/web/scripts/ava-illustrations/prompts.json` records the full prompt set and style brief. The first approved Jump style test has a normalized brief, marked explicitly in the file.
- `apps/web/scripts/ava-illustrations/generated.jsonl` records each output's semantic ID, final path, generation prompt, provider, original local PNG path, and final WebP SHA-256. A later record for an ID replaces an earlier rejected variant.
- `apps/web/scripts/ava-illustrations/jump-reference.png` preserves the first approved action illustration.

Native PNG originals stay in Codex's generated-images directory. Final application assets are saved in the repository as WebP at quality 90. Conversion only changes the delivery format; it does not draw, composite, or alter the illustration's contents. To revise an asset, generate a replacement with the recorded brief, inspect its teaching accuracy, convert it, and append its provenance record.

## Media and verification contract

The 2D renderer and hub thumbnails use the generated illustrations. Existing 3D geometry, scene interactions, narration, video playback, and video posters keep their established implementations. `preserved-media.json` records the original hashes of all 300 GLB models, 300 scene videos, and 37 stable number/letter videos. Unit tests verify that those 637 files remain byte-for-byte unchanged and that every required 2D image has valid WebP bytes and matching provenance.

The user selected application workflows with role selectors, fresh real IndexedDB, reduced motion, image loading, and mode checks. `apps/web/tests/ava-illustrations.app.spec.ts` checks generated artwork in every app, all 111 number/letter representations, saved 2D mode after reload, illustrated subject combinations, the existing interactive 3D path, and local video playback. The existing graph tests are unchanged.

Storybook's `Ava/Illustration` stories show an action, a request, a position, counting, a picture letter, and a shape before route composition. These share the same renderer as the applications.

Visual review covered all 357 images in labeled sheets and the revised assets at full size. It corrected a nine-apple “Ten” image, ambiguous hand counts for “Two” and “Five,” and lowercase “l” forms that resembled “1.” Final ten-frames have 0–10 counters, the corrected groups show exactly two puppies, five apples, and ten apples, and the lowercase “l” uses a plain upright stroke. Spatial cards were checked for occlusion, contact, and visible gaps; shape cards were checked for silhouette and color.

The complete `bun run check` gate passes: lint, formatting, types, Sonar, unit tests, prerender, 71 browser tests, React Doctor, and Fallow. The one existing offline smoke test remains skipped while PWA integration is disabled. A separate React Doctor scan including untracked artwork components found no issues. The 637 preserved-media hashes all match.

The gate exposed oversized bundles in the existing application. Shiki now imports only the same six supported grammars and two themes, and curricula have their own chunks instead of being pulled into the shared router bundle. The router bundle drops from about 1,043 kB to 197 kB. The documented chunk budget is 700 kB for the unchanged optional Three.js WebGPU module (about 673 kB); the build is warning-free.
