/**
 * Text-Werkzeuge für das Laufdiktat: Zerlegen in Abschnitte, Prüfen,
 * wortweiser Vergleich und Zuordnung zu Rechtschreib-Sammlungen.
 * Die Prüfregeln entsprechen utils/game/checkAnswer.ts im Laufdiktat-Repo.
 */

export type SplitMode = "satz" | "zeile" | "wort";
export type TaskKind = "text" | "math" | "vocabulary";

/** Aufgabenformat des bestehenden Laufdiktats (rooms.config.words). */
export interface WordItem {
  id: string;
  kind?: TaskKind;
  targetWord: string;
  prompt?: string;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  promptLang?: string;
  answerLang?: string;
  isCompleted: boolean;
}

export function splitSections(text: string, mode: SplitMode): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  if (mode === "zeile") return clean.split("\n").map((line) => line.trim()).filter(Boolean);
  if (mode === "wort") return clean.split(/\s+/).map((w) => w.replace(/^[„“"'»«(]+|[.,;:!?„“"'»«)]+$/g, "")).filter(Boolean);
  const flat = clean.replace(/\s*\n\s*/g, " ");
  return (flat.match(/[^.!?]+(?:[.!?]+["“”»]?|$)/g) ?? [flat]).map((s) => s.trim()).filter(Boolean);
}

export function sectionsToWords(sections: string[], idPrefix = "w"): WordItem[] {
  return sections.map((targetWord, i) => ({ id: `${idPrefix}${i + 1}`, kind: "text", targetWord, isCompleted: false }));
}

/** Zeilen „deutsch ; englisch" oder „deutsch<TAB>englisch" werden zu Vokabelaufgaben. */
export function parseVocabularyPairs(text: string, promptLang = "de-DE", answerLang = "en-GB"): WordItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|;| = | - /).map((part) => part.trim()))
    .filter((parts) => parts.length >= 2 && parts[0] && parts[1])
    .map(([prompt, answer], i) => {
      const [targetWord, ...acceptedAnswers] = answer.split("/").map((a) => a.trim()).filter(Boolean);
      return { id: `v${i + 1}`, kind: "vocabulary" as const, prompt, targetWord, acceptedAnswers, promptLang, answerLang, isCompleted: false };
    });
}

function normalizeVocabulary(value: string, caseSensitive: boolean, lang?: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive ? normalized : normalized.toLocaleLowerCase(lang);
}

export function checkAnswer(item: WordItem, input: string): boolean {
  const value = input.trim();
  const isMath = item.kind === "math" || (!item.kind && !!item.prompt);
  if (isMath) {
    if (!value) return false;
    const n = Number.parseFloat(value.replace(",", "."));
    return !Number.isNaN(n) && Math.abs(n - Number(item.targetWord)) < 0.01;
  }
  if (item.kind === "vocabulary") {
    if (!value) return false;
    const actual = normalizeVocabulary(value, item.caseSensitive ?? false, item.answerLang);
    return [item.targetWord, ...(item.acceptedAnswers ?? [])].some((a) => normalizeVocabulary(a, item.caseSensitive ?? false, item.answerLang) === actual);
  }
  return value.replace(/\s+/g, " ") === item.targetWord.trim().replace(/\s+/g, " ");
}

const stripWord = (w: string) => w.replace(/^[„“"'»«(]+|[.,;:!?„“"'»«)]+$/g, "");

/**
 * Vergleicht Zieltext und Eingabe Wort für Wort (LCS-Ausrichtung) und liefert
 * die Wörter des Zieltexts, die fehlen oder falsch geschrieben wurden.
 */
export function wrongWords(target: string, input: string): string[] {
  const a = target.split(/\s+/).map(stripWord).filter(Boolean);
  const b = input.split(/\s+/).map(stripWord).filter(Boolean);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const missing: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) j++;
    else { missing.push(a[i]); i++; }
  }
  return [...new Set(missing)];
}

export const SPELLING_SETS = [
  { id: "ie", name: "ie, ih, ieh", ex: "Biene, ihm, zieht" },
  { id: "dk", name: "Doppelkonsonanten", ex: "Mappe, Sonne" },
  { id: "cktz", name: "ck und tz", ex: "Decke, Katze" },
  { id: "s", name: "s, ss und ß", ex: "Gras, Kuss, Fuß" },
  { id: "verl", name: "Verlängern", ex: "Hund, Berg, klug" },
  { id: "merk", name: "Merkwörter", ex: "Vater, Vogel" },
] as const;

export type SpellingSetId = (typeof SPELLING_SETS)[number]["id"];

/** Grobe Zuordnung eines Worts zu einem Rechtschreibphänomen (Heuristik, keine Fehleranalyse). */
export function spellingSetFor(word: string): SpellingSetId {
  const w = word.toLowerCase();
  if (/ck|tz/.test(w)) return "cktz";
  if (/ß|ss/.test(w)) return "s";
  if (/ieh?|ih/.test(w)) return "ie";
  if (/([bdfglmnprt])\1/.test(w)) return "dk";
  if (/[bdg]$/.test(w) || /s$/.test(w)) return w.endsWith("s") ? "s" : "verl";
  return "merk";
}

/** Lückensatz für das Wortspeicher-Training: „Der ___ bellt laut." */
export function clozeFor(word: string, sentence?: string): { pre: string; post: string } {
  if (sentence) {
    const idx = sentence.split(/\s+/).findIndex((w) => stripWord(w) === word);
    if (idx >= 0) {
      const parts = sentence.split(/\s+/);
      const tail = parts[idx].slice(parts[idx].indexOf(word) + word.length);
      return { pre: parts.slice(0, idx).join(" "), post: (tail + " " + parts.slice(idx + 1).join(" ")).trim() };
    }
  }
  return { pre: "", post: "" };
}

/** Mathe-Generator (Konzept aus dem Laufdiktat): + − · : im gewählten Zahlenraum. */
export type MathOp = "+" | "-" | "·" | ":";

export function generateMath(ops: MathOp[], max: number, count: number, random: () => number = Math.random): WordItem[] {
  const pick = (n: number) => Math.floor(random() * n);
  const list = ops.length ? ops : (["+"] as MathOp[]);
  return Array.from({ length: count }, (_, i) => {
    const op = list[pick(list.length)];
    let a = pick(max) + 1;
    let b = pick(max) + 1;
    let result: number;
    if (op === "-") { if (b > a) [a, b] = [b, a]; result = a - b; }
    else if (op === "·") { a = pick(Math.min(10, max)) + 1; b = pick(Math.min(10, max)) + 1; result = a * b; }
    else if (op === ":") { b = pick(Math.min(10, max)) + 1; result = pick(Math.min(10, max)) + 1; a = b * result; }
    else result = a + b;
    return { id: `m${i + 1}`, kind: "math" as const, prompt: `${a} ${op} ${b} =`, targetWord: String(result), isCompleted: false };
  });
}

/** Deterministisches Mischen (für „Reihenfolge pro Schüler mischen"). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Buchstaben-Hilfe für „Freie Übung": zeigt je nach Anteil Buchstaben, Rest als „_". */
export function buildHint(target: string, fraction: number): string {
  const chars = [...target];
  const letters = chars.map((c, i) => (c.trim() ? i : -1)).filter((i) => i >= 0);
  const reveal = new Set(seededShuffle(letters, target).slice(0, Math.ceil(letters.length * fraction)));
  return chars.map((c, i) => (!c.trim() ? c : reveal.has(i) ? c : "_")).join("");
}
