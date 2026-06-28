import { useSyncExternalStore } from "react";

// Subscribe to a CSS media query. useSyncExternalStore gives a stable SSR/
// prerender snapshot (the server snapshot is always `false`, so prerendered
// HTML reflects the small-screen default and hydration matches), then the
// client reads the real `matchMedia` result. Pure subscriber — safe in render.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window === "undefined" ? false : window.matchMedia(query).matches),
    () => false,
  );
}

// Tailwind's `md` breakpoint. Desktop-and-up gets the diagram by default; below
// it the list is the better default on a phone.
export const DESKTOP_QUERY = "(min-width: 768px)";
