import type { Curriculum, Goal, LearningPath } from "@mind-palace/curriculum";

import { rustCurricula, rustPath } from "./curricula/rust-book";

// Hand-authored sample curriculum graph. Typed with `satisfies` (compile-time
// Pillar-2 guarantee; authored data needs no runtime parse). The extraction
// tooling (final phase) emits this exact shape. Themed off public/element-card-art.

const metals: Curriculum = {
  id: "c-metals",
  title: "Metals",
  source: { kind: "github-repo", url: "https://github.com/example/periodic-table" },
  nodes: [
    {
      id: "au",
      title: "Gold (Au)",
      content: {
        type: "read",
        markdown:
          "**Gold** — symbol Au, atomic number 79. A soft, dense, lustrous metal that resists corrosion.",
      },
    },
    {
      id: "ag",
      title: "Silver (Ag)",
      content: {
        type: "read",
        markdown:
          "**Silver** — symbol Ag, atomic number 47. The best electrical conductor of all metals.",
      },
    },
    {
      id: "cu",
      title: "Copper (Cu)",
      content: {
        type: "read",
        markdown:
          "**Copper** — symbol Cu, atomic number 29. Reddish, ductile, an excellent conductor used in wiring.",
      },
    },
    {
      id: "fe",
      title: "Iron (Fe)",
      content: {
        type: "multiple-choice",
        question: "What is iron's chemical symbol?",
        options: ["Ir", "Fe", "In"],
        answerIndex: 1,
      },
    },
  ],
  edges: [
    { from: "cu", to: "ag" },
    { from: "ag", to: "au" },
    { from: "cu", to: "fe" },
  ],
} satisfies Curriculum;

const gases: Curriculum = {
  id: "c-gases",
  title: "Gases",
  source: { kind: "github-repo", url: "https://github.com/example/periodic-table" },
  nodes: [
    {
      id: "h",
      title: "Hydrogen (H)",
      content: {
        type: "read",
        markdown:
          "**Hydrogen** — symbol H, atomic number 1. The lightest and most abundant element.",
      },
    },
    {
      id: "he",
      title: "Helium (He)",
      content: {
        type: "read",
        markdown: "**Helium** — symbol He, atomic number 2. An inert noble gas, lighter than air.",
      },
    },
    {
      id: "o",
      title: "Oxygen (O)",
      content: {
        type: "read",
        markdown:
          "**Oxygen** — symbol O, atomic number 8. Essential for respiration and combustion.",
      },
    },
  ],
  edges: [
    { from: "h", to: "he" },
    { from: "h", to: "o" },
  ],
} satisfies Curriculum;

const lab: Curriculum = {
  id: "c-lab",
  title: "The Lab",
  source: { kind: "pdf", href: "/docs/lab-handbook.pdf", pages: [1, 12] },
  nodes: [
    {
      id: "safety",
      title: "Lab safety",
      content: {
        type: "read",
        markdown: "Always wear goggles. Know where the eyewash station is.",
      },
    },
    {
      id: "alloys",
      title: "Alloys",
      content: {
        type: "read",
        markdown: "Combining metals (e.g. copper + tin → bronze) yields new properties.",
      },
    },
  ],
  edges: [{ from: "safety", to: "alloys" }],
} satisfies Curriculum;

const CURRICULA: Curriculum[] = [metals, gases, lab, ...rustCurricula];

const periodicPath: LearningPath = {
  id: "p-periodic",
  title: "Periodic Table Mastery",
  nodes: [
    { curriculumId: "c-metals", title: "Metals" },
    { curriculumId: "c-gases", title: "Gases" },
    { curriculumId: "c-lab", title: "The Lab" },
  ],
  // Tree/DAG: the Lab builds on both Metals and Gases.
  edges: [
    { from: "c-metals", to: "c-lab" },
    { from: "c-gases", to: "c-lab" },
  ],
} satisfies LearningPath;

const PATHS: LearningPath[] = [periodicPath, rustPath];

const GOALS: Goal[] = [
  {
    id: "g-periodic",
    title: "Master the Periodic Table",
    description: "Learn the elements, their properties, and how they combine.",
    pathId: "p-periodic",
  } satisfies Goal,
  {
    id: "g-rust",
    title: "Learn Rust",
    description: "Work through The Rust Programming Language, from ownership to concurrency.",
    pathId: "p-rust",
  } satisfies Goal,
];

// --- accessors --------------------------------------------------------------

export function listGoals(): readonly Goal[] {
  return GOALS;
}

export function getGoal(id: string): Goal | undefined {
  return GOALS.find((g) => g.id === id);
}

export function getPath(id: string): LearningPath | undefined {
  return PATHS.find((p) => p.id === id);
}

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

export function getFlashcard(curriculumId: string, nodeId: string) {
  return getCurriculum(curriculumId)?.nodes.find((n) => n.id === nodeId);
}
