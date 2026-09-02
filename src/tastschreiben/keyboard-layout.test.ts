import { describe, expect, it } from "vitest";
import {
  KEYBOARD_ROWS,
  NUMPAD_ROWS,
  lookupNumpadCharacter,
  lookupTypingCharacter,
  oppositeShiftHand,
} from "./keyboard-layout";

describe("German typing keyboard", () => {
  it("contains a complete ISO main block with correctly sized controls", () => {
    const keys = KEYBOARD_ROWS.flat();

    expect(KEYBOARD_ROWS).toHaveLength(5);
    expect(keys.map((key) => key.code)).toEqual(
      expect.arrayContaining([
        "Backspace",
        "Tab",
        "CapsLock",
        "Enter",
        "ShiftLeft",
        "ShiftRight",
        "Space",
        "AltRight",
      ]),
    );
    expect(keys.find((key) => key.code === "Space")?.width).toBeGreaterThan(6);
    expect(keys.find((key) => key.code === "Backspace")?.width).toBeGreaterThan(
      2,
    );
  });

  it("maps German letters and their shifted variants to physical keys", () => {
    expect(lookupTypingCharacter("z")).toMatchObject({
      key: { code: "KeyZ", finger: "right-index" },
      needsShift: false,
    });
    expect(lookupTypingCharacter("Ü")).toMatchObject({
      key: { code: "BracketLeft", base: "ü" },
      needsShift: true,
    });
    expect(oppositeShiftHand("A")).toBe("right");
    expect(oppositeShiftHand("J")).toBe("left");
  });

  it("provides a complete optional number pad", () => {
    expect(NUMPAD_ROWS).toHaveLength(5);
    expect(NUMPAD_ROWS.flat().map((key) => key.code)).toEqual(
      expect.arrayContaining([
        "NumLock",
        "NumpadDivide",
        "NumpadMultiply",
        "NumpadAdd",
        "NumpadEnter",
        "Numpad0",
        "NumpadDecimal",
      ]),
    );
    expect(lookupNumpadCharacter("5")?.key).toMatchObject({
      code: "Numpad5",
      home: true,
    });
  });
});
