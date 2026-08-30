import { describe, expect, test } from "bun:test";
import { AVA_FIRST_WORDS_SESSION_DEFAULT, AvaFirstWordsSessionSchema } from "@mind-palace/schemas";

import {
  AVA_FIRST_WORD_VIDEO_CLIPS,
  AvaFirstWordSlugSchema,
  AvaFirstWordVideoManifestSchema,
} from "./ava-first-word-videos";
import {
  AVA_FIRST_WORD_CARDS,
  AVA_FIRST_WORD_CATEGORY_IDS,
  AvaFirstWordCardSchema,
  AvaFirstWordCatalogSchema,
  AvaFirstWordVideoClipSchema,
  buildAvaFirstWordsDeck,
  countAvaFirstWordsReviewedCards,
  getAvaFirstWordCardsByCategory,
  nextAvaFirstWordDueAt,
  rateAvaFirstWordCard,
  selectAvaFirstWordCard,
} from "./ava-first-words";

const NOW = 1_000_000_000;

const EXPECTED_SLUGS = AvaFirstWordSlugSchema.array()
  .length(100)
  .parse([
    "mommy",
    "daddy",
    "baby",
    "grandma",
    "grandpa",
    "brother",
    "sister",
    "friend",
    "boy",
    "girl",
    "dog",
    "cat",
    "bird",
    "fish",
    "cow",
    "horse",
    "duck",
    "bunny",
    "bear",
    "frog",
    "apple",
    "banana",
    "milk",
    "water",
    "bread",
    "cheese",
    "egg",
    "cookie",
    "juice",
    "peas",
    "eyes",
    "nose",
    "mouth",
    "ears",
    "hands",
    "feet",
    "hair",
    "teeth",
    "belly",
    "face",
    "bed",
    "chair",
    "table",
    "door",
    "window",
    "light",
    "bath",
    "book",
    "blanket",
    "phone",
    "ball",
    "blocks",
    "doll",
    "teddy-bear",
    "car",
    "train",
    "bubbles",
    "puzzle",
    "crayon",
    "drum",
    "sun",
    "moon",
    "star",
    "tree",
    "flower",
    "grass",
    "rain",
    "cloud",
    "rock",
    "leaf",
    "bus",
    "truck",
    "bicycle",
    "airplane",
    "boat",
    "stroller",
    "wagon",
    "tractor",
    "helicopter",
    "scooter",
    "eat",
    "drink",
    "sleep",
    "sit",
    "stand",
    "walk",
    "run",
    "jump",
    "clap",
    "hug",
    "more",
    "all-done",
    "yes",
    "no",
    "please",
    "thank-you",
    "help",
    "up",
    "down",
    "go",
  ]);

describe("Ava first-word catalog", () => {
  test("contains the exact 100 generated words in teaching order", () => {
    expect(AVA_FIRST_WORD_CARDS.map((card) => card.slug)).toEqual(EXPECTED_SLUGS);
    expect(new Set(EXPECTED_SLUGS).size).toBe(100);
  });

  test("contains ten cards in each of the ten categories", () => {
    expect(AVA_FIRST_WORD_CATEGORY_IDS).toHaveLength(10);
    for (const category of AVA_FIRST_WORD_CATEGORY_IDS) {
      expect(getAvaFirstWordCardsByCategory(category)).toHaveLength(10);
    }
  });

  test("gives all 100 cards a generated local image and valid five-second video clip", () => {
    expect(Object.keys(AVA_FIRST_WORD_VIDEO_CLIPS)).toHaveLength(100);
    expect(AvaFirstWordVideoManifestSchema.safeParse(AVA_FIRST_WORD_VIDEO_CLIPS).success).toBe(
      true,
    );

    for (const card of AVA_FIRST_WORD_CARDS) {
      expect(card.imagePath).toBe(`ava-first-words/images/${card.slug}.webp`);
      expect(card.videoClip).toEqual(AVA_FIRST_WORD_VIDEO_CLIPS[card.slug]);
      expect(AvaFirstWordVideoClipSchema.safeParse(card.videoClip).success).toBe(true);
    }
  });

  test("rejects card paths that do not match their slug", () => {
    const first = AVA_FIRST_WORD_CARDS[0];
    if (!first) throw new Error("first-word catalog is empty");
    const result = AvaFirstWordCardSchema.safeParse({ ...first, imagePath: "wrong.webp" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["imagePath"]);
  });

  test("rejects malformed or non-five-second video clips", () => {
    expect(
      AvaFirstWordVideoClipSchema.safeParse({
        youtubeVideoId: "too-short",
        startSeconds: 0,
        durationSeconds: 4,
        sourceTitle: "Source title",
        sourceChannel: "Source channel",
      }).success,
    ).toBe(false);
  });

  test("rejects incomplete catalogs", () => {
    expect(AvaFirstWordCatalogSchema.safeParse(AVA_FIRST_WORD_CARDS.slice(1)).success).toBe(false);
  });
});

describe("Ava first-word review", () => {
  test("starts with every fresh card in deterministic catalog order", () => {
    const deck = buildAvaFirstWordsDeck(AVA_FIRST_WORDS_SESSION_DEFAULT, NOW);
    expect(deck.map((card) => card.slug)).toEqual(EXPECTED_SLUGS);
    expect(selectAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, NOW)?.slug).toBe("mommy");
  });

  test("puts due reviews first, ordered by due time then catalog order", () => {
    const dogReviewed = rateAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, "dog", "easy", NOW);
    const catReviewed = rateAvaFirstWordCard(dogReviewed, "cat", "easy", NOW);
    const dogState = catReviewed.states.dog;
    const catState = catReviewed.states.cat;
    if (!dogState || !catState) throw new Error("review fixtures are missing");

    const overdue = AvaFirstWordsSessionSchema.parse({
      ...catReviewed,
      states: {
        ...catReviewed.states,
        dog: { ...dogState, due: NOW - 1 },
        cat: { ...catState, due: NOW - 1 },
      },
    });
    expect(
      buildAvaFirstWordsDeck(overdue, NOW)
        .slice(0, 2)
        .map((card) => card.slug),
    ).toEqual(["dog", "cat"]);
  });

  test("excludes reviewed cards that are not due", () => {
    const reviewed = rateAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, "mommy", "easy", NOW);
    expect(buildAvaFirstWordsDeck(reviewed, NOW).some((card) => card.slug === "mommy")).toBe(false);
  });

  test("ratings update the existing SRS state", () => {
    const once = rateAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, "apple", "again", NOW);
    const twice = rateAvaFirstWordCard(once, "apple", "good", NOW + 60_000);
    expect(once.states.apple?.reps).toBe(1);
    expect(twice.states.apple?.reps).toBe(2);
    expect(twice.states.apple?.phase).toBe("learning");
    expect(twice.states.apple?.step).toBe(1);
  });

  test("reports reviewed-card count and the next due timestamp", () => {
    const once = rateAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, "eyes", "again", NOW);
    const twice = rateAvaFirstWordCard(once, "bed", "easy", NOW);
    expect(countAvaFirstWordsReviewedCards(twice)).toBe(2);
    expect(nextAvaFirstWordDueAt(twice)).toBe(
      Math.min(twice.states.eyes?.due ?? Infinity, twice.states.bed?.due ?? Infinity),
    );
  });

  test("rejects unknown word slugs", () => {
    expect(() =>
      rateAvaFirstWordCard(AVA_FIRST_WORDS_SESSION_DEFAULT, "not-a-word", "good", NOW),
    ).toThrow("Unknown Ava first-word card: not-a-word");
  });
});
