/**
 * Häuser, Punkte und Haus-Leistungsbrief (Konzepte 10, 11, Entscheidungsprotokoll Nr. 4–6).
 * - Punkte werden pro aktivem Mitglied normiert, damit große und kleine Häuser gleich zählen.
 * - Keine Minuspunkte, kein Einzelranking, Tageslimit gegen reines Punktesammeln.
 * - Der Brief ist ein vollständiger kleiner Wochenstand mit fortlaufender Standnummer,
 *   signiert mit dem individuellen Einschreibe-Schlüssel (HMAC-SHA-256, wie
 *   der Aufgaben-Leistungsbrief in teacher-workspace.ts). Das Lehrergerät übernimmt
 *   nur höhere Standnummern.
 */
import * as z from "zod";
import type { LearningEventV1 } from "./learning-bundle";

export const DAILY_POINT_LIMIT = 150;
export const POINTS_PER_FLOOR = 50;

export const HOUSES = [
  { id: "phoenix", name: "Phönix", hue: 40, animal: "phoenix" },
  { id: "orca", name: "Orca", hue: 235, animal: "orca" },
  { id: "chameleon", name: "Chamäleon", hue: 145, animal: "chameleon" },
  { id: "einhorn", name: "Einhorn", hue: 305, animal: "einhorn" },
] as const;

export const houseIdSchema = z.enum([
  "phoenix",
  "orca",
  "chameleon",
  "einhorn",
]);
export type HouseId = z.infer<typeof houseIdSchema>;

export function houseById(id: string) {
  return HOUSES.find((house) => house.id === id) ?? HOUSES[0];
}

export function perHead(points: number, active: number): number {
  return active > 0 ? Math.round(points / active) : 0;
}

export function floors(perHeadPoints: number, min = 1): number {
  return Math.max(min, Math.round(perHeadPoints / POINTS_PER_FLOOR));
}

/** ISO-Kalenderwoche, z. B. "2026-W40". */
export function isoWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface HouseContribution {
  week: string;
  weekPoints: number;
  todayPoints: number;
  rounds: number;
  correct: number;
  activeDays: number;
}

/**
 * Hauspunkte aus den eigenen Lernereignissen: 5 Punkte für eine richtige,
 * 2 Punkte für eine geübte Antwort, höchstens DAILY_POINT_LIMIT pro Tag.
 */
export function houseContribution(
  events: readonly Pick<
    LearningEventV1,
    "occurredAt" | "roundId" | "assessment"
  >[],
  now: Date,
): HouseContribution {
  const week = isoWeek(now);
  const today = localDay(now.toISOString());
  const perDay = new Map<string, number>();
  const rounds = new Set<string>();
  let correct = 0;
  for (const event of events) {
    if (isoWeek(new Date(event.occurredAt)) !== week) continue;
    const day = localDay(event.occurredAt);
    const ok =
      event.assessment.knowledge === "correct" ||
      event.assessment.writing === "correct";
    if (ok) correct += 1;
    rounds.add(event.roundId);
    perDay.set(
      day,
      Math.min(DAILY_POINT_LIMIT, (perDay.get(day) ?? 0) + (ok ? 5 : 2)),
    );
  }
  let weekPoints = 0;
  perDay.forEach((points) => {
    weekPoints += points;
  });
  return {
    week,
    weekPoints,
    todayPoints: perDay.get(today) ?? 0,
    rounds: rounds.size,
    correct,
    activeDays: perDay.size,
  };
}

export const houseLetterPayloadSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("house"),
    classId: z.string().uuid(),
    membershipId: z.string().uuid(),
    house: houseIdSchema,
    week: z.string().regex(/^\d{4}-W\d{2}$/),
    sequence: z.number().int().positive(),
    points: z
      .number()
      .int()
      .min(0)
      .max(DAILY_POINT_LIMIT * 7)
      .optional(),
    rounds: z.number().int().min(0).max(10_000).optional(),
    correct: z.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export const signedHouseLetterSchema = houseLetterPayloadSchema
  .extend({ signature: z.string().regex(/^[0-9a-f]{64}$/) })
  .strict();

export type HouseLetterPayload = z.infer<typeof houseLetterPayloadSchema>;
export type SignedHouseLetter = z.infer<typeof signedHouseLetterSchema>;

const PREFIX = "lernraum:house:";

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function serialize(payload: HouseLetterPayload) {
  return JSON.stringify([
    payload.version,
    payload.kind,
    payload.classId,
    payload.membershipId,
    payload.house,
    payload.week,
    payload.sequence,
    payload.points ?? null,
    payload.rounds ?? null,
    payload.correct ?? null,
  ]);
}

async function hmacKey(enrollmentToken: string, usage: "sign" | "verify") {
  const token = z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .parse(enrollmentToken);
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function createHouseLetterCode(
  value: HouseLetterPayload,
  enrollmentToken: string,
): Promise<string> {
  const payload = houseLetterPayloadSchema.parse(value);
  const signature = bytesToHex(
    await crypto.subtle.sign(
      "HMAC",
      await hmacKey(enrollmentToken, "sign"),
      new TextEncoder().encode(serialize(payload)),
    ),
  );
  return (
    PREFIX +
    JSON.stringify(signedHouseLetterSchema.parse({ ...payload, signature }))
  );
}

export function isHouseLetterCode(value: string) {
  return value.trim().startsWith(PREFIX);
}

export function parseHouseLetterCode(value: string): SignedHouseLetter {
  const normalized = value.trim();
  if (!normalized.startsWith(PREFIX)) {
    throw new Error("Kein gültiger Haus-Leistungsbrief.");
  }
  return signedHouseLetterSchema.parse(
    JSON.parse(normalized.slice(PREFIX.length)),
  );
}

export async function verifyHouseLetter(
  letter: SignedHouseLetter,
  enrollmentToken: string,
): Promise<boolean> {
  const { signature, ...payload } = signedHouseLetterSchema.parse(letter);
  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(enrollmentToken, "verify"),
    hexToBytes(signature),
    new TextEncoder().encode(serialize(payload)),
  );
}

export type HouseScanStatus =
  | "neu"
  | "aktualisiert"
  | "doppelt"
  | "veraltet"
  | "klassenfremd"
  | "unbekannt"
  | "ungueltig";

export type HouseInbox = Record<string, SignedHouseLetter>;

/** Klassenbriefkasten: nimmt nur höhere Standnummern je Mitglied und Woche an. */
export function acceptHouseLetter(
  inbox: HouseInbox,
  letter: SignedHouseLetter,
  classId: string,
): { status: HouseScanStatus; inbox: HouseInbox } {
  if (letter.classId !== classId) return { status: "klassenfremd", inbox };
  const key = `${letter.membershipId}:${letter.week}`;
  const previous = inbox[key];
  if (!previous) return { status: "neu", inbox: { ...inbox, [key]: letter } };
  if (letter.sequence === previous.sequence)
    return { status: "doppelt", inbox };
  if (letter.sequence < previous.sequence) return { status: "veraltet", inbox };
  return { status: "aktualisiert", inbox: { ...inbox, [key]: letter } };
}

/** Wochenstand je Haus aus dem Briefkasten. */
export function houseStandings(inbox: HouseInbox, week: string) {
  return HOUSES.map((house) => {
    const letters = Object.values(inbox).filter(
      (letter) => letter.week === week && letter.house === house.id,
    );
    const points = letters.reduce(
      (sum, letter) => sum + (letter.points ?? 0),
      0,
    );
    return {
      ...house,
      points,
      active: letters.length,
      perHead: perHead(points, letters.length),
    };
  });
}
