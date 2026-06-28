import { type ReactNode, useState } from "react";

import { CodeBlock } from "~/components/code-block";

import { InlineText } from "./markdown";

// Class for an option after a pick — early returns avoid a nested ternary.
function optionTone(picked: number | null, index: number, answerIndex: number): string {
  if (picked === null) return "border-black/15 hover:bg-black/5";
  if (index === answerIndex) return "border-emerald-500 bg-emerald-50";
  if (index === picked) return "border-rose-500 bg-rose-50";
  return "border-black/10 opacity-60";
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
                className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-[15px] transition-colors ${tone}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null ? (
        <p className="text-[15px] text-muted-ash" data-test="mcq-feedback">
          {picked === answerIndex ? "Correct!" : "Not quite — review and try again."}
        </p>
      ) : null}
    </div>
  );
}
