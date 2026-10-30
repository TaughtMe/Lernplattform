import type {
  CompetenceEntry,
  CompetenceLevel,
} from "../../../src/domain/competence-profile";
import type { ClassModule } from "../../../src/domain/class-workspace";

/**
 * Kindertexte zum Kompetenzprofil. Das Profil liefert nur Codes und Zahlen; die
 * Sätze entstehen hier, kurz und ohne Fachwörter.
 */

export const COMPETENCE_LEVEL_LABELS: Readonly<
  Record<CompetenceLevel, string>
> = {
  neu: "neu",
  "im-aufbau": "im Aufbau",
  sicher: "sicher",
};

const GROUPS: ReadonlyArray<{ module: ClassModule; title: string }> = [
  { module: "german", title: "Rechtschreibung" },
  { module: "mathematics", title: "Kopfrechnen" },
  { module: "vocabulary", title: "Vokabeln" },
  { module: "typing", title: "Tastenwelt" },
];

export type ProfileRow = {
  id: string;
  label: string;
  level: CompetenceLevel;
  levelLabel: string;
  explanation: string;
  practiceHref: string;
};

export type ProfileGroup = { id: string; title: string; rows: ProfileRow[] };

const MATH_MISSING: Readonly<Record<string, string>> = {
  box: "Ein Fehler wartet noch auf eine Wiederholung.",
  days: "Übe auch an einem anderen Tag.",
  breadth: "Übe noch mehr verschiedene Aufgaben.",
};

/**
 * Vokabelstapel: Aufdecken zählt für die Bedeutung, das Schreiben steht extra.
 * So sieht das Kind, dass ein Stapel „sicher“ sein kann und Schreiben trotzdem
 * noch offen ist.
 */
function writingSentence(entry: CompetenceEntry): string {
  if (!entry.writing) return "";
  if (entry.writing.practiced === 0) {
    return " Schreiben hast du hier noch nicht geübt.";
  }
  if (entry.writing.practiced < entry.objects) {
    return ` Geschrieben hast du ${entry.writing.practiced} von ${entry.objects} Karten.`;
  }
  return "";
}

/** Ein Satz (bei Vokabeln zwei), warum der Teilbereich so heißt. */
export function competenceExplanation(entry: CompetenceEntry): string {
  const reason = entry.reason;
  switch (reason.code) {
    case "no-answers":
      return "Hier hast du noch nichts geübt.";
    case "safe":
      return entry.kind === "vokabelstapel"
        ? `Das sitzt. Du hast die Karten an mehreren Tagen richtig gewusst.${writingSentence(entry)}`
        : "Das sitzt. Du hast es an mehreren Tagen ohne Hilfe richtig gemacht.";
    case "no-recall-box":
      return "Du übst hier. Mehr messen wir hier noch nicht.";
    case "building": {
      if (entry.kind === "rechenart") {
        return reason.missing
          .map((missing) => MATH_MISSING[missing])
          .filter(Boolean)
          .join(" ");
      }
      const noun = entry.kind === "vokabelstapel" ? "Karten" : "Wörtern";
      return `${entry.safe} von ${entry.objects} ${noun} sind sicher. Für „sicher“ brauchst du ${entry.needed}.${writingSentence(entry)}`;
    }
  }
}

/** Gruppen in fester Reihenfolge; leere Gruppen entfallen. */
export function profileGroups(
  entries: readonly CompetenceEntry[],
): ProfileGroup[] {
  return GROUPS.flatMap(({ module, title }) => {
    const rows = entries
      .filter((entry) => entry.module === module)
      .map((entry): ProfileRow => ({
        id: entry.id,
        label: entry.label,
        level: entry.level,
        levelLabel: COMPETENCE_LEVEL_LABELS[entry.level],
        explanation: competenceExplanation(entry),
        practiceHref: entry.route,
      }));
    return rows.length > 0 ? [{ id: module, title, rows }] : [];
  });
}
