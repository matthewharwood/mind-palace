// True when the event target is a text-entry surface (so global hotkeys like the
// MCQ q/w/e/r and rating 1–4 keys don't fire while the learner is typing in the
// code editor or any input). CodeMirror's editable area is contentEditable.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
