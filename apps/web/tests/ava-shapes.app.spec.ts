import type { Page } from "@playwright/test";

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
const SQUARE_COLORLESS_CUE = [
  { frequency: 196, waveform: "square" },
  { frequency: 523.25, waveform: "sine" },
] as const;

test.use({ viewport: { width: 412, height: 700 } });

async function expectDocumentFitsViewport(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scrollRoot = document.scrollingElement;
        return Boolean(
          scrollRoot &&
            scrollRoot.scrollHeight <= window.innerHeight &&
            scrollRoot.scrollWidth <= window.innerWidth,
        );
      }),
    )
    .toBe(true);
}

async function expectInitialAudioCue(
  page: Page,
  expectedCue: readonly { frequency: number; waveform: string }[],
): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as {
            __avaAudioEvents: { frequency: number; waveform: string }[];
          }
        ).__avaAudioEvents.slice(0, 2),
      ),
    )
    .toEqual(expectedCue);
}

test("teacher grades every colorless shape before colors unlock and progress survives reload", async ({
  page,
}) => {
  await installAvaAudioMock(page);
  await page.goto("/apps/ava-shapes");
  await expectDocumentFitsViewport(page);
  await expect(page.getByRole("heading", { name: "Shape foundations" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);
  await expectInitialAudioCue(page, SQUARE_COLORLESS_CUE);

  for (const [index, label] of FOUNDATION_LABELS.entries()) {
    await expect(page.getByRole("img", { name: new RegExp(`${label} shape`) })).toBeVisible();
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(page.getByText("How did Ava do?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);
    await expectDocumentFitsViewport(page);
    await page.getByRole("button", { name: /Easy/ }).click();

    const nextLabel = FOUNDATION_LABELS[index + 1];
    if (nextLabel) {
      await expect(page.getByRole("heading", { name: nextLabel })).toBeVisible();
    }
  }

  await expect(page.getByRole("heading", { name: "Shape + color" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Red square shape drawn with WebGL/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Red square" })).toBeVisible();
  await expectDocumentFitsViewport(page);
  await expect.poll(() => page.evaluate(readAvaSession)).toEqual({ reviewed: 5 });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Shape + color" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Red square shape drawn with WebGL/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Red square" })).toBeVisible();
  await expectDocumentFitsViewport(page);
});
