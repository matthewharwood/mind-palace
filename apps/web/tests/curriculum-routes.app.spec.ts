import { expect, test } from "@playwright/test";

// App-level: real TanStack routes, deep linking, PixiJS node selection, and
// IDB-first SRS persistence. Base test (not the fresh-IDB fixture) so a reload
// keeps IndexedDB — that's how the persistence assertion works. Each Playwright
// test already gets an isolated browser context, so IDB starts empty anyway.
// Reduced-motion is force-enabled in playwright.config.

// Read the persisted SRS phase for curriculum c-metals / node `au` straight
// from IndexedDB — proves the write reached storage (Pillar 3).
function readAuPhase(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      const get = db
        .transaction("curriculumProgress", "readonly")
        .objectStore("curriculumProgress")
        .get("c-metals");
      get.onsuccess = () => {
        const record = get.result as { states?: Record<string, { phase?: string }> } | undefined;
        resolve(record?.states?.au?.phase ?? null);
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
    await page.goto("/goal/g-periodic");
    await expect(page.getByRole("heading", { name: "Master the Periodic Table" })).toBeVisible();

    await page.goto("/curriculum/c-metals");
    await expect(page.getByRole("heading", { name: "Metals" })).toBeVisible();

    await page.goto("/curriculum/c-metals/node/au");
    await expect(page.getByTestId("flashcard-view")).toContainText("Gold");
  });

  test("navigate home → goal → curriculum → node via links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Master the Periodic Table/ }).click();
    await expect(page).toHaveURL(/\/goal\/g-periodic$/);

    // The per-route link lists are sr-only (the canvas is the visual). Drive them
    // the way a keyboard / screen-reader user does — focus + Enter — which is
    // unaffected by the canvas overlapping their (clipped) hit box.
    await page
      .getByRole("link", { name: /Metals/ })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/curriculum\/c-metals$/);

    await page.getByRole("link", { name: /Gold/ }).first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/curriculum\/c-metals\/node\/au$/);
    await expect(page.getByTestId("flashcard-view")).toContainText("Gold");
  });

  test("selecting a PixiJS tree node navigates to its curriculum", async ({ page }) => {
    await page.goto("/goal/g-periodic");
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(900); // allow the async Pixi app to init + bind events
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas bounding box");
    // The layered tree centers horizontally; the "c-metals" root sits ~80px left
    // of center on the top row (TOP_PAD 48 + NODE_H/2 28 ≈ 76px down).
    await page.mouse.click(box.x + box.width / 2 - 80, box.y + 76);
    await expect(page).toHaveURL(/\/curriculum\/c-metals$/);
  });

  test("reviewing a node persists SRS state across reload (IDB)", async ({ page }) => {
    await page.goto("/curriculum/c-metals/node/au");
    await expect(page.getByTestId("flashcard-view")).toContainText("new");

    await page.getByTestId("rate-good").click();
    // Debounced write (~150ms) reaches IndexedDB.
    await expect.poll(() => page.evaluate(readAuPhase)).toBe("learning");

    await page.reload();
    // Hydration re-reads the persisted state; the node is no longer "new".
    await expect(page.getByTestId("flashcard-view")).toContainText("learning");
  });
});
