import { expect, test } from "bun:test";

import { CHARACTER_LIBRARY } from "./character-party";
import {
  buildCommonsImageInfoUrl,
  buildImageSearchUrl,
  CHARACTER_REFERENCE_FILES,
  hasCharacterReference,
  metadataText,
  parseCommonsImageInfo,
} from "./character-reference";

test("every drawing prompt has a curated in-app reference", () => {
  expect(Object.keys(CHARACTER_REFERENCE_FILES)).toHaveLength(93);
  const drawingCharacters = CHARACTER_LIBRARY.filter(hasCharacterReference);
  const drawableIds = new Set(drawingCharacters.map((character) => character.id));
  expect(drawingCharacters).toHaveLength(93);
  for (const characterId of Object.keys(CHARACTER_REFERENCE_FILES)) {
    expect(drawableIds.has(characterId)).toBe(true);
  }
});

test("Commons lookup URL requests licensed metadata and a large thumbnail", () => {
  const url = new URL(buildCommonsImageInfoUrl("Pikachu Parade.jpg"));
  expect(url.origin).toBe("https://commons.wikimedia.org");
  expect(url.searchParams.get("origin")).toBe("*");
  expect(url.searchParams.get("prop")).toBe("imageinfo");
  expect(url.searchParams.get("iiurlwidth")).toBe("1200");
  expect(url.searchParams.get("titles")).toBe("File:Pikachu Parade.jpg");
  expect(url.searchParams.get("iiextmetadatafilter")).toContain("LicenseShortName");
});

test("Commons responses are parsed with readable attribution", () => {
  expect(
    parseCommonsImageInfo({
      query: {
        pages: [
          {
            title: "File:Pikachu Parade.jpg",
            imageinfo: [
              {
                url: "https://upload.wikimedia.org/pikachu-original.jpg",
                thumburl: "https://upload.wikimedia.org/pikachu-thumb.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Pikachu_Parade.jpg",
                extmetadata: {
                  Artist: { value: '<a href="https://example.com">Taylor &amp; Jordan</a>' },
                  LicenseShortName: { value: "CC BY 2.0" },
                  LicenseUrl: { value: "https://creativecommons.org/licenses/by/2.0" },
                },
              },
            ],
          },
        ],
      },
    }),
  ).toEqual({
    imageUrl: "https://upload.wikimedia.org/pikachu-thumb.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pikachu_Parade.jpg",
    sourceName: "Wikimedia Commons",
    creatorName: "Taylor & Jordan",
    licenseName: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  });
  expect(metadataText("<b>Ash</b>&nbsp;Ketchum")).toBe("Ash Ketchum");
});

test("unlicensed Commons responses are rejected", () => {
  expect(
    parseCommonsImageInfo({
      query: {
        pages: [
          {
            title: "File:Unknown.jpg",
            imageinfo: [
              {
                url: "https://upload.wikimedia.org/unknown.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Unknown.jpg",
                extmetadata: {},
              },
            ],
          },
        ],
      },
    }),
  ).toBeNull();
});

test("image search fallback URL preserves the configured search term", () => {
  const url = new URL(buildImageSearchUrl("SpongeBob SquarePants character"));
  expect(url.searchParams.get("tbm")).toBe("isch");
  expect(url.searchParams.get("safe")).toBe("active");
  expect(url.searchParams.get("q")).toBe("SpongeBob SquarePants character");
});
