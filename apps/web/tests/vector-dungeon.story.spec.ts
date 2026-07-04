import { expect, test } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test.describe("Vector Dungeon stories", () => {
  test("Splash default keeps the original single entry action", async ({ page }) => {
    await page.goto(story("app-splash--default"));
    await expect(page.getByRole("button", { name: "Enter the palace" })).toBeVisible();
  });

  test("Splash renders both entry actions", async ({ page }) => {
    await page.goto(story("app-splash--two-entrances"));
    await expect(page.getByRole("button", { name: /Study Guide/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dungeon Master Apps/ })).toBeVisible();
  });

  test("AppHub renders the Vector Dungeon app card", async ({ page }) => {
    await page.goto(story("app-apphub--default"));
    await expect(page.getByRole("heading", { name: "Choose your path" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Vector Dungeon/ })).toBeVisible();
  });

  test("fresh DM session renders coordinate controls", async ({ page }) => {
    await page.goto(story("app-vectordungeon--fresh-session"));
    await expect(page.getByRole("heading", { name: "Vector Dungeon" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Vector dungeon coordinate grid" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Study the origin campfire/ })).toBeVisible();
  });

  test("pending action story exposes the d20 target", async ({ page }) => {
    await page.goto(story("app-vectordungeon--pending-action"));
    await expect(page.getByRole("heading", { name: /Study the origin campfire/ })).toBeVisible();
    await expect(page.getByText(/Dean needs 8 or higher/)).toBeVisible();
  });

  test("missed-roll story offers magic re-roll and a setback", async ({ page }) => {
    await page.goto(story("app-vectordungeon--missed-roll-needs-magic"));
    await expect(page.getByRole("heading", { name: "Missed the roll" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use magic re-roll \(5 left\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Take the setback/ })).toBeVisible();
    await expect(page.getByLabel("Magic 5 of 5")).toBeVisible();
  });

  test("camp recovery story renders recovery action", async ({ page }) => {
    await page.goto(story("app-vectordungeon--camp-recovery"));
    await expect(page.getByRole("heading", { name: "Back to camp" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Recover at camp/ })).toBeVisible();
  });

  test("low HP story renders current health and rewards", async ({ page }) => {
    await page.goto(story("app-vectordungeon--low-hp"));
    await expect(page.getByLabel("HP 1 of 5")).toBeVisible();
    await expect(page.getByText("camp ember")).toBeVisible();
  });

  test("printable guide story renders the worksheet", async ({ page }) => {
    await page.goto(story("app-vectordungeonguide--printable"));
    await expect(page.getByRole("heading", { name: "Dean's Vector Dungeon" })).toBeVisible();
    await expect(page.getByText("start + velocity = target")).toBeVisible();
  });
});
