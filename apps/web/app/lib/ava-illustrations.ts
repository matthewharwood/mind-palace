import type { AvaSymbolRepresentation } from "@mind-palace/schemas";
import * as z from "zod";
import aliasesSource from "~/data/ava-illustration-aliases.json";

const aliases = z.record(z.string(), z.string()).parse(aliasesSource);

export function avaIllustrationId(
  sceneId: string,
  representation: AvaSymbolRepresentation = "symbol",
): string {
  if (sceneId.startsWith("number-") || sceneId.startsWith("letter-"))
    return `${sceneId}-${representation}`;
  return aliases[sceneId] ?? sceneId;
}

export function avaIllustrationPath(
  sceneId: string,
  representation: AvaSymbolRepresentation = "symbol",
): string {
  return `ava-studio/illustrations/${avaIllustrationId(sceneId, representation)}.webp`;
}
