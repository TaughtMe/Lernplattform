import assert from "node:assert/strict";
import test from "node:test";
import { signSubmission, decodeSubmission, verifySubmissionSignature } from "../src/klasse/leistungsbrief.ts";
import { base64UrlEncode } from "../src/klasse/base64url.ts";

const SECRET = base64UrlEncode(new Uint8Array(24).fill(7));
const OTHER_SECRET = base64UrlEncode(new Uint8Array(24).fill(9));

function payload(overrides = {}) {
  return { v: 1, classId: "class-1", studentId: "student-1", turnusId: "turnus-1", standNr: 1, ...overrides };
}

test("signSubmission/decodeSubmission: round-trips the payload", async () => {
  const encoded = await signSubmission(payload(), SECRET);
  const decoded = decodeSubmission(encoded);
  assert.deepEqual(decoded.payload, payload());
});

test("verifySubmissionSignature: accepts a signature made with the matching secret", async () => {
  const encoded = await signSubmission(payload(), SECRET);
  const decoded = decodeSubmission(encoded);
  assert.equal(await verifySubmissionSignature(decoded, SECRET), true);
});

test("verifySubmissionSignature: rejects a signature made with a different secret", async () => {
  const encoded = await signSubmission(payload(), SECRET);
  const decoded = decodeSubmission(encoded);
  assert.equal(await verifySubmissionSignature(decoded, OTHER_SECRET), false);
});

test("verifySubmissionSignature: rejects a payload swapped in after signing (e.g. a forged standNr with someone else's signature)", async () => {
  const genuine = await signSubmission(payload({ standNr: 1 }), SECRET);
  const forgedPayloadPart = (await signSubmission(payload({ standNr: 99 }), SECRET)).split(".")[0];
  const genuineSignaturePart = genuine.split(".")[1];
  const decoded = decodeSubmission(`${forgedPayloadPart}.${genuineSignaturePart}`);
  assert.equal(await verifySubmissionSignature(decoded, SECRET), false);
});

test("decodeSubmission: rejects malformed input", () => {
  assert.equal(decodeSubmission(""), null);
  assert.equal(decodeSubmission("no-dot-here"), null);
  assert.equal(decodeSubmission("abc."), null);
  assert.equal(decodeSubmission("!!!.sig"), null);
});

test("decodeSubmission: rejects a payload missing required fields", async () => {
  const json = JSON.stringify({ v: 1, classId: "c1" });
  const encoded = `${base64UrlEncode(new TextEncoder().encode(json))}.somesignature`;
  assert.equal(decodeSubmission(encoded), null);
});
