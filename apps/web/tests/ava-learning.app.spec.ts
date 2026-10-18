// User chose app workflows only: role selectors, fresh real IDB, reduced motion,
// recognition, combinations, local playback, and persistence after reload.
import { type AvaCollectionId, AvaLearningSessionSchema } from "@mind-palace/schemas";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

test.use({ viewport: { width: 1024, height: 768 } });

async function savedLearning(page: Page, id: AvaCollectionId) {
  const raw = await page.evaluate(
    (key) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open("@mind-palace/web");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const get = db
            .transaction("avaLearningSessions")
            .objectStore("avaLearningSessions")
            .get(key);
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
    id,
  );
  const parsed = AvaLearningSessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function expectPlaying(video: Locator): Promise<void> {
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0);
}

const COLLECTIONS = [
  { id: "ava-actions", title: "Action Words", count: 20, first: "Jump", next: "Eat" },
  { id: "ava-needs", title: "My Wants & Needs", count: 20, first: "More", next: "Help" },
  {
    id: "ava-opposites",
    title: "Opposites & Descriptions",
    count: 20,
    first: "Big",
    next: "Small",
  },
  { id: "ava-positions", title: "Where Is It?", count: 12, first: "Inside", next: "Outside" },
  {
    id: "ava-two-words",
    title: "Two Words Together",
    count: 20,
    first: "Ava jumps",
    next: "Mommy eats",
  },
] as const;

for (const collection of COLLECTIONS) {
  test(`${collection.title}: hub navigation, learning modes, and saved discoveries`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/apps");
    await page
      .getByRole("link", {
        name: new RegExp(
          `Collection \\d · ${collection.count} words ${collection.title.replace("?", "\\?")}`,
        ),
      })
      .click();
    await expect(page.getByRole("heading", { name: collection.title, exact: true })).toBeVisible();
    await expect(
      page.getByText(`0 of ${collection.count} explored`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "2D", exact: true }).click();
    await expect(
      page.getByRole("img", { name: `${collection.first} illustration`, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByRole("region", { name: "Word combination" })).toBeVisible();
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await page.getByRole("button", { name: "We tried it", exact: true }).click();
    await expect(page.getByRole("heading", { name: collection.next, exact: true })).toBeVisible();
    await expect(
      page.getByText(`1 of ${collection.count} explored`, { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const saved = await savedLearning(page, collection.id);
        return (
          saved && {
            index: saved.selectedIndex,
            mode: saved.mode,
            view: saved.viewMode,
            explored: Object.values(saved.records).filter((record) => record.introduced).length,
          }
        );
      })
      .toEqual({ index: 1, mode: "discover", view: "2d", explored: 1 });
    await page.reload();
    await expect(page.getByRole("heading", { name: collection.next, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "2D", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByText(`1 of ${collection.count} explored`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ava's little world", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kid apps", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("recognition allows a gentle retry, plays local choices on request, and saves both attempts", async ({
  page,
}) => {
  await page.goto("/apps/ava-actions");
  await page.getByRole("button", { name: "Recognize", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Which one is jumping?", exact: true }),
  ).toBeVisible();
  const jump = page.getByLabel("Jump demonstration", { exact: true });
  const eat = page.getByLabel("Eat demonstration", { exact: true });
  expect(await jump.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.getByRole("button", { name: "Watch the choices", exact: true }).click();
  await expectPlaying(jump);
  await expectPlaying(eat);
  await expect(jump).toHaveAttribute("src", "/ava-studio/videos/ava-jump.mp4");
  await page.getByRole("button", { name: "Choose Eat", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Let's look again. You can try both.");
  await expect(
    page.getByRole("button", { name: "Next little discovery", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Choose Jump", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Yes! Jump.");
  await expect(page.getByRole("button", { name: "Choose Jump", exact: true })).toBeDisabled();
  await expect(page.getByText("1 of 20 explored", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next little discovery", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Which one is eating?", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const saved = await savedLearning(page, "ava-actions");
      return saved && { mode: saved.mode, index: saved.selectedIndex, jump: saved.records.jump };
    })
    .toEqual({ mode: "recognize", index: 1, jump: { introduced: true, attempts: 2, correct: 1 } });
  await page.reload();
  await expect(page.getByRole("button", { name: "Recognize", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Which one is eating?", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Take your time. Tap the matching scene.");
});

test("Connect changes modeled subjects, plays a narrated local video, and retains the combination", async ({
  page,
}) => {
  const models: string[] = [];
  const narration: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(new URL(request.url()).pathname);
    if (request.url().includes("/ava-studio/audio/")) narration.push(request.url());
  });
  await page.goto("/apps/ava-actions");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const combination = page.getByRole("region", { name: "Word combination" });
  for (const subject of ["Ava", "Mommy", "Daddy", "Dog"]) {
    if (subject !== "Ava") await page.getByRole("button", { name: subject, exact: true }).click();
    await expect(combination).toHaveText(`${subject}jumps`);
    const scene = page.getByRole("img", {
      name: `${subject} jumps interactive 3D scene`,
      exact: true,
    });
    await expect(scene).toHaveAttribute("data-ava-scene-ready", "true");
    expect(Number(await scene.getAttribute("data-ava-scene-animation"))).toBeGreaterThan(0);
    expect(Number(await scene.getAttribute("data-ava-scene-meshes"))).toBeGreaterThan(10);
    expect(models).toContain(`/ava-studio/models/${subject.toLowerCase()}-jump.glb`);
  }
  await page.getByRole("button", { name: "Turn scene right", exact: true }).click();
  await page.getByRole("button", { name: "Next action pose", exact: true }).click();
  await page.getByRole("button", { name: "Hear Dog jumps", exact: true }).click();
  await expect.poll(() => narration.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await page.getByRole("button", { name: "Play a video for Dog jumps", exact: true }).click();
  const video = page.getByLabel("Dog jumps representations video", { exact: true });
  await expectPlaying(video);
  await expect(video).toHaveAttribute("src", "/ava-studio/videos/dog-jump.mp4");
  await expect
    .poll(async () => {
      const saved = await savedLearning(page, "ava-actions");
      return (
        saved && {
          mode: saved.mode,
          view: saved.viewMode,
          subject: saved.subject,
          sound: saved.soundEnabled,
        }
      );
    })
    .toEqual({ mode: "connect", view: "video", subject: "dog", sound: true });
  await page.reload();
  await expect(combination).toHaveText("Dogjumps");
  await expect(page.getByRole("button", { name: "Dog", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Play a video for Dog jumps", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wash", exact: true }).click();
  await expect(combination).toHaveText("Avawashes");
  await expect(page.getByRole("button", { name: "Dog", exact: true })).toHaveCount(0);
  await page.goto("/apps/ava-needs");
  await expect(page.getByText("0 of 20 explored", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discover", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("spatial scenes cover all twelve positions in little sets and keep the last short set", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apps/ava-positions");
  await page.getByRole("button", { name: "Under", exact: true }).click();
  const scene = page.getByRole("img", { name: "Under interactive 3D scene", exact: true });
  await expect(scene).toHaveAttribute("data-ava-scene-ready", "true");
  await page.getByRole("button", { name: "Turn scene left", exact: true }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("region", { name: "Word combination" })).toHaveText("Ballundertable");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const sets = [
    ["Inside", "Outside", "On", "Under", "Behind"],
    ["In front", "Beside", "Between", "Above", "Below"],
    ["Near", "Far"],
  ];
  for (const [index, labels] of sets.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Next little set", exact: true }).click();
    for (const label of labels) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }
  }
  await expect
    .poll(async () => {
      const saved = await savedLearning(page, "ava-positions");
      return saved && { index: saved.selectedIndex, set: saved.setStart };
    })
    .toEqual({ index: 11, set: 10 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Far", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "We tried it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Near", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next little set", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inside", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("opposites present the paired contrast and phrases reuse familiar ideas", async ({ page }) => {
  await page.goto("/apps/ava-opposites");
  await page.getByRole("button", { name: "Recognize", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose Big", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Small", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Choose Big", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Yes! Big.");
  await page.goto("/apps/ava-two-words");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("button", { name: "Next little set", exact: true }).click();
  await page.getByRole("button", { name: "More milk", exact: true }).click();
  await expect(page.getByRole("region", { name: "Word combination" })).toHaveText("Moremilk");
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await page.getByRole("button", { name: "Play a video for More milk", exact: true }).click();
  await expectPlaying(page.getByLabel("More milk representations video", { exact: true }));
});

for (const foundation of [
  {
    id: "ava-first-words",
    label: "Mommy",
    scene: "word-mommy",
    accessible: "Mommy interactive 3D scene",
  },
  {
    id: "ava-shapes",
    label: "Square",
    scene: "shape-square-colorless",
    accessible: "Square rendered as a lit 3D shape",
  },
] as const) {
  test(`${foundation.id}: genuine 3D and local video upgrade`, async ({ page }) => {
    await page.goto(`/apps/${foundation.id}`);
    await page.getByRole("button", { name: "3D", exact: true }).click();
    const scene = page.getByRole("img", { name: foundation.accessible, exact: true });
    await expect(scene).toHaveAttribute("data-ava-scene-ready", "true");
    expect(Number(await scene.getAttribute("data-ava-scene-meshes"))).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Video", exact: true }).click();
    await page
      .getByRole("button", { name: `Play a video for ${foundation.label}`, exact: true })
      .click();
    const video = page.getByLabel(`${foundation.label} representations video`, { exact: true });
    await expectPlaying(video);
    await expect(video).toHaveAttribute("src", `/ava-studio/videos/${foundation.scene}.mp4`);
  });
}
