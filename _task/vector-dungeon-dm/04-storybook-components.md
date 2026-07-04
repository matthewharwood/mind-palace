# Issue 04: Storybook Components

## Goal

Build the UI in Storybook before route integration.

## Implementation

- Add a hub component for the application picker.
- Add a DM panel component covering grid, current coordinate, coordinate entry, room narration, action choices, roll resolution, HP, rewards, and log.
- Add a printable guide component for the PDF source route.
- Give every component Zod props via `defineComponent`.
- Add stories for the app hub, fresh session, pending action, low HP, and printable guide.

## Acceptance

- Storybook renders every new component independently.
- Stories are covered by Playwright story tests.

