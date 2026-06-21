import { describe, expect, test } from "bun:test";

import {
  clamp,
  DEFAULT_DRAG_CONFIG,
  frictionTilt,
  liftScale,
  magnetize,
  pastDragThreshold,
  pressTilt,
  resolveDragConfig,
  smoothSpeed,
} from "./physics";

const cfg = DEFAULT_DRAG_CONFIG;

describe("clamp", () => {
  test("bounds a value", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("pressTilt", () => {
  test("maps grab fraction to a clamped tilt", () => {
    expect(pressTilt(0, cfg)).toBe(0);
    expect(pressTilt(0.5, cfg)).toBe(cfg.pressTiltMaxDeg);
    expect(pressTilt(-0.5, cfg)).toBe(-cfg.pressTiltMaxDeg);
    expect(pressTilt(5, cfg)).toBe(cfg.pressTiltMaxDeg); // clamped
  });
});

describe("frictionTilt", () => {
  test("scales with velocity and clamps", () => {
    expect(frictionTilt(0, cfg)).toBe(0);
    expect(frictionTilt(1000, cfg)).toBe(cfg.frictionTiltMaxDeg);
    expect(frictionTilt(-1000, cfg)).toBe(-cfg.frictionTiltMaxDeg);
  });
});

describe("smoothSpeed", () => {
  test("is an EMA weighted by velocitySmoothKeep", () => {
    expect(smoothSpeed(0, 1, cfg)).toBeCloseTo(1 - cfg.velocitySmoothKeep);
    expect(smoothSpeed(1, 1, cfg)).toBeCloseTo(1);
  });
});

describe("liftScale", () => {
  test("starts at pressScale and adds a capped boost", () => {
    expect(liftScale(0, cfg)).toBe(cfg.pressScale);
    expect(liftScale(1e6, cfg)).toBeCloseTo(cfg.pressScale + cfg.velocityLiftMax);
  });
});

describe("magnetize", () => {
  test("lerps toward the target delta", () => {
    expect(magnetize(0, 100, 0)).toBe(0);
    expect(magnetize(0, 100, 1)).toBe(100);
    expect(magnetize(0, 100, 0.4)).toBeCloseTo(40);
  });
});

describe("pastDragThreshold", () => {
  test("requires the configured minimum movement", () => {
    expect(pastDragThreshold(0, 0, cfg)).toBe(false);
    expect(pastDragThreshold(cfg.minDragDistancePx, 0, cfg)).toBe(true);
    expect(pastDragThreshold(100, 100, cfg)).toBe(true);
  });
});

describe("resolveDragConfig", () => {
  test("merges a partial override over defaults", () => {
    const merged = resolveDragConfig({ snapDurationMs: 999 });
    expect(merged.snapDurationMs).toBe(999);
    expect(merged.pressScale).toBe(cfg.pressScale);
  });
});
