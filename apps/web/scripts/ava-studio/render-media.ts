// Deterministic local video authoring from the actual Blender geometry.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { AvaStudioManifestSchema } from "../../app/lib/ava-studio";
import { sharedPlugins } from "../../vite.shared";

const root = join(import.meta.dir, "../..");
const server = await createServer({
  root,
  configFile: false,
  cacheDir: join(tmpdir(), "ava-studio-vite"),
  plugins: sharedPlugins(),
  appType: "custom",
  logLevel: "error",
  server: { port: 5199, strictPort: true, host: "127.0.0.1" },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "three",
      "three/addons/loaders/GLTFLoader.js",
      "three/addons/controls/OrbitControls.js",
    ],
  },
});
server.middlewares.use((request, response, next) => {
  if (request.url !== "/ava-render") {
    next();
    return;
  }
  response.setHeader("Content-Type", "text/html");
  response.end(
    `<style>body{margin:0;background:#fbf5e9}div{width:576px;height:576px}canvas{width:100%;height:100%}</style><div><canvas></canvas></div><script type="module">import{createAvaSceneRuntime}from'/app/canvas/ava-scene-runtime.ts';window.loadScene=async(id,variant)=>{window.sceneRuntime?.dispose();window.sceneRuntime=await createAvaSceneRuntime(document.querySelector('canvas'),'/ava-studio/models/'+id+'.glb',variant,false,new AbortController().signal);};</script>`,
  );
});
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 576, height: 576 }, deviceScaleFactor: 1 });
const scratch = await mkdtemp(join(tmpdir(), "ava-scene-video-"));
const parsedManifest = AvaStudioManifestSchema.parse(
  await Bun.file(new URL("./manifest.json", import.meta.url)).json(),
);
const force = process.argv.includes("--force");
const filters = new Set(process.argv.slice(2).filter((value) => value !== "--force"));
const manifest = filters.size
  ? parsedManifest.filter((spec) => filters.has(spec.id))
  : parsedManifest;
try {
  await page.goto("http://127.0.0.1:5199/ava-render");
  await page.waitForFunction(() => "loadScene" in window);
  for (const spec of manifest) {
    const destination = join(root, "public/ava-studio/videos", `${spec.id}.mp4`);
    if (!force && (await Bun.file(destination).exists())) continue;
    await page.evaluate(async (id) => {
      let variant = "all";
      if (id.startsWith("number-")) variant = "alternate";
      if (id.startsWith("letter-")) variant = "word";
      await (
        window as unknown as { loadScene: (id: string, variant: string) => Promise<void> }
      ).loadScene(id, variant);
    }, spec.id);
    for (let frame = 0; frame < 24; frame++) {
      await page.evaluate((time) => {
        const runtime = (
          window as unknown as {
            sceneRuntime: { setTime: (n: number) => void; turn: (n: number) => void };
          }
        ).sceneRuntime;
        runtime.setTime(time);
        if (document.querySelector("canvas")?.dataset.avaSceneAnimation === "0")
          runtime.turn(0.025);
      }, frame / 12);
      await page.screenshot({ path: join(scratch, `${String(frame).padStart(3, "0")}.png`) });
    }
    await mkdir(join(root, "public/ava-studio/videos"), { recursive: true });
    const input = join(scratch, "%03d.png");
    await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate 12 -i ${input} -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart ${destination}`.quiet();
    process.stdout.write(`AVA_VIDEO ${spec.id}\n`);
  }
} finally {
  await browser.close();
  await server.close();
  await rm(scratch, { recursive: true, force: true });
}
