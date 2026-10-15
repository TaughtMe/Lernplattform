import { describe, expect, it } from "vitest";
import {
  ROOM_CLOSING_NOTICE_MINUTES,
  ROOM_JOIN_WINDOW_MINUTES,
  ROOM_MAX_MINUTES,
  roomTimeState,
  roomTimeline,
} from "./room-limits";

const opened = new Date("2026-10-13T08:00:00.000Z");
const minutesAfter = (minutes: number, extraMs = 0) =>
  new Date(opened.getTime() + minutes * 60_000 + extraMs);

describe("Zeitgrenzen eines Live-Raums", () => {
  it("hält die vereinbarten Werte (Entscheidung 52)", () => {
    expect(ROOM_JOIN_WINDOW_MINUTES).toBe(90);
    expect(ROOM_CLOSING_NOTICE_MINUTES).toBe(110);
    expect(ROOM_MAX_MINUTES).toBe(120);
  });

  it("berechnet Beitrittsfrist, Schließ-Hinweis und Ende ab dem Öffnen", () => {
    expect(roomTimeline(opened)).toEqual({
      joinUntil: minutesAfter(90),
      closingNoticeAt: minutesAfter(110),
      closesAt: minutesAfter(120),
    });
  });

  it("wechselt die Phase genau an den Grenzen", () => {
    expect(roomTimeState(opened, opened)).toBe("open");
    expect(roomTimeState(opened, minutesAfter(90, -1))).toBe("open");
    expect(roomTimeState(opened, minutesAfter(90))).toBe("join-closed");
    expect(roomTimeState(opened, minutesAfter(110, -1))).toBe("join-closed");
    expect(roomTimeState(opened, minutesAfter(110))).toBe("closing-soon");
    expect(roomTimeState(opened, minutesAfter(120, -1))).toBe("closing-soon");
    expect(roomTimeState(opened, minutesAfter(120))).toBe("closed");
    expect(roomTimeState(opened, minutesAfter(600))).toBe("closed");
  });
});
