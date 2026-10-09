import * as z from "zod";
import type {
  LearningWordCollection,
  SpellingStrategy,
} from "./german-learning-content";

/** Grenzen für Wortboxen (kalibrierbar, Plan 2.2). */
export const WORD_BOX_LIMITS = {
  titleMax: 60,
  wordMax: 60,
  wordsPerBox: 500,
  ownBoxes: 50,
} as const;

export const UNTERRICHT_BOX_ID = "unterricht";
export const UNTERRICHT_BOX_TITLE = "Aus dem Unterricht";

/** Schlüssel zum Vergleichen von Wörtern: NFC, ohne Rand, klein geschrieben. */
export function wordKey(word: string): string {
  return word.normalize("NFC").trim().toLocaleLowerCase("de-DE");
}

const instant = z.iso.datetime({ offset: true });
const wordText = z
  .string()
  .trim()
  .min(1)
  .max(WORD_BOX_LIMITS.wordMax)
  .regex(/^[^\p{Cc}<>]+$/u);

export const wordBoxWordSchema = z
  .object({
    text: wordText,
    addedAt: instant,
    source: z.enum(["eigen", "laufdiktat", "textbox", "kopie"]),
  })
  .strict();

export const wordBoxSchema = z
  .object({
    id: z.string().regex(/^(eigen-[0-9a-f-]{36}|unterricht)$/),
    kind: z.enum(["eigen", "unterricht"]),
    title: z.string().trim().min(1).max(WORD_BOX_LIMITS.titleMax),
    words: z.array(wordBoxWordSchema).max(WORD_BOX_LIMITS.wordsPerBox),
    createdAt: instant,
    updatedAt: instant,
  })
  .strict()
  .refine((box) => (box.id === "unterricht") === (box.kind === "unterricht"), {
    message: "Id und Art der Wortbox passen nicht zusammen.",
    path: ["kind"],
  });

export type WordBoxWord = z.infer<typeof wordBoxWordSchema>;
export type WordBoxWordSource = WordBoxWord["source"];
export type WordBox = z.infer<typeof wordBoxSchema>;

/** Einheitliche Sicht auf feste, eigene und vorübergehende Wortboxen. */
export type WordBoxView = {
  /** Sammlungs-Id, `eigen-<uuid>`, `unterricht`, `faellig` oder `textbox`. */
  id: string;
  kind: "fest" | "eigen" | "unterricht" | "faellig" | "textbox";
  title: string;
  words: string[];
  strategy?: SpellingStrategy;
  editable: boolean;
};

export function isValidWordBoxWord(word: string): boolean {
  return wordText.safeParse(word.normalize("NFC")).success;
}

export function isValidWordBoxTitle(title: string): boolean {
  return z.string().trim().min(1).max(WORD_BOX_LIMITS.titleMax).safeParse(title)
    .success;
}

/**
 * Fügt Wörter hinzu. Doppelte (nach `wordKey`) werden ohne Rückfrage
 * zusammengelegt; ungültige Wörter und alles über der Grenze meldet `skipped`.
 */
export function addWords(
  box: WordBox,
  words: readonly string[],
  source: WordBoxWordSource,
  now: string,
): { box: WordBox; added: string[]; skipped: string[] } {
  const known = new Set(box.words.map((entry) => wordKey(entry.text)));
  const next = [...box.words];
  const added: string[] = [];
  const skipped: string[] = [];

  for (const raw of words) {
    const text = raw.normalize("NFC").trim();
    const key = wordKey(text);
    if (known.has(key)) continue;
    if (
      !isValidWordBoxWord(text) ||
      next.length >= WORD_BOX_LIMITS.wordsPerBox
    ) {
      skipped.push(raw);
      continue;
    }
    known.add(key);
    next.push({ text, addedAt: now, source });
    added.push(text);
  }

  if (added.length === 0) return { box, added, skipped };
  return { box: { ...box, words: next, updatedAt: now }, added, skipped };
}

/**
 * Ändert ein Wort. Entsteht dabei ein Wort, das es schon gibt, werden beide
 * zusammengelegt (das vorhandene bleibt, das geänderte entfällt).
 */
export function renameWord(
  box: WordBox,
  from: string,
  to: string,
  now: string,
): WordBox {
  const text = to.normalize("NFC").trim();
  if (!isValidWordBoxWord(text)) {
    throw new Error("Dieses Wort ist nicht gültig.");
  }
  const fromKey = wordKey(from);
  const index = box.words.findIndex((entry) => wordKey(entry.text) === fromKey);
  if (index < 0) return box;
  const toKey = wordKey(text);
  const other = box.words.findIndex(
    (entry, position) => position !== index && wordKey(entry.text) === toKey,
  );
  const current = box.words[index]!;
  if (other < 0 && current.text === text) return box;
  const words =
    other >= 0
      ? box.words.filter((_, position) => position !== index)
      : box.words.map((entry, position) =>
          position === index ? { ...entry, text } : entry,
        );
  return { ...box, words, updatedAt: now };
}

export function removeWord(box: WordBox, word: string, now: string): WordBox {
  const key = wordKey(word);
  const words = box.words.filter((entry) => wordKey(entry.text) !== key);
  return words.length === box.words.length
    ? box
    : { ...box, words, updatedAt: now };
}

const COPY_SUFFIX = " (Kopie)";

/** Legt aus einer festen Wortbox eine eigene Wortbox „<Titel> (Kopie)“ an. */
export function copyCollection(
  collection: LearningWordCollection,
  id: string,
  now: string,
): WordBox {
  const title = `${collection.title.slice(
    0,
    WORD_BOX_LIMITS.titleMax - COPY_SUFFIX.length,
  )}${COPY_SUFFIX}`;
  const seen = new Set<string>();
  const words: WordBoxWord[] = [];
  for (const word of collection.words) {
    const key = wordKey(word);
    if (seen.has(key) || words.length >= WORD_BOX_LIMITS.wordsPerBox) continue;
    seen.add(key);
    words.push({ text: word.normalize("NFC"), addedAt: now, source: "kopie" });
  }
  return { id, kind: "eigen", title, words, createdAt: now, updatedAt: now };
}

/** Reihenfolge nach Plan 2.2: Unterricht, eigene (zuletzt geändert), feste. */
export function allWordBoxViews(
  own: readonly WordBox[],
  collections: readonly LearningWordCollection[],
): WordBoxView[] {
  const view = (box: WordBox): WordBoxView => ({
    id: box.id,
    kind: box.kind,
    title: box.title,
    words: box.words.map((entry) => entry.text),
    editable: true,
  });
  const lesson = own.filter((box) => box.kind === "unterricht").map(view);
  const mine = own
    .filter((box) => box.kind === "eigen")
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.id.localeCompare(right.id),
    )
    .map(view);
  const fixed = collections.map((collection): WordBoxView => ({
    id: collection.id,
    kind: "fest",
    title: collection.title,
    words: [...collection.words],
    strategy: collection.strategy,
    editable: false,
  }));
  return [...lesson, ...mine, ...fixed];
}
