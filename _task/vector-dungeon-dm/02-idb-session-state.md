# Issue 02: IDB Session State

## Goal

Persist the DM session so iPad/phone reloads do not erase position, HP, discoveries, or log.

## Implementation

- Add `VectorDungeonSessionSchema` and default value to `@mind-palace/schemas`.
- Add a `vectorDungeonSessions` object store with a DB version bump.
- Hydrate the singleton session in `idbHydrationPromise`.
- Add `persistVectorDungeonSession` and `vectorDungeonSessionAtom`.
- Keep state updates routed through `atomWithIDB`.

## Acceptance

- Session state survives reload.
- `Clear state` still closes/deletes all stores.
- Schema defaults parse through Zod and have unit coverage.

