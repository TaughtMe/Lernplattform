import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CREDENTIAL_DATABASE } from "../integrations/cloud-sync/credentials";
import { TEXTBOX_LAYOUT_KEY } from "../../app/components/use-textbox-layout";
import {
  STUDENT_DATABASES,
  STUDENT_LOCAL_KEYS,
  STUDENT_SESSION_PREFIXES,
  clearStudentData,
} from "./clear-student-data";
import { GUEST_MODE_KEY } from "./guest-mode";
import { LEARNER_PROFILE_KEY } from "./learner-profile";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";
import { PersonalLearningDatabase } from "./personal-learning-events";
import { StudentClassesDatabase } from "./student-classes";
import { TeacherClassDatabase } from "./teacher-class-settings";

const teacherClass = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  name: "7b",
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  enabledModules: ["lernbox"],
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
} as never;

async function seedStudent() {
  const personal = new PersonalLearningDatabase();
  await personal.learningBoxCards.put({ id: "karte" } as never);
  await personal.learningEvents.put({ id: "ereignis" } as never);
  await personal.backupRecovery.put({ id: "rettung" } as never);
  const classes = new StudentClassesDatabase();
  await classes.memberships.put({ membershipId: "kind" } as never);
  return { personal, classes };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(async () => {
  for (const name of [...STUDENT_DATABASES, LOCAL_DATA_AREAS.teacher]) {
    await Dexie.delete(name);
  }
});

describe("clearStudentData", () => {
  it("leert die Schülertabellen und lässt die Lehrerdatenbank unverändert", async () => {
    const { personal, classes } = await seedStudent();
    const teacher = new TeacherClassDatabase();
    await teacher.classes.put(teacherClass);
    await teacher.profiles.put({ id: "lehrkraft" } as never);

    const result = await clearStudentData();

    expect(result).toEqual({ complete: true, failed: [] });
    // Die Datenbanken sind weg; die Lehrerdatenbank besteht mit allen Zeilen.
    expect(await Dexie.exists(LOCAL_DATA_AREAS.personal)).toBe(false);
    expect(await Dexie.exists(LOCAL_DATA_AREAS.classes)).toBe(false);
    expect(await Dexie.exists(LOCAL_DATA_AREAS.teacher)).toBe(true);
    // Offene Verbindungen der Seite sehen leere Tabellen (und legen sie neu an).
    expect(await personal.learningBoxCards.count()).toBe(0);
    expect(await personal.learningEvents.count()).toBe(0);
    expect(await personal.backupRecovery.count()).toBe(0);
    expect(await classes.memberships.count()).toBe(0);
    const reopened = new TeacherClassDatabase();
    expect(await reopened.classes.toArray()).toEqual([teacherClass]);
    expect(await reopened.profiles.count()).toBe(1);
    reopened.close();
    teacher.close();
  });

  it("entfernt die Einträge des Kindes und behält die der Lehrkraft", async () => {
    for (const key of STUDENT_LOCAL_KEYS) localStorage.setItem(key, "x");
    localStorage.setItem(GUEST_MODE_KEY, "{}");
    localStorage.setItem("lernraum:cloud-sync", "lehrer");
    localStorage.setItem("lernraum:cloud-sync:tokens", "lehrer");
    localStorage.setItem("lernraum:lehrer:freigaben", "lehrer");
    localStorage.setItem("lernraum:install-hint:v1:browser-ok", "1");
    sessionStorage.setItem("lernraum-live-resume", "1234");
    sessionStorage.setItem("lernraum-live-room-identity:1234", "{}");
    sessionStorage.setItem("lernraum-active-room", "{}");
    sessionStorage.setItem("lernraum:live-trace:abc", "{}");
    sessionStorage.setItem("lernraum-teacher-live-room", "lehrer");
    sessionStorage.setItem("lernraum.teacher-live-intent", "lehrer");
    sessionStorage.setItem("lernraum:cloud-setup:provider", "lehrer");

    const result = await clearStudentData();

    expect(result.complete).toBe(true);
    const remainingLocal = Object.keys(localStorage).sort();
    expect(remainingLocal).toEqual([
      "lernraum:cloud-sync",
      "lernraum:cloud-sync:tokens",
      "lernraum:install-hint:v1:browser-ok",
      "lernraum:lehrer:freigaben",
    ]);
    expect(Object.keys(sessionStorage).sort()).toEqual([
      "lernraum-teacher-live-room",
      "lernraum.teacher-live-intent",
      "lernraum:cloud-setup:provider",
    ]);
  });

  it("funktioniert auch auf einem leeren Gerät", async () => {
    expect(await clearStudentData()).toEqual({ complete: true, failed: [] });
    expect(await Dexie.exists(LOCAL_DATA_AREAS.personal)).toBe(false);
  });

  it("behält den Gastzustand, wenn etwas nicht gelöscht werden konnte", async () => {
    localStorage.setItem(GUEST_MODE_KEY, "{}");
    const broken = {
      length: 1,
      key: () => {
        throw new Error("gesperrt");
      },
      getItem: () => null,
      removeItem: () => undefined,
    } as unknown as Storage;
    const result = await clearStudentData({ session: broken });
    expect(result).toEqual({ complete: false, failed: ["sessionStorage"] });
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBe("{}");
  });
});

describe("Liste der Ziele", () => {
  it("enthält weder Lehrerdatenbank noch Lehrer-Schlüssel", () => {
    expect(STUDENT_DATABASES).not.toContain(LOCAL_DATA_AREAS.teacher);
    expect(STUDENT_DATABASES).not.toContain(CREDENTIAL_DATABASE);
    expect(STUDENT_DATABASES).toContain(LOCAL_DATA_AREAS.personal);
    expect(STUDENT_DATABASES).toContain(LOCAL_DATA_AREAS.classes);
  });

  it("stimmt mit den Schlüsseln der App überein", () => {
    expect(STUDENT_LOCAL_KEYS).toContain(LEARNER_PROFILE_KEY);
    expect(STUDENT_LOCAL_KEYS).toContain(TEXTBOX_LAYOUT_KEY);
  });

  it("trifft keinen Sitzungsschlüssel der Lehrkraft", () => {
    for (const key of [
      "lernraum-teacher-live-room",
      "lernraum.teacher-live-intent",
    ]) {
      expect(
        STUDENT_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix)),
      ).toBe(false);
    }
  });
});
