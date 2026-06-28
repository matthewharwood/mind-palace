import { expect, test } from "@playwright/test";

// App-level: the GraphView toggle on a real curriculum route (CurriculumGraph,
// "Network" diagram). Asserts the responsive default, the override, that the
// PixiJS <canvas> mounts ONLY in diagram view, and that the lesson <Link> list
// is present in BOTH views (sr-only under the canvas) for a11y + crawlability.
// CurriculumGraph/LearningPathTree are the only canvas users, so canvas counts
// are unambiguous. Reduced-motion is forced in config.

const ROUTE = "/curriculum/c-rust-foundations";
const LESSON = /Variables & Mutability/;

test.describe("GraphView on a curriculum route", () => {
  test("desktop defaults to the diagram, mobile to the list", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(ROUTE);
    await expect(page.getByRole("button", { name: "Network" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("canvas")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(ROUTE);
    await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: LESSON }).first()).toBeVisible();
  });

  test("toggling swaps canvas/list; lesson links present in both views", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(ROUTE);
    // Diagram view: canvas shown, lesson link present (sr-only) for a11y/crawl.
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("link", { name: LESSON })).toHaveCount(1);

    // Switch to list: canvas unmounts (no WebGL when not shown), link is visible.
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: LESSON }).first()).toBeVisible();

    // Back to the network: the canvas remounts fresh.
    await page.getByRole("button", { name: "Network" }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
