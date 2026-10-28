import { describe, expect, it } from "vitest";
import {
  CHILD_GLOSSARY,
  CHILD_GLOSSARY_ALLOWED,
  CHILD_GLOSSARY_EXCEPTIONS,
  findForbiddenChildTerms,
} from "./child-glossary";
import {
  extractVisibleTexts,
  isStudentViewFile,
  listStudentViewFiles,
  readStudentViewTexts,
} from "./testing/visible-texts";

function idsIn(text: string) {
  return findForbiddenChildTerms(text).map((entry) => entry.id);
}

describe("Kinder-Glossar", () => {
  it("hat eindeutige Einträge mit Ersatz und Begründung", () => {
    const ids = CHILD_GLOSSARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of CHILD_GLOSSARY) {
      expect(entry.forbidden.length, entry.id).toBeGreaterThan(0);
      expect(entry.replacement.trim(), entry.id).not.toBe("");
      expect(entry.reason.trim(), entry.id).not.toBe("");
      expect(entry.pattern.global, `${entry.id} darf kein g-Flag haben`).toBe(
        false,
      );
    }
  });

  it("erkennt jedes verbotene Wort in jeder Schreibweise", () => {
    for (const entry of CHILD_GLOSSARY) {
      for (const word of entry.forbidden) {
        expect(idsIn(`Das ist ${word} hier.`), word).toContain(entry.id);
        expect(idsIn(word.toLowerCase()), word).toContain(entry.id);
      }
    }
  });

  it("verbietet die Pflichtwörter der Regel D5-3", () => {
    const required: Record<string, string> = {
      Durchgang: "durchgang",
      Merkstufe: "merkstufe",
      fällig: "faellig",
      Fälligkeit: "faellig",
      Wiederholungsfälligkeit: "wiederholungsfaelligkeit",
      Leitner: "leitner",
      Zahlenraum: "zahlenraum",
      Browserprofil: "browserprofil",
    };
    for (const [word, id] of Object.entries(required)) {
      expect(idsIn(word), word).toContain(id);
    }
  });

  it("trifft keine harmlosen Wörter", () => {
    for (const text of [
      "Noch keine Auffälligkeiten.",
      "Das Fenster hat sich durchgesetzt.",
      "Durchgestrichen ist deine Schreibweise.",
      "Die Wörter kommen morgen wieder.",
      "Heute dran: 5 Karten",
      "Runde 2 von 4 · Stufe 3",
      "Dein Stapel hat 12 Karten.",
    ]) {
      expect(idsIn(text), text).toEqual([]);
    }
  });

  it("lässt „Stapel“ ausdrücklich zu, nicht aber Verwaltungsjargon", () => {
    expect(CHILD_GLOSSARY_ALLOWED.map((entry) => entry.word)).toContain(
      "Stapel",
    );
    expect(idsIn("Neuen Kartenstapel anlegen")).toEqual([]);
    expect(idsIn("Stapelverwaltung öffnen")).toEqual(["stapelverwaltung"]);
  });
});

describe("Sichtbare Texte einer Quelldatei", () => {
  const source = `
    // Durchgang im Kommentar
    import { Durchgang } from "./durchgang-merkstufe";
    /** Merkstufe im Blockkommentar */
    const fällig = 1;
    type Art = "leitner";
    const lookup = { Zahlenraum: 1, "Browserprofil": 2 };
    export function Demo({ merkstufe }: { merkstufe: number }) {
      const label = \`Nächster Durchgang \${merkstufe}\`;
      return (
        <section className="ui-leitner" data-testid="Leitner" id="zahlenraum">
          <h2 aria-label="Dein Durchgang" title={"Fällige Karten"}>Merkstufe wählen</h2>
          <input placeholder="Zahlenraum" />
          <p>{label}</p>
        </section>
      );
    }
  `;

  it("holt JSX-Text, Eigenschaften und Schablonen, aber keinen Code", () => {
    const texts = extractVisibleTexts(source, "demo.tsx").map(
      (entry) => entry.text,
    );
    expect(texts).toEqual([
      "Nächster Durchgang",
      "Dein Durchgang",
      "Fällige Karten",
      "Merkstufe wählen",
      "Zahlenraum",
    ]);
  });

  it("meldet einen absichtlich eingebauten Verstoß mit Zeile", () => {
    const violations = extractVisibleTexts(
      `export const Hinweis = () => (
  <p>Dein Durchgang ist fertig.</p>
);`,
      "hinweis.tsx",
    ).flatMap((entry) => idsIn(entry.text).map((id) => `${id}@${entry.line}`));
    expect(violations).toEqual(["durchgang@2"]);
  });

  it("meldet Verstöße in Texten ohne JSX, zum Beispiel in Wortlisten", () => {
    const texts = extractVisibleTexts(
      `export const COPY = { hint: "Die Merkstufe steigt." };`,
      "copy.ts",
    );
    expect(texts.flatMap((entry) => idsIn(entry.text))).toEqual(["merkstufe"]);
  });
});

describe("Dateien der Schüleransichten", () => {
  it("rechnet Schülerseiten dazu und Lehrer- und Entwicklerseiten heraus", () => {
    for (const file of [
      "app/page.tsx",
      "app/views/wortspeicher/completion-screen.tsx",
      "app/views/laufdiktat/student-dictation-screen.tsx",
      "app/components/first-learning-round.tsx",
      "app/frei/mathematics/mental-math-app.tsx",
      "app/lernen/learner-home.tsx",
      "app/raum/page.tsx",
      "app/lernbox/page.tsx",
      "app/ueben/practice-overview.tsx",
      "app/gast/guest-entry.tsx",
      "src/storage/learning-recommendations.ts",
    ]) {
      expect(isStudentViewFile(file), file).toBe(true);
    }
    for (const file of [
      "app/lehrer/page.tsx",
      "app/entwicklung/screens/page.tsx",
      "app/views/lehrer/start-screen.tsx",
      "app/views/laufdiktat/teacher-dictation/editor.tsx",
      "app/views/laufdiktat/teacher-dictation-screen.tsx",
      "app/views/laufdiktat/math-editor.tsx",
      "app/components/teacher-workspace-manager.tsx",
      "app/ui/shell/teacher-shell.tsx",
      "app/datenschutz/page.tsx",
      "app/impressum/page.tsx",
      "app/sync/rueckkehr/oauth-return.tsx",
      "app/views/wortspeicher/completion-screen.test.tsx",
      "app/views/wortspeicher/completion-screen.module.css",
    ]) {
      expect(isStudentViewFile(file), file).toBe(false);
    }
  });

  const files = listStudentViewFiles();

  it("findet die Schülerdateien im Projekt", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain("app/components/first-learning-round.tsx");
    expect(files.some((file) => file.startsWith("app/lehrer/"))).toBe(false);
  });

  it("nennt in den sichtbaren Schülertexten kein verbotenes Fachwort", () => {
    const violations: string[] = [];
    for (const file of files) {
      for (const { text, line } of readStudentViewTexts(file)) {
        for (const entry of findForbiddenChildTerms(text)) {
          const excused = CHILD_GLOSSARY_EXCEPTIONS.some(
            (exception) =>
              exception.file === file && exception.entry === entry.id,
          );
          if (!excused) {
            violations.push(
              `${file}:${line} „${text.slice(0, 80)}“ → ${entry.replacement} (${entry.id})`,
            );
          }
        }
      }
    }
    expect(
      violations,
      "Fachwort in einem Schülertext. Ersetze es nach src/domain/child-glossary.ts.",
    ).toEqual([]);
  });

  it("hält nur Ausnahmen, die noch gebraucht werden", () => {
    for (const exception of CHILD_GLOSSARY_EXCEPTIONS) {
      expect(exception.reason.trim(), exception.file).not.toBe("");
      expect(files, exception.file).toContain(exception.file);
      const hits = readStudentViewTexts(exception.file).filter((entry) =>
        idsIn(entry.text).includes(exception.entry),
      );
      expect(
        hits.length,
        `${exception.file} braucht die Ausnahme „${exception.entry}“ nicht mehr`,
      ).toBeGreaterThan(0);
    }
  });
});
