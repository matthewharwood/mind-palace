# Issue 01: Domain Package

## Goal

Create `packages/vector-dungeon` as the source of truth for the static dungeon and pure game rules.

## Implementation

- Add `@mind-palace/vector-dungeon` with `typecheck` and `test:unit` scripts.
- Export Zod-authored schemas and `z.infer` types for coordinates, movement vectors, rooms, actions, rewards, and resolution results.
- Author a 5x5 grid with coordinates `x/y = -2..2`, starting at `(0,0)`.
- Give every room a title, kid-readable narration, and exactly three action choices.
- Add pure helpers: coordinate key/id, room lookup, unit-step validation, valid move enumeration, target coordinate derivation, move validation, and d20 action resolution.
- Unit-test math, bounds, room integrity, and roll outcomes.

## Acceptance

- `@mind-palace/vector-dungeon` can be imported by `apps/web`.
- Invalid diagonal/out-of-bounds moves are rejected by pure helpers.
- Every authored room is reachable and has three actions.

