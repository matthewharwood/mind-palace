import type { Curriculum, Source } from "@mind-palace/curriculum";
import { createCardState, type Rating, review } from "@mind-palace/srs";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useRef } from "react";

import { FlashcardView } from "~/components/flashcard-view";
import { getCurriculum, getFlashcard, getGoalForCurriculum, getPath } from "~/data/curriculum-data";
import type { LessonContextItem, LessonCopyContext } from "~/lib/lesson-context-markdown";
import { buildSeoLinks } from "~/lib/seo";
import { getCurriculumProgressAtom } from "~/state/atoms";

const PRM = "(prefers-reduced-motion: reduce)";

function sourceLabel(source: Source): string {
  if (source.kind === "github-repo") {
    const ref = source.ref ? ` @ ${source.ref}` : "";
    return `github-repo: ${source.url}${ref}`;
  }
  const pages = source.pages ? ` pages ${source.pages[0]}-${source.pages[1]}` : "";
  return `pdf: ${source.href}${pages}`;
}

function itemForNode(node: Curriculum["nodes"][number] | undefined): LessonContextItem | undefined {
  return node ? { id: node.id, title: node.title } : undefined;
}

function buildLessonCopyContext(curriculum: Curriculum, nodeId: string): LessonCopyContext {
  const nodeIndex = curriculum.nodes.findIndex((node) => node.id === nodeId);
  const byId = new Map(curriculum.nodes.map((node) => [node.id, node]));
  const goal = getGoalForCurriculum(curriculum.id);
  const path = goal ? getPath(goal.pathId) : undefined;
  const previousLesson = itemForNode(curriculum.nodes[nodeIndex - 1]);
  const nextLesson = itemForNode(curriculum.nodes[nodeIndex + 1]);
  const prerequisites: LessonContextItem[] = [];
  for (const edge of curriculum.edges) {
    if (edge.to !== nodeId) continue;
    const item = itemForNode(byId.get(edge.from));
    if (item) prerequisites.push(item);
  }

  return {
    ...(goal ? { goalTitle: goal.title, goalDescription: goal.description } : {}),
    ...(path ? { pathTitle: path.title } : {}),
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    curriculumSource: sourceLabel(curriculum.source),
    lessonId: nodeId,
    lessonIndex: Math.max(0, nodeIndex),
    lessonCount: curriculum.nodes.length,
    prerequisites,
    ...(previousLesson ? { previousLesson } : {}),
    ...(nextLesson ? { nextLesson } : {}),
    canonicalPath: `/curriculum/${curriculum.id}/node/${nodeId}`,
  };
}

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
    // Guard double-taps; the ref resets for free when the route remounts (new key).
    if (animatingRef.current) return;
    animatingRef.current = true;

    const next = review(state ?? createCardState(), rating).state;
    setProgress((prev) => ({ ...prev, states: { ...prev.states, [nodeId]: next } }));

    // Cross-route card transition via the View Transition API: TanStack wraps the
    // navigation in document.startViewTransition, so the browser captures the
    // outgoing + incoming card and animates the swap in ONE coordinated pass (CSS
    // ::view-transition-old/new in index.css) — no exit-then-enter jitter. The new
    // card's section stagger (anime.js, in FlashcardView) plays on top. Skip the
    // transition under reduced-motion for an instant swap.
    const reduced = typeof window !== "undefined" && window.matchMedia(PRM).matches;
    const viewTransition = !reduced;
    if (nextNode) {
      void navigate({
        to: "/curriculum/$curriculumId/node/$nodeId",
        params: { curriculumId, nodeId: nextNode.id },
        viewTransition,
      });
    } else {
      void navigate({ to: "/curriculum/$curriculumId", params: { curriculumId }, viewTransition });
    }
  }

  return (
    <div className="mp-card-vt mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <FlashcardView
        key={nodeId}
        flashcard={flashcard}
        phase={state?.phase ?? "new"}
        onRate={rate}
        copyContext={buildLessonCopyContext(curriculum, nodeId)}
      />
    </div>
  );
}
