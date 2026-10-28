import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_TIME_IDLE_LIMIT_MS,
  activeMs,
  activeTimeOf,
  activeTimeStatus,
  reduceActiveTime,
  startActiveTime,
  type ActiveTimeEvent,
} from "./active-time";

const START = 1_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe("aktive Zeit", () => {
  it("zählt vom Start bis zur Eingabe, solange die Pausen kurz sind", () => {
    const state = activeTimeOf(START, [
      { type: "input", at: START + 20 * SECOND },
      { type: "input", at: START + 50 * SECOND },
      { type: "tick", at: START + 60 * SECOND },
    ]);
    expect(activeMs(state)).toBe(60 * SECOND);
    expect(activeTimeStatus(state)).toBe("running");
  });

  it("zählt nach genau 3 Minuten ohne Eingabe noch, danach nicht mehr", () => {
    const limit = ACTIVE_TIME_IDLE_LIMIT_MS;
    expect(limit).toBe(3 * MINUTE);
    const at = activeTimeOf(START, [{ type: "tick", at: START + limit }]);
    expect(activeMs(at)).toBe(limit);
    expect(activeTimeStatus(at)).toBe("running");

    const after = activeTimeOf(START, [
      { type: "tick", at: START + limit + 1 },
    ]);
    expect(activeMs(after)).toBe(0);
    expect(activeTimeStatus(after)).toBe("idle");
  });

  it("zählt die Zeit seit der letzten Eingabe nicht, wenn die Uhr pausiert hat", () => {
    const state = activeTimeOf(START, [
      { type: "input", at: START + 30 * SECOND },
      // 5 Minuten Pause: die 5 Minuten zählen nicht.
      { type: "input", at: START + 30 * SECOND + 5 * MINUTE },
      { type: "input", at: START + 30 * SECOND + 5 * MINUTE + 10 * SECOND },
    ]);
    expect(activeMs(state)).toBe(30 * SECOND + 10 * SECOND);
    expect(activeTimeStatus(state)).toBe("running");
  });

  it("pausiert sofort, wenn die Seite verdeckt wird", () => {
    const hidden = activeTimeOf(START, [
      { type: "input", at: START + 20 * SECOND },
      { type: "hidden", at: START + 30 * SECOND },
      { type: "tick", at: START + 90 * SECOND },
    ]);
    expect(activeMs(hidden)).toBe(30 * SECOND);
    expect(activeTimeStatus(hidden)).toBe("hidden");
  });

  it("läuft nach dem Zurückkommen weiter", () => {
    const state = activeTimeOf(START, [
      { type: "hidden", at: START + 30 * SECOND },
      { type: "visible", at: START + 10 * MINUTE },
      { type: "input", at: START + 10 * MINUTE + 5 * SECOND },
    ]);
    expect(activeMs(state)).toBe(35 * SECOND);
    expect(activeTimeStatus(state)).toBe("running");
  });

  it("zählt die Zeit nicht, die vor dem Verdecken schon mehr als 3 Minuten still war", () => {
    const state = activeTimeOf(START, [
      { type: "input", at: START + 10 * SECOND },
      { type: "hidden", at: START + 10 * SECOND + 4 * MINUTE },
    ]);
    expect(activeMs(state)).toBe(10 * SECOND);
  });

  it("ignoriert Eingaben und Ticks bei verdeckter Seite", () => {
    const state = activeTimeOf(START, [
      { type: "hidden", at: START + 10 * SECOND },
      { type: "input", at: START + 20 * SECOND },
      { type: "tick", at: START + 30 * SECOND },
      { type: "hidden", at: START + 40 * SECOND },
    ]);
    expect(activeMs(state)).toBe(10 * SECOND);
    expect(activeTimeStatus(state)).toBe("hidden");
  });

  it("ein zweites Sichtbar-Ereignis ändert nichts", () => {
    const state = activeTimeOf(START, [
      { type: "visible", at: START + 5 * SECOND },
      { type: "tick", at: START + 8 * SECOND },
    ]);
    expect(activeMs(state)).toBe(8 * SECOND);
  });

  it("hebt eine rückwärts laufende Zeit auf den letzten Stand", () => {
    const state = activeTimeOf(START, [
      { type: "input", at: START + 20 * SECOND },
      { type: "input", at: START + 5 * SECOND },
    ]);
    expect(state.now).toBe(START + 20 * SECOND);
    expect(activeMs(state)).toBe(20 * SECOND);
  });

  it("ändert den übergebenen Stand nicht", () => {
    const start = startActiveTime(START);
    const copy = { ...start };
    reduceActiveTime(start, { type: "input", at: START + SECOND });
    expect(start).toEqual(copy);
  });
});

const eventArbitrary = fc.record({
  type: fc.constantFrom<ActiveTimeEvent["type"]>(
    "input",
    "hidden",
    "visible",
    "tick",
  ),
  // Abstand zum vorigen Ereignis: von sofort bis über das Pausenlimit hinaus.
  delta: fc.oneof(
    fc.integer({ min: 0, max: 5 * SECOND }),
    fc.integer({ min: 0, max: 10 * MINUTE }),
  ),
});

function timeline(
  steps: ReadonlyArray<{ type: ActiveTimeEvent["type"]; delta: number }>,
): ActiveTimeEvent[] {
  let at = START;
  return steps.map(({ type, delta }) => {
    at += delta;
    return { type, at };
  });
}

describe("aktive Zeit (Eigenschaften)", () => {
  it("ist nie größer als die Wandzeit und nie negativ", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 60 }), (steps) => {
        const events = timeline(steps);
        const state = activeTimeOf(START, events);
        expect(activeMs(state)).toBeGreaterThanOrEqual(0);
        expect(activeMs(state)).toBeLessThanOrEqual(state.now - START);
      }),
    );
  });

  it("die gesicherte Zeit wächst nur", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 60 }), (steps) => {
        let state = startActiveTime(START);
        let before = 0;
        for (const event of timeline(steps)) {
          state = reduceActiveTime(state, event);
          expect(state.committedMs).toBeGreaterThanOrEqual(before);
          before = state.committedMs;
        }
      }),
    );
  });

  it("die Anzeige wächst, solange die Uhr läuft und niemand pausiert", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: ACTIVE_TIME_IDLE_LIMIT_MS }), {
          maxLength: 40,
        }),
        (deltas) => {
          let state = startActiveTime(START);
          let at = START;
          let before = 0;
          for (const delta of deltas) {
            at += delta;
            state = reduceActiveTime(state, { type: "input", at });
            expect(activeMs(state)).toBeGreaterThanOrEqual(before);
            before = activeMs(state);
          }
          // Ohne Pause über das Limit entspricht die aktive Zeit der Wandzeit.
          expect(activeMs(state)).toBe(at - START);
        },
      ),
    );
  });

  it("zählt bei verdeckter Seite nichts, egal wie viel Zeit vergeht", () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { maxLength: 30 }),
        fc.integer({ min: 0, max: 60 * MINUTE }),
        (steps, wait) => {
          const state = activeTimeOf(START, [
            ...timeline(steps),
            { type: "hidden", at: START + 3 * 60 * MINUTE },
          ]);
          const later = reduceActiveTime(state, {
            type: "tick",
            at: state.now + wait,
          });
          expect(activeMs(later)).toBe(activeMs(state));
        },
      ),
    );
  });

  it("eine Pause über das Limit lässt die aktive Zeit nicht wachsen", () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { maxLength: 30 }),
        fc.integer({ min: 1, max: 60 * MINUTE }),
        (steps, extra) => {
          const state = activeTimeOf(START, timeline(steps));
          if (state.lastInputAt === null) return;
          const quiet = reduceActiveTime(state, {
            type: "tick",
            at: state.lastInputAt + ACTIVE_TIME_IDLE_LIMIT_MS + extra,
          });
          const back = reduceActiveTime(quiet, {
            type: "input",
            at: quiet.now,
          });
          expect(activeMs(back)).toBe(state.committedMs);
        },
      ),
    );
  });
});
