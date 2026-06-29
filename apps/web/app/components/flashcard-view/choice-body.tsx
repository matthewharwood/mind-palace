import { type ReactNode, useEffect, useState } from "react";

import { CodeBlock } from "~/components/code-block";
import { isTypingTarget } from "~/lib/keyboard";

import { InlineText } from "./markdown";

// Top-to-bottom answer hotkeys (Anki-style), shown as coloured [q]/[w]/… chips.
const HOTKEYS = ["q", "w", "e", "r"];

// Class for an option after a pick — early returns avoid a nested ternary.
function optionTone(picked: number | null, index: number, answerIndex: number): string {
  if (picked === null) {
    return "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";
  }
  if (index === answerIndex) {
    return "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/15";
  }
  if (index === picked)
    return "border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-500/15";
  return "border-black/10 opacity-60 dark:border-white/10";
}

export function ChoiceBody({
  question,
  code,
  language,
  options,
  answerIndex,
}: {
  question: string;
  code: string | undefined;
  language: string | undefined;
  options: readonly string[];
  answerIndex: number;
}): ReactNode {
  const [picked, setPicked] = useState<number | null>(null);

  // q/w/e/r pick the matching option top-to-bottom (until answered, and never
  // while typing in the code editor / an input).
  useEffect(() => {
    if (picked !== null) return;
    function onKey(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return;
      const index = HOTKEYS.indexOf(event.key.toLowerCase());
      if (index < 0 || index >= options.length) return;
      event.preventDefault();
      setPicked(index);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, options.length]);

  let feedback = "";
  if (picked !== null) {
    feedback = picked === answerIndex ? "Correct!" : "Not quite — review and try again.";
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-pretty font-medium text-[15px] text-midnight-ink leading-7 sm:text-base">
        <InlineText text={question} />
      </p>
      {code ? <CodeBlock code={code} language={language ?? "rust"} /> : null}
      <ul className="flex flex-col gap-2">
        {options.map((option, i) => {
          const tone = optionTone(picked, i, answerIndex);
          return (
            <li key={option}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[15px] transition-colors ${tone}`}
              >
                {i < HOTKEYS.length ? (
                  <span
                    className="shrink-0 font-mono text-[13px] text-indigo-500 dark:text-indigo-400"
                    aria-hidden
                  >
                    [{HOTKEYS[i]}]
                  </span>
                ) : null}
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* Reserve the feedback line's height so revealing it never shifts the
          layout (no CLS); the data-test node still only appears once answered. */}
      <div className="min-h-[1.5rem]">
        {picked !== null ? (
          <p className="text-[15px] text-muted-ash" data-test="mcq-feedback" aria-live="polite">
            {feedback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
