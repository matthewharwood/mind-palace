import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

import { buildAskMarkdown, resolveFocus } from "~/lib/ask-context";
import { assembleReports } from "~/lib/learning-progress";
import type { PathReport } from "~/lib/progress-report";
import { loadAllCurriculumProgress } from "~/state/progress-snapshot";

// The "Ask" side drawer. Gathers the learner's context — where they are, their
// progress + weaknesses, and the question they type/dictate — and copies it to
// the clipboard as a markdown prompt for their own LLM. No inference here.
export function AskDrawer({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [question, setQuestion] = useState("");
  const [reports, setReports] = useState<PathReport[]>([]);
  const [copied, setCopied] = useState(false);

  // Refresh the progress snapshot each time the drawer opens (so it reflects
  // reviews done this session).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadAllCurriculumProgress().then((states) => {
      if (!cancelled) setReports(assembleReports(states, Date.now()));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const focus = resolveFocus(pathname);
  const started = reports.filter((report) => report.started > 0);

  async function copyContext(): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildAskMarkdown(focus, reports, question));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — no-op.
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-canvas-white sm:w-[420px]">
      <div className="flex h-14 shrink-0 items-center justify-between border-black/[0.06] border-b px-4">
        <span className="font-semibold text-[15px] text-midnight-ink">Ask</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Ask"
          className="grid size-7 place-items-center rounded-[6px] text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-4">
        <p className="text-muted-ash text-xs leading-[1.5]">
          Bundles your progress, what you're on, and your question into a markdown prompt for your
          own LLM. Nothing is sent from here.
        </p>

        <section>
          <h3 className="mb-1 text-[11px] text-muted-ash uppercase tracking-[0.3px]">
            Where you are
          </h3>
          <p className="font-medium text-midnight-ink text-sm">{focus.location}</p>
          {focus.detail ? (
            <p className="mt-1 line-clamp-3 text-muted-ash text-xs">{focus.detail}</p>
          ) : null}
        </section>

        <section>
          <h3 className="mb-1 text-[11px] text-muted-ash uppercase tracking-[0.3px]">
            Your progress
          </h3>
          {started.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {started.map((report) => (
                <li key={report.goalId} className="text-sm">
                  <span className="font-medium text-midnight-ink">{report.goalTitle}</span>{" "}
                  <span className="text-muted-ash text-xs">
                    {report.masteryPct}% · {report.due} due
                    {report.weak.length > 0 ? ` · ${report.weak.length} weak` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-ash text-xs">Just getting started — no reviews yet.</p>
          )}
        </section>

        <section className="flex flex-col gap-1.5">
          <label
            htmlFor="ask-question"
            className="text-[11px] text-muted-ash uppercase tracking-[0.3px]"
          >
            Your question
          </label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={7}
            placeholder="Paste or dictate what you're stuck on…"
            className="w-full resize-none rounded-[8px] border border-black/15 px-3 py-2 text-sm outline-none focus-visible:border-intelligence-blue"
          />
        </section>
      </div>

      <div className="shrink-0 border-black/[0.06] border-t p-4">
        <button
          type="button"
          onClick={() => void copyContext()}
          className="w-full rounded-[8px] bg-midnight-ink px-4 py-2.5 font-medium text-canvas-white text-sm transition-colors hover:bg-surface-charcoal"
        >
          {copied ? "Copied to clipboard ✓" : "Copy context as markdown"}
        </button>
      </div>
    </div>
  );
}
