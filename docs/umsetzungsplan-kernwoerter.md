# Umsetzungsplan Kernwörter: Schema, Einbau in den Wortspeicher, erstes Muster

Stand: 15.11.2026. Grundlage: Bericht 20
(`docs/vision/20-rechtschreibung-handschrift.md`, Bausteine R20-2 und R20-3,
Fachteil 4.2 und 4.3), Entscheidungen 30, 68 und 75, Roadmap Etappe 3
(„Kernwörter“). Das Muster mit 30 Wörtern liegt in
`docs/inhalte/kernwoerter-muster-auslautverhaertung.md`.

Dieser Plan ist ein Bauplan für eine Person ohne Vorwissen. Geprüft am Code
des Standes `b79f61e`. Festlegungen mit dem Vermerk **Vorschlag** soll der
Entwickler bestätigen (Abschnitt 13).

## 1. Ziel und Abgrenzung

Ein **Kernwort** ist ein Wort mit allem, was eine gute Rückmeldung braucht:
schwierige Stelle, Phänomen, Strategie, Beweiswort, Kontrastwort,
Beispielsatz, Niveau und Prüfvermerk. Dieser Plan legt fest,

- wie ein Kernwort als Datensatz aussieht (Schema),
- wie es zu den Wörtern des Wortspeichers passt (über `wordKey`, ohne
  Änderung an gespeicherten Daten),
- wie fehlerhafte oder unbekannte Einträge gelesen werden (tolerant),
- wie die 30 Musterwörter zur Auslautverhärtung in den Code kommen,
- welche automatischen Prüfungen jede künftige Kernwortliste bestehen muss.

Der Plan baut **Daten, Prüfung und Nachschlagen**, aber noch **keine
Oberfläche für Kinder**. Das ist Absicht: Alle Einträge sind „ungeprüft“
(Vision: „Inhalte nur geprüft ausliefern“), und die Übungen, die Kernwörter
nutzen, sind eigene Bausteine.

Nicht Teil dieses Plans:

- Rückmeldung an der Stelle des Fehlers (R20-5), Fehlerdeutung (R20-4),
  Kontrastrunde (R20-6), Zweischritt „erst Beweiswort“ (R20-7), Satzdiktat
  (R20-11). Abschnitt 5.4 zeigt nur, wie sie die Daten später nutzen.
- Eine Prüfansicht in der App (R20-2, zweiter Teil). Geprüft wird vorerst in
  der erzeugten Tabelle (Abschnitt 5.3, Frage F-3).
- Die übrigen neun Phänomene und der Ausbau auf 120 oder 300 Wörter (R20-3).
- Änderungen an den bestehenden Wortlisten in
  `src/domain/german-learning-content.ts`, an Dexie, Sicherung oder Abgleich.
- Silben und Wortfamilie für das Kernwort selbst, Lautschrift, Bilder, Ton.

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 15.11.2026: `Anwendung.md` (Entscheidungen 1 bis 76) und
`Entscheidungsindex.md`, gesucht nach Wortbox, Wortbank, Kernbestand,
Merkwort, Strategie, Verlängern, s-Schreibung, summen, ungeprüft, Satz,
Lizenz.

| Entscheidung                            | Inhalt                                                                                                                                                         | Folge für diesen Plan                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 (große Wortbanken, echte Merkwörter) | Eine feste Sammlung hat mindestens 100 Wörter. Greift keine Strategie, heißt das Wort ausdrücklich Merkwort; es wird keine Regel behauptet.                    | Die Wortbanken bleiben. Ein Kernwort bekommt nur dann eine Stelle mit Strategie, wenn die Strategie wirklich trägt (KW-9). Nicht beweisbare Wörter bleiben draußen.   |
| 68 (Kernbestand von etwa 30 Wörtern)    | Eine Rechtschreib-Wortbox darf mit etwa 30 sehr gut ausgezeichneten Kernwörtern starten; die großen Boxen bleiben als Wortbank.                                | Genau das: 30 Kernwörter je Phänomen als eigene Daten neben der Wortbank (Abschnitt 4.3).                                                                             |
| 55 (Wortspeicher), 57 (Wiederholung)    | Wortboxen fest, eigen, „Aus dem Unterricht“; Lernstand je Wort.                                                                                                | Der Lernstand hängt an `learning-word:<wordKey>` (`src/domain/learning-word-progress.ts`). Kernwörter nutzen denselben Schlüssel; es entsteht kein zweiter Lernstand. |
| 61 (Satzformate erlaubt)                | **Nicht wieder einbauen:** Sätze, die zur Laufzeit erzeugt werden. Nur feste, geprüfte Sätze.                                                                  | Jeder Beispielsatz steht fest im Datensatz (KW-8). Kein Satz wird zusammengesetzt.                                                                                    |
| 75 (s-Schreibung in zwei Schritten)     | **Nicht wieder einbauen:** eine Hörprobe für die s-Schreibung, die ein stimmhaftes s voraussetzt. Das Kinder-Glossar verbietet „stimmhaft“ und „Summt das s?“. | Das Muster enthält keine s-Wörter. Die Prüfung KW-12 lehnt für jedes Kernwort eine Stelle „s am Ende“ mit der Strategie „Verlängern“ ab. Siehe auch Frage F-1.        |
| 76 (Textbox intern „ungeprüft“)         | Der Vermerk steht intern am Inhalt (`review`), nicht in der Oberfläche.                                                                                        | Gleiche Form: Feld `review` je Kernwort; der Vermerk erscheint nie vor Kindern (KW-11).                                                                               |
| 72 (Lizenz)                             | Inhalte unter CC BY-SA 4.0 in eigenen Dateien.                                                                                                                 | Die Kernwörter liegen in eigenen Datendateien ohne Programmlogik (Abschnitt 8). Es wird keine fremde Liste übernommen.                                                |
| 58, 71 (Vorlesen, nur Gerätestimmen)    | –                                                                                                                                                              | Nicht berührt; dieser Plan baut keine Sprachausgabe.                                                                                                                  |
| Vision „Keine KI zur Laufzeit“          | Inhalte entstehen bei der Entwicklung und werden von einer Lehrkraft geprüft.                                                                                  | Die 30 Wörter sind eine Vorlage zur Prüfung.                                                                                                                          |
| Antwort vom 15.11.2026, Nr. 9           | Keine zweite Prüferin; Erprobung in anderen Klassen.                                                                                                           | Der Prüfvermerk kennt nur den Entwickler als Prüfer; kein Feld für eine zweite Abnahme.                                                                               |

Ergebnis: **Kein Widerspruch, keine Rücknahme.** Eine Entscheidungsvorlage ist
nicht nötig; nach der Prüfung der 30 Wörter genügt ein Vermerk bei
Entscheidung 68 („umgesetzt als …“).

Offener fachlicher Punkt, der Entscheidung 75 ähnelt: Frage F-1 (Hörprobe bei
d/t, g/k, b/p in bairischer Aussprache).

## 3. Regeltabelle

| Nr.   | Regel                                                                                                                                                                                                                                                                                                | Beispiel                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| KW-1  | **Das Wort steht ohne Artikel**, in NFC, in der Schreibung, die das Kind tippen soll. Der Artikel ist ein eigenes Feld (nur Nomen).                                                                                                                                                                  | `word: "Hund"`, `article: "der"`                                                       |
| KW-2  | **Identität ist `wordKey(word)`** (`src/domain/word-box.ts`: NFC, ohne Rand, klein). Zwei Kernwörter mit demselben Schlüssel sind ein Fehler.                                                                                                                                                        | „Hund“ und „hund“ sind dasselbe Kernwort.                                              |
| KW-3  | **Stelle:** `start` zählt Zeichen ab 1, `length` ist die Zahl der Zeichen. Gezählt werden Unicode-Zeichen des NFC-Worts (ä, ö, ü, ß sind je ein Zeichen). Das Feld `letters` wiederholt die Zeichen an dieser Stelle; die Prüfung vergleicht beides.                                                 | Hund: `start: 4, length: 1, letters: "d"`. Sieg: `start: 2, length: 2, letters: "ie"`. |
| KW-4  | **Phänomen** ist eine Kennung aus einer festen Liste (`CORE_PHENOMENA`). Für dieses Muster: `auslaut-d`, `auslaut-g`, `auslaut-b`, dazu `langes-i` und `baustein-ver` für die zweiten Stellen.                                                                                                       | –                                                                                      |
| KW-5  | **Strategie** ist ein Wert von `SpellingStrategy` (`german-learning-content.ts`): „Silbieren“, „Verlängern“, „Ableiten“, „Merken“, „Merkwort“.                                                                                                                                                       | –                                                                                      |
| KW-6  | **Beweiswort** (Pflicht bei „Verlängern“ und „Ableiten“): `proof` ist das Wort, `proofSyllables` dasselbe mit Trennstrichen. In `proofSyllables` beginnt eine Silbe mit dem Buchstaben der Stelle (bei Umlaut im Beweiswort gilt der Buchstabe der Stelle, nicht der Vokal).                         | Hund → `proof: "Hunde"`, `proofSyllables: "Hun-de"`. Hand → „Hän-de“.                  |
| KW-7  | **Kontrastwort** (Pflicht je Kernwort): ein Wort, das an der Stelle gleich klingt, aber anders geschrieben wird, mit eigenem Beweis. Es stammt aus einer Liste je Phänomen (`contrasts`) und wird über seinen `wordKey` zugeordnet.                                                                  | Hund ↔ bunt (bun-te). Rad ↔ Rat (ra-ten).                                              |
| KW-8  | **Beispielsatz:** fest, 4 bis 10 Wörter, ohne Eigennamen, endet mit Punkt, Frage- oder Ausrufezeichen. Das Kernwort steht darin als ganzes Wort in genau der Form von `word` (Vergleich mit Groß- und Kleinschreibung).                                                                              | „Unser Hund wartet jeden Tag an der Tür.“                                              |
| KW-9  | **Nur was trägt:** Ein Wort wird nur Kernwort eines Phänomens mit Strategie „Verlängern“ oder „Ableiten“, wenn es ein gebräuchliches Beweiswort gibt. Sonst ist es ein Merkwort und gehört nicht in diese Liste (Entscheidung 30).                                                                   | „und“, „ab“, „weg“ sind keine Kernwörter der Auslautverhärtung.                        |
| KW-10 | **Niveau:** `grundlagen`, `aufbau` oder `sekundarstufe`. **Häufigkeit:** 1, 2 oder 3 als Einschätzung; das Feld ist freiwillig und trägt die Quelle `"schaetzung"`.                                                                                                                                  | –                                                                                      |
| KW-11 | **Prüfvermerk:** `review: { status: "ungeprüft" }` oder `{ status: "geprüft", at: "<Datum>" }`. Er erscheint nie in einer Schüleransicht. Funktionen für Kinder bekommen nur geprüfte Kernwörter (`coreWordFor(word)` liefert ungeprüfte nicht; für Tests und die Tabelle gibt es `allCoreWords()`). | –                                                                                      |
| KW-12 | **s-Regel:** Kein Kernwort hat eine Stelle am Wortende mit dem Buchstaben s, ss oder ß und der Strategie „Verlängern“. Kein Text eines Kernworts enthält ein Wort aus dem Kinder-Glossar (`CHILD_GLOSSARY`).                                                                                         | „Haus“ mit „Verlängere: Häu-ser“ wird abgelehnt.                                       |
| KW-13 | **Erwartete Verwechslung** (`confusion`): die Zeichen, die Kinder an der Stelle fälschlich schreiben. Sie ist nie gleich `letters`.                                                                                                                                                                  | Hund: `"t"`. Sieg (ie): `"i"`.                                                         |
| KW-14 | **Mehrere Stellen** sind erlaubt; sie überlappen sich nicht und stehen nach `start` sortiert.                                                                                                                                                                                                        | Betrieb: ie (5–6) und b (7).                                                           |

## 4. Datenformat und tolerantes Lesen

### 4.1 Schema

Neue Datei `src/domain/core-words.ts` (rein, Zod, `.strict()`):

```ts
export const CORE_PHENOMENA = [
  "auslaut-d",
  "auslaut-g",
  "auslaut-b",
  "langes-i",
  "baustein-ver",
] as const;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\p{Cc}<>]+$/u);

export const coreWordSpotSchema = z
  .object({
    start: z.number().int().min(1).max(60),
    length: z.number().int().min(1).max(4),
    letters: text(4),
    phenomenon: z.enum(CORE_PHENOMENA),
    strategy: z.enum([
      "Silbieren",
      "Verlängern",
      "Ableiten",
      "Merken",
      "Merkwort",
    ]),
    proof: text(60).optional(),
    proofSyllables: text(80).optional(),
    /** Kurzer Hinweis, wenn es kein Beweiswort gibt (z. B. „wie verstehen“). */
    note: text(120).optional(),
    confusion: text(4),
  })
  .strict();

export const coreWordSchema = z
  .object({
    word: text(60),
    article: z.enum(["der", "die", "das"]).optional(),
    wordClass: z.enum(["Nomen", "Verb", "Adjektiv", "anderes"]),
    spots: z.array(coreWordSpotSchema).min(1).max(4),
    /** `wordKey` eines Eintrags aus `contrasts` desselben Pakets. */
    contrast: text(60),
    sentence: text(120),
    level: z.enum(["grundlagen", "aufbau", "sekundarstufe"]),
    frequency: z
      .object({
        rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        source: z.literal("schaetzung"),
      })
      .strict()
      .optional(),
    review: z.discriminatedUnion("status", [
      z.object({ status: z.literal("ungeprüft") }).strict(),
      z.object({ status: z.literal("geprüft"), at: z.iso.date() }).strict(),
    ]),
  })
  .strict();

export const coreContrastSchema = z
  .object({ word: text(60), proof: text(60), proofSyllables: text(80) })
  .strict();

export const coreWordSetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,40}$/),
    title: text(60),
    /** Sammlung der Wortbank, zu der das Paket gehört (`LEARNING_WORD_COLLECTIONS`). */
    collectionId: z.string().min(1).max(60),
    contrasts: z.array(coreContrastSchema).max(40),
    words: z.array(coreWordSchema).max(60),
  })
  .strict();
```

Beispiel (aus dem Muster):

```ts
{
  word: "Hund",
  article: "der",
  wordClass: "Nomen",
  spots: [
    {
      start: 4, length: 1, letters: "d",
      phenomenon: "auslaut-d", strategy: "Verlängern",
      proof: "Hunde", proofSyllables: "Hun-de", confusion: "t",
    },
  ],
  contrast: "bunt",
  sentence: "Unser Hund wartet jeden Tag an der Tür.",
  level: "grundlagen",
  frequency: { rank: 1, source: "schaetzung" },
  review: { status: "ungeprüft" },
}
```

Übertragung der Spalten des Musters:

| Spalte im Muster        | Feld                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Wort                    | `article` (falls vorhanden) und `word`                                                                             |
| Wortart                 | `wordClass`                                                                                                        |
| Stelle „4 d“            | `start: 4`, `length: 1`, `letters: "d"`                                                                            |
| Abschnitt d/t, g/k, b/p | `phenomenon`: `auslaut-d`, `auslaut-g`, `auslaut-b`; `strategy: "Verlängern"`                                      |
| Beweiswort (Silben)     | `proofSyllables`; `proof` ist dasselbe ohne Trennstriche                                                           |
| Verwechslung            | `confusion`                                                                                                        |
| Kontrast (Beweis)       | `contrast` (Wort); Beweis steht einmal in `contrasts`                                                              |
| Beispielsatz            | `sentence`                                                                                                         |
| Niveau G, A, S          | `grundlagen`, `aufbau`, `sekundarstufe`                                                                            |
| Häufigkeit              | `frequency.rank`                                                                                                   |
| Prüfvermerk             | `review`                                                                                                           |
| „Weitere Stellen“       | zusätzlicher Eintrag in `spots`; „Hinweis oder Beweis“ nach `proofSyllables` (Sieg, Betrieb) bzw. `note` (Vertrag) |

### 4.2 Prüfungen über das Schema hinaus

`validateCoreWordSet(set)` liefert eine Liste von Fehlern (leer = gültig). Sie
ist das Qualitätstor für jede künftige Liste:

| Nr.   | Prüfung                                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| VP-1  | `wordKey` jedes Kernworts ist im Paket eindeutig (KW-2); ebenso jedes Kontrastworts. Kein Kernwort ist zugleich Kontrastwort.                |
| VP-2  | Die Zeichen von `word` an `start` … `start + length − 1` sind genau `letters` (KW-3).                                                        |
| VP-3  | Stellen überlappen nicht und sind sortiert (KW-14).                                                                                          |
| VP-4  | „Verlängern“ und „Ableiten“ haben `proof` und `proofSyllables`; `proofSyllables` ohne Trennstriche ist `proof` (KW-6).                       |
| VP-5  | Bei „Verlängern“ beginnt eine Silbe von `proofSyllables` (nach einem Trennstrich) mit `letters`, ohne Groß- und Kleinschreibung.             |
| VP-6  | `confusion` ist nicht `letters` (KW-13).                                                                                                     |
| VP-7  | `contrast` verweist auf ein vorhandenes Kontrastwort (KW-7).                                                                                 |
| VP-8  | Der Satz enthält `word` als ganzes Wort in gleicher Schreibung, hat 4 bis 10 Wörter und ein Satzschlusszeichen (KW-8).                       |
| VP-9  | `article` steht genau dann, wenn `wordClass` „Nomen“ ist; Nomen beginnen groß, andere Wortarten klein.                                       |
| VP-10 | s-Regel (KW-12) und Kinder-Glossar über `sentence`, `note`, `proof`.                                                                         |
| VP-11 | Bei den Auslaut-Phänomenen liegt die Stelle am Wortende (`start + length − 1` ist die Wortlänge), und `letters` passt zur Kennung (d, g, b). |

VP-5 an den Musterwörtern nachvollzogen: „Hän-de“ (Silbe „de“ beginnt mit d),
„A-ben-de“, „Ur-lau-ber“ (b), „lo-ben“ (b), „Sie-ge“ (g), „Be-trie-be“ (b).
Für die Kontrastwörter gilt VP-5 sinngemäß mit t, k, p: „bun-te“, „ra-ten“,
„Mu-si-ker“, „Ty-pen“, „Prin-zi-pi-en“.

### 4.3 Einbau in den Wortspeicher

Geprüft am Code:

- Feste Wortboxen sind reine Wortlisten
  (`LearningWordCollection.words: readonly string[]`).
- Eigene Wortboxen speichern `{ text, addedAt, source }` (`wordBoxSchema`,
  `.strict()`, Dexie-Tabelle `wordBoxes`, Teil von Sicherung und Abgleich).
- Der Lernstand eines Worts hängt an `learning-word:<wordKey>`.
- Es gibt schon Zusatzwissen je Wort, das über `wordKey` nachgeschlagen wird:
  die Bedeutungshilfen in `src/domain/homophones.ts`.

Festlegung: **Kernwörter sind Zusatzwissen, das über `wordKey` nachgeschlagen
wird. An gespeicherten Daten ändert sich nichts.**

| Nr.  | Regel                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EB-1 | **Keine Formatänderung** an `wordBoxSchema`, `wordBoxWordSchema`, Lernereignissen, Sicherung, Abgleich, Lernwortlisten-Paketen (`word-list-package.ts`). Keine neue Dexie-Version.                                                          |
| EB-2 | **Nachschlagen:** `coreWordFor(word)` sucht über `wordKey(word)` in allen Paketen. Ein Wort bekommt seine Auszeichnung damit überall: in der festen Wortbox, in einer eigenen, in „Aus dem Unterricht“ und nach einem Laufdiktat.           |
| EB-3 | **Groß- und Kleinschreibung:** Der Schlüssel ist klein. Die Auszeichnung gilt nur, wenn das gesuchte Wort nach NFC und ohne Rand **genau so lang** ist wie `word`; sonst stimmen die Positionen nicht. „hund“ findet „Hund“; „Hunde“ nicht. |
| EB-4 | **Wortbank bleibt:** `LEARNING_WORD_COLLECTIONS` wird nicht verändert. Jedes Kernwort eines Pakets muss in der Wortliste seiner `collectionId` vorkommen (Test); fehlt eines, wird es dort ergänzt.                                         |
| EB-5 | **Kontrastwörter sind keine Übungswörter der Sammlung.** Sie stehen nur im Paket.                                                                                                                                                           |
| EB-6 | **Kernbestand einer Sammlung:** `coreWordsOfCollection(id)` liefert die geprüften Kernwörter. Wie eine Runde sie bevorzugt (Entscheidung 68: „starten mit“), entscheidet der Baustein, der sie nutzt, nicht dieser Plan.                    |

Abgleich mit dem Stand `b79f61e`: Von den 30 Musterwörtern stehen in
`finalDevoicing` schon Hund, Wald, Bild, Kind, Rad, Land, Hand, Freund, Abend,
Kleid, Geld, gesund, Weg, Tag, Zug, Berg, Sieg, Flug, Vertrag, Betrag, Lob,
Korb, Urlaub, halb, gelb, grob, Betrieb. Es fehlen **fremd, Erfolg, klug**;
sie werden nach EB-4 ergänzt. (Vor dem Bau am Code nachzählen.)

### 4.4 Tolerantes Lesen

Die Pakete sind mitgelieferter Code, keine Nutzerdaten. „Tolerant“ heißt hier:
Ein fehlerhafter Eintrag darf die App nicht stören, und die Tests müssen ihn
trotzdem finden.

| Nr.  | Regel                                                                                                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TL-1 | **Zur Laufzeit je Eintrag prüfen:** Beim ersten Zugriff wird jedes Kernwort einzeln mit `coreWordSchema.safeParse` und den Prüfungen VP-2 bis VP-11 gelesen. Ein ungültiger Eintrag entfällt; die übrigen bleiben. Es wird nie geworfen. |
| TL-2 | **Im Test streng:** `validateCoreWordSet` muss für jedes mitgelieferte Paket eine leere Fehlerliste liefern. So fällt ein Fehler im CI auf, nicht beim Kind.                                                                             |
| TL-3 | **Unbekanntes Wort:** `coreWordFor` liefert `null`. Jeder Aufrufer muss ohne Kernwort funktionieren (heutiges Verhalten).                                                                                                                |
| TL-4 | **Unbekannte Kennung** (Phänomen, Strategie, Niveau) in einem Paket, etwa aus einer künftigen Fassung: Der Eintrag entfällt nach TL-1.                                                                                                   |
| TL-5 | **Falls Kernwörter später reisen** (Lernwortliste, Sicherung): nur als freiwilliges Feld in einer neuen Paketfassung, das ältere Software beim Lesen entfernt (Regel S-1, `docs/umsetzungsplan-audit-welle-1.md`). Nicht in diesem Plan. |
| TL-6 | **Ungeprüft heißt unsichtbar:** `coreWordFor` und `coreWordsOfCollection` liefern nur Einträge mit `review.status === "geprüft"` (KW-11).                                                                                                |

## 5. Abläufe

### 5.1 Vom Muster zur Datendatei

1. `src/domain/core-words.ts` anlegen (Schema, `validateCoreWordSet`,
   Nachschlagefunktionen), dazu Tests.
2. `src/domain/core-words/auslautverhaertung.ts` anlegen: eine Konstante
   `AUSLAUT_CORE_WORDS` vom Typ `CoreWordSet`, sonst nichts (nur Daten;
   Entscheidung 72). `id: "auslaut"`, `title: "Auslautverhärtung"`,
   `collectionId: "final-devoicing"`.
3. Die 19 Kontrastwörter und die 30 Kernwörter aus
   `docs/inhalte/kernwoerter-muster-auslautverhaertung.md` nach der Tabelle in
   4.1 übertragen. **Nichts ändern, nichts ergänzen, nichts „verbessern“.**
   Fällt ein Fehler auf: nicht still korrigieren, sondern im Abschnitt
   „Umgesetzt“ nennen und nachfragen.
4. Alle Einträge behalten `review: { status: "ungeprüft" }`.
5. `validateCoreWordSet(AUSLAUT_CORE_WORDS)` muss leer sein. Meldet es einen
   Fehler im Muster, gilt Punkt 3.
6. Die drei fehlenden Wörter in `finalDevoicing` ergänzen (EB-4).

### 5.2 Nachschlagen

```ts
/** Alle Pakete, auch ungeprüfte Einträge (für Tests und die Tabelle). */
export function allCoreWordSets(): readonly CoreWordSet[];
/** Geprüftes Kernwort zu einem Wort, sonst `null` (EB-2, EB-3, TL-6). */
export function coreWordFor(word: string): CoreWordEntry | null;
/** Geprüfte Kernwörter einer Sammlung der Wortbank (EB-6). */
export function coreWordsOfCollection(collectionId: string): CoreWordEntry[];
```

`CoreWordEntry` ist das Kernwort mit aufgelöstem Kontrastwort
(`contrast: { word, proof, proofSyllables }`).

### 5.3 Prüfung durch den Entwickler

1. `coreWordsMarkdown(set)` erzeugt aus einem Paket die Tabellen des Musters
   (drei Abschnitte, „Weitere Stellen“, „Kontrastwörter“).
2. Ein Test (`src/domain/core-words-docs.test.ts`, Muster:
   `src/domain/release-docs.test.ts`) prüft, dass der Bereich zwischen
   `<!-- kernwoerter:start -->` und `<!-- kernwoerter:end -->` in
   `docs/inhalte/kernwoerter-muster-auslautverhaertung.md` der Ausgabe
   entspricht. Beim ersten Bau wird der Bereich einmal durch die erzeugte
   Ausgabe ersetzt (danach `npx prettier --write`); inhaltlich darf sich dabei
   nichts ändern (im Diff prüfen).
3. Der Entwickler prüft in der Tabelle und meldet Korrekturen. Für jedes
   abgenommene Wort wird in der Datendatei `review` auf
   `{ status: "geprüft", at: "JJJJ-MM-TT" }` gesetzt; die Tabelle folgt.
4. Solange kein Wort geprüft ist, liefert `coreWordFor` immer `null`. Die App
   verhält sich wie heute.

### 5.4 Wie spätere Bausteine die Daten nutzen (nur zur Einordnung)

| Baustein                      | Nutzt                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Rückmeldung am Fehler (R20-5) | Stelle, `confusion`, `proofSyllables`: „Hunt“ trifft Stelle 4 mit t → „Verlängere: Hun-de.“            |
| Lücke an der Stelle (R20-10)  | `start`, `length`: Die Lücke der Stufen 2 und 3 sitzt an der Stelle statt an jedem dritten Buchstaben. |
| Kontrastrunde (R20-6)         | Kernwort und Kontrastwort im Wechsel, jeweils mit Beweiswort.                                          |
| Zweischritt (R20-7)           | erst `proof` tippen, dann `word`.                                                                      |
| Satzdiktat (R20-11)           | `sentence`.                                                                                            |

## 6. Barrierefreiheit und Design

Dieser Plan baut keine Oberfläche. Für die Bausteine, die folgen, gilt schon
jetzt (damit das Schema nichts verbaut):

- Die Stelle wird nie nur farbig markiert. Die Vorlage dafür ist der
  Buchstabenvergleich des Wortspeichers (Entscheidung 55; `letter-diff.ts`
  und seine Ansicht in `app/views/wortspeicher/`).
- Texte für Kinder entstehen aus festen Vorlagen und den Feldern des
  Kernworts, mit Wörtern aus dem Kinder-Glossar-konformen Wortschatz
  („verlängern“, „Silbe“; nicht „Auslautverhärtung“, nicht „Phänomen“). Die
  Kennungen aus `CORE_PHENOMENA` erscheinen nie in der Oberfläche.
- `proofSyllables` trägt Trennstriche als gewöhnliches Minuszeichen. Für
  Screenreader wird später `proof` vorgelesen, nicht die getrennte Form.
- Der Prüfvermerk erscheint in keiner Schüleransicht (Entscheidung 76).

## 7. Freigabestufe

Kein neuer Bereich im Freigaberegister. Die Daten sind über TL-6 unsichtbar,
solange sie ungeprüft sind; das ist die wirksamere Sperre, weil sie je Wort
gilt. Der erste Baustein, der Kernwörter Kindern zeigt (R20-5), bekommt seinen
eigenen Bereich mit Stufe `vorschau`.

## 8. Betroffene Dateien

| Datei                                                    | Änderung                                                                                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/core-words.ts`                               | **Neu.** Schemata (4.1), `validateCoreWordSet` (4.2), `allCoreWordSets`, `coreWordFor`, `coreWordsOfCollection` (5.2), `coreWordsMarkdown` (5.3). Rein, ohne React, ohne Speicher. |
| `src/domain/core-words/auslautverhaertung.ts`            | **Neu.** Nur Daten (5.1). Kopfkommentar: Herkunft (selbst erstellt, KI-Vorlage, vom Entwickler zu prüfen), Lizenzhinweis nach Entscheidung 72, Verweis auf das Muster.             |
| `src/domain/core-words.test.ts`                          | **Neu.** Fälle 1 bis 22.                                                                                                                                                           |
| `src/domain/core-words-docs.test.ts`                     | **Neu.** Fall 23.                                                                                                                                                                  |
| `src/domain/german-learning-content.ts`                  | Nur `finalDevoicing`: „fremd“, „Erfolg“, „klug“ ergänzen (EB-4). Keine andere Änderung, kein Entfernen.                                                                            |
| `docs/inhalte/kernwoerter-muster-auslautverhaertung.md`  | Bereich zwischen den Markierungen durch die erzeugte Tabelle ersetzen (5.3). Text davor und danach bleibt.                                                                         |
| `docs/inhalte/wortspeicher.md`, `docs/inhalte/README.md` | Abschnitt „Kernwörter“: was es gibt, wo es liegt, dass alles ungeprüft und unsichtbar ist; Verweis auf Plan und Muster.                                                            |
| Dieser Plan                                              | Am Ende „Umgesetzt“ mit Datum und Abweichungen.                                                                                                                                    |

**Nicht anfassen:** `src/domain/word-box.ts` (Schemata), `src/storage/`,
`src/domain/word-list-package.ts`, `src/domain/homophones.ts`, alles unter
`app/`.

## 9. Testfälle

### Unit (Vitest), `src/domain/core-words.test.ts`

Schema und Prüfungen, jeweils an einem kleinen Paket im Test:

1. Das Beispiel „Hund“ aus 4.1 ist gültig.
2. Unbekanntes Feld am Kernwort oder an der Stelle: Schema lehnt ab
   (`.strict()`).
3. VP-1: „Hund“ und „hund“ im selben Paket: Fehler; Kernwort, das auch
   Kontrastwort ist: Fehler.
4. VP-2: „Hund“ mit `start: 3, letters: "d"`: Fehler. „Hände“ mit
   `start: 2, letters: "ä"`: gültig (ä ist ein Zeichen, auch wenn die Eingabe
   in NFD kommt und erst normalisiert wird).
5. VP-3: zwei Stellen 2–3 und 3–4: Fehler; unsortiert: Fehler.
6. VP-4: „Verlängern“ ohne `proof`: Fehler; `proofSyllables: "Hun-de"` mit
   `proof: "Hunden"`: Fehler.
7. VP-5: „Hund“ mit `proofSyllables: "Hund-e"`: Fehler; „Hän-de“: gültig;
   „Ur-lau-ber“ für b: gültig.
8. VP-6: `confusion: "d"` bei `letters: "d"`: Fehler.
9. VP-7: `contrast: "grün"` ohne Eintrag in `contrasts`: Fehler.
10. VP-8: Satz ohne das Wort; Satz mit „Hunde“ statt „Hund“; Satz mit 11
    Wörtern; Satz ohne Schlusszeichen: je ein Fehler. „hund“ klein im Satz bei
    `word: "Hund"`: Fehler.
11. VP-9: Nomen ohne Artikel; Adjektiv mit Artikel; Nomen klein: je ein
    Fehler.
12. VP-10: Kernwort „Haus“ mit Stelle `4 s`, „Verlängern“: Fehler mit Verweis
    auf Entscheidung 75. `note: "Summt das s?"`: Fehler.
13. VP-11: `auslaut-d` mit einer Stelle in der Wortmitte oder mit
    `letters: "g"`: Fehler.

Mitgeliefertes Paket:

14. `validateCoreWordSet(AUSLAUT_CORE_WORDS)` ist leer.
15. Das Paket hat 30 Kernwörter (13 `auslaut-d`, 10 `auslaut-g`, 7
    `auslaut-b` als letzte Stelle) und 19 Kontrastwörter; jedes Kontrastwort
    wird mindestens einmal genutzt.
16. Jedes Kernwort steht in der Wortliste von
    `getLearningWordCollection("final-devoicing")` (EB-4).
17. Kein Kernwort und kein Kontrastwort endet auf s, ss oder ß; keines
    beginnt mit einem Großbuchstaben, ohne Nomen zu sein.
18. Alle Einträge sind „ungeprüft“ (dieser Test wird beim ersten geprüften
    Wort bewusst angepasst; das im Commit nennen).

Nachschlagen und Toleranz:

19. Solange alles ungeprüft ist: `coreWordFor("Hund")` ist `null`,
    `coreWordsOfCollection("final-devoicing")` ist leer;
    `allCoreWordSets()` enthält die 30 Wörter.
20. Mit einem Testpaket, in dem „Hund“ geprüft ist: `coreWordFor("Hund")`,
    `coreWordFor("hund")` und `coreWordFor(" Hund ")` liefern den Eintrag mit
    aufgelöstem Kontrastwort; `coreWordFor("Hunde")` und
    `coreWordFor("Katze")` liefern `null` (EB-3, TL-3).
21. TL-1: Ein Testpaket mit einem gültigen und einem kaputten Eintrag
    (falsche Position): Der gültige ist auffindbar, der kaputte nicht; nichts
    wirft.
22. TL-4: Eintrag mit `phenomenon: "kuenftig"`: entfällt, der Rest bleibt.

### Unit (Vitest), `src/domain/core-words-docs.test.ts`

23. Der markierte Bereich im Muster entspricht `coreWordsMarkdown` (nach
    demselben Vergleich wie `release-docs.test.ts`, ohne Unterschiede im
    Leerraum der Tabellen).

### Bestehende Tests

24. `src/domain/german-learning-content` und der Wortspeicher: unverändert
    grün. Prüfen, ob ein Test die Zahl der Wörter in „Auslautverhärtung“
    festhält; wenn ja, die drei neuen Wörter dort nennen und begründen
    (EB-4), nicht still anpassen.

### Playwright

Keiner. Es ändert sich keine Ansicht. Zur Kontrolle, dass nichts sichtbar
wird, genügt nach dem Bau der vorhandene Lauf
`e2e/wortspeicher.spec.ts` (unverändert grün, axe darin wie bisher).

## 10. Prüfbefehle

Wenn `node_modules` fehlt, zuerst `npm ci`.

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:render
npx playwright test e2e/wortspeicher.spec.ts --project=desktop-chromium --project=mobile-chrome --trace off
```

Während der Arbeit gezielt:
`npx vitest run src/domain/core-words src/domain/german-learning-content`.
Nach dem Push GitHub Actions nicht abfragen (`AGENTS.md`). Ändert der Pull
Request nur das Muster (`docs/inhalte/…`), entfallen Browser- und Designtests.

## 11. Fallstricke und was nicht passieren darf

- **Inhalte nicht verändern.** Wer das Muster überträgt, übernimmt es
  wörtlich. Korrekturen kommen vom Entwickler.
- **Kein Wort auf „geprüft“ setzen**, das der Entwickler nicht ausdrücklich
  abgenommen hat. Auch nicht „zum Testen“.
- **Ungeprüftes nie vor Kinder** (TL-6), auch nicht hinter einer Vorschau.
- **Keine Hörprobe für s** (Entscheidung 75); keine s-Wörter in einem
  Auslaut-Paket; die Wörter „stimmhaft“ und „summen“ in keinem Text.
- **Keine Regel behaupten, die nicht trägt** (Entscheidung 30): kein
  Beweiswort erfinden („und → unde“). Lieber kein Kernwort.
- **Keine Sätze zur Laufzeit erzeugen** (Entscheidung 61).
- **Positionen zählen ab 1** und in Zeichen des NFC-Worts. Nicht mit
  `string.length` auf nicht normalisierten Eingaben rechnen; `[...word]`
  nach `normalize("NFC")` nutzen.
- **`wordKey` macht klein.** Die Auszeichnung gilt für die Schreibung in
  `word`; Groß- und Kleinschreibung der Eingabe ist ein eigener Fehler und
  kein Fall für die Stelle.
- **Keine gespeicherten Formate anfassen** (EB-1). Insbesondere kein neues
  Feld in `wordBoxWordSchema`: Es ist `.strict()`, ältere Software und der
  Abgleich würden die Wortbox ablehnen.
- **Wortbank nicht ausdünnen.** Veraltete Wörter (Magd, Trug, Tugend, Leib)
  stehen noch in `finalDevoicing`; das Entfernen ist eine eigene inhaltliche
  Entscheidung (`docs/inhalte/wortspeicher.md`, „Bewusst nicht geändert“).
- **Keine fremden Listen übernehmen** (Lizenz, Bericht 20, 4.2): keine
  Häufigkeitsränge aus childLex, keine Silben aus Wiktionary, solange die
  Lizenzfrage offen ist.
- **Datendatei ohne Logik** (Entscheidung 72): nur die Konstante.
- **Kein Kreis-Import:** `core-words.ts` importiert `wordKey` aus
  `word-box.ts` und `CHILD_GLOSSARY`; `word-box.ts` importiert nichts zurück.
- **Bestehende Tests nicht still anpassen** (`AGENTS.md`).

## 12. Reihenfolge der Umsetzung

Jeder Schritt ist für sich grün und wird einzeln committet und gepusht.

1. **Schema und Prüfungen:** `core-words.ts` ohne Daten, Tests 1 bis 13.
2. **Nachschlagen und Toleranz** mit Testpaketen: Tests 19 bis 22 (soweit
   ohne das echte Paket möglich).
3. **Daten:** `core-words/auslautverhaertung.ts` aus dem Muster, Tests 14,
   15, 17, 18.
4. **Wortbank:** drei Wörter ergänzen, Tests 16 und 24.
5. **Tabelle:** `coreWordsMarkdown`, markierten Bereich ersetzen, Test 23.
6. **Doku:** `docs/inhalte/wortspeicher.md`, `README.md`, „Umgesetzt“ hier.
7. **Nach der Prüfung durch den Entwickler:** `review` je Wort setzen,
   Test 18 anpassen, Vermerk bei Entscheidung 68.

## 13. Fragen an den Entwickler

| Nr. | Frage                                                                                                                                                                                                                                | Empfehlung                                                                                                                                                                         | Alternative und ihre Folge                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-1 | **Hören deine Klassen beim Verlängern den Unterschied?** In bairischer Aussprache klingen d und t, g und k, b und p oft auch im Wortinnern ähnlich (Hunde – bunte). Das ist dieselbe Frage wie beim „summenden“ s (Entscheidung 75). | Vor der Prüfung der 30 Wörter mit fünf Paaren in der Klasse ausprobieren (Hunde/bunte, Räder/raten, Berge/Werke, Körbe/Typen, Tage/Musiker). Trägt die Probe, bleibt „Verlängern“. | Trägt sie nicht: Die Strategie wird „Verlängern und deutlich sprechen wie im Radio“ oder „Wortfamilie merken“; das Schema bleibt, nur Vorlagentexte und Strategie ändern sich. |
| F-2 | Ist das Schema vollständig, oder fehlt dir ein Merkmal (z. B. Silben des Kernworts, Wortfamilie)?                                                                                                                                    | So starten. Silben und Wortfamilie sind laut Bericht 20 „nützlich“, nicht unverzichtbar, und kosten Prüfzeit.                                                                      | Jetzt aufnehmen: zwei Felder mehr je Wort, etwa 10 Sekunden mehr Prüfzeit je Wort.                                                                                             |
| F-3 | Prüfst du in der Tabelle (Markdown) oder brauchst du eine Prüfansicht in der App?                                                                                                                                                    | Tabelle für die ersten 30. Danach nach deiner gestoppten Zeit entscheiden.                                                                                                         | Prüfansicht im Lehrerbereich (R20-2): etwa zwei bis drei Tage Bau, lohnt ab 120 Wörtern.                                                                                       |
| F-4 | Stimmen die Auswahlregeln des Musters: keine -ig-Wörter, keine s-Wörter, keine unbeweisbaren Wörter (und, ab, weg)?                                                                                                                  | Ja.                                                                                                                                                                                | -ig aufnehmen: braucht ein eigenes Phänomen mit eigener Erklärung.                                                                                                             |
| F-5 | Zählt der Wortbaustein „ver-“ in „Vertrag“ als zweite Stelle?                                                                                                                                                                        | Ja; die Stelle schadet nicht und wird gebraucht, sobald Wortbausteine drankommen (Bericht 20, Stufe C).                                                                            | Weglassen: dann ist `baustein-ver` in `CORE_PHENOMENA` überflüssig.                                                                                                            |
| F-6 | Sollen veraltete Wörter (Magd, Trug, Tugend, Leib) aus der Wortbank „Auslautverhärtung“ verschwinden?                                                                                                                                | Ja, in einem eigenen kleinen Schritt mit Eintrag in `docs/inhalte/wortspeicher.md`. Nicht in diesem Plan.                                                                          | Lassen, wie am 14.11.2026 bewusst entschieden.                                                                                                                                 |
| F-7 | Welches Phänomen kommt als zweites Muster?                                                                                                                                                                                           | Doppelkonsonanten, mit Kontrast (Mitte – Miete) und der Regel „Einsilber erst verlängern“ (Befund F3).                                                                             | s, ss und ß: fachlich heikler (Entscheidung 75), besser erst nach den Erfahrungen mit zwei Mustern.                                                                            |
| F-8 | Ist die geschätzte Häufigkeit (1 bis 3) nützlich, oder soll das Feld bis zu einer geklärten Quelle entfallen?                                                                                                                        | Behalten als grobe Hilfe, klar als Schätzung gekennzeichnet.                                                                                                                       | Entfallen lassen: ein Feld weniger zu prüfen.                                                                                                                                  |
