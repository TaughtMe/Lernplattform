# Umsetzungsplan: Tagesportion statt Rückstand („Heute üben“ entlasten)

Stand: 19.10.2026

Branch: `claude/lernraum-ui-v2` · Sprache in Code-Kommentaren, Texten und Commits: Deutsch (wie im Repo).

## Kontext

Schüler sehen auf `/lernen` oft **200+ Aufgaben „heute fällig“**. Das demotiviert stark. Ursachen im Code:

1. **Anzeige = gesamter Rückstand.** `app/lernen/learner-home.tsx:21` summiert `amount` aller Empfehlungen; das Tagesziel ist `completedToday + offen`. `completedToday` zählt _jedes_ Lernereignis des Tages (auch freies Üben), deshalb wächst das Ziel beim Üben mit.
2. **Mathe wächst endlos.** `mathReviews` in `src/domain/math-practice.ts:148` macht aus jeder einzelnen Rechenaufgabe einen Wiederholungsposten. Nach _einer_ richtigen Antwort ist er sofort fällig (`days = 0`), danach höchstens 3 Tage Abstand, und nichts fällt je heraus. Eine Runde mit 20 Aufgaben erzeugt rund 20 neue „fällige“ Posten.
3. **LernBox.** Neue Karten sind beim Anlegen oder Import sofort fällig (`createLearningBoxCard`: `nextReview: now`). Box 1–4 haben nur 1 Tag Abstand (`processLearningBoxResult`: `nextInterval = nextBox === 5 ? 7 : 1`). `isLearningBoxCardDueFor(card, "mixed")` zählt in `app/components/learning-box-app.tsx:240` auch die nie geübte Rückrichtung als fällig. Die Empfehlungen schließen das aus (`src/storage/learning-recommendations.ts`, Kommentar „Rückrichtung zählt erst …“), die LernBox-Übersicht nicht.

Ziel: Kinder sehen eine **feste, erreichbare Tagesportion von 20 Aufgaben**. Der Rückstand wird nie als Zahl gezeigt, und die Lernlogik erzeugt deutlich weniger Rückstand.

Entscheidungen der Projektverantwortlichen: Portion **20** (Konstante, später pro Klasse einstellbar); Umfang **Teil A + Teil B**.

## Verbindliche Projektregeln (aus `docs/engineering-quality.md`, `AGENTS.md`)

- Lernregeln als **reine Funktionen in `src/domain`**, ohne React, Browser oder Dexie. Zeit (`now`) und Zufall werden als Parameter übergeben.
- Dexie nur über Repositories in `src/storage`, **neue Tabelle nur mit neuer `this.version(n)`**.
- Ansichten in `app/views/` bleiben rein (keine Speicherzugriffe, kein `Date.now()`).
- Jede Lernregel braucht Positiv-, Negativ- und Grenzbeispiele. Änderungen der Lernlogik brauchen **Regressionstests mit bestehenden Lernhistorien**.
- Vor dem Push: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`. Bei UI-Änderungen zusätzlich die betroffenen Playwright-Tests (`npm run test:e2e:chromium`, gezielt). Das CI nach dem Push nicht wiederholt abfragen.

---

## Teil A: Tagesportion

### A1. Lokaler Tagesschlüssel in die Domäne

- Neue Datei `src/domain/local-day.ts` mit `localDayKey(value)`, verschoben aus `app/lernen/dashboard-data.ts`. `dashboard-data.ts` importiert und re-exportiert sie, damit bestehende Importe und Tests weiter funktionieren.

### A2. Reine Auswahl: `src/domain/daily-plan.ts` (neu)

```ts
export const DAILY_PLAN_SIZE = 20;
export const DAILY_PLAN_QUOTAS = { error: 6, new: 4 } as const;

export type DailyPlanModule = "vocabulary" | "german" | "mathematics";
export type DailyPlanKind = "error" | "review" | "new";
export type DailyPlanCandidate = {
  key: string; // eindeutig, z. B. "vocabulary:<cardId>:forward", "mathematics:<familyKey>"
  module: DailyPlanModule;
  kind: DailyPlanKind;
  objectIds: string[]; // learningObjectIds, deren Ereignis das Element erledigt
  dueAt: string; // ISO; bei "new": createdAt
  occurredAt?: string; // letzter Fehler (für "error")
};
export type DailyPlanItem = Omit<DailyPlanCandidate, "dueAt" | "occurredAt">;
export type DailyPlan = {
  day: string;
  createdAt: string;
  size: number;
  items: DailyPlanItem[];
};

export function selectDailyPlan(input: {
  candidates: readonly DailyPlanCandidate[];
  day: string;
  now: string;
  size?: number;
}): DailyPlan;

export function dailyPlanProgress(
  plan: DailyPlan,
  events: readonly LearningEventV1[],
): {
  done: number;
  total: number;
  openByModule: Record<DailyPlanModule, number>;
  openItems: DailyPlanItem[];
};
```

Auswahlregeln für `selectDailyPlan` (deterministisch, ohne Zufall):

1. **Fehler** (`kind: "error"`), der jüngste Fehler zuerst, höchstens `quotas.error`.
2. **Wiederholungen** (`kind: "review"`), die am längsten überfälligen zuerst (`dueAt` aufsteigend). Sie füllen bis `size - min(quotas.new, verfügbare neue)` auf.
3. **Neue** (`kind: "new"`), `createdAt` aufsteigend, höchstens `quotas.new`.
4. Ist danach noch Platz: übrige Fehler, dann übrige Wiederholungen.
5. Innerhalb jeder Stufe **Module abwechselnd** (Round-Robin über vocabulary → german → mathematics), damit nicht ein Modul die Portion füllt.
6. Gleichstand nach `key` sortieren (stabil). Ergebnis höchstens `size` Elemente. Ohne Kandidaten gibt es einen leeren Plan.

`dailyPlanProgress`: Ein Element gilt als erledigt, wenn ein Ereignis mit `learningObjectId ∈ objectIds` und `occurredAt >= plan.createdAt` existiert und `localDayKey(occurredAt) === plan.day`. Es zählt nur das Element, egal wie oft geübt wurde.

### A3. Kandidaten sammeln: `src/storage/daily-plan.ts` (neu)

`createDailyPlanRepository(database = new PersonalLearningDatabase())` mit:

- `candidates(now)`: liest `learningEvents`, `learningBoxCards`, `learningWordProgress` und baut `DailyPlanCandidate[]`:
  - **LernBox-Karten**, je Richtung (forward/reverse) ein Kandidat:
    - nie geübt (Richtung mit `interval === 0` bzw. `reverseInterval === 0`): `kind: "new"`. Die Rückrichtung wird nur als „new“ angeboten, wenn die Vorwärtsrichtung schon mindestens Box 2 erreicht hat. Sonst gibt es für die Rückrichtung keinen Kandidaten.
    - geübt und fällig (`isLearningBoxCardDue`): `kind: "error"`, wenn die Box der Richtung 1 ist und `lastReviewed > createdAt`, sonst `"review"`.
    - `objectIds: [card.id]`.
  - **Vokabel-Ereignisse ohne Karte** (wie bisher in `eventCandidates` in `src/storage/learning-recommendations.ts`): die vorhandene Logik wiederverwenden. Den Teil, der fehlerhafte und fällige Ereignis-Vokabeln bestimmt, als exportierte Hilfsfunktion herausziehen, statt ihn zu kopieren.
  - **Lernwörter** (`learningWordProgress`, `dueAt <= now`): `"error"`, wenn `box === 1 && incorrectAttempts > 0`, sonst `"review"`; `objectIds: [word.id]` (gleich `learningWordId`, siehe `src/domain/learning-word-progress.ts`).
  - **Mathe**: fällige `mathReviews`, **nach Familie gruppiert** (siehe B1, `mathFamilyKey`). Pro Familie ein Kandidat mit `objectIds` = alle fälligen Review-IDs der Familie. Kind `"error"`, wenn ein Posten der Familie `errors > 0` hat und noch nicht gefestigt ist, sonst `"review"`.
- `today(now)`: holt oder erzeugt den Plan für `localDayKey(now)` **idempotent** in einer Dexie-Transaktion. Existiert er schon, wird er unverändert zurückgegeben. Ein Plan entsteht genau einmal pro Tag; was im Laufe des Tages neu fällig wird (z. B. nach einem Laufdiktat), kommt erst morgen in die Portion.
- `progress(now)`: `today(now)` plus `dailyPlanProgress` über die Ereignisse.

### A4. Speicher: neue Tabelle

- In `src/storage/personal-learning-events.ts` `this.version(7)` anlegen: alle Tabellen aus Version 6 übernehmen und zusätzlich `dailyPlans: "day"`. Feld `dailyPlans!: Table<DailyPlan, string>`.
- Pläne vor dem Speichern und nach dem Lesen mit einem **Zod-Schema** (`dailyPlanSchema` in `src/domain/daily-plan.ts`) prüfen. Ein ungültiger Plan wird verworfen und neu erzeugt.
- **Nicht** in die persönliche Sicherung aufnehmen (`src/storage/personal-backup.ts`, `src/domain/personal-backup.ts`), denn der Plan ist kurzlebig. Prüfen, ob `src/storage/local-data-boundaries.test.ts` oder Sicherungstests die Tabellenliste vollständig prüfen, und sie gegebenenfalls ergänzen.
- Pläne älter als 7 Tage beim Erzeugen eines neuen Plans löschen.

### A5. Startseite `/lernen`

- `app/lernen/use-learner-dashboard.ts`: Den Plan-Fortschritt über `createDailyPlanRepository(database).progress(now)` laden und in den Snapshot aufnehmen (`plan: { done, total, openByModule, firstOpenModule }`).
- `app/lernen/learner-home.tsx`: Die Summe über `amount` und die Formel `completedToday + dueOpen` entfernen. Neu ist `done = plan.done`, `target = plan.total`, `due = { done: plan.done, total: plan.total }`. `continueHref` zeigt auf das Modul des ersten offenen Elements mit `?heute=1` (Routen: vocabulary → `/lernbox?heute=1`, german → `/frei/german/lernwoerter?heute=1`, mathematics → `/frei/mathematics?heute=1`). Ist der Plan erledigt oder leer, bleibt der bisherige Fallback (`recommendations[0]?.route ?? "/ueben"`).
- `completedToday` wird für die Woche oder Serie nicht mehr gebraucht (`activeDays` bleibt). Die Prop `done` meint jetzt erledigte Portionselemente.
- Ansicht `app/views/lernen/home-screen.tsx`: Die Texte bleiben weitgehend, nur Wortlaut und Bedeutung prüfen: „X von 20 Aufgaben heute“, „Tagesziel geschafft – alles Weitere ist ein Extra“, Karte „heute fällig“ in **„heute dran“** umbenennen (nur offene Portionselemente). Im Panel „Heute fällig“ → „Heute dran“, Hinweis „Noch N Aufgaben, dann ist der Tag voll.“ bleibt. Design-Referenzbilder sind betroffen. Bei Pixel-Abweichung `npm run test:design` laufen lassen und die Abweichung in `docs/umsetzungsplan-lernraum-ui-v2.md` unter „Bewusste Abweichungen“ eintragen. Keine Referenzbilder überschreiben.

### A6. Module starten die Portion mit `?heute=1`

Gemeinsamer Ablauf: Das Modul liest `heute=1`, lädt `today(now)` und die offenen Elemente seines Moduls (`openItems` gefiltert nach `module`) und startet direkt eine Runde nur damit. Gibt es nichts mehr zu tun, erscheint der Hinweis „Dein Teil für heute ist geschafft. Du kannst frei weiterüben.“

- **LernBox** `app/components/learning-box-app.tsx`: In `startSession` einen neuen Scope `"heute"` einführen. Der Pool sind die Plan-Karten mit der Richtung aus dem Element. Wichtig: Hier gilt die **Richtung pro Element**, also beim Aufbau der Warteschlange die Richtung aus dem Element übernehmen statt `learningBoxDirectionAt`. Titel „Heute dran“. Die Übersichtszahl `dueTotal` zeigt die **offenen LernBox-Elemente der Portion**. Die Kachel „Heute dran → Jetzt üben“ startet den Scope `"heute"`. „Meine Fehler“ und die Stapel bleiben als freies Üben erhalten. Außerdem in `lbDecks.due` und `dueCards` die nie geübte Rückrichtung nicht mehr als fällig zählen: eine Hilfsfunktion `isLearningBoxCardScheduledDue(card, now)` in `src/domain/learning-box.ts` (vorwärts fällig, oder rückwärts fällig bei `reverseInterval > 0`) anlegen und **in `src/storage/learning-recommendations.ts` wiederverwenden**, wo diese Logik heute inline steht.
- **Mathe** `app/frei/mathematics/mental-math-app.tsx`: Bei `heute=1` `buildMathReviewRound` mit den Reviews der Plan-Familien starten (pro Familie der am längsten überfällige Posten). `buildMathReviewRound` nimmt heute `reviews.slice(0, 5)`; das bleibt so. Sind mehr als 5 Familien offen, wird das Element nach der Runde über die Ereignisse als erledigt erkannt, der Rest folgt in der nächsten Runde.
- **Lernwörter** `app/components/learning-word-app.tsx` (Speicher in `app/components/use-word-store.ts`): Bei `heute=1` die Runde der Sammlung „Fällige“ (`FALLIGE_ID`) auf die Wörter der Portion beschränken.
- `/ueben` und die freien Einstiege bleiben unverändert (freies Üben zählt nicht zur Portion).

---

## Teil B: Weniger Rückstand an der Quelle

### B1. Mathe: nur Fehler wiederholen, wachsende Abstände, Familien (`src/domain/math-practice.ts`)

`mathReviews(events)` neu regeln. Die Rückgabeform bleibt `MathReview` und wird um `mastered: boolean` und `step: number` ergänzt.

- Ist das **erste** Ereignis eines Postens sauber (richtig, ohne Hilfe, nicht selbst korrigiert), entsteht **kein Wiederholungsposten**. Er erscheint nicht in der Rückgabe, solange kein Fehler folgt.
- Ein Fehler, eine Hilfe oder eine Selbstkorrektur setzen `step = 0` und `dueAt = occurredAt` (fällig) und erhöhen `errors`.
- Eine saubere Antwort in einer **neuen Runde**, wenn `occurredAt >= dueAt` ist: `step += 1`, `dueAt = occurredAt + MATH_REVIEW_DAYS[step - 1]` mit `MATH_REVIEW_DAYS = [1, 3, 7, 14]`. Nach der sauberen Antwort auf Stufe 4 (14 Tage) gilt `mastered = true`.
- Eine saubere Antwort **vor** `dueAt` oder in derselben Runde: keine Stufe höher, `dueAt` bleibt (zu frühes Üben ist Üben, kein Aufstieg).
- Die Rückgabe ist weiter nach `dueAt` sortiert. Gefestigte Posten werden herausgefiltert (oder `mastered` wird von allen Aufrufern gefiltert; eine Variante wählen und konsequent umsetzen).
- Neu: `mathFamilyKey(review)`: `operation` + `gap ?? "normal"` + bei `multiply`/`divide` die Einmaleinsreihe (Logik wie `matchingTables`/`optionsForMathTask`), sonst eine Zahlenraum-Stufe aus `options.maxValue` (≤20, ≤100, ≤1000, größer). `mixed-expression` wird zu `"mixed-expression"`.
- Aufrufer anpassen: `src/storage/learning-recommendations.ts` (`mathDue`, `reason`-Bestimmung über `streak` in `step`/`errors` umstellen), `app/frei/mathematics/mental-math-app.tsx` (`due`, `reviews`). `amount` für Mathe in den Empfehlungen ist die **Zahl der Familien**.
- `docs/architecture.md`, Abschnitt „Persönliches Matheüben“, auf die neue Regel aktualisieren.

### B2. LernBox: Leitner-Abstände 1/3/7/14/30, neue Karten nicht sofort fällig, kein Aufstieg bei zu frühem Üben (`src/domain/learning-box.ts`)

- `LEARNING_BOX_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }`. Möglichst `LEITNER_INTERVAL_DAYS` aus `src/domain/leitner-schedule.ts` **wiederverwenden** statt eine dritte Tabelle anzulegen. `src/domain/learning-word-progress.ts` hat eine Kopie (`intervalsInDays`), die ebenfalls darauf umstellen.
- `processLearningBoxResult`:
  - falsch (oder `secondChance === "failed"`): Box 1, `interval = 1`, `nextReview = now` (wieder fällig, kommt also morgen in die Portion, weil der Plan pro Tag feststeht).
  - richtig, aber **noch nicht fällig** (`!isLearningBoxCardDue(card, direction, now)` und die Richtung schon einmal geübt, d. h. Intervall > 0): Box, Intervall und `nextReview` bleiben, nur `lastReviewed`/`updatedAt` und die Serie ändern sich.
  - richtig und fällig oder neu: eine Box höher, `interval = LEARNING_BOX_INTERVAL_DAYS[nextBox]`, `nextReview = now + interval Tage`.
  - `secondChance === "recovered"` bleibt wie bisher (Box bleibt). Für das Intervall die Tabelle der Box verwenden.
- Neue Karten: In `createLearningBoxCard` bleibt `nextReview: now` (Kompatibilität). „Neu“ ist eindeutig `interval === 0` bzw. `reverseInterval === 0`. Für **Fälligkeitszählungen** (`isLearningBoxCardScheduledDue` aus A6, die Empfehlungen in `src/storage/learning-recommendations.ts`, `lbDecks.due`) gelten nie geübte Richtungen **nicht** als fällig. Neue Karten kommen nur über das `new`-Kontingent der Portion oder über freies Üben eines Stapels.
- **Achtung, Laufdiktat-Übernahme:** `placeLiveVocabularyCard` setzt für neue Vokabeln mit Übungsbedarf `interval: 1, nextReview: now`. Sie sind damit absichtlich fällig und kommen als Fehler in die Portion. Das bleibt so (Entscheidung 49); der Test dazu muss grün bleiben.
- `replayLearningBoxCard` (`src/domain/learning-box-replay.ts`) nutzt `processLearningBoxResult` und übernimmt die neue Regel automatisch. Einen Test ergänzen, der eine bestehende Historie (frühe Wiederholung am selben Tag, Fehler, späte Wiederholung) nachspielt.
- Bestehende Kartenstände werden **nicht migriert**: Die neuen Abstände greifen ab der nächsten Antwort.
- Den Hinweis „kommt morgen wieder / in N Tagen“ (`nextLabel` in `learning-box-app.tsx`) prüfen. Er liest `nextReview` und passt automatisch.
- `docs/umsetzungsplan-lernraum-ui-v2.md` (Abschnitt LernBox) und `obsidian-export/Lernplattform/06 - Lernlogik und Leitner-Boxen/Anwendung.md` um die Regel „kein Aufstieg vor Fälligkeit“ ergänzen. Ins Entscheidungsprotokoll (`obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`) einen neuen Eintrag „Tagesportion 20 und Wiederholungsregeln“ mit der nächsten freien Nummer aufnehmen.

---

## Tests

- `src/domain/daily-plan.test.ts` (neu): Kontingente (6 Fehler, 4 neue), Auffüllen bei wenigen Kandidaten, leerer Plan, Round-Robin zwischen Modulen, deterministische Reihenfolge, Obergrenze 20 auch bei 500 Kandidaten. `dailyPlanProgress`: Ereignis vor `createdAt` zählt nicht, Ereignis vom Vortag zählt nicht, Mehrfachübung zählt einmal. Eigenschaftstest mit `fast-check` (ist in den Dev-Abhängigkeiten): `items.length <= size`, keine doppelten `key`.
- `src/storage/daily-plan.test.ts` (neu, mit `fake-indexeddb` wie in den bestehenden Storage-Tests): Plan pro Tag idempotent, nach Mitternacht neuer Plan, alte Pläne gelöscht, ungültiger Plan neu erzeugt. Szenario aus der Praxis: 200 Karten (davon 150 neu), 60 Mathe-Fehlerposten in 4 Familien, 10 Lernwörter ergeben genau 20 Elemente, davon höchstens 4 neue, und Mathe zählt höchstens 4 (Familien).
- `src/domain/math-practice.test.ts`: Die bestehenden Erwartungen an die neue Regel anpassen und ergänzen: sauber beim ersten Mal heißt kein Posten; Fehler → fällig; zu früh sauber → kein Aufstieg; Stufenfolge 1/3/7/14 → gefestigt; `mathFamilyKey` für ×-Reihe, Lücke und Zahlenraum.
- `src/domain/learning-box.test.ts` und `src/storage/learning-box.test.ts`: neue Abstände; richtig vor Fälligkeit heißt kein Aufstieg; falsch vor Fälligkeit heißt Box 1; nie geübte Rückrichtung ist nicht fällig. **Regressionstest mit einer bestehenden Historie** über `replayLearningBoxCard`.
- `src/storage/learning-recommendations.test.ts`: Die Mathe-`amount` ist die Zahl der Familien; neue Karten erzeugen keine „fällig“-Empfehlung.
- `app/lernen/*`: Für `learner-home` bzw. den Dashboard-Hook gibt es einen Komponententest mit Testing Library. Er prüft „X von 20 Aufgaben heute“ und dass das Ziel beim freien Üben nicht wächst.
- Playwright: Einen vorhandenen Lernraum-Spec erweitern (z. B. `e2e/learner-profile.spec.ts` oder `e2e/platform-quality.spec.ts`; den passenden anhand der `/lernen`-Abdeckung wählen). Mit vorbereiteter IndexedDB, die viele fällige Inhalte enthält, zeigt `/lernen` höchstens 20. „Weiterlernen“ öffnet ein Modul mit `?heute=1`, und eine Runde läuft. Dazu ein axe-Check der Seite.
- Die Abdeckungsgrenzen für `src/domain` und `src/storage` (90/85) müssen halten.

## Aufteilung in Aufträge

Die Umsetzung erfolgt in vier getrennten Aufträgen. Jeder endet mit grünen Prüfungen, Commit und Push; der nächste beginnt erst nach Durchsicht.

| Auftrag | Commit-Schritte | Inhalt                                                              |
| ------- | --------------- | ------------------------------------------------------------------- |
| 1       | 1 und 2         | Umbau ohne Verhaltensänderung, B1 Mathe                             |
| 2       | 3               | B2 LernBox                                                          |
| 3       | 4 und 5         | A2–A5: Portion, Speicher, Startseite                                |
| 4       | 6               | A6: Module mit `?heute=1`, Playwright, Doku, Entscheidungsprotokoll |

## Reihenfolge der Commits (jeweils grün)

1. `local-day` verschieben (A1) und `isLearningBoxCardScheduledDue` herausziehen (Teil von A6), nur Umbau ohne Verhaltensänderung.
2. B1 Mathe-Regel und `mathFamilyKey` mit Tests und Doku.
3. B2 LernBox-Regel mit Tests und Doku.
4. A2–A4: Domäne, Repository, Dexie-Version 7 mit Tests.
5. A5: Startseite mit Tests.
6. A6: Module mit `?heute=1`, Playwright-Test, Entscheidungsprotokoll.

## Nicht Teil dieses Plans

Karten in der LernBox mischen; Fehler am Rundenende erneut abfragen; Hilfe im Laufdiktat milder platzieren (Box bleibt statt Box 1); Portionsgröße pro Klasse einstellbar; FSRS oder Vergessenswahrscheinlichkeit; Wortspeicher (`app/views/wortspeicher/`) und Textbox in die Portion aufnehmen; Tastschreiben in die Portion aufnehmen (bleibt Empfehlung „nächster Schritt“).

## Verifikation

1. `npm run format:check && npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:render`
2. `npm run test:e2e:chromium` (mindestens die geänderten Specs) und bei Änderungen an der Startseite `npm run test:design`.
3. Manuell mit `npm run dev`: In der LernBox 150 Vokabeln über „Viele einfügen“ importieren, zwei Mathe-Runden mit Fehlern rechnen und `/lernen` öffnen. Erwartung: „0 von 20 Aufgaben heute“ (oder weniger als 20, wenn nicht genug ansteht). Über „Weiterlernen“ in die Module, die Portion abarbeiten; der Ring füllt sich bis 20 und zeigt dann „Tagesziel geschafft“. Freies Üben danach ändert die 20 nicht. Mit dem Systemdatum auf den nächsten Tag entsteht eine neue Portion.
