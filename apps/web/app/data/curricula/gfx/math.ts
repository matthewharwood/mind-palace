import type { Curriculum } from "@mind-palace/curriculum";

import { glamSource } from "./_sources";

// VFX Math from Zero — the math toolkit for 2D/3D effects work, motivated by
// VFX jobs at every step: the 0–1 habitat, vectors, dot product, trig & polar,
// interpolation, matrices, coordinate spaces, the glam toolbox, and color as
// vectors. Bare-rust drills are rustc-verified; glam drills are cargo-sandbox
// checked (glam 0.33) by scripts/verify-rust-cards.ts.
export const gfxMath: Curriculum = {
  id: "c-gfx-math",
  title: "VFX Math from Zero",
  source: glamSource,
  nodes: [
    {
      id: "math-map",
      title: "Math for VFX: The Map",
      content: {
        type: "read",
        markdown:
          "Every effect you will build — fireballs, ice crystals, healing sparkles — is driven by a small toolkit of math. This curriculum teaches exactly that toolkit and nothing more, and every concept arrives with the VFX job it does.\n\n## Numbers are knobs\nGraphics code rarely cares about big numbers. It cares about **ratios**: how far through the effect are we, how bright, how transparent. All of those live in the ==0 to 1 range== — the shader's native habitat. `0.0` means none/start/black, `1.0` means all/end/full, and `0.35` means 35% of the way. Percentages, alpha, texture coordinates, color channels: all of them are 0–1 values wearing different hats.\n\n## Functions are pictures\nA function like `f(x)` is a machine: value in, value out. Feed it every x from 0 to 1, plot the outputs, and you get a **curve** — and that curve is the *shape* of your effect over time. A straight ramp fades linearly; an S-curve eases in and out; a spike flashes. Learning VFX math is largely learning to ==see functions as pictures==.\n\n## What you will NOT need\nRelax — the scary parts of math class are explicitly out of scope:\n\n- **No eigenvectors or eigenvalues** — beautiful, and irrelevant to VFX\n- **No hand-inverted matrices** — the library's `.inverse()` does that job\n- **No physics-solver math** — rigid bodies, constraint solvers, and fluids belong to a different specialty\n\nIf you can add, multiply, and read a graph, everything ahead of you is learnable.",
      },
    },
    {
      id: "vectors-arrows-points",
      title: "Vectors: Arrows & Points",
      content: {
        type: "read",
        markdown:
          'A ==vector== is a small bundle of numbers — `(3, 4)` — with two equally true readings:\n\n- **A point**: *where* something is. The spark sits at `(3, 4)`.\n- **An arrow**: a *movement* — go 3 right and 4 up from wherever you stand.\n\nThe same type plays both roles, and VFX code switches between the readings constantly.\n\n## Adding applies an offset\n`position + velocity` means "start at the point, move along the arrow." It works component by component: `(3, 4) + (1, 0) = (4, 4)`. Every particle system in existence is this one line, run once per particle per frame.\n\n## Subtracting builds the arrow between points\n`target - position` is ==the arrow FROM position TO target== — the single most-used vector trick in gameplay and VFX. Want a homing spark? Every frame, step a little way along `target - position`.\n\n## Scaling stretches\nMultiplying by a plain number (a **scalar**) stretches the arrow: `velocity * 2.0` doubles the speed, `velocity * 0.5` halves it, and `velocity * -1.0` reverses it. The direction line is preserved — only the magnitude changes.',
      },
    },
    {
      id: "length-distance-normalize",
      title: "Length, Distance & Normalize",
      content: {
        type: "read",
        markdown:
          '## Length is Pythagoras\nAn arrow `(x, y)` forms a right triangle with its horizontal and vertical parts, so its ==length== is `sqrt(x*x + y*y)`. The arrow `(3, 4)` has length 5 — the classic 3-4-5 triangle, and the example worth memorizing.\n\n## Distance is the length of a difference\nThere is no separate distance formula to learn: the distance between two points is the **length of the arrow between them** — `length(b - a)`. "Is the player inside the blast radius?" is just `length(player - blast_center) < radius`.\n\n- Performance habit: a compare-only check never needs the square root — compare `length_squared` against `radius * radius` instead.\n\n## Normalize: direction without speed\nDividing a vector by its own length produces a ==unit vector== — length exactly 1, same direction. That operation is `normalize`. Why care? A unit direction is a *clean steering wheel*: multiply it by any speed and you travel at exactly that speed. The homing spark becomes `normalize(target - position) * speed`.\n\n## The zero-vector trap\nNormalizing `(0, 0)` divides by zero and yields NaN — which on screen looks like a ==vanishing or teleporting particle==. Whenever the two points can coincide, use a guarded version; glam ships `normalize_or_zero` for exactly this.',
      },
    },
    {
      id: "dot-product",
      title: "Dot Product: How Aligned?",
      content: {
        type: "read",
        markdown:
          'The ==dot product== collapses two vectors into ONE number that answers: *how aligned are they?* The formula is tiny — multiply matching components and sum: `dot(a, b) = a.x * b.x + a.y * b.y`.\n\n## Reading the number\nFor **unit vectors** the dot is the cosine of the angle between them, so it lands in −1…1:\n\n- `1.0` — perfectly aligned, same direction\n- `0.0` — ==perpendicular== (90° apart)\n- `-1.0` — exactly opposite\n\nIt is an *alignment meter*: an angle test that never computes an angle.\n\n## Facing checks\nIs the enemy looking at the player? `dot(facing, normalize(player - enemy)) > 0.9` reads as "within a narrow forward cone." Sneak-behind mechanics, backstab bonuses, and camera cone checks are all this one comparison.\n\n## The lighting formula\nThe most famous dot in graphics: surface brightness is ==N·L== — the surface normal dotted with the direction to the light. Faces aimed at the light get 1, faces edge-on get 0. When you write shaders later, `dot(N, L)` is the first lighting model you will build.\n\n## Projection intuition\nWith a unit `b`, `dot(a, b)` also reads as "how much of `a` points along `b`" — the shadow `a` casts onto `b`\'s line. That is how you extract the forward part of a velocity, or slide movement along a wall.',
      },
    },
    {
      id: "trig-polar",
      title: "Sin, Cos & the Circle",
      content: {
        type: "read",
        markdown:
          'Forget triangles — for VFX, ==sin and cos are circle coordinates==. Walk an angle θ around a circle of radius 1 and you are standing at the point `(cos(θ), sin(θ))`. Cos is the x, sin is the y. That is the entire secret.\n\n## Radians\nGraphics code measures angles in **radians**: one full turn is ==2π ≈ 6.283==, a half turn is π, a quarter turn is π/2. Rust converts with `.to_radians()`, and every glam and WGSL function expects radians — degrees exist only at the UI edge.\n\n## Waves: sin(time)\nFeed a steadily growing number — time! — into sin and out comes a value oscillating forever between −1 and 1: a free ==wave generator==. A pulsing glow is `sin(t) * 0.5 + 0.5` (remapped into the 0–1 habitat). A slower pulse is `sin(t * 0.5)`. A bobbing pickup adds the wave to its y position.\n\n## Polar coordinates\nInstead of `(x, y)`, describe a point by `(radius, angle)` — *how far, which way*. Convert back with `x = r * cos(θ)` and `y = r * sin(θ)`. Radial bursts fall out instantly: to fire `n` sparks evenly in every direction, give spark `i` the angle `i / n * 2π` and convert to a velocity.\n\n## atan2 goes back\n`y.atan2(x)` recovers the angle of a vector — the reverse trip. Pointing a sprite along its velocity, or asking "what angle is the player from me?", is an `atan2` call.',
      },
    },
    {
      id: "lerp-inverse-remap",
      title: "Lerp, Inverse Lerp & Remap",
      content: {
        type: "read",
        markdown:
          '==Lerp== — linear interpolation — is the single most-used function in VFX: `lerp(a, b, t) = a + (b - a) * t`. It slides from `a` (at `t = 0`) to `b` (at `t = 1`). The magic is the ==t knob==: one 0–1 number that positions you anywhere along the a→b journey.\n\n## What lerp moves\nAnything made of numbers: positions (a spark gliding to its target), scale (a grow-in), alpha (a fade-out), colors (yellow cooling to red — shaders call the same function `mix`). Drive `t` with time and you have animation.\n\n## Inverse lerp asks the opposite question\nLerp answers "given `t`, what value?" **Inverse lerp** answers "given a value, what `t`?": `inverse_lerp(a, b, v) = (v - a) / (b - a)`. An enemy at 350 health on a 0–500 bar sits at `t = 0.7` — instantly usable as the bar\'s fill amount.\n\n## Remap: the two glued together\n==Remap== converts a value from one range into another: inverse-lerp out of the input range, then lerp into the output range. "Distance 0–200 should become glow intensity 1–0" is a single remap. Half of all shader tuning is remapping ranges.\n\n## Clamp guards the habitat\nA `t` outside 0–1 overshoots the journey (extrapolation). `clamp(t, 0.0, 1.0)` pins it — shaders call the 0–1 case ==saturate==. Habit: clamp at the boundary of every remap unless you *want* the overshoot.',
      },
    },
    {
      id: "smoothstep-easing",
      title: "Step, Smoothstep & Easing",
      content: {
        type: "read",
        markdown:
          "Linear motion looks robotic. The fix is to bend the ==t knob== through a shaping curve before you lerp — that is all easing is.\n\n## Step: the hard cut\n`step(edge, x)` returns 0 below the edge and 1 at or above it. Instant on/off: threshold masks, hard boundaries. As a picture, it is a cliff.\n\n## Smoothstep: the S-curve\n==Smoothstep== eases from 0 to 1 with **zero slope at both ends**: clamp `t` into 0–1, then apply `t * t * (3.0 - 2.0 * t)`. Motion starts gently, cruises, and lands gently. In shaders `smoothstep(a, b, x)` is everywhere — most famously as the ==antialiased edge==: where `step` would cut pixel-hard, smoothstep fades across a hair-thin band.\n\n## Easing families\nEase curves give motion *personality* — easings.net catalogs the standard set:\n\n- **Sine / quad / cubic / expo** — progressively sharper ease-in (starts slow) and ease-out (ends slow)\n- **Back** — overshoots the target, then returns: a cartoony pop\n- **Elastic** — springs past and oscillates before settling\n- **Bounce** — falls and rebounds like a dropped ball\n\nEach family comes as `in`, `out`, and `inOut` variants, depending on which end gets the gentleness.\n\n## The VFX grammar\nRule of thumb: ==impacts ease OUT== (arrive fast, settle slow) and ==anticipation eases IN== (wind up slowly, release fast). An ease-out scale-in plus an ease-in fade-out is already a competent hit-spark.",
      },
    },
    {
      id: "integrate-vs-tween",
      title: "Two Ways to Move: Integrate vs Tween",
      content: {
        type: "read",
        markdown:
          "There are exactly two mental models for making something move, and every animation system you will ever meet is one of them.\n\n## Model 1: Integrate — you control velocity\n`position += velocity * dt` — the particle line. You decide the *velocity*, and position simply **emerges** from accumulating it frame by frame. Physics-flavored and open-ended: perfect for sparks, debris, and anything that flies free with no promised destination.\n\n## Model 2: Tween — you control the destination\n`position = start + (end - start) * easing(elapsed / duration)` — the animation line. Three moves, always the same:\n\n- `elapsed += dt` — real time accumulates\n- `progress = elapsed / duration` — time normalized into the ==0–1 habitat==\n- `easing(progress)` — the curve reshapes the ride, then a plain lerp places the point\n\nYou decide *where it ends and what curve it rides*; arrival on time is **guaranteed by construction**.\n\n## The punchline: velocity becomes a side effect\nTween a point from `(0, 0)` to `(4, 4)` over 4 seconds with ease-in `progress * progress`, then watch the per-second movement: it covers `0.25` units in the first second, then `0.75`, then `1.25`, then `1.75`. Nobody set a velocity anywhere — ==the easing curve IS the velocity profile==. Linear easing is constant velocity, ease-in is accelerating, ease-out is braking.\n\n## Choosing between them\n- **Tween** when the END is the promise: UI motion, spell wind-ups, a projectile that must arrive on the beat\n- **Integrate** when the JOURNEY is the point: particles, drifting smoke, knockback — anything steered per-frame by forces or homing\n\nBig effects mix both: the fireball *tweens* to its target on a curve while its trailing embers *integrate* outward.",
      },
    },
    {
      id: "matrices-basis",
      title: "Matrices: Where Basis Lands",
      content: {
        type: "read",
        markdown:
          "A matrix looks like a grid of numbers. The reading that makes it click: ==its columns are where the basis arrows land==.\n\n## Basis vectors\nAll of 2D space is spanned by two arrows: `(1, 0)` (the x arrow) and `(0, 1)` (the y arrow). Any transform that keeps the grid regular is fully described by where those two arrows end up — and a 2×2 matrix simply *stores the two landing spots as its columns*.\n\n## Rotation, decoded\nRotate by angle θ and the x arrow lands at `(cos θ, sin θ)` — a point on the circle! — while the y arrow lands a quarter turn further at `(-sin θ, cos θ)`. Stack those as columns and you have THE 2D rotation matrix. Nothing to memorize: rebuild it from the circle picture whenever you forget.\n\n## Composition runs right to left\nMultiplying matrices chains transforms, and with **column vectors** (the glam and WGSL convention) the matrix ==nearest the vector runs first==: `T * R * S * v` scales, then rotates, then translates. That ==TRS order== is the standard recipe for placing anything in a scene.\n\n## Translation needs one more dimension\nA 2×2 matrix always maps the origin to the origin — it can spin and stretch but never *move*. The fix: add one coordinate (`w = 1` for points, `w = 0` for directions) so translation becomes a matrix column too — `Mat3` for 2D, ==Mat4== for 3D. You will never fill one in by hand; constructors like `from_scale_rotation_translation` exist for exactly that.\n\n## Determinant, the one intuition\nThe determinant is the transform's **area scale factor**, and a negative sign means a mirror flip. That is ALL you need — no cofactor expansions, ever.",
      },
    },
    {
      id: "coordinate-spaces",
      title: "The Coordinate-Space Journey",
      content: {
        type: "read",
        markdown:
          '"Which space am I in?" is the most valuable debugging question in graphics. The same point has different numbers in each space, and nearly every glitched effect is secretly ==a point in the wrong space==.\n\n## The journey\nA vertex travels a fixed pipeline of spaces, each hop one matrix multiply:\n\n- **Model space** — coordinates relative to the mesh\'s own origin ("the sword tip is at +1 along the blade")\n- **World space** — after the model matrix (a TRS!) places it in the scene\n- **View space** — after the view matrix re-expresses everything relative to the camera\n- **Clip space** — after the projection matrix applies perspective\n- **NDC** — normalized device coordinates: the visible screen as ==−1…+1== in x and y (wgpu: y points up, z runs 0…1)\n- **Screen space** — actual pixels, `(0, 0)` in a corner\n\n`projection * view * model` — right to left, model first — is the classic vertex-shader line you will meet in every tutorial.\n\n## UV space\nTextures bring their own space: ==UV coordinates==, 0–1 across the image regardless of resolution. `(0.5, 0.5)` is always the center. Fragment shaders live and breathe UV space — most 2D effects are literally *functions of uv*.\n\n## The remap reflex\nHopping between spaces at the shader level is often a plain remap: NDC −1…+1 to UV 0–1 is `uv = ndc * 0.5 + 0.5`. Aspect ratio is a space bug too — a "circle" in UV space renders as an ellipse on a widescreen until you multiply x by the aspect ratio.',
      },
    },
    {
      id: "glam-toolbox",
      title: "The glam Toolbox",
      content: {
        type: "read",
        markdown:
          "Everything you built by hand lives in ==glam== — the math crate Bevy uses — with the same shapes and names you will meet again in WGSL.\n\n## The types that matter\n- `Vec2`, `Vec3`, `Vec4` — float vectors, via `Vec2::new(x, y)` or the `vec2(x, y)` helper\n- `Mat4` — the 3D transform workhorse\n- `Affine2` — the right type for ==2D TRS== (cheaper than a full Mat4)\n- `Quat` — a rotation *value*. Use it, don't math it: `Quat::from_rotation_z(angle)` in, `slerp` to blend between two, and never compose Euler angles by hand\n\nThe f64 and integer variants (`DVec3`, `IVec2`, …) exist but are skippable for VFX.\n\n## The methods you already understand\n`.length()`, `.length_squared()`, `.distance(other)`, `.normalize()` — and the safe `.normalize_or_zero()` — plus `.dot(other)` and `.lerp(other, t)`: every drill you wrote, as a method. Swizzles like `.xy()` mirror shader habits.\n\n## Conventions to burn in\n- ==Column vectors==: transforming is `matrix * vector`, never the reverse\n- Composition runs ==right to left== — `translate * rotate * scale`\n- ==Radians everywhere== — `.to_radians()` at the door\n- These are the same conventions as WGSL's `mat4x4<f32> * vec4<f32>` — one mental model on CPU and GPU\n\n## Construction helpers\n`Mat4::IDENTITY`, `Mat4::from_translation(v)`, `Mat4::from_rotation_z(angle)`, `Mat4::from_scale(v)` — and the one-liner that replaces hand-multiplication: ==`Mat4::from_scale_rotation_translation(s, r, t)`==, with the 2D sibling `Affine2::from_scale_angle_translation`. Points go through `mat.transform_point3(p)`.\n\n## One flag for later\nThe `bytemuck` feature lets vectors and matrices be viewed as raw bytes — how CPU-side math gets uploaded into GPU uniform buffers. File it away for the wgpu chapters.",
      },
    },
    {
      id: "color-as-vectors",
      title: "Color Is a Vector",
      content: {
        type: "read",
        markdown:
          "A color IS a vector: `(r, g, b)`, each channel a 0–1 value. Every vector tool you now own works on colors.\n\n## Mixing is lerp\nBlending two colors is a per-channel lerp — WGSL literally names the function `mix`. A fireball cooling from yellow to deep red is `mix(red, yellow, heat)` driven by a 0–1 heat value. Tinting is multiplication: `color * 0.2` darkens, and multiplying by a warm tint color shifts the hue.\n\n## The sRGB trap\nHere is the classic beginner ambush: the 0–1 values stored in images and sent to screens are ==gamma-encoded (sRGB)==, not linear light. Your eye is far more sensitive to dark shades, so sRGB spends more of its number range on them. Consequence: the stored value `0.5` — which *looks* mid-gray — represents only about ==21% of white's physical light==. Mid-gray isn't half the light; it merely *encodes* as 0.5.\n\n## Why you should care\nMath done directly on sRGB values is math on a bent scale — gradients go muddy and dark in the middle, and additive glows band. The fix is the pipeline's job: engines (Bevy included) ==decode to linear, do the math in linear, and re-encode for the screen==. Your rule: always know which side of that boundary your numbers are on.\n\n## A pointer to glow\nIn a linear HDR pipeline nothing caps channels at 1.0. A channel of 4.0 means \"four times brighter than white\" — the headroom that bloom turns into ==glow==. You will exploit exactly this in the Bevy VFX curriculum.",
      },
    },
    {
      id: "zero-one-habitat",
      title: "The 0–1 habitat",
      content: {
        type: "multiple-choice",
        question:
          "An effect's `progress` value reads `0.35` in the 0–1 habitat. What does that mean?",
        options: [
          "0.35 seconds have elapsed",
          "The effect is 35% of the way from start to finish",
          "The effect has 0.35 pixels left to travel",
        ],
        answerIndex: 1,
      },
    },
    {
      id: "vector-length-output",
      title: "Vector length check",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let (x, y) = (3.0_f32, 4.0_f32);
    let length = (x * x + y * y).sqrt();
    println!("{length}");
}`,
        options: ["7", "5", "25"],
        answerIndex: 1,
      },
    },
    {
      id: "dot-sign",
      title: "Reading the dot's sign",
      content: {
        type: "multiple-choice",
        question:
          "`facing` and `to_player` are unit vectors, and `facing.dot(to_player)` comes back negative. Where is the player?",
        options: [
          "Exactly perpendicular to the enemy",
          "Directly ahead of the enemy",
          "Behind the enemy — the angle between them is more than 90°",
        ],
        answerIndex: 2,
      },
    },
    {
      id: "radians-turn",
      title: "One full turn",
      content: {
        type: "multiple-choice",
        question: "In radians, how big is one full turn around the circle?",
        options: ["2π, roughly 6.283", "π, roughly 3.142", "360"],
        answerIndex: 0,
      },
    },
    {
      id: "lerp-output",
      title: "Lerp check",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

fn main() {
    println!("{}", lerp(2.0, 10.0, 0.5));
}`,
        options: ["8", "12", "6"],
        answerIndex: 2,
      },
    },
    {
      id: "smoothstep-edges",
      title: "Smoothstep at the edges",
      content: {
        type: "multiple-choice",
        question: "Compared with a plain linear ramp, what does `smoothstep` do at its two edges?",
        options: [
          "Its slope is zero at both edges, so the transition eases in and eases out",
          "It overshoots past the target and springs back",
          "It cuts instantly from 0 to 1 with no in-between",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "tween-position-output",
      title: "Where is the tween at t = 2?",
      content: {
        type: "multiple-choice",
        question: "What does this program print?",
        language: "rust",
        code: `fn main() {
    let (start, end) = ((0.0_f32, 0.0_f32), (4.0_f32, 4.0_f32));
    let (elapsed, duration) = (2.0_f32, 4.0_f32);
    let progress = elapsed / duration;
    let eased = progress * progress;
    let x = start.0 + (end.0 - start.0) * eased;
    let y = start.1 + (end.1 - start.1) * eased;
    println!("({x}, {y})");
}`,
        options: ["(2, 2)", "(1, 1)", "(0.25, 0.25)"],
        answerIndex: 1,
      },
    },
    {
      id: "trs-order",
      title: "TRS order",
      content: {
        type: "multiple-choice",
        question:
          "With column vectors (`matrix * vector`), which product scales a point first, then rotates it, then translates it?",
        options: ["S * R * T", "T * R * S", "R * S * T"],
        answerIndex: 1,
      },
    },
    {
      id: "space-ranges",
      title: "Which space is −1…+1?",
      content: {
        type: "multiple-choice",
        question:
          "Which coordinate space spans −1 to +1 in both x and y, with `(0, 0)` at the center of the screen?",
        options: ["UV space", "Screen space", "NDC — normalized device coordinates"],
        answerIndex: 2,
      },
    },
    {
      id: "glam-convention",
      title: "glam conventions",
      content: {
        type: "multiple-choice",
        question:
          "glam and WGSL both use column vectors. In `translate * rotate * scale * v`, which transform applies to `v` first?",
        options: [
          "The scale — composition reads right to left",
          "The translate — composition reads left to right",
          "All three apply simultaneously, so order is irrelevant",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "srgb-midgray",
      title: "The sRGB trap",
      content: {
        type: "multiple-choice",
        question:
          "The sRGB value `0.5` looks like mid-gray on screen. Roughly how much *physical* light does it represent, relative to white?",
        options: ["Exactly 50%", "About 21%", "About 73%"],
        answerIndex: 1,
      },
    },
    {
      id: "write-normalize",
      title: "Write: normalize",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn length(x: f32, y: f32) -> f32` using the Pythagorean theorem (`.sqrt()`), then `pub fn normalize(x: f32, y: f32) -> (f32, f32)` that divides both components by that length.",
        solution: `pub fn length(x: f32, y: f32) -> f32 {
    (x * x + y * y).sqrt()
}

pub fn normalize(x: f32, y: f32) -> (f32, f32) {
    let len = length(x, y);
    (x / len, y / len)
}`,
      },
    },
    {
      id: "write-dot",
      title: "Write: dot",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn dot(ax: f32, ay: f32, bx: f32, by: f32) -> f32` returning the 2D dot product: matching components multiplied, then summed.",
        solution: `pub fn dot(ax: f32, ay: f32, bx: f32, by: f32) -> f32 {
    ax * bx + ay * by
}`,
      },
    },
    {
      id: "write-polar",
      title: "Write: polar → cartesian",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn polar_to_cartesian(radius: f32, angle: f32) -> (f32, f32)` converting polar coordinates to a point: x is `radius * angle.cos()`, y is `radius * angle.sin()`.",
        solution: `pub fn polar_to_cartesian(radius: f32, angle: f32) -> (f32, f32) {
    (radius * angle.cos(), radius * angle.sin())
}`,
      },
    },
    {
      id: "write-lerp",
      title: "Write: lerp",
      content: {
        type: "code",
        language: "rust",
        prompt: "Write `pub fn lerp(a: f32, b: f32, t: f32) -> f32` returning `a + (b - a) * t`.",
        solution: `pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}`,
      },
    },
    {
      id: "write-remap",
      title: "Write: inverse_lerp + remap",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn inverse_lerp(a: f32, b: f32, v: f32) -> f32` returning `(v - a) / (b - a)`, then `pub fn remap(v: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32` that inverse-lerps `v` out of the input range and lerps the result into the output range.",
        solution: `pub fn inverse_lerp(a: f32, b: f32, v: f32) -> f32 {
    (v - a) / (b - a)
}

pub fn remap(v: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32 {
    let t = inverse_lerp(in_min, in_max, v);
    out_min + (out_max - out_min) * t
}`,
      },
    },
    {
      id: "write-smoothstep",
      title: "Write: smoothstep",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32`: inverse-lerp `x` between the edges, `.clamp(0.0, 1.0)` the result into `t`, then return `t * t * (3.0 - 2.0 * t)`.",
        solution: `pub fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = ((x - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}`,
      },
    },
    {
      id: "write-rotate-point",
      title: "Write: rotate a point",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Write `pub fn rotate_point(x: f32, y: f32, angle: f32) -> (f32, f32)` rotating the point about the origin: with `let (sin, cos) = angle.sin_cos();`, return `(x * cos - y * sin, x * sin + y * cos)`.",
        solution: `pub fn rotate_point(x: f32, y: f32, angle: f32) -> (f32, f32) {
    let (sin, cos) = angle.sin_cos();
    (x * cos - y * sin, x * sin + y * cos)
}`,
      },
    },
    {
      id: "glam-lerp-normalize",
      title: "glam: lerp & normalize",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using glam, write `pub fn spark_step(position: Vec2, target: Vec2, t: f32) -> Vec2` returning the lerp of `position` toward `target`, and `pub fn aim_direction(from: Vec2, to: Vec2) -> Vec2` returning the safe unit vector from `from` to `to` via `normalize_or_zero`. Start with `use glam::Vec2;`.",
        solution: `use glam::Vec2;

pub fn spark_step(position: Vec2, target: Vec2, t: f32) -> Vec2 {
    position.lerp(target, t)
}

pub fn aim_direction(from: Vec2, to: Vec2) -> Vec2 {
    (to - from).normalize_or_zero()
}`,
      },
    },
    {
      id: "glam-trs",
      title: "glam: TRS transforms",
      content: {
        type: "code",
        language: "rust",
        prompt:
          "Using glam, write `pub fn sprite_transform(scale: f32, angle: f32, position: Vec2) -> Affine2` via `Affine2::from_scale_angle_translation` (splat the scale), and `pub fn world_matrix(scale: Vec3, rotation: Quat, translation: Vec3) -> Mat4` via `Mat4::from_scale_rotation_translation`. Import the types from `glam`.",
        solution: `use glam::{Affine2, Mat4, Quat, Vec2, Vec3};

pub fn sprite_transform(scale: f32, angle: f32, position: Vec2) -> Affine2 {
    Affine2::from_scale_angle_translation(Vec2::splat(scale), angle, position)
}

pub fn world_matrix(scale: Vec3, rotation: Quat, translation: Vec3) -> Mat4 {
    Mat4::from_scale_rotation_translation(scale, rotation, translation)
}`,
      },
    },
  ],
  edges: [
    // Concept spine
    { from: "math-map", to: "vectors-arrows-points" },
    { from: "vectors-arrows-points", to: "length-distance-normalize" },
    { from: "length-distance-normalize", to: "dot-product" },
    { from: "vectors-arrows-points", to: "trig-polar" },
    { from: "math-map", to: "lerp-inverse-remap" },
    { from: "vectors-arrows-points", to: "lerp-inverse-remap" },
    { from: "lerp-inverse-remap", to: "smoothstep-easing" },
    { from: "trig-polar", to: "matrices-basis" },
    { from: "matrices-basis", to: "coordinate-spaces" },
    { from: "lerp-inverse-remap", to: "coordinate-spaces" },
    { from: "dot-product", to: "glam-toolbox" },
    { from: "matrices-basis", to: "glam-toolbox" },
    { from: "lerp-inverse-remap", to: "glam-toolbox" },
    { from: "vectors-arrows-points", to: "color-as-vectors" },
    { from: "lerp-inverse-remap", to: "color-as-vectors" },
    // Drills
    { from: "math-map", to: "zero-one-habitat" },
    { from: "length-distance-normalize", to: "vector-length-output" },
    { from: "length-distance-normalize", to: "write-normalize" },
    { from: "dot-product", to: "dot-sign" },
    { from: "dot-product", to: "write-dot" },
    { from: "trig-polar", to: "radians-turn" },
    { from: "trig-polar", to: "write-polar" },
    { from: "lerp-inverse-remap", to: "lerp-output" },
    { from: "lerp-inverse-remap", to: "write-lerp" },
    { from: "write-lerp", to: "write-remap" },
    { from: "smoothstep-easing", to: "smoothstep-edges" },
    { from: "smoothstep-easing", to: "write-smoothstep" },
    { from: "vectors-arrows-points", to: "integrate-vs-tween" },
    { from: "smoothstep-easing", to: "integrate-vs-tween" },
    { from: "integrate-vs-tween", to: "tween-position-output" },
    { from: "write-remap", to: "write-smoothstep" },
    { from: "matrices-basis", to: "trs-order" },
    { from: "matrices-basis", to: "write-rotate-point" },
    { from: "write-polar", to: "write-rotate-point" },
    { from: "coordinate-spaces", to: "space-ranges" },
    { from: "glam-toolbox", to: "glam-convention" },
    { from: "glam-toolbox", to: "glam-lerp-normalize" },
    { from: "write-lerp", to: "glam-lerp-normalize" },
    { from: "write-normalize", to: "glam-lerp-normalize" },
    { from: "glam-toolbox", to: "glam-trs" },
    { from: "write-rotate-point", to: "glam-trs" },
    { from: "color-as-vectors", to: "srgb-midgray" },
  ],
};
