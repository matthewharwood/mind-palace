import { type Flashcard, FlashcardSchema } from "@mind-palace/curriculum";
import * as z from "zod";

export const LessonContextItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});
export type LessonContextItem = z.infer<typeof LessonContextItemSchema>;

export const LessonCopyContextSchema = z.object({
  goalTitle: z.string().min(1).optional(),
  goalDescription: z.string().min(1).optional(),
  pathTitle: z.string().min(1).optional(),
  curriculumId: z.string().min(1),
  curriculumTitle: z.string().min(1),
  curriculumSource: z.string().min(1),
  lessonId: z.string().min(1),
  lessonIndex: z.int().min(0),
  lessonCount: z.int().min(1),
  prerequisites: z.array(LessonContextItemSchema).default([]),
  previousLesson: LessonContextItemSchema.optional(),
  nextLesson: LessonContextItemSchema.optional(),
  canonicalPath: z.string().min(1).optional(),
});
export type LessonCopyContext = z.infer<typeof LessonCopyContextSchema>;

export const LESSON_CONTEXT_START = "----- BEGIN MIND PALACE LESSON CONTEXT -----";
export const LESSON_CONTEXT_END = "----- END MIND PALACE LESSON CONTEXT -----";
const QUESTION_START = "----- BEGIN MIND PALACE SPOKEN QUESTION -----";
const QUESTION_END = "----- END MIND PALACE SPOKEN QUESTION -----";

function longestBacktickRun(text: string): number {
  let longest = 0;
  for (const match of text.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}

function codeFence(language: string | undefined, code: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(code) + 1));
  return `${fence}${language || "text"}\n${code.trimEnd()}\n${fence}`;
}

function optionalLine(label: string, value: string | undefined): string[] {
  return value ? [`- ${label}: ${value}`] : [];
}

function itemLine(label: string, item: LessonContextItem | undefined): string[] {
  return item ? [`- ${label}: ${item.title} (${item.id})`] : [];
}

function prerequisiteLines(prerequisites: readonly LessonContextItem[]): string[] {
  if (prerequisites.length === 0) return ["- Prerequisites: none"];
  return ["- Prerequisites:", ...prerequisites.map((item) => `  - ${item.title} (${item.id})`)];
}

function contentMarkdown(flashcard: Flashcard): string[] {
  const content = flashcard.content;
  switch (content.type) {
    case "read":
      return [content.markdown.trim()];
    case "multiple-choice": {
      const lines = ["### Question", content.question.trim()];
      if (content.code) {
        lines.push("", "### Code", codeFence(content.language ?? "rust", content.code));
      }
      lines.push("", "### Options");
      for (const [index, option] of content.options.entries()) {
        lines.push(`${index + 1}. ${option}`);
      }
      lines.push("", "### Authored answer", content.options[content.answerIndex] ?? "Unknown");
      return lines;
    }
    case "code":
      return [
        "### Prompt",
        content.prompt.trim(),
        "",
        "### Expected solution",
        codeFence(content.language ?? "rust", content.solution),
      ];
    case "video":
      return [
        "### Video",
        `Source: ${content.src}`,
        ...(content.caption ? ["", content.caption] : []),
      ];
    case "card-mini-game":
      return ["### Mini-game prompt", content.prompt.trim()];
    default:
      return [];
  }
}

function contextLines(flashcard: Flashcard, context: LessonCopyContext): string[] {
  const lessonNumber = context.lessonIndex + 1;
  return [
    LESSON_CONTEXT_START,
    "",
    "Use this context to answer my question. My question may appear before or after this block.",
    "",
    "## Learning hierarchy",
    ...optionalLine("Goal", context.goalTitle),
    ...optionalLine("Goal point", context.goalDescription),
    ...optionalLine("Path", context.pathTitle),
    `- Curriculum: ${context.curriculumTitle} (${context.curriculumId})`,
    `- Curriculum source: ${context.curriculumSource}`,
    `- Lesson: ${lessonNumber} of ${context.lessonCount} - ${flashcard.title} (${context.lessonId})`,
    ...prerequisiteLines(context.prerequisites),
    ...itemLine("Previous lesson", context.previousLesson),
    ...itemLine("Next lesson", context.nextLesson),
    ...optionalLine("App path", context.canonicalPath),
    "",
    "## Lesson content",
    ...contentMarkdown(flashcard),
    "",
    LESSON_CONTEXT_END,
    "",
  ];
}

export function buildLessonContextMarkdown(
  flashcard: Flashcard,
  context: LessonCopyContext,
  question = "",
): string {
  const parsedFlashcard = FlashcardSchema.parse(flashcard);
  const parsedContext = LessonCopyContextSchema.parse(context);
  const parts: string[] = [];
  const trimmedQuestion = question.trim();
  if (trimmedQuestion) {
    parts.push(QUESTION_START, "", trimmedQuestion, "", QUESTION_END, "");
  }
  parts.push(...contextLines(parsedFlashcard, parsedContext));
  return `${parts.join("\n")}\n`;
}
