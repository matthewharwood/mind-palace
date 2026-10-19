import {
  AvaLearningModeSchema,
  type AvaLearningSession,
  AvaLearningSessionSchema,
} from "@mind-palace/schemas";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Heart, Link2, Play, Sparkles, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";
import { speakAvaWord, stopAvaWordSpeech } from "~/audio/ava-word-speech";
import { AvaIllustration } from "~/components/ava-illustration";
import { AvaMedia } from "~/components/ava-media";
import { AvaScene } from "~/components/ava-scene";
import {
  avaAnswer,
  avaAvailableSubjects,
  avaChooseCard,
  avaConnectPhrase,
  avaLittleSet,
  avaPracticeNext,
  avaRecognitionChoices,
  avaSelectedCard,
} from "~/lib/ava-learning";
import { avaSceneId, getAvaCollection } from "~/lib/ava-learning-catalog";
import { defineComponent } from "~/lib/define-component";
import { useHydrated } from "~/lib/use-hydrated";
import { useMediaQuery } from "~/lib/use-media-query";

const AvaLearningPropsSchema = z.object({
  session: AvaLearningSessionSchema,
  onSessionChange: z.custom<(session: AvaLearningSession) => void>(),
});
export type AvaLearningProps = z.infer<typeof AvaLearningPropsSchema>;
const BASE = import.meta.env.BASE_URL;
const MODES = {
  discover: { label: "Discover", icon: Sparkles },
  recognize: { label: "Recognize", icon: Check },
  connect: { label: "Connect", icon: Link2 },
};
const SUBJECT_LABELS = { ava: "Ava", mommy: "Mommy", daddy: "Daddy", dog: "Dog" };

export const AvaLearning = defineComponent(
  AvaLearningPropsSchema,
  ({ session, onSessionChange }): ReactNode => {
    const interactive = useHydrated();
    const displayed = interactive ? session : AvaLearningSessionSchema.parse({ id: session.id });
    const collection = getAvaCollection(session.id);
    const card = avaSelectedCard(displayed);
    const littleSet = avaLittleSet(displayed);
    const connect = displayed.mode === "connect";
    const recognizing = displayed.mode === "recognize";
    const phrase = avaConnectPhrase(displayed);
    const label = connect ? phrase : card.label;
    const sceneId = avaSceneId(
      card,
      session.id === "ava-actions" && connect ? displayed.subject : card.subject,
    );
    const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
    const choiceVideos = useRef<(HTMLVideoElement | null)[]>([]);
    const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const introduced = Object.values(displayed.records).filter(
      (record) => record.introduced,
    ).length;
    const utterance = recognizing ? card.prompt : label;
    useEffect(() => {
      if (!interactive || !displayed.soundEnabled) return;
      speakAvaWord(utterance);
      return stopAvaWordSpeech;
    }, [interactive, displayed.soundEnabled, utterance]);
    function change(next: AvaLearningSession): void {
      setFeedback(null);
      onSessionChange(next);
    }
    function hear(): void {
      onSessionChange({ ...session, soundEnabled: true });
      if (session.soundEnabled) speakAvaWord(utterance);
    }
    function answer(id: string): void {
      onSessionChange(avaAnswer(session, id));
      setFeedback(id === card.id ? "correct" : "retry");
    }
    let response = "Take your time. Tap the matching scene.";
    if (feedback === "correct") response = `Yes! ${card.label}.`;
    if (feedback === "retry") response = "Let's look again. You can try both.";
    const nextSet = displayed.setStart + 5 >= collection.cards.length ? 0 : displayed.setStart + 5;
    return (
      <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 overflow-y-auto bg-[#faf6ed] px-4 py-4 text-[#34483f] sm:px-7 sm:py-6">
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <Link
              to="/apps"
              className="mb-3 inline-flex min-h-8 items-center gap-1.5 font-medium text-[#698175] text-xs"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Ava&apos;s little world
            </Link>
            <h1 className="font-semibold text-2xl text-[#34483f] sm:text-3xl">
              {collection.title}
            </h1>
            <p className="mt-1 text-[#64745f] text-sm">{collection.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#e6e6d8] bg-white/80 px-3 py-2 text-[#698175] text-xs">
            <Heart className="size-3.5" aria-hidden="true" />
            {introduced} of {collection.cards.length} explored
          </div>
        </header>
        <nav
          aria-label="Learning mode"
          className="grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-[#ebe5d9] bg-[#f0ede3] p-1"
        >
          {AvaLearningModeSchema.options.map((mode) => {
            const { label: modeLabel, icon: Icon } = MODES[mode];
            return (
              <button
                key={mode}
                type="button"
                disabled={!interactive}
                aria-pressed={displayed.mode === mode}
                onClick={() => change({ ...session, mode })}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-colors ${displayed.mode === mode ? "bg-white text-[#405f50] shadow-sm" : "text-[#64745f] hover:text-[#405f50]"}`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {modeLabel}
              </button>
            );
          })}
        </nav>
        {recognizing ? (
          <div className="flex shrink-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-center font-sans font-semibold text-xl">{card.prompt}</h2>
              <button
                type="button"
                aria-label="Hear the question"
                onClick={hear}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dfece2] text-[#436e5b]"
              >
                <Volume2 className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid min-h-0 grid-cols-2 gap-3 lg:flex-1">
              {avaRecognitionChoices(displayed).map((choice, index) => {
                const id = avaSceneId(choice);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={!interactive || feedback === "correct"}
                    aria-label={`Choose ${choice.label}`}
                    onClick={() => answer(choice.id)}
                    className={`relative aspect-[4/5] min-h-48 overflow-hidden rounded-3xl border-[3px] bg-[#fbf5e9] transition-colors lg:aspect-auto ${feedback === "correct" && choice.id === card.id ? "border-[#78a68c]" : "border-white hover:border-[#d9a56b]"}`}
                  >
                    <video
                      ref={(element) => {
                        choiceVideos.current[index] = element;
                      }}
                      src={`${BASE}ava-studio/videos/${id}.mp4`}
                      poster={`${BASE}ava-studio/posters/${id}.jpg`}
                      autoPlay={!reducedMotion}
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-label={`${choice.label} demonstration`}
                      className="absolute inset-0 size-full object-contain"
                    >
                      <track
                        kind="captions"
                        label="Silent demonstration"
                        src="data:text/vtt,WEBVTT%0A%0A"
                        default
                      />
                    </video>
                    <span className="absolute top-3 left-3 grid size-8 place-items-center rounded-full bg-white/90 font-semibold text-[#64745f] text-xs">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  for (const video of choiceVideos.current)
                    void video?.play().catch(() => undefined);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e6e0d3] bg-white px-4 text-sm"
              >
                <Play className="size-4" aria-hidden="true" />
                Watch the choices
              </button>
              <p role="status" className="min-h-6 font-medium text-[#658773] text-sm">
                {response}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid shrink-0 gap-4 lg:min-h-[28rem] lg:flex-1 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-h-[min(95vw,30rem)] lg:min-h-0">
              <AvaMedia
                key={`${sceneId}-${connect}`}
                label={label}
                mode={displayed.viewMode}
                onModeChange={(viewMode) => change({ ...session, viewMode })}
                twoDContent={<AvaIllustration sceneId={sceneId} label={`${label} illustration`} />}
                threeDContent={<AvaScene sceneId={sceneId} label={label} />}
                videoSrc={`${BASE}ava-studio/videos/${sceneId}.mp4`}
                videoPoster={`${BASE}ava-studio/posters/${sceneId}.jpg`}
                videoFallback={
                  <img
                    src={`${BASE}ava-studio/posters/${sceneId}.jpg`}
                    alt={`${label} illustration`}
                    className="size-full object-contain"
                  />
                }
              />
            </div>
            <aside className="flex flex-col justify-between gap-5 rounded-3xl border border-[#e8e3d8] bg-white/90 p-5">
              <div>
                <p className="mb-3 font-semibold text-[#64745f] text-[10px] uppercase tracking-[.2em]">
                  {connect ? "Little words, together" : "Let's discover"}
                </p>
                {connect ? (
                  <section aria-label="Word combination" className="mb-3 flex flex-wrap gap-2">
                    {phrase.split(" ").map((word) => (
                      <span
                        key={`${card.id}-${word}`}
                        className="rounded-xl bg-[#eaf0e6] px-3 py-2 font-semibold text-[#526d52] text-xl"
                      >
                        {word}
                      </span>
                    ))}
                  </section>
                ) : (
                  <h2 aria-live="polite" className="font-sans font-semibold text-4xl leading-tight">
                    {card.label}
                  </h2>
                )}
                <p className="mt-3 text-[#64745f] text-sm leading-6">
                  {connect
                    ? "Two familiar ideas become something new. Say it, then try it together."
                    : card.hint}
                </p>
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={hear}
                  aria-label={`Hear ${label}`}
                  className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e1ebdf] px-5 font-semibold text-[#4d7055] text-sm"
                >
                  <Volume2 className="size-4" aria-hidden="true" />
                  {connect ? "Hear the words" : "Hear the word"}
                </button>
                {connect && session.id === "ava-actions" ? (
                  <fieldset className="mt-5">
                    <legend className="mb-2 text-[#64745f] text-xs">Who is doing it?</legend>
                    <div className="flex flex-wrap gap-2">
                      {avaAvailableSubjects(card).map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={displayed.subject === subject}
                          onClick={() => change({ ...session, subject })}
                          className={`min-h-11 rounded-full border px-3 text-sm ${displayed.subject === subject ? "border-[#729b81] bg-[#eaf0e6]" : "border-[#eee9df]"}`}
                        >
                          {SUBJECT_LABELS[subject]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
              </div>
              <p className="inline-flex items-center gap-2 text-[#64745f] text-xs">
                <Heart className="size-3.5" aria-hidden="true" />A few playful minutes is enough.
              </p>
            </aside>
          </div>
        )}
        <footer className="flex shrink-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-[#64745f] text-[10px] uppercase tracking-[.16em]">
              This little set
            </span>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => change(avaChooseCard(session, nextSet))}
              className="inline-flex min-h-8 items-center gap-1 text-[#64745f] text-xs"
            >
              Next little set
              <ArrowRight className="size-3" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {littleSet.map((item, index) => (
              <button
                key={item.id}
                type="button"
                disabled={!interactive}
                aria-pressed={item.id === card.id}
                onClick={() => change(avaChooseCard(session, displayed.setStart + index))}
                className={`min-h-11 rounded-full border px-4 font-medium text-sm ${item.id === card.id ? "border-[#deb58c] bg-[#f6e7d4] text-[#64745f]" : "border-[#e8e5d8] bg-white/80 text-[#64745f]"}`}
              >
                {item.label}
                {displayed.records[item.id]?.introduced ? (
                  <span className="sr-only">, explored</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <details className="max-w-sm text-[#64745f] text-xs">
              <summary className="min-h-9 cursor-pointer py-2">Grown-up corner</summary>
              <p className="py-2 leading-5">
                {card.hint} Watch for a look, gesture, sound, or word. Let Ava lead.
              </p>
              <button
                type="button"
                disabled={!interactive}
                aria-pressed={displayed.soundEnabled}
                onClick={() => change({ ...session, soundEnabled: !session.soundEnabled })}
                className="mr-4 min-h-11 underline"
              >
                Narration {displayed.soundEnabled ? "on" : "off"}
              </button>
              <button
                type="button"
                onClick={() => change(AvaLearningSessionSchema.parse({ id: session.id }))}
                className="min-h-9 underline"
              >
                Start this collection over
              </button>
            </details>
            <button
              type="button"
              disabled={!interactive || (recognizing && feedback !== "correct")}
              onClick={() => change(avaPracticeNext(session))}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#597b60] px-6 font-semibold text-white text-sm shadow-sm disabled:opacity-40"
            >
              {recognizing ? "Next little discovery" : "We tried it"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </footer>
      </section>
    );
  },
);
