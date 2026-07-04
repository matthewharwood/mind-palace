import type { Curriculum } from "@mind-palace/curriculum";

import { bookOfShadersSource } from "./_sources";

// Shader Craft — the visualize-it → build-it fragment-shader skill: shaping
// functions, SDF shapes, uv transforms, polar coordinates, tiling, hash /
// value noise / fBm, gradient mapping, uv motion, dissolve-erosion, the
// additive-vs-alpha decision, and HDR glow. The Book of Shaders is a LINKED
// source only (its text is copyrighted) — every exercise below is an original
// WGSL formulation, naga-validated by scripts/verify-rust-cards.ts.
export const gfxShaderCraft: Curriculum = {
  id: "c-gfx-shader-craft",
  title: "Shader Craft",
  source: bookOfShadersSource,
  nodes: [
    {
      id: "fragment-mindset",
      title: "The Fragment Mindset",
      content: {
        type: "read",
        markdown:
          "Every effect in this path is built from one primitive: a **fragment shader** — a tiny program the GPU runs for ==every pixel at the same time==. There is no canvas object, no draw call from inside the shader, no loop over pixels. Thousands of copies of your code run in parallel, and each copy answers exactly one question: *what color is this pixel?*\n\n## Each invocation is alone\nA fragment invocation receives its own inputs — the interpolated `uv`, the uniforms (like `time`), any textures — returns ==one color==, and ends. It cannot read what a neighboring pixel computed this frame, and it cannot remember last frame. Everything you draw is therefore a **pure function of position and time**. That constraint is the whole craft: every technique in this curriculum is a clever way to turn *where am I* into *what color am I*.\n\n## uv is where-am-I\nBy convention position arrives as `uv`, normalized to the ==0 to 1 square==. Two idioms you will type constantly:\n\n- `let p = uv - vec2f(0.5, 0.5);` — recenter, so the middle of the screen is the origin\n- `let q = vec2f(p.x * aspect, p.y);` — aspect-correct, so circles are not squashed into eggs\n\nAlmost every trick that follows — tiling, polar coordinates, rotation, distortion — is a way of *warping or re-labelling* this address before turning it into color.\n\n## Color is your debugger\nThere is no logging on a GPU. The screen is the debugger: return any intermediate value as a color and look at it. `return vec4f(uv, 0.0, 1.0);` paints the coordinate system itself — dark corner at the origin, red growing along x, green along y. When an effect misbehaves, visualize the *ingredient*, not the finished dish.",
      },
    },
    {
      id: "parallel-canvas",
      title: "The parallel canvas",
      content: {
        type: "multiple-choice",
        question:
          "A fragment shader runs once per covered pixel, massively in parallel. While computing its color, what can a single invocation see?",
        options: [
          "The colors its neighboring fragments just computed this frame",
          "Only its own inputs — uv, uniforms, textures — never another fragment's result",
          "The whole framebuffer, read-write, at any moment",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "shaping-functions",
      title: "Shaping Functions",
      content: {
        type: "read",
        markdown:
          "You met `mix`, `step` and `smoothstep` as WGSL built-ins. In shader craft they become **pictures**: one-dimensional curves you apply to a coordinate, a distance, or time to shape every gradient, mask, pulse and falloff on screen.\n\n## The big three\n- `step(edge, x)` — a cliff: 0 below `edge`, 1 at or above it. Hard cutoffs, crisp masks.\n- `smoothstep(a, b, x)` — an S-shaped ramp from 0 to 1 across `a..b`. The soft edge, the fade, the antialiaser.\n- `pow(x, k)` — bends a 0-1 ramp without moving its endpoints. `k > 1` keeps it ==dark longer and rises late== (ease-in); `k < 1` lifts it early (ease-out). Every *contrast* slider in a VFX shader is a `pow`.\n\n## Composition is the skill\nShaping functions snap together like bricks:\n\n- a ==pulse==: `smoothstep(c - w, c, x) - smoothstep(c, c + w, x)` — a soft band peaking at `c`. Scanlines, ring highlights, energy bands.\n- a gate: multiply two masks to AND them; `max` them to OR.\n- a ping-pong: `abs(fract(t) * 2.0 - 1.0)` folds time into a triangle wave — back-and-forth motion from one line.\n\n## Draw the graph in your head\nThe Book of Shaders teaches these as visual exercises for a reason: before using a shaping function, sketch its curve. If you can picture `f(x)` from 0 to 1, you can predict the pixels before you press save.",
      },
    },
    {
      id: "pow-contrast",
      title: "pow as contrast",
      content: {
        type: "multiple-choice",
        question:
          "A horizontal gradient uses `uv.x` as its brightness. You replace it with `pow(uv.x, 4.0)`. How does the picture change?",
        options: [
          "It brightens earlier — most of the ramp is near white",
          "It flips — white on the left, black on the right",
          "It stays dark longer and rises steeply near 1.0 — an ease-in curve",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "pulse-fn",
      title: "Write: pulse",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn pulse(x: f32, center: f32, width: f32) -> f32` that returns a soft band peaking at `center`: compute the half-width `h`, rise with `smoothstep(center - h, center, x)`, fall with `smoothstep(center, center + h, x)`, and return their difference.",
        solution: `fn pulse(x: f32, center: f32, width: f32) -> f32 {
    let h = width * 0.5;
    return smoothstep(center - h, center, x) - smoothstep(center, center + h, x);
}`,
      },
    },
    {
      id: "sdf-shapes",
      title: "Think in Distance: SDF Shapes",
      content: {
        type: "read",
        markdown:
          "How does a pixel that only knows its own position draw a circle? It does not. It asks: ==how far am I from the circle's edge?== That question has a signed answer, and the sign is the trick.\n\n## Signed distance\n`length(p) - r` is the distance function of a circle with radius `r`: **negative inside, zero exactly on the edge, positive outside**. One number per pixel encodes the entire shape — a *signed distance field* (SDF), resolution-independent and infinitely crisp.\n\n## Distance beats branching\nWith a distance `d` in hand you never write an `if`:\n\n- **fill**: `1.0 - smoothstep(-e, e, d)` — the `e`-wide transition is a ==free antialiased edge== at any zoom\n- **ring / outline**: `abs(d) - w` treats the edge itself as a new shape, `w` thick\n- **rounding**: `d - r` inflates any SDF by `r`\n- **glow**: map the distance through a falloff like `pow(1.0 - clamp(d, 0.0, 1.0), 4.0)`\n\n## The starter kit\n- circle: `length(p) - r`\n- box: `let q = abs(p) - b;` then `length(max(q, vec2f(0.0, 0.0))) + min(max(q.x, q.y), 0.0)`\n- combine: `min(d1, d2)` unions, `max(d1, d2)` intersects, `max(d1, -d2)` cuts a hole\n\n## The retro rhyme\nSDF masks are the modern descendant of the SNES hardware window — the dark circle that irises over a battle scene is one `smoothstep` on one distance today.",
      },
    },
    {
      id: "read-sdf-shader",
      title: "Read an SDF shader",
      content: {
        type: "multiple-choice",
        question: "This fragment shader runs on a 400×400 render target. What appears?",
        language: "wgsl",
        code: `@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / vec2f(400.0, 400.0);
    let d = length(uv - vec2f(0.5, 0.5)) - 0.3;
    let m = 1.0 - smoothstep(0.0, 0.01, d);
    return vec4f(m, m, m, 1.0);
}`,
        options: [
          "A white disc centered on screen with a thin antialiased edge, on black",
          "A white ring outline around a black center",
          "A black disc on a white background",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sdf-circle-fill",
      title: "Write: sd_circle + fill_aa",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write two WGSL functions: `fn sd_circle(p: vec2f, r: f32) -> f32` returning the signed distance `length(p) - r`, and `fn fill_aa(d: f32, e: f32) -> f32` converting a distance into an antialiased mask — 1 inside, 0 outside, smooth across `-e..e` (one `smoothstep`, subtracted from 1).",
        solution: `fn sd_circle(p: vec2f, r: f32) -> f32 {
    return length(p) - r;
}

fn fill_aa(d: f32, e: f32) -> f32 {
    return 1.0 - smoothstep(-e, e, d);
}`,
      },
    },
    {
      id: "uv-rotation",
      title: "Rotate the Space, Not the Shape",
      content: {
        type: "read",
        markdown:
          "A shader cannot grab a shape and turn it — the shape is a formula evaluated at `uv`. To rotate the shape you rotate the ==coordinate system underneath it==: move the lens, not the painting.\n\n## The recipe\n1. Subtract the pivot: `let p = uv - center;`\n2. Rotate with the sin/cos pair: `vec2f(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a))`\n3. Add the pivot back.\n\nSkip step 1 and everything orbits the corner at `(0, 0)` instead of spinning in place — the classic first bug.\n\n## Time makes it motion\nFeed `a = time * speed` and the pattern spins forever. Feed `a = radius * k` — an angle that varies per pixel — and straight rays twist into a ==vortex==.\n\n## Mind the direction and the order\nRotating uv by `+a` spins the *image* by `-a` — you transformed the question, not the answer. And transform order matters: scale-then-rotate is not rotate-then-scale. Read uv transform chains right-to-left, exactly like the matrix products from the math curriculum.",
      },
    },
    {
      id: "rotate-uv-fn",
      title: "Write: rotate_uv",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn rotate_uv(uv: vec2f, center: vec2f, angle: f32) -> vec2f` that rotates uv space about `center`: subtract the pivot, bind `s = sin(angle)` and `c = cos(angle)`, apply the 2D rotation, and add the pivot back.",
        solution: `fn rotate_uv(uv: vec2f, center: vec2f, angle: f32) -> vec2f {
    let p = uv - center;
    let s = sin(angle);
    let c = cos(angle);
    return vec2f(p.x * c - p.y * s, p.x * s + p.y * c) + center;
}`,
      },
    },
    {
      id: "polar-uvs",
      title: "Polar UVs: Rays, Rings & Spirals",
      content: {
        type: "read",
        markdown:
          "Cartesian `uv` thinks in rows and columns. Bursts, rays, shockwaves and magic circles think in ==angle and distance==. The remap is two built-ins over the centered position `p`:\n\n- `let angle = atan2(p.y, p.x);` — which direction from center, in -π..π\n- `let radius = length(p);` — how far from center\n\n## What each axis buys\n- Bands along `angle` — `fract(angle / 6.283185 * n)` — give ==n rays== around the center: star bursts, sun beams.\n- Bands along `radius` give concentric rings.\n- Mix them — `angle + radius * k` — and rays shear into ==spirals==.\n\n## Animate the axes\n- Scroll `radius - time` into a repeating ring pattern and the rings ==travel outward== — the shockwave.\n- Scroll `angle + time` and the whole pattern rotates about the center.\n- Push `radius` through a shaping function and `angle` through a hash: flickering radial flares.\n\n## The seam\n`atan2` jumps from π back to -π along one direction from the center. Any pattern that is not perfectly periodic around the circle shows a hard ==seam== there. Fixes: repeat the pattern a whole number of times per revolution, or park the seam where geometry hides it.",
      },
    },
    {
      id: "polar-motion",
      title: "Polar motion",
      content: {
        type: "multiple-choice",
        question:
          "In polar UVs `(angle, radius)` you draw repeating bands with `fract(radius * n - time)`. What motion does the viewer see?",
        options: [
          "The rings spin around the center",
          "The rings travel outward from the center, like a repeating shockwave",
          "The rings shrink toward the center and vanish",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "tiling-cells",
      title: "Tiling: fract & Cell IDs",
      content: {
        type: "read",
        markdown:
          "One shape is a sprite; a grid of shapes is a *pattern*. Two built-ins turn one SDF into a field of them.\n\n## fract repeats the world\n`fract(uv * 6.0)` scales space so 0-1 becomes 0-6, then keeps only the fractional part — every unit square collapses back onto ==its own local 0-1 coordinate system==. Draw a circle at `(0.5, 0.5)` in that local space and it appears 36 times.\n\n## floor labels the tiles\n`floor(uv * 6.0)` is constant across each tile — `(0, 0)`, `(1, 0)`, `(2, 0)` and so on. That pair is the ==cell id==: a stable name for the tile a pixel lives in.\n\n## id + hash = variety\nA grid of identical sparkles reads as wallpaper. Feed the cell id into a hash (next lesson) and each tile owns a random number — offset each sparkle, scale it, delay its twinkle. One tile is a texture; a hashed grid behaves like a particle field that costs ==zero particles==.\n\n## Pattern tricks\n- offset every other row by half a tile for brick layouts\n- scale non-uniformly — `uv * vec2f(8.0, 2.0)` — for tall or wide cells\n- rotate *inside* each cell using the local 0-1 space and the previous lesson",
      },
    },
    {
      id: "cell-id-role",
      title: "Cell ids",
      content: {
        type: "multiple-choice",
        question:
          "In a tiled effect you compute `let local = fract(uv * 5.0);` and `let id = floor(uv * 5.0);`. What job does `id` do?",
        options: [
          "It is a stable per-tile label — feed it to a hash so every tile gets its own random value",
          "It is the local 0-1 coordinate used to draw inside each tile",
          "It antialiases the seams between neighboring tiles",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "hash-randomness",
      title: "Hash: Randomness on Tap",
      content: {
        type: "read",
        markdown:
          "Shaders have no random-number generator — and you would not want one. A sparkle must get the ==same random value every frame== or the effect boils with static. What you want is a **hash**: deterministic chaos.\n\n## The fract-sin classic\n`fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453)`\n\nRead it inside-out: `dot` mangles the 2D position into one number using awkward, irrational-looking weights; `sin` folds it; multiplying by ==43758.5453== stretches the folds until the integer part means nothing; `fract` keeps only the scrambled tail. Same input, same output — but neighboring inputs land wildly far apart.\n\n## What to feed it\n- raw `uv` → per-pixel white noise, TV static\n- a ==cell id== from `floor` → one stable random number per tile\n- `id + vec2f(seed, seed)` → a second, independent random channel from the same id\n\n## Honest fine print\nThis is a folklore hash — precision-sensitive, statistically imperfect, and absolutely not cryptography. For sparkles, jitter and per-tile variety it is the beloved standard, and it is where every noise function in the next lessons gets its randomness.",
      },
    },
    {
      id: "hash21-fn",
      title: "Write: hash21",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write the classic fract-sin hash in WGSL: `fn hash21(p: vec2f) -> f32` — dot `p` with `vec2f(127.1, 311.7)`, take the `sin`, multiply by `43758.5453`, and return the `fract`.",
        solution: `fn hash21(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}`,
      },
    },
    {
      id: "value-noise",
      title: "Value Noise: Smoothed Chaos",
      content: {
        type: "read",
        markdown:
          "A hash makes every pixel a stranger to its neighbors. Nature is smooth — clouds, smoke and terrain change ==gradually==. **Value noise** manufactures smooth randomness from the hash you already have.\n\n## Random at the corners, smooth in between\nSplit space into integer cells with `floor(p)` and `fract(p)`. Hash each of the four cell ==corners== — four stable random values. Inside the cell, blend them by position: `mix` horizontally along the bottom, horizontally along the top, then vertically between the two — a bilinear blend.\n\n## The fade curve\nBlending with the raw fraction leaves visible creases at cell borders — the slope snaps as you cross a lattice line. Ease the blend weight first: `let u = f * f * (3.0 - 2.0 * f);` — the same cubic that lives inside `smoothstep`. The lattice disappears and the randomness rolls smoothly.\n\n## Using it\n- `value_noise(p * frequency)` — higher frequency, finer wobble\n- remap the 0-1 output with shaping functions: `pow` for contrast, `smoothstep` for cloud edges\n- one octave looks like a ==lava lamp== — blobby, single-scale. Real texture needs octaves stacked on octaves: the next lesson.",
      },
    },
    {
      id: "value-noise-fn",
      title: "Write: value_noise",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write WGSL value noise: the fract-sin `hash21`, then `fn value_noise(p: vec2f) -> f32` that splits `p` with `floor`/`fract`, fades the fraction with `f * f * (3.0 - 2.0 * f)`, hashes the four cell corners `a`/`b`/`c`/`d`, and returns the bilinear `mix(mix(a, b, u.x), mix(c, d, u.x), u.y)`.",
        solution: `fn hash21(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn value_noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let a = hash21(i);
    let b = hash21(i + vec2f(1.0, 0.0));
    let c = hash21(i + vec2f(0.0, 1.0));
    let d = hash21(i + vec2f(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`,
      },
    },
    {
      id: "fbm",
      title: "fBm: Stacking Octaves",
      content: {
        type: "read",
        markdown:
          "One octave of noise is a lava lamp. A cumulus cloud has detail at ==every scale== — big billows carrying small billows carrying wisps. **Fractional Brownian motion** (fBm) fakes that hierarchy by summing noise octaves.\n\n## The loop\nStart with `amplitude = 0.5` and `frequency = 1.0`. Each octave adds `amplitude * noise(p * frequency)`, then multiplies `frequency` by the ==lacunarity== (usually 2.0) and `amplitude` by the ==gain== (usually 0.5). Low octaves define the silhouette; high octaves sprinkle detail over it.\n\n## Knob feel\n- **more octaves** → finer, higher-frequency detail on the *same* large shapes; past 5-6 the additions shrink below a pixel\n- **gain up** (0.5 → 0.7) → rougher, crunchier — detail shouts over the base\n- **lacunarity up** → wider spacing between detail scales\n- every octave costs a full noise evaluation — fBm is where fragment shaders start earning their GPU bill\n\n## Set it in motion\nScroll the domain — `fbm(p + vec2f(0.0, -time))` — and the whole cloud drifts upward: an instant smoke column. Warp one fBm with another — `fbm(p + fbm_offset)` where the offset is itself noise — and you get the curling, marbled look behind a thousand magic effects.",
      },
    },
    {
      id: "fbm-octaves",
      title: "fBm octaves",
      content: {
        type: "multiple-choice",
        question:
          "You raise an fBm loop from 2 octaves to 6, keeping lacunarity 2.0 and gain 0.5. What changes in the image?",
        options: [
          "The large shapes move — the overall silhouette is redrawn",
          "The image gets uniformly brighter",
          "Fine, high-frequency detail piles onto the same large shapes",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "fbm-fn",
      title: "Write: fbm",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL fBm. First a stand-in noise `fn wave_noise(p: vec2f) -> f32` returning `0.5 + 0.5 * sin(p.x * 3.1) * sin(p.y * 2.7)`. Then `fn fbm(p: vec2f) -> f32`: `var total = 0.0`, `var amplitude = 0.5`, `var frequency = 1.0`; loop 5 octaves adding `amplitude * wave_noise(p * frequency)`, doubling `frequency` and halving `amplitude` each pass; return the total.",
        solution: `fn wave_noise(p: vec2f) -> f32 {
    return 0.5 + 0.5 * sin(p.x * 3.1) * sin(p.y * 2.7);
}

fn fbm(p: vec2f) -> f32 {
    var total = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    for (var i = 0; i < 5; i++) {
        total += amplitude * wave_noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}`,
      },
    },
    {
      id: "gradient-mapping",
      title: "Gradient Maps & Cosine Palettes",
      content: {
        type: "read",
        markdown:
          "Professionals author effects in **grayscale** and add color at the last moment. The pattern — noise, SDF, flame mask — says *where*; a **gradient map** says *what color*.\n\n## The ramp\nTreat brightness as a lookup coordinate: `color = ramp(gray)`. A fire ramp maps 0 → near-black red, 0.5 → orange, 0.9 → yellow, 1.0 → white. Feed it fBm and you have fire. Swap in a green-purple ramp and ==the same noise is now poison== — a full recolor without touching the pattern. This is how one effect ships as fire, ice and toxic variants.\n\n## Cosine palettes\nA ramp does not need a texture. Four `vec3f` knobs make a smooth procedural palette: `a + b * cos(6.283185 * (c * t + d))` — `a` centers it, `b` sets contrast, `c` sets how many times each channel cycles, `d` phase-shifts the channels apart. Tuning `d` alone walks through sunset, ocean and neon schemes.\n\n## Palette cycling, reborn\nSNES-era fire and waterfalls animated by ==rotating palette entries== while the pixels never changed. The modern descendant scrolls the lookup instead: `ramp(fract(gray + time))` sweeps the entire gradient through the image — a shimmering energy wash for the cost of one add.",
      },
    },
    {
      id: "cosine-palette-fn",
      title: "Write: cosine palette",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL cosine palette `fn palette(t: f32) -> vec3f` returning `a + b * cos(6.283185 * (c * t + d))`, with `a` and `b` both `vec3f(0.5, 0.5, 0.5)`, `c = vec3f(1.0, 1.0, 1.0)`, and `d = vec3f(0.0, 0.33, 0.67)` — the classic rainbow ramp.",
        solution: `fn palette(t: f32) -> vec3f {
    let a = vec3f(0.5, 0.5, 0.5);
    let b = vec3f(0.5, 0.5, 0.5);
    let c = vec3f(1.0, 1.0, 1.0);
    let d = vec3f(0.0, 0.33, 0.67);
    return a + b * cos(6.283185 * (c * t + d));
}`,
      },
    },
    {
      id: "uv-motion",
      title: "Scroll, Distort, Flow",
      content: {
        type: "read",
        markdown:
          "Nothing in a shader moves. You create motion by ==changing the address, not the pixels== — sample somewhere else next frame and the eye sees flow.\n\n## Scroll\n`uv + vec2f(0.0, -speed * time)` slides a pattern upward forever. Two hygiene rules: wrap the offset with `fract` so a long-running effect does not drift into float-precision mush, and layer ==two copies at different speeds and scales== — their interference reads as boiling, which is most of a flame body.\n\n## Distort\nOffset the address by noise *before* evaluating the main pattern: `let warped = uv + (n - 0.5) * strength;` where `n` is a per-pixel noise value. Keep `strength` around ==5-10%== — distortion sells at a whisper and collapses into soup at a shout. Heat haze, underwater wobble, energy warble.\n\n## Flow\nScroll the *noise lookup itself* — `noise(uv * scale + vec2f(0.0, -time))` — and the warble travels through the image. Distortion that flows is the difference between a wobbly sticker and living fire.\n\n## The retro rhyme\nThe SNES made water shimmer by rewriting the scroll register ==every scanline== (HDMA). A per-pixel `uv + vec2f(sin(uv.y * freq + time) * amp, 0.0)` is the same idea with the resolution turned all the way up — one line of WGSL replaces a DMA channel.",
      },
    },
    {
      id: "dissolve-erosion",
      title: "Dissolve & Erosion",
      content: {
        type: "read",
        markdown:
          "Fading an effect out by lowering its alpha makes a ==ghost== — the whole sprite turns uniformly translucent and limp. Burning it out with a threshold makes it ==erode== — edges crumble first, holes tear open, and the energy reads as *consumed*. This is the single most load-bearing trick in VFX shading.\n\n## Threshold a mask\nTake a grayscale noise mask. Compare it against a rising threshold: `step(threshold, mask)`. As the threshold climbs from 0 to 1, the darkest pixels vanish first and ragged holes chew through the shape. Drive the threshold with a particle's age and smoke burns away; drive it with the `v` coordinate and the erosion sweeps along a slash arc.\n\n## Soft edges need headroom\nSwap `step` for `smoothstep(t, t + feather, mask)` to crumble softly — but there is a trap. If `t` only sweeps 0..1, the mask never fully appears at one end and never fully clears at the other: the soft band gets ==stuck at the boundary==. Remap the sweep to `-feather .. 1.0 + feather` so both extremes land fully solid and fully gone.\n\n## The burning edge\nIsolate the band just above the threshold — `smoothstep(t, t + e, mask) - smoothstep(t + e, t + 2.0 * e, mask)` — and color it with a hot ember tone pushed ==above 1.0==. With bloom active, the rim ignites: the dissolve stops being a wipe and becomes combustion.\n\n## One mask, many deaths\nThe same mechanism is the toxic-cloud erosion, the burn-away scroll, and the freeze-shatter crumble — swap the mask texture and the color ramp, keep the math.",
      },
    },
    {
      id: "dissolve-feather",
      title: "Feathered thresholds",
      content: {
        type: "multiple-choice",
        question:
          "A soft dissolve uses `smoothstep(t, t + feather, mask)` with `mask` in 0..1. Why must `t` sweep from `-feather` to `1.0 + feather` instead of 0 to 1?",
        options: [
          "smoothstep is undefined when its edges leave the 0..1 range",
          "Otherwise the soft band gets stuck at the ends — the sprite never lands fully visible at one extreme or fully gone at the other",
          "It makes the dissolve finish in fewer frames",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "dissolve-mask-fn",
      title: "Write: dissolve_mask",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL dissolve `fn dissolve_mask(mask: f32, progress: f32, feather: f32) -> f32`: use `mix` to remap `progress` into a threshold `t` sweeping `-feather` to `1.0 + feather`, then return `smoothstep(t, t + feather, mask)` — fully visible at progress 0, fully gone at progress 1.",
        solution: `fn dissolve_mask(mask: f32, progress: f32, feather: f32) -> f32 {
    let t = mix(-feather, 1.0 + feather, progress);
    return smoothstep(t, t + feather, mask);
}`,
      },
    },
    {
      id: "blend-choice",
      title: "Additive vs Alpha",
      content: {
        type: "read",
        markdown:
          "Your fragment returns a color — but ==how that color lands on what is already there== is a pipeline decision: the blend mode. VFX lives on two of them.\n\n## Additive: light\n`dst + src`. Black contributes nothing, so a texture's dark background disappears for free. Overlaps stack ==toward white== — exactly how hot cores should behave. Use it for everything that *emits*: fire cores, sparks, lasers, plasma, magic. Bonus gift: addition is commutative, so additive layers are ==order-independent== — no sorting, ever.\n\n## Alpha: matter\n`mix(dst, src, alpha)`. It can darken and occlude, which light cannot — the mode for things that *block* light: smoke, dust, debris, liquid. The tax: correctness depends on draw order, so alpha layers need ==back-to-front sorting==, and sorting failures pop visibly.\n\n## The classic sandwich\nProduction fire is both at once: an additive core licking inside an alpha-blended smoke shell. Deciding *emits vs blocks*, layer by layer, is step one of decomposing any reference effect.\n\n## The retro rhyme\nSNES color math offered add and average between two layers — *glow adds, fog averages* was burned into the hardware. Your blend-state choice today is the same instinct with the registers removed.",
      },
    },
    {
      id: "smoke-blend",
      title: "Blending smoke",
      content: {
        type: "multiple-choice",
        question:
          "A smoke puff must darken and occlude whatever is behind it. Which blend mode fits, and what tax does that choice carry?",
        options: [
          "Alpha blending — and it needs back-to-front sorting to composite correctly",
          "Additive — and it needs nothing, since it is order-independent",
          "Multiply — and it needs an HDR render target",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "glow-fresnel",
      title: "Glow: HDR, Bloom & Fresnel",
      content: {
        type: "read",
        markdown:
          "## Glow is earned, not painted\nA glow is not a color you pick — it is ==brightness the display cannot contain==. In an HDR pipeline your shader may output values far above 1.0; a **bloom** post-pass extracts the over-bright pixels, blurs them, and adds the blur back. The halo around a laser is energy overflowing, computed by the pipeline — not an airbrushed sprite.\n\n## Push energy, not whiteness\nThe reflex to unlearn: making a hot thing hotter by mixing toward white kills its color. Multiply the emissive up instead — `color * 8.0`, even `* 50.0` for a flash core. The tone-mapper keeps the hue while the bloom builds the halo. Painted glow caps at white; ==earned glow keeps its color==.\n\n## SDF glow\nDistance fields hand you perfect falloffs: `pow(1.0 - clamp(d, 0.0, 1.0), 4.0)` gives a tight core with a long soft tail. Multiply by an HDR color and any SDF shape becomes a neon sign.\n\n## Fresnel: glow at the rim\nOn 3D surfaces, `pow(1.0 - clamp(dot(n, v), 0.0, 1.0), k)` brightens where the surface turns ==edge-on== to the viewer — the force-field rim, the ghost outline, the bubble sheen. The inverse — fading at grazing angles — turns a plain sphere into a soft, volumetric-looking glow ball. Here `n` is the surface normal and `v` the direction to the camera: the dot product from the math curriculum, cashing its check.\n\n## Where this lands\nWiring it up happens in the Bevy VFX curriculum — an HDR camera plus the Bloom effect. For now, install the instinct: when an effect must glow, raise its ==energy== and let the pipeline paint the halo.",
      },
    },
  ],
  edges: [
    { from: "fragment-mindset", to: "parallel-canvas" },
    { from: "fragment-mindset", to: "shaping-functions" },
    { from: "fragment-mindset", to: "uv-rotation" },
    { from: "fragment-mindset", to: "blend-choice" },
    { from: "shaping-functions", to: "pow-contrast" },
    { from: "shaping-functions", to: "pulse-fn" },
    { from: "shaping-functions", to: "sdf-shapes" },
    { from: "shaping-functions", to: "tiling-cells" },
    { from: "shaping-functions", to: "gradient-mapping" },
    { from: "shaping-functions", to: "dissolve-erosion" },
    { from: "shaping-functions", to: "sdf-circle-fill" },
    { from: "sdf-shapes", to: "read-sdf-shader" },
    { from: "sdf-shapes", to: "sdf-circle-fill" },
    { from: "sdf-shapes", to: "glow-fresnel" },
    { from: "uv-rotation", to: "rotate-uv-fn" },
    { from: "uv-rotation", to: "polar-uvs" },
    { from: "polar-uvs", to: "polar-motion" },
    { from: "tiling-cells", to: "cell-id-role" },
    { from: "tiling-cells", to: "hash-randomness" },
    { from: "tiling-cells", to: "value-noise" },
    { from: "hash-randomness", to: "hash21-fn" },
    { from: "hash-randomness", to: "value-noise" },
    { from: "value-noise", to: "value-noise-fn" },
    { from: "value-noise", to: "fbm" },
    { from: "value-noise", to: "uv-motion" },
    { from: "fbm", to: "fbm-octaves" },
    { from: "fbm", to: "fbm-fn" },
    { from: "fbm", to: "gradient-mapping" },
    { from: "fbm", to: "dissolve-erosion" },
    { from: "gradient-mapping", to: "cosine-palette-fn" },
    { from: "dissolve-erosion", to: "dissolve-feather" },
    { from: "dissolve-erosion", to: "dissolve-mask-fn" },
    { from: "blend-choice", to: "smoke-blend" },
    { from: "blend-choice", to: "glow-fresnel" },
  ],
};
