/**
 * Lernwortliste der Lehrkraft (Audit E-002, D4). Sie reist wie ein Vokabelpaket
 * durch die verschlüsselte Inhaltsübertragung (24 Stunden, Code oder QR), landet
 * beim Kind aber als Wortbox im Wortspeicher. Die Liste enthält nur Titel und
 * Wörter, nichts über Kinder.
 *
 * Formatänderung: Die Übertragung trägt jetzt zwei Nutzlasten. Das Vokabelpaket
 * behält `schemaVersion: "1.0.0"`, die Lernwortliste hat `"1.1.0"` und
 * `kind: "word-list"`. Ältere App-Versionen kennen nur „1.0.0“ und lehnen die
 * Wortliste beim Prüfen ab; nichts wird übernommen.
 */
import * as z from "zod";
import { isBridgeWord } from "./practice-bridge";
import { WORD_BOX_LIMITS, wordKey } from "./word-box";

export const WORD_LIST_PACKAGE_VERSION = "1.1.0" as const;
/** Höchstzahl der Wörter je Liste (die Wortbox fasst 500). */
export const WORD_LIST_MAX_WORDS = 200;
/** So lang darf der Titel sein, weil er der Name der Wortbox wird. */
export const WORD_LIST_TITLE_MAX = WORD_BOX_LIMITS.titleMax;

const FORBIDDEN_IN_TITLE = /[\p{Cc}\p{Cs}<>]/u;

const titleSchema = z
  .string()
  .trim()
  .min(1)
  .max(WORD_LIST_TITLE_MAX)
  .refine((title) => !FORBIDDEN_IN_TITLE.test(title), {
    message:
      "Im Titel sind Steuerzeichen und die Zeichen < und > nicht erlaubt.",
  });

const wordSchema = z.string().refine(isBridgeWord, {
  message: "Dieses Wort ist nicht erlaubt.",
});

export const wordListPackageSchema = z
  .object({
    schemaVersion: z.literal(WORD_LIST_PACKAGE_VERSION),
    kind: z.literal("word-list"),
    id: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    createdAt: z.iso.datetime({ offset: true }),
    title: titleSchema,
    words: z.array(wordSchema).min(1).max(WORD_LIST_MAX_WORDS),
  })
  .strict()
  .superRefine((list, context) => {
    const seen = new Set<string>();
    for (const [index, word] of list.words.entries()) {
      const key = wordKey(word);
      if (seen.has(key) || word !== word.normalize("NFC").trim()) {
        context.addIssue({
          code: "custom",
          message: `Doppeltes oder ungeordnetes Wort: ${word}`,
          path: ["words", index],
        });
      }
      seen.add(key);
    }
  });

export type WordListPackageV1 = z.infer<typeof wordListPackageSchema>;

export function parseWordListPackage(value: unknown): WordListPackageV1 {
  return wordListPackageSchema.parse(value);
}

/** Was aus dem Textfeld der Lehrkraft als Wortliste erkannt wurde. */
export type WordListReading = {
  /** Gültige Wörter ohne Doppelte, höchstens `WORD_LIST_MAX_WORDS`. */
  words: string[];
  /** Doppelte oder unbrauchbare Einträge (zu lang, Sonderzeichen). */
  ignored: number;
  /** Gültige Wörter jenseits der Höchstzahl. */
  surplus: number;
};

/** Wörter aus einem Textfeld: getrennt durch Komma, Semikolon oder Zeilenumbruch. */
export function readWordListText(text: string): WordListReading {
  const seen = new Set<string>();
  const words: string[] = [];
  let ignored = 0;
  let surplus = 0;
  for (const part of text.split(/[,;\n\r]+/u)) {
    const word = part.trim().normalize("NFC");
    if (!word) continue;
    const key = wordKey(word);
    if (seen.has(key) || !isBridgeWord(word)) {
      ignored += 1;
      continue;
    }
    seen.add(key);
    if (words.length < WORD_LIST_MAX_WORDS) words.push(word);
    else surplus += 1;
  }
  return { words, ignored, surplus };
}

/** Wörter für die Ablage der Lehrkraft: ein Wort je Zeile. */
export const wordListSource = (words: readonly string[]) => words.join("\n");

/** Baut die Nutzlast der Übertragung; wirft eine verständliche Meldung bei Fehlern. */
export function buildWordListPackage(input: {
  id: string;
  revision: number;
  title: string;
  text: string;
  now?: string;
}): WordListPackageV1 {
  const reading = readWordListText(input.text);
  if (reading.words.length === 0) {
    throw new Error("Schreibe mindestens ein gültiges Wort auf.");
  }
  if (reading.surplus > 0) {
    throw new Error(
      `Das sind zu viele Wörter. Eine Liste hat höchstens ${WORD_LIST_MAX_WORDS} Wörter.`,
    );
  }
  const title = input.title.trim();
  if (!title) throw new Error("Gib der Liste einen Titel.");
  if (title.length > WORD_LIST_TITLE_MAX) {
    throw new Error(
      `Der Titel ist zu lang. Er darf höchstens ${WORD_LIST_TITLE_MAX} Zeichen haben.`,
    );
  }
  if (FORBIDDEN_IN_TITLE.test(title)) {
    throw new Error("Im Titel sind die Zeichen < und > nicht erlaubt.");
  }
  return parseWordListPackage({
    schemaVersion: WORD_LIST_PACKAGE_VERSION,
    kind: "word-list",
    id: input.id,
    revision: input.revision,
    createdAt: input.now ?? new Date().toISOString(),
    title,
    words: reading.words,
  });
}
