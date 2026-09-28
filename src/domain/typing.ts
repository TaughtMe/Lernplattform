/**
 * Tastenwelt (Konzept 07, Abschnitt Tastschreibtraining): deutsches
 * Tastaturlayout, Fingerzuordnung, Stufen und Auswertung.
 * Genauigkeit zählt vor Tempo; Tempo wird nur informativ angezeigt.
 */

export type Finger = "lp" | "lr" | "lm" | "li" | "ri" | "rm" | "rr" | "rp" | "th";

export const FINGER_OF: Record<string, Finger> = {};
([
  ["lp", "^1qay<"], ["lr", "2wsx"], ["lm", "3edc"], ["li", "45rtfgvb"],
  ["ri", "67zuhjnm"], ["rm", "8ik,"], ["rr", "9ol."], ["rp", "0ßp´+üöä#-"],
] as const).forEach(([f, keys]) => [...keys].forEach((k) => { FINGER_OF[k] = f; }));
Object.assign(FINGER_OF, { tab: "lp", caps: "lp", shl: "lp", bs: "rp", ent: "rp", ent1: "rp", shr: "rp", sp: "th", " ": "th" });

export const FINGER_HUE: Record<Finger, number> = { lp: 25, lr: 60, lm: 95, li: 140, ri: 185, rm: 245, rr: 295, rp: 345, th: 70 };
export const FINGER_NAME: Record<Finger, string> = {
  lp: "linker kleiner Finger", lr: "linker Ringfinger", lm: "linker Mittelfinger", li: "linker Zeigefinger",
  ri: "rechter Zeigefinger", rm: "rechter Mittelfinger", rr: "rechter Ringfinger", rp: "rechter kleiner Finger", th: "Daumen",
};

/** [Beschriftung, Breite, id] – id nur bei Sondertasten. */
export type KeyDef = [string, number?, string?];

const ROW0: KeyDef[] = [["^"], ["1"], ["2"], ["3"], ["4"], ["5"], ["6"], ["7"], ["8"], ["9"], ["0"], ["ß"], ["´"], ["⌫", 2, "bs"]];
const ROW4: KeyDef[] = [["Strg", 1.25, "mod"], ["Start", 1.25, "mod"], ["Alt", 1.25, "mod"], ["", 7.25, "sp"], ["Alt Gr", 1.25, "mod"], ["Menü", 1.25, "mod"], ["Strg", 1.5, "mod"]];

export const LAYOUTS: Record<"iso" | "small", KeyDef[][]> = {
  iso: [ROW0,
    [["⇥", 1.5, "tab"], ["q"], ["w"], ["e"], ["r"], ["t"], ["z"], ["u"], ["i"], ["o"], ["p"], ["ü"], ["+"], ["", 1.5, "ent1"]],
    [["⇪", 1.75, "caps"], ["a"], ["s"], ["d"], ["f"], ["g"], ["h"], ["j"], ["k"], ["l"], ["ö"], ["ä"], ["#"], ["↵", 1.25, "ent"]],
    [["⇧", 1.25, "shl"], ["<"], ["y"], ["x"], ["c"], ["v"], ["b"], ["n"], ["m"], [","], ["."], ["-"], ["⇧", 2.75, "shr"]], ROW4],
  small: [ROW0,
    [["⇥", 1.5, "tab"], ["q"], ["w"], ["e"], ["r"], ["t"], ["z"], ["u"], ["i"], ["o"], ["p"], ["ü"], ["+"], ["#", 1.5]],
    [["⇪", 1.75, "caps"], ["a"], ["s"], ["d"], ["f"], ["g"], ["h"], ["j"], ["k"], ["l"], ["ö"], ["ä"], ["↵", 2.25, "ent"]],
    [["⇧", 2.25, "shl"], ["y"], ["x"], ["c"], ["v"], ["b"], ["n"], ["m"], [","], ["."], ["-"], ["⇧", 2.75, "shr"]], ROW4],
};

export const SHIFT_LEGEND: Record<string, string> = { "^": "°", "1": "!", "2": "\"", "3": "§", "4": "$", "5": "%", "6": "&", "7": "/", "8": "(", "9": ")", "0": "=", "ß": "?", "´": "`", "+": "*", "#": "'", "<": ">", ",": ";", ".": ":", "-": "_" };
export const ALT_LEGEND: Record<string, string> = { "2": "²", "3": "³", "7": "{", "8": "[", "9": "]", "0": "}", "ß": "\\", q: "@", e: "€", "+": "~", "<": "|", m: "µ" };

/** Zehn Stationen; je Station fünf Übungen. */
export const STAGES: { label: string; exercises: string[] }[] = [
  { label: "Grundstellung", exercises: ["asdf jklö", "fdsa ölkj", "aaa sss ddd fff", "jjj kkk lll ööö", "alle sassen da"] },
  { label: "Obere Reihe", exercises: ["qwer tzui", "wer tut es", "quer ist zier", "tore raten", "reiter werfen"] },
  { label: "Untere Reihe", exercises: ["yxcv bnm", "nebel wagen", "biene camen", "man ruft mich", "vor dem bach"] },
  { label: "Großbuchstaben", exercises: ["Anna Otto", "Der Hund", "Berlin Kiel", "Mama Papa", "Eine Maus"] },
  { label: "Umlaute und ß", exercises: ["äöü ÄÖÜ ß", "Bär Öl Tür", "große Füße", "schön süß", "Käse und Möhre"] },
  { label: "Satzzeichen", exercises: ["ja, nein.", "Wo? Hier!", "Er rief: Los!", "eins, zwei, drei.", "Komm mit - jetzt."] },
  { label: "Buchstabenfolgen", exercises: ["sch ch ck", "ei ie eu", "st sp pf", "ng nk tz", "qu chs"] },
  { label: "Wörter", exercises: ["Katze Hund Maus", "Schule Pause Heft", "Fuchs Bär Wiese springt über Käfer", "Wald Wiese Bach", "Apfel Birne Kirsche"] },
  { label: "Sätze", exercises: ["Der Hund bellt laut.", "Wir lernen heute.", "Die Sonne scheint hell.", "Mein Bruder liest gern.", "Im Wald ist es kühl."] },
  { label: "Abschreibtexte", exercises: ["Am Abend gehen wir in den Wald. Dort finden wir Pilze.", "Die Katze schläft auf dem Sofa, der Hund im Korb.", "Im Herbst fallen bunte Blätter von den Bäumen.", "Morgen fahren wir mit dem Zug an das Meer.", "Lisa übt jeden Tag zehn Minuten Tippen."] },
];

export interface TypingRun {
  text: string;
  pos: number;
  errors: number;
  errAt: Record<number, true>;
  bad: Record<number, true>;
  miss: Record<string, number>;
  combo: number;
  best: number;
  startedAt: number;
  lastAt: number;
  wrong: string | null;
  shake: number;
}

export function newRun(text: string): TypingRun {
  return { text, pos: 0, errors: 0, errAt: {}, bad: {}, miss: {}, combo: 0, best: 0, startedAt: 0, lastAt: 0, wrong: null, shake: 0 };
}

/** Verarbeitet einen Anschlag. strict=true: erst mit der richtigen Taste geht es weiter. */
export function hit(run: TypingRun, ch: string, now: number, strict = true): TypingRun {
  if (run.pos >= run.text.length) return run;
  const t: TypingRun = { ...run, startedAt: run.startedAt || now, lastAt: now };
  const want = run.text[run.pos];
  if (ch === want) {
    t.pos += 1; t.combo += 1; t.best = Math.max(t.best, t.combo); t.wrong = null;
    return t;
  }
  t.errors += 1; t.combo = 0; t.wrong = ch; t.shake += 1;
  t.errAt = { ...run.errAt, [run.pos]: true };
  t.miss = { ...run.miss, [want]: (run.miss[want] ?? 0) + 1 };
  if (!strict) { t.bad = { ...run.bad, [run.pos]: true }; t.pos += 1; t.wrong = null; }
  return t;
}

export interface RunInfo { len: number; done: boolean; correct: number; accuracy: number; perMinute: number | null; want: string | null }

export function runInfo(t: TypingRun): RunInfo {
  const len = t.text.length;
  const done = t.pos >= len;
  const correct = t.pos - Object.keys(t.bad).length;
  const total = correct + t.errors;
  const elapsed = t.lastAt - t.startedAt;
  return {
    len, done, correct,
    accuracy: total ? Math.round((100 * correct) / total) : 100,
    perMinute: t.startedAt && elapsed > 1500 ? Math.round(correct / (elapsed / 60000)) : null,
    want: done ? null : t.text[t.pos],
  };
}

export function starsFor(accuracy: number): 1 | 2 | 3 {
  return accuracy >= 97 ? 3 : accuracy >= 90 ? 2 : 1;
}

export function xpGain(t: TypingRun, info: RunInfo): number {
  return info.correct * 2 + (t.best >= 10 ? 10 : 0) + (info.done && info.accuracy >= 97 ? 20 : 0);
}

export const XP_PER_LEVEL = 500;

export function weakKeys(miss: Record<string, number>, limit = 4): string[] {
  return Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

export function coachLine(t: TypingRun, info: RunInfo): string {
  const q = (c: string) => (c === " " ? "die Leertaste" : `„${c}“`);
  if (info.done) return info.accuracy >= 97 ? "Wow, fast fehlerfrei! Das gibt drei Sterne." : "Geschafft! Beim nächsten Mal wird es noch genauer.";
  if (t.wrong != null && info.want) return `Hoppla, das war ${q(t.wrong)}. Gesucht ist ${q(info.want)}.`;
  if (!t.pos) return "Finger auf die Grundreihe. Auf F und J spürst du kleine Huckel.";
  if (t.combo >= 10) return `${t.combo} richtige am Stück! Bleib so genau.`;
  if (t.combo >= 5) return "Läuft! Nicht schneller werden, nur sauber bleiben.";
  return "Gut so. Schau auf den Bildschirm, nicht auf die Finger.";
}

export function fingerHint(want: string | null): string {
  if (!want) return "";
  if (want === " ") return "Leertaste · mit dem Daumen";
  const f = FINGER_OF[want.toLowerCase()];
  if (!f) return `„${want}“`;
  const upper = want !== want.toLowerCase();
  return `„${want}“ · ${FINGER_NAME[f]}` + (upper ? ` + Umschalt mit dem ${f[0] === "l" ? "rechten" : "linken"} kleinen Finger` : "");
}
