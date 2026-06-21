import { checkCode, type Flashcard } from "@mind-palace/curriculum";
import type { CardState, Rating } from "@mind-palace/srs";
import { type ReactNode, useState } from "react";
import * as z from "zod";

import { CodeEditor } from "~/components/code-editor";
import { defineComponent } from "~/lib/define-component";

// Polymorphic lesson-node renderer. Switches on the flashcard's content union:
// `read` is fully built; `multiple-choice` is interactive; `video` and
// `card-mini-game` are typed placeholders (the latter will compose
// @mind-palace/cards per the CLAUDE.md rule). Presentational — the route owns
// the SRS state and passes `onRate`.

const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

function ReadBody({ markdown }: { markdown: string }): ReactNode {
  return <p className="whitespace-pre-wrap leading-relaxed">{markdown}</p>;
}

// Class for an option after a pick — early returns avoid a nested ternary.
function optionTone(picked: number | null, index: number, answerIndex: number): string {
  if (picked === null) return "border-black/15 hover:bg-black/5";
  if (index === answerIndex) return "border-emerald-500 bg-emerald-50";
  if (index === picked) return "border-rose-500 bg-rose-50";
  return "border-black/10 opacity-60";
}

function ChoiceBody({
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
    <div className="flex flex-col gap-3">
      <p className="font-medium">{question}</p>
      {code ? (
        <div className="overflow-hidden rounded-md border border-black/15">
          <CodeEditor initialValue={code} language={language ?? "rust"} readOnly ariaLabel="Code" />
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {options.map((option, i) => {
          const tone = optionTone(picked, i, answerIndex);
          return (
            <li key={option}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${tone}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null ? (
        <p className="text-sm" data-test="mcq-feedback">
          {picked === answerIndex ? "Correct!" : "Not quite — review and try again."}
        </p>
      ) : null}
    </div>
  );
}

function VideoBody({ src, caption }: { src: string; caption: string | undefined }): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-video items-center justify-center rounded-md bg-black/80 text-sm text-white/80">
        Video lesson — {src}
      </div>
      {caption ? <p className="text-sm opacity-70">{caption}</p> : null}
    </div>
  );
}

function MiniGameBody({ prompt }: { prompt: string }): ReactNode {
  return (
    <div className="rounded-md border border-dashed border-black/20 p-4 text-sm opacity-80">
      <p className="font-medium">Card mini-game</p>
      <p>{prompt}</p>
      <p className="mt-2 text-xs opacity-60">Built on @mind-palace/cards (drag-and-drop).</p>
    </div>
  );
}

function CodeBody({
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
    <div className="flex flex-col gap-3">
      <p className="font-medium">{prompt}</p>
      <div className="overflow-hidden rounded-md border border-black/15">
        <CodeEditor language={language ?? "rust"} ariaLabel="Type your code" onChange={setTyped} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-test="code-check"
          onClick={() => setStatus(checkCode(typed, solution) ? "pass" : "fail")}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
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

function Body({ flashcard }: { flashcard: Flashcard }): ReactNode {
  const content = flashcard.content;
  switch (content.type) {
    case "read":
      return <ReadBody markdown={content.markdown} />;
    case "multiple-choice":
      return (
        <ChoiceBody
          question={content.question}
          code={content.code}
          language={content.language}
          options={content.options}
          answerIndex={content.answerIndex}
        />
      );
    case "video":
      return <VideoBody src={content.src} caption={content.caption} />;
    case "card-mini-game":
      return <MiniGameBody prompt={content.prompt} />;
    case "code":
      return (
        <CodeBody prompt={content.prompt} language={content.language} solution={content.solution} />
      );
    default:
      return null;
  }
}

export const FlashcardViewPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  phase: z.custom<CardState["phase"]>().optional(),
  onRate: z.custom<(rating: Rating) => void>(),
});
export type FlashcardViewProps = z.infer<typeof FlashcardViewPropsSchema>;

export const FlashcardView = defineComponent(
  FlashcardViewPropsSchema,
  ({ flashcard, phase = "new", onRate }: FlashcardViewProps): ReactNode => {
    return (
      <section className="flex w-full max-w-xl flex-col gap-5" data-test="flashcard-view">
        <header>
          <span className="text-xs uppercase opacity-50">{phase}</span>
          <h2 className="text-2xl font-semibold">{flashcard.title}</h2>
        </header>
        <Body flashcard={flashcard} />
        <footer className="flex flex-col gap-2 border-black/10 border-t pt-4">
          <p className="text-xs opacity-60">How well did you know this?</p>
          <div className="flex gap-2">
            {RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                data-test={`rate-${rating}`}
                onClick={() => onRate(rating)}
                className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm capitalize hover:bg-black/5"
              >
                {rating}
              </button>
            ))}
          </div>
        </footer>
      </section>
    );
  },
);
