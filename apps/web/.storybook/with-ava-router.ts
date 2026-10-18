import type { Decorator } from "@storybook/react-vite";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { createElement, useState } from "react";

// A memory router keeps component stories isolated while retaining the real
// Link behavior. Route workflow assertions belong to the application suite.
export function withAvaRouter<TArgs extends Record<string, unknown>>(): Decorator<TArgs> {
  return function WithRouter(Story) {
    const [router] = useState(() => {
      const root = createRootRoute({ component: Story });
      const child = createRoute({ getParentRoute: () => root, path: "$" });
      return createRouter({
        routeTree: root.addChildren([child]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
        defaultPreload: false,
      });
    });
    return createElement(RouterProvider, { router });
  };
}
