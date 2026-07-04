import type { Flashcard } from "@mind-palace/curriculum";
import type { CardState, Rating } from "@mind-palace/srs";
import { createTimeline, stagger, utils } from "animejs";
import { Check, Copy, Mic, MicOff } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as z from "zod";

import { RatingButtons } from "~/components/rating-buttons";
import { ReadAloudButton } from "~/components/read-aloud";
import { defineComponent } from "~/lib/define-component";
import { buildLessonContextMarkdown, LessonCopyContextSchema } from "~/lib/lesson-context-markdown";
import { buildSpeechTrack } from "~/lib/speech-track";

import { Body } from "./body";

// useLayoutEffect on the client (fires before paint, so the entrance start-state
// lands before the first paint = no flash); falls back to useEffect during
// prerender, where layout effects don't run and would warn.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

// The lesson-node view: header (phase + title + read-aloud) + the polymorphic
// content body + the SRS rating row. The route keys this by nodeId, so it
// remounts per card — and on mount it scrolls the scroller to the top and plays
// an anime.js entrance: the card fades/zooms in while its three sections cascade
// up on a stagger (a per-child timeline CSS can't express). The route plays the
// matching exit before advancing. Reduced-motion → instant. Transform + opacity
// only, so it stays on the GPU compositor.

const PRM = "(prefers-reduced-motion: reduce)";

export const FlashcardViewPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  phase: z.custom<CardState["phase"]>().optional(),
  onRate: z.custom<(rating: Rating) => void>(),
  copyContext: LessonCopyContextSchema.optional(),
});
export type FlashcardViewProps = z.infer<typeof FlashcardViewPropsSchema>;

const FeedbackSchema = z.enum([
  "idle",
  "copied",
  "copy-failed",
  "listening",
  "voice-copied",
  "voice-failed",
  "voice-empty",
]);
type Feedback = z.infer<typeof FeedbackSchema>;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionResultListLike {
  readonly [index: number]: SpeechRecognitionResultLike | undefined;
  readonly length: number;
}

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: Event) => void) | null;
  abort: () => void;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function subscribeSpeechRecognitionSupport(_onStoreChange: () => void): () => void {
  return () => undefined;
}

function getSpeechRecognitionSupportSnapshot(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function getSpeechRecognitionSupportServerSnapshot(): boolean {
  return false;
}

function transcriptFromEvent(event: Event): string {
  const resultEvent = event as SpeechRecognitionEventLike;
  const transcripts: string[] = [];
  for (let i = 0; i < resultEvent.results.length; i++) {
    const result = resultEvent.results[i];
    const text = result?.[0]?.transcript;
    if (text) transcripts.push(text);
  }
  return transcripts.join(" ").trim();
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (!legacyCopy(text)) throw new Error("Clipboard unavailable");
}

function feedbackMessage(feedback: Feedback): string | null {
  switch (feedback) {
    case "copied":
      return "Copied lesson context as Markdown.";
    case "copy-failed":
      return "Copy failed. Clipboard access is blocked.";
    case "listening":
      return "Listening for your question...";
    case "voice-copied":
      return "Copied your spoken question with this lesson.";
    case "voice-failed":
      return "Voice capture failed. Try copy instead.";
    case "voice-empty":
      return "No speech was captured.";
    default:
      return null;
  }
}

const LessonContextActionsPropsSchema = z.object({
  flashcard: z.custom<Flashcard>(),
  copyContext: LessonCopyContextSchema,
});
type LessonContextActionsProps = z.infer<typeof LessonContextActionsPropsSchema>;

const LessonContextActions = defineComponent(
  LessonContextActionsPropsSchema,
  ({ flashcard, copyContext }: LessonContextActionsProps): ReactNode => {
    const [feedback, setFeedback] = useState<Feedback>("idle");
    const speechSupported = useSyncExternalStore(
      subscribeSpeechRecognitionSupport,
      getSpeechRecognitionSupportSnapshot,
      getSpeechRecognitionSupportServerSnapshot,
    );
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const message = feedbackMessage(feedback);

    useEffect(() => {
      if (feedback === "idle" || feedback === "listening") return;
      const timer = window.setTimeout(() => setFeedback("idle"), 3000);
      return () => window.clearTimeout(timer);
    }, [feedback]);

    useEffect(() => {
      return () => recognitionRef.current?.abort();
    }, []);

    async function copyLesson(question = ""): Promise<void> {
      try {
        await writeClipboardText(buildLessonContextMarkdown(flashcard, copyContext, question));
        setFeedback(question.trim() ? "voice-copied" : "copied");
      } catch {
        setFeedback("copy-failed");
      }
    }

    function startVoiceCapture(): void {
      const Recognition = getSpeechRecognitionConstructor();
      if (!Recognition) {
        setFeedback("voice-failed");
        return;
      }
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = transcriptFromEvent(event);
        if (transcript.length === 0) {
          setFeedback("voice-empty");
          return;
        }
        void copyLesson(transcript);
      };
      recognition.onerror = () => {
        setFeedback("voice-failed");
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setFeedback((current) => (current === "listening" ? "voice-empty" : current));
      };
      recognitionRef.current = recognition;
      setFeedback("listening");
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setFeedback("voice-failed");
      }
    }

    const copied = feedback === "copied" || feedback === "voice-copied";
    return (
      <div className="relative flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => void copyLesson()}
          aria-label="Copy lesson context as Markdown"
          title="Copy lesson context"
          className="grid size-9 place-items-center rounded-full text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-intelligence-blue"
        >
          {copied ? (
            <Check className="size-[18px]" aria-hidden="true" />
          ) : (
            <Copy className="size-[18px]" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          disabled={!speechSupported || feedback === "listening"}
          onClick={startVoiceCapture}
          aria-label={
            speechSupported
              ? "Record a question and copy it with lesson context"
              : "Voice question copy is not supported in this browser"
          }
          title={speechSupported ? "Record question and copy" : "Voice capture unavailable"}
          className="grid size-9 place-items-center rounded-full text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-intelligence-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          {speechSupported ? (
            <Mic className="size-[18px]" aria-hidden="true" />
          ) : (
            <MicOff className="size-[18px]" aria-hidden="true" />
          )}
        </button>
        {message ? (
          <div
            role="status"
            aria-live="polite"
            className="fixed right-4 bottom-4 z-50 max-w-[min(22rem,calc(100vw-2rem))] rounded-[8px] border border-black/10 bg-midnight-ink px-4 py-3 text-canvas-white text-sm shadow-card"
          >
            {message}
          </div>
        ) : null}
      </div>
    );
  },
);

export const FlashcardView = defineComponent(
  FlashcardViewPropsSchema,
  ({ flashcard, phase = "new", onRate, copyContext }: FlashcardViewProps): ReactNode => {
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLElement>(null);

    // Mount-only — the route remounts this per nodeId (via key), so the entrance
    // + scroll-to-top replay per card. A layout effect + a synchronous utils.set
    // applies the hidden start state BEFORE the browser paints, so the card
    // animates INTO view instead of flashing fully-rendered for a frame first.
    useIsomorphicLayoutEffect(() => {
      // A new card always starts at the top (rate-advance otherwise inherits the
      // old scroll position near the footer).
      document.querySelector("main")?.scrollTo({ top: 0 });

      const section = sectionRef.current;
      if (!section) return;
      if (typeof window !== "undefined" && window.matchMedia(PRM).matches) return;

      const blocks = [headerRef.current, bodyRef.current, footerRef.current].filter(
        (el): el is HTMLElement => el !== null,
      );
      utils.set(section, { opacity: 0, scale: 0.96 });
      utils.set(blocks, { y: 26 });
      const tl = createTimeline();
      tl.add(section, { opacity: 1, scale: 1, duration: 300, ease: "out(3)" });
      tl.add(blocks, { y: 0, delay: stagger(75), duration: 400, ease: "out(4)" }, "<+=80");
      return () => {
        tl.revert();
      };
    }, []);

    return (
      <section
        ref={sectionRef}
        className="mx-auto flex w-full max-w-[44rem] flex-col gap-7"
        data-test="flashcard-view"
      >
        <header
          ref={headerRef}
          className="flex flex-col gap-2 border-black/[0.07] border-b pb-5 dark:border-white/[0.08]"
        >
          <span className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.2em]">
            {phase}
          </span>
          <div className="flex items-start gap-3">
            {copyContext ? (
              <LessonContextActions flashcard={flashcard} copyContext={copyContext} />
            ) : null}
            <h1 className="flex-1 text-pretty text-[clamp(1.6rem,1.1rem+2vw,2.25rem)] text-midnight-ink leading-[1.12]">
              {flashcard.title}
            </h1>
            {/* Speech is compiled from the card DATA (not scraped from the DOM):
                structured markdown is the prosody source — see lib/speech-track. */}
            <ReadAloudButton getSegments={() => buildSpeechTrack(flashcard)} />
          </div>
        </header>
        <div ref={bodyRef}>
          <Body flashcard={flashcard} />
        </div>
        <footer
          ref={footerRef}
          className="flex flex-col gap-2.5 border-black/[0.07] border-t pt-5 dark:border-white/[0.08]"
        >
          <p className="font-mono text-[11px] text-muted-ash uppercase tracking-[0.15em]">
            How well did you know this?
          </p>
          <RatingButtons onRate={onRate} />
        </footer>
      </section>
    );
  },
);
