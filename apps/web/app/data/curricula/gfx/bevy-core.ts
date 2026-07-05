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
      id: "bevy-3d-axes",
      title: "3D Space: Bevy's Three Axes",
      content: {
        type: "read",
        markdown:
          "Bevy's world is ==right-handed and Y-up==. Picture yourself standing behind the screen, looking in: `+X` goes ==right==, `+Y` goes ==up==, and `+Z` comes ==toward you==, out of the glass. So `-Z` heads *away*, into the scene. (2D was this exact space — you just left `z` as a layer-order number.)\n\n## The cube at the origin\nDrop a unit cube on the origin and name each face by the axis it points down:\n\n- **Top** is `+Y`, **bottom** is `-Y`\n- **Right** is `+X`, **left** is `-X`\n- The `+Z` face points at *you*; the `-Z` face points *away* into the screen\n\n## Forward is −Z\nThe rule to burn in above all others: ==anything's forward is its local `-Z`==. `Transform::forward()` is literally `-local_z()`. A camera, a character, an arrow — they all 'face' down `-Z`. Hold onto this one fact; it quietly explains every camera placement and every Blender-import quirk below.",
      },
    },
    {
      id: "place-3d-camera",
      title: "Placing a 3D Camera",
      content: {
        type: "read",
        markdown:
          "A 3D camera is two parts: a `Camera3d` marker, and a `Transform` that says *where the eye sits* and *what it aims at*.\n\n## from_xyz + looking_at\n`Transform::from_xyz(x, y, z).looking_at(target, up)` reads in two halves:\n\n- `from_xyz(x, y, z)` — the ==eye position==, a point in world space\n- `.looking_at(target, up)` — spins the camera so its forward (`-Z`) points at the world *point* `target`, with `up` (conventionally `Vec3::Y`) keeping it level. `up` only settles ==roll==; it never moves the eye.\n\n## Reading a placement\n`from_xyz(0.0, 6.0, 12.0).looking_at(Vec3::ZERO, Vec3::Y)` means: sit ==6 up and 12 toward the viewer== (on the `+Z` side), then tilt down to stare at the origin. Push `y` higher for a steeper bird's-eye; push `z` bigger to back further away. Bevy's own `3d_scene` example uses `from_xyz(-2.5, 4.5, 9.0).looking_at(Vec3::ZERO, Vec3::Y)`.\n\n## The default look\nSpawn a `Camera3d` with a plain `Transform` (no rotation) and it stares straight down world `-Z` — because forward *is* `-Z`. `looking_at` is just the friendly way to rotate that forward onto a target point instead of doing quaternion math by hand.",
      },
    },
    {
      id: "blender-vs-bevy-axes",
      title: "Blender is Z-up; Bevy is Y-up",
      content: {
        type: "read",
        markdown:
          "Here is the single fact that trips up everyone moving art from Blender into Bevy: ==the two tools disagree on which axis is UP==.\n\n## Two different ups\n- **Bevy** is `Y`-up — the sky is `+Y`.\n- **Blender** is `Z`-up — the sky is `+Z`.\n\nBoth are right-handed, so only the *labels* move, not the handedness. In Blender, `+X` is right, `+Z` is up, and `+Y` points ==into the screen== — the Numpad-1 *Front view* looks toward `+Y`, so a model's front conventionally faces `-Y`.\n\n## The bridge is glTF\nYou never hand Bevy a `.blend` file — you export a ==GLB== (binary glTF). glTF is `Y`-up, exactly like Bevy, which is why it is the clean handoff format between the two. The next card is how the export quietly lines up the axes for you.",
      },
    },
    {
      id: "gltf-export-bridge",
      title: "The Export Bridge: top stays top",
      content: {
        type: "read",
        markdown:
          "When you export a GLB from Blender, keep the default ==+Y Up== option. Behind the scenes the exporter rotates the model `-90°` about `X` so its axes match glTF, and therefore Bevy.\n\n## What maps to what\n- Blender `+Z` (up) → glTF `+Y` (up) → Bevy `+Y` (up)\n- Blender `+X` (right) → glTF `+X` → Bevy `+X`\n- Blender `-Y` (front) → glTF `+Z`\n\n## The one thing to remember\n==Up is the safe axis — it never rotates.== A cube modeled with its top toward Blender `+Z` *always* arrives top-up in Bevy (`+Y`), in every import mode, with zero fuss. If you remember one sentence from this whole section, make it this one: **top stays top**.",
      },
    },
    {
      id: "front-face-gotcha",
      title: "The 'which front?' gotcha",
      content: {
        type: "read",
        markdown:
          "The famous complaint — *'my imported model faces backward!'* — is not an export bug. It is ==two different meanings of the word 'front'==.\n\n## Two fronts, pointing opposite ways\n- **Camera-front** — the face *toward the camera* — is `+Z` in Bevy. The default camera sits on the `+Z` side and sees it, so on screen the model looks correct.\n- **Object-forward** — `Transform::forward()`, used by `looking_at`, by movement, and by 'which way is it facing' — is `-Z`.\n\nThose two point ==opposite ways==, on purpose.\n\n## Why import lands on +Z\nBevy's default GLB importer copies glTF axes ==1:1== (coordinate conversion is off by default through 0.19), so a model's designated front lands at Bevy `+Z`. It reads correctly facing the camera, yet it is antiparallel to its own `forward()`.\n\n## The fix (don't re-model)\nWhen a model needs its *forward* to match its face, leave Blender alone and spin the entity in Bevy: `Transform::from_rotation(Quat::from_rotation_y(std::f32::consts::PI))` — a 180° yaw — or turn on the importer's `convert_coordinates`. ==Only front/back and left/right can flip; top/bottom never do.==",
      },
    },
    {
      id: "blender-orient-workflow",
      title: "Orienting an Object in Blender",
      content: {
        type: "read",
        markdown:
          "A repeatable checklist so a Blender object lands in Bevy with its top on top and no surprises.\n\n## Model to the conventions\nBuild with the ==top toward `+Z`== (Blender's up) and the ==front toward `-Y`== (the side you see in the Numpad-1 Front view).\n\n## Apply transforms before export\nSelect the object and ==Ctrl+A → Rotation & Scale==. Un-applied rotation and scale ride along as baked-in values and make the model arrive tilted or the wrong size. Applying resets the object's own axes to the world's, so Bevy reads clean numbers.\n\n## Set the origin\nThe object's ==origin== is the point Bevy's `Transform` grabs and pivots around. Use **Object → Set Origin →** *Origin to Geometry* to center it, or drop the origin at the base if the thing should pivot on the ground.\n\n## Export\n**File → Export → glTF 2.0 (.glb)**, leaving `+Y Up` on. In Bevy the top is `+Y`; if the model's *facing* also needs to match its `forward()`, add the 180° yaw from the previous card.",
      },
    },
    {
      id: "cube-top-mcq",
      title: "Which axis is the lid?",
      content: {
        type: "multiple-choice",
        question:
          "You model a treasure chest in Blender with its lid pointing toward Blender's `+Z`, export a GLB with the default +Y Up, and load it in Bevy. Which Bevy axis does the lid (the top) point along?",
        options: [
          "+Y — up is the safe axis; it never rotates through the export",
          "+Z — glTF keeps Blender's Z axis unchanged",
          "-Z — Bevy flips the vertical axis on import",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "camera-look-mcq",
      title: "Which way a fresh camera looks",
      content: {
        type: "multiple-choice",
        question:
          "A `Camera3d` is spawned with a default, identity-rotation `Transform`. Down which of its local axes does it look?",
        options: [
          "+Z — toward the viewer",
          "-Z — forward is always the local -Z axis",
          "+Y — cameras look up by default",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "backward-model-mcq",
      title: "The backward-model fix",
      content: {
        type: "multiple-choice",
        question:
          "An imported GLB character renders upright and correctly sized, but it faces AWAY from the direction its `Transform::forward()` reports. What is the cleanest fix?",
        options: [
          "Re-export from Blender with Z-up instead of +Y Up",
          "Give the Transform a negative Z scale to flip it around",
          "Its designated front is +Z while forward() is -Z — yaw the entity 180° about Y (or enable convert_coordinates); don't re-model",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "write-3d-camera",
      title: "Write: place a 3D camera",
      content: {
        type: "code",
        prompt:
          "Write a Bevy startup system `spawn_camera(mut commands: Commands)` that spawns a `Camera3d` sitting 6 up and 12 toward the viewer, looking at the world origin with `Vec3::Y` as up.",
        language: "rust",
        solution:
          "use bevy::prelude::*;\n\nfn spawn_camera(mut commands: Commands) {\n    commands.spawn((\n        Camera3d::default(),\n        Transform::from_xyz(0.0, 6.0, 12.0).looking_at(Vec3::ZERO, Vec3::Y),\n    ));\n}\n",
      },
    },
    {
      id: "write-face-fix",
      title: "Write: fix a backward import",
      content: {
        type: "code",
        prompt:
          "An imported model faces the wrong way. Write a Bevy system `face_forward` that yaws every entity carrying an `Imported` marker 180° about Y so its front lines up with `Transform::forward()`. Define the marker too.",
        language: "rust",
        solution:
          "use bevy::prelude::*;\nuse std::f32::consts::PI;\n\n#[derive(Component)]\nstruct Imported;\n\nfn face_forward(mut query: Query<&mut Transform, With<Imported>>) {\n    for mut transform in &mut query {\n        transform.rotation = Quat::from_rotation_y(PI);\n    }\n}\n",
      },
    },
    {
      id: "degrees-radians-tau",
      title: "Degrees, Radians & TAU",
      content: {
        type: "read",
        markdown:
          "Rotation needs an angle unit, and graphics picks the one that looks weird at first but is actually the *natural* one.\n\n## Degrees are the arbitrary one\n`360` degrees to a full turn is a historical accident (Babylonian, close to the days in a year). Nothing about a circle *is* 360.\n\n## Radians are the honest one\nWalk the rim of a circle of radius 1, and the distance you cover *is* the angle in ==radians==. A full lap is the circumference, `2π ≈ 6.28`, so:\n\n- ==full turn== = `TAU` = `2π` ≈ `6.28`\n- ==half turn== = `PI` = `π` ≈ `3.14`\n- ==quarter turn== = `π/2` ≈ `1.57`\n\nEvery rotation call, every `sin` and `cos`, and all of glam and WGSL expect ==radians==.\n\n## Think in turns, not radians\nThe trick that makes radians painless: read `TAU` as 'one turn' and scale it. `0.1 * TAU` is ==a tenth of a turn== — far clearer than '0.628 radians'. Reach for `TAU` on spins and `PI` on half-flips; convert human degrees only at the very edge with `.to_radians()`. (You met radians on the circle back in the math track — here they *drive* the spin.)",
      },
    },
    {
      id: "hz-frames-delta",
      title: "Hz, Frames & Delta Time",
      content: {
        type: "read",
        markdown:
          "Continuous motion lives at the mercy of the frame rate, so you have to defuse it. Three words to keep straight:\n\n## Frame, Hz, delta\n- A ==frame== is one rendered image.\n- ==FPS / Hz== is frames (or cycles) per second — your display runs 60 or 120 **Hz**.\n- ==Delta time== is the seconds that passed since the *previous* frame, `time.delta_secs()` — a tiny number, and it is exactly `1 / fps` (about `0.0166` at 60 fps, `0.0083` at 120).\n\n## Why multiply by delta\nMove a *fixed amount per frame* and a 120 Hz Mac runs everything ==twice as fast== as a 60 Hz one. Scale every continuous motion by `delta_secs()` and the real-world speed is ==identical on every machine==. Burn in the habit: *delta for rates*.\n\n## Reading 0.1 * TAU * delta_secs()\nThe turntable line decomposes cleanly:\n\n- `0.1` — turns **per second**: a ==frequency==, i.e. `0.1` Hz\n- `TAU` — turns → radians\n- `delta_secs()` — this frame's slice of a second\n\nMultiply them and you get *the radians to turn on THIS frame*. The angular speed hiding inside is `ω = TAU · f` — turns-per-second times a full turn.",
      },
    },
    {
      id: "rebuild-rotate-y",
      title: "Under the Hood: Rebuilding rotate_y",
      content: {
        type: "read",
        markdown:
          "`transform.rotate_y(θ)` spins the object about the vertical (world **Y**) axis. Here is what it is really doing, so it stops being magic.\n\n## The insight: Y sits still, X and Z dance\nRotating *about* Y ==leaves the Y value untouched== and spins the `(x, z)` pair around in the horizontal plane. That is the ==exact 2D rotation from the math track==, just applied to X and Z instead of X and Y. The matrix `Ry(θ)`:\n\n- `x' = x·cos θ + z·sin θ`\n- `y' = y`  — the axis you spin around never moves\n- `z' = -x·sin θ + z·cos θ`\n\nSanity check with a quarter turn (`cos = 0`, `sin = 1`): `+X` lands on `-Z`, and `+Z` lands on `+X`.\n\n## What glam and Bevy hand you\nglam packages that matrix as `Mat3::from_rotation_y(θ)`, and the same rotation as a quaternion `Quat::from_rotation_y(θ)` — whose four numbers are `(0, sin(θ/2), 0, cos(θ/2))` (a quarter turn is `(0, 0.707, 0, 0.707)`). You almost never build the quaternion by hand.\n\n## What rotate_y adds\n`rotate_y` just ==composes that rotation onto the one you already have==: `self.rotation = Quat::from_rotation_y(θ) * self.rotation`, spinning about the *world* Y. Its sibling `rotate_local_y` multiplies on the other side to spin about the object's *own* Y — the difference only shows once the object is tilted.",
      },
    },
    {
      id: "write-rotate-about-y",
      title: "Write: rebuild rotate_y by hand",
      content: {
        type: "code",
        prompt:
          "Rebuild the heart of rotate_y in plain arithmetic. Write `pub fn rotate_about_y(p: (f32, f32, f32), angle: f32) -> (f32, f32, f32)` that rotates the point `p` about the Y axis: x' = x·cos + z·sin, y unchanged, z' = -x·sin + z·cos. Use `angle.sin_cos()` to get both at once.",
        language: "rust",
        solution:
          "pub fn rotate_about_y(p: (f32, f32, f32), angle: f32) -> (f32, f32, f32) {\n    let (s, c) = angle.sin_cos();\n    (p.0 * c + p.2 * s, p.1, -p.0 * s + p.2 * c)\n}\n",
      },
    },
    {
      id: "glam-spin-y",
      title: "Write: spin about Y with glam",
      content: {
        type: "code",
        prompt:
          "The real way — let the quaternion do it. Write `pub fn spin_about_y(p: Vec3, angle: f32) -> Vec3` that rotates `p` about the Y axis using `Quat::from_rotation_y`. Import both types from `glam`.",
        language: "rust",
        solution:
          "use glam::{Quat, Vec3};\n\npub fn spin_about_y(p: Vec3, angle: f32) -> Vec3 {\n    Quat::from_rotation_y(angle) * p\n}\n",
      },
    },
    {
      id: "turns-mcq",
      title: "Reading 0.1 * TAU",
      content: {
        type: "multiple-choice",
        question:
          "In `transform.rotate_y(0.1 * TAU * time.delta_secs())`, what does the `0.1 * TAU` part mean?",
        options: ["A tenth of a full turn, expressed in radians", "0.1 radians", "0.1 degrees"],
        answerIndex: 0,
      },
    },
    {
      id: "delta-fps-mcq",
      title: "Dropping delta time",
      content: {
        type: "multiple-choice",
        question:
          "You delete the `* time.delta_secs()` from the turntable and run it on a 120 Hz Mac. What happens?",
        options: [
          "Nothing changes — delta time only matters at 60 fps",
          "It spins about 120× too fast — a tenth of a turn every FRAME instead of every second",
          "It stops rotating entirely",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "quarter-turn-mcq",
      title: "A quarter turn about Y",
      content: {
        type: "multiple-choice",
        question:
          "Rotate the point `+X` a quarter turn (`+π/2`) about the Y axis. Which axis does it land on?",
        options: ["-Z", "+Z", "+Y"],
        answerIndex: 0,
      },
    },
    {
      id: "turntable-axis-mcq",
      title: "Which axis for a turntable",
      content: {
        type: "multiple-choice",
        question:
          "You want a turntable spin — the top stays up and the object never tumbles. Which call?",
        options: [
          "rotate_x — the horizontal axis",
          "rotate_z — the depth axis",
          "rotate_y — the vertical axis",
        ],
        answerIndex: 2,
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
    { from: "transforms-and-hierarchy", to: "bevy-3d-axes" },
    { from: "bevy-3d-axes", to: "place-3d-camera" },
    { from: "bevy-3d-axes", to: "blender-vs-bevy-axes" },
    { from: "blender-vs-bevy-axes", to: "gltf-export-bridge" },
    { from: "gltf-export-bridge", to: "front-face-gotcha" },
    { from: "bevy-3d-axes", to: "front-face-gotcha" },
    { from: "gltf-export-bridge", to: "blender-orient-workflow" },
    { from: "gltf-export-bridge", to: "cube-top-mcq" },
    { from: "bevy-3d-axes", to: "camera-look-mcq" },
    { from: "place-3d-camera", to: "camera-look-mcq" },
    { from: "front-face-gotcha", to: "backward-model-mcq" },
    { from: "place-3d-camera", to: "write-3d-camera" },
    { from: "front-face-gotcha", to: "write-face-fix" },
    { from: "transforms-and-hierarchy", to: "degrees-radians-tau" },
    { from: "resources-and-time", to: "hz-frames-delta" },
    { from: "degrees-radians-tau", to: "hz-frames-delta" },
    { from: "degrees-radians-tau", to: "rebuild-rotate-y" },
    { from: "bevy-3d-axes", to: "rebuild-rotate-y" },
    { from: "rebuild-rotate-y", to: "write-rotate-about-y" },
    { from: "rebuild-rotate-y", to: "glam-spin-y" },
    { from: "degrees-radians-tau", to: "turns-mcq" },
    { from: "hz-frames-delta", to: "delta-fps-mcq" },
    { from: "rebuild-rotate-y", to: "quarter-turn-mcq" },
    { from: "rebuild-rotate-y", to: "turntable-axis-mcq" },
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
