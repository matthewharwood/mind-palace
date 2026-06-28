import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { FlashcardView } from "~/components/flashcard-view";
import { getFlashcard } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { getCurriculumProgressAtom } from "~/state/atoms";

export const Route = createFileRoute("/curriculum/$curriculumId/node/$nodeId")({
  head: ({ params }) => ({
    links: buildSeoLinks({ path: `/curriculum/${params.curriculumId}/node/${params.nodeId}` }),
  }),
  component: NodeView,
});

function NodeView() {
  const { curriculumId, nodeId } = Route.useParams();
  const flashcard = getFlashcard(curriculumId, nodeId);
  if (!flashcard) throw notFound();

  // Persistent SRS state for this node (IDB via atomWithIDB). Reviewing updates
  // it through the pure @mind-palace/srs scheduler and writes through to IDB.
  const [progress, setProgress] = useAtom(getCurriculumProgressAtom(curriculumId));
  const state = progress.states[nodeId];

  function rate(rating: Rating): void {
    const next = review(state ?? createCardState(), rating).state;
    setProgress((prev) => ({ ...prev, states: { ...prev.states, [nodeId]: next } }));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <FlashcardView flashcard={flashcard} phase={state?.phase ?? "new"} onRate={rate} />
    </div>
  );
}
