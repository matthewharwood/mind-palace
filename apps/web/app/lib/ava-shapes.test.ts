import { describe, expect, test } from "bun:test";
import {
  AVA_SHAPES_SESSION_DEFAULT,
  type AvaShapeCard,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";

import {
  AVA_COLORLESS_SHAPE_CARDS,
  AVA_SHAPE_CARDS,
  areAvaColorsUnlocked,
  avaShapeAnswer,
  buildAvaShapeDeck,
  rateAvaShapeCard,
} from "./ava-shapes";

const NOW = 1_000_000_000;

function coverColorlessCards() {
  return AVA_COLORLESS_SHAPE_CARDS.reduce(
    (session, card) => rateAvaShapeCard(session, card.id, "easy", NOW),
    AVA_SHAPES_SESSION_DEFAULT,
  );
}

describe("Ava shape deck", () => {
  test("contains every shape and color combination exactly once", () => {
    expect(AVA_SHAPE_CARDS).toHaveLength(40);
    expect(new Set(AVA_SHAPE_CARDS.map((card) => card.id)).size).toBe(40);
  });

  test("starts with only the five colorless shapes in teaching order", () => {
    const deck = buildAvaShapeDeck(AVA_SHAPES_SESSION_DEFAULT, NOW);
    expect(deck.map((card) => card.id)).toEqual([
      "colorless-square",
      "colorless-oval",
      "colorless-rhombus",
      "colorless-circle",
      "colorless-triangle",
    ]);
  });

  test("does not unlock color cards until every colorless card was covered", () => {
    const almostCovered = AVA_COLORLESS_SHAPE_CARDS.slice(0, -1).reduce(
      (session, card) => rateAvaShapeCard(session, card.id, "good", NOW),
      AVA_SHAPES_SESSION_DEFAULT,
    );
    expect(areAvaColorsUnlocked(almostCovered)).toBe(false);
    expect(buildAvaShapeDeck(almostCovered, NOW).every((card) => card.color === "colorless")).toBe(
      true,
    );

    const covered = rateAvaShapeCard(
      almostCovered,
      AVA_COLORLESS_SHAPE_CARDS.at(-1)?.id ?? "missing",
      "good",
      NOW,
    );
    expect(areAvaColorsUnlocked(covered)).toBe(true);
    expect(buildAvaShapeDeck(covered, NOW)[0]?.id).toBe("red-square");
  });

  test("puts an overdue review before fresh color cards", () => {
    const covered = coverColorlessCards();
    const square = covered.states["colorless-square"];
    if (!square) throw new Error("colorless square state missing");
    const overdue = AvaShapesSessionSchema.parse({
      ...covered,
      states: { ...covered.states, "colorless-square": { ...square, due: NOW - 1 } },
    });
    expect(buildAvaShapeDeck(overdue, NOW)[0]?.id).toBe("colorless-square");
  });

  test("ratings update the existing SRS state", () => {
    const once = rateAvaShapeCard(AVA_SHAPES_SESSION_DEFAULT, "colorless-circle", "again", NOW);
    const twice = rateAvaShapeCard(once, "colorless-circle", "good", NOW + 60_000);
    expect(once.states["colorless-circle"]?.reps).toBe(1);
    expect(twice.states["colorless-circle"]?.reps).toBe(2);
    expect(twice.states["colorless-circle"]?.phase).toBe("learning");
    expect(twice.states["colorless-circle"]?.step).toBe(1);
  });

  test("answers omit color during the colorless foundation", () => {
    const card = (id: string): AvaShapeCard => {
      const found = AVA_SHAPE_CARDS.find((candidate) => candidate.id === id);
      if (!found) throw new Error(`missing fixture ${id}`);
      return found;
    };
    expect(avaShapeAnswer(card("colorless-rhombus"))).toBe("Rhombus");
    expect(avaShapeAnswer(card("blue-rhombus"))).toBe("Blue rhombus");
  });
});
