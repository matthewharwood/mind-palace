import type { Goal } from "@mind-palace/curriculum";
import { ThemeToggle } from "@mind-palace/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { ReadAloudButton } from "~/components/read-aloud";
import {
  getCurriculum,
  getFlashcard,
  getGoal,
  getGoalForCurriculum,
  listGoals,
} from "~/data/curriculum-data";
import { AskDrawer } from "~/lib/ask-drawer";
import { useTheme } from "~/lib/use-theme";

// Windowed-canvas app shell, adapted from the engmanager-invoice design: a
// Whisper-Gray substrate framing a rounded Canvas-White card that holds the
// left-rail nav, a breadcrumb top bar (with a sidebar collapse toggle), and the
// route's center main stage. Router-coupled infrastructure — lives in lib/ next
// to root-shell.tsx (so the route file stays a single Route export and
// react-doctor's only-export-components rule stays green).

// Text the read-aloud button speaks: the current <main>, minus any region marked
// `data-read-aloud-skip` (the card's phase eyebrow and the rating footer) — so it
// reads the lesson, not the chrome. Clones so the live DOM is untouched.
function readableMainText(): string {
  const main = document.querySelector("main");
  if (!main) return "";
  const clone = main.cloneNode(true);
  if (!(clone instanceof Element)) return main.textContent ?? "";
  for (const skip of clone.querySelectorAll("[data-read-aloud-skip]")) skip.remove();
  return clone.textContent ?? "";
}

function HomeIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    </svg>
  );
}

function GoalIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
      />
    </svg>
  );
}

function AskIcon(): ReactNode {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  );
}

function ProgressIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}

// Sidebar toggle glyph: a panel with the side strip filled when the rail is
// expanded, hollow when collapsed.
function PanelIcon({ filled }: { filled: boolean }): ReactNode {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect
        x="5.5"
        y="7.5"
        width="3.5"
        height="9"
        rx="0.75"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function navItemClass(active: boolean, collapsed: boolean): string {
  return [
    "flex items-center rounded-[8px] py-2 text-[14px] tracking-[0.25px] transition-colors",
    collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
    active
      ? "bg-whisper-gray font-medium text-midnight-ink"
      : "text-muted-ash hover:bg-whisper-gray hover:text-midnight-ink",
  ].join(" ");
}

type Crumb =
  | { kind: "home"; label: string; current: boolean }
  | { kind: "progress"; label: string; current: boolean }
  | { kind: "goal"; goalId: string; label: string; current: boolean }
  | { kind: "curriculum"; curriculumId: string; label: string; current: boolean }
  | { kind: "node"; label: string };

function CrumbLink(crumb: Crumb): ReactNode {
  const linkClass = "rounded-[4px] transition-colors hover:text-midnight-ink";
  if (crumb.kind === "node" || crumb.current) {
    return <span className="font-medium text-midnight-ink">{crumb.label}</span>;
  }
  if (crumb.kind === "home") {
    return (
      <Link to="/" className={linkClass}>
        {crumb.label}
      </Link>
    );
  }
  if (crumb.kind === "progress") {
    return (
      <Link to="/progress" className={linkClass}>
        {crumb.label}
      </Link>
    );
  }
  if (crumb.kind === "goal") {
    return (
      <Link to="/goal/$goalId" params={{ goalId: crumb.goalId }} className={linkClass}>
        {crumb.label}
      </Link>
    );
  }
  return (
    <Link
      to="/curriculum/$curriculumId"
      params={{ curriculumId: crumb.curriculumId }}
      className={linkClass}
    >
      {crumb.label}
    </Link>
  );
}

function buildCrumbs(segments: string[]): Crumb[] {
  const crumbs: Crumb[] = [{ kind: "home", label: "Goals", current: segments.length === 0 }];
  if (segments[0] === "progress") {
    crumbs.push({ kind: "progress", label: "Progress", current: true });
  } else if (segments[0] === "goal" && segments[1]) {
    crumbs.push({
      kind: "goal",
      goalId: segments[1],
      label: getGoal(segments[1])?.title ?? segments[1],
      current: true,
    });
  } else if (segments[0] === "curriculum" && segments[1]) {
    const curriculumId = segments[1];
    const goal = getGoalForCurriculum(curriculumId);
    if (goal) crumbs.push({ kind: "goal", goalId: goal.id, label: goal.title, current: false });
    const title = getCurriculum(curriculumId)?.title ?? curriculumId;
    if (segments[2] === "node" && segments[3]) {
      crumbs.push({ kind: "curriculum", curriculumId, label: title, current: false });
      crumbs.push({
        kind: "node",
        label: getFlashcard(curriculumId, segments[3])?.title ?? segments[3],
      });
    } else {
      crumbs.push({ kind: "curriculum", curriculumId, label: title, current: true });
    }
  }
  return crumbs;
}

function MenuIcon(): ReactNode {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

// The rail's logo + nav, shared by the desktop sidebar and the mobile slide-over.
// `onNavigate` lets the mobile overlay close itself when a link is tapped.
function RailNav({
  collapsed,
  goals,
  activeGoalId,
  onHome,
  onProgress,
  onNavigate,
}: {
  collapsed: boolean;
  goals: readonly Goal[];
  activeGoalId: string | undefined;
  onHome: boolean;
  onProgress: boolean;
  onNavigate?: () => void;
}): ReactNode {
  return (
    <>
      <div
        className={["flex h-16 shrink-0 items-center px-3", collapsed ? "justify-center" : ""].join(
          " ",
        )}
      >
        <Link
          to="/"
          aria-label="Mind Palace — Goals"
          onClick={onNavigate}
          className={[
            "inline-flex items-center rounded-[6px] transition-colors hover:bg-whisper-gray",
            collapsed ? "justify-center p-1" : "gap-2 px-1 py-1",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="size-7 shrink-0 rounded-full bg-[conic-gradient(from_140deg_at_50%_50%,#ffd7f0,#e2ddfd,#328efa,#47d096,#ffef99,#ffd7f0)] shadow-[inset_0_0_0_1px_rgba(17,17,17,0.08)]"
          />
          {!collapsed && (
            <span className="truncate text-[13px] uppercase tracking-[0.5px]">Mind Palace</span>
          )}
        </Link>
      </div>
      <nav
        aria-label="Primary"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-2 pb-4"
      >
        <Link
          to="/"
          onClick={onNavigate}
          aria-current={onHome ? "page" : undefined}
          title={collapsed ? "Goals" : undefined}
          className={navItemClass(onHome, collapsed)}
        >
          <span className={onHome ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
            <HomeIcon />
          </span>
          {!collapsed && <span className="truncate">Goals</span>}
        </Link>
        {goals.map((goal) => {
          const active = goal.id === activeGoalId;
          return (
            <Link
              key={goal.id}
              to="/goal/$goalId"
              params={{ goalId: goal.id }}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? goal.title : undefined}
              className={navItemClass(active, collapsed)}
            >
              <span className={active ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
                <GoalIcon />
              </span>
              {!collapsed && <span className="truncate">{goal.title}</span>}
            </Link>
          );
        })}
        <span className="my-1 h-px shrink-0 bg-black/[0.06]" aria-hidden="true" />
        <Link
          to="/progress"
          onClick={onNavigate}
          aria-current={onProgress ? "page" : undefined}
          title={collapsed ? "Progress" : undefined}
          className={navItemClass(onProgress, collapsed)}
        >
          <span className={onProgress ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
            <ProgressIcon />
          </span>
          {!collapsed && <span className="truncate">Progress</span>}
        </Link>
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }): ReactNode {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const goals = listGoals();

  let activeGoalId: string | undefined;
  if (segments[0] === "goal") activeGoalId = segments[1];
  else if (segments[0] === "curriculum" && segments[1]) {
    activeGoalId = getGoalForCurriculum(segments[1])?.id;
  }
  const onHome = segments.length === 0;
  const onProgress = segments[0] === "progress";
  const [askOpen, setAskOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const crumbs = buildCrumbs(segments);
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="flex h-dvh overflow-hidden bg-whisper-gray font-sans text-midnight-ink sm:gap-3 sm:p-3">
      <div className="flex min-w-0 flex-1 overflow-hidden bg-canvas-white sm:rounded-2xl sm:shadow-card">
        <aside
          className={[
            "hidden shrink-0 flex-col bg-canvas-white shadow-[inset_-1px_0_0_0_rgba(17,17,17,0.06)] transition-[width] duration-200 sm:flex",
            collapsed ? "w-14" : "w-44 md:w-48 lg:w-56",
          ].join(" ")}
        >
          <RailNav
            collapsed={collapsed}
            goals={goals}
            activeGoalId={activeGoalId}
            onHome={onHome}
            onProgress={onProgress}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-black/[0.06] border-b px-4 text-[13px] text-muted-ash sm:px-6">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="grid size-8 shrink-0 place-items-center rounded-[6px] text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink sm:hidden"
            >
              <MenuIcon />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="hidden size-8 shrink-0 items-center justify-center rounded-[6px] text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink sm:inline-flex"
            >
              <PanelIcon filled={!collapsed} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {crumbs.map((crumb, index) => (
                <span
                  key={crumb.kind === "node" ? `node-${crumb.label}` : crumb.kind}
                  className="flex shrink-0 items-center gap-1.5"
                >
                  {index > 0 ? <span className="text-light-taupe">/</span> : null}
                  <CrumbLink {...crumb} />
                </span>
              ))}
            </div>
            <ReadAloudButton key={pathname} getText={readableMainText} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setAskOpen((value) => !value)}
              aria-expanded={askOpen}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-black/10 px-3 py-1.5 font-medium text-[13px] text-midnight-ink transition-colors hover:bg-whisper-gray"
            >
              <span className="text-intelligence-blue">
                <AskIcon />
              </span>
              Ask
            </button>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
        </div>
      </div>

      {/* Ask: an in-flow side card that shrinks the canvas on sm+, a full-screen
          overlay on phones. Rendered once so its state never forks. */}
      <aside
        className={[
          "z-50 flex-col overflow-hidden bg-canvas-white",
          askOpen ? "fixed inset-0 flex" : "hidden",
          "sm:static sm:inset-auto sm:flex sm:rounded-2xl sm:transition-[width] sm:duration-200",
          askOpen ? "sm:w-[420px] sm:shadow-card" : "sm:w-0",
        ].join(" ")}
      >
        <AskDrawer open={askOpen} onClose={() => setAskOpen(false)} />
      </aside>

      {/* Mobile rail slide-over (the desktop sidebar is hidden < sm). */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="absolute top-0 bottom-0 left-0 flex w-64 flex-col bg-canvas-white shadow-card">
            <RailNav
              collapsed={false}
              goals={goals}
              activeGoalId={activeGoalId}
              onHome={onHome}
              onProgress={onProgress}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
