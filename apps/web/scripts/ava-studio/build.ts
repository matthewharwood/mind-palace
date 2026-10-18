import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getAvaSymbolCards } from "../../app/lib/ava-symbols";

const appRoot = join(import.meta.dir, "../..");
if (!process.argv.includes("--copy-only")) {
  await import("./export-manifest");
  const blender =
    process.env.AVA_BLENDER_BIN ??
    Bun.which("blender") ??
    "/Applications/Blender.app/Contents/MacOS/Blender";
  await Bun.$`${blender} --background --python ${join(import.meta.dir, "build_scenes.py")}`.cwd(
    appRoot,
  );
  await Bun.$`bun run ${join(import.meta.dir, "render-media.ts")} --force`.cwd(appRoot);
}
for (const app of ["ava-numbers", "ava-letters"] as const) {
  const destination = join(appRoot, "public/ava-symbols/videos", app);
  await mkdir(destination, { recursive: true });
  for (const card of getAvaSymbolCards(app))
    await copyFile(
      join(appRoot, "public/ava-studio/videos", `${card.kind}-${card.id}.mp4`),
      join(destination, `${card.id}.mp4`),
    );
}
process.stdout.write("Ava's local media is ready.\n");
