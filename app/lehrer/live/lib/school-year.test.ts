import { describe, expect, it } from "vitest";
import { defaultSchoolYear } from "./school-year";

describe("defaultSchoolYear", () => {
  it("zählt bis Juli zum alten und ab August zum neuen Schuljahr", () => {
    expect(defaultSchoolYear(new Date(2026, 6, 31))).toBe("2025/26");
    expect(defaultSchoolYear(new Date(2026, 7, 1))).toBe("2026/27");
    expect(defaultSchoolYear(new Date(2026, 0, 15))).toBe("2025/26");
  });

  it("schreibt das Folgejahr zweistellig, auch über die Jahrhundertgrenze", () => {
    expect(defaultSchoolYear(new Date(2009, 9, 1))).toBe("2009/10");
    expect(defaultSchoolYear(new Date(2099, 9, 1))).toBe("2099/00");
  });
});
