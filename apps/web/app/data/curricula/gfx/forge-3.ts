import type { Curriculum } from "@mind-palace/curriculum";

import { ff6Source } from "./_sources";

// Effect Forge III: Grand Cinematics — staged summon-scale sequences. Each spec
// card follows the practicum format (Spell · The look · Decomposition · Build
// plan · Done when · Reduced motion). Effect descriptions derive from the FF6
// esper dossier + cross-series VFX research; build plans target Bevy 0.19.
// Every fullscreen-flash spec cites the WCAG 2.3.1 three-flash rule.
export const gfxForge3: Curriculum = {
  id: "c-gfx-forge-3",
  title: "Effect Forge III: Grand Cinematics",
  source: ff6Source,
  nodes: [
    {
      id: "cinematic-structure",
      title: "Summons Are Timelines",
      content: {
        type: "read",
        markdown:
          "Effect Forge III is the summon tier: effects so big they stop being bursts and become **short films**. Everything you built in Forges I and II — washes, bolts, dissolves, shakes — now gets choreographed across a timeline with named beats.\n\n## The two-beat grammar\nEvery FF6 summon separates ==invocation== from ==payoff==. The battle pauses, the caster poses, and a spinning multicolor **summon orb** blossoms over them — a star-flash burst unique to FFVI. The screen dims (the engine has a dedicated screen-brightness opcode), party sprites and cursors are hidden to clear the stage, and the esper materializes as a **large held portrait on its own dedicated hardware layer**. Only then does the unique payoff play — bolts, washes, beams — and the esper itself is almost never the thing that hits. **Ifrit is the documented exception**: the only esper whose summon sprite has multiple animation frames (he spins).\n\n## Spectacle scales with anticipation\nThe biggest effects in the game — Crusader, Forsaken, Flare Star — are the ones that spend whole phases, even whole *turns*, on telegraphs. The lesson echoes across the series: FF8's Eden runs **72.6 seconds**, the endpoint of the PS1 summon arms race, and FFX ships an optional short-summon mode — the series itself validating reduced-motion variants. The takeaway: ==anticipation, not resolution== is what makes a payoff read as huge, and runtime is a budget you spend deliberately.\n\n## Sequencing in Bevy\nA summon is a phase machine. Give each sequence an enum of phases — `Letterbox`, `Entrance`, `Payoff`, `Dissipate` — store a `Timer` in a component beside it, tick it from `Res<Time>`, and advance the phase when the timer finishes. Systems gate their work on the current phase, so each beat owns its own entities, materials, and camera moves.\n\n- **Letterbox** — two black bars tween in from the top and bottom edges: the cinematic frame\n- **Entrance beat** — dim the stage, slide the portrait in, hold a beat\n- **Payoff beat** — the unique effect, assembled from the forge kit you already own\n- **Dissipate** — bars retract, brightness restores, residue (scorch, embers) lingers\n\n## Harness rules\nEvery sequence lives in the shared gallery scene and honors two non-negotiables: the WCAG 2.3.1 ==three-flash rule== — never more than three general flashes in any one-second window — and a `prefers-reduced-motion` variant that keeps each payoff readable with the motion stripped out.",
      },
    },
    {
      id: "ifrit-hellfire",
      title: "Ifrit: Hellfire",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Hellfire** — SNES name **Inferno**. Ifrit, 26 MP, fire damage to all enemies, spell power 51.\n\n## The look\nUniquely, Ifrit's entrance is animated — he **spins** while every other esper holds a single portrait frame. Then the payoff: a **wall of orange-red flame scrolls across the enemy rank**. On the SNES this is literally a background trick — the engine loads a dedicated BG1 flame-sheet palette for \"inferno\", so the fire is a ==full-width overlay sweeping over the sprites==, not a particle storm.\n\n## Decomposition\nArchetype: **elemental wash** with a flyby flourish. Layers:\n\n- entrance portrait with a spin (the one esper where the entrance itself moves)\n- the wash: one screen-wide quad whose material scrolls fire across the stage\n- ember flecks riding the wash's leading edge\n\n## Build plan\n- Phase machine: `Entrance` (portrait spins in) → `Wash` → `Dissipate`\n- The wash is a `Mesh2d` quad + `MeshMaterial2d` with a custom `Material2d`: UV-scrolled fBm noise, gradient-mapped through an orange-red ramp, additive blend, emissive pushed **above 1.0** so the hot core blooms\n- Sweep the quad across the stage by animating its `Transform` translation over ~0.8s with an ease-out; scroll the noise UVs against the travel direction so the fire boils as it moves\n- Spawn a low-count ember burst at the leading edge each frame (velocity-stretched, gravity off)\n\n## Done when\nThe flame wall crosses the full stage in under a second, reads hot-core-to-smoky-edge (ramp doing the work), blooms without any fullscreen flash, and the stage returns to normal brightness in `Dissipate`.\n\n## Reduced motion\nNo sweep, no spin: crossfade a static warm tint over the enemy side, hold one beat, fade out. The damage beat stays on the same frame it lands in the full version.",
      },
    },
    {
      id: "shiva-diamond-dust",
      title: "Shiva: Diamond Dust",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Diamond Dust** — SNES name **Gem Dust**. Shiva, 27 MP, ice damage to all enemies, spell power 52.\n\n## The look\nShiva's cool-toned portrait holds; then the enemy side is **swallowed in a glittering pale-blue crystalline mist** — drifting sparkle particles and an icy screen tint rather than discrete hits. The chill settles, then fades. Later games escalate the same identity: FFX's Diamond Dust ==flash-freezes the arena and shatters it==, the version modern VFX artists still moodboard for crystal effects.\n\n## Decomposition\nArchetype: **elemental wash**, particle-mist variant, staged in three beats: ==crystal wash → freeze → shatter==. Layers:\n\n- mist: slow alpha-blended drift particles + additive glint sparkles\n- freeze: a fullscreen frost overlay ramping in — the state-change beat\n- shatter: a shard burst with an impact frame and a touch of hit-stop\n\n## Build plan\n- Phases: `Entrance` → `Wash` → `Freeze` → `Shatter` → `Dissipate`, each on its own `Timer`\n- Wash: two particle layers — large soft alpha-blended mist quads drifting slowly, plus small additive glints that flicker via a sine on emissive\n- Freeze: a fullscreen `Material2d` whose frost mask ramps in with `smoothstep`, tinting toward ice-blue and *stopping all drift motion* — stillness is the freeze read\n- Shatter: burst-spawn velocity-aligned shard sprites outward, one 1–2 frame white impact flash, 3–5 frames of hit-stop via `Time::relative_speed`, then shards fall under gravity and erode out\n\n## Done when\nThe three beats are individually legible: motion (wash), stillness (freeze), release (shatter). The single shatter flash keeps the sequence within the three-flash budget.\n\n## Reduced motion\nSkip the shatter burst and hit-stop entirely: mist crossfades in, frost overlay ramps up and back down, no flash. The freeze beat carries the whole payoff.",
      },
    },
    {
      id: "ramuh-judgment-bolt",
      title: "Ramuh: Judgment Bolt",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Judgment Bolt** — SNES name **Bolt Fist**. Ramuh, 25 MP, lightning damage to all enemies, spell power 50.\n\n## The look\nThe old sage holds his frame; the sky flickers, and **jagged blue-white lightning bolts hammer down across the whole enemy rank** — each impact popping a full-screen white flash before the dim resets. The payoff is ==staccato vertical strikes plus strobe==. That strobe is exactly the part a modern build must tame.\n\n## Decomposition\nArchetype: **sky-strike**. Layers:\n\n- bolt pillars: tall vertical beams with a jittered core\n- per-impact emphasis: on the SNES, a fullscreen white flash — in our build, a **bloom pulse** instead\n- afterglow: brief ionized shimmer where each bolt landed\n\n## Build plan\n- Camera: `Camera2d` with `Bloom` (which requires `Hdr` on the camera) and `Tonemapping` — the bloom pulse is the modern flash substitute\n- Bolt: a tall `Mesh2d` quad whose material displaces a bright core line with scrolled noise (the jitter), colored blue-white with emissive far above 1.0\n- Strike loop: a `Timer` in repeating mode drops a bolt every ~0.2s at a random enemy-rank x; each strike spikes the bolt material's emissive for 2–3 frames so ==bloom swells locally== instead of flashing the whole screen\n- Afterglow: a small additive glow sprite at the impact point, fading over ~0.3s\n\n## Done when\nSix-plus strikes land in rhythm, each reads as a distinct hit through bloom pulses alone, and a full-second window never contains more than three general flashes — WCAG 2.3.1 stays green even at full cadence.\n\n## Reduced motion\nOne single bolt, no strobe of any kind: the pillar fades in over 0.4s, holds, fades out, with one gentle bloom swell.",
      },
    },
    {
      id: "mcq-safe-strobes",
      title: "Safe strobes",
      content: {
        type: "multiple-choice",
        question:
          "Judgment Bolt's SNES payoff pops a full-screen white flash on *every* bolt. Which constraint must the modern rebuild satisfy to stay WCAG 2.3.1-safe?",
        options: [
          "Each flash must be additive-blended so it only ever brightens the scene",
          "Flashes must alternate between two complementary colors",
          "No more than three general flashes may occur within any one-second window",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "bahamut-mega-flare",
      title: "Bahamut: Mega Flare",
      content: {
        type: "read",
        markdown:
          '## Spell\n**Mega Flare** — SNES name **Sun Flare**. Bahamut, 86 MP, non-elemental defense-ignoring damage to all enemies, spell power 92. The official description: =="Hits all enemies with a nuclear blast."==\n\n## The look\nBahamut rears against a darkened sky, **gathers light**, and the enemy field **detonates in a swelling white-hot blast** — expanding flash rings, a full fixed-color whiteout, then the burn fading off the after-image. Not bolts, not a wash: one screen-consuming explosion. The series kept escalating this exact shot: FF7\'s Mega → Giga → **Tera Flare** ladder climbs from ground to terrain-lift to a beam fired *from orbit* — camera altitude encoding power tier — and FFX\'s Bahamut charges by ==spinning the wheel on his back==, the canonical "animate a mechanical element during charge" trick.\n\n## Decomposition\nArchetype: **charge-and-release cataclysm**. Phases: ==charge glow → beam → white-out → burn dissolve==. Layers:\n\n- charge: converging additive motes + a growing glowsphere\n- beam: one thick horizontal beam crossing into the enemy field\n- white-out: a single fullscreen ramp up and back down — one sustained event, **not** a strobe\n- burn dissolve: the after-image eroding away\n\n## Build plan\n- Phases on timers: `Charge` (~1.2s) → `Beam` (~0.4s) → `Whiteout` (~0.5s) → `Burn` (~1.5s)\n- Charge: burst-spawn motes with inward radial velocity toward a charge point; scale a glowsphere quad up while ramping emissive along a `pow` curve — energy visibly accumulating\n- Beam: stretched quad, UV-scrolled core, emissive spike driving `Bloom` (camera already `Hdr`)\n- Whiteout: fullscreen white quad whose alpha ramps 0 → 1 → 0 over half a second — a single slow flash event well inside the three-flash budget\n- Burn: a noise-threshold ==dissolve erosion== sweeping the blast after-image out, glowing rim at the erosion edge\n\n## Done when\nThe charge visibly *gathers* (motes converge, glow swells), the release lands as one overwhelming beat, and the whiteout counts as exactly one flash event in any audit.\n\n## Reduced motion\nKeep the charge glow (slow, under-a-heartbeat pulse), skip the whiteout entirely, and land a dimmer beam with the burn dissolve as the payoff.',
      },
    },
    {
      id: "odin-zantetsuken",
      title: "Odin: Zantetsuken",
      content: {
        type: "read",
        markdown:
          '## Spell\n**Zantetsuken** — SNES name **Atom Edge**. Odin, 70 MP, attempts instant Death on all enemies, hit rate 110. Official read: =="Cleaves all enemies in two."==\n\n## The look\nThe battlefield drops away into a **blue HDMA gradient backdrop** (the engine literally names "blue gradient lines" for Odin/Raiden). Odin **charges on horseback across the enemy line**, a single **white slash-streak snaps across the screen**, the flash clears — and every victim splits and dissolves. FF8 perfected the grammar: the kanji 斬・鉄・剣 appear as typographic cards and the cut **replays three times from different angles**, with the bisect-slide death animation as the payoff. This spec is THE ==impact-frame masterclass==.\n\n## Decomposition\nArchetype: **instant-death cut**. The whole effect is timing:\n\n- anticipation: gradient backdrop drops in, rider crosses — motion is the message\n- the cut: a 1–3 frame white slash-streak — the impact frame\n- **the beat**: a deliberate hold after the flash, before anything reacts\n- bisect: the target splits into two halves that slide apart and fade\n\n## Build plan\n- Phases: `Backdrop` → `Ride` → `Cut` → `Beat` → `Bisect`\n- Backdrop: fullscreen vertical-gradient `Material2d` (the HDMA-gradient descendant) crossfading the arena out\n- Ride: Odin sprite tweened across the stage on an ease-in — accelerating *into* the cut\n- Cut: an authored crescent streak quad, white with emissive above 1.0, alive for at most 3 frames — one flash event\n- Beat: 3–5 frames of hit-stop via `Time::relative_speed`, then hold ~0.2s of stillness — the pause is what sells the cut\n- Bisect: swap each target for two half-sprites cropped from its texture; slide the halves apart a few pixels on an ease-out while both erode to nothing\n\n## Done when\nA viewer can feel the order: streak, silence, *then* the halves separate. If the bisect starts on the same frame as the flash, the beat is broken — fix the timeline, not the art.\n\n## Reduced motion\nNo flash, no hit-stop: the slash line fades in as a held glowing arc, and the halves separate slowly under a crossfade. The read — one clean cut — survives without a single fast event.',
      },
    },
    {
      id: "mcq-impact-recipe",
      title: "The impact recipe",
      content: {
        type: "multiple-choice",
        question:
          "At the frame Zantetsuken connects, which ordering of the game-feel channels follows the standard impact recipe?",
        options: [
          "screen shake → particles → hit-stop → flash",
          "hit-stop → screen shake → flash → particles",
          "flash → particles → screen shake → hit-stop",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "phoenix-rebirth",
      title: "Phoenix: Flames of Rebirth",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Flames of Rebirth** — SNES name **Life Giver**. Phoenix, 110 MP, revives all KO'd allies at 25% of max HP.\n\n## The look\nThe firebird **sweeps across the screen trailing a bright red ribbon of flame** — the wiki documents the trail explicitly. Embers sift down over the fallen, the orange wash **cools to gold**, and KO'd sprites rise as the glow clears. It is destruction-palette fire re-purposed as resurrection — the clearest proof of the FF6 color language: ==register lives in palette and tempo==, not in the primitive. Heals are slow, warm, and ally-anchored; the same shower that is a joke with cats is a benediction with feathers.\n\n## Decomposition\nArchetype: **flyby × party aura**. Layers:\n\n- the flyby: a sprite traveling an arc, with a flame ribbon trailing it\n- ember fall: sparse particles drifting down onto the party\n- the color turn: orange → gold as the meaning flips from fire to blessing\n- the rise: KO'd allies lifting and brightening\n\n## Build plan\n- Phases: `Flyby` (~1s) → `Embers` (~1.5s) → `Rise`\n- Flyby: tween the bird sprite along a shallow arc with ease-in-out; spawn the trail **distance-based** (a segment per distance moved, not per frame) so the ribbon stays continuous at any speed — additive flame quads that shrink and cool as they age\n- Embers: low-rate particle spawn above the party, gravity plus drag for a sift (not a fall), each ember flickering via a slow sine\n- The color turn: all flame layers sample one shared gradient ramp; ==scroll the ramp lookup== over the phase so every layer cools orange → gold in lockstep — the palette-cycling descendant doing narrative work\n- Rise: KO'd ally sprites ease upward a few pixels while alpha and a warm tint restore\n\n## Done when\nThe whole sequence pulses *below* a heartbeat (under 60 BPM) — it must feel like a blessing, not an attack. No flash anywhere; the brightest moment is the gold turn.\n\n## Reduced motion\nNo flyby: a warm glow crossfades over the party, embers appear at fixed positions with a gentle flicker, and the gold turn plus the rise carry the payoff.",
      },
    },
    {
      id: "alexander-divine-judgment",
      title: "Alexander: Divine Judgment",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Divine Judgment** — SNES name **Justice**. Alexander, 90 MP, holy damage to all enemies, spell power 114.\n\n## The look\nThe mechanical fortress materializes and **columns of white-gold holy light slam down across the enemy rank**. The SNES engine gives \"justice\" a dedicated BG3 palette *and* ==flips BG3 to high priority== so the beams render **over** the enemy sprites; the screen washes toward white at the peak. FF9 stages the same identity at architectural scale — four seraphic wings unfurling from Alexandria's castle before a salvo of holy rays.\n\n## Decomposition\nArchetype: **sacred pillar / ray salvo**. Layers:\n\n- gradient sky: the backdrop shifts toward a gold-white heaven — the HDMA-gradient descendant\n- pillars: staggered vertical light columns, soft-edged, drawn *above* the targets\n- peak wash: one ramped brightening toward white — a single slow event, not a flash\n\n## Build plan\n- Phases: `Sky` → `Pillars` → `Wash` → `Dissipate`\n- Sky: fullscreen vertical-gradient `Material2d` crossfading from arena tones to warm gold\n- Pillar: a tall `Mesh2d` quad per column — vertical gradient alpha (soft top, bright base), additive blend, emissive above 1.0 so each slam swells the camera's `Bloom`; give pillars a higher z than the enemy sprites — the modern equivalent of the BG3 priority flip\n- Stagger: a repeating `Timer` drops pillars left-to-right ~0.15s apart, each scaling in vertically with an ease-out squash on landing\n- Wash: a white overlay ramping to ~60% opacity and back over ~0.8s at the final pillar\n\n## Done when\nPillars visibly render over the targets, the stagger reads as a salvo rather than one flash, and the peak wash is the sequence's single fullscreen brightness event.\n\n## Reduced motion\nPillars fade in at full height instead of slamming, in one group instead of a stagger; the wash is halved in opacity and slope. Gold-on-white carries the holy register with zero fast motion.",
      },
    },
    {
      id: "crusader-cleansing",
      title: "Crusader: Cleansing",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Cleansing** — SNES name **Purifier**. Crusader (JP *Jihad*, renamed *Doomsday* in the Pixel Remaster), 96 MP. Non-elemental damage to **all enemies AND all allies**, spell power 190 — the highest of any player-accessible ability.\n\n## The look\nThe longest summon in the game and the only **three-part** one: the Pixel Remaster documents Cleansing Pt1/Pt2/Pt3 as \"the triad espers battling amongst each other.\" Three war-gods — Demon on the left, Fiend on the right, Goddess upper-middle — **turn their attacks on one another**, raining serial explosions over the entire field through repeated whiteouts and shakes. The engine gives it bespoke plumbing: a dedicated `Load Extra Esper Palette` opcode and a matching restore for the character palettes, because ==your own party is inside the blast's color math==.\n\n## Decomposition\nArchetype: **cataclysm**, maximal form. This spec is a choreography problem, not a shader problem:\n\n- three persistent actors with their own positions and attack beats\n- serial explosions: one explosion prefab, respawned with jitter, on a cadence\n- accumulating screen shake and a stage-wide wash that tints allies too\n\n## Build plan\n- A three-phase state machine (`Phase1` → `Phase2` → `Phase3`), each phase owning one actor's volley and lasting ~1.5s\n- Actors: three sprites eased into a triangle formation during the entrance; each phase, one actor lunges (small anticipation tween) and fires at another\n- Explosion prefab: flash sprite (1–2 frames, small, local) + expanding ring + debris burst + smoke puff — spawn it on a repeating `Timer` with positional jitter so hits read as *serial*, never simultaneous\n- Shake: trauma-decay model, adding a small trauma per explosion so violence **accumulates** across phases instead of resetting\n- The friendly-fire read: the stage-wide wash overlay covers the party sprites too — allies visibly stand inside the event\n\n## Done when\nA viewer can count three distinct phases; explosions land in cadence (never two on the same frame); accumulated shake peaks in Phase 3; and the local flashes are spaced so any one-second window stays within the three-flash budget.\n\n## Reduced motion\nCollapse to a single-phase summary: the triad fades in, one slow stage-wide wash rises and falls, three quiet explosion puffs land without flashes or shake.",
      },
    },
    {
      id: "light-of-judgment",
      title: "Kefka: Light of Judgment",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Light of Judgment** — Kefka's story-scale weapon: a **destructive beam sent down from atop his tower that cuts a path of flame across the ground**, used on Mobliz, South Figaro, Narshe, and Tzen. When idle it manifests as **four glowing white orbs** bobbing near Kefka — two on a long path, two on a short one. It is the definitive god-ray-sweeping-the-world effect: the ==beam archetype at world scale==.\n\n## Decomposition\nArchetype: **sustained beam + ground burn**. Two jobs with opposite lifetimes:\n\n- the beam: continuous, sweeping, *alive* — constant intensity with subtle flicker, never a strobe\n- the burn: **permanence** — scorch and flame that outlive the beam and prove it happened\n\n## Build plan\n- Phases: `Idle` (orbs) → `Sweep` (~2s) → `Aftermath`\n- Idle orbs: four small additive glow sprites bobbing on two different sine paths — the calm-before read\n- Beam: a quad stretched from a fixed sky anchor to a ground contact point; each frame, ease the contact point's x across the stage and re-aim the quad (rotation + scale from the two endpoints) — the sweep is the choreography\n- Beam life: scroll noise along the beam's length and wobble its width a few percent; keep intensity constant — ==sustained is the opposite of strobing==, and a beam that flickers hard re-enters flash territory\n- Ground burn: at the contact point, stamp persistent scorch sprites and spawn brief flame flipbooks along the swept path; scorches stay after the beam ends, cooling their emissive over ~2s\n\n## Done when\nThe beam crosses the stage in one continuous motion, the flame path trails exactly where the contact point traveled, and the scorch line persists into `Aftermath` — the effect's history is readable after it is over.\n\n## Reduced motion\nNo sweep: the beam fades in at one fixed position, holds, fades out, and the scorch line crossfades in beneath it. The orbs bob at half amplitude.",
      },
    },
    {
      id: "flare-star",
      title: "Atma: Flare Star",
      content: {
        type: "read",
        markdown:
          '## Spell\n**Flare Star** — Atma/Ultima Weapon\'s ultimate on the Floating Continent. Fire-elemental, unblockable, ignores defense; damage is a random party member\'s level × 80 split among targets. The fight telegraphs it openly: the boss buffs itself and =="begins charging energy for its ultimate attack"== across turns before release.\n\n## The look\nGathering points of orange light **condense above the field into a star** that detonates in a fiery all-party burst — the enemy-side mirror of Mega Flare. Its whole identity is the ==two-turn telegraph==: anticipation stretched so long it becomes a gameplay window (heal, shield, brace) rather than a visual beat.\n\n## Decomposition\nArchetype: **charge-and-release cataclysm**, telegraph-forward. Phases: ==orbiting charge orbs → converge → star → detonation==. Layers:\n\n- charge orbs circling a gather point — orbital motion says "energy being bound"\n- convergence: radii easing to zero as the orbs fall inward\n- the star: a glowsphere swelling at the gather point\n- detonation: burst + expanding ring + one ramped whiteout\n\n## Build plan\n- Phases: `Orbit` (~1.5s) → `Converge` (~0.6s) → `Star` (~0.4s) → `Detonate`\n- Orbit: spawn 8–12 additive orbs, each holding a polar angle and radius around the gather point; per frame advance the angle by speed × delta and place the orb from polar coordinates — an ==orbit force== in its simplest form\n- Converge: ease every orb\'s radius toward zero (ease-in — accelerating inward reads as suction); shrink and brighten orbs as they arrive\n- Star: scale a glowsphere quad up while ramping emissive along a `pow` curve; bloom does the swelling\n- Detonate: spark burst + expanding ring mesh + a single fullscreen ramp (0 → 1 → 0 over ~0.5s) — one flash event, mirroring Mega Flare\'s discipline\n\n## Done when\nThe orbit phase alone communicates "something huge is coming" before any brightness peaks; convergence visibly accelerates; and the detonation is the sequence\'s only fullscreen event.\n\n## Reduced motion\nOrbs fade in already at their final converged positions (no spin, no suction), the star swells slowly, and the detonation is replaced by a single soft bloom pulse.',
      },
    },
    {
      id: "mcq-orbit-charge",
      title: "Reading the charge",
      content: {
        type: "multiple-choice",
        question:
          "Flare Star opens with charge orbs circling a central gather point before they converge. Which particle-system ingredient produces the circling motion?",
        options: [
          "An orbit/vortex force — each orb advances a polar angle around the charge point",
          "A velocity-aligned stretched billboard on each orb",
          "A distance-based spawn rate on the emitter",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "ultima-dome",
      title: "Ultima: The Dome",
      content: {
        type: "read",
        markdown:
          "## Spell\n**Ultima** — the series' agreed-upon final spell. The canonical look: ==\"an expanding dome of magical energy\"== whose color shifts between **blue and green**. FF6 codified the dome and every game since kept it; FF7's version is the only spell there that cuts between **three camera angles** — the game's own cinematography flagging it as the ceiling.\n\n## The look\nA point of light at the center of the field swells into a translucent dome that **expands to swallow the screen**, edge burning bright, interior shimmering, then collapses into afterglow. On the SNES the dome's silhouette came from the PPU's ==circle window masks== — movable-origin, growing-radius hardware shapes. Our build uses the direct descendant: a **circle SDF** evaluated per-pixel.\n\n## Decomposition\nArchetype: **dome detonation** — the apex spec. Phases: ==charge → dome expansion → after-wash==. Layers:\n\n- charge: a compressed core glow at the epicenter\n- the dome: a fullscreen material rendering an expanding SDF ring — crisp at every radius\n- edge fire: HDR emissive on the ring band driving full bloom\n- after-wash: the dome's interior tint lingering and fading\n\n## Build plan\n- Phases: `Charge` (~0.8s) → `Expand` (~1.2s) → `Wash` (~1s)\n- The dome is a fullscreen `Mesh2d` quad with a custom `Material2d`; its fragment shader evaluates a ring SDF — `abs(length(p - center) - radius) - width` — and a `smoothstep` over the distance antialiases the edge at any scale\n- Drive `radius` from a uniform: an ECS system eases it outward each frame and writes it through `Assets<YourMaterial>`; in the WGSL, the material's uniform block binds via the `@group(#{MATERIAL_BIND_GROUP})` shader-def placeholder — never a hand-written group index\n- Color the ring band green-blue with emissive well above 1.0 — with `Bloom` on the `Hdr` camera, the edge *burns*; oscillate the hue between green and blue along the expansion, honoring the series look\n- Interior: a faint tint plus subtle UV distortion inside the ring (energy, not glass); after-wash ramps it out\n\n## Done when\nThe edge stays razor-crisp from radius 10 to radius 1000 — the SDF proof (a scaled texture would blur). The three phases are readable, and the expansion itself is the spectacle: no fullscreen flash anywhere in the sequence.\n\n## Reduced motion\nNo expansion: a radial gradient crossfades in from the epicenter to full coverage, holds with the green-blue oscillation slowed under a heartbeat, and fades. The dome *shape* still reads; only the motion is gone.",
      },
    },
    {
      id: "mcq-dome-sdf",
      title: "The dome edge in WGSL",
      content: {
        type: "multiple-choice",
        question:
          "This mask drives Ultima's dome edge. As the `radius` uniform grows each frame, what does the rendered ring do?",
        language: "wgsl",
        code: `fn dome_ring(p: vec2f, center: vec2f, radius: f32, width: f32) -> f32 {
    let d = abs(length(p - center) - radius) - width;
    return 1.0 - smoothstep(0.0, 0.01, d);
}`,
        options: [
          "It blurs and pixelates as it grows, like a scaled-up texture",
          "It expands outward while the edge stays crisp at a constant width",
          "It contracts toward `center` because the distance term inverts",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "capstone-gallery",
      title: "Capstone: Ship the Gallery",
      content: {
        type: "read",
        markdown:
          "Two deliverables close the forge: **one original effect you design yourself**, and **the whole gallery live on GitHub Pages**.\n\n## Design your own\nPick a fantasy — your own summon, your own ultimate — and run the full decomposition method before touching code:\n\n- **Read it in time first**: where is the anticipation, where does it pop, how does it die? Name the phases\n- **Break it into layers**: every production effect is a stack of independent elements, each with its own lifetime, blend mode, and curves\n- **Name each layer's primitive**: billboard, ribbon, beam, effect mesh, decal, post pass\n- **Name each layer's shader recipe**: scroll, distort, erode, gradient-map, fresnel, SDF mask\n- **Choreograph the game-feel channels**: hit-stop → shake → flash → particles, in that order, within the flash budget\n- **Block it in gray**, nail the timing with placeholder quads, and only then polish the art\n\nOne sentence to keep: ==Element = primitive × texture × shader recipe × curves × blend × timing window== — and the effect is the sum of elements choreographed across phases.\n\n## Ship it\nThe gallery goes to the browser exactly the way this path taught:\n\n- Build for `wasm32-unknown-unknown`; run `wasm-bindgen` with the CLI version matching the crate, then **`wasm-opt` after `wasm-bindgen`** — never before\n- Ship the ==WebGL2 compatibility floor== build; WebGPU remains an optional second build behind `navigator.gpu` detection\n- Set `AssetMetaCheck::Never` so asset fetches don't 404 on `.meta` files, and bind the canvas via the window's `canvas` selector\n- GitHub Pages serves it as pure static hosting — the same model as this repo\n\n## The final audit\nWalk every effect in the gallery and check, one by one:\n\n- **Three-flash rule**: no one-second window anywhere contains more than three general flashes — count the whiteouts, impact frames, and bolt strikes together\n- **Reduced motion**: with `prefers-reduced-motion` set, every sequence still delivers its payoff — calm crossfades, held glows, zero fast events\n- **The beat survives**: Odin's pause, Flare Star's telegraph, Phoenix's slow gold turn — the timing signatures still read in both variants\n\nWhen the audit is green, you have done what this path promised: gone from picturing a Final Fantasy effect to **decomposing, building, and shipping it**.",
      },
    },
  ],
  edges: [
    { from: "cinematic-structure", to: "ifrit-hellfire" },
    { from: "cinematic-structure", to: "shiva-diamond-dust" },
    { from: "cinematic-structure", to: "ramuh-judgment-bolt" },
    { from: "ramuh-judgment-bolt", to: "mcq-safe-strobes" },
    { from: "ifrit-hellfire", to: "bahamut-mega-flare" },
    { from: "ramuh-judgment-bolt", to: "bahamut-mega-flare" },
    { from: "shiva-diamond-dust", to: "odin-zantetsuken" },
    { from: "odin-zantetsuken", to: "mcq-impact-recipe" },
    { from: "ifrit-hellfire", to: "phoenix-rebirth" },
    { from: "ramuh-judgment-bolt", to: "alexander-divine-judgment" },
    { from: "bahamut-mega-flare", to: "crusader-cleansing" },
    { from: "odin-zantetsuken", to: "crusader-cleansing" },
    { from: "alexander-divine-judgment", to: "light-of-judgment" },
    { from: "bahamut-mega-flare", to: "flare-star" },
    { from: "flare-star", to: "mcq-orbit-charge" },
    { from: "crusader-cleansing", to: "ultima-dome" },
    { from: "flare-star", to: "ultima-dome" },
    { from: "ultima-dome", to: "mcq-dome-sdf" },
    { from: "ultima-dome", to: "capstone-gallery" },
    { from: "light-of-judgment", to: "capstone-gallery" },
    { from: "phoenix-rebirth", to: "capstone-gallery" },
  ],
};
