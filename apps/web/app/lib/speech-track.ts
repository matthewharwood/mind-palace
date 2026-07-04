import type { Flashcard } from "@mind-palace/curriculum";

import { SPEECH_LEXICON } from "./speech-lexicon";

// ---------------------------------------------------------------------------
// Speech track — compiles a flashcard's STRUCTURED content into a queue of
// prosody-tagged segments for the Web Speech API. Browsers do not parse SSML
// (they read the tags aloud), so this module emulates the spec's intent with
// the tools that do exist:
//   <p>/<s>/<break> → one utterance per heading/sentence/list item + pauseAfterMs
//   <prosody>       → per-segment rate/pitch (headings slower, options steady)
//   <emphasis>      → ==highlights== isolated by commas (a natural spoken beat)
//   <sub>/<say-as>  → the pronunciation lexicon + inline-code verbalization
// Pure and unit-testable: no DOM, no speechSynthesis — the ReadAloudButton owns
// playback. Segmenting per sentence also sidesteps Chrome's long-utterance
// cutoff, which a single flat textContent utterance runs into.
// ---------------------------------------------------------------------------

export interface SpeechSegment {
  /** Pre-verbalized plain text (no markdown, lexicon applied). */
  text: string;
  /** Utterance rate, clamped to the cross-browser-safe 0.5–2 range. */
  rate: number;
  /** Utterance pitch, clamped to the cross-browser-safe 0.5–2 range. */
  pitch: number;
  /** Silence scheduled after this segment before the next one speaks. */
  pauseAfterMs: number;
}

const TITLE = { rate: 0.92, pitch: 1, pauseAfterMs: 550 };
const HEADING = { rate: 0.92, pitch: 1, pauseAfterMs: 450 };
const BODY = { rate: 1, pitch: 1, pauseAfterMs: 140 };
const PARAGRAPH_END_PAUSE = 320;
const LIST_ITEM = { rate: 1, pitch: 1, pauseAfterMs: 220 };
const OPTION = { rate: 0.97, pitch: 1, pauseAfterMs: 300 };

const lexiconPattern = new RegExp(
  `\\b(?:${Object.keys(SPEECH_LEXICON)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\b`,
  "g",
);

/** Inline code chip → speakable words: path/joiner punctuation becomes spaces. */
function verbalizeInlineCode(code: string): string {
  return code
    .replace(/::|_|\./g, " ")
    .replace(/[(){}[\]<>;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip markdown inline syntax and apply the pronunciation lexicon. */
export function verbalizeInline(text: string): string {
  const spoken = text
    // ==emphasis== → comma-isolated beat (the SSML <emphasis> stand-in).
    .replace(/==([^=]+)==/g, ", $1,")
    .replace(/`([^`]+)`/g, (_, code: string) => ` ${verbalizeInlineCode(code)} `)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(lexiconPattern, (match) => SPEECH_LEXICON[match] ?? match)
    // Tidy the comma isolation. Whitespace collapses FIRST so every following
    // rule is a fixed single-space pattern (linear-time, no backtracking): strip
    // the space the code/emphasis replacements leave before punctuation, then
    // collapse comma runs, then drop a comma that abuts a terminal.
    .replace(/\s+/g, " ")
    .replace(/ ([.,!?;:])/g, "$1")
    .replace(/,+/g, ",")
    .replace(/,([.!?])/g, "$1")
    .trim();
  return spoken;
}

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;
const HEADING_LINE = /^#{2,4}\s+(\S.*)$/;
const LIST_ITEM_LINE = /^(?:[-*]|\d+\.)\s+(\S.*)$/;

/** Split prose into sentence-sized utterances (short fragments merge forward). */
function splitSentences(text: string): string[] {
  const parts = text.split(SENTENCE_BOUNDARY);
  const out: string[] = [];
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    const prev = out[out.length - 1];
    if (p.length < 8 && prev !== undefined) out[out.length - 1] = `${prev} ${p}`;
    else out.push(p);
  }
  return out;
}

function pushProse(segments: SpeechSegment[], text: string): void {
  const spoken = verbalizeInline(text);
  if (!spoken) return;
  const sentences = splitSentences(spoken);
  sentences.forEach((sentence, i) => {
    segments.push({
      text: sentence,
      ...BODY,
      pauseAfterMs: i === sentences.length - 1 ? PARAGRAPH_END_PAUSE : BODY.pauseAfterMs,
    });
  });
}

/** Markdown (the read-card grammar: headings, lists, fences, prose) → segments. */
export function markdownToSegments(markdown: string): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  let inFence = false;
  let fenceAnnounced = false;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      pushProse(segments, paragraph.join(" "));
      paragraph = [];
    }
  };

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushParagraph();
      inFence = !inFence;
      if (inFence && !fenceAnnounced) {
        segments.push({ text: "Code example, shown on screen.", ...BODY, pauseAfterMs: 320 });
        fenceAnnounced = true;
      }
      if (!inFence) fenceAnnounced = false;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING_LINE.exec(trimmed);
    if (heading?.[1] !== undefined) {
      flushParagraph();
      segments.push({ text: verbalizeInline(heading[1]), ...HEADING });
      continue;
    }
    const listItem = LIST_ITEM_LINE.exec(trimmed);
    if (listItem?.[1] !== undefined) {
      flushParagraph();
      segments.push({ text: verbalizeInline(listItem[1]), ...LIST_ITEM });
      continue;
    }
    if (trimmed === "") {
      flushParagraph();
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return segments;
}

/** Compile a flashcard (title + typed content) into its full speech track. */
export function buildSpeechTrack(flashcard: Flashcard): SpeechSegment[] {
  const segments: SpeechSegment[] = [{ text: verbalizeInline(flashcard.title), ...TITLE }];
  const content = flashcard.content;
  switch (content.type) {
    case "read":
      segments.push(...markdownToSegments(content.markdown));
      break;
    case "multiple-choice": {
      pushProse(segments, content.question);
      if (content.code !== undefined) {
        segments.push({ text: "There is a code snippet on screen.", ...BODY, pauseAfterMs: 320 });
      }
      content.options.forEach((option, i) => {
        segments.push({ text: `Option ${i + 1}: ${verbalizeInline(option)}`, ...OPTION });
      });
      break;
    }
    case "code":
      pushProse(segments, content.prompt);
      segments.push({ text: "Type the solution in the editor.", ...BODY, pauseAfterMs: 0 });
      break;
    case "video":
      if (content.caption !== undefined) pushProse(segments, content.caption);
      break;
    case "card-mini-game":
      pushProse(segments, content.prompt);
      break;
    default:
      break;
  }
  return segments.filter((s) => s.text.length > 0);
}
