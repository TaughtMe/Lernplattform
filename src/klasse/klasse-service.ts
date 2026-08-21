import type { LocalRepositoryFactory } from "../storage/local-data-boundaries.ts";
import { hashPin, verifyPin, type StoredPin } from "./teacher-auth.ts";
import { createClass, createStudent, decodeEnrollment, type ClassV1, type StudentV1, type EnrollmentPayloadV1 } from "./roster.ts";
import { signSubmission } from "./leistungsbrief.ts";
import { evaluateSubmission, summarizeRoster, type ScanResult, type RosterStatusEntry } from "./submission.ts";
import { createHouse, type HouseV1 } from "./haus.ts";
import { signRanking } from "./rankingbrief.ts";
import { evaluateRankingSubmission, type RankingScanResult } from "./ranking-submission.ts";
import { computePoints, computeEventTotals, computeGraduatedCount, computeBoxLevelSum, evaluateHouseMissions, ZERO_TOTALS, type RankingTotals, type HouseMissionProgress } from "./ranking.ts";
import { createLernBoxService } from "../domain/lernbox-service.ts";
import { createLernwortService } from "../domain/lernwort-service.ts";

function nowIso(): string {
  return new Date().toISOString();
}

const TEACHER_PIN_RECORD_ID = "pin";

/** Ohne O/0 und I/1/L, damit ein handschriftlich angesagter oder angeschriebener Code nicht verwechselt wird. */
const TURNUS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TURNUS_CODE_LENGTH = 6;

function generateTurnusCode(): string {
  let code = "";
  for (let i = 0; i < TURNUS_CODE_LENGTH; i++) {
    code += TURNUS_CODE_ALPHABET[Math.floor(Math.random() * TURNUS_CODE_ALPHABET.length)];
  }
  return code;
}

export interface TurnusV1 {
  id: string;
  classId: string;
  label: string;
  createdAt: string;
  closedAt?: string;
}

export interface SubmissionRecordV1 {
  id: string;
  turnusId: string;
  studentId: string;
  standNr: number;
  receivedAt: string;
}

/** `totals` sind kumulativ seit jeher (siehe ranking.ts) — der letzte empfangene Stand ist immer der aktuell gültige. */
export interface RankingRecordV1 {
  id: string;
  studentId: string;
  standNr: number;
  totals: RankingTotals;
  receivedAt: string;
}

export interface ClassRankingEntry {
  student: StudentV1;
  totals: RankingTotals;
  points: number;
}

export interface HouseRankingEntry {
  house: HouseV1;
  points: number;
  missions: HouseMissionProgress[];
}

/** Lehrergerät: PIN-Schutz, Klassen-/Schülerverwaltung, Abgaberunden und der fortlaufende Scanmodus. */
export function createTeacherService(factory: LocalRepositoryFactory) {
  const authRepo = factory.open<StoredPin & { id: string }>("teacher", "teacher-auth");
  const classesRepo = factory.open<ClassV1>("teacher", "teacher-classes");
  const studentsRepo = factory.open<StudentV1>("teacher", "teacher-students");
  const turnusRepo = factory.open<TurnusV1>("teacher", "teacher-turnus");
  const submissionsRepo = factory.open<SubmissionRecordV1>("teacher", "teacher-submissions");
  const housesRepo = factory.open<HouseV1>("teacher", "teacher-houses");
  const rankingRepo = factory.open<RankingRecordV1>("teacher", "teacher-ranking");

  async function hasPinSet(): Promise<boolean> {
    return (await authRepo.get(TEACHER_PIN_RECORD_ID)) !== undefined;
  }

  async function setPin(pin: string): Promise<void> {
    const stored = await hashPin(pin);
    await authRepo.put({ id: TEACHER_PIN_RECORD_ID, ...stored });
  }

  async function unlockWithPin(pin: string): Promise<boolean> {
    const stored = await authRepo.get(TEACHER_PIN_RECORD_ID);
    if (!stored) return false;
    return verifyPin(pin, stored);
  }

  async function addClass(name: string): Promise<ClassV1> {
    const klasse = createClass(name);
    await classesRepo.put(klasse);
    return klasse;
  }

  async function listClasses(): Promise<ClassV1[]> {
    return classesRepo.list();
  }

  async function addStudent(classId: string, alias: string): Promise<StudentV1> {
    const student = createStudent(classId, alias);
    await studentsRepo.put(student);
    return student;
  }

  async function listStudents(classId: string): Promise<StudentV1[]> {
    return (await studentsRepo.list()).filter((s) => s.classId === classId);
  }

  async function removeStudent(studentId: string): Promise<void> {
    await studentsRepo.remove(studentId);
  }

  async function buildEnrollmentPayload(klasse: ClassV1, student: StudentV1): Promise<EnrollmentPayloadV1> {
    return { v: 1, classId: klasse.id, className: klasse.name, studentId: student.id, alias: student.alias, secret: student.secret };
  }

  /**
   * Die Turnus-ID ist bewusst ein kurzer, aussprechbarer Code (nicht eine UUID) —
   * ohne Rückkanal muss die Lehrkraft ihn den Schüler:innen mündlich oder an der
   * Tafel mitteilen können, und genau dieser Code wird direkt als Turnus-ID im
   * Leistungsbrief verwendet (kein separates Auflösen nötig).
   */
  async function startTurnus(classId: string, label: string): Promise<TurnusV1> {
    let code = generateTurnusCode();
    while (await turnusRepo.get(code)) code = generateTurnusCode();
    const turnus: TurnusV1 = { id: code, classId, label, createdAt: nowIso() };
    await turnusRepo.put(turnus);
    return turnus;
  }

  async function listTurnus(classId: string): Promise<TurnusV1[]> {
    return (await turnusRepo.list()).filter((t) => t.classId === classId);
  }

  async function closeTurnus(turnusId: string): Promise<void> {
    const turnus = await turnusRepo.get(turnusId);
    if (turnus) await turnusRepo.put({ ...turnus, closedAt: nowIso() });
  }

  /** Löscht das Abgabeprotokoll eines Turnus vollständig — manuelles Löschen nach Ablauf einer Frist, siehe "04 - Lehrer-Cockpit". */
  async function deleteTurnusLog(turnusId: string): Promise<void> {
    const submissions = await submissionsRepo.list();
    await Promise.all(submissions.filter((s) => s.turnusId === turnusId).map((s) => submissionsRepo.remove(s.id)));
    await turnusRepo.remove(turnusId);
  }

  async function getSubmissions(turnusId: string): Promise<SubmissionRecordV1[]> {
    return (await submissionsRepo.list()).filter((s) => s.turnusId === turnusId);
  }

  async function getRosterStatus(classId: string, turnusId: string): Promise<RosterStatusEntry[]> {
    const [roster, submissions] = await Promise.all([listStudents(classId), getSubmissions(turnusId)]);
    return summarizeRoster(roster, new Set(submissions.map((s) => s.studentId)));
  }

  /** Ein Scan im fortlaufenden Klassen-Scanmodus — persistiert eine frische Abgabe, lässt Duplikate/veraltete/ungültige Scans unangetastet. */
  async function scanSubmission(classId: string, turnusId: string, encoded: string): Promise<ScanResult> {
    const [roster, submissions] = await Promise.all([listStudents(classId), getSubmissions(turnusId)]);
    const existingStandNrByStudent = Object.fromEntries(submissions.map((s) => [s.studentId, s.standNr]));
    const result = await evaluateSubmission(encoded, classId, turnusId, roster, existingStandNrByStudent);
    if (result.status === "abgegeben" && result.studentId !== undefined && result.standNr !== undefined) {
      await submissionsRepo.put({
        id: `${turnusId}:${result.studentId}`,
        turnusId,
        studentId: result.studentId,
        standNr: result.standNr,
        receivedAt: nowIso(),
      });
    }
    return result;
  }

  async function addHouse(classId: string, name: string): Promise<HouseV1> {
    const haus = createHouse(classId, name);
    await housesRepo.put(haus);
    return haus;
  }

  async function listHouses(classId: string): Promise<HouseV1[]> {
    return (await housesRepo.list()).filter((h) => h.classId === classId);
  }

  async function assignStudentHouse(studentId: string, houseId: string | undefined): Promise<void> {
    const student = await studentsRepo.get(studentId);
    if (!student) return;
    const updated: StudentV1 = { ...student };
    if (houseId) updated.houseId = houseId;
    else delete updated.houseId;
    await studentsRepo.put(updated);
  }

  /** Ein Scan des Rankingbeitrags — persistiert nur einen frischen (höheren) Stand, siehe rankingbrief.ts. */
  async function scanRanking(classId: string, encoded: string): Promise<RankingScanResult> {
    const roster = await listStudents(classId);
    const existingRecords = await Promise.all(roster.map((s) => rankingRepo.get(s.id)));
    const existingStandNrByStudent = Object.fromEntries(
      roster
        .map((s, i) => [s.id, existingRecords[i]?.standNr] as const)
        .filter((entry): entry is [string, number] => entry[1] !== undefined),
    );
    const result = await evaluateRankingSubmission(encoded, classId, roster, existingStandNrByStudent);
    if (result.status === "abgegeben" && result.studentId !== undefined && result.standNr !== undefined && result.totals !== undefined) {
      await rankingRepo.put({ id: result.studentId, studentId: result.studentId, standNr: result.standNr, totals: result.totals, receivedAt: nowIso() });
    }
    return result;
  }

  async function getClassRanking(classId: string): Promise<ClassRankingEntry[]> {
    const roster = await listStudents(classId);
    const records = await Promise.all(roster.map((s) => rankingRepo.get(s.id)));
    return roster.map((student, i) => {
      const totals = records[i]?.totals ?? ZERO_TOTALS;
      return { student, totals, points: computePoints(totals) };
    });
  }

  /** Team-/Hauswerte statt einer vollständigen Einzelrangliste — genau die im Entscheidungsprotokoll geforderte "positive" Darstellung. */
  async function getHouseRanking(classId: string): Promise<HouseRankingEntry[]> {
    const [houses, classRanking] = await Promise.all([listHouses(classId), getClassRanking(classId)]);
    return houses.map((house) => {
      const memberTotals = classRanking.filter((entry) => entry.student.houseId === house.id).map((entry) => entry.totals);
      const points = memberTotals.reduce((sum, totals) => sum + computePoints(totals), 0);
      return { house, points, missions: evaluateHouseMissions(memberTotals) };
    });
  }

  return {
    hasPinSet,
    setPin,
    unlockWithPin,
    addClass,
    listClasses,
    addStudent,
    listStudents,
    removeStudent,
    buildEnrollmentPayload,
    startTurnus,
    listTurnus,
    closeTurnus,
    deleteTurnusLog,
    getSubmissions,
    getRosterStatus,
    scanSubmission,
    addHouse,
    listHouses,
    assignStudentHouse,
    scanRanking,
    getClassRanking,
    getHouseRanking,
  };
}

export type TeacherService = ReturnType<typeof createTeacherService>;

export interface ClassMembershipV1 {
  id: string;
  classId: string;
  className: string;
  alias: string;
  secret: string;
  enrolledAt: string;
}

/** Schülergerät: die eigene Klassenmitgliedschaft und der Leistungsbrief-Generator dafür. */
export function createStudentClassService(factory: LocalRepositoryFactory) {
  const membershipsRepo = factory.open<ClassMembershipV1>("classes", "class-memberships");
  const standNrRepo = factory.open<{ id: string; value: number }>("classes", "class-standnr");

  async function listMemberships(): Promise<ClassMembershipV1[]> {
    return membershipsRepo.list();
  }

  /** Erneutes Scannen desselben Einschreibungscodes überschreibt nur den bestehenden Datensatz — kein doppeltes Profil. */
  async function enroll(encoded: string): Promise<ClassMembershipV1 | null> {
    const payload = decodeEnrollment(encoded);
    if (!payload) return null;
    const membership: ClassMembershipV1 = {
      id: payload.studentId,
      classId: payload.classId,
      className: payload.className,
      alias: payload.alias,
      secret: payload.secret,
      enrolledAt: nowIso(),
    };
    await membershipsRepo.put(membership);
    return membership;
  }

  async function nextStandNr(membershipId: string, turnusId: string): Promise<number> {
    const key = `${membershipId}:${turnusId}`;
    const existing = await standNrRepo.get(key);
    const value = (existing?.value ?? 0) + 1;
    await standNrRepo.put({ id: key, value });
    return value;
  }

  /** Erzeugt einen neuen, signierten Leistungsbrief für diesen Turnus — jeder Aufruf zählt als (erneute) Abgabe mit höherer Standnummer. */
  async function generateSubmissionCode(membershipId: string, turnusId: string): Promise<string | null> {
    const membership = await membershipsRepo.get(membershipId);
    if (!membership) return null;
    const standNr = await nextStandNr(membershipId, turnusId);
    return signSubmission({ v: 1, classId: membership.classId, studentId: membershipId, turnusId, standNr }, membership.secret);
  }

  const lernBox = createLernBoxService(factory);
  const lernwort = createLernwortService(factory);

  /** Fasst die eigene Lernhistorie (LernBox + Lernwörter) zu den kumulativen Rankingwerten zusammen — siehe ranking.ts. */
  async function computeCurrentTotals(): Promise<RankingTotals> {
    const [events, lernboxProgress, lernwortProgress] = await Promise.all([lernBox.listEvents(), lernBox.listProgress(), lernwort.listProgress()]);
    return {
      ...computeEventTotals(events),
      graduatedLernwoerter: computeGraduatedCount(lernwortProgress),
      boxLevelSum: computeBoxLevelSum(lernboxProgress),
    };
  }

  async function nextRankingStandNr(membershipId: string): Promise<number> {
    const key = `ranking:${membershipId}`;
    const existing = await standNrRepo.get(key);
    const value = (existing?.value ?? 0) + 1;
    await standNrRepo.put({ id: key, value });
    return value;
  }

  /** Erzeugt einen neuen, signierten Rankingbeitrag — kumulative Werte, deshalb jederzeit gefahrlos wiederholbar (siehe rankingbrief.ts). */
  async function generateRankingCode(membershipId: string): Promise<string | null> {
    const membership = await membershipsRepo.get(membershipId);
    if (!membership) return null;
    const totals = await computeCurrentTotals();
    const standNr = await nextRankingStandNr(membershipId);
    return signRanking({ v: 1, classId: membership.classId, studentId: membershipId, standNr, totals }, membership.secret);
  }

  return { listMemberships, enroll, generateSubmissionCode, computeCurrentTotals, generateRankingCode };
}

export type StudentClassService = ReturnType<typeof createStudentClassService>;
