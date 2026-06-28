import { expect, test } from "@playwright/test";

// Asserts the 3D hero actually renders. A WebGL canvas's pixels aren't
// DOM-queryable (proven approach from dean-n-dean's monster-viewer spec), so the
// contract is two DOM-observable facts:
//   1. the viewer mounts a SIZED canvas — renderer.setSize ran, i.e. Three.js
//      loaded (dynamic import) + the WebGL/WebGPU renderer initialized; and
//   2. the GLB actually parsed + entered the scene — the `data-glb-loaded`
//      signal useGlbViewer sets after adding the model.
// Story-level against the GlbViewer story (loads public/splash/hero.glb).

const STORY = "/iframe.html?id=app-glbviewer--default&viewMode=story";

test.describe("GlbViewer — 3D hero renders", () => {
  test("mounts a sized canvas and loads the GLB into the scene", async ({ page }) => {
    await page.goto(STORY);

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    // Renderer initialized + sized (Three.js dynamic import resolved, context up).
    await expect
      .poll(async () => Number(await canvas.getAttribute("width")) || 0, { timeout: 20_000 })
      .toBeGreaterThan(0);

    // The hero GLB parsed and was added to the scene.
    await expect
      .poll(async () => canvas.getAttribute("data-glb-loaded"), { timeout: 30_000 })
      .toBe("true");
  });
});
