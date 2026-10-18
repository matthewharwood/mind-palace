import { describe, expect, test } from "bun:test";
import { AvaLearningSessionSchema } from "@mind-palace/schemas";
import * as z from "zod";
import speechSource from "../data/ava-speech.json";
import { avaAvailableSubjects, avaChooseCard, avaConnectPhrase } from "./ava-learning";
import { AVA_COLLECTIONS, avaActionPhrase, avaSceneId } from "./ava-learning-catalog";
import { AvaStudioManifestSchema } from "./ava-studio";

const root = new URL("../../public/", import.meta.url);
const manifest = AvaStudioManifestSchema.parse(
  await Bun.file(new URL("../../scripts/ava-studio/manifest.json", import.meta.url)).json(),
);
const GlbSchema = z.object({
  asset: z.object({ version: z.literal("2.0") }),
  nodes: z.array(z.object({ name: z.string().optional() })),
  meshes: z.array(z.unknown()).min(1),
  animations: z.array(z.unknown()).optional(),
  images: z.array(z.unknown()).optional(),
  textures: z.array(z.unknown()).optional(),
});
const speech = z.record(z.string(), z.string()).parse(speechSource);
const key = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[.!?]$/, "");

describe("Ava's authored media contract", () => {
  test("every scene is geometry, with a local poster and playable file", async () => {
    expect(new Set(manifest.map((scene) => scene.id)).size).toBe(manifest.length);
    for (const scene of manifest) {
      const bytes = await Bun.file(
        new URL(`ava-studio/models/${scene.id}.glb`, root),
      ).arrayBuffer();
      const view = new DataView(bytes);
      expect(view.getUint32(0, true)).toBe(0x46546c67);
      const length = view.getUint32(12, true);
      const model = GlbSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + length))),
      );
      expect(model.images ?? []).toHaveLength(0);
      expect(model.textures ?? []).toHaveLength(0);
      if (
        [
          "jump",
          "eat",
          "drink",
          "sleep",
          "wash",
          "open",
          "hug",
          "run",
          "walk",
          "dance",
          "clap",
          "wave",
          "sit",
          "stand",
          "kick",
          "throw",
          "catch",
          "push",
          "pull",
          "close",
        ].includes(scene.action)
      )
        expect(model.animations?.length).toBeGreaterThan(0);
      if (["ava-opposite-open", "ava-opposite-closed"].includes(scene.id))
        expect(model.animations ?? []).toHaveLength(0);
      if (scene.id.startsWith("number-"))
        expect(model.nodes.filter((node) => node.name?.startsWith("counting bead"))).toHaveLength(
          Number(scene.id.slice(7)),
        );
      expect(Bun.file(new URL(`ava-studio/posters/${scene.id}.jpg`, root)).size).toBeGreaterThan(
        1000,
      );
      expect(Bun.file(new URL(`ava-studio/videos/${scene.id}.mp4`, root)).size).toBeGreaterThan(
        1000,
      );
    }
  });
  test("every teaching prompt and combination has recorded narration and a scene", () => {
    const scenes = new Set(manifest.map((scene) => scene.id));
    for (const collection of AVA_COLLECTIONS)
      for (const [index, card] of collection.cards.entries()) {
        const session = avaChooseCard(AvaLearningSessionSchema.parse({ id: collection.id }), index);
        for (const text of [card.label, card.prompt, avaConnectPhrase(session)])
          expect(speech[key(text)]).toBeDefined();
        expect(scenes.has(avaSceneId(card))).toBe(true);
        if (collection.id === "ava-actions")
          for (const subject of avaAvailableSubjects(card)) {
            expect(scenes.has(avaSceneId(card, subject))).toBe(true);
            expect(speech[key(avaActionPhrase(card.action, subject))]).toBeDefined();
          }
      }
    for (const path of Object.values(speech))
      expect(Bun.file(new URL(path, root)).size).toBeGreaterThan(1000);
  });
});
