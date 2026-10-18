// User chose application workflows: navigation, modes, and saved progress.
// Role selectors; real, fresh IndexedDB; reduced motion from project defaults.
import { AvaSymbolsSessionSchema } from "@mind-palace/schemas";
import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1024, height: 768 } });

test("Kid apps opens both complete decks from the home screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Kid apps/ }).click();
  await expect(page.getByRole("heading", { name: "Kid apps" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ava's Shape Sounds/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ava's First 100 Words/ })).toBeVisible();
  await page.getByRole("link", { name: /Ava's Numbers/ }).click();
  await expect(page.getByRole("heading", { name: "Ava's Numbers" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Choose a number" }).getByRole("button"),
  ).toHaveCount(11);
  for (let value = 0; value <= 10; value++) {
    await page.getByRole("button", { name: `Choose ${value}`, exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Choose ${value}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Count", exact: true }).click();
  await expect(page.getByRole("img", { name: "Ten: alternate representation" })).toBeVisible();
  await page.getByRole("button", { name: "Word", exact: true }).click();
  await expect(page.getByRole("img", { name: "Ten: word representation" })).toBeVisible();

  await page.goto("/apps");
  await page.getByRole("link", { name: /Ava's Letters/ }).click();
  await expect(page.getByRole("heading", { name: "Ava's Letters" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Choose a letter" }).getByRole("button"),
  ).toHaveCount(26);
  for (const upper of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    await page.getByRole("button", { name: `Choose ${upper}`, exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Choose ${upper}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Lowercase", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Z for Zebra: alternate representation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Picture word", exact: true }).click();
  await expect(page.getByRole("img", { name: "Z for Zebra: word representation" })).toBeVisible();
});

for (const app of ["ava-numbers", "ava-letters"] as const) {
  test(`${app}: 3D, local video, and progress survive reload independently`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const numbers = app === "ava-numbers";
    const label = numbers ? "Zero" : "A for Apple";
    await page.goto(`/apps/${app}`);
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(page.getByRole("img", { name: `${label} shown as a lit 3D card` })).toBeVisible();
    await page.getByRole("button", { name: "Video", exact: true }).click();
    await page.getByRole("button", { name: `Play a video for ${label}` }).click();
    const video = page.getByLabel(`${label} representations video`, { exact: true });
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeGreaterThan(0);
    await expect(video).toHaveAttribute(
      "src",
      new RegExp(`/ava-symbols/videos/${app}/${numbers ? "0" : "a"}\\.mp4$`),
    );
    await page.getByRole("button", { name: "2D", exact: true }).click();
    await page.getByRole("button", { name: numbers ? "Count" : "Lowercase", exact: true }).click();
    await page.getByRole("button", { name: /Easy/ }).click();
    await expect(
      page.getByText(`1 of ${numbers ? "11 numbers" : "26 letters"} practiced`),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const raw = await page.evaluate(
          (id) =>
            new Promise<unknown>((resolve, reject) => {
              const request = indexedDB.open("@mind-palace/web");
              request.onerror = () => reject(request.error);
              request.onsuccess = () => {
                const db = request.result;
                const get = db
                  .transaction("avaSymbolSessions")
                  .objectStore("avaSymbolSessions")
                  .get(id);
                get.onsuccess = () => {
                  resolve(get.result);
                  db.close();
                };
                get.onerror = () => {
                  reject(get.error);
                  db.close();
                };
              };
            }),
          app,
        );
        const result = AvaSymbolsSessionSchema.safeParse(raw);
        return result.success
          ? {
              selectedIndex: result.data.selectedIndex,
              representation: result.data.representation,
              reviewed: Object.keys(result.data.states).length,
            }
          : null;
      })
      .toEqual({ selectedIndex: 1, representation: "alternate", reviewed: 1 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: numbers ? "One" : "B for Ball", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: numbers ? "Count" : "Lowercase", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText(`1 of ${numbers ? "11 numbers" : "26 letters"} practiced`),
    ).toBeVisible();
    await page.goto(`/apps/${numbers ? "ava-letters" : "ava-numbers"}`);
    await expect(
      page.getByRole("heading", { name: numbers ? "A for Apple" : "Zero", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("letters remain usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 740 });
  await page.goto("/apps/ava-letters");
  await page.getByRole("button", { name: "Choose Z", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Z for Zebra", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Picture word", exact: true }).click();
  await expect(page.getByRole("img", { name: "Z for Zebra: word representation" })).toBeVisible();
  await page.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("1 of 26 letters practiced")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});
