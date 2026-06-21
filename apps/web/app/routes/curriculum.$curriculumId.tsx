import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for /curriculum/$curriculumId — renders the index (the network graph)
// or a node (the flashcard) through the Outlet. SEO links live on the leaf
// routes (the index and the node), not here.
export const Route = createFileRoute("/curriculum/$curriculumId")({
  component: CurriculumLayout,
});

function CurriculumLayout() {
  return <Outlet />;
}
