# Ava learning studio

The Kid apps hub at `/apps` collects nine Ava apps. Five new collections extend the four foundations:

| Collection | Starting content | Route |
| --- | --- | --- |
| Action Words | 20 actions; a starter toward 100 | `/apps/ava-actions` |
| My Wants & Needs | 20 useful requests, choices, and feelings | `/apps/ava-needs` |
| Opposites & Descriptions | 10 pairs, 20 cards | `/apps/ava-opposites` |
| Where Is It? | 12 spatial words | `/apps/ava-positions` |
| Two Words Together | 20 phrases | `/apps/ava-two-words` |

Discover introduces a word, Recognize offers two scenes and gentle retry feedback, and Connect combines words. Sets contain five cards (the final positions set has two). Actions can use three human subjects plus a dog for six suitable actions: 66 subject/action combinations reuse the same action vocabulary. The illustrated Ava and family are fictional toy characters, not likenesses made from family photographs.

The sequence is a product organization, not an age-based assessment or treatment protocol. [Hanen's combining-words guidance](https://www.hanen.org/information-tips/combining-words-together) supports a varied vocabulary and combinations; [ASHA's communication milestones](https://www.asha.org/public/developmental-milestones/communication-milestones-2-to-3-years/) provide broader developmental context. Grown-up prompts encourage acting, gestures, pausing, and following Ava's interest.

## Media with a teaching purpose

- **2D:** a stable, uncluttered illustration. The original 100-word images and number/letter diagrams remain; new collections use authored Blender stills.
- **3D:** actual geometry, with drag and keyboard-accessible turn buttons. Articulated people act, a ball occupies a real location relative to a box/table, numbers have individually countable beads, and letters are extruded solids with modeled example objects. No picture cards, texture-mapped illustrations, or camera-facing image planes.
- **Video:** two-second H.264 demonstrations rendered from the same geometry. Actions move; static objects turn to reveal volume; counting beads appear sequentially. Videos start from an explicit play button. Recognize provides two silent loops and a replay control; reduced motion keeps these paused until requested.
- **Speech:** 435 deduplicated ElevenLabs clips, including words, questions, and combinations. Local MP3 files use Sarah (`EXAVITQu4vr4xnSDxMaL`), multilingual v2, speed 0.85, stability/similarity 0.75. On-device speech is a recovery path for an unavailable clip or an unlisted label. No credentials or generation API calls ship to the browser.

All nine Ava apps share the local media switcher. The obsolete YouTube catalog and textured 3D card implementation were removed. The ordinary app build copies checked-in assets; it does not contact a media generation service.

## Sources and reproduction

`apps/web/scripts/ava-studio/build_scenes.py` is the complete original procedural Blender source. `manifest.json` enumerates 300 semantic scenes: action combinations, needs, contrasting descriptions, positions, phrase-specific objects, 100 first-word objects, 11 numbers, 26 letters, and 40 shape/color combinations. Editable `.blend` examples are in `scripts/ava-studio/sources/` for jumping, asking for help, size contrast, under, and a running dog.

Run `bun run build:ava-media` with Blender 5.1+, ffmpeg, and Playwright Chromium installed. `AVA_BLENDER_BIN` selects a different Blender executable; the default checks PATH, then the macOS application path. The task exports GLB geometry and JPEG posters, renders the video frames with the same Three.js viewer used by the app, encodes H.264, and updates the stable Numbers/Letters video URLs. `bun run build:ava-symbol-media` delegates to the same pipeline, so it cannot silently restore the old SVG slideshows.

`prepare-audio.ts` prepares the utterance list; `narration.json` records the generated text, asset path, and provider settings. Generation runs through the ElevenLabs authoring tool; it is separate from builds and requires explicit authorization. `app/data/ava-speech.json` is the normalized lookup shipped with the app. Audio was generated as individual utterances, not split at guessed timestamps.

The original generated cover is `public/ava-studio/artwork/action-cover.png`; the hub uses its 960px JPEG. Reproduction prompt: Create a warm, premium children's learning illustration of a joyful fictional toddler jumping in the air, chestnut bob hair, orange T-shirt, teal overalls, cream sneakers, soft ivory background, gentle ground shadow, rich tactile detail and a clear full-body silhouette. Single character, no text, no logos. The cover was made with the built-in image-generation tool; no supplied reference photos were used. Blender models are independently authored geometry with a coordinated palette.

## State and verification

DB v10 adds `avaLearningSessions` without changing existing collection records. Root hydration loads the store once. The memoized `atomWithIDB` instances validate writes, debounce persistence, and broadcast changes. Each collection retains selected card/set, learning and media modes, subject, sound setting, explored words, and recognition attempts/correct answers. Transient feedback, focus, media playback, and renderer resources stay outside persistent state.

Unit tests verify set boundaries (including the last two position cards), balanced recognition choices, progress isolation, invalid saved records, supported combinations, complete media coverage, countable geometry, action animations, and recorded narration. Chrome review covers navigation, wrong/correct recognition feedback, subject changes, and state after reload, with portrait tablet and phone layout checks.

The user selected app workflows only and explicitly requested that existing graph tests remain unchanged. Eleven new workflows in `apps/web/tests/ava-learning.app.spec.ts` exercise all five collections, recognition retries and correct answers, real modeled subject changes, recorded narration, local video playback, all twelve positions, saved state after reload, progress isolation, phone layout, and the media upgrades in Shape Sounds and First 100 Words. Together with the four Numbers/Letters workflows, all fifteen Ava app tests pass. Tests use role selectors, fresh real IndexedDB, reduced motion, and Zod validation of persisted records. The Connect workflow exposed a short-tablet layout overlap; the teaching panel now reserves enough height so the page scrolls without the footer covering its subject controls. New Storybook surfaces: Ava/Learning (Discover, Recognize, Connect, Positions), Ava/Scene (Jump, Under, Counting), Ava/World (Default).

## Editable Figma designs

[Ava’s Little World — Learning Apps](https://www.figma.com/design/dHHOaFgSF5OQyxYLOmLZuo?node-id=5-2) lives in the selected Auteur team. Six editable frames cover the Kid apps hub (`5:2`), Discover (`5:70`), Recognize (`5:129`), Connect (`5:172`), spatial learning (`5:247`), and a phone layout (`5:312`). The file includes four reusable control components, 21 source color/spacing/radius variables, six text styles, and the original cover and Blender posters uploaded as discrete content assets. UI labels, controls, and layout remain editable; full-screen screenshots are not used as the design.

Figma does not expose the app’s self-hosted PP Editorial Sans/Old fonts, so the designs use editable DM Sans and PP Editorial New substitutes. Chrome control timed out after the desktop was reported locked, preventing a live capture during this pass. The designs were composed from source with the Figma API and inspected through rendered exports; that limitation and the font substitutions are also recorded in the file.

The repository's existing PWA integration remains disabled in its Vite configuration. These changes do not claim that first-time media downloads work offline. No release or deployment has been performed.

### Verification snapshot

The complete `build:ava-media` task rebuilt all 300 models and videos without warnings. The isolated Ava release branch passes the full `bun run check` gate: CLI lint/format, typecheck, Sonar, unit tests, static prerender, 61 browser tests, React Doctor, and Fallow. All fifteen Ava app workflows pass. One pre-existing offline test remains skipped while PWA integration is disabled. The existing graph tests remain unchanged and pass: the earlier failures belonged to an unrelated local route-transition experiment, which is excluded from this release. A separate React Doctor scan includes untracked feature files and reports no new findings.
