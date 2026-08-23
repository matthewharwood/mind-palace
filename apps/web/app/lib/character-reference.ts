import type { CharacterDefinition } from "@mind-palace/schemas";
import * as z from "zod";

import rawReferenceImages from "~/data/character-party/reference-images.json";

const CharacterReferenceFilesSchema = z.record(
  z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  z.string().min(1),
);

export const CHARACTER_REFERENCE_FILES = CharacterReferenceFilesSchema.parse(rawReferenceImages);

export function hasCharacterReference(character: CharacterDefinition): boolean {
  return character.drawable && Object.hasOwn(CHARACTER_REFERENCE_FILES, character.id);
}

const MetadataValueSchema = z.object({ value: z.string() });
const CommonsImageInfoSchema = z.object({
  url: z.url(),
  thumburl: z.url().optional(),
  descriptionurl: z.url(),
  extmetadata: z.object({
    Artist: MetadataValueSchema.optional(),
    LicenseShortName: MetadataValueSchema.optional(),
    LicenseUrl: MetadataValueSchema.optional(),
  }),
});
const CommonsImageInfoResponseSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string().min(1),
        imageinfo: z.array(CommonsImageInfoSchema).optional(),
      }),
    ),
  }),
});

export const CharacterReferenceSchema = z.object({
  imageUrl: z.url(),
  sourceUrl: z.url(),
  sourceName: z.string().min(1).default("Wikimedia Commons"),
  creatorName: z.string().min(1).optional(),
  licenseName: z.string().min(1).optional(),
  licenseUrl: z.url().optional(),
});
export type CharacterReference = z.infer<typeof CharacterReferenceSchema>;

const referenceCache = new Map<string, CharacterReference>();

export function buildCommonsImageInfoUrl(fileName: string): string {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    origin: "*",
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "imageinfo",
    titles: `File:${fileName}`,
    iiprop: "url|extmetadata",
    iiurlwidth: "1200",
    iiextmetadatalanguage: "en",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist",
  }).toString();
  return url.toString();
}

export function buildImageSearchUrl(imageSearchTerm: string): string {
  const url = new URL("https://www.google.com/search");
  url.search = new URLSearchParams({ tbm: "isch", safe: "active", q: imageSearchTerm }).toString();
  return url.toString();
}

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&apos;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
};

export function metadataText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let outsideMarkup = "";
  let insideTag = false;
  for (const character of value) {
    if (character === "<") {
      insideTag = true;
      outsideMarkup += " ";
    } else if (character === ">") {
      insideTag = false;
    } else if (!insideTag) {
      outsideMarkup += character;
    }
  }
  const text = outsideMarkup
    .replace(/&(amp|apos|gt|lt|nbsp|quot);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replace(/&#x([\da-f]+);/gi, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

function normalizedUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    return new URL(value.startsWith("//") ? `https:${value}` : value).toString();
  } catch {
    return fallback;
  }
}

export function parseCommonsImageInfo(raw: unknown): CharacterReference | null {
  const response = CommonsImageInfoResponseSchema.parse(raw);
  const info = response.query.pages.find((page) => page.imageinfo?.[0])?.imageinfo?.[0];
  const licenseName = metadataText(info?.extmetadata.LicenseShortName?.value);
  if (!info || !licenseName) return null;
  return CharacterReferenceSchema.parse({
    imageUrl: info.thumburl ?? info.url,
    sourceUrl: info.descriptionurl,
    sourceName: "Wikimedia Commons",
    creatorName: metadataText(info.extmetadata.Artist?.value),
    licenseName,
    licenseUrl: normalizedUrl(info.extmetadata.LicenseUrl?.value, info.descriptionurl),
  });
}

export async function loadCharacterReference(
  character: CharacterDefinition,
  signal: AbortSignal,
): Promise<CharacterReference | null> {
  const fileName = CHARACTER_REFERENCE_FILES[character.id];
  if (!fileName) return null;
  const cached = referenceCache.get(fileName);
  if (cached) return cached;
  const response = await fetch(buildCommonsImageInfoUrl(fileName), { signal });
  if (!response.ok) throw new Error(`Wikimedia Commons image lookup failed (${response.status})`);
  const reference = parseCommonsImageInfo(await response.json());
  if (reference) referenceCache.set(fileName, reference);
  return reference;
}
