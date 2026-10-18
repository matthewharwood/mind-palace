import { AvaLearningSessionSchema } from "@mind-palace/schemas";
import * as z from "zod";
import { AVA_FIRST_WORD_CARDS } from "../../app/lib/ava-first-words";
import { avaConnectPhrase } from "../../app/lib/ava-learning";
import { AVA_COLLECTIONS, avaActionPhrase } from "../../app/lib/ava-learning-catalog";
import { AVA_SHAPE_CARDS, avaShapeAnswer } from "../../app/lib/ava-shapes";
import { getAvaSymbolCards, getAvaSymbolLabel } from "../../app/lib/ava-symbols";

const LineSchema = z.object({ id: z.string(), text: z.string() });
const lines = new Map<string, z.infer<typeof LineSchema>>();
for (const collection of AVA_COLLECTIONS)
  for (const card of collection.cards) {
    const id = `${collection.id}-${card.id}`;
    lines.set(id, { id, text: card.label });
    lines.set(`${id}-question`, { id: `${id}-question`, text: card.prompt });
    const phrase = avaConnectPhrase(
      AvaLearningSessionSchema.parse({
        id: collection.id,
        selectedIndex: collection.cards.indexOf(card),
        setStart: Math.floor(collection.cards.indexOf(card) / 5) * 5,
      }),
    );
    lines.set(`${id}-connect`, { id: `${id}-connect`, text: phrase });
    if (collection.id === "ava-actions")
      for (const subject of [
        "ava",
        "mommy",
        "daddy",
        ...(["jump", "run", "walk", "sleep", "eat", "drink"].includes(card.action) ? ["dog"] : []),
      ]) {
        const phraseId = `phrase-${subject}-${card.action}`;
        lines.set(phraseId, { id: phraseId, text: avaActionPhrase(card.action, subject) });
      }
  }
for (const card of AVA_FIRST_WORD_CARDS)
  lines.set(`word-${card.slug}`, { id: `word-${card.slug}`, text: card.label });
for (const app of ["ava-numbers", "ava-letters"] as const)
  for (const card of getAvaSymbolCards(app))
    lines.set(`${app}-${card.id}`, { id: `${app}-${card.id}`, text: getAvaSymbolLabel(card) });
for (const card of AVA_SHAPE_CARDS)
  lines.set(`shape-${card.id}`, { id: `shape-${card.id}`, text: avaShapeAnswer(card) });
const all = [...lines.values()];
const batches = Array.from({ length: Math.ceil(all.length / 35) }, (_, i) => ({
  id: i,
  lines: all.slice(i * 35, (i + 1) * 35),
}));
await Bun.write(
  new URL("./audio-batches.json", import.meta.url),
  `${JSON.stringify(batches, null, 2)}\n`,
);
process.stdout.write(`Prepared ${all.length} local speech clips in ${batches.length} batches.\n`);
