# Umsetzungsplan: Textbox – Rechtschreibtraining mit Texten (LRS)

Stand: 08.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `9b913af`

> **Fortschritt:** Noch nicht begonnen. Paket A ist der erste Arbeitsschritt (siehe Abschnitt 3).

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Leitfaden ist das Konzept
„Lernraum – Konzept: Textbox und Rechtschreibtraining“ vom 08.10.2026. Die fachlichen
Entscheidungen in Abschnitt 1 sind mit der projektverantwortlichen Lehrkraft abgestimmt und
**verbindlich**. Werte mit dem Vermerk „kalibrierbar“ sind Startwerte für den Probedurchlauf. Wo
der Code etwas anderes nahelegt, gilt dieser Plan. Bei echten Widersprüchen erst nachfragen und
nicht selbst umentscheiden.

## 0. Arbeitsweise

- **Branch:** Arbeite auf einem eigenen Branch, der von `claude/lernraum-ui-v2` abzweigt.
  `claude/lernraum-ui-v2` ist in Cloudflare als Produktionsstand aktiv, und Schüler nutzen ihn
  bereits. **Niemals direkt auf `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt nach
  einem Probedurchlauf selbst.
- **Regeln lesen:** `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md`,
  `docs/umsetzungsplan-lernraum-ui-v2.md` (Abschnitt „Regeln für die Anbindung“).
- **Keine neuen Abhängigkeiten.** Diagramme werden als eigenes SVG gebaut. Zod gilt an allen
  Grenzen, auch für lokal gespeicherte Daten.
- **Ansichten bleiben rein:** Kein Speicherzugriff in `app/views/`. Logik gehört in reine
  Funktionen unter `src/domain/` und in Hooks. Dexie wird nur über typisierte Repositories in
  `src/storage/` angesprochen.
- **Keine Supabase-Migration und kein Server:** Die Textbox läuft vollständig lokal. Keine
  Ergebnisse, Eingaben oder Fehlerwörter gehen an einen Server.
- **Prüfen vor jedem Push:** `npm run check` (Format, Lint, Typen, Coverage, DB-Tests, Build,
  Render). Bei UI-Änderungen zusätzlich `npm run test:e2e:chromium`. Die Coverage-Grenzen aus
  `vitest.config.ts` (90 % für `src/domain` und `src/storage`) dürfen nicht sinken.
- **Sprache:** Oberflächentexte, Kommentare und Commit-Nachrichten auf Deutsch, im Stil des
  bestehenden Codes. Commits klein und pro Arbeitsschritt.

## 1. Fachliche Entscheidungen (verbindlich)

### 1.1 Grundablauf

- Eine Trainingseinheit besteht aus **vier Durchgängen** am selben Text.
- Jeder Durchgang hat drei Phasen: **Merken → Schreiben → Kontrolle**. Erst nach der Kontrolle
  beginnt die Merkphase des nächsten Durchgangs.
- Schüler wählen Text, Schwierigkeit und Schwerpunkt frei. Es gibt keine Pflichtreihenfolge und
  keine Freischaltung. Jeder Text ist beliebig oft wiederholbar.

### 1.2 Merkphase

| Schwierigkeit | Merkzeit (kalibrierbar) |
| ------------- | ----------------------- |
| Leicht        | 60 s                    |
| Mittel        | 90 s                    |
| Schwer        | 120 s                   |

- Der vollständige Text ist sichtbar. Ein Countdown zeigt die verbleibende Zeit.
- „Ich bin bereit“ beendet die Merkphase vorzeitig. Nach Ablauf der Zeit folgt automatisch die
  Schreibphase.
- In Durchgang 1 sind die Wörter, die anschließend fehlen, farbig **und** mit einer zweiten
  Kennzeichnung (z. B. Unterstreichung) hervorgehoben. Ab Durchgang 2 gibt es keine Markierung.
- Merkzeit und Schreibzeit werden nur gespeichert. Sie fließen **nicht** in die Bewertung ein
  (Regel aus `docs/engineering-quality.md`: Zeit ändert den Lernstand nicht).

### 1.3 Ausblendung

| Durchgang | Ausgeblendet (kalibrierbar) | Markierung in der Merkphase |
| --------- | --------------------------- | --------------------------- |
| 1         | ca. 20 % (die Zielwörter)   | ja                          |
| 2         | ca. 40 %                    | nein                        |
| 3         | ca. 70 %                    | nein                        |
| 4         | 100 %                       | entfällt                    |

- Die Mengen sind **ineinander geschachtelt**: Was in Durchgang n fehlt, fehlt auch in allen
  späteren Durchgängen.
- **Wortauswahl:** Durchgang 1 blendet die Zielwörter des Textes aus. Aufgefüllt wird zuerst mit
  weiteren Wörtern, die zum Rechtschreibschwerpunkt passen, danach mit längeren Inhaltswörtern
  (mindestens 4 Buchstaben), zuletzt mit dem Rest.
- Die Reihenfolge innerhalb einer Gruppe ist deterministisch über einen Seed (`trainingId`). Sie
  ist damit nachvollziehbar, aber bei jeder Wiederholung anders.
- Kommt der Schüler aus dem Wortspeicher, werden die dort geübten Wörter, die im Text vorkommen,
  in Durchgang 1 zusätzlich ausgeblendet und markiert.

### 1.4 Darstellung und Eingabe

**Durchgang 1–3 (Lückentext):**

- Die Schüler schreiben **direkt in die Lücken** des Textes. Sichtbare Wörter bleiben als Gerüst
  stehen.
- Satzzeichen bleiben sichtbar. Sie gehören nicht zum Wort und werden nie ausgeblendet.
- Die Lückenbreite entspricht in Durchgang 1 und 2 der Wortlänge. In Durchgang 3 haben alle
  Lücken dieselbe Breite (kalibrierbar).
- **Fokussteuerung:** Leertaste, Enter oder Tab springen zur nächsten Lücke. Shift+Tab oder die
  Rücktaste in einer leeren Lücke springen zur vorherigen. Antippen oder Anklicken wählt eine
  beliebige Lücke. Beim Start steht der Cursor in der ersten Lücke.
- Es gibt **keinen** automatischen Sprung beim Erreichen der Wortlänge, weil das die richtige
  Länge verraten würde.
- „Prüfen“ beendet den Durchgang, auch wenn noch Lücken leer sind. Erst danach wird angezeigt,
  was richtig ist.

**Durchgang 4 (freies Schreiben):**

- Der Text ist vollständig ausgeblendet. Die Schüler schreiben in ein leeres, großes
  Schreibfeld.

**Für alle Durchgänge:**

- Während der Schreibphase kann der Originaltext nicht aufgerufen werden.
- Einfügen, Ablegen, Autokorrektur und Rechtschreibprüfung sind gesperrt
  (`STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES`, `isBlockedRunningDictationInput` aus
  `src/domain/running-dictation-input.ts`).
- Die Schreibzeit startet mit dem ersten Tastenanschlag.
- Wer nicht weiterkommt, kann jederzeit „Prüfen“ wählen.

### 1.5 Bewertung

- **Durchgang 1–3:** richtig geschriebene Lücken ÷ Anzahl der Lücken × 100.
- **Durchgang 4 (Hauptwert der Einheit):** (richtig geschriebene Originalwörter − zusätzliche
  Wörter) ÷ Wörter im Original × 100, mindestens 0 %. Gerundet wird auf ganze Prozent.
- Gezählt werden nur Wörter. Satzzeichen werden angezeigt, aber **nicht** gewertet.
- Fehler bei der Groß- und Kleinschreibung zählen als Fehler, erhalten aber eine eigene
  Fehlerart.
- Ein Wort mit genau einem Buchstaben Abstand (`isWithinOneEdit` aus
  `src/domain/spelling-tolerance.ts`) bekommt den Hinweis „fast richtig“ und zählt trotzdem als
  Fehler.

| Fehlerart     | Bedeutung                                               | Gewertet |
| ------------- | ------------------------------------------------------- | -------- |
| `richtig`     | Wort exakt richtig                                      | richtig  |
| `falsch`      | Wort falsch geschrieben (ggf. mit Hinweis „fast“)       | Fehler   |
| `gross-klein` | nur Groß-/Kleinschreibung falsch                        | Fehler   |
| `fehlt`       | Originalwort ausgelassen                                | Fehler   |
| `zusaetzlich` | Wort geschrieben, das im Original nicht steht           | Abzug    |
| `satzzeichen` | Satzzeichen fehlt, ist falsch oder zusätzlich (Hinweis) | nein     |

### 1.6 Kontrolle

- Nach jedem Durchgang werden Original und Eingabe Wort für Wort gegenübergestellt.
- Fehlerwörter zeigen die Eingabe und die richtige Schreibweise. Fehlerarten werden mit Farbe
  **und** Symbol oder Text gekennzeichnet, nie nur mit Farbe.
- Der Prozentwert wird ruhig und ohne Abwertung angezeigt. Fehler führen nicht zu
  Minuspunkten außerhalb dieses Prozentwerts.
- Eine verpflichtende Verbesserungsphase gibt es in dieser Version nicht.

### 1.7 Laufzettel, Bestwert und Unterbrechung

- Die Textübersicht zeigt **immer den Bestwert**, nie das letzte Ergebnis.
- Bestwert, letzter Wert und Anzahl der Einheiten werden aus den gespeicherten Einheiten
  **abgeleitet** und nicht separat gespeichert.
- Nach jedem abgeschlossenen Durchgang wird die laufende Einheit gespeichert. Beim nächsten
  Öffnen des Textes erscheinen „Fortsetzen“ (mit der Merkphase des nächsten Durchgangs) und „Neu
  beginnen“. „Neu beginnen“ verwirft die laufende Einheit.
- Nur abgeschlossene Einheiten zählen für Bestwert, Verlauf und Statistik.

### 1.8 Textbibliothek

| Schwierigkeit | Wortanzahl (kalibrierbar) | Eigenschaften                                         |
| ------------- | ------------------------- | ----------------------------------------------------- |
| Leicht        | 30–60                     | einfacher Satzbau, häufige Wörter                     |
| Mittel        | 60–110                    | abwechslungsreicher Satzbau, gezielte Schwierigkeiten |
| Schwer        | 110–180                   | komplexerer Satzbau, mehrere Rechtschreibphänomene    |

- Rechtschreibschwerpunkte (erweiterbar): Doppelkonsonanten, lange und kurze Vokale,
  Dehnungs-h, Wörter mit ie, s/ss/ß, Groß- und Kleinschreibung, Auslautverhärtung,
  Wortbausteine und Wortfamilien, zusammengesetzte Wörter, gemischt.
- Textarten: Geschichte, Alltag, Erlebnis, Sachtext, Schule. Inhalte altersangemessen,
  freundlich und ohne Bloßstellung.
- Zielwörter machen 15–25 % der Wörter eines Textes aus und gehören zum Schwerpunkt.
- **Herkunft der Texte:** Ein KI-Agent entwirft die Texte, die Lehrkraft prüft sie fachlich vor
  der Freigabe. Welle 1 umfasst 15 Texte (je 5 pro Schwierigkeit), Welle 2 ergänzt auf rund 50.

### 1.9 Verbindung zum Wortspeicher

- Es gibt **keine** zweite Trainingsanwendung. Die Textbox wird nur über zwei Wege aufgerufen:
  frei über „Üben“ und nach einer Wortspeicher-Übung.
- Passende Texte kommen aus der Bibliothek (Variante A des Konzepts). Vorgeschlagen werden die
  Texte, die die meisten geübten Wörter enthalten (Vergleich ohne Groß-/Kleinschreibung). Bei
  Gleichstand gewinnt der Text mit passendem Schwerpunkt, danach die niedrigere Schwierigkeit.
- KI-generierte Texte (Variante B) sind nicht Teil dieses Plans.

### 1.10 Freigabe und Nachweis

- Neuer Freigabebereich `textbox`, zunächst auf Stufe **`vorschau`**. Die Lehrkraft stellt ihn
  nach dem Probedurchlauf auf `frei`.
- Der druckbare Laufzettel ist eine Dokumentation und **kein** gesicherter Prüfungsnachweis.
  Die Oberfläche sagt das ausdrücklich.

## 2. Umsetzung

### Teil 1: Fachlogik (rein, vollständig getestet)

#### 2.1 Texttyp und Schwerpunkte

Neue Datei `src/domain/textbox-text.ts`:

```ts
export const textboxDifficultySchema = z.enum(["leicht", "mittel", "schwer"]);
export const textboxPhenomenonSchema = z.enum([
  "doppelkonsonanten",
  "vokallaenge",
  "dehnungs-h",
  "ie",
  "s-ss-sz",
  "gross-klein",
  "auslautverhaertung",
  "wortbausteine",
  "zusammensetzungen",
  "gemischt",
]);
export const textboxGenreSchema = z.enum([
  "geschichte",
  "alltag",
  "erlebnis",
  "sachtext",
  "schule",
]);
export const textboxTextSchema = z
  .object({
    id: z.string().regex(/^TXT-\d{3}$/),
    title: z.string().trim().min(1).max(80),
    difficulty: textboxDifficultySchema,
    phenomena: z.array(textboxPhenomenonSchema).min(1),
    genre: textboxGenreSchema,
    text: z.string().trim().min(1),
    targetWords: z.array(z.string().trim().min(1)).min(1),
    usage: z.array(z.enum(["frei", "wortspeicher"])).min(1),
  })
  .strict();
export type TextboxText = z.infer<typeof textboxTextSchema>;
export function countWords(text: string): number;
```

- Eine Zuordnung `PHENOMENON_TO_COLLECTION: Partial<Record<TextboxPhenomenon, string>>` verbindet
  Schwerpunkte mit `LEARNING_WORD_COLLECTIONS` aus `src/domain/german-learning-content.ts`
  (`doppelkonsonanten → double-consonants`, `dehnungs-h → silent-h`, `ie → long-i`,
  `auslautverhaertung → final-devoicing`).
- Anzeigenamen der Schwerpunkte und Schwierigkeiten als Konstante in derselben Datei.

#### 2.2 Textvergleich

Neue Datei `src/domain/text-compare.ts`:

```ts
export type TextToken = { kind: "word" | "punct"; text: string; index: number };
export type WordResultKind =
  "richtig" | "falsch" | "gross-klein" | "fehlt" | "zusaetzlich";
export type WordResult = {
  kind: WordResultKind;
  expected?: string;
  actual?: string;
  expectedIndex?: number;
  nearMiss: boolean;
};
export function tokenizeText(text: string): TextToken[];
export function alignWords(expected: string[], actual: string[]): WordResult[];
export function compareGaps(expected: string[], inputs: string[]): WordResult[];
export function comparePunctuation(
  expected: TextToken[],
  actual: TextToken[],
): number;
export type RoundScore = {
  percent: number;
  correct: number;
  total: number;
  extra: number;
  byKind: Record<WordResultKind, number>;
  punctuationHints: number;
};
export function scoreWords(results: WordResult[], total: number): RoundScore;
```

- `tokenizeText` normalisiert auf NFC, trennt Wörter von Satzzeichen und behält Bindestriche und
  Apostrophe innerhalb eines Wortes (z. B. „E-Mail“, „geht’s“).
- `alignWords` ist eine Levenshtein-Ausrichtung auf Wortebene. Ersetzung ergibt `falsch` oder
  `gross-klein` (Vergleich mit `toLocaleLowerCase("de")`), Auslassung ergibt `fehlt`, Einfügung
  ergibt `zusaetzlich`. Bei gleichen Kosten wird eine Ersetzung bevorzugt, damit ein falsch
  geschriebenes Wort nicht als „fehlt“ plus „zusätzlich“ zählt.
- `nearMiss` kommt aus `isWithinOneEdit` (`src/domain/spelling-tolerance.ts`).
- Mehrfache Leerzeichen und Zeilenumbrüche in der Eingabe sind egal.

#### 2.3 Trainingseinheit

Neue Datei `src/domain/textbox-session.ts`:

```ts
export function buildBlankingPlan(
  text: TextboxText,
  seed: string,
  extraTargets?: string[],
): [Set<number>, Set<number>, Set<number>, Set<number>]; // Wortindizes je Durchgang
export function memorizeSeconds(difficulty: TextboxDifficulty): number;
export type TextboxPhase = "memorize" | "write" | "review" | "complete";
export type TextboxRoundResult = {
  round: 1 | 2 | 3 | 4;
  blanked: number[];
  words: WordResult[];
  score: RoundScore;
  memorizeMs: number;
  writingMs: number;
};
export type TextboxRunState = {
  trainingId: string;
  textId: string;
  seed: string;
  round: 1 | 2 | 3 | 4;
  phase: TextboxPhase;
  rounds: TextboxRoundResult[];
};
export function startRun(
  text: TextboxText,
  trainingId: string,
  extraTargets?: string[],
): TextboxRunState;
export function finishMemorize(
  state: TextboxRunState,
  memorizeMs: number,
): TextboxRunState;
export function submitRound(
  state: TextboxRunState,
  text: TextboxText,
  input: string[] | string,
  writingMs: number,
): TextboxRunState;
export function nextRound(state: TextboxRunState): TextboxRunState;
export function finalPercent(state: TextboxRunState): number | undefined;
```

- Die Ausblendung nutzt `deterministicOrder` aus `src/domain/running-dictation.ts`. Die
  Anteile aus 1.3 stehen als Konstante `TEXTBOX_BLANK_RATIOS = [0.2, 0.4, 0.7, 1]`.
- Hat ein Text mehr Zielwörter als 20 %, werden trotzdem alle Zielwörter in Durchgang 1
  ausgeblendet. Die späteren Anteile sind Mindestwerte.
- Zustandsübergänge sind reine Funktionen und werfen bei ungültigen Übergängen.

#### 2.4 Auswertung über mehrere Einheiten

Neue Datei `src/domain/textbox-progress.ts`:

```ts
export type TextboxTextSummary = {
  textId: string;
  sessions: number;
  bestPercent?: number;
  lastPercent?: number;
  lastPracticedAt?: string;
  history: {
    trainingId: string;
    completedAt: string;
    percent: number;
    rounds: number[];
  }[];
};
export function summarizeTextboxProgress(
  sessions: TextboxSession[],
): Map<string, TextboxTextSummary>;
export function summarizeTextboxOverall(
  sessions: TextboxSession[],
  texts: TextboxText[],
): {
  completedTexts: number;
  sessions: number;
  byDifficulty: Record<TextboxDifficulty, number>;
  byPhenomenon: Partial<Record<TextboxPhenomenon, number>>;
};
export function rankTextsForWords(
  words: string[],
  texts: TextboxText[],
  collectionId?: string,
): { text: TextboxText; matches: string[] }[];
export function phenomenonErrorStats(
  sessions: TextboxSession[],
  texts: TextboxText[],
): { phenomenon: TextboxPhenomenon; errors: number; words: number }[];
export function reflectionQuestions(summary: TextboxTextSummary): string[];
```

- Nur Einheiten mit Status `abgeschlossen` zählen.
- `reflectionQuestions` erzeugt die Fragen aus Konzept §8.3 nur, wenn genug Daten vorliegen (ab
  2 Einheiten), z. B. „Bei welcher Übung war dein Ergebnis am besten?“.

#### 2.5 Tests Teil 1

Je Datei ein `*.test.ts` daneben. Mindestens:

- Tokenisierung mit Satzzeichen, Anführungszeichen, Bindestrich, Apostroph, Umlauten und ß.
- Ausrichtung: richtig, falsch, fast richtig, Groß-/Kleinfehler, fehlendes Wort am Anfang, in der
  Mitte und am Ende, zusätzliches Wort, vertauschte Wörter, leere Eingabe (0 %).
- Bewertung: zusätzliche Wörter senken den Wert, nie unter 0 %; Satzzeichen ändern den Wert
  nicht.
- Ausblendung: Mengen sind geschachtelt, Durchgang 1 enthält alle Zielwörter, Durchgang 4 alle
  Wörter, gleicher Seed ergibt gleiche Mengen, anderer Seed ergibt andere.
- Zustandsautomat: vollständiger Durchlauf, ungültige Übergänge werfen.
- Auswertung: Bestwert bleibt bei schlechterem neuen Ergebnis, laufende Einheiten zählen nicht,
  Rangfolge der Textvorschläge inklusive Gleichstand.

### Teil 2: Textbibliothek

#### 2.6 Texte, Welle 1

Neue Datei `src/domain/textbox-library.ts`:

- `export const TEXTBOX_TEXTS: readonly TextboxText[]` mit 15 Texten (`TXT-001` bis `TXT-015`),
  je 5 pro Schwierigkeit, verteilt über möglichst viele Schwerpunkte und Textarten.
- `export function getTextboxText(id: string): TextboxText | undefined`.
- Die Texte werden beim Modulstart mit `textboxTextSchema` geprüft.
- Texte für Kinder: kurze Sätze, bekannte Lebenswelt, keine Namen realer Personen, keine
  Angstthemen.

#### 2.7 Validierungstest

`src/domain/textbox-library.test.ts`:

- Ids sind eindeutig und fortlaufend.
- Jedes Zielwort kommt im Text als ganzes Wort vor (Groß-/Kleinschreibung beachtet).
- Die Wortanzahl liegt im Bereich der Schwierigkeit aus 1.8.
- Zielwörter machen 15–25 % der Wörter aus.
- Ab Welle 2: mindestens 2 Texte je Schwerpunkt und je Schwierigkeit mindestens 10 Texte.

#### 2.8 Texte, Welle 2

Nach der fachlichen Prüfung von Welle 1 durch die Lehrkraft: Ausbau auf rund 50 Texte
(`TXT-016` bis ca. `TXT-050`), mit Rückmeldungen aus der Prüfung.

#### 2.9 Inhaltsdokumentation

Neue Datei `docs/inhalte/textbox.md` (Stil wie `docs/inhalte/wortspeicher.md`): Format, Regeln
für neue Texte und eine Prüfliste für die Lehrkraft (Altersangemessenheit, Zielwörter,
Schwerpunkt, Länge, Rechtschreibung des Originals).

### Teil 3: Speicherung, Ereignisse und Backup

#### 2.10 Dexie-Tabelle

In `src/storage/personal-learning-events.ts`:

- `version(5)` wiederholt die vollständige `stores`-Zuordnung aus `version(4)` und ergänzt
  `textboxSessions: "id, textId, status, completedAt"`.
- Ein Datensatz ist eine Trainingseinheit:

```ts
type TextboxSession = {
  id: string; // trainingId
  textId: string;
  difficulty: TextboxDifficulty;
  status: "laufend" | "abgeschlossen";
  seed: string;
  extraTargets?: string[];
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
  rounds: TextboxRoundResult[];
  finalPercent?: number;
};
```

- `textboxSessionSchema` (Zod, `.strict()`) kommt nach `src/storage/progress-schema.ts`. Jedes
  Lesen wird damit geprüft.

#### 2.11 Repository

`createTextboxRepository(db?)` in derselben Datei, nach dem Muster von
`createTypingProgressRepository`:

```ts
{
  listCompleted(): Promise<TextboxSession[]>;
  listByText(textId: string): Promise<TextboxSession[]>;
  getOpen(textId: string): Promise<TextboxSession | undefined>;
  saveRound(session: TextboxSession): Promise<void>; // nur Status "laufend"
  discard(trainingId: string): Promise<void>; // nur Status "laufend"
  complete(session: TextboxSession, now?: Date): Promise<void>;
}
```

- `complete` schreibt in **einer** rw-Transaktion den Abschluss und ein `LearningEventV1`. Es ist
  idempotent über `learningEventIdentity("textbox", trainingId)`: Ein doppelter Abschluss erzeugt
  kein zweites Ereignis.
- Abgeschlossene Einheiten sind unveränderlich. `saveRound` und `discard` werfen bei ihnen.
- Es gibt höchstens eine laufende Einheit pro Text. Eine neue ersetzt die alte.

#### 2.12 Lernereignis

In `src/domain/learning-bundle.ts`:

- `eventSourceSchema` wird additiv um `"textbox"` ergänzt.
- Das Ereignis verwendet `learningArea: "german"`, `learningObjectId: "textbox:<textId>"`,
  `roundId: trainingId`, `answerMode: "typed"`, `help: "none"`. `assessment.writing` ist
  `correct`, wenn Durchgang 4 mindestens 90 % erreicht (kalibrierbar), sonst `incorrect`.
- Dadurch zählen Textbox-Einheiten automatisch für Serie und Tagesaktivität im Dashboard
  (`app/lernen/use-learner-dashboard.ts`).

#### 2.13 Backup, Export, Import und Schüler-Cloud-Sync

Es gibt keinen Registrierungsmechanismus. Folgende Stellen werden von Hand ergänzt:

1. `src/domain/personal-backup.ts`: `textboxSessions` in `personalDataSchema` und
   `PersonalLearningBackupInput`, mit Standardwert `[]`, damit ältere Backups weiter laden.
2. `parsePersonalLearningBackup`: auch der Rückfallpfad für alte Formate liefert
   `textboxSessions: []`.
3. `src/storage/personal-backup.ts`, `exportPersonalLearningBackup`: Tabelle mitlesen.
4. `restorePersonalLearningBackup`: Tabelle in die Transaktion aufnehmen und über die Id
   zusammenführen. Bei gleicher Id gewinnt `abgeschlossen` vor `laufend`, sonst das neuere
   `updatedAt`. Zwei abgeschlossene Einheiten mit gleicher Id und verschiedenem Inhalt ergeben
   einen Konflikt.
5. Die Union `PersonalBackupRestoreConflict.collection` um `"textboxSessions"` ergänzen.

Der Schüler-Cloud-Sync (`src/integrations/cloud-sync/sync.ts`) nutzt dieselbe Backup-Datei und
ist damit ohne weitere Änderung abgedeckt. Der Lehrer-Geräteabgleich (`model.ts`, `merge.ts`)
bleibt unberührt.

#### 2.14 Tests Teil 3

Mit `import "fake-indexeddb/auto"`, benannter Datenbank und `db.delete()` in `afterEach`:

- Migration v4 → v5 behält alle bisherigen Daten.
- `saveRound`, `getOpen`, `discard` und `complete` inklusive doppeltem `complete`.
- Abgeschlossene Einheiten lassen sich nicht ändern.
- Backup-Rundlauf mit Textbox-Daten, Import eines alten Backups ohne Feld, Zusammenführung und
  Konflikt.

### Teil 4: Trainingsoberfläche

#### 2.15 Route, Freigabe und Kachel

- Neue Route `app/frei/german/textbox/page.tsx` nach dem Muster von
  `app/frei/german/laufdiktat/page.tsx`: `<StudentPage activePath="/frei/german/textbox">` mit
  `metadata` (Titel „Textbox“).
- `src/domain/release.ts`: neuer Bereich
  `textbox: { label: "Textbox", routes: ["/frei/german/textbox"], stage: "vorschau" }`. Da
  `areaForPath` das längste Präfix wählt, gewinnt er vor `wortspeicher` (`/frei/german`). Tests
  in `src/domain/release.test.ts` ergänzen.
- `app/ui/shell/student-shell.tsx`: `textbox` in die Bereiche des Navigationspunkts „Üben“
  aufnehmen.
- `app/ueben/practice-overview.tsx`: Kachel „Textbox“ in `AREAS` (Text: „Texte einprägen und
  Schritt für Schritt aus dem Gedächtnis schreiben“). Den Typ `PracticeArea["icon"]` in
  `app/views/lernen/practice-screen.tsx` erweitern und
  `public/illustrations/practice/textbox.svg` im Stil der vorhandenen Illustrationen anlegen.

#### 2.16 Container und Hook

- `app/components/use-textbox.ts`: lädt Bibliothek und Einheiten über `createTextboxRepository`,
  liefert Zustände `loading | ready | unavailable` und Aktionen (starten, fortsetzen, Durchgang
  speichern, abschließen, verwerfen).
- `app/components/textbox-app.tsx`: steuert den Zustandsautomaten aus 2.3 und reicht reine Props
  an die Ansichten. Ein Doppelklick auf „Prüfen“ oder „Abschließen“ darf keine doppelten
  Einträge erzeugen.
- Die `trainingId` wird mit `crypto.randomUUID()` erzeugt.

#### 2.17 Ansichten

Unter `app/views/textbox/`, jeweils mit CSS-Modul, Tokens aus `app/ui/tokens.css` und in hellem
und dunklem Farbschema geprüft. Bausteine aus `app/ui/primitives.tsx` wiederverwenden
(`Button`, `ButtonLink`, `Card`, `Pill`, `ProgressBar`, `ProgressRing`, `Segmented`,
`PageHeader`, `Notice`, `EmptyState`).

- `library-screen.tsx`: Bibliothek und Laufzettel in einem. Filter für Schwierigkeit,
  Schwerpunkt und Status („neu“, „geübt“). Jede Zeile zeigt Titel, Schwierigkeit, Schwerpunkt,
  Anzahl der Übungen und **Bestwert** (oder „–“). Laufende Einheiten sind markiert.
- `memorize-screen.tsx`: voller Text in großer, gut lesbarer Schrift, Markierung in Durchgang 1,
  Countdown, „Ich bin bereit“, Anzeige „Durchgang n von 4“.
- `gap-writing-screen.tsx`: Lückentext mit Inline-Eingabefeldern und Fokussteuerung nach 1.4.
  Jede Lücke hat ein zugängliches Label („Lücke 3 von 12“). Auf dem Handy bleibt die aktive
  Lücke über der Bildschirmtastatur sichtbar.
- `free-writing-screen.tsx`: großes Schreibfeld für Durchgang 4.
- `review-screen.tsx`: Gegenüberstellung Wort für Wort mit Fehlerarten aus 1.5, Prozentwert,
  Satzzeichen-Hinweise, „Weiter zu Durchgang n + 1“.
- `completion-screen.tsx`: Ergebnis aus Durchgang 4 groß, die vier Durchgänge im Vergleich,
  Hinweis „Neuer Bestwert!“, Aktionen „Nochmal üben“, „Anderen Text wählen“ und „Verlauf
  ansehen“.

#### 2.18 Tests Teil 4

- Komponententests über Rollen und Labels: Fokussprung mit Leertaste, Enter, Tab und
  Rücktaste; Einfügen gesperrt; „Prüfen“ mit leeren Lücken; Merkphase vorzeitig beenden;
  Fortsetzen einer laufenden Einheit; doppelter Abschluss erzeugt einen Eintrag.
- Playwright (`e2e/`): ein vollständiger Durchlauf eines kurzen Testtextes durch alle vier
  Durchgänge, danach Bestwert in der Bibliothek.

### Teil 5: Detailansicht und Diagramme

#### 2.19 Diagramme

Neue Datei `app/ui/charts.tsx`, eigenes SVG ohne Bibliothek:

```tsx
type ChartPoint = { label: string; value: number }; // value 0–100
export function LineChart(props: {
  points: ChartPoint[];
  title: string;
  yLabel: string;
  xLabel: string;
}): JSX.Element;
export function BarChart(props: {
  points: ChartPoint[];
  title: string;
  yLabel: string;
  xLabel: string;
}): JSX.Element;
```

- Beschriftete Achsen (Y: 0–100 %, X: Versuch oder Datum), Gitterlinien bei 0, 25, 50, 75 und
  100 %, Datenpunkte mit Wertbeschriftung bei wenigen Punkten.
- Barrierefreiheit: `role="img"` mit `aria-label`, das die Entwicklung zusammenfasst, und eine
  aufklappbare Wertetabelle als Alternative.
- Farben nur über Tokens, Kontrast in beiden Farbschemata (`app/ui/contrast.test.ts` beachten).
- Mit einem einzigen Datenpunkt bleibt das Diagramm lesbar. Ohne Daten erscheint `EmptyState`.

#### 2.20 Detailansicht eines Textes

`app/views/textbox/text-detail-screen.tsx`, erreichbar aus jeder Zeile der Bibliothek:

- Bestwert, letztes Ergebnis, Anzahl der Versuche.
- Umschalter Linie/Säule (`Segmented`), beide aus denselben Daten.
- Liste aller Einheiten mit Datum und Ergebnis. Jede Einheit lässt sich aufklappen und zeigt
  die Werte der vier Durchgänge.
- Einklappbarer Kasten „Schau dir dein Diagramm an“ mit den Reflexionsfragen aus 2.4. Er ist
  standardmäßig zu, damit er das Training nicht überlagert.
- Aktion „Erneut üben“.

#### 2.21 Tests Teil 5

- Diagramme: Achsenbeschriftung, Wertetabelle, leere Daten, ein Punkt, viele Punkte.
- Detailansicht: Umschalten zwischen Linie und Säule, Bestwert vs. letzter Wert.

### Teil 6: Verbindung zum Wortspeicher

#### 2.22 Vom Wortspeicher zur Textbox

- `app/components/learning-word-app.tsx`, Abschlussbildschirm (`phase === "complete"`): neue
  Aktion „Mit einem Text weiterüben“. Sie erscheint nur, wenn der Bereich `textbox` sichtbar ist
  (`useRelease()`), und führt zu
  `/frei/german/textbox?woerter=<kommagetrennt>&sammlung=<collectionId>`.
- Die Textbox liest die Parameter (Zod-geprüft, höchstens 50 Wörter) und zeigt oben bis zu drei
  Vorschläge aus `rankTextsForWords` mit dem Hinweis „enthält 4 deiner 6 Wörter“. Gibt es keinen
  Treffer, erscheint die normale Bibliothek mit vorausgewähltem Schwerpunkt.
- Beim Start aus einem Vorschlag werden die geübten Wörter als `extraTargets` an
  `buildBlankingPlan` übergeben.

#### 2.23 Von der Textbox zum Wortspeicher

- Abschlussbildschirm der Textbox: Aktion „Fehlerwörter im Wortspeicher üben“, sobald es in
  Durchgang 4 Fehlerwörter gibt. Sie führt zu `/frei/german/lernwoerter?woerter=<Fehlerwörter>`.
- `app/components/learning-word-app.tsx` liest `?woerter=` und füllt damit die eigene Liste
  (Sammlung `own`) vor. Es wird nichts automatisch gespeichert.

#### 2.24 Tests Teil 6

Parameter in beide Richtungen, ungültige Parameter, Vorschläge mit und ohne Treffer, Sichtbarkeit
der Aktion abhängig von der Freigabestufe.

### Teil 7: Statistik und Laufzettel

#### 2.25 Fortschrittsseite

`app/lernen/fortschritt/page.tsx` erhält einen Abschnitt „Textbox“ (eigene Komponente, eigener
Hook):

- abgeschlossene Texte, Einheiten, Verteilung nach Schwierigkeit und Schwerpunkt
  (`summarizeTextboxOverall`),
- Liniendiagramm über alle Einheiten,
- Schwerpunkte mit den meisten Fehlern (`phenomenonErrorStats`) mit Link zur passenden
  Wortspeicher-Sammlung, wenn eine Zuordnung existiert.

#### 2.26 Druckbarer Laufzettel

Neue Route `app/frei/german/textbox/laufzettel/page.tsx`:

- Freiwilliges Feld für Name oder Kennung. Es wird **nicht** gespeichert.
- Tabelle mit Text, Schwierigkeit, Schwerpunkt, Datum der letzten Übung, Anzahl der
  Wiederholungen und Bestwert.
- Druck-CSS (`@media print`) und Schaltfläche „Drucken oder als PDF sichern“
  (`window.print()`).
- Hinweis: „Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein
  Prüfungsnachweis.“

#### 2.27 Tests Teil 7

Fortschrittsabschnitt mit leeren und gefüllten Daten, Laufzettel rendert alle Spalten,
Namensfeld wird nicht gespeichert.

### Teil 8: Dokumentation

#### 2.28 Dokumentation

- Neues Vault-Kapitel `obsidian-export/Lernplattform/24 - Textbox/Anwendung.md` (fachliche
  Beschreibung nach Abschnitt 1) und Verweis in `00 - Übersicht.md`.
- `19 - Entscheidungsprotokoll/Anwendung.md`: Entscheidungen aus Abschnitt 1 mit Datum.
- `18 - Aufgabenübersicht/Anwendung.md`: Abschnitt „Textbox“ mit den Paketen aus Abschnitt 3.
- `docs/umsetzungsplan-lernraum-ui-v2.md`: neuer Freigabebereich `textbox`.
- Diesen Plan im Kopf unter **Fortschritt** aktualisieren.

### Teil 9: Probedurchlauf (Checkliste für die Lehrkraft)

1. Vorschau auf dem Gerät einschalten, „Üben“ öffnen, Kachel „Textbox“ wählen.
2. Bibliothek nach Schwierigkeit und Schwerpunkt filtern.
3. Einen leichten Text starten. In Durchgang 1 sind die Zielwörter markiert.
4. Merkphase vorzeitig beenden. In die Lücken schreiben, mit Leertaste springen, eine Lücke
   antippen, Einfügen versuchen (muss gesperrt sein).
5. Absichtlich Fehler einbauen: ein falsches Wort, einen Groß-/Kleinfehler, ein fehlendes Wort.
   Die Kontrolle zeigt alle drei richtig an.
6. Nach Durchgang 2 die Seite neu laden. „Fortsetzen“ erscheint und beginnt mit Durchgang 3.
7. Durchgang 4 frei schreiben. Ergebnis und „Neuer Bestwert“ prüfen.
8. Denselben Text mit schlechterem Ergebnis wiederholen. In der Bibliothek bleibt der Bestwert.
9. Detailansicht öffnen, zwischen Linie und Säule umschalten.
10. Backup exportieren, Website-Daten löschen, Backup importieren. Die Textbox-Historie ist
    wieder da.
11. Eine Wortspeicher-Übung abschließen und „Mit einem Text weiterüben“ wählen. Passende Texte
    werden vorgeschlagen.
12. Laufzettel drucken bzw. als PDF sichern.
13. Alles auf einem Handy im Hoch- und Querformat wiederholen (Schritte 3–7).
14. Merkzeiten, Ausblendungsanteile, Lückenbreite und Textlängen notieren, die angepasst werden
    sollen.

## 3. Reihenfolge und Pakete

| Paket | Inhalt                                 | Ergebnis                                                                   |
| ----- | -------------------------------------- | -------------------------------------------------------------------------- |
| A     | Teil 1, Teil 2 (2.6, 2.7, 2.9), Teil 3 | Fachlogik, 15 Texte und Speicherung, vollständig getestet, ohne Oberfläche |
| B     | Teil 4                                 | Spielbare Textbox im Vorschaumodus, Probedurchlauf Schritte 1–8 möglich    |
| C     | Teil 5, Teil 2 (2.8)                   | Detailansicht mit Diagrammen, rund 50 Texte (nach Prüfung von Welle 1)     |
| D     | Teil 6, Teil 7, Teil 8                 | Wortspeicher-Brücke, Statistik, Laufzettel, Dokumentation                  |

Jedes Paket endet mit grünem `npm run check`, Push auf den Arbeitsbranch und einem kurzen
Bericht. Die Freigabestufe `frei` setzt die Lehrkraft nach dem Probedurchlauf.

## 4. Nicht Teil dieses Plans

- KI-generierte Texte aus individuellen Lernwörtern (Variante B)
- automatische Textempfehlungen anhand bisheriger Leistungen
- Transfertexte ohne vorheriges Einprägen
- Vorlesen von Wörtern oder Texten (siehe `docs/umsetzungsplan-vorlesen.md`)
- Übermittlung von Ergebnissen an Lehrkräfte, QR-Abgabe oder Klassenranking
- aktive Verbesserungsphase nach der Kontrolle
- Anpassung an die Schreiberleichterung (LRS-Klassenstempel aus
  `docs/umsetzungsplan-vokabeluebernahme-lrs.md`)

## 5. Bekannte Grenzen (dokumentieren, nicht lösen)

- Ein fehlerfrei wiedergegebener, mehrfach geübter Text beweist keine allgemein verbesserte
  Rechtschreibung. Die Textbox trainiert auch das Gedächtnis (Konzept §11.6).
- Die Wirksamkeit der vierstufigen Methode für LRS ist nicht wissenschaftlich belegt.
- Ältere App-Versionen auf einem zweiten Gerät kennen die Ereignisquelle `textbox` und die
  Backup-Sammlung `textboxSessions` nicht. Vor dem Cloud-Abgleich müssen alle Geräte
  aktualisiert sein.
- Lokale Daten gehen verloren, wenn Browserdaten gelöscht werden. Schutz bieten Export, Backup
  und die vorhandene Backup-Erinnerung.
- Der Laufzettel ist nicht manipulationssicher.

## 6. Abschluss

- `npm run check` und `npm run test:e2e:chromium` sind grün.
- Push auf den Arbeitsbranch, nicht auf `claude/lernraum-ui-v2`.
- Bericht an die Lehrkraft: umgesetzte Pakete, Branch, offene Punkte, Hinweise für den
  Probedurchlauf.

## 7. Später zu kalibrieren (nach dem Probedurchlauf)

- Merkzeiten je Schwierigkeit
- Ausblendungsanteile in Durchgang 1–3
- Lückenbreite in Durchgang 3 (Wortlänge oder einheitlich)
- Wortanzahlen je Schwierigkeit
- Gewichtung von Groß-/Kleinschreibung und Satzzeichen
- Schwelle für `assessment.writing` (90 %)
- ob eine aktive Verbesserungsphase nach der Kontrolle nötig ist
