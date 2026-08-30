import { expect, test } from "bun:test";

import { RemoteWriteMessageSchema } from "./persist";

test("remote write messages validate at the BroadcastChannel boundary", () => {
  expect(
    RemoteWriteMessageSchema.parse({ store: "avaFirstWordsSession", key: "ava-first-words" }),
  ).toEqual({ store: "avaFirstWordsSession", key: "ava-first-words" });
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "unknown", key: "ava-first-words" }).success,
  ).toBeFalse();
  expect(
    RemoteWriteMessageSchema.safeParse({ store: "avaFirstWordsSession", key: "" }).success,
  ).toBeFalse();
});
