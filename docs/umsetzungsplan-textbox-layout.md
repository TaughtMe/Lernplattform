# Umsetzungsplan Textbox: neues Layout (Design 9b–9f)

Stand: 12.10.2026 · Branch `claude/lernraum-ui-v2` · Vorlage: `docs/design/lernraum-ui.dc.html`, Turn 9

Dieser Plan ist für eine Umsetzung in Paketen geschrieben. Jedes Paket endet mit grünen gezielten Tests und einem eigenen Commit. Fachlogik, Speicherung, Backup, Freigaberegister und Wortspeicher-Brücke der Textbox bleiben, wie sie sind. Ausnahme ist nur die neue Funktion „Durchgang wiederholen“ (Paket B).

## 0. Ausgangslage und Ziel

**Heute** (siehe `docs/umsetzungsplan-textbox.md`): Die Textbox liegt unter `/frei/german/textbox`. `app/components/textbox-app.tsx` steuert den Ablauf, die Ansichten liegen in `app/views/textbox/`:

| Datei                     | Inhalt heute                                                        |
| ------------------------- | ------------------------------------------------------------------- |
| `library-screen.tsx`      | Liste mit Segmented- und Select-Filtern, Fortsetzen-Box, Vorschläge |
| `memorize-screen.tsx`     | Merkphase, `StepList`, Timer                                        |
| `gap-writing-screen.tsx`  | Durchgang 1–3, Lücken im Text                                       |
| `free-writing-screen.tsx` | Durchgang 4, leeres Textfeld                                        |
| `review-screen.tsx`       | Kontrolle mit Symbolen, Legende, Wortliste in Durchgang 4           |
| `completion-screen.tsx`   | Abschluss nach Durchgang 4 (bleibt, ist nicht Teil von Turn 9)      |
| `text-detail-screen.tsx`  | Verlauf eines Textes (bleibt)                                       |
| `text-flow.tsx`           | setzt Wörter und Satzzeichen wieder zusammen                        |
| `textbox.module.css`      | gemeinsame Gestaltung                                               |

**Ziel:** Auswahl und Eingabe sehen aus wie in Turn 9 der Vorlage:

| Screen | Was                                                                                            | Breite               |
| ------ | ---------------------------------------------------------------------------------------------- | -------------------- |
| 9b     | Auswahl Desktop: „Weitermachen“ oben, Filterleiste, Kartenraster mit Bestwertbalken            | ab 900 px            |
| 9c     | Auswahl mobil: wischbare Filterchips, Raster mit zwei Spalten, Schwerpunkt als Blatt von unten | unter 900 px         |
| 9d     | Eingabe Desktop: Heft mit Linien, Navigation bleibt (Standard)                                 | ab 900 px            |
| 9e     | Eingabe Desktop: ruhiger Vollbildmodus, Lücken als Kästchen, Fußleiste                         | ab 900 px, per Knopf |
| 9f     | Eingabe mobil: Heft wie 9d, Navigation ausgeblendet, Aktionsleiste unten                       | unter 900 px         |

9a ist die verworfene Alternative zu 9b und wird **nicht** gebaut.

So öffnest du die Vorlage: `docs/design/lernraum-ui.dc.html` im Browser, Anker `#t9`. Über der Reihe 9d–9f liegen die Knöpfe „Ablauf springen“ (D1 Merken … D4 Kontrolle). Mit ihnen lassen sich alle Zustände ansehen. Die Logik der Vorlage steht in der Methode `tbVals()` und den Konstanten `TB_*` (suche nach `const TB_` und `tbVals()`). Maße, Farben und Abstände stehen dort als Inline-Styles. **Bei Zweifeln gilt die Vorlage.**

## 1. Entscheidungen (mit der Product Ownerin abgestimmt bzw. hier festgelegt)

1. **9d ist Standard, 9e per Knopf.** Am Desktop startet jede Übung im Heft-Layout (9d). Ein Knopf „Vollbild“ im Kopf schaltet auf 9e um, „Vollbild beenden“ schaltet zurück. Die Wahl wird pro Gerät in `localStorage` gemerkt (Schlüssel `textbox-layout`, Werte `heft` | `vollbild`). Unter 900 px gilt immer 9f, der Knopf ist dort ausgeblendet.
2. **„Durchgang wiederholen“ kommt.** In der Kontrolle führt er zurück zur Merkphase desselben Durchgangs. Der Durchgang lässt sich beliebig oft wiederholen; jeder Versuch ist vollwertig und hat einen eigenen Prozentwert, der letzte ist das Ergebnis. Alle Versuche bleiben gespeichert (`retries`, höchstens 100 je Durchgang) und stehen im Verlauf (geändert nach Entscheidung 27.10.2026, siehe `docs/inhalte/textbox.md`). Die Lücken bleiben gleich (gleicher Seed). Der Bestwert zählt weiter nur Durchgang 4.
3. **Abschluss bleibt.** Nach der Kontrolle in Durchgang 4 heißt der Hauptknopf weiter „Ergebnis ansehen“ und führt zum bestehenden `CompletionScreen`. Die Vorlage zeigt dort „Zurück zur Auswahl“; der Abschluss mit Bestwert und Wortspeicher-Brücke ist aber fachlich nötig (bewusste Abweichung).
4. **„Gemeistert“** heißt: Bestwert ≥ 90 % (Konstante `TEXTBOX_MASTERED_PERCENT = 90` in `src/domain/textbox-progress.ts`). „Begonnen“ heißt: mindestens eine abgeschlossene Übung **oder** eine angefangene Einheit. Sonst „Neu“.
5. **Schwierigkeit filtert genau eine Stufe.** Die drei Punkte funktionieren wie in der Vorlage: Klick auf Punkt _k_ wählt Stufe _k_ (Punkte 1…_k_ gefüllt), erneuter Klick auf dieselbe Stufe hebt den Filter auf. Gefiltert wird auf genau diese Stufe.
6. **Stand und Schwerpunkt sind Mehrfachauswahl** (ODER innerhalb einer Gruppe, UND zwischen den Gruppen), wie in der Vorlage.
7. **Weitermachen nur am Desktop.** In 9c gibt es den Abschnitt nicht; dort zeigt die Karte „Durchgang _n_ offen“. Ein Tipp auf die Karte öffnet wie heute die Frage „Fortsetzen / Neu beginnen“.
8. **Erhalten bleiben**, obwohl die Vorlage sie nicht zeigt (bewusste Abweichungen): Speicherhinweis (`Notice`), Fortsetzen-Frage, „Passende Texte zu deinen Wörtern“ (Wortspeicher-Brücke), „Verlauf“ je geübtem Text, Link „Laufzettel ansehen und drucken“, Abschluss- und Verlaufsansicht.
9. **Kontrolle ohne Symbole und Legende.** Die Kontrolle zeigt wie die Vorlage: richtig = grünes Kästchen, falsch = eigene Schreibweise durchgestrichen + richtiges Wort grün, fehlt = Wort mit roter Umrandung, zusätzlich = nur durchgestrichen, Groß/klein = durchgestrichen + Wort mit Akzent-Umrandung. Farbe ist nie das einzige Merkmal (Durchstreichung, Umrandung, Form). Die `ui-sr-only`-Präfixe („richtig:“, „falsch:“, „fast richtig:“ …) bleiben für Screenreader.
10. **Durchgang 4 in der Kontrolle als Fließtext** wie in der Vorlage, nicht mehr als Wortliste.
11. **Zurück zur Auswahl während einer Übung** (Knopf „Auswahl“ bzw. Pfeil/X): ohne Rückfrage. Abgeschlossene Durchgänge sind schon gespeichert; die Eingabe des laufenden Durchgangs geht verloren (wie heute beim Wechsel über die Navigation).

## 2. Was sich nicht ändern darf

- `src/domain/textbox-session.ts`: bestehende Funktionen und Zod-Schemas unverändert (nur `repeatRound` kommt dazu).
- Speicherung (`src/storage/personal-learning-events.ts`), Dexie-Version, Backup, Laufzettel, Detailansicht.
- Eingabeschutz in allen Schreibfeldern: `STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES`, `isBlockedRunningDictationInput` in `onBeforeInput`, Einfügen und Ablegen gesperrt, `MAX_GAP_LENGTH`, `MAX_FREE_TEXT_LENGTH`.
- Tastaturführung in den Lücken: Leertaste/Eingabe springt weiter, Tab/Umschalt+Tab, Rücktaste in leerer Lücke springt zurück, nach der letzten Lücke Fokus auf „Prüfen“, Bildschirmtastatur mit Leerzeichen als Text. Alle Fälle in `gap-writing-screen.test.tsx` bleiben grün.
- Breite der Lücken: Durchgang 1–2 `max(3, Länge) + 1` ch, Durchgang 3 einheitlich `UNIFORM_GAP_WIDTH` = 11 ch.
- Fokus nach jedem Ansichtswechsel auf `#textbox-title` (`tabIndex={-1}`), außer beim Schreiben (dort erste Lücke bzw. Textfeld).
- Zugängliche Namen, auf die sich `e2e/textbox.spec.ts` stützt: Überschrift „Textbox“; Knöpfe „_Titel_ üben“ bzw. „_Titel_ weiterüben“, „_Titel_: Verlauf ansehen“, „Ich bin bereit“, „Prüfen“, „Weiter zu Durchgang _n_“, „Ergebnis ansehen“; Überschrift „Durchgang _n_ von 4: Merken|Schreiben|Kontrolle“; Felder „Lücke _i_ von _n_“, „Dein Text aus dem Gedächtnis“; `role="timer"`; nach Rückkehr in die Auswahl eine Überschrift mit dem Titel des Textes.
- Der Fix aus Commit `3953ee9` („Lücken überlappen auf dem Handy nicht mehr“): Lücken und ihr Fokusrahmen dürfen zwei Zeilen nicht überlappen. Lückenhöhe + Fokusrahmen < Zeilenhöhe (Desktop 32 px in 44 px, mobil 30 px in 40 px, 9e 40 px in 52 px).

## 3. Pakete

### Paket A: Vorlage, Referenzbilder, Katalog-Gerüst

1. `docs/design/lernraum-ui.dc.html` enthält bereits Turn 9 (mit diesem Plan eingecheckt; Turns 1–8 sind unverändert, die Datei wurde nur ergänzt). `docs/design/README.md` nennt 9a–9f.
2. `docs/design/screens.json` um folgende Zustände ergänzen. Die Ablauf-Knöpfe liegen außerhalb der Karten und haben `data-r` (Durchgang) und `data-s` (Schritt 0/1/2). Sie wirken auf 9d, 9e und 9f gemeinsam:

   | id              | screen | Größe                     | canvas (Klicks)                  | hide                       |
   | --------------- | ------ | ------------------------- | -------------------------------- | -------------------------- |
   | `9b`            | 9b     | 1180 × aus Vorlage messen | –                                | Tierbild im Filterstreifen |
   | `9c`            | 9c     | 390 × 844                 | –                                | Tierbild                   |
   | `9d`            | 9d     | 1180 × 800                | `button[data-r="1"][data-s="0"]` | –                          |
   | `9d-gaps`       | 9d     | 1180 × 800                | `button[data-r="1"][data-s="1"]` | –                          |
   | `9d-check`      | 9d     | 1180 × 800                | `button[data-r="1"][data-s="2"]` | –                          |
   | `9d-free`       | 9d     | 1180 × 800                | `button[data-r="4"][data-s="1"]` | –                          |
   | `9d-free-check` | 9d     | 1180 × 800                | `button[data-r="4"][data-s="2"]` | –                          |
   | `9e-gaps`       | 9e     | 1180 × 800                | `button[data-r="1"][data-s="1"]` | –                          |
   | `9e-free`       | 9e     | 1180 × 800                | `button[data-r="4"][data-s="1"]` | –                          |
   | `9f`            | 9f     | 390 × 844                 | `button[data-r="1"][data-s="0"]` | –                          |
   | `9f-gaps`       | 9f     | 390 × 844                 | `button[data-r="1"][data-s="1"]` | –                          |
   | `9f-check`      | 9f     | 390 × 844                 | `button[data-r="1"][data-s="2"]` | –                          |
   | `9a`            | 9a     | aus Vorlage               | –                                | Status `referenz`          |

   Nach jedem Zustand mit `reset` auf `button[data-r="1"][data-s="0"]` zurückstellen. Status zunächst `offen`, nach Paket C/D/E jeweils `umgesetzt`. Größen mit `npm run design:references -- 9b,9c,… --update-sizes` messen lassen.

3. Referenzbilder erzeugen: `npm run design:references -- 9a,9b,9c,9d,9d-gaps,9d-check,9d-free,9d-free-check,9e-gaps,9e-free,9f,9f-gaps,9f-check`. Ohne Zugriff auf unpkg.com: `DESIGN_UMD_DIR` setzen (React 18.3.1, React-DOM 18.3.1, `@babel/standalone` 7.29.0 per `npm pack` entpacken, Pfade siehe `scripts/render-design-references.mjs`) und bei Bedarf `CHROMIUM_PATH=/opt/pw-browsers/chromium`. **Nur die neuen Bilder committen**; bestehende Referenzbilder nicht neu erzeugen.
4. Beispieldaten `app/views/textbox/demo.ts` aus den Konstanten der Vorlage: `TB_LIB` (16 Texte mit Stufe, Schwerpunkten, Bestwert, Anzahl, offenem Durchgang), `TB_TEXT`/`TB_TARGET`/`TB_SETS` (Lücken je Durchgang), `TB_MISS` und `TB_SAMPLE_FREE` (Beispiel-Eingaben für die Kontrolle). Die Kontroll-Beispiele als fertige `WordResult[]` ablegen, damit die Ansicht ohne Fachlogik rendert. Die Schwerpunkt-Namen der Vorlage („Groß und klein“, „Wortbausteine“) nur in `demo.ts` verwenden; im Produkt gelten `TEXTBOX_PHENOMENON_LABELS`.
5. Katalog: In `app/entwicklung/screens/registry.tsx` (und `design-screens.ts`, falls dort registriert wird) die Zustände aus Schritt 2 auf die neuen Ansichten mit `demo.ts` abbilden. 9b/9d/9e im `StudentFrame` mit Seitenleiste bzw. ohne (9e), 9c mit Tab-Leiste, 9f ohne Navigation. Vorbild: wie 3c/3d und 5a/5b eingebunden sind.

**Prüfen:** `npm run typecheck`, `npm run lint`. Commit: „Textbox-Layout Paket A: Vorlage Turn 9, Referenzzustände, Beispieldaten“.

### Paket B: Fachlogik (rein, mit Unit-Tests)

1. `src/domain/textbox-session.ts`: neue Funktion

   ```ts
   /** Verwirft das Ergebnis des laufenden Durchgangs und beginnt ihn neu (gleiche Lücken). */
   export function repeatRound(state: TextboxRunState): TextboxRunState;
   ```

   - verlangt Phase `review` (`requirePhase`), sonst Fehler
   - entfernt das letzte Element aus `rounds` (es muss `round === state.round` haben, sonst Fehler)
   - setzt `phase: "memorize"`, `round` bleibt, `memorizeMs` entfernt
   - Tests in `textbox-session.test.ts`: Durchgang 1 → `rounds` leer; Durchgang 3 → zwei Ergebnisse bleiben; Durchgang 4 vor „Ergebnis ansehen“ → zurück zu Merken in Durchgang 4; falsche Phase wirft; danach `finishMemorize` + `submitRound` liefern denselben `blanked`-Satz wie beim ersten Versuch; alle Versuche bleiben in `retries`, der letzte bestimmt das Ergebnis.

2. `src/domain/textbox-progress.ts`:
   - `export const TEXTBOX_MASTERED_PERCENT = 90;`
   - `export type TextboxStand = "neu" | "begonnen" | "gemeistert";`
   - `export function textboxStand(summary: TextboxTextSummary | undefined, hasOpen: boolean): TextboxStand`
   - Tests: ohne Übung und ohne offene Einheit → neu; nur offene Einheit → begonnen; Bestwert 89 → begonnen; 90 → gemeistert.
3. Neue Datei `src/domain/textbox-filter.ts` (rein, ohne React):

   ```ts
   export type TextboxFilter = {
     query: string;
     difficulty: TextboxDifficulty | undefined; // genau eine Stufe oder keine
     stands: readonly TextboxStand[];
     phenomena: readonly TextboxPhenomenon[];
   };
   export const EMPTY_TEXTBOX_FILTER: TextboxFilter;
   export function matchesTextboxFilter(text, stand, filter): boolean;
   export function activeFilterChips(filter): {
     key: "stufe" | "stand" | "schwerpunkt";
     value: string;
     label: string;
   }[];
   export function removeFilterChip(filter, key, value): TextboxFilter;
   export function phenomenaInLibrary(
     texts,
   ): { id: TextboxPhenomenon; label: string; count: number }[];
   ```

   - Suche: getrimmt, ohne Groß/klein, trifft Titel **oder** Bezeichnung eines Schwerpunkts (`TEXTBOX_PHENOMENON_LABELS`). Mit `toLocaleLowerCase("de")` vergleichen.
   - Reihenfolge der Chips wie in der Vorlage: Stufe, Stand, Schwerpunkte.
   - `phenomenaInLibrary` listet nur Schwerpunkte, die mindestens ein Text hat, in der Reihenfolge von `TEXTBOX_PHENOMENA`, mit Anzahl.
   - Tests in `textbox-filter.test.ts` für jede Funktion, inklusive UND/ODER-Logik und Suche nach „ss“ (trifft „s, ss und ß“ und Titel mit „ss“).

4. Rückfluss für die Kontrolle in Durchgang 4: neue reine Funktion in `src/domain/text-compare.ts` oder `app/views/textbox/review-flow.ts`:

   ```ts
   /** Ergebnisse von Durchgang 4 als Fließtext: jedes Wort mit den Satzzeichen, die im Original direkt folgen. */
   export function reviewSequence(
     tokens: readonly LayoutToken[],
     words: readonly WordResult[],
   ): { result: WordResult; trailing: string }[];
   ```

   Satzzeichen hängen an `expectedIndex`; zusätzliche Wörter (ohne `expectedIndex`) bekommen keine. Tests mit Komma, Punkt am Satzende, fehlendem Wort vor einem Punkt und zusätzlichem Wort am Ende.

**Prüfen:** `npx vitest run src/domain/textbox app/views/textbox`. Commit: „Textbox-Layout Paket B: Durchgang wiederholen, Stand, Filter, Fließtext der Kontrolle“.

### Paket C: Auswahl 9b (Desktop) und 9c (mobil)

`app/views/textbox/library-screen.tsx` neu aufbauen. Die Ansicht bekommt weiter nur Props. Filterzustand lebt in der Ansicht (wie heute); `initialPhenomenon` setzt `phenomena: [initialPhenomenon]`. Umschalten Desktop/mobil per `@container student-main (min-width: 900px)` (wie `app/views/shell/student-frame.module.css`), nicht per JavaScript.

Neue Props zusätzlich zu den bestehenden: keine Pflicht. `LibraryEntry` bleibt; `stand` berechnet die Ansicht über `textboxStand`.

**Aufbau von oben nach unten (Maße aus 9b/9c übernehmen):**

1. **Kopf.** `<h1 id="textbox-title" tabIndex={-1}>Textbox</h1>` (28 px, 700). Desktop: Suchfeld rechts daneben (Breite ca. 360 px, Höhe 48 px, Radius 14 px, Platzhalter „Text oder Schwerpunkt suchen …“). Mobil: Suchfeld unter dem Titel, volle Breite, Platzhalter „Text suchen …“. `type="search"`, `aria-label="Text suchen"`, `autoComplete="off"`. Der bisherige Untertitel entfällt.
2. **Hinweise** (nur wenn vorhanden): `Notice`, Fortsetzen-Frage, Vorschläge der Wortspeicher-Brücke. Inhalt und Knöpfe wie heute, Gestaltung als Karte im neuen Stil (Radius 20 px, Rand `--line`, Fläche `--surface`).
3. **Weitermachen** (nur Desktop, nur wenn es angefangene Einheiten gibt): `<h2>` „Weitermachen“ (15 px, 700). Raster mit zwei Spalten. Je Karte: Titel (17 px, 700), Zeile „Leicht · Doppelkonsonanten“ (erster Schwerpunkt), Fortschritt aus vier Segmenten (fertige Durchgänge `--good`, aktueller `--accent`, offene `--line2`; `aria-hidden`), Text „Durchgang _n_ von 4“, Knopf „Fortsetzen“ (primär, `aria-label="${titel} fortsetzen"`). Der Knopf ruft direkt `onResume(id)` auf. Darunter eine Trennlinie.
4. **Filterleiste.**
   - **Schwierigkeit:** Beschriftung „Schwierigkeit“ (mobil „Stufe“) + Gruppe mit drei runden Knöpfen in einem Rahmen (`role="group" aria-label="Schwierigkeit"`). Jeder Knopf: `aria-label="Leicht|Mittel|Schwer"`, `aria-pressed` nur für die gewählte Stufe, sichtbarer Punkt 11 px, gefüllt bis zur gewählten Stufe. Trefferfläche mind. 44 × 44 px (Punkt klein, Knopf groß).
   - **Stand:** Beschriftung „Stand“ + Segmentgruppe „Neu | Begonnen | Gemeistert“, Mehrfachauswahl, `aria-pressed`.
   - **Schwerpunkt:** Knopf „Schwerpunkt“ bzw. „Schwerpunkt · _n_“ mit Pfeil, `aria-expanded`, `aria-controls`.
     - Desktop: Aufklappfeld unter dem Knopf. Inhalt: `<fieldset>` mit `<legend class="ui-sr-only">Schwerpunkt</legend>`, je Schwerpunkt aus `phenomenaInLibrary` ein echtes `<input type="checkbox">` mit Beschriftung und Anzahl rechts; Knopf „Fertig“. Escape und Klick außerhalb schließen; danach Fokus zurück auf den Knopf.
     - Mobil: `<dialog>` als Blatt von unten (`showModal()`), Griff oben, Überschrift „Schwerpunkt“, dieselbe Liste, Hauptknopf „_n_ Texte anzeigen“ (Zähltext wie unten) schließt.
   - **Zähler** rechts: „16 Texte“ bzw. „_x_ von 16 Texten“, `aria-live="polite"`.
   - Mobil liegt die Leiste in einer waagerecht wischbaren Zeile (`overflow-x: auto`, `scroll-snap-type: x proximity`, ohne sichtbare Leiste), Reihenfolge Stufe, Schwerpunkt, Stand. Der Zähler steht mobil unter der Chipzeile.
5. **Streifen mit aktiven Filtern.** Links ein Tier, das über eine Linie lugt (rein schmückend, `alt=""`, `aria-hidden`), dann je aktivem Filter ein Chip mit ×: `aria-label="Filter „Leicht“ entfernen"`. Desktop zusätzlich „Alle entfernen“ (Textknopf). Ohne aktive Filter bleibt der Streifen mit dem Tier stehen (Höhe reservieren, kein Springen).
   - Tier: zufällig aus `ANIMALS` (`src/domain/learner-profile.ts`, Dateiname über `animalFileName`), erst **nach** der Hydrierung gewählt (`useEffect`), damit Server- und Client-HTML gleich sind. Bei jedem Durchlauf der Animation (`onAnimationIteration`) ein neues Tier.
   - Animation `tb-peek` aus der Vorlage übernehmen (7 s, `ease-in-out`, endlos; Keyframes in der Vorlage suchen). Bei `prefers-reduced-motion: reduce` keine Animation und das Tier ruhend halb sichtbar.
   - Im Designvergleich über `hide` ausblenden (Zufall).
6. **Kartenraster.** `<ul aria-label="Texte">`. Desktop drei Spalten (bei 1080 px Inhalt), ab breiterem Inhalt `repeat(auto-fill, minmax(300px, 1fr))`. Mobil zwei Spalten, Abstand 10 px.
   - Karte = `<li>` mit `<article>`. Der ganze Kartenbereich ist klickbar über das Muster „gestreckter Knopf“: Im `<h3>` steckt ein `<button>` mit dem Titel; dessen `::after` deckt die Karte ab (`position: absolute; inset: 0`). Der zugängliche Name des Knopfs ist „_Titel_ üben“ bzw. bei angefangener Einheit „_Titel_ weiterüben“ (sichtbarer Titel + `ui-sr-only`-Zusatz, kein `aria-label`, damit die Überschrift den Titel enthält). Klick ruft `onStart(id)`.
   - Desktop-Inhalt: oben links drei Punkte + Stufe („Leicht“), oben rechts Statuspille: „Durchgang _n_ offen“ (`--accent-bg`/`--accent`), „Gemeistert“ (`--good-bg`/`--good`), „Bestwert _x_ %“ (`--surface2`/`--ink2`), „Neu“ (umrandet). Titel 19 px, 700. Darunter alle Schwerpunkte als kleine Pillen. Unten Balken des Bestwerts (`--good`, Breite = Bestwert, Hintergrund `--surface2`, `aria-hidden`) und rechts „78 %“ bzw. „–“ mit `ui-sr-only` „Bestwert: “.
   - Mobil-Inhalt (9c): Statuspille oben, Titel (16 px, 700, höchstens zwei Zeilen), unten drei Punkte + erster Schwerpunkt (eine Zeile, Auslassungspunkte). Kein Balken.
   - „Verlauf“: nur bei geübten Texten, kleiner Textknopf unten rechts in der Karte, über dem gestreckten Knopf (`position: relative; z-index: 1`), `aria-label="${titel}: Verlauf ansehen"`, ruft `onDetails(id)`. Mobil ebenfalls vorhanden (unter dem Schwerpunkt). Abweichung von der Vorlage, Funktion darf nicht fehlen.
   - Hover: Rand `--accent`, Schatten `0 6px 18px var(--shadow)`. Fokus: sichtbarer Rahmen 3 px `--accent` um die ganze Karte (`:has(:focus-visible)` oder `:focus-within`).
7. **Leer:** „Kein Text passt zu diesen Filtern.“ + Knopf „Filter zurücksetzen“ (setzt `EMPTY_TEXTBOX_FILTER`).
8. **Fuß:** Link „Laufzettel ansehen und drucken“ wie heute.

Dunkelmodus: nur Tokens verwenden (`--surface`, `--surface2`, `--line`, `--line2`, `--ink`, `--ink2`, `--accent`, `--accent-bg`, `--good`, `--good-bg`, `--bad`, `--bad-bg`, `--shadow`). Keine festen Farben.

**Tests:**

- `other-screens.test.tsx`, Abschnitt Bibliothek, anpassen und ergänzen: Bestwert und Anzahl sichtbar; Filter Stufe (zweiter Klick hebt auf), Stand (Mehrfachauswahl), Schwerpunkt (Checkboxen, Fertig, Escape), Suche nach Titel und nach Schwerpunkt; Chips entfernen einzeln und „Alle entfernen“; leerer Zustand mit „Filter zurücksetzen“; „Weitermachen“ ruft `onResume` direkt; Karte mit offener Einheit ruft `onStart` (Fortsetzen-Frage); Verlauf nur bei geübten Texten; Zähler „x von y Texten“.
- Designvergleich `9b`, `9c` auf `umgesetzt`.

Commit: „Textbox-Layout Paket C: Auswahl als Kartenraster (9b/9c)“.

### Paket D: Eingabe 9d (Desktop) und 9f (mobil)

**Gemeinsamer Rahmen.** Neue Komponente `app/views/textbox/run-layout.tsx` mit CSS-Modul `run-layout.module.css`. Alle vier Schritt-Ansichten (`MemorizeScreen`, `GapWritingScreen`, `FreeWritingScreen`, `ReviewScreen`) nutzen ihn, statt eigene Köpfe zu bauen.

```ts
type RunLayoutProps = {
  layout: "heft" | "vollbild"; // 9d/9f bzw. 9e (Paket E)
  round: 1 | 2 | 3 | 4;
  step: 0 | 1 | 2; // Merken, Schreiben, Kontrolle
  textTitle: string;
  textMeta: string; // „Leicht · Doppelkonsonanten“
  onBack: () => void; // zurück zur Auswahl
  onToggleLayout?: () => void; // nur Desktop, Paket E
  status?: ReactNode; // Timer bzw. Ergebnis-Karte
  hint: ReactNode;
  children: ReactNode; // das Papier
  footerStart?: ReactNode; // „0 von 11 Lücken ausgefüllt“
  actions: ReactNode; // Knöpfe
};
```

Die Props `title` der vier Ansichten werden durch `textTitle` + `textMeta` ersetzt; `textbox-app.tsx` reicht `onBack`, `textMeta` (Stufe + erster Schwerpunkt aus `TEXTBOX_*_LABELS`) und `layout` durch.

**Kopf (9d, ab 900 px):**

- Knopf „Auswahl“ mit Pfeil links (`back`-Icon), Höhe 48 px, Radius 14 px, Rand `--line2`, Fläche `--surface`.
- `<h1 id="textbox-title" tabIndex={-1}>Durchgang *n* von 4: *Schritt*</h1>` (24 px, 700), darunter „_Titel_ · _Stufe_ · _Schwerpunkt_“ (13,5 px, `--ink2`).
- Rechts die drei Schritte (`<ol aria-label="Ablauf eines Durchgangs">`, aktiver Schritt `aria-current="step"`): aktiv `--accent`/`--accent-ink`, erledigt `--good-bg`/`--good`, offen `--surface2`/`--ink2`; Höhe 36 px, Radius 999 px, 13 px, 700. `StepList` entsprechend erweitern (Zustand „erledigt“).

**Kopf (9f, unter 900 px):**

- Quadratischer Zurück-Knopf 44 × 44 px, `aria-label="Zurück zur Auswahl"`.
- Sichtbar groß der Texttitel (17 px, 700), klein darunter „Durchgang _n_ von 4“ (12,5 px, `--ink2`). Damit die Überschrift für Tests und Screenreader gleich bleibt, ist die `<h1>` dieselbe wie am Desktop; mobil wird sie optisch klein gesetzt und der Teil „: _Schritt_“ in einem `<span>` nur visuell versteckt (`ui-sr-only`-Technik, bleibt im zugänglichen Namen). Der Texttitel steht davor als `<p>`; Reihenfolge per Flex `column-reverse` o. Ä.
- Schritte darunter in klein (Höhe 30 px, 12 px).

**Statuszeile:**

- Merken: „Merkzeit: noch 0:45“ (14 px, 700; mobil „Noch 0:45“, 13 px) + Balken (8 px; mobil 6 px; `--accent` auf `--surface2`). `role="timer"` und `ProgressBar` mit Beschriftung „Verbleibende Merkzeit“ bleiben (ggf. `ProgressBar` mit Klasse für Höhe/Farbe).
- Kontrolle Desktop: Karte (Radius 20 px, Rand `--line`, Fläche `--surface`, Innenabstand 18 × 22 px) mit „6 von 11“ (Fredoka 34 px), „Lücken richtig geschrieben“ bzw. „Wörtern richtig geschrieben“ (14 px, `--ink2`), Balken (`--good`) und „55 %“ (Fredoka 18 px, `--good`). Zusätzliche Wörter: „, _n_ zusätzlich geschrieben“ an den Untertext anhängen.
- Kontrolle mobil: „55 %“ (Fredoka 30 px, `--good`) + „6 von 11 Lücken richtig geschrieben“ (13 px).

**Hinweistexte** (15 px, Zeilenhöhe 1,55, `--ink2`, max. 70 ch; mobil 14 px):

- Merken, Durchgang 1: „Die markierten Wörter fehlen gleich. Präge dir ihre Schreibweise besonders gut ein.“
- Merken, sonst: „Lies den Text in Ruhe und präge dir die Schreibweise ein.“
- Schreiben 1–3: „Schreibe die fehlenden Wörter in die Lücken. Mit der Leertaste oder der Eingabetaste springst du zur nächsten Lücke.“
- Schreiben 4: „Schreibe den ganzen Text aus dem Gedächtnis auf. Wenn du nicht weiterkommst, kannst du jederzeit auf „Prüfen“ drücken.“
- Kontrolle: „Grün ist richtig. Durchgestrichen ist deine Schreibweise, daneben steht das richtige Wort.“
- Satzzeichen-Hinweis der Kontrolle bleibt unter dem Papier, wie heute.

**Papier („Heft“):**

- Rahmen: Rand 1 px `--line`, Radius 20 px (mobil 16 px), Fläche `--surface`, `overflow: hidden`, Schatten `0 2px 0 var(--line)`.
- Linien als Hintergrund, über Custom Properties, damit Desktop und mobil dieselbe Regel nutzen:

  ```css
  .lined {
    --lh: 44px;
    --rule-at: 35px;
    --pad-top: 22px; /* mobil: 40px, 31px, 16px */
    font-size: 21px;
    line-height: var(--lh); /* mobil: 19px */
    padding: var(--pad-top) 40px 30px; /* mobil: 16px 18px 22px */
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent var(--rule-at),
      var(--line) var(--rule-at),
      var(--line) calc(var(--rule-at) + 1px),
      transparent calc(var(--rule-at) + 1px),
      transparent var(--lh)
    );
    background-position: 0 var(--pad-top);
  }
  ```

- **Wörter zusammenhalten:** `TextFlow` so erweitern, dass ein Wort mit den direkt folgenden Satzzeichen (ohne Leerraum davor) in einem `<span class="nowrap">` steht. So bricht kein Punkt allein um. Bestehende Tests von `TextFlow`-Nutzern bleiben grün.
- **Markierung (Merken, Durchgang 1):** `<mark>` mit Innenabstand 2 × 3 px, Außenabstand 0 −3 px, Radius 5 px, Fläche `--accent-bg`, Unterstrich als `box-shadow: inset 0 -3px 0 var(--gold)`, Schrift normal (nicht fett). `ui-sr-only` „(fehlt gleich)“ bleibt. `other-screens.test.tsx` prüft „Farbe und Unterstreichung“: Test an die neue Technik anpassen (Klasse/Element statt `text-decoration`).
- **Lücken (9d):** `display: inline-block`, Höhe 32 px, Zeilenhöhe 32 px, Innenabstand 0 5 px, Außenabstand 0 2 px, kein Rand außer unten 2,5 px `--accent`, Radius 6 6 0 0, Fläche `--accent-bg`, Schrift wie Text, 600. Fokus: `box-shadow: 0 0 0 2px var(--accent)` **plus** `outline: 2px solid transparent` (Windows-Kontrastmodus). Mobil (9f): Höhe 30 px, Zeilenhöhe 30 px, Innenabstand 0 4 px, Radius 5 5 0 0. `scroll-margin` so setzen, dass die fokussierte Lücke nicht unter der Aktionsleiste (9f) liegt: `scroll-margin-block: 40vh 120px`.
- **Freies Schreiben (Durchgang 4):** `<textarea>` direkt im Papier, ohne eigenen Rand; Mindesthöhe 460 px (mobil 440 px); Innenabstand 22 40 22 70 px (mobil 16 16 16 44 px); Schrift 21/44 px (mobil 19/40 px); Hintergrund: rote Randlinie bei 50 px (mobil 30 px, 1,5 px breit, Farbe neues Token `--margin-rule`, hell `oklch(0.7 0.12 25 / .5)`, dunkel passend prüfen) + dieselben Linien; `background-attachment: local`, damit die Linien mitscrollen; `resize: vertical` (mobil `none`). Da das Feld keinen Rahmen hat, bekommt das **Papier** den Fokusrahmen: `.paper:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }`.
- **Kontrolle im Papier:** gleiche Linien. Wörter:
  - richtig in Durchgang 1–3: Kästchen 3 × 6 px, Radius 6 px, 700, `--good-bg`/`--good`. In Durchgang 4 bleiben richtige Wörter schlicht, ohne Kästchen (wie in der Vorlage).
  - falsch / fast richtig: `<s>` mit eigener Schreibweise (`--bad`, Strich 2 px, Abstand rechts 6 px), dann richtiges Wort im grünen Kästchen.
  - Groß/klein: `<s>` wie falsch, dann Wort im Kästchen mit `--accent-bg`/`--accent` und `inset 0 0 0 1.5px var(--accent)`.
  - fehlt: Wort im Kästchen mit `--bad-bg`, Schrift `--ink`, `inset 0 0 0 1.5px var(--bad)`.
  - zusätzlich: nur `<s>` mit dem getippten Wort.
  - Durchgang 1–3: `TextFlow` über das Original wie heute. Durchgang 4: `reviewSequence` aus Paket B als Fließtext.
  - Symbole (✓ ✗ Aa – +), sichtbare Art-Beschriftung und die Legende entfallen. `ui-sr-only`-Präfixe bleiben. Test „zeigt Fehlerarten mit Text und Symbol …“ umschreiben: prüft jetzt Präfixe, `<s>` und die Kästchen-Klassen; Test „listet in Durchgang 4 alle Wörter …“ prüft den Fließtext.

**Aktionsleiste:**

- 9d: Zeile unter dem Papier. Links „_x_ von _n_ Lücken ausgefüllt“ (nur Schreiben 1–3; 14 px, 600, `--ink2`; kein Live-Bereich). Rechts die Knöpfe, Höhe 52 px, Radius 16 px, 15 px, 700:
  - Merken: „Ich bin bereit“ (primär)
  - Schreiben: „Prüfen“ (primär, behält `ref` für den Fokus nach der letzten Lücke)
  - Kontrolle: „Durchgang wiederholen“ (sekundär: Rand `--line2`, Fläche `--surface`) + „Weiter zu Durchgang _n+1_“ bzw. in Durchgang 4 „Ergebnis ansehen“ (primär)
- 9f: Leiste klebt unten (`position: sticky; bottom: 0`), Rand oben `--line`, Fläche `--surface`, Innenabstand `12px 16px calc(24px + env(safe-area-inset-bottom))`. Knöpfe volle Breite, 54 px, Radius 16 px, 16 px. Zähler darüber mittig (13 px). Kontrolle: Hauptknopf oben, „Durchgang wiederholen“ darunter (48 px, Radius 14 px). Der Inhalt darüber scrollt normal; keine eigene Scrollfläche, damit die Bildschirmtastatur nichts verdeckt.

**Navigation mobil ausblenden (9f):**

- `app/ui/shell/fullscreen.ts`: Kontext auf Modi umstellen: `(mode: false | "all" | "mobile") => void`. `useFullscreenFrame(active = true, mode: "all" | "mobile" = "all")`. `live-game.tsx` bleibt bei `"all"`.
- `app/ui/shell/area-frame.tsx` reicht den Modus an `StudentShell`/`StudentFrame` weiter (`hideNav?: boolean | "mobile"`). Bei `"mobile"` setzt `StudentFrame` eine Klasse, die unter 900 px (gleiche Container-Abfrage wie heute) Tab-Leiste, mobile Kopfzeile, unteren Innenabstand von `.main` und den Seitenfuß ausblendet; ab 900 px bleibt alles wie gewohnt. Das `hidden`-Attribut der `<nav>` nur bei `true` setzen.
- `TextboxApp` ruft `useFullscreenFrame(run !== null, layout === "vollbild" ? "all" : "mobile")` auf. In der Auswahl ist die Navigation immer da.
- Test in `app/ui/shell/` bzw. `student-frame` ergänzen: Modus `"mobile"` setzt die Klasse und lässt `<nav>` im Baum.

**Steuerung in `textbox-app.tsx`:**

- `onBack` = `backToLibrary()`.
- `onRepeat`: `repeatRound(state)`; `memorizeStartedAt = Date.now()`; speichern: Sind danach noch Ergebnisse übrig, `saveRound(sessionFromRun(...))` (überschreibt die gespeicherte Einheit mit weniger Durchgängen). Ist `rounds` leer (Wiederholen in Durchgang 1), `discard(state.trainingId)`, damit die Auswahl nicht „Durchgang 2 offen“ zeigt. Fehler → `SAVE_ISSUE`, Übung läuft weiter. `refresh()` ist nicht nötig, das passiert beim Verlassen.
- `ReviewScreen` bekommt `onRepeat`.
- Fokus nach Wiederholen: wie bei jedem Ansichtswechsel auf `#textbox-title` (der bestehende Effekt hängt an `phase`, `round` – Phasenwechsel `review → memorize` reicht).

**Tests:**

- `gap-writing-screen.test.tsx` und `other-screens.test.tsx` an die neuen Props anpassen (`textTitle`, `textMeta`, `onBack`, `onRepeat`, `layout`). Alle bestehenden Verhaltensfälle bleiben inhaltlich gleich.
- Neu: „Auswahl“ ruft `onBack`; Kontrolle zeigt „Durchgang wiederholen“ und ruft `onRepeat`; Zähler „1 von 3 Lücken ausgefüllt“ nach einer Eingabe; Schritte zeigen erledigte Schritte; mobil hat der Zurück-Knopf den Namen „Zurück zur Auswahl“.
- `textbox-app` (falls es einen Test gibt, sonst neu mit `repository`-Attrappe): Wiederholen in Durchgang 1 verwirft die gespeicherte Einheit; in Durchgang 2 speichert es die Einheit mit einem Ergebnis.
- Designvergleich `9d`, `9d-gaps`, `9d-check`, `9d-free`, `9d-free-check`, `9f`, `9f-gaps`, `9f-check` auf `umgesetzt`.

Commit: „Textbox-Layout Paket D: Heft mit Linien (9d/9f), Durchgang wiederholen, Navigation mobil ausgeblendet“.

### Paket E: Ruhiger Vollbildmodus 9e

- `RunLayout` mit `layout="vollbild"` (nur ab 900 px wirksam; darunter gilt immer die Heft-Darstellung 9f, auch wenn `vollbild` gespeichert ist):
  - **Kopfleiste** über die ganze Breite: Innenabstand 16 × 28 px, Rand unten `--line`. Links Schließen-Knopf 48 × 48 px mit ×-Icon (`close`), `aria-label="Zurück zur Auswahl"`. Daneben Titel (16 px, 700) und „Durchgang _n_ von 4“ (13 px, `--ink2`). Rechts die Schritte und davor der Umschalter „Vollbild beenden“.
  - **Inhalt** mittig, max. 860 px, Innenabstand oben 40 px. `<h1>` „Durchgang _n_ von 4: _Schritt_“ 30 px. Hinweis 16 px, max. 64 ch.
  - Merken: „0:45“ (Fredoka 26 px) + Balken 6 px.
  - Kontrolle: „55 %“ (Fredoka 44 px, `--good`) + „6 von 11 Lücken richtig geschrieben“ (15 px).
  - **Text ohne Papier und ohne Linien**, 23 px, Zeilenhöhe 52 px.
  - **Lücken als Kästchen:** Höhe 40 px, Zeilenhöhe 40 px, Innenabstand 0 7 px, Rand 2 px `--line2`, Radius 10 px, Fläche `--surface`, 600. Fokus: Rand `--accent`, Fläche `--accent-bg`, zusätzlich `outline: 2px solid transparent`.
  - Kontroll-Kästchen 4 × 7 px, Radius 8 px.
  - **Freies Schreiben:** eigenständiges Blatt: Rand 1 px `--line`, Radius 6 px, Fläche `--surface`, Mindesthöhe 500 px, Innenabstand 26 36 26 76 px, Schrift 22/48 px, Randlinie bei 54 px, Linien `--rule-at` 39 px / `--lh` 48 px, Hintergrundposition `0 26px`, Schatten als Papierstapel `0 1px 0 var(--line), 0 4px 0 -1px var(--surface), 0 5px 0 -1px var(--line)`.
  - **Fußleiste** klebt unten über die ganze Breite: Innenabstand 16 × 28 px, Rand oben `--line`, Fläche `--surface`; links Zähler, rechts Knöpfe (52 px, Radius 16 px).
  - Navigation ganz aus (`useFullscreenFrame(..., "all")`).
- Umschalter im 9d-Kopf: `IconButton` bzw. kleiner Textknopf „Vollbild“ zwischen Titelblock und Schritten, nur ab 900 px sichtbar. In 9e „Vollbild beenden“. `aria-pressed` am Umschalter.
- Merken der Wahl: kleiner Hook `app/components/use-textbox-layout.ts` nach dem Muster von `app/views/tastenwelt/keyboard-settings.ts`: Lesen erst nach der Hydrierung, jeder Zugriff in `try/catch`, Standard `heft`.
- Der Fokus bleibt beim Umschalten auf dem Umschalter (bzw. auf dem Gegenstück im neuen Layout); in der Schreibphase bleiben die Eingaben erhalten (Umschalten darf `GapWritingScreen` nicht neu mounten: `layout` nur als Prop/Klasse, kein anderer `key`).

**Tests:** Umschalten behält eingegebene Lücken; Wahl wird gespeichert und nach Neuladen übernommen (Unit-Test des Hooks mit `localStorage`-Attrappe); Designvergleich `9e-gaps`, `9e-free` auf `umgesetzt`.

Commit: „Textbox-Layout Paket E: ruhiger Vollbildmodus (9e)“.

### Paket F: Browser-Tests, Barrierefreiheit, Dokumentation

1. `e2e/textbox.spec.ts` anpassen und ergänzen (Projekte `desktop-chromium`, `mobile-chrome`, `minimum-width`):
   - bestehender Durchlauf über vier Durchgänge bleibt grün (Namen siehe Abschnitt 2);
   - Filter: Stufe wählen, Schwerpunkt-Checkbox, Chip entfernen, Suche;
   - „Weitermachen“ (Desktop) setzt eine angefangene Übung fort;
   - „Durchgang wiederholen“ in Durchgang 2 → wieder „Durchgang 2 von 4: Merken“, nach Neuladen zeigt die Karte „Durchgang 2 offen“;
   - mobil: während der Übung ist die Tab-Leiste weg, in der Auswahl wieder da; Aktionsleiste sichtbar, fokussierte Lücke nicht verdeckt (Bounding-Box-Vergleich);
   - Desktop: Vollbild ein/aus, Seitenleiste verschwindet/erscheint, Wahl bleibt nach Neuladen;
   - kleinste Breite (`minimum-width`): kein waagerechtes Scrollen der Seite (die Chipzeile scrollt in sich).
2. Axe-Prüfung (`@axe-core/playwright`, wie in `e2e/platform-quality.spec.ts`) für Auswahl (hell/dunkel, offenes Schwerpunkt-Feld), Merken, Lücken, Kontrolle, Durchgang 4, Vollbild. Keine Verstöße, insbesondere `color-contrast` im Dunkelmodus (Pillen, Balkenwerte, rote Randlinie ist Schmuck).
3. Tippflächen ≥ 44 × 44 px: Punkte der Stufe, ×-Knöpfe der Chips, Zurück-/Schließen-Knöpfe, „Verlauf“.
4. Dokumentation:
   - `docs/umsetzungsplan-lernraum-ui-v2.md`, Abschnitt „Bewusste Abweichungen“: Punkte 3, 7, 8, 9 (Kontrolle ohne Legende), Tier im Filterstreifen im Vergleich ausgeblendet, 9a nicht gebaut.
   - `docs/inhalte/textbox.md`: Ablauf um „Durchgang wiederholen“ ergänzen; „Gemeistert ab 90 %“.
   - Entscheidungsprotokoll im Vault (`obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`): neue Entscheidung „Textbox: Heft-Layout, Vollbild auf Wunsch, Durchgang wiederholen“ mit nächster freier Nummer.
   - Diesen Plan unten unter „Fortschritt“ abhaken.

**Vor dem Push** (laut `AGENTS.md` proportional, aber vollständig für UI): `npm run format:check`, `npm run lint`, `npm run typecheck`, `npx vitest run` (mindestens `src/domain/textbox*`, `src/domain/text-compare*`, `app/views/textbox`, `app/ui/shell`), `npm run build`, `npm run test:render`, `npm run test:e2e:chromium -- e2e/textbox.spec.ts`, `npm run test:design`. Die volle Cross-Browser-Suite läuft in GitHub; den Status nicht wiederholt abfragen.

Commit: „Textbox-Layout Paket F: Browser- und Barrierefreiheitstests, Dokumentation“.

## 4. Reihenfolge und Abhängigkeiten

A → B → C → D → E → F. C und D hängen beide nur an A und B; D vor E, weil E den Rahmen aus D erweitert. Nach jedem Paket committen und pushen auf `claude/lernraum-ui-v2`.

## 5. Stolperstellen

- **Hydrierung:** Zufallstier und gespeicherte Layout-Wahl erst in `useEffect` setzen, sonst weichen Server- und Client-HTML ab (`npm run test:render` prüft das gerenderte HTML).
- **CSS-Modul-Typen:** Nach jeder neuen Klasse `npm run css-types`; `npm run typecheck` schlägt sonst fehl.
- **`<button>` darf keine Überschrift enthalten**, deshalb das Muster „Überschrift enthält gestreckten Knopf“ (Paket C, 6).
- **Lücken-Fokus mit Bildschirmtastatur:** `scrollIntoView({ block: "center" })` bleibt; zusammen mit der klebenden Aktionsleiste auf einem echten iPhone/Android prüfen (Plan-Schritt 13 aus `umsetzungsplan-textbox.md`, Hoch- und Querformat).
- **`background-attachment: local`** ist nötig, damit die Heftlinien im scrollenden Textfeld mitlaufen.
- **Zeilenraster:** Lücken (`inline-block`) dürfen die Zeilenhöhe nicht vergrößern; `vertical-align: baseline` und Höhe < Zeilenhöhe. Mit langen Wörtern in Durchgang 1 testen (Lücke breiter als Zeile → `max-width: 100%`).
- **Dunkelmodus:** Pillen „Durchgang _n_ offen“ (`--accent-bg`/`--accent`) und die rote Randlinie auf Kontrast prüfen.

## 6. Fortschritt

- [x] Paket A: Vorlage, Referenzzustände, Beispieldaten (Katalog-Zuordnung kommt mit den Ansichten in C–E)
- [x] Paket B: `repeatRound`, Stand, Filter, Fließtext der Kontrolle
- [x] Paket C: Auswahl 9b/9c
- [x] Paket D: Heft 9d/9f, Durchgang wiederholen, Navigation mobil
- [x] Paket E: Vollbild 9e
- [x] Paket F: Browser-/Axe-Tests, Dokumentation
