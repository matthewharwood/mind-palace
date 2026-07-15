import { installAvaAudioMock } from "./ava-audio-mock";
import { expect, test } from "./fixtures";

type AvaStoredSession = { reviewed: number } | null;

function readAvaSession(): Promise<AvaStoredSession> {
  return new Promise((resolve) => {
    const request = indexedDB.open("@mind-palace/web");
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("avaShapeSessions")) {
        db.close();
        resolve(null);
        return;
      }
      const get = db
        .transaction("avaShapeSessions", "readonly")
        .objectStore("avaShapeSessions")
        .get("ava-shapes");
      get.onsuccess = () => {
        const record = get.result as { states?: Record<string, { reps?: number }> } | undefined;
        const reviewed = Object.values(record?.states ?? {}).filter(
          (state) => state.reps === 1,
        ).length;
        resolve({ reviewed });
        db.close();
      };
      get.onerror = () => {
        db.close();
        resolve(null);
      };
    };
    request.onerror = () => resolve(null);
  });
}

const FOUNDATION_LABELS = ["Square", "Oval", "Rhombus", "Circle", "Triangle"] as const;

test.use({ viewport: { width: 390, height: 844 } });

test("teacher grades every colorless shape before colors unlock and progress survives reload", async ({
  page,
}) => {
  await installAvaAudioMock(page);
  await page.goto("/apps/ava-shapes");
  await expect(page.getByRole("heading", { name: "Shape foundations" })).toBeVisible();

  for (const [index, label] of FOUNDATION_LABELS.entries()) {
    await expect(page.getByRole("img", { name: new RegExp(`${label} shape`) })).toBeVisible();
    await page.getByRole("button", { name: "Reveal answer" }).click();
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Easy/ }).click();

    if (index < FOUNDATION_LABELS.length - 1) {
      await expect(page.getByRole("heading", { name: "Shape foundations" })).toBeVisible();
    }
  }

  await expect(page.getByRole("heading", { name: "Shape + color" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Red square shape drawn with WebGL/ })).toBeVisible();
  await expect.poll(() => page.evaluate(readAvaSession)).toEqual({ reviewed: 5 });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Shape + color" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Red square shape drawn with WebGL/ })).toBeVisible();
});
