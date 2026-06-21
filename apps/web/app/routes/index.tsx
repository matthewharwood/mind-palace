import { createFileRoute, Link } from "@tanstack/react-router";

import { listGoals } from "~/data/curriculum-data";
import { env } from "~/env";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({ links: buildSeoLinks({ path: "/" }) }),
  component: Home,
});

function Home() {
  const goals = listGoals();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8 font-display">
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
              <span className="text-lg font-semibold">{goal.title}</span>
              <span className="block text-sm opacity-70">{goal.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
