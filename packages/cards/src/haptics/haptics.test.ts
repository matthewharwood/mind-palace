import { describe, expect, test } from "bun:test";

import {
  createHaptics,
  DEFAULT_HAPTIC_PATTERNS,
  type HapticAdapter,
  resolveHapticPattern,
} from "./haptics";

function mockAdapter(supported = true): {
  adapter: HapticAdapter;
  calls: Array<number | number[]>;
} {
  const calls: Array<number | number[]> = [];
  return {
    calls,
    adapter: { isSupported: () => supported, vibrate: (spec) => calls.push(spec) },
  };
}

describe("resolveHapticPattern", () => {
  test("passes numbers and arrays through", () => {
    expect(resolveHapticPattern(20)).toBe(20);
    expect(resolveHapticPattern([10, 20])).toEqual([10, 20]);
  });
  test("resolves named patterns from the map", () => {
    expect(resolveHapticPattern("light")).toBe(DEFAULT_HAPTIC_PATTERNS.light);
    expect(resolveHapticPattern("error")).toEqual(DEFAULT_HAPTIC_PATTERNS.error);
  });
  test("honors a custom pattern map", () => {
    expect(resolveHapticPattern("light", { ...DEFAULT_HAPTIC_PATTERNS, light: 99 })).toBe(99);
  });
});

describe("createHaptics", () => {
  test("vibrates through the adapter with the resolved spec", () => {
    const { adapter, calls } = mockAdapter();
    const h = createHaptics({ adapter });
    expect(h.supported).toBe(true);
    h.vibrate("medium");
    h.vibrate(42);
    expect(calls).toEqual([DEFAULT_HAPTIC_PATTERNS.medium, 42]);
  });

  test("is a no-op when unsupported (e.g. iPad)", () => {
    const { adapter, calls } = mockAdapter(false);
    const h = createHaptics({ adapter });
    expect(h.supported).toBe(false);
    h.vibrate("heavy");
    expect(calls).toEqual([]);
  });

  test("respects enabled/setEnabled", () => {
    const { adapter, calls } = mockAdapter();
    const h = createHaptics({ adapter, enabled: false });
    h.vibrate("light");
    expect(calls).toEqual([]);
    h.setEnabled(true);
    h.vibrate("light");
    expect(calls).toEqual([DEFAULT_HAPTIC_PATTERNS.light]);
  });
});
