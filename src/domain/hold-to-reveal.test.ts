import { describe, expect, it } from "vitest";
import {
  EMPTY_HOLD,
  holdReducer,
  isHolding,
  type HoldAction,
} from "./hold-to-reveal";

function run(...actions: HoldAction[]) {
  return actions.reduce(holdReducer, EMPTY_HOLD);
}
const down = (id: number, pointerType = "touch"): HoldAction => ({
  type: "pointerdown",
  id,
  pointerType,
});
const up = (id: number): HoldAction => ({ type: "pointerup", id });
const key = (code: string, extra: Partial<HoldAction> = {}): HoldAction =>
  ({ type: "keydown", code, ...extra }) as HoldAction;

describe("hold to reveal", () => {
  it("shows with two fingers and hides when one lifts", () => {
    expect(isHolding(run(down(1)))).toBe(false);
    expect(isHolding(run(down(1), down(2)))).toBe(true);
    expect(isHolding(run(down(1), down(2), up(1)))).toBe(false);
  });
  it("keeps showing with a third finger and back to two", () => {
    const three = run(down(1), down(2), down(3));
    expect(isHolding(three)).toBe(true);
    expect(isHolding(holdReducer(three, up(3)))).toBe(true);
  });
  it("counts a cancelled contact like a lift (same action)", () => {
    expect(isHolding(run(down(1), down(2), up(2)))).toBe(false);
  });
  it("ignores the mouse and counts duplicate pointer ids once", () => {
    expect(isHolding(run(down(1, "mouse"), down(2, "mouse")))).toBe(false);
    expect(isHolding(run(down(1), down(1)))).toBe(false);
  });
  it("needs both A and L", () => {
    expect(isHolding(run(key("KeyA")))).toBe(false);
    expect(isHolding(run(key("KeyL")))).toBe(false);
    expect(isHolding(run(key("KeyA"), key("KeyL")))).toBe(true);
    expect(
      isHolding(run(key("KeyA"), key("KeyL"), { type: "keyup", code: "KeyA" })),
    ).toBe(false);
  });
  it("ignores repeats, modifiers and other keys", () => {
    expect(
      isHolding(run(key("KeyA"), key("KeyL", { repeat: true } as never))),
    ).toBe(false);
    expect(
      isHolding(run(key("KeyA"), key("KeyL", { modified: true } as never))),
    ).toBe(false);
    expect(isHolding(run(key("KeyA"), key("KeyS")))).toBe(false);
  });
  it("hides when the window loses focus", () => {
    expect(isHolding(run(key("KeyA"), key("KeyL"), { type: "blur" }))).toBe(
      false,
    );
  });
});
