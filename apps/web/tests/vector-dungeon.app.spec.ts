import { expect, test } from "./fixtures";

function readVectorDungeonSession(): Promise<{
  hp: number;
  magicRemaining: number;
  x: number;
  y: number;
} | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("vectorDungeonSessions")) {
        db.close();
        resolve(null);
        return;
      }
      const get = db
        .transaction("vectorDungeonSessions", "readonly")
        .objectStore("vectorDungeonSessions")
        .get("vector-dungeon");
      get.onsuccess = () => {
        const record = get.result as
          | { hp?: number; magicRemaining?: number; position?: { x?: number; y?: number } }
          | undefined;
        if (
          typeof record?.hp === "number" &&
          typeof record.magicRemaining === "number" &&
          typeof record.position?.x === "number" &&
          typeof record.position.y === "number"
        ) {
          resolve({
            hp: record.hp,
            magicRemaining: record.magicRemaining,
            x: record.position.x,
            y: record.position.y,
          });
        } else {
          resolve(null);
        }
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

test.describe("Vector Dungeon app", () => {
  test("root navigation reaches the DM app and exposes the PDF", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Dungeon Master Apps/ }).click();
    await expect(page).toHaveURL(/\/apps$/);
    await page.getByRole("link", { name: /Vector Dungeon/ }).click();
    await expect(page).toHaveURL(/\/apps\/vector-dungeon$/);
    await expect(page.getByRole("heading", { name: "Vector Dungeon" })).toBeVisible();
    await expect(page.getByRole("link", { name: "PDF" })).toHaveAttribute(
      "href",
      /\/vector-dungeon\/dean-vector-dungeon\.pdf$/,
    );
  });

  test("validates one-step movement and rejects a diagonal", async ({ page }) => {
    await page.goto("/apps/vector-dungeon");
    await expect(page.getByRole("heading", { name: /Camp Origin/ })).toBeVisible();

    await page.getByLabel("Target X").fill("1");
    await page.getByLabel("Target Y").fill("1");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/diagonal/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Camp Origin/ })).toBeVisible();

    await page.getByLabel("Target X").fill("1");
    await page.getByLabel("Target Y").fill("0");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: /Plus One Pantry/ })).toBeVisible();
  });

  test("a magic re-roll turns a missed roll into a save and persists", async ({ page }) => {
    await page.goto("/apps/vector-dungeon");
    await page.getByLabel("Target X").fill("1");
    await page.getByLabel("Target Y").fill("0");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: /Plus One Pantry/ })).toBeVisible();

    // Miss: no heart lost yet, the magic decision appears.
    await page.getByRole("button", { name: /Help someone nearby/ }).click();
    await page.getByLabel("d20 roll").fill("1");
    await page.getByRole("button", { name: "Resolve roll" }).click();
    await expect(page.getByRole("heading", { name: "Missed the roll" })).toBeVisible();
    await expect(page.getByLabel("HP 5 of 5")).toBeVisible();

    // Spend a magic re-roll, then land a success — heart kept, one magic gone.
    await page.getByRole("button", { name: /Use magic re-roll \(5 left\)/ }).click();
    await expect(page.getByText(/Dean needs 10 or higher/)).toBeVisible();
    await page.getByLabel("d20 roll").fill("20");
    await page.getByRole("button", { name: "Resolve roll" }).click();
    await expect(page.getByRole("heading", { name: "Room cleared" })).toBeVisible();
    await expect(page.getByLabel("HP 5 of 5")).toBeVisible();
    await expect(page.getByLabel("Magic 4 of 5")).toBeVisible();

    await expect
      .poll(() => page.evaluate(readVectorDungeonSession))
      .toEqual({ hp: 5, magicRemaining: 4, x: 1, y: 0 });

    await page.reload();
    await expect(page.getByLabel("Magic 4 of 5")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room cleared" })).toBeVisible();
  });

  test("cleared spaces force a move; a missed space keeps a red border", async ({ page }) => {
    await page.goto("/apps/vector-dungeon");
    // Claim Plus One Pantry with a clean success.
    await page.getByLabel("Target X").fill("1");
    await page.getByLabel("Target Y").fill("0");
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: /Study the pantry door/ }).click();
    await page.getByLabel("d20 roll").fill("20");
    await page.getByRole("button", { name: "Resolve roll" }).click();
    await expect(page.getByRole("heading", { name: "Room cleared" })).toBeVisible();
    await expect(page.getByTestId("vector-cell-1-0")).toHaveAttribute("data-claimed", "yes");

    // Move on to East Arrow Gallery and take the setback there.
    await page.getByLabel("Target X").fill("1");
    await page.getByLabel("Target Y").fill("0");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: /East Arrow Gallery/ })).toBeVisible();
    await page.getByRole("button", { name: /Help someone nearby/ }).click();
    await page.getByLabel("d20 roll").fill("1");
    await page.getByRole("button", { name: "Resolve roll" }).click();
    await page.getByRole("button", { name: /Take the setback/ }).click();
    await expect(page.getByLabel("HP 4 of 5")).toBeVisible();

    // (2, 0) is visited but its reward is unclaimed: red border marker.
    await expect(page.getByTestId("vector-cell-2-0")).toHaveAttribute("data-claimed", "no");
    await expect(page.getByLabel(/\(2, 0\).*reward not claimed/)).toBeVisible();
  });
});
