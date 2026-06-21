import { describe, expect, test } from "bun:test";

import {
  CardPropsSchema,
  CardShapeSchema,
  CardSizeSchema,
  CardStateSchema,
  DropIntentSchema,
} from "./schema";

describe("enum schemas", () => {
  test("accept valid members and reject unknowns", () => {
    expect(CardShapeSchema.parse("hex")).toBe("hex");
    expect(CardSizeSchema.parse("lg")).toBe("lg");
    expect(CardStateSchema.parse("overValid")).toBe("overValid");
    expect(() => CardShapeSchema.parse("triangle")).toThrow();
    expect(() => CardSizeSchema.parse("xl")).toThrow();
    expect(() => CardStateSchema.parse("wiggling")).toThrow();
  });
});

describe("DropIntentSchema", () => {
  test("'none' carries no zone", () => {
    expect(DropIntentSchema.parse({ kind: "none" })).toEqual({ kind: "none" });
  });

  test("targeted intents require a targetId", () => {
    expect(DropIntentSchema.parse({ kind: "swap", targetId: "slot-1" })).toEqual({
      kind: "swap",
      targetId: "slot-1",
    });
    expect(() => DropIntentSchema.parse({ kind: "drop" })).toThrow();
    expect(() => DropIntentSchema.parse({ kind: "teleport", targetId: "x" })).toThrow();
  });
});

describe("CardPropsSchema", () => {
  test("requires nothing but front and leaves optionals absent", () => {
    const parsed = CardPropsSchema.parse({ front: "Au" });
    expect(parsed.front).toBe("Au");
    expect(parsed.shape).toBeUndefined();
    expect(parsed.size).toBeUndefined();
  });

  test("validates enum-typed props when provided", () => {
    expect(CardPropsSchema.parse({ front: "Au", shape: "circle", size: "sm" }).shape).toBe(
      "circle",
    );
    expect(() => CardPropsSchema.parse({ front: "Au", shape: "blob" })).toThrow();
  });
});
