# Issue 07: Tests And Gates

## Goal

Cover the feature at the right layers and keep the gate green.

## Implementation

- Add Bun tests for pure domain helpers and schema defaults.
- Add Playwright story tests for the new components.
- Add Playwright app tests for navigation, PDF link, move validation, roll resolution, and reload persistence.
- Use role-based selectors first and `data-test` only for repeated grid coordinate cells.

## Acceptance

- `bun run check:fast` passes.
- `bun run check` passes before PR.

