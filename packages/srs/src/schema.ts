import * as z from "zod";

// ---------------------------------------------------------------------------
// Spaced-repetition schemas. Pillar 2 — every type below is `z.infer` of a
// Zod schema; nothing here is hand-written. Generic content (the front/back of
// a flashcard, a code snippet from a repo, …) is supplied by the caller as its
// own Zod schema and woven in via `cardSchema(content)` — the scheduler never
// looks at it, which is what makes a deck content-agnostic and portable.
// ---------------------------------------------------------------------------

/** The four review buttons. Numeric grading (SM-2's 0–5) is intentionally not
 *  exposed — `again | hard | good | easy` is what a UI actually shows. */
export const RatingSchema = z.enum(["again", "hard", "good", "easy"]);
export type Rating = z.infer<typeof RatingSchema>;

/** Where a card sits in its lifecycle. `new` → `learning` → `review`; a missed
 *  review drops it to `relearning`, which graduates back to `review`. */
export const CardPhaseSchema = z.enum(["new", "learning", "review", "relearning"]);
export type CardPhase = z.infer<typeof CardPhaseSchema>;

/** The scheduling memory of a single card — the only thing the algorithm reads
 *  and writes. Plain JSON, so it serializes into IDB and across the wire. */
export const CardStateSchema = z.object({
  phase: CardPhaseSchema.default("new"),
  /** Index into the active learning/relearning step ladder. 0 in review. */
  step: z.int().min(0).default(0),
  /** SM-2 easiness factor; multiplies the interval on a `good` review. */
  ease: z.number().default(2.5),
  /** Current scheduling interval, in minutes (learning steps are sub-day). */
  intervalMinutes: z.number().min(0).default(0),
  /** Epoch ms when the card next becomes due. New cards are due immediately. */
  due: z.number().default(0),
  /** Total reviews ever performed on this card. */
  reps: z.int().min(0).default(0),
  /** Times the card lapsed (a `again` from the `review` phase). */
  lapses: z.int().min(0).default(0),
  /** Epoch ms of the most recent review, or null if never reviewed. */
  lastReviewedAt: z.number().nullable().default(null),
});
export type CardState = z.infer<typeof CardStateSchema>;

/** One row of review history. Kept so the schedule is auditable and so a future
 *  optimizer (e.g. FSRS) could be trained without changing this package's API. */
export const ReviewLogSchema = z.object({
  rating: RatingSchema,
  /** Phase the card was in *before* this review. */
  phase: CardPhaseSchema,
  /** The interval (minutes) the card was scheduled to *after* this review. */
  intervalMinutes: z.number(),
  /** Ease after this review. */
  ease: z.number(),
  /** Epoch ms the review happened. */
  reviewedAt: z.number(),
  /** Minutes elapsed since the previous review (0 for a first review). */
  elapsedMinutes: z.number(),
});
export type ReviewLog = z.infer<typeof ReviewLogSchema>;

// ---------------------------------------------------------------------------
// Scheduler configuration. Every field is defaultable, so `SchedulerConfigSchema
// .parse({})` yields a complete config — `DEFAULT_CONFIG` below. A deck may carry
// a partial override; callers may override per-review.
// ---------------------------------------------------------------------------
export const SchedulerConfigSchema = z.object({
  /** Minutes between intra-session reps before a new card graduates. */
  learningStepsMinutes: z.array(z.number().positive()).default([1, 10]),
  /** Minutes between reps while relearning a lapsed card. */
  relearningStepsMinutes: z.array(z.number().positive()).default([10]),
  /** Days for the first review-phase interval when a card graduates. */
  graduatingIntervalDays: z.number().positive().default(1),
  /** Days for the first interval when a card is graduated via `easy`. */
  easyIntervalDays: z.number().positive().default(4),
  /** Ease a brand-new card starts with. */
  startingEase: z.number().positive().default(2.5),
  /** Ease never drops below this. */
  minEase: z.number().positive().default(1.3),
  /** Extra multiplier applied on top of ease for an `easy` review. */
  easyBonus: z.number().positive().default(1.3),
  /** Multiplier for a `hard` review (applied to the current interval, not ease). */
  hardMultiplier: z.number().positive().default(1.2),
  /** Global knob to stretch/compress every review-phase interval. */
  intervalModifier: z.number().positive().default(1),
  /** Hard ceiling on any interval, in days. */
  maxIntervalDays: z.number().positive().default(36_500),
  /** How each rating nudges ease in the review phase. A default *value* is not
   *  re-parsed through the inner schema, so the whole object is the default. */
  easeDelta: z
    .object({
      again: z.number().default(-0.2),
      hard: z.number().default(-0.15),
      good: z.number().default(0),
      easy: z.number().default(0.15),
    })
    .default({ again: -0.2, hard: -0.15, good: 0, easy: 0.15 }),
});
export type SchedulerConfig = z.infer<typeof SchedulerConfigSchema>;
/** Input shape — every field optional (defaults fill the rest). */
export type SchedulerConfigInput = z.input<typeof SchedulerConfigSchema>;

/** The fully-resolved default config. */
export const DEFAULT_CONFIG: SchedulerConfig = SchedulerConfigSchema.parse({});

/** A *sparse* config override stored on a deck. Unlike `SchedulerConfigSchema
 *  .partial()`, this applies NO field defaults — so it stays a true diff over
 *  `DEFAULT_CONFIG` and serializes back to exactly what was set. Merged over the
 *  defaults at scheduling time by `resolveConfig`. */
export const SchedulerConfigOverrideSchema = z.object({
  learningStepsMinutes: z.array(z.number().positive()).optional(),
  relearningStepsMinutes: z.array(z.number().positive()).optional(),
  graduatingIntervalDays: z.number().positive().optional(),
  easyIntervalDays: z.number().positive().optional(),
  startingEase: z.number().positive().optional(),
  minEase: z.number().positive().optional(),
  easyBonus: z.number().positive().optional(),
  hardMultiplier: z.number().positive().optional(),
  intervalModifier: z.number().positive().optional(),
  maxIntervalDays: z.number().positive().optional(),
  easeDelta: z
    .object({
      again: z.number(),
      hard: z.number(),
      good: z.number(),
      easy: z.number(),
    })
    .partial()
    .optional(),
});
export type SchedulerConfigOverride = z.infer<typeof SchedulerConfigOverrideSchema>;

// ---------------------------------------------------------------------------
// Generic card + deck. `T` is the content payload; supply its Zod schema and
// these factories weave it in so the whole structure parses at the boundary.
// ---------------------------------------------------------------------------

/** A scheduled card carrying arbitrary validated `content`. */
export interface Card<TContent> {
  id: string;
  content: TContent;
  srs: CardState;
  createdAt: number;
}

/** Build a Zod schema for `Card<z.infer<TContent>>`. The explicit return type
 *  collapses Zod's generic inference back to the clean `Card<T>` shape so
 *  `.parse()` callers get `Card<T>`, not an unreduced mapped type. */
export function cardSchema<TContent extends z.ZodType>(
  content: TContent,
): z.ZodType<Card<z.infer<TContent>>> {
  // The schema is structurally exact, but Zod's generic output type doesn't
  // reduce to the hand-written Card<T> under exactOptionalPropertyTypes. Assert
  // the public type — runtime validation still happens through .parse().
  return z.object({
    id: z.string().min(1),
    content,
    srs: CardStateSchema,
    createdAt: z.number(),
  }) as unknown as z.ZodType<Card<z.infer<TContent>>>;
}

/** A named collection of cards plus an optional config override. */
export interface Deck<TContent> {
  id: string;
  name: string;
  createdAt: number;
  /** Sparse overrides merged over `DEFAULT_CONFIG` when scheduling this deck. */
  config: SchedulerConfigOverride;
  cards: Card<TContent>[];
}

/** Build a Zod schema for `Deck<z.infer<TContent>>` — the parse/share boundary. */
export function deckSchema<TContent extends z.ZodType>(
  content: TContent,
): z.ZodType<Deck<z.infer<TContent>>> {
  return z.object({
    id: z.string().min(1),
    name: z.string(),
    createdAt: z.number(),
    config: SchedulerConfigOverrideSchema.default({}),
    cards: z.array(cardSchema(content)),
  }) as unknown as z.ZodType<Deck<z.infer<TContent>>>;
}
