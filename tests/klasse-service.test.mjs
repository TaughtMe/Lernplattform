import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createTeacherService, createStudentClassService } from "../src/klasse/klasse-service.ts";

let factory;

async function freshFactory() {
  await factory?.close();
  for (const area of ["teacher", "classes"]) {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS[area]);
      request.onsuccess = resolve;
      request.onerror = resolve;
      request.onblocked = resolve;
    });
  }
  factory = createIndexedDbRepositoryFactory();
  return factory;
}

test("teacher PIN: unset by default, set + unlock round-trips", async () => {
  const teacher = createTeacherService(await freshFactory());
  assert.equal(await teacher.hasPinSet(), false);
  await teacher.setPin("1234");
  assert.equal(await teacher.hasPinSet(), true);
  assert.equal(await teacher.unlockWithPin("1234"), true);
  assert.equal(await teacher.unlockWithPin("0000"), false);
});

test("teacher roster: add class + students, enrollment payload round-trips through the student service", async () => {
  const teacher = createTeacherService(await freshFactory());
  const student = createStudentClassService(factory);

  const klasse = await teacher.addClass("6b");
  const anna = await teacher.addStudent(klasse.id, "Anna");
  await teacher.addStudent(klasse.id, "Ben");
  assert.deepEqual(
    (await teacher.listStudents(klasse.id)).map((s) => s.alias).sort(),
    ["Anna", "Ben"],
  );

  const payload = await teacher.buildEnrollmentPayload(klasse, anna);
  const { encodeEnrollment } = await import("../src/klasse/roster.ts");
  const membership = await student.enroll(encodeEnrollment(payload));
  assert.equal(membership.classId, klasse.id);
  assert.equal(membership.alias, "Anna");
  assert.equal((await student.listMemberships()).length, 1);
});

test("teacher roster: removing a student drops them from the roster", async () => {
  const teacher = createTeacherService(await freshFactory());
  const klasse = await teacher.addClass("6b");
  const anna = await teacher.addStudent(klasse.id, "Anna");
  await teacher.removeStudent(anna.id);
  assert.deepEqual(await teacher.listStudents(klasse.id), []);
});

test("full submission round-trip: student enrolls, generates a code, teacher scans it and the roster status updates", async () => {
  const teacher = createTeacherService(await freshFactory());
  const student = createStudentClassService(factory);
  const { encodeEnrollment } = await import("../src/klasse/roster.ts");

  const klasse = await teacher.addClass("6b");
  const anna = await teacher.addStudent(klasse.id, "Anna");
  const ben = await teacher.addStudent(klasse.id, "Ben");
  await student.enroll(encodeEnrollment(await teacher.buildEnrollmentPayload(klasse, anna)));

  const turnus = await teacher.startTurnus(klasse.id, "Hausaufgabe 3");
  let status = await teacher.getRosterStatus(klasse.id, turnus.id);
  assert.deepEqual(
    status.map((s) => s.submitted),
    [false, false],
  );

  const code = await student.generateSubmissionCode(anna.id, turnus.id);
  const scanResult = await teacher.scanSubmission(klasse.id, turnus.id, code);
  assert.equal(scanResult.status, "abgegeben");

  status = await teacher.getRosterStatus(klasse.id, turnus.id);
  const annaStatus = status.find((s) => s.studentId === anna.id);
  const benStatus = status.find((s) => s.studentId === ben.id);
  assert.equal(annaStatus.submitted, true);
  assert.equal(benStatus.submitted, false);

  // scanning the identical code again is a harmless duplicate, not a second submission
  const rescan = await teacher.scanSubmission(klasse.id, turnus.id, code);
  assert.equal(rescan.status, "doppelt");
});

test("closeTurnus stamps closedAt; deleteTurnusLog removes the turnus and its submissions", async () => {
  const teacher = createTeacherService(await freshFactory());
  const klasse = await teacher.addClass("6b");
  const turnus = await teacher.startTurnus(klasse.id, "Hausaufgabe 3");
  await teacher.closeTurnus(turnus.id);
  assert.equal((await teacher.listTurnus(klasse.id)).find((t) => t.id === turnus.id).closedAt !== undefined, true);

  await teacher.deleteTurnusLog(turnus.id);
  assert.deepEqual(await teacher.listTurnus(klasse.id), []);
  assert.deepEqual(await teacher.getSubmissions(turnus.id), []);
});

test("upgrades a v4 database (no classes/teacher stores yet) without errors, new stores work", async () => {
  await factory?.close();
  for (const area of ["teacher", "classes"]) {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS[area]);
      request.onsuccess = resolve;
      request.onerror = resolve;
      request.onblocked = resolve;
    });
    // simulate a pre-existing v4 database with none of this phase's stores
    const legacyDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_DATA_AREAS[area], 4);
      request.onupgradeneeded = () => {};
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    legacyDb.close();
  }

  factory = createIndexedDbRepositoryFactory();
  const teacher = createTeacherService(factory);
  const student = createStudentClassService(factory);
  await teacher.addClass("6b");
  assert.equal((await teacher.listClasses()).length, 1);
  assert.deepEqual(await student.listMemberships(), []);
});
