# Umsetzungsplan: Vokabeln aus der Ablage fürs Laufdiktat auswählen

Stand: 15.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `17f5160`

> **Fortschritt:** Die Arbeitsschritte 1 bis 4 sind umgesetzt und geprüft (Branch
> `claude/vokabelauswahl-laufdiktat`, abgezweigt von `claude/lernraum-ui-v2` @ `84bef88`). Vorab
> (Schritt 0): Das Tag-Feld je Vokabel ist im Vokabelheft immer sichtbar, und unter „Tabelle
> einfügen“ steht der Hinweis zur dritten Spalte. Der Probedurchlauf (Abschnitt 4) steht noch aus.

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die fachlichen Entscheidungen in
Abschnitt 1 sind mit der projektverantwortlichen Lehrkraft abgestimmt und **verbindlich**. Wo der
Code etwas anderes nahelegt, gilt dieser Plan. Bei echten Widersprüchen erst nachfragen und nicht
selbst umentscheiden.

## Ausgangslage

Die Lehrkraft legt Vokabelpakete in der Ablage an (`TeacherContentPackage`, Art `vocabulary`) und
gibt sie über „Material“ an Schüler frei. Will sie dieselben Vokabeln als Vokabeltest im
Laufdiktat abfragen, kann sie heute nur ein **ganzes** Paket öffnen (`/lehrer/live?inhalt=…` bzw.
Start-Overlay). Eine Auswahl über mehrere Pakete oder nur einige Vokabeln aus einem Paket muss sie
im Vokabelheft von Hand neu eintippen oder als Tabelle einfügen.

Bausteine, die es schon gibt:

- Ablage: `createTeacherContentLibraryRepository()` (`src/storage/teacher-class-settings.ts`),
  Schema in `src/domain/teacher-content-library.ts`.
- Vokabelformat der Ablage: eine Zeile pro Paar, `links;rechts;tag` (Tab statt `;` erlaubt),
  Alternativen mit `|`. Parser: `parseVocabularyTable` in `src/domain/running-dictation.ts`.
  Die dritte Spalte ist der LernBox-Tag (`VocabularyPair.tag`).
- Klassenfilter: `filterByClass`, `UNASSIGNED` in `src/domain/teacher-content-summary.ts`.
- Live-Raum: `app/lehrer/live/use-teacher-live-room.tsx` (`vocabularyPairs`,
  `applyVocabularyPairs`, `applyLoadedContent`, `storeContent`, `openLobby`).
- Ansicht des Vokabelhefts: `app/views/laufdiktat/vocabulary-editor.tsx` (rein, nur Props).
- Modaler Dialog: `app/views/lehrer/modal-dialog.tsx` (Fokusfalle, Escape, Hintergrund).

## 0. Arbeitsweise

- **Branch:** Arbeite auf einem eigenen Branch, der von `claude/lernraum-ui-v2` abzweigt.
  `claude/lernraum-ui-v2` ist in Cloudflare als Produktionsstand aktiv. **Niemals direkt auf
  `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt nach einem Probedurchlauf selbst.
- **Regeln lesen:** `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md`,
  `docs/umsetzungsplan-lernraum-ui-v2.md` (Abschnitt „Regeln für die Anbindung“).
- **Keine neuen Abhängigkeiten, keine Supabase-Migration, keine Schemaänderung** an
  `teacherContentPackageSchema`. Das Schema ist `.strict()` und wird zwischen Geräten
  synchronisiert; ein neues Feld würde ältere Stände brechen. Alles in diesem Plan kommt ohne aus.
- **Ansichten bleiben rein:** Kein Speicherzugriff in `app/views/`. Auswahl- und Gruppierungslogik
  gehört als reine Funktionen nach `src/domain/`, das Laden der Ablage in den Hook.
- **Prüfen vor jedem Push:** gezielte Vitest-Läufe während der Arbeit, vor dem Push
  `npm run check`. Zusätzlich die betroffenen Playwright-Tests (`e2e/teacher-content.spec.ts`,
  `e2e/live/teacher-room.spec.ts`) mit Axe. Die Coverage-Grenzen aus `vitest.config.ts` dürfen
  nicht sinken.
- **Sprache:** Oberflächentexte, Kommentare und Commit-Nachrichten auf Deutsch, im Stil des
  bestehenden Codes. Commits klein und pro Arbeitsschritt.

## 1. Fachliche Entscheidungen (verbindlich)

### 1.1 Wo ausgewählt wird

Im Laufdiktat, Schritt „Inhalt“, Inhaltsart Vokabeln. Im Vokabelheft gibt es neben „Vokabel
hinzufügen“ und „Datei importieren“ einen dritten Knopf **„Aus meinen Vokabeln wählen“**. Er öffnet
einen Auswahldialog. Die Seite „Inhalte“ bekommt in diesem Schritt keinen eigenen Einstieg.

### 1.2 Gruppierung: Überschrift = Paket, darunter Tags

- **Erste Ebene:** jedes Vokabelpaket der Ablage mit seinem Titel als Überschrift (z. B.
  „Unit 3 · Food“), daneben Anzahl der Vokabeln und Sprache („24 Vokabeln · Englisch“).
- **Zweite Ebene:** innerhalb eines Pakets Gruppen nach Tag (dritte Spalte). Paare ohne Tag stehen
  in der Gruppe **„Ohne Tag“** am Ende. Hat ein Paket gar keine Tags, entfällt die zweite Ebene,
  die Paare stehen direkt unter dem Paket.
- **Reihenfolge:** Pakete nach letzter Änderung, neueste zuerst. Tag-Gruppen in der Reihenfolge
  ihres ersten Auftretens im Paket. Paare in Paketreihenfolge.
- Es gibt **kein neues Eingabeformat** (keine Überschriftenzeilen wie `# Unit 3`).

### 1.3 Filter und Suche

- **Klasse:** Standard ist die Klasse, die im Live-Raum gewählt ist (wie in der Ablage, inklusive
  „Nicht zugeordnet“ über `filterByClass`). Ein Schalter „Alle Klassen“ zeigt alle Pakete.
- **Sprache:** Es werden nur Pakete mit **demselben Sprachpaar** wie das Vokabelheft angezeigt
  (Vergleich über den Grundteil der Kennung, „en“ passt zu „en-GB“, wie `pickerLocale` in
  `app/lehrer/content-adapter.ts`). Ist das Heft noch leer, gilt das Sprachpaar des ersten
  angehakten Pakets. Danach sind Pakete mit anderem Sprachpaar ausgeblendet; ein Hinweis nennt
  ihre Zahl („3 Pakete in anderen Sprachen ausgeblendet“). Gemischte Sprachen in einer Runde gibt
  es nicht, weil Vorlesen und Prüfung an einem Sprachpaar hängen.
- **Suche:** ein Feld, sucht ohne Groß-/Kleinschreibung in links, rechts (inklusive Alternativen)
  und Tag. Gruppen ohne Treffer werden ausgeblendet; Treffer in einem eingeklappten Paket klappen
  es auf.

### 1.4 Auswählen

- Jede Vokabel hat ein Kästchen. Jede Tag-Gruppe und jedes Paket hat ein Kästchen für „alle“ mit
  Zwischenzustand (`indeterminate`), wenn nur ein Teil gewählt ist.
- „Alle“ bei aktiver Suche wählt nur die **sichtbaren** Treffer.
- Unten fest: „**12 ausgewählt**“, „Auswahl leeren“ und „**Übernehmen**“ (deaktiviert bei 0).
- **Doppelte Paare** (gleiche Hauptform links und rechts nach Normalisierung, über Pakete hinweg)
  werden beim Übernehmen nur einmal eingefügt. Die erste Fundstelle gewinnt, ihr Tag bleibt.
- Die Auswahl im Dialog gilt nur, solange der Dialog offen ist. Sie wird nicht gespeichert.

### 1.5 Übernehmen ins Vokabelheft

- Ist das Heft leer (nur die leere Startzeile), **ersetzt** die Auswahl den Inhalt und setzt das
  Sprachpaar.
- Sonst wird die Auswahl **angehängt**. Paare, die schon im Heft stehen, werden übersprungen.
  Eine Meldung nennt beides: „10 Vokabeln übernommen, 2 standen schon im Heft.“
- Der Tag jedes Paars bleibt erhalten. Er wirkt wie bisher als eigener LernBox-Tag; Paare ohne Tag
  bekommen beim Übernehmen in die LernBox den Runden-Tag.
- Übernommen wird immer `links;rechts` mit allen Alternativen. Abfragerichtung,
  Groß-/Kleinschreibung und Übernahme-Option bleiben, wie die Lehrkraft sie im Heft eingestellt hat.

### 1.6 Ablage: Die Auswahl wird eine neue Abfrage

- Sobald etwas aus dem Dialog übernommen wurde, ist der Heftinhalt **eine neue Abfrage**. Beim
  Öffnen der Lobby (`openLobby` → `storeContent(true)`) entsteht ein **neues Paket**. Die
  Ursprungspakete bleiben unverändert, auch wenn vorher eines davon geöffnet war.
- Technisch: Nach dem Übernehmen wird `contentId` auf `null` gesetzt. Das Überschreiben eines
  geladenen Pakets ist damit ausgeschlossen.
- **Titelvorschlag**, wenn das Titelfeld leer ist oder noch den Titel des geladenen Pakets trägt:
  „Abfrage 15.10. · Unit 3“ (ein Ursprungspaket) bzw. „Abfrage 15.10. · Unit 3 + 2 weitere“. Die
  Lehrkraft kann ihn ändern.
- Ein Hinweis unter dem Titelfeld: „Wird beim Start als neue Abfrage abgelegt. Deine Vokabelpakete
  bleiben unverändert.“
- Die neue Abfrage bekommt die Klasse des Raums wie jeder neue Inhalt (`classId: activeClass`).
  Sie lässt sich später aus der Ablage erneut starten.

### 1.7 Grenzen

- Es gelten die bestehenden Grenzen des Raums. Eine eigene Obergrenze für die Auswahl gibt es
  nicht.
- Der Knopf erscheint nur, wenn die Ablage mindestens ein Vokabelpaket enthält. Sonst ein
  deaktivierter Knopf mit Hinweis „Noch keine Vokabelpakete in der Ablage“.
- Während ein Raum offen ist, ist der Schritt „Inhalt“ ohnehin gesperrt; daran ändert sich nichts.

## 2. Umsetzung

### 2.1 Reine Logik: `src/domain/vocabulary-catalog.ts`

Neue Datei mit Tests (`vocabulary-catalog.test.ts`). Keine React-Abhängigkeit.

```ts
export type CatalogPair = {
  /** Stabil innerhalb einer Dialogsitzung: `${packageId}:${zeilenindex}`. */
  key: string;
  pair: VocabularyPair; // aus parseVocabularyTable, mit tag
};
export type CatalogTagGroup = { tag: string | null; pairs: CatalogPair[] };
export type CatalogPackage = {
  id: string;
  title: string;
  promptLocale: string;
  answerLocale: string;
  updatedAt: string;
  count: number;
  groups: CatalogTagGroup[]; // genau eine Gruppe mit tag=null, wenn keine Tags
};

export function buildVocabularyCatalog(
  packages: readonly TeacherContentPackage[],
): CatalogPackage[];
export function filterVocabularyCatalog(
  catalog: readonly CatalogPackage[],
  filter: { query: string; locales: VocabularyLocales | null },
): { visible: CatalogPackage[]; hiddenByLanguage: number };
export function selectedPairs(
  catalog: readonly CatalogPackage[],
  keys: ReadonlySet<string>,
): VocabularyPair[]; // Paketreihenfolge, Dubletten entfernt (1.4)
export function mergeIntoHeft(
  current: readonly VocabularyPair[],
  picked: readonly VocabularyPair[],
): {
  pairs: VocabularyPair[];
  added: number;
  skipped: number;
  replaced: boolean;
};
export function suggestQuizTitle(
  sourceTitles: readonly string[],
  now: Date,
): string;
export function sameLanguagePair(
  a: VocabularyLocales,
  b: VocabularyLocales,
): boolean;
```

Hinweise:

- `buildVocabularyCatalog` nimmt nur `contentKindOf(entry) === "vocabulary"`, sortiert nach
  `updatedAt` absteigend und lässt Pakete ohne gültige Paare weg.
- Der Paarvergleich für Dubletten nutzt dieselbe Normalisierung wie die Antwortprüfung
  (`normalizeVocabularyAnswer` in `running-dictation.ts`, dafür exportieren), ohne
  Groß-/Kleinschreibung. Nicht neu erfinden.
- `sameLanguagePair` vergleicht den Grundteil der Kennung. Die Logik von `pickerLocale` aus
  `app/lehrer/content-adapter.ts` dafür nach `src/domain/` ziehen und an beiden Stellen nutzen.
- „Leeres Heft“ heißt: alle Paare ohne Hauptform links und rechts.
- Tests: Gruppierung mit/ohne Tags, „Ohne Tag“ am Ende, Sortierung, Suche in Alternativen und
  Tag, Sprachfilter inkl. „en“ ↔ „en-GB“ und Zählung ausgeblendeter Pakete, Dubletten über
  Pakete, Anhängen vs. Ersetzen, Titelvorschlag mit einem und mehreren Paketen.

### 2.2 Ansicht: `app/views/laufdiktat/vocabulary-picker.tsx`

Reine Komponente mit Props, im Dialog `ModalDialog`. Eigene CSS-Module-Datei plus `.d.ts` wie die
Nachbarn.

```ts
export type VocabularyPickerProps = {
  open: boolean;
  packages: readonly CatalogPackage[]; // schon gefiltert
  hiddenByLanguage: number;
  query: string;
  allClasses: boolean;
  className?: string; // Name der Raumklasse für den Schalter
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>; // Paket-IDs
  onQuery?: (value: string) => void;
  onAllClasses?: (value: boolean) => void;
  onToggle?: (keys: readonly string[], checked: boolean) => void;
  onExpand?: (packageId: string, open: boolean) => void;
  onClear?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
};
```

Aufbau:

- Kopf: Titel „Aus meinen Vokabeln wählen“, Suchfeld (`type="search"`, Label „Vokabeln
  durchsuchen“), Schalter „Alle Klassen“.
- Liste: je Paket eine Überschrift mit Auf-/Zuklapp-Knopf (`aria-expanded`, `aria-controls`) und
  einem „alle“-Kästchen mit sprechendem Label („Alle Vokabeln aus Unit 3 auswählen“). Darunter
  Tag-Gruppen mit eigenem „alle“-Kästchen, darunter Zeilen „links → rechts“ mit Kästchen.
  `indeterminate` per Ref setzen.
- Fuß (bleibt sichtbar): Zähler mit `role="status"`, „Auswahl leeren“, „Übernehmen“.
- Leerzustände: keine Treffer („Keine Vokabel passt zur Suche.“), Klasse ohne Pakete („Für
  Klasse 7b liegen keine Vokabelpakete ab. ‚Alle Klassen‘ zeigt alle.“).
- Mobil (Rahmen schmal): Dialog füllt den Bildschirm, Fuß klebt unten, Zielgrößen ≥ 44 px.
  Keine horizontale Scrollleiste bei 320 px.
- Pakete sind anfangs zugeklappt; ist nur ein Paket sichtbar, ist es aufgeklappt.

### 2.3 Vokabelheft und Bildschirm

- `VocabularyEditorProps` um `onPickFromLibrary?: () => void` und
  `pickFromLibraryDisabled?: boolean` erweitern; Knopf in `bookActions` neben „Datei importieren“.
- `TeacherDictationScreenProps` reicht die Picker-Props durch (wie die Ablage-Props der
  `LibraryBar`) und rendert `VocabularyPicker`. Unter dem Titelfeld der Hinweis aus 1.6, wenn
  `quizFromLibrary` gesetzt ist.

### 2.4 Hook: `app/lehrer/live/use-teacher-live-room.tsx`

Die Datei ist mit über 1900 Zeilen schon zu groß (siehe
`docs/umsetzungsplan-code-analyse-4-grosse-dateien.md`). Den Zustand des Dialogs deshalb in einen
eigenen Hook `app/lehrer/live/use-vocabulary-picker.ts` legen, den `useTeacherLiveRoom` nur
aufruft.

- `useVocabularyPicker({ activeClass, liveClasses, heftLocales, heftIsEmpty, onApply })`
  - lädt beim Öffnen die Ablage über `createTeacherContentLibraryRepository().list()` (frisch bei
    jedem Öffnen, damit auf „Inhalte“ geänderte Pakete erscheinen) und hört auf
    `teacher-data-changed`;
  - hält `query`, `allClasses`, `selected`, `expanded` und das gewählte Sprachpaar;
  - berechnet `filterByClass` → `buildVocabularyCatalog` → `filterVocabularyCatalog`;
  - liefert die Props für `VocabularyPicker` und `onPickFromLibrary`.
- Beim Bestätigen in `useTeacherLiveRoom`:
  1. `selectedPairs` → `mergeIntoHeft(vocabularyPairs, picked)`; neue Paare bekommen
     `crypto.randomUUID()` als `id` (wie `importVocabularyTable`).
  2. `applyVocabularyPairs(result.pairs)`; bei `replaced` zusätzlich `setVocabularyLocales`.
  3. `setContentId(null)` und Merker `quizFromLibrary = true` (1.6).
  4. Titelvorschlag setzen, wenn der Titel leer ist oder dem geladenen Paket entspricht.
  5. Meldung aus 1.5 über den vorhandenen `libraryNotice`-Kanal.
- `quizFromLibrary` wird zurückgesetzt, wenn ein anderes Paket geladen
  (`applyLoadedContent`) oder die Inhaltsart gewechselt wird.
- `storeContent` bleibt unverändert; mit `contentId === null` legt es schon heute ein neues Paket an.

### 2.5 Tests

- **Vitest, Domäne:** siehe 2.1.
- **Vitest, Ansicht:** `app/views/laufdiktat/vocabulary-picker.test.tsx` mit Testing Library:
  Gruppen und Überschriften, Zwischenzustand, „alle“ bei Suche wählt nur Treffer, Zähler,
  „Übernehmen“ deaktiviert bei 0, Leerzustände.
- **Vitest, Live-Raum:** in `app/lehrer/live/teacher-live-room-library.test.tsx` ergänzen:
  - Auswahl aus zwei Paketen landet im Heft, Dubletten einmal.
  - Geladenes Paket „Unit 3“, Auswahl angehängt, Lobby geöffnet → **neues** Paket in der Ablage,
    „Unit 3“ unverändert (Revision und Quelle gleich).
  - Titelvorschlag; Klassenfilter mit Raumklasse und „Alle Klassen“; Sprachfilter.
- **Playwright:** in `e2e/teacher-content.spec.ts` (oder `e2e/live/teacher-room.spec.ts`) ein
  Durchlauf: zwei Pakete anlegen, im Laufdiktat auswählen, Heft prüfen, Axe ohne Befund mit offenem
  Dialog, auf Desktop- und Mobilprojekt. Tastaturbedienung: Tab durch Suche, Kästchen,
  „Übernehmen“; Escape schließt ohne Übernahme.

## 3. Arbeitsschritte (je ein Commit)

1. `vocabulary-catalog.ts` mit Tests; `pickerLocale` nach `src/domain/` ziehen.
2. `VocabularyPicker`-Ansicht mit CSS-Modul und Ansichtstests.
3. `useVocabularyPicker` und Anbindung in `useTeacherLiveRoom`, Knopf im Vokabelheft, Hinweis
   unter dem Titel; Live-Raum-Tests.
4. Playwright- und Axe-Test, `npm run check`, Push auf den Arbeitsbranch.
5. Probedurchlauf mit der Lehrkraft (Abschnitt 4).

## 4. Probedurchlauf (Lehrkraft)

- Zwei Englisch-Pakete mit Tags und ein Französisch-Paket anlegen.
- Im Laufdiktat „Aus meinen Vokabeln wählen“: Französisch ist ausgeblendet und wird gezählt.
- Aus „Unit 3“ den Tag „Food“ ganz und aus „Unit 2“ drei einzelne Vokabeln wählen, übernehmen.
- Raum öffnen: In der Ablage liegt „Abfrage TT.MM. · Unit 3 + 1 weitere“, beide Units sind
  unverändert.
- Abfrage aus der Ablage erneut starten.
- Am Handy: Dialog bedienbar, nichts läuft aus dem Bildschirm.

## 5. Nicht in diesem Plan

- Eigener Einstieg „Vokabeln“ auf der Seite „Inhalte“ mit Auswahl über alle Pakete und „Abfrage
  starten“. Der Dialog aus 2.2 ist so gebaut, dass er dort wiederverwendet werden kann.
- „Zufällig N Vokabeln aus der Auswahl“ für Kurztests.
- Überschriftenzeilen im Vokabeltext (`# Unit 3`).
- Vermerk, aus welchen Paketen eine Abfrage stammt (bräuchte ein Schemafeld, siehe 0).

## 6. Nebenbefund (behoben am 15.10.2026)

`parseTeacherVocabularyPairs` in `src/domain/teacher-content-transfer.ts` (Freigabe an Schüler auf
„Material“) kannte die Tag-Spalte nicht: `school;Schule;Unit 3` wurde zur Antwort `Schule;Unit 3`.
Alternativen mit `|` wurden ebenfalls nicht getrennt. Außerdem trug jede Vokabel die Paket-ID als
`tagIds[0]`, und die LernBox übernimmt diesen Eintrag als Tag der Karte. Schülerkarten hießen dadurch
„teacher-package-…“.

Behoben: Der Parser nutzt jetzt `parseVocabularyTable` wie das Laufdiktat. Alternativen gehen als
`alternatives` ins Lernpaket, der Tag der dritten Spalte als `tagIds`. Ohne Tag bleibt `tagIds`
leer. Karten mit dem alten Paket-ID-Tag verlieren ihn, sobald die Lehrkraft das Paket erneut teilt
und das Kind es übernimmt. Alternativen der linken Seite stehen im Lernpaket; die LernBox nutzt für
die Frage weiterhin nur die Hauptform.
