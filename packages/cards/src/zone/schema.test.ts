import { describe, expect, test } from "bun:test";

import { DropZonePropsSchema } from "./schema";

describe("DropZonePropsSchema", () => {
  test("requires a non-empty zoneId", () => {
    expect(DropZonePropsSchema.parse({ zoneId: "discard" }).zoneId).toBe("discard");
    expect(() => DropZonePropsSchema.parse({ zoneId: "" })).toThrow();
  });

  test("validates state + accepts when present", () => {
    const parsed = DropZonePropsSchema.parse({ zoneId: "z", state: "overValid", accepts: "gas" });
    expect(parsed.state).toBe("overValid");
    expect(parsed.accepts).toBe("gas");
    expect(() => DropZonePropsSchema.parse({ zoneId: "z", state: "nope" })).toThrow();
  });
});
