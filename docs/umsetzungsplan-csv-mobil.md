# Umsetzungsplan: „Ergebnisse als CSV“ im Lehrer-Laufdiktat auf schmalen Bildschirmen

Stand: 03.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `b5e99a0`

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Die Entscheidungen in Abschnitt 2
sind mit der projektverantwortlichen Lehrkraft abgestimmt und verbindlich.

## 0. Arbeitsweise

- Eigener Branch, abgezweigt von `claude/lernraum-ui-v2`. **Nicht direkt auf
  `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt per Pull Request.
- Regeln: `AGENTS.md`, `docs/engineering-quality.md`, `docs/umsetzungsplan-lernraum-ui-v2.md`
  (Ansichten bleiben rein, bewusste Abweichungen werden dort dokumentiert).
- Keine neuen Abhängigkeiten, keine Datenbankänderung, keine Änderung an der CSV-Logik
  (`exportCsv` in `app/lehrer/live/use-teacher-live-room.tsx`, `buildTeacherResultCsv`).
- Vor dem Push: `npm run check`, `npm run test:design`,
  `npx playwright test --config playwright.live.config.ts e2e/live/teacher-room.spec.ts`
  (Projekte `desktop-chromium` und `mobile-chrome`).

## 1. Befund

- Der Live-Schritt des Lehrer-Laufdiktats rendert die Schaltfläche „Ergebnisse als CSV“
  immer (`LiveStep` in `app/views/laufdiktat/teacher-dictation-screen.tsx`, ca. Zeile 840).
- Sie sitzt im Kopf der Schülerliste (`.studentsHead`). Dieser Kopf ist unter 900 px
  Containerbreite per CSS ausgeblendet (`teacher-dictation-screen.module.css`: `.studentsHead {
display: none; }`, eingeblendet erst in `@container (min-width: 900px)`).
- Folge: Auf Handy und schmalem Tablet kann die Lehrkraft die Ergebnisse **nicht** exportieren.
  Grund ist die 1:1-Umsetzung der Vorlage 5c (mobil), die keine CSV-Schaltfläche zeigt
  (eingeführt mit `208db7a`). Es ist keine Absicht, die Funktion mobil wegzulassen.
- Der Fehler besteht schon auf dem Live-Stand. Nachweis: `e2e/live/teacher-room.spec.ts`,
  Test „the live view shows progress per animal and the most frequent errors“, schlägt im
  Projekt `mobile-chrome` fehl („element(s) not found“ bei `Ergebnisse als CSV`). Desktop ist grün.

## 2. Entscheidung

- Auf schmalen Bildschirmen erscheint „Ergebnisse als CSV“ als **eigene Schaltfläche unter der
  Schülerliste** bzw. unter der Stationsliste im Live-Schritt. Sie ist volle Breite,
  zurückhaltend gestaltet (gleiche Optik wie `.csv`) und mindestens 44 px hoch (Touch-Ziel).
- Auf breiten Bildschirmen (≥ 900 px) bleibt alles wie bisher: Schaltfläche im Kopf der
  Schülerliste. **Auf jeder Breite ist genau eine** CSV-Schaltfläche sichtbar, keine Dublette im
  Barrierefreiheitsbaum.
- Das ist eine **bewusste Abweichung von Vorlage 5c**. Sie wird im v2-Plan unter „Bewusste
  Abweichungen von der Vorlage“ dokumentiert. Begründung: Eine Kernfunktion darf auf dem Handy
  nicht fehlen.

## 3. Umsetzung

1. **Ansicht** (`app/views/laufdiktat/teacher-dictation-screen.tsx`, `LiveStep`):
   - Unter der Schüler- bzw. Stationsliste eine zweite Schaltfläche mit Klasse
     `styles.csvNarrow` (Name frei), gleicher Text, gleicher `onExportCsv`-Handler.
   - Die vorhandene Schaltfläche im Kopf bleibt unverändert.
   - Die Ansicht bleibt rein: kein Zustand, kein Speicher.
2. **CSS** (`teacher-dictation-screen.module.css`):
   - `.csvNarrow` ist standardmäßig sichtbar (`display: flex`, volle Breite, `min-height: 44px`).
   - Im bestehenden Block `@container (min-width: 900px)` wird `.csvNarrow` auf `display: none`
     gesetzt.
   - Dadurch ist immer nur eine der beiden Schaltflächen sichtbar. `display: none` nimmt die
     unsichtbare Schaltfläche auch aus dem Barrierefreiheitsbaum.
   - Danach `npm run css-types` ausführen.
3. **Designvergleich** (`npm run test:design`, Referenzen `5c-live` und `5c-live-dark`):
   - Erst prüfen, ob die neue Schaltfläche innerhalb der 390 × 788-Fläche der Referenz liegt
     und die Toleranz (1,2 %) überschreitet.
   - Falls ja: Referenzbilder **nicht** neu erzeugen und Toleranz **nicht** erhöhen.
     Stattdessen `e2e/design/design-fidelity.spec.ts` um eine optionale Liste
     `mask` je Eintrag in `docs/design/screens.json` erweitern. Diese Liste wird an
     `toHaveScreenshot({ mask })` von Playwright durchgereicht, mit Selektor auf die neue
     Schaltfläche, und zwar nur bei `5c-live` und `5c-live-dark`.
   - Die Erweiterung im Kopfkommentar der Spec kurz begründen.
4. **Tests:**
   - Komponententest für `TeacherDictationScreen` im Live-Schritt (vorhandene Testdatei
     ergänzen oder anlegen): Klick auf „Ergebnisse als CSV“ ruft `onExportCsv` auf.
   - `e2e/live/teacher-room.spec.ts`: Der bestehende Test muss in `mobile-chrome` grün werden.
     Prüfe zusätzlich in beiden Projekten:
     - genau eine sichtbare CSV-Schaltfläche:
       `getByRole("button", { name: "Ergebnisse als CSV" })` hat Anzahl 1
     - Ein Klick löst einen Download mit Dateiname `laufdiktat-ergebnisse-*.csv` aus
       (`page.waitForEvent("download")`).
   - Stationsmodus: Die Schaltfläche ist auch dort mobil erreichbar. Einen vorhandenen
     Stationstest erweitern oder einen kurzen Fall ergänzen.
5. **Dokumentation:**
   - Abweichung im v2-Plan eintragen.
   - In `obsidian-export/Lernplattform/18 - Aufgabenübersicht/Anwendung.md` einen erledigten
     Punkt ergänzen.

## 4. Nicht Teil dieses Plans

- Inhalt, Spalten oder Format der CSV-Datei.
- Andere Lehrer-Screens oder das restliche Layout von 5c.
- Export nach dem Beenden einer Runde (eigenes Thema, falls gewünscht).

## 5. Prüfung durch die Lehrkraft (5 Minuten)

1. Auf dem Handy als Lehrkraft ein Laufdiktat starten, mit einem zweiten Gerät oder einem
   privaten Fenster beitreten und ein paar Wörter schreiben.
2. Im Live-Schritt nach unten scrollen. Unter der Schülerliste steht „Ergebnisse als CSV“.
3. Tippen. Die Datei wird heruntergeladen bzw. auf dem iPhone zum Sichern oder Teilen angeboten,
   und sie lässt sich in Numbers, Excel oder Google Tabellen öffnen.
4. Am Laptop (breites Fenster) ist die Schaltfläche weiterhin oben bei der Schülerliste und
   nur einmal vorhanden.
