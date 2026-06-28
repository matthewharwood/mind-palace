import { CurriculumProgressSchema } from "@mind-palace/schemas";
import type { CardState } from "@mind-palace/srs";

import { getDB } from "./db";

// Read every curriculum's spaced-repetition state fresh from IndexedDB (the
// source of truth) for the progress report. The report is an aggregate across
// ALL curricula, which can't be assembled by looping the per-curriculum atoms
// (rules of hooks) — a one-shot read on mount is the right tool for a snapshot.
export async function loadAllCurriculumProgress(): Promise<Map<string, Record<string, CardState>>> {
  const db = await getDB();
  const rows = await db.getAll("curriculumProgress");
  const byCurriculum = new Map<string, Record<string, CardState>>();
  for (const row of rows) {
    const parsed = CurriculumProgressSchema.safeParse(row);
    if (parsed.success) byCurriculum.set(parsed.data.id, parsed.data.states);
  }
  return byCurriculum;
}
