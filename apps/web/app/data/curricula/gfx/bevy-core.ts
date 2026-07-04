import type { Curriculum } from "@mind-palace/curriculum";

import { bevySource } from "./_sources";

// Bevy: The Engine Frame — Bevy 0.19 fundamentals with a VFX slant: the App
// and frame loop, the ECS model, required components, schedules, queries,
// resources and Time, messages, assets, transforms, the Sprite-vs-Mesh2d
// decision, timers, and states. Every rust snippet is cargo-checked against
// bevy 0.19 by scripts/verify-rust-cards.ts.
export const gfxBevyCore: Curriculum = {
  id: "c-gfx-bevy-core",
  title: "Bevy: The Engine Frame",
  source: bevySource,
  nodes: [
    {
      id: "app-and-plugins",
      title: "App, Plugins & the Frame Loop",
      content: {
        type: "read",
        markdown:
          "Every Bevy program is one expression: build an `App`, bolt on plugins, run it.\n\n## The App builder\n`App::new()` creates an empty engine shell. `.add_plugins(DefaultPlugins)` installs the standard toolkit — windowing, rendering, input, the clock, asset loading — each piece a ==plugin==: a self-contained bundle of systems and resources. Your game is just more systems registered with `.add_systems(...)`, and `.run()` hands control to the engine.\n\n## The frame loop\nFrom `run()` on, Bevy loops: gather input, run your `Update` systems, render the world, repeat — typically 60 times a second. ==You never write the loop yourself.== You write small functions and tell Bevy *when* to call them.\n\n## Why VFX cares\nAn effect is per-frame mutation and nothing more. Each trip around the loop, your systems nudge positions, scales, tints, and shader inputs one tiny step; the renderer draws the result. Master the loop and every flash, shake, and burst reduces to a little math applied sixty times a second.",
      },
    },
    {
      id: "ecs-model",
      title: "Entities, Components, Systems",
      content: {
        type: "read",
        markdown:
          "Bevy's world is an ==ECS== — Entity, Component, System — three ideas that stay strictly separate.\n\n## Entities are just IDs\nAn `Entity` is a lightweight identifier — no data, no behavior. Think of it as a row number in a giant table.\n\n## Components are plain data\nA component is an ordinary struct or enum marked `#[derive(Component)]`, and it stores data — nothing else. `Transform` stores position, rotation, scale; `Sprite` stores which image to draw. What an entity *is* comes from which components it carries.\n\n## Systems are plain functions\nA system is an ordinary `fn` whose parameters declare the data it needs. Bevy reads the signature and delivers: ask for `Res<Time>` and you get the clock; ask for a query and you get matching entities. No registration ceremony beyond `add_systems`.\n\n## A spark, decomposed\nOne spark in a burst is one entity carrying `Sprite` (what it looks like), `Transform` (where it is), plus your own `Velocity` and `Lifetime` components. One `move_sparks` system advances every spark alive. ==Composition replaces inheritance== — there is no Spark class anywhere, only a bag of parts and the functions that act on them.",
      },
    },
    {
      id: "required-components",
      title: "Required Components",
      content: {
        type: "read",
        markdown:
          "Bevy components can declare ==required components== — dependencies that are inserted automatically whenever you spawn them.\n\n## Spawn one, get the set\nSystems create entities through `Commands`: `commands.spawn(Camera2d)` looks far too small to produce a working camera — but `Camera2d` *requires* the general `Camera` machinery, which requires a projection, a `Transform`, visibility, and the rest. Spawn the one marker; Bevy fills in every missing dependency ==with default values==.\n\n## Override only what you need\nSpawning a `Sprite` auto-inserts `Transform` and `Visibility`. Pass a tuple to override a default: `commands.spawn((Sprite::from_image(handle), Transform::from_xyz(0.0, 120.0, 0.0)))` places the sprite explicitly while everything else stays stock.\n\n## Your components can require too\nAdd `#[require(Transform, Visibility)]` on the line ==below== `#[derive(Component)]` — the attribute is introduced by the derive, so it must come after it — and every spawned `Spark` arrives render-ready.\n\n## Why VFX cares\nEffect spawns stay terse — one line per particle, no forgotten-component bugs. And the same mechanism powers the fancy stuff later: inserting `Bloom` on a camera auto-inserts the `Hdr` marker it depends on.",
      },
    },
    {
      id: "systems-and-schedules",
      title: "Systems & Schedules",
      content: {
        type: "read",
        markdown:
          "A schedule is a named bucket of systems that the engine runs at a specific moment.\n\n## The two you will use constantly\n- `Startup` — runs its systems ==exactly once==, before the first frame. Spawn the camera, kick off asset loads, set the stage.\n- `Update` — runs its systems ==every frame==. All animation lives here.\n\nRegister with `add_systems(Startup, setup)`; a tuple registers several at once: `add_systems(Update, (rise, fade, expire))`.\n\n## Ordering\nSystems in one schedule run ==in parallel== wherever their data access allows — Bevy inspects the signatures and schedules non-conflicting systems together. When order matters, say so: `.chain()` runs a tuple in sequence; `.before(...)` and `.after(...)` pin specific pairs.\n\n## Why VFX cares\nA burst effect maps straight onto schedules: a `Startup` (or triggered) system spawns the particles; `Update` systems move them, fade them, and finally despawn them. When an effect misbehaves only *sometimes*, unspecified ordering between two systems is the first suspect.",
      },
    },
    {
      id: "queries-and-filters",
      title: "Queries & Filters",
      content: {
        type: "read",
        markdown:
          "A ==Query== is the system parameter that finds every entity matching a shape — the workhorse of all per-frame animation.\n\n## The two slots\n`Query<&mut Transform, With<Spark>>` reads: give me a mutable `Transform` from every entity that *also* carries `Spark`.\n\n- **First slot — access.** What you actually read or write: `&Transform` for read-only, `&mut Transform` for mutation, a tuple like `(&mut Transform, &Velocity)` to fetch several components off the same entity at once.\n- **Second slot — filter.** Narrows *which* entities qualify without borrowing their data: `With<T>`, `Without<T>`.\n\n## Iterating\n`for mut transform in &mut query { ... }` walks every match; read-only queries iterate with `&query`. Need the entity's identity too — say, to despawn it? Put `Entity` in the access slot: `(Entity, &mut Transform)`.\n\n## Marker components\nAn empty struct — `#[derive(Component)] struct Spark;` — holds no data at all. It exists purely to be filtered on: ==tagging is how your effect finds its own entities== among everything else in the world.\n\n## Exactly one\nWhen precisely one entity should match — the camera, the player — `Single<&mut Transform, With<MainCamera>>` skips the loop and complains loudly if the count is not one.",
      },
    },
    {
      id: "resources-and-time",
      title: "Resources & Time: the VFX Clock",
      content: {
        type: "read",
        markdown:
          "Components belong to entities. A ==Resource== is the other kind of data: one global value the whole app shares — no entity attached.\n\n## Asking for resources\nDeclare them in the system signature: `Res<Time>` grants shared read access, `ResMut<Assets<Mesh>>` grants exclusive write access. Your own types join with `#[derive(Resource)]` plus `app.insert_resource(...)`.\n\n## Time — the resource every effect reads\n`Res<Time>` is the engine clock, and it exposes three views you will use daily:\n\n- `time.delta_secs()` — seconds elapsed since the previous frame, as an `f32` (about 0.016 at 60 fps)\n- `time.elapsed_secs()` — seconds since the app started\n- `time.delta()` — the same frame delta as a `Duration`, which is what `Timer::tick` wants\n\n## Frame-rate independence\nNever move things by a constant per frame — a 120 Hz display would play your effect at double speed. Scale every rate by the delta: `transform.translation.y += speed * time.delta_secs();`. Cyclic motion reads the running clock instead: `(time.elapsed_secs() * frequency).sin()`. The habit to burn in: ==delta for rates, elapsed for waves==.",
      },
    },
    {
      id: "events-and-messages",
      title: "Messages: Systems Talking",
      content: {
        type: "read",
        markdown:
          "Systems never call each other — they communicate through data. For one-shot announcements, Bevy provides ==messages==.\n\n## The frame-buffered mailbox\nDefine a plain struct, derive `Message`, register it with `app.add_message::<SpellCast>()`. Any system can then send through a `MessageWriter<SpellCast>` parameter — `writer.write(SpellCast { power: 2.0 })` — and any number of systems can receive through `MessageReader<SpellCast>`, draining `reader.read()` in a loop. Messages queue up during the frame and are cleared automatically once readers have had their chance, so nothing leaks.\n\n## Observers, in one sentence\nBevy also has `Event` types with observers for *immediate* reactions the moment something is triggered; the buffered message channel above is simpler, and it is all this path needs.\n\n## Why VFX cares\nGameplay code should never spawn particles directly. It announces `SpellCast { element, at }`; a VFX system reads the message and builds the effect. That ==decoupling== lets you rework an explosion's look without touching combat logic — and lets five different triggers reuse one effect.",
      },
    },
    {
      id: "assets-and-handles",
      title: "Assets & Handles",
      content: {
        type: "read",
        markdown:
          'Images, meshes, materials, audio — anything big lives in ==asset storage==, never inside components.\n\n## A Handle is a claim ticket\n`asset_server.load("spark.png")` returns *immediately* with a `Handle<Image>`: a small, cheaply clonable ID. The actual pixels stream in asynchronously. Components store handles; the renderer looks up the real bytes at draw time. ==Cloning a handle never clones the asset== — a hundred sparks share one texture through a hundred copies of one tiny ID.\n\n## Two access points\n- `Res<AssetServer>` — load assets from files by path; async, non-blocking.\n- `ResMut<Assets<T>>` — the storage itself. `meshes.add(Circle::new(40.0))` creates an asset ==from code== and hands back its handle. This is how procedural VFX skips files entirely: build the quad mesh and the material in a system, spawn, done.\n\n## Why VFX cares\nAsset identity is what keeps effects cheap. One glow-texture handle shared by every ember on screen; one circle mesh reused by every shockwave ring. Load once in `Startup`, stash the handles in a `Resource`, spawn thousands.',
      },
    },
    {
      id: "transforms-and-hierarchy",
      title: "Transforms & Hierarchy",
      content: {
        type: "read",
        markdown:
          "## Transform: where, how big, which way\n`Transform` is three fields: `translation` (a `Vec3` — yes, even in 2D: the z value orders layers), `rotation` (a `Quat`; in 2D you only ever need `Quat::from_rotation_z(angle)`), and `scale`. Builders chain nicely: `Transform::from_xyz(0.0, 120.0, 0.0).with_scale(Vec3::splat(2.0))`.\n\n## Parents and children\nThe `children!` macro nests entities at spawn time: `commands.spawn((Transform::default(), Visibility::default(), children![...]))`. A child's `Transform` is ==relative to its parent== — move the parent and the whole assembly moves as one.\n\n## GlobalTransform: read-only truth\nEvery frame the engine multiplies each entity's local `Transform` down the parent chain into its `GlobalTransform` — the true world-space placement. The contract: ==you write Transform, you read GlobalTransform==. Writing the global one does nothing useful; the engine overwrites it.\n\n## Why VFX cares\nAn effect rig is a hierarchy. One anchor entity follows the target; the glow, the core flash, and the spark emitters are its children at fixed local offsets. Animate the anchor once and everything rides along — and later, screen shake is nothing but wobbling one camera transform.",
      },
    },
    {
      id: "sprite-vs-mesh2d",
      title: "The VFX Fork: Sprite or Mesh2d",
      content: {
        type: "read",
        markdown:
          "Every 2D visual in Bevy travels one of two roads, and picking the right one is *the* recurring VFX decision.\n\n## Road 1 — Sprite: the fast path\n`Sprite` draws a textured quad through a dedicated, heavily ==batched== pipeline. It is perfect for images, flipbook animation from a `TextureAtlas`, tinted quads, and swarms of simple particles. The trade: **no custom shaders**. You get a texture, a color tint, flipping and slicing — nothing more.\n\n## Road 2 — Mesh2d + MeshMaterial2d: the shader path\nThe pair `Mesh2d(mesh_handle)` + `MeshMaterial2d(material_handle)` draws any 2D mesh with any material — including materials that run ==your own WGSL==. Every dissolve, glow ramp, SDF ring, and UV distortion in the curricula ahead walks through this door.\n\n## The decision rule\nAsk one question: ==does this piece need a custom shader?== No → `Sprite`: cheaper, batched, done. Yes → `Mesh2d` + `MeshMaterial2d`. Real effects mix freely — a sprite flipbook for the core, one shader-driven quad for the dissolve overlay.\n\n## Shapes without art\nBevy's primitives convert straight into meshes: `meshes.add(Circle::new(40.0))`, `Rectangle`, `RegularPolygon` — and `Annulus` (a ring) is an instant shockwave outline.",
      },
    },
    {
      id: "timers-phase-clocks",
      title: "Timers: Effect Phase Clocks",
      content: {
        type: "read",
        markdown:
          "Effects live and die on timing: 0.1 seconds of windup, 0.2 of flash, 0.5 of fade. `Timer` is the tool that measures each phase.\n\n## Anatomy of a Timer\n`Timer::from_seconds(0.3, TimerMode::Once)` builds a stopwatch — but it only advances when fed: call `timer.tick(time.delta())` every frame. Then interrogate it:\n\n- `just_finished()` — true on ==exactly one frame==; the hand-off moment\n- `is_finished()` — true from completion onward\n- `fraction()` — progress from 0.0 to 1.0; feed it into easing curves to shape the motion inside a phase\n\n## Two modes\n- `TimerMode::Once` — runs to completion and stops: a phase duration, a lifetime\n- `TimerMode::Repeating` — wraps around on completion: flipbook frame advance, spawn cadence\n\n## Timers ride inside components\nGive every effect instance its own clock by wrapping the timer in a component — `struct Lifetime { timer: Timer }`. Each spark ticks independently, and despawning the entity throws its clock away with it. ==A timer with no owner is a leak waiting to happen.==\n\n## Why VFX cares\nPhase clocks are the skeleton of every effect you will build: `fraction()` drives the tween inside a phase; `just_finished()` fires the hand-off to the next one.",
      },
    },
    {
      id: "states-effect-phases",
      title: "States: Effect Phases",
      content: {
        type: "read",
        markdown:
          "When phase logic outgrows a couple of timers, promote the phases to a real ==state machine==.\n\n## Defining states\nStates are an enum: `#[derive(States, Debug, Clone, PartialEq, Eq, Hash, Default)]` on `enum EffectPhase { #[default] Idle, Anticipation, Impact, Dissipate }`, registered once with `app.init_state::<EffectPhase>()`.\n\n## Three ways to gate systems\n- `add_systems(OnEnter(EffectPhase::Impact), spawn_flash)` — runs ==once per transition== into the state\n- `add_systems(Update, shake.run_if(in_state(EffectPhase::Impact)))` — runs every frame *while* in the state\n- `OnExit(EffectPhase::Impact)` — cleanup on the way out\n\n## Changing state\nAny system can request the transition: take `ResMut<NextState<EffectPhase>>` and call `next.set(EffectPhase::Dissipate)` — say, when the impact timer finishes. Bevy applies it between frames: `OnExit` of the old state fires, then `OnEnter` of the new.\n\n## Why VFX cares\nFF-style spells are staged — windup glow, flash and shake, embers fading out. ==Anticipation → Impact → Dissipate== as states makes each stage's systems explicit and auditable, and `OnEnter`/`OnExit` are exactly where stage props get spawned and cleaned up.",
      },
    },
    {
      id: "ecs-roles",
      title: "Where the data lives",
      content: {
        type: "multiple-choice",
        question:
          "A spark carries its position, velocity, and remaining lifetime. In Bevy's ECS, where does that data live?",
        options: [
          "Inside the Entity, which is a struct holding fields",
          "In components attached to the entity — the Entity itself is only an ID",
          "Inside the system functions that move the spark",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "required-camera",
      title: "Spawning a bare Camera2d",
      content: {
        type: "multiple-choice",
        question:
          "A startup system runs only `commands.spawn(Camera2d)`, yet a fully working camera appears. Why?",
        options: [
          "Camera2d requires the rest — Bevy auto-inserts Camera, Transform, and friends with default values",
          "DefaultPlugins always spawns a hidden fallback camera",
          "Camera2d is a Resource, so no other components are involved",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "startup-vs-update",
      title: "Startup vs Update",
      content: {
        type: "multiple-choice",
        question:
          "Your system spawns the effect gallery's camera. Which schedule should it run in, and how often does it run there?",
        options: [
          "Update — it runs until you remove it",
          "Startup — it runs exactly once, before the first frame",
          "Either — both schedules run every frame",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "query-filter-mcq",
      title: "Query filter targets",
      content: {
        type: "multiple-choice",
        question: "Which entities does `rise` move each frame?",
        language: "rust",
        code: `use bevy::prelude::*;

#[derive(Component)]
struct Spark;

fn rise(time: Res<Time>, mut sparks: Query<&mut Transform, With<Spark>>) {
    for mut transform in &mut sparks {
        transform.translation.y += 60.0 * time.delta_secs();
    }
}`,
        options: [
          "Every entity in the world that has a Transform",
          "Only the first entity spawned with a Spark",
          "Every entity that has both a Transform and a Spark",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "delta-time-mcq",
      title: "Frame-rate independence",
      content: {
        type: "multiple-choice",
        question:
          "A rising spark should climb at 60 pixels *per second* on every display, from a 60 Hz monitor to a 120 Hz iPad. What do you multiply the per-frame movement by?",
        options: [
          "time.delta_secs() — the seconds elapsed since the previous frame",
          "time.elapsed_secs() — the seconds since the app started",
          "Nothing — Update always runs at exactly 60 Hz",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "message-decoupling-mcq",
      title: "Messages: who receives?",
      content: {
        type: "multiple-choice",
        question:
          "Combat code sends `SpellCast` through a `MessageWriter<SpellCast>`. How does the VFX system on the other end get it?",
        options: [
          "Bevy calls the VFX system immediately, passing the message as an argument",
          "It declares a MessageReader<SpellCast> parameter and drains reader.read() — neither system ever calls the other",
          "It reads a global Vec<SpellCast> resource that keeps every message forever",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "handle-mcq",
      title: "What a Handle is",
      content: {
        type: "multiple-choice",
        question: '`asset_server.load("spark.png")` returns instantly. What did you get back?',
        options: [
          "The decoded pixels, read synchronously from disk",
          "A Handle<Image> — a cheap ID; the pixels stream in asynchronously",
          "A Result you must unwrap before you can spawn anything",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "global-transform-mcq",
      title: "Who writes GlobalTransform",
      content: {
        type: "multiple-choice",
        question:
          "A glow quad is a child of an anchor entity. Which component holds the glow's final world-space position — and who writes it?",
        options: [
          "GlobalTransform — computed by the engine from the parent chain every frame",
          "Transform — Bevy adds the parent's offset into it for you",
          "The parent's Transform — children share their parent's component",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "vfx-path-mcq",
      title: "Choosing the shader path",
      content: {
        type: "multiple-choice",
        question:
          "You want a quad whose fragment shader eats it away with noise — a dissolve. Which component pair draws it?",
        options: [
          "Sprite + TextureAtlas",
          "Camera2d + Bloom",
          "Mesh2d + MeshMaterial2d with a custom material",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "state-gate-mcq",
      title: "Running once per transition",
      content: {
        type: "multiple-choice",
        question:
          "`spawn_flash` must run exactly once each time the effect switches into `EffectPhase::Impact`. Where does it belong?",
        options: [
          "add_systems(Update, spawn_flash.run_if(in_state(EffectPhase::Impact)))",
          "add_systems(Startup, spawn_flash)",
          "add_systems(OnEnter(EffectPhase::Impact), spawn_flash)",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "minimal-app",
      title: "Write: minimal App",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a Bevy `main` that builds an `App`, adds `DefaultPlugins`, registers a `setup` system in the `Startup` schedule, and runs. `setup` takes `Commands` and spawns a `Camera2d`.",
        solution: `use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .run();
}

fn setup(mut commands: Commands) {
    commands.spawn(Camera2d);
}`,
      },
    },
    {
      id: "spawn-component",
      title: "Write: define & spawn a component",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a `Spark` component holding `energy: f32`, then write a system `spawn_spark` that spawns an entity with `Spark { energy: 1.0 }` and a `Transform` at the origin.",
        solution: `use bevy::prelude::*;

#[derive(Component)]
struct Spark {
    energy: f32,
}

fn spawn_spark(mut commands: Commands) {
    commands.spawn((Spark { energy: 1.0 }, Transform::from_xyz(0.0, 0.0, 0.0)));
}`,
      },
    },
    {
      id: "sin-bob",
      title: "Write: time-driven sin bob",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define an empty `Bob` marker component, then write a system `bob` that makes every `Bob` entity float: set `translation.y` to `(time.elapsed_secs() * 2.0).sin() * 20.0` using the clock from `Res<Time>`.",
        solution: `use bevy::prelude::*;

#[derive(Component)]
struct Bob;

fn bob(time: Res<Time>, mut query: Query<&mut Transform, With<Bob>>) {
    for mut transform in &mut query {
        transform.translation.y = (time.elapsed_secs() * 2.0).sin() * 20.0;
    }
}`,
      },
    },
    {
      id: "spawn-sprite",
      title: "Write: spawn a Sprite",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write a system `spawn_flash` that loads `flash.png` through the `AssetServer` and spawns it as a `Sprite` placed at (0, 120, 0).",
        solution: `use bevy::prelude::*;

fn spawn_flash(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Sprite::from_image(asset_server.load("flash.png")),
        Transform::from_xyz(0.0, 120.0, 0.0),
    ));
}`,
      },
    },
    {
      id: "timer-despawn",
      title: "Write: lifetime despawn",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Define a `Lifetime` component wrapping a `Timer`, then write a system `expire` that ticks each entity's timer with the frame delta and despawns the entity when the timer just finished.",
        solution: `use bevy::prelude::*;

#[derive(Component)]
struct Lifetime {
    timer: Timer,
}

fn expire(time: Res<Time>, mut commands: Commands, mut query: Query<(Entity, &mut Lifetime)>) {
    for (entity, mut lifetime) in &mut query {
        lifetime.timer.tick(time.delta());
        if lifetime.timer.just_finished() {
            commands.entity(entity).despawn();
        }
    }
}`,
      },
    },
  ],
  edges: [
    { from: "app-and-plugins", to: "ecs-model" },
    { from: "ecs-model", to: "ecs-roles" },
    { from: "ecs-model", to: "required-components" },
    { from: "ecs-model", to: "systems-and-schedules" },
    { from: "required-components", to: "required-camera" },
    { from: "systems-and-schedules", to: "startup-vs-update" },
    { from: "app-and-plugins", to: "minimal-app" },
    { from: "systems-and-schedules", to: "minimal-app" },
    { from: "required-components", to: "minimal-app" },
    { from: "ecs-model", to: "spawn-component" },
    { from: "required-components", to: "spawn-component" },
    { from: "systems-and-schedules", to: "queries-and-filters" },
    { from: "systems-and-schedules", to: "resources-and-time" },
    { from: "systems-and-schedules", to: "events-and-messages" },
    { from: "queries-and-filters", to: "query-filter-mcq" },
    { from: "resources-and-time", to: "query-filter-mcq" },
    { from: "resources-and-time", to: "delta-time-mcq" },
    { from: "events-and-messages", to: "message-decoupling-mcq" },
    { from: "resources-and-time", to: "assets-and-handles" },
    { from: "assets-and-handles", to: "handle-mcq" },
    { from: "queries-and-filters", to: "transforms-and-hierarchy" },
    { from: "transforms-and-hierarchy", to: "global-transform-mcq" },
    { from: "queries-and-filters", to: "sin-bob" },
    { from: "resources-and-time", to: "sin-bob" },
    { from: "transforms-and-hierarchy", to: "sin-bob" },
    { from: "required-components", to: "sprite-vs-mesh2d" },
    { from: "assets-and-handles", to: "sprite-vs-mesh2d" },
    { from: "sprite-vs-mesh2d", to: "vfx-path-mcq" },
    { from: "assets-and-handles", to: "spawn-sprite" },
    { from: "sprite-vs-mesh2d", to: "spawn-sprite" },
    { from: "resources-and-time", to: "timers-phase-clocks" },
    { from: "timers-phase-clocks", to: "timer-despawn" },
    { from: "queries-and-filters", to: "timer-despawn" },
    { from: "systems-and-schedules", to: "states-effect-phases" },
    { from: "timers-phase-clocks", to: "states-effect-phases" },
    { from: "events-and-messages", to: "states-effect-phases" },
    { from: "states-effect-phases", to: "state-gate-mcq" },
  ],
};
