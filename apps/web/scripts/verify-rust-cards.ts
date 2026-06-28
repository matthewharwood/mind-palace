#!/usr/bin/env bun
// Verifies the Rust flashcard content actually compiles (and behavioral
// questions actually produce the keyed answer). The user's bar: every code
// example must compile and every answer we compare against must be correct.
//
// For each curriculum node:
//   - content.type === "code": the `solution` must compile (edition 2024, as a
//     lib so complete items OR full programs both pass).
//   - content.type === "multiple-choice": every ```rust block in the question
//     must compile; and if the question is behavioral ("what does this
//     print/output?") and the block has `fn main`, the program is compiled to a
//     binary, run, and its trimmed stdout must EQUAL options[answerIndex].
//
// Usage:
//   bun scripts/verify-rust-cards.ts            # verifies the assembled rust path
//   bun scripts/verify-rust-cards.ts <file.ts>  # verifies one curriculum module

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Job = { id: string; kind: string; code: string; run: boolean; expect: string | null };

const BEHAVIORAL = /\b(print|prints|printed|output|outputs|display|displays)\b/i;
const HAS_MAIN = /fn\s+main\s*\(/;
const TEST_ATTR = /#\[\s*(test\b|cfg\(test\))/;

type Curriculum = { id: string; nodes: { id: string; content: Record<string, unknown> }[] };
const isCurriculum = (v: unknown): v is Curriculum => {
  const c = v as Curriculum;
  return (
    !!c &&
    typeof c === "object" &&
    Array.isArray(c.nodes) &&
    c.nodes.length > 0 &&
    c.nodes.every((n) => n && typeof n === "object" && "content" in n)
  );
};

const arg = process.argv[2];
const curricula: Curriculum[] = [];
if (arg) {
  // Single-module mode: verify every curriculum exported by the given file.
  const mod = (await import(new URL(arg, `file://${process.cwd()}/`).pathname)) as Record<
    string,
    unknown
  >;
  for (const value of Object.values(mod)) {
    if (Array.isArray(value)) {
      for (const c of value) if (isCurriculum(c)) curricula.push(c);
    } else if (isCurriculum(value)) {
      curricula.push(value);
    }
  }
} else {
  // Default: walk every registered goal → path → curriculum.
  const data = (await import(
    new URL("../app/data/curriculum-data.ts", import.meta.url).pathname
  )) as {
    listGoals: () => { pathId: string }[];
    getPath: (id: string) => { nodes: { curriculumId: string }[] } | undefined;
    getCurriculum: (id: string) => Curriculum | undefined;
  };
  const seen = new Set<string>();
  for (const goal of data.listGoals()) {
    const path = data.getPath(goal.pathId);
    if (!path) continue;
    for (const ref of path.nodes) {
      const c = data.getCurriculum(ref.curriculumId);
      if (c && isCurriculum(c) && !seen.has(c.id)) {
        seen.add(c.id);
        curricula.push(c);
      }
    }
  }
}

const jobs: Job[] = [];
for (const c of curricula) {
  for (const node of c.nodes) {
    const content = node.content as { type: string; [k: string]: unknown };
    if (content.type === "code") {
      jobs.push({
        id: `${c.id}/${node.id}`,
        kind: "code",
        code: String(content.solution),
        run: false,
        expect: null,
      });
    } else if (content.type === "multiple-choice") {
      const code = typeof content.code === "string" ? content.code : "";
      if (code.trim()) {
        const question = String(content.question);
        const options = content.options as string[];
        const answer = options[content.answerIndex as number] ?? "";
        const runnable = BEHAVIORAL.test(question) && HAS_MAIN.test(code);
        jobs.push({
          id: `${c.id}/${node.id}`,
          kind: runnable ? "mcq-run" : "mcq-compile",
          code,
          run: runnable,
          expect: runnable ? answer : null,
        });
      }
    }
  }
}

function verify(job: Job): { ok: boolean; err?: string } {
  const dir = mkdtempSync(join(tmpdir(), "rust-card-"));
  try {
    const file = join(dir, "s.rs");
    writeFileSync(file, job.code);
    if (job.run) {
      const bin = join(dir, "prog");
      // eslint-disable-next-line sonarjs/no-os-command-from-path -- KEEP: local authoring tool invoking the developer's installed rustc by name
      const compile = spawnSync("rustc", ["--edition", "2024", file, "-o", bin], {
        encoding: "utf8",
      });
      if (compile.status !== 0) return { ok: false, err: `compile failed:\n${compile.stderr}` };
      const out = spawnSync(bin, [], { encoding: "utf8" });
      const got = (out.stdout ?? "").trim();
      const want = (job.expect ?? "").trim();
      if (got !== want)
        return {
          ok: false,
          err: `stdout ${JSON.stringify(got)} !== keyed answer ${JSON.stringify(want)}`,
        };
      return { ok: true };
    }
    // #[test]/#[cfg(test)] code is excluded under --crate-type lib, so compile
    // those as a test binary to actually type-check the test bodies.
    const isTest = TEST_ATTR.test(job.code);
    const args = isTest
      ? ["--edition", "2024", "--test", file, "-o", join(dir, "out")]
      : ["--edition", "2024", "--crate-type", "lib", file, "-o", join(dir, "out.rlib")];
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- KEEP: local authoring tool invoking the developer's installed rustc by name
    const compile = spawnSync("rustc", args, { encoding: "utf8" });
    if (compile.status !== 0) return { ok: false, err: `compile failed:\n${compile.stderr}` };
    return { ok: true };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let failures = 0;
let behavioral = 0;
for (const job of jobs) {
  if (job.run) behavioral++;
  const result = verify(job);
  if (!result.ok) {
    failures++;
    console.error(`\n✗ ${job.id} [${job.kind}]\n${job.code}\n--> ${result.err}`);
  }
}

process.stdout.write(
  `\nverified ${jobs.length} snippets across ${curricula.length} curricula (${behavioral} behavioral run-checks) — ${failures} failure(s)\n`,
);
process.exit(failures === 0 ? 0 : 1);
