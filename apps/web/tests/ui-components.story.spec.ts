import { expect, test } from "@playwright/test";

// Story-level smoke tests for a representative subset of @mind-palace/ui (the
// package's stories ship under packages/ui/src and are picked up by the shared
// Storybook glob). Each mounts the story and exercises one key interaction.
// Reduced-motion is forced in playwright.config; the components omit enter/exit
// animations, so overlays open synchronously.

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test.describe("@mind-palace/ui — story smoke", () => {
  test("Button renders", async ({ page }) => {
    await page.goto(story("ui-button--default"));
    await expect(page.getByRole("button", { name: "Button" })).toBeVisible();
  });

  test("Dialog opens from its trigger", async ({ page }) => {
    await page.goto(story("ui-dialog--default"));
    await page.getByRole("button", { name: "Open dialog" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Are you sure?")).toBeVisible();
  });

  test("Select opens and picks an option", async ({ page }) => {
    await page.goto(story("ui-select--default"));
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Apple" }).click();
    await expect(page.getByRole("combobox")).toContainText("Apple");
  });

  test("DropdownMenu reveals items", async ({ page }) => {
    await page.goto(story("ui-dropdownmenu--default"));
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  });

  test("Tabs switch panels", async ({ page }) => {
    await page.goto(story("ui-tabs--default"));
    await page.getByRole("tab", { name: "Password" }).click();
    await expect(page.getByText("Password settings here.")).toBeVisible();
  });

  test("Accordion expands an item", async ({ page }) => {
    await page.goto(story("ui-accordion--default"));
    await page.getByRole("button", { name: "Is it accessible?" }).click();
    await expect(page.getByText(/WAI-ARIA pattern/)).toBeVisible();
  });

  test("Switch toggles checked state", async ({ page }) => {
    await page.goto(story("ui-switch--default"));
    const sw = page.getByRole("switch");
    await expect(sw).toBeChecked(); // story starts defaultChecked
    await sw.click();
    await expect(sw).not.toBeChecked();
  });

  test("ThemeToggle flips the theme (.dark + label)", async ({ page }) => {
    await page.goto(story("ui-themetoggle--default"));
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator(".dark")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });
});
