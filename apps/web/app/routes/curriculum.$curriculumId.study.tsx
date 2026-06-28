import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { animate } from "animejs";
import { useAtom } from "jotai";
import { useRef, useState } from "react";

import { RatingButtons } from "~/components/rating-buttons";
import { StudyCard } from "~/components/study-card";
import { getCurriculum, getFlashcard } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { buildStudyDeck } from "~/lib/study-session";
import { getCurriculumProgressAtom } from "~/state/atoms";

export const Route = createFileRoute("/curriculum/$curriculumId/study")({
  head: ({ params }) => ({
    links: buildSeoLinks({ path: `/curriculum/${params.curriculumId}/study` }),
  }),
  component: StudyView,
});

function StudyView() {
  const { curriculumId } = Route.useParams();
  const curriculum = getCurriculum(curriculumId);
  if (!curriculum) throw notFound();

  const [progress, setProgress] = useAtom(getCurriculumProgressAtom(curriculumId));
  // Snapshot the deck once at mount — rating a card mid-session must not
  // reshuffle the order under the learner.
  const [deck] = useState(() => buildStudyDeck(curriculum, progress.states, Date.now()));
  const [index, setIndex] = useState(0);
  const animatingRef = useRef(false);

  const currentId = deck[index];
  const flashcard = currentId ? getFlashcard(curriculumId, currentId) : undefined;

  function rate(rating: Rating): void {
    if (!currentId || animatingRef.current) return;
    const card = document.querySelector<HTMLElement>('[data-test="study-card"]');
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Commit the rating to SRS/IDB and reveal the next card (which plays its own
    // enter animation on mount).
    const advance = (): void => {
      const next = review(progress.states[currentId] ?? createCardState(), rating).state;
      setProgress((prev) => ({ ...prev, states: { ...prev.states, [currentId]: next } }));
      setIndex((i) => i + 1);
      animatingRef.current = false;
    };

    if (!card || reduced) {
      advance();
      return;
    }
    // GPU-composited exit: the answered card recedes up + fades (transform +
    // opacity only — no layout/paint), then we swap to the next card.
    animatingRef.current = true;
    animate(card, {
      y: [0, -18],
      scale: [1, 0.94],
      opacity: [1, 0],
      duration: 200,
      ease: "in(2)",
      onComplete: advance,
    });
  }

  const done = !flashcard;
  const total = deck.length;
  const plural = total === 1 ? "" : "s";
  const doneTitle = total === 0 ? "All caught up" : "Session complete";
  const doneBody =
    total === 0
      ? "No cards are due right now. Come back later for your next review."
      : `You reviewed ${total} card${plural}. Nice work.`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-whisper-gray" data-test="study-view">
      <header className="flex shrink-0 items-center gap-3 px-4 py-3">
        <Link
          to="/curriculum/$curriculumId"
          params={{ curriculumId }}
          aria-label="Exit study session"
          className="grid size-9 shrink-0 place-items-center rounded-full text-midnight-ink text-xl transition-colors hover:bg-black/5"
        >
          ✕
        </Link>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-intelligence-blue transition-[width] duration-300"
            style={{ width: `${total === 0 ? 0 : (Math.min(index, total) / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[12px] text-muted-ash tabular-nums">
          {Math.min(index + (done ? 0 : 1), total)}/{total}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden px-4">
        {flashcard ? (
          <StudyCard key={currentId} flashcard={flashcard} />
        ) : (
          <div
            className="flex max-w-xs flex-col items-center gap-4 text-center"
            data-test="study-done"
          >
            <p className="text-4xl">{total === 0 ? "✨" : "🎉"}</p>
            <h1 className="font-semibold text-2xl text-midnight-ink">{doneTitle}</h1>
            <p className="text-muted-ash text-sm">{doneBody}</p>
            <Link
              to="/curriculum/$curriculumId"
              params={{ curriculumId }}
              className="rounded-full bg-midnight-ink px-5 py-2.5 font-medium text-canvas-white text-sm"
            >
              Back to curriculum
            </Link>
          </div>
        )}
      </div>

      {flashcard ? (
        <footer className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-md">
            <RatingButtons onRate={rate} />
          </div>
        </footer>
      ) : null}
    </div>
  );
}
