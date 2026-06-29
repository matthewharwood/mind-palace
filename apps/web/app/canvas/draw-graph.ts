import { type Edge, layeredDag, radialNetwork } from "@mind-palace/curriculum";
import {
  type Application,
  Container,
  type FederatedPointerEvent,
  Graphics,
  Rectangle,
  Text,
} from "pixi.js";

// Shared readable renderer for a prerequisite graph. Content-sized, text-wrapped
// nodes, straight edges with an arrowhead into each dependent, auto-fit to the
// viewport, drag-to-pan and wheel-zoom. Render-on-demand — the caller mounts with
// `autoStart: false`; we render after build and on interaction.
//
// Two layouts, picked by the caller's intent (NOT the renderer's):
//   • "flow"    — top-down layered DAG. Use for a genuine ORDERED sequence (the
//                 learning path: prerequisites stack above their dependents).
//   • "network" — radial web (roots in the center, depth radiating outward). Use
//                 for INTERRELATED content (a curriculum's concepts + drills).

// Where a center→target ray exits the source's rounded-rect border (so edges
// visually connect box edges, and arrowheads land on the target's border).
function rectBoundary(
  cx: number,
  cy: number,
  w: number,
  h: number,
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? w / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = dy !== 0 ? h / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const s = Math.min(scaleX, scaleY);
  return { x: cx + dx * s, y: cy + dy * s };
}

export interface GraphNodeSpec {
  id: string;
  /** Primary label (wrapped). */
  title: string;
  /** Small caption under the title (e.g. SRS phase, lesson type). */
  caption?: string;
  fill: number;
  textColor: number;
  /** Optional accent border (e.g. "due"). */
  ring?: number;
  /** 0–1 mastery; when set, a corner badge shows the % as a ring + number. */
  progress?: number;
}

const BADGE_TRACK = 0xffffff;
const BADGE_ARC = 0x34d399;
const BADGE_BG = 0x0b1220;

export type GraphLayout = "flow" | "network";

export interface DrawGraphOptions {
  nodes: readonly GraphNodeSpec[];
  edges: readonly Edge[];
  /** "flow" = top-down ordered sequence; "network" = radial web. */
  layout: GraphLayout;
  onSelect: (id: string) => void;
}

const MAX_W = 210;
const MIN_W = 120;
const PAD_X = 16;
const PAD_Y = 12;
const MIN_H = 56;
const TITLE_SIZE = 15;
const CAPTION_SIZE = 12;
const EDGE_COLOR = 0x5b6275;
const MIN_SCALE = 0.3;
const MAX_SCALE = 1.6;
const MAX_TEXT_RESOLUTION = 4;

export function drawGraph(app: Application, opts: DrawGraphOptions): () => void {
  // Pixi rasterizes Text to a texture at a fixed density that does NOT track the
  // world's scale, so text blurs when zoomed in. Render glyphs at the device
  // pixel ratio times the max zoom (capped) so they stay crisp at any zoom and
  // sharp (oversampled) when the graph is fit-scaled down.
  const textResolution = Math.min(
    MAX_TEXT_RESOLUTION,
    Math.max(2, app.renderer.resolution * MAX_SCALE),
  );

  type Built = { spec: GraphNodeSpec; node: Container; w: number; h: number };
  const built: Built[] = opts.nodes.map((spec) => {
    const wrapWidth = MAX_W - PAD_X * 2;
    const title = new Text({
      text: spec.title,
      resolution: textResolution,
      style: {
        fontSize: TITLE_SIZE,
        fill: spec.textColor,
        fontFamily: "sans-serif",
        align: "center",
        wordWrap: true,
        wordWrapWidth: wrapWidth,
        lineHeight: TITLE_SIZE + 4,
      },
    });
    title.anchor.set(0.5, 0);
    const caption = spec.caption
      ? new Text({
          text: spec.caption,
          resolution: textResolution,
          style: {
            fontSize: CAPTION_SIZE,
            fill: spec.textColor,
            fontFamily: "sans-serif",
            align: "center",
          },
        })
      : null;
    caption?.anchor.set(0.5, 0);

    const contentW = Math.max(title.width, caption?.width ?? 0);
    const w = Math.round(Math.min(MAX_W, Math.max(MIN_W, contentW + PAD_X * 2)));
    const contentH = title.height + (caption ? caption.height + 4 : 0);
    const h = Math.round(Math.max(MIN_H, contentH + PAD_Y * 2));

    const node = new Container();
    const box = new Graphics().roundRect(-w / 2, -h / 2, w, h, 12).fill(spec.fill);
    if (spec.ring !== undefined) box.stroke({ width: 3, color: spec.ring });
    else box.stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
    node.addChild(box);
    title.position.set(0, -contentH / 2);
    node.addChild(title);
    if (caption) {
      caption.position.set(0, -contentH / 2 + title.height + 4);
      node.addChild(caption);
    }

    // Progress badge in the top-right corner: a dark disc, a faint track ring, an
    // emerald arc swept to `progress`, and the % number — so mastery reads at a
    // glance over any node fill.
    if (spec.progress !== undefined) {
      const pr = Math.max(0, Math.min(1, spec.progress));
      const r = 13;
      const bx = w / 2 - 3;
      const by = -h / 2 + 3;
      const badge = new Graphics();
      badge.circle(bx, by, r).fill({ color: BADGE_BG, alpha: 0.92 });
      badge.circle(bx, by, r - 2.5).stroke({ width: 3, color: BADGE_TRACK, alpha: 0.22 });
      if (pr > 0) {
        const sweep = -Math.PI / 2 + pr * Math.PI * 2;
        badge.arc(bx, by, r - 2.5, -Math.PI / 2, sweep).stroke({ width: 3, color: BADGE_ARC });
      }
      node.addChild(badge);
      const pct = new Text({
        text: `${Math.round(pr * 100)}`,
        resolution: textResolution,
        style: { fontSize: 9, fill: 0xffffff, fontFamily: "sans-serif", align: "center" },
      });
      pct.anchor.set(0.5);
      pct.position.set(bx, by);
      node.addChild(pct);
    }
    return { spec, node, w, h };
  });

  const sizeById = new Map(built.map((b) => [b.spec.id, b]));
  const layoutNodes = built.map((b) => ({ id: b.spec.id, width: b.w, height: b.h }));
  const layout =
    opts.layout === "flow"
      ? layeredDag(layoutNodes, opts.edges, { layerGap: 96, nodeGap: 36 })
      : radialNetwork(layoutNodes, opts.edges, { ringGap: 170, minGap: 32 });

  const world = new Container();
  app.stage.addChild(world);

  // Edges first (behind nodes): curved, with an arrowhead into the dependent.
  const edges = new Graphics();
  world.addChild(edges);
  const arrows = new Graphics();
  world.addChild(arrows);
  for (const edge of opts.edges) {
    const a = layout.positions[edge.from];
    const b = layout.positions[edge.to];
    const sa = sizeById.get(edge.from);
    const sb = sizeById.get(edge.to);
    if (!a || !b || !sa || !sb) continue;
    const start = rectBoundary(a.x, a.y, sa.w, sa.h, b.x, b.y);
    const end = rectBoundary(b.x, b.y, sb.w, sb.h, a.x, a.y);
    edges.moveTo(start.x, start.y).lineTo(end.x, end.y);
    // Arrowhead at the target's border, pointing inward (the dependency arrow).
    const dx = b.x - end.x;
    const dy = b.y - end.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const back = 9;
    const half = 5;
    arrows
      .moveTo(end.x, end.y)
      .lineTo(end.x - ux * back + px * half, end.y - uy * back + py * half)
      .lineTo(end.x - ux * back - px * half, end.y - uy * back - py * half)
      .lineTo(end.x, end.y);
  }
  edges.stroke({ width: 1.5, color: EDGE_COLOR, alpha: 0.7 });
  arrows.fill({ color: EDGE_COLOR, alpha: 0.9 });

  // Nodes on top.
  for (const b of built) {
    const p = layout.positions[b.spec.id];
    if (!p) continue;
    b.node.position.set(p.x, p.y);
    b.node.eventMode = "static";
    b.node.cursor = "pointer";
    const id = b.spec.id;
    const node = b.node;
    node.on("pointertap", () => {
      if (!moved) opts.onSelect(id);
    });
    // Mouse feedback (canvas nodes get no CSS :hover): lift + grow slightly and
    // come to the front so the larger node isn't clipped by its neighbours.
    node.on("pointerover", () => {
      node.scale.set(1.05);
      world.addChild(node);
      app.render();
    });
    node.on("pointerout", () => {
      node.scale.set(1);
      app.render();
    });
    world.addChild(node);
  }

  // Fit the graph into the viewport, centered.
  world.pivot.set(0, layout.height / 2);
  let userScale = 0;
  function fit(): void {
    const pad = 48;
    const sx = (app.screen.width - pad * 2) / Math.max(1, layout.width);
    const sy = (app.screen.height - pad * 2) / Math.max(1, layout.height);
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, sx, sy));
    userScale = scale;
    world.scale.set(scale);
    world.position.set(app.screen.width / 2, app.screen.height / 2);
  }
  fit();

  // Drag-to-pan on the empty background.
  app.stage.eventMode = "static";
  app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  const onDown = (e: FederatedPointerEvent) => {
    dragging = true;
    moved = false;
    startX = e.global.x;
    startY = e.global.y;
    originX = world.x;
    originY = world.y;
  };
  const onMove = (e: FederatedPointerEvent) => {
    if (!dragging) return;
    const dx = e.global.x - startX;
    const dy = e.global.y - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    world.position.set(originX + dx, originY + dy);
    app.render();
  };
  const onUp = () => {
    dragging = false;
  };
  app.stage.on("pointerdown", onDown);
  app.stage.on("pointermove", onMove);
  app.stage.on("pointerup", onUp);
  app.stage.on("pointerupoutside", onUp);

  // Wheel zoom toward the cursor.
  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const rect = app.canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, userScale * factor));
    const ratio = nextScale / userScale;
    world.position.set(px - (px - world.x) * ratio, py - (py - world.y) * ratio);
    userScale = nextScale;
    world.scale.set(nextScale);
    app.render();
  };
  app.canvas.addEventListener("wheel", onWheel, { passive: false });

  const onResize = () => {
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    fit();
    app.render();
  };
  app.renderer.on("resize", onResize);

  app.render();

  return () => {
    app.canvas.removeEventListener("wheel", onWheel);
    app.renderer.off("resize", onResize);
    app.stage.off("pointerdown", onDown);
    app.stage.off("pointermove", onMove);
    app.stage.off("pointerup", onUp);
    app.stage.off("pointerupoutside", onUp);
    world.destroy({ children: true });
  };
}
