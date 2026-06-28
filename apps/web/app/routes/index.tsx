import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { listGoals } from "~/data/curriculum-data";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  // Open on the splash: the first time this browser session lands on the home,
  // send them to the /welcome intro. An effect (not beforeLoad — which doesn't
  // re-run on the initial prerendered load) + session gate, so the rail's
  // "Goals" link doesn't bounce back to the splash on every visit and prerender
  // still emits an indexable goal list at `/`.
  useEffect(() => {
    if (!sessionStorage.getItem("mp-entered")) {
      void navigate({ to: "/welcome", replace: true });
    }
  }, [navigate]);

  const goals = listGoals();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl">{env.VITE_GAME_TITLE}</h1>
        <p className="text-sm opacity-70">Choose a goal to begin your learning path.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {goals.map((goal) => (
          <li key={goal.id}>
            <Link
              to="/goal/$goalId"
              params={{ goalId: goal.id }}
              className="block rounded-card border border-black/10 p-4 transition-colors hover:bg-black/5"
            >
              <span className="font-semibold text-lg">{goal.title}</span>
              <span className="block text-sm opacity-70">{goal.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
