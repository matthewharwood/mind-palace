import { expect, test } from "@playwright/test";

import { installAvaAudioMock } from "./ava-audio-mock";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Ava Shapes stories", () => {
  test("colorless foundation hides the answer and plays the compositional cue", async ({
    page,
  }) => {
    await installAvaAudioMock(page);
    await page.goto(story("app-avashapes--colorless-foundation"));

    await expect(page.getByRole("heading", { name: "Shape foundations" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Square shape drawn with WebGL/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Square" })).toHaveCount(0);

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
      .toEqual([
        { frequency: 196, waveform: "square" },
        { frequency: 523.25, waveform: "sine" },
      ]);

    await page.getByRole("button", { name: "Reveal answer" }).click();
    await expect(page.getByRole("heading", { name: "Square" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Good/ })).toBeVisible();
  });

  test("unlocked color story asks for both properties", async ({ page }) => {
    await installAvaAudioMock(page);
    await page.goto(story("app-avashapes--colors-unlocked"));

    await expect(page.getByRole("heading", { name: "Shape + color" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Red square shape drawn with WebGL/ }),
    ).toBeVisible();
    await expect(page.getByText("What color and shape is this?")).toBeVisible();
    await page.getByRole("button", { name: "Reveal answer" }).click();
    await expect(page.getByRole("heading", { name: "Red square" })).toBeVisible();
  });
});
