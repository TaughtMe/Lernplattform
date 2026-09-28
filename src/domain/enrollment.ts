/**
 * Klassen-Einschreibung per QR (Entscheidungsprotokoll Nr. 3, vereinfachte erste Stufe):
 * Der Code enthält nur Klassen-ID, Anzeigename der Klasse und Haus – keine Personendaten.
 * Die pseudonyme Mitgliedschafts-ID erzeugt das Schülergerät selbst.
 */
import { isHouseId, type HouseId } from "./houses";

export interface EnrollmentV1 { c: string; n: string; h: HouseId }

const PREFIX = "LRK1:";

export function encodeEnrollment(e: EnrollmentV1): string {
  return PREFIX + encodeURIComponent(JSON.stringify(e));
}

export function decodeEnrollment(raw: string): EnrollmentV1 | null {
  const text = raw.trim();
  if (!text.startsWith(PREFIX)) return null;
  try {
    const e = JSON.parse(decodeURIComponent(text.slice(PREFIX.length))) as EnrollmentV1;
    if (typeof e.c !== "string" || !e.c || e.c.length > 64 || typeof e.n !== "string" || e.n.length > 64 || !isHouseId(e.h)) return null;
    return e;
  } catch {
    return null;
  }
}
