import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { animate } from "animejs";
import { useAtom } from "jotai";
import { useRef } from "react";

import { FlashcardView } from "~/components/flashcard-view";
import { getCurriculum, getFlashcard } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";
import { getCurriculumProgressAtom } from "~/state/atoms";

const PRM = "(prefers-reduced-motion: reduce)";

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
  const animatingRef = useRef(false);

  // The next card in the curriculum's authored order (glossary → drills); back to
  // the curriculum graph once this was the last one.
  const index = curriculum.nodes.findIndex((node) => node.id === nodeId);
  const nextNode = curriculum.nodes[index + 1];

  function rate(rating: Rating): void {
    if (animatingRef.current) return;

    // Commit the rating + paginate. The next card (keyed by nodeId) remounts and
    // plays its own entrance + scroll-to-top.
    const advance = (): void => {
      const next = review(state ?? createCardState(), rating).state;
      setProgress((prev) => ({ ...prev, states: { ...prev.states, [nodeId]: next } }));
      if (nextNode) {
        void navigate({
          to: "/curriculum/$curriculumId/node/$nodeId",
          params: { curriculumId, nodeId: nextNode.id },
        });
      } else {
        void navigate({ to: "/curriculum/$curriculumId", params: { curriculumId } });
      }
      animatingRef.current = false;
    };

    const card = document.querySelector<HTMLElement>('[data-test="flashcard-view"]');
    const reduced = typeof window !== "undefined" && window.matchMedia(PRM).matches;
    if (!card || reduced) {
      advance();
      return;
    }
    // Exit: the answered card lifts, shrinks, tips away and fades (GPU transform +
    // opacity only), then we swap in the next card.
    animatingRef.current = true;
    animate(card, {
      opacity: [1, 0],
      scale: [1, 0.96],
      y: [0, -18],
      rotate: [0, -3],
      duration: 200,
      ease: "in(3)",
      onComplete: advance,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <FlashcardView
        key={nodeId}
        flashcard={flashcard}
        phase={state?.phase ?? "new"}
        onRate={rate}
      />
    </div>
  );
}
