import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createEnrollmentCode,
  createEnrollmentLink,
  type ClassMember,
  type TeacherClass,
} from "../../src/domain/class-enrollment";
import { EnrollmentQr } from "./enrollment-qr";

const course: TeacherClass = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  name: "Klasse 4a",
  teacherName: "Frau Beispiel",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary"],
  seal: {
    privateJwk: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "d" },
    publicKey: "A".repeat(122),
  },
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T10:00:00.000Z",
};
const plain: ClassMember = {
  id: "123e4567-e89b-42d3-a456-426614174002",
  classId: course.id,
  displayName: "Mia Muster",
  enrollmentToken: "0123456789abcdef0123456789abcdef",
  createdAt: "2026-08-30T10:05:00.000Z",
};
const relieved: ClassMember = {
  ...plain,
  displayName: "Ben Muster",
  writingRelief: true,
  writingReliefIssuedAt: "2026-10-02T08:00:00.000Z",
  // 64 Byte: kanonisches base64url, sonst fiele der Code auf das längere Textformat.
  writingReliefSignature: `${"B".repeat(85)}A`,
};

const link = (member: ClassMember) =>
  createEnrollmentLink(
    "https://lernraum.example",
    createEnrollmentCode(course, member),
  );

/** Kantenlänge und Modulzahl (viewBox) des gezeichneten Codes. */
function geometry(markup: string) {
  const svg = /<svg[^>]*>/.exec(markup)?.[0] ?? "";
  const attribute = (name: string) =>
    new RegExp(`\\s${name}="([^"]*)"`).exec(svg)?.[1];
  return {
    width: attribute("width"),
    height: attribute("height"),
    viewBox: attribute("viewBox"),
  };
}

describe("EnrollmentQr (B-008: gleiche Größe mit und ohne Schreiberleichterung)", () => {
  it("trägt mit Freigabe mehr Daten als ohne", () => {
    expect(link(relieved).length).toBeGreaterThan(link(plain).length + 50);
  });

  for (const variant of ["single", "sheet"] as const) {
    it(`zeichnet beide Fälle gleich groß und gleich dicht (${variant})`, () => {
      const draw = (member: ClassMember) =>
        geometry(
          renderToStaticMarkup(
            <EnrollmentQr variant={variant} value={link(member)} label="QR" />,
          ),
        );
      const withoutRelief = draw(plain);
      const withRelief = draw(relieved);
      expect(withoutRelief.width).toBeDefined();
      expect(withRelief).toEqual(withoutRelief);
    });
  }

  it("würde ohne feste Mindestversion unterschiedlich dicht", () => {
    const modules = (member: ClassMember) =>
      geometry(
        renderToStaticMarkup(<QRCodeSVG value={link(member)} size={220} />),
      ).viewBox;
    expect(modules(relieved)).not.toBe(modules(plain));
  });
});
