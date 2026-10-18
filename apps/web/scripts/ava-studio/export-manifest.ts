import { AvaShapeColorSchema } from "@mind-palace/schemas";
import { AVA_FIRST_WORD_CARDS } from "../../app/lib/ava-first-words";
import { AVA_COLLECTIONS, avaSceneId } from "../../app/lib/ava-learning-catalog";
import { AvaStudioManifestSchema, type AvaStudioSceneSpec } from "../../app/lib/ava-studio";

const scenes = new Map<string, AvaStudioSceneSpec>();
for (const collection of AVA_COLLECTIONS) {
  for (const card of collection.cards) {
    const subjects =
      collection.id === "ava-actions"
        ? [
            "ava",
            "mommy",
            "daddy",
            ...(["jump", "run", "walk", "sleep", "eat", "drink"].includes(card.action)
              ? ["dog"]
              : []),
          ]
        : [card.subject];
    for (const subject of subjects) {
      const id = avaSceneId(card, subject);
      scenes.set(id, { id, action: card.action, subject, label: card.label });
    }
  }
}
for (const card of AVA_FIRST_WORD_CARDS)
  scenes.set(`word-${card.slug}`, {
    id: `word-${card.slug}`,
    action: `word-${card.slug}`,
    subject: "ava",
    label: card.label,
  });
for (let n = 0; n <= 10; n++)
  scenes.set(`number-${n}`, {
    id: `number-${n}`,
    action: `number-${n}`,
    subject: "ava",
    label: String(n),
  });
for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
  scenes.set(`letter-${letter.toLowerCase()}`, {
    id: `letter-${letter.toLowerCase()}`,
    action: `letter-${letter}`,
    subject: "ava",
    label: letter,
  });
for (const shape of ["square", "oval", "rhombus", "circle", "triangle"])
  for (const color of AvaShapeColorSchema.options) {
    const id = `shape-${shape}-${color}`;
    scenes.set(id, { id, action: id, subject: "ava", label: `${color} ${shape}` });
  }
await Bun.write(
  new URL("./manifest.json", import.meta.url),
  `${JSON.stringify(AvaStudioManifestSchema.parse([...scenes.values()]), null, 2)}\n`,
);
process.stdout.write(`Prepared ${scenes.size} semantic scenes.\n`);
