import assert from "node:assert/strict";
import test from "node:test";
import { signRanking, decodeRanking, verifyRankingSignature } from "../src/klasse/rankingbrief.ts";
import { base64UrlEncode } from "../src/klasse/base64url.ts";
import { ZERO_TOTALS } from "../src/klasse/ranking.ts";

const SECRET = base64UrlEncode(new Uint8Array(24).fill(3));
const OTHER_SECRET = base64UrlEncode(new Uint8Array(24).fill(5));

function payload(overrides = {}) {
  return { v: 1, classId: "class-1", studentId: "student-1", standNr: 1, totals: { ...ZERO_TOTALS, correctAnswers: 12 }, ...overrides };
}

test("signRanking/decodeRanking: round-trips the payload including totals", async () => {
  const encoded = await signRanking(payload(), SECRET);
  const decoded = decodeRanking(encoded);
  assert.deepEqual(decoded.payload, payload());
});

test("verifyRankingSignature: accepts a signature made with the matching secret", async () => {
  const encoded = await signRanking(payload(), SECRET);
  const decoded = decodeRanking(encoded);
  assert.equal(await verifyRankingSignature(decoded, SECRET), true);
});

test("verifyRankingSignature: rejects a signature made with a different secret", async () => {
  const encoded = await signRanking(payload(), SECRET);
  const decoded = decodeRanking(encoded);
  assert.equal(await verifyRankingSignature(decoded, OTHER_SECRET), false);
});

test("verifyRankingSignature: rejects a forged payload paired with someone else's signature", async () => {
  const genuine = await signRanking(payload({ totals: { ...ZERO_TOTALS, correctAnswers: 1 } }), SECRET);
  const forgedPayloadPart = (await signRanking(payload({ totals: { ...ZERO_TOTALS, correctAnswers: 999 } }), SECRET)).split(".")[0];
  const decoded = decodeRanking(`${forgedPayloadPart}.${genuine.split(".")[1]}`);
  assert.equal(await verifyRankingSignature(decoded, SECRET), false);
});

test("decodeRanking: rejects malformed input", () => {
  assert.equal(decodeRanking(""), null);
  assert.equal(decodeRanking("no-dot"), null);
  assert.equal(decodeRanking("abc."), null);
});

test("decodeRanking: rejects a payload with missing or malformed totals", async () => {
  const json = JSON.stringify({ v: 1, classId: "c1", studentId: "s1", standNr: 1, totals: { correctAnswers: 1 } });
  const encoded = `${base64UrlEncode(new TextEncoder().encode(json))}.somesignature`;
  assert.equal(decodeRanking(encoded), null);
});
