# Vector Dungeon DM App

## Product brief

Build a mobile-first Dungeon Master companion for teaching Dean vector addition and subtraction with a fantasy grid adventure. Dean is a knight moving one square at a time on a coordinate grid. The parent reads narration from the app, Dean calculates the next coordinate on paper, rolls a d20 for room actions, and progress persists locally.

## V1 scope

- Static-only GitHub Pages app; no backend, server loaders, or runtime fetches.
- New `@mind-palace/vector-dungeon` package for pure adventure data and rules.
- Routed through the existing `apps/web` app at `/apps` and `/apps/vector-dungeon`.
- Printable 8.5x11 guide downloadable from the app.
- One-step movement only: `(-1,0)`, `(1,0)`, `(0,1)`, `(0,-1)`.
- Gentle 5 HP stakes: missed rolls cost 1 HP, and 0 HP triggers a recoverable camp reset.

## Learning goals

- Understand `(x, y)` coordinates on a grid.
- Read velocity vectors as small movement instructions.
- Compute `start + velocity = target`.
- Distinguish horizontal and vertical axes.
- Practice arithmetic with negative numbers in small, concrete steps.

## Definition of done

- A parent can start the DM app from the splash page.
- The app shows the current coordinate and valid unit-vector moves.
- Dean can calculate a target coordinate, and the parent can enter it.
- Correct moves reveal room narration and three actions.
- The app reveals a d20 target number, resolves the roll, updates HP/log/rewards, and persists on reload.
- The PDF guide can be downloaded and printed.
- Unit tests and Playwright tests cover the rule engine and main route flow.
- `bun run check:fast` and `bun run check` pass without warnings.

