import { describe, expect, it } from "vitest";
import {
  CLASS_ENROLLMENT_PATH,
  createClassRemovalCode,
  createClassRemovalLink,
  createEnrollmentCode,
  createEnrollmentLink,
  parseClassRemovalCode,
  parseClassRemovalLink,
  parseEnrollmentCode,
  parseEnrollmentLink,
  type ClassMember,
  type TeacherClass,
} from "./class-enrollment";

const course: TeacherClass = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  name: "Klasse 7b",
  teacherName: "Frau Beispiel",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary"],
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T10:00:00.000Z",
};

const member: ClassMember = {
  id: "123e4567-e89b-42d3-a456-426614174002",
  classId: course.id,
  displayName: "Léa",
  enrollmentToken: "0123456789abcdef0123456789abcdef",
  createdAt: "2026-08-30T10:05:00.000Z",
};

describe("class enrollment links", () => {
  it("opens the Lernraum class page and keeps the enrollment code in the fragment", () => {
    const code = createEnrollmentCode(course, member);
    const link = createEnrollmentLink("https://lernraum.example/start", code);
    const url = new URL(link);

    expect(url.origin).toBe("https://lernraum.example");
    expect(url.pathname).toBe(CLASS_ENROLLMENT_PATH);
    expect(url.search).toBe("");
    expect(parseEnrollmentLink(link)).toEqual({
      code,
      enrollment: expect.objectContaining({
        className: "Klasse 7b",
        displayName: "Léa",
      }),
    });
    expect(code.length).toBeLessThan(300);
  });

  it("rejects links outside the enrollment page and non-web origins", () => {
    const code = createEnrollmentCode(course, member);
    expect(() =>
      parseEnrollmentLink(
        `https://lernraum.example/lernen#beitreten=${encodeURIComponent(code)}`,
      ),
    ).toThrow("Kein gültiger Lernraum-Einschreibungslink");
    expect(() => createEnrollmentLink("ftp://lernraum.example", code)).toThrow(
      "Lernraum-Webadresse",
    );
  });

  it("creates a compact class-removal link", () => {
    const code = createClassRemovalCode(course.id);
    const link = createClassRemovalLink("https://lernraum.example", course.id);

    expect(parseClassRemovalCode(code)).toBe(course.id);
    expect(parseClassRemovalLink(link)).toEqual({ code, classId: course.id });
  });

  it("still accepts the versioned legacy class payload", () => {
    const legacy = `lernraum:class:${JSON.stringify({
      version: 1,
      classId: course.id,
      membershipId: member.id,
      className: course.name,
      teacherName: course.teacherName,
      schoolYear: course.schoolYear,
      displayName: member.displayName,
      enrollmentToken: member.enrollmentToken,
      issuedAt: member.createdAt,
    })}`;

    expect(parseEnrollmentCode(legacy)).toMatchObject({
      classId: course.id,
      membershipId: member.id,
      displayName: "Léa",
    });
  });

  it("rejects malformed class-removal codes and links", () => {
    expect(() => parseClassRemovalCode("kein-code")).toThrow(
      "Kein gültiger Lernraum-Entfernungscode",
    );
    expect(() =>
      createClassRemovalLink("ftp://lernraum.example", course.id),
    ).toThrow("Entfernungscode");
    expect(() =>
      parseClassRemovalLink("https://lernraum.example/falsch"),
    ).toThrow("Kein gültiger Lernraum-Entfernungslink");
    expect(() =>
      parseClassRemovalLink("https://lernraum.example/lernen/klasse"),
    ).toThrow("enthält keinen Code");
  });
});
