import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useState } from "react";

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

const RATINGS: { rating: Rating; label: string; hint: string }[] = [
  { rating: "again", label: "Again", hint: "←" },
  { rating: "hard", label: "Hard", hint: "↓" },
  { rating: "good", label: "Good", hint: "→" },
  { rating: "easy", label: "Easy", hint: "↑" },
];

function StudyView() {
  const { curriculumId } = Route.useParams();
  const curriculum = getCurriculum(curriculumId);
  if (!curriculum) throw notFound();

  const [progress, setProgress] = useAtom(getCurriculumProgressAtom(curriculumId));
  // Snapshot the deck once at mount — rating a card mid-session must not
  // reshuffle the order under the learner.
  const [deck] = useState(() => buildStudyDeck(curriculum, progress.states, Date.now()));
  const [index, setIndex] = useState(0);

  const currentId = deck[index];
  const flashcard = currentId ? getFlashcard(curriculumId, currentId) : undefined;

  function rate(rating: Rating): void {
    if (!currentId) return;
    const next = review(progress.states[currentId] ?? createCardState(), rating).state;
    setProgress((prev) => ({ ...prev, states: { ...prev.states, [currentId]: next } }));
    setIndex((i) => i + 1);
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
          <StudyCard key={currentId} flashcard={flashcard} onRate={rate} />
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
          <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
            {RATINGS.map(({ rating, label, hint }) => (
              <button
                key={rating}
                type="button"
                data-test={`rate-${rating}`}
                onClick={() => rate(rating)}
                className="flex flex-col items-center gap-0.5 rounded-xl border border-black/10 bg-canvas-white py-2.5 text-midnight-ink transition-colors hover:bg-black/[0.03]"
              >
                <span className="text-[15px] leading-none">{label}</span>
                <span aria-hidden="true" className="text-[11px] text-muted-ash leading-none">
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
