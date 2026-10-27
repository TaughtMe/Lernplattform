import { beforeEach, describe, expect, it } from "vitest";
import {
  TEACHER_DEVICE_KEY,
  parseTeacherDevice,
  readTeacherDevice,
  readTeacherDeviceType,
  saveTeacherDevice,
  teacherDeviceSnapshot,
} from "./teacher-device";

const chosen = new Date("2026-10-27T08:00:00.000Z");

beforeEach(() => localStorage.clear());

describe("Gerätetyp des Lehrerbereichs", () => {
  it("ist anfangs nicht gewählt; für den Abgleich gilt „Mein Gerät“", () => {
    expect(readTeacherDevice()).toBeNull();
    expect(readTeacherDeviceType()).toBe("own");
  });

  it("wird gespeichert und wieder gelesen", () => {
    expect(saveTeacherDevice("board", chosen)).toBe(true);
    expect(readTeacherDevice()).toEqual({
      v: 1,
      type: "board",
      chosenAt: "2026-10-27T08:00:00.000Z",
    });
    expect(readTeacherDeviceType()).toBe("board");
    expect(teacherDeviceSnapshot()).toBe(
      localStorage.getItem(TEACHER_DEVICE_KEY),
    );
  });

  it("überschreibt die frühere Wahl", () => {
    saveTeacherDevice("board", chosen);
    saveTeacherDevice("own", chosen);
    expect(readTeacherDeviceType()).toBe("own");
  });

  it("liest Kaputtes und Fremdes als „nicht gewählt“", () => {
    for (const raw of [
      "",
      "kein json",
      "null",
      "[]",
      '{"v":2,"type":"board","chosenAt":"2026-10-27T08:00:00.000Z"}',
      '{"v":1,"type":"tafel","chosenAt":"2026-10-27T08:00:00.000Z"}',
      '{"v":1,"type":"board","chosenAt":"gestern"}',
    ]) {
      expect(parseTeacherDevice(raw), raw).toBeNull();
    }
  });

  it("übersteht einen gesperrten Speicher", () => {
    const broken = () => {
      throw new Error("gesperrt");
    };
    expect(readTeacherDevice(broken)).toBeNull();
    expect(teacherDeviceSnapshot(broken)).toBeNull();
    expect(saveTeacherDevice("board", chosen, broken)).toBe(false);
  });
});
