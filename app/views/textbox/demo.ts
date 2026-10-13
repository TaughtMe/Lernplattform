/**
 * Beispieldaten aus der Design-Vorlage (Turn 9, Konstanten `TB_*`). Grundlage
 * für den Katalog unter /entwicklung/screens und den Designvergleich. Die
 * Kontroll-Beispiele liegen als fertige `WordResult[]` vor, damit die
 * Ansichten ohne Fachlogik rendern.
 *
 * Die Schwerpunkt-Namen der Vorlage („Groß und klein“, „Wortbausteine“) gelten
 * nur hier; im Produkt stehen sie in `TEXTBOX_PHENOMENON_LABELS`.
 */
import type { WordResult } from "../../../src/domain/text-compare";
import type { TextboxTextSummary } from "../../../src/domain/textbox-progress";
import type {
  TextboxRoundResult,
  TextboxSession,
} from "../../../src/domain/textbox-session";
import type {
  TextboxDifficulty,
  TextboxPhenomenon,
  TextboxText,
} from "../../../src/domain/textbox-text";
import type { LibraryEntry } from "./library-screen";

export const DEMO_PHENOMENON_LABELS: Record<TextboxPhenomenon, string> = {
  doppelkonsonanten: "Doppelkonsonanten",
  vokallaenge: "Lange und kurze Vokale",
  "dehnungs-h": "Dehnungs-h",
  ie: "Wörter mit ie",
  "s-ss-sz": "s, ss und ß",
  "gross-klein": "Groß und klein",
  auslautverhaertung: "Auslautverhärtung",
  wortbausteine: "Wortbausteine",
  zusammensetzungen: "Zusammengesetzte Wörter",
  gemischt: "Gemischt",
};

export type DemoLibraryText = {
  title: string;
  difficulty: TextboxDifficulty;
  phenomena: readonly TextboxPhenomenon[];
  /** Bestwert in Prozent, `null` ohne abgeschlossene Übung. */
  best: number | null;
  /** Anzahl abgeschlossener Übungen. */
  count: number;
  /** Offener Durchgang einer angefangenen Einheit. */
  open?: 1 | 2 | 3 | 4;
};

export const DEMO_LIBRARY: readonly DemoLibraryText[] = [
  {
    title: "Im Schwimmbad",
    difficulty: "leicht",
    phenomena: ["doppelkonsonanten", "s-ss-sz"],
    best: 78,
    count: 2,
    open: 2,
  },
  {
    title: "Der kleine Hund",
    difficulty: "leicht",
    phenomena: ["auslautverhaertung"],
    best: 92,
    count: 4,
  },
  {
    title: "Mein Schulweg",
    difficulty: "leicht",
    phenomena: ["dehnungs-h"],
    best: null,
    count: 0,
  },
  {
    title: "Am Bach",
    difficulty: "leicht",
    phenomena: ["doppelkonsonanten"],
    best: 64,
    count: 1,
  },
  {
    title: "Beim Bäcker",
    difficulty: "leicht",
    phenomena: ["wortbausteine"],
    best: null,
    count: 0,
  },
  {
    title: "Die Biene",
    difficulty: "leicht",
    phenomena: ["ie"],
    best: 100,
    count: 3,
  },
  {
    title: "Der Hase im Wald",
    difficulty: "mittel",
    phenomena: ["auslautverhaertung", "ie"],
    best: null,
    count: 0,
  },
  {
    title: "Das Fußballspiel",
    difficulty: "mittel",
    phenomena: ["s-ss-sz", "zusammensetzungen"],
    best: 71,
    count: 2,
  },
  {
    title: "Unser Klassenzimmer",
    difficulty: "mittel",
    phenomena: ["doppelkonsonanten", "zusammensetzungen"],
    best: null,
    count: 0,
  },
  {
    title: "Der Regentag",
    difficulty: "mittel",
    phenomena: ["dehnungs-h", "vokallaenge"],
    best: 58,
    count: 1,
  },
  {
    title: "Im Schnee",
    difficulty: "mittel",
    phenomena: ["gross-klein"],
    best: null,
    count: 0,
  },
  {
    title: "Ein Ausflug zum Zoo",
    difficulty: "mittel",
    phenomena: ["vokallaenge"],
    best: 83,
    count: 2,
  },
  {
    title: "Wie Bienen leben",
    difficulty: "schwer",
    phenomena: ["ie", "gross-klein"],
    best: null,
    count: 0,
  },
  {
    title: "Die Reise nach Hamburg",
    difficulty: "schwer",
    phenomena: ["gemischt"],
    best: 66,
    count: 1,
    open: 3,
  },
  {
    title: "Das Geheimnis der alten Mühle",
    difficulty: "schwer",
    phenomena: ["dehnungs-h", "doppelkonsonanten"],
    best: null,
    count: 0,
  },
  {
    title: "Wasser auf der Erde",
    difficulty: "schwer",
    phenomena: ["s-ss-sz", "wortbausteine"],
    best: null,
    count: 0,
  },
];

export const DEMO_TEXT_TITLE = "Im Schwimmbad";
/** „Leicht · Doppelkonsonanten“ wie im Kopf der Eingabe. */
export const DEMO_TEXT_META = "Leicht · Doppelkonsonanten";

export const DEMO_TEXT =
  "Im Sommer ist es heiß. Wir gehen ins Schwimmbad und springen ins Wasser. Das Wasser ist nass und kalt. Auf der Wiese essen wir ein großes Eis. Papa isst eine Brezel. Ich muss mein Handtuch auswringen, weil es ganz nass ist. Am Abend gehen wir müde nach Hause.";

export const DEMO_TARGET_WORDS: readonly string[] = [
  "Sommer",
  "heiß",
  "Schwimmbad",
  "Wasser",
  "nass",
  "essen",
  "großes",
  "isst",
  "muss",
];

/** Ein durch Leerzeichen getrenntes Stück des Beispieltextes mit seinen Satzzeichen. */
export type DemoToken = { index: number; word: string; punct: string };

export const DEMO_TOKENS: readonly DemoToken[] = DEMO_TEXT.split(" ").map(
  (chunk, index) => {
    const match = /^(.*?)([.,!?]*)$/.exec(chunk);
    return { index, word: match?.[1] ?? chunk, punct: match?.[2] ?? "" };
  },
);

/** Positionen der Lücken je Durchgang (Durchgang 4 hat keine). */
export const DEMO_GAP_SETS: Record<1 | 2 | 3, readonly number[]> = (() => {
  const first = DEMO_TOKENS.filter((t) => DEMO_TARGET_WORDS.includes(t.word));
  const second = DEMO_TOKENS.filter(
    (t) => first.includes(t) || t.word.length >= 6,
  );
  const third = DEMO_TOKENS.filter(
    (t) => second.includes(t) || t.word.length >= 4,
  );
  return {
    1: first.map((t) => t.index),
    2: second.map((t) => t.index),
    3: third.map((t) => t.index),
  };
})();

/** Falsche Schreibweisen aus der Vorlage (Wort → Eingabe). */
export const DEMO_MISSPELLINGS: Readonly<Record<string, string>> = {
  Sommer: "Somer",
  Schwimmbad: "schwimmbad",
  isst: "ist",
  muss: "mus",
  großes: "grosses",
  Handtuch: "Hanttuch",
};

/** Beispiel-Eingabe für Durchgang 4: der ganze Text, „ganz“ fehlt. */
export const DEMO_FREE_TEXT = DEMO_TOKENS.filter((t) => t.word !== "ganz")
  .map((t) => (DEMO_MISSPELLINGS[t.word] ?? t.word) + t.punct)
  .join(" ");

/** Ergebnis eines Wortes aus dem Beispiel: richtig oder mit der Schreibweise der Vorlage falsch. */
function gapResult(token: DemoToken): WordResult {
  const actual = DEMO_MISSPELLINGS[token.word] ?? token.word;
  const wordIndex = token.index;
  if (actual === token.word) {
    return {
      kind: "richtig",
      expected: token.word,
      actual,
      expectedIndex: wordIndex,
      nearMiss: false,
    };
  }
  return {
    kind: "falsch",
    expected: token.word,
    actual,
    expectedIndex: wordIndex,
    nearMiss: false,
  };
}

/** Kontrolle Durchgang 1: nur die Lückenwörter, in Textreihenfolge. */
export const DEMO_GAP_RESULTS: readonly WordResult[] = DEMO_GAP_SETS[1].map(
  (index) => gapResult(DEMO_TOKENS[index] as DemoToken),
);

/**
 * Kontrolle Durchgang 4: Beispiel-Eingabe gegen den Text, fertig ausgerichtet.
 * Falsch geschriebene Wörter stehen als `falsch`, das fehlende „ganz“ als `fehlt`.
 */
export const DEMO_FREE_RESULTS: readonly WordResult[] = DEMO_TOKENS.map(
  (token): WordResult => {
    if (token.word === "ganz") {
      return {
        kind: "fehlt",
        expected: token.word,
        expectedIndex: token.index,
        nearMiss: false,
      };
    }
    return gapResult(token);
  },
);

/** Beispieleinträge für die Auswahl (9b/9c): Texte, Bestwerte und offene Einheiten der Vorlage. */
export function demoLibraryEntries(): LibraryEntry[] {
  return DEMO_LIBRARY.map((entry, index) => {
    const id = `TXT-${String(900 + index)}`;
    const text: TextboxText = {
      id,
      title: entry.title,
      difficulty: entry.difficulty,
      phenomena: [...entry.phenomena],
      genre: "alltag",
      text: DEMO_TEXT,
      targetWords: [...DEMO_TARGET_WORDS],
      usage: ["frei"],
    };
    const summary: TextboxTextSummary | undefined =
      entry.count > 0
        ? {
            textId: id,
            sessions: entry.count,
            ...(entry.best === null ? {} : { bestPercent: entry.best }),
            history: [],
          }
        : undefined;
    const open: TextboxSession | undefined = entry.open
      ? {
          id: `demo-${id}`,
          textId: id,
          difficulty: entry.difficulty,
          status: "laufend",
          seed: id,
          startedAt: "2026-10-12T08:00:00.000Z",
          updatedAt: "2026-10-12T08:00:00.000Z",
          rounds: Array.from({ length: entry.open - 1 }, (_, k) =>
            demoRoundResult((k + 1) as 1 | 2 | 3),
          ),
        }
      : undefined;
    return { text, summary, open };
  });
}

function demoRoundResult(round: 1 | 2 | 3): TextboxRoundResult {
  return {
    round,
    blanked: [],
    words: [],
    score: {
      percent: 0,
      correct: 0,
      total: 0,
      extra: 0,
      byKind: {
        richtig: 0,
        falsch: 0,
        "gross-klein": 0,
        fehlt: 0,
        zusaetzlich: 0,
      },
      punctuationHints: 0,
    },
    memorizeMs: 0,
    writingMs: 0,
  };
}

/** Kontrolle als fertiges Rundenergebnis: Durchgang 1 (Lücken) oder 4 (frei geschrieben). */
export function demoReviewResult(round: 1 | 4): TextboxRoundResult {
  const words = round === 1 ? DEMO_GAP_RESULTS : DEMO_FREE_RESULTS;
  const count = (kind: WordResult["kind"]) =>
    words.filter((word) => word.kind === kind).length;
  const correct = count("richtig");
  const total = words.length;
  return {
    ...demoRoundResult(1),
    round,
    blanked: round === 1 ? [...DEMO_GAP_SETS[1]] : [],
    words: [...words],
    score: {
      percent: Math.round((correct / total) * 100),
      correct,
      total,
      extra: count("zusaetzlich"),
      byKind: {
        richtig: correct,
        falsch: count("falsch"),
        "gross-klein": count("gross-klein"),
        fehlt: count("fehlt"),
        zusaetzlich: count("zusaetzlich"),
      },
      punctuationHints: 0,
    },
  };
}
