import { checkCode } from "@mind-palace/curriculum";
import { type ReactNode, useState } from "react";

import { CodeEditor } from "~/components/code-editor";

import { InlineText } from "./markdown";

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
      <div className="overflow-hidden rounded-lg border border-black/10">
        <CodeEditor language={language ?? "rust"} ariaLabel="Type your code" onChange={setTyped} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-test="code-check"
          onClick={() => setStatus(checkCode(typed, solution) ? "pass" : "fail")}
          className="rounded-lg border border-black/15 px-4 py-2 text-[15px] text-midnight-ink transition-colors hover:border-black/25 hover:bg-whisper-gray"
        >
          Check
        </button>
        {status === "pass" ? (
          <span data-test="code-pass" className="text-emerald-600 text-sm">
            Correct!
          </span>
        ) : null}
        {status === "fail" ? (
          <span data-test="code-fail" className="text-rose-600 text-sm">
            Not yet — check the tokens and spelling.
          </span>
        ) : null}
      </div>
    </div>
  );
}
