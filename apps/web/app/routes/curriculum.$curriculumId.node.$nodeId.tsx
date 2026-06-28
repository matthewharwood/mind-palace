import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { FlashcardView } from "~/components/flashcard-view";
import { getCurriculum, getFlashcard } from "~/data/curriculum-data";
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
  const navigate = useNavigate();
  const curriculum = getCurriculum(curriculumId);
  const flashcard = getFlashcard(curriculumId, nodeId);
  if (!curriculum || !flashcard) throw notFound();

  // Persistent SRS state for this node (IDB via atomWithIDB). Reviewing updates
  // it through the pure @mind-palace/srs scheduler and writes through to IDB.
  const [progress, setProgress] = useAtom(getCurriculumProgressAtom(curriculumId));
  const state = progress.states[nodeId];

  // The next card in the curriculum's authored order (glossary → drills); back to
  // the curriculum graph once this was the last one.
  const index = curriculum.nodes.findIndex((node) => node.id === nodeId);
  const nextNode = curriculum.nodes[index + 1];

  function rate(rating: Rating): void {
    const next = review(state ?? createCardState(), rating).state;
    setProgress((prev) => ({ ...prev, states: { ...prev.states, [nodeId]: next } }));
    // Advancing reuses this component across param changes, so the <main> scroller
    // keeps its position — reset to the top so the next card starts at the top.
    document.querySelector("main")?.scrollTo({ top: 0 });
    if (nextNode) {
      void navigate({
        to: "/curriculum/$curriculumId/node/$nodeId",
        params: { curriculumId, nodeId: nextNode.id },
      });
    } else {
      void navigate({ to: "/curriculum/$curriculumId", params: { curriculumId } });
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <FlashcardView flashcard={flashcard} phase={state?.phase ?? "new"} onRate={rate} />
    </div>
  );
}
