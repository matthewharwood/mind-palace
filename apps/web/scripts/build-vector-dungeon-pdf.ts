import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PORT = Number.parseInt(process.env.VECTOR_DUNGEON_PDF_PORT ?? "5174", 10);
const APP_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT_PATH = resolve(APP_ROOT, "public/vector-dungeon/dean-vector-dungeon.pdf");
const PRINT_URL = `http://127.0.0.1:${PORT}/apps/vector-dungeon/print`;

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await Bun.sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const server = Bun.spawn(
  ["bun", "x", "vite", "dev", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  {
    cwd: APP_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  },
);

try {
  await waitForServer(PRINT_URL);
  await mkdir(resolve(APP_ROOT, "public/vector-dungeon"), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 816, height: 1056 },
    deviceScaleFactor: 1,
  });

  await page.goto(PRINT_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: OUTPUT_PATH,
    format: "Letter",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();
  process.stdout.write(`Wrote ${OUTPUT_PATH}\n`);
} finally {
  server.kill();
  await server.exited;
}
