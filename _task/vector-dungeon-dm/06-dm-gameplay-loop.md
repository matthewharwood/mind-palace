# Issue 06: DM Gameplay Loop

## Goal

Implement the phone-first parent workflow.

## Implementation

- Show current position and valid movement vectors.
- Let the parent enter Dean's target coordinate.
- Validate `target - current` as a cardinal unit step.
- Reveal room narration and three action choices after a correct move.
- On action selection, show the d20 DC.
- Resolve the roll, update HP/rewards/visited/log, and continue.
- At 0 HP, send Dean back to camp with a recoverable reset.

## Acceptance

- The parent can run a complete session from a phone.
- The math work remains Dean-facing; the app supports the parent.

