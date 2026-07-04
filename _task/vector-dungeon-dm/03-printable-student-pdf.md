# Issue 03: Printable Student PDF

## Goal

Provide a printable 8.5x11 student guide for Dean.

## Implementation

- Add a print-source route/component that lays out the guide as one letter-size page.
- Include a coordinate grid, movement vector examples, room journal boxes, HP hearts, dice instructions, and a worked `start + velocity = target` example.
- Generate and commit `apps/web/public/vector-dungeon/dean-vector-dungeon.pdf`.
- Link the PDF from the DM app.

## Acceptance

- The PDF opens from `/vector-dungeon/dean-vector-dungeon.pdf`.
- The guide is useful without the app in Dean's hands.

