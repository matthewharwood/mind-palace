import { type AvaFirstWordsSession, AvaFirstWordsSessionSchema } from "@mind-palace/schemas";
import { createCardState, isDue, type Rating, review } from "@mind-palace/srs";
import * as z from "zod";

import {
  AVA_FIRST_WORD_VIDEO_CLIPS,
  AvaFirstWordSlugSchema,
  AvaFirstWordVideoClipSchema,
} from "./ava-first-word-videos";

export {
  type AvaFirstWordVideoClip,
  AvaFirstWordVideoClipSchema,
} from "./ava-first-word-videos";

export const AVA_FIRST_WORD_CATEGORY_IDS = [
  "family",
  "animals",
  "food",
  "body",
  "home",
  "toys",
  "outside",
  "things-that-go",
  "actions",
  "needs-and-social",
] as const;

export const AvaFirstWordCategorySchema = z.enum(AVA_FIRST_WORD_CATEGORY_IDS);
export type AvaFirstWordCategory = z.infer<typeof AvaFirstWordCategorySchema>;

export const AVA_FIRST_WORD_CATEGORY_LABELS = {
  family: "Family",
  animals: "Animals",
  food: "Food",
  body: "Body",
  home: "Home",
  toys: "Toys",
  outside: "Outside",
  "things-that-go": "Things That Go",
  actions: "Actions",
  "needs-and-social": "Needs & Social",
} satisfies Record<AvaFirstWordCategory, string>;

export const AvaFirstWordCardSchema = z
  .object({
    slug: AvaFirstWordSlugSchema,
    label: z.string().min(1),
    category: AvaFirstWordCategorySchema,
    imagePath: z.string().min(1),
    videoClip: AvaFirstWordVideoClipSchema,
  })
  .refine((card) => card.imagePath === `ava-first-words/images/${card.slug}.webp`, {
    error: "imagePath must match the card slug",
    path: ["imagePath"],
  });
export type AvaFirstWordCard = z.infer<typeof AvaFirstWordCardSchema>;

export const AvaFirstWordCatalogSchema = z
  .array(AvaFirstWordCardSchema)
  .length(100)
  .refine((cards) => new Set(cards.map((card) => card.slug)).size === cards.length, {
    error: "first-word card slugs must be unique",
  })
  .refine(
    (cards) =>
      AVA_FIRST_WORD_CATEGORY_IDS.every(
        (category) => cards.filter((card) => card.category === category).length === 10,
      ),
    { error: "each first-word category must contain exactly ten cards" },
  );

const AvaFirstWordLexemeSchema = z.object({
  slug: AvaFirstWordSlugSchema,
  label: z.string().min(1),
});

const AvaFirstWordGroupSchema = z.object({
  category: AvaFirstWordCategorySchema,
  words: z.array(AvaFirstWordLexemeSchema).length(10),
});

const WORD_GROUPS = z
  .array(AvaFirstWordGroupSchema)
  .length(10)
  .parse([
    {
      category: "family",
      words: [
        { slug: "mommy", label: "Mommy" },
        { slug: "daddy", label: "Daddy" },
        { slug: "baby", label: "Baby" },
        { slug: "grandma", label: "Grandma" },
        { slug: "grandpa", label: "Grandpa" },
        { slug: "brother", label: "Brother" },
        { slug: "sister", label: "Sister" },
        { slug: "friend", label: "Friend" },
        { slug: "boy", label: "Boy" },
        { slug: "girl", label: "Girl" },
      ],
    },
    {
      category: "animals",
      words: [
        { slug: "dog", label: "Dog" },
        { slug: "cat", label: "Cat" },
        { slug: "bird", label: "Bird" },
        { slug: "fish", label: "Fish" },
        { slug: "cow", label: "Cow" },
        { slug: "horse", label: "Horse" },
        { slug: "duck", label: "Duck" },
        { slug: "bunny", label: "Bunny" },
        { slug: "bear", label: "Bear" },
        { slug: "frog", label: "Frog" },
      ],
    },
    {
      category: "food",
      words: [
        { slug: "apple", label: "Apple" },
        { slug: "banana", label: "Banana" },
        { slug: "milk", label: "Milk" },
        { slug: "water", label: "Water" },
        { slug: "bread", label: "Bread" },
        { slug: "cheese", label: "Cheese" },
        { slug: "egg", label: "Egg" },
        { slug: "cookie", label: "Cookie" },
        { slug: "juice", label: "Juice" },
        { slug: "peas", label: "Peas" },
      ],
    },
    {
      category: "body",
      words: [
        { slug: "eyes", label: "Eyes" },
        { slug: "nose", label: "Nose" },
        { slug: "mouth", label: "Mouth" },
        { slug: "ears", label: "Ears" },
        { slug: "hands", label: "Hands" },
        { slug: "feet", label: "Feet" },
        { slug: "hair", label: "Hair" },
        { slug: "teeth", label: "Teeth" },
        { slug: "belly", label: "Belly" },
        { slug: "face", label: "Face" },
      ],
    },
    {
      category: "home",
      words: [
        { slug: "bed", label: "Bed" },
        { slug: "chair", label: "Chair" },
        { slug: "table", label: "Table" },
        { slug: "door", label: "Door" },
        { slug: "window", label: "Window" },
        { slug: "light", label: "Light" },
        { slug: "bath", label: "Bath" },
        { slug: "book", label: "Book" },
        { slug: "blanket", label: "Blanket" },
        { slug: "phone", label: "Phone" },
      ],
    },
    {
      category: "toys",
      words: [
        { slug: "ball", label: "Ball" },
        { slug: "blocks", label: "Blocks" },
        { slug: "doll", label: "Doll" },
        { slug: "teddy-bear", label: "Teddy Bear" },
        { slug: "car", label: "Car" },
        { slug: "train", label: "Train" },
        { slug: "bubbles", label: "Bubbles" },
        { slug: "puzzle", label: "Puzzle" },
        { slug: "crayon", label: "Crayon" },
        { slug: "drum", label: "Drum" },
      ],
    },
    {
      category: "outside",
      words: [
        { slug: "sun", label: "Sun" },
        { slug: "moon", label: "Moon" },
        { slug: "star", label: "Star" },
        { slug: "tree", label: "Tree" },
        { slug: "flower", label: "Flower" },
        { slug: "grass", label: "Grass" },
        { slug: "rain", label: "Rain" },
        { slug: "cloud", label: "Cloud" },
        { slug: "rock", label: "Rock" },
        { slug: "leaf", label: "Leaf" },
      ],
    },
    {
      category: "things-that-go",
      words: [
        { slug: "bus", label: "Bus" },
        { slug: "truck", label: "Truck" },
        { slug: "bicycle", label: "Bicycle" },
        { slug: "airplane", label: "Airplane" },
        { slug: "boat", label: "Boat" },
        { slug: "stroller", label: "Stroller" },
        { slug: "wagon", label: "Wagon" },
        { slug: "tractor", label: "Tractor" },
        { slug: "helicopter", label: "Helicopter" },
        { slug: "scooter", label: "Scooter" },
      ],
    },
    {
      category: "actions",
      words: [
        { slug: "eat", label: "Eat" },
        { slug: "drink", label: "Drink" },
        { slug: "sleep", label: "Sleep" },
        { slug: "sit", label: "Sit" },
        { slug: "stand", label: "Stand" },
        { slug: "walk", label: "Walk" },
        { slug: "run", label: "Run" },
        { slug: "jump", label: "Jump" },
        { slug: "clap", label: "Clap" },
        { slug: "hug", label: "Hug" },
      ],
    },
    {
      category: "needs-and-social",
      words: [
        { slug: "more", label: "More" },
        { slug: "all-done", label: "All done" },
        { slug: "yes", label: "Yes" },
        { slug: "no", label: "No" },
        { slug: "please", label: "Please" },
        { slug: "thank-you", label: "Thank you" },
        { slug: "help", label: "Help" },
        { slug: "up", label: "Up" },
        { slug: "down", label: "Down" },
        { slug: "go", label: "Go" },
      ],
    },
  ]);

export const AVA_FIRST_WORD_CARDS: readonly AvaFirstWordCard[] = AvaFirstWordCatalogSchema.parse(
  WORD_GROUPS.flatMap(({ category, words }) =>
    words.map(({ slug, label }) => ({
      slug,
      label,
      category,
      imagePath: `ava-first-words/images/${slug}.webp`,
      videoClip: AVA_FIRST_WORD_VIDEO_CLIPS[slug],
    })),
  ),
);

const CARD_ORDER = new Map(AVA_FIRST_WORD_CARDS.map((card, index) => [card.slug, index]));

export function getAvaFirstWordCardsByCategory(category: AvaFirstWordCategory): AvaFirstWordCard[] {
  const parsedCategory = AvaFirstWordCategorySchema.parse(category);
  return AVA_FIRST_WORD_CARDS.filter((card) => card.category === parsedCategory);
}

export function buildAvaFirstWordsDeck(
  session: AvaFirstWordsSession,
  now: number = Date.now(),
): AvaFirstWordCard[] {
  const parsed = AvaFirstWordsSessionSchema.parse(session);
  const due: AvaFirstWordCard[] = [];
  const fresh: AvaFirstWordCard[] = [];

  for (const card of AVA_FIRST_WORD_CARDS) {
    const state = parsed.states[card.slug];
    if (!state || state.reps === 0) {
      fresh.push(card);
    } else if (isDue(state, now)) {
      due.push(card);
    }
  }

  due.sort((a, b) => {
    const dueDifference =
      (parsed.states[a.slug]?.due ?? Number.MAX_SAFE_INTEGER) -
      (parsed.states[b.slug]?.due ?? Number.MAX_SAFE_INTEGER);
    if (dueDifference !== 0) return dueDifference;
    return (CARD_ORDER.get(a.slug) ?? 0) - (CARD_ORDER.get(b.slug) ?? 0);
  });

  return [...due, ...fresh];
}

export function selectAvaFirstWordCard(
  session: AvaFirstWordsSession,
  now: number = Date.now(),
): AvaFirstWordCard | undefined {
  return buildAvaFirstWordsDeck(session, now)[0];
}

export function rateAvaFirstWordCard(
  session: AvaFirstWordsSession,
  slug: string,
  rating: Rating,
  now: number = Date.now(),
): AvaFirstWordsSession {
  const parsed = AvaFirstWordsSessionSchema.parse(session);
  const card = AVA_FIRST_WORD_CARDS.find((candidate) => candidate.slug === slug);
  if (!card) throw new Error(`Unknown Ava first-word card: ${slug}`);

  const current = parsed.states[card.slug] ?? createCardState({ now });
  const result = review(current, rating, { now });
  return AvaFirstWordsSessionSchema.parse({
    ...parsed,
    states: { ...parsed.states, [card.slug]: result.state },
  });
}

export function countAvaFirstWordsReviewedCards(session: AvaFirstWordsSession): number {
  const parsed = AvaFirstWordsSessionSchema.parse(session);
  return Object.values(parsed.states).filter((state) => state.reps > 0).length;
}

export function nextAvaFirstWordDueAt(session: AvaFirstWordsSession): number | undefined {
  const parsed = AvaFirstWordsSessionSchema.parse(session);
  const dueTimes = Object.values(parsed.states).map((state) => state.due);
  return dueTimes.length > 0 ? Math.min(...dueTimes) : undefined;
}
