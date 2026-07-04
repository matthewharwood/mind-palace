import { expect, test } from "./fixtures";

function readVectorDungeonSession(): Promise<{ hp: number; x: number; y: number } | null> {
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
          | { hp?: number; position?: { x?: number; y?: number } }
          | undefined;
        if (
          typeof record?.hp === "number" &&
          typeof record.position?.x === "number" &&
          typeof record.position.y === "number"
        ) {
          resolve({ hp: record.hp, x: record.position.x, y: record.position.y });
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

  test("validates one-step movement and persists roll resolution", async ({ page }) => {
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

    await page.getByRole("button", { name: /Help someone nearby/ }).click();
    await expect(page.getByText(/Dean needs 10 or higher/)).toBeVisible();
    await page.getByLabel("d20 roll").fill("1");
    await page.getByRole("button", { name: "Resolve roll" }).click();
    await expect(page.getByText(/^Setback: Plus One Pantry/)).toBeVisible();
    await expect(page.getByLabel("HP 4 of 5")).toBeVisible();

    await expect
      .poll(() => page.evaluate(readVectorDungeonSession))
      .toEqual({
        hp: 4,
        x: 1,
        y: 0,
      });

    await page.reload();
    await expect(page.getByRole("heading", { name: /Plus One Pantry/ })).toBeVisible();
    await expect(page.getByLabel("HP 4 of 5")).toBeVisible();
  });
});
