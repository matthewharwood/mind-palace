import type { Curriculum, LearningPath, Source } from "@mind-palace/curriculum";

const interactiveLinearAlgebraSource = {
  kind: "github-repo",
  url: "https://github.com/QBobWatson/ila",
  ref: "master",
} satisfies Source;

const threeBlueOneBrownSource = {
  kind: "github-repo",
  url: "https://github.com/3b1b/videos",
  ref: "master",
} satisfies Source;

const bevySource = {
  kind: "github-repo",
  url: "https://github.com/bevyengine/bevy",
  ref: "v0.19.0",
} satisfies Source;

export const linearAlgebraFoundations: Curriculum = {
  id: "c-la-foundations",
  title: "Linear Algebra from Zero",
  source: interactiveLinearAlgebraSource,
  nodes: [
    {
      id: "why-linear-algebra",
      title: "Why Linear Algebra Is the Map",
      content: {
        type: "read",
        markdown: [
          "Linear algebra is the math of ==moving and describing space==. If algebra asks for the unknown number, linear algebra asks what happens when a whole grid of points is moved by one rule.",
          "## The picture first",
          "A 2D point is a pair like `(3, 2)`. A 3D point is a triple like `(3, 2, 5)`. Linear algebra turns those coordinate lists into objects you can reason about: arrows, planes, rotations, projections, camera views, and object transforms.",
          "## The promise",
          "By the end of this path you should be able to look at a cube in a 3D scene and say: this is its position vector, this is its basis, this matrix places it, this quaternion rotates it, and this camera transform views it.",
          "## The rule of the path",
          "Never memorize a symbol before you can say what it does to space. Every new idea gets two readings: the algebra reading and the geometry reading.",
        ].join("\n\n"),
      },
    },
    {
      id: "coordinates-and-functions",
      title: "Coordinates and Functions",
      content: {
        type: "read",
        markdown: [
          "A coordinate is an address. In 2D, `(x, y)` means move `x` steps along the horizontal axis and `y` steps along the vertical axis. In 3D, `(x, y, z)` adds one more independent direction.",
          "## Points versus rules",
          "A point is one address. A function is a rule that takes an address and returns a new address. Linear algebra studies a special class of functions that move every point in space in a regular way.",
          "## Composition",
          "When you do one function after another, you compose them. This matters because rotations compose too. Rotate a cube around X, then around Y, and you usually do not get the same orientation as Y then X.",
          "## Inverses",
          "An inverse is an undo button. If a transform moves a point from `a` to `b`, the inverse transform moves `b` back to `a`. Cameras, coordinate conversions, and rotations all rely on this idea.",
        ].join("\n\n"),
      },
    },
    {
      id: "vectors-arrows",
      title: "Vectors Are Arrows",
      content: {
        type: "read",
        markdown: [
          "A ==vector== is an arrow described by numbers. `(3, 4)` means go 3 units in X and 4 units in Y. The same pair of numbers can also name a point, but the arrow reading is the one that unlocks movement.",
          "## Add vectors to move",
          "If a cube is at `(1, 2, 0)` and you add `(3, 0, 0)`, the cube moves three units along X. Vector addition is component-by-component movement.",
          "## Subtract points to aim",
          "`target - position` gives the vector from the current position to the target. That one subtraction powers steering, camera look directions, and distance checks.",
          "## Scale vectors to change length",
          "Multiplying by a number stretches or reverses the arrow. `2 * v` keeps the same direction but doubles the length. `-v` points exactly backward.",
        ].join("\n\n"),
      },
    },
    {
      id: "length-and-unit-vectors",
      title: "Length and Unit Vectors",
      content: {
        type: "read",
        markdown: [
          "The length of a vector is its physical arrow length. For `(3, 4)`, the length is `5` because `3 * 3 + 4 * 4 = 25`, and the square root of 25 is 5.",
          "## Distance is length after subtraction",
          "The distance between two points is the length of `b - a`. There is no separate idea to memorize.",
          "## Normalize",
          "A ==unit vector== has length 1. Normalizing an arrow keeps its direction but removes its size. This is useful because direction and speed should often be separate.",
          "## Zero-vector warning",
          "The vector `(0, 0, 0)` has no direction. Do not normalize it. In game code, normalizing zero often produces invalid numbers that spread through transforms.",
        ].join("\n\n"),
      },
    },
    {
      id: "linear-combinations",
      title: "Linear Combinations and Basis",
      content: {
        type: "read",
        markdown: [
          "A ==linear combination== is a recipe made from scaled vectors added together. `(3, 2)` really means `3 * x_basis + 2 * y_basis`.",
          "## Basis vectors",
          "The default 2D basis is usually `(1, 0)` and `(0, 1)`. The default 3D basis is usually `(1, 0, 0)`, `(0, 1, 0)`, and `(0, 0, 1)`. These basis vectors define the coordinate language.",
          "## Span",
          "The span of some vectors is every place you can reach by combining them. Two non-parallel vectors span a plane. Three independent vectors span 3D space.",
          "## Why this matters for 3D engines",
          "An object's local right, up, and forward directions are a basis. Rotating the object means changing where those local basis vectors point in world space.",
        ].join("\n\n"),
      },
    },
    {
      id: "dot-and-cross",
      title: "Dot Product and Cross Product",
      content: {
        type: "read",
        markdown: [
          "The dot product and cross product are the two vector tools that make 3D rotations readable.",
          "## Dot product",
          "The ==dot product== measures alignment. For unit vectors, a dot of `1` means same direction, `0` means perpendicular, and `-1` means opposite direction.",
          "## Projection",
          "Dot product also answers: how much of vector `a` points along vector `b`? That is why it appears in lighting, aiming cones, and camera math.",
          "## Cross product",
          "The ==cross product== takes two 3D vectors and returns a third vector perpendicular to both. Its direction follows the right-hand rule.",
          "## Rotation connection",
          "Quaternions combine dot-like and cross-like behavior. If dot says how aligned two directions are, cross says which perpendicular axis twists one toward the other.",
        ].join("\n\n"),
      },
    },
    {
      id: "matrices-as-transforms",
      title: "Matrices Are Transform Rules",
      content: {
        type: "read",
        markdown: [
          "A matrix is not just a table of numbers. The useful reading is: a matrix stores where the basis vectors land after a transform.",
          "## Columns as landing spots",
          "In a 2D matrix, the first column tells where `(1, 0)` goes. The second column tells where `(0, 1)` goes. Once you know where the basis goes, you know where every vector goes.",
          "## Matrix-vector multiplication",
          "Multiplying a matrix by a vector applies the transform. If the matrix rotates the basis, then every vector written in that basis rotates too.",
          "## 3D version",
          "A 3D rotation matrix stores three transformed basis vectors: right, up, and forward. That is why the columns of a clean rotation matrix are unit length and perpendicular.",
        ].join("\n\n"),
      },
    },
    {
      id: "composition-and-determinant",
      title: "Composition and Determinant",
      content: {
        type: "read",
        markdown: [
          "Matrix multiplication composes transforms. If `A` and `B` are transforms, then `A * B * v` applies `B` to `v` first, then applies `A` to the result.",
          "## Order matters",
          "Scale then rotate is not always the same as rotate then scale. This is the matrix version of the rotation-order problem you will meet again with quaternions.",
          "## Determinant",
          "The determinant is the area or volume scale factor of a transform. A determinant of `2` doubles area in 2D. A determinant of `0` means some direction got flattened away.",
          "## Orientation",
          "A negative determinant means the transform flipped handedness, like a mirror. Pure rotations keep determinant `1`: they move space without stretching, flattening, or flipping it.",
        ].join("\n\n"),
      },
    },
    {
      id: "inverse-and-subspaces",
      title: "Inverses and Subspaces",
      content: {
        type: "read",
        markdown: [
          "An inverse matrix undoes a transform. If `A * v = w`, then `A_inverse * w = v`. Not every matrix has an inverse.",
          "## Why some transforms cannot be undone",
          "If a transform flattens 3D space onto a plane, many different input points land on the same output point. Once that information is gone, no inverse can recover it.",
          "## Column space",
          "The ==column space== is everything the transform can reach. If a matrix maps 3D into a plane, its column space is that plane.",
          "## Null space",
          "The ==null space== is every direction erased to zero. If a transform crushes vertical height, the vertical direction belongs to the null space.",
        ].join("\n\n"),
      },
    },
    {
      id: "eigenvectors-and-change-of-basis",
      title: "Eigenvectors and Change of Basis",
      content: {
        type: "read",
        markdown: [
          "An ==eigenvector== is a vector whose direction survives a transform. The transform may stretch it or shrink it, but it does not turn it away from its line.",
          "## Rotation axis",
          "For a 3D rotation, the axis of rotation is special: points on that axis do not swing around the axis. That makes the axis a natural eigenvector of the rotation.",
          "## Change of basis",
          "Changing basis means describing the same vector in a different coordinate language. The physical arrow does not move; only its numbers change.",
          "## Blender and Bevy connection",
          "When you convert between Blender's Z-up world and Bevy's Y-up world, you are changing coordinate language. The object did not become a different object; its axes are being renamed and reoriented.",
        ].join("\n\n"),
      },
    },
    {
      id: "unit-vector-check",
      title: "Unit Vector Check",
      content: {
        type: "multiple-choice",
        question: "What makes a vector a unit vector?",
        options: [
          "It has length exactly 1",
          "All of its components are either 0 or 1",
          "It starts at the origin",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "basis-recipe-check",
      title: "Basis Recipe Check",
      content: {
        type: "multiple-choice",
        question: "In the default 2D basis, what does `(3, 2)` mean?",
        options: [
          "Three copies of the x basis plus two copies of the y basis",
          "A vector with length 5",
          "A rotation by 3 radians followed by a scale of 2",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "matrix-columns-check",
      title: "Matrix Columns Check",
      content: {
        type: "multiple-choice",
        question: "Geometrically, what do the columns of a transform matrix usually tell you?",
        options: [
          "Where the basis vectors land",
          "How many points are in the scene",
          "Only the translation of the object",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "determinant-zero-check",
      title: "Determinant Zero Check",
      content: {
        type: "multiple-choice",
        question: "What does determinant `0` mean geometrically?",
        options: [
          "The transform preserves all distances",
          "The transform flattened space and cannot be fully undone",
          "The transform is a pure rotation",
        ],
        answerIndex: 1,
      },
    },
  ],
  edges: [
    { from: "why-linear-algebra", to: "coordinates-and-functions" },
    { from: "coordinates-and-functions", to: "vectors-arrows" },
    { from: "vectors-arrows", to: "length-and-unit-vectors" },
    { from: "length-and-unit-vectors", to: "unit-vector-check" },
    { from: "vectors-arrows", to: "linear-combinations" },
    { from: "linear-combinations", to: "basis-recipe-check" },
    { from: "linear-combinations", to: "dot-and-cross" },
    { from: "dot-and-cross", to: "matrices-as-transforms" },
    { from: "matrices-as-transforms", to: "matrix-columns-check" },
    { from: "matrices-as-transforms", to: "composition-and-determinant" },
    { from: "composition-and-determinant", to: "determinant-zero-check" },
    { from: "composition-and-determinant", to: "inverse-and-subspaces" },
    { from: "inverse-and-subspaces", to: "eigenvectors-and-change-of-basis" },
  ],
};

export const rotationFoundations: Curriculum = {
  id: "c-la-rotations",
  title: "Rotations Before Quaternions",
  source: threeBlueOneBrownSource,
  nodes: [
    {
      id: "rotation-map",
      title: "The Rotation Map",
      content: {
        type: "read",
        markdown: [
          "A rotation is a transform that keeps lengths and angles the same while changing direction. It is rigid motion around a fixed origin or pivot.",
          "## Before quaternions",
          "You need four stepping stones before quaternions make sense: 2D rotation matrices, complex numbers as 2D rotation, 3D rotation matrices, and axis-angle rotation.",
          "## The core problem",
          "3D rotations are hard because there are three independent ways to turn, and the order of those turns matters. Quaternions do not remove that reality; they encode it cleanly.",
        ].join("\n\n"),
      },
    },
    {
      id: "radians-and-unit-circle",
      title: "Radians and the Unit Circle",
      content: {
        type: "read",
        markdown: [
          "Rotations in code usually use radians. A full turn is `2 * pi`, a half turn is `pi`, and a quarter turn is `pi / 2`.",
          "## Cos and sin as coordinates",
          "On the unit circle, an angle `t` points to `(cos(t), sin(t))`. This is the cleanest way to remember 2D rotation.",
          "## Direction",
          "Positive rotation direction depends on the coordinate system. In a standard right-handed XY plane, positive rotation turns counterclockwise.",
        ].join("\n\n"),
      },
    },
    {
      id: "two-d-rotation-matrix",
      title: "2D Rotation Matrix",
      content: {
        type: "read",
        markdown: [
          "A 2D rotation matrix is built by asking where the basis vectors land after the rotation.",
          "## The x basis",
          "The vector `(1, 0)` rotates to `(cos(t), sin(t))`.",
          "## The y basis",
          "The vector `(0, 1)` starts a quarter turn ahead, so it rotates to `(-sin(t), cos(t))`.",
          "## The matrix",
          "Put those landing spots into columns and you get the standard 2D rotation matrix. This is not magic; it is just the basis-landing rule from the matrix lesson.",
        ].join("\n\n"),
      },
    },
    {
      id: "complex-rotation",
      title: "Complex Numbers as 2D Rotation",
      content: {
        type: "read",
        markdown: [
          "A complex number `a + bi` can be read as a 2D point `(a, b)`. Multiplying by a unit complex number rotates without changing length.",
          "## The special number i",
          "Multiplying by `i` rotates the plane by 90 degrees. That is the first hint that number systems can encode geometry.",
          "## Euler's formula as a rotation package",
          "`cos(t) + i sin(t)` is the complex number sitting at angle `t` on the unit circle. Multiplying by it applies a 2D rotation by `t`.",
          "## Quaternion preview",
          "Quaternions generalize this trick. They are not just four random numbers; they are a way to package 3D rotation the way unit complex numbers package 2D rotation.",
        ].join("\n\n"),
      },
    },
    {
      id: "three-d-rotation-matrices",
      title: "3D Rotation Matrices",
      content: {
        type: "read",
        markdown: [
          "In 3D, a rotation matrix stores where the object's local right, up, and forward basis vectors land.",
          "## Axis rotations",
          "A rotation around X keeps the X axis fixed and turns Y and Z around it. A rotation around Y keeps Y fixed. A rotation around Z keeps Z fixed.",
          "## Clean rotation matrices",
          "The three basis columns of a pure rotation matrix stay unit length and perpendicular. That means the matrix preserves shape instead of stretching the object.",
          "## Drift",
          "Repeated numerical operations can make a matrix slightly less clean. Quaternions are often easier to normalize back into a valid rotation.",
        ].join("\n\n"),
      },
    },
    {
      id: "euler-order-and-gimbal-lock",
      title: "Euler Angles and Gimbal Lock",
      content: {
        type: "read",
        markdown: [
          "Euler angles describe orientation as a sequence of rotations around named axes, often called pitch, yaw, and roll.",
          "## Order is part of the meaning",
          "`rotate X, then Y, then Z` is not the same instruction as `rotate Z, then Y, then X`. The order is not bookkeeping; it changes the final orientation.",
          "## Gimbal lock",
          "Gimbal lock happens when two of the rotation axes line up, so one degree of freedom is lost. The controls still have three numbers, but two numbers now turn around the same physical axis.",
          "## Practical lesson",
          "Euler angles are useful for UI and simple controls. They are a poor internal representation for accumulated 3D orientation.",
        ].join("\n\n"),
      },
    },
    {
      id: "axis-angle",
      title: "Axis-Angle Rotation",
      content: {
        type: "read",
        markdown: [
          "Axis-angle says every 3D rotation can be described by one unit axis and one angle.",
          "## The axis",
          "The axis is the line that stays fixed while everything else turns around it. It must be a direction, so use a unit vector.",
          "## The angle",
          "The angle tells how far to rotate around that axis, following the right-hand rule in a right-handed coordinate system.",
          "## Why this is the bridge",
          "A rotation quaternion is built directly from axis-angle: unit axis plus half-angle sine and cosine. If axis-angle is clear, the quaternion formula becomes much less mysterious.",
        ].join("\n\n"),
      },
    },
    {
      id: "orientation-vs-vector",
      title: "Orientation Versus Vector",
      content: {
        type: "read",
        markdown: [
          "A vector points somewhere. An orientation tells how an entire local coordinate frame is turned.",
          "## One arrow is not enough",
          "Knowing an object's forward direction does not fully determine its orientation. The object can still roll around that forward axis.",
          "## A full basis",
          "Orientation means right, up, and forward together. A matrix stores all three directly. A quaternion stores the same orientation more compactly as a rotation from the identity orientation.",
          "## Camera intuition",
          "A camera has a position, a forward direction, and an up direction. The forward direction aims it; the up direction controls its roll.",
        ].join("\n\n"),
      },
    },
    {
      id: "why-quaternions-next",
      title: "Why Quaternions Come Next",
      content: {
        type: "read",
        markdown: [
          "Quaternions are worth learning because they solve practical rotation problems with fewer failure modes than Euler angles.",
          "## What they are good at",
          "They compose rotations, store orientation compactly, avoid gimbal lock as a storage representation, normalize cleanly, and interpolate smoothly with slerp.",
          "## What they are not",
          "They are not a replacement for understanding axes, basis, or coordinate systems. A quaternion still represents a rotation in a coordinate system, so the coordinate system has to be understood first.",
        ].join("\n\n"),
      },
    },
    {
      id: "radians-check",
      title: "Radians Check",
      content: {
        type: "multiple-choice",
        question: "How many radians are in one full turn?",
        options: ["2 * pi", "pi / 2", "360 * pi"],
        answerIndex: 0,
      },
    },
    {
      id: "rotation-order-check",
      title: "Rotation Order Check",
      content: {
        type: "multiple-choice",
        question: "Why does rotation order matter in 3D?",
        options: [
          "Because rotating around one axis changes the frame used by later rotations",
          "Because rotations always stretch the object",
          "Because only the Z axis can rotate in 3D",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "axis-angle-check",
      title: "Axis-Angle Check",
      content: {
        type: "multiple-choice",
        question: "What two ingredients define an axis-angle rotation?",
        options: [
          "A unit axis and an angle",
          "A position and a scale",
          "A determinant and a null space",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    { from: "rotation-map", to: "radians-and-unit-circle" },
    { from: "radians-and-unit-circle", to: "radians-check" },
    { from: "radians-and-unit-circle", to: "two-d-rotation-matrix" },
    { from: "two-d-rotation-matrix", to: "complex-rotation" },
    { from: "complex-rotation", to: "three-d-rotation-matrices" },
    { from: "three-d-rotation-matrices", to: "euler-order-and-gimbal-lock" },
    { from: "euler-order-and-gimbal-lock", to: "rotation-order-check" },
    { from: "three-d-rotation-matrices", to: "axis-angle" },
    { from: "axis-angle", to: "axis-angle-check" },
    { from: "axis-angle", to: "orientation-vs-vector" },
    { from: "orientation-vs-vector", to: "why-quaternions-next" },
  ],
};

export const quaternionDeepDive: Curriculum = {
  id: "c-la-quaternions",
  title: "Quaternions for 3D Space",
  source: threeBlueOneBrownSource,
  nodes: [
    {
      id: "quaternion-anatomy",
      title: "Quaternion Anatomy",
      content: {
        type: "read",
        markdown: [
          "A quaternion has four components: `q = w + xi + yj + zk`. In engine code you will often see it stored as `(x, y, z, w)` or `(w, x, y, z)` depending on the API.",
          "## Scalar and vector parts",
          "`w` is the scalar part. `(x, y, z)` is the vector part. For rotation quaternions, the vector part points along the rotation axis, scaled by a sine value.",
          "## Not a 4D position",
          "For 3D rotation work, do not think of a quaternion as a normal 4D point first. Think of it as a rotation package: scalar part plus axis-like vector part.",
        ].join("\n\n"),
      },
    },
    {
      id: "multiplication-rules",
      title: "Multiplication Rules",
      content: {
        type: "read",
        markdown: [
          "Quaternion units follow `i * i = j * j = k * k = -1`, but unlike ordinary numbers, multiplication order matters.",
          "## The cycle",
          "`i * j = k`, `j * k = i`, and `k * i = j`. Reverse the order and the sign flips: `j * i = -k`.",
          "## Why non-commutative is good",
          "3D rotations are non-commutative too. Turning a book around X and then Y does not match Y then X. Quaternion multiplication has the same order-sensitive behavior, which is why it can model rotation composition.",
        ].join("\n\n"),
      },
    },
    {
      id: "unit-quaternions",
      title: "Unit Quaternions",
      content: {
        type: "read",
        markdown: [
          "A rotation quaternion must have length 1. These are called ==unit quaternions==.",
          "## Length in four components",
          "The length is computed from all four parts: `sqrt(w*w + x*x + y*y + z*z)`.",
          "## Normalize to repair drift",
          "Small floating-point errors can slowly push a quaternion away from length 1. Normalizing brings it back to a valid rotation.",
          "## Identity rotation",
          "The identity rotation is no turn at all. As a quaternion, that is usually `(x=0, y=0, z=0, w=1)` in engine APIs that store vector part first.",
        ].join("\n\n"),
      },
    },
    {
      id: "axis-angle-to-quaternion",
      title: "Axis-Angle to Quaternion",
      content: {
        type: "read",
        markdown: [
          "The axis-angle formula is the first formula to own:",
          "```text\nq.w = cos(angle / 2)\nq.xyz = unit_axis * sin(angle / 2)\n```",
          "## Why half the angle appears",
          "The vector rotation formula uses the quaternion on both sides of the vector: `q * v * q_inverse`. The two-sided action means the quaternion stores a half-angle so the final vector rotates by the full angle.",
          "## Memory hook",
          "The axis lives in `xyz`. The amount of turn is split between `sin(angle / 2)` and `cos(angle / 2)`.",
        ].join("\n\n"),
      },
    },
    {
      id: "pure-vector-quaternion",
      title: "Vectors as Pure Quaternions",
      content: {
        type: "read",
        markdown: [
          "To rotate a 3D vector with quaternion algebra, first treat the vector as a quaternion with scalar part zero: `v = 0 + xi + yj + zk`.",
          "## Pure quaternion",
          "This is called a pure quaternion because it has no scalar part. It is still representing a 3D vector, not a 4D position.",
          "## The sandwich",
          "The rotation is `v_rotated = q * v * q_inverse`. This is often called conjugation or the sandwich product.",
          "## Unit inverse",
          "For a unit quaternion, the inverse is just the conjugate: keep `w`, negate `x`, `y`, and `z`.",
        ].join("\n\n"),
      },
    },
    {
      id: "what-the-sandwich-does",
      title: "What the Sandwich Product Does",
      content: {
        type: "read",
        markdown: [
          "`q * v * q_inverse` rotates the vector while keeping its length unchanged.",
          "## The left and right actions",
          "Multiplying only on one side would mix the vector out of ordinary 3D space. Multiplying by the inverse on the other side brings the result back to a pure vector quaternion.",
          "## Geometric reading",
          "The axis part of `q` says which line to spin around. The angle part says how far. The sandwich product applies that spin to the vector.",
          "## Engine shortcut",
          "Engines hide the sandwich. In Bevy/glam you can write `rotation * vector`, and the library applies the equivalent rotation operation for you.",
        ].join("\n\n"),
      },
    },
    {
      id: "composition",
      title: "Composing Quaternion Rotations",
      content: {
        type: "read",
        markdown: [
          "Multiplying two rotation quaternions composes their rotations into one rotation.",
          "## Read the API convention",
          "Different documentation may describe multiplication order differently. In practice, always check the engine convention by rotating a simple basis vector and seeing where it lands.",
          "## Order still matters",
          "`a * b` and `b * a` usually produce different orientations. Quaternions do not make rotation commutative; they make order-sensitive rotation compact and stable.",
        ].join("\n\n"),
      },
    },
    {
      id: "matrix-equivalence",
      title: "Quaternion and Matrix Equivalence",
      content: {
        type: "read",
        markdown: [
          "A unit quaternion and a 3D rotation matrix can represent the same orientation.",
          "## Why store quaternions",
          "Quaternions use four numbers instead of nine, normalize easily, and interpolate well.",
          "## Why matrices still appear",
          "Rendering pipelines need matrices because scale, rotation, translation, camera view, and projection combine naturally as matrix multiplication.",
          "## Practical model",
          "Store orientation as a quaternion. Convert to a matrix when building the final transform sent to rendering.",
        ].join("\n\n"),
      },
    },
    {
      id: "slerp",
      title: "Slerp",
      content: {
        type: "read",
        markdown: [
          "Slerp means spherical linear interpolation. It blends between two unit quaternions by moving along the shortest arc on the unit-quaternion sphere.",
          "## Why not plain lerp",
          "Linearly interpolating quaternion components can leave the unit sphere and produce uneven rotation speed unless normalized carefully.",
          "## Where it matters",
          "Camera turns, character aim offsets, smooth object orientation, and animation blending all use this idea.",
        ].join("\n\n"),
      },
    },
    {
      id: "double-cover",
      title: "The Double Cover",
      content: {
        type: "read",
        markdown: [
          "A strange but important fact: `q` and `-q` represent the same 3D rotation.",
          "## Why this shows up",
          "The quaternion lives on a 4D unit sphere, and opposite points on that sphere can encode the same physical orientation.",
          "## Practical consequence",
          "When interpolating, libraries often choose the sign that gives the shortest path. If you compare quaternions directly, remember that opposite signs can still mean the same rotation.",
        ].join("\n\n"),
      },
    },
    {
      id: "unit-quaternion-check",
      title: "Unit Quaternion Check",
      content: {
        type: "multiple-choice",
        question: "What property must a quaternion have to represent a pure rotation?",
        options: ["Length 1", "All components positive", "A zero scalar part"],
        answerIndex: 0,
      },
    },
    {
      id: "half-angle-check",
      title: "Half-Angle Check",
      content: {
        type: "multiple-choice",
        question:
          "In `q.w = cos(angle / 2)` and `q.xyz = axis * sin(angle / 2)`, why is the angle halved?",
        options: [
          "Because vector rotation uses the quaternion on both sides of the vector",
          "Because radians must always be divided by two",
          "Because the axis vector has three components",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "sandwich-check",
      title: "Sandwich Product Check",
      content: {
        type: "multiple-choice",
        question:
          "What does `q * v * q_inverse` do when `q` is a unit rotation quaternion and `v` is a pure vector quaternion?",
        options: [
          "It rotates the vector by the rotation encoded in q",
          "It translates the vector by q's scalar part",
          "It scales the vector by q's x component",
        ],
        answerIndex: 0,
      },
    },
    {
      id: "double-cover-check",
      title: "Double Cover Check",
      content: {
        type: "multiple-choice",
        question: "What is true about `q` and `-q` for rotation quaternions?",
        options: [
          "They represent the same 3D rotation",
          "They always represent opposite rotations",
          "Only q is valid; -q is invalid",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    { from: "quaternion-anatomy", to: "multiplication-rules" },
    { from: "multiplication-rules", to: "unit-quaternions" },
    { from: "unit-quaternions", to: "unit-quaternion-check" },
    { from: "unit-quaternions", to: "axis-angle-to-quaternion" },
    { from: "axis-angle-to-quaternion", to: "half-angle-check" },
    { from: "axis-angle-to-quaternion", to: "pure-vector-quaternion" },
    { from: "pure-vector-quaternion", to: "what-the-sandwich-does" },
    { from: "what-the-sandwich-does", to: "sandwich-check" },
    { from: "what-the-sandwich-does", to: "composition" },
    { from: "composition", to: "matrix-equivalence" },
    { from: "matrix-equivalence", to: "slerp" },
    { from: "slerp", to: "double-cover" },
    { from: "double-cover", to: "double-cover-check" },
  ],
};

export const bevyQuaternionPractice: Curriculum = {
  id: "c-la-bevy-quat",
  title: "Bevy Quaternion Practice",
  source: bevySource,
  nodes: [
    {
      id: "bevy-coordinate-frame",
      title: "Bevy's Coordinate Frame",
      content: {
        type: "read",
        markdown: [
          "Bevy uses a right-handed 3D coordinate system with Y as up. The useful beginner picture is: X is right, Y is up, and Z is depth.",
          "## Camera convention",
          "In common right-handed camera math, the camera looks along its local negative Z direction. That is why a camera placed at positive Z can look back toward the origin.",
          "## Do not mix questions",
          "There are two different questions: where are the world axes, and which way does this object or camera face? Keep those separate.",
        ].join("\n\n"),
      },
    },
    {
      id: "transform-rotation",
      title: "Transform Rotation",
      content: {
        type: "read",
        markdown: [
          "In Bevy, an entity's `Transform` stores translation, rotation, and scale. The rotation is a `Quat`.",
          "## Translation",
          "Translation answers: where is the entity?",
          "## Rotation",
          "Rotation answers: how is the entity's local basis turned relative to the parent or world?",
          "## Scale",
          "Scale answers: how large is the entity along its local axes?",
        ].join("\n\n"),
      },
    },
    {
      id: "from-axis-angle",
      title: "from_axis_angle",
      content: {
        type: "read",
        markdown: [
          "`Quat::from_axis_angle(axis, angle)` builds the rotation quaternion from the axis-angle idea.",
          "## Axis must be normalized",
          "The axis is a direction, not a size. Use a unit vector such as `Vec3::Y` or normalize your custom axis first.",
          "## Angle is radians",
          "The angle is in radians. Convert degrees at the edge with `.to_radians()` rather than mixing units inside your transform code.",
          "## Mental test",
          "If the axis is `Vec3::Y`, the object spins around the vertical axis. If the axis is `Vec3::X`, it pitches around the right axis.",
        ].join("\n\n"),
      },
    },
    {
      id: "quat-times-vec",
      title: "Quat Times Vec3",
      content: {
        type: "read",
        markdown: [
          "Bevy/glam lets you apply a rotation to a vector with `rotation * vector`.",
          "## Forward vector",
          "If a model's unrotated forward direction is known, multiply that initial direction by the current rotation to get the world-space forward direction.",
          "## Local basis",
          "The same trick gives right and up: rotate the local basis vectors by the entity rotation. This is the engine-code version of watching the basis arrows move.",
        ].join("\n\n"),
      },
    },
    {
      id: "local-vs-world",
      title: "Local Versus World Rotation",
      content: {
        type: "read",
        markdown: [
          "A local rotation turns around the object's own current axes. A world rotation turns around the world's fixed axes.",
          "## Why this matters",
          "After an object has already rotated, its local X axis may no longer match world X. A pitch in local space and a pitch in world space can visibly differ.",
          "## Debug habit",
          "Draw or imagine the object's local right, up, and forward arrows. Ask which set of arrows your next rotation is using.",
        ].join("\n\n"),
      },
    },
    {
      id: "camera-look-at",
      title: "Camera Look-At",
      content: {
        type: "read",
        markdown: [
          "A look-at camera is built from three ingredients: eye position, target position, and up direction.",
          "## Forward",
          "`target - eye` gives the direction from the camera to what it should look at.",
          "## Up",
          "The up vector controls roll. Without it, the camera can aim at the target but still spin around its own forward axis.",
          "## Quaternion result",
          "A look-at helper computes the orientation quaternion that turns the camera's local basis to match those directions.",
        ].join("\n\n"),
      },
    },
    {
      id: "blender-to-bevy",
      title: "Blender to Bevy",
      content: {
        type: "read",
        markdown: [
          "Blender is Z-up. Bevy is Y-up. That is the first conversion to visualize.",
          "## Keep X steady",
          "A useful mental conversion is: keep X as X, move Blender's Z-up into Bevy's Y-up, and map Blender's depth axis into Bevy's Z axis with the needed sign for your asset pipeline.",
          "## Separate mesh data and transform",
          "Sometimes import tools bake the axis conversion into mesh data. Sometimes you add a parent transform. Debug by drawing axes on the model, not by guessing.",
          "## Same cube test",
          "Put a cube at `(0, 0, 0)`, draw colored axes, rotate one axis at a time, and confirm which direction the visible face moves.",
        ].join("\n\n"),
      },
    },
    {
      id: "debug-checklist",
      title: "Rotation Debug Checklist",
      content: {
        type: "read",
        markdown: [
          "When 3D rotation feels wrong, debug in this order:",
          "## Checklist",
          "- Is the coordinate system Y-up or Z-up?",
          "- Is the axis normalized?",
          "- Is the angle in radians?",
          "- Are you rotating in local space or world space?",
          "- Are you composing rotations in the intended order?",
          "- Are you comparing quaternions directly even though `q` and `-q` can mean the same rotation?",
          "## One-axis test",
          "Before debugging a complex orientation, test one 90-degree rotation around a single world axis. If that fails, the problem is not quaternion theory; it is convention mismatch.",
        ].join("\n\n"),
      },
    },
    {
      id: "capstone-scene",
      title: "Capstone: Axis Lab",
      content: {
        type: "read",
        markdown: [
          "Build a small axis lab when you are ready to practice.",
          "## Scene",
          "Place a cube at the origin. Draw red X, green Y, and blue Z axes. Add a camera above and to the side looking at the cube.",
          "## Controls",
          "Add one control for axis-angle, one for Euler angles, and one for quaternion display. The goal is to see that different controls can describe the same final orientation.",
          "## Success condition",
          "You can predict the cube's local right, up, and forward directions before pressing the control.",
        ].join("\n\n"),
      },
    },
    {
      id: "bevy-up-axis-check",
      title: "Bevy Up Axis Check",
      content: {
        type: "multiple-choice",
        question: "In Bevy's default 3D world, which axis is up?",
        options: ["Y", "Z", "X"],
        answerIndex: 0,
      },
    },
    {
      id: "normalized-axis-check",
      title: "Normalized Axis Check",
      content: {
        type: "multiple-choice",
        question: "Why should an axis passed to `from_axis_angle` be normalized?",
        options: [
          "Because the axis should describe direction only, while the angle describes turn amount",
          "Because normalized axes always point upward",
          "Because radians only work with vectors longer than one",
        ],
        answerIndex: 0,
      },
    },
  ],
  edges: [
    { from: "bevy-coordinate-frame", to: "transform-rotation" },
    { from: "bevy-coordinate-frame", to: "bevy-up-axis-check" },
    { from: "transform-rotation", to: "from-axis-angle" },
    { from: "from-axis-angle", to: "normalized-axis-check" },
    { from: "from-axis-angle", to: "quat-times-vec" },
    { from: "quat-times-vec", to: "local-vs-world" },
    { from: "local-vs-world", to: "camera-look-at" },
    { from: "camera-look-at", to: "blender-to-bevy" },
    { from: "blender-to-bevy", to: "debug-checklist" },
    { from: "debug-checklist", to: "capstone-scene" },
  ],
};

export const linearAlgebraCurricula: Curriculum[] = [
  linearAlgebraFoundations,
  rotationFoundations,
  quaternionDeepDive,
  bevyQuaternionPractice,
];

export const linearAlgebraPath = {
  id: "p-linear-algebra",
  title: "Linear Algebra to Quaternions",
  nodes: linearAlgebraCurricula.map((c) => ({ curriculumId: c.id, title: c.title })),
  edges: [
    { from: "c-la-foundations", to: "c-la-rotations" },
    { from: "c-la-rotations", to: "c-la-quaternions" },
    { from: "c-la-quaternions", to: "c-la-bevy-quat" },
  ],
} satisfies LearningPath;
