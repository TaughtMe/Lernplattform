import * as z from "zod";
import { wordKey } from "./word-box";

/**
 * Gleich klingende Wörter (Plan 2.4, 3.5). Beim Hören sind sie nicht
 * unterscheidbar, deshalb steht in Stufe 6 immer eine kurze Bedeutungshilfe
 * unter dem Lautsprecher. Die Lehrkraft prüft die Liste fachlich
 * (siehe docs/inhalte/wortspeicher.md).
 */
export type HomophoneGroup = { words: Record<string, string> };

const groupSchema = z
  .object({
    words: z
      .record(
        z.string().trim().min(1).max(40),
        z.string().trim().min(1).max(60),
      )
      .refine((words) => Object.keys(words).length >= 2, {
        message: "Eine Gruppe braucht mindestens zwei Wörter.",
      }),
  })
  .strict();

const RAW_GROUPS: HomophoneGroup[] = [
  { words: { Rad: "zum Fahren", Rat: "ein guter Tipp" } },
  { words: { Meer: "das große Wasser", mehr: "eine größere Menge" } },
  { words: { Weg: "eine Straße oder ein Pfad", weg: "nicht mehr da" } },
  { words: { Feld: "ein Acker", fällt: "von fallen" } },
  { words: { Lied: "zum Singen", Lid: "am Auge" } },
  { words: { Stadt: "ein großer Ort", statt: "anstelle von" } },
  { words: { Wahl: "man wählt jemanden", Wal: "ein Tier im Meer" } },
  { words: { Mahl: "ein Essen", Mal: "das erste Mal" } },
  { words: { wieder: "noch einmal", wider: "gegen" } },
  { words: { lehren: "unterrichten", leeren: "leer machen" } },
  { words: { Sohle: "unter dem Schuh", Sole: "Salzwasser" } },
  { words: { Leib: "der Körper", Laib: "ein Laib Brot" } },
  { words: { malen: "mit Farbe", mahlen: "Korn zu Mehl machen" } },
  { words: { Seite: "im Buch", Saite: "an der Gitarre" } },
  { words: { Stiel: "an der Blume", Stil: "Art und Weise" } },
  {
    words: { Waise: "ein Kind ohne Eltern", Weise: "klug oder Art und Weise" },
  },
  { words: { Bären: "große Tiere im Wald", Beeren: "Früchte am Strauch" } },
  { words: { viel: "eine große Menge", fiel: "von fallen" } },
  { words: { wahr: "richtig, nicht gelogen", war: "von sein" } },
  { words: { das: "das Haus", dass: "leitet einen Nebensatz ein" } },
];

export const HOMOPHONE_GROUPS: readonly HomophoneGroup[] = RAW_GROUPS.map(
  (group) => groupSchema.parse(group),
);

function groupOf(word: string): HomophoneGroup | undefined {
  const exact = word.normalize("NFC").trim();
  return (
    HOMOPHONE_GROUPS.find((group) => exact in group.words) ??
    HOMOPHONE_GROUPS.find((group) =>
      Object.keys(group.words).some(
        (entry) => wordKey(entry) === wordKey(exact),
      ),
    )
  );
}

/** Bedeutungshilfe für ein gleich klingendes Wort („zum Fahren“ für „Rad“). */
export function homophoneHint(word: string): string | undefined {
  const group = groupOf(word);
  if (!group) return undefined;
  const exact = word.normalize("NFC").trim();
  const entry =
    Object.entries(group.words).find(([key]) => key === exact) ??
    Object.entries(group.words).find(
      ([key]) => wordKey(key) === wordKey(exact),
    );
  return entry?.[1];
}

/**
 * Ist `input` ein anderes Wort derselben Gruppe wie `target`? Reine
 * Groß-/Kleinunterschiede („Weg“/„weg“) zählen nicht, sie bleiben Schreibfehler.
 */
export function isHomophoneOf(target: string, input: string): boolean {
  const group = groupOf(target);
  if (!group) return false;
  const targetKey = wordKey(target);
  const inputKey = wordKey(input);
  if (targetKey === inputKey) return false;
  return Object.keys(group.words).some((entry) => wordKey(entry) === inputKey);
}
