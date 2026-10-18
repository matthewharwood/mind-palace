import {
  type AvaSymbolApp,
  type AvaSymbolRepresentation,
  type AvaSymbolsSession,
  AvaSymbolsSessionSchema,
} from "@mind-palace/schemas";
import { createCardState, isDue, type Rating, review } from "@mind-palace/srs";
import * as z from "zod";

export const AvaSymbolCardSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("number"),
    id: z.string().min(1),
    value: z.int().min(0).max(10),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("letter"),
    id: z.string().regex(/^[a-z]$/),
    upper: z.string().regex(/^[A-Z]$/),
    lower: z.string().regex(/^[a-z]$/),
    label: z.string().min(1),
    picture: z.string().min(1),
  }),
]);
export type AvaSymbolCard = z.infer<typeof AvaSymbolCardSchema>;

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;
const LETTER_EXAMPLES = [
  ["Apple", "🍎"],
  ["Ball", "⚽"],
  ["Cat", "🐱"],
  ["Dog", "🐶"],
  ["Egg", "🥚"],
  ["Fish", "🐟"],
  ["Goat", "🐐"],
  ["Hat", "🎩"],
  ["Igloo", "🧊"],
  ["Juice", "🧃"],
  ["Kite", "🪁"],
  ["Lion", "🦁"],
  ["Moon", "🌙"],
  ["Nest", "🪺"],
  ["Orange", "🍊"],
  ["Pig", "🐷"],
  ["Queen", "👸"],
  ["Rainbow", "🌈"],
  ["Sun", "☀️"],
  ["Tree", "🌳"],
  ["Umbrella", "☂️"],
  ["Violin", "🎻"],
  ["Whale", "🐳"],
  ["Xylophone", "🎹"],
  ["Yo-yo", "🪀"],
  ["Zebra", "🦓"],
] as const;

const NUMBER_CARDS = NUMBER_WORDS.map((label, value) =>
  AvaSymbolCardSchema.parse({ kind: "number", id: String(value), value, label }),
);
const LETTER_CARDS = LETTER_EXAMPLES.map(([label, picture], index) => {
  const upper = String.fromCharCode(65 + index);
  return AvaSymbolCardSchema.parse({
    kind: "letter",
    id: upper.toLowerCase(),
    upper,
    lower: upper.toLowerCase(),
    label,
    picture,
  });
});

export function getAvaSymbolCards(app: AvaSymbolApp): readonly AvaSymbolCard[] {
  return app === "ava-numbers" ? NUMBER_CARDS : LETTER_CARDS;
}

export function getAvaSymbolLabel(card: AvaSymbolCard): string {
  return card.kind === "number" ? card.label : `${card.upper} for ${card.label}`;
}

export function rateAvaSymbolCard(
  session: AvaSymbolsSession,
  rating: Rating,
  now: number,
): AvaSymbolsSession {
  const parsed = AvaSymbolsSessionSchema.parse(session);
  const cards = getAvaSymbolCards(parsed.id);
  const card = cards[parsed.selectedIndex];
  if (!card) throw new Error("The selected symbol is missing from its deck");
  const result = review(parsed.states[card.id] ?? createCardState({ now }), rating, { now });
  const states = { ...parsed.states, [card.id]: result.state };
  // Oldest due review first, then the next new card. Browsing stays available
  // when every card is resting; it never erases the scheduling overlay.
  const due = cards
    .map((candidate, index) => ({ index, state: states[candidate.id] }))
    .filter(({ state }) => state && state.reps > 0 && isDue(state, now))
    .sort((a, b) => (a.state?.due ?? 0) - (b.state?.due ?? 0));
  const freshIndex = cards.findIndex((candidate) => !states[candidate.id]?.reps);
  return AvaSymbolsSessionSchema.parse({
    ...parsed,
    states,
    selectedIndex:
      due[0]?.index ?? (freshIndex >= 0 ? freshIndex : (parsed.selectedIndex + 1) % cards.length),
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CUSTOM_LETTER_PICTURES: Readonly<Record<string, string>> = {
  i: '<path d="M190 360 A130 130 0 0 1 450 360Z" fill="#c2e4ef" stroke="#7aaec2" stroke-width="6"/><path d="M280 360V300a40 40 0 0 1 80 0v60" fill="#508ca5"/><path d="M210 300h220M240 250h160M260 300v60M380 300v60M320 230v30" fill="none" stroke="#7aaec2" stroke-width="5"/>',
  x: '<g transform="rotate(-12 320 300)"><path d="M190 260v110m260-110v110" stroke="#b0916e" stroke-width="14"/><rect x="180" y="240" width="34" height="150" rx="8" fill="#ef6476"/><rect x="224" y="250" width="34" height="130" rx="8" fill="#ffaf48"/><rect x="268" y="260" width="34" height="110" rx="8" fill="#f5d363"/><rect x="312" y="270" width="34" height="90" rx="8" fill="#69be93"/><rect x="356" y="280" width="34" height="70" rx="8" fill="#66afd9"/><rect x="400" y="290" width="34" height="50" rx="8" fill="#a88bce"/></g>',
};

export function buildAvaSymbolSvg(
  card: AvaSymbolCard,
  representation: AvaSymbolRepresentation,
): string {
  const color = card.kind === "number" ? "#087f8c" : "#7951b0";
  let content: string;
  if (card.kind === "number" && representation === "alternate") {
    const cells = Array.from({ length: 10 }, (_, index) => {
      const x = 104 + (index % 5) * 108;
      const y = 260 + Math.floor(index / 5) * 108;
      return `<rect x="${x - 46}" y="${y - 46}" width="92" height="92" rx="16" fill="#f0e9dd"/><circle cx="${x}" cy="${y}" r="31" fill="${index < card.value ? color : "#ded7ca"}"/>`;
    }).join("");
    const countedLabel = `${card.label} ${card.value === 1 ? "dot" : "dots"}`;
    const caption = card.value === 0 ? "No dots. That is zero!" : countedLabel;
    content = `<text x="320" y="140" font-size="64">${card.value}</text>${cells}<text x="320" y="502" font-size="30">${caption}</text>`;
  } else if (card.kind === "number") {
    const word = representation === "word";
    content = `<text x="320" y="342" font-size="${word ? 108 : 244}">${word ? card.label : card.value}</text><text x="320" y="466" font-size="${word ? 72 : 42}">${word ? card.value : card.label.toLowerCase()}</text>`;
  } else if (representation === "word") {
    const picture =
      CUSTOM_LETTER_PICTURES[card.id] ??
      `<text x="320" y="365" font-size="180">${card.picture}</text>`;
    content = `<text x="320" y="140" font-size="64">${card.upper} ${card.lower}</text>${picture}<text x="320" y="500" font-size="58">${escapeXml(card.label)}</text>`;
  } else {
    content = `<text x="320" y="365" font-size="260">${representation === "alternate" ? card.lower : card.upper}</text><text x="320" y="495" font-size="44">${card.upper} ${card.lower}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" rx="36" fill="#fffaf0"/><g fill="${color}" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">${content}</g></svg>`;
}

export function buildAvaSymbolImage(
  card: AvaSymbolCard,
  representation: AvaSymbolRepresentation,
): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildAvaSymbolSvg(card, representation))}`;
}
