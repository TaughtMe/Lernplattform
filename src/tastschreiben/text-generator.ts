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

const WORDS_EASY = [
  "Haus", "Baum", "Schule", "Wasser", "Sonne", "Wolke", "Straße", "Fenster", "Garten", "Tisch",
  "Stuhl", "Lampe", "Blume", "Vogel", "Berg", "Fluss", "Wiese", "Wald", "Brot", "Milch",
  "Freund", "Familie", "Hund", "Katze", "Auto", "Fahrrad", "Zeit", "Jahr", "Monat", "Woche",
  "Morgen", "Abend", "Nacht", "Licht", "Farbe", "Musik", "Bild", "Buch", "Papier", "Stift",
];

const WORDS_HARD = [
  "Geburtstag", "Fahrradweg", "Kindergarten", "Herbstwetter", "Sonnenschein", "Wochenende", "Nachbarschaft", "Gemeinschaft",
  "Wissenschaft", "Freundschaft", "Verantwortung", "Möglichkeit", "Gewohnheit", "Erfahrung", "Entwicklung", "Bibliothek",
  "Geschwindigkeit", "Zusammenarbeit", "Veranstaltung", "Rechtschreibung", "Handschrift", "Tastatur", "Bildschirm", "Kopfhörer",
  "Verabredung", "Untersuchung", "Ausflug", "Feuerwehr", "Krankenhaus", "Universität",
];

const SENTENCES_EASY = [
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

const SENTENCES_HARD = [
  "Obwohl es draußen regnete, gingen wir trotzdem spazieren, weil wir frische Luft brauchten.",
  "Nachdem die Schule beendet war, trafen sich alle Schüler:innen noch kurz auf dem Pausenhof.",
  "Die Bibliothekarin, die schon seit zwanzig Jahren dort arbeitet, kennt jedes Buch im Regal.",
  "Wenn man regelmäßig übt, wird das Zehnfingerschreiben mit der Zeit fast automatisch.",
  "Der Zug, der eigentlich um acht Uhr abfahren sollte, hatte an diesem Morgen zehn Minuten Verspätung.",
  "Sobald die ersten Schneeflocken fielen, freuten sich die Kinder auf einen freien Tag.",
  "Man kann nicht nur schneller, sondern auch genauer tippen, wenn man auf den Bildschirm statt auf die Tastatur schaut.",
  "Nachdem er lange überlegt hatte, entschied er sich schließlich doch für den längeren, aber schöneren Weg.",
];

const FREE_TEXTS = [
  "Zehnfingerschreiben braucht vor allem eines: Geduld. Am Anfang fühlen sich die Finger noch unsicher an, aber mit jeder Übung wird die Bewegung selbstverständlicher. Wichtig ist, nicht auf die Tastatur zu schauen — die Finger finden ihren Weg von ganz allein, wenn man ihnen die Zeit dazu gibt.",
  "Ein guter Text zum Abschreiben sollte weder zu leicht noch zu schwer sein. Kurze Wörter wechseln sich mit längeren ab, Kommas und Punkte kommen regelmäßig vor. So übt man genau das, was auch beim echten Schreiben gebraucht wird: flüssige Bewegungen, ohne den Blick von der Vorlage zu nehmen.",
  "Am Anfang zählt nicht die Geschwindigkeit, sondern die Genauigkeit. Wer sich zu früh auf Tempo konzentriert, gewöhnt sich leicht falsche Bewegungen an, die später schwer wieder abzulegen sind. Lieber langsam und richtig als schnell und fehlerhaft — die Geschwindigkeit kommt mit der Zeit von ganz allein.",
];

function generateFromList(list: readonly string[], count: number, seed: string, joiner: string): string {
  const rand = seededRandom(seed);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) picked.push(pick(list, rand));
  return picked.join(joiner);
}

/**
 * Kurze, synthetische "Wörter" (2-4 Buchstaben) aus einem begrenzten
 * Tastenpool — für Spiele wie Buchstabenregen, solange noch nicht alle
 * Tasten gelernt sind. Kein echtes Deutsch, aber genau die Tasten, die
 * gerade geübt werden.
 */
export function generateWordPool(availableKeys: string[], count: number, seed: string): string[] {
  const rand = seededRandom(seed);
  const pool = availableKeys.filter((k) => k !== " ");
  if (pool.length === 0) return [];
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + Math.floor(rand() * 3);
    let word = "";
    for (let j = 0; j < len; j++) word += pick(pool, rand);
    words.push(word);
  }
  return words;
}

export function generateWords(count: number, seed: string, difficulty: "easy" | "hard" = "easy"): string {
  const list = difficulty === "hard" ? WORDS_HARD : WORDS_EASY;
  return generateFromList(list, count, seed, " ").toLowerCase();
}

export function generateSentences(count: number, seed: string, difficulty: "easy" | "hard" = "easy"): string {
  const list = difficulty === "hard" ? SENTENCES_HARD : SENTENCES_EASY;
  return generateFromList(list, count, seed, " ");
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
      return generateWords(WORD_COUNT, seed, lesson.difficulty);
    case "sentences":
      return generateSentences(SENTENCE_COUNT, seed, lesson.difficulty);
    case "free-text":
      return pickFreeText(seed);
  }
}
