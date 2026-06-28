import { closeDB, DB_NAME } from "~/state/db";
import { cancelPendingWrites } from "~/state/persist";

// Production-grade local-state reset (the gear-menu "Clear state" action). The
// order is load-bearing:
//   1. cancel pending debounced writes — else a queued persist fires after
//      closeDB(), reopens IDB via getDB(), and that fresh handle blocks the
//      delete (the button looks broken).
//   2. closeDB() — drop our own connection so deleteDatabase isn't blocked.
//   3. delete every IndexedDB database by NAME — version-agnostic, so it
//      recovers even from a stale/higher DB version the browser is stuck on.
//   4. clear Cache Storage + unregister service workers — harmless today (no SW
//      yet) and correct once the PWA layer lands, so a reload pulls the latest
//      deployed build.
// The caller reloads immediately afterwards.
export async function clearAllStorage(): Promise<void> {
  cancelPendingWrites();
  await closeDB();

  if (typeof indexedDB !== "undefined") {
    const names = new Set<string>([DB_NAME]);
    // `indexedDB.databases()` isn't on older Safari — fall back to the known name.
    if (typeof indexedDB.databases === "function") {
      for (const info of await indexedDB.databases()) {
        if (info.name) names.add(info.name);
      }
    }
    await Promise.all([...names].map(deleteDatabase));
  }

  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    // Resolve on every outcome — a blocked delete still completes once the page
    // reloads, and a failure must not wedge the reset.
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
