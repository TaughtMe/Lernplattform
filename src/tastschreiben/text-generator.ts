import { lookupChar } from "./keyboard-layout.ts";
import { availableKeysThrough, type LessonDef } from "./curriculum.ts";

// --- Kleiner, seed-basierter Zufallsgenerator (deterministisch, aber nicht nur eine feste Reihenfolge). ---

function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

export interface DrillOptions {
  newKeys: string[];
  availableKeys: string[];
  introducesShift?: boolean;
  length: number;
  seed: string;
}

/**
 * Buchstabengruppen à 2-5 Zeichen, wie in klassischen Tipptrainern — mit
 * Bevorzugung der gerade neuen Tasten, gemischt mit bereits gelernten, damit
 * nichts vergessen wird. Bei introducesShift werden nur Buchstaben verwendet
 * und in ihre Großschreibung übersetzt (Zahlen/Satzzeichen haben kein
 * sinnvolles "Großschreiben").
 */
export function generateDrillText(opts: DrillOptions): string {
  const rand = seededRandom(opts.seed);
  const isLetter = (c: string) => /\p{L}/u.test(c);

  const basePool = opts.introducesShift ? opts.availableKeys.filter(isLetter) : opts.availableKeys.filter((k) => k !== " ");
  const newPool = opts.introducesShift ? opts.newKeys.filter(isLetter) : opts.newKeys.filter((k) => k !== " ");
  const fallback = basePool.length > 0 ? basePool : newPool;

  function nextChar(): string {
    const useNew = newPool.length > 0 && rand() < 0.6;
    const source = useNew ? newPool : fallback;
    const char = pick(source, rand);
    if (!opts.introducesShift) return char;
    return lookupChar(char)?.key.shift ?? char.toUpperCase();
  }

  const words: string[] = [];
  let total = 0;
  while (total < opts.length) {
    const wordLen = 2 + Math.floor(rand() * 4);
    let word = "";
    for (let i = 0; i < wordLen; i++) word += nextChar();
    words.push(word);
    total += wordLen;
  }
  return words.join(" ");
}

// --- Kuratierte Wort-/Satzlisten für die Lektionen ab "alle Tasten bekannt". ---

const WORDS = [
  "Haus", "Baum", "Schule", "Wasser", "Sonne", "Wolke", "Straße", "Fenster", "Garten", "Tisch",
  "Stuhl", "Lampe", "Blume", "Vogel", "Berg", "Fluss", "Wiese", "Wald", "Brot", "Milch",
  "Freund", "Familie", "Hund", "Katze", "Auto", "Fahrrad", "Zeit", "Jahr", "Monat", "Woche",
  "Morgen", "Abend", "Nacht", "Licht", "Farbe", "Musik", "Bild", "Buch", "Papier", "Stift",
];

const SENTENCES = [
  "Die Sonne scheint über dem Garten.",
  "Wir lesen jeden Abend ein Buch.",
  "Der Zug fährt pünktlich um acht Uhr ab.",
  "Am Wochenende backen wir frisches Brot.",
  "Im Herbst fallen die Blätter von den Bäumen.",
  "Unsere Katze schläft am liebsten auf dem Sofa.",
  "Die Kinder spielen fröhlich im Park.",
  "Nach der Schule treffen wir unsere Freunde.",
  "Im Winter schneit es oft in den Bergen.",
  "Die Bibliothek öffnet um neun Uhr morgens.",
];

const FREE_TEXTS = [
  "Zehnfingerschreiben braucht vor allem eines: Geduld. Am Anfang fühlen sich die Finger noch unsicher an, aber mit jeder Übung wird die Bewegung selbstverständlicher. Wichtig ist, nicht auf die Tastatur zu schauen — die Finger finden ihren Weg von ganz allein, wenn man ihnen die Zeit dazu gibt.",
  "Ein guter Text zum Abschreiben sollte weder zu leicht noch zu schwer sein. Kurze Wörter wechseln sich mit längeren ab, Kommas und Punkte kommen regelmäßig vor. So übt man genau das, was auch beim echten Schreiben gebraucht wird: flüssige Bewegungen, ohne den Blick von der Vorlage zu nehmen.",
];

function generateFromList(list: readonly string[], count: number, seed: string, joiner: string): string {
  const rand = seededRandom(seed);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) picked.push(pick(list, rand));
  return picked.join(joiner);
}

export function generateWords(count: number, seed: string): string {
  return generateFromList(WORDS, count, seed, " ").toLowerCase();
}

export function generateSentences(count: number, seed: string): string {
  return generateFromList(SENTENCES, count, seed, " ");
}

export function pickFreeText(seed: string): string {
  const rand = seededRandom(seed);
  return pick(FREE_TEXTS, rand);
}

const DRILL_LENGTH = 60;
const WORD_COUNT = 12;
const SENTENCE_COUNT = 4;

export function generatePracticeText(lesson: LessonDef, seed: string): string {
  switch (lesson.kind) {
    case "drill":
      return generateDrillText({
        newKeys: lesson.newKeys,
        availableKeys: availableKeysThrough(lesson.id),
        introducesShift: lesson.introducesShift,
        length: DRILL_LENGTH,
        seed,
      });
    case "words":
      return generateWords(WORD_COUNT, seed);
    case "sentences":
      return generateSentences(SENTENCE_COUNT, seed);
    case "free-text":
      return pickFreeText(seed);
  }
}
