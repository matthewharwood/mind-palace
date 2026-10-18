import type * as Three from "three";
import * as z from "zod";

export const AvaSceneVariantSchema = z.enum(["symbol", "alternate", "word", "all"]);
export type AvaSceneVariant = z.infer<typeof AvaSceneVariantSchema>;
export const AvaSceneRuntimeSchema = z.object({
  turn: z.custom<(radians: number) => void>(),
  replay: z.custom<() => void>(),
  setTime: z.custom<(seconds: number) => void>(),
  setVariant: z.custom<(variant: AvaSceneVariant) => void>(),
  dispose: z.custom<() => void>(),
});
export type AvaSceneRuntime = z.infer<typeof AvaSceneRuntimeSchema>;

function loadEngine() {
  return Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/controls/OrbitControls.js"),
  ]);
}
function release(scene: Three.Object3D): void {
  scene.traverse((object) => {
    if (!("geometry" in object)) return;
    const mesh = object as Three.Mesh;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      material.dispose();
  });
}

// Shared by the live viewer and offline video renderer. The model is actual
// authored geometry; no image textures, plane cards, or remote assets are used.
export async function createAvaSceneRuntime(
  canvas: HTMLCanvasElement,
  modelUrl: string,
  variant: AvaSceneVariant,
  animate: boolean,
  signal: AbortSignal,
): Promise<AvaSceneRuntime> {
  const [[three, { GLTFLoader }, { OrbitControls }], response] = await Promise.all([
    loadEngine(),
    fetch(modelUrl, { signal }),
  ]);
  if (!response.ok) throw new Error(`Model could not load: ${response.status}`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "");
  if (signal.aborted) {
    release(gltf.scene);
    throw new Error("Scene was disposed while loading");
  }
  const host = canvas.parentElement ?? canvas;
  const renderer = new three.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = three.SRGBColorSpace;
  renderer.toneMapping = three.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = three.PCFShadowMap;
  const scene = new three.Scene();
  scene.add(new three.HemisphereLight(0xfff7e8, 0xb8a68c, 2.4));
  const key = new three.DirectionalLight(0xfff1d8, 3.2);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.001;
  scene.add(key);
  const fill = new three.DirectionalLight(0xd1e9ed, 1.2);
  fill.position.set(4, 2, -3);
  scene.add(fill);
  const model = gltf.scene;
  let meshes = 0;
  model.traverse((object) => {
    if (object.name.startsWith("variant_"))
      object.visible = object.name === `variant_${variant === "all" ? "symbol" : variant}`;
    if (object instanceof three.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      meshes++;
    }
  });
  const mixer = new three.AnimationMixer(model);
  for (const clip of gltf.animations) mixer.clipAction(clip).play();
  const bounds = new three.Box3();
  for (const time of gltf.animations.length ? [0, 0.5, 1, 1.5, 1.99] : [0]) {
    mixer.setTime(time);
    model.updateMatrixWorld(true);
    model.traverseVisible((object) => {
      if (object instanceof three.Mesh) bounds.union(new three.Box3().setFromObject(object));
    });
  }
  mixer.setTime(modelUrl.includes("/number-") ? 1.99 : 1);
  const center = bounds.getCenter(new three.Vector3());
  const size = bounds.getSize(new three.Vector3());
  const radius = Math.max(size.length() / 2, 0.5);
  const pivot = new three.Group();
  // Keep authored animation roots untouched: translating their parent preserves
  // every keyframe and the object-to-object relationships in spatial scenes.
  pivot.position.copy(center).multiplyScalar(-1);
  pivot.add(model);
  scene.add(pivot);
  const camera = new three.PerspectiveCamera(36, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI * 0.78;
  const ground = new three.Mesh(
    new three.PlaneGeometry(24, 24),
    new three.ShadowMaterial({ color: 0x89715c, opacity: 0.13 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -center.y - 0.015;
  ground.receiveShadow = true;
  scene.add(ground);
  const render = (): void => {
    renderer.render(scene, camera);
  };
  const resize = (): void => {
    const width = Math.max(1, host.clientWidth || 480),
      height = Math.max(1, host.clientHeight || 480);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const limitingFov = Math.min(Math.PI / 10, Math.atan(Math.tan(Math.PI / 10) * camera.aspect));
    const distance = (radius / Math.sin(limitingFov)) * 1.04;
    camera.position.set(distance * 0.28, distance * 0.16, distance * 0.95);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  };
  resize();
  controls.addEventListener("change", render);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const timer = new three.Timer();
  timer.connect(document);
  if (animate)
    renderer.setAnimationLoop(() => {
      timer.update();
      mixer.update(Math.min(timer.getDelta(), 0.05));
      render();
    });
  canvas.dataset.avaSceneReady = "true";
  canvas.dataset.avaSceneMeshes = String(meshes);
  canvas.dataset.avaSceneAnimation = String(gltf.animations.length);
  let disposed = false;
  return {
    turn(radians) {
      camera.position.applyAxisAngle(new three.Vector3(0, 1, 0), radians);
      controls.update();
      render();
    },
    replay() {
      mixer.setTime(animate ? 0 : (mixer.time + 0.5) % 2);
      render();
    },
    setVariant(nextVariant) {
      model.traverse((object) => {
        if (object.name.startsWith("variant_"))
          object.visible =
            object.name === `variant_${nextVariant === "all" ? "symbol" : nextVariant}`;
      });
      render();
    },
    setTime(seconds) {
      mixer.setTime(seconds);
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      timer.dispose();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      release(scene);
      renderer.dispose();
      delete canvas.dataset.avaSceneReady;
    },
  };
}
