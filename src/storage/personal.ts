/**
 * Persönlicher Datenbereich (bleibt auf dem Gerät): Profil, LernBox-Stapel,
 * Wortspeicher, Tastenwelt, Hauspunkte und Tagesaktivität.
 */
import type { LearningProgressV1 } from "../domain/learning-bundle";
import { newLearningProgress, type Box } from "../domain/leitner";
import { clozeFor, spellingSetFor, type SpellingSetId } from "../domain/dictation";
import { creditPoints, isoWeek, type HouseId } from "../domain/houses";
import { DEFAULT_ANIMAL } from "../domain/animals";
import { readValue, writeValue } from "./local-store";

export interface Profile {
  animal: string;
  house: HouseId;
  /** Pseudonyme Mitgliedschafts-ID (zufällig, keine Gerätekennung). */
  memberId: string;
  classId: string;
  className: string;
}

export interface VocabItem { id: string; prompt: string; answer: string; alternatives?: string[] }
export interface Deck {
  id: string;
  title: string;
  sub: string;
  promptLabel: string;
  answerLabel: string;
  promptLang: string;
  answerLang: string;
  items: VocabItem[];
  progress: Record<string, LearningProgressV1>;
  /** Vokabeln, die zuletzt im Test/Laufdiktat falsch waren („Meine Fehler jetzt üben"). */
  errorIds: string[];
}

export type WordSource = "Laufdiktat" | "Test" | "Lehrkraft" | "eigenes Wort";
export interface WordEntry {
  id: string;
  word: string;
  set: SpellingSetId;
  source: WordSource;
  pre: string;
  post: string;
  tip: string;
  box: Box;
  dueAt: string;
  wrongCount: number;
}

export interface DayActivity { cards: number; points: number; typingSeconds: number }

export interface TypingState {
  stage: number;
  exercise: number;
  xp: number;
  stars: number[];
  heat: Record<string, number>;
  layout: "iso" | "small";
  fingerColors: boolean;
  nextKey: boolean;
  strict: boolean;
}

export interface HouseState { week: string; points: number; seq: number; words: number; improvements: number; share: { xp: boolean; hp: boolean; words: boolean; impr: boolean } }

export const STREAK_MIN_CARDS = 6;
export const DAILY_TYPING_GOAL_SECONDS = 600;

const nowIso = () => new Date().toISOString();

function randomId(): string {
  try { return crypto.randomUUID(); } catch { return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- Beispielinhalte beim ersten Start ---------- */

function deck(id: string, title: string, sub: string, pairs: [string, string][], boxes: number[]): Deck {
  const now = new Date();
  const items = pairs.map(([prompt, answer], i) => ({ id: `${id}-${i + 1}`, prompt, answer }));
  const progress: Record<string, LearningProgressV1> = {};
  items.forEach((item, i) => {
    const p = newLearningProgress(item.id, now);
    const box = Math.min(5, Math.max(1, boxes[i % boxes.length])) as Box;
    // Unterschiedliche Stände, damit die Boxenleiste sofort etwas zeigt.
    const due = new Date(now.getTime() + (i % 3 === 0 ? -3_600_000 : box * 86_400_000)).toISOString();
    for (const dir of ["prompt-to-answer", "answer-to-prompt"] as const) {
      p.knowledge[dir] = { box, dueAt: due };
      p.writing[dir] = { box, dueAt: due };
    }
    progress[item.id] = p;
  });
  return { id, title, sub, promptLabel: "Deutsch", answerLabel: "Englisch", promptLang: "de-DE", answerLang: "en-GB", items, progress, errorIds: [] };
}

function seedDecks(): Deck[] {
  const pp = deck("pp", "Present Perfect · Unit 3", "Englisch · aus dem Laufdiktat", [
    ["schon, bereits", "already"], ["noch nicht", "not yet"], ["gründlich", "thorough"], ["ankommen", "to arrive"],
    ["jemals", "ever"], ["niemals", "never"], ["gerade eben", "just"], ["seit", "since"], ["obwohl", "although"], ["Rhythmus", "rhythm"],
  ], [2, 1, 3, 2, 4, 5, 1, 2, 3, 1]);
  const iv = deck("iv", "Irregular verbs", "Englisch · von der Lehrkraft", [
    ["sein – war – gewesen", "be was been"], ["gehen – ging – gegangen", "go went gone"], ["sehen – sah – gesehen", "see saw seen"],
    ["nehmen – nahm – genommen", "take took taken"], ["schreiben – schrieb – geschrieben", "write wrote written"], ["essen – aß – gegessen", "eat ate eaten"],
  ], [1, 2, 3, 3, 4, 5]);
  const fr = { ...deck("fr", "Unité 2 · Au collège", "Französisch · eigene", [
    ["die Schule", "l'école"], ["der Lehrer", "le professeur"], ["das Heft", "le cahier"], ["die Pause", "la récréation"],
  ], [3, 4, 5, 5]), answerLabel: "Französisch", answerLang: "fr-FR" };
  pp.errorIds = ["pp-3", "pp-9", "pp-10"];
  return [pp, iv, fr];
}

const SEED_WORDS: [string, WordSource, number, string, string][] = [
  ["Biene", "Laufdiktat", 3, "Die Biene summt über die Wiese.", "Langes i hörst du deutlich: meistens ie."],
  ["zieht", "Test", 1, "Er zieht den Schlitten den Berg hinauf.", "Grundform ziehen – das h bleibt: er zieht."],
  ["ihm", "Lehrkraft", 2, "Ich gebe ihm das Buch.", "ihm, ihn, ihr – Merkwörter mit ih."],
  ["Sonne", "Laufdiktat", 4, "Die Sonne scheint hell.", "Kurzer Vokal vor dem n: Doppelkonsonant."],
  ["Mappe", "Test", 2, "Meine Mappe liegt im Ranzen.", "Silbieren: Map-pe."],
  ["Katze", "Lehrkraft", 5, "Die Katze schläft auf dem Sofa.", "Nach kurzem Vokal: tz, nie zz."],
  ["Decke", "Laufdiktat", 3, "Die Decke ist warm und weich.", "Nach kurzem Vokal: ck, nie kk."],
  ["Platz", "Test", 1, "Er sitzt auf dem Platz.", "Kurzes a, danach tz."],
  ["Gras", "Laufdiktat", 1, "Das Gras ist grün.", "Verlängern: die Gräser – weiches s."],
  ["Fuß", "Test", 2, "Er hat einen kalten Fuß.", "Langer Vokal: ß – die Füße."],
  ["Kuss", "Laufdiktat", 1, "Sie gibt ihm einen Kuss.", "Kurzer Vokal: ss."],
  ["Hund", "Laufdiktat", 1, "Der Hund bellt laut.", "Verlängern: der Hund – die Hunde. Jetzt hörst du, ob d oder t."],
  ["Berg", "Laufdiktat", 2, "Wir wandern auf den Berg.", "Verlängern: der Berg – die Berge."],
  ["Wald", "Test", 1, "Im Wald ist es kühl.", "Verlängern: der Wald – die Wälder."],
  ["Vater", "Lehrkraft", 5, "Mein Vater holt mich ab.", "Merkwort mit V."],
  ["Vogel", "Laufdiktat", 4, "Der Vogel singt im Baum.", "Merkwort mit V."],
  ["Zug", "Test", 2, "Wir fahren mit dem Zug.", "Verlängern: die Züge – also g."],
];

const SET_OVERRIDE: Record<string, SpellingSetId> = { Hund: "verl", Berg: "verl", Wald: "verl", Zug: "merk", Vater: "merk", Vogel: "merk", Gras: "s", Fuß: "s", Kuss: "s" };

function seedWords(): WordEntry[] {
  const now = Date.now();
  return SEED_WORDS.map(([word, source, box, sentence, tip], i) => {
    const { pre, post } = clozeFor(word, sentence);
    return {
      id: `seed-${i}`, word, set: SET_OVERRIDE[word] ?? spellingSetFor(word), source, pre, post, tip,
      box: box as Box, dueAt: new Date(box <= 2 ? now - 1000 : now + box * 86_400_000).toISOString(), wrongCount: box === 1 ? 2 : 0,
    };
  });
}

/* ---------- Zugriff ---------- */

export const KEYS = {
  profile: "profile",
  decks: "decks",
  words: "words",
  activity: "activity",
  typing: "typing",
  house: "house",
  theme: "theme",
} as const;

export function defaultProfile(): Profile {
  return { animal: DEFAULT_ANIMAL, house: "phoenix", memberId: randomId(), classId: "demo-7b", className: "Klasse 7b" };
}

/** Legt beim ersten Aufruf Profil und Beispielinhalte an. Idempotent. */
export function ensureSeed(): void {
  if (!readValue<Profile | null>("personal", KEYS.profile, null)) writeValue("personal", KEYS.profile, defaultProfile());
  if (!readValue<Deck[] | null>("personal", KEYS.decks, null)) writeValue("personal", KEYS.decks, seedDecks());
  if (!readValue<WordEntry[] | null>("personal", KEYS.words, null)) writeValue("personal", KEYS.words, seedWords());
}

export const DEFAULT_TYPING: TypingState = { stage: 7, exercise: 2, xp: 340, stars: [3, 3, 2, 3, 2, 3, 1], heat: { b: 3, "ü": 2, z: 2, "ß": 2, y: 1, "ö": 1, v: 1 }, layout: "iso", fingerColors: true, nextKey: true, strict: true };

export function defaultHouse(): HouseState {
  return { week: isoWeek(new Date()), points: 0, seq: 0, words: 0, improvements: 0, share: { xp: true, hp: true, words: true, impr: false } };
}

export function recordActivity(change: Partial<DayActivity>): number {
  let credited = 0;
  writeValue<Record<string, DayActivity>>("personal", KEYS.activity, (prev) => {
    const key = dayKey();
    const day = prev?.[key] ?? { cards: 0, points: 0, typingSeconds: 0 };
    credited = creditPoints(day.points, change.points ?? 0);
    return { ...(prev ?? {}), [key]: { cards: day.cards + (change.cards ?? 0), points: day.points + credited, typingSeconds: day.typingSeconds + (change.typingSeconds ?? 0) } };
  }, {});
  if (credited > 0) {
    writeValue<HouseState>("personal", KEYS.house, (prev) => {
      const week = isoWeek(new Date());
      const base = prev && prev.week === week ? prev : { ...defaultHouse(), share: prev?.share ?? defaultHouse().share };
      return { ...base, points: base.points + credited };
    }, defaultHouse());
  }
  return credited;
}

/** Tage in Folge, an denen mindestens STREAK_MIN_CARDS Karten gelernt wurden. Heute zählt erst, wenn erreicht. */
export function streakDays(activity: Record<string, DayActivity>, today = new Date()): number {
  let count = 0;
  const d = new Date(today);
  if ((activity[dayKey(d)]?.cards ?? 0) < STREAK_MIN_CARDS) d.setDate(d.getDate() - 1);
  while ((activity[dayKey(d)]?.cards ?? 0) >= STREAK_MIN_CARDS) { count++; d.setDate(d.getDate() - 1); }
  return count;
}

export function weekDays(activity: Record<string, DayActivity>, today = new Date()): { label: string; state: "done" | "missed" | "today" | "future" }[] {
  const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const done = (activity[dayKey(d)]?.cards ?? 0) >= STREAK_MIN_CARDS;
    const isToday = dayKey(d) === dayKey(today);
    return { label, state: done ? "done" : isToday ? "today" : d > today ? "future" : "missed" };
  });
}

/** Übernimmt Fehlerwörter aus dem Laufdiktat dublettenfrei in den Wortspeicher. */
export function addWordsFromDictation(words: { word: string; sentence: string }[], source: WordSource = "Laufdiktat"): number {
  let added = 0;
  writeValue<WordEntry[]>("personal", KEYS.words, (prev) => {
    const list = prev ?? [];
    const next = [...list];
    for (const { word, sentence } of words) {
      if (!word || word.length < 2 || /^\d+$/.test(word)) continue;
      const existing = next.findIndex((w) => w.word === word);
      if (existing >= 0) {
        next[existing] = { ...next[existing], box: 1, dueAt: nowIso(), wrongCount: next[existing].wrongCount + 1 };
        continue;
      }
      const { pre, post } = clozeFor(word, sentence);
      next.unshift({ id: randomId(), word, set: spellingSetFor(word), source, pre, post, tip: "", box: 1, dueAt: nowIso(), wrongCount: 1 });
      added++;
    }
    return next;
  }, []);
  return added;
}

export { randomId };
