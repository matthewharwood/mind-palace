// User selected application workflows with roles, fresh IDB, reduced motion,
// image loading, representation changes, and unchanged 3D/video media paths.

import {
  AvaFirstWordsSessionSchema,
  AvaLearningSessionSchema,
  AvaShapesSessionSchema,
} from "@mind-palace/schemas";
import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

function sessionContract(id: string) {
  switch (id) {
    case "ava-shapes":
      return { store: "avaShapeSessions", schema: AvaShapesSessionSchema };
    case "ava-first-words":
      return { store: "avaFirstWordSessions", schema: AvaFirstWordsSessionSchema };
    default:
      return { store: "avaLearningSessions", schema: AvaLearningSessionSchema };
  }
}

async function expectLoaded(image: Locator, id: string): Promise<void> {
  await expect(image).toHaveAttribute("src", `/ava-studio/illustrations/${id}.webp`);
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
}

for (const app of [
  { id: "ava-actions", label: "Jump illustration", picture: "ava-jump" },
  { id: "ava-needs", label: "More illustration", picture: "ava-need-more" },
  { id: "ava-opposites", label: "Big illustration", picture: "ava-opposite-big" },
  { id: "ava-positions", label: "Inside illustration", picture: "ava-position-inside" },
  { id: "ava-two-words", label: "Ava jumps illustration", picture: "ava-jump" },
  { id: "ava-shapes", label: "Square illustration", picture: "shape-square-colorless" },
  { id: "ava-first-words", label: "Illustration of mommy", picture: "word-mommy" },
] as const) {
  test(`${app.id} loads generated 2D artwork and retains the view after reload`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/apps/${app.id}`);
    await page.getByRole("button", { name: "2D", exact: true }).click();
    await expectLoaded(page.getByRole("img", { name: app.label, exact: true }), app.picture);
    const persistence = sessionContract(app.id);
    // The real write is debounced; polling the database provides a persistence
    // boundary before the reload instead of sleeping or mocking hydration.
    await expect
      .poll(async () => {
        const saved = await page.evaluate(
          ({ id, store }) =>
            new Promise<unknown>((resolve, reject) => {
              const open = indexedDB.open("@mind-palace/web");
              open.onerror = () => reject(open.error);
              open.onsuccess = () => {
                const db = open.result;
                const get = db.transaction(store).objectStore(store).get(id);
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
          { id: app.id, store: persistence.store },
        );
        const parsed = persistence.schema.safeParse(saved);
        return parsed.success && parsed.data.viewMode === "2d";
      })
      .toBe(true);
    await page.reload();
    await expect(page.getByRole("button", { name: "2D", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expectLoaded(page.getByRole("img", { name: app.label, exact: true }), app.picture);
    expect(errors).toEqual([]);
  });
}

for (const kind of ["numbers", "letters"] as const) {
  test(`all ${kind} keep distinct generated representations`, async ({ page }) => {
    test.slow(); // This workflow loads every real image in the complete deck.
    await page.goto(`/apps/ava-${kind}`);
    await page.getByRole("button", { name: "2D", exact: true }).click();
    const values =
      kind === "numbers"
        ? Array.from({ length: 11 }, (_, value) => String(value))
        : [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
    const labels =
      kind === "numbers"
        ? ["Numeral", "Count", "Word"]
        : ["Uppercase", "Lowercase", "Picture word"];
    const representations = ["symbol", "alternate", "word"];
    for (const value of values) {
      await page.getByRole("button", { name: `Choose ${value}`, exact: true }).click();
      for (const [index, label] of labels.entries()) {
        await page.getByRole("button", { name: label, exact: true }).click();
        const image = page.getByRole("img", {
          name: new RegExp(`: ${representations[index]} representation$`),
        });
        await expectLoaded(
          image,
          `${kind === "numbers" ? "number" : "letter"}-${value.toLowerCase()}-${representations[index]}`,
        );
      }
    }
  });
}

test("illustrated combinations switch subjects while original 3D and videos still work", async ({
  page,
}) => {
  await page.goto("/apps/ava-actions");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  for (const subject of ["Ava", "Mommy", "Daddy", "Dog"]) {
    await page.getByRole("button", { name: subject, exact: true }).click();
    await expectLoaded(
      page.getByRole("img", { name: `${subject} jumps illustration`, exact: true }),
      `${subject.toLowerCase()}-jump`,
    );
  }
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Dog jumps interactive 3D scene", exact: true }),
  ).toHaveAttribute("data-ava-scene-ready", "true");
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await page.getByRole("button", { name: "Play a video for Dog jumps", exact: true }).click();
  const video = page.getByLabel("Dog jumps representations video", { exact: true });
  await expect(video).toHaveAttribute("src", "/ava-studio/videos/dog-jump.mp4");
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0);
});
