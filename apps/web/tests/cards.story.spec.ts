import { expect, test } from "@playwright/test";

// Story-level tests for the portable @mind-palace/cards package. The storybook
// glob includes packages/*/src/**, so these drive the package's own stories.
// playwright.config forces reduced-motion → the drag engine short-circuits its
// snap/revert animations, so commits land synchronously and these are stable.

const BOARD = "/iframe.html?id=cards-draggable--board&viewMode=story";

function inSlot(slotId: string, cardId: string): string {
  return `[data-test="${slotId}"] [data-test="card-${cardId}"]`;
}

test.describe("Cards/Draggable — Board", () => {
  test("smoke + a11y: cards are labelled buttons, slots are drop targets", async ({ page }) => {
    await page.goto(BOARD);
    // Cards render as focusable buttons with an accessible name.
    const au = page.getByTestId("card-au");
    await expect(au).toBeVisible();
    await expect(au).toHaveRole("button");
    await expect(au).toHaveAccessibleName("au");
    await expect(page.getByTestId("card-ag")).toBeVisible();
    // Four slots expose the drop-target contract.
    await expect(page.locator("[data-drop-target]")).toHaveCount(4);
    // Initial layout.
    await expect(page.locator(inSlot("slot-0", "au"))).toBeVisible();
    await expect(page.locator(inSlot("slot-3", "au"))).toHaveCount(0);
  });

  test("keyboard DnD: focus → Enter → Arrow → Enter moves the card", async ({ page }) => {
    await page.goto(BOARD);
    await page.getByTestId("card-au").focus();
    await page.keyboard.press("Enter"); // lift
    // The live region announces the pickup while the card is still mounted
    // (after the drop the card re-mounts in its new slot with a cleared region).
    await expect(page.getByRole("status").filter({ hasText: "Picked up" })).toHaveCount(1);
    await page.keyboard.press("ArrowLeft"); // wrap to the last candidate, the empty slot-3
    await page.keyboard.press("Enter"); // drop
    await expect(page.locator(inSlot("slot-3", "au"))).toBeVisible();
    await expect(page.locator(inSlot("slot-0", "au"))).toHaveCount(0);
  });

  test("pointer drag: dragging a card into an empty slot moves it", async ({ page }) => {
    await page.goto(BOARD);
    const card = page.getByTestId("card-au");
    const target = page.getByTestId("slot-3");
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    if (!from || !to) return;

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Exceed the 5px drag threshold, then travel to the target center.
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, {
      steps: 5,
    });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator(inSlot("slot-3", "au"))).toBeVisible();
    await expect(page.locator(inSlot("slot-0", "au"))).toHaveCount(0);
  });
});
