import { createFileRoute, Link } from "@tanstack/react-router";

import { listGoals } from "~/data/curriculum-data";
import { buildSeoLinks } from "~/lib/seo";

export const Route = createFileRoute("/goals")({
  head: () => ({ links: buildSeoLinks({ path: "/goals" }) }),
  component: Goals,
});

function Goals() {
  const goals = listGoals();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl text-midnight-ink">Your goals</h1>
        <p className="text-muted-ash text-sm">Choose a goal to begin your learning path.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {goals.map((goal) => (
          <li key={goal.id}>
            <Link
              to="/goal/$goalId"
              params={{ goalId: goal.id }}
              className="block rounded-card border border-black/10 p-4 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              <span className="font-semibold text-lg text-midnight-ink">{goal.title}</span>
              <span className="mt-1 block text-muted-ash text-sm">{goal.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
