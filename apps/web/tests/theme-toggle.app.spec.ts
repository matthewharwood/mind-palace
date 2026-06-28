import { expect, test } from "@playwright/test";

// App-level: the dark-mode flow is IDB-first (Pillar 3). Toggling the shell's
// ThemeToggle writes `settings.theme` to IndexedDB, applies the `dark` class to
// <html>, and survives a reload (hydration re-reads it). Base test (not the
// fresh-IDB fixture) so the reload keeps IndexedDB; each Playwright context
// starts with an empty DB anyway.

function readTheme(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open("@mind-palace/web");
    req.onsuccess = () => {
      const db = req.result;
      const get = db.transaction("settings", "readonly").objectStore("settings").get("settings");
      get.onsuccess = () => {
        const record = get.result as { theme?: string } | undefined;
        resolve(record?.theme ?? null);
        db.close();
      };
      get.onerror = () => {
        resolve(null);
        db.close();
      };
    };
    req.onerror = () => resolve(null);
  });
}

test.describe("theme toggle — IDB-first dark mode", () => {
  test("toggling persists theme to IDB and survives reload", async ({ page }) => {
    // Skip the /welcome splash redirect so the shell (with the theme toggle) shows.
    await page.addInitScript(() => sessionStorage.setItem("mp-entered", "1"));
    await page.goto("/");

    // Default is light → the control offers to switch to dark.
    await page.getByRole("button", { name: "Switch to dark theme" }).click();

    // Applied to <html> immediately and written through to IndexedDB.
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(readTheme)).toBe("dark");

    // Hydration re-reads the persisted theme after a full reload.
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });
});
