# @mind-palace/srs

A small, bespoke spaced-repetition engine for the mind-palace stack. A **deck**
is a collection of **cards**; each card carries arbitrary, Zod-validated
**content** plus its scheduling state. The scheduler is a deterministic,
modernized SM-2 — not FSRS — kept intentionally tiny so the *algorithm itself is
the shareable, portable part*.

## Three layers, three subpaths

```ts
import { review, createDeck, reviewCard } from "@mind-palace/srs";        // pure core (zod only)
import { createDeckStore }               from "@mind-palace/srs/idb";     // IndexedDB persistence
import { createDeckAtoms }               from "@mind-palace/srs/jotai";   // reactive Jotai atoms
```

- **Core** depends on **zod only** — usable in a CLI, a worker, a test, anywhere.
- **`/idb`** adds an `idb`-backed deck repository.
- **`/jotai`** turns a store into reactive atoms (suspense reads, cross-tab sync).

## Content-agnostic by design

The scheduler never inspects card content. Supply *your* Zod schema and the
whole structure validates at the boundary:

```ts
import * as z from "zod";

// Flashcards today…
const Flashcard = z.object({ front: z.string(), back: z.string() });

// …code cards from a GitHub repo tomorrow — same scheduler, store, and atoms.
const CodeCard = z.object({ path: z.string(), snippet: z.string(), answer: z.string() });
```

## Pure core

```ts
import { createDeck, getDueCards, reviewCard, exportDeck, importDeck } from "@mind-palace/srs";

let deck = createDeck("french", [{ front: "chat", back: "cat" }]);
const due = getDueCards(deck);                          // soonest-due first
deck = reviewCard(deck, due[0].id, "good")!.deck;       // again | hard | good | easy

const shared = exportDeck(deck);                        // → JSON string
const back = importDeck(shared, Flashcard);             // validated on the way in
```

`review(state, rating, { now, config })` is **deterministic** — pass `now` and
you get the same result on any machine. Every review also returns a `ReviewLog`,
so history is retained if a future optimizer (e.g. FSRS) is bolted on later.

## Persistence + React

```ts
const store = createDeckStore({
  database: "@mind-palace/web/srs", // ⚠ origin-unique — namespace by repo + app
  content: Flashcard,
});
const atoms = createDeckAtoms(store);

// In a component (Jotai's own pure-subscriber hooks — no custom hooks needed):
const decks  = useAtomValue(atoms.decksAtom);          // suspends, re-reads on change
const review = useSetAtom(atoms.reviewAtom);
review({ deckId, cardId, rating: "good" });
```

Reads suspend on first load and re-read on any write or cross-tab broadcast.

## Config

`SchedulerConfig` (all fields optional, sensible defaults) tunes learning steps,
graduating/easy intervals, ease deltas, and the interval cap. A deck may carry a
partial override; pass `{ config }` per call to override further.

## Testing

Pure layers (`scheduler`, `deck`) are covered by `bun test`. The `idb`/`jotai`
layers need a real IndexedDB and are exercised via Playwright in the consuming
app.
