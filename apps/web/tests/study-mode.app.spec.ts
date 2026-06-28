import { expect, type Page, test } from "@playwright/test";

// App-level: the Study deck's signature guarantee is ZERO scroll during active
// study, on a Pixel-class phone. Base test (not fresh-IDB) so the SRS write is
// observable; each context starts with an empty DB anyway. Reduced-motion is
// forced in config, so the swipe gesture is inert here — we drive the rating
// buttons (the always-present fallback) and assert the no-scroll contract.
//
// c-rust-foundations has 16 recall cards (8 MCQ + 8 code); reads are excluded.

function readPhase(nodeId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      const get = db
        .transaction("curriculumProgress", "readonly")
        .objectStore("curriculumProgress")
        .get("c-rust-foundations");
      get.onsuccess = () => {
        const rec = get.result as { states?: Record<string, { phase?: string }> } | undefined;
        resolve(rec?.states?.[nodeId]?.phase ?? null);
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

async function expectNoScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const b = document.body;
    return {
      h: de.scrollWidth > de.clientWidth || b.scrollWidth > b.clientWidth,
      v: de.scrollHeight > de.clientHeight || b.scrollHeight > b.clientHeight,
    };
  });
  expect(overflow.h, "horizontal scroll").toBe(false);
  expect(overflow.v, "vertical scroll").toBe(false);
}

test.describe("study mode — no-scroll mobile deck", () => {
  test("MCQ and code cards never scroll at Pixel sizes", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto("/curriculum/c-rust-foundations/study");
    await expect(page.getByTestId("study-card")).toBeVisible();

    // MCQ card: no scroll at a full and a tight (browser-chrome) phone height.
    for (const height of [915, 740]) {
      await page.setViewportSize({ width: 412, height });
      await expectNoScroll(page);
    }

    // Rate through the 8 MCQs to reach the first code-editor card.
    for (let i = 0; i < 8; i += 1) {
      await page.getByTestId("rate-good").click();
    }
    await expect(page.getByTestId("study-card")).toContainText("Write:");

    // Code card (editor + check + options) also stays within the screen.
    for (const height of [915, 740]) {
      await page.setViewportSize({ width: 412, height });
      await expectNoScroll(page);
    }
  });

  test("rating advances the deck, persists SRS, and completes the session", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto("/curriculum/c-rust-foundations/study");

    const firstTitle = await page.getByTestId("study-card").locator("h2").textContent();
    await page.getByTestId("rate-good").click();

    // Advanced to a different card…
    await expect(page.getByTestId("study-card").locator("h2")).not.toHaveText(firstTitle ?? "");
    // …and the review reached IndexedDB (Pillar 3).
    await expect.poll(() => page.evaluate(readPhase, "mut-required")).not.toBeNull();

    // Rate through the remaining 15 cards to the completion screen.
    for (let i = 0; i < 15; i += 1) {
      await page.getByTestId("rate-good").click();
    }
    await expect(page.getByTestId("study-done")).toBeVisible();
    await expect(page.getByText("Session complete")).toBeVisible();
  });
});
