import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/apps")({
  component: Apps,
});

function Apps() {
  return <Outlet />;
}
