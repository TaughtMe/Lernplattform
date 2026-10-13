# Teilplan 2: LernBox – Boxstand nachweisbar aus Ereignissen berechenbar

Stand: 13.10.2026 · Übersicht: [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) ·
Branch: `claude/code-analyse-2-lernbox-ereignisse`

## Befund

`docs/engineering-quality.md`, Architekturregel 3: „Lernereignisse werden ergänzt, nicht
nachträglich umgedeutet. Projektionen wie Fälligkeit und Boxstand müssen reproduzierbar neu
berechnet werden können.“

Die LernBox speichert dagegen den veränderlichen Kartenstand (`LearningBoxCard`: `box`, `interval`,
`nextReview`, `writingStreak` und die `reverse*`-Gegenstücke) **und** ein Ereignis. Maßgeblich ist
der Kartenstand. Ablauf heute:

1. `app/components/learning-box-app.tsx`, Funktion `assess` (ca. Zeile 326): berechnet den neuen
   Kartenstand mit `processLearningBoxResult` (`src/domain/learning-box.ts`, ca. Zeile 317) und
   ruft `repository.putCardAndEvent` auf. Im Übungsmodus (`session.practice`) wird nichts
   geschrieben.
2. `src/storage/personal-learning-events.ts`, `putCardAndEvent` (ca. Zeile 341): schreibt Karte und
   Ereignis in einer Transaktion. `occurredAt` wird **neu** mit `new Date()` gebildet und weicht
   damit um einige Millisekunden von `card.lastReviewed` ab.

Weitere Stellen ändern den Boxstand **ohne** Ereignis:

- `ingestBundle` (ca. Zeile 554) mit `placements` (Übernahme aus einer Unterrichtsrunde, Entscheidung 49) über
  `placeLiveVocabularyCard`, und ohne Platzierung `nextReview`/`reverseNextReview = now`.
- `importBackup` (`src/storage/personal-backup.ts`) beim Zusammenführen von Karten.
- Neue Karten (`addCard`, `importCards`, `ingestBundle`) starten mit dem Anfangsstand aus
  `createLearningBoxCard`.

Daten im Ereignis, die `processLearningBoxResult` braucht: `correct` ↔
`assessment.knowledge`, `direction` ↔ `direction` (`prompt-to-answer` = `forward`),
`mode` ↔ `answerMode` (`typed` = `writing`, `self-check` = `oral`), `now` ↔ `occurredAt`.
Der Parameter `secondChance` wird in der App derzeit nirgends übergeben und steht nicht im Ereignis.

## Entscheidung (verbindlich für diesen Teilplan)

Kein Umbau auf reines Event Sourcing und keine Schemaänderung an `learningEventV1Schema`
(das Schema ist Teil von Bundles, Sicherungen und Cloud-Sync). Stattdessen:

- Der Kartenstand bleibt der schnelle Lesezugriff (Cache).
- Eine reine Domänenfunktion spielt die LernBox-Ereignisse einer Karte nach.
- Ein Eigenschaftstest beweist: Wird eine Karte nur durch Abfragen verändert, ist der gespeicherte
  Stand gleich dem nachgespielten.
- Platzierungen ohne Ereignis (Unterrichtsrunde, Sicherung) gelten als **neuer Ausgangsstand**.
  Das wird in Regel 3 ehrlich festgehalten. Ereignisse für Platzierungen sind ausdrücklich nicht
  Teil dieses Plans.

## Schritte

### 2.1 Zeitstempel angleichen

In `putCardAndEvent` muss `occurredAt` genau dem Zeitpunkt entsprechen, mit dem der Kartenstand
berechnet wurde:

- Vorrang hat `input.now`, sonst `new Date(input.card.lastReviewed).toISOString()`.
- Test in `src/storage/learning-box.test.ts`: Nach `putCardAndEvent` gilt
  `Date.parse(event.occurredAt) === card.lastReviewed`.

### 2.2 Domänenfunktion zum Nachspielen

In `src/domain/learning-box.ts` (oder neue Datei `src/domain/learning-box-replay.ts`, wenn
`learning-box.ts` dadurch über 500 Zeilen wächst):

```ts
/** Felder des Kartenstands, die nur Abfragen verändern. */
export type LearningBoxProgressFields = Pick<
  LearningBoxCard,
  | "box"
  | "level"
  | "interval"
  | "nextReview"
  | "writingStreak"
  | "reverseBox"
  | "reverseInterval"
  | "reverseNextReview"
  | "reverseWritingStreak"
  | "lastReviewed"
>;

export function learningBoxProgress(
  card: LearningBoxCard,
): LearningBoxProgressFields;

/**
 * Spielt die LernBox-Ereignisse einer Karte ab `base` nach. Berücksichtigt nur
 * Ereignisse mit `source === "learning-box"` und passender `learningObjectId`,
 * sortiert nach `occurredAt`, bei Gleichstand nach `id`.
 */
export function replayLearningBoxCard(
  base: LearningBoxCard,
  events: readonly LearningEventV1[],
): LearningBoxCard;
```

- Für jedes Ereignis `processLearningBoxResult(card, { correct, direction, mode, now })` mit der
  Zuordnung aus dem Befund aufrufen.
- Die Zuordnung Ereignis → Eingabe als eigene, exportierte Funktion
  `learningBoxResultFromEvent(event)` schreiben und die Gegenrichtung aus `putCardAndEvent`
  daneben legen (`learningBoxEventFields(input)`), damit beide Richtungen an einer Stelle stehen.
  `putCardAndEvent` verwendet danach diese Funktion statt der Inline-Zuordnung.
- Unbekannte Werte (z. B. `assessment.knowledge` weder `correct` noch `incorrect`) nicht raten:
  Ereignis überspringen und das im Kommentar begründen.

Unit-Tests in `src/domain/learning-box.test.ts`: leere Ereignisliste, je ein Ereignis pro
Richtung und Modus, fremde `learningObjectId` und fremde `source` werden ignoriert, Reihenfolge
nach `occurredAt` auch bei unsortierter Eingabe.

### 2.3 Eigenschaftstest gegen das Repository

Neuer Test in `src/storage/learning-box.test.ts` mit `fast-check` (bereits Entwicklungsabhängigkeit;
Muster für Dexie-Tests in derselben Datei):

- Erzeuge eine Karte (`addCard`), merke den Anfangsstand.
- Erzeuge eine zufällige Folge von 1–30 Abfragen (`correct`, `direction`, `mode`, streng
  steigende Zeitpunkte, `roundId` je Abfrage neu).
- Für jede Abfrage: `processLearningBoxResult` auf die zuletzt gespeicherte Karte, dann
  `putCardAndEvent` mit `now` aus dem Zeitpunkt.
- Erwartung: `learningBoxProgress(gespeicherteKarte)` ist gleich
  `learningBoxProgress(replayLearningBoxCard(anfangsKarte, alleEreignisseDerKarte))`.
- Zweite Eigenschaft: Doppelte Abfrage mit gleicher `roundId`, gleicher Karte und Richtung ändert
  weder Karte noch Ereignisanzahl (bestehende Idempotenz in `putCardAndEvent`).

`numRuns` so wählen, dass der Test unter etwa zwei Sekunden bleibt (Richtwert 100).

### 2.4 Regel ehrlich formulieren

`docs/engineering-quality.md`, Regel 3 ergänzen (Wortlaut sinngemäß):

> Für die LernBox gilt: Der gespeicherte Kartenstand ist ein Zwischenspeicher. Ab dem letzten
> Ausgangsstand ergibt er sich vollständig aus den LernBox-Ereignissen (`replayLearningBoxCard`,
> geprüft per Eigenschaftstest). Ausgangsstände ohne Ereignis sind: neue Karte, Platzierung aus
> einer Unterrichtsrunde (Entscheidung 49) und Zusammenführen einer Sicherung.

Außerdem in `docs/architecture.md` beim Absatz zu LernBox und Lernereignissen einen Satz mit
Verweis auf Regel 3 ergänzen.

### 2.5 Für den Vault (PR-Beschreibung)

Eintrag für das Entscheidungsprotokoll vorschlagen: „LernBox: Kartenstand als Zwischenspeicher,
Nachspielbarkeit ab Ausgangsstand“ mit den drei Ausgangsständen aus 2.4 und dem Hinweis, dass
Ereignisse für Platzierungen eine spätere, eigene Entscheidung wären (Schemaänderung an
`learningEventV1Schema`, betrifft Bundles, Sicherungen und Sync).

## Nicht Teil dieses Plans

- Ereignisse für Platzierungen oder Sicherungsimporte.
- Der Laufzeitabgleich (z. B. Karte beim Laden aus Ereignissen reparieren).
- Die zweite Leitner-Logik `deriveLeitnerProgress` in `src/domain/leitner-schedule.ts` (genutzt
  für Empfehlungen und Lernwörter). Falls dir beim Arbeiten auffällt, dass sie für LernBox-Karten
  andere Boxen errechnet als `processLearningBoxResult`, das in der PR-Beschreibung als Befund
  notieren, nicht beheben.

## Prüfen

`npx vitest run src/domain/learning-box.test.ts src/storage/learning-box.test.ts`, danach die
Prüfungen aus der Übersicht. Keine Browser-Tests nötig, weil sich die Oberfläche nicht ändert.
