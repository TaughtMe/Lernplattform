import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  compareHlc,
  createClock,
  formatHlc,
  isHlc,
  maxHlc,
  parseHlc,
} from "./hlc";

describe("hybrid logical clock", () => {
  it("formats marks that sort like time", () => {
    const early = formatHlc({ ms: 5, counter: 0, device: "a" });
    const late = formatHlc({ ms: 1_700_000_000_000, counter: 0, device: "a" });
    expect(compareHlc(early, late)).toBeLessThan(0);
    expect(parseHlc(late)).toEqual({
      ms: 1_700_000_000_000,
      counter: 0,
      device: "a",
    });
    expect(isHlc(late)).toBe(true);
    expect(isHlc("kaputt")).toBe(false);
    expect(() => parseHlc("kaputt")).toThrow();
  });

  it("counts up within the same millisecond and when the wall clock goes back", () => {
    const clock = createClock("a");
    const first = clock.tick(1000);
    const second = clock.tick(1000);
    const third = clock.tick(500);
    expect(compareHlc(first, second)).toBeLessThan(0);
    expect(compareHlc(second, third)).toBeLessThan(0);
    expect(parseHlc(third).ms).toBe(1000);
  });

  it("jumps ahead after seeing a remote mark from a fast clock", () => {
    const clock = createClock("slow");
    const remote = formatHlc({ ms: 9000, counter: 3, device: "fast" });
    clock.observe(remote, 1000);
    expect(compareHlc(clock.tick(1000), remote)).toBeGreaterThan(0);
  });

  it("restarts from the last stored mark", () => {
    const clock = createClock(
      "a",
      formatHlc({ ms: 7000, counter: 2, device: "a" }),
    );
    expect(clock.last()).toBe(formatHlc({ ms: 7000, counter: 2, device: "a" }));
    expect(compareHlc(clock.tick(10), clock.last() as string)).toBe(0);
    expect(createClock("b").last()).toBeUndefined();
  });

  it("always issues marks after every observed mark", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ms: fc.integer({ min: 1, max: 100 }),
            counter: fc.integer({ min: 0, max: 5 }),
            wall: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (steps) => {
          const clock = createClock("a");
          let previous = "";
          for (const step of steps) {
            const remote = formatHlc({
              ms: step.ms,
              counter: step.counter,
              device: "b",
            });
            clock.observe(remote, step.wall);
            const issued = clock.tick(step.wall);
            expect(compareHlc(issued, remote)).toBeGreaterThan(0);
            if (previous)
              expect(compareHlc(issued, previous)).toBeGreaterThan(0);
            previous = issued;
          }
        },
      ),
    );
  });

  it("picks the later of two marks", () => {
    const a = formatHlc({ ms: 1, counter: 0, device: "a" });
    const b = formatHlc({ ms: 2, counter: 0, device: "a" });
    expect(maxHlc(a, b)).toBe(b);
    expect(maxHlc(undefined, a)).toBe(a);
    expect(maxHlc(a, undefined)).toBe(a);
  });
});
