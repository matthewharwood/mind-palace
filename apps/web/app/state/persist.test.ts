import { expect, test } from "bun:test";

import { MeasureLoopRangeSchema, MusicModeStateSchema } from "~/lib/music-mode/schemas";
import { RemoteWriteMessageSchema } from "./persist";

test("remote write messages validate at the BroadcastChannel boundary", () => {
  expect(
    RemoteWriteMessageSchema.parse({ store: "avaFirstWordsSession", key: "ava-first-words" }),
  ).toEqual({ store: "avaFirstWordsSession", key: "ava-first-words" });
  expect(RemoteWriteMessageSchema.parse({ store: "musicModeSession", key: "music-mode" })).toEqual({
    store: "musicModeSession",
    key: "music-mode",
  });
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "unknown", key: "ava-first-words" }).success,
  ).toBeFalse();
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "avaFirstWordsSession", key: "" }).success,
  ).toBeFalse();
});

test("MusicModeStateSchema hydrates v3 preference defaults and validates MeasureLoopRange", () => {
  const hydrated = MusicModeStateSchema.parse({ id: "music-mode" });
  expect(hydrated.preferences.practiceMode).toBe("flow");
  expect(hydrated.preferences.handMode).toBe("both");
  expect(hydrated.preferences.notationScaffold).toBe("intervals-only");
  expect(hydrated.preferences.tempoScalePct).toBe(100);
  expect(hydrated.preferences.autoTempoRamp).toBe(false);
  expect(hydrated.preferences.loopLeadIn).toBe(true);
  expect(hydrated.preferences.accompanimentVolume).toBe(0.7);
  expect(hydrated.preferences.micEnabled).toBe(false);

  expect(MeasureLoopRangeSchema.parse({ startBar: 2, endBar: 4 })).toEqual({
    startBar: 2,
    endBar: 4,
  });
  expect(MeasureLoopRangeSchema.safeParse({ startBar: 4, endBar: 2 }).success).toBeFalse();
});
