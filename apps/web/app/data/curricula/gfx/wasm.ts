import type { Curriculum } from "@mind-palace/curriculum";

import { bevyWebsiteSource } from "./_sources";

// Ship It: Bevy in the Browser — the wasm32 build pipeline, backend features,
// canvas embedding, HTTP assets, binary-size discipline, and static-host deploy.
// Bevy snippets are cargo-checked against bevy 0.19 by scripts/verify-rust-cards.ts.
export const gfxWasm: Curriculum = {
  id: "c-gfx-wasm",
  title: "Ship It: Bevy in the Browser",
  source: bevyWebsiteSource,
  nodes: [
    {
      id: "browser-build-pipeline",
      title: "The Browser Build Pipeline",
      content: {
        type: "read",
        markdown:
          "Everything you have built in Bevy so far runs as a native binary. Shipping it to the browser means compiling to ==WebAssembly== — and Rust treats that as a first-class target.\n\n## The target triple\nInstall it once with `rustup target add wasm32-unknown-unknown`. The name decodes as: `wasm32` architecture, *unknown* vendor, *unknown* OS — there is no operating system, because the browser supplies everything an OS normally would.\n\n## Three steps, always in this order\n- **Compile** — `cargo build --release --target wasm32-unknown-unknown` produces a raw `.wasm` file\n- **Bind** — the `wasm-bindgen` CLI (`--target web --out-dir out/`) rewrites that `.wasm` and generates the ==JavaScript glue== that loads it, wires up browser APIs, and exposes your entry point\n- **Serve** — drop the output next to an `index.html` and host it as plain static files; the engine repo ships a page scaffold at `examples/wasm/index.html`\n\n## The version handshake\nwasm-bindgen is two things at once: a crate in your dependency tree and a CLI on your machine. The CLI ==must exactly match== the crate version in your lockfile (currently `0.2.126`) — a mismatch aborts the bind step with an error. Whenever `cargo update` bumps the crate, re-install the CLI to match.\n\n## The dev loop\nRunning three commands by hand gets old fast. Your options: `wasm-server-runner` (registered as the cargo runner, so a plain `cargo run --target wasm32-unknown-unknown` builds and serves), Trunk, or the alpha **Bevy CLI** — `bevy run web` compiles, binds, and serves in one command.",
      },
    },
    {
      id: "backend-choice",
      title: "One Build, One Backend",
      content: {
        type: "read",
        markdown:
          "A Bevy wasm build renders through one of two browser graphics APIs — and the choice is baked in at ==compile time== by cargo features, not decided at runtime.\n\n## webgl2 — the default\nThe `webgl2` feature is on by default (via the `default_platform` feature profile). It deliberately *limits* the engine to what WebGL2 can express: ==no compute shaders==, no storage-buffer-dependent paths, and the 16-byte uniform padding rule you met in the material work. Everything a 2D effect gallery needs — `Material2d` shaders, fullscreen post-processing, bloom, CPU-simulated particles — fits inside those limits.\n\n## webgpu — the override\nOpting into the `webgpu` feature does not *add* a second backend — it ==overrides webgl2 entirely==. A `webgpu` build runs only in browsers that ship WebGPU; there is no fallback path in the artifact. One build, one backend.\n\n## Want both audiences? Ship two builds\nBecause the features are mutually exclusive, serving everyone means two artifacts:\n\n- **Build A** — default features → WebGL2, runs everywhere\n- **Build B** — `webgpu` → unlocks compute-driven effects (GPU particle systems, readback)\n\nA small JS loader checks ==`navigator.gpu`== and boots build B when it exists, build A otherwise. Static hosting serves both side by side without complaint.",
      },
    },
    {
      id: "browser-matrix",
      title: "The 2026 Browser Matrix",
      content: {
        type: "read",
        markdown:
          'Which backend should carry your effect gallery? Look at where browsers actually stand in mid-2026.\n\n## WebGL2: effectively universal\nEvery evergreen desktop and mobile browser ships WebGL2 — bevy.org\'s own live examples page runs on it. If the game must open on any phone handed to a friend, this is the answer.\n\n## WebGPU: broad, but not universal\n- **Chrome/Edge 113+** — desktop since 2023; Android 12+ from Chrome 121\n- **Safari 26** — enabled by default across macOS, iOS, and iPadOS 26\n- **Firefox** — 141+ on Windows, 145+ on Apple-silicon macOS; ==Linux and Android still pending==\n\nSo "all major browsers ship WebGPU" is true on flagship desktops — but the mobile and Linux long tail keeps ==WebGL2 as the compatibility floor==.\n\n## What that means for effects\nA WebGL2 build carries custom materials, fullscreen post-FX, HDR bloom with tonemapping, and CPU-driven particles just fine. Anything built on ==compute shaders== — GPU particle simulation, GPU readback — exists only in a WebGPU build. Default to the floor; treat WebGPU as the enhanced tier behind `navigator.gpu` detection.',
      },
    },
    {
      id: "canvas-embedding",
      title: "Owning the Canvas",
      content: {
        type: "read",
        markdown:
          'Left alone, a Bevy wasm build creates its own `<canvas>` and appends it to `<body>` — fine for a demo, wrong for a real page. You want Bevy painting into a canvas **you** placed in the layout.\n\n## Bind by CSS selector\nConfigure the primary `Window` through `WindowPlugin`: setting `canvas: Some("#bevy-canvas".into())` makes Bevy bind to the ==existing element== matching that querySelector string instead of creating one. The field is web-only — native builds ignore it.\n\n## Sizing: fit_canvas_to_parent\n`fit_canvas_to_parent: true` resizes the canvas to fill its parent element. One documented trap: if the parent ==sizes itself from its children==, every resize grows the canvas, which grows the parent, which grows the canvas again — a feedback loop that inflates the page forever. Give the parent an ==explicit CSS size== and the loop never starts.\n\n## Playing nice with the page\n`prevent_default_event_handling: true` makes Bevy swallow browser shortcuts — `F5`, `F12`, `Ctrl+R`, tab — while the canvas has focus. That is great for a full-page game and hostile for a canvas embedded in a document. Leave it `false` when the game shares the page with other content.',
      },
    },
    {
      id: "assets-over-http",
      title: "Assets Over HTTP",
      content: {
        type: "read",
        markdown:
          "There is no filesystem in the browser. On wasm, Bevy's `AssetServer` swaps file reads for HTTP: every `asset_server.load(\"textures/spark.png\")` becomes a fetch of a ==relative URL== against your hosting origin.\n\n## Deploy the folder\nThe consequence is simple: the `assets/` directory must be deployed ==next to== the `.wasm` and JS glue, with paths preserved. In dev, any static file server does the job.\n\n## The .meta probe problem\nBevy's asset system also probes a `.meta` sidecar file for every asset. Over HTTP that is one extra request per asset — normally a stream of harmless ==404s== cluttering the console. But some hosts (famously itch.io) answer ==403 Forbidden== instead, which Bevy treats as a real error — and ==asset loading breaks entirely==.\n\n## The fix, standard on every web build\nConfigure the asset plugin inside `DefaultPlugins.set(...)`: `AssetPlugin { meta_check: AssetMetaCheck::Never, ..default() }` — stop probing, load assets directly. This is still *not* the wasm default in 0.19, so write it every time.\n\n## Remote assets\nSince `bevy_web_asset` was upstreamed, the `http` and `https` cargo features let asset paths be full URLs via `WebAssetPlugin`, with an optional `web_asset_cache` filesystem cache. Handy — but mind that the cache ==never invalidates==.",
      },
    },
    {
      id: "shrink-the-binary",
      title: "Shrinking the Binary",
      content: {
        type: "read",
        markdown:
          'The `.wasm` file is the download every player pays for before the first frame. Debug builds are enormous; the shipping recipe below is what the official docs teach.\n\n## 1. A dedicated cargo profile\nThe quick-start guide recommends a `wasm-release` profile in `Cargo.toml`: it `inherits = "release"`, sets `opt-level = "z"` (smallest — or `"s"`, try both), and `strip = "debuginfo"`. Build with `cargo build --profile wasm-release --target wasm32-unknown-unknown`. Community-standard extras: `lto = "thin"` and `codegen-units = 1`.\n\n## 2. wasm-opt — after the bind step\nBinaryen\'s `wasm-opt` optimizes the binary itself, and it always runs on the ==output of wasm-bindgen==, never before it. From the official release-builds chapter:\n- `wasm-opt -Oz --strip-debug` — maximum size reduction, the usual pick\n- `wasm-opt -O3` — optimize for speed instead of size\n\nThe Bevy CLI runs wasm-opt automatically on `bevy build web --release`.\n\n## 3. Feature trimming\nBevy 0.19\'s ==feature profiles== make dependency dieting practical: the default set is the composite `2d` + `3d` + `ui` + `audio`. Declare `default-features = false` and list only what you use — a 2D effect gallery drops `3d` (and `audio` if it is silent) for a serious win. One trap: LUT-based tonemappers need the ==`tonemapping_luts`== feature — strip it while `Tonemapping::TonyMcMapface` (the default) is active and ==every frame renders pink==. Add the feature back or switch tonemapper.',
      },
    },
    {
      id: "ship-it-static",
      title: "Ship It: Static Hosting",
      content: {
        type: "read",
        markdown:
          "The finished build is nothing but files: `index.html`, the JS glue, the `.wasm`, and `assets/`. No server code, no runtime — which means ==any static host ships it==. GitHub Pages is exactly this model; the app you are reading this in deploys the same way.\n\n## One last browser rule: audio\nBrowsers enforce an ==autoplay policy==: an `AudioContext` cannot start producing sound before a ==user gesture==. The symptom is a game that runs perfectly but stays silent until the first click or tap. The fix is structural, not a workaround — gate audio (or the whole app start) behind a *tap to play* interaction; an HTML overlay button that starts or resumes audio is the standard pattern.\n\n## The launch checklist\n- canvas bound by selector; its parent explicitly sized\n- `AssetMetaCheck::Never` set; `assets/` deployed beside the bundle\n- `wasm-release` profile, then `wasm-opt -Oz --strip-debug` (or let `bevy build web --release` do both)\n- backend feature matches the audience — WebGL2 floor by default, an optional `webgpu` build behind `navigator.gpu` detection\n- audio gated behind a user gesture\n- test the ==deployed URL==, not just localhost — `.meta` behavior, MIME types, and path bases only fail in production shape",
      },
    },
    {
      id: "bindgen-version-rule",
      title: "wasm-bindgen's version rule",
      content: {
        type: "multiple-choice",
        question:
          "Your web build starts failing at the bind step right after `cargo update` bumps the `wasm-bindgen` crate. What does the wasm-bindgen CLI require?",
        options: [
          "Nothing — the CLI works with any crate version",
          "Its version must exactly match the wasm-bindgen crate version in your lockfile",
          "It must always be one version older than the crate",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "wasm-opt-order",
      title: "Where wasm-opt runs",
      content: {
        type: "multiple-choice",
        question: "In the release pipeline, at which point does `wasm-opt -Oz --strip-debug` run?",
        options: [
          "Before `cargo build`, on the Rust source",
          "Between `cargo build` and `wasm-bindgen`, on the raw `.wasm`",
          "After `wasm-bindgen`, on the `.wasm` it emitted",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "webgpu-overrides",
      title: "Enabling webgpu",
      content: {
        type: "multiple-choice",
        question:
          "You add the `webgpu` cargo feature to a Bevy wasm build. What happens to WebGL2 support in that artifact?",
        options: [
          "It is overridden — this build can only run in WebGPU browsers",
          "Both backends remain available and are picked at runtime",
          "WebGL2 stays as an automatic fallback when WebGPU is missing",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "compat-floor",
      title: "The compatibility floor",
      content: {
        type: "multiple-choice",
        question:
          "In mid-2026, which single graphics backend still reaches effectively every evergreen desktop *and* mobile browser?",
        options: ["WebGPU", "Vulkan", "WebGL2"],
        answerIndex: 2,
      },
    },
    {
      id: "fit-canvas-loop",
      title: "The growing canvas",
      content: {
        type: "multiple-choice",
        question:
          "With `fit_canvas_to_parent: true`, your embedded canvas grows a little more on every resize event. What is the cause?",
        options: [
          "wasm-opt stripped the resize handler from the binary",
          "The parent element sizes itself from its children, creating a feedback loop",
          "The browser tab ran out of GPU memory",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "meta-check-never",
      title: "Silencing .meta probes",
      content: {
        type: "multiple-choice",
        question:
          "This is the standard asset setup for a web build. What problem does `meta_check: AssetMetaCheck::Never` prevent?",
        language: "rust",
        code: `use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;

pub fn web_asset_plugin() -> AssetPlugin {
    AssetPlugin {
        meta_check: AssetMetaCheck::Never,
        ..default()
    }
}`,
        options: [
          "A `.meta` HTTP probe per asset — 404 spam, and a loading-breaking 403 on hosts like itch.io",
          "The browser caching assets too aggressively between deploys",
          "The `assets/` folder being bundled into the `.wasm` binary",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "pink-screen",
      title: "The pink screen",
      content: {
        type: "multiple-choice",
        question:
          "After trimming default features for binary size, every frame of your web build renders solid pink. What did you strip?",
        options: [
          "The `webgl2` feature",
          "The `2d` feature profile",
          "`tonemapping_luts`, while a LUT-based tonemapper like TonyMcMapface is active",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "audio-autoplay",
      title: "Sound on the web",
      content: {
        type: "multiple-choice",
        question:
          "Your deployed game runs perfectly but stays silent until the player clicks the page. Why?",
        options: [
          "The audio files failed to deploy alongside the `.wasm`",
          "Browser autoplay policy — an AudioContext cannot start before a user gesture",
          "GitHub Pages does not serve audio MIME types",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "canvas-window-config",
      title: "Write: bind to a canvas",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using `bevy::prelude::*`, write a function `pub fn browser_window_plugin() -> WindowPlugin` returning a `WindowPlugin` whose `primary_window` is `Some` `Window` bound to the existing `#bevy-canvas` element (via the `canvas` field and `.into()`) with `fit_canvas_to_parent` enabled. Fill everything else with `..default()`.",
        solution: `use bevy::prelude::*;

pub fn browser_window_plugin() -> WindowPlugin {
    WindowPlugin {
        primary_window: Some(Window {
            canvas: Some("#bevy-canvas".into()),
            fit_canvas_to_parent: true,
            ..default()
        }),
        ..default()
    }
}`,
      },
    },
  ],
  edges: [
    { from: "browser-build-pipeline", to: "backend-choice" },
    { from: "backend-choice", to: "browser-matrix" },
    { from: "browser-build-pipeline", to: "canvas-embedding" },
    { from: "browser-build-pipeline", to: "assets-over-http" },
    { from: "browser-build-pipeline", to: "shrink-the-binary" },
    { from: "backend-choice", to: "shrink-the-binary" },
    { from: "shrink-the-binary", to: "ship-it-static" },
    { from: "assets-over-http", to: "ship-it-static" },
    { from: "canvas-embedding", to: "ship-it-static" },
    { from: "browser-build-pipeline", to: "bindgen-version-rule" },
    { from: "browser-build-pipeline", to: "wasm-opt-order" },
    { from: "shrink-the-binary", to: "wasm-opt-order" },
    { from: "backend-choice", to: "webgpu-overrides" },
    { from: "browser-matrix", to: "compat-floor" },
    { from: "canvas-embedding", to: "fit-canvas-loop" },
    { from: "canvas-embedding", to: "canvas-window-config" },
    { from: "assets-over-http", to: "meta-check-never" },
    { from: "shrink-the-binary", to: "pink-screen" },
    { from: "ship-it-static", to: "audio-autoplay" },
  ],
};
