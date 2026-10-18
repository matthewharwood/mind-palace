import { describe, expect, test } from "bun:test";
import { AvaLearningSessionSchema } from "@mind-palace/schemas";
import {
  avaAnswer,
  avaAvailableSubjects,
  avaChooseCard,
  avaConnectPhrase,
  avaLittleSet,
  avaPracticeNext,
  avaRecognitionChoices,
  avaSelectedCard,
} from "./ava-learning";
import { AVA_COLLECTIONS, avaSceneId } from "./ava-learning-catalog";

describe("Ava's growing vocabulary", () => {
  test("five collections have unique cards and intentional contrasting choices", () => {
    expect(AVA_COLLECTIONS.map((collection) => collection.cards.length)).toEqual([
      20, 20, 20, 12, 20,
    ]);
    for (const collection of AVA_COLLECTIONS) {
      expect(new Set(collection.cards.map((card) => card.id)).size).toBe(collection.cards.length);
      for (const [index, card] of collection.cards.entries()) {
        const session = avaChooseCard(AvaLearningSessionSchema.parse({ id: collection.id }), index);
        const choices = avaRecognitionChoices(session);
        expect(choices).toHaveLength(2);
        expect(new Set(choices.map((choice) => choice.id)).size).toBe(2);
        expect(choices).toContain(card);
        if (card.opposite) expect(choices.some((choice) => choice.id === card.opposite)).toBe(true);
        expect(avaRecognitionChoices({ ...session, questionNumber: 1 })).toEqual(
          [...choices].reverse(),
        );
      }
    }
  });
  test("a small set cycles without skipping the last two position cards", () => {
    let session = avaChooseCard(AvaLearningSessionSchema.parse({ id: "ava-positions" }), 10);
    expect(avaLittleSet(session).map((card) => card.id)).toEqual(["near", "far"]);
    session = avaPracticeNext(session);
    expect(session.selectedIndex).toBe(11);
    session = avaPracticeNext(session);
    expect(session.selectedIndex).toBe(10);
    expect(session.records.near?.introduced).toBe(true);
    expect(session.records.far?.introduced).toBe(true);
    expect(session.questionNumber).toBe(2);
  });
  test("recognition records wrong and right attempts without changing another collection", () => {
    const initial = AvaLearningSessionSchema.parse({
      id: "ava-actions",
      viewMode: "video",
      mode: "recognize",
    });
    const wrong = avaRecognitionChoices(initial).find((card) => card.id !== "jump");
    if (!wrong) throw new Error("A contrasting action is required");
    const retry = avaAnswer(initial, wrong.id);
    expect(retry.records.jump).toEqual({ introduced: false, attempts: 1, correct: 0 });
    const correct = avaAnswer(retry, "jump");
    expect(correct.records.jump).toEqual({ introduced: true, attempts: 2, correct: 1 });
    expect(avaPracticeNext(correct).selectedIndex).toBe(1);
    expect(correct.viewMode).toBe("video");
    expect(initial.records).toEqual({});
    expect(AvaLearningSessionSchema.parse({ id: "ava-needs" }).records).toEqual({});
    expect(() => avaAnswer(initial, "not-a-choice")).toThrow();
  });
  test("Connect reuses actions with real supported subjects and scene IDs", () => {
    const initial = AvaLearningSessionSchema.parse({
      id: "ava-actions",
      mode: "connect",
      subject: "dog",
    });
    expect(avaConnectPhrase(initial)).toBe("Dog jumps");
    expect(avaSceneId(avaSelectedCard(initial), initial.subject)).toBe("dog-jump");
    const washing = avaChooseCard(initial, 4);
    expect(washing.subject).toBe("ava");
    expect(avaConnectPhrase(washing)).toBe("Ava washes");
    expect(avaAvailableSubjects(avaSelectedCard(washing))).not.toContain("dog");
    expect(
      avaConnectPhrase(avaChooseCard(AvaLearningSessionSchema.parse({ id: "ava-positions" }), 3)),
    ).toBe("Ball under table");
  });
  test("rejects broken saved progress and out-of-range card choices", () => {
    for (const invalid of [
      { id: "ava-actions", selectedIndex: 20 },
      { id: "ava-positions", selectedIndex: 12 },
      { id: "ava-actions", selectedIndex: 6, setStart: 0 },
      { id: "ava-actions", setStart: 3 },
      { id: "ava-actions", records: { jump: { attempts: 1, correct: 2 } } },
    ])
      expect(AvaLearningSessionSchema.safeParse(invalid).success).toBe(false);
    expect(() =>
      avaChooseCard(AvaLearningSessionSchema.parse({ id: "ava-actions" }), -1),
    ).toThrow();
  });
});
