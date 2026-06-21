import { type Atom, atom, type WritableAtom } from "jotai";

import { addCards, createDeck, reviewCard } from "./deck";
import type { DeckStore } from "./idb";
import type { Deck, Rating } from "./schema";

// ---------------------------------------------------------------------------
// Jotai bindings for a DeckStore. We expose *atoms*, not bespoke hooks — the
// consumer reads with Jotai's own `useAtomValue` (a pure subscriber, safe under
// the React Compiler) and writes with `useSetAtom`. Reads are async atoms, so
// they suspend on first load and re-read whenever the shared `refresh` ticks.
//
//   const atoms = createDeckAtoms(store)
//   const decks = useAtomValue(atoms.decksAtom)        // Deck<T>[]  (suspends)
//   const review = useSetAtom(atoms.reviewAtom)
//   review({ deckId, cardId, rating: "good" })
// ---------------------------------------------------------------------------

export interface ReviewParams {
  deckId: string;
  cardId: string;
  rating: Rating;
  now?: number;
}

export interface CreateDeckParams<T> {
  name: string;
  contents?: readonly T[];
}

export interface AddCardsParams<T> {
  deckId: string;
  contents: readonly T[];
}

export interface DeckAtoms<T> {
  /** All decks; suspends on first read, re-reads on any write or cross-tab change. */
  decksAtom: Atom<Promise<Deck<T>[]>>;
  /** A memoized async atom for one deck by id. */
  deckAtom: (id: string) => Atom<Promise<Deck<T> | undefined>>;
  /** Apply a rating to a card and persist. */
  reviewAtom: WritableAtom<null, [ReviewParams], Promise<void>>;
  /** Create a deck (optionally seeded) and persist; resolves to the new deck id. */
  createDeckAtom: WritableAtom<null, [CreateDeckParams<T>], Promise<string>>;
  /** Append cards to an existing deck and persist. */
  addCardsAtom: WritableAtom<null, [AddCardsParams<T>], Promise<void>>;
}

export function createDeckAtoms<T>(store: DeckStore<T>): DeckAtoms<T> {
  // A monotonically-ticking counter every read depends on. Writes bump it
  // directly; `onMount` subscribes to the store so cross-tab writes bump it too.
  const refreshAtom = atom(0);
  refreshAtom.onMount = (setSelf) => store.subscribe(() => setSelf((tick) => tick + 1));

  const decksAtom: Atom<Promise<Deck<T>[]>> = atom((get) => {
    get(refreshAtom);
    return store.list();
  });

  const deckAtomCache = new Map<string, Atom<Promise<Deck<T> | undefined>>>();
  const deckAtom = (id: string): Atom<Promise<Deck<T> | undefined>> => {
    let cached = deckAtomCache.get(id);
    if (!cached) {
      cached = atom((get) => {
        get(refreshAtom);
        return store.get(id);
      });
      deckAtomCache.set(id, cached);
    }
    return cached;
  };

  const reviewAtom = atom(null, async (_get, set, params: ReviewParams): Promise<void> => {
    const deck = await store.get(params.deckId);
    if (!deck) return;
    const next = reviewCard(
      deck,
      params.cardId,
      params.rating,
      params.now === undefined ? undefined : { now: params.now },
    );
    if (!next) return;
    await store.put(next.deck);
    set(refreshAtom, (tick) => tick + 1);
  });

  const createDeckAtom = atom(
    null,
    async (_get, set, params: CreateDeckParams<T>): Promise<string> => {
      const deck = createDeck(params.name, params.contents ?? [], { config: store.config });
      await store.put(deck);
      set(refreshAtom, (tick) => tick + 1);
      return deck.id;
    },
  );

  const addCardsAtom = atom(null, async (_get, set, params: AddCardsParams<T>): Promise<void> => {
    const deck = await store.get(params.deckId);
    if (!deck) return;
    await store.put(addCards(deck, params.contents));
    set(refreshAtom, (tick) => tick + 1);
  });

  return { decksAtom, deckAtom, reviewAtom, createDeckAtom, addCardsAtom };
}
