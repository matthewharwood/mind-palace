import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as z from "zod";
import { avaIllustrationId, avaIllustrationPath } from "./ava-illustrations";
import { AvaStudioManifestSchema } from "./ava-studio";

const root = new URL("../../public/", import.meta.url);
const sourceRoot = new URL("../../scripts/ava-illustrations/", import.meta.url);
const scenes = AvaStudioManifestSchema.parse(
  await Bun.file(new URL("../../scripts/ava-studio/manifest.json", import.meta.url)).json(),
);
const GeneratedRecordSchema = z.object({
  id: z.string(),
  path: z.string(),
  source: z.string(),
  provider: z.literal("OpenAI built-in image_gen"),
  prompt: z.string().min(100),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

describe("Ava generated 2D artwork", () => {
  test("all scenes and all symbol representations have genuine generated image assets", async () => {
    const records = (await Bun.file(new URL("generated.jsonl", sourceRoot)).text())
      .trim()
      .split("\n")
      .map((line) => GeneratedRecordSchema.parse(JSON.parse(line)));
    const latest = new Map(records.map((record) => [record.id, record]));
    const required = new Set<string>();
    for (const scene of scenes) {
      const representations =
        scene.id.startsWith("number-") || scene.id.startsWith("letter-")
          ? (["symbol", "alternate", "word"] as const)
          : (["symbol"] as const);
      for (const representation of representations) {
        const id = avaIllustrationId(scene.id, representation);
        required.add(id);
        const record = latest.get(id);
        if (!record) throw new Error(`Missing generation record for ${id}`);
        expect(record.path).toBe(avaIllustrationPath(scene.id, representation));
        const bytes = await Bun.file(
          new URL(avaIllustrationPath(scene.id, representation), root),
        ).bytes();
        expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe("RIFF");
        expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe("WEBP");
        expect(bytes.length).toBeGreaterThan(1000);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256);
      }
    }
    expect(required.size).toBe(357);
    expect(latest.size).toBe(required.size);
  });

  test("the existing 3D models and video files remain byte-for-byte unchanged", async () => {
    const preserved = z
      .record(z.string(), z.string())
      .parse(await Bun.file(new URL("preserved-media.json", sourceRoot)).json());
    expect(Object.keys(preserved)).toHaveLength(637);
    for (const [path, sha256] of Object.entries(preserved)) {
      const bytes = await Bun.file(new URL(path, root)).bytes();
      expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(sha256);
    }
  });

  test("familiar action pictures are reused consistently across collections", () => {
    expect(avaIllustrationId("word-jump")).toBe("ava-jump");
    expect(avaIllustrationId("word-help")).toBe("ava-need-help");
    expect(avaIllustrationId("letter-a", "alternate")).toBe("letter-a-alternate");
    expect(avaIllustrationId("number-10", "word")).toBe("number-10-word");
  });
});
