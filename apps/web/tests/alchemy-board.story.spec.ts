import { expect, test } from "./fixtures";

// Bespoke-integration proof: the generic @mind-palace/cards package wired into
// the app with element-card art, sound/haptic feedback, and IDB-first placement
// persistence (Pillar 3). Fresh IDB per test (fixtures), so the board starts
// empty (all cards in the tray). Reduced-motion is forced → drops land instantly.
const STORY = "/iframe.html?id=app-alchemy-board--default&viewMode=story";

function readReagent0(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      const get = db
        .transaction("alchemyBoard", "readonly")
        .objectStore("alchemyBoard")
        .get("board");
      get.onsuccess = () => {
        const record = get.result as { slots?: Record<string, string> } | undefined;
        resolve(record?.slots?.["reagent-0"] ?? null);
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

test.describe("Alchemy board — bespoke @mind-palace/cards integration", () => {
  test("drag from tray into a reagent slot, persisted IDB-first", async ({ page }) => {
    await page.goto(STORY);

    // Starts empty: gold is in the tray, reagent-0 is empty.
    await expect(page.locator('[data-test="tray"] [data-test="card-au"]')).toBeVisible();
    await expect(page.locator('[data-test="reagent-0"] [data-test="card-au"]')).toHaveCount(0);

    const card = page.getByTestId("card-au");
    const slot = page.getByTestId("reagent-0");
    const from = await card.boundingBox();
    const to = await slot.boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    if (!from || !to) return;

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, {
      steps: 5,
    });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();

    // Placement reflected in the DOM…
    await expect(page.locator('[data-test="reagent-0"] [data-test="card-au"]')).toBeVisible();
    // …and written through to IndexedDB (debounced ~150ms).
    await expect.poll(() => page.evaluate(readReagent0)).toBe("au");
  });
});
