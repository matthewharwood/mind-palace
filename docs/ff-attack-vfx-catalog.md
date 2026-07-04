# Final Fantasy Attack VFX Catalog

**A complete reference catalog of Final Fantasy attack, spell, and summon visual effects — the raw material for a graphics-programming curriculum.**

Compiled 2026-07-03 from a verified multi-source research pass (Final Fantasy Wiki via MediaWiki API, ff6hacking.com engine disassembly docs, the `everything8215/ff6` disassembly, SNESdev hardware documentation, Square Enix FF7R developer material, and the professional real-time-VFX literature). This file is the durable deliverable: **every effect in here is a candidate build target** for the Effect Forge curriculum — graphics programming in Rust/Bevy/WGSL, compiled to WASM and run in the browser.

---

## 1. What this catalog is and how to read it

### 1.1 Purpose

This is a *learning inventory*, not nostalgia. Final Fantasy VI (SNES, 1994) built one of the most legible VFX languages in games out of roughly six hardware primitives; the later 3D games (FF IV–X, FF7 Remake/Rebirth) extended that language into the modern shader/particle toolbox. Every entry below is catalogued the same way:

1. **What it looks like** — a phased visual description (buildup → delivery → impact → dissipation where known).
2. **What archetype it is** — a tag from the taxonomy in §2, which names the *shape* of the effect independent of any engine.
3. **How it was implemented** (for FF6 material) — the actual SNES techniques involved, grounded in the engine disassembly (§8).

The curriculum path is: pick an effect → identify its archetype → decompose it into phases and primitives (§2, §9) → build it in WGSL/Bevy. The retro → modern mapping table (§9) is the bridge; the SNES appendix (§8) is the "how the original hardware did it" ground truth.

### 1.2 Name conventions

Every FF6 ability is given as **SNES-US / GBA-modern**:

- **SNES-US** = the original *Final Fantasy III* (US SNES, 1994) names, squeezed into a 6-character field (`Bserk`, `Rflect`, `Antdot`, `Quartr`, `Haste2`). The PlayStation Anthology release shares this script.
- **GBA-modern** = *FF VI Advance* (2007), the 2014 mobile/Steam port, and the *Pixel Remaster* (2022), which all share the modern name set (`Berserk`, `Reflect`, `Poisona`, `Graviga`, `Hastega`).

Japanese names are given where they matter (censorship history, name-restoration cases like GrandTrain → Grand Trine). MP costs are SNES values; cross-source discrepancies are footnoted where they exist.

### 1.3 Honesty markers — the † convention

The source dossiers distinguish text-verified facts from descriptions reconstructed from play knowledge and footage memory. This catalog carries that distinction forward with a single marker:

> **†** — *footage-unverified.* This visual description is reconstructed from well-documented gameplay knowledge, sprite-sheet familiarity, and screenshot evidence, **not** from a text source that narrates the animation beat-by-beat. It is reference-grade for VFX design (color, composition, and archetype are reliable), but verify against footage before treating any † line as pixel-exact.

Everything *not* marked † is backed by a fetched text source: official in-game descriptions (quoted in *italics*), Final Fantasy Wiki prose, engine-disassembly opcode comments that name the effect directly, or screenshot verification performed during the research pass. Names, mechanics, MP costs, and numbers are source-backed throughout, including on † entries — the marker applies only to animation choreography.

### 1.4 Scope

- **FF6 Magic** — all 54 SNES-era spells (24 Attack + 9 Healing + 21 Effect). The three GBA-only spells (Flood, Gravija, Valor) are intentionally excluded from the core count and noted in passing.
- **FF6 Espers** — all 27 SNES magicite summons, plus the 4 GBA/2014 additions as an appendix.
- **FF6 Desperation Attacks** — all 12, plus boss signature effects (Atma/Ultima Weapon, Kefka, Phantom Train, Ultros).
- **FF6 skill families** — SwdTech/Bushido (8), Blitz (8), Tools (8), Dance (8 dances / 24 constituent moves), Slot (8 outcomes), Lore (24), Rage and Sketch standouts.
- **Cross-series icons** — ~32 effects from FF IV, V, VII, VIII, IX, X, and FF7 Remake/Rebirth as the modern reference.
- **Technical appendices** — how the SNES rendered all of it, the retro → modern technique mapping, and working notes (IP posture, photosensitivity, sources).

---

## 2. The VFX archetype taxonomy

These archetype names are used as tags throughout the catalog. Each row gives a one-line definition and the modern technique stack that implements it — the vocabulary professional real-time VFX artists use to decompose effects (billboards, ribbons, flipbooks, effect meshes, decals, post passes; UV scroll/distortion, alpha erosion, gradient-map LUTs, fresnel, HDR emissive + bloom, SDF masks).

The general decomposition formula underneath every archetype:

> **Element = Primitive × Texture(s) × Shader recipe × Curves-over-life × Blend mode × Timing window**
> **Effect = Σ Elements, choreographed across anticipation → delivery → impact → dissipation, + game-feel channels (shake / hit-stop / flash / sound)**

### 2.1 Archetype table

| Archetype | One-line definition | Modern technique stack |
|---|---|---|
| **Projectile + burst** | Object(s) travel from caster to target, then detonate | Billboard head + ribbon trail; burst emitter, flash sprite (1–3 frames), shockwave ring mesh, decal at impact |
| **Projectile volley / spray** | Many small projectiles streaming at target(s) | Rate/burst emitters with velocity-aligned stretched billboards; per-hit micro flashes |
| **Converging ring + burst** | Particles orbit/contract onto a point, then release | Burst emitter with negative radial velocity + ease-in curves; central detonation flash |
| **Fullscreen elemental wash** | A screen-wide elemental sheet (flame wall, ice curtain, flood) sweeps the field | Scrolling additive overlay sheet (UV pan), gradient-map LUT for element recolor, full-screen color-grade kick |
| **Beam / pillar of light** | Sustained vertical or screen-crossing light column drawn over everything | Cylinder/quad-chain geometry with scrolling UVs, HDR emissive + bloom, godray compositing, high draw priority |
| **Sky-strike** | Bolts/objects hammer down from the top of the screen with punctuated flashes | Velocity-stretched billboards, staggered spawns, 1-frame full-screen additive flashes, branching emissive ribbons for lightning |
| **Sky-fall barrage** | Many discrete projectiles raining from a torn-open sky | Staggered mesh-particle spawns on arcs; impact decals, per-rock camera shake, skybox takeover |
| **Rising particles** | Motes/bubbles/sparkles drift upward on or around the target | Rate emitter + buoyancy force, size/alpha curves over life; sub-60 BPM pulse for heals |
| **Falling particles / sparkle veil** | A curtain of glints or droplets rains down | Rate emitter + gravity/drag, soft-particle depth fade, gradient-mapped tint |
| **Target overlay** | A discrete object (glyph, lens, orb, bubble) materializes on the target and holds | Fixed-orientation sprite or flipbook anchored to target; scale/alpha ease-in-hold-out |
| **Screen distortion** | The image itself warps — waves, ripples, suction | Screen-space UV-displacement post pass (sine wave = HDMA descendant; radial = shockwave), flow maps |
| **Drain transfer** | A particle stream siphons from target to caster (or reverse) | Particle stream along a spline between two actors; additive motes, arrival glint, easing along path |
| **Ground upheaval** | Terrain violence — fissures, eruptions, sustained shake | Vertex displacement on ground mesh, debris mesh particles, trauma-decay camera shake, dust alpha-blend layer |
| **Object shower** | Discrete objects (cats, feathers, needles, cards) tile the screen — comedic or gentle | Mesh/sprite particle rain with arcs and bounce collision; register set by palette + easing (gag = bouncy, blessing = slow) |
| **Party aura / buff shimmer** | Effect lands on allies: rising sparkles, barrier glints, gradient scans | Attached looping emitters, fresnel rim shells, gradient-scan bands, gentle timing (heartbeat rule: <60 BPM reads benevolent) |
| **Barrier geometry** | A visible shield object — plate, dome, lattice — forms and fades | Fresnel force-field shader + depth-intersection edge glow; particle lattice variant uses point-sprite shells |
| **Song / ripple** | Sine-wave motion and palette shifts rendered *through the target sprites* | Sine-modulated position/vertex offsets on targets + palette LUT shift; the payoff lives on the victims |
| **Transformation / dissolve** | Target-centric state change: petrify, morph, mosaic shatter, alpha fade | Dissolve/erosion shader with burning edge, palette LUT swap (grayscale = stone), pixelation post, mesh/sprite swap |
| **Sprite mutation** | The target's own representation is manipulated — flipped, levitated, tinted, hidden | Material/tint override for N frames, transform offsets, alpha fade; the cheapest and most characterful channel |
| **Apparition / summon-object** | A figure or symbol (reaper, glyph disc, tiger) manifests as the effect | Sprite-cameo actor with entrance/exit choreography; instancing + tint variants for crowds |
| **Flyby / rider sweep** | The summon itself crosses the field as the payload; motion is the message | Actor path traversal + trail mesh, slash impact frame, background gradient stage |
| **Expanding dome** | A hemispherical energy shell inflates to swallow the field, then whites out | Dome mesh scale-over-life + fresnel edge glow, interior particle rain, refraction inside the shell, whiteout via HDR flash |
| **Cataclysm** | Multi-phase screen-consuming sequence: telegraph → charge → serial explosions → whiteout | Authored multi-phase timeline; charge visualization, serial burst layers, post takeover; spectacle scales with anticipation |
| **Charge-and-release** | Long visible charge (glowing maw, spinning wheel, gathering sphere) → single huge release | Converging particles + growing glowsphere (inverse fresnel + HDR emissive ramp) → beam/burst payoff |
| **Cosmic cutaway** | The camera abandons the arena; the effect plays at planetary scale | Authored camera sequence, skybox/environment takeover, escalating scale cuts |
| **Orbital cannon** | A beam charged in/from space, fired down through the atmosphere | Vertical camera language (ground → sky → orbit), atmosphere-entry beam with bloom halo |
| **Dimension shift** | Targets are pulled into the effect's own pocket world | Full-scene palette/environment swap (the modern "domain expansion"), portal entrance, return snap |
| **Blade flurry** | Superspeed multi-hit melee with motion trails, ending on one emphatic finisher | Teleport dashes, trail meshes with emissive gradients, per-hit micro camera cuts, final-hit hold (hit-stop + slow-mo) |
| **Instant-death cut** | A single clean slash; the target bisects and slides apart | Hit-stop, white slash-streak, cap-slice geometry (bisect-slide), typographic impact frames |
| **Reaper omen** | Death personified — reaper, skull, mirror, countdown numerals | Countdown as diegetic UI, apparition entrance, delayed-kill choreography, jump-scare framing |
| **Mechanical / aleatory spectacle** | Gameplay chance rendered as VFX — reels, gauges, coin flips | Diegetic UI as the effect's first act; randomized multi-hit payloads keyed to the UI outcome |
| **Sacred pillar / ray salvo** | Vertical white-gold light columns or converging holy rays | Light-shaft compositing, soft bloom, particulate dust-in-godray; more a lighting effect than a particle effect |
| **Toxic cloud / bubble** | Bubbling sludge, gas, rising green orbs — the poison-family signature | Alpha-blended gas volume + additive emissive bubbles; palette (green-violet) is the identity; bubbles carry the DoT |
| **Screen palette event** | The whole screen's color state is the effect: flash, tint, swap, strobe | Full-screen additive flash / color-grade kick / LUT swap; **photosensitivity-gated** (see §10.2) |

### 2.2 The four-beat phase structure

Every archetype above is choreographed over the professional four-phase model (GDC VFX Bootcamp vocabulary — also called wind-up / climax / fall-off):

| Phase | Also called | Job | Typical tools |
|---|---|---|---|
| **Anticipation** | wind-up, charge-up, telegraph | Signals "incoming"; doubles as gameplay telegraphing | 0.2–2 s. Converging particles, growing glow, inward suction |
| **Delivery** | travel, projectile phase | Moves energy from source to target | Projectile head + trail, beams |
| **Impact** | the pop, climax | The payoff — brightest, biggest, shortest | 1–6 frames peak. Flash, burst, shockwave, hit-stop, shake |
| **Dissipation** | fall-off, aftermath | Dies gracefully; sells weight and permanence | 0.5–5 s. Lingering smoke, embers, decals, erosion-out |

FF6's big spells already follow this exactly: *anticipation* (palette/background shift) → *build* (geometry/particle growth) → *climax* (flash/whiteout/shake) → *restore*. Small spells skip straight to a one-second overlay — the "instant impulse" timing class (responsiveness beats telegraphing on basic attacks).

### 2.3 FF6's color language (used consistently across all 100+ effects)

| Meaning | Palette |
|---|---|
| Fire | orange / gold |
| Ice | blue-white |
| Lightning | blue at tier 1 → gold at tier 3 |
| Poison | green (never leaves green-violet, in any FF, in 35 years) |
| Holy | white / pale blue |
| Gravity / void | black + violet |
| Healing | blue-white, green, gold |
| Buffs | warm (physical defense) vs cool (magic defense) |
| MP | pink |
| Kill register | fast, white-flash, enemy-anchored |
| Heal register | slow, warm, ally-anchored |


---

## 3. Final Fantasy VI — Magic: all 54 spells

The SNES/US release carries **54 learnable Magic spells** in three schools: **Attack ("Black", 24)**, **Healing ("White", 9)**, **Effect ("Gray/Support", 21)**. The count is triple-verified across GameFAQs, Caves of Narshe, and StrategyWiki; the three GBA-only additions (Flood, Gravija, Valor — taught by GBA-only espers) are excluded.

**Casting grammar (applies to every spell):** a two-beat rhythm — the caster raises arms in the cast pose while their sprite pulses with a colored glow (White/Effect magic adds a dedicated sparkle-gather intro, engine opcode `$0A`), then the spell effect proper plays on the target(s). Simple spells run well under two seconds; the endgame set pieces (Ultima, Meteor, X-Zone, Quake, W Wind, Merton) run several seconds in multiple phases.

Every visual description below was verified against a battle screenshot (SNES or GBA frame — same animation scripts, slightly brighter GBA palette) during the research pass; engine-technique attributions come from the ff6hacking.com battle-animation disassembly (§8).

### 3.1 Attack Magic (Black) — 24 spells

| # | SNES-US → GBA-modern | MP | Element | Visual (phased) | Archetype | SNES techniques |
|---|---|---|---|---|---|---|
| 1 | **Fire** → Fire | 4 | Fire | Two-to-three small orange-yellow flame tongues flicker upward directly on the target sprite for ~1 s, faint warm tint, no screen effect. Caster glow → flame tufts ignite → quick fade. | Target overlay — flame burst | Sprite-frame overlay on target; target palette tint |
| 2 | **Fire 2** → Fira | 20 | Fire | A ring of small fireballs materializes around the target and spirals inward; on convergence a tall golden flame column erupts with an orange palette flash on the target. Ring spawn → contracting spiral → blaze column + flash → fade. | Converging ring + burst | Multi-sprite thread motion (polar movement ops); target palette flash |
| 3 | **Fire 3** → Firaga | 51 | Fire | Several large red-orange bomb-like orbs arc toward the enemy group, then detonate into a white-cored conflagration washing over the whole enemy side; orange screen flash + light shake. Orb volley → multi-detonation → group-wide fire wash → embers fade. | Projectile volley + fullscreen wash (fire) | Vector-driven projectile threads; color-math orange screen flash; scroll shake |
| 4 | **Ice** → Blizzard | 5¹ | Ice | A diagonal jet of pale blue-white crystalline mist descends onto the target; glinting shards coalesce into a small spiky crystal on the sprite, which shatters into white glints. Cold blue cast on the target. | Particle spray + crystal encasement + shatter | Sprite overlay spray; target tint |
| 5 | **Ice 2** → Blizzara | 21 | Ice | A single large jagged ice boulder grows up from the ground and fully encases the target — the enemy visible tinted blue inside the translucent block — then bursts apart in white shards with a blue flash. Growth → hold/freeze beat → shatter burst. | Geometry growth (crystal encasement) + shatter | Sprite growth frames; blue target tint; shatter burst |
| 6 | **Ice 3** → Blizzaga | 52 | Ice | A shimmering wall of blue diamond-lattice ice blocks descends and stacks across the *entire enemy side* — the engine literally bottom-aligns the crystal "threads" with each target — freezing the area under a cold blue tint, then the whole curtain detonates into glitter. | Fullscreen elemental wash (crystal curtain) | Dedicated bottom-anchor op (`$6A`, "ice 3"); blue palette add; mass shatter |
| 7 | **Bolt** → Thunder | 6 | Lightning | One jagged blue-white bolt cracks down from the top of the screen onto the target; a single quick white screen flash, then yellow-white sparks crackle over the sprite. Strike (1–2 frames) + flash → residual crackle → fade. | Sky-strike bolt + screen flash | Bolt sprite; white palette-add flash (`$AF/$B0`) |
| 8 | **Bolt 2** → Thundara | 22 | Lightning | Multiple thicker blue-violet bolts slam the target(s) in quick succession; stronger screen flash, electric arcs wrap the sprite longer. | Multi-bolt sky-strike + flash | Multi-bolt sprites; repeated palette-add flashes |
| 9 | **Bolt 3** → Thundaga | 53 | Lightning | The screen darkens a beat, then a web of golden-yellow lightning engulfs the whole enemy side — thick zigzag arcs latticing every enemy at once — punctuated by repeated full-screen white flashes. Dim → gold lattice → strobe → residual sparks. **Photosensitivity-relevant strobe** (§10.2). | Fullscreen electric wash + strobe | Screen dim; lattice sprites; repeated palette-add strobe |
| 10 | **Poison** | 3 | Poison | A cluster of translucent green bubbles fizzes up and pops over the target, tinting the sprite sickly green. Small and quick. | Rising particles (bubbles) + green tint | Rising bubble sprites; target tint |
| 11 | **Bio** | 26 | Poison | A wide spray of dark-green sludge globules splatters in an arc across the enemy group — the in-game description literally reads *"Releases a bacterial cloud"* — leaving a venomous green wash. Bigger, wetter, multi-target Poison. | Projectile spray / toxic cloud | Projectile-spray threads; green wash tint |
| 12 | **Drain** | 15 | — | A stream of small glowing orbs siphons from the target's body to the caster; the caster pulses with a warm golden glow as the stolen HP arrives. Direction: target → caster. | Drain transfer (the canonical one) | Vector particle stream between combatants (6 threads per the engine's init table); caster glow |
| 13 | **Break** | 25 | — (petrify) | Small red beads orbit the target while its palette bleaches toward white/gray; on the final flash the target is left stone-gray. | Orbiting particles + palette shift (stone) | Target-palette rewrite ops (`$3B` swap / `$3C` restore) |
| 14 | **Doom** → Death | 35 | — (KO) | The Grim Reaper itself — a black/purple-robed, scythe-bearing specter — materializes in front of the target, looms, swipes, and dissolves; the area dims while it is on screen; the target collapses. One of the game's most iconic apparition effects. | Apparition / reaper omen | Apparition sprite overlay; screen dim; standard KO dissolve |
| 15 | **Demi** → Gravity | 33 | — (½ HP) | A black sphere outlined in violet — a miniature black hole — materializes over the target and pulses/squeezes downward with dark sparks chained around it. | Target overlay — dark gravity orb | Dark orb sprite overlay |
| 16 | **Quartr** → Graviga | 48 | — (¾ HP, all) | The same black gravity orbs appear over *every* enemy simultaneously, swelling larger while the screen dims — a synchronized multi-crush. | Multi-target dark-orb overlay | Multi-target orb overlays; screen dim |
| 17 | **X-Zone** → Banish | 53 | — (removes all) | The battlefield background is swallowed by a swirling black starfield void; enemies warp, stretch, and are sucked into the dimensional hole before it snaps shut and the normal background returns. Rift opens → spiral suck + sprite distortion → snap shut → enemies gone. | Background replacement + vortex suction (screen distortion) | Background swap (window masks); mosaic (`$BE`); sprite warp |
| 18 | **Pearl** → Holy | 40 | Holy | The entire background palette pales to icy white-blue and begins to ripple — the engine has dedicated "pearl wind" HDMA scanline-scroll commands — white sparkles streaming in wind-blown waves; then luminous pearls of light converge on the target and burst in a brilliant white flash. Serene, then blinding. | Screen palette shift + wave distortion + light burst | BG palette pale-out; bespoke pearl-wind HDMA ops (`$80 $1F/$20`, `$22/$23`); convergence burst |
| 19 | **Flare** | 45 | — (pierces def.) | The background slams to a deep blood-red palette; at the target a point of white-hot light swells and detonates into a yellow-white starburst with concentric heat rings, then a hard white flash. Compact but violent. **Photosensitivity-relevant** (§10.2). | Screen palette swap + point-detonation starburst | BG palette swap (red); starburst sprites; white palette-add flash |
| 20 | **Meteor** | 62² | — (all) | The battlefield vanishes: the screen becomes a black starfield with a red-tinged horizon, then a barrage of rocky meteors streaks diagonally down one after another, each trailing white streaks and landing with an impact flash and screen shake. Sky-out → sequential streaks → impact flashes + shakes → restore. | Background replacement + sky-fall barrage + shake | Background swap (starfield); vector projectile threads; scroll shake (`$D6`) |
| 21 | **Ultima** | 80 | — (all, ignores def.) | The definitive FF6 spell and origin of the series' recurring "expanding dome": a tiny mote of light grows into an enormous translucent **blue dome** engulfing the enemy side, surface rippling, white droplet-sparkles raining inside; the dome swells to fill the screen, holds, then the screen whites out in a soundless over-exposed detonation before fading back. Multi-second, with shake. | Expanding dome + fullscreen whiteout | HDMA window-mask dome (circle-shape table entry 7 is literally named "ultima"); fixed-color whiteout; shake |
| 22 | **Quake** | 50 | Earth (all grounded, both sides) | The floor fractures: the battlefield ground breaks into jagged black rock plates heaving upward into a broken dome, with columns of yellow dust/energy erupting beneath *every* combatant amid heavy sustained shake. Terrain itself is the effect. | Ground upheaval + eruption columns + shake | BG deformation; per-combatant eruption sprites; sustained scroll shake |
| 23 | **W Wind** → Tornado | 75 | Wind (everyone) | A huge translucent tornado funnel forms mid-field and sweeps across the battlefield, visibly warping and dragging at sprites as it passes — the engine runs dedicated multi-sprite "tornado thread" commands and re-sorts sprite priority as it travels; green-grey gusts and debris spiral while the background wave-ripples. | Moving vortex geometry + screen distortion | Tornado-thread ops (`$06–$09`, `$DA`); sprite priority resort; HDMA wave |
| 24 | **Merton** → Meltdown | 85 | Fire+Wind (everyone) | The apocalypse spell: sky and screen bathe in blazing red-orange, then multiple fireball explosions blossom across the entire field, engulfing enemies *and* allies in rolling flame waves with repeated white-hot flashes. Reads as "the atmosphere ignites." | Fullscreen inferno wash (indiscriminate) | BG palette wash (red-orange); serial explosion sprites; strobing flashes |

¹ Ice/Blizzard — 5 MP per CoN + StrategyWiki (FF Wiki says 4). ² Meteor — 62 MP per CoN + StrategyWiki (FF Wiki says 63). SNES values follow the two-source majority throughout.

### 3.2 Healing Magic (White) — 9 spells

| # | SNES-US → GBA-modern | MP | Visual (phased) | Archetype | SNES techniques |
|---|---|---|---|---|---|
| 25 | **Cure** | 5 | Small blue-white cross/star glints spiral upward around the target with a soft chime; brief cool glow. The gentlest effect in the game. | Rising sparkle overlay (sparse) | White-magic sparkle intro (`$0A`); rising glint sprites |
| 26 | **Cure 2** → Cura | 25 | A denser shower of green-and-white four-pointed star sparkles cascades around the target(s), twinkling as they rise and pop. Same grammar as Cure, more particles, slightly longer. | Sparkle shower (medium density) | Denser sprite shower |
| 27 | **Cure 3** → Curaga | 40 | A full-party cascade: blue-white droplets of light rain down over all targets in a bright vertical shimmer, briefly tinting the party side with a cool restorative wash. | Party-wide restorative sparkle rain | Falling droplet sprites; party-side tint |
| 28 | **Life** → Raise | 30 | A warm golden halo/ring of light descends onto the fallen ally; golden sparkles swirl around the body as the sprite is restored upright, with a soft yellow flash at the moment of revival. | Descending light halo/column (gold) | Descending halo sprites; gold flash; sprite restore |
| 29 | **Life 2** → Arise | 60 | The grander sibling: a tall column of white-gold light envelopes the fallen ally, a starburst of glints at its core as they rise fully healed. Same descending-light grammar, scaled up in height, brightness, and duration. | Light pillar + starburst (revival) | Light-pillar sprites; starburst |
| 30 | **Antdot** → Poisona | 3 | Small green-white bubbles/sparks lift off the target and pop away — the visual inverse of Poison: the toxin visibly leaving the body. Very short. | Rising particle purge | Rising purge sprites |
| 31 | **Remedy** → Esuna | 15 | A shimmering curtain of pastel pink-and-white sparkling rain washes down over the target, sweeping ailments away; leaves a clean white glint. | Falling sparkle veil (multicolor) | Falling veil sprites |
| 32 | **Regen** | 10 | Soft green motes rise continuously around the target with a gentle green tint pulse — deliberately a "slow drip" Cure. | Rising particles (green, gentle) | Rising mote sprites; tint pulse |
| 33 | **Life 3** → Reraise | 50³ | A golden phoenix-like shimmer/halo settles onto the target and fades *into* them, leaving a brief lingering glow — visually a "stored" Life spell (fitting: it triggers later on KO). Life's color language, shorter and quieter. | Descending halo, latent/absorbed | Descending halo; absorb fade |

³ Life 3 — 50 MP per CoN + FF Wiki (StrategyWiki says 60).

### 3.3 Effect Magic (Gray / Support) — 21 spells

| # | SNES-US → GBA-modern | MP | Visual (phased) | Archetype | SNES techniques |
|---|---|---|---|---|---|
| 34 | **Scan** → Libra | 3⁴ | A translucent deep-blue lens/sphere — a magnifier reticle filled with constellation-style dots and grid glints — expands over the enemy, holds while the stat text boxes print, then pops. | Target overlay — lens/reticle | Lens overlay sprite; UI text sync |
| 35 | **Slow** | 5 | A cluster of dull gray metallic beads (clock-weight motif) materializes over the target and presses down sluggishly, with a brief desaturating gray tint. | Target overlay — weight/clock motif + gray tint | Weight overlay sprites; gray tint |
| 36 | **Rasp** | 12 | A pale pink-violet translucent disc/moon shimmers over the target while purple motes flake off it — MP visibly "burning off" as pink dust. | Target overlay + particle flake-off (pink) | Disc overlay; flake particles |
| 37 | **Mute** → Silence | 8 | Unmistakable: a large dark-gray coin/disc **stamped with the kanji 黙 ("silence")** slams over the target and holds a beat before fading. A literal seal on their voice. | Symbolic stamp overlay (unique glyph object) | Glyph-disc sprite overlay |
| 38 | **Safe** → Protect | 12 | An orange-gold spiral disc — concentric swirling rings like a pinwheel shield plate — spins into existence in front of the target, glows, and fades. Warm colors = physical defense. | Barrier geometry — spiral plate (warm) | Spiral-disc sprite; glow |
| 39 | **Sleep** | 5⁵ | A soft white translucent bubble balloons around the target's head/body, wobbling gently like a soap bubble as the target nods off; gentle dimming, then pop. | Enveloping bubble overlay | Bubble overlay sprite; dim |
| 40 | **Muddle** → Confuse | 8 | A swirl of small yellow crescent-moons spins in a loop around the target's head — the classic "seeing birdies" dizzy halo, in FF6's yellow-crescent style. | Orbiting symbol swirl (dizzy halo) | Orbiting crescent sprites |
| 41 | **Haste** | 10 | The target flashes bright gold and quick radial "speed-line" sparks whip clockwise around the sprite — a compressed clock-spin. Short and snappy. | Target palette flash (gold) + radial speed lines | Gold palette flash; speed-line sprites |
| 42 | **Stop** | 10⁵ | A crystalline green overlay flash-freezes over the target and the sprite's palette darkens and *holds* — frozen mid-pose, visibly locked in stopped time until the status ends. | Freeze overlay + sustained palette hold | Target-palette hold (`$3B`/`$3C`) |
| 43 | **Bserk** → Berserk | 16 | Jagged green anger-arcs (zigzag scribbles) crackle over the target while its body tints red with rage; the red tint persists via the berserk status. | Crackling arc overlay + red palette shift | Arc sprites; persistent red target palette |
| 44 | **Float** | 17 | Golden sparkles gather beneath the target's feet and physically lift the sprite, which rises and settles into a gentle bob a few pixels off the ground (the offset persists as the status). | Sprite translation (levitate) + underfoot sparkles | Sprite Y-offset; underfoot sparkle sprites |
| 45 | **Imp** | 10 | A quick puff/sparkle burst, and the target sprite is *swapped* wholesale for the little green Imp (kappa) sprite — or back. The engine has a dedicated command: "toggle imp graphics for target." | Sprite swap + poof | Dedicated sprite-swap op (`$13`) |
| 46 | **Rflect** → Reflect | 22 | A glassy pale-blue translucent crescent/dome shells over the target, glints along its rim, then fades to invisible — reappearing as a flash whenever a spell later bounces. Cool colors = magic barrier. | Barrier geometry — glassy dome (cool) | Dome overlay sprite; bounce-flash re-trigger |
| 47 | **Shell** | 15 | A speckled green-white veil — a beaded lattice curtain of tiny dots — shimmers around the target's silhouette and melts away. Softer and more particulate than Reflect's solid shell. | Barrier veil — particle lattice | Lattice-dot sprites |
| 48 | **Vanish** | 18 | A white star-cross flash over the target, then the sprite's opacity drops — first to ghostly half-transparency, then effectively invisible (the translucency persists as the status). Engine command: "make target vanish." | Sprite alpha fade + star flash | Dedicated vanish op (`$14`); alpha via color math |
| 49 | **Haste2** → Hastega | 38 | The Haste effect — gold flash + radial speed lines — fired across the whole party simultaneously, with a fuller screen ripple. Same grammar, multi-target. | Multi-target palette flash (gold) | Party-wide gold flashes; ripple |
| 50 | **Slow 2** → Slowga | 26 | A screen-wide dark-blue lattice/web ripples across the field (a "time net" settling over everything) while the gray Slow bead-clusters press onto every enemy. | Fullscreen web overlay + multi-target weight motif | BG web overlay; multi-target weight sprites |
| 51 | **Osmose** | 1 | Pink-violet motes stream from the target back to the caster — Drain's grammar recolored magenta for MP — with a small glint on the caster as the points arrive. | Drain transfer (pink/MP) | Vector particle stream; pink palette |
| 52 | **Warp** → Teleport | 20 | A column of blue-white light with rising luminous rings envelopes the party; the sprites dissolve upward into streaking light and the battle ends. | Light pillar + upward dissolve | Light-pillar sprites; upward alpha dissolve |
| 53 | **Quick** | 99 | The caster flares gold with thin radial time-lines emanating outward, and the rest of the screen dims/freezes — everyone else literally stops while the caster stays lit, telegraphing the double-turn. Understated animation for the game's most expensive spell. | Caster aura + global freeze-frame (time stop) | Caster gold flash; global dim + freeze |
| 54 | **Dispel** | 25 | Small white sparks pop outward off the target and drift away — buff auras visibly dispersing into the air. Quick, quiet, and outward (the mirror image of a buff's inward gather). | Outward particle burst (dispersal) | Outward spark sprites |

⁴ Scan — 3 MP per CoN + StrategyWiki (FF Wiki says 4). ⁵ Sleep — 5 MP, Stop — 10 MP per CoN + StrategyWiki (FF Wiki says 15 for both).

### 3.4 Cross-cutting observations (magic school)

- **FF6 builds all 54 spells from ~6 primitives**: sprite-frame overlays, palette add/sub flashes, HDMA scanline waves, BG scroll shakes, background swaps, and sprite property mutation (alpha/offset/swap). See §8 for each mechanism.
- **Tier ladders are the same grammar at increasing scale**: Fire (local overlay) → Fire 2 (converging ring) → Fire 3 (volley + fullscreen wash). One effect function, three parameter sets — a directly reusable curriculum exercise.
- **Screen-wide statements are reserved for the top tier**, and the engine's own documentation shows dedicated one-off subroutines for the signature effects (pearl wind, tornado threads, imp toggle, vanish fade, ice-3 curtain alignment).
- **The buffs encode meaning in temperature**: Safe/Protect is a warm spiral plate (physical), Rflect/Reflect a cool glassy dome (magical), Shell a particulate veil between them.

---

## 4. Final Fantasy VI — Espers: all 27 summons

The 27-esper roster is confirmed exactly against the Final Fantasy Wiki's magicite list. Gameplay frame: summoning requires the esper's magicite equipped; each esper can be summoned **once per battle**; summon attacks are unblockable and cannot be Reflected (only status-type summons can miss). Odin upgrades one-way into Raiden, so at most 26 can be held simultaneously. The GBA/2014 versions add four espers (appendix §4.4); the Pixel Remaster reverts to the original 27.

### 4.1 The shared summon-in sequence (described once — every esper uses it)

Every summon is a **two-beat structure**: a shared *summon-in* followed by the esper's *unique payoff*.

1. **Orb.** The battle pauses; the summoner strikes the casting pose and a distinctive spinning, sparkling **"summon orb"** (a multicolor star-flash burst unique to FFVI — the wiki explicitly distinguishes it from other entries' green orbs) blossoms over the caster.
2. **Stage-clear.** The screen **dims** (dedicated `decrement screen brightness` opcode); in many summons the party sprites and battle cursors are hidden entirely (`$27 Hide/Show Characters for Esper Attack`, `$29 hide cursor sprites`), clearing the stage.
3. **Portrait.** The esper materializes as a **large static portrait sprite on a dedicated hardware layer** (the animation format documents an "extra layer, used for espers" above the sprite/BG1/BG3 layers). Nearly every esper is a single held frame that fades in, poses, and fades out — **Ifrit is the documented exception: the only esper whose summon has multiple animation frames (he spins around)**.
4. **Payoff.** The esper vanishes and the payoff plays — bolts, waves, beams, auras — built from BG1/BG3 overlay sheets, palette loads/cycles, HDMA gradients, circle masks, mosaics, color add/sub, and scroll-shake (all documented opcodes; several name specific espers: "blue gradient lines (Carbunkl, Odin)", "wide vertical sine wave (hope song, sea song)", BG palettes for "inferno", "justice", "earth aura").

**Esper archetype letters used below** (subset of §2, kept for compactness): **A** sky-strike · **B** elemental wash · **C** beam/pillar · **D** ground upheaval · **E** object shower · **F** party aura/shimmer · **G** flyby/rider sweep · **H** song/ripple · **I** transformation/dissolve · **J** cataclysm.

### 4.2 The 27 espers

Format: **GBA-modern (SNES-US)** · JP · where obtained · summon attack (modern / SNES) · MP · effect · payoff visual · archetype.

#### The Zozo bundle (Ramuh's gift, World of Balance)

**1. Ramuh (Ramuh)** · ラムウ · Zozo — **Judgment Bolt (Bolt Fist)**, 25 MP, lightning damage to all enemies (SP 50). *"Bathes all enemies in lightning."*
An old sage — enormous white beard to his feet, green robe, pink staff with a red orb. His seated-sage portrait holds the frame; then the sky flickers and **jagged blue-white lightning bolts hammer down across the whole enemy rank**, each impact popping a full-screen white flash before the dim resets. Payoff = staccato vertical strikes + strobe.† **Archetype: A.**

**2. Kirin (Kirin)** · キリン · Zozo — **Holy Aura (Life Guard)**, 18 MP, Regen on the whole party. *"Gradually restores the party's HP."*
A silver unicorn-like sacred beast with two crooked golden horns and a green mane. The shining beast appears and a **soft green-white glimmer rains gently over the party sprites** — a low-key, benevolent counterpoint to the attack summons; no screen flash, just a warm aura settle.† **Archetype: F.**

**3. Siren (Siren)** · セイレーン · Zozo — **Lunatic Voice (Hope Song)**, 16 MP, Silence on all enemies (HR 136). *"Silences all enemies."*
A slender blond siren with a golden harp (famously censored on US SNES). Her song rolls over the enemies — **the engine documents this one directly**: enemy sprites bob in a wide vertical sine wave while their color palettes are copied and shifted (the "hope song" opcodes), i.e. the victims visibly discolor and sway as the song takes hold, then snap back muted. One of the only summons whose payoff is rendered *through the enemy sprites themselves*. **Archetype: H — the canonical instance.**

**4. Cait Sith (Stray)** · ケット・シー · Zozo — **Cat Rain (Cat Rain)**, 28 MP, Confuse on all enemies (HR 128). *"Confuses all enemies."*
An upright black-and-white cat in red shoes and a green cape. Literal to its name: after the cape-flourish pose, **a shower of little cat figures rains down over the enemy side, bouncing absurdly**; whimsical, no flash, confusion lands as the cats clear.† **Archetype: E, comedic register.**

#### Magitek Research Facility (World of Balance)

**5. Ifrit (Ifrit)** · イフリート — **Hellfire (Inferno)**, 26 MP, fire damage to all enemies (SP 51). *"Scorches all enemies in a fiery blaze."*
A green-skinned muscular beast-man with huge ram horns. **The only esper with a multi-frame summon sprite — he spins around** (sourced). Then a **wall of orange-red flame scrolls across the enemy rank** — the engine loads a dedicated BG1 flame-sheet palette for "inferno": the fire is a full-width background overlay sweeping over the sprites (sweep direction †). **Archetype: B, with a unique cast flourish.**

**6. Shiva (Shiva)** · シヴァ — **Diamond Dust (Gem Dust)**, 27 MP, ice damage to all enemies (SP 52). *"Envelops all enemies in an arctic chill."*
Blue-skinned feminine figure, green hair. Her cool-toned portrait holds; then the enemy side is **swallowed in a glittering pale-blue crystalline mist** — drifting sparkle particles and an icy screen tint rather than discrete hits; the chill settles and fades.† **Archetype: B, particle-mist variant.**

**7. Unicorn (Unicorn)** · ユニコーン — **Healing Horn (Heal Horn)**, 30 MP, group Esuna (removes Darkness, Poison, Petrify, Silence, Confuse, Sap, Sleep, Slow, Stop). *"Cures party of most status ailments."*
A classic white unicorn. It appears, its **horn glints**, and cleansing white sparkles wash over the party sprites, visibly "wiping" them clean.† **Archetype: F.**

**8. Maduin (Maduin)** · マディン — **Chaos Wave (Chaos Wing)**, 44 MP, non-elemental magic damage to all enemies (SP 55). *"Unleashes a tide of anger on enemies."*
Terra's father and story-central. Naming note: **"Maduin" is the shipped display name on SNES-US, GBA, and Pixel Remaster alike; "Madin" is only a romanization of the Japanese** マディン, never an English release name. Summon sprite: a horned wild-man — grayish skin, violet ponytail, clawed digitigrade legs, vermilion loincloth. He rears up and **concentric shockwave rings / rippling energy pulses burst outward across the enemy field** — a non-elemental "pressure wave" read (no elemental tint; distortion and flash carry it).† **Archetype: D-adjacent shockwave burst.**

**9. Catoblepas (Shoat)** · カトブレパス — **Demon Eye (Demon Eye)**, 45 MP, Petrify on all enemies (HR 96; fails vs Death-immune). *"Petrifies all enemies."*
A dark-green quadruped boar-beast with one baleful red eye. The beast looms in the dark; its **single eye flashes** and a gaze-glint sweeps the enemies, who **drain to stone-gray and shatter** — the kill is rendered on the victims' own palettes, not as a projectile.† **Archetype: C (gaze-beam) + I (transformation).**

**10. Phantom (Phantom)** · ファントム — **Ghostly Veil (Fader)**, 38 MP, Invisible on the party. *"Turns all allies invisible."*
A formless ghostly figure in dark gray — deliberately unresolved silhouette. The apparition drifts across the dimmed field; the party sprites **fade toward transparency** and stay half-vanished — the payoff is literally an opacity change on the allies.† **Archetype: F, alpha/stealth variant.**

**11. Carbuncle (Carbunkl)** · カーバンクル — **Ruby Light (Ruby Power)**, 36 MP, Reflect on the party. *"Casts Reflect on all allies."*
A small blue rabbit-like creature with a red forehead gem. The little beast appears and its **ruby flares**; the engine's "update blue gradient lines (…Carbunkl…)" opcode places it among the HDMA-gradient summons — **bands of cool light scan down over the party**, leaving each ally with the telltale Reflect glimmer. **Archetype: F, gradient-scan signature.**

**12. Bismarck (Bismark)** · ビスマルク — **Breach Blast (Sea Song)**, 50 MP, water damage to all enemies (SP 58). *"Slams all enemies with giant bubbles."*
A great white/light-blue whale. The whale surges across the backdrop; **giant bubbles and water masses bob across the enemy rank in a wide sine-wave motion** (the same documented "wide vertical sine wave… (sea song)" opcode) before bursting over the targets — buoyant rolling motion rather than a crash. **Archetype: B + H (sine motion).**

#### World of Balance extras

**13. Golem (Golem)** · ゴーレム · Jidoor Auction House (~20,000 gil) — **Earthen Wall (Earth Wall)**, 33 MP, an interposing barrier that absorbs physical attacks aimed at the party, with HP equal to the summoner's. *"Protects party from physical attacks."*
A bulky brown machine-like humanoid. Golem plants itself in front of the party — the summon's residue is *persistent*: for the barrier's life, physical attacks visibly **strike Golem's interposing arms/body instead of the ally** (an LP describes its hand rising to block, with a puff of steam). The rare summon whose VFX is an ongoing battlefield behavior, not a one-shot. **Archetype: F — persistent guardian-interpose variant.**

**14. Zona Seeker (ZoneSeek)** · ゾーナ・シーカー · Jidoor Auction House (~10,000 gil) — **Magic Shield (Wall)**, 30 MP, Shell on the party. *"Increases the party's magic defense."*
A floating skeletal brown/red/black creature with a cape and no legs. The wraith hovers and **translucent barrier shells shimmer into place around each ally** — the standard Shell glimmer applied party-wide in one pass.† **Archetype: F.**

**15. Seraph (Sraphim)** · セラフィム · Tzen — **Angel Feathers (Reviver)**, 40 MP, restores HP to the party (SP 18). *"Restores HP to all allies."*
Bought from a thief in Tzen: **3,000 gil in the World of Balance; after the cataclysm, in the World of Ruin, the price collapses to 10 gil.** A feminine two-winged angel in purple robes. She hovers over the party and **glowing feathers drift down through a soft golden haze**; each feather's landing reads as the heal tick — a gentle object-shower recolored as benediction.† **Archetype: E × F.**

#### Ancient Castle (World of Ruin)

**16. Odin (Odin)** · オーディン · Ancient Castle (his petrified remains crumble into magicite) — **Zantetsuken (Atom Edge)**, 70 MP, attempts instant Death on all enemies (HR 110; fails vs Death-immune); the only Speed/Agility-boosting esper on SNES. *"Cleaves all enemies in two."*
A demonic knight in dark gray armor on a dark brown horse. The field drops away into a **blue HDMA gradient backdrop** (the engine names "blue gradient lines (…Odin/Raiden)"); Odin **charges on horseback across the enemy line**, a single **white slash-streak snaps across the screen**, and every victim splits and dissolves in the standard death fade (ride choreography †; the gradient stage and "cleaves in two" payoff are sourced). **Archetype: G + I (kill-transformation).**

**17. Raiden (Raiden)** · ライディーン · Ancient Castle (Odin transformed by the queen's tear — replaces Odin) — **Shin-Zantetsuken (True Edge)**, 80 MP, instant Death on all enemies (HR 140; works on undead). *"Cleaves all enemies in two."*
Odin reborn — blue-and-gold armor, blue-white horse. The same rider-slash choreography on the shared blue-gradient stage, in Raiden's cooler palette with a harder flash — an intentional "same move, ascended" visual rhyme.† **Archetype: G + I, palette-upgrade variant.**

#### World of Ruin espers

**18. Quetzalli (Palidor)** · ケーツハリー · Solitary Island beach — **Sonic Dive (Sonic Dive)**, 61 MP, the entire party executes Jump attacks. *"Lifts the party up for an aerial attack."*
A purple long-beaked bird with multicolored wings. Uniquely, the summon turns the *party* into the effect: the great bird sweeps through, the allies **launch off the top of the screen** (the engine's hide-characters op clearing the stage), a beat of empty sky, then **each ally plummets down onto an enemy in sequence** with individual impact flashes. Cast → absence → serial payoff (two-part sequence documented in Pixel Remaster screenshots). **Archetype: G driving a party-choreography payoff (unique).**

**19. Fenrir (Fenrir)** · フェンリル · Mobliz (after Humbaba) — **Howling Moon (Moon Song)**, 70 MP, Image (Blink) on the party. *"Creates illusionary images of the party."*
A dark gray wolf, mid-howl. Phase 1 — the sky goes night-dark and a **huge moon rises** behind the field while the wolf howls; phase 2 — **after-image doubles peel off each party sprite** and hover as translucent mirages (the Image status made visible). Backdrop transformation, then ally-side ghosting (two-phase structure sourced; details †). **Archetype: F with a scene-setting backdrop phase.**

**20. Midgardsormr (Terrato)** · ミドガルズオルム · Yeti's Cave, Narshe mines — **Abyssal Maw (Earth Aura)**, 40 MP, earth damage to all enemies (SP 93, HR 150; misses Float). *"Crushes enemies with seismic waves."*
A bulky brown world-serpent with red eyes. The serpent **erupts from the ground**; the engine's earth-aura BG3 palette + background-scroll shake do the work — the whole screen **judders while brown seismic ripples and dust tear across the enemy line**, ground-up violence with no sky flash (eruption †; shake/palette sourced). **Archetype: D — the canonical instance.**

**21. Lakshmi (Starlet)** · ラクシュミ · Jidoor, Owzer's Mansion (after Chadarnook) — **Alluring Embrace (Group Hug)**, 74 MP, restores HP to the party (SP 34). *"Restores HP to all allies."*
A beautiful woman in a dark blue robe amid golden angelic imagery (censored on US SNES). She appears in a **warm rose-gold radiance that folds over the party like an embrace** — pink/gold wash, drifting sparkles, no percussion at all; the most tender-registered summon in the set.† **Archetype: F, warm-tint variant.**

**22. Valigarmanda (Tritoch)** · ヴァリガルマンダ · Narshe Cliffs (the thawed frozen esper) — **Tri-Disaster (Tri-Dazer)**, 68 MP, Fire + Ice + Lightning damage to all enemies (SP 110). *"Hits enemies with fire, ice and lightning."*
A great tri-elemental avian — red scales, green-and-blue feathers. The firebird-serpent spreads its wings and the payoff cycles the three elements in rapid succession — **red flame surge, blue crystalline burst, yellow-white bolt strikes** stacked over the enemy rank, ending on a combined flash (ordering †). The tri-color stacking is its whole identity. **Archetype: A + B layered combo (multi-element).**

**23. Phoenix (Phoenix)** · フェニックス · Phoenix Cave (Locke's quest) — **Flames of Rebirth (Life Giver)**, 110 MP, revives all KO'd allies at 25% max HP. *"Revives all KO'd allies."*
A great bird with bright red wings; the wiki notes it **"leaves behind it a bright red trail of fire as it flies."** The firebird **sweeps across the screen trailing flame**; embers sift down over the fallen, the orange wash cools to gold, and KO'd sprites rise as the glow clears — destruction-palette fire re-purposed as resurrection (flight + trail sourced; the rest †). **Archetype: G × F — fire palette, healing meaning.**

**24. Alexander (Alexandr)** · アレクサンダー · Doma Castle (after Cyan's dream) — **Divine Judgment (Justice)**, 90 MP, holy damage to all enemies (SP 114). *"Sears enemies with a beam of holy light."*
A towering silver-white mechanical castle-robot with spires and column-like arms. The fortress materializes and **columns of white-gold holy light slam down across the enemy rank** — the engine gives "justice" a dedicated BG3 palette *and* flips BG3 to high priority so the light beams render **over** the enemy sprites; the screen washes toward white at the peak (beam-over-sprite layering sourced; column choreography †). **Archetype: C — the canonical instance.**

**25. Bahamut (Bahamut)** · バハムート · dropped by Deathgaze — **Mega Flare (Sun Flare)**, 86 MP, non-elemental defense-ignoring damage to all enemies (SP 92). *"Hits all enemies with a nuclear blast."*
The King of Dragons — dark gray/silver, bronze chest, blue wings. Bahamut rears against the darkened sky, gathers light, and the enemy field **detonates in a swelling white-hot blast** — expanding flash rings, full fixed-color whiteout, then the burn fades off the after-image. The official "nuclear blast" line is the intended read: not bolts, not a wash — one screen-consuming explosion (stage directions †). Also summonable via Setzer's Slot (3× dragon). **Archetype: J, single-burst form.**

**26. Ragnarok (Ragnarok)** · ラグナロック · Narshe weapon shop (magicite option; Locke required; the alternative is the Ragnarok sword) — **Metamorphose (Metamorph)**, 6 MP, attempts to turn one enemy into an item (high miss chance; the only source of several rare items). Teaches Ultima. *"Turns one enemy into an item."*
The esper manifests as the sword-crystal itself. A focused beam of light pins a **single** target; the victim **flashes through a rainbow palette-cycle, pixel-mosaics, and collapses into an item sprite** that drops away (the engine's palette-shift and mosaic ops in target-local form). The smallest summon by staging — one enemy, one transformation.† **Archetype: I — the canonical instance.**

**27. Crusader (Crusader)** · JP ジハード *Jihad* → ドゥームズデイ *Doomsday* · automatic after slaying all **eight legendary dragons** — **Cleansing (Purifier)**, 96 MP, non-elemental damage to **all enemies AND all allies**, SP 190 (the highest of any player-accessible ability), unblockable. Teaches Merton and Meteor. *"Greatly damages all enemies and allies."*
Naming: the original Super Famicom name was **Jihad**; NoA policy renamed it Crusader in the West; the Pixel Remaster changed the Japanese name itself to Doomsday. Its attack's Japanese name is 天地崩壊 *Tenchi Hōkai* ("Heaven and Earth Collapse"). Appearance: **three entities at once** — Demon left, Fiend/Devil right, Goddess upper-middle (per the 20th Anniversary Ultimania they carry a fragment of the Warring Triad's power). The longest summon in the game and the only **three-part** one (Pixel Remaster documents Cleansing Pt1/Pt2/Pt3, captioned "the triad espers battling amongst each other"). The three war-gods materialize across the sky and **turn their attacks on one another**; their clashes rain serial explosions over the entire field, ally sprites included, through repeated whiteouts and shakes. The engine gives it bespoke plumbing: `Load Extra Esper Palette (purifier)`, purifier-specific draw ops, and a palette-restore cleanup — your own party is inside the blast's color math. (Three-phase structure, triad-battle framing, and friendly-fire are sourced; beat-level choreography †.) **Archetype: J — the maximal, cinematic form.**

### 4.3 Esper design observations

1. **Two-beat grammar** — every summon separates *invocation* (dim + orb + portrait on its own layer) from *payoff*; the esper is almost never the thing that hits.
2. **Cheap tricks, big reads** — five primitives sell everything: brightness/fixed-color math, scrolling BG overlay sheets, HDMA gradients, palette manipulation on *target* sprites, and scroll-shake. High-end look ≈ layered combinations, not more particles.
3. **Register through palette + motion** — heals are slow, warm/green/gold, ally-anchored; kills are fast, white-flash, enemy-anchored; gags are bouncy object showers. The same shower primitive is a joke with cats and a benediction with feathers.
4. **Escalation via phases** — the biggest effects (Crusader, and boss analogues Flare Star / Forsaken) spend *turns or phases* on telegraphs. Spectacle scales with anticipation, not resolution.

### 4.4 Appendix — GBA/2014-only espers (not in the SNES 27 or Pixel Remaster)

| Esper | Attack | Effect | MP | VFX notes |
|---|---|---|---|---|
| **Leviathan** · Dragons' Den quest chain | Tidal Wave | Water damage, all enemies, SP 130 | 70 | *"Deluges enemies with a giant wave"* — full-screen wall of water: archetype **B** at maximum scale |
| **Gilgamesh** · Coliseum (bet Excalipoor) | One of four, chosen by which of his three swords glows | Excalibur: Holy SP 120 · Masamune: def-ignoring SP 99 · Excalipoor: 1 damage · all three glow → **Enkidu**: def-ignoring SP 200 | 99 | Slot-machine summon; the glow tell is the VFX hook (**G/I** hybrid) |
| **Cactuar** · desert quest (Gigantuar) | 1000 Needles / rarely 10,000 Needles | Fixed 1,000 or 9,999 damage to all | 50 | Needle volley: archetype **E** taken to absurdity |
| **Diabolos** · Dragons' Den | Dark Messenger | Cuts all enemies' HP to 1/16 of current (ignores Death immunity) + Sap | 100 | Darkness/eclipse gravity crush: **C/J** dark-palette variant |

---

## 5. FF6 Desperation Attacks and boss signature effects

### 5.1 Desperation Attacks — all 12

Every playable character **except Gau and Umaro** has one (12 of 14). Trigger: character in Critical HP (< 1/8 max), uses Attack, 1/16 chance, never in the first 25.6 seconds of battle; blocked by Confuse/Image/Vanish/Zombie. All are unblockable, ignore defense, and hit one enemy. They are the direct precursor of FFVII's Limit Breaks.

| GBA-modern (SNES-US) | Character | Power | Visual signature | Archetype |
|---|---|---|---|---|
| Riot Blade (Riot Blade) | Terra | 142 | Crossed crescents of blue-white magical energy converge and slash through the target † | Slash-wave convergence |
| Mirage Dive (Mirager) | Locke | 139 | Locke blurs into an afterimage dash that strikes through the enemy † | Blade flurry (single-dash) |
| Tsubame Gaeshi (Back Blade) | Cyan | 140 | Named for Sasaki Kojirō's swallow-cut: a teleport-blink and instant return-slash † | Instant cut |
| Shadow Fang (ShadowFang) | Shadow | 140 | Dark fang-shaped energy bites the target; also inflicts Sap | Apparition bite |
| Royal Shock (RoyalShock) | Edgar | 143 | A royal flourish releasing a blue shock-beam blast † | Beam |
| Tiger Break (TigerBreak) | Sabin | 140 | A **dedicated tiger apparition sprite** (documented in the wiki gallery, with a unique Sabin pose sprite) lunges through the enemy in a flash | Apparition / sprite-cameo |
| Spinning Edge (Spin Edge) | Celes | 143 | Whirling blade rush — Celes spins through the target † | Blade flurry (spin) |
| Sabre Soul (Sabre Soul) | Strago | — | **Instant Death** (fails vs Death-immune) | Instant-death |
| Star Prism (Star Prism) | Relm | — | **Instant Death** via a burst of prismatic starlight (fails vs Death-immune) | Prismatic burst + instant-death |
| Red Card (Red Card) | Setzer | 147 | A fan of gambler's cards flies at the enemy, the red card struck home (soccer send-off etymology) | Object shower (cards) |
| Moogle Rush (MoogleRush) | Mog | 150 | Mog's full-body charging flurry — the highest power of the set † | Blade flurry (body) |
| Punishing Meteor (X-Meteo) | Gogo | 146 | Meteors crash onto the single target; homage to FFV's Famed Mimic Gogo countering with Meteor | Sky-fall barrage (single-target) |

(Gogo cannot Mimic Desperation Attacks; performing all twelve earns the mobile/Steam "A Chance in a Pinch" achievement, where they are called "Hidden Blitzes.")

### 5.2 Atma Weapon / Ultima Weapon (Floating Continent boss)

- **Flare Star** — Fire-elemental, unblockable, ignores defense and split damage; damage = (a random party member's level × 80) ÷ targets. The fight telegraphs it across turns: Ultima Weapon buffs itself (Protect/Shell/Haste) and *"begins charging energy for its ultimate attack"* before release. Visual: gathering points of orange light condense above the field into a star that **detonates in a fiery all-party burst**.† Also used by Red Dragon, Gorgimera, Io, Guardian, Kaiser Dragon, Omega Weapon. **Archetype: J (charge-up cataclysm) — the enemy-side mirror of Bahamut.**
- **Mind Blast** — hits four random targets (repeats possible), each with a random status from a 13-deep pool (Darkness, Zombie, Poison, Imp, Petrify, Doom, Silence, Berserk, Confuse, Sap, Sleep, Slow, Stop); HR 110. Visual: scattered psychic flashes/orbs strike targets individually, each victim flashing with its own affliction.† **Archetype: randomized multi-target status barrage (H/I).**
- Supporting kit: **Full Power** (heavy single-target special) and a tiered script (Flare/Blaze → Quake/Bio/Meteor → Tornado/Graviga/Rasp with Flare counters). Note also: Atma Weapon the *sword* has a growing beam-blade rendered through dedicated weapon-animation records (§8.9) — a player-side "energy blade" effect worth cataloguing on its own.

### 5.3 Kefka (final boss) and the Light of Judgment

- **Light of Judgment** — Kefka's *story-scale* weapon: a **destructive beam sent down from atop his tower that cuts a path of flame across the ground**; when idle it manifests as **four glowing white orbs bobbing near Kefka** (two on a long path, two on a short path). Used on Mobliz, South Figaro, Narshe, and Tzen; in the finale he sweeps it across the planet. The definitive "god-ray sweeping the overworld" effect. **Archetype: C at world scale.**
- **Heartless Angel (Fallen One)** — reduces the whole party's HP to 1; unblockable; **always Kefka's opening move** in the final battle. The wiki documents the animation directly: **angels descend from above — the same animation as the Raise spell** — a resurrection visual inverted into a death sentence. Also used by Kaiser Dragon, Fiend Dragon, Holy Dragon, Omega Weapon, Red Glutturn. **Archetype: descending halo, weaponized — register inversion as design.**
- **Havoc Wing** — Kefka's physical special in the final battle: a winged strike at ×4 attack power on one target, easily a one-shot. (Relm's Sketch of Kefka has a 25% chance of producing it.) **Archetype: melee-dash with wing flourish.**
- **Forsaken (Goner)** — spell power **220, the highest in the game**; non-elemental, unblockable, all targets. Fully sourced sequence: Kefka announces *"The end draws near..."* (SNES: *"The end comes... beyond chaos."*), **a giant head bearing Kefka's laughing expression materializes in front of him**, his turn ends, **the background begins to shake**, and on his next turn the screen-consuming blast lands. Despite the spectacle it doesn't ignore magic defense or split damage — a deliberately theatrical nuke. The engine's screen-shake enable op is literally commented "(Goner)". **Archetype: J with a two-turn telegraph.**
- **Trine** — Kefka's triangle-of-light prison inflicting Blind + Silence (blue wireframe prism over targets †). **Archetype: geometric target overlay.**
- Kefka also slings Ultima, Firaga/Blizzaga/Thundaga, Revenger, and Vengeance (buff-strip); the Statue of the Gods tiers below him carry the rest of the gauntlet.

### 5.4 Phantom Train (the ghost train boss)

Fought on the tracks as the locomotive bears down on the party from behind. Kit (all sourced):

- **Diabolic Whistle (Evil Toot)** — the train's whistle blows and each party member is hit with a random status ailment; the engine has a bespoke motion op for it ("move in narrow vertical sine wave… (evil toot)") — the whistle visually warbles across the screen. **Archetype: song/ripple, hostile.**
- **Acid Rain** — Poison/Water dual-element rain over the whole party + Sap; a green droplet sheet (color †). Shared with Ultros (2nd fight), Blue Dragon, etc. **Archetype: falling particles, toxic palette.**
- **Saintly Beam (Scar Beam)** — Holy-elemental rays raking the whole party — a ghost using *holy* light is the joke. **Archetype: ray salvo.**
- Its most famous "effect" is player-authored: the Phantom Train is vulnerable to Sabin's **Meteor Strike/Suplex** (most bosses are immune) — producing gaming's most iconic sight gag: a monk suplexing a locomotive (see §6.2 #3).

### 5.5 Ultros (recurring gag boss)

- **Ink** — blinds one target (also used by Nautiloid, Guardian); **Octopus Ink** — small physical damage + Darkness. The visual: a black ink glob splatters across the victim in a starburst blot † — the signature "octopus" effect and the series' template for screen-obscuring gag attacks. **Archetype: target-local splat (E/I, comedic register).**
- Supporting gimmicks across his four battles: **Tentacle** (heavy single-target physical), **Imp Song** (imp transformation), Acid Rain (2nd fight), Lv.3 Confuse, and endless fourth-wall dialogue. Sketching him at the Esper Caves is a scripted comedy beat that ends the fight.

---

## 6. FF6 skill families

Eight character command families, each with its own VFX identity. Four of them are **UI-first** — Bushido's charge gauge, Blitz's input string, Slot's reels, Lore's Roulette selector: *the interface is the animation's first act*. Family-level skill fantasy is sold through input ritual before any pixels fire.

Skill-family archetype vocabulary (from the source dossier, mapping onto §2): `melee-dash`, `melee-multihit`, `beam`, `projectile-volley`, `slash-wave`, `screen-flash`, `field-overlay`, `rain-down`, `sprite-cameo`, `grab-throw`, `aura-buff`, `heal-sparkle`, `status-splash`, `instant-death`, `gauge-UI`.

### 6.1 SwdTech / Bushido — Cyan (8 techniques)

JP 必殺剣 *Hissatsu Ken* ("Deadly Sword"). Mechanic: a numbered charge gauge (1–8) fills in real time; releasing at level *N* fires technique *N*. Family VFX identity: **gauge-UI** (the on-screen 1–8 charge meter) + katana iai-draw poses.

| # | GBA-modern (SNES-US) | JP kanji | Effect | Visual | Archetype |
|---|---|---|---|---|---|
| 1 | Fang (Dispatch) | 牙 *Kiba* | 120-power physical, 1 target, ignores defense | *"Perform a rapid sword thrust against a single enemy."* Cyan dashes in a blur, delivers one lightning-fast iai draw-cut with a white slash streak, snaps back; single big hit-flash † | melee-dash + slash-wave accent |
| 2 | Sky (Retort) | 空 *Sora* | Readies a counter; answers the next physical hit with a 56-power strike | *"Readies a devastating counterattack…"* Two-part animation (PR gallery stores Pt1/Pt2): Cyan sinks into a low sheathed-sword stance and holds; when struck he blinks across the screen and cuts the attacker down in one motion † | stance pose → deferred melee-dash |
| 3 | Tiger (Slash) | 虎 *Tora* | Halves target HP + Sap | *"Channels focused ki energy through the samurai's blade…"* A single huge vertical slash line rakes down the enemy sprite with a blue-white ki flash; the wound "beats" with the Sap tick † | oversized slash-wave + status-splash |
| 4 | Flurry (Quadra Slam) | 舞 *Mai* | 4 × 72-power physical hits, random targets | *"Performs a flowing, 4-strike combo while floating gracefully among enemies."* Cyan glides weightlessly between enemies leaving afterimages, landing four slash flashes in rhythm (PR gallery is Pt1–Pt4) † | melee-multihit with afterimages |
| 5 | Dragon (Empowerer) | 龍 *Ryū* | Drains HP (SP 49) and MP from one target | The animation has a **dedicated dragon sprite** (wiki-catalogued): a serpentine blue-violet energy dragon coils out of Cyan's blade, wraps the target, and streams stolen HP/MP back as drifting particles † | sprite-cameo + drain stream |
| 6 | Eclipse (Stunner) | 月 *Tsuki* | 97-power non-elemental magic to ALL + Stop (HR 140) | *"Shapes ki energy into a shower of blades, which rains down upon all enemies."* The screen dims moon-dark, then dozens of luminous blade silhouettes rain diagonally across the whole enemy party; targets freeze with the Stop effect † | rain-down (blades) + screen dim + status-splash |
| 7 | Tempest (Quadra Slice) | 烈 *Retsu* | 4 × 70-power physical, random targets, ignores defense | *"Unleashes a powerful, 4-strike combo…"* Visually a re-skin of Flurry — widely reported to share the same animation (suggesting a distinct one was planned and cut) † | melee-multihit |
| 8 | Oblivion (Cleave) | 断 *Dan* | Death on ALL enemies (HR 182, works on undead) | *"Cleaves all enemies in two."* One horizon-wide horizontal master-cut: a pause, a single white line sweeping across the entire enemy side, then every vulnerable enemy splits and dissolves † | full-field slash-wave → instant-death |

### 6.2 Blitz — Sabin (8 techniques)

JP 必殺技 *Hissatsu Waza*. Mechanic: fighting-game button inputs entered on the spot; failed input = Sabin poses and whiffs. All unblockable, 0 MP. Family VFX identity: **gauge-UI** (the input command itself) + martial-arts poses.

| # | GBA-modern (SNES-US) | JP | Input (SNES) | Effect | Visual | Archetype |
|---|---|---|---|---|---|---|
| 1 | Raging Fist (Pummel) | 爆裂拳 "Explosive Fist" | ← → ← | 110-power physical, ignores defense | Wiki: "leaping toward the enemy and pummeling it with his fist in rapid succession" — a hail of overlapping punch impact-flashes with fist afterimages, ending in a launcher blow † (name/input homage to *Art of Fighting*) | melee-multihit |
| 2 | Aura Cannon (AuraBolt) | オーラキャノン | ↓ ↓ ← | Holy magic, SP 68 | Wiki: "stepping toward the enemy and firing a beam of light from his hands" — shares the Hadouken input and "visually resembles the famous Kamehameha wave": cupped hands, then a thick blue-white beam with a bright core | beam (holy palette) |
| 3 | Meteor Strike (Suplex) | メテオストライク | X Y ↓ ↑ | 180-power physical | Wiki: "leaping toward the enemy and grabbing it, jumping high into the air with it, before slamming it to the ground." The target's own sprite is grabbed, carried up off-screen, **flipped upside down**, and slammed with an impact shake — famously usable on the Phantom Train (Square Enix even patched the PR so the train sprite flips correctly) | **grab-throw** — the canonical FF6 example of animating *the target*, not the caster |
| 4 | Rising Phoenix (Fire Dance) | 鳳凰の舞い "Phoenix Dance" | ← ← ↓ → → | Fire magic, SP 42, ALL enemies | Uses a dedicated "Sabin Image" sprite: Sabin crosses his arms and several flaming after-image copies of himself sweep out across the enemy line like dancing wisps, igniting each enemy; in the PR the flames resolve into a phoenix silhouette † | sprite-cameo (flaming doppelgängers) + fire field-overlay |
| 5 | Chakra (Mantra) | チャクラ | R L R L X Y | Heals other allies = Sabin's HP ÷ (party−1); cures dark/poison/silence/sap | Sabin sits into a meditation pose; soft concentric rings/light motes radiate from him to each ally with a gentle chime — no enemy-side effects at all † | aura-buff → heal-sparkle |
| 6 | Razor Gale (Air Blade) | 真空波 "Vacuum Wave" | ↑ ↑ → → ↓ ↓ ← | Wind magic, SP 78, ALL enemies | Sabin sweeps his arms and a fan of pale crescent vacuum blades scythes horizontally across the whole enemy party, each crescent leaving a brief cut-flash † | slash-wave volley (wind palette) |
| 7 | Soul Spiral (Spiraler) | スパイラルソウル | R L X Y → ← | Fully restores HP/MP + cures statuses on all other allies; ejects Sabin from battle | Sabin spins in place, wrapped in a rising helix of light that spirals out to the party; as allies flash to full, Sabin's sprite dissolves and he leaves the battle † (known to corrupt the Tornado spell's animation if both play in one battle) | spiral burst + heal-sparkle, caster despawn |
| 8 | Phantom Rush (Bum Rush) | 夢幻闘舞 "Phantasm Battle Dance" | ← ← ↑ ↑ → → ↓ ↓ ← | Non-elemental magic, SP 128, ignores Magic Defense | Wiki: the name "refers to the user creating phantoms of himself; Sabin uses the phantoms to attack enemies from all angles at once." The screen darkens; a storm of translucent Sabin afterimages blinks around the target striking from every direction, capped by one final joined blow and a large flash † | melee-multihit at maximum intensity — the game's template for an "ultimate martial-arts" effect |

### 6.3 Tools — Edgar (8 tools)

Mechanic: each Tool is an inventory item; effects fixed-power, all unblockable. Family VFX identity: Edgar's sprite swaps to a per-tool "holding machine" pose (each tool has its own held-item sprite).

| # | GBA-modern (SNES-US) | JP (lit.) | Effect | Visual | Archetype |
|---|---|---|---|---|---|
| 1 | Auto Crossbow (AutoCrossbow) | "Auto Bowgun" | 125-power physical to ALL | *"Strikes all enemies with a spray of crossbow bolts."* Edgar shoulders a boxy repeating crossbow; a rapid fan of bolts sprays across the enemy line, each landing its own small hit-flash † | projectile-volley (physical) |
| 2 | Noiseblaster (NoiseBlaster) | "Blast Voice" | Confuse on all enemies | *"Confuses all enemies with a blast of sound."* A horn/speaker cone emits expanding concentric rings (visible wavefronts) over the enemy side; enemies get the confuse dizzy-splash † | ring-wave field-overlay + status-splash |
| 3 | Bioblaster (Bio Blaster) | "Bio Blast" | Poison magic (SP 20) to ALL + Poison | *"Deals poison damage and sap status to all enemies."* A pressurized tank vents a rolling cone of green-brown gas that crawls across all enemies; poison bubbles linger † (the engine's window-mask shape table has a dedicated "bio blast" spray shape) | gas-cloud field-overlay (poison palette) |
| 4 | Flash (Flash) | "Sunbeam" | Non-elemental magic (SP 42) to ALL + Darkness | *"Inflicts darkness on all enemies with a brilliant flash."* Edgar raises a flash-gun; the entire screen whites out in several strobing frames, then enemies carry the blind splash † — **the archetypal full-screen strobe; photosensitivity caution when re-implementing (§10.2)** | screen-flash |
| 5 | Drill (Drill) | ドリル | 191-power physical, 1 target, ignores defense | *"Penetrates an enemy's armor to deal severe damage."* Edgar mounts a giant drill over his forearm, dashes in, and bores into the target with sustained grinding contact — sparks and repeated shake frames † (the engine's h-flip op is commented "(Drill)") | melee-dash with sustained contact |
| 6 | Chainsaw (Chain Saw) | "rotating saw" | 252-power physical; 25% chance instant Death instead | *"Damages or instantly dispatches an enemy."* Normal roll: Edgar revs a chainsaw, runs in, and saws with a heavy multi-frame contact effect †. **On the 25% Death roll, wiki-documented: "Edgar and Gogo don a hockey goalie's mask in similar fashion to Jason Voorhees"** and the target is executed outright (GBA gallery distinguishes "Normal chainsaw" vs "Instant death chainsaw") | melee-dash with **rare-variant execution swap** → instant-death — great precedent for "same move, low-probability upgraded animation" |
| 7 | Debilitator (Debilitator) | "Weak Maker" | Assigns a random elemental weakness to one enemy | *"Assigns an enemy a random elemental weakness."* A handheld device projects a crackling scan/grid over the target which flashes in the color of the newly assigned element — an "analyze/hack" visual rather than an attack † | target-lock grid overlay + elemental status-splash |
| 8 | Air Anchor (Air Anchor) | エアアンカー | Inflicts Heat: target self-destructs the next time it acts | *"Causes an enemy to self-destruct upon moving."* Edgar fires a harpoon-like anchor that embeds in the target (it visibly sticks); nothing happens until the enemy next acts — then it detonates † | single projectile tag → **deferred** instant-death — delayed-fuse visual grammar |

### 6.4 Dance — Mog (8 dances × 4 moves = 24 constituent moves)

JP 踊り *Odori*. Mechanic: Mog learns a Dance by winning a battle on its terrain. Selecting a Dance locks Mog in for the battle; each turn he randomly performs one of its **four** moves at fixed 7/16 · 6/16 · 2/16 · 1/16 odds. On mismatched terrain there's a 50% stumble chance — success **changes the battle background** to the Dance's terrain (a rare ability whose VFX includes swapping the arena art). Every dance's 1-in-16 move summons an animal helper with its own creature sprite (homage to FF5's Ranger "Animals").

**The 8 dances** (moves listed in probability order 7/6/2/1 out of 16):

| GBA-modern (SNES-US) | Terrain | Moves | In-game description |
|---|---|---|---|
| Wind Rhapsody (Wind Song) | plains / wasteland / Veldt / airship decks | Wind Slash · Sunbath · Plasma · Cockatrice | *"Calls upon the power of the wind to attack enemies and heal allies."* |
| Forest Nocturne (Forest Suite) | forests (incl. Phantom Forest) | Leaf Swirl · Forest Healing · Will o' the Wisp · Wombat | *"…power of the forest to attack enemies and cure allies' status ailments."* |
| Desert Lullaby (Desert Aria) | deserts, Imperial Camp | Sandstorm · Antlion · Wind Slash · Meerkat | *"…power of the desert to attack enemies and cast Hastega on allies."* |
| Love Serenade (Love Sonata) | towns / interiors (Zozo, opera house, Vector…) | Will o' the Wisp · Apparition · Snare · Tapir | *"…power of love to attack enemies and cure allies' status ailments."* |
| Earth Blues (Earth Blues) | mountains, Floating Continent, Kefka's Tower exterior | Rock Slide · Sonic Boom · Sunbath · Boar Brigade | *"…power of the earth to attack enemies and heal allies."* |
| Water Harmony (Water Rondo) | rivers / waterfalls / Serpent Trench | El Niño · Plasma · Apparition · Raccoon | *"…power of the sea to heal allies and cure them of status ailments."* |
| Twilight Requiem (Dusk Requiem) | caves, mines, tombs | Cave In · Snare · Will o' the Wisp · Poisonous Frog | *"…power of darkness to attack enemies."* |
| Snowman Rondo (Snowman Jazz) | snowfields (Narshe cliffs, WoR) | Snowball · Avalanche · Snare · Arctic Hare | *"…power of winter to attack enemies and heal allies."* |

**The 24 constituent moves** (visuals † unless noted):

| GBA-modern (SNES-US) | Effect | Visual / archetype |
|---|---|---|
| Wind Slash (Wind Slash) | Wind magic, SP 48, ALL, unblockable | **Standout.** A volley of pale-green crescent blades sweeps horizontally across the whole enemy line — Razor Gale's grammar, smaller. slash-wave volley |
| Sunbath (Sun Bath) | Heals all allies, SP 50 | Warm yellow light wash + rising motes over the party. heal-sparkle |
| Plasma (Plasma) | Lightning magic, SP 70, 1 target | A crackling blue-white energy arc snaps onto one enemy. beam (electric) |
| Cockatrice (Cokatrice) | Non-elem. SP 50 + Petrify (HR 96) | A cockatrice bird sprite flutters in and pecks; target greys to stone. sprite-cameo + petrify status-splash |
| Sandstorm (Sandstorm) | Wind magic, SP 45, ALL | A brown particle storm scours the enemy side; screen-wide dust streaming. field-overlay (particulate) |
| Antlion (Antlion) | Death on one enemy (HR 100) | A sand pit whirls open beneath the target and an antlion's jaws drag it under. sprite-cameo + instant-death |
| Meerkat (Kitty) | Haste on all allies | A meerkat sprite pops up; clock-hands speed effect on the party. sprite-cameo + aura-buff |
| Leaf Swirl (Rage) | Non-elem. SP 50, ALL, unblockable | A vortex of leaves whirls across every enemy. field-overlay (swirl) |
| Forest Healing (Harvester) | Cures ~9 statuses on allies | The animation's bird has a wiki-catalogued **"Nightingale" sprite** — a songbird flits over the party as ailment icons wash away. sprite-cameo + cleanse sparkle |
| Wombat (Wombat) | Non-elem. SP 88, 1 target, ignores defense; can't hit fliers | A wombat charges/bodyslams one enemy. sprite-cameo (physical gag) |
| Rock Slide (Land Slide) | Non-elem. SP 65, 1 target, ignores defense | Boulders tumble diagonally onto the target. rain-down (rocks) |
| Sonic Boom (Sonic Boom) | Cuts one enemy's HP by 5/8 max + Sap | A rippling shock-ring slams the target with a bass "thump" distortion. ring slash-wave |
| Boar Brigade (Whump) | Non-elem. SP 53, 1 target, ignores defense; can't hit fliers | A line of boars stampedes over the enemy. sprite-cameo stampede |
| Will o' the Wisp (Elf Fire) | Fire magic, SP 72, 1 target, unblockable | Ghostly blue-green flame orbs drift onto the target and flare up. floating orbs → spirit-fire field-overlay |
| Apparition (Specter) | Confuse on one enemy (HR 120) | A translucent ghost sweeps through the target, leaving dizzy spirals. sprite-cameo (ghost) + status-splash |
| Tapir (Tapir) | **Standout.** Cures ~13 statuses on one ally; a *sleeping* target is fully healed (HP+MP), even undead | A tapir (the dream-eating *baku* of Japanese folklore) trots up and "eats" the bad dream — ailment icons slurped away with a comic sparkle. sprite-cameo + cleanse |
| Cave In (Cave In) | Cuts one enemy's HP by 3/4 current + Sap | The ceiling collapses: large rock chunks bury the target. rain-down (heavy) |
| Snare (Snare) | Death on one enemy (HR 100; works on undead) | A dark pit/trap yawns beneath the enemy and swallows the sprite whole — removal, not shatter. trapdoor instant-death |
| Poisonous Frog (Pois. Frog) | Poison magic, SP 56, 1 target + Poison | A frog sprite hops on the target with a splash of venom bubbles. sprite-cameo + poison splash |
| El Niño (El Nino) | Water magic, SP 61, ALL, unblockable | A tidal surge floods across the whole enemy side. field-overlay (wave) |
| Raccoon (Wild Bear) | Heals all allies (SP 100) + cures ~13 statuses | A raccoon scurries across the party line; big sparkle wash. sprite-cameo + heal-sparkle |
| Snowball (Snowball) | **Standout.** Halves one enemy's HP (HR 100) | A snowball rolls in from off-screen, growing into a boulder-sized mass that flattens the target — pure slapstick physics. rolling sprite-cameo projectile |
| Avalanche (Surge) | Ice magic, SP 55, ALL, unblockable | A wall of snow and ice chunks crashes down over all enemies. rain-down / field-overlay (ice) |
| Arctic Hare (Ice Rabbit) | **Standout.** Heals allies, SP 60 | A white hare hops across the party; each hop leaves twinkling heal sparkles — the iconic "cute heal" of the set. sprite-cameo + heal-sparkle |

**Design note:** the dances are three "verbs" (attack / heal / status) re-skinned per biome, plus one rare mascot cameo — an excellent template for a small VFX system built as palette + particle swaps over shared timelines. Terrain-change on cross-biome success is a fourth, arena-level verb.

### 6.5 Slot — Setzer (8 outcomes)

Mechanic: three spinning reels stopped one at a time; the combination picks the attack. The reels are **rigged**: a hidden RNG index decides which outcomes are even allowed (7-7-7 has a 10/255 window; some boss formations forbid it outright); only Lagomorph, 7-Flush, and the 7-7-Bar Joker Doom are always reachable. Family VFX identity: **gauge-UI** — the reels themselves.

| Reels | GBA-modern (SNES-US) | Effect | Visual | Archetype |
|---|---|---|---|---|
| any losing combo | Mysidian Rabbit (Lagomorph) | Small party heal (SP 10) + cures Dark/Poison/Sleep | The "you lost" consolation: a chubby cartoon rabbit pops up, waves a tiny wand with a "boing," and sprinkles a weak heal † — comic anticlimax by design | sprite-cameo + heal-sparkle (gag register) |
| 💎💎💎 diamonds | Prismatic Flash (7-Flush) | Non-elem. magic to ALL (SP 84) | JP "Seven Flush" (flash/flush poker pun). The screen erupts in a rainbow-spectrum flash: banded prismatic light sweeps across all enemies † | screen-flash (multi-hue prismatic, not white) |
| 🐤🐤🐤 chocobos | Chocobo Stampede (Chocobop) | Non-elem. to ALL (SP 36), ignores defense; misses floaters | "A herd of chocobos that runs over enemies": a flock of yellow chocobos charges across the battlefield edge to edge, trampling every grounded enemy in a dust cloud † | sprite-cameo stampede — the definitive "crowd of critters crosses the screen" effect |
| ✈✈✈ airships | Dive Bomb (H-Bomb) | Non-elem. to ALL (SP 130) | Setzer's airship silhouette swoops overhead and carpet-bombs the enemy side; multiple fireball explosions blossom across the line † | sprite-cameo (vehicle flyover) + explosion cluster |
| 🐉🐉🐉 dragons | Mega Flare (Sun Flare) | Summons **Bahamut**, Mega Flare to ALL (SP 92) | Bahamut's full summon sequence plays | summon cutaway + burst |
| BAR BAR BAR | Summon | Summons a random esper (not Odin/Raiden) | A random esper's entire summon animation plays | summon cutaway (random payload) |
| 7 7 BAR | Joker's Death (Joker Doom) | **Kills the entire party**, pierces death immunity | The screen darkens and giant playing-card imagery flashes over the field (the Joker's leer), then every target on the party side collapses via the standard death dissolve † | dark screen-flash + card sprite-cameo → mass instant-death |
| 7 7 7 | Joker's Death (Joker Doom) | Kills ALL enemies, pierces death immunity | Visually identical to 7-7-BAR — only the victims differ, which is exactly what makes it a legendary risk/reward moment (mechanically a modified Lv.5 Death; Strago can learn Lv.5 Death by watching either version) | same → enemy side |

### 6.6 Lore — Strago (all 24)

JP おぼえたわざ *Oboeta Waza* ("Memorized Skills") — FF6's Blue Magic. Strago permanently learns a Lore by *seeing* a compatible enemy ability used and surviving the battle. He starts with Aqua Breath, Revenge Blast, and Stone.

| GBA-modern (SNES-US) | MP | Effect |
|---|---|---|
| Doom (Condemned) | 20 | Sets a Doom countdown (~20 s) on one target |
| Roulette (Roulette) | 10 | Random Death: a selector spins over EVERYONE incl. allies/caster |
| Tsunami (CleanSweep) | 30 | Water magic to ALL (SP 50, HR 150) |
| **Aqua Breath (Aqua Rake)** | 22 | Water+wind magic to ALL (SP 71, HR 150) — starter |
| Aero (Aero) | 41 | Wind magic to ALL (SP 125, HR 150) |
| **1000 Needles (Blow Fish)** | 50 | Fixed 1,000 damage, 1 target |
| **Mighty Guard (Big Guard)** | 80 | Protect + Shell on the whole party |
| Revenge Blast (Revenge) | 31 | Damage = caster's max HP − current HP — starter |
| White Wind (Pearl Wind) | 45 | Heals the whole party = caster's current HP |
| Lv.5 Death (L.5 Doom) | 22 | Death to all enemies with level % 5 == 0 |
| Lv.4 Flare (L.4 Flare) | 42 | Flare-grade non-elem. to all with level % 4 == 0, ignores defense |
| Lv.3 Confuse (L.3 Muddle) | 28 | Confuse to all with level % 3 == 0 |
| Reflect??? (Reflect???) | 0 | Blind+Slow+Silence on all *Reflect-status* enemies |
| Lv.? Holy (L.? Pearl) | 50 | Holy (SP 120) to all with level divisible by the last digit of party gil |
| **Traveler (Step Mine)** | steps÷30 min | Fixed damage = total steps ÷ 32 |
| Force Field (ForceField) | 24 | Nullifies a random element battle-wide (stacks per cast) |
| Dischord (Dischord) | 68 | Halves one enemy's level (HR 100) |
| Bad Breath (Sour Mouth) | 32 | Blind+Poison+Imp+Confuse+Sleep+Silence on one target |
| Transfusion (Pep Up) | 1 | Fully restores one ally; caster leaves battle (self-sacrifice) |
| Rippler (Rippler) | 66 | Swaps ALL statuses between caster and target (bug source) |
| **Stone (Stone)** | 22 | Non-elem. damage + Confuse; ×8 damage if levels match — starter |
| **Quasar (Quasar)** | 50 | Non-elem. magic to ALL (SP 57), ignores defense |
| **Grand Delta (GrandTrain)** | 64 | Non-elem. magic to ALL (SP 84), ignores defense — Strago's ultimate; learned from Hidon |
| Self-Destruct (Exploder) | 1 | Caster dies; deals its HP as damage to one enemy |

**Standout visuals:**

- **Aqua Breath (Aqua Rake)** — *"Engulfs enemies in a stream of bubbles, dealing both wind and water damage."* A churning froth of bubbles and spray blasts diagonally across every enemy — turquoise particle streams with popping bubble sprites.† The classic early "learned my first blue magic" showpiece. `field-overlay` (bubble stream).
- **Grand Delta (GrandTrain)** — *"Creates a triangular energy field that deals massive damage to all enemies."* JP グランドトライン "Grand Trine". Walls of golden light rise and join into an expanding triangular lattice around the enemy side, then the whole delta detonates.† Geometric `field-overlay` (sacred-geometry cage) → burst. Despite the SNES spelling there is no train — "GrandTrain" is a truncation of *Grand Trine* (astrology), one of FF6's best-known name-restoration cases.
- **Quasar** — *"Calls down debris from outer space…"* The backdrop goes starfield-dark and glowing cosmic debris streaks down over all enemies (later reused as the Goddess's signature attack).† Backdrop swap + `rain-down` (cosmic).
- **1000 Needles (Blow Fish)** — *"Shoots tiny needles at an enemy, dealing 1000 damage."* A dense cluster of exactly-uniform white needles sprays into the target — the visual pun is fixed damage rendered as countable projectiles (Cactuar signature).† `projectile-volley`.
- **Traveler (Step Mine)** — a plain mine-like explosion under the target whose punchline is the number, not the pixels (damage = your own walked steps).† Single ground explosion.
- **Mighty Guard (Big Guard)** — a layered barrier shimmer wraps each party member — Protect's glass-sheen plus Shell's rippling dome, party-wide at once.† `aura-buff` (double-layer barrier).
- **White Wind (Pearl Wind)** — a soft luminous wind spirals gently across the party with feather-like motes.† Friendly-side `field-overlay` + `heal-sparkle`.
- **Roulette** — a literal selector cursor sweeps around every combatant before stopping; the chosen one dies.† **UI-as-VFX**: `gauge-UI` selector → `instant-death`.
- **Bad Breath (Sour Mouth)** — a multicolored stinking cloud rolls over the target trailing a parade of status icons.† Gas `field-overlay` + multi `status-splash`.
- **Self-Destruct (Exploder)** — the caster flashes red-hot and explodes, sprite gone.† Caster explosion + despawn.

### 6.7 Rage — Gau (standouts) and Sketch — Relm

**Rage** (JP あばれる *Abareru*, "go berserk"): Gau learns Rages by Leaping into formations on the Veldt; using one locks him into an uncontrollable state where each turn he 50/50 uses the enemy's normal attack or special, copying the monster's whole elemental/status profile. There are **250+ Rages**. VFX identity: **payload passthrough** — Gau's own sprite (hair-raised rage pose) performs the monster's attack animation, so nearly every enemy VFX in the game is reachable through one kid's sprite. The command itself needs no bespoke effects — it's a router into the existing animation library, which is why FF6 could afford 250+ of them.

Standout Rages:

| Rage (GBA-modern / SNES enemy) | Special used | Why notable |
|---|---|---|
| **Stray Cat** (Stray Cat) | Cat Scratch | The famous one: a pounce-and-claw flurry at ~4× normal attack damage — a simple `melee-dash` with claw streaks †; proof a plain animation can carry a broken number |
| **Magic Urn** (Magic Urn) | Curaga | Absorbs all eight elements while raged; free party-topping Curaga sparkle |
| **Tyrannosaur** (Tyranosaur) | Meteor | The full Meteor shower (`rain-down`, cosmic rocks) for free |
| **Io** (Io) | Flare Star | A swelling star detonates over all enemies † — one of the best AoE nukes in the game, off a machine-boss Rage |
| **Cactuar** (Cactrot) | 1000 Needles | The needle-spray `projectile-volley` at 0 MP |
| **Aspiran** (Aspik) | Gigavolt | A thick blue lightning `beam` †; early-game single-target nuke |
| **Behemoth King** (SrBehemoth) | Firaga | Gau becomes undead while raging (healable by Death!) |
| **Holy Dragon** (White Drgn) | Holy | The white pillar-of-light Holy animation, free † |
| **Guard Leader** (Marshal) | Wind Slash | Boss Rage; the green crescent `slash-wave` again |
| **Hell's Rider** (Rider) | Venomist | Boss Rage; poison bolt |

**Sketch**: Relm paints the target and uses one of *its own* abilities against it (75/25 between two options per enemy; damage uses the target's stats). VFX identity: Relm flourishes her brush (a dedicated wiki-catalogued "Sketch's Brush" sprite); a quick portrait outline of the enemy materializes — a duplicate of the enemy's sprite sketched into being — performs one of that enemy's attacks, then vanishes.† `sprite-cameo` (spawned enemy-copy) + payload passthrough. Infamous for the SNES 1.0 **Sketch bug** (inventory-corrupting glitch on a missed Sketch under specific conditions). Standouts: sketching Tonberry-class enemies fires Traveler damage; Chupon/Typhon sketches Snort (blows a target away); the story-mandated Ultros sketch is a scripted comedy beat.

### 6.8 Cross-cutting skill-family observations (for reuse)

1. **Four families are UI-first** — Bushido's gauge, Blitz's input string, Slot's reels, Roulette's selector. The interface is the animation's first act; skill fantasy is sold through input ritual before any pixels fire.
2. **Sprite manipulation beats particle count** — the era's most memorable effects mutate sprites: Suplex flips the target (even a train), Oblivion bisects the whole enemy side, Chainsaw's 25% roll swaps Edgar into a hockey mask, Rising Phoenix and Phantom Rush multiply Sabin into afterimages. Cheap, characterful, all reproducible with transforms.
3. **Re-skinned verb systems** — Dance is 8 biomes × {AoE attack, heal, status, mascot cameo} with palette/particle swaps; Lore's level-divisibility spells share one "targeted mass spell" template. Build the timeline once, skin it per element/biome.
4. **Rare-variant upgrades** — Chainsaw (25% execution), Dance's 1/16 animal cameos, Slot's rigged jackpot: FF6 repeatedly attaches a low-probability *visually richer* variant to a common action. A proven dopamine pattern.
5. **Arena as VFX** — successful cross-terrain Dances repaint the battle background; Quasar swaps in a starfield. Background mutation is an underused, high-impact effect channel.
6. **Payload passthrough commands** (Rage, Sketch, Slot's Summon) need no bespoke effects — they are routers into the existing animation library.

---

## 7. Cross-series icons — FF IV · V · VII · VIII · IX · X, with FF7 Remake/Rebirth as the modern reference

The ~32 most iconic offensive-magic, summon, and limit-break effects across the mainline series outside FF6. These archetypes recur so consistently that they are effectively a design language; modern games (FF7R/Rebirth, FFXIV, FFXVI) still speak it. Cross-series-specific archetypes used here (defined in §2): **cosmic cutaway**, **orbital cannon**, **dimension shift**, **blade flurry**, **instant-death cut**, **sacred pillar / ray salvo**, **dome detonation**, **sky-fall barrage**, **toxic cloud/bubble**, **reaper omen**, **charge-and-release**, **mechanical/aleatory spectacle**.

### 7.1 Summon spectacles

**1. Knights of Round — FF VII** (Ultimate End). The battlefield dissolves into a mist-shrouded otherworld with a stone bridge. Thirteen Arthurian knights materialize one at a time from a portal of light, each performing a distinct attack in sequence — longsword, lance, rod casting Fire-like magic, mace, longsword, hammer, wand casting Blizzard-like magic, trident, staff casting Comet, naginata, battle axe, sword, and finally (implicitly King Arthur, per the *FFVII Ultimania Omega*) Excalibur with a "grander entrance and attack." The twelve non-Arthur knights reuse **four models in three color variants each** — palette-swap instancing, the ancestor of GPU-instanced variant crowds. The full sequence is the longest summon animation in FF7 (over a minute), 13 hits ignoring Magic defense. The template for "the summon that is itself a cutscene." *Archetype: blade flurry × dimension shift.* Modern stack: sequenced multi-actor choreography, per-hit camera cuts, instanced tint variants, damage numbers as rhythmic punctuation.

**2. Bahamut → Neo Bahamut → Bahamut ZERO — FF VII.** Three-tier escalation of the same dragon: **Mega Flare** (charging sphere in the maw → whiteout beam), **Giga Flare** (Neo Bahamut lifts the terrain with the party on it before detonating), **Tera Flare** (Bahamut ZERO summoned *in orbit* — the camera cuts to space, the dragon fires a beam down through the atmosphere, the impact blooming on the planet surface below). The clearest "same summon, bigger number, bigger camera" tier design in the series; Tera Flare's from-orbit shot is *the* canonical orbital-cannon image, restaged by FF7 Rebirth's Bahamut Arisen Gigaflare. *Archetype: charge-and-release → orbital cannon.* Modern stack: vertical camera language (ground → sky → orbit) encoding power tier; lens-flare charge glow; atmosphere-entry beam with bloom halo.

**3. Eden, "Eternal Breath" — FF VIII** (GF). Verified sequence: screen blacks out; a blurry transmission of Eden plays "akin to satellite wave telecommunications interference"; Eden descends from the stars, parting the clouds; its energy barrier encloses the foes and pulls them into the GF's dimension; **the entire planet transforms into an iridescent clockwork sphere and is used as a cannon**, firing the enemies into space; the beam destabilizes the black hole at a nearby galaxy's bulge. Ptolemy's celestial-spheres diagram floats in space early on — lifted directly from Supernova as a deliberate callback. The longest summon animation in FF8 at **72.6 seconds**; breaks the damage cap without Boost. *Archetype: cosmic cutaway × dimension shift × orbital cannon — all three at once.* Modern stack: signal-interference/hologram shader as an *entrance* (scanlines, chromatic distortion — a screen-space effect avant la lettre); planet-scale prop transformation; galactic-zoom camera.

**4. Diablos, "Dark Messenger" — FF VIII** (GF). The battlefield darkens; the bat-winged demon unfurls from a black orb; arcane sigils flash during the sequence (wiki gallery preserves them); a sphere of gravity/darkness crushes the enemies. Damage is a percentage of max HP equal to Diablos's level — the one GF whose damage formula is its own personality. The definitive "gravity well swallows the screen" look that FF7R's Gravity spells still quote. *Archetype: dimension shift / gravity vortex.* Modern stack: inverse-bloom (darkness as light source), screen-space distortion around a singularity, occult sigil overlays (now standard "magic circle" grammar).

**5. Odin / Zantetsuken (and Gilgamesh) — series-wide, peak in FF VIII.** Odin dashes past on Sleipnir with a single horizontal draw-cut; **the enemy models bisect and slide apart before fading — a death animation unique to Zantetsuken**. FF8 flashes the kanji 斬・鉄・剣 on screen as the cut replays **three times from different angles** — the series' first true impact-frame montage; Odin arrives unbidden at the start of random battles, and when Seifer bisects *Odin*, Gilgamesh emerges from a dimensional portal, takes the sword, and replaces him — a legendary scripted subversion. FF9 makes it Dagger's summon; FF5 casts it via the Magic Lamp, slicing even bosses that then reform. *Archetype: instant-death cut.* Modern stack: hit-stop + multi-angle replay editing, typographic impact frames (kanji cards), cap-slice bisect geometry — FF7 Rebirth's Odin re-uses all of it, adding Gjallarhorn's Warning as a dread-telegraph before his party-wiping Zantetsuken.

**6. Ark, "Eternal Darkness" — FF IX** (Terra's summon). Verified: Ark departs from Terra's red moon as an airship with a dragon's head, **transforms into a mecha at terminal velocity within Gaia's orbit**, hovers, targets the enemy with a laser glyph, fires a salvo of explosive lasers from its wings, and finishes by charging a larger laser **whose impact can be seen from space**. Shadow-elemental, all enemies. The most audacious tonal swerve in FF9 — a full transforming mecha in a fairy-tale game; its storyboard survives in the wiki gallery. *Archetype: cosmic cutaway × mechanical spectacle × orbital cannon (inverted — fired from low orbit, impact viewed from space).* Modern stack: transformation rigging as spectacle; target-designation UI (laser glyph = modern lock-on decal); persistent scorch decals; scale-reversal closing shot.

**7. Alexander, "Divine Judgement" — FF IX** (cutscene eidolon). A colossal angel-winged fortress towers over Alexandria; **four seraphic wings of white feathers unfurl from the castle itself**; it shields the city and "obliterates Bahamut with rays of holy light" — then is destroyed by Garland's *Invincible*. The series' biggest summon-vs-summon set piece; never player-castable, which made it mythical. *Archetype: sacred pillar / ray salvo at architectural scale.* Modern stack: environment-as-character (the castle IS the summon), volumetric god-rays, feather particle systems.

**8. Madeen, "Terra Homing" — FF IX** (Eiko's ultimate). The winged beast-eidolon gathers holy light and releases a homing surge that engulfs all enemies in a white-gold detonation — the playable stand-in for Alexander's holiness. *Archetype: sacred pillar.* Modern stack: homing-projectile trails converging on a shared detonation point — the standard "seeking light missiles" pattern.

**9. Mist Dragon — FF IV** (Rydia's first summon). A dragon that dissolves into mist and reforms (the opening boss teaches the mechanic: attack it in mist form and it counters). As a summon it sweeps in and exhales **Mist Breath / Radiant Breath** — a shimmering vapor cone. Story apex: adult Rydia's Dwarven Castle entrance, summoning it mid-cutscene. The first summon most SNES-era players ever saw; state-change (solid ↔ mist) as both gameplay and VFX. *Archetype: charge-and-release (breath cone) + material state-change.* Modern stack: alpha-dissolve/participating-media transitions (mist form = volumetric fog), summon-as-narrative-reveal staging.

**10. Bahamut, "Mega Flare" — FF X** (aeon). Yuna's summoning glyph flares; Bahamut plunges from the sky, the ornate wheel on his back spinning. For the overdrive he **charges Mega Flare by spinning the wheel while a spherical energy ball forms before his maw**, then releases a beam that engulfs the field. Natively breaks the damage limit. FFX made summons *party members* — persistent, controllable, with their own overdrive cinematics; the spinning-wheel charge is FFX's most-reused signature shot. *Archetype: charge-and-release.* Modern stack: charge-time visualization via a rotating mechanical element; two-stage beam + explosion payoff; the summon-entrance glyph as standard "summon sigil" VFX.

**11. Anima, "Oblivion" — FF X** (secret aeon). Verified: "a portal opens in the sky from which a large anchor falls into and through the ground. It pulls Anima up, revealing her chain-bound form." Overdrive: "She opens a gateway into her world beneath the enemy party, sinking them. The world shifts to a crimson dimension, where an even darker form of Anima **shatters the chains binding her fists** and unleashes a devastating sixteen-hit combo" — up to 99,999 per hit (~1.6M total in International/HD), the single highest-damage attack in the game. Body-horror sorrow as summon design; the anchor-and-chains entrance is among the most imitated summon intros. *Archetype: dimension shift × blade flurry (fists).* Modern stack: two-stage character reveal; restraint-breaking as power-fantasy beat (chains shatter = limiter release); full-scene palette swap — the modern "domain expansion" pattern years early.

**12. Yojimbo, "Zanmato" — FF X** (mercenary aeon). The player *pays him gil*; he weighs the payment, and — if satisfied — nods, draws, and delivers a single iaijutsu cut that instantly kills **anything**, Dark Aeons and Penance included. Gameplay economy rendered as theater; the one summon whose most important animation is *him deciding*. *Archetype: instant-death cut × aleatory spectacle.* Modern lesson: anticipation animation as the real content (the pause before the draw = impact-frame discipline); minimal VFX, maximal meaning — the counterweight to the cosmic cutaways.

**13. The elemental trio: Hellfire / Diamond Dust / Judgment Bolt–Thunder Storm — FF VIII → FF X.** Ifrit, Shiva, and the lightning summon (Ramuh in most games; Quezacotl in FF8) are the load-bearing elemental identities of the franchise. FF8 gives each a mid-length cinema (Ifrit 13.0 s, Shiva 12.9 s per the Ultimania); FFX upgrades them to persistent aeons whose overdrives are the cinematics: Ifrit's Hellfire engulfs the field in eruptions and a hurled flaming mass †; Shiva's Diamond Dust flash-freezes the arena and shatters it — famously punctuated by her finger-snap †; Ixion spins up Thor's Hammer. A Real Time VFX moodboard thread cites FFX Shiva for crystal-themed effects — these are the summons working VFX artists actually board from. *Archetype: charge-and-release, one per element.* Modern stack: elemental material language (fire = emissive + smoke; ice = refraction + fracture; lightning = branching emissive ribbons); FF7R adds screen-space frost accumulation and heat distortion, and gave Shiva a unique impact sound to disambiguate the ice family.

**14. The modern reference set — FF7 Remake / Rebirth summons.** Remake's **Bahamut** (gray dragon glowing purple under its scales; Umbral Strikes + Megaflare); Rebirth's **Bahamut Arisen** (a bio-mechanical dragon with retractable blade-arms, shoulder turrets, and wing-mounted lasers; Infernal Rush + Gigaflare — explicitly based on Neo Bahamut); Rebirth's **Alexander** (a giant robot with column-like arms and a knight's-helm head; Tracking Beam, Wave Cannon chest beam, Divine Judgement head laser); Rebirth's **Odin** (a summon *and* a dread-mechanic boss whose Zantetsuken party-wipe is telegraphed by Gjallarhorn's Warning). They demonstrate the modern translation: summons are physically-simulated battlefield actors with ATB-costed sub-abilities and one ultimate cinematic — the PS1 cutaway compressed into a playable ~8-second camera take, announced by a fixed three-beat materia-glow → arena-shake → entrance-slam.

### 7.2 Enemy super-attacks (the "final boss goes nova" family)

**15. Supernova — FF VII, Safer∙Sephiroth.** Original Japanese version: a still of the solar system; three bodies slowly encased in bubbles of white light. International version: the infamous ~2-minute extension — **Ptolemy's diagram of the celestial spheres appears with genuine-looking physics equations overlaid** (two compute attractive forces; one is actually just the area of a circle), then a comet streaks through the solar system: Pluto disintegrates, Saturn loses its rings, Jupiter is annihilated, the comet strikes the Sun, and the shockwave destroys Mercury and Venus before slamming the party — for *fractional* damage (15/16 of current HP) plus statuses. The most excessive attack animation in series history; the pseudo-scientific chalkboard overlay became its own meme, and Eden directly reuses the Ptolemy diagram. *Archetype: cosmic cutaway.* Modern stack: diegetic infographic overlays inside an attack; full-screen color grade shifts; escalating scale cuts; "the attack as a short film" pacing.

**16. Big Bang — FF IV, Zeromus.** Zeromus's opener and recurring ultimate: the screen erupts in a swirling cosmic shockwave hammering the entire party and inflicting Sap (2D: full-screen palette-flash vortex †; the 3D remake stages a churning energy storm). The first "final-boss ultimate with its own name and screen takeover" in the series — the template Supernova later inflated. *Archetype: proto cosmic cutaway.* Modern stack: full-screen shader takeover; DoT status as lingering after-effect.

**17. Grand Cross — FF V Neo Exdeath (and FF IX Necron).** Preceded by an ominous message, a starfield cross of light fills the screen; each party member is independently rolled against a pool of **17 status ailments**. Necron's FF9 version rains cruel combinations — killing a character *and* zombifying them simultaneously. The scariest attack in FF5 not for damage but for *chaos*: a status storm as spectacle. *Archetype: sky-fall barrage (of statuses).* Modern stack: randomized per-target outcomes with individual mini-VFX per status — the ancestor of debuff-icon burst storms.

**18. Almagest — FF V, Neo Exdeath.** A holy-elemental full-party nuke: an expanding wall of white-blue radiance floods the screen and leaves Sap ticking. Named for Ptolemy's astronomical treatise — the same Ptolemy whose diagram appears in Supernova and Eden; the series keeps returning to this well. The rhythm-setter of the final battle: FF5 endgame strategy is literally scheduled around surviving Almagest casts. *Archetype: sacred pillar as enemy weapon — holy light turned hostile.* Modern stack: full-screen additive white-out with slow falloff + DoT residue.

**19. Ultima as boss weapon — FF IX, Trance Kuja.** "An erratic rain of pink-purple energy" (wiki) — unlike every other Ultima. In the FMV, Kuja's Ultima blows Terra apart; in the boss fight it scriptedly wipes the party to move the story. A player-canon spell weaponized as an unwinnable narrative device. *Archetype: dome detonation subverted into a barrage.* Modern stack: scripted-loss staging; color-coding villainy (Kuja's pink-violet vs Ultima's usual blue-green).

### 7.3 Limit breaks and overdrives

**20. Omnislash — Cloud Strife, FF VII** (Level 4 Limit Break). Cloud's blade ignites with charged energy; he blurs between random enemies delivering **15 auto-critical slashes**, motion-trail ribbons hanging in the air, then descends with a final overhead blow. Per the wiki itself, "one of the most iconic and famous special attacks in the series." **Omnislash Version 5** (*Advent Children*): Cloud splits the Fusion Sword into its six components and strikes once with each. Returns in FF7 Rebirth as Cloud's Level 3 limit. *Archetype: blade flurry.* Modern stack: trail meshes (the glowing sword ribbons), teleport-dash between hits, per-hit micro camera cuts, final-hit hold (impact frame + slow-mo). In FF7R the Cross Slash limit's sound is *embedded in the VFX asset itself* so audio tracks the effect's exact 3D position.

**21. Renzokuken → Lion Heart — Squall Leonhart, FF VIII.** Squall dashes in as a timing gauge appears; the player taps R1 as bars sweep the trigger zone, landing 4–8 gunblade hits (each timed press a critical with the revolver-click flourish). With the Lion Heart gunblade there is a 25% finisher chance of **Lion Heart**: Squall launches the enemy skyward and juggles it with **seventeen** light-trailed slashes. The first *interactive* limit break — player input inside the cinematic; the pale-blue blade streaks are FF8's cover-image moment. *Archetype: blade flurry with QTE input.* Modern stack: input-synced hit timing (the direct ancestor of action-RPG timing windows); aerial juggle staging; weapon-material emissive (the blade's glow IS the effect).

**22. Tidus's Swordplay, capped by Blitz Ace — FF X.** All four Swordplay overdrives use a sweeping timing bar (stop the cursor centered for full power). **Blitz Ace**: a flurry of sword strikes, then Tidus back-flips into the air as a blitzball is lobbed in and he spike-kicks it through the target in a Jecht Shot callback † — sport-as-swordplay characterization, fusing the protagonist's two identities. *Archetype: blade flurry + timing-bar spectacle.* Modern stack: skill-check-scaled VFX intensity; character-theme props inside combat effects.

**23. Wakka's Slots / Attack Reels — FF X.** Literal slot-machine reels spin on screen; the stopped combination determines the barrage — three 2-Hits yields **12 blitzball strikes** ricocheting off enemies with cartoon spin-trails. Potentially the strongest player attack in the original release. The purest "UI is the VFX" attack in the series, direct ancestor of every gacha-wheel attack since. *Archetype: mechanical/aleatory spectacle.* Modern stack: diegetic slot UI; randomized multi-hit payloads.

**24. Auron's Bushido — FF X.** Button-sequence input under a timer; on success, **kanji flash on screen** as Auron executes (e.g. Tornado, where he swigs from his jug and spits liquor across his blade before the cyclone †). Kanji-as-impact-frame again — the FF8 Odin trick, now player-owned; the sake-spray flourish is pure character. *Archetype: instant-cut theater + typographic impact frames.*

### 7.4 The core spell canon across games

**25. The -aga tier (Firaga / Thundaga / Blizzaga) — the elemental ceiling.** FF IV: Fire3/Lit-3/Ice3, full-screen sprite flashes. FF V: level-5 black magic, also delivered via Spellblade — the -aga *on the sword*. FF VII: leveled materia — **the animation changes when linked with the All materia** (verified for all three): single-target = focused burst; all-target = screen-sweeping storm. FF VIII: drawn/refined commodity tuning GF compatibility. FF IX: Vivi's suite; Steiner's Sword Magic borrows them as blade enchants. FF X: Lulu's grid line. FF7 Remake: Firaga = "major fire damage… long casting time"; Blizzaga uniquely hits twice in a radius. **FF7 Rebirth adds the α-variants**: casting Firaga/Blizzaga/Thundaga with the matching weapon ability unlocked bestows a **persistent elemental sphere orbiting the caster's model for the rest of the battle** — a buff *worn as VFX*. The tier ladder (base → -ra → -aga) is the franchise's most legible visual-power grammar: bigger radius, longer charge, deeper shake, whiter core. *Archetype: charge-and-release, elemental material language.* Modern doctrine (from *Inside FF7R* Ep. 5): **the same shader drives both real fire and magical fire** — magical fire is differentiated by emissive particles and aura-like effects "to make it appear dazzling," so the photorealistic base never breaks. Realism base layer + emissive fantasy layer.

**26. Flare — the non-elemental implosion.** FF IV: "Nuke" on SNES. FF VII: Contain materia, fire-typed here. FF VIII: top-tier draw. FF IX: Vivi's strongest single-target. FF X: Lulu's capstone before Ultima. Classic look: converging light collapses onto the target, a beat of silence, then a white-orange implosion-burst — heat without flame †; *Crisis Core*'s version "lights up the screen with a bright red flash." The "clean nuke": Flare reads as pure energy where Firaga reads as fire; the pause-then-burst timing is its identity. *Archetype: charge-and-release, single-point.* Modern stack: negative-space anticipation (dark frame before detonation = impact frame); bloom-driven white-out.

**27. Holy — the white counterpart.** Series look: "sacred energy, often hued light to whitish blue," rising pillars or falling comets of light; censored to Fade/White/Pearl in early localizations — **FF7 was the first English release allowed to call it Holy**. FF IV: Rosa's endgame nuke. FF V: Fork Tower prize, paired dungeon with Flare — the game literalizes the black/white duality. FF VII: pure plot device — the Ultimate White Magic in Aerith's White Materia, the only force that can stop Meteor; at the end it erupts from the crater as swirling white light against Meteor's red — the franchise's single most famous spell image: two colors of light deciding a planet's fate. FF IX: Eiko's signature — a column of light snaps up under the target. *Archetype: sacred pillar.* Modern stack: vertical light-shaft compositing, soft bloom, particulate dust-in-godray — the modern holy look is a lighting effect more than a particle effect.

**28. Meteor — the sky falls.** FF IV: the sealed spell Tellah casts *at the cost of his life* — the series' first "spell as narrative sacrifice"; late-game it's the multi-rock barrage at the game's damage ceiling. FF V: Time Magic, four random strikes. FF VII: not castable at all — **Meteor is the antagonist's planet-killer, a scarred red eye in the sky over every late-game scene**; the sky itself becomes persistent UI. FF VIII: ten scattered hits. FF IX: Vivi's endgame gamble — can whiff or hit for extreme numbers. FF X: enemy-only. The only spell that has served as a *world state* — VFX as standing narrative pressure. *Archetype: sky-fall barrage.* Modern stack: persistent skybox modification; staggered impact decals and per-rock camera shake; randomized multi-strike patterns.

**29. Ultima — the green-blue dome.** Series look (verified): "the caster conjures an expanding dome of magical energy… the spell's color often shifts between being blue and green." FF VI codified the dome; every game since keeps it. FF VII: 130 MP, from the North Corel Huge Materia — and "**the only spell that switches between three camera angles**," the game's own cinematography flagging it as the ceiling (multi-camera coverage of a single effect, in 1997). FF VIII: best junction magic in the game. FF IX: enemy-exclusive (Trance Kuja). FF X: the center of the Sphere Grid behind four Level-4 locks — geography as gatekeeping. The series' agreed-upon "final spell"; its dome is the shape players read as *maximum*. *Archetype: dome detonation.* Modern stack: expanding shockwave-shell geometry with fresnel edge glow; refraction inside the dome; authored multi-camera coverage.

**30. Death & Doom — the reaper omen.** Series look (verified): Death "is represented by the personification of death, the Grim Reaper" in most games; Doom's animation "usually features the Grim Reaper or a skull," plus countdown numerals ticking above the victim. FF V: Doom is Blue Magic; a Grim Reaper sprite appears and the target dies 30 seconds later. FF VII: Destruct materia; Nomura himself drew Grim Reaper concept art for FF VIII. **FF IX (best-in-class, verified): "a mirror appears in front of the doomed character, and the Grim Reaper appears on its surface shining its red eyes before the mirror shatters."** FF X: Death "never fails unless the target is completely immune." Horror grammar inside a JRPG: an omen, a countdown, a personification — dread stretched over time instead of burst damage. *Archetype: reaper omen.* Modern stack: countdown as diegetic VFX; jump-scare framing (the FF9 mirror); delayed-kill choreography.

### 7.5 The Bio / poison family — the toxic motif traced across games

The poison line is the series' most *texturally* consistent motif: green-violet palette, viscous sludge, rising bubbles. Mechanics shift under it; the look barely does.

| Game | Name(s) | Mechanics (verified) | Visual (motif trace) |
|---|---|---|---|
| **FF III** (origin) | Bio | Heavy non-elemental, no rider | "The spell unleashes biohazardous sludge onto targets" — the wiki's own family definition |
| **FF IV** | Bio ("Virus" on SNES) | Moderate non-elemental + **Sap**; also Zeromus's tool | Sprite-era: a spray of dark particles washing over the enemy row † |
| **FF V** | Bio | First **poison-elemental** Bio + Sap; Spellblade Bio instant-kills poison-weak non-heavies | Green wave/cloud burst; the bubbling texture enters here † |
| **FF VI** | Bio | Upgrade of Poison | In-game description literally: **"Releases a bacterial cloud"** — the canonical statement of the motif |
| **FF VII** | Bio / Bio2 / Bio3 | Poison materia line; first game where Bio *replaces* Poison as the status carrier; Bio2/Bio3 originate the -ra/-ga poison tiers | A churning mass of green-violet gas wells up around targets and bursts into bubbles; each tier a bigger, longer sludge eruption † |
| **FF VIII** | Bio | Poison-elemental + Poison; strong vs humans, useless vs mechs; raises Doomtrain compatibility, lowers Alexander's | A thick spatter of luminous green ooze splashing over the enemy † |
| **FF IX** | Bio | 18 MP; stronger than all of Vivi's -ra tier with flat 20% Poison — the mid-game workhorse | The wiki's own lead image for the family: a swarm of glossy green bubbles erupting around the target and popping — the bubble motif at its most explicit |
| **FF X** | Bio | Pure status tool: inflicts Poison, "never fails unless immune" | Cast: a puff of violet-green vapor; ongoing status: **green bubbles rising above the poisoned unit's head** — the status iconography IS the bubble |
| **FF7 Remake** | Bio / Biora / Bioga | Poison materia; Bio guaranteed to hit — valued vs magic-resistant enemies | A lobbed orb of luminous violet-green sludge bursts into a lingering, bubbling miasma pool; poisoned enemies drip green motes † |
| **FF7 Rebirth** | Bio line | Returns as spell + enemy ability | Volumetric toxic haze + emissive bubbles; DoT ticks visualized as rising green particles † |

**Family through-lines worth stealing:**
1. **Palette is identity** — poison never leaves green-violet, in any engine, in 35 years.
2. **Bubbles carry the DoT** — the *status* (ongoing damage) is visualized as slow rising bubbles; the *cast* is the splash/cloud. Two distinct VFX jobs, one motif.
3. **Viscosity signals tier** — Bio-tier is gas, Bioga-tier is liquid sludge; thicker = stronger.
4. **Mechanical drift under stable visuals** — Bio has been non-elemental damage, poison damage, sap-carrier, and pure status tool while looking the same; visual language outlives systems.

### 7.6 What FF7 Remake / Rebirth actually does (verified modern doctrine)

1. **One shader, two realities.** *Inside FF7R* Ep. 5: the same shader drives real fire and magical fire; magical fire adds emissive particles and aura effects "to make it appear dazzling… the photorealistic approach does not change." Real fire additionally simulates smoke and ash. The core doctrine for grounding fantasy VFX in a physically-based renderer.
2. **Audio welded into VFX.** FF7R sound team (A Sound Effect interview): Cross Slash's attack sound is embedded into the VFX asset so it positions in exact 3D; Bahamut's wing-feather sounds are attached to the left and right bones individually; the ice family was disambiguated by giving Shiva a unique impact sound. Effect, sound, and skeleton are one asset.
3. **Persistent-buff VFX.** Rebirth's α-tier spells attach an orbiting elemental sphere to the character for the rest of the battle — state made permanently legible as an effect, not an icon.
4. **Dread as telegraphy.** Rebirth's Odin builds his instant-kill on an audio-visual warning chain (bored posture → Gjallarhorn's Warning → Zantetsuken). The VFX system *is* the boss mechanic.

---

## 8. How the SNES did it — technical appendix

FF6's battle renderer is a **Mode 1 engine with the screen sliced into horizontal regions by HDMA**. Every one of its famous effects decomposes into six PPU primitives, driven by a bytecode animation-script VM. The canonical machine-readable ground truth is **`everything8215/ff6`** (GitHub, GPL-3.0) — a buildable full-game disassembly whose `src/btlgfx/` module (~49,000 lines) is the battle-graphics program described here. All ROM/RAM addresses are FF3us.

### 8.1 The six primitives

1. **Three background layers + sprites in Mode 1** — BG1 (4bpp animation layer), BG2 (4bpp battle-background art), BG3 (2bpp text/effect layer), with BG3's high-priority bit pulling effects/text in front of everything.
2. **Color math** — the PPU blender (CGWSEL/CGADSUB/COLDATA) for translucency and screen tints, *plus* a second, purely software system that adds/subtracts RGB into CGRAM palette copies every frame (this does most of FF6's flashes and glows).
3. **HDMA on all 8 channels** — per-scanline scroll (wave distortion), per-scanline fixed-color writes (gradients), per-scanline window positions (expanding circle/dome masks), per-region register swaps splitting the screen into battlefield / menu / slot bands.
4. **Palette cycling** — a dedicated opcode pair rotates a run of CGRAM colors left/right at a chosen speed.
5. **Mosaic** ($2106) — a one-byte scriptable pixelation effect, applied per-region through the same HDMA table that carries the BG mode.
6. **Mode 7** — a handful of battle animations and esper summons switch the battlefield region to Mode 7, with a dedicated compressed Mode 7 tileset in ROM and matrix registers shadow-buffered and written during NMI.

### 8.2 Mode 1 + BG3 priority; layer roles in battle

Battle init stores `#$09` into the BGMODE shadow byte — **Mode 1 with the BG3-high-priority bit set** (BGMODE bit 3: BG3 high-priority tiles render *above* BG1/BG2 — the classic "text box in front of everything" trick). Spell layers render with 16×16 characters, which is why the animation data formats are organized in 16×16 blocks.

| Layer | Format | Role |
|---|---|---|
| **BG1** | 4bpp | Battle **animation layer** — spell backdrops (the Inferno flame sheet, full-screen magic art); alternatively holds a copy of the target's graphics (for warp effects) or "BG1 monsters" (big bosses drawn as a background instead of sprites) |
| **BG2** | 4bpp | The **battle background** art (grass, desert, Magitek factory…) |
| **BG3** | 2bpp | Battle **text/menu font** plus a second, cheaper animation layer (Justice/Earth-Aura style overlays); the priority bit pulls it in front (`$38: enable high priority bg3 (justice)`) |
| **BG4** | 2bpp | Only meaningful in the menu band |
| **OBJ** | 4bpp | Character sprites, monster sprites, cursors, damage numerals, and up to 80 spell-sprite threads |

The screen is **split into HDMA-defined regions**: channels #3, #6, #7 rewrite the PPU mid-frame so the battlefield, the menu strip, and (when active) the Slots reels each get their own BG mode, mosaic setting, tilemap addresses, and layer enables — including a top/bottom letterbox band that simply disables all layers.

### 8.3 The two blending systems (commonly confused)

**System 1 — true PPU color math (hardware blending).** `$2130 CGWSEL` selects the second operand (fixed color or the sub screen); `$2131 CGADSUB` picks add/subtract, half-math, and participating layers; `$2132 COLDATA` writes 0–31 intensities per RGB channel of the fixed color. Operations clamp per channel. Sprites only participate via OBJ palettes 4–7 — palettes 0–3 always reject color math, which lets opaque combatants coexist with translucent spell art. The animation script writes these registers directly via opcode `$D4`. Because FF6 keeps combatants on OBJ and spell art on BG1/BG3, a BG1 spell layer can be additively blended over the whole battlefield while sprites stay opaque.

**System 2 — software "color math" on CGRAM (the workhorse).** Most FF6 flash/glow/darken effects don't use the PPU blender at all. The engine keeps per-group RGB add/sub quantities in RAM (sprite palettes 3/2/1, background, monster, character groups) and applies them **every frame from the *unaltered* palette copies into the *current* palettes**, saturating per channel, then uploads to CGRAM. Script opcodes `$AA–$BC`, `$CC–$CF`, `$FB–$FE` drive it — absolute set (format `rgbfffff`: RGB enable bits + 5-bit amount) or relative ramp (`rgbaffff`: amount increases/decreases per tick). That's how a monster flashes red when hit, characters glow when hasted, and the whole background dims during Pearl — palette-space blending, orthogonal to CGADSUB, working on any layer including OBJ palettes 0–3.

**System 3 (a hybrid) — fixed-color gradients.** Gradient opcodes (`$33` rainbow, `$39` blue [S.Cross, Carbunkl, Odin], `$4B` red/yellow [Megazerk], `$5F` blue backdrop [Overcast]) fill a WRAM table of per-scanline COLDATA/CGADSUB values so **the color math changes every scanline** — producing the vertical rainbow/blue/red-gold light curtains behind the gradient-staged summons.

### 8.4 Palette cycling and palette animation

- **In battle**: opcodes **`$A3/$A4`** rotate a contiguous run of colors within a CGRAM palette left/right — parameters pick first color offset, run length, palette index, and loops-per-shift (`aaaabbbb ccccdddd`). Classic palette cycling: waterfall/energy shimmer without redrawing a single tile. The relative add/sub opcodes provide **palette pulsing**.
- **On maps** (for contrast): 12-byte palette-animation records drive three types — **Cycle** (rotate colors), **ROM** (stream palette frames), **Subtract pulse** — animating the Lete River, lava, Imperial Camp fires, and Narshe snow glints. Tile-level animation (4-frame tile swaps) is a separate system.

### 8.5 HDMA — the full battle channel map

HDMA tables are lists of `(line-count, data)` entries; repeat mode writes fresh data every scanline. FF6 battle uses all 8 channels:

| Ch | Target registers | Effect |
|---|---|---|
| #0 | `$210D` BG1 scroll | Per-scanline scroll on the animation layer — waves on spell art |
| #1 | `$210F` BG2 scroll | **Battle-background wave distortion** (the "wavy/heat" backgrounds) |
| #2 | `$2111` BG3 scroll | BG3 scroll — also slides menu lists; Pearl's scripted BG3 scroll |
| #3 | `$2105–$2108` mode/mosaic/tilemap | Per-region **BG mode + mosaic** (battlefield/menu/slot bands) |
| #4 | `$212F–$2132` color math + fixed color | Per-scanline **color-math windows + fixed-color gradients** |
| #5 | `$2126+` window positions | **Window shape animation** — the expanding spell masks |
| #6 | `$2109–$210C` BG3/BG4 bases | Completes the per-region tilemap swap |
| #7 | `$212A–$212D` window logic + layer enables | Per-region layer enables — letterboxing and menu isolation |

Script opcode `$AC` parameterizes wave frequency/amplitude/axis per BG (`123fffff vhaaaaaa` — "max amplitude 14, must be even"); `$AD` picks among ~20 prebuilt waveform tables; `$AE` updates live. **Wavy battle backgrounds are data-driven**: bit 7 of the battle-background record's palette byte marks the background "wavy" (heat-shimmer) — set for e.g. the WoB desert and the burning-house background.

### 8.6 Windows — how Ultima's dome and Bio Blast's spray are drawn

The battle engine builds per-scanline window position tables (HDMA #5 → `$2126+`) from a parametric "circle" state machine: current/final size, X/Y, grow speed, flip — and a **shape selector**:

```
circle shape: 0 = circle, 1 = bio blast, 2 = big blob, 3 = beam from top,
              4 = vertical oval, 5 = small blob, 6 = horizontal oval,
              7 = ultima, 8 = slimer blob
```

Scripts init/move/resize it with `$A5–$A9`, `$C3`, `$D3`, switch shapes with `$58`, and set which layers the window masks via `$45`/`$57`. Combined with HDMA #4's per-scanline color-math window, this yields the signature FF6 look: a black (or color-mathed) expanding aperture over the battlefield with the spell art inside. Driving the two hardware windows' left/right edges per scanline turns them into arbitrary convex shapes — spotlights, circles, domes.

### 8.7 Mosaic, Mode 7, brightness, raster sync

- **Mosaic**: script `$BE xx` writes the `$2106` shadow ( `SSSS 4321`: 4-bit block size + per-BG enables); because `$2106` rides HDMA #3, pixelation applies **per region** — the battlefield can dissolve into blocks while the menu band stays crisp. Used by boss-death dissolves and full-screen "shatters"; the field-side analogue drives map transitions.
- **Mode 7 in battle**: sub-commands `$80/$40` (set screen mode), `$80/$41` (zoom/move BG1 — the Mode 7 scale/translate matrix), `$80/$42` (M7SEL flips). NMI uploads the shadowed matrix to `M7A–M7Y` every frame. A dedicated compressed **Mode 7 attack tileset** ships in ROM (`AttackGfxMode7` at `$D8D000`); esper summons route monster art into Mode 7 via a stencil-driven tile packer.
- **Screen brightness** (`$2100 INIDISP`): shadowed; a sub-command decrements it (the magicite-transform fade; the esper summon-in dim).
- **Raster sync**: script `$F7` waits for a specific vertical scanline before continuing — animations can align updates with the HDMA regions. Raster-synced scripting, in 1994.

### 8.8 The attack-animation bytecode VM

**Attack records.** Each of 406 attacks has a **14-byte header** at `$D07FB2`: script/graphics indexes for up to **4 layers** (Sprite, BG1, BG3, and the "extra" layer used by espers), per-layer palette indexes (palettes at `$D26000`), default sound effect, a "copy target's graphics to BG1" flag, an **animation init function** index (sets thread count — "Fire uses 3 threads… Drain uses 6" — window mask shape, and color add/sub config), and a multi-target delay.

**Threads.** Up to **85 concurrent animation threads** (8 sprite threads × 10 combat slots + 1 BG1 + 1 BG3 + 3 esper threads), each 64 bytes of state: position, frame, OAM attributes, script pointer, speed, loop state, attacker/target, palette, layer, and **vector math state** — the direct page holds `x0,y0,x1,y1 → dx,dy, θ = arctan(dy/dx), √(dx²+dy²)`; the engine literally computes arctangents so boomerangs and beams can fly between arbitrary attacker/target positions.

**Scripts.** Bytecode lives in bank `$D0` with a 2-byte header (animation speed nibble + sprite alignment bits), then opcodes until `$FF`. The opcode families:

| Family | Representative opcodes |
|---|---|
| **Frames & graphics** | `$00–$1F` show sprite frame 0–31; `$81/$82` change attacker/target graphic; `$98` auto-increment frame |
| **Movement** | `$83/$86/$87` move by 3-bit direction + 5-bit distance; `$92–$95` vector movement attacker→target; `$E8/$EF` polar movement (radius, theta); `$31/$63` sine-wave bob (wide/narrow — Hope Song, Sea Song, Evil Toot); `$E2–$E4` the Jump parabola triple |
| **Flow control** | `$89–$8C` loops (incl. *animated* loops that advance the frame offset per pass); `$BF/$C0` subroutine call/return — **only one level deep**; conditionals on battle orientation, facing, hit/miss, per-target index; `$FA` jump |
| **Palette effects** | `$2A–$2C` load animation palettes per layer; `$AA–$BC`/`$CC–$CF`/`$FB–$FE` absolute + ramping RGB add/sub per palette group (the software color math, §8.3); **`$A3/$A4` palette cycling**; `$3B/$3C` swap/restore the target's palette (Break, Stop, Bserk) |
| **HDMA & screen** | `$AC/$AD/$AE` scroll-HDMA waves; `$D6` scroll-to-shake; `$BE` **mosaic**; `$80/$40–$42` **Mode 7**; `$3E` main-screen designation; `$D4` color add/sub (CGWSEL/CGADSUB); `$33/$39/$3A/$4B/$5F/$37` gradient builders/clear |
| **Windows** | `$A5–$A9` init/move/resize/update the circle mask; `$58` change circle **shape**; `$45/$57` window mask per layer |
| **Sprite attributes** | `$8E` above/below priority; `$90/$EE` OBJ priority bits; `$CB` **echo sprites** (4 trailing copies — the afterimage op); `$7E` flip target vertically (Suplex); `$A2` h-flip toggle (Drill) |
| **Sound & misc** | `$86/$87` SFX panned by sprite position; `$C9` play SFX; `$F7` **wait for vertical scanline**; `$E1` show/hide attacker; `$80` escape into 57 sub-commands (Quadra Slam, Bum Rush, W-Wind tornado, Sketch, Vanish, magicite transform, Pearl wind init, esper intro orbs, brightness decrement, boss-death dissolve…); `$C7` 18 more in bank C2 (screen-shake enable, SPC command…); `$FF` end |

**Frame data.** Each animation's graphics record (6 bytes at `$D4D000`, 650 records) selects 2bpp or **3bpp** tile data (spell art is stored 8-color to save ROM), a tile formation (64-byte maps of flippable 8×8 tiles), frame count, and frame dimensions in 16×16 tiles. A frame is a sparse list of 2-byte placements — packed X/Y of a 16×16 block + block ID + h/v flip — very compact for symmetric spell art. There are ~119 battle animation palettes ("Fire Dance/Black Magic red", "Aura Bolt gray", …).

**Weapon/monster animation data.** Weapon Animation Data (8 bytes × 93 at `$ECE400`) carries per-weapon gfx, palettes, script, throw/boomerang flags — Atma Weapon's growing beam-sword reuses the last two records. Monster attack animation data and a 384-entry special-attack index live nearby (§8.9).

### 8.9 Where the graphics live in ROM

```
D00000-D07FB1  Battle Animation Scripts (bytecode)
D07FB2-D095E5  Attack Animation Data (406 × 14 bytes)
D10141-D1EAD7  Battle Animation Frame Data (2 bytes / 16×16 block)
D1EAD8-D1EFFF  Pointers: Battle Animation Scripts
D20000-D25FFF  3bpp Tile Formations          D2C000-D2DFFF  2bpp Tile Formations
D26000-D26EFF  Battle Animation Palettes (8 colors each)
D27000-D2777F  Monster Graphics Data          D27780-D2781F  Esper Graphics Data
D30000-D4C997  Attack Graphics 3bpp           D87000-D8C99F  Attack Graphics 2bpp
D4D000-        Attack Graphics Data (650 × 6 B)
D8D000-        Mode 7 Attack Graphics (compressed)
E70000-E7014F  Battle BG Data (56 × 6 B)      E70150-E7164F  Battle BG Palettes
E71928-E7A9E6  Battle BG Tile Formations (lzss)  E7A9E7-E962FF  Battle BG Graphics (lzss)
E97000-EC336F  Monster Graphics               EC3370-ECE3BF  Esper Graphics
ECE400-ECE6E7  Weapon Animation Data (93 × 8 B)  ECE6E8-  Monster Attack Anim Data
CF37C0-CF393F  Monster Special Attack Animation Index
```

Battle VRAM is likewise a fixed map (spell-sprite tiles stream into word address `$2400`, BG1 spell art into `$0000`, with a "large data VRAM DMA" queue trickling big transfers across frames at max $0400 bytes/frame). CGRAM is rebuilt every frame from a WRAM "current palettes" copy kept alongside an "unaltered" copy — the substrate that makes the software color math possible. Monsters are stored behind per-pixel stencils/moulds that pack only occupied 8×8 tiles; 56 battle backgrounds are 6-byte records sharing/compositing tilesets, and **each Dance maps to a background and can change it mid-battle** — background swaps are a first-class gameplay mechanic.

### 8.10 Source anchors and curriculum decomposition

- **`everything8215/ff6`** — buildable full-game disassembly (GPL-3.0, builds byte-identical US ROMs; contains **no game assets** — `make rip` extracts data from your own ROM). Key paths: `src/btlgfx/btlgfx_main.asm`, `src/gfx/attack_anim_gfx.asm`, `include/btlgfx/attack_anim_script_en.inc`.
- **`everything8215/ff6tools`** — browser-based editor for FF6 ROMs including battle animations; the visualization companion.
- **ff6hacking.com wiki** — the opcode-level documentation this appendix distills (Battle Animation Commands, Attack Animation Data, Battle RAM/ROM maps).
- **SNESdev wiki** (snes.nesdev.org) — hardware ground truth for color math, HDMA, windows, backgrounds; the Retro Game Mechanics Explained video series is the best animated walkthrough of the same mechanisms.

A "how the SNES did it" lesson path decomposes cleanly: PPU basics (BGR555, tiles, OBJ) → Mode 1 + priorities → VRAM budgeting → the two blending systems → palette cycling → HDMA (waves, gradients, regions) → windows (Ultima's dome) → mosaic → Mode 7 → **the bytecode VM as a tiny-VM case study** → data-driven design (14-byte records composing scripts × graphics × palettes × SFX across 4 layers).

---

## 9. Retro → modern mapping

The through-line: every retro effect was a *hardware register trick*; every modern equivalent is a *shader/particle/post pass with per-pixel freedom*. Knowing the mapping ports retro intuition directly into WGSL.

| Retro archetype | Hardware mechanism (SNES) | Modern implementation (Bevy/WGSL target) |
|---|---|---|
| **Palette cycling** (waterfalls, energy shimmer; opcodes `$A3/$A4`) | Shift a run of CGRAM colors each frame; tiles never redrawn | **Gradient-map LUT shader**: grayscale index texture + 1D gradient LUT; cycling = scrolling the LUT coordinate (`color = ramp(fract(gray + t))`). LUT swap = full recolor for elemental variants |
| **SNES color math** (translucency, screen tints; `$2130–$2132`, opcode `$D4`) | PPU adds/subtracts/averages MAIN and SUB screens per pixel, 5-bit clamp | **Additive / alpha / subtractive blend states** — SNES add = additive blending, add-half = constant-alpha blend, subtract = reverse-subtract. "Glow adds, fog averages" is literally the additive-vs-alpha decision |
| **Software palette RGB add/sub** (hit flashes, glows, dims) | Per-frame saturating add into CGRAM palette copies, per palette group | **Tint/emissive material override for N frames**; flash material swap; full-screen color-grade kick for screen-wide versions |
| **HDMA wave** (Pearl wind, wavy backgrounds; `$AC–$AE`) | Per-scanline scroll-register rewrites during h-blank | **UV-distortion pass**: `uv.x += sin(uv.y × freq + t) × amp` in a full-screen shader; generalizes to arbitrary distortion textures and flow maps |
| **HDMA gradients** (blue/rainbow light curtains behind Odin, Carbuncle) | Per-scanline fixed-color (COLDATA) writes | **Gradient shader / screen-space gradient band**, optionally animated; vertical color ramps as staging backdrops |
| **HDMA window shapes** (Ultima's dome, Bio Blast's spray, beam-from-top) | Per-scanline window edge positions forming convex apertures | **SDF masks**: `sdCircle`/capsule/oval distance fields with animated radius; smoothstep edges; the "expanding aperture with spell art inside" is an SDF-masked overlay |
| **Mosaic** (`$BE`, boss-death dissolves, transitions) | `$2106` hardware block-pixelation, per region via HDMA | **Pixelation post pass**: quantize UVs (`uv = floor(uv × grid) / grid`); animate grid size over time; apply per render target for per-layer mosaic |
| **Mode 7** (esper stagings, zooming planes) | Affine matrix transform of one 8bpp layer (+HDMA for perspective) | Trivial mesh/camera transform; polar UVs for rotation-about-center effects |
| **Target palette rewrite** (Break/petrify, Stop, Bserk; `$3B/$3C`) | Overwrite the target's palette and hold | **Material/LUT swap on the target** (grayscale LUT = stone); persistent tint state |
| **Sprite echo / afterimages** (`$CB`, Phantom Rush, Flurry) | 4 trailing sprite copies at previous positions | Ghost instances with fading additive material; per-object motion-blur trails; trail meshes |
| **Sprite flicker transparency** (NES-era) | Alternating sprite visibility per frame | Dithered/hash-tested transparency, or plain alpha blend |
| **Palette-swap damage flash** (boss flashes white) | Palette entry overwrite for N frames | Unlit white "flash" material override for N frames |
| **Scanline sheen sweeping a logo** | Palette cycling on a diagonal band | Panning gradient mask multiplied over albedo (UV scroll) |
| **3-frame explosion cels** | Hand-drawn tiles in VRAM | **Flipbook billboards** (sub-UV animation), motion-vector blended for smooth low frame counts |
| **Background replacement** (Meteor's starfield, X-Zone's void, Quasar) | Swap BG2 tilemap/tileset mid-battle | Skybox/environment takeover; full-scene palette swap ("domain shift") |
| **Scroll-shake** (`$D6`, Quake, Goner) | Scroll the background to shake the screen | Trauma-decay camera shake (rotational + translational), FOV kicks |
| **Color-math lightning flash** (whole-screen add) | Fixed-color addition to the entire main screen | Full-screen additive flash / post color-grade kick — **photosensitivity-gated** (§10.2) |
| **CRT glow bleed** | Phosphor physics | HDR emissive + bloom (threshold → blur → recombine); CRT filters for the rest |
| **Raster-synced scripting** (`$F7`) | Wait-for-scanline opcode | Frame-graph / render-pass ordering; per-pass timing hooks |
| **The bytecode animation VM itself** | 85 threads interpreting bank-$D0 scripts | A timeline/sequencer system (authored curves + events driving emitters, materials, camera, sound) — the same architecture, per-effect data driving shared machinery |

The modern column's vocabulary — billboards, ribbons, flipbooks, effect meshes, decals, post passes; UV scroll/distortion, alpha erosion with burning edge, gradient mapping, channel packing, fresnel, vertex displacement, HDR emissive + bloom, polar UVs, SDFs, shaping functions; hit-stop, screen shake, chromatic-aberration pulses — is the complete professional decomposition kit (see §2 and the vfx-taxonomy sources in §10.3). Everything in this catalog is buildable from it.

---

## 10. Working with this material

### 10.1 IP posture

This catalog **describes and analyzes**; it does not reproduce. The working rules for everything built from it:

- **Recreations are original works.** An effect built from the described techniques — "an expanding blue energy dome with interior sparkle rain and a whiteout", implemented as an SDF-masked dome mesh with fresnel edges in WGSL — is your own work. The *techniques* (palette cycling, color math, HDMA waves, dissolve shaders) are not protectable; specific expression (Square Enix's sprites, sounds, names-as-branding, exact art) is.
- **Never embed ripped assets.** No sprites, sprite sheets, sound effects, music, or extracted graphics from the games in any repository or shipped artifact. The `everything8215/ff6` disassembly itself models this: it ships **no game assets** and extracts data from *your own* ROM at build time.
- **Link, don't copy.** Reference material (wiki pages, engine docs, videos, The Book of Shaders — which is itself copyrighted and should be linked, not vendored) is cited by URL in §10.3 rather than mirrored.
- **Names in this document** are used descriptively/analytically (fair-use commentary and technical study). Anything shipped to users should use original effect names.

### 10.2 Photosensitivity — a hard requirement, not a style note

Many of the catalogued effects are, by original design, **fullscreen strobes**: Flash (Edgar's tool — several white-out frames in rapid succession), Bolt 3/Thundaga (repeated full-screen white flashes), Flare (hard white flash on a red field), Joker's Death (dark strobe + mass kill), Merton (white-hot strobing), Prismatic Flash, Bahamut's whiteout, Crusader's serial whiteouts. Recreating them naively is a genuine harm vector.

Rules for any recreation:

- **WCAG 2.3.1 (Three Flashes or Below Threshold)**: no more than **3 general flashes per second**, or keep flashes below the general/red flash thresholds (small area, low contrast delta). Treat this as a floor, not a target; WCAG 2.3.2 (no more than 3 flashes, period) is the safer bar for full-screen effects.
- **Always honor `prefers-reduced-motion`** — a mind-palace-wide mandate that carries into the Effect Forge curriculum. Reduced-motion variants should keep the *payoff* while removing the strobe/motion: replace multi-frame white strobes with a single soft flash or a static tint hold; replace screen shake with a border pulse; replace vortex/warp passes with a fade. Precedent from the source material itself: FFX shipped a "short summon sequence" toggle that collapses Anima's 16-hit Oblivion into one total — the series validates reduced variants that keep the damage payoff.
- **Design the reduced variant at the same time as the full variant.** The four-phase structure (§2.2) makes this cheap: the anticipation and dissipation phases usually survive intact; only the impact phase needs a calmer expression.
- Flag any effect whose *identity* is the strobe (Flash, Joker's Death) in its own documentation, the way this catalog does.

### 10.3 Sources

Consolidated from the six research dossiers behind this catalog. All URLs verified live 2026-07-03 unless noted.

**Final Fantasy Wiki (Fandom)** — fetched via the MediaWiki API (`finalfantasy.fandom.com/api.php`); plain page fetches are bot-blocked:

- FF6 spell pages (all 54 fetched individually), e.g. `https://finalfantasy.fandom.com/wiki/Fire_(Final_Fantasy_VI)`, `…/Ultima_(Final_Fantasy_VI)`, `…/Banish_(Final_Fantasy_VI)`, `…/Meltdown_(Final_Fantasy_VI)`, `…/Reraise_(Final_Fantasy_VI)`, `…/Libra_(Final_Fantasy_VI)` (same URL pattern for the rest)
- Series ability pages with recurring-animation prose: `…/Ultima_(ability)`, `…/Holy_(ability)`, `…/Bio_(ability)`, `…/Poison_(ability)`, `…/Fire_(ability)`, `…/Death_(ability)`, `…/Doom_(ability)`, `…/Meteor_(ability)`, `…/Flare_(ability)`, `…/Firaga_(ability)`, `…/Thundaga_(ability)`, `…/Blizzaga_(ability)`
- Esper roster + per-esper + per-ability pages: `…/Esper_(Final_Fantasy_VI)`, `…/Magicite_(Final_Fantasy_VI)`, `…/Summon_(command)`, all 27 esper pages (`…/Ramuh_(Final_Fantasy_VI)` … `…/Crusader_(summon)`), ability pages (`…/Judgment_Bolt`, `…/Cleansing_(ability)`, `…/Zantetsuken_(ability)`, `…/Megaflare`, `…/Divine_Judgment_(Alexander_ability)`, `…/Flames_of_Rebirth`, `…/Tri-Disaster_(ability)`, `…/Chaos_Wave`, `…/Demon_Eye_(ability)`, `…/Howling_Moon`, `…/Abyssal_Maw`, `…/Alluring_Embrace`, `…/Breach_Blast`, `…/Earthen_Wall_(ability)`, `…/Angel_Feathers`, `…/Healing_Horn`, `…/Ruby_Light`, `…/Ghostly_Veil`, `…/Lunatic_Voice`, `…/Cat_Rain`, `…/Holy_Aura`, `…/Shin-Zantetsuken_(ability)`), and `…/Esper_(Final_Fantasy_VI)/Videos`
- `…/Desperation_Attack` — all 12 DAs, mechanics, galleries, etymology
- `…/Final_Fantasy_VI_enemy_abilities`, `…/Ultima_Weapon_(Final_Fantasy_VI_boss)`, `…/Kefka_(final_boss)`, `…/Light_of_Judgment`, `…/Havoc_Wing`, `…/Flare_Star`, `…/Mind_Blast`, `…/Heartless_Angel`, `…/Phantom_Train_(Final_Fantasy_VI)`, `…/Phantom_Train_(Final_Fantasy_VI_boss)`, `…/Ultros`, `…/Ultros_(Final_Fantasy_VI_boss)`
- Skill families: `…/Bushido_(Final_Fantasy_VI)` + 8 technique pages, `…/Blitz_(Final_Fantasy_VI)` + 8 technique pages, 8 Tool pages (`…/Auto_Crossbow_(Final_Fantasy_VI)` …), `…/Dance_(Final_Fantasy_VI)`, `…/Slot_(Final_Fantasy_VI)`, `…/Prismatic_Flash`, `…/Joker%27s_Death`, `…/Lore_(Final_Fantasy_VI)`, `…/Grand_Delta`, `…/Rage_(Final_Fantasy_VI_command)`, `…/Sketch`
- Cross-series: `…/Knights_of_Round_(Final_Fantasy_VII)`, `…/Supernova_(ability)`, `…/Eden_(Final_Fantasy_VIII)`, `…/Bahamut_ZERO_(Final_Fantasy_VII)`, `…/Bahamut_(Final_Fantasy_VII)`, `…/Neo_Bahamut_(Final_Fantasy_VII)`, `…/Bahamut_(Final_Fantasy_VIII)`, `…/Bahamut_(Final_Fantasy_X)`, `…/Diablos_(Final_Fantasy_VIII)`, `…/Ark_(summon)`, `…/Alexander_(Final_Fantasy_IX)`, `…/Terra_Homing`, `…/Mist_Dragon`, `…/Anima_(summon)`, `…/Zanmato_(ability)`, `…/Overdrive_(Final_Fantasy_X)`, `…/Swordplay`, `…/Attack_Reels_(Wakka_ability)`, `…/Slots_(Final_Fantasy_X)`, `…/Omnislash`, `…/Omnislash_Version_5`, `…/Renzokuken`, `…/Lion_Heart_(ability)`, `…/Big_Bang_(ability)`, `…/Grand_Cross_(ability)`, `…/Almagest_(ability)`, `…/Hellfire_(ability)`, `…/Diamond_Dust_(ability)`, `…/Judgment_Bolt`, per-game Bio pages (`…/Bio_(Final_Fantasy_V)` through `…/Bio_(VII_Remake)`), `…/Bahamut_(VII_Remake)`, `…/Bahamut_Arisen`, `…/Alexander_(VII_Rebirth)`, `…/Odin_(VII_Rebirth)`

**FF6 engine internals (ff6hacking.com wiki, raw DokuWiki exports):**

- Battle Animation Commands (the bytecode): `https://www.ff6hacking.com/wiki/doku.php?id=ff3:ff3us:doc:asm:codes:battle_animation_script`
- Attack Animation Data: `…doc:asm:fmt:attack_animation_data` · Attack Graphics Data: `…fmt:attack_graphics_data` · Frame Data: `…fmt:frame_data` · Battle Animation Palettes: `…list:battle_animation_palette`
- Battle RAM map: `…ram:battle_ram` · ROM Map: `…rom_map` · Battle Backgrounds: `…list:battle_backgrounds` · Battle BG Data: `…fmt:battle_bg_data` · Monster/Esper Graphics Data: `…fmt:monster_graphics_data` · Weapon Animation Data: `…fmt:weapon_animation_data` · Palette Animation Data (field): `…fmt:palette_animation_data` · Map Animation Data: `…fmt:map_animation_data` · Docs index: `…doc:asm` and `…doc:game`

**Disassemblies (GitHub, verified live):**

- `https://github.com/everything8215/ff6` — buildable full-game disassembly (GPL-3.0; `src/btlgfx/`, `include/btlgfx/attack_anim_script_en.inc`)
- `https://github.com/everything8215/ff6tools` — browser-based FF6 ROM editor incl. battle animations
- `https://github.com/seibaby/ff3us` — bank $C2 battle-engine assembly lineage

**SNES hardware documentation:**

- `https://snes.nesdev.org/wiki/Color_math` · `…/HDMA` · `…/Windows` · `…/Backgrounds` · `…/PPU_registers`
- `https://wiki.superfamicom.org/transparency` · `https://sneslab.net/wiki/HDMA` · `https://sneslab.net/wiki/Mosaic` · `https://nesdoug.com/2020/06/16/color-math/` · `https://nesdoug.com/2020/06/14/hdma-examples/`
- Retro Game Mechanics Explained (episode index: `https://sneslab.net/wiki/Retro_Game_Mechanics_Explained`): Color Math `https://www.youtube.com/watch?v=zcoU6-9_fDM` · DMA & HDMA `https://www.youtube.com/watch?v=K7gWmdgXPgk` · Mode 7 `https://www.youtube.com/watch?v=3FVN_Ze7bzw`
- Data Crystal FF6 RAM map: `https://datacrystal.tcrf.net/wiki/Final_Fantasy_VI/RAM_map`

**FF6 gameplay cross-checks:**

- Caves of Narshe FF6 magic tables: `https://www.cavesofnarshe.com/ff6/magic.php` (+ `?type=offensive`, `?type=support`)
- StrategyWiki FF6 spells: `https://strategywiki.org/wiki/Final_Fantasy_VI/Spells`
- Master ZED's FF3us docs: `https://masterzed.cavesofnarshe.com/ff3.html` · graphics/sound data `…/HackDocs/ff3graph.txt` · animation pointers `…/HackDocs/animanip.txt` · Slot guide `…/GameDocs/slotfaq.html`
- `https://fantasyanime.com/finalfantasy/ff6/ff6espers.htm` (esper names/locations/bonuses; the Ifrit multi-frame note)
- `https://guides.gamercorner.net/ffvi/espers/crusader` · `https://videochums.com/top10/espers-in-final-fantasy-vi` · `https://lparchive.org/Final-Fantasy-VI-(by-Blastinus)/Update%2020/` · `https://ffcompendium.com/h/summon.shtml`
- `https://www.thonky.com/final-fantasy-three-six/list-of-sabin-blitzes` · `https://www.fandomspot.com/ff6-sabin-best-blitzes/`
- GameFAQs spell-count corroboration: `https://gamefaqs.gamespot.com/switch/323475-final-fantasy-vi-pixel-remaster/answers/641161-how-many-magic-spells-are-there-altogether`

**Modern VFX / development sources:**

- *Inside FINAL FANTASY VII REMAKE* Ep. 5 coverage: `https://www.siliconera.com/inside-final-fantasy-vii-remake-episode-5-takes-us-through-its-graphics-and-visual-effects/` · `https://www.gematsu.com/2020/04/inside-final-fantasy-vii-remake-developer-diary-episode-5-graphics-and-visual-effects` · `https://www.dualshockers.com/final-fantasy-vii-remake-behind-the-scenes-video-looks-at-its-stellar-visual-effects/` · `https://gamingbolt.com/final-fantasy-7-remake-developer-video-outlines-graphics-and-visual-effects`
- FF7R sound team interview: `https://www.asoundeffect.com/final-fantasy-7-remake-sound/`
- Unreal Engine FF7R interview (403 to fetcher; cited from search metadata): `https://www.unrealengine.com/en-US/developer-interviews/how-square-enix-leveraged-unreal-engine-to-modernize-final-fantasy-vii-remake`
- Rebirth mechanics press: `https://www.thegamer.com/final-fantasy-7-rebirth-odin-summon-guide/` · `https://kotaku.com/final-fantasy-7-rebirth-ff7-odin-fight-how-to-beat-1851395590` · `https://gameranx.com/features/id/491789/article/final-fantasy-7-rebirth-how-to-unlock-all-limit-breaks-level-3-limit-break-guide/` · `https://game8.co/games/Final-Fantasy-X/archives/271430` · `https://www.thegamer.com/final-fantasy-vii-sephiroth-supernova-limit-break-explained/`

**Real-time VFX craft (the taxonomy's backbone):**

- VFXDoc: `https://vfxdoc.readthedocs.io/en/latest/` (particle systems `…/vfx/particlesystems/`, effect meshes `…/vfx/meshes/`, dynamics `…/vfx/dynamics/`, lexicon `…/vfx/lexicon/`, UV manipulation `…/shaders/texcoord/`, alpha erosion `…/shaders/alpha-erosion/`, fading `…/shaders/fading/`, color/HDR `…/shaders/color/`, flipbooks `…/textures/flipbooks/`)
- RealTimeVFX: Getting Started `https://realtimevfx.com/t/getting-started-in-real-time-vfx-start-here/3415` · Bread & Butter shader techniques `https://realtimevfx.com/t/most-common-bread-butter-shaders-and-materials-techniques/19127` · Dictionary Project `https://realtimevfx.com/t/realtime-vfx-dictionary-project/570/3` · reference threads `https://realtimevfx.com/t/real-time-vfx-references-inspirations/22978`, `https://realtimevfx.com/t/refs-library-1500-vfx/25346`, `https://realtimevfx.com/t/magic-videos-images/75`
- GDC VFX Bootcamp: Chamberlin/Keyser "Artistic Principles of VFX" `https://www.gdcvault.com/play/1024439/Visual-Effects-Bootcamp-Artistic-Principles` · Lyndon "Zip! Thwack! Ping!" `https://www.gdcvault.com/play/1025417/Visual-Effects-Bootcamp-Zip-Thwack` (slides `https://media.gdcvault.com/gdc2018/presentations/Lyndon_Michael_ZipThwackPing.pdf`) · VFX Apprentice timing curriculum `https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx` · Keyser's YouTube series `https://www.youtube.com/playlist?list=PLQD_sA-R5qVKVYw3EVuRT7fSJsVukLEhD`
- Simon Trümpler, Game Art Tricks: `https://simonschreibt.de/game-art-tricks/` (RIME `https://simonschreibt.de/gat/stylized-vfx-in-rime/`, Teleglitch `https://simonschreibt.de/gat/teleglitch-rgb-flickering/`, CoH flamethrower `https://simonschreibt.de/gat/company-of-heroes-flamethrower/`)
- Shader education (**link-only; The Book of Shaders is copyrighted**): `https://thebookofshaders.com/05/` · Catlike Coding flow maps `https://catlikecoding.com/unity/tutorials/flow/texture-distortion/` · Inigo Quilez 2D SDFs `https://iquilezles.org/articles/distfunctions2d/` · LearnOpenGL Bloom `https://learnopengl.com/Advanced-Lighting/Bloom` · Harry Alisavakis VFX Master Shader `https://halisavakis.com/my-take-on-shaders-vfx-master-shader-part-iii/` + shockwave `https://halisavakis.com/my-take-on-shaders-shockwave-effect/` · Cyanilux forcefield `https://www.cyanilux.com/tutorials/forcefield-shader-breakdown/` · dissolve tutorials `https://torchinsky.me/stylized-vfx-unity-01/`, `https://www.gamedeveloper.com/programming/the-great-disappearing-act-creating-dissolve-vfx-with-unity-surface-shaders` · decals `https://samdriver.xyz/article/decal-render-intro`, `https://martindevans.me/game-development/2015/02/27/Drawing-Stuff-On-Other-Stuff-With-Deferred-Screenspace-Decals/` · premultiplied alpha `https://github.com/dtrebilco/PreMulAlpha` · ribbons/trails `https://doc.stride3d.net/4.0/en/manual/particles/ribbons-and-trails.html`
- Game feel: Vlambeer "The Art of Screenshake" `https://www.youtube.com/watch?v=SkgkIXZ_13Y` (writeup `https://theengineeringofconsciousexperience.com/jan-willem-nijman-vlambeer-the-art-of-screenshake/`) · `https://kaiclavier.itch.io/super-game-feel-effects`
- Palette cycling: Mark Ferrari GDC 2016 `https://www.gdcvault.com/play/1023586/8-Bit-8-Bitish-Graphics` · Huckaby Canvas Cycle `https://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html` · `https://github.com/KoBeWi/Godot-Gradient-Shift-Shader` · mosaic shader recreations `https://emudev.de/q00-snes/mosaic-effect/`, `https://www.shadertoy.com/view/ts2Xz3` · HDMA wave `https://www.smwcentral.net//?p=viewthread&page=1&pid=1540251&t=102644`

### 10.4 Known gaps (carried honestly from the research pass)

- Frame-level choreography for the less-cited esper summons and several sprite/PS1-era effects is reconstructed (†); the FF Wiki's per-esper video gallery would let a second pass verify each against footage.
- Caves of Narshe, StrategyWiki, GameFAQs guide bodies, ffcompendium, and the RealtimeVFX Fandom glossary blocked automated fetches; they were used via API/search excerpts where cited.
- No public GDC/SIGGRAPH talk dedicated to FF7R battle VFX exists; the *Inside FF7R* Ep. 5 video is the primary source, accessed via press summaries.
- A per-spell list of which FF6 animations switch to Mode 7 was confirmed structurally (opcodes + the dedicated tileset) but not compiled spell-by-spell.
- Ultros's per-fight AI ability tables were only partially extracted; SNES-vs-Pixel-Remaster animation differences are evidenced by screenshot sets, not compared shot-for-shot.
- A handful of animation-script opcodes remain undocumented in the ff6hacking wiki ($2F, $46, $47, $50, $61, $74, $88, $9B–$9E, $ED…); the disassembly is the place to resolve them.
