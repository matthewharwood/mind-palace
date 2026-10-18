import {
  AvaLearningRecordSchema,
  type AvaLearningSession,
  AvaLearningSessionSchema,
} from "@mind-palace/schemas";
import { type AvaLearningCard, avaActionPhrase, getAvaCollection } from "./ava-learning-catalog";

export function avaAvailableSubjects(
  card: AvaLearningCard,
): readonly ("ava" | "mommy" | "daddy" | "dog")[] {
  return ["jump", "run", "walk", "sleep", "eat", "drink"].includes(card.action)
    ? ["ava", "mommy", "daddy", "dog"]
    : ["ava", "mommy", "daddy"];
}
export function avaSelectedCard(session: AvaLearningSession): AvaLearningCard {
  const card = getAvaCollection(session.id).cards[session.selectedIndex];
  if (!card) throw new Error("This card is outside the collection");
  return card;
}
export function avaLittleSet(session: AvaLearningSession): readonly AvaLearningCard[] {
  return getAvaCollection(session.id).cards.slice(session.setStart, session.setStart + 5);
}
export function avaRecognitionChoices(session: AvaLearningSession): readonly AvaLearningCard[] {
  const selected = avaSelectedCard(session);
  const cards = getAvaCollection(session.id).cards;
  const contrast =
    cards.find((card) => card.id === selected.opposite) ??
    cards[(session.selectedIndex + 1) % cards.length];
  if (!contrast) throw new Error("Recognition needs a contrasting card");
  return session.questionNumber % 2 === 0 ? [contrast, selected] : [selected, contrast];
}
export function avaChooseCard(session: AvaLearningSession, index: number): AvaLearningSession {
  const card = getAvaCollection(session.id).cards[index];
  if (!card) throw new Error("This card is outside the collection");
  const subject = avaAvailableSubjects(card).includes(session.subject) ? session.subject : "ava";
  return AvaLearningSessionSchema.parse({
    ...session,
    selectedIndex: index,
    setStart: Math.floor(index / 5) * 5,
    subject,
  });
}
export function avaPracticeNext(session: AvaLearningSession): AvaLearningSession {
  const card = avaSelectedCard(session);
  const record = AvaLearningRecordSchema.parse(session.records[card.id] ?? {});
  const set = avaLittleSet(session);
  const position = set.findIndex((item) => item.id === card.id);
  const nextIndex = session.setStart + ((position + 1) % set.length);
  return avaChooseCard(
    {
      ...session,
      questionNumber: session.questionNumber + 1,
      records: { ...session.records, [card.id]: { ...record, introduced: true } },
    },
    nextIndex,
  );
}
export function avaAnswer(session: AvaLearningSession, choice: string): AvaLearningSession {
  if (!avaRecognitionChoices(session).some((card) => card.id === choice))
    throw new Error("Choose one of the displayed actions");
  const card = avaSelectedCard(session);
  const record = AvaLearningRecordSchema.parse(session.records[card.id] ?? {});
  const correct = choice === card.id;
  return AvaLearningSessionSchema.parse({
    ...session,
    records: {
      ...session.records,
      [card.id]: {
        introduced: record.introduced || correct,
        attempts: record.attempts + 1,
        correct: record.correct + (correct ? 1 : 0),
      },
    },
  });
}

export function avaConnectPhrase(session: AvaLearningSession): string {
  const card = avaSelectedCard(session);
  if (session.id === "ava-actions") return avaActionPhrase(card.action, session.subject);
  if (session.id === "ava-two-words") return card.label;
  const phrases: Record<string, string> = {
    more: "More food",
    help: "Help please",
    stop: "Stop car",
    again: "Jump again",
    mine: "My bear",
    "all-done": "All done",
    please: "Teddy please",
    "thank-you": "Thank you",
    yes: "Yes please",
    no: "No thanks",
    want: "Want ball",
    water: "Drink water",
    milk: "More milk",
    hungry: "Eat food",
    thirsty: "Drink water",
    tired: "Ava sleeps",
    potty: "Potty time",
    hurt: "Knee hurts",
    hot: "Hot cup",
    cold: "Cold ice",
    big: "Big ball",
    small: "Small ball",
    tall: "Tall tower",
    short: "Short tower",
    wet: "Wet sponge",
    dry: "Dry sponge",
    fast: "Fast car",
    slow: "Slow car",
    happy: "Happy Ava",
    sad: "Sad Ava",
    open: "Door open",
    closed: "Door closed",
    full: "Full cup",
    empty: "Empty cup",
    clean: "Clean sponge",
    dirty: "Dirty sponge",
    heavy: "Heavy weight",
    light: "Light feather",
  };
  if (session.id === "ava-positions") {
    const positions: Record<string, string> = {
      inside: "Ball in box",
      outside: "Ball outside",
      on: "Ball on box",
      under: "Ball under table",
      behind: "Ball behind box",
      "in-front": "Ball in front",
      beside: "Ball beside box",
      between: "Ball between boxes",
      above: "Ball above box",
      below: "Ball below table",
      near: "Ball near box",
      far: "Ball far away",
    };
    return positions[card.id] ?? card.label;
  }
  return phrases[card.id] ?? card.label;
}
