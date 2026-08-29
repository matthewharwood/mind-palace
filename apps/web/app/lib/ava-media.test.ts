import { describe, expect, test } from "bun:test";

import { AVA_YOUTUBE_CLIP_DURATION_SECONDS, buildAvaYoutubeClipUrl } from "./ava-media";

describe("buildAvaYoutubeClipUrl", () => {
  test("uses the privacy-enhanced host and a five-second range", () => {
    const url = new URL(buildAvaYoutubeClipUrl("jNQXAC9IVRw", 12));

    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(url.pathname).toBe("/embed/jNQXAC9IVRw");
    expect(url.searchParams.get("start")).toBe("12");
    expect(url.searchParams.get("end")).toBe(String(12 + AVA_YOUTUBE_CLIP_DURATION_SECONDS));
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
  });

  test("starts a five-second clip at the beginning", () => {
    const url = new URL(buildAvaYoutubeClipUrl("jNQXAC9IVRw", 0));

    expect(url.searchParams.get("start")).toBe("0");
    expect(url.searchParams.get("end")).toBe("5");
  });
});
