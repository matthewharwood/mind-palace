import { describe, expect, test } from "bun:test";

import { DropTargetStateSchema } from "../card/schema";
import { CardSlotPropsSchema } from "./schema";

describe("DropTargetStateSchema", () => {
  test("accepts the feedback states and rejects unknowns", () => {
    for (const s of DropTargetStateSchema.options) {
      expect(DropTargetStateSchema.parse(s)).toBe(s);
    }
    expect(() => DropTargetStateSchema.parse("sparkling")).toThrow();
  });
});

describe("CardSlotPropsSchema", () => {
  test("requires a non-empty slotId", () => {
    expect(CardSlotPropsSchema.parse({ slotId: "slot-1" }).slotId).toBe("slot-1");
    expect(() => CardSlotPropsSchema.parse({ slotId: "" })).toThrow();
    expect(() => CardSlotPropsSchema.parse({})).toThrow();
  });

  test("validates optional enum + flag props when present", () => {
    const parsed = CardSlotPropsSchema.parse({
      slotId: "s",
      shape: "hex",
      size: "lg",
      state: "overSwap",
      locked: true,
    });
    expect(parsed.shape).toBe("hex");
    expect(parsed.state).toBe("overSwap");
    expect(() => CardSlotPropsSchema.parse({ slotId: "s", state: "glowing" })).toThrow();
  });
});
