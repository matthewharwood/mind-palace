import {
  type CharacterDefinition,
  CharacterDefinitionSchema,
  type CharacterDifficulty,
  type CharacterPartyRoundDuration,
  type CharacterPartySessionDuration,
  CharacterPartySessionSchema,
} from "@mind-palace/schemas";
import {
  ArrowRight,
  ChevronLeft,
  Eye,
  ImageOff,
  PencilLine,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import * as z from "zod";

import { CharacterRoundTimer } from "~/components/character-round-timer";
import {
  type CharacterPartyOptions,
  CharacterPartyOptionsSchema,
  formatCountdown,
  roundSecondsRemaining,
  sessionSecondsRemaining,
} from "~/lib/character-party";
import {
  buildImageSearchUrl,
  type CharacterReference,
  CharacterReferenceSchema,
} from "~/lib/character-reference";
import { defineComponent } from "~/lib/define-component";

type CharacterReferenceLoader = (
  character: CharacterDefinition,
  signal: AbortSignal,
) => Promise<CharacterReference | null>;

const CharacterReferenceImagePropsSchema = z.object({
  character: CharacterDefinitionSchema,
  loadReference: z.custom<CharacterReferenceLoader>(),
});
type CharacterReferenceImageProps = z.infer<typeof CharacterReferenceImagePropsSchema>;

const ReferenceStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("loading") }),
  z.object({ status: z.literal("ready"), reference: CharacterReferenceSchema }),
  z.object({ status: z.literal("missing") }),
]);
type ReferenceState = z.infer<typeof ReferenceStateSchema>;

type ReferenceAction = { type: "ready"; reference: CharacterReference } | { type: "missing" };

const INITIAL_REFERENCE_STATE: ReferenceState = { status: "loading" };

function referenceReducer(_state: ReferenceState, action: ReferenceAction): ReferenceState {
  if (action.type === "ready") {
    return ReferenceStateSchema.parse({ status: "ready", reference: action.reference });
  }
  return { status: "missing" };
}

const CharacterReferenceImage = defineComponent(
  CharacterReferenceImagePropsSchema,
  ({ character, loadReference }: CharacterReferenceImageProps): ReactNode => {
    const [state, dispatch] = useReducer(referenceReducer, INITIAL_REFERENCE_STATE);

    useEffect(() => {
      const controller = new AbortController();
      void loadReference(character, controller.signal)
        .then((reference) => {
          if (controller.signal.aborted) return;
          if (reference) {
            dispatch({ type: "ready", reference: CharacterReferenceSchema.parse(reference) });
          } else {
            dispatch({ type: "missing" });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) dispatch({ type: "missing" });
        });
      return () => controller.abort();
    }, [character, loadReference]);

    if (state.status === "loading") {
      return (
        <div
          className="grid min-h-60 w-full place-items-center rounded-[1.75rem] border border-black/10 bg-white/70 text-center dark:border-white/15 dark:bg-white/10"
          aria-live="polite"
        >
          <span className="flex flex-col items-center gap-3 text-[#24172c]/65 dark:text-white/70">
            <Sparkles className="size-8 text-[#c83d53]" aria-hidden="true" />
            Finding a reference image…
          </span>
        </div>
      );
    }

    if (state.status === "ready") {
      return (
        <figure className="flex min-h-0 w-full flex-1 flex-col items-center gap-2">
          <div className="grid min-h-64 w-full flex-1 place-items-center overflow-hidden rounded-[1.75rem] border border-black/10 bg-white p-4 dark:border-white/15">
            <img
              src={state.reference.imageUrl}
              alt={`Reference of ${character.name}`}
              referrerPolicy="no-referrer"
              onError={() => dispatch({ type: "missing" })}
              className="max-h-[48dvh] w-full object-contain"
            />
          </div>
          <figcaption className="text-center text-xs text-[#24172c]/55 dark:text-white/60">
            Reference{" "}
            {state.reference.creatorName ? <span>by {state.reference.creatorName} · </span> : null}
            <a
              href={state.reference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-[#24172c] dark:hover:text-white"
            >
              {state.reference.sourceName}
            </a>
            {state.reference.licenseName && state.reference.licenseUrl ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={state.reference.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-[#24172c] dark:hover:text-white"
                >
                  {state.reference.licenseName}
                </a>
              </>
            ) : null}
          </figcaption>
        </figure>
      );
    }

    return (
      <div className="grid min-h-64 w-full place-items-center rounded-[1.75rem] border border-black/10 bg-white/75 p-6 text-center dark:border-white/15 dark:bg-white/10">
        <div className="max-w-sm">
          <ImageOff className="mx-auto size-10 text-[#c83d53]" aria-hidden="true" />
          <p className="mt-3 font-semibold text-xl">No preview found</p>
          <p className="mt-2 text-sm leading-6 opacity-65">
            A vetted, freely licensed reference is not available for this character. Open a safe
            image search to compare drawings.
          </p>
          <a
            href={buildImageSearchUrl(character.imageSearchTerm)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#24172c] px-5 font-semibold text-sm text-white dark:bg-white dark:text-[#24172c]"
          >
            <Search className="size-4" aria-hidden="true" />
            Open safe image search
          </a>
        </div>
      </div>
    );
  },
);

export const DrawCharacterRoundPropsSchema = z.object({
  session: CharacterPartySessionSchema,
  character: CharacterDefinitionSchema.nullable(),
  characterCount: z.int().min(1),
  homeHref: z.string().min(1),
  loadReference: z.custom<CharacterReferenceLoader>(),
  onConfigure: z.custom<(options: CharacterPartyOptions) => void>(),
  onStart: z.custom<() => void>(),
  onReveal: z.custom<() => void>(),
  onSkip: z.custom<() => void>(),
  onNext: z.custom<() => void>(),
  onStartTimer: z.custom<() => void>(),
  onEnd: z.custom<() => void>(),
});
export type DrawCharacterRoundProps = z.infer<typeof DrawCharacterRoundPropsSchema>;

const DIFFICULTY_OPTIONS: readonly { value: CharacterDifficulty; label: string; note: string }[] = [
  { value: "easy", label: "Easy", note: "Everyone knows them" },
  { value: "medium", label: "Medium", note: "A little generational" },
  { value: "hard", label: "Hard", note: "Mainstream challenge" },
];
const SESSION_DURATION_OPTIONS: readonly {
  value: CharacterPartySessionDuration;
  label: string;
}[] = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 0, label: "No limit" },
];
const ROUND_DURATION_OPTIONS: readonly {
  value: CharacterPartyRoundDuration;
  label: string;
}[] = [
  { value: 0, label: "Off" },
  { value: 60, label: "60 sec" },
  { value: 90, label: "90 sec" },
];

function optionsFromSession(session: DrawCharacterRoundProps["session"]): CharacterPartyOptions {
  return CharacterPartyOptionsSchema.parse({
    selectedDifficulties: session.selectedDifficulties,
    sessionDurationMinutes: session.sessionDurationMinutes,
    roundDurationSeconds: session.roundDurationSeconds,
  });
}

function sessionTimeLabel(secondsRemaining: number | null): string {
  if (secondsRemaining === null) return "No session limit";
  if (secondsRemaining === 0) return "Session time!";
  return `${formatCountdown(secondsRemaining)} left`;
}

export const DrawCharacterRound = defineComponent(
  DrawCharacterRoundPropsSchema,
  ({
    session,
    character,
    characterCount,
    homeHref,
    loadReference,
    onConfigure,
    onStart,
    onReveal,
    onSkip,
    onNext,
    onStartTimer,
    onEnd,
  }: DrawCharacterRoundProps): ReactNode => {
    const [now, setNow] = useState(() => Date.now());
    const headingRef = useRef<HTMLHeadingElement>(null);
    const clockActive =
      session.phase !== "setup" &&
      (session.sessionStartedAt !== null || session.roundStartedAt !== null);

    useEffect(() => {
      if (!clockActive) return;
      const timer = window.setInterval(() => setNow(Date.now()), 1_000);
      return () => window.clearInterval(timer);
    }, [clockActive]);

    useEffect(() => {
      if (session.phase !== "setup" && character) headingRef.current?.focus();
    }, [character, session.phase]);

    useEffect(() => {
      if (session.phase !== "prompt" || !character) return;
      const controller = new AbortController();
      void loadReference(character, controller.signal)
        .then((reference) => {
          if (!reference || controller.signal.aborted) return;
          const image = new Image();
          image.src = reference.imageUrl;
        })
        .catch(() => undefined);
      return () => controller.abort();
    }, [character, loadReference, session.phase]);

    function configure(patch: Partial<CharacterPartyOptions>): void {
      onConfigure(CharacterPartyOptionsSchema.parse({ ...optionsFromSession(session), ...patch }));
    }

    function toggleDifficulty(difficulty: CharacterDifficulty): void {
      const selected = session.selectedDifficulties;
      if (selected.includes(difficulty) && selected.length === 1) return;
      configure({
        selectedDifficulties: selected.includes(difficulty)
          ? selected.filter((item) => item !== difficulty)
          : [...selected, difficulty],
      });
    }

    if (session.phase === "setup") {
      return (
        <section className="min-h-full bg-[#fff8e8] px-4 py-6 text-[#24172c] sm:px-8 sm:py-10 dark:bg-[#17131d] dark:text-white">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
            <a
              href={homeHref}
              className="inline-flex w-fit items-center gap-2 rounded-full py-2 font-semibold text-sm opacity-65 hover:opacity-100"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Character Party
            </a>

            <header>
              <span className="inline-flex items-center gap-2 font-semibold text-[#c83d53] text-sm uppercase tracking-[0.18em]">
                <PencilLine className="size-4" aria-hidden="true" />
                Draw the Character
              </span>
              <h1 className="mt-3 text-balance text-[clamp(2.5rem,8vw,4.75rem)] leading-[0.96]">
                Set up the drawing table
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 opacity-65 sm:text-base">
                Put the phone where everyone can read it. Grab paper and pencils. Nobody looks up
                the character before the reveal.
              </p>
            </header>

            <div className="grid gap-4">
              <fieldset className="rounded-3xl border border-[#24172c]/10 bg-white/75 p-4 shadow-sm dark:border-white/15 dark:bg-white/10 sm:p-5">
                <legend className="px-1 font-semibold">Difficulty</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {DIFFICULTY_OPTIONS.map((option) => {
                    const selected = session.selectedDifficulties.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleDifficulty(option.value)}
                        className={[
                          "min-h-16 rounded-2xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-[#5d50e6] bg-[#5d50e6] text-white"
                            : "border-[#24172c]/10 bg-white/60 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        <span className="block font-semibold">{option.label}</span>
                        <span className="mt-0.5 block text-xs opacity-70">{option.note}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="rounded-3xl border border-[#24172c]/10 bg-white/75 p-4 shadow-sm dark:border-white/15 dark:bg-white/10 sm:p-5">
                  <legend className="px-1 font-semibold">Session reminder</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SESSION_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={session.sessionDurationMinutes === option.value}
                        onClick={() => configure({ sessionDurationMinutes: option.value })}
                        className={[
                          "min-h-11 rounded-full border px-4 font-semibold text-sm transition-colors",
                          session.sessionDurationMinutes === option.value
                            ? "border-[#24172c] bg-[#24172c] text-white dark:border-white dark:bg-white dark:text-[#24172c]"
                            : "border-[#24172c]/15 bg-white/60 hover:bg-white dark:border-white/15 dark:bg-white/5",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="rounded-3xl border border-[#24172c]/10 bg-white/75 p-4 shadow-sm dark:border-white/15 dark:bg-white/10 sm:p-5">
                  <legend className="px-1 font-semibold">Drawing timer</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROUND_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={session.roundDurationSeconds === option.value}
                        onClick={() => configure({ roundDurationSeconds: option.value })}
                        className={[
                          "min-h-11 rounded-full border px-4 font-semibold text-sm transition-colors",
                          session.roundDurationSeconds === option.value
                            ? "border-[#24172c] bg-[#24172c] text-white dark:border-white dark:bg-white dark:text-[#24172c]"
                            : "border-[#24172c]/15 bg-white/60 hover:bg-white dark:border-white/15 dark:bg-white/5",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>

            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#c83d53] px-6 font-semibold text-lg text-white shadow-[0_16px_40px_rgba(190,45,67,0.25)] transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Start with {characterCount} characters
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      );
    }

    if (!character) {
      return (
        <section className="grid min-h-full place-items-center bg-[#fff8e8] p-6 text-center text-[#24172c] dark:bg-[#17131d] dark:text-white">
          <div className="max-w-sm">
            <X className="mx-auto size-10 text-[#c83d53]" aria-hidden="true" />
            <h1 className="mt-3 font-semibold text-3xl">No prompt available</h1>
            <p className="mt-2 opacity-65">Try enabling another difficulty and start again.</p>
            <button
              type="button"
              onClick={onEnd}
              className="mt-5 min-h-12 rounded-full bg-[#24172c] px-5 font-semibold text-white dark:bg-white dark:text-[#24172c]"
            >
              Back to setup
            </button>
          </div>
        </section>
      );
    }

    const sessionRemaining = sessionSecondsRemaining(session, now);
    const roundRemaining = roundSecondsRemaining(session, now);

    if (session.phase === "revealed") {
      return (
        <section className="flex min-h-full flex-col bg-[#dff6eb] px-3 py-3 text-[#18372a] sm:px-6 sm:py-5 dark:bg-[#102019] dark:text-white">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-[#187249] text-xs uppercase tracking-[0.18em] dark:text-[#61d4a4]">
                  <Eye className="size-4" aria-hidden="true" />
                  The reveal
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-1 text-balance font-semibold text-[clamp(2.2rem,8vw,4.75rem)] leading-none outline-none"
                >
                  {character.name}
                </h1>
                <p className="mt-1 text-sm opacity-60">{character.franchise}</p>
              </div>
              <button
                type="button"
                onClick={onEnd}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[#18372a]/15 bg-white/60 hover:bg-white dark:border-white/15 dark:bg-white/10"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span className="sr-only">End session</span>
              </button>
            </header>

            <CharacterReferenceImage
              key={character.id}
              character={character}
              loadReference={loadReference}
            />

            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-16 w-full shrink-0 items-center justify-center gap-3 rounded-2xl bg-[#18372a] px-6 font-semibold text-lg text-white shadow-[0_14px_36px_rgba(24,55,42,0.22)] dark:bg-[#61d4a4] dark:text-[#102019]"
            >
              Next character
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="flex min-h-full flex-col bg-[#fff8e8] px-3 py-3 text-[#24172c] sm:px-6 sm:py-5 dark:bg-[#17131d] dark:text-white">
        <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-rows-[auto_minmax(18rem,1fr)_auto] gap-3">
          <header className="flex items-center justify-between gap-3 text-sm">
            <span className="rounded-full bg-white/70 px-3 py-2 font-semibold shadow-sm dark:bg-white/10">
              Round {session.presentedCount}
            </span>
            <span className="font-mono text-xs tabular-nums opacity-65 sm:text-sm">
              {sessionTimeLabel(sessionRemaining)}
            </span>
            {sessionRemaining === 0 ? (
              <span className="sr-only" aria-live="polite">
                The session reminder has ended.
              </span>
            ) : null}
            <button
              type="button"
              onClick={onEnd}
              className="min-h-10 rounded-full px-3 font-semibold text-xs opacity-60 hover:bg-white hover:opacity-100 dark:hover:bg-white/10 sm:text-sm"
            >
              End
            </button>
          </header>

          <div className="grid min-h-0 place-items-center rounded-[2rem] border border-[#24172c]/10 bg-white/80 p-5 text-center shadow-[0_24px_70px_rgba(88,55,32,0.12)] dark:border-white/15 dark:bg-white/10 sm:p-8">
            <div className="flex max-w-4xl flex-col items-center">
              <p className="flex items-center gap-2 font-semibold text-[#c83d53] text-sm uppercase tracking-[0.22em]">
                <PencilLine className="size-4" aria-hidden="true" />
                Draw this
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-4 text-balance font-semibold text-[clamp(3rem,13vw,7.5rem)] leading-[0.88] outline-none"
              >
                {character.name}
              </h1>
              <p className="mt-6 max-w-lg text-sm opacity-55 sm:text-base">
                No looking it up. Draw from memory, then compare with the real thing.
              </p>
              <div className="mt-6">
                <CharacterRoundTimer
                  durationSeconds={session.roundDurationSeconds}
                  secondsRemaining={roundRemaining}
                  onStart={onStartTimer}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pb-[max(0px,env(safe-area-inset-bottom))] sm:gap-3">
            <button
              type="button"
              onClick={onReveal}
              className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#c83d53] px-6 font-semibold text-lg text-white shadow-[0_14px_36px_rgba(190,45,67,0.25)] active:scale-[0.99] motion-reduce:active:scale-100"
            >
              <Eye className="size-5" aria-hidden="true" />
              Reveal
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-[#24172c]/15 bg-white/70 px-5 font-semibold hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <SkipForward className="size-5" aria-hidden="true" />
              Skip
            </button>
          </div>
        </div>
      </section>
    );
  },
);
