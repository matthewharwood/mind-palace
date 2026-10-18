import { type RefObject, useEffect, useState } from "react";
import {
  type AvaSceneRuntime,
  type AvaSceneVariant,
  createAvaSceneRuntime,
} from "./ava-scene-runtime";

export function useAvaScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  controlsRef: RefObject<AvaSceneRuntime | null>,
  modelUrl: string,
  variant: AvaSceneVariant,
  reducedMotion: boolean,
): "loading" | "ready" | "error" {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abort = new AbortController();
    let runtime: AvaSceneRuntime | undefined;
    setStatus("loading");
    void createAvaSceneRuntime(canvas, modelUrl, variant, !reducedMotion, abort.signal)
      .then((created) => {
        if (abort.signal.aborted) {
          created.dispose();
          return;
        }
        runtime = created;
        controlsRef.current = created;
        setStatus("ready");
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus("error");
      });
    return () => {
      abort.abort();
      runtime?.dispose();
      controlsRef.current = null;
    };
  }, [canvasRef, controlsRef, modelUrl, variant, reducedMotion]);
  return status;
}
