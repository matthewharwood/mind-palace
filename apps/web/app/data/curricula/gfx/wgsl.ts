import type { Curriculum } from "@mind-palace/curriculum";

import { gpuwebSource } from "./_sources";

// WGSL: The Shader Language — the language itself, anchored to the W3C WGSL
// spec (gpuweb/gpuweb, /wgsl). Module anatomy, types & swizzles, var/let/const
// and address spaces, bindings, inter-stage IO, control flow, strict numerics,
// texture sampling, and the §17 built-in toolbox. Every wgsl snippet is
// naga-validated by scripts/verify-rust-cards.ts. Plain WGSL only — Bevy's
// preprocessor placeholders are mentioned in prose and taught in c-gfx-bevy-vfx.
export const gfxWgsl: Curriculum = {
  id: "c-gfx-wgsl",
  title: "WGSL: The Shader Language",
  source: gpuwebSource,
  nodes: [
    {
      id: "module-anatomy",
      title: "Module Anatomy & Entry Points",
      content: {
        type: "read",
        markdown:
          "A WGSL file is a ==module== — a flat list of declarations the GPU compiles as one unit: `struct` definitions, module-scope variables, constants, and functions. There is no preprocessor and no includes in plain WGSL — what you see is the whole program.\n\n## Entry points\nAn **entry point** is a function the pipeline calls directly, marked with a *stage attribute*:\n\n- `@vertex` — runs once per vertex; must output a clip-space position\n- `@fragment` — runs once per covered pixel; usually outputs a color\n- `@compute` — general-purpose work; must also declare `@workgroup_size(...)`\n\nThe name is yours: `vs_main` and `fs_main` are convention, not magic. ==The attribute makes the entry point, not the name== — unlike GLSL, nothing special happens to a function called `main`.\n\n## One module, many entry points\nA single module may hold several entry points — a vertex + fragment pair for one effect, or variants that share helper functions. The CPU side picks one **by name** when it builds a pipeline.\n\n## Everything is explicit\nWGSL has no hidden globals like GLSL's `gl_Position`. Inputs arrive as annotated parameters, outputs leave as annotated return values — the entire dataflow of a stage is visible in its signature.",
      },
    },
    {
      id: "types-and-vectors",
      title: "Scalars, Vectors & Matrices",
      content: {
        type: "read",
        markdown:
          "WGSL is built for graphics, so vectors are first-class citizens.\n\n## Scalars\nFour everyday scalar types: `f32` (the workhorse — colors, positions, time), `i32`, `u32`, and `bool`. That is essentially the whole list — no doubles by default, and no silent promotions between them.\n\n## Vectors\n`vec2<f32>`, `vec3<f32>`, and `vec4<f32>` bundle 2–4 scalars. In practice you write the ==predeclared shorthands==: `vec2f`, `vec3f`, `vec4f` — and `vec3i`, `vec4u` for integer vectors.\n\n- construct: `vec4f(1.0, 0.4, 0.0, 1.0)`\n- splat one value: `vec3f(0.5)` means `(0.5, 0.5, 0.5)`\n- nest: `vec4f(rgb, 1.0)` extends a `vec3f` with an alpha\n\n## Swizzles\nEvery vector exposes its lanes as `.x .y .z .w` — or the color aliases `.r .g .b .a`. Combine letters to **reorder, duplicate, or shrink**: `v.xy` is a `vec2f`, `color.bgr` reverses channels, `uv.xxx` splats one lane into three. Swizzling costs nothing on the GPU and is idiomatic everywhere.\n\n## Matrices\n`mat4x4f` (shorthand for `mat4x4<f32>`) and friends transform vectors with plain multiplication: `m * v`. WGSL uses ==column vectors==, so chained transforms compose right-to-left — the same convention glam uses on the CPU. One mental model on both sides of the bus.",
      },
    },
    {
      id: "var-let-const",
      title: "var, let, const & Address Spaces",
      content: {
        type: "read",
        markdown:
          "Three ways to name a value, each with a distinct job.\n\n## let — a fixed value\n`let half = uv * 0.5;` computes once at runtime and never changes. No reassignment, no address — most shader locals should be `let`.\n\n## var — a memory location\n`var total = 0.0;` creates real storage you can **reassign and mutate**: loop accumulators, output structs you fill field by field.\n\n## const — compile time\n`const TAU = 6.28318;` is evaluated when the module is compiled and works at module scope — shared tuning knobs for every function. (There is also `override`, a constant the CPU may replace at pipeline creation — rare in day-to-day VFX.)\n\n## Address spaces\nEvery `var` lives in an ==address space== — a statement about where the memory physically is:\n\n- `function` — locals inside a function; the default, so `var total = 0.0;` needs no annotation\n- `private` — module-scope scratch, one copy per invocation: `var<private> seed: u32;`\n- `uniform` — read-only parameters bound from the CPU: `var<uniform> params: FxParams;`\n- `storage` — large buffers, `read` or `read_write`; compute-shader particle systems live here\n- `workgroup` — memory shared within one compute workgroup\n\nThe rule of thumb: `let` and `const` name **values**; only `var` names **memory** — and memory always has an address space.",
      },
    },
    {
      id: "bindings-and-uniforms",
      title: "Bindings: @group & @binding",
      content: {
        type: "read",
        markdown:
          "A shader cannot see your app's memory. Everything from the CPU — parameters, textures, buffers — crosses over as a ==binding== declared at module scope.\n\n## @group and @binding\nA typical declaration reads `@group(0) @binding(0) var<uniform> params: FxParams;`\n\n- `@binding(N)` — the slot within one bind group\n- `@group(N)` — which bind group; the CPU attaches whole groups at draw time\n\nThe numbers are a **contract** with host code: the pipeline layout on the CPU side must line up slot-for-slot with these indices, or pipeline creation fails.\n\n## Uniform structs\nSmall read-only parameter blocks are the everyday case — a `struct` bound in the `uniform` address space. Declare the struct once, bind it once, then read `params.time` or `params.tint` from any function in the module. This is the knob panel of every VFX shader: ==time, tint, intensity, progress are all uniforms==.\n\n## Plain WGSL vs Bevy\nPlain WGSL always uses ==literal indices== like `@group(0)`. In Bevy material shaders you will instead see `@group(#{MATERIAL_BIND_GROUP})` — a placeholder Bevy's shader preprocessor fills in before compilation. That syntax is **not** valid WGSL on its own (a bare `naga` validation rejects it); the Bevy material workflow gets its own curriculum later in this path.",
      },
    },
    {
      id: "inter-stage-io",
      title: "Inter-stage IO: @location & Builtins",
      content: {
        type: "read",
        markdown:
          'Vertex and fragment stages are separate programs. Data flows between them through ==inter-stage IO== — annotated inputs and outputs.\n\n## @location wires stages together\nA vertex output marked `@location(0)` feeds the fragment input marked `@location(0)`. ==Matching happens by location number, never by name== — an output called `uv` and an input called `tex_coord` connect fine as long as the numbers agree.\n\n## @builtin(position) — one attribute, two meanings\n- As a **vertex output**, `@builtin(position)` is required: the ==clip-space== position.\n- As a **fragment input**, the same attribute delivers ==framebuffer coordinates== — pixels, with (0.5, 0.5) at the center of the top-left pixel.\n\nSame attribute, different coordinate spaces — the number-one source of "my coordinates are wrong" bugs when porting GLSL, where `gl_FragCoord` did the second job.\n\n## Structs keep it tidy\nBundle vertex outputs into a struct — one `@builtin(position)` field plus one `@location(n)` field per value — and return the struct from the vertex entry point. The fragment entry point can take the same struct as its parameter.\n\n## Interpolation\nBetween the stages the rasterizer **interpolates** every location across the triangle — that is why a per-vertex `uv` arrives per-pixel, smoothly varying. Integer types cannot be interpolated and require `@interpolate(flat)`.',
      },
    },
    {
      id: "functions-and-flow",
      title: "Functions & Control Flow",
      content: {
        type: "read",
        markdown:
          "## Functions\n`fn glow(d: f32) -> f32 { ... }` — parameters are typed, the return type follows `->`, and a function that declares one must return on **every** path. Helpers live at module scope beside your entry points and are freely shared between them.\n\nOne hard rule with no GLSL-era escape hatch: ==recursion is forbidden==. The call graph must be a DAG; the compiler rejects any cycle. Iterate instead.\n\n## Branching\n`if cond { ... } else { ... }` — parentheses around the condition are optional, braces are mandatory. `switch` handles integer cases and **requires** a `default` arm.\n\n## Loops\n- `for (var i = 0; i < 8; i++) { ... }` — the everyday counted loop\n- `while cond { ... }` — condition-driven\n- `loop { ... }` — bare loop with explicit `break`; `continue` works as expected\n\n## discard\nInside a fragment shader, `discard` throws the current fragment away — no color written, no depth written. This one-line statement carries a whole VFX genre: ==dissolve and erosion effects== sample noise, compare it against a threshold that rises over time, and discard everything below it.",
      },
    },
    {
      id: "strict-numerics",
      title: "Strict Numbers: 1 vs 1.0",
      content: {
        type: "read",
        markdown:
          "WGSL never converts concrete numeric types implicitly. Coming from almost any other language, this is the ==number-one beginner error==.\n\n## Concrete types do not mix\nOnce a value has a concrete type — `f32`, `i32`, `u32` — its arithmetic partners must match exactly:\n\n- `f32 + i32` — type error\n- `i32 + u32` — type error, even though both are integers\n- the fix is a **value constructor**: `f32(n)`, `i32(x)` (truncates toward zero), `u32(k)`\n\n## Literals are flexible — until they are not\nA bare `1` is an ==abstract int== and `1.0` an abstract float: untyped numbers that adapt to context. `let s: f32 = 2;` compiles — the literal materializes as `f32`. But the moment a value is concrete, flexibility ends: with `let n: i32 = 3;`, the expression `n * 0.5` is a type error — `0.5` cannot become an `i32`, and `n` will not silently become an `f32`.\n\nSuffixes pin a literal's type when you need to: `1i`, `1u`, `1f`.\n\n## Two traps to remember\n- `1 / 2` is **integer division** — it evaluates to `0`, not `0.5`. Write `1.0 / 2.0`.\n- A loop counter `var i = 0` is an `i32`; to use it in float math you write `f32(i)` every single time.",
      },
    },
    {
      id: "texture-sampling",
      title: "Textures & Samplers",
      content: {
        type: "read",
        markdown:
          "## Two objects, not one\nGLSL's `sampler2D` bundles image and sampling rules together; WGSL splits them:\n\n- `texture_2d<f32>` — the image data itself (texels)\n- `sampler` — **how** to read it: filtering and wrap modes\n\nBoth are ==handle types== declared at module scope with bindings, and neither takes an address space in angle brackets: `@group(0) @binding(0) var t: texture_2d<f32>;`\n\n## textureSample\n`textureSample(t, s, uv)` reads texture `t` through sampler `s` at `uv` — normalized 0..1 coordinates — and returns a `vec4f`. It is only callable from a ==fragment shader==: choosing a mip level needs screen-space derivatives that exist nowhere else. To read an exact texel by integer coordinate — no filtering, any stage — use `textureLoad`.\n\n## The sampler decides the look\nFiltering and wrapping are configured on the CPU when the sampler is created; the shader just uses what it is handed:\n\n- **linear** filtering blends neighboring texels — smooth, right for photos and gradients\n- **nearest** picks a single texel — the only correct answer for ==pixel art==, where linear filtering turns crisp sprites to mush\n- wrap modes decide what happens past the 0..1 edge: repeat (tiling) or clamp (stretch the border pixel)",
      },
    },
    {
      id: "builtin-toolbox",
      title: "The Built-in Toolbox",
      content: {
        type: "read",
        markdown:
          "WGSL ships a rich set of built-in functions — §17 of the spec is the everyday reference. A dozen of them do most VFX work, and ==nearly all keep their GLSL names==.\n\n## The shaping kit\n- `mix(a, b, t)` — linear interpolation (what CPU-side code calls lerp)\n- `clamp(x, lo, hi)` and `saturate(x)` — pin to a range / pin to 0..1\n- `step(edge, x)` — hard 0-or-1 cutoff\n- `smoothstep(lo, hi, x)` — the S-curve ramp behind every soft edge and glow falloff\n- `fract(x)` — the repeating 0..1 sawtooth that powers tiling and scrolling\n\n## The vector kit\n- `dot(a, b)`, `length(v)`, `distance(a, b)`, `normalize(v)`\n- plus `abs`, `min`, `max`, `pow`, `floor`, `sin`, `cos`, `exp2`\n\nAlmost all of these are ==component-wise on vectors==: `fract(uv * 8.0)` applies to both lanes at once — no loop needed, and the GPU prefers it that way.\n\n## The GLSL phrasebook is short\nPorting Book-of-Shaders-style GLSL mostly means renaming types, not functions: `vec2` becomes `vec2f`, `texture(...)` becomes `textureSample(...)`, `gl_FragCoord` becomes a `@builtin(position)` fragment input — while `mix`, `fract`, `smoothstep`, `dot`, and friends carry over letter-for-letter.",
      },
    },
    {
      id: "entry-point-attribute",
      title: "What makes an entry point",
      content: {
        type: "multiple-choice",
        question: "What makes a WGSL function a fragment entry point?",
        options: [
          "It is named `main`",
          "It is marked with the `@fragment` attribute",
          "It returns a `vec4f`",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "vec-shorthand",
      title: "vec3f shorthand",
      content: {
        type: "multiple-choice",
        question: "In WGSL, `vec3f` is a predeclared shorthand for which type?",
        options: ["`vec3<f16>`", "A fixed-size array of three floats", "`vec3<f32>`"],
        answerIndex: 2,
      },
    },
    {
      id: "swizzle-order",
      title: "Reading a swizzle",
      content: {
        type: "multiple-choice",
        question: "What value does `demo` return?",
        language: "wgsl",
        code: `fn demo() -> vec2f {
    let v = vec4f(1.0, 2.0, 3.0, 4.0);
    return v.zx;
}`,
        options: ["`vec2f(3.0, 1.0)`", "`vec2f(1.0, 3.0)`", "`vec2f(4.0, 2.0)`"],
        answerIndex: 0,
      },
    },
    {
      id: "let-vs-var",
      title: "Reassignable declarations",
      content: {
        type: "multiple-choice",
        question:
          "Inside a WGSL function, which declaration creates storage you can reassign later?",
        options: ["`let`", "`const`", "`var`"],
        answerIndex: 2,
      },
    },
    {
      id: "uniform-address-space",
      title: "Choosing an address space",
      content: {
        type: "multiple-choice",
        question:
          "Per-draw parameters like time and tint arrive read-only from the CPU. Which declaration holds them?",
        options: ["`var<uniform>`", "`var<workgroup>`", "`var<private>`"],
        answerIndex: 0,
      },
    },
    {
      id: "fragment-position",
      title: "position in a fragment shader",
      content: {
        type: "multiple-choice",
        question: "In a **fragment** shader input, what does `@builtin(position)` contain?",
        options: [
          "Clip-space coordinates in -1..1",
          "Framebuffer coordinates in pixels",
          "Normalized UV coordinates in 0..1",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "no-implicit-conversion",
      title: "Concrete types don't mix",
      content: {
        type: "multiple-choice",
        question: "Given `let n: i32 = 3;`, which expression is a type error?",
        options: ["`n * 2`", "`n * 0.5`", "`f32(n) * 0.5`"],
        answerIndex: 1,
      },
    },
    {
      id: "texture-sample-call",
      title: "The sampling call shape",
      content: {
        type: "multiple-choice",
        question:
          "Which call correctly samples a bound `texture_2d<f32>` named `t` through a `sampler` named `s` at coordinates `uv`?",
        options: ["`t.sample(s, uv)`", "`textureSample(s, uv)`", "`textureSample(t, s, uv)`"],
        answerIndex: 2,
      },
    },
    {
      id: "glsl-phrasebook",
      title: "GLSL → WGSL phrasebook",
      content: {
        type: "multiple-choice",
        question:
          "You are porting a GLSL effect that reads `gl_FragCoord`. Where does that value live in WGSL?",
        options: [
          "In a fragment input marked `@builtin(position)`",
          "In a fragment input marked `@location(0)`",
          "In a global variable named `frag_coord`",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "write-solid-color",
      title: "Write: solid-color fragment",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a fragment entry point: a function `fn fs_main() -> @location(0) vec4f` marked `@fragment` that returns solid orange, `vec4f(1.0, 0.4, 0.0, 1.0)`.",
        solution: `@fragment
fn fs_main() -> @location(0) vec4f {
    return vec4f(1.0, 0.4, 0.0, 1.0);
}`,
      },
    },
    {
      id: "write-swap-rb",
      title: "Write: swap red & blue",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn swap_rb(color: vec4f) -> vec4f` that returns the color with red and blue swapped, using a single `.bgra` swizzle.",
        solution: `fn swap_rb(color: vec4f) -> vec4f {
    return color.bgra;
}`,
      },
    },
    {
      id: "write-cell-shade",
      title: "Write: cell_shade",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn cell_shade(steps: i32, x: f32) -> f32` that quantizes `x` into bands: convert `steps` explicitly and return `floor(x * f32(steps)) / f32(steps)`.",
        solution: `fn cell_shade(steps: i32, x: f32) -> f32 {
    return floor(x * f32(steps)) / f32(steps);
}`,
      },
    },
    {
      id: "write-wave-sum",
      title: "Write: wave_sum loop",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn wave_sum(x: f32) -> f32`: start with `var total = 0.0;`, loop `for (var i = 1; i <= 4; i++)` adding `sin(x * f32(i)) / f32(i)` to `total`, then return it.",
        solution: `fn wave_sum(x: f32) -> f32 {
    var total = 0.0;
    for (var i = 1; i <= 4; i++) {
        total += sin(x * f32(i)) / f32(i);
    }
    return total;
}`,
      },
    },
    {
      id: "write-uniform-params",
      title: "Write: uniform params",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Declare `struct FxParams` with fields `tint: vec4f`, `time: f32`, `strength: f32`. Bind it as `@group(0) @binding(0) var<uniform> params: FxParams;` and write an `@fragment` entry `fn fs_main() -> @location(0) vec4f` returning `params.tint * params.strength`.",
        solution: `struct FxParams {
    tint: vec4f,
    time: f32,
    strength: f32,
}

@group(0) @binding(0) var<uniform> params: FxParams;

@fragment
fn fs_main() -> @location(0) vec4f {
    return params.tint * params.strength;
}`,
      },
    },
    {
      id: "write-vertex-out",
      title: "Write: vertex output struct",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Define `struct VsOut` with `@builtin(position) clip_pos: vec4f` and `@location(0) uv: vec2f`. Then write `@vertex fn vs_main(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VsOut` that fills `clip_pos` with `vec4f(pos, 0.0, 1.0)`, copies `uv`, and returns the struct (use `var out: VsOut;`).",
        solution: `struct VsOut {
    @builtin(position) clip_pos: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs_main(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VsOut {
    var out: VsOut;
    out.clip_pos = vec4f(pos, 0.0, 1.0);
    out.uv = uv;
    return out;
}`,
      },
    },
    {
      id: "write-sample-sprite",
      title: "Write: sample a sprite",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Declare `@group(0) @binding(0) var t: texture_2d<f32>;` and `@group(0) @binding(1) var s: sampler;`. Then write `@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f` returning `textureSample(t, s, uv)`.",
        solution: `@group(0) @binding(0) var t: texture_2d<f32>;
@group(0) @binding(1) var s: sampler;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return textureSample(t, s, uv);
}`,
      },
    },
    {
      id: "write-glow-mask",
      title: "Write: glow mask",
      content: {
        type: "code",
        language: "wgsl",
        prompt:
          "Write a WGSL function `fn glow(dist: f32, hot: vec3f, cool: vec3f) -> vec3f`: compute `let mask = 1.0 - smoothstep(0.0, 0.3, dist);` then return `mix(cool, hot, mask)`.",
        solution: `fn glow(dist: f32, hot: vec3f, cool: vec3f) -> vec3f {
    let mask = 1.0 - smoothstep(0.0, 0.3, dist);
    return mix(cool, hot, mask);
}`,
      },
    },
  ],
  edges: [
    { from: "module-anatomy", to: "types-and-vectors" },
    { from: "module-anatomy", to: "entry-point-attribute" },
    { from: "module-anatomy", to: "write-solid-color" },
    { from: "module-anatomy", to: "inter-stage-io" },
    { from: "types-and-vectors", to: "vec-shorthand" },
    { from: "types-and-vectors", to: "swizzle-order" },
    { from: "types-and-vectors", to: "write-swap-rb" },
    { from: "types-and-vectors", to: "var-let-const" },
    { from: "types-and-vectors", to: "strict-numerics" },
    { from: "types-and-vectors", to: "inter-stage-io" },
    { from: "var-let-const", to: "let-vs-var" },
    { from: "var-let-const", to: "uniform-address-space" },
    { from: "var-let-const", to: "functions-and-flow" },
    { from: "var-let-const", to: "bindings-and-uniforms" },
    { from: "strict-numerics", to: "no-implicit-conversion" },
    { from: "strict-numerics", to: "write-cell-shade" },
    { from: "strict-numerics", to: "write-wave-sum" },
    { from: "functions-and-flow", to: "write-wave-sum" },
    { from: "functions-and-flow", to: "builtin-toolbox" },
    { from: "inter-stage-io", to: "fragment-position" },
    { from: "inter-stage-io", to: "write-vertex-out" },
    { from: "inter-stage-io", to: "texture-sampling" },
    { from: "inter-stage-io", to: "glsl-phrasebook" },
    { from: "bindings-and-uniforms", to: "write-uniform-params" },
    { from: "bindings-and-uniforms", to: "texture-sampling" },
    { from: "texture-sampling", to: "texture-sample-call" },
    { from: "texture-sampling", to: "write-sample-sprite" },
    { from: "builtin-toolbox", to: "write-glow-mask" },
    { from: "builtin-toolbox", to: "glsl-phrasebook" },
  ],
};
