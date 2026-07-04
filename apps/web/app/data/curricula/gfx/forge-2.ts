import type { Curriculum } from "@mind-palace/curriculum";

import { ff6Source } from "./_sources";

// Effect Forge II: Elemental Mastery — multi-phase FF6 effects rebuilt in the
// same Bevy 0.19 gallery started in Forge I. Every spec follows the format:
// Spell · The look · Decomposition · Build plan · Done when · Reduced motion.
// Spell visuals derive from verified SNES/GBA frames (ff6-magic dossier);
// Blitz/SwdTech visuals are footage-inspired, flagged as such. WGSL snippets
// are naga-validated by scripts/verify-rust-cards.ts.
export const gfxForge2: Curriculum = {
  id: "c-gfx-forge-2",
  title: "Effect Forge II: Elemental Mastery",
  source: ff6Source,
  nodes: [
    {
      id: "tier-escalation",
      title: "Tier Escalation: Reading -aga",
      content: {
        type: "read",
        markdown:
          "Forge II continues the same gallery project from Forge I: one Bevy 0.19 app, one effect-select scene, every effect honoring `prefers-reduced-motion` and the ==WCAG three-flash rule==. What changes is ambition — these are FF6's multi-phase statements, not one-second overlays.\n\n## The four escalation levers\nPut Fire, Fire 2, and Fire 3 side by side and the tier grammar jumps out. FF6 makes a spell read *bigger* by pushing exactly four levers:\n\n- **Count** — two flame tufts become a ring of fireballs becomes a volley of bomb-cores; one bolt becomes a multi-strike becomes a screen-wide lattice\n- **Scale** — target-local overlay → group-wide effect → the whole screen claimed\n- **Screen effects** — tier 1 touches only the target sprite; tier 3 spends the screen itself: palette flash, background swap, camera shake\n- **Duration** — a one-second pop stretches into a multi-second, multi-phase sequence\n\n## Phases are the real upgrade\nEvery endgame FF6 spell runs the full VFX arc: ==anticipation== (a palette or background shift warns the eye) → ==build== (geometry or particles grow) → ==climax== (flash, whiteout, shake — the shortest phase) → ==restore== (the screen hands itself back). Small spells skip straight to the climax; big ones earn it. In Bevy, that arc is a phase enum advanced by a `Timer` — each spec below names its phases so the state machine writes itself.\n\n## Same grammar, more of it\nNothing new is invented at tier 3. The volley is still billboard projectiles; the wash is still a scrolling-noise quad; the flash is still a one-frame HDR pop. Mastery here means *choreography*: layering the primitives you already own across a longer timeline without muddying the read.",
      },
    },
    {
      id: "spec-fire-3",
      title: "Forge: Fire 3 (Firaga)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Fire 3** (SNES) → **Firaga** (GBA) — MP 51, fire element, hits the enemy group.\n\n## The look\nSeveral large red-orange orbs — bomb-like fire cores — fly in an arc toward the enemy side, then detonate into a massive ==white-cored orange conflagration== that washes over the whole group. The screen flashes orange with a light shake, then embers fade out: the burnout.\n\n## Decomposition\nArchetype: **projectile volley + fullscreen elemental wash**. Layers: orb billboards (additive core, gradient-mapped noise), per-orb detonation flash sprites (1–3 frames), the wash (a group-wide quad running scrolling fire noise), velocity-stretched ember particles, one orange screen flash, a small shake kick.\n\n## Build plan\n- Phase enum `Volley → Detonate → Wash → Burnout` advanced by a `Timer`\n- Orbs: `Sprite` entities lerped along parabolic arcs with staggered launch offsets — stagger is what makes a volley read as *many*, not one\n- Wash: a quad `Mesh2d` + `MeshMaterial2d` over the enemy half; the `Material2d` scrolls two noise samples at different speeds, maps the result through a fire ramp, and pushes the hottest texels above 1.0 so `Bloom` (on an `Hdr` `Camera2d`) blooms them\n- Burnout: drive an ==erosion threshold== uniform upward so the wash eats away at its edges instead of uniform-fading; leak a few ember particles with gravity and drag\n- Flash: one orange full-screen pop, a single frame — well inside the flash budget\n\n## Done when\nOrbs arc on visibly distinct trajectories; the wash covers the enemy side then dies by erosion, never by uniform fade; exactly one orange flash; the last thing on screen is drifting embers.\n\n## Reduced motion\nSkip the volley, the flash, and the shake: crossfade a warm static glow over the targets, hold, release. The damage beat lands on the same frame either way.",
      },
    },
    {
      id: "spec-bolt-3",
      title: "Forge: Bolt 3 (Thundaga)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Bolt 3** (SNES) → **Thundaga** (GBA) — MP 53, lightning element, hits the enemy group.\n\n## The look\nThe screen darkens a beat — anticipation — then a web of ==golden-yellow lightning== engulfs the whole enemy side: thick zigzag arcs latticing across every enemy at once, punctuated by repeated full-screen white flashes, fading with residual sparks.\n\n## Decomposition\nArchetype: **fullscreen electric wash + strobe**. The dim is a light-blocking overlay (alpha-blend, it darkens — additive can only brighten). The lattice is a set of jittered bolts; the flashes are one-frame HDR pops; a ==chromatic aberration pulse== — offsetting the R, G, B samples for a few frames — is the modern accent that sells electricity better than raw brightness. Residual crackle is a spark emitter.\n\n## Build plan\n- Dim: full-screen dark quad, alpha eased 0 → 0.4, held under the lattice\n- Bolts: either polyline strip meshes rebuilt with fresh jitter every few frames, or a full-screen `Material2d` drawing zigzag SDF segments in the fragment shader; map intensity through a gold ramp with an HDR core so `Bloom` halos every arc\n- Strobe: white full-screen quads, one frame each — and here the SNES original is *wrong by modern rules*: it strobes harder than accessibility allows. ==Cap the strobe at three flashes in any one-second window== (WCAG 2.3.1) and space them musically\n- CA pulse: for 2–6 frames after each flash, sample the scene three times with tiny radial channel offsets\n\n## Done when\nDim reads before the lattice; arcs re-jitter (alive, not a static PNG); the strobe never exceeds the three-flash budget; sparks outlive the last flash.\n\n## Reduced motion\nNo strobe at all and no CA: the dim, a static gold lattice held for a beat, a gentle fade. Lightning still reads — the flash was emphasis, not identity.",
      },
    },
    {
      id: "spec-ice-3",
      title: "Forge: Ice 3 (Blizzaga)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Ice 3** (SNES) → **Blizzaga** (GBA) — MP 52, ice element, hits the enemy group.\n\n## The look\nA shimmering curtain of ==blue diamond-lattice ice== descends and stacks across the *entire enemy side* — the SNES engine literally bottom-aligns each crystal column with its target — freezing the area under a cold blue tint. Then the whole curtain detonates into glitter.\n\n## Decomposition\nArchetype: **geometry growth + freeze hold + mass shatter**. Three beats: crystal walls grow (scale-in geometry, ease-out), the freeze *holds* — the hold is the impact frame, stillness selling cold — then a burst of shard particles with glint flashes. The blue tint is a screen-wide color grade.\n\n## Build plan\n- Crystals: one quad per target running a faceted-crystal `Material2d` (SDF facets, cool ramp, a fresnel-style bright rim near the silhouette); scale Y from 0 with ease-out, ==anchoring each quad's bottom to its target's baseline== — the modern echo of the engine's bottom-align command\n- Freeze: 4–6 frames where *nothing moves* except a slow shimmer scroll; drop the whole scene toward blue with a color-grade overlay\n- Shatter: per-crystal burst emitters of velocity-stretched shard billboards on gravity arcs, plus a 1-frame white glint at each crystal; kick a brief ==hit-stop== by dropping the virtual clock's `relative_speed` near zero for a few frames, then restoring\n\n## Done when\nCrystals grow up from the ground (never fade in); there is a real motion-dead hold before the shatter; shards fly on arcs and tumble; the blue grade releases last.\n\n## Reduced motion\nCrystals fade in gently, hold, then *melt* — an erosion threshold dissolves them downward. No shatter burst, no hit-stop, no grade snap.",
      },
    },
    {
      id: "spec-bio",
      title: "Forge: Bio — the Exemplar",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Bio** — MP 26, poison element, hits the enemy group. Poison's bigger, wetter sibling — and the exemplar spec of this forge, because it exercises the whole noise toolchain in one effect.\n\n## The look\nA wide spray of dark-green sludge globules splatters in an arc across the enemy group — a ==bacterial cloud of wobbling green blobs== — leaving a venomous green wash that lingers, then rots away. The palette is sickly: green mids sliding into purple shadows.\n\n## Decomposition\nFour named blocks, each one a shader-craft skill:\n\n- **Noise-driven toxic cloud** — two fbm samples scrolled at different speeds and combined make the cloud *boil* instead of slide\n- **Dissolve erosion** — the cloud dies by an animated threshold against its own noise: edges eat inward, with a `smoothstep` feather so the rim is soft\n- **Glowing burn edge** — the thin band just above the threshold gets tinted a hot sickly yellow-green, pushed past 1.0 so `Bloom` catches the rot-line\n- **Gradient mapping** — the cloud is authored grayscale and mapped through a ==green-purple ramp==; swap the ramp and the same cloud becomes smoke, miasma, or holy mist\n\n## Build plan\n- Cloud: a quad over the enemy side with a custom `Material2d`; its uniform struct carries time-fed scroll offsets and the erosion threshold (remember the bevy binding rule: material WGSL binds via the `@group(#{MATERIAL_BIND_GROUP})` shader-def placeholder, never a literal group index)\n- Drive the threshold uniform from a system reading `Res<Time>` during the dissipation phase\n- Bubbles: a small sprite pool spawned as a burst; each rises with buoyancy, wobbles via a per-bubble sine offset, and pops into a 2-frame glint on its own clock\n- Splatter entry: the cloud alpha sweeps in along the spray arc — a directional erosion *in*, then the boil, then erosion *out*\n\n## Done when\nThe cloud visibly boils (two scroll speeds beating against each other); it dies edge-first with a glowing rim, never a uniform fade; bubbles pop at scattered times; the palette reads poison — green with purple shadows, nothing pure or clean.\n\n## Reduced motion\nA static cloud texture with a slow threshold fade, no boil, no wobble, no bubbles. Sick color does the storytelling.",
      },
    },
    {
      id: "mcq-erosion-band",
      title: "Dissolve edge band",
      content: {
        type: "multiple-choice",
        question:
          "In a Bio-style dissolve, `mask` is the cloud's noise value and `t` is the animated erosion threshold. Which pixels does `edge_band` select?",
        language: "wgsl",
        code: `fn edge_band(mask: f32, t: f32, w: f32) -> f32 {
    return smoothstep(t, t + w, mask) - smoothstep(t + w, t + 2.0 * w, mask);
}`,
        options: [
          "Pixels deep inside the surviving cloud, far above the threshold",
          "A thin band just above the threshold — the rim you tint as the glowing burn edge",
          "Only pixels that have already dissolved away below the threshold",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "spec-quake",
      title: "Forge: Quake",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Quake** — MP 50, earth element, hits *everyone on the ground* — allies included. The terrain itself is the effect.\n\n## The look\nThe floor fractures: the battlefield ground breaks into jagged black rock plates that heave upward into a broken dome, with columns of yellow dust and energy erupting beneath every combatant, all under a ==heavy sustained screen shake==.\n\n## Decomposition\nArchetype: **terrain deformation + eruption columns + shake**. Layers: crack decals racing along the ground (the permanence channel), rock-plate sprites translating and rotating upward, per-combatant burst emitters (alpha-blended dust shell around an additive energy core), and the shake — not a one-off kick but an ==accumulating trauma model==.\n\n## Build plan\n- Cracks: decal sprites spawned progressively along jagged paths — cracks *precede* the heave, telegraphing where the ground gives\n- Plates: sprite chunks of the ground strip, each lerped up a few pixels with individual rotation and ease-out, then settled back down\n- Eruptions: one burst emitter keyed per combatant — dust as alpha-blend (it blocks light), the energy core additive; stagger eruptions a few frames apart so the eye can count them\n- Shake: keep a `trauma: f32` resource; each phase *adds* trauma, a system decays it every frame, and camera offset = `trauma * trauma` times a max amplitude with per-frame random direction. Squaring makes small trauma gentle and big trauma violent — and the decay guarantees it always calms down\n\n## Done when\nCracks appear before anything moves; every combatant (party side too) gets an eruption; the shake builds across the phases and decays smoothly — the camera drifts home, never teleports.\n\n## Reduced motion\n==Zero camera shake==. Cracks spread, a gentle dust haze rises, plates stay put. Shake is the single most nausea-prone channel — reduced motion removes it entirely, not partially.",
      },
    },
    {
      id: "spec-demi",
      title: "Forge: Demi (Gravity)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Demi** (SNES) → **Gravity** (GBA) — MP 33, no element, cuts the target's HP in half.\n\n## The look\nA black sphere outlined in violet — a ==miniature black hole== — materializes over the target and pulses, squeezing downward with dark sparks chained around it, visually crushing the target under its own weight.\n\n## Decomposition\nArchetype: **dark gravity orb + radial-suck distortion**. The orb must read *darker than everything behind it* — that means alpha-blend darkening, never additive (additive can only add light; a black additive sprite is invisible). Around it: a ==radial UV suck== pulling the scene toward the orb's center, a darkening vignette, and a handful of violet sparks orbiting on arcs.\n\n## Build plan\n- Orb: a quad with an SDF circle — near-black core, a violet rim band just inside the edge (a distance-band, the 2D cousin of a fresnel rim), alpha-blended so it occludes\n- Suck: sample the scene at `uv + (center - uv) * k`, easing `k` up from 0 — every sample point is pulled toward the orb. In Bevy 0.19 the render graph is gone, so full-screen work is ECS systems in the `Core2d` schedule; the easy path is a `FullscreenMaterial` post pass, and the *easier* path for a local effect is distorting a captured-region quad over the target\n- Vignette: a multiply-blend overlay darkening toward the corners, eased in and out with the orb\n- Sparks: 4–6 violet particles on slow elliptical orbits, despawning inward\n\n## Done when\nThe orb is unmistakably darker than the scene; the space around it visibly bends inward as `k` rises; the pulse squeezes down (scale Y dips) on the damage beat; the vignette fully releases.\n\n## Reduced motion\nNo distortion, no pulse. The orb fades in, the target dims under the vignette, both fade out. Gravity reads through darkness alone.",
      },
    },
    {
      id: "mcq-radial-suck",
      title: "Radial suck distortion",
      content: {
        type: "multiple-choice",
        question:
          "Demi samples the scene at `demi_suck(uv, orb_center, k)` with `k` eased up from 0. What does the viewer see as `k` grows?",
        language: "wgsl",
        code: `fn demi_suck(uv: vec2f, center: vec2f, strength: f32) -> vec2f {
    return uv + (center - uv) * strength;
}`,
        options: [
          "The whole image slides sideways in one fixed direction",
          "The image tiles into a repeating grid of smaller copies",
          "The scene is pulled inward toward the orb — a gravity-well suck",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "spec-break",
      title: "Forge: Break (Petrify)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Break** — MP 25, no element, petrifies the target.\n\n## The look\nSmall red beads orbit the target while its palette ==bleaches toward white-gray==; on the final flash the target is left stone-gray and frozen. On the SNES this is a literal engine command — rewrite the target's palette and *hold it* — which makes Break the cleanest case study in palette-as-effect.\n\n## Decomposition\nArchetype: **orbiting particles + target palette shift**. Three blocks: red beads on circular paths (polar motion), the ==grayscale ramp== — the modern descendant of the palette rewrite, a per-target material lerping from full color to a stone gradient — and a finishing crack: a decal plus a puff of micro-shards on the last beat.\n\n## Build plan\n- Beads: a few red sprites parameterized by angle — position = center plus `(cos θ, sin θ)` times radius, with θ advanced from `Res<Time>`; tighten the radius over the effect so the orbit closes in as the curse takes hold\n- Petrify: render the target through a material whose fragment computes luminance (dot the color with the standard luma weights), then outputs `mix(original, stone_ramp(luma), t)`; ease `t` from 0 to 1 across the orbit — the drain must be *gradual*, a hard swap reads as a glitch\n- Hold: petrify is a status — `t` stays at 1 after the effect ends; the stone look persists until cured\n- Finish: one ≤1-frame white flash, a crack decal across the sprite, three or four gray shard particles\n\n## Done when\nColor drains smoothly while the beads orbit; the flash is a single frame; the target still reads as its own silhouette — gray, cracked, but recognizable — and stays stone after the effect entity despawns.\n\n## Reduced motion\nSkip the orbit and the flash: a straight crossfade to the stone ramp, then the crack decal. Petrify is a state change, and a crossfade states it.",
      },
    },
    {
      id: "spec-doom",
      title: "Forge: Doom (Death)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Doom** (SNES) → **Death** (GBA) — MP 35, no element, instant KO. One of the game's most iconic apparition effects.\n\n## The look\nThe ==Grim Reaper itself== — a black-and-purple-robed, scythe-bearing specter — materializes in front of the target, looms, swipes, and dissolves. The whole area dims while it is on screen; the target then collapses.\n\n## Decomposition\nArchetype: **apparition + darkness wash**. The apparition is a sprite cameo: a character that *is* the effect. The dim is an alpha-blend dark overlay (light-blocking — this is the additive-vs-alpha decision again). The swipe is a crescent slash arc with a 1-frame flash, and the kill is the target's own ==dissolve-out==.\n\n## Build plan\n- Dim first: full-screen dark quad eased to ~0.5 alpha *before* the reaper appears — darkness announces the guest\n- Reaper: a `Sprite` with a `TextureAtlas` flipbook for the loom-and-swipe cycle; it enters via ==noise dissolve-in== (erosion threshold running backward) rather than an alpha fade — apparitions materialize edge-first, ghosts fade\n- Swipe: a crescent mesh whose 1D gradient sweeps along the arc via an erosion threshold on the V coordinate, timed to the flipbook's swing frame, plus a single white flash frame at contact\n- Collapse: the target dissolves out through the same noise-threshold material, downward-biased so it crumbles toward the floor\n\n## Done when\nThe dim precedes the reaper; the reaper materializes and departs edge-first (eroded, never ghost-faded); swipe, flash, and collapse land on one shared beat; the light returns only after the reaper is gone.\n\n## Reduced motion\nNo loom animation, no swipe sweep: the dim, a still reaper silhouette fading in and out, the target's quiet dissolve. Dread survives without motion — it lives in the dark beat.",
      },
    },
    {
      id: "spec-pearl",
      title: "Forge: Pearl (Holy)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Pearl** (SNES) → **Holy** (GBA) — MP 40, holy element. Serene, then blinding.\n\n## The look\nThe entire background pales to an ==icy white-blue and begins to ripple== — the engine has dedicated *pearl wind* HDMA scanline-scroll commands just for this — while white sparkles stream across the field in wind-blown waves. Then luminous pearls of light converge on the target and burst in one brilliant white flash.\n\n## Decomposition\nArchetype: **palette shift + wave distortion + light burst**. Four blocks: the pale-out (a screen color grade toward white-blue), the ==HDMA wave translated to UVs== — the per-scanline scroll becomes `uv.x += sin(uv.y * freq + time) * amp` in a fragment shader — the wind sparkle stream (particles with a lateral wind force), and the convergence-and-burst (particles with inward radial velocity, ending in an HDR flash).\n\n## Build plan\n- Wave + pale-out share one full-screen pass: a `FullscreenMaterial` (or a screen-covering quad `Material2d`) that sine-offsets the sample X by Y, desaturates, and lifts toward white-blue\n- Sparkles: a steady-rate emitter with a sideways wind force and slight vertical sine bob — a *rhythm* layer, calm and continuous, under 60 BPM in feel\n- Convergence: a burst of pearl billboards spawned on a ring around the target with inward velocity and ease-in — they accelerate as they arrive, and the arrival is the cue\n- Burst: ==one== white flash frame at HDR intensity so `Bloom` blooms it wide — a single flash, well inside the WCAG budget; the serenity before it is what makes it land\n\n## Done when\nThe ripple reads as horizontal waves marching down the screen; sparkles drift with a believable wind; the pearls accelerate inward (never linear); exactly one flash, then the grade releases gently.\n\n## Reduced motion\nNo wave, no burst: the pale-out, the gentle sparkle drift, and a soft glow swell on the target. Pearl's identity is the palette, and the palette stays.",
      },
    },
    {
      id: "spec-flare",
      title: "Forge: Flare",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Flare** — MP 45, no element, pierces magic defense. Compact but violent.\n\n## The look\nThe background slams to a ==deep blood-red palette==; at the target a single point of white-hot light swells, then detonates into a yellow-white starburst with concentric shimmering heat rings and a hard white flash, before the palette restores.\n\n## Decomposition\nArchetype: **screen palette swap + point detonation**. Note the shared grammar with Pearl — both are palette swap plus point burst; Flare is the same sentence shouted in red. Blocks: the red grade, ==converging anticipation== (motes drifting inward plus a swelling glow core), the white-out detonation (starburst sprite + HDR core), expanding ==shock rings== (ring geometry scaled over life), and a heat-haze shimmer.\n\n## Build plan\n- Red grade: full-screen overlay eased in fast — the palette *is* the anticipation cue, land it before anything moves\n- Convergence: a burst emitter with negative radial velocity (motes spawn on a ring and fall inward) while a core quad scales up, its emissive driven through a `pow` curve so brightness arrives late and steep\n- Detonation: a 2-frame starburst sprite over a core pushed far past 1.0 — let `Bloom` do the blinding — plus ==one== hard white flash frame (flash budget: the red slam, the white pop, nothing else)\n- Rings: 2–3 annulus quads (ring SDF) spawned at the center, scale eased *out* — fast then decelerating — while an erosion threshold thins them away\n- Haze: a subtle UV-distortion wobble around the core during dissipation\n\n## Done when\nRed lands first and unmistakably; the swell accelerates into the pop (never linear); rings decelerate as they expand and die by erosion; the grade restores last, after the embers.\n\n## Reduced motion\nThe red wash and a slow glow swell at the target — no rings, no starburst, no flash. Menace is carried by the color slam alone.",
      },
    },
    {
      id: "spec-meteor",
      title: "Forge: Meteor",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Meteor** — MP 62, no element, hits all enemies. The battlefield stops being a battlefield.\n\n## The look\nThe arena vanishes: the screen becomes a ==black starfield== with a red-tinged horizon (a wholesale background replacement), then a barrage of rocky meteors streaks diagonally down one after another, each trailing white streaks and landing with an impact flash and a screen shake — until the background restores.\n\n## Decomposition\nArchetype: **background replacement + falling projectile barrage**. Blocks: the arena swap (background-as-VFX — the boldest channel FF6 owns), the meteor pool (billboards with ==velocity-aligned streak trails==), per-impact flash + ==scorch decals== (the permanence channel: marks that outlive the hit), and a shake that *accumulates trauma per impact* rather than firing once.\n\n## Build plan\n- Starfield: a full-screen quad material — hash-based star speckle over black with a red gradient at the horizon — crossfaded in over ~400 ms; never hard-cut the swap\n- Meteors: a sprite pool launched on a repeating `Timer` with staggered spawn X and a shared diagonal velocity; each carries a stretched streak quad aligned to its velocity vector\n- Impacts: on landing, spawn a 1–2 frame flash, a scorch decal sprite that persists a few seconds, and add a trauma kick to the shared shake resource — the decay between hits is what keeps the barrage readable\n- Flash budget: the barrage is many impacts — ==pool the flashes==: no more than three full-screen-bright frames in any one-second window; let smaller local flashes carry the rest\n\n## Done when\nThe swap crossfades in and out; meteors land on distinct, staggered beats — a drum fill, not a chord; scorch decals linger after the background restores; the shake breathes between impacts.\n\n## Reduced motion\nA static starfield fade with soft glow pulses at each impact point — no streaks, no shake, no flashes. The cosmic scale survives in the backdrop alone.",
      },
    },
    {
      id: "spec-aura-bolt",
      title: "Forge: Aura Bolt (Blitz)",
      content: {
        type: "read",
        markdown:
          "## Spell\n**AuraBolt** (SNES) → **Aura Cannon** (GBA) — Sabin's Blitz #2, learned at level 3, input ↓ ↓ ← (the Hadouken homage), holy-element, power 68, zero MP. The wiki describes Sabin *stepping toward the enemy and firing a beam of light from his hands*, and notes it visually resembles the famous Kamehameha wave. Fine details below are ==inspired by footage==, not pixel-exact claims.\n\n## The look\nAnticipation pose: Sabin plants his feet and cups his hands as a glow gathers between them. Then a thick ==blue-white beam with a bright core== streaks across the screen into the target, holds, and dies off.\n\n## Decomposition\nArchetype: **charged beam**. A beam differs from a trail in one way: ==both endpoints are gameplay-driven== — caster hand to target — and the shader does the writhing. The heat comes from layering: an inner white-hot core (thin, HDR emissive), a mid pale-blue body, and a wide soft additive glow sheath. One-layer beams look like tape; two-plus layers look like energy.\n\n## Build plan\n- Charge (~0.5 s — a crescendo impulse, it telegraphs): converging motes with inward velocity plus a small glow quad at the hands swelling with ease-in\n- Beam: a quad stretched from caster to target with UVs laid so ==U runs along the length==; scroll a noise sample along U so energy visibly flows toward the target; stack the three layers as three quads sharing endpoints, widths roughly 1 : 2.5 : 5\n- Core: emissive pushed past 1.0 — the `Bloom` halo is what merges the layers into one beam\n- Impact: a flash sprite and a few sparks at the target end for the beam's whole hold\n- Die-off: erode the beam out ==from the caster end== — the energy already spent leaves first; a uniform fade reads as a projector switching off\n\n## Done when\nThe charge reads before the fire (a dodge window, not a decoration); the core is visibly hotter than the sheath; noise flows along the beam; it dies caster-first.\n\n## Reduced motion\nCharge glow, then a single held beam frame that fades gently — no scroll, no sparks. The silhouette carries it.",
      },
    },
    {
      id: "spec-swdtech",
      title: "Forge: SwdTech Slash Arcs",
      content: {
        type: "read",
        markdown:
          "## Spell\nTwo of Cyan's SwdTech (GBA: **Bushido**) techniques — the family whose first act is its ==charge gauge==, a UI element filling 1–8 before any pixels fire. **Dispatch** (SNES) → **Fang**: level 1, a 120-power defense-ignoring dash cut. **Quadra Slam** (SNES) → **Flurry**: level 4 on the gauge, four 72-power hits on random targets. Visual details are ==inspired by footage==, not pixel-exact claims.\n\n## The look\nDispatch: Cyan blurs across the field, lands one iai draw-cut — a single white slash streak — and snaps back; one big hit-flash. Quadra Slam: he glides between enemies leaving afterimages, landing ==four separate slash flashes in rhythm==.\n\n## Decomposition\nArchetype: **melee dash + slash arcs**. Blocks: the slash arc itself (the industry fork: an *authored crescent mesh* with hand-laid UVs for total art control, versus a *runtime ribbon* trailing the weapon bone — for sprite-scale work the authored crescent wins), actor ==afterimages== (fading ghost copies), 1–3 frame hit-flashes at contact, and ==hit-stop== — freezing the clock a few frames per hit so the brain registers contact.\n\n## Build plan\n- Crescent: an arc mesh whose 1D gradient sweeps along the curve via an erosion threshold on the V coordinate — the slash is *drawn* across its arc in a few frames, not stamped\n- Dash: lerp the actor's `Transform` fast with ease-out; each frame of the dash spawns a ghost — a copy of the current sprite frame, additive, fading over ~150 ms\n- Hit-stop: on contact, drop the virtual clock's `relative_speed` to near zero for 3–5 frames, then restore — and keep the ghosts and sparks on real time, so the world holds its breath while the dust keeps drifting; that split is what stops hit-stop from feeling like a hitch\n- Rhythm: Quadra Slam's four beats should be *unevenly* spaced — ta-ta—ta-TA — with the last hit's flash and stop slightly heavier; even spacing reads robotic\n\n## Done when\nEach slash visibly sweeps along its crescent; the dash leaves a readable ghost trail; hit-stop is felt, not seen; the four-hit rhythm is musical and the last beat lands heaviest.\n\n## Reduced motion\nNo dash blur, no hit-stop, no afterimages: a brief glint flash at each struck target on the same rhythm. The count survives; the violence calms.",
      },
    },
    {
      id: "mcq-strobe-safety",
      title: "Strobe safety",
      content: {
        type: "multiple-choice",
        question:
          "Bolt 3's finale strobes the whole screen. Under the WCAG 2.3.1 ==three-flash rule==, what hard limit must the gallery build respect?",
        options: [
          "No more than three full-screen flashes in any one-second window",
          "No flash may exceed 50% white in brightness",
          "Flashing is fine as long as the whole effect lasts under five seconds",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "mcq-hit-stop",
      title: "Hit-stop convention",
      content: {
        type: "multiple-choice",
        question:
          "Quadra Slam lands four slashes. Per the community convention for a normal melee hit, roughly how long should each contact's hit-stop freeze last?",
        options: [
          "A full second per hit, so the player can count the strikes",
          "3–5 frames per contact — a blink-length pause that sells weight",
          "Hit-stop should never be used on multi-hit moves",
        ],
        answerIndex: 1,
      },
    },
  ],
  edges: [
    // The -aga trio + the exemplar hang off the tier grammar.
    { from: "tier-escalation", to: "spec-fire-3" },
    { from: "tier-escalation", to: "spec-bolt-3" },
    { from: "tier-escalation", to: "spec-ice-3" },
    { from: "tier-escalation", to: "spec-bio" },
    { from: "tier-escalation", to: "spec-demi" },
    // Drills.
    { from: "spec-bio", to: "mcq-erosion-band" },
    { from: "spec-demi", to: "mcq-radial-suck" },
    { from: "spec-bolt-3", to: "mcq-strobe-safety" },
    { from: "spec-swdtech", to: "mcq-hit-stop" },
    // Shake channel: Fire 3's accent kick → Quake's trauma model → Meteor's
    // per-impact accumulation; Meteor also reuses Fire 3's volley grammar.
    { from: "spec-fire-3", to: "spec-quake" },
    { from: "spec-quake", to: "spec-meteor" },
    { from: "spec-fire-3", to: "spec-meteor" },
    // Palette-as-state: Bio's gradient map + Ice 3's shatter feed Break; the
    // death line continues Break → Doom, with Demi's darkness joining in.
    { from: "spec-bio", to: "spec-break" },
    { from: "spec-ice-3", to: "spec-break" },
    { from: "spec-break", to: "spec-doom" },
    { from: "spec-demi", to: "spec-doom" },
    // Distortion + flash discipline converge on Pearl; Pearl and Fire 3 share
    // grammar with Flare (palette swap + point burst).
    { from: "spec-demi", to: "spec-pearl" },
    { from: "spec-bolt-3", to: "spec-pearl" },
    { from: "spec-pearl", to: "spec-flare" },
    { from: "spec-fire-3", to: "spec-flare" },
    // Layered-light craft flows into the weapon-skill pair.
    { from: "spec-pearl", to: "spec-aura-bolt" },
    { from: "spec-flare", to: "spec-aura-bolt" },
    { from: "spec-aura-bolt", to: "spec-swdtech" },
  ],
};
