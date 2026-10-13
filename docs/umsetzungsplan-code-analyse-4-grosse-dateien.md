# Teilplan 4: Große Dateien zerlegen

Stand: 13.10.2026 · Übersicht: [umsetzungsplan-code-analyse.md](umsetzungsplan-code-analyse.md) ·
Branches: je Stufe `claude/code-analyse-4<buchstabe>-<stichwort>`, z. B.
`claude/code-analyse-4a-effect-events`

## Befund

| Datei                                               | Zeilen | Art                                         |
| --------------------------------------------------- | ------ | ------------------------------------------- |
| `app/lehrer/live/use-teacher-live-room.tsx`         | 1.910  | ein Hook, ca. 65 `useState`, 15 `useEffect` |
| `app/views/lernbox/lernbox-screen.tsx`              | 1.829  | reine Ansicht, ~25 Unterkomponenten         |
| `app/views/laufdiktat/teacher-dictation-screen.tsx` | 1.275  | reine Ansicht, ~15 Unterkomponenten         |

Dazu fünf `react-hooks/exhaustive-deps`-Unterdrückungen ohne `--`-Beschreibung: drei in
`use-teacher-live-room.tsx` (ca. Zeilen 979, 1225, 1235), je eine in `app/ui/cloud-badge.tsx`
(ca. Zeile 59) und `app/raum/spiel/live-game.tsx` (ca. Zeile 426). Außerdem haben drei
`react-hooks/set-state-in-effect`-Unterdrückungen keine `--`-Beschreibung:
`app/components/use-textbox-layout.ts`, `app/views/textbox/library-screen.tsx`,
`app/views/tastenwelt/keyboard-settings.ts`. Alle übrigen `eslint-disable`-Kommentare haben eine.

## Grundsätze (verbindlich)

- **Verhalten bleibt gleich.** Reines Umstrukturieren. Keine Texte, Abläufe oder Stile ändern.
- **Öffentliche Schnittstellen bleiben:** `useTeacherLiveRoom` liefert weiter
  `[model, refs]` mit denselben Feldern (`TeacherLiveModel`, `TeacherLiveRefs`).
  `TeacherDictationScreen`, `MODES` und `LernBoxScreen` bleiben unter ihren bisherigen Pfaden
  importierbar (`app/views/lehrer/lehrer-views.test.tsx` importiert `MODES` aus
  `teacher-dictation-screen`).
- **Bestehende Tests nicht anpassen**, außer an Importpfaden. Wenn ein Test inhaltlich geändert
  werden müsste, ist das ein Zeichen für eine Verhaltensänderung: anhalten und Ursache suchen.
- **Sicherheitsnetz je Stufe:** Unit-Tests der betroffenen Ordner, dann
  `npx playwright test --project=desktop-chromium --project=mobile-chrome` für
  `e2e/laufdiktat-pilot.spec.ts`, `e2e/platform-quality.spec.ts`, `e2e/practice-illustrations.spec.ts`,
  dazu `npm run test:e2e:live` (Lehrkraft-Raum) bei 4a–4c und `npm run test:design`
  (Pixelvergleich) bei 4d und 4e.
- **Eine Stufe = ein Pull Request.** Kleine Commits innerhalb der Stufe (je herausgelöster Teil).

## Stufe 4a: Effekt-Ereignisse statt Unterdrückungen

React 19.3 und `eslint-plugin-react-hooks` 7.1.1 unterstützen `useEffectEvent`. Genau dafür sind
die bisherigen Unterdrückungen da („die Funktion liest nur den Stand dieses Renderns“).

1. Für jede der fünf Stellen: Die im Effekt aufgerufenen Funktionen, die nicht in den
   Abhängigkeiten stehen sollen, in `useEffectEvent` einwickeln (z. B.
   `const onRoomClosed = useEffectEvent(finishClosedRoom)`), im Effekt nur noch das Ereignis
   aufrufen, die Unterdrückung entfernen. Die Abhängigkeitsliste danach so lassen, wie die Regel
   sie verlangt; wenn die Regel zusätzliche Abhängigkeiten fordert, prüfen, ob der Effekt dadurch
   öfter läuft. Wenn ja, nicht einfach ergänzen, sondern den Effekt so umbauen, dass er nur auf
   die gewollten Auslöser reagiert.
2. Sonderfall Zeile ~1235 (`startRequested`): Der Effekt ruft `openLobby()` auf. Prüfen, ob das
   statt eines Effekts direkt im auslösenden Ereignis passieren kann (siehe „You might not need an
   effect“ in der React-Doku). Nur umbauen, wenn das Verhalten nachweislich gleich bleibt.
3. Dev-Abhängigkeit `@eslint-community/eslint-plugin-eslint-comments` aufnehmen (exakt gepinnt)
   und in `eslint.config.mjs` die Regel `@eslint-community/eslint-comments/require-description`
   als `error` aktivieren, außerdem `linterOptions.reportUnusedDisableDirectives: "error"`.
   Die drei `set-state-in-effect`-Stellen aus dem Befund bekommen eine kurze `--`-Beschreibung,
   warum der Zustand im Effekt gesetzt wird (oder werden, wenn möglich, ohne Effekt gelöst).

## Stufe 4b: Reine Logik aus dem Live-Raum-Hook herauslösen

Ziel: Alles, was kein React braucht, in eigene Module mit eigenen Unit-Tests.

Kandidaten (Funktionsnamen im Hook):

- Textabschnitte und Markierungsmodus: `tokenizeMarkerText`, die Berechnungen hinter
  `textSections`, `orderedTextSections`, `displayedTextSections`, `markerPieces`.
- Mathe-Aufgaben: `defaultMathGapIndex`, die Berechnung hinter `mathLines` und `mathWords`,
  `generateSingleMathLine`, das Einfügen an der Cursorposition aus `insertAtMathCursor`.
- Raumkonfiguration: die Berechnung hinter `roomConfig` (Spieloptionen → Raumeinstellungen).
- CSV-Export: die Datenaufbereitung aus `exportCsv` (der Download selbst bleibt im Hook).
- Teilnehmeranzeige: `labelFor`, `animalFor`, `statusFor` als Funktionen mit `participants` als
  Parameter.

Ablage: fachliche Regeln ohne Browser in `src/domain/` (vorher prüfen, ob es dort schon passende
Module gibt, z. B. für Textaufteilung oder Mathe-Aufgaben, und dort ergänzen statt zu
duplizieren); oberflächennahe Hilfen in `app/lehrer/live/lib/`. Jede herausgelöste Funktion
bekommt Unit-Tests. Der Hook ruft die Funktionen in `useMemo` auf.

## Stufe 4c: Live-Raum-Hook in Teil-Hooks und Ablauf-Reducer aufteilen

1. **Ablauf als Reducer** (`app/lehrer/live/teacher-live-flow.ts`, rein, mit Tests):
   Zustand `stage` (`"content" | "settings" | "lobby" | "live"`) plus die Flags, die den Ablauf
   steuern (`startRequested`, `restoreChecked`, `roomClosed`, `busy`). Aktionen für
   `goBack`, `goForward`, `jumpToStage`, „Lobby geöffnet“, „Sitzung gestartet“, „Raum beendet“,
   „Raum geschlossen“, „Wiederherstellung geprüft“. Ungültige Übergänge (z. B. `live` ohne Raum)
   lassen den Zustand unverändert; dafür Tests schreiben. Die bisherigen Regeln für die Übergänge
   aus `goBack`, `goForward` und `jumpToStage` genau übernehmen.
2. **Teil-Hooks** im Ordner `app/lehrer/live/hooks/`, je eine Datei:
   - `use-text-content.ts`: `sources`, `splitConfig`, `manualRanges`, `excludedSectionIds`,
     `sectionOrder`, `customDelimiter`, Markierungsmodus und die zugehörigen Aktionen.
   - `use-math-content.ts`: alle `math*`-Zustände und Aktionen.
   - `use-vocabulary-content.ts`: `vocabularyPairs`, Sprachen, Groß-/Kleinschreibung,
     Tabelleneingabe, Übernahme in die LernBox, Tags.
   - `use-game-settings.ts`: die rund 25 Spieloptionen (`gameMode`, `shuffleWords`, …,
     `mathTables`) als **ein** Objekt mit `useReducer` statt einzelner `useState`. Nach außen
     weiterhin dieselben Felder und Setter, damit `TeacherLiveModel` gleich bleibt.
   - `use-live-class-choice.ts`: Klassenliste, Auswahl, Klassenstempel.
   - `use-live-room-session.ts`: `room`, Teilnehmer, Schüler, Abfrage-Intervall (`refresh`),
     Uhr (`nowMs`, `ROOM_CLOCK_INTERVAL_MS`), Zeitstatus, Schließen und Aufräumen.
   - `use-content-restore.ts`: Laden aus der Ablage und aus URL-Parametern
     (`applyLoadedContent`, der Wiederherstellungs-Effekt).
3. `use-teacher-live-room.tsx` setzt die Teil-Hooks zusammen und baut das Modell. Zielgröße unter
   500 Zeilen. Teil-Hooks dürfen sich gegenseitig nur über Parameter kennen, nicht über
   gegenseitige Importe.
4. Reihenfolge: zuerst die Teil-Hooks mit wenig Abhängigkeiten (Spieloptionen, Mathe,
   Vokabeln, Text), dann Klasse, zuletzt Raum-Sitzung, Wiederherstellung und Ablauf. Nach jedem
   Teil-Hook die Tests in `app/lehrer/live/` laufen lassen und committen.

## Stufe 4d: `teacher-dictation-screen.tsx` in Dateien aufteilen

Ordner `app/views/laufdiktat/teacher-dictation/`:

- `import-step.tsx` (`ImportStep`, `KindChips`, `PLACEHOLDERS`), `library-bar.tsx`
  (`LibraryBar`, `NEW_CLASS`), `settings-step.tsx` (`SettingsStep`, `ModeButtons`,
  `ModeDetails`, `optionList`), `lobby-step.tsx` (`LobbyStep`, `RoomCard`), `live-step.tsx`
  (`LiveStep`, `LiveStat`, `StatusChip`), `qr-overlay.tsx`, `constants.ts` (`STEPS`, `KINDS`,
  `SPLITS`, `MODES`), `types.ts` (Props-Typen).
- Alle Dateien importieren dasselbe CSS-Modul `../teacher-dictation-screen.module.css`
  (nicht aufteilen, damit sich keine Klassennamen ändern).
- `teacher-dictation-screen.tsx` behält `TeacherDictationScreen` und re-exportiert `MODES` sowie
  die bisher exportierten Typen.

## Stufe 4e: `lernbox-screen.tsx` in Dateien aufteilen

Ordner `app/views/lernbox/parts/`:

- `home.tsx` (`Home`, `EditButton`, `PlusMenu`, `CodeIcon`), `box-chart.tsx` (`BoxChart`,
  `BoxBar`, `BOX_COLORS`), `deck-grid.tsx` (`DeckGrid`, `DeckChips`), `sheets.tsx` (`Sheets`,
  `Modal`), je eine Datei für `StartSheet`, `NewDeck`/`DeckSheet`, `ManualSheet`, `ImportSheet`,
  `CodeSheet`, dann `edit.tsx` (`Edit`, `COLUMNS`), `card-row.tsx`, `manage.tsx`, `study.tsx`
  (`Study`, `Feedback`), `format.ts` (`plural`, `groupCode`), `types.ts` (Props-Typen aus dem
  Kopf der Datei).
- Ein gemeinsames CSS-Modul wie in 4d.
- `lernbox-screen.tsx` behält `LernBoxScreen` und alle bisherigen Exporte.

## Stufe 4f: Wachstum begrenzen

In `eslint.config.mjs` für `app/**/*.{ts,tsx}` ohne Testdateien:
`"max-lines": ["error", { max: 1000, skipBlankLines: true, skipComments: true }]`.
Nach 4c–4e liegt keine Datei mehr darüber (größte danach etwa `app/raum/spiel/live-game.tsx`
mit rund 970 Zeilen; die Grenze zählt Leer- und Kommentarzeilen nicht mit). Wenn doch, die Grenze nicht
anheben, sondern die Datei in dieser Stufe aufteilen.

## Fertig, wenn

- Keine Datei unter `app/` über 1.000 Zeilen, `use-teacher-live-room.tsx` unter 500.
- Keine `exhaustive-deps`-Unterdrückung mehr; jede verbliebene `eslint-disable`-Zeile hat eine
  Beschreibung, und ESLint erzwingt das.
- Ablauf-Reducer und herausgelöste Logik haben eigene Unit-Tests; alle bestehenden Tests,
  Live-Tests und der Pixelvergleich laufen unverändert.
- `README.md`, Abschnitt „Oberfläche“: Der Satz zum Lehrkraft-Laufdiktat beschreibt die neue
  Aufteilung (Ablauf-Reducer plus Teil-Hooks in `app/lehrer/live/hooks/`).
