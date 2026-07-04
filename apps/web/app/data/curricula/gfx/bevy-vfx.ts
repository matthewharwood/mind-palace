import type { Curriculum } from "@mind-palace/curriculum";

import { bevySource } from "./_sources";

// Bevy VFX: Materials, Particles, Post — the custom-shader spine of the FF6
// effect gallery. Bevy 0.19 API throughout (Material2d in bevy::sprite_render,
// ShaderRef in bevy::shader, Bloom in bevy::post_process, render graph replaced
// by ECS schedules). Every rust snippet is cargo-checked against bevy 0.19 by
// scripts/verify-rust-cards.ts.
export const gfxBevyVfx: Curriculum = {
  id: "c-gfx-bevy-vfx",
  title: "Bevy VFX: Materials, Particles, Post",
  source: bevySource,
  nodes: [
    {
      id: "material2d-workflow",
      title: "The Material2d Workflow",
      content: {
        type: "read",
        markdown:
          "A `Sprite` is Bevy's fast path — batched quads, one built-in shader, zero customization. The moment an effect needs its **own** fragment shader (dissolve, glow, SDF shapes, distortion), you move to the custom path: ==Mesh2d + Material2d==.\n\n## The four-step ritual\n- **Define the data.** A struct deriving `Asset, TypePath, AsBindGroup, Debug, Clone` — its fields are what your shader receives.\n- **Implement Material2d.** Override `fragment_shader()` to return a `ShaderRef` such as `\"shaders/glow.wgsl\".into()`. Every method has a sensible default; `ShaderRef::Default` keeps the built-in mesh shader for that stage.\n- **Register the plugin.** `Material2dPlugin::<GlowMaterial>::default()` goes in `add_plugins` — it wires extraction, pipelines, and bind groups for that one type.\n- **Spawn the pair.** An entity with `Mesh2d(mesh)` plus `MeshMaterial2d(material)` — any 2D primitive mesh like `Rectangle` or `Circle` works.\n\n## Where things live in 0.19\nModule paths moved: `Material2d` is imported from ==bevy::sprite_render==, not `bevy::sprite`, and `ShaderRef` from `bevy::shader`. Materials were extracted into their own crate in 0.19, but these re-exports are the stable user surface.\n\n## Transparency is a method\n`alpha_mode()` returns an ==AlphaMode2d== — `Opaque`, `Mask(cutoff)`, or `Blend`. The engine's canonical example, `shader_material_2d.rs`, ships `AlphaMode2d::Mask(0.5)`: pixels under 50% alpha are clipped, giving hard cutout edges.",
      },
    },
    {
      id: "asbindgroup-anatomy",
      title: "AsBindGroup: Rust Data → GPU",
      content: {
        type: "read",
        markdown:
          "`#[derive(AsBindGroup)]` is the bridge between a Rust struct and a WGSL **bind group**: every attributed field becomes one GPU binding, and Bevy generates all the layout and upload code.\n\n## The field attributes\n- `#[uniform(N)]` — write the field into a **uniform buffer** at binding `N`; the field's type must implement `ShaderType`.\n- `#[texture(N)]` — expose a `Handle<Image>` as a texture binding; optional args pick the dimension (`2d`, `cube`, ...) and sample type.\n- `#[sampler(N)]` — the sampler paired with a texture (filtering, non-filtering, or comparison).\n- `#[storage(N)]` — a storage buffer. ==Storage buffers do not exist on WebGL2==, so browser-floor effects stick to uniforms and textures.\n\n## Same index, one buffer\nSeveral fields may share one uniform index: `#[uniform(0)] color` plus `#[uniform(0)] intensity` are ==packed into a single generated uniform struct== in a single buffer at binding 0. Fewer buffers, and one WGSL struct declares both fields.\n\n## Struct-level tools\n- `#[uniform(N, ConvertedType)]` — convert the whole material into one prepared uniform type (the `StandardMaterial` pattern).\n- `#[bind_group_data(T)]` — carry non-GPU data into `specialize()` to tweak the render pipeline per key.\n- `#[bindless]` — move textures into binding arrays for 0.19's partial bindless renderer.\n\nYour WGSL must declare a matching `@binding(N)` for every index — that contract is checked at pipeline creation, not at compile time.",
      },
    },
    {
      id: "shadertype-uniforms",
      title: "ShaderType & WebGL2 Padding",
      content: {
        type: "read",
        markdown:
          "A uniform field crosses a real boundary: Rust memory on one side, a GPU buffer with strict layout rules on the other. ==ShaderType== — re-exported from the `encase` crate — is the trait guaranteeing your struct's memory layout matches what WGSL will read.\n\n## Deriving it\n`#[derive(ShaderType)]` works on structs of `f32`, `u32`, vectors, matrices, and nested `ShaderType`s. Layout helpers exist when you need them: `min_size()`, `assert_uniform_compat()`, and per-field `align`/`size` attributes for manual control.\n\n## The 16-byte rule\nWebGL2 requires uniform structs to be ==16-byte aligned and sized==. A settings struct with a single `f32` is 4 bytes — fine on native and WebGPU, rejected on WebGL2. Bevy's own post-processing example carries the fix: a conditional field `#[cfg(feature = \"webgl2\")] _webgl2_padding: Vec3`. The `Vec3` adds 12 bytes (4 + 12 = 16), and the `cfg` means the field only exists in builds where the `webgl2` feature is on.\n\n## Why VFX cares\nEvery animated effect parameter — dissolve threshold, shockwave strength, flash intensity — rides in one of these structs. Add the padding when you *write* the struct; discovering the rule from a black canvas on the deployed WebGL2 build is the expensive way.",
      },
    },
    {
      id: "bevy-wgsl-conventions",
      title: "Bevy's WGSL Conventions",
      content: {
        type: "read",
        markdown:
          "Bevy never hands your `.wgsl` file to the GPU untouched — a **preprocessor** runs first, and material shaders lean on two of its conventions.\n\n## Imports\nA line like `#import bevy_sprite::mesh2d_view_bindings::globals` pulls engine-provided bindings into your module — view data, the `globals` uniform, mesh functions. This is Bevy-preprocessor syntax, ==not part of the WGSL language==: a plain-WGSL validator like naga rejects it raw, which is why standalone WGSL practice files never use it.\n\n## The material group placeholder\nYour material's bindings are declared through a **shader-def placeholder**: `@group(#{MATERIAL_BIND_GROUP}) @binding(0) var<uniform> material: GlowMaterial;`. Bevy substitutes the real group index when it builds the pipeline. ==Never hardcode the number==: the actual index depends on which pipeline compiles your shader — in 0.19 a `Material2d` resolves to ==group 2== while the 3D mesh pipeline puts materials at ==group 3== — and the numbers have shuffled between releases before. The placeholder is exactly what insulates your shader from all of that.\n\n## Bindings mirror AsBindGroup\nThe `@binding(N)` numbers must match the derive attributes on the Rust side: `#[uniform(0)]` ↔ `@binding(0)`, `#[texture(1)]` ↔ `@binding(1)`, `#[sampler(2)]` ↔ `@binding(2)`. Two fields packed at `#[uniform(0)]` arrive as one struct at `@binding(0)` with both fields declared inside it.",
      },
    },
    {
      id: "time-driven-shaders",
      title: "Time-Driven Shaders",
      content: {
        type: "read",
        markdown:
          "Almost every effect shader animates, and animation needs a clock. Bevy gives a material two roads to the time value.\n\n## Road one: drive a uniform from a system\nA plain `Update` system takes `Res<Time>` and `ResMut<Assets<PulseMaterial>>`, walks `materials.iter_mut()`, and writes values derived from `time.elapsed_secs()` into a uniform field. Asset ==change detection re-uploads the buffer== automatically. This road wins whenever gameplay shapes the value: an intensity that spikes on hit, a dissolve threshold driven by an effect's phase timer, a flash that obeys a reduced-motion setting.\n\n## Road two: the built-in globals\nBevy's view bindings already ship a `globals` uniform whose `time` field ticks every frame — imported in 2D via `#import bevy_sprite::mesh2d_view_bindings::globals`, then read as `globals.time`. The engine's `animate_shader` example animates entirely on this road: ==no per-frame system at all==, and the material struct can even be empty.\n\n## Choosing\nUse `globals.time` for ambient, always-on motion — scrolling noise, idle shimmer. Use a driven uniform when the CPU decides the *shape* of the animation. Real effects routinely combine both: `globals.time` scrolls the noise while a driven `progress` uniform sweeps the dissolve from 0 to 1.",
      },
    },
    {
      id: "hdr-bloom-tonemapping",
      title: "HDR, Bloom & Tonemapping",
      content: {
        type: "read",
        markdown:
          "Glow is not painted — it is **earned** by writing colors brighter than 1.0 and letting the pipeline spread them. Three camera components make it happen.\n\n## Bloom\n`Bloom` lives in ==bevy::post_process== and is declared `#[require(Hdr)]`: inserting it on a camera ==auto-inserts the Hdr marker component== (the required-components pattern — the old `Camera { hdr: true }` field is gone). Defaults: `intensity` 0.15 and the `EnergyConserving` composite mode, with presets like `Bloom::NATURAL`, `Bloom::OLD_SCHOOL`, and `Bloom::ANAMORPHIC`. Since 0.19, bloom's luma math runs in linear space — subtly more correct output than 0.18.\n\n## Feed it HDR emissive\nBloom only spreads pixels that are already bright: a material writing `LinearRgba::rgb(4.0, 1.2, 0.2)` blooms; the same hue at 0.4 does not. The engine's `bloom_2d` example pushes channel values near 9.4. Brightness is your power dial — FF-style effects read \"stronger\" mostly by getting *brighter*.\n\n## Tonemapping + dithering\nHDR values must come back down to a displayable range: `Tonemapping::TonyMcMapface` is the 0.19 default, and `DebandDither::Enabled` fights gradient banding. Several tonemappers (TonyMcMapface, AgX, BlenderFilmic) are ==LUT-based==: they need the `tonemapping_luts` cargo feature. Strip that feature while one is active and every frame renders **solid pink** — the classic missing-LUT failure.\n\nThe full 2D recipe: `Camera2d` + `Tonemapping::TonyMcMapface` + `Bloom::default()` + `DebandDither::Enabled` — and in 0.19 it runs on WebGL2.",
      },
    },
    {
      id: "post-processing-schedules",
      title: "Post-Processing Without a Graph",
      content: {
        type: "read",
        markdown:
          "Before 0.19, a custom post-effect meant implementing `ViewNode`, registering `RenderLabel`s, and wiring graph edges. ==That machinery is gone==. Render passes are now ordinary ECS systems running on the render world.\n\n## Schedules and sets\nEach view runs a schedule — ==Core2d== for 2D cameras, ==Core3d== for 3D — whose stages are plain system sets executed in order: `Prepass`, `MainPass`, `EarlyPostProcess`, `PostProcess`. A custom pass is `render_app.add_systems(Core2d, my_pass.in_set(Core2dSystems::PostProcess))`, ordered against neighbors with regular `.before()` / `.after()`.\n\n## What a pass system looks like\nIt takes a `ViewQuery` parameter to read the current camera's components (the schedule runs once per view) and a `RenderContext` system param to encode GPU work. The screen arrives through `view_target.post_process_write()`, which hands you a `source` texture view to sample and a `destination` to render into — ==ping-pong flipping between the two is handled for you==. For the vertex stage, the `FullscreenShader` resource supplies a ready-made fullscreen triangle; you write only the fragment shader.\n\n## Getting settings in\nA settings struct on the camera — deriving `Component`, `ExtractComponent`, and `ShaderType` — plus `ExtractComponentPlugin` and `UniformComponentPlugin` gives the pass a per-view uniform buffer fed from the main world. Mutate the component in a normal system; the pass sees the new value next frame.",
      },
    },
    {
      id: "fullscreen-material",
      title: "FullscreenMaterial: The Easy Path",
      content: {
        type: "read",
        markdown:
          "Most post-effects are one fragment shader over the whole screen. 0.19 added a trait that collapses all the pass plumbing for exactly that case: ==FullscreenMaterial==.\n\n## The shape\nYour settings struct derives `Component, ExtractComponent, Clone, Copy, ShaderType, Default` and implements `FullscreenMaterial` with one required method — `fragment_shader()` returning a `ShaderRef`. The screen texture and sampler bindings are ==provided by the trait's plumbing==; your uniform fields ride alongside them.\n\n## Attach it to the camera\nNo quad, no mesh, no pipeline code: ==spawn the component directly on the camera entity==. The effect applies to that camera's output.\n\n## Scheduling\nTwo provided methods place the pass: `schedule()` defaults to `Core3d`, and `schedule_configs()` defaults to `.in_set(Core3dSystems::PostProcess).before(tonemapping)`. Override them to run in `Core2d` for a 2D camera or to reorder around other passes — `schedule_configs()` is the 0.19 replacement for 0.18's `run_in()`/`run_after()` hooks.\n\n## When to drop down\nFullscreenMaterial covers the FF6-flavored staples — screen flashes, wave distortion, mosaic, vignette pulses. Reach for the full custom-pass pattern only when you need multiple passes, intermediate render targets, or compute.",
      },
    },
    {
      id: "particles-landscape",
      title: "Choosing a Particle System",
      content: {
        type: "read",
        markdown:
          "Bevy ships no built-in particle system; the ecosystem offers two mature crates and one honest DIY route.\n\n## bevy_hanabi — the GPU flagship\nFully **GPU-driven**: compute shaders initialize and update particles with minimal CPU intervention, effects are authored as expression graphs, and counts scale far beyond what any CPU loop can simulate — it is the ==maximum scale== pick. The catch for browser targets: compute shaders mean ==WebGPU only on wasm — WebGL2 is explicitly unsupported== and you must build with `bevy/webgpu`.\n\n## bevy_enoki — the WebGL2-safe 2D pick\n**CPU-simulated with SIMD, GPU-instanced rendering, no compute shaders** — it runs everywhere WebGL2 runs, including mobile. Spawner configs live in hot-reloadable `.ron` files, and a `Particle2dMaterial`-style trait accepts your own WGSL fragment shader on particles, so the Material2d skills transfer directly.\n\n## Roll your own — the learning route\nA sprite pool is a real particle system: spawn `Sprite` entities with a velocity component and a lifetime `Timer`, integrate positions in `Update`, despawn on expiry. It will never rival the crates for raw count — but FF6-scale bursts are modest, and you will understand every knob the crates expose.\n\n## Rule of thumb\n==hanabi = maximum scale, WebGPU-only audience; enoki = 2D, runs everywhere; DIY = learning and small counts==. For an effect gallery with a WebGL2 floor: enoki or DIY.",
      },
    },
    {
      id: "flipbook-animation",
      title: "Sprite-Sheet Flipbooks",
      content: {
        type: "read",
        markdown:
          "FF6 animated spells as scripted sequences of pre-drawn frames. The modern descendant is the ==flipbook==: a sprite sheet plus a timer that advances which cell is visible.\n\n## The three pieces\n- **A layout.** `TextureAtlasLayout::from_grid` describes the sheet — cell size, columns, rows — and goes into `Assets<TextureAtlasLayout>` for a handle.\n- **An indexed sprite.** A `Sprite` whose `texture_atlas` field is `Some(TextureAtlas { layout, index })` — `index` picks the visible cell.\n- **A clock.** A repeating `Timer` in a component; a system ticks it with `time.delta()` and advances `index` when `just_finished()` fires.\n\n## Wrap or die\nAdvance with `index = (index + 1) % frames`. A looping effect (fire idle, sparkle shimmer) wraps forever; a one-shot (explosion burst) instead despawns or hides the entity after the last frame plays.\n\n## Timing is the craft\nFrame rate is a *feel* parameter, not a technical one: `Timer::from_seconds(0.06, TimerMode::Repeating)` is roughly 16 fps — punchy and retro. Impacts often play their opening frames faster than their tails. And the sheet is still just a texture: route it through a `Material2d` when a flipbook needs HDR emissive, dissolve, or any other shader treatment on top.",
      },
    },
    {
      id: "screen-shake-hit-stop",
      title: "Screen Shake & Hit-Stop",
      content: {
        type: "read",
        markdown:
          "The render is only half of impact — the camera and the clock carry the rest.\n\n## Trauma shake\nThe standard model keeps a single ==trauma== value in `0.0..=1.0` on the camera: impacts *add* trauma (a light hit +0.3, a heavy one +1.0), a system decays it toward zero every frame using `time.delta_secs()`, and the applied shake is ==trauma squared== — big hits feel disproportionately bigger and the tail settles smoothly. Offset the camera's `Transform` by shake-scaled `sin`/`cos` of `time.elapsed_secs()` at two different frequencies so the motion never loops visibly; a touch of rotation sells it hardest.\n\n## Hit-stop\nFreezing the game for a beat at the moment of contact makes hits land. Bevy's virtual clock does it cleanly: `Time<Virtual>::set_relative_speed(0.05)` slows everything driven by the default `Time`. The community convention is ==3–5 frames== of stop for a normal melee hit; heavier hits hold longer.\n\n## The classic bug\nRestore the speed with a timer ticked by the ==real clock== — `Time<Real>`, not `Time<Virtual>`. The virtual clock you just slowed is crawling at 5%, so a virtually-ticked stop timer finishes roughly ==20× late== — and at speed `0.0` it never finishes at all. Real time keeps flowing regardless of `relative_speed`.\n\n## Accessibility\nBoth channels need a calm variant: a reduced-motion setting should zero the shake amplitude and skip the harshest hit-stop values — the same discipline as honoring `prefers-reduced-motion` on the web.",
      },
    },
    {
      id: "mcq-material2d-module",
      title: "Where Material2d lives",
      content: {
        type: "multiple-choice",
        question: "In Bevy 0.19, which import brings the `Material2d` trait into scope?",
        options: [
          "`use bevy::sprite::Material2d;` — next to the `Sprite` component",
          "`use bevy::sprite_render::Material2d;` — the 2D rendering module",
          "`use bevy::pbr::Material2d;` — shared with the 3D material",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "mcq-uniform-packing",
      title: "Sharing a uniform binding",
      content: {
        type: "multiple-choice",
        question: "Both fields use `#[uniform(0)]`. What does the derive generate?",
        language: "rust",
        code: `use bevy::prelude::*;
use bevy::render::render_resource::AsBindGroup;

#[derive(Asset, TypePath, AsBindGroup, Debug, Clone)]
pub struct EnergyMaterial {
    #[uniform(0)]
    pub color: LinearRgba,
    #[uniform(0)]
    pub intensity: f32,
}`,
        options: [
          "A compile error — binding indices must be unique per field",
          "Two uniform buffers that alias binding 0",
          "One uniform buffer at binding 0 whose WGSL struct contains both fields",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "mcq-webgl2-padding",
      title: "The WebGL2 padding rule",
      content: {
        type: "multiple-choice",
        question:
          'A `ShaderType` settings struct holds a single `f32`. Why does Bevy\'s post-processing example add `#[cfg(feature = "webgl2")] _webgl2_padding: Vec3`?',
        options: [
          "WebGL2 requires uniform structs to be 16-byte aligned and sized; an `f32` alone is only 4 bytes",
          "WebGL2 stores every uniform as a `Vec4`, so three floats must be zeroed by hand",
          "The padding carries the sprite's color in WebGL2 builds",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "mcq-material-bind-group",
      title: "The material group placeholder",
      content: {
        type: "multiple-choice",
        question:
          "In a Material2d WGSL shader, how do you declare the group for your material's bindings?",
        options: [
          "`@group(0)` — materials always bind first",
          "`@group(#{MATERIAL_BIND_GROUP})` — a placeholder Bevy's preprocessor fills in",
          "`@group(3)` — copy the literal index from a 3D example shader",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "mcq-bloom-requires-hdr",
      title: "Bloom requires Hdr",
      content: {
        type: "multiple-choice",
        question: "`Bloom` is declared with `#[require(Hdr)]`. What does that mean for this spawn?",
        language: "rust",
        code: `use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

pub fn setup(mut commands: Commands) {
    commands.spawn((Camera2d, Bloom::default()));
}`,
        options: [
          "The `Hdr` marker component is inserted on the camera automatically",
          "The spawn panics unless `Hdr` is added explicitly",
          "Bloom silently renders nothing until `Camera { hdr: true }` is set",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "mcq-pink-screen",
      title: "The pink screen",
      content: {
        type: "multiple-choice",
        question:
          "You trimmed cargo features for a smaller wasm build; now every frame renders solid pink. What is the classic cause?",
        options: [
          "The canvas selector didn't match any element",
          "Both `webgl2` and `webgpu` features were enabled at once",
          "`tonemapping_luts` was stripped while a LUT tonemapper like TonyMcMapface is active",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "mcq-post-pass-019",
      title: "Post passes after 0.19",
      content: {
        type: "multiple-choice",
        question:
          "The old render graph (`ViewNode`, `RenderLabel`) is gone. How does a custom post-process pass run in Bevy 0.19?",
        options: [
          "Through a `PostProcessPlugin` builder with callback closures",
          "As a plain ECS system added to a render-world schedule like `Core3d`, ordered via sets such as `Core3dSystems::PostProcess`",
          "By re-enabling the graph with a `legacy_render_graph` feature",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "mcq-post-process-write",
      title: "post_process_write()",
      content: {
        type: "multiple-choice",
        question: "Inside a custom pass, what does `view_target.post_process_write()` hand you?",
        options: [
          "A `source` view to sample and a `destination` view to render into, with ping-pong flipping handled internally",
          "A mutable reference to the window's swapchain image",
          "The final tonemapped frame, read-only",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "mcq-fullscreen-material",
      title: "Using FullscreenMaterial",
      content: {
        type: "multiple-choice",
        question:
          "You implemented `FullscreenMaterial` for a `WaveDistortion` settings struct. How does the effect reach the screen?",
        options: [
          "Register `Material2dPlugin::<WaveDistortion>` and spawn a fullscreen quad",
          "Add it to the render graph after the main pass",
          "Spawn the `WaveDistortion` component directly on the camera entity",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "mcq-particles-webgl2",
      title: "Particles on WebGL2",
      content: {
        type: "multiple-choice",
        question:
          "Your effect gallery must run on WebGL2 in every browser. Which particle crate fits without a WebGPU build?",
        options: [
          "`bevy_hanabi` — its GPU compute pipeline falls back to WebGL2",
          "`bevy_enoki` — CPU-SIMD simulation with GPU-instanced rendering, no compute shaders",
          "Neither — particles require compute shaders",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "mcq-hit-stop",
      title: "The hit-stop recipe",
      content: {
        type: "multiple-choice",
        question: "What is the standard Bevy recipe for hit-stop on a melee impact?",
        options: [
          "Call `app.pause()` and resume on the next input",
          "Set every animation `Timer` to paused for one frame",
          "Drop `Time<Virtual>`'s relative speed for ~3–5 frames, restoring it with a timer ticked by `Time<Real>`",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "code-material2d-struct",
      title: "Write: a glow material",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define a custom 2D material `GlowMaterial` with a `#[uniform(0)]` field `color: LinearRgba` and a `#[texture(1)]` + `#[sampler(2)]` field `mask: Option<Handle<Image>>`. Derive `Asset, TypePath, AsBindGroup, Debug, Clone` and implement `Material2d` so `fragment_shader()` returns `"shaders/glow.wgsl".into()`. Include the imports (`Material2d` from `bevy::sprite_render`, `ShaderRef` from `bevy::shader`).',
        solution: `use bevy::prelude::*;
use bevy::render::render_resource::AsBindGroup;
use bevy::shader::ShaderRef;
use bevy::sprite_render::Material2d;

#[derive(Asset, TypePath, AsBindGroup, Debug, Clone)]
pub struct GlowMaterial {
    #[uniform(0)]
    pub color: LinearRgba,
    #[texture(1)]
    #[sampler(2)]
    pub mask: Option<Handle<Image>>,
}

impl Material2d for GlowMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/glow.wgsl".into()
    }
}`,
      },
    },
    {
      id: "code-settings-padding",
      title: "Write: padded settings uniform",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define a `ShockwaveSettings` component for a post-effect uniform: derive `Component, Default, Clone, Copy, ShaderType`, give it one `strength: f32` field, and add a `_webgl2_padding: Vec3` field guarded by `#[cfg(feature = "webgl2")]` so the struct reaches 16 bytes on WebGL2 builds.',
        solution: `use bevy::prelude::*;
use bevy::render::render_resource::ShaderType;

#[derive(Component, Default, Clone, Copy, ShaderType)]
pub struct ShockwaveSettings {
    pub strength: f32,
    #[cfg(feature = "webgl2")]
    pub _webgl2_padding: Vec3,
}`,
      },
    },
    {
      id: "code-bloom-camera",
      title: "Write: bloom camera",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a startup system `spawn_glow_camera` that spawns the 2D glow-recipe camera: `Camera2d`, `Tonemapping::TonyMcMapface`, `Bloom::default()`, and `DebandDither::Enabled`. (`Tonemapping` and `DebandDither` come from `bevy::core_pipeline::tonemapping`; `Bloom` from `bevy::post_process::bloom`.)",
        solution: `use bevy::core_pipeline::tonemapping::{DebandDither, Tonemapping};
use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

pub fn spawn_glow_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        Tonemapping::TonyMcMapface,
        Bloom::default(),
        DebandDither::Enabled,
    ));
}`,
      },
    },
    {
      id: "code-animate-material",
      title: "Write: pulse a uniform",
      content: {
        type: "code",
        language: "rust",
        prompt:
          'Define a material `PulseMaterial` whose only field is `#[uniform(0)] intensity: f32` (fragment shader `"shaders/pulse.wgsl"`), then write a system `pulse` taking `Res<Time>` and `ResMut<Assets<PulseMaterial>>` that drives every instance\'s `intensity` with `(time.elapsed_secs() * 4.0).sin() * 0.5 + 0.5`.',
        solution: `use bevy::prelude::*;
use bevy::render::render_resource::AsBindGroup;
use bevy::shader::ShaderRef;
use bevy::sprite_render::Material2d;

#[derive(Asset, TypePath, AsBindGroup, Debug, Clone)]
pub struct PulseMaterial {
    #[uniform(0)]
    pub intensity: f32,
}

impl Material2d for PulseMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/pulse.wgsl".into()
    }
}

pub fn pulse(time: Res<Time>, mut materials: ResMut<Assets<PulseMaterial>>) {
    for (_, material) in materials.iter_mut() {
        material.intensity = (time.elapsed_secs() * 4.0).sin() * 0.5 + 0.5;
    }
}`,
      },
    },
    {
      id: "code-flipbook-advance",
      title: "Write: flipbook advance",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "A `Flipbook` component holds `timer: Timer` and `frames: usize`. Define it and write a system `advance_flipbook` that ticks the timer with `time.delta()` and, on `just_finished()`, advances the sprite's texture-atlas `index`, wrapping with `% frames`.",
        solution: `use bevy::prelude::*;

#[derive(Component)]
pub struct Flipbook {
    pub timer: Timer,
    pub frames: usize,
}

pub fn advance_flipbook(time: Res<Time>, mut query: Query<(&mut Flipbook, &mut Sprite)>) {
    for (mut flipbook, mut sprite) in &mut query {
        flipbook.timer.tick(time.delta());
        if flipbook.timer.just_finished() {
            if let Some(atlas) = sprite.texture_atlas.as_mut() {
                atlas.index = (atlas.index + 1) % flipbook.frames;
            }
        }
    }
}`,
      },
    },
    {
      id: "code-trauma-shake",
      title: "Write: trauma shake",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a `Trauma(pub f32)` component and a system `shake_camera` over `(&mut Trauma, &mut Transform)` filtered by `With<Camera2d>`: decay trauma by `time.delta_secs() * 0.8` (clamped with `.max(0.0)`), compute `shake = trauma * trauma`, then offset `translation.x` and `translation.y` by `12.0 * shake` times the `sin`/`cos` of `time.elapsed_secs()` at frequencies 39.0 and 47.0.",
        solution: `use bevy::prelude::*;

#[derive(Component)]
pub struct Trauma(pub f32);

pub fn shake_camera(
    time: Res<Time>,
    mut query: Query<(&mut Trauma, &mut Transform), With<Camera2d>>,
) {
    for (mut trauma, mut transform) in &mut query {
        trauma.0 = (trauma.0 - time.delta_secs() * 0.8).max(0.0);
        let shake = trauma.0 * trauma.0;
        let t = time.elapsed_secs();
        transform.translation.x = 12.0 * shake * (t * 39.0).sin();
        transform.translation.y = 12.0 * shake * (t * 47.0).cos();
    }
}`,
      },
    },
  ],
  edges: [
    { from: "material2d-workflow", to: "mcq-material2d-module" },
    { from: "material2d-workflow", to: "asbindgroup-anatomy" },
    { from: "material2d-workflow", to: "time-driven-shaders" },
    { from: "material2d-workflow", to: "hdr-bloom-tonemapping" },
    { from: "material2d-workflow", to: "particles-landscape" },
    { from: "material2d-workflow", to: "code-material2d-struct" },
    { from: "asbindgroup-anatomy", to: "mcq-uniform-packing" },
    { from: "asbindgroup-anatomy", to: "shadertype-uniforms" },
    { from: "asbindgroup-anatomy", to: "bevy-wgsl-conventions" },
    { from: "asbindgroup-anatomy", to: "code-material2d-struct" },
    { from: "asbindgroup-anatomy", to: "code-animate-material" },
    { from: "shadertype-uniforms", to: "mcq-webgl2-padding" },
    { from: "shadertype-uniforms", to: "code-settings-padding" },
    { from: "shadertype-uniforms", to: "fullscreen-material" },
    { from: "bevy-wgsl-conventions", to: "mcq-material-bind-group" },
    { from: "time-driven-shaders", to: "code-animate-material" },
    { from: "hdr-bloom-tonemapping", to: "mcq-bloom-requires-hdr" },
    { from: "hdr-bloom-tonemapping", to: "mcq-pink-screen" },
    { from: "hdr-bloom-tonemapping", to: "code-bloom-camera" },
    { from: "hdr-bloom-tonemapping", to: "post-processing-schedules" },
    { from: "post-processing-schedules", to: "mcq-post-pass-019" },
    { from: "post-processing-schedules", to: "mcq-post-process-write" },
    { from: "post-processing-schedules", to: "fullscreen-material" },
    { from: "fullscreen-material", to: "mcq-fullscreen-material" },
    { from: "particles-landscape", to: "mcq-particles-webgl2" },
    { from: "flipbook-animation", to: "code-flipbook-advance" },
    { from: "flipbook-animation", to: "particles-landscape" },
    { from: "flipbook-animation", to: "screen-shake-hit-stop" },
    { from: "screen-shake-hit-stop", to: "code-trauma-shake" },
    { from: "screen-shake-hit-stop", to: "mcq-hit-stop" },
  ],
};
