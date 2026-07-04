import type { Curriculum } from "@mind-palace/curriculum";

import { ff6Source } from "./_sources";

// FF6 VFX Anatomy — how Final Fantasy VI rendered its battle effects on SNES
// hardware: the Mode 1 layer stack, the two blending systems, palette
// animation, HDMA, window shapes, mosaic & Mode 7, and the animation bytecode
// VM. Read + MCQ only (no code cards — the "code" here is 1994 bytecode).
// Grounded in the everything8215/ff6 disassembly and the ff6hacking.com wiki.
export const gfxFf6Anatomy: Curriculum = {
  id: "c-gfx-ff6-anatomy",
  title: "FF6 VFX Anatomy",
  source: ff6Source,
  nodes: [
    {
      id: "battle-screen-architecture",
      title: "The Battle Screen: Mode 1 & Layers",
      content: {
        type: "read",
        markdown:
          'Final Fantasy VI\'s battle renderer is a **Mode 1 engine** — and every famous effect in the game decomposes into a handful of PPU primitives layered on top of it.\n\n## One write sets the stage\nAt battle init the engine stores `#$09` into a shadow byte destined for the BGMODE register `$2105`. Decode it: the low three bits select ==Mode 1== (BG1 and BG2 at 4bpp, BG3 at 2bpp), and bit 3 sets the ==BG3 high-priority bit== — high-priority BG3 tiles render *above* BG1 and BG2. That one bit is the classic SNES "text box in front of everything" trick, and FF6 battle leans on it for effects too.\n\nAnimation code then toggles the char-size bits of the same byte so spell layers draw with **16×16 characters** — the reason animation frames are stored as 16×16 blocks.\n\n## Five layers, five jobs\n- **BG1** (4bpp) — the ==animation layer==: full-screen spell art, a copy of the target\'s graphics for warp-the-target effects, or huge "BG1 monsters" too big for sprites\n- **BG2** (4bpp) — the battle background art: grass, desert, Magitek factory\n- **BG3** (2bpp) — the text and menu font, plus a second *cheap* effect layer pulled in front by the priority bit\n- **OBJ** — character and monster sprites, cursors, damage numerals, and up to 80 spell-sprite threads\n- the **extra layer** — esper summons get a dedicated script-and-graphics slot of their own\n\n## Two programs share the screen\nBattle logic (damage, AI) lives in the **battle module**; everything you *see* is the **battle graphics module** — `src/btlgfx/` in the `everything8215/ff6` disassembly, a roughly 49,000-line program whose entire job is spectacle.',
      },
    },
    {
      id: "bgmode-write",
      title: "Reading the BGMODE write",
      content: {
        type: "multiple-choice",
        question:
          "Battle init stores `#$09` into the shadow byte for register `$2105`. What does that configure?",
        options: [
          "Mode 0 with all four layers at 2bpp",
          "Mode 7 with rotation enabled for BG1",
          "Mode 1 with the BG3 high-priority bit set",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "spell-art-layer",
      title: "Where spell art lives",
      content: {
        type: "multiple-choice",
        question:
          "A full-screen spell backdrop — say Inferno's flame wash — renders on which layer?",
        options: [
          "BG2, the battle background layer",
          "BG1, the 4bpp animation layer",
          "OBJ, assembled from sprite threads",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "two-blending-systems",
      title: "Two Blending Systems",
      content: {
        type: "read",
        markdown:
          "FF6 blends pixels with ==two completely different systems==, and telling them apart is the key to reading any effect in the game.\n\n## System 1: PPU color math (hardware)\nThe real blender. `$2130 CGWSEL` picks the second operand — a **fixed color** or the **sub screen** (a second composited image). `$2131 CGADSUB` picks the operation — add or subtract, with an optional *half* divide for a true 50% blend — and which layers participate. `$2132 COLDATA` sets the fixed color. Results clamp per channel.\n\nA hardware rule worth memorizing: sprites participate only via ==OBJ palettes 4–7== — palettes 0–3 always reject color math. That is how FF6 keeps combatants opaque while a BG1 spell wash blends additively over the whole battlefield. Script opcode `$D4` writes these registers per attack.\n\n## System 2: software palette math (the workhorse)\nMost flashes and glows never touch the PPU blender. The engine keeps **two full palette sets in WRAM** — *unaltered* and *current* — plus per-group RGB add/subtract amounts covering sprite groups, the background, monsters, and characters. Every frame it re-applies the add/sub from the unaltered copy into the current copy, ==saturating per channel==, then uploads the result to CGRAM.\n\n- a monster flashes red when hit → software add on the monster palettes\n- the party glows under Haste → software add on a character palette\n- the field dims during Pearl → software subtract on the background group\n\nIt is palette-space blending: orthogonal to CGADSUB, and it works on **any** layer — including the OBJ palettes 0–3 that hardware math cannot touch.",
      },
    },
    {
      id: "hit-flash-system",
      title: "Which blender flashes a monster?",
      content: {
        type: "multiple-choice",
        question: "A monster flashes red when struck. Which system produces that flash?",
        options: [
          "The PPU color-math unit via CGADSUB",
          "A red overlay sprite drawn above the monster",
          "Software RGB add applied to the palette copies and re-uploaded to CGRAM each frame",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "obj-palette-rule",
      title: "Sprites & color math",
      content: {
        type: "multiple-choice",
        question: "Which sprites can participate in PPU color math?",
        options: [
          "Only sprites using OBJ palettes 4–7",
          "Only sprites using OBJ palettes 0–3",
          "All sprites, whenever CGADSUB enables OBJ",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "palette-animation",
      title: "Palette Cycling & Pulsing",
      content: {
        type: "read",
        markdown:
          "A 16-color palette looks like a limitation. FF6 turns it into an animation system.\n\n## Cycling: movement without redrawing\nOpcodes `$A3` and `$A4` rotate a contiguous **run of colors** inside a palette left or right — the parameters choose the first color, the run length, which palette, and the speed in loops-per-shift. The tile pixels never change: they are just ==indexes into CGRAM==, so rotating the colors slides the visible pattern. Waterfalls, energy shimmer, and crackling auras all animate this way for free.\n\n## Pulsing: the ramping add/sub\nThe software palette system's *relative* opcodes ramp an add or subtract amount up or down each tick — a breathing glow on a caster, a heartbeat pulse on a charged aura — without a single new frame of art.\n\n## Why this matters today\nIndexed color makes every sprite a ==tiny index texture== and its palette a **1D lookup table**. Cycling is literally scrolling the LUT. That is exactly the modern *gradient mapping* technique — grayscale art mapped through a color ramp — which is why palette-cycled effects port so naturally to shaders.\n\n## Field-side contrast\nThe map engine has its own three palette-animation types — **Cycle**, **ROM** (stream whole palette frames from ROM), and **Subtract pulse** — driving the Lete River, lava pools, and the Imperial Camp fires.",
      },
    },
    {
      id: "cycling-what-changes",
      title: "What palette cycling changes",
      content: {
        type: "multiple-choice",
        question: "During palette cycling, what actually changes from frame to frame?",
        options: [
          "The tile pixel data in VRAM",
          "The tilemap entries, selecting different tiles",
          "The color entries in CGRAM — the pixel indexes never change",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "hdma-scanline-machine",
      title: "HDMA: The Scanline Machine",
      content: {
        type: "read",
        markdown:
          "HDMA is the SNES trick that breaks the one-value-per-frame rule: it rewrites PPU registers **during horizontal blank, between scanlines**. FF6 battle uses ==all 8 channels==, every frame.\n\n## The table format\nAn HDMA table is a list of `(line-count, data)` entries: `$01–$80` writes once then holds for N lines; `$81–$FF` is ==repeat mode== — fresh data on *every* scanline; `$00` ends the table.\n\n## FF6's battle channel map\n- **#0–#2** → the BG1/BG2/BG3 scroll registers — per-scanline sine offsets are the ==wave distortion== (the desert's heat shimmer; a bit in each battle-background record marks it \"wavy\")\n- **#3** → `$2105–$2108` — per-region **BG mode, mosaic, and tilemap bases**: the battlefield, the menu strip, and the Slots reels each get their own values mid-frame\n- **#4** → color math plus the fixed color, per scanline — the ==gradient light curtains== behind S.Cross, Carbunkl, and Odin\n- **#5** → window positions per scanline — the expanding spell masks\n- **#6** → BG3/BG4 tilemap bases, completing the per-region swap\n- **#7** → window logic plus layer enables per region — the top and bottom ==letterbox== bands simply disable every layer\n\n## Scripted, not hardcoded\nAnimation opcode `$AC` parameterizes a wave's frequency, amplitude, and axis per background; `$AD` picks among roughly 20 prebuilt waveforms; `$AE` updates the data live, mid-effect.",
      },
    },
    {
      id: "wave-distortion",
      title: "Heat-shimmer mechanics",
      content: {
        type: "multiple-choice",
        question: "How does FF6 make a battle background ripple like heat haze?",
        options: [
          "The background tiles are redrawn with a wave baked in each frame",
          "HDMA writes a new offset to the background's scroll register every scanline",
          "Mode 7 skews the background layer",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "window-shapes",
      title: "Window Shapes: Ultima's Dome",
      content: {
        type: "read",
        markdown:
          "The PPU has two hardware **windows**: left/right boundaries that can mask any layer or gate color math. One pair of X positions sounds useless for drawing shapes — until you notice each scanline can get a *different* pair.\n\n## HDMA turns a window into geometry\nChannel #5 streams new window boundaries every scanline. Stack two hundred scanlines of varying left/right pairs and the window becomes any ==convex shape==: a circle, a dome, a beam.\n\n## The circle state machine\nFF6 keeps a parametric window state — current size, final size, X/Y origin, grow speed — plus a **shape selector**: `0` circle, `1` bio blast, `2` big blob, `3` beam from top, `4` vertical oval, `5` small blob, `6` horizontal oval, ==`7` ultima==, `8` slimer blob. Every frame it regenerates the per-scanline table from those parameters.\n\n## Scripted apertures\nAnimation opcodes drive it: `$A5` initializes a circle — origin, grow speed, max size, with `($80,$80)` meaning screen center; `$A6`–`$A7` move, resize, and update it; `$A8`, `$C3`, and `$D3` snap it to the attacker or target; `$58` swaps the shape. Combined with the per-scanline color-math window, this is the signature FF6 composition: an expanding aperture over the battlefield with spell art blazing inside. ==Ultima's dome== is a window shape growing per frame; Bio Blast's spray is shape `1` doing the same trick sideways.",
      },
    },
    {
      id: "expanding-circle",
      title: "Drawing Ultima's dome",
      content: {
        type: "multiple-choice",
        question: "How does the engine render Ultima's expanding dome mask?",
        options: [
          "HDMA streams new window left/right boundaries each scanline while the circle state grows per frame",
          "A dome sprite is scaled up with Mode 7",
          "The dome is pre-drawn as BG1 tiles at several sizes",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "mosaic-mode7",
      title: "Mosaic & Mode 7 Moments",
      content: {
        type: "read",
        markdown:
          "Two more one-register spectacles round out the PPU toolbox.\n\n## Mosaic: pixelation as a primitive\nRegister `$2106` is laid out `SSSS 4321`: a 4-bit block size (1×1 up to 16×16) plus per-BG enable bits. Each block takes the color of its top-left pixel — whole-layer pixelation for one byte. Animation opcode ==`$BE`== sets it, and stepping the size up over successive frames is the boss-death dissolve and the screen-shatter transition.\n\nBecause `$2106` rides HDMA channel #3's per-region table, mosaic applies **per screen band** — the battlefield can dissolve into blocks while the menu strip below stays perfectly crisp.\n\n## Mode 7 moments\nA handful of battle animations and esper summons swap the battlefield region into ==Mode 7==, the rotate-and-scale background mode, through the `$80` escape opcode:\n- `$80/$40` — set the screen mode (the `$2105` write)\n- `$80/$41` — zoom and move BG1: the scale and translate parameters\n- `$80/$42` — Mode 7 flip settings, written to `$211A M7SEL`\n\nA dedicated **compressed Mode 7 attack tileset** ships in ROM just for these moments, and the rotation matrix is shadow-buffered in WRAM and written to `M7A`–`M7Y` during NMI — the same write-during-vblank discipline as every other register here.",
      },
    },
    {
      id: "mosaic-per-region",
      title: "Mosaic with a crisp menu",
      content: {
        type: "multiple-choice",
        question:
          "During a boss-death dissolve the battlefield pixelates but the menu strip stays sharp. Why?",
        options: [
          "The menu is drawn with sprites, which mosaic never affects",
          "The menu band is redrawn after the mosaic resets each frame",
          "The mosaic register rides the per-region HDMA table, so each screen band gets its own value",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "animation-vm",
      title: "A VFX Scripting Language in 1994",
      content: {
        type: "read",
        markdown:
          "FF6's attack animations are not hand-coded routines. They are ==bytecode scripts== interpreted by a VM inside the battle graphics module — a real VFX scripting language, shipped in 1994.\n\n## Scripts\nScripts live in bank `$D0`. Each begins with a 2-byte header — the animation **speed** in the high nibble of byte 0, the **sprite alignment** in the top 3 bits of byte 1 — then bytecode until the `$FF` terminator.\n\n## Threads\nUp to ==85 concurrent threads== each run a script: **80 sprite threads** (8 per combat slot), **1 BG1 thread**, **1 BG3 thread**, and **3 esper threads**. Each thread owns 64 bytes of state: position, frame number, script pointer, speed, loop counters, palette, and which layer it draws on.\n\n## The opcode families\n- **frames** — `$00`–`$1F` show sprite frame 0–31, then wait `speed` frames\n- **movement** — 8-direction steps, snaps to attacker or target, and first-class ==vector math==: the engine computes `arctan(dy/dx)` and the distance root so boomerangs and beams fly between arbitrary points; polar orbits, sine-wave bobs, and the Jump parabola are opcodes too\n- **loops** — plain loops, plus *animated* loops that advance the frame offset on each pass\n- **palette math, HDMA, windows, mosaic, Mode 7, sound** — everything from the previous cards is scriptable, including sound effects ==panned by the sprite's X position==\n- **raster sync** — `$F7` waits for a specific vertical scanline before continuing\n\n## One honest limitation\nSubroutines exist — `$BF` calls, `$C0` returns — but they nest exactly ==one level deep==. The modern descendant of this whole system is the flipbook plus timeline sequencer you will meet in the Effect Forge.",
      },
    },
    {
      id: "vm-subroutines",
      title: "Script subroutine depth",
      content: {
        type: "multiple-choice",
        question: "How deeply can an animation-script subroutine call (`$BF`) nest?",
        options: [
          "Unlimited — the return stack lives in WRAM",
          "Exactly one level — a called script cannot call another",
          "Eight levels, one per HDMA channel",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "vm-threads",
      title: "Counting animation threads",
      content: {
        type: "multiple-choice",
        question: "What is the full set of threads the animation VM can run at once?",
        options: [
          "80 sprite threads plus 1 BG1, 1 BG3, and 3 esper threads",
          "One thread per combatant, up to 10",
          "16 threads, one per OAM page",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "attack-record",
      title: "The 14-Byte Attack Record",
      content: {
        type: "read",
        markdown:
          "Every attack in the game — all 406 of them — is described by a ==14-byte record==. Not code: **data** that composes an effect from shared parts.\n\n## The layout\n- bytes `$00`–`$05` — a script/graphics index for three layers: **Sprite**, **BG1**, and **BG3**. `$FFFF` disables a layer; bit 15 means *load graphics only, run no script*\n- bytes `$06`–`$08` — a palette index **per layer**\n- byte `$09` — the default sound effect\n- byte `$0A` — bit 7: ==copy the target's graphics to BG1== (how warp-the-target effects work); the low bits select an **init function**\n- bytes `$0B`–`$0C` — the **extra layer**: the esper script and graphics\n- byte `$0D` — the multi-target delay\n\n## The init function\nThe init function pre-configures what the script needs before it runs: the ==thread count== (Fire runs 3 threads, Drain runs 6), the **window mask shape** for effects like Ultima and Bio Blast, and the color add/sub settings for the attack.\n\n## Why this is great design\nScript × graphics × palette × SFX, per layer, in one record. Swap one palette index and a red flame becomes a green one; reuse a script with new art and a whole new attack costs almost nothing. This is the 1994 ancestor of the modern **data-driven effect asset** referencing shared shaders and particle definitions.",
      },
    },
    {
      id: "record-ffff",
      title: "Disabling a layer",
      content: {
        type: "multiple-choice",
        question:
          "In a 14-byte attack record, what does `$FFFF` in a layer's script/graphics slot mean?",
        options: [
          "Reuse the previous attack's script for that layer",
          "That layer is disabled for this attack",
          "Loop that layer's script until the attack ends",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "frames-and-banks",
      title: "Frames, Formations & 3bpp Banks",
      content: {
        type: "read",
        markdown:
          'How does a script\'s "show frame 7" become pixels? Through three layers of indirection that squeeze hundreds of effects into a cartridge.\n\n## The 6-byte graphics record\nEach animation has a graphics record giving a 2bpp-versus-3bpp flag, the **frame count**, a **tile-formation index**, a **frame-data index**, and the frame\'s width and height measured in ==16×16 tiles==.\n\n## Frames are sparse\nFrame data is a list of 2-byte placements: a packed X/Y of a 16×16 block plus a block ID with ==horizontal and vertical flip bits==. A frame is a sparse arrangement of flippable blocks — symmetric spell art compresses beautifully because mirrored halves reuse the same blocks, flipped.\n\n## The 3bpp trick\nSpell sprites and BG1 art are stored ==3bpp — just 8 colors== — and expanded on load, saving a quarter of the space 4bpp would cost. Battle animation palettes are 8 colors each, and there are only about 119 of them in the whole game, with names like "Fire Dance red" and "Aura Bolt gray". BG3 effect art is cheaper still, at 2bpp.\n\n## Constraint becomes style\nOne 8-color ramp per effect layer is why FF6 effects have such disciplined color identity: every effect **commits to one readable ramp** — a fact you can exploit directly when gradient-mapping a modern remake.',
      },
    },
    {
      id: "why-3bpp",
      title: "The 3bpp economy",
      content: {
        type: "multiple-choice",
        question: "Why is FF6's spell art stored 3bpp when Mode 1's BG1 is a 4bpp layer?",
        options: [
          "Eight colors suffice for one effect ramp, and dropping the fourth bitplane saves a quarter of the ROM",
          "The PPU switches BG1 to 3bpp during battle",
          "3bpp tiles decompress faster during NMI",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "cast-rhythm-color",
      title: "The Two-Beat Cast & Color Code",
      content: {
        type: "read",
        markdown:
          "Watch any spell in FF6 and you will see the same shared rhythm — then a color system that tells you what the spell *is* before a damage number appears.\n\n## Beat one: the caster\nThe caster raises their arms into the cast pose while their sprite ==pulses with a colored glow== — the software palette add at work. White and Effect magic add a sparkle-gather intro at the caster, courtesy of a dedicated script opcode.\n\n## Beat two: the effect\nThen the effect proper plays on the target or targets. Simple spells finish inside a second; the endgame set pieces run multi-phase sequences several seconds long. Tier ladders are the ==same grammar at increasing scale==: Fire is flame tufts on the target, Fire 2 is a converging ring and a blaze column, Fire 3 is a projectile volley plus a fullscreen wash.\n\n## The color language\n- **fire** — orange and gold · **ice** — blue-white · **lightning** — blue, rising to ==gold at tier 3==\n- **poison** — green · **holy** — white and pale blue · **gravity and void** — black plus violet\n- **healing** — blue-white, green, gold · **buffs** — warm means physical, cool means magical · **MP** — pink\n\n## Brightness equals power\nScreen-wide statements are reserved for the top tier: fullscreen washes, whiteouts, sustained shakes. Low tiers stay local to the target. With 8-color palettes there was no room to hedge — every effect commits to one ramp, which is exactly why the language reads so clearly.",
      },
    },
    {
      id: "color-language",
      title: "Reading the color code",
      content: {
        type: "multiple-choice",
        question:
          "A pink particle stream flows from the target back to the caster. In FF6's color language, what just happened?",
        options: [
          "HP was drained — warm colors mean life force",
          "MP was drained — Osmose recolors Drain's grammar pink",
          "A charm status landed on the target",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "rosetta-stone",
      title: "Rosetta Stone: SNES → Modern",
      content: {
        type: "read",
        markdown:
          "Every SNES trick in this curriculum has a direct modern descendant. This is the map you will build against in the Effect Forge.\n\n## The translations\n- **Palette cycling** → ==gradient-map LUT scrolling==: the grayscale art is an index texture, the palette is a 1D ramp, and cycling is scrolling the lookup coordinate over time\n- **PPU color math (add)** → ==additive blending==; add-half → a 50% alpha blend; subtract → a subtractive blend state\n- **Software palette flash** → a tint or emissive override held for a few frames — the modern hit-flash\n- **HDMA wave** → a ==UV-distortion pass==: the per-scanline scroll write becomes a per-pixel offset like `uv.x + sin(uv.y * freq + t) * amp`\n- **HDMA gradient curtains** → a screen-space gradient ramped over vertical position\n- **Mosaic** → a pixelation post pass: quantize UVs to a grid with `floor(uv * n) / n` and sample\n- **Window shapes** → ==SDF masks==: the circle state machine becomes a signed-distance circle with a smoothstep edge — resolution-independent, and no longer limited to convex\n- **The bytecode VM and its threads** → the timeline or sequencer choreographing layered effect elements\n- **Frame formations** → flipbook sprite sheets, driven by sub-UV animation\n- **Mode 7** → an ordinary mesh or camera transform\n\n## The takeaway\nFF6 shipped a complete VFX architecture — layers, two blend paths, distortion, masks, palette animation, and a sequencer — in registers and bytecode. Modern shaders simply hand each **pixel** the freedom HDMA handed each **scanline**.",
      },
    },
    {
      id: "rosetta-hdma",
      title: "HDMA wave, translated",
      content: {
        type: "multiple-choice",
        question: "What is the modern shader equivalent of FF6's HDMA wave distortion?",
        options: [
          "A UV-distortion pass offsetting sample coordinates per pixel",
          "A bloom pass over an HDR buffer",
          "Vertex displacement on the background mesh",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    { from: "battle-screen-architecture", to: "bgmode-write" },
    { from: "battle-screen-architecture", to: "spell-art-layer" },
    { from: "battle-screen-architecture", to: "two-blending-systems" },
    { from: "battle-screen-architecture", to: "hdma-scanline-machine" },
    { from: "battle-screen-architecture", to: "animation-vm" },
    { from: "two-blending-systems", to: "hit-flash-system" },
    { from: "two-blending-systems", to: "obj-palette-rule" },
    { from: "two-blending-systems", to: "palette-animation" },
    { from: "two-blending-systems", to: "window-shapes" },
    { from: "two-blending-systems", to: "rosetta-stone" },
    { from: "palette-animation", to: "cycling-what-changes" },
    { from: "palette-animation", to: "cast-rhythm-color" },
    { from: "palette-animation", to: "rosetta-stone" },
    { from: "hdma-scanline-machine", to: "wave-distortion" },
    { from: "hdma-scanline-machine", to: "window-shapes" },
    { from: "hdma-scanline-machine", to: "mosaic-mode7" },
    { from: "hdma-scanline-machine", to: "rosetta-stone" },
    { from: "window-shapes", to: "expanding-circle" },
    { from: "window-shapes", to: "rosetta-stone" },
    { from: "mosaic-mode7", to: "mosaic-per-region" },
    { from: "mosaic-mode7", to: "rosetta-stone" },
    { from: "animation-vm", to: "vm-subroutines" },
    { from: "animation-vm", to: "vm-threads" },
    { from: "animation-vm", to: "attack-record" },
    { from: "animation-vm", to: "cast-rhythm-color" },
    { from: "attack-record", to: "record-ffff" },
    { from: "attack-record", to: "frames-and-banks" },
    { from: "frames-and-banks", to: "why-3bpp" },
    { from: "frames-and-banks", to: "rosetta-stone" },
    { from: "cast-rhythm-color", to: "color-language" },
    { from: "rosetta-stone", to: "rosetta-hdma" },
  ],
};
