// Pure helpers for keyboard drag-and-drop (the DOM-touching candidate gathering
// lives in the component; this is the unit-testable arithmetic).

/** Wrap an index within [0, length) by `delta`. Returns 0 for an empty list. */
export function cycleIndex(current: number, length: number, delta: number): number {
  if (length <= 0) return 0;
  return (current + delta + length) % length;
}
