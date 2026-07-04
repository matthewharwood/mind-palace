import type { Curriculum } from "@mind-palace/curriculum";

import { ff6Source } from "./_sources";

// Effect Forge I: First Sparks — the practicum. Ten escalating FF6 effects,
// each as a build spec (Spell · The look · Decomposition · Build plan · Done
// when · Reduced motion), grounded in the ff6 disassembly's animation system
// and the modern VFX taxonomy. Looks are the frame-verified SNES originals;
// build plans target Bevy 0.19. No code cards — the learner builds in their
// own gallery project; MCQs check decomposition reasoning.
export const gfxForge1: Curriculum = {
  id: "c-gfx-forge-1",
  title: "Effect Forge I: First Sparks",
  source: ff6Source,
  nodes: [
    {
      id: "forge-harness",
      title: "Effect Forge: The Gallery Harness",
      content: {
        type: "read",
        markdown:
          "You have the theory: FF6's animation grammar, the shader blocks, and the Bevy 0.19 spine. The forge is where they fuse. You will build ==ten escalating effects== in one project, each from a build spec, until the decomposition method is muscle memory.\n\n## One project, one gallery\nMake a single Bevy app with an **effect gallery** scene:\n\n- one `Camera2d` with `Hdr`, `Bloom`, and `Tonemapping` — the camera recipe from the Bevy VFX curriculum; every emissive above 1.0 earns its glow from this camera\n- a stage: a **caster** sprite on the left and a **target** sprite on the right, each with a marker component\n- input cycles effects; each cast spawns a self-contained entity subtree plus a phase `Timer`, and despawns it when done — the gallery must return to rest state after every effect\n\n## The spec format\nEvery card that follows is a build spec with six parts: **Spell** (SNES → GBA names, MP), **The look** (the frame-verified original, phase by phase), **Decomposition** (archetype, primitives, shader blocks), **Build plan** (entities, materials, systems), **Done when** (observable acceptance criteria), and **Reduced motion** (the calm variant).\n\nThe phase vocabulary is the four-beat: ==anticipation → delivery → impact → dissipation==. Small spells skip beats — a basic attack is an *instant impulse* — while big ones spend whole seconds on anticipation.\n\n## Safety rails\nTwo rules bind every effect in the gallery:\n\n- the ==three-flash rule== (WCAG 2.3.1): nothing may flash more than three times in any one-second period. Fullscreen flashes are budgeted — the Scan spec builds the budget mechanism\n- every effect ships a ==reduced-motion variant==. At startup, read the `prefers-reduced-motion` media query (the wasm build asks the browser; native falls back to a config flag) into a `ReducedMotion` resource; every effect system branches on it\n\n## The color contract\nFF6's palette discipline is the gallery's palette discipline: **fire** is orange/gold, **ice** blue-white, **lightning** blue rising to gold with tier, **poison** green, **healing** blue-white/green/gold, **MP** pink, **holy** white and pale blue. Brightness signals power; hue signals element. Break the contract and players misread the spell.",
      },
    },
    {
      id: "spec-fire",
      title: "Forge Spec: Fire",
      content: {
        type: "read",
        markdown:
          "**Spell:** Fire (SNES) → Fire (GBA) — MP 4, fire element. The smallest attack spell in the game, and the forge's first brick.\n\n## The look\nThe caster raises arms and pulses with a warm glow (FF6's two-beat cast rhythm), then **two-to-three small tongues of orange-yellow flame** flicker upward directly on the target's sprite for about a second, with a faint warm tint on the target. No screen-wide effect. Quick fade, damage number.\n\n## Decomposition\nArchetype: ==target overlay — flame burst==. Timing: an *instant impulse* — a basic attack answers immediately; responsiveness beats telegraphing.\n\n- **Flame tufts** — 2-3 additive billboards burst-spawned on the target, slight upward drift, staggered lifetimes\n- **Tint kick** — the target sprite warms briefly (the descendant of the SNES per-palette RGB add) and eases back\n- **Optional delivery drill** — the original skips delivery entirely; add a small caster→target fire mote once as practice, then turn it off\n\nShader blocks: grayscale flame colored by an orange ==gradient ramp==; UV-scrolled noise (or a small flipbook) for the licking motion; ==alpha erosion== on the way out — flames burn away at the edges, never uniform-fade.\n\n## Build plan\n- Spawn a `FireBurst` subtree at the target: three flame quads (`Mesh2d` + `MeshMaterial2d` with your flame `Material2d`; a `Sprite` flipbook is a fine first pass) and a 0.9 s `Timer`\n- One system maps each flame's age to size and alpha curves using `Res<Time>`; a second applies the tint kick and eases it off over ~0.3 s\n- Push the flame core color above 1.0 — bloom supplies the halo; ==glow is earned, not painted==\n- Despawn the subtree when the timer finishes\n\n## Done when\n- flames flicker upward on the target for ~1 s and erode out, edges first\n- the core visibly blooms; the tint kick fully restores\n- nothing screen-wide happens — zero flash budget spent\n- after despawn the entity count is back at baseline (no leaks)\n\n## Reduced motion\nOne static flame sprite fades in over the target, holds, fades out. The tint kick stays — it is gentle and local — the flicker goes.",
      },
    },
    {
      id: "spec-cure",
      title: "Forge Spec: Cure",
      content: {
        type: "read",
        markdown:
          "**Spell:** Cure (SNES) → Cure (GBA) — MP 5. The gentlest effect in the game — which makes it the tempo lesson.\n\n## The look\nA sparkle-gather at the caster (White magic's dedicated intro in the animation VM), then **small blue-white cross-star glints spiral upward** around the target with a soft chime and a brief cool glow on the sprite.\n\n## Decomposition\nArchetype: ==rising sparkle overlay== (sparse). Tempo: the ==heartbeat rule== — pulses slower than ~60 BPM read as positive and inviting; healing must feel calm, so every ease here is gentle and nothing repeats faster than about once a second. Shape language: rounded four-pointed stars — friendly, never spiky.\n\n- **Caster gather** — a few motes drifting inward at the caster: converging particles are anticipation grammar, here in miniature\n- **Rising stars** — rate-spawned star billboards with upward velocity plus a slow spiral, additive\n- **Cool glow** — a soft radial-gradient quad behind the target easing in and out\n\n## Build plan\n- `CureAura` subtree + 1.4 s timer; emit ~12 stars per second for 0.8 s — the equilibrium rule `N = rate × lifetime` keeps the count sparse\n- Spiral each star from its own age: position = target + polar coordinates, radius rising, angle advancing slowly\n- Size-over-life eases out; alpha eases in then out; the glow quad scales 0→1 with an ease-out, holds, fades\n- Party-wide healing later is this same subtree spawned per ally — ==multi-target is a loop, not a new effect==\n\n## Done when\n- stars only rise — nothing falls, nothing darts\n- at most ~20 particles on screen; the whole effect stays under 1.5 s\n- at a squint it reads calm: no pulse faster than 1 Hz, no saturated reds\n\n## Reduced motion\nA static halo: the glow fades in and out while three stars fade in place — no travel, same colors.",
      },
    },
    {
      id: "spec-bolt",
      title: "Forge Spec: Bolt",
      content: {
        type: "read",
        markdown:
          "**Spell:** Bolt (SNES) → Thunder (GBA) — MP 6, lightning element. The suddenness lesson — and the gallery's first fullscreen flash.\n\n## The look\nOne **jagged blue-white bolt cracks down from the top of the screen** onto the target — the strike lands in 1-2 frames — with a single quick white screen flash; yellow-white sparks then crackle over the sprite for a few frames.\n\n## Decomposition\nArchetype: ==strike-from-above bolt + screen flash==. Timing: pure *instant impulse* — zero anticipation is the point.\n\n- **Bolt** — a vertical quad with a jagged emissive texture, or a polyline of segments displaced by hash noise; alive 2-3 frames. Roll the jag offsets ==once per strike== — a bolt that re-rolls every frame reads as static, not lightning\n- **Impact flash sprite** — 1-3 frames at the contact point, the professional convention\n- **Fullscreen flash** — ONE white flash, easing out over ~0.1 s at modest alpha; it costs one unit of flash budget\n- **Sparks** — velocity-stretched billboards under gravity and drag; stretch-by-speed is free squash-and-stretch\n- **Shake** — FF6 reserved shake for Bolt 3, but the forge adds a light trauma kick as a game-feel drill: bump trauma by ~0.3 and let it decay\n\n## Build plan\n- `BoltStrike` subtree; frame 0 spawns bolt + impact sprite + the fullscreen white quad; despawn the bolt after ~0.05 s and burst-spawn 8-12 sparks\n- HDR: bolt core around ×10 emissive so bloom flares along the jag\n- The flash quad's alpha eases 0.35 → 0 over 0.1 s; the shake system reads the trauma resource from the Bevy VFX curriculum\n\n## Done when\n- trigger to flash lands under 100 ms — it must feel instant\n- exactly one fullscreen flash per cast; two casts inside a second still total ≤ 3 flashes\n- sparks settle within 0.5 s on arcs, not straight lines\n\n## Reduced motion\nNo flash, no shake: the bolt draws in over ~0.4 s and fades; sparks become three static glints.",
      },
    },
    {
      id: "spec-ice",
      title: "Forge Spec: Ice",
      content: {
        type: "read",
        markdown:
          "**Spell:** Ice (SNES) → Blizzard (GBA) — MP 5, ice element. The SDF node.\n\n## The look\nA jet of **pale blue-white crystalline mist sprays diagonally** onto the target; glinting shards coalesce into a **small spiky ice crystal** on the sprite, which immediately shatters into white glints. Cold blue cast on the target.\n\n## Decomposition\nArchetype: ==particle spray + crystal growth + shatter==.\n\n- **Spray** — velocity-aligned shard billboards streaming along a diagonal at the target\n- **Crystal** — the reason this spec exists: a crisp spiky silhouette drawn as an ==SDF star-polygon== in a fragment shader. Animate the radius 0→1 with an ease-out to grow it; `smoothstep` on the distance gives a clean antialiased rim at every scale, and `abs(d) - w` carves a bright outline for the faceted glint\n- **Shatter** — a burst of shards with outward velocities on gravity arcs\n- **Tint kick** — a brief cold blue on the target\n\nColor ramp: white core → pale blue rim; everything additive — ice glints emit light.\n\n## Build plan\n- `IceCrystal` quad with a `Material2d` whose uniform carries the growth value; a system writes it each frame from the phase timer (or pass elapsed time and ease in-shader)\n- Phases: spray 0.3 s → growth 0.25 s → hold 0.1 s → shatter; the shatter burst reuses the spray emitter with its role reversed\n- Size the crystal quad so the SDF never clips at full radius\n\n## Done when\n- zoom the window: the crystal edge stays razor-crisp at any scale — no blur, no jaggies; that is the SDF payoff\n- growth eases out (fast, then settling) and the hold beat is visible before the shatter\n- shards fly on arcs and the whole effect lands under ~1.2 s\n\n## Reduced motion\nThe crystal fades in at full size, holds, fades out — no spray, no shatter; the tint kick stays.",
      },
    },
    {
      id: "spec-poison",
      title: "Forge Spec: Poison",
      content: {
        type: "read",
        markdown:
          "**Spell:** Poison — MP 3, poison element. Small, quick — and the blend-mode decision in miniature. Bio, Forge II's exemplar, is this grammar scaled up into a full miasma cloud, so build this one clean: it is the foundation you will escalate.\n\n## The look\nA cluster of **translucent green bubbles fizzes up** over the target and pops, tinting the sprite sickly green.\n\n## Decomposition\nArchetype: ==rising particles (bubbles) + green tint==. The lesson is the blend split: flames and sparkles *emit light*, so they are additive; a bubble is a *translucent film* that occludes what is behind it, so it is ==alpha blended==. Alpha-blended quads need back-to-front sorting to composite correctly — trivial at six bubbles, the real tax at Bio's six hundred.\n\n- **Bubbles** — 5-8 billboards burst-spawned low on the target: buoyancy (upward acceleration) plus a horizontal sine wobble, each with a hashed phase offset so they never synchronize\n- **Pop** — at end of life: a 2-frame pop flipbook, or a quick scale-up plus alpha-out\n- **Tint kick** — sickly green, restored *slower* than Fire's warm kick: poison lingers\n\nBubble shader: a radial gradient with a bright ==SDF ring== rim at low alpha — a film, not a fire.\n\n## Build plan\n- `PoisonFizz` subtree + timer; per-bubble age drives rise and wobble from `Res<Time>`\n- Sort the bubbles for alpha correctness (z by height is enough here)\n- Reuse Fire's tint-kick system with a green target color and a longer restore\n\n## Done when\n- bubbles rise with visible wobble and pop at staggered times, never in unison\n- cast it over a bright backdrop: the scene stays visible *through* the film — if the overlap whites out, you shipped additive by mistake\n- the green tint outlasts the last bubble by ~0.5 s\n\n## Reduced motion\nThree static bubbles fade in and out at fixed heights; the tint kick stays, the rise and wobble go.",
      },
    },
    {
      id: "spec-scan",
      title: "Forge Spec: Scan — the flash lesson",
      content: {
        type: "read",
        markdown:
          "**Spell:** Scan (SNES) → Libra (GBA) — MP 3. The quietest spell in the school — deliberately chosen as the gallery's ==photosensitivity checkpoint==.\n\n## The look\nA **translucent deep-blue lens** — a magnifier reticle filled with constellation-style dots and grid glints — expands over the enemy, holds while the stat text prints, then pops.\n\n## Decomposition\nArchetype: ==target overlay — lens/reticle==, plus one *budgeted* fullscreen pulse the forge adds at the pop — added here precisely because the stakes are low.\n\n- **Lens** — one quad, one fragment shader: an SDF circle outlined with `abs(d) - w`, two thin crossed SDF boxes for grid lines, a few dot glints; alpha-blended (a film, like Poison's bubbles)\n- **Expansion** — radius ease-out 0→1 over ~0.35 s; **hold** ~0.8 s (print placeholder stat text in the gallery); **pop** — scale to 1.1 and alpha to zero in 2 frames, coincident with a low-alpha fullscreen cyan pulse\n\n## The flash budget\nThe ==three-flash rule== (WCAG 2.3.1): content must not flash more than **three times in any one-second period** above the general and red flash thresholds — and large, high-contrast luminance swings are exactly what fullscreen pulses are. Bolt spends one per cast; Bolt 3 and Flare will beg to strobe. So build the rail now:\n\n- a `FlashBudget` resource holding the timestamps of recent fullscreen flashes\n- a request helper that **refuses** when three flashes already landed in the trailing second\n- every fullscreen flash in the gallery goes through it — no exceptions, ever\n- when `ReducedMotion` is set, the helper always refuses and callers fall back to their calm variant\n\n## Build plan\n`ScanLens` subtree + phase timer (expand → hold → pop); the pulse is a fullscreen quad easing alpha 0.25 → 0 over ~0.12 s, spawned only if the budget grants the request.\n\n## Done when\n- the lens expands, holds, pops; the pulse is subtle, not blinding\n- spam Scan five times in one second: at most three pulses fire — watch the budget refuse the rest\n- with reduced motion on: zero pulses, ever\n\n## Reduced motion\nThe lens fades in at full size, holds, fades out. No pulse.",
      },
    },
    {
      id: "spec-drain",
      title: "Forge Spec: Drain",
      content: {
        type: "read",
        markdown:
          "**Spell:** Drain — MP 15, non-elemental. The canonical ==drain-transfer particle stream== — and the direction fact everyone gets backwards.\n\n## The look\nA stream of **small glowing orbs — white and red pinpoints — siphons from the target's body to the caster**; the caster pulses with a warm golden glow as the stolen HP arrives. Direction: ==target → caster==, always.\n\n## Decomposition\n- **Stream** — rate-spawned orb billboards born *on the target*, flying to the caster along an arc; debris and magic travel on ==arcs, not straight lines==\n- **Dual color** — alternate white and red per orb (hash the orb index); everything additive\n- **Arrival glow** — each landing orb feeds a golden glow at the caster: keep a small accumulator, ease it toward zero every frame, and write it as above-1.0 emissive so bloom swells with the theft — the payoff reads at the caster, not the target\n\nMotion recipe: parameterize each orb by its own normalized age `t`: position = a quadratic curve from target to caster whose control point is lifted off the line and jittered per orb, so every orb flies its own arc. Ease *in* on `t`: orbs leave slowly and arrive fast — theft accelerates.\n\n## Build plan\n- `DrainStream` subtree with a ~1.2 s window; emit ~25 orbs per second while it is open\n- The travel system computes position as a ==pure function of age== — no velocity integration; determinism keeps phase timing exact and the math trivially unit-testable\n- Arrivals bump the caster-glow accumulator; a glow system eases it down and drives the sprite's emissive\n\n## Done when\n- freeze any frame: orb density leans toward the target early in the cast and toward the caster late — the flow direction is legible from a single screenshot\n- both colors are visible in flight; the golden glow swells while orbs land and dies within ~0.4 s after the last arrival\n- zero flashes, zero shake — this effect is all flow\n\n## Reduced motion\nNo stream: the target dims slightly while the caster's glow eases in and out — the transfer told by two crossfading glows.",
      },
    },
    {
      id: "spec-fire-2",
      title: "Forge Spec: Fire 2",
      content: {
        type: "read",
        markdown:
          "**Spell:** Fire 2 (SNES) → Fira (GBA) — MP 20, fire element. The anticipation lesson: Fire's grammar, escalated into two real phases.\n\n## The look\nA **ring of small fireballs materializes around the target and spirals inward**; on convergence a **tall column of golden flame** erupts under the target with an orange palette flash on the target's sprite.\n\n## Decomposition\nArchetype: ==converging projectile ring + burst==. The inward spiral IS the wind-up — converging particles are the classic *energy gathering* telegraph, and the column is the payoff. A tier ladder is ==the same grammar at increasing scale==: more elements, a real anticipation beat, a real climax.\n\n- **Ring** — 8 fireball billboards placed by ==polar coordinates==: one angle per ball around the circle, radius easing *in* toward zero while the angle keeps advancing — a spiral, not a straight collapse\n- **Column** — a tall additive quad: UV-scrolled flame noise, a vertical gradient bright at the base, ==alpha erosion== eating the top edge; scale-y eases out\n- **Target flash** — an orange tint kick, target-local, so it costs no flash budget\n- **Embers** — a few drifting sparks after the column dies; ==layers never all stop at once==\n\n## Build plan\n- Two-phase timer: gather ~0.6 s → column ~0.5 s; flip phases on `just_finished`\n- Fireball positions are pure functions of age — Drain's curve math bent polar: radius shrinks as `R * (1 - ease_in(t))` while the angle advances with time\n- Reuse the Fire flame material for the fireballs *and* the column — one material, two scales\n\n## Done when\n- the spiral visibly accelerates inward; the ease-in reads as gathering force\n- the column erupts within a frame or two of convergence — no dead air between anticipation and payoff\n- embers outlive the column, and the whole thing reads as *Fire, but bigger* — same ramp, same blend, more energy\n\n## Reduced motion\nNo spiral: the ring fades in around the target, holds, fades out while a stationary glow swells gently underneath — the shape of the spell without the motion.",
      },
    },
    {
      id: "spec-osmose",
      title: "Forge Spec: Osmose",
      content: {
        type: "read",
        markdown:
          "**Spell:** Osmose — MP 1. Drain's grammar ==recolored magenta for MP== — which makes it the recolor-system lesson.\n\n## The look\n**Pink-violet motes stream from the target back to the caster**, with a small glint on the caster as each point arrives. Same composition as Drain, different palette, different meaning: pink is MP in FF6's color language.\n\n## Decomposition\nArchetype: ==drain-transfer stream, LUT-swapped==. If Drain's orbs are authored **grayscale** and colored through a ==1D gradient LUT==, then Osmose is the same effect with exactly one change: swap the ramp — white→gold→red becomes white→magenta→violet. No new textures, no new systems, no new emitters. This is the modern descendant of SNES palette swaps: 16-color palettes made recolors free in 1994; ramp lookups make them free now.\n\n**The shimmer.** FF6's palette-cycling opcodes animate color by rotating palette entries in place. The modern port: ==scroll the LUT coordinate== — `color = ramp(fract(gray + t * speed))` — and each mote shimmers through the ramp as it flies.\n\n## Build plan\n- Parameterize the drain material: a ramp (color stops, or a 1D texture binding) plus a scroll-speed uniform\n- Drain = warm ramp, scroll 0; Osmose = magenta-violet ramp, scroll ~0.5 — ==one spawn function, two configs==\n- Add the arrival glint: a tiny 2-frame star at the caster per landing mote (local, budget-free)\n\n## Done when\n- Drain and Osmose share every system — prove it by diffing their configs: only ramp and scroll differ\n- the shimmer is visible on motes in flight\n- the recolor took minutes, not hours — that speed is the acceptance criterion that matters\n\n## Reduced motion\nDrain's calm variant in magenta: two crossfading glows, LUT scroll off.",
      },
    },
    {
      id: "spec-warp",
      title: "Forge Spec: Warp",
      content: {
        type: "read",
        markdown:
          "**Spell:** Warp (SNES) → Teleport (GBA) — MP 20. The Forge I capstone: three signature blocks in one composition, including the HDMA wave's modern port.\n\n## The look\nA **column of blue-white light with rising luminous rings** envelopes the party; the sprites **dissolve upward into streaking light** and the battle ends.\n\n## Decomposition\nArchetype: ==light pillar + upward dissolve + screen wobble==.\n\n- **Pillar** — a tall additive quad: a bright center line falling off softly to the sides, vertical UV scroll for the streaming-light feel\n- **Rings** — 3-4 fixed-orientation ellipse outlines (an ==SDF ring== on a quad each) spawned at the base, rising with ease-out and expanding slightly, on staggered starts\n- **Wobble** — FF6 leaned on ==HDMA==: rewriting the horizontal scroll register per scanline to ripple the screen. The per-scanline register write becomes a per-pixel ==UV distortion== in a fullscreen pass — `uv.x += sin(uv.y * freq + time) * amp` — with the amplitude eased 0 → max → 0 across the effect\n- **Departure** — ==alpha erosion== on the party sprite with the threshold swept bottom-to-top (drive it with a V-coordinate ramp plus time) so the body burns away *upward* into the light, bright eroding edge and all\n\n## Build plan\n- Phase timer: envelope 0.4 s → rise + wobble 0.9 s → dissolve 0.6 s → restore\n- Pillar and rings spawn as one subtree; the wobble amplitude is a uniform on the fullscreen material (the Bevy VFX post-processing path) animated by phase\n- The dissolve is a temporary material swap on the party sprite: a dissolve `Material2d` with a threshold uniform; restore the original material afterwards\n- Restore is part of the spec: amplitude to zero, material back, subtree despawned\n\n## Done when\n- rings rise *through* the pillar with staggered timing\n- the wobble bends the **whole scene**, not just the pillar — proof the pass is truly screen-space\n- the dissolve sweeps bottom→top with a glowing edge, never a uniform fade\n- afterwards the screen is exactly rest state — no residual wobble, no orphaned entities\n- zero flashes: resist the whiteout; whiteouts belong to Forge III's set pieces, where the budget will pay for them\n\n## Reduced motion\nNo wobble. The pillar fades in and out; the sprite fades uniformly instead of eroding; the rings render at fixed heights and fade.",
      },
    },
    {
      id: "blend-additive-vs-alpha",
      title: "Additive or alpha?",
      content: {
        type: "multiple-choice",
        question:
          "Fire's flame tufts and Cure's sparkles emit light; Poison's bubbles are a translucent film over the target. Which blend assignment is correct?",
        options: [
          "Alpha blend for all three — transparency is transparency",
          "Additive for the flames and sparkles, alpha blend for the bubbles",
          "Additive for all three — VFX should always add light",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "ice-sdf-crispness",
      title: "Crisp crystal at any scale",
      content: {
        type: "multiple-choice",
        question:
          "The Ice crystal must keep a razor-crisp spiky silhouette at any canvas size. Which technique delivers that?",
        options: [
          "A high-resolution crystal texture on a sprite",
          "Many overlapping small shard particles",
          "An SDF shape mask with a smoothstep edge in the fragment shader",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "fire-2-spiral-phase",
      title: "Reading Fire 2's spiral",
      content: {
        type: "multiple-choice",
        question:
          "In Fire 2, the ring of fireballs spiraling inward before the flame column erupts implements which phase of the effect?",
        options: [
          "Anticipation — converging energy telegraphs the payoff",
          "Impact — the spiral is itself the damage moment",
          "Dissipation — leftover energy draining away",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "three-flash-budget",
      title: "The flash budget",
      content: {
        type: "multiple-choice",
        question:
          "Under WCAG 2.3.1 — the three-flash rule the gallery's FlashBudget enforces — how many general flashes may appear in any one-second window?",
        options: [
          "At most ten, if each lasts under 50 ms",
          "At most three",
          "Any number, as long as the user can pause the game",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "osmose-lut-swap",
      title: "Recolor for free",
      content: {
        type: "multiple-choice",
        question:
          "Drain is authored grayscale and colored through a 1D gradient LUT. What is the cheapest correct way to produce Osmose's pink-violet stream?",
        options: [
          "Re-author the orb textures with pink baked in",
          "Add a magenta point light over the stream",
          "Swap the gradient LUT for a magenta-violet ramp",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "warp-wave-mapping",
      title: "HDMA wave, reborn",
      content: {
        type: "multiple-choice",
        question:
          "FF6's Warp wobble came from HDMA rewriting the horizontal scroll register per scanline. What is its modern screen-space equivalent?",
        options: [
          "A per-pixel UV offset — uv.x += sin(uv.y * freq + time) * amp — in a fullscreen pass",
          "Quantizing UVs to a grid and sampling each block's corner pixel",
          "A fresnel rim term brightening pixels at grazing angles",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    { from: "forge-harness", to: "spec-fire" },
    { from: "forge-harness", to: "spec-cure" },
    { from: "spec-fire", to: "spec-bolt" },
    { from: "spec-fire", to: "spec-ice" },
    { from: "spec-cure", to: "spec-poison" },
    { from: "spec-bolt", to: "spec-scan" },
    { from: "spec-cure", to: "spec-drain" },
    { from: "spec-fire", to: "spec-drain" },
    { from: "spec-fire", to: "spec-fire-2" },
    { from: "spec-drain", to: "spec-fire-2" },
    { from: "spec-drain", to: "spec-osmose" },
    { from: "spec-fire-2", to: "spec-warp" },
    { from: "spec-scan", to: "spec-warp" },
    { from: "spec-fire", to: "blend-additive-vs-alpha" },
    { from: "spec-poison", to: "blend-additive-vs-alpha" },
    { from: "spec-ice", to: "ice-sdf-crispness" },
    { from: "spec-fire-2", to: "fire-2-spiral-phase" },
    { from: "spec-scan", to: "three-flash-budget" },
    { from: "spec-osmose", to: "osmose-lut-swap" },
    { from: "spec-warp", to: "warp-wave-mapping" },
  ],
};
