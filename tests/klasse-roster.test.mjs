import assert from "node:assert/strict";
import test from "node:test";
import { createClass, createStudent, encodeEnrollment, decodeEnrollment } from "../src/klasse/roster.ts";

test("createClass/createStudent: produce unique ids", () => {
  const klasse = createClass("6b");
  const a = createStudent(klasse.id, "Fuchs");
  const b = createStudent(klasse.id, "Igel");
  assert.notEqual(a.id, b.id);
  assert.equal(a.classId, klasse.id);
  assert.equal(a.displayName, undefined);
});

test("createStudent: each student gets its own random secret", () => {
  const klasse = createClass("6b");
  const a = createStudent(klasse.id, "Fuchs");
  const b = createStudent(klasse.id, "Igel");
  assert.notEqual(a.secret, b.secret);
  assert.ok(a.secret.length > 0);
});

test("encodeEnrollment/decodeEnrollment: round-trips a valid payload", () => {
  const payload = { v: 1, classId: "c1", className: "6b", studentId: "s1", alias: "Fuchs", secret: "abc123" };
  const decoded = decodeEnrollment(encodeEnrollment(payload));
  assert.deepEqual(decoded, payload);
});

test("encodeEnrollment: survives umlauts and special characters in alias/className", () => {
  const payload = { v: 1, classId: "c1", className: "Übungsklasse 6ä", studentId: "s1", alias: "Äffchen", secret: "abc123" };
  const decoded = decodeEnrollment(encodeEnrollment(payload));
  assert.deepEqual(decoded, payload);
});

test("decodeEnrollment: rejects garbage input", () => {
  assert.equal(decodeEnrollment("not-valid-base64url!!!"), null);
  assert.equal(decodeEnrollment(""), null);
});

test("decodeEnrollment: rejects a well-formed but incomplete payload", () => {
  const encoded = Buffer.from(JSON.stringify({ v: 1, classId: "c1" })).toString("base64url");
  assert.equal(decodeEnrollment(encoded), null);
});
