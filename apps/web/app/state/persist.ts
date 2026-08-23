import type {
  AlchemyBoard,
  AvaShapesSession,
  CharacterPartySession,
  CurriculumProgress,
  Progress,
  Settings,
  VectorDungeonSession,
} from "@mind-palace/schemas";
import * as z from "zod";

import { getDB } from "./db";

const DEBOUNCE_MS = 150;
// BroadcastChannel is origin-scoped too — namespace it like DB_NAME so apps
// sharing an origin don't cross-talk on re-hydration broadcasts.
const CHANNEL_NAME = "@mind-palace/web:idb";

const channel = typeof window !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function schedule(key: string, run: () => Promise<void>): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  pending.set(
    key,
    setTimeout(() => {
      void run();
    }, DEBOUNCE_MS),
  );
}

export function persistProgress(value: Progress): void {
  schedule(`progress:${value.id}`, async () => {
    const db = await getDB();
    await db.put("progress", value);
    channel?.postMessage({ store: "progress", key: value.id });
  });
}

export function persistSettings(value: Settings): void {
  schedule(`settings:${value.id}`, async () => {
    const db = await getDB();
    await db.put("settings", value);
    channel?.postMessage({ store: "settings", key: value.id });
  });
}

export function persistAlchemyBoard(value: AlchemyBoard): void {
  schedule(`alchemyBoard:${value.id}`, async () => {
    const db = await getDB();
    await db.put("alchemyBoard", value);
    channel?.postMessage({ store: "alchemyBoard", key: value.id });
  });
}

export function persistCurriculumProgress(value: CurriculumProgress): void {
  schedule(`curriculumProgress:${value.id}`, async () => {
    const db = await getDB();
    await db.put("curriculumProgress", value);
    channel?.postMessage({ store: "curriculumProgress", key: value.id });
  });
}

export function persistVectorDungeonSession(value: VectorDungeonSession): void {
  schedule(`vectorDungeonSession:${value.id}`, async () => {
    const db = await getDB();
    await db.put("vectorDungeonSessions", value);
    channel?.postMessage({ store: "vectorDungeonSession", key: value.id });
  });
}

export function persistAvaShapesSession(value: AvaShapesSession): void {
  schedule(`avaShapesSession:${value.id}`, async () => {
    const db = await getDB();
    await db.put("avaShapeSessions", value);
    channel?.postMessage({ store: "avaShapesSession", key: value.id });
  });
}

export function persistCharacterPartySession(value: CharacterPartySession): void {
  schedule(`characterPartySession:${value.id}`, async () => {
    const db = await getDB();
    await db.put("characterPartySessions", value);
    channel?.postMessage({ store: "characterPartySession", key: value.id });
  });
}

export const RemoteWriteMessageSchema = z.object({
  store: z.enum([
    "progress",
    "settings",
    "alchemyBoard",
    "curriculumProgress",
    "vectorDungeonSession",
    "avaShapesSession",
    "characterPartySession",
  ]),
  key: z.string().min(1),
});
export type RemoteWriteMessage = z.infer<typeof RemoteWriteMessageSchema>;

export function subscribeRemoteWrites(onChange: (msg: RemoteWriteMessage) => void): () => void {
  if (!channel) return () => undefined;
  const handler = (event: MessageEvent) => {
    const message = RemoteWriteMessageSchema.safeParse(event.data);
    if (message.success) onChange(message.data);
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}

// Cancel every debounced write that hasn't fired yet. Used by `clearAllStorage`
// to prevent the race where a pending persist call fires AFTER `closeDB()`
// runs, opens a fresh IDB connection via `getDB()`, and that new connection
// blocks `deleteDatabase` — leaving the user on the same DB they thought
// they cleared.
export function cancelPendingWrites(): void {
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}
