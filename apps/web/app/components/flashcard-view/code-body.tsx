import { checkCode } from "@mind-palace/curriculum";
import { type ReactNode, useState } from "react";

import { CodeEditor } from "~/components/code-editor";
import { type DiffOp, lineDiff } from "~/lib/line-diff";

import { InlineText } from "./markdown";

// Per-line styling for the diff (flat — no nested ternary). Removed = the
// learner's line that isn't in the solution; added = the solution line they're
// missing.
function diffLineClass(type: DiffOp["type"]): string {
  if (type === "add") {
    return "whitespace-pre bg-emerald-500/12 text-emerald-800 dark:text-emerald-300";
  }
  if (type === "remove") {
    return "whitespace-pre bg-rose-500/12 text-rose-800 dark:text-rose-300";
  }
  return "whitespace-pre text-muted-ash";
}

function diffSign(type: DiffOp["type"]): string {
  if (type === "add") return "+";
  if (type === "remove") return "−";
  return " ";
}

export function CodeBody({
  prompt,
  language,
  solution,
}: {
  prompt: string;
  language: string | undefined;
  solution: string;
}): ReactNode {
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<"idle" | "pass" | "fail">("idle");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-pretty font-medium text-[15px] text-midnight-ink leading-7 sm:text-base">
        <InlineText text={prompt} />
      </p>
      <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <CodeEditor
          language={language ?? "rust"}
          ariaLabel="Type your code"
          autoFocus
          onChange={setTyped}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-test="code-check"
          onClick={() => setStatus(checkCode(typed, solution) ? "pass" : "fail")}
          className="rounded-lg border border-black/15 px-4 py-2 text-[15px] text-midnight-ink transition-colors hover:border-black/25 hover:bg-whisper-gray dark:border-white/15 dark:hover:bg-white/5"
        >
          Check
        </button>
        {status === "pass" ? (
          <span data-test="code-pass" className="text-emerald-600 text-sm dark:text-emerald-400">
            Correct! Spacing is ignored — only tokens and string contents matter.
          </span>
        ) : null}
        {status === "fail" ? (
          <span data-test="code-fail" className="text-rose-600 text-sm dark:text-rose-400">
            Not quite — the diff below shows your answer vs the expected solution.
          </span>
        ) : null}
      </div>
      {status === "fail" ? (
        <div className="flex flex-col gap-2" data-test="code-diff">
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-ash uppercase tracking-[0.12em]">
            <span>Your answer vs expected</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              <span className="text-rose-600 dark:text-rose-300">− yours</span>
              <span className="text-emerald-700 dark:text-emerald-300">+ expected</span>
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-whisper-gray p-3 font-mono text-[13px] leading-relaxed dark:border-white/10 dark:bg-white/[0.04]">
            {lineDiff(typed.split("\n"), solution.split("\n")).map((op) => (
              <div key={op.id} className={diffLineClass(op.type)}>
                <span className="mr-2 inline-block w-2 select-none opacity-50">
                  {diffSign(op.type)}
                </span>
                {op.text || " "}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
