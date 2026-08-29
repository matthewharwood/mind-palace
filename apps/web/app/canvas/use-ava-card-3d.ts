// oxlint-disable react-doctor/exhaustive-deps -- `canvasRef` is a stable ref; reading
// `.current` inside the effect is the canonical ref-in-effect pattern and must not
// restart the Three lifecycle. The effect keys on the primitive input fields.
import {
  type AvaShapeColor,
  AvaShapeColorSchema,
  type AvaShapeKind,
  AvaShapeKindSchema,
} from "@mind-palace/schemas";
import { type RefObject, useEffect, useState } from "react";
import type * as ThreeTypes from "three";
import * as z from "zod";

import { useMediaQuery } from "~/lib/use-media-query";

export const AvaCard3DInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("shape"),
    shape: AvaShapeKindSchema,
    color: AvaShapeColorSchema,
  }),
  z.object({
    kind: z.literal("picture"),
    imageUrl: z.string().min(1),
  }),
]);
export type AvaCard3DInput = z.infer<typeof AvaCard3DInputSchema>;

export const AvaCard3DStatusSchema = z.enum(["loading", "ready", "error"]);
export type AvaCard3DStatus = z.infer<typeof AvaCard3DStatusSchema>;

const PRM = "(prefers-reduced-motion: reduce)";
const MAX_DPR = 2;
const DEFAULT_SIZE = 320;
const SHAPE_DEPTH = 0.28;

const SHAPE_COLORS: Record<AvaShapeColor, number> = {
  colorless: 0xfff8e7,
  red: 0xff5d67,
  orange: 0xffa43a,
  yellow: 0xffdc52,
  green: 0x59c987,
  blue: 0x55a8ff,
  purple: 0x9a7cff,
  pink: 0xff85bd,
};

// Keep the dynamic import outside the compiled hook. Besides preserving render
// purity, this leaves Three in a lazy chunk that only loads when 3D mode mounts.
function loadThree() {
  return import("three");
}

function measureHost(host: HTMLElement): { height: number; width: number } {
  return {
    height: Math.max(1, Math.round(host.clientHeight || DEFAULT_SIZE)),
    width: Math.max(1, Math.round(host.clientWidth || DEFAULT_SIZE)),
  };
}

function observeHostResize(host: HTMLElement, onResize: () => void): () => void {
  const observer = new ResizeObserver(onResize);
  observer.observe(host);
  return () => observer.disconnect();
}

function createShapePath(three: typeof ThreeTypes, kind: AvaShapeKind): ThreeTypes.Shape {
  const path = new three.Shape();

  if (kind === "circle") {
    path.absellipse(0, 0, 0.94, 0.94, 0, Math.PI * 2, false, 0);
    return path;
  }
  if (kind === "oval") {
    path.absellipse(0, 0, 1.08, 0.68, 0, Math.PI * 2, false, 0);
    return path;
  }
  if (kind === "square") {
    path.moveTo(-0.82, -0.82);
    path.lineTo(0.82, -0.82);
    path.lineTo(0.82, 0.82);
    path.lineTo(-0.82, 0.82);
    path.closePath();
    return path;
  }
  if (kind === "rhombus") {
    path.moveTo(0, 1.02);
    path.lineTo(0.82, 0);
    path.lineTo(0, -1.02);
    path.lineTo(-0.82, 0);
    path.closePath();
    return path;
  }

  path.moveTo(0, 1);
  path.lineTo(0.94, -0.76);
  path.lineTo(-0.94, -0.76);
  path.closePath();
  return path;
}

function createShapeSubject(
  three: typeof ThreeTypes,
  kind: AvaShapeKind,
  color: AvaShapeColor,
): ThreeTypes.Group {
  const geometry = new three.ExtrudeGeometry(createShapePath(three, kind), {
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.075,
    bevelThickness: 0.075,
    curveSegments: 48,
    depth: SHAPE_DEPTH,
    steps: 1,
  });
  geometry.center();

  const material = new three.MeshPhysicalMaterial({
    clearcoat: 0.16,
    clearcoatRoughness: 0.48,
    color: SHAPE_COLORS[color],
    metalness: 0,
    roughness: 0.46,
  });
  const mesh = new three.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new three.Group();
  group.add(mesh);
  return group;
}

function readTextureAspect(texture: ThreeTypes.Texture): number {
  const source: unknown = texture.source.data;
  if (!source || typeof source !== "object") return 1;

  let width: unknown = 1;
  if ("naturalWidth" in source) width = source.naturalWidth;
  else if ("width" in source) width = source.width;

  let height: unknown = 1;
  if ("naturalHeight" in source) height = source.naturalHeight;
  else if ("height" in source) height = source.height;
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
    return 1;
  }

  return Math.min(1.7, Math.max(0.6, width / height));
}

function createPictureSubject(
  three: typeof ThreeTypes,
  texture: ThreeTypes.Texture,
): ThreeTypes.Group {
  const aspect = readTextureAspect(texture);
  const faceWidth = aspect >= 1 ? 1.94 : 1.94 * aspect;
  const faceHeight = aspect >= 1 ? 1.94 / aspect : 1.94;
  const frameWidth = faceWidth + 0.18;
  const frameHeight = faceHeight + 0.18;

  const frame = new three.Mesh(
    new three.BoxGeometry(frameWidth, frameHeight, 0.16, 4, 4, 1),
    new three.MeshPhysicalMaterial({
      clearcoat: 0.12,
      color: 0xffe8c7,
      metalness: 0,
      roughness: 0.54,
    }),
  );
  frame.castShadow = true;
  frame.receiveShadow = true;

  const picture = new three.Mesh(
    new three.PlaneGeometry(faceWidth, faceHeight),
    new three.MeshStandardMaterial({ map: texture, metalness: 0, roughness: 0.52 }),
  );
  picture.position.z = 0.081;
  picture.receiveShadow = true;

  const group = new three.Group();
  group.add(frame, picture);
  return group;
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

// Three.js is a side channel: callers render the canvas, while this hook owns
// every scene-graph mutation and WebGL lifecycle operation from an effect.
export function useAvaCard3D(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  input: AvaCard3DInput,
): AvaCard3DStatus {
  const kind = input.kind;
  const shape = input.kind === "shape" ? input.shape : undefined;
  const color = input.kind === "shape" ? input.color : undefined;
  const imageUrl = input.kind === "picture" ? input.imageUrl : undefined;
  const reducedMotion = useMediaQuery(PRM);
  const [status, setStatus] = useState<AvaCard3DStatus>("loading");

  // biome-ignore lint/correctness/useExhaustiveDependencies: `canvasRef` is stable; the lifecycle is keyed by the discriminated input's primitive fields.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus("loading");
    canvas.removeAttribute("data-ava-card-3d-error");
    let cancelled = false;
    let disposed = false;
    let renderer: ThreeTypes.WebGLRenderer | undefined;
    let scene: ThreeTypes.Scene | undefined;
    let texture: ThreeTypes.Texture | undefined;
    let stopObservingResize: () => void = () => undefined;

    const dispose = (): void => {
      canvas.removeAttribute("data-ava-card-3d-ready");
      canvas.removeAttribute("data-ava-card-3d-error");
      if (disposed) return;
      disposed = true;
      renderer?.setAnimationLoop(null);
      stopObservingResize();
      texture?.dispose();
      if (scene) disposeSceneResources(scene);
      renderer?.dispose();
    };

    void (async () => {
      const three = await loadThree();
      if (cancelled) return;

      const host = canvas.parentElement ?? canvas;
      const initial = measureHost(host);
      const nextRenderer = new three.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      renderer = nextRenderer;
      nextRenderer.setClearColor(0x000000, 0);
      nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      nextRenderer.setSize(initial.width, initial.height, false);
      nextRenderer.outputColorSpace = three.SRGBColorSpace;
      nextRenderer.shadowMap.enabled = true;
      nextRenderer.shadowMap.type = three.PCFShadowMap;
      nextRenderer.toneMapping = three.ACESFilmicToneMapping;
      nextRenderer.toneMappingExposure = 1.08;

      const nextScene = new three.Scene();
      scene = nextScene;
      const camera = new three.PerspectiveCamera(35, initial.width / initial.height, 0.1, 100);
      camera.position.set(0, 0.18, 5.2);
      camera.lookAt(0, 0, 0);

      nextScene.add(new three.HemisphereLight(0xfff7e9, 0x6d4d3d, 1.35));
      const keyLight = new three.DirectionalLight(0xffe0b8, 3.4);
      keyLight.position.set(-2.8, 4.2, 4.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.1;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -3;
      keyLight.shadow.camera.right = 3;
      keyLight.shadow.camera.top = 3;
      keyLight.shadow.camera.bottom = -3;
      keyLight.shadow.bias = -0.0004;
      nextScene.add(keyLight);

      const fillLight = new three.DirectionalLight(0xffbca8, 1.35);
      fillLight.position.set(3, 1.4, 3.2);
      nextScene.add(fillLight);
      const rimLight = new three.PointLight(0xffc46d, 2.2, 9, 2);
      rimLight.position.set(1.8, 2.2, -2.2);
      nextScene.add(rimLight);

      const ground = new three.Mesh(
        new three.PlaneGeometry(12, 12),
        new three.ShadowMaterial({ color: 0x6d4935, opacity: 0.2 }),
      );
      ground.position.y = -1.23;
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      nextScene.add(ground);

      stopObservingResize = observeHostResize(host, () => {
        const next = measureHost(host);
        nextRenderer.setSize(next.width, next.height, false);
        camera.aspect = next.width / next.height;
        camera.updateProjectionMatrix();
        if (reducedMotion) nextRenderer.render(nextScene, camera);
      });

      let subject: ThreeTypes.Group;
      if (kind === "shape" && shape && color) {
        subject = createShapeSubject(three, shape, color);
      } else if (kind === "picture" && imageUrl) {
        const loadedTexture = await new three.TextureLoader().loadAsync(imageUrl);
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        loadedTexture.colorSpace = three.SRGBColorSpace;
        loadedTexture.anisotropy = Math.min(8, nextRenderer.capabilities.getMaxAnisotropy());
        subject = createPictureSubject(three, loadedTexture);
      } else {
        dispose();
        return;
      }

      if (cancelled) {
        dispose();
        return;
      }

      subject.rotation.x = -0.08;
      nextScene.add(subject);
      canvas.setAttribute("data-ava-card-3d-ready", kind);
      setStatus("ready");

      const renderFrame = (): void => {
        nextRenderer.render(nextScene, camera);
      };
      if (reducedMotion) {
        subject.rotation.y = 0.3;
        renderFrame();
      } else {
        nextRenderer.setAnimationLoop((timestamp) => {
          if (cancelled) return;
          const elapsed = timestamp / 1000;
          subject.rotation.y = 0.22 + Math.sin(elapsed * 0.65) * 0.2;
          subject.rotation.x = -0.08 + Math.sin(elapsed * 0.45) * 0.025;
          subject.position.y = Math.sin(elapsed * 0.9) * 0.035;
          renderFrame();
        });
      }
    })().catch(() => {
      dispose();
      if (!cancelled) {
        canvas.setAttribute("data-ava-card-3d-error", "true");
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      dispose();
    };
  }, [kind, shape, color, imageUrl, reducedMotion]);

  return status;
}
