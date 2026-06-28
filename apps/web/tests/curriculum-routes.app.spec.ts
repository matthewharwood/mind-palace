import { expect, test } from "@playwright/test";

// App-level: real TanStack routes, deep linking, PixiJS node selection, and
// IDB-first SRS persistence. Base test (not the fresh-IDB fixture) so a reload
// keeps IndexedDB — that's how the persistence assertion works. Each Playwright
// test already gets an isolated browser context, so IDB starts empty anyway.
// Reduced-motion is force-enabled in playwright.config.

// Read the persisted SRS phase for curriculum c-rust-foundations / node
// `variables-and-mutability` straight from IndexedDB — proves the write reached
// storage (Pillar 3).
function readNodePhase(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      const get = db
        .transaction("curriculumProgress", "readonly")
        .objectStore("curriculumProgress")
        .get("c-rust-foundations");
      get.onsuccess = () => {
        const record = get.result as { states?: Record<string, { phase?: string }> } | undefined;
        resolve(record?.states?.["variables-and-mutability"]?.phase ?? null);
        db.close();
      };
      get.onerror = () => {
        resolve(null);
        db.close();
      };
    };
    req.onerror = () => resolve(null);
  });
}

test.describe("curriculum routes — deep linking, navigation, SRS persistence", () => {
  test("deep links resolve when loaded directly", async ({ page }) => {
    await page.goto("/goal/g-rust");
    await expect(page.getByRole("heading", { name: "Learn Rust" })).toBeVisible();

    await page.goto("/curriculum/c-rust-foundations");
    await expect(page.getByRole("heading", { name: "Foundations" })).toBeVisible();

    await page.goto("/curriculum/c-rust-foundations/node/variables-and-mutability");
    await expect(page.getByTestId("flashcard-view")).toContainText("Variables & Mutability");
  });

  test("reviewing a node persists SRS state across reload (IDB)", async ({ page }) => {
    await page.goto("/curriculum/c-rust-foundations/node/variables-and-mutability");
    await expect(page.getByTestId("flashcard-view")).toContainText("new");

    await page.getByTestId("rate-good").click();
    // Debounced write (~150ms) reaches IndexedDB.
    await expect.poll(() => page.evaluate(readNodePhase)).toBe("learning");

    await page.reload();
    // Hydration re-reads the persisted state; the node is no longer "new".
    await expect(page.getByTestId("flashcard-view")).toContainText("learning");
  });
});
