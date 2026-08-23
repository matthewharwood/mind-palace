import {
  type CharacterDefinition,
  type CharacterDifficulty,
  type CharacterGeneration,
  CharacterLibrarySchema,
  type CharacterPartySession,
  CharacterPartySessionSchema,
  type CharacterUsage,
  CharacterUsageSchema,
} from "@mind-palace/schemas";
import type * as z from "zod";

import rawCharacters from "~/data/character-party/characters.json";

export const CHARACTER_LIBRARY = CharacterLibrarySchema.parse(rawCharacters);
export const HEADBAND_DECK_SIZE = 150;
export const SKIP_COOLDOWN_TURNS = 20;

const RECENT_CHARACTER_LIMIT = 20;
const DIFFICULTIES: readonly CharacterDifficulty[] = ["easy", "medium", "hard"];
const GENERATIONS: readonly CharacterGeneration[] = [
  "classics",
  "1990s-2000s",
  "modern-kids",
  "cross-generational",
];
const DEFAULT_USAGE = CharacterUsageSchema.parse({});

export const CharacterPartyOptionsSchema = CharacterPartySessionSchema.pick({
  selectedDifficulties: true,
  sessionDurationMinutes: true,
  roundDurationSeconds: true,
});
export type CharacterPartyOptions = z.infer<typeof CharacterPartyOptionsSchema>;

function usageFor(session: CharacterPartySession, characterId: string): CharacterUsage {
  return session.history[characterId] ?? DEFAULT_USAGE;
}

function isSkipCooldownComplete(session: CharacterPartySession, characterId: string): boolean {
  const lastSkippedAtTurn = usageFor(session, characterId).lastSkippedAtTurn;
  return (
    lastSkippedAtTurn === null || session.presentedCount - lastSkippedAtTurn >= SKIP_COOLDOWN_TURNS
  );
}

function prioritizedPool(
  characters: readonly CharacterDefinition[],
  session: CharacterPartySession,
): CharacterDefinition[] {
  const currentId = session.currentCharacterId;
  const completed = new Set(session.completedCharacterIds);
  const recent = new Set(session.recentCharacterIds);
  const available = characters.filter((character) => character.id !== currentId);
  const tiers = [
    available.filter(
      (character) =>
        !completed.has(character.id) &&
        !recent.has(character.id) &&
        isSkipCooldownComplete(session, character.id),
    ),
    available.filter(
      (character) => !completed.has(character.id) && isSkipCooldownComplete(session, character.id),
    ),
    available.filter((character) => !completed.has(character.id) && !recent.has(character.id)),
    available.filter((character) => !completed.has(character.id)),
    available.filter(
      (character) => !recent.has(character.id) && isSkipCooldownComplete(session, character.id),
    ),
    available.filter((character) => !recent.has(character.id)),
    available,
  ];
  return tiers.find((tier) => tier.length > 0) ?? [];
}

export function selectNextCharacter(
  characters: readonly CharacterDefinition[],
  session: CharacterPartySession,
  random: () => number = Math.random,
): CharacterDefinition | null {
  const eligible = characters.filter(
    (character) =>
      character.drawable && session.selectedDifficulties.includes(character.difficulty),
  );
  const pool = prioritizedPool(eligible, session);
  const ranked = pool
    .map((character) => ({ character, tieBreaker: random() }))
    .toSorted((left, right) => {
      const leftUsage = usageFor(session, left.character.id);
      const rightUsage = usageFor(session, right.character.id);
      if (leftUsage.usedCount !== rightUsage.usedCount) {
        return leftUsage.usedCount - rightUsage.usedCount;
      }
      const leftLastUsed = leftUsage.lastUsed ?? -1;
      const rightLastUsed = rightUsage.lastUsed ?? -1;
      if (leftLastUsed !== rightLastUsed) return leftLastUsed - rightLastUsed;
      return left.tieBreaker - right.tieBreaker;
    });
  return ranked[0]?.character ?? null;
}

function presentCharacter(
  session: CharacterPartySession,
  character: CharacterDefinition,
): CharacterPartySession {
  const recentCharacterIds = [
    ...session.recentCharacterIds.filter((id) => id !== character.id),
    character.id,
  ].slice(-RECENT_CHARACTER_LIMIT);
  return CharacterPartySessionSchema.parse({
    ...session,
    phase: "prompt",
    currentCharacterId: character.id,
    roundStartedAt: null,
    recentCharacterIds,
    presentedCount: session.presentedCount + 1,
  });
}

function chooseAndPresent(
  session: CharacterPartySession,
  characters: readonly CharacterDefinition[],
  random: () => number,
): CharacterPartySession {
  const character = selectNextCharacter(characters, session, random);
  if (!character) {
    return CharacterPartySessionSchema.parse({
      ...session,
      phase: "setup",
      currentCharacterId: null,
      roundStartedAt: null,
    });
  }
  return presentCharacter(session, character);
}

export function configureCharacterPartySession(
  session: CharacterPartySession,
  options: CharacterPartyOptions,
): CharacterPartySession {
  return CharacterPartySessionSchema.parse({
    ...session,
    ...CharacterPartyOptionsSchema.parse(options),
  });
}

export function startCharacterPartySession(
  session: CharacterPartySession,
  characters: readonly CharacterDefinition[],
  now: number,
  random: () => number = Math.random,
): CharacterPartySession {
  const history = Object.fromEntries(
    Object.entries(session.history).map(([characterId, usage]) => [
      characterId,
      { ...usage, lastSkippedAtTurn: null },
    ]),
  );
  const freshSession = CharacterPartySessionSchema.parse({
    ...session,
    phase: "prompt",
    sessionStartedAt: now,
    roundStartedAt: null,
    currentCharacterId: null,
    recentCharacterIds: [],
    completedCharacterIds: [],
    presentedCount: 0,
    history,
  });
  return chooseAndPresent(freshSession, characters, random);
}

export function revealCurrentCharacter(
  session: CharacterPartySession,
  now: number,
): CharacterPartySession {
  const characterId = session.currentCharacterId;
  if (!characterId || session.phase !== "prompt") return session;
  const usage = usageFor(session, characterId);
  const completedCharacterIds = session.completedCharacterIds.includes(characterId)
    ? session.completedCharacterIds
    : [...session.completedCharacterIds, characterId];
  return CharacterPartySessionSchema.parse({
    ...session,
    phase: "revealed",
    roundStartedAt: null,
    completedCharacterIds,
    history: {
      ...session.history,
      [characterId]: {
        ...usage,
        usedCount: usage.usedCount + 1,
        lastUsed: now,
      },
    },
  });
}

export function skipCurrentCharacter(
  session: CharacterPartySession,
  characters: readonly CharacterDefinition[],
  random: () => number = Math.random,
): CharacterPartySession {
  const characterId = session.currentCharacterId;
  if (!characterId) return chooseAndPresent(session, characters, random);
  const skipped = CharacterPartySessionSchema.parse({
    ...session,
    phase: "prompt",
    roundStartedAt: null,
    history: {
      ...session.history,
      [characterId]: {
        ...usageFor(session, characterId),
        lastSkippedAtTurn: session.presentedCount,
      },
    },
  });
  return chooseAndPresent(skipped, characters, random);
}

export function advanceCharacterPartySession(
  session: CharacterPartySession,
  characters: readonly CharacterDefinition[],
  random: () => number = Math.random,
): CharacterPartySession {
  return chooseAndPresent(
    CharacterPartySessionSchema.parse({
      ...session,
      phase: "prompt",
      roundStartedAt: null,
    }),
    characters,
    random,
  );
}

export function startCharacterRoundTimer(
  session: CharacterPartySession,
  now: number,
): CharacterPartySession {
  if (session.phase !== "prompt" || session.roundDurationSeconds === 0) return session;
  return CharacterPartySessionSchema.parse({ ...session, roundStartedAt: now });
}

export function endCharacterPartySession(session: CharacterPartySession): CharacterPartySession {
  return CharacterPartySessionSchema.parse({
    ...session,
    phase: "setup",
    sessionStartedAt: null,
    roundStartedAt: null,
    currentCharacterId: null,
    recentCharacterIds: [],
    completedCharacterIds: [],
    presentedCount: 0,
  });
}

export function findCharacter(
  characters: readonly CharacterDefinition[],
  characterId: string | null,
): CharacterDefinition | null {
  if (!characterId) return null;
  return characters.find((character) => character.id === characterId) ?? null;
}

function takeGenerationBalanced(
  characters: readonly CharacterDefinition[],
  count: number,
): CharacterDefinition[] {
  const buckets: Record<CharacterGeneration, CharacterDefinition[]> = {
    classics: [],
    "1990s-2000s": [],
    "modern-kids": [],
    "cross-generational": [],
  };
  for (const character of characters) buckets[character.generation].push(character);
  const result: CharacterDefinition[] = [];
  while (result.length < count) {
    const startLength = result.length;
    for (const generation of GENERATIONS) {
      const character = buckets[generation].shift();
      if (character) result.push(character);
      if (result.length === count) break;
    }
    if (result.length === startLength) break;
  }
  return result;
}

export function buildHeadbandDeck(
  characters: readonly CharacterDefinition[],
  requestedSize = HEADBAND_DECK_SIZE,
): CharacterDefinition[] {
  const eligible = characters.filter((character) => character.headbandEligible);
  const size = Math.min(Math.max(0, requestedSize), eligible.length);
  const quotas: Record<CharacterDifficulty, number> = {
    easy: Math.floor(size * 0.5),
    medium: Math.floor(size * 0.35),
    hard: size - Math.floor(size * 0.5) - Math.floor(size * 0.35),
  };
  const selected: CharacterDefinition[] = [];
  for (const difficulty of DIFFICULTIES) {
    selected.push(
      ...takeGenerationBalanced(
        eligible.filter((character) => character.difficulty === difficulty),
        quotas[difficulty],
      ),
    );
  }
  if (selected.length === size) return selected;
  const selectedIds = new Set(selected.map((character) => character.id));
  selected.push(
    ...takeGenerationBalanced(
      eligible.filter((character) => !selectedIds.has(character.id)),
      size - selected.length,
    ),
  );
  return selected;
}

export function chunkCharacters(
  characters: readonly CharacterDefinition[],
  cardsPerPage = 9,
): CharacterDefinition[][] {
  if (cardsPerPage < 1) return [];
  const pages: CharacterDefinition[][] = [];
  for (let index = 0; index < characters.length; index += cardsPerPage) {
    pages.push(characters.slice(index, index + cardsPerPage));
  }
  return pages;
}

export function roundSecondsRemaining(session: CharacterPartySession, now: number): number | null {
  if (session.roundDurationSeconds === 0 || session.roundStartedAt === null) return null;
  const elapsedSeconds = Math.max(0, Math.floor((now - session.roundStartedAt) / 1_000));
  return Math.max(0, session.roundDurationSeconds - elapsedSeconds);
}

export function sessionSecondsRemaining(
  session: CharacterPartySession,
  now: number,
): number | null {
  if (session.sessionDurationMinutes === 0 || session.sessionStartedAt === null) return null;
  const totalSeconds = session.sessionDurationMinutes * 60;
  const elapsedSeconds = Math.max(0, Math.floor((now - session.sessionStartedAt) / 1_000));
  return Math.max(0, totalSeconds - elapsedSeconds);
}

export function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
