import { expect, test } from "@playwright/test";

// Story-level tests for the GraphView visual/list toggle. The demo story uses a
// placeholder "[ diagram canvas ]" div + a real <a> list, so these assert the
// toggle mechanics and the responsive default without a PixiJS canvas (the
// canvas-mounts-only-in-diagram behaviour is asserted at the app level against a
// real graph, in graph-view.app.spec.ts). Reduced-motion is forced in config.
//
// Navigate to iframe.html directly so the story is the TOP page — page viewport
// then drives `useMediaQuery`'s `matchMedia` for the responsive-default checks.

const STORY = "/iframe.html?id=app-graphview--default&viewMode=story";
const DIAGRAM = "[ diagram canvas ]";

test.describe("GraphView — visual/list toggle", () => {
  test("default view follows the viewport (mobile=list, desktop=diagram)", async ({ page }) => {
    // Phone: list is the default.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(STORY);
    await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("link", { name: "Slices & Arrays" })).toBeVisible();
    await expect(page.getByText(DIAGRAM)).toHaveCount(0);

    // Desktop: diagram is the default.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(STORY);
    await expect(page.getByRole("button", { name: "Diagram" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(DIAGRAM)).toBeVisible();
  });

  test("the toggle overrides the viewport default", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(STORY);
    await expect(page.getByText(DIAGRAM)).toBeVisible();

    // Override to list.
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(DIAGRAM)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Formatting" })).toBeVisible();

    // Back to diagram.
    await page.getByRole("button", { name: "Diagram" }).click();
    await expect(page.getByRole("button", { name: "Diagram" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(DIAGRAM)).toBeVisible();
  });

  test("the link list stays in the DOM in both views (sr-only under the diagram)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(STORY);
    // Diagram view: the link is present (sr-only) even though the canvas is shown.
    const link = page.getByRole("link", { name: "I/O traits" });
    await expect(link).toHaveCount(1);
    // List view: the same link is the visible content.
    await page.getByRole("button", { name: "List" }).click();
    await expect(link).toBeVisible();
  });
});
