import { availableKeysThrough, type LessonDef } from "./curriculum";
import { lookupTypingCharacter } from "./keyboard-layout";

function seededRandom(seed: string) {
  let state = 0x811c9dc5;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function generateDrill(lesson: LessonDef, seed: string) {
  const random = seededRandom(seed);
  const available = (
    lesson.practiceKeys ?? availableKeysThrough(lesson.id)
  ).filter((key) => key !== " ");
  const newKeys = lesson.newKeys.filter((key) => key !== " ");
  const letters = available.filter((key) => /\p{L}/u.test(key));
  const basePool = lesson.introducesShift ? letters : available;
  const focusPool = lesson.introducesShift
    ? letters
    : lesson.practiceKeys
      ? available
      : newKeys.length > 0
        ? newKeys
        : basePool;
  const fallback = basePool.length > 0 ? basePool : focusPool;
  const groups: string[] = [];
  let length = 0;

  while (length < 60) {
    const groupLength = 2 + Math.floor(random() * 4);
    let group = "";
    for (let index = 0; index < groupLength; index += 1) {
      const source =
        focusPool.length > 0 && random() < 0.6 ? focusPool : fallback;
      const char = pick(source, random);
      group += lesson.introducesShift
        ? (lookupTypingCharacter(char)?.key.shift ?? char.toUpperCase())
        : char;
    }
    groups.push(group);
    length += groupLength;
  }
  return groups.join(lesson.keyboard === "numpad" ? "" : " ");
}

const words = [
  "Haus",
  "Baum",
  "Schule",
  "Wasser",
  "Sonne",
  "Wolke",
  "Fenster",
  "Garten",
  "Tisch",
  "Stuhl",
  "Lampe",
  "Blume",
  "Vogel",
  "Berg",
  "Fluss",
  "Wiese",
  "Wald",
  "Brot",
  "Milch",
  "Freund",
  "Familie",
  "Fahrrad",
  "Morgen",
  "Abend",
  "Licht",
  "Farbe",
  "Musik",
  "Buch",
];

const sentences = [
  "Die Sonne scheint über dem Garten.",
  "Wir lesen jeden Abend ein Buch.",
  "Der Zug fährt pünktlich um acht Uhr ab.",
  "Am Wochenende backen wir frisches Brot.",
  "Die Kinder spielen gemeinsam im Park.",
  "Nach der Schule treffen wir unsere Freunde.",
];

const paragraphs = [
  "Zehnfingerschreiben braucht Geduld. Am Anfang fühlen sich die Finger noch unsicher an. Mit jeder ruhigen Übung werden die Bewegungen selbstverständlicher.",
  "Beim Tippen zählt zuerst die Genauigkeit. Ein gleichmäßiger Rhythmus ist hilfreicher als hohes Tempo. Die Geschwindigkeit wächst später von allein.",
];

function chooseSeveral(list: readonly string[], count: number, seed: string) {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => pick(list, random));
}

export function generateTypingPracticeText(lesson: LessonDef, seed: string) {
  if (lesson.kind === "drill") return generateDrill(lesson, seed);
  if (lesson.kind === "words")
    return chooseSeveral(lesson.wordPool ?? words, 12, seed)
      .join(" ")
      .toLowerCase();
  if (lesson.kind === "sentences")
    return chooseSeveral(sentences, 3, seed).join(" ");
  return pick(paragraphs, seededRandom(seed));
}
