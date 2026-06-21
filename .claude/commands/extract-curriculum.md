---
description: Extract a typed @mind-palace/curriculum from a GitHub repo or PDF — read the source, abstract its knowledge into a graph of flashcard lesson nodes with mapped prerequisite edges, emit CurriculumSchema-validated data into apps/web/app/data/, and leave the gate green.
argument-hint: <github-repo-url | path/to.pdf> [curriculum-id]
---

<objective>
Turn a single source of knowledge (one GitHub repo or one PDF) into ONE homogeneously-typed `Curriculum` for the learning game: a graph of `Flashcard` lesson nodes with mapped prerequisite `edges`, coupled to its `Source`. The output is committed TypeScript data validated by `@mind-palace/curriculum`'s Zod schema — no backend, no runtime extraction. Authoring-time only.
</objective>

<args>
$ARGUMENTS

First token = the source: a GitHub repo URL (`https://github.com/owner/name`) or a path to a `.pdf`. Optional second token = the curriculum id (kebab-case); derive it from the source name if omitted. If $ARGUMENTS is empty, ask for the source before proceeding.
</args>

<contract>
The output MUST satisfy `CurriculumSchema` from `@mind-palace/curriculum` (`packages/curriculum/src/schema.ts`). Read that file first — it is the source of truth. Shape:

- `Source` — `{ kind: "github-repo", url, ref? }` or `{ kind: "pdf", href, pages? }`.
- `Flashcard` — `{ id, title, content }` where `content` is the discriminated union: `read` (markdown), `multiple-choice` (question/options/answerIndex), `video` (src/caption), `card-mini-game` (prompt/pairs). Prefer `read` and `multiple-choice` (the fully-built renderers); use `card-mini-game` only for drag-and-drop practice (it composes `@mind-palace/cards`).
- `Curriculum` — `{ id, title, source, nodes: Flashcard[], edges: Edge[] }`. `edges` are directed prerequisites (`{ from, to }`): complete `from` before `to`.

Scheduling state is NOT emitted — it's runtime SRS progress keyed by flashcard id. Author content only.
</contract>

<process>
1. **Read the contract**: open `packages/curriculum/src/schema.ts` and `apps/web/app/data/curriculum-data.ts` (the hand-authored example) so the output matches exactly — same `satisfies Curriculum` style.
2. **Acquire the source**:
   - GitHub repo: shallow-clone to a temp dir or use `gh` to read the README, docs, and key source files. Capture the canonical `url` (and `ref` if pinning).
   - PDF: read it with the Read tool (`pages` ranges). Record the `href`/path and the page span used.
3. **Abstract the knowledge** — fan out subagents (one per major area/section: e.g. directory, chapter) with the Agent tool, each returning structured findings: candidate concepts, a one-paragraph `read` body per concept, and 0–2 `multiple-choice` checks. Keep nodes atomic (one idea per flashcard).
4. **Map the graph** — a synthesizer pass: dedupe concepts into `Flashcard` nodes with stable kebab-case `id`s, then draw prerequisite `edges` (foundational → advanced). Keep it a DAG; roots are entry points.
5. **Emit** `apps/web/app/data/curricula/<curriculum-id>.ts` exporting a `const ... = {...} satisfies Curriculum`, and register it in `apps/web/app/data/curriculum-data.ts` (add to `CURRICULA`, and to a `LearningPath`/`Goal` if building a new path).
6. **Validate + gate**: the `satisfies Curriculum` gives compile-time validation; additionally run a one-off `CurriculumSchema.parse(...)` in a scratch `bun -e` to confirm runtime validity, then `bun run check:fast` until green.
</process>

<constraints>
- Outside-stack deps are forbidden without asking (CLAUDE.md). This pipeline needs none — it produces typed data only.
- Card drag-and-drop nodes (`card-mini-game`) MUST use `@mind-palace/cards` (CLAUDE.md rule); don't hand-roll.
- Keep curricula small and coherent — one source, one curriculum. A set of curricula becomes a `LearningPath`.
</constraints>
