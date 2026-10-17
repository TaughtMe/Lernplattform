# Umsetzungsplan: Befunde der Code-Analyse beheben (Übersicht)

Stand: 13.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `31457bc`

Diese Datei ist der Einstieg für einen KI-Agenten. Die Code-Analyse vom Oktober 2026 hat sechs
Schwächen benannt. Sie sind in fünf Teilpläne aufgeteilt, die nacheinander und je in einem
eigenen Pull Request umgesetzt werden. Jeder Teilplan ist für sich vollständig; lies vor dem
Start nur diese Übersicht und den Teilplan, an dem du arbeitest.

## Reihenfolge

| Nr. | Teilplan                                                                                 | Befund der Analyse                             | Aufwand | Risiko |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- | ------- | ------ |
| 1   | [Schnelle Korrekturen](umsetzungsplan-code-analyse-1-schnelle-korrekturen.md)            | Doku ↔ Code, Demo-Route, Abdeckung             | klein   | gering |
| 2   | [LernBox: Boxstand aus Ereignissen](umsetzungsplan-code-analyse-2-lernbox-ereignisse.md) | Zwei Wahrheiten in der LernBox                 | mittel  | mittel |
| 3   | [Abhängigkeiten und SR-001](umsetzungsplan-code-analyse-3-abhaengigkeiten.md)            | Plattformrisiko vinext, offene Audit-Meldungen | klein   | mittel |
| 4   | [Große Dateien zerlegen](umsetzungsplan-code-analyse-4-grosse-dateien.md)                | 1.910-Zeilen-Hook, große Ansichten             | groß    | mittel |
| 5   | [Oberflächenschichten](umsetzungsplan-code-analyse-5-oberflaechenschichten.md)           | `app/components` neben `app/views`             | klein   | gering |

Teilplan 1 zuerst: Er ist klein und schärft die Messlatte (Abdeckung), die die späteren Umbauten
absichert. Teilplan 4 hat mehrere Stufen und darf über mehrere Pull Requests gehen.

## Arbeitsweise für alle Teilpläne

- **Branch:** je Teilplan ein eigener Branch, abgezweigt vom aktuellen Stand von
  `claude/lernraum-ui-v2`, Name `claude/code-analyse-<nr>-<stichwort>` (z. B.
  `claude/code-analyse-1-schnelle-korrekturen`). Übernahme per Pull Request nach
  `claude/lernraum-ui-v2`. Nicht direkt auf `claude/lernraum-ui-v2` oder `main` pushen.
- **Regeln:** `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md`. Sprache in
  Code-Kommentaren, Doku und Commit-Nachrichten ist Deutsch, wie im übrigen Repository.
- **Vorbereitung:** Vor der ersten Prüfung `npm ci` ausführen, damit die Werkzeugversionen aus
  `package-lock.json` gelten (eine abweichende Prettier-Version meldet sonst Dutzende Dateien).
  Passt das installierte Chromium nicht zur Playwright-Version, über eine lokale, nicht
  committete Config mit `executablePath: "/opt/pw-browsers/chromium"` starten; nicht
  `playwright install` ausführen.
- **Prüfungen vor jedem Push:** `npm run check` vollständig (Formatierung, Lint, Typen,
  Abdeckung, Datenbankvertrag, Build und Render-Test). Danach `public/sw.js` und
  `public/version.json` zurücksetzen, falls der Build sie verändert hat. Bei Änderungen an Oberfläche oder Routen zusätzlich
  die im Teilplan genannten Playwright-Tests (Projekte `desktop-chromium` und `mobile-chrome`).
  Die volle Cross-Browser-Suite läuft in GitHub; deren Status nach dem Push nicht wiederholt
  abfragen (siehe `AGENTS.md`).
- **Keine neuen Laufzeitabhängigkeiten.** Keine Änderung an Supabase-Migrationen.
- **Verhalten bleibt gleich**, wenn der Teilplan nichts anderes sagt. Bestehende Tests werden
  nicht abgeschwächt, übersprungen oder gelöscht, nur um grün zu werden.
- **Entscheidungsprotokoll:** Das Protokoll liegt im Obsidian-Vault, der nicht im Repository ist.
  Wo ein Teilplan eine neue Entscheidung verlangt, formulierst du den Eintrag in der
  PR-Beschreibung unter „Für den Vault“. Die Lehrkraft überträgt ihn von Hand.
- **Unklarheiten:** Wenn der Code vom Plan abweicht (Zeilennummern, Dateinamen), folge dem Sinn
  des Plans. Wenn eine Entscheidung nötig ist, die der Plan nicht trifft, halte an und frage nach,
  statt selbst eine fachliche Regel festzulegen.
- **Abschluss:** Am Ende des Teilplans den Status in der Tabelle unten aktualisieren (im selben
  Pull Request und im selben Commit wie die Änderung, nicht als eigener Push: jeder Push startet
  einen vollen Prüflauf). Die PR-Nummer ist vor dem Öffnen unbekannt; dann „PR folgt“ eintragen
  und den Link beim nächsten ohnehin nötigen Push nachtragen.
- **GitHub-Prüfungen:** `code-quality`, `browser-quality` (je Browser ein paralleler Job) und
  `design-quality`. Bei reinen Doku-Änderungen entfallen Browser- und Designtests.

## Status

| Nr. | Status   | Pull Request                                                                                                                                                                                                                                                                                                                       | Bemerkung                                                                                                                                                                                                                                                                          |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | erledigt | [#10](https://github.com/TaughtMe/Lernplattform/pull/10)                                                                                                                                                                                                                                                                           | Crypto wurde schon gemessen (Vitest `skipFull`); Demo-Klasse nur mit Vorschau                                                                                                                                                                                                      |
| 2   | erledigt | [#9](https://github.com/TaughtMe/Lernplattform/pull/9)                                                                                                                                                                                                                                                                             | `replayLearningBoxCard` und Eigenschaftstest; Regel 3 ergänzt                                                                                                                                                                                                                      |
| 3   | erledigt | [#12](https://github.com/TaughtMe/Lernplattform/pull/12)                                                                                                                                                                                                                                                                           | Audit 15 → 10 Meldungen (ausgeliefert: 0); Rest nur Entwicklungs-/Build-Zeit, siehe SR-001                                                                                                                                                                                         |
| 4   | erledigt | 4a: [#15](https://github.com/TaughtMe/Lernplattform/pull/15), 4b: [#16](https://github.com/TaughtMe/Lernplattform/pull/16), 4c: [#19](https://github.com/TaughtMe/Lernplattform/pull/19), 4d: [#21](https://github.com/TaughtMe/Lernplattform/pull/21), 4e: [#23](https://github.com/TaughtMe/Lernplattform/pull/23), 4f: PR folgt | 4a–4f erledigt (Effekt-Ereignisse; reine Logik; Live-Raum-Hook in Teil-Hooks und Ablauf-Reducer; Lehrkraft-Laufdiktat und LernBox in Dateien; `max-lines` 1000 für `app/`); 5 begründete exhaustive-deps-Stellen in learning-word-app/textbox-app bleiben (nicht Teil des Befunds) |
| 5   | erledigt | [#14](https://github.com/TaughtMe/Lernplattform/pull/14)                                                                                                                                                                                                                                                                           | ESLint-Reinheit für `app/views`, Inventar in `architecture.md`; 1 Modul entfernt, 6 Hilfen verschoben                                                                                                                                                                              |

## Korrekturen an der Analyse

Beim Nachprüfen fiel auf:

- Von den drei `exhaustive-deps`-Unterdrückungen in `app/lehrer/live/use-teacher-live-room.tsx`
  haben zwei einen Begründungskommentar in der Zeile darüber, aber keine `--`-Beschreibung in der
  Direktive selbst; die dritte hat gar keine Begründung.
- SR-001 im Risikoregister ist veraltet: `image-size` taucht im aktuellen Lockfile nicht mehr auf,
  `npm audit` meldet stattdessen andere Pakete (siehe Teilplan 3).
- `app/views/lernbox/lernbox-screen.tsx` ist bereits in viele Unterkomponenten gegliedert; das
  Zerlegen ist dort vor allem ein Aufteilen in Dateien (Teilplan 4).
