import type { Curriculum } from "@mind-palace/curriculum";
import { type CardState, isDue } from "@mind-palace/srs";

// Builds the ordered deck for a Study session (Tinder-style review): ACTIVE-
// RECALL cards only (multiple-choice + code) — read/video/mini-game intros are
// long-form and stay on the scrollable node route, not the no-scroll deck.
//
// Order: due reviews first (soonest-due → most overdue), then never-seen "new"
// cards. Not-yet-due reviews are excluded. Pure + `now`-injected → unit-testable.

const RECALL_TYPES: ReadonlySet<string> = new Set(["multiple-choice", "code"]);

export function buildStudyDeck(
  curriculum: Curriculum,
  states: Readonly<Record<string, CardState>>,
  now: number = Date.now(),
): string[] {
  const dueReviews: { id: string; due: number }[] = [];
  const fresh: string[] = [];

  for (const node of curriculum.nodes) {
    if (!RECALL_TYPES.has(node.content.type)) continue;
    const state = states[node.id];
    if (state === undefined) {
      fresh.push(node.id);
    } else if (isDue(state, now)) {
      dueReviews.push({ id: node.id, due: state.due });
    }
  }

  dueReviews.sort((a, b) => a.due - b.due);
  return [...dueReviews.map((d) => d.id), ...fresh];
}
