/**
 * Lehrerbereich (bleibt auf dem Lehrergerät): Klassen, abgelegte Inhalte,
 * Ergebnisse und Klassenbriefkasten. Keine Schüler-Klarnamen im Standard.
 */
import type { WordItem, SplitMode } from "../domain/dictation";
import type { PerformanceLetterV1, ScanStatus } from "../domain/houses";

export interface SchoolClass { id: string; label: string; sub: string; count: number }
export type ContentKind = "text" | "math" | "vocabulary";
export interface Content {
  id: string;
  classId: string;
  kind: ContentKind;
  title: string;
  source: string;
  split: SplitMode;
  words: WordItem[];
  createdAt: string;
  usedAt?: string;
}
export interface ResultRow { studentKey: string; stationNumber: number | null; currentIndex: number; peeks: number; attempts: number; errors: number; finished: boolean; durationMs: number | null; wordErrors: Record<string, number> }
export interface SessionResult { id: string; contentId: string; classId: string; title: string; mode: string; date: string; total: number; rows: ResultRow[] }
export interface ScanLogEntry { alias: string; house: string; status: ScanStatus; at: string }

export const TEACHER_KEYS = { classes: "classes", activeClass: "active-class", contents: "contents", results: "results", inbox: "inbox", scans: "scans", pin: "pin" } as const;

export const SEED_CLASSES: SchoolClass[] = [
  { id: "7b", label: "Klasse 7b", sub: "Englisch", count: 24 },
  { id: "9a", label: "Klasse 9a", sub: "Französisch", count: 21 },
  { id: "6c", label: "Klasse 6c", sub: "Deutsch", count: 26 },
];

const TEXT = "Der Hund bellt laut im Hof. Die Katze schläft auf dem Sofa. Am Abend gehen wir in den Wald. Dort finden wir einen Korb voller Pilze. Mein Vater trägt ihn nach Hause. Wir kochen daraus eine Suppe.";

export function seedContents(): Content[] {
  const now = new Date().toISOString();
  const sections = TEXT.match(/[^.]+\./g)!.map((s) => s.trim());
  return [
    { id: "c-pilze", classId: "6c", kind: "text", title: "Im Wald (Laufdiktat)", source: TEXT, split: "satz", words: sections.map((t, i) => ({ id: `w${i + 1}`, kind: "text", targetWord: t, isCompleted: false })), createdAt: now, usedAt: "2026-09-09" },
    { id: "c-pp", classId: "7b", kind: "vocabulary", title: "Present Perfect · Unit 3", source: "schon, bereits; already\nnoch nicht; not yet\ngründlich; thorough\nankommen; to arrive\njemals; ever\nniemals; never", split: "zeile",
      words: [["schon, bereits", "already"], ["noch nicht", "not yet"], ["gründlich", "thorough"], ["ankommen", "to arrive"], ["jemals", "ever"], ["niemals", "never"]].map(([p, a], i) => ({ id: `v${i + 1}`, kind: "vocabulary", prompt: p, targetWord: a, promptLang: "de-DE", answerLang: "en-GB", isCompleted: false })), createdAt: now, usedAt: "2026-09-14" },
  ];
}

/** CSV-Export der Ergebnisse (Semikolon, für deutsche Tabellenprogramme). */
export function resultsCsv(result: SessionResult): string {
  const head = ["Tier/Station", "Abschnitte", "Fertig", "Fehler", "Spicker", "Versuche", "Dauer (s)", "Fehlerwörter"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = result.rows.map((r) => [
    r.stationNumber ? `Station ${r.stationNumber}` : r.studentKey, `${Math.min(r.currentIndex, result.total)}/${result.total}`, r.finished ? "ja" : "nein", r.errors, r.peeks, r.attempts,
    r.durationMs ? Math.round(r.durationMs / 1000) : "", Object.entries(r.wordErrors).map(([w, n]) => `${w} (${n})`).join(", "),
  ].map(esc).join(";"));
  return "﻿" + [head.map(esc).join(";"), ...lines].join("\n");
}

/** Häufigste Fehler über alle Schüler. */
export function topErrors(rows: ResultRow[], limit = 5): { word: string; count: number }[] {
  const sum: Record<string, number> = {};
  rows.forEach((r) => Object.entries(r.wordErrors).forEach(([w, n]) => { sum[w] = (sum[w] ?? 0) + n; }));
  return Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word, count]) => ({ word, count }));
}

export type Inbox = Record<string, PerformanceLetterV1>;
