import type { Curriculum } from "@mind-palace/curriculum";

import { learnWgpuSource } from "./_sources";

// How the GPU Draws — the raster-pipeline mental model, mapped to learn-wgpu's
// beginner chapters (surface, pipeline, buffers, textures, uniforms, depth,
// instancing). Read+MCQ only by design: the learner builds the vocabulary here
// and writes actual shader/engine code in the wgsl and bevy curricula.
export const gfxGpu: Curriculum = {
  id: "c-gfx-gpu",
  title: "How the GPU Draws",
  source: learnWgpuSource,
  nodes: [
    {
      id: "cpu-vs-gpu",
      title: "Why VFX Wants a GPU",
      content: {
        type: "read",
        markdown:
          "A CPU is a few very fast cores built for ==sequential== work — branching logic, one thing after another. A GPU is thousands of small cores built for ==parallel== work: the *same program* run on *huge amounts of data* at once.\n\n## The 10,000-particle test\nPicture an FF6-style Fire 3: ten thousand embers, every frame, each needing a position update and a colored pixel. On the CPU that is a 10,000-iteration loop racing a 16 ms frame budget. On the GPU it is one instruction stream applied to 10,000 data items in parallel — exactly the shape of the hardware.\n\n## You never write the loop\nThis is the core mental shift of shader programming:\n\n- A **vertex shader** is written for ==one vertex== — the GPU runs it for every vertex.\n- A **fragment shader** is written for ==one pixel-sized fragment== — the GPU runs it for every covered pixel.\n\nThe \"for each\" is implicit, massive, and parallel. Your code sees a single item and its inputs; it cannot see its neighbors.\n\n## Where wgpu fits\n`wgpu` is the Rust library that speaks to the GPU across Vulkan, Metal, DX12, and the browser's WebGPU. Bevy renders through it, and everything in this curriculum — pipelines, buffers, passes — is wgpu's own vocabulary.",
      },
    },
    {
      id: "raster-pipeline",
      title: "The Raster Pipeline",
      content: {
        type: "read",
        markdown:
          "Every triangle you ever draw takes the same assembly-line ride through the GPU. Learn the stations once, in order, and every effect becomes explainable.\n\n## The five stations\n- **Vertex shader** (*programmable*) — runs ==once per vertex==; its one required job is outputting the vertex's ==clip-space position==, plus anything you want interpolated (like UVs).\n- **Primitive assembly** (*fixed*) — groups the transformed vertices into triangles.\n- **Rasterizer** (*fixed*) — decides ==which pixels each triangle covers== and emits a *fragment* for each, with the vertex outputs smoothly interpolated across the surface.\n- **Fragment shader** (*programmable*) — runs ==once per fragment==; its job is to output a color.\n- **Blend & output** (*configurable*) — depth-tests the fragment, then combines its color with what is already in the framebuffer.\n\n## Per-vertex vs per-fragment\nA fullscreen triangle at 1920×1080 runs the vertex shader **3 times** and the fragment shader about ==2 million times==. The rule that follows: do work at the cheapest stage that can do it — compute in the vertex shader when the value can be interpolated, and save the fragment shader for what truly varies per pixel.\n\nOnly two stations run your code. Everything else is fixed hardware you *configure* — and that configuration (blend mode, depth state) is where a lot of VFX character lives.",
      },
    },
    {
      id: "vertex-index-buffers",
      title: "Vertex & Index Buffers",
      content: {
        type: "read",
        markdown:
          "Shaders run on the GPU, so the data they consume must live in ==GPU memory==. A **buffer** is a raw block of it that you fill from Rust and describe to the pipeline.\n\n## The vertex buffer\nA vertex buffer is a tightly packed array of per-vertex ==attributes== — commonly a position, a UV coordinate, maybe a color. The bytes mean nothing on their own, so a **vertex layout** tells the pipeline how to slice them: the ==stride== (bytes per vertex), plus each attribute's offset and format. The vertex shader then receives one vertex's attributes per invocation.\n\n## The index buffer\nMeshes share vertices — in a quad built from two triangles, two corners belong to both. Duplicating them wastes memory and vertex-shader runs. An **index buffer** stores small integers pointing into the vertex buffer, so the quad needs just ==4 vertices plus 6 indices== instead of 6 full vertices.\n\n## Why VFX cares\nThe humble textured quad — 4 vertices, 6 indices — is the most-drawn shape in effects work: every sprite, every particle, every flipbook frame is this same mesh wearing different clothes. One hardware detail worth knowing: by default wgpu treats ==counter-clockwise== winding as a triangle's front face, and back faces can be culled for free.",
      },
    },
    {
      id: "textures-samplers-uv",
      title: "Textures, Samplers & UV",
      content: {
        type: "read",
        markdown:
          "A **texture** is a grid of ==texels== (texture elements) living in GPU memory — your sprite art, noise patterns, gradient ramps. Fragments look colors up from it.\n\n## UV coordinates\nTextures are addressed in **UV space**: `u` and `v` each run ==0.0 to 1.0== regardless of the texture's pixel size, so the same shader works on a 16×16 sprite and a 4K noise map. In wgpu, UV `(0, 0)` is the ==top-left== corner and `v` grows *downward* — opposite of OpenGL, and the classic upside-down-texture bug when porting.\n\n## The sampler\nA UV rarely lands dead-center on a texel, so a separate **sampler** object answers two questions:\n\n- **Filtering** — between texels, ==nearest== snaps to the closest texel (crisp and blocky — *the* choice for FF6-style pixel art), while ==linear== blends the four closest (smooth — right for noise, gradients, and glow masks).\n- **Address mode** — outside 0..1, ==clamp-to-edge== stretches the border pixels, ==repeat== tiles the texture endlessly (what makes scrolling-UV fire and energy beams possible), and mirror-repeat tiles with a flip.\n\n## One texture, many looks\nBecause texture and sampler are separate objects, the same texels can be sampled crisp in one draw and smooth in another — the artwork and the *reading* of the artwork are independent decisions.",
      },
    },
    {
      id: "uniforms-bind-groups",
      title: "Uniforms & Bind Groups",
      content: {
        type: "read",
        markdown:
          "Vertex attributes vary per vertex. But much of what shaders need is ==the same for the whole draw==: the current time, the screen resolution, a transform matrix, an effect's tint. That data travels in a **uniform buffer** — think of uniforms as ==the shader's function arguments==, set once per draw and read by every invocation.\n\n## Bind groups\nUniform buffers, textures, and samplers don't get bound one by one. wgpu bundles them into a **bind group** — a numbered set of resources handed to the pipeline together. In shader code each resource declares its address: `@group(1) @binding(0)` means \"group 1, slot 0\", and the layout declared on the Rust side must match exactly.\n\n## Group by update frequency\nThe reason bind groups exist is swap granularity — rebinding one group is cheap:\n\n- **Group 0** — per-frame data: camera, time.\n- **Group 1** — per-material data: textures, tint.\n- **Group 2** — per-object data, if needed.\n\nDraw fifty effects through the same camera: bind group 0 once, swap group 1 per effect.\n\n## The road ahead\nEvery animated shader you'll write is powered by this: a `time` value in a uniform buffer, updated each frame by the CPU, read by thousands of fragment invocations. Bevy's material system later automates this exact plumbing — but this is what it's doing underneath.",
      },
    },
    {
      id: "coordinate-journey",
      title: "The Coordinate Journey",
      content: {
        type: "read",
        markdown:
          "\"Which space am I in?\" is the graphics programmer's first debugging question. A vertex passes through a fixed sequence of coordinate spaces on its way to the screen — in this order:\n\n## The pipeline of spaces\n- **Model space** — coordinates relative to the mesh's own origin.\n- **World space** — after the model transform places, rotates, and scales it into the scene.\n- **View space** — the world as seen from the camera, which now sits at the origin.\n- **Clip space** — after the projection transform; this is ==what the vertex shader must output==.\n- **NDC** — normalized device coordinates, after the hardware divides by `w`.\n- **Screen space** — the viewport transform maps NDC onto actual pixels.\n\nThe first four hops are your code (one matrix multiply each, usually pre-combined into one); the last two are fixed hardware.\n\n## wgpu's NDC, exactly\nIn wgpu, NDC `x` and `y` run ==−1 to +1 with +y pointing up==, and `z` runs ==0 to 1== (OpenGL's −1..1 z range does *not* apply). Draw something and see a blank screen? Odds are your positions never landed inside that box.\n\n## Two more spaces to keep separate\n**UV space** (0..1, for texture lookups) and **framebuffer space** (pixels, origin top-left, y pointing *down* — what the fragment shader sees as its own position). Neither is NDC. Mixing these three up is the canonical beginner bug.",
      },
    },
    {
      id: "depth-buffer",
      title: "The Depth Buffer",
      content: {
        type: "read",
        markdown:
          "When a fireball passes behind a pillar, something must decide — per pixel — which surface wins. That referee is the **depth buffer**: a screen-sized texture storing, for every pixel, the ==depth of the nearest surface drawn so far== (z, from 0.0 near to 1.0 far).\n\n## The depth test\nAs each fragment arrives, the hardware compares its z against the stored value:\n\n- **Closer** — the fragment passes, its color lands, and ==its z is written== as the new record.\n- **Farther** — the fragment is ==discarded==; its shaded color is thrown away.\n\nThe payoff: opaque geometry renders correctly in ==any draw order==, no sorting required. The buffer is cleared to the far value (1.0) at the start of each frame.\n\n## Test vs write — the VFX split\nDepth *testing* and depth *writing* are separate switches, and transparent effects exploit that:\n\n- Depth **test on** — a spark behind the pillar still hides correctly.\n- Depth **write off** — the spark doesn't record its own z, so blended particles drawn after it aren't wrongly rejected by an invisible \"wall\" of earlier particles.\n\nTest-on, write-off is the standard configuration for ==every blended particle and glow== you will ship. It is also why transparency, unlike opaque geometry, ends up caring about draw order — the next card picks that up.",
      },
    },
    {
      id: "blending-state",
      title: "Blending Is Pipeline State",
      content: {
        type: "read",
        markdown:
          'After the depth test, one question remains: how does the new fragment\'s color (==src==) combine with the color already in the framebuffer (==dst==)? That is **blending** — and it is ==pipeline state==, configured in Rust when the render pipeline is created, not something a shader decides per pixel. One pipeline, one blend mode: an additive pass and an alpha pass are two different pipeline objects.\n\n## The two modes that matter for VFX\n- **Alpha blending** — `src * alpha + dst * (1 - alpha)`: the classic "paint over" mix. It can darken, it occludes, and it is right for ==smoke, dust, and anything that blocks light==. The cost: the result depends on draw order, so alpha-blended particles must be sorted ==back-to-front==.\n- **Additive blending** — `src + dst`: light on light. It can only brighten, overlaps blow out toward white (that hot-core look), and it is right for ==fire, sparks, magic, glow==.\n\n## The order-independence superpower\nAddition is commutative, so additive particles need ==no sorting at all== — any draw order produces identical pixels. This is why effect systems love additive: ten thousand unsorted sparks, zero artifacts.\n\nThe SNES made the same choice in hardware: its color math "add" mode drew lightning flashes and glows, "average" made ghosts and fog. Additive-vs-alpha *is* that decision, now one blend state away.',
      },
    },
    {
      id: "draw-calls-instancing",
      title: "Draw Calls & Instancing",
      content: {
        type: "read",
        markdown:
          "A **draw call** is the CPU's order to the GPU: \"with this pipeline and these bind groups, draw this range of vertices.\" Each one carries fixed CPU-side overhead — validation, state binding, command encoding.\n\n## The naive particle system\nIssue one draw call per particle and a 10,000-spark burst costs ==10,000 draw calls==. The GPU finishes each tiny quad instantly and idles; the frame dies on the ==CPU side==, inside the command-recording loop. Counting draw calls is the first profiling instinct to build.\n\n## Batching and instancing\n- **Batching** — merge many meshes into one big vertex buffer and draw them together. Fewer calls, but the merged data must be rebuilt when things move independently.\n- **Instancing** — the sharper tool when the shape repeats: upload the quad ==once==, plus a compact per-instance buffer (position, scale, color, flipbook frame), and request many copies in a single call — an instance range like `0..10000` in wgpu's `draw_indexed`.\n\nThe vertex shader runs per vertex ==per instance==, reading `@builtin(instance_index)` or per-instance attributes to place each copy differently.\n\n## Why particle systems instance\nEvery particle is the same 4-vertex quad wearing a different transform — the textbook instancing shape: ==one draw call, one mesh, ten thousand sparks==. When you later meet a GPU particle crate, this is the machinery underneath it.",
      },
    },
    {
      id: "render-passes",
      title: "Render Passes & Present",
      content: {
        type: "read",
        markdown:
          'Zoom out to the whole frame. Drawing never happens loose — every draw call is recorded inside a **render pass**, aimed at one or more ==attachments== (the textures being rendered into).\n\n## Anatomy of a pass\nA render pass declares:\n\n- A **color attachment** — where fragment colors land.\n- An optional **depth attachment** — backing the depth test.\n- A ==LoadOp== per attachment — `Clear` wipes it to a chosen value (your background color) before drawing; `Load` keeps the existing contents so you can layer more on top.\n- A ==StoreOp== — whether the results are kept when the pass ends.\n\n## The life of a frame\n- ==Acquire== the surface texture — the image the window will show next.\n- Record passes and their draw calls into a command encoder.\n- ==Submit== the finished commands to the GPU queue.\n- ==Present== the surface texture — it appears on screen.\n\nNothing renders while you record; the GPU starts working at submit.\n\n## Passes are the post-processing hinge\nA pass can target ==any texture==, not just the screen. Render the scene into an offscreen texture in pass one; in pass two, sample that texture like any other image, run a fullscreen effect over it, and write the result to the surface. Bloom, distortion waves, mosaic wipes — the whole post-processing world is "more than one render pass." That is exactly where the Bevy VFX curriculum takes this.',
      },
    },
    {
      id: "gpu-parallelism",
      title: "Why the GPU wins at particles",
      content: {
        type: "multiple-choice",
        question:
          "A frame must update and draw 10,000 particles. Why does the GPU handle this so much better than the CPU?",
        options: [
          "GPU cores are clocked much faster than CPU cores",
          "Thousands of GPU cores run the same program on different data at the same time",
          "The GPU has more memory available than the CPU",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "rasterizer-role",
      title: "The rasterizer's job",
      content: {
        type: "multiple-choice",
        question: "Which pipeline stage determines which screen pixels a triangle covers?",
        options: ["The vertex shader", "Primitive assembly", "The rasterizer"],
        answerIndex: 2,
      },
    },
    {
      id: "shader-invocations",
      title: "Per-vertex vs per-fragment",
      content: {
        type: "multiple-choice",
        question:
          "A single triangle covers the entire 1920×1080 screen. Roughly how many times does each programmable shader run?",
        options: [
          "Vertex shader: 3 times; fragment shader: about 2 million times",
          "Vertex shader: about 2 million times; fragment shader: 3 times",
          "Both run once per covered pixel",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "quad-vertex-count",
      title: "Indexed quad",
      content: {
        type: "multiple-choice",
        question:
          "You draw a textured quad as two triangles using an index buffer. How many vertices does the vertex buffer need to hold?",
        options: ["6 — one per triangle corner", "4 — the indices reuse the shared corners", "3"],
        answerIndex: 1,
      },
    },
    {
      id: "pixel-art-filtering",
      title: "Keeping pixel art crisp",
      content: {
        type: "multiple-choice",
        question:
          "Your FF6-style sprites blur into mush when scaled up. Which sampler setting fixes it?",
        options: [
          "Nearest filtering — every lookup snaps to the closest texel",
          "Linear filtering — every lookup blends the four closest texels",
          "Repeat address mode — the texture tiles past the 0..1 edge",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "uniform-scope",
      title: "What a uniform is",
      content: {
        type: "multiple-choice",
        question: "During one draw call, what is true of a value stored in a uniform buffer?",
        options: [
          "It varies per vertex, like a vertex attribute",
          "It varies per fragment, like an interpolated output",
          "It is the same for every vertex and fragment invocation in the draw",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "wgpu-ndc",
      title: "wgpu's NDC box",
      content: {
        type: "multiple-choice",
        question: "In wgpu's normalized device coordinates, which statement is correct?",
        options: [
          "+y points down and z spans -1 to 1",
          "+y points up and z spans 0 to 1",
          "+y points up and z spans -1 to 1, as in OpenGL",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "depth-write-particles",
      title: "Depth test vs depth write",
      content: {
        type: "multiple-choice",
        question:
          "Why do alpha-blended particles usually keep the depth *test* on but turn depth *writes* off?",
        options: [
          "Each particle still hides behind solid geometry, but doesn't block particles drawn after it",
          "It makes the GPU skip running their fragment shader",
          "Transparent fragments have no z value to write",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "additive-order-freedom",
      title: "Additive needs no sorting",
      content: {
        type: "multiple-choice",
        question: "Why can additive-blended sparks be drawn in any order without artifacts?",
        options: [
          "The depth buffer sorts them automatically",
          "Additive blending is cheaper for the GPU to compute",
          "Addition is commutative — src + dst lands on the same color in any draw order",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "instanced-draw-count",
      title: "Draw calls for a burst",
      content: {
        type: "multiple-choice",
        question:
          "With instancing, how many draw calls does a 10,000-spark burst need if every spark is the same quad mesh?",
        options: ["10,000 — one per spark", "1 — one mesh, an instance range of 10,000", "2,500"],
        answerIndex: 1,
      },
    },
    {
      id: "loadop-clear",
      title: "LoadOp::Clear",
      content: {
        type: "multiple-choice",
        question:
          "At the start of a render pass, what does setting the color attachment's `LoadOp::Clear` do?",
        options: [
          "Wipes the attachment to a chosen color before any drawing happens",
          "Deletes the texture from GPU memory",
          "Skips the pass entirely when nothing has changed",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    // Read spine: parallelism → pipeline → data (buffers/textures/uniforms).
    { from: "cpu-vs-gpu", to: "raster-pipeline" },
    { from: "raster-pipeline", to: "vertex-index-buffers" },
    { from: "vertex-index-buffers", to: "textures-samplers-uv" },
    { from: "textures-samplers-uv", to: "uniforms-bind-groups" },
    // The coordinate journey needs the pipeline stages AND vertex data.
    { from: "raster-pipeline", to: "coordinate-journey" },
    { from: "vertex-index-buffers", to: "coordinate-journey" },
    // Depth follows from NDC z; blending is the final stage and follows depth.
    { from: "coordinate-journey", to: "depth-buffer" },
    { from: "depth-buffer", to: "blending-state" },
    { from: "raster-pipeline", to: "blending-state" },
    // Instancing extends vertex buffers and rides the bind-group machinery.
    { from: "vertex-index-buffers", to: "draw-calls-instancing" },
    { from: "uniforms-bind-groups", to: "draw-calls-instancing" },
    // Render passes assemble everything: attachments, draws, present.
    { from: "depth-buffer", to: "render-passes" },
    { from: "blending-state", to: "render-passes" },
    { from: "draw-calls-instancing", to: "render-passes" },
    // Drills hang off their hubs.
    { from: "cpu-vs-gpu", to: "gpu-parallelism" },
    { from: "raster-pipeline", to: "rasterizer-role" },
    { from: "raster-pipeline", to: "shader-invocations" },
    { from: "vertex-index-buffers", to: "quad-vertex-count" },
    { from: "textures-samplers-uv", to: "pixel-art-filtering" },
    { from: "uniforms-bind-groups", to: "uniform-scope" },
    { from: "coordinate-journey", to: "wgpu-ndc" },
    // Bridge drill: needs both the depth split and the blending trade-off.
    { from: "depth-buffer", to: "depth-write-particles" },
    { from: "blending-state", to: "depth-write-particles" },
    { from: "blending-state", to: "additive-order-freedom" },
    { from: "draw-calls-instancing", to: "instanced-draw-count" },
    { from: "render-passes", to: "loadop-clear" },
  ],
};
