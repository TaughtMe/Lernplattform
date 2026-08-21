import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRankingSubmission } from "../src/klasse/ranking-submission.ts";
import { signRanking } from "../src/klasse/rankingbrief.ts";
import { createClass, createStudent } from "../src/klasse/roster.ts";
import { ZERO_TOTALS } from "../src/klasse/ranking.ts";

const klasse = createClass("6b");
const anna = createStudent(klasse.id, "Anna");
const ben = createStudent(klasse.id, "Ben");
const roster = [anna, ben];

async function code(student, overrides = {}) {
  return signRanking({ v: 1, classId: klasse.id, studentId: student.id, standNr: 1, totals: { ...ZERO_TOTALS, correctAnswers: 5 }, ...overrides }, student.secret);
}

test("evaluateRankingSubmission: a fresh, valid contribution is 'abgegeben' and carries the totals", async () => {
  const result = await evaluateRankingSubmission(await code(anna), klasse.id, roster, {});
  assert.equal(result.status, "abgegeben");
  assert.equal(result.studentId, anna.id);
  assert.equal(result.totals.correctAnswers, 5);
});

test("evaluateRankingSubmission: the same standNr again is 'doppelt'", async () => {
  const encoded = await code(anna);
  const result = await evaluateRankingSubmission(encoded, klasse.id, roster, { [anna.id]: 1 });
  assert.equal(result.status, "doppelt");
});

test("evaluateRankingSubmission: a lower standNr than on file is 'veraltet'", async () => {
  const encoded = await code(anna, { standNr: 1 });
  const result = await evaluateRankingSubmission(encoded, klasse.id, roster, { [anna.id]: 5 });
  assert.equal(result.status, "veraltet");
});

test("evaluateRankingSubmission: a higher standNr is a fresh 'abgegeben'", async () => {
  const encoded = await code(anna, { standNr: 3 });
  const result = await evaluateRankingSubmission(encoded, klasse.id, roster, { [anna.id]: 1 });
  assert.equal(result.status, "abgegeben");
});

test("evaluateRankingSubmission: garbled input is 'ungueltig' with reason 'format'", async () => {
  const result = await evaluateRankingSubmission("garbage", klasse.id, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "format");
});

test("evaluateRankingSubmission: wrong class is 'ungueltig' with reason 'falsche_klasse'", async () => {
  const encoded = await code(anna, { classId: "other-class" });
  const result = await evaluateRankingSubmission(encoded, klasse.id, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "falsche_klasse");
});

test("evaluateRankingSubmission: unknown student is 'ungueltig' with reason 'unbekannter_schueler'", async () => {
  const fremd = createStudent(klasse.id, "Fremd");
  const encoded = await signRanking({ v: 1, classId: klasse.id, studentId: fremd.id, standNr: 1, totals: ZERO_TOTALS }, fremd.secret);
  const result = await evaluateRankingSubmission(encoded, klasse.id, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "unbekannter_schueler");
});

test("evaluateRankingSubmission: wrong secret is 'ungueltig' with reason 'signatur'", async () => {
  const encoded = await code(anna);
  const forgedTail = (await code(ben)).split(".")[1];
  const forged = `${encoded.split(".")[0]}.${forgedTail}`;
  const result = await evaluateRankingSubmission(forged, klasse.id, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "signatur");
});
