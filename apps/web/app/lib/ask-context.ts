import type { Flashcard } from "@mind-palace/curriculum";

import { getCurriculum, getFlashcard, getGoal, getGoalForCurriculum } from "~/data/curriculum-data";

import type { PathReport } from "./progress-report";

// Builds the "Ask" clipboard payload — a self-contained markdown prompt the user
// pastes into their own LLM. No inference happens here or anywhere in the app;
// this only assembles context (where they are + their progress + their question)
// around a fixed "I'm stuck, go deeper" framing. Pure → unit-testable.

export const ASK_PREFIX =
  "I want to learn more about this topic because right now I'm stuck in some way. Help me understand it deeply, clear up what I'm missing, and push me further.";

export interface FocusContext {
  /** Breadcrumb-style location, e.g. "Learn Rust › Generics… › Lifetimes". */
  location: string;
  /** The current lesson's prompt/question, when on a node — what they're stuck on. */
  detail: string | null;
}

function flashcardDetail(flashcard: Flashcard): string | null {
  const content = flashcard.content;
  switch (content.type) {
    case "read":
      return content.markdown;
    case "multiple-choice":
      return `${content.question}\nOptions: ${content.options.join(" · ")}`;
    case "code":
      return content.prompt;
    case "video":
      return content.caption ?? null;
    default:
      return content.prompt;
  }
}

/** Resolve "what am I looking at" from the current path (static curriculum data). */
export function resolveFocus(pathname: string): FocusContext {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "goal" && segments[1]) {
    return { location: getGoal(segments[1])?.title ?? segments[1], detail: null };
  }
  if (segments[0] === "curriculum" && segments[1]) {
    const curriculumId = segments[1];
    const base = [getGoalForCurriculum(curriculumId)?.title, getCurriculum(curriculumId)?.title]
      .filter(Boolean)
      .join(" › ");
    if (segments[2] === "node" && segments[3]) {
      const flashcard = getFlashcard(curriculumId, segments[3]);
      return {
        location: [base, flashcard?.title].filter(Boolean).join(" › ") || segments[3],
        detail: flashcard ? flashcardDetail(flashcard) : null,
      };
    }
    return { location: base || curriculumId, detail: null };
  }
  if (segments[0] === "progress") return { location: "Progress report", detail: null };
  return { location: "Goals overview", detail: null };
}

function progressSection(reports: readonly PathReport[]): string {
  const started = reports.filter((report) => report.started > 0);
  if (started.length === 0) return "_Just getting started — no reviews logged yet._";
  return started
    .map((report) => {
      const lines = [
        `### ${report.goalTitle}`,
        `- Mastery: ${report.masteryPct}% (${report.mastered}/${report.total} cards) · ${report.due} due`,
      ];
      const weakest = report.curricula.find((c) => c.id === report.weakestCurriculumId);
      if (weakest) lines.push(`- Weakest area: ${weakest.title} (${weakest.masteryPct}% mastered)`);
      if (report.weak.length > 0) {
        lines.push("- Struggling with:");
        for (const card of report.weak.slice(0, 5)) {
          lines.push(`  - ${card.title} — ${card.curriculumTitle} (${card.reasons.join(", ")})`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildAskMarkdown(
  focus: FocusContext,
  reports: readonly PathReport[],
  question: string,
): string {
  const parts: string[] = [ASK_PREFIX, "", "## Where I am right now", `**${focus.location}**`];
  if (focus.detail) {
    parts.push("", `> ${focus.detail.replace(/\n/g, "\n> ")}`);
  }
  parts.push("", "## My progress across learning paths", progressSection(reports));
  parts.push("", "## My question", question.trim() || "_(describe what you're stuck on)_");
  return `${parts.join("\n")}\n`;
}
