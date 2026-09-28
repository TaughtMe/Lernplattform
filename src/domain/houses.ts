/**
 * Häuser, Punkte und QR-Leistungsbrief (Konzepte 10, 11 und Entscheidungsprotokoll).
 * - Punkte werden pro aktivem Mitglied normiert, damit große und kleine Häuser gleich zählen.
 * - Keine Minuspunkte, kein Einzelranking, Tageslimit gegen reines Punktesammeln.
 * - Der Leistungsbrief ist ein vollständiger kleiner Zwischenstand mit fortlaufender
 *   Standnummer. Das Lehrergerät übernimmt nur höhere Standnummern.
 */

export const DAILY_POINT_LIMIT = 150;
export const POINTS_PER_FLOOR = 50;

export const HOUSES = [
  { id: "phoenix", name: "Phönix", hue: 40, animal: "phoenix" },
  { id: "orca", name: "Orca", hue: 235, animal: "orca" },
  { id: "chameleon", name: "Chamäleon", hue: 145, animal: "chameleon" },
  { id: "einhorn", name: "Einhorn", hue: 305, animal: "einhorn" },
] as const;

export type HouseId = (typeof HOUSES)[number]["id"];

export function isHouseId(v: unknown): v is HouseId {
  return HOUSES.some((h) => h.id === v);
}

export function houseById(id: string) {
  return HOUSES.find((h) => h.id === id) ?? HOUSES[0];
}

/** Fügt Punkte unter Beachtung des Tageslimits hinzu und liefert die tatsächlich gutgeschriebenen Punkte. */
export function creditPoints(todaySoFar: number, requested: number): number {
  if (requested <= 0) return 0;
  return Math.max(0, Math.min(requested, DAILY_POINT_LIMIT - todaySoFar));
}

export function perHead(points: number, active: number): number {
  return active > 0 ? Math.round(points / active) : 0;
}

export function floors(perHeadPoints: number, min = 1): number {
  return Math.max(min, Math.round(perHeadPoints / POINTS_PER_FLOOR));
}

/** ISO-Kalenderwoche, z. B. "2026-W39". */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface PerformanceLetterV1 {
  v: 1;
  /** Klasse (pseudonym) */
  c: string;
  /** Mitgliedschafts-ID (pseudonym, keine Hardwarekennung) */
  m: string;
  /** Haus */
  h: HouseId;
  /** Berichtszeitraum (ISO-Woche) */
  w: string;
  /** fortlaufende Standnummer */
  s: number;
  /** aggregierte Werte; nur freigegebene Felder sind gesetzt */
  xp?: number;
  hp?: number;
  words?: number;
  impr?: number;
}

const PREFIX = "LR1";

function checksum(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/**
 * Kodiert einen Leistungsbrief. Die Prüfsumme erkennt Lese- und Tippfehler,
 * ist aber KEINE Signatur – siehe docs/status.md (offener Punkt Signatur).
 */
export function encodeLetter(letter: PerformanceLetterV1): string {
  const body = toBase64Url(JSON.stringify(letter));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

export type LetterDecode = { ok: true; letter: PerformanceLetterV1 } | { ok: false; reason: "format" | "checksum" | "version" };

export function decodeLetter(code: string): LetterDecode {
  const [prefix, body, sum] = code.trim().split(".");
  if (prefix !== PREFIX || !body || !sum) return { ok: false, reason: "format" };
  if (checksum(body) !== sum) return { ok: false, reason: "checksum" };
  try {
    const parsed = JSON.parse(fromBase64Url(body)) as PerformanceLetterV1;
    if (parsed.v !== 1 || typeof parsed.m !== "string" || typeof parsed.s !== "number" || !isHouseId(parsed.h)) return { ok: false, reason: "version" };
    return { ok: true, letter: parsed };
  } catch {
    return { ok: false, reason: "format" };
  }
}

export type ScanStatus = "neu" | "aktualisiert" | "doppelt" | "veraltet" | "klassenfremd" | "ungueltig";

/** Klassenbriefkasten: nimmt nur höhere Standnummern je Mitglied und Woche an. */
export function acceptLetter(
  inbox: Record<string, PerformanceLetterV1>,
  letter: PerformanceLetterV1,
  classId: string,
): { status: ScanStatus; inbox: Record<string, PerformanceLetterV1> } {
  if (letter.c !== classId) return { status: "klassenfremd", inbox };
  const key = `${letter.m}:${letter.w}`;
  const prev = inbox[key];
  if (!prev) return { status: "neu", inbox: { ...inbox, [key]: letter } };
  if (letter.s === prev.s) return { status: "doppelt", inbox };
  if (letter.s < prev.s) return { status: "veraltet", inbox };
  return { status: "aktualisiert", inbox: { ...inbox, [key]: letter } };
}

/** Wochenstand je Haus aus dem Briefkasten (nur eine Woche). */
export function houseStandings(inbox: Record<string, PerformanceLetterV1>, week: string) {
  return HOUSES.map((house) => {
    const letters = Object.values(inbox).filter((l) => l.w === week && l.h === house.id);
    const points = letters.reduce((sum, l) => sum + (l.hp ?? 0), 0);
    return { ...house, points, active: letters.length, perHead: perHead(points, letters.length) };
  });
}
