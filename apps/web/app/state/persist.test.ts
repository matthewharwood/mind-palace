import { expect, test } from "bun:test";

import { RemoteWriteMessageSchema } from "./persist";

test("remote write messages validate at the BroadcastChannel boundary", () => {
  expect(
    RemoteWriteMessageSchema.parse({ store: "characterPartySession", key: "character-party" }),
  ).toEqual({ store: "characterPartySession", key: "character-party" });
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "unknown", key: "character-party" }).success,
  ).toBeFalse();
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "characterPartySession", key: "" }).success,
  ).toBeFalse();
});
