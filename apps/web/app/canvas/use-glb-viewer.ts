// oxlint-disable react-doctor/exhaustive-deps -- `canvasRef` is a stable ref; reading
// `.current` inside the effect is the canonical ref-in-effect pattern and must NOT be a
// dependency (it would retrigger the whole Three lifecycle). The effect keys on
// `modelUrl` only. react-doctor runs oxlint with the same rule under the `react-doctor/`
// namespace, which the inline Biome suppression below can't reach — same split as
// `use-pixi-app.ts`.
import { type RefObject, useEffect } from "react";
import type * as ThreeTypes from "three";

// Three.js is a SIDE CHANNEL exactly like PixiJS/anime.js: it mutates the canvas
// outside React's reconciler, so every line lives in this `useEffect`, render stays
// pure, and the StrictMode double-mount is handled by the `cancelled` flag. Three is
// dynamically imported so it lands in its own chunk — the ~600 KB engine loads only
// when a 3D viewer actually mounts, never on the math/flashcard paths.
//
// Renderer: WebGPU when a real adapter is available (modern Safari/Chrome), else a
// classic WebGL2 renderer — the backend favoured for headless Playwright reliability
// (same reason `usePixiApp` defaults to `preference: "webgl"`).
//
// Ported from dean-n-dean's GLB monster viewer; generalized to a reusable hero/model
// viewer. The canvas is alpha (transparent) so the host owns the background.

const PRM = "(prefers-reduced-motion: reduce)";
const MAX_DPR = 2;
const TARGET_RADIUS = 1; // model bounding-sphere radius after normalization (scene units)

// Swallow a renderAsync rejection (e.g. the renderer was disposed mid-frame). Hoisted
// to module scope so it isn't a deeply nested inline arrow inside the effect.
const ignoreRenderRejection = (): undefined => undefined;

// Lazy-load the engine + loader chunks in parallel, from MODULE scope. The
// dynamic import() must live outside the hook: the React Compiler bails when it
// tries to lower an Import expression inside a compiled hook/component (react-
// doctor flags it as an error). A plain module-scope function isn't compiled, so
// the import is fine here — same pattern as `createRenderer` above.
function loadThreeAndLoader() {
  return Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js")]);
}

type GlbRenderer = {
  domElement: HTMLCanvasElement;
  toneMapping: number;
  toneMappingExposure: number;
  dispose(): void;
  render(scene: ThreeTypes.Scene, camera: ThreeTypes.Camera): unknown;
  renderAsync?(scene: ThreeTypes.Scene, camera: ThreeTypes.Camera): Promise<unknown>;
  setAnimationLoop(callback: (() => void) | null): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
};

async function createRenderer(
  three: typeof ThreeTypes,
  canvas: HTMLCanvasElement,
): Promise<{ renderer: GlbRenderer; isWebGPU: boolean }> {
  if (typeof navigator !== "undefined" && navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter().catch(() => null);
    if (adapter) {
      const webgpu = await import("three/webgpu");
      const renderer = new webgpu.WebGPURenderer({ alpha: true, antialias: true, canvas });
      const initialized = await renderer
        .init()
        .then(() => true)
        .catch(() => false);
      if (initialized) return { isWebGPU: true, renderer: renderer as unknown as GlbRenderer };
      renderer.dispose();
    }
  }
  return {
    isWebGPU: false,
    renderer: new three.WebGLRenderer({ alpha: true, antialias: true, canvas }) as GlbRenderer,
  };
}

function disposeSceneResources(scene: ThreeTypes.Scene): void {
  scene.traverse((object) => {
    const mesh = object as ThreeTypes.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const entry of material) entry.dispose();
    } else {
      material?.dispose();
    }
  });
}

export function useGlbViewer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  modelUrl: string,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `canvasRef` is a stable ref — reading `.current` must not retrigger the Three lifecycle; the effect keys on `modelUrl` only.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = typeof window !== "undefined" && window.matchMedia(PRM).matches;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void (async () => {
      const [three, { GLTFLoader }] = await loadThreeAndLoader();
      if (cancelled) return;

      const { renderer, isWebGPU } = await createRenderer(three, canvas);
      if (cancelled) {
        renderer.dispose();
        return;
      }

      const host = canvas.parentElement ?? canvas;
      const measure = () => ({
        height: host.clientHeight || 300,
        width: host.clientWidth || 240,
      });
      const initial = measure();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      renderer.setSize(initial.width, initial.height, false);
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(34, initial.width / initial.height, 0.1, 100);

      // ---- Hero studio lighting (cool base, warm key, cyan rim, soft fill) ----
      scene.add(new three.HemisphereLight(0xbfe6ff, 0x09131f, 0.55));
      const key = new three.DirectionalLight(0xfff2e0, 2.5);
      key.position.set(2.2, 3, 2.6);
      scene.add(key);
      const rim = new three.DirectionalLight(0x6fe9ff, 2.4);
      rim.position.set(-2.6, 1.6, -2.2);
      scene.add(rim);
      const fill = new three.DirectionalLight(0x9ab8ff, 0.7);
      fill.position.set(-1.6, -0.6, 2.2);
      scene.add(fill);
      const accent = new three.PointLight(0x3fffd0, 7, 9, 2);
      accent.position.set(0, 0.3, 1.6);
      scene.add(accent);

      // ---- Load + frame the model ----
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      if (cancelled) {
        renderer.dispose();
        return;
      }
      const model = gltf.scene;
      // Frame by the bounding SPHERE, not max-dimension: a sphere fills the view the
      // same regardless of which axis faces the camera, so any object sits at a
      // consistent on-screen size.
      const box = new three.Box3().setFromObject(model);
      const sphere = box.getBoundingSphere(new three.Sphere());
      const radius = sphere.radius || 1;
      model.position.sub(sphere.center);
      const pivot = new three.Group();
      pivot.scale.setScalar(TARGET_RADIUS / radius);
      pivot.add(model);
      scene.add(pivot);
      // DOM signal that the GLB loaded + entered the scene (testable; a WebGL
      // canvas's pixels aren't DOM-queryable).
      canvas.setAttribute("data-glb-loaded", "true");

      const verticalFov = (camera.fov * Math.PI) / 180;
      const distance = (TARGET_RADIUS / Math.sin(verticalFov / 2)) * 0.92;
      camera.position.set(0, TARGET_RADIUS * 0.12, distance);
      camera.lookAt(0, 0, 0);

      const clock = new three.Clock();
      // WebGPU compiles render pipelines lazily, so a synchronous `render()` before they
      // are ready paints a BLACK frame — drive WebGPU through `renderAsync`. WebGL renders
      // synchronously. `setAnimationLoop` is three's backend-agnostic frame driver.
      const renderFrame = () => {
        if (isWebGPU) {
          void renderer.renderAsync?.(scene, camera)?.catch(ignoreRenderRejection);
        } else {
          renderer.render(scene, camera);
        }
      };
      if (reducedMotion) {
        pivot.rotation.y = 0.6; // a flattering 3/4 resting angle for the static frame
        renderFrame();
      } else {
        renderer.setAnimationLoop(() => {
          if (cancelled) return;
          const t = clock.getElapsedTime();
          pivot.rotation.y = t * 0.5;
          pivot.position.y = Math.sin(t * 1.2) * 0.05;
          renderFrame();
        });
      }

      const resize = new ResizeObserver(() => {
        const next = measure();
        renderer.setSize(next.width, next.height, false);
        camera.aspect = next.width / next.height;
        camera.updateProjectionMatrix();
        if (reducedMotion) renderFrame();
      });
      resize.observe(host);

      dispose = () => {
        renderer.setAnimationLoop(null);
        resize.disconnect();
        disposeSceneResources(scene);
        renderer.dispose();
        canvas.removeAttribute("data-glb-loaded");
      };
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [modelUrl]);
}
