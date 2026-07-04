#!/usr/bin/env bun
// Verifies flashcard code content actually compiles (and behavioral questions
// actually produce the keyed answer). The user's bar: every code example must
// compile and every answer we compare against must be correct.
//
// Snippets are routed by the card's `language` field:
//   - rust (default) ......... bare rustc (edition 2024, lib or --test)
//   - rust using an external graphics crate (bevy/wgpu/glam) ... `cargo check`
//     in a persistent sandbox crate at ~/.cache/mind-palace/card-sandbox with
//     pinned deps (compile-check only; no run)
//   - wgsl ................... `naga` validation (install: cargo install naga-cli)
//   - anything else .......... counted as skipped (no validator available)
//
// For each curriculum node:
//   - content.type === "code": the `solution` must pass its language's check.
//   - content.type === "multiple-choice": the `code` snippet must pass; and if
//     the question is behavioral ("what does this print/output?"), the snippet
//     is bare rust with `fn main`, the program is compiled to a binary, run,
//     and its trimmed stdout must EQUAL options[answerIndex].
//
// Usage:
//   bun scripts/verify-rust-cards.ts            # verifies every registered goal
//   bun scripts/verify-rust-cards.ts <file.ts>  # verifies one curriculum module

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

type Lang = "rust" | "rust-sandbox" | "wgsl" | "skip";
type Job = {
  id: string;
  kind: string;
  code: string;
  lang: Lang;
  run: boolean;
  expect: string | null;
};

const BEHAVIORAL = /\b(print|prints|printed|output|outputs|display|displays)\b/i;
const HAS_MAIN = /fn\s+main\s*\(/;
const TEST_ATTR = /#\[\s*(test\b|cfg\(test\))/;
// Rust snippets that use an external graphics crate can't compile under bare
// rustc — they go through the cargo sandbox instead.
const EXTERNAL_CRATE = /\b(?:use\s+(?:bevy|wgpu|glam)\b|(?:bevy|wgpu|glam)::)/;

// The sandbox crate: created on demand, deps pinned here so snippet checks are
// reproducible. Delete the directories to force a fresh build. CARD_SANDBOX_DIR
// lets concurrent authoring agents each use their own lib.rs while the shared
// CARGO_TARGET_DIR reuses one compiled-deps cache (cargo serializes on its own
// target lock). wgpu is pinned to bevy 0.19's internal wgpu major so both
// resolve to a single build.
const SANDBOX_DIR =
  process.env.CARD_SANDBOX_DIR ?? join(homedir(), ".cache", "mind-palace", "card-sandbox");
const SANDBOX_TARGET_DIR = join(homedir(), ".cache", "mind-palace", "card-sandbox-target");
const SANDBOX_MANIFEST = `[package]
name = "card-sandbox"
version = "0.0.0"
edition = "2024"
publish = false

[dependencies]
bevy = "0.19"
glam = "0.33"
wgpu = "29"
`;

function resolveLang(language: unknown, code: string): Lang {
  const lang = typeof language === "string" ? language : "rust";
  if (lang === "rust") return EXTERNAL_CRATE.test(code) ? "rust-sandbox" : "rust";
  if (lang === "wgsl") return "wgsl";
  return "skip";
}

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
      const code = String(content.solution);
      const lang = resolveLang(content.language, code);
      jobs.push({
        id: `${c.id}/${node.id}`,
        kind: `code-${lang}`,
        code,
        lang,
        run: false,
        expect: null,
      });
    } else if (content.type === "multiple-choice") {
      const code = typeof content.code === "string" ? content.code : "";
      if (code.trim()) {
        const question = String(content.question);
        const options = content.options as string[];
        const answer = options[content.answerIndex as number] ?? "";
        const lang = resolveLang(content.language, code);
        // Behavioral run-checks only make sense for bare rust with a main fn.
        const runnable = lang === "rust" && BEHAVIORAL.test(question) && HAS_MAIN.test(code);
        jobs.push({
          id: `${c.id}/${node.id}`,
          kind: runnable ? "mcq-run" : `mcq-${lang}`,
          code,
          lang,
          run: runnable,
          expect: runnable ? answer : null,
        });
      }
    }
  }
}

function verifyWgsl(job: Job): { ok: boolean; err?: string } {
  const dir = mkdtempSync(join(tmpdir(), "wgsl-card-"));
  try {
    const file = join(dir, "s.wgsl");
    writeFileSync(file, job.code);
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- KEEP: local authoring tool invoking the developer's installed naga by name
    const result = spawnSync("naga", [file], { encoding: "utf8" });
    if (result.error)
      return { ok: false, err: "naga not found — install with: cargo install naga-cli" };
    if (result.status !== 0)
      return { ok: false, err: `wgsl validation failed:\n${result.stderr || result.stdout}` };
    return { ok: true };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function verifySandbox(job: Job): { ok: boolean; err?: string } {
  if (!existsSync(join(SANDBOX_DIR, "Cargo.toml"))) {
    mkdirSync(join(SANDBOX_DIR, "src"), { recursive: true });
    writeFileSync(join(SANDBOX_DIR, "Cargo.toml"), SANDBOX_MANIFEST);
  }
  writeFileSync(join(SANDBOX_DIR, "src", "lib.rs"), job.code);
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- KEEP: local authoring tool invoking the developer's installed cargo by name
  const result = spawnSync("cargo", ["check", "--quiet", "--color", "never"], {
    cwd: SANDBOX_DIR,
    encoding: "utf8",
    env: { ...process.env, CARGO_TARGET_DIR: SANDBOX_TARGET_DIR },
  });
  if (result.error) return { ok: false, err: "cargo not found — install the Rust toolchain" };
  if (result.status !== 0)
    return { ok: false, err: `sandbox cargo check failed:\n${result.stderr}` };
  return { ok: true };
}

function verifyRust(job: Job): { ok: boolean; err?: string } {
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

function verify(job: Job): { ok: boolean; err?: string } {
  if (job.lang === "skip") return { ok: true };
  if (job.lang === "wgsl") return verifyWgsl(job);
  if (job.lang === "rust-sandbox") return verifySandbox(job);
  return verifyRust(job);
}

let failures = 0;
let behavioral = 0;
let sandboxed = 0;
let wgsl = 0;
let skipped = 0;
for (const job of jobs) {
  if (job.run) behavioral++;
  if (job.lang === "rust-sandbox") sandboxed++;
  if (job.lang === "wgsl") wgsl++;
  if (job.lang === "skip") skipped++;
  const result = verify(job);
  if (!result.ok) {
    failures++;
    console.error(`\n✗ ${job.id} [${job.kind}]\n${job.code}\n--> ${result.err}`);
  }
}

process.stdout.write(
  `\nverified ${jobs.length - skipped} snippets across ${curricula.length} curricula ` +
    `(${behavioral} behavioral run-checks, ${sandboxed} cargo-sandboxed, ${wgsl} wgsl, ${skipped} skipped) ` +
    `— ${failures} failure(s)\n`,
);
process.exit(failures === 0 ? 0 : 1);
