import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => undefined;
}

function clientSnapshot(): boolean {
  return typeof window !== "undefined";
}

function serverSnapshot(): boolean {
  return false;
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
