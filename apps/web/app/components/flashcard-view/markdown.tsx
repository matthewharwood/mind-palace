import { Fragment, type ReactNode } from "react";

import { CodeEditor } from "~/components/code-editor";

// The lesson-card prose system: a small, uniform typographic renderer for the
// curriculum content. Supports headings (## / ###), bullet & numbered lists,
// paragraphs, fenced ```lang code blocks, and inline `code`, **bold**, *italic*,
// and ==highlight== (a soft marker on the one key term per idea). Deliberately
// not a full markdown engine — just the vocabulary the cards use, rendered with
// one consistent type scale and vertical rhythm so every card feels the same.

const INLINE_RE = /`([^`]+)`|==([^=]+)==|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
// `\s+(\S.*)` (not `\s+(.+)`) keeps the boundary deterministic — `\s` and the
// captured first char (`\S`) can't both match a space, so no backtracking.
const HEADING_RE = /^(#{2,3})\s+(\S.*)$/;
const ULIST_RE = /^[-*]\s+(\S.*)$/;
const OLIST_RE = /^\d+\.\s+(\S.*)$/;
const FENCE_OPEN_RE = /^```(\w*)\s*$/;
const FENCE = "```";

type InlineKind = "text" | "code" | "bold" | "italic" | "highlight";
export interface InlineSegment {
  id: string;
  text: string;
  kind: InlineKind;
}

/** Split a run of text into styled inline segments. Pure → unit-testable. */
export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last)
      out.push({ id: `s${out.length}`, text: text.slice(last, index), kind: "text" });
    if (match[1] !== undefined) out.push({ id: `s${out.length}`, text: match[1], kind: "code" });
    else if (match[2] !== undefined)
      out.push({ id: `s${out.length}`, text: match[2], kind: "highlight" });
    else if (match[3] !== undefined)
      out.push({ id: `s${out.length}`, text: match[3], kind: "bold" });
    else if (match[4] !== undefined)
      out.push({ id: `s${out.length}`, text: match[4], kind: "italic" });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ id: `s${out.length}`, text: text.slice(last), kind: "text" });
  return out;
}

function renderSegment(segment: InlineSegment): ReactNode {
  switch (segment.kind) {
    case "code":
      return (
        <code
          key={segment.id}
          className="rounded bg-midnight-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-midnight-ink"
        >
          {segment.text}
        </code>
      );
    case "highlight":
      return (
        <mark
          key={segment.id}
          className="box-decoration-clone rounded-[3px] bg-amber-200/55 px-1 py-0.5 font-medium text-midnight-ink"
        >
          {segment.text}
        </mark>
      );
    case "bold":
      return (
        <strong key={segment.id} className="font-semibold text-midnight-ink">
          {segment.text}
        </strong>
      );
    case "italic":
      return <em key={segment.id}>{segment.text}</em>;
    default:
      return <Fragment key={segment.id}>{segment.text}</Fragment>;
  }
}

export function InlineText({ text }: { text: string }): ReactNode {
  return parseInline(text).map(renderSegment);
}

interface ListItem {
  id: string;
  text: string;
}
type Block =
  | { id: string; kind: "heading"; level: 2 | 3; text: string }
  | { id: string; kind: "para"; text: string }
  | { id: string; kind: "list"; ordered: boolean; items: ListItem[] }
  | { id: string; kind: "code"; text: string; lang: string };

// Accumulator the line scanner folds prose/lists into as it walks the source.
class Blocks {
  readonly list: Block[] = [];
  private para: string[] = [];
  private items: ListItem[] = [];
  private ordered = false;

  flushPara(): void {
    if (this.para.length > 0) {
      this.list.push({ id: `b${this.list.length}`, kind: "para", text: this.para.join(" ") });
      this.para = [];
    }
  }
  flushList(): void {
    if (this.items.length > 0) {
      this.list.push({
        id: `b${this.list.length}`,
        kind: "list",
        ordered: this.ordered,
        items: this.items,
      });
      this.items = [];
    }
  }
  flush(): void {
    this.flushPara();
    this.flushList();
  }
  addItem(text: string, ordered: boolean): void {
    this.flushPara();
    if (this.items.length > 0 && this.ordered !== ordered) this.flushList();
    this.ordered = ordered;
    this.items.push({ id: `li${this.items.length}`, text });
  }
  addParaLine(text: string): void {
    this.flushList();
    this.para.push(text);
  }
  addHeading(level: 2 | 3, text: string): void {
    this.flush();
    this.list.push({ id: `b${this.list.length}`, kind: "heading", level, text });
  }
  addCode(text: string, lang: string): void {
    this.flush();
    this.list.push({ id: `b${this.list.length}`, kind: "code", text, lang });
  }
}

function splitBlocks(markdown: string): Block[] {
  const blocks = new Blocks();
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const open = line.match(FENCE_OPEN_RE);
    if (open) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").startsWith(FENCE)) {
        body.push(lines[i] ?? "");
        i++;
      }
      blocks.addCode(body.join("\n").trimEnd(), open[1] || "rust");
      continue;
    }
    const heading = line.match(HEADING_RE);
    if (heading) {
      blocks.addHeading((heading[1] ?? "").length === 2 ? 2 : 3, heading[2] ?? "");
      continue;
    }
    const ul = line.match(ULIST_RE);
    if (ul) {
      blocks.addItem(ul[1] ?? "", false);
      continue;
    }
    const ol = line.match(OLIST_RE);
    if (ol) {
      blocks.addItem(ol[1] ?? "", true);
      continue;
    }
    if (line.trim() === "") blocks.flush();
    else blocks.addParaLine(line.trim());
  }
  blocks.flush();
  return blocks.list;
}

function renderBlock(block: Block): ReactNode {
  if (block.kind === "heading") {
    if (block.level === 2) {
      return (
        <h3 key={block.id} className="pt-1 font-semibold text-lg text-midnight-ink sm:text-xl">
          <InlineText text={block.text} />
        </h3>
      );
    }
    return (
      <h4 key={block.id} className="pt-1 font-semibold text-base text-midnight-ink">
        <InlineText text={block.text} />
      </h4>
    );
  }
  if (block.kind === "code") {
    return (
      <div key={block.id} className="overflow-hidden rounded-lg border border-black/10">
        <CodeEditor
          initialValue={block.text}
          language={block.lang}
          readOnly
          ariaLabel="Code example"
        />
      </div>
    );
  }
  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        key={block.id}
        className={`flex flex-col gap-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
      >
        {block.items.map((item) => (
          <li
            key={item.id}
            className="text-[15px] text-midnight-ink/85 leading-7 marker:text-muted-ash sm:text-base"
          >
            <InlineText text={item.text} />
          </li>
        ))}
      </ListTag>
    );
  }
  return (
    <p
      key={block.id}
      className="text-pretty text-[15px] text-midnight-ink/85 leading-7 sm:text-base sm:leading-8"
    >
      <InlineText text={block.text} />
    </p>
  );
}

export function Prose({ markdown }: { markdown: string }): ReactNode {
  return <div className="flex flex-col gap-4">{splitBlocks(markdown).map(renderBlock)}</div>;
}
