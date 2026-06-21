import { animate } from "animejs";
import { type ReactNode, useEffect, useRef, useState } from "react";

import type { DropIntent } from "../card/schema";
import { defineComponent } from "../lib/define-component";
import { prefersReducedMotion } from "../lib/reduced-motion";
import "./drag.css";
import {
  type DropTargetInfo,
  dropTargetAtPoint,
  isActionable,
  parseAccepts,
  readDropTarget,
  resolveDefaultIntent,
} from "./hit-test";
import { cycleIndex } from "./keyboard";
import {
  frictionTilt,
  liftScale,
  magnetize,
  pastDragThreshold,
  pressTilt,
  resolveDragConfig,
  smoothSpeed,
} from "./physics";
import {
  type DraggableProps,
  DraggablePropsSchema,
  type DropResult,
  type IntentContext,
} from "./schema";

// One pointer-drag at a time — iPad multitouch would otherwise start concurrent
// drags on adjacent cards. Module-scoped, matching the reference implementation.
let activeDragPointerId: number | null = null;

const NONE: DropIntent = { kind: "none" };

interface DragState {
  pointerId: number;
  el: HTMLButtonElement;
  startX: number;
  startY: number;
  startCenterX: number;
  startCenterY: number;
  pressTiltDeg: number;
  prevX: number;
  prevY: number;
  prevT: number;
  smoothedSpeed: number;
  lastX: number;
  lastY: number;
  lastRot: number;
  lastScale: number;
  hasMoved: boolean;
  currentTarget: DropTargetInfo | null;
  targetDelta: { x: number; y: number } | null;
  currentIntent: DropIntent;
}

interface KeyboardState {
  active: boolean;
  index: number;
  targets: DropTargetInfo[];
}

function centerOf(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Transient drag highlight is written to `data-dragover`, an attribute the
// engine alone owns — distinct from the React-controlled `data-state` prop, so a
// re-render mid-drag can never clobber the highlight (matters for keyboard drag,
// which has no continuous events to re-apply it).
function dragoverFor(intent: DropIntent): string | null {
  switch (intent.kind) {
    case "drop":
    case "replace":
      return "valid";
    case "swap":
      return "swap";
    case "blocked":
      return "invalid";
    default:
      return null;
  }
}

function setTargetState(info: DropTargetInfo | null, intent: DropIntent): void {
  if (!info) return;
  const value = dragoverFor(intent);
  if (value) info.el.dataset.dragover = value;
  else delete info.el.dataset.dragover;
}

function clearTargetState(info: DropTargetInfo | null): void {
  if (info) delete info.el.dataset.dragover;
}

function resetStyles(el: HTMLButtonElement): void {
  el.style.cssText = "";
  delete el.dataset.dragging;
  delete el.dataset.feedback;
}

function snapToTarget(
  d: DragState,
  target: DropTargetInfo,
  snapMs: number,
  reduced: boolean,
  done: () => void,
): void {
  const c = centerOf(target.el);
  const td = { x: c.x - d.startCenterX, y: c.y - d.startCenterY };
  const occupant =
    Array.from(target.el.querySelectorAll<HTMLElement>("[data-card-id]")).find((n) => n !== d.el) ??
    null;

  if (reduced) {
    done();
    return;
  }

  let pending = occupant ? 2 : 1;
  const finish = (): void => {
    pending -= 1;
    if (pending <= 0) done();
  };

  animate(d.el, {
    translateX: [d.lastX, td.x],
    translateY: [d.lastY, td.y],
    rotate: [d.lastRot, 0],
    scale: [d.lastScale, 1],
    duration: snapMs,
    ease: "outQuart",
    onComplete: finish,
  });

  if (occupant) {
    occupant.style.transition = "none";
    animate(occupant, {
      translateX: [0, -td.x],
      translateY: [0, -td.y],
      duration: snapMs,
      ease: "outQuart",
      onComplete: finish,
    });
  }
}

function revert(d: DragState, revertMs: number, reduced: boolean, done: () => void): void {
  if (reduced) {
    done();
    return;
  }
  animate(d.el, {
    translateX: [d.lastX, 0],
    translateY: [d.lastY, 0],
    rotate: [d.lastRot, 0],
    scale: [d.lastScale, 1],
    duration: revertMs,
    ease: "outQuart",
    onComplete: done,
  });
}

// Controlled draggable: owns the transient drag (refs + direct style writes, a
// side channel per the Compiler rules — never touched during render) and emits a
// committed DropResult. The consumer persists. Wrap a <Card> as children.
//
// Pointer drag has the full physics; keyboard drag (Enter/Space to lift, arrows
// to cycle valid targets, Enter to drop, Escape to cancel) places instantly and
// announces via an aria-live region — a real, no-mouse path.
export const Draggable = defineComponent(
  DraggablePropsSchema,
  (props: DraggableProps): ReactNode => {
    const {
      cardId,
      source,
      tags,
      disabled = false,
      keyboard = true,
      label,
      config,
      resolveIntent,
      onDrop,
      onPickup,
      onOver,
      onRelease,
      className,
      testId,
      children,
    } = props;

    const elRef = useRef<HTMLButtonElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const kbRef = useRef<KeyboardState>({ active: false, index: 0, targets: [] });
    const [announce, setAnnounce] = useState("");
    const cfg = resolveDragConfig(config);
    const cardTags = parseAccepts(tags);
    const resolve = resolveIntent ?? resolveDefaultIntent;
    const name = label ?? cardId;

    useEffect(
      () => () => {
        if (dragRef.current && activeDragPointerId === dragRef.current.pointerId) {
          activeDragPointerId = null;
        }
      },
      [],
    );

    function intentFor(info: DropTargetInfo): DropIntent {
      const ctx: IntentContext = {
        cardId,
        cardTags,
        source,
        target: {
          id: info.id,
          kind: info.kind,
          accepts: info.accepts,
          occupied: info.occupied,
          disabled: info.disabled,
          locked: info.locked,
        },
      };
      return resolve(ctx);
    }

    // --- pointer drag -------------------------------------------------------
    function onPointerDown(e: React.PointerEvent<HTMLButtonElement>): void {
      if (disabled || activeDragPointerId !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = elRef.current;
      if (!el) return;

      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      activeDragPointerId = e.pointerId;

      const rect = el.getBoundingClientRect();
      const grabFraction = (e.clientX - rect.left) / rect.width - 0.5;
      const tilt = pressTilt(grabFraction, cfg);
      el.style.cssText = `z-index:50;touch-action:none;transition:none;will-change:transform;transform:rotate(${tilt}deg) scale(${cfg.pressScale});`;
      el.dataset.dragging = "true";

      const now = performance.now();
      dragRef.current = {
        pointerId: e.pointerId,
        el,
        startX: e.clientX,
        startY: e.clientY,
        startCenterX: rect.left + rect.width / 2,
        startCenterY: rect.top + rect.height / 2,
        pressTiltDeg: tilt,
        prevX: e.clientX,
        prevY: e.clientY,
        prevT: now,
        smoothedSpeed: 0,
        lastX: 0,
        lastY: 0,
        lastRot: tilt,
        lastScale: cfg.pressScale,
        hasMoved: false,
        currentTarget: null,
        targetDelta: null,
        currentIntent: NONE,
      };
      onPickup?.(cardId);
    }

    function onPointerMove(e: React.PointerEvent<HTMLButtonElement>): void {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.hasMoved) {
        if (!pastDragThreshold(dx, dy, cfg)) return;
        d.hasMoved = true;
        d.el.style.pointerEvents = "none";
      }

      const now = performance.now();
      const vx = e.clientX - d.prevX;
      const vy = e.clientY - d.prevY;
      const dt = Math.max(1, now - d.prevT);
      d.prevX = e.clientX;
      d.prevY = e.clientY;
      d.prevT = now;

      const rot = d.pressTiltDeg + frictionTilt(vx, cfg);
      d.smoothedSpeed = smoothSpeed(d.smoothedSpeed, Math.hypot(vx, vy) / dt, cfg);
      const scale = liftScale(d.smoothedSpeed, cfg);

      const info = dropTargetAtPoint(e.clientX, e.clientY);
      const intent = info ? intentFor(info) : NONE;

      const targetChanged = (d.currentTarget?.id ?? null) !== (info?.id ?? null);
      const intentChanged = d.currentIntent.kind !== intent.kind;
      if (targetChanged) {
        clearTargetState(d.currentTarget);
        d.currentTarget = info;
        d.targetDelta = info
          ? { x: centerOf(info.el).x - d.startCenterX, y: centerOf(info.el).y - d.startCenterY }
          : null;
      }
      setTargetState(info, intent);
      d.currentIntent = intent;

      let ax = dx;
      let ay = dy;
      if (d.targetDelta && isActionable(intent)) {
        ax = magnetize(dx, d.targetDelta.x, cfg.hoverMagnetism);
        ay = magnetize(dy, d.targetDelta.y, cfg.hoverMagnetism);
      }
      d.el.style.transform = `translate3d(${ax}px,${ay}px,0) rotate(${rot}deg) scale(${scale})`;
      d.lastX = ax;
      d.lastY = ay;
      d.lastRot = rot;
      d.lastScale = scale;

      d.el.dataset.feedback = !info ? "none" : isActionable(intent) ? "valid" : "invalid";

      if (targetChanged || intentChanged) {
        onOver?.({ cardId, target: info ? { id: info.id, kind: info.kind } : null, intent });
      }
    }

    function onPointerEnd(e: React.PointerEvent<HTMLButtonElement>): void {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      dragRef.current = null;
      activeDragPointerId = null;

      clearTargetState(d.currentTarget);
      d.el.style.pointerEvents = "";
      delete d.el.dataset.feedback;

      const target = d.currentTarget;
      const intent = d.currentIntent;
      const result: DropResult = {
        cardId,
        source,
        target: target ? { id: target.id, kind: target.kind } : null,
        intent,
      };
      onRelease?.(result);

      const reduced = prefersReducedMotion();
      if (target && d.hasMoved && isActionable(intent)) {
        snapToTarget(d, target, cfg.snapDurationMs, reduced, () => {
          delete d.el.dataset.dragging;
          onDrop(result);
        });
      } else {
        revert(d, cfg.revertDurationMs, reduced, () => {
          resetStyles(d.el);
          onDrop({ cardId, source, target: null, intent: NONE });
        });
      }
    }

    // --- keyboard drag ------------------------------------------------------
    function clearKeyboardHighlights(): void {
      for (const t of kbRef.current.targets) delete t.el.dataset.dragover;
    }

    function highlightKeyboard(index: number): void {
      kbRef.current.targets.forEach((t, i) => {
        if (i === index) t.el.dataset.dragover = dragoverFor(intentFor(t)) ?? "valid";
        else delete t.el.dataset.dragover;
      });
    }

    function gatherKeyboardTargets(): DropTargetInfo[] {
      if (typeof document === "undefined") return [];
      // Scope to the nearest board (opt-in via data-cards-scope) so a second
      // board's slots aren't offered as keyboard candidates; default = document.
      const root: ParentNode = elRef.current?.closest("[data-cards-scope]") ?? document;
      const out: DropTargetInfo[] = [];
      for (const el of root.querySelectorAll<HTMLElement>("[data-drop-target]")) {
        const info = readDropTarget(el);
        if (info && isActionable(intentFor(info))) out.push(info);
      }
      return out;
    }

    function liftKeyboard(): void {
      const targets = gatherKeyboardTargets();
      if (targets.length === 0) {
        setAnnounce(`No place to move ${name}.`);
        return;
      }
      kbRef.current = { active: true, index: 0, targets };
      highlightKeyboard(0);
      onPickup?.(cardId);
      setAnnounce(
        `Picked up ${name}. ${targets.length} targets. Arrow keys to choose, Enter to drop, Escape to cancel.`,
      );
    }

    function moveKeyboard(delta: number): void {
      const s = kbRef.current;
      if (!s.active) return;
      s.index = cycleIndex(s.index, s.targets.length, delta);
      highlightKeyboard(s.index);
      const t = s.targets[s.index];
      setAnnounce(`${t?.kind ?? "target"} ${t?.id ?? ""}, ${s.index + 1} of ${s.targets.length}.`);
    }

    function dropKeyboard(): void {
      const s = kbRef.current;
      if (!s.active) return;
      const t = s.targets[s.index];
      clearKeyboardHighlights();
      kbRef.current = { active: false, index: 0, targets: [] };
      if (!t) return;
      const result: DropResult = {
        cardId,
        source,
        target: { id: t.id, kind: t.kind },
        intent: intentFor(t),
      };
      onRelease?.(result);
      setAnnounce(`Dropped ${name} on ${t.id}.`);
      onDrop(result);
    }

    function cancelKeyboard(): void {
      if (!kbRef.current.active) return;
      clearKeyboardHighlights();
      kbRef.current = { active: false, index: 0, targets: [] };
      setAnnounce(`Cancelled moving ${name}.`);
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>): void {
      if (disabled || !keyboard) return;
      const active = kbRef.current.active;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (active) dropKeyboard();
        else liftKeyboard();
      } else if (active && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveKeyboard(1);
      } else if (active && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        e.preventDefault();
        moveKeyboard(-1);
      } else if (active && e.key === "Escape") {
        e.preventDefault();
        cancelKeyboard();
      }
    }

    return (
      <>
        <button
          ref={elRef}
          type="button"
          disabled={disabled}
          aria-label={name}
          aria-roledescription="draggable card"
          className={className ? `mp-draggable ${className}` : "mp-draggable"}
          data-card-id={cardId}
          data-test={testId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          {children}
        </button>
        <span className="mp-sr-only" role="status" aria-live="polite">
          {announce}
        </span>
      </>
    );
  },
);
