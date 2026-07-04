import type { Goal } from "@mind-palace/curriculum";
import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

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

function AppsIcon(): ReactNode {
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
        d="M4.5 4.5h6v6h-6v-6ZM13.5 4.5h6v6h-6v-6ZM4.5 13.5h6v6h-6v-6ZM13.5 13.5h6v6h-6v-6Z"
      />
    </svg>
  );
}

function SettingsIcon(): ReactNode {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.214 1.281c.06.43.39.78.81.93.32.114.62.26.91.43.36.21.79.27 1.18.12l1.21-.485c.51-.205 1.1-.005 1.36.46l1.3 2.25c.26.465.13 1.05-.31 1.36l-1.03.73c-.34.24-.51.66-.46 1.08.02.18.03.36.03.55s-.01.37-.03.55c-.05.42.12.84.46 1.08l1.03.73c.44.31.57.895.31 1.36l-1.3 2.25c-.26.465-.85.665-1.36.46l-1.21-.485c-.39-.15-.82-.09-1.18.12-.29.17-.59.316-.91.43-.42.15-.75.5-.81.93l-.214 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.214-1.281c-.06-.43-.39-.78-.81-.93a6.47 6.47 0 0 1-.91-.43c-.36-.21-.79-.27-1.18-.12l-1.21.485c-.51.205-1.1.005-1.36-.46l-1.3-2.25c-.26-.465-.13-1.05.31-1.36l1.03-.73c.34-.24.51-.66.46-1.08a8.06 8.06 0 0 1-.03-.55c0-.19.01-.37.03-.55.05-.42-.12-.84-.46-1.08l-1.03-.73c-.44-.31-.57-.895-.31-1.36l1.3-2.25c.26-.465.85-.665 1.36-.46l1.21.485c.39.15.82.09 1.18-.12.29-.17.59-.316.91-.43.42-.15.75-.5.81-.93l.214-1.281Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
  | { kind: "apps"; label: string; current: boolean }
  | { kind: "app"; label: string; current: boolean }
  | { kind: "progress"; label: string; current: boolean }
  | { kind: "settings"; label: string; current: boolean }
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
      <Link to="/goals" className={linkClass}>
        {crumb.label}
      </Link>
    );
  }
  if (crumb.kind === "apps") {
    return (
      <Link to="/apps" className={linkClass}>
        {crumb.label}
      </Link>
    );
  }
  if (crumb.kind === "app") {
    return (
      <Link to="/apps/vector-dungeon" className={linkClass}>
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
  if (crumb.kind === "settings") {
    return (
      <Link to="/settings" className={linkClass}>
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
  const crumbs: Crumb[] = [{ kind: "home", label: "Goals", current: segments[0] === "goals" }];
  if (segments[0] === "apps") {
    crumbs.push({ kind: "apps", label: "Apps", current: segments.length === 1 });
    if (segments[1] === "vector-dungeon") {
      crumbs.push({ kind: "app", label: "Vector Dungeon", current: true });
    }
  } else if (segments[0] === "progress") {
    crumbs.push({ kind: "progress", label: "Progress", current: true });
  } else if (segments[0] === "settings") {
    crumbs.push({ kind: "settings", label: "Settings", current: true });
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
  onGoals,
  onApps,
  onProgress,
  onSettings,
  onNavigate,
}: {
  collapsed: boolean;
  goals: readonly Goal[];
  activeGoalId: string | undefined;
  onGoals: boolean;
  onApps: boolean;
  onProgress: boolean;
  onSettings: boolean;
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
          aria-label="Mind Palace — home"
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
          to="/goals"
          onClick={onNavigate}
          aria-current={onGoals ? "page" : undefined}
          title={collapsed ? "Goals" : undefined}
          className={navItemClass(onGoals, collapsed)}
        >
          <span className={onGoals ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
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
          to="/apps"
          onClick={onNavigate}
          aria-current={onApps ? "page" : undefined}
          title={collapsed ? "Apps" : undefined}
          className={navItemClass(onApps, collapsed)}
        >
          <span className={onApps ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
            <AppsIcon />
          </span>
          {!collapsed && <span className="truncate">Apps</span>}
        </Link>
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
        <Link
          to="/settings"
          onClick={onNavigate}
          aria-current={onSettings ? "page" : undefined}
          title={collapsed ? "Settings" : undefined}
          className={navItemClass(onSettings, collapsed)}
        >
          <span className={onSettings ? "shrink-0 text-intelligence-blue" : "shrink-0"}>
            <SettingsIcon />
          </span>
          {!collapsed && <span className="truncate">Settings</span>}
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
  const onGoals = segments[0] === "goals";
  const onApps = segments[0] === "apps";
  const onProgress = segments[0] === "progress";
  const onSettings = segments[0] === "settings";
  const [askOpen, setAskOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const crumbs = buildCrumbs(segments);
  // Apply the persisted theme (.dark on <html>) app-wide; the toggle UI itself
  // now lives on the Settings page, not in the chrome.
  useTheme();

  // The splash (/) is its own full-screen surface. Render it WITHOUT the shell
  // chrome so the rail/content never paints behind the overlay for a frame on
  // first load. (Hooks above still run, so the theme + state stay consistent.)
  if (pathname === "/") return <>{children}</>;

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
            onGoals={onGoals}
            onApps={onApps}
            onProgress={onProgress}
            onSettings={onSettings}
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
              onGoals={onGoals}
              onApps={onApps}
              onProgress={onProgress}
              onSettings={onSettings}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
