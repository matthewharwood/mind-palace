import { type IDBPDatabase, openDB } from "idb";
import * as z from "zod";

import { type Deck, deckSchema, type SchedulerConfigOverride } from "./schema";

// ---------------------------------------------------------------------------
// IndexedDB persistence for decks. A thin, framework-free repository: async
// CRUD + a BroadcastChannel so other tabs/iframes know to re-read. Every read
// re-validates with the deck schema (Pillar 2 / IDB-first boundary).
//
// NAMESPACE THE `database` NAME. IndexedDB *and* BroadcastChannel are keyed by
// origin, so two apps on the same localhost:port collide. Name it by repo scope
// + app, e.g. "@mind-palace/web/srs" — the same lesson as the app's own db.ts.
// ---------------------------------------------------------------------------

export interface DeckStoreOptions<TContent extends z.ZodType> {
  /** Origin-unique IndexedDB database name. Namespace it (see above). */
  database: string;
  /** Zod schema for each card's content payload. */
  content: TContent;
  /** Object store name within the database. */
  storeName?: string;
  /** Default scheduler config for decks created through this store. */
  config?: SchedulerConfigOverride;
}

export interface DeckStore<T> {
  /** All decks, schema-validated. */
  list(): Promise<Deck<T>[]>;
  /** One deck by id, or undefined. */
  get(id: string): Promise<Deck<T> | undefined>;
  /** Insert or replace a deck (validated before write). */
  put(deck: Deck<T>): Promise<void>;
  /** Delete a deck by id. */
  remove(id: string): Promise<void>;
  /** Fire `onChange` when any tab writes/removes a deck. Returns an unsubscribe. */
  subscribe(onChange: (id: string) => void): () => void;
  /** Default config for decks created against this store. */
  readonly config: SchedulerConfigOverride;
  /** Close the DB connection and the channel. */
  close(): Promise<void>;
}

export function createDeckStore<TContent extends z.ZodType>(
  options: DeckStoreOptions<TContent>,
): DeckStore<z.infer<TContent>> {
  type T = z.infer<TContent>;
  const storeName = options.storeName ?? "decks";
  const schema = deckSchema(options.content);
  const arraySchema = z.array(schema);
  const config = options.config ?? {};

  let dbPromise: Promise<IDBPDatabase> | undefined;
  const db = (): Promise<IDBPDatabase> => {
    dbPromise ??= openDB(options.database, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      },
    });
    return dbPromise;
  };

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(`${options.database}/srs`);

  return {
    config,

    async list(): Promise<Deck<T>[]> {
      const raw = await (await db()).getAll(storeName);
      return arraySchema.parse(raw);
    },

    async get(id: string): Promise<Deck<T> | undefined> {
      const raw = await (await db()).get(storeName, id);
      return raw === undefined ? undefined : schema.parse(raw);
    },

    async put(deck: Deck<T>): Promise<void> {
      const valid = schema.parse(deck);
      await (await db()).put(storeName, valid);
      channel?.postMessage(deck.id);
    },

    async remove(id: string): Promise<void> {
      await (await db()).delete(storeName, id);
      channel?.postMessage(id);
    },

    subscribe(onChange: (id: string) => void): () => void {
      if (!channel) return () => undefined;
      const handler = (event: MessageEvent): void => onChange(z.string().parse(event.data));
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    },

    async close(): Promise<void> {
      channel?.close();
      if (dbPromise) {
        const database = await dbPromise;
        database.close();
        dbPromise = undefined;
      }
    },
  };
}
