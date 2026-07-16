import { expect, type Page, test } from "@playwright/test";

import { installAvaAudioMock } from "./ava-audio-mock";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;
const SQUARE_COLORLESS_CUE = [
  { frequency: 196, waveform: "square" },
  { frequency: 523.25, waveform: "sine" },
] as const;
const RED_SQUARE_CUE = [
  { frequency: 196, waveform: "square" },
  { frequency: 329.63, waveform: "triangle" },
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

test.describe("Ava Shapes stories", () => {
  test("colorless foundation shows the answer and plays the compositional cue", async ({
    page,
  }) => {
    await installAvaAudioMock(page);
    await page.goto(story("app-avashapes--colorless-foundation"));

    await expectDocumentFitsViewport(page);
    await expect(page.getByRole("heading", { name: "Shape foundations" })).toHaveCount(0);
    await expect(page.getByRole("img", { name: /Square shape drawn with WebGL/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Square" })).toBeVisible();
    await expect(page.getByText("How did Ava do?")).toBeVisible();
    await expect(page.getByRole("button", { name: /Good/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);
    await expectInitialAudioCue(page, SQUARE_COLORLESS_CUE);

    await page.getByRole("button", { name: "Play this shape sound" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __avaAudioEvents: { frequency: number; waveform: string }[];
              }
            ).__avaAudioEvents,
        ),
      )
      .toContainEqual({ frequency: 196, waveform: "square" });
  });

  test("unlocked color story shows both properties immediately", async ({ page }) => {
    await installAvaAudioMock(page);
    await page.goto(story("app-avashapes--colors-unlocked"));

    await expectDocumentFitsViewport(page);
    await expect(page.getByRole("heading", { name: "Shape + color" })).toHaveCount(0);
    await expect(
      page.getByRole("img", { name: /Red square shape drawn with WebGL/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Red square" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);
    await expectInitialAudioCue(page, RED_SQUARE_CUE);
  });
});
