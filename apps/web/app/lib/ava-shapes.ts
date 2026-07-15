import {
  type AvaShapeCard,
  AvaShapeCardSchema,
  type AvaShapeColor,
  type AvaShapeKind,
  type AvaShapesSession,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";
import { createCardState, isDue, type Rating, review } from "@mind-palace/srs";

export const AVA_SHAPE_KINDS = ["square", "oval", "rhombus", "circle", "triangle"] as const;

export const AVA_SHAPE_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

const COLORLESS: AvaShapeColor = "colorless";

function createShapeCard(shape: AvaShapeKind, color: AvaShapeColor): AvaShapeCard {
  return AvaShapeCardSchema.parse({ id: `${color}-${shape}`, shape, color });
}

export const AVA_COLORLESS_SHAPE_CARDS: readonly AvaShapeCard[] = AVA_SHAPE_KINDS.map((shape) =>
  createShapeCard(shape, COLORLESS),
);

export const AVA_COLOR_SHAPE_CARDS: readonly AvaShapeCard[] = AVA_SHAPE_COLORS.flatMap((color) =>
  AVA_SHAPE_KINDS.map((shape) => createShapeCard(shape, color)),
);

export const AVA_SHAPE_CARDS: readonly AvaShapeCard[] = [
  ...AVA_COLORLESS_SHAPE_CARDS,
  ...AVA_COLOR_SHAPE_CARDS,
];

export function areAvaColorsUnlocked(session: AvaShapesSession): boolean {
  const parsed = AvaShapesSessionSchema.parse(session);
  return AVA_COLORLESS_SHAPE_CARDS.every((card) => (parsed.states[card.id]?.reps ?? 0) > 0);
}

export function buildAvaShapeDeck(
  session: AvaShapesSession,
  now: number = Date.now(),
): AvaShapeCard[] {
  const parsed = AvaShapesSessionSchema.parse(session);
  const eligible = areAvaColorsUnlocked(parsed) ? AVA_SHAPE_CARDS : AVA_COLORLESS_SHAPE_CARDS;
  const due: AvaShapeCard[] = [];
  const fresh: AvaShapeCard[] = [];

  for (const card of eligible) {
    const state = parsed.states[card.id];
    if (!state || state.reps === 0) {
      fresh.push(card);
    } else if (isDue(state, now)) {
      due.push(card);
    }
  }

  due.sort((a, b) => {
    const aState = parsed.states[a.id];
    const bState = parsed.states[b.id];
    if (!aState || !bState) return 0;
    return aState.due - bState.due;
  });

  return [...due, ...fresh];
}

export function selectAvaShapeCard(
  session: AvaShapesSession,
  now: number = Date.now(),
): AvaShapeCard | undefined {
  return buildAvaShapeDeck(session, now)[0];
}

export function rateAvaShapeCard(
  session: AvaShapesSession,
  cardId: string,
  rating: Rating,
  now: number = Date.now(),
): AvaShapesSession {
  const parsed = AvaShapesSessionSchema.parse(session);
  const card = AVA_SHAPE_CARDS.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Unknown Ava shape card: ${cardId}`);

  const current = parsed.states[card.id] ?? createCardState({ now });
  const result = review(current, rating, { now });
  return AvaShapesSessionSchema.parse({
    ...parsed,
    states: { ...parsed.states, [card.id]: result.state },
  });
}

export function avaShapeAnswer(card: AvaShapeCard): string {
  const parsed = AvaShapeCardSchema.parse(card);
  return parsed.color === COLORLESS
    ? titleCase(parsed.shape)
    : `${titleCase(parsed.color)} ${parsed.shape}`;
}

export function avaShapePrompt(card: AvaShapeCard): string {
  return card.color === COLORLESS ? "What shape is this?" : "What color and shape is this?";
}

export function countAvaReviewedCards(session: AvaShapesSession): number {
  const parsed = AvaShapesSessionSchema.parse(session);
  return Object.values(parsed.states).filter((state) => state.reps > 0).length;
}

export function nextAvaShapeDueAt(session: AvaShapesSession): number | undefined {
  const parsed = AvaShapesSessionSchema.parse(session);
  const dueTimes = Object.values(parsed.states).map((state) => state.due);
  return dueTimes.length > 0 ? Math.min(...dueTimes) : undefined;
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
