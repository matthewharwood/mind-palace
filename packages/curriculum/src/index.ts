// @mind-palace/curriculum — typed knowledge model + graph/layout helpers.
//
// A Source-coupled Curriculum (graph of Flashcards) → LearningPath (tree of
// curricula) → Goal. Scheduling state is NOT here — it lives as progress via
// @mind-palace/srs, keyed by flashcard id. Pure (zod + graphology), so it is
// portable and unit-testable.

export * from "./code";
export * from "./graph";
export * from "./layout";
export * from "./schema";
