import { describe, expect, test } from "bun:test";

import { ReplayPolicySchema, SoundDefinitionSchema, SoundRegistrySchema } from "./schema";

describe("SoundDefinitionSchema", () => {
  test("requires a non-empty src", () => {
    expect(SoundDefinitionSchema.parse({ src: "/a.mp3" }).src).toBe("/a.mp3");
    expect(() => SoundDefinitionSchema.parse({ src: "" })).toThrow();
    expect(() => SoundDefinitionSchema.parse({})).toThrow();
  });

  test("validates optional fields", () => {
    const def = SoundDefinitionSchema.parse({
      src: "/a.mp3",
      volume: 0.7,
      maxVoices: 4,
      replay: "restart",
      prompt: "a soft snap",
    });
    expect(def.replay).toBe("restart");
    expect(() => SoundDefinitionSchema.parse({ src: "/a.mp3", volume: 5 })).toThrow();
    expect(() => SoundDefinitionSchema.parse({ src: "/a.mp3", replay: "loop" })).toThrow();
  });
});

describe("ReplayPolicySchema", () => {
  test("accepts the policies", () => {
    for (const p of ReplayPolicySchema.options) expect(ReplayPolicySchema.parse(p)).toBe(p);
  });
});

describe("SoundRegistrySchema", () => {
  test("parses a map of ids to definitions", () => {
    const reg = SoundRegistrySchema.parse({ "card.drop": { src: "/d.mp3" } });
    expect(reg["card.drop"]?.src).toBe("/d.mp3");
  });
});
