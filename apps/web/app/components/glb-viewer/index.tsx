import { type ReactNode, useRef } from "react";
import * as z from "zod";

import { useGlbViewer } from "~/canvas/use-glb-viewer";
import { defineComponent } from "~/lib/define-component";

// GlbViewer — a real-time 3D model viewer (Three.js side channel; see
// use-glb-viewer). The canvas is alpha/transparent so the host owns the
// background — auto-rotates, frames the model to a consistent size, and honors
// reduced-motion (static 3/4 pose). Ported + generalized from dean-n-dean.

export const GlbViewerPropsSchema = z.object({
  label: z.string().min(1),
  modelUrl: z.string().min(1),
});
export type GlbViewerProps = z.infer<typeof GlbViewerPropsSchema>;

export const GlbViewer = defineComponent(
  GlbViewerPropsSchema,
  ({ label, modelUrl }: GlbViewerProps): ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useGlbViewer(canvasRef, modelUrl);
    return (
      <div className="relative size-full overflow-hidden">
        <canvas ref={canvasRef} aria-label={`${label} 3D model`} className="block size-full" />
      </div>
    );
  },
);
