import { describe, expect, it } from "vitest";
import {
  PERSONAL_DATA_AREAS,
  canExportTeacherData,
  canUsePinLock,
  isAreaBlockedOnDevice,
  isAreaPinProtected,
  type TeacherDeviceArea,
} from "./teacher-device";

const ALL: TeacherDeviceArea[] = [
  "content",
  "live",
  "classes",
  "material",
  "assignments",
  "houses",
  "settings",
];

describe("Gerätetyp des Lehrerbereichs", () => {
  it("sperrt auf der Tafel genau die Bereiche mit Personendaten", () => {
    const blocked = ALL.filter((area) => isAreaBlockedOnDevice("board", area));
    expect(blocked).toEqual(["classes", "assignments", "houses"]);
    expect(blocked).toEqual([...PERSONAL_DATA_AREAS]);
  });

  it("lässt Material, Live-Raum, Start und Einstellungen auf der Tafel offen", () => {
    for (const area of ["content", "live", "material", "settings"] as const) {
      expect(isAreaBlockedOnDevice("board", area)).toBe(false);
    }
  });

  it("sperrt auf dem eigenen Gerät und vor der Wahl nichts", () => {
    for (const area of ALL) {
      expect(isAreaBlockedOnDevice("own", area)).toBe(false);
      expect(isAreaBlockedOnDevice(null, area)).toBe(false);
    }
  });

  it("erlaubt den Datenexport nur außerhalb der Tafel", () => {
    expect(canExportTeacherData("board")).toBe(false);
    expect(canExportTeacherData("own")).toBe(true);
    expect(canExportTeacherData(null)).toBe(true);
  });

  it("bietet die PIN-Sperre nur auf dem eigenen Gerät an", () => {
    expect(canUsePinLock("own")).toBe(true);
    expect(canUsePinLock("board")).toBe(false);
    expect(canUsePinLock(null)).toBe(false);
  });

  it("schützt mit der PIN die Personenbereiche und die Einstellungen", () => {
    expect(ALL.filter(isAreaPinProtected)).toEqual([
      "classes",
      "assignments",
      "houses",
      "settings",
    ]);
  });
});
