import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSubmission, summarizeRoster } from "../src/klasse/submission.ts";
import { signSubmission } from "../src/klasse/leistungsbrief.ts";
import { createClass, createStudent } from "../src/klasse/roster.ts";

const klasse = createClass("6b");
const anna = createStudent(klasse.id, "Anna");
const ben = createStudent(klasse.id, "Ben");
const roster = [anna, ben];
const TURNUS = "turnus-1";

async function code(student, overrides = {}) {
  return signSubmission({ v: 1, classId: klasse.id, studentId: student.id, turnusId: TURNUS, standNr: 1, ...overrides }, student.secret);
}

test("evaluateSubmission: a fresh, valid submission is 'abgegeben'", async () => {
  const result = await evaluateSubmission(await code(anna), klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "abgegeben");
  assert.equal(result.studentId, anna.id);
  assert.equal(result.alias, "Anna");
});

test("evaluateSubmission: the same standNr scanned again is 'doppelt'", async () => {
  const encoded = await code(anna);
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, { [anna.id]: 1 });
  assert.equal(result.status, "doppelt");
});

test("evaluateSubmission: a lower standNr than already on file is 'veraltet'", async () => {
  const encoded = await code(anna, { standNr: 1 });
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, { [anna.id]: 5 });
  assert.equal(result.status, "veraltet");
});

test("evaluateSubmission: a higher standNr than on file is a fresh 'abgegeben' (resubmission)", async () => {
  const encoded = await code(anna, { standNr: 3 });
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, { [anna.id]: 1 });
  assert.equal(result.status, "abgegeben");
  assert.equal(result.standNr, 3);
});

test("evaluateSubmission: garbled QR text is 'ungueltig' with reason 'format'", async () => {
  const result = await evaluateSubmission("not-a-real-code", klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "format");
});

test("evaluateSubmission: a code from a different class is 'ungueltig' with reason 'falsche_klasse'", async () => {
  const encoded = await code(anna, { classId: "other-class" });
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "falsche_klasse");
});

test("evaluateSubmission: a studentId not in this roster is 'ungueltig' with reason 'unbekannter_schueler'", async () => {
  const fremd = createStudent(klasse.id, "Fremd");
  const encoded = await signSubmission({ v: 1, classId: klasse.id, studentId: fremd.id, turnusId: TURNUS, standNr: 1 }, fremd.secret);
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "unbekannter_schueler");
});

test("evaluateSubmission: a code signed with the wrong secret is 'ungueltig' with reason 'signatur'", async () => {
  const encoded = await code(anna);
  const forgedTail = (await code(ben)).split(".")[1];
  const forged = `${encoded.split(".")[0]}.${forgedTail}`;
  const result = await evaluateSubmission(forged, klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "signatur");
});

test("evaluateSubmission: a code for a different (e.g. earlier) Turnus is 'ungueltig' with reason 'falscher_turnus'", async () => {
  const encoded = await code(anna, { turnusId: "alter-turnus" });
  const result = await evaluateSubmission(encoded, klasse.id, TURNUS, roster, {});
  assert.equal(result.status, "ungueltig");
  assert.equal(result.reason, "falscher_turnus");
});

test("summarizeRoster: marks submitted students and leaves the rest pending", () => {
  const summary = summarizeRoster(roster, new Set([anna.id]));
  assert.deepEqual(summary, [
    { studentId: anna.id, alias: "Anna", submitted: true },
    { studentId: ben.id, alias: "Ben", submitted: false },
  ]);
});
