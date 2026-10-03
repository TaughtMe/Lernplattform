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
        enabledModules: ["vocabulary"],
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

  it("still accepts the former compact c2 payload without module metadata", () => {
    const current = createEnrollmentCode(course, member);
    const encoded = current.slice("lernraum:c2:".length);
    const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
    const payload = JSON.parse(
      atob(encoded.replaceAll("-", "+").replaceAll("_", "/") + padding),
    ) as unknown[];
    payload.pop();
    const legacy = `lernraum:c2:${btoa(JSON.stringify(payload))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "")}`;

    expect(parseEnrollmentCode(legacy)).not.toHaveProperty("enabledModules");
  });

  describe("Klassenstempel im Einschreibe-QR", () => {
    const publicKey = "A".repeat(122);
    const signature = "B".repeat(86);
    const sealed: TeacherClass = {
      ...course,
      seal: {
        privateJwk: {
          kty: "EC",
          crv: "P-256",
          x: "x",
          y: "y",
          d: "d",
        },
        publicKey,
      },
    };
    const relieved: ClassMember = {
      ...member,
      writingRelief: true,
      writingReliefIssuedAt: "2026-10-02T08:00:00.000Z",
      writingReliefSignature: signature,
    };

    it("trägt Schlüssel, Freigabe und Signatur im zehnten Element", () => {
      const parsed = parseEnrollmentCode(
        createEnrollmentCode(sealed, relieved),
      );
      expect(parsed).toMatchObject({
        sealPublicKey: publicKey,
        writingReliefSignature: signature,
        writingReliefGrant: {
          v: 1,
          classId: course.id,
          membershipId: member.id,
          writingRelief: true,
          issuedAt: "2026-10-02T08:00:00.000Z",
        },
      });
    });

    it("trägt ohne Haken nur den Schlüssel, so entzieht ein neuer QR die Freigabe", () => {
      const parsed = parseEnrollmentCode(createEnrollmentCode(sealed, member));
      expect(parsed.sealPublicKey).toBe(publicKey);
      expect(parsed).not.toHaveProperty("writingReliefGrant");
      expect(parsed).not.toHaveProperty("writingReliefSignature");
    });

    it("lässt das Tupel ohne Klassenstempel bei neun Elementen (alte QR-Codes)", () => {
      const code = createEnrollmentCode(course, relieved);
      const encoded = code.slice("lernraum:c2:".length);
      const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
      const payload = JSON.parse(
        atob(encoded.replaceAll("-", "+").replaceAll("_", "/") + padding),
      ) as unknown[];
      expect(payload).toHaveLength(9);
      expect(parseEnrollmentCode(code)).not.toHaveProperty("sealPublicKey");
    });

    it("bleibt für den echten QR-Code unter einer lesbaren Länge", () => {
      const code = createEnrollmentCode(sealed, relieved);
      const link = createEnrollmentLink("https://lernraum.example", code);
      expect(link.length).toBeLessThan(900);
    });

    it("lehnt ein kaputtes zehntes Element ab", () => {
      const encode = (value: unknown) =>
        `lernraum:c2:${btoa(JSON.stringify(value))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replace(/=+$/, "")}`;
      const base = [
        course.id,
        member.id,
        course.name,
        course.teacherName,
        course.schoolYear,
        member.displayName,
        member.enrollmentToken,
        member.createdAt,
        course.enabledModules,
      ];
      expect(() =>
        parseEnrollmentCode(encode([...base, { k: "***", g: null, s: null }])),
      ).toThrow();
      // Nur eine Hälfte der Freigabe gilt als keine Freigabe.
      expect(
        parseEnrollmentCode(
          encode([
            ...base,
            { k: publicKey, g: "2026-10-02T08:00:00.000Z", s: null },
          ]),
        ),
      ).not.toHaveProperty("writingReliefGrant");
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
