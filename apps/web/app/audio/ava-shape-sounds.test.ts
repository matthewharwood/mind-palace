import { describe, expect, test } from "bun:test";

import { AVA_SHAPE_CARDS } from "~/lib/ava-shapes";
import { getAvaShapeSound } from "./ava-shape-sounds";

describe("Ava shape sound grammar", () => {
  test("keeps the shape voice stable across colors", () => {
    const squareSounds = AVA_SHAPE_CARDS.filter((card) => card.shape === "square").map((card) =>
      getAvaShapeSound(card),
    );
    expect(new Set(squareSounds.map((sound) => JSON.stringify(sound.shapeVoice))).size).toBe(1);
  });

  test("keeps the color voice stable across shapes", () => {
    const blueSounds = AVA_SHAPE_CARDS.filter((card) => card.color === "blue").map((card) =>
      getAvaShapeSound(card),
    );
    expect(new Set(blueSounds.map((sound) => JSON.stringify(sound.colorVoice))).size).toBe(1);
  });

  test("gives all forty combinations a unique two-voice signature", () => {
    const signatures = AVA_SHAPE_CARDS.map((card) => {
      const sound = getAvaShapeSound(card);
      return `${sound.shapeVoice.waveform}:${sound.shapeVoice.frequency}|${sound.colorVoice.waveform}:${sound.colorVoice.frequency}`;
    });
    expect(new Set(signatures).size).toBe(40);
  });
});
