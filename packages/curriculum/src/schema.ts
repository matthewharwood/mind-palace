import * as z from "zod";

// ---------------------------------------------------------------------------
// Curriculum model — Pillar 2, Zod-first. A curriculum is HOMOGENEOUSLY typed
// and coupled to a single Source (a GitHub repo or a PDF). Knowledge extracted
// from that source becomes a graph of Flashcards (lesson nodes) with mapped
// prerequisite edges. A set of curricula forms a LearningPath (a tree) connected
// to a Goal. This is STATIC content; the learner's spaced-repetition state lives
// separately as progress (see @mind-palace/srs), keyed by flashcard id.
// ---------------------------------------------------------------------------

/** Where a curriculum's knowledge comes from. */
export const SourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("github-repo"), url: z.string().min(1), ref: z.string().optional() }),
  z.object({
    kind: z.literal("pdf"),
    href: z.string().min(1),
    pages: z.tuple([z.int(), z.int()]).optional(),
  }),
]);
export type Source = z.infer<typeof SourceSchema>;

/** A directed prerequisite edge: complete `from` before `to` unlocks. */
export const EdgeSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });
export type Edge = z.infer<typeof EdgeSchema>;

/** A flashcard's interaction payload. Polymorphic: a node can be anything from a
 *  read to a question to a card mini-game. `read` is fully built today; the rest
 *  are typed now and rendered richly later. */
export const FlashcardContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("read"), markdown: z.string() }),
  z.object({
    type: z.literal("multiple-choice"),
    question: z.string(),
    // Optional code shown read-only (syntax-highlighted) with the question, e.g.
    // a snippet the learner reasons about. Verified to compile by the card gate.
    code: z.string().optional(),
    language: z.string().optional(),
    options: z.array(z.string()).min(2),
    answerIndex: z.int().min(0),
  }),
  z.object({ type: z.literal("video"), src: z.string().min(1), caption: z.string().optional() }),
  // A drag-and-drop mini-game node — MUST be built on @mind-palace/cards.
  z.object({
    type: z.literal("card-mini-game"),
    prompt: z.string(),
    pairs: z.array(z.object({ card: z.string(), slot: z.string() })).optional(),
  }),
  // Type-the-code: the learner reproduces `solution` in an editor; verified by
  // normalized match (no client-side compiler on static hosting). `language`
  // selects syntax highlighting (defaults to rust in the renderer).
  z.object({
    type: z.literal("code"),
    prompt: z.string(),
    language: z.string().optional(),
    solution: z.string().min(1),
  }),
]);
export type FlashcardContent = z.infer<typeof FlashcardContentSchema>;
export type FlashcardType = FlashcardContent["type"];

/** A single lesson node. Static content only — scheduling state is progress. */
export const FlashcardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: FlashcardContentSchema,
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

/** A curriculum: a source-coupled graph of flashcards. */
export const CurriculumSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  source: SourceSchema,
  nodes: z.array(FlashcardSchema),
  edges: z.array(EdgeSchema),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

/** A node in a learning path — a reference to a curriculum. */
export const CurriculumRefSchema = z.object({
  curriculumId: z.string().min(1),
  title: z.string(),
});
export type CurriculumRef = z.infer<typeof CurriculumRefSchema>;

/** A learning path: a tree of curricula. */
export const LearningPathSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  nodes: z.array(CurriculumRefSchema),
  edges: z.array(EdgeSchema),
});
export type LearningPath = z.infer<typeof LearningPathSchema>;

/** A goal: what the learner is working toward; owns one learning path. */
export const GoalSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  pathId: z.string().min(1),
});
export type Goal = z.infer<typeof GoalSchema>;
