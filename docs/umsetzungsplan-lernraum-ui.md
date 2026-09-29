# Umsetzungsplan „Lernraum UI“ auf Codex-Basis

Stand: 29.09.2026 · freigegeben · Arbeitsbranch (vorgeschlagen): `claude/lernraum-ui`, abgezweigt von `codex/repair-room-contracts`

Dieser Plan verbindet drei Quellen zu einem roten Faden:

1. **Design „Lernraum UI“** (Design-Canvas, Turns 1–7): Zielbild für Aussehen und Bedienung.
2. **Codex-Stand** (`codex/repair-room-contracts`, 90 Commits vor `main`): fachlich tragfähiger Kern mit Dexie-Datenbanken, Raumverträgen, Einschreibung, Lernwörtern, Tipptraining, Kopfrechnen, rund 290 Tests und Quality Gates.
3. **Vault** (`obsidian-export/Lernplattform`, Kapitel 00–23) und `docs/`: Produktentscheidungen, Datenschutz, Qualitätsgrundlage.

Grundsatz: **Die Oberfläche kommt aus dem Design, Fachlogik und Daten kommen aus Codex, und die Regeln kommen aus dem Vault.** Wo sich die drei widersprechen, wird das vor der Umsetzung entschieden und im Vault festgehalten (Abschnitt 1).

---

## Entscheidungen (29.09.2026, Vault Nr. 47)

- **Farben:** Das Design gilt (Anthrazit/Bernstein). Vault Kap. 20 und Nr. 22 sind damit abgelöst.
- **Sichtbarkeit:** Ein Freigaberegister je Bereich (`aus`/`vorschau`/`frei`) ersetzt das Pilot-Gate.
- **Motivation:** Serie, Abzeichen und Häuser werden gebaut, sind aber standardmäßig ausgeschaltet.
- **Tier:** Ohne eigene Wahl bekommt das Kind ein zufälliges Tier.

---

## 1. Was vor dem Umbau geklärt werden musste

### 1.1 Das Design widerspricht beschlossenen Vault-Entscheidungen

| Thema        | Vault (beschlossen)                                                                                                                      | Design „Lernraum UI“                                                                         | Vorschlag                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Farben       | Kap. 20, Nr. 22: Korall als Marke, Teal als Aktion, Dunkelmodus „warm charcoal“                                                          | Anthrazit + Bernstein (Gold), dunkle Navigation                                              | Design übernehmen, Kap. 20 und Nr. 22 durch eine neue Entscheidung Nr. 47 ersetzen                            |
| Startseite   | Nr. 17, 46, Kap. 17: gestufter Einstieg; zuerst nur Raumbeitritt, das Dashboard erst, wenn Lernwege verknüpft sind; keine leeren Kacheln | Landing mit Tier, Raumcode und Lehrerzugang; Dashboard mit Serie, Wochenleiste und Abzeichen | Landing aus dem Design übernehmen. Dashboard nur mit Bereichen, die freigegeben sind (siehe 1.2)              |
| Gamification | Nr. 39, Kap. 17: Serie, Häuser und Ramagotchi erst nach stabilem Lernkern, abschaltbar                                                   | Serienring, Abzeichen, XP und Häuser sind prominent                                          | Hinter einem Schalter „Motivation“, Standard **aus** im Schulbetrieb, bis ein Kernreife-Kriterium erfüllt ist |
| Navigation   | Nr. 17: Duell und Haus nicht auf der Hauptseite                                                                                          | Leiste: Lernen, Raum, Duell, Haus                                                            | Duell erst zeigen, wenn es existiert (heute Platzhalter). Haus nur bei eingeschalteter Motivation             |
| Raumcode     | Supabase: `^[0-9]{4}$`                                                                                                                   | „4K2P“ (alphanumerisch)                                                                      | Numerisch bleiben, da es die Datenbank betrifft                                                               |

### 1.2 Pilot-Gate: meine frühere Änderung war zu grob

Im Commit `a8bc2e1` habe ich das Pilot-Gate auf „opt-in“ gestellt. Dadurch sind alle Bereiche sichtbar, auch die, die laut `docs/laufdiktat-pilot-product-contract.md` und Entscheidung 46 noch nicht freigegeben sind. Für den Schulbetrieb braucht es stattdessen ein **Freigaberegister je Bereich**:

- Pro Bereich (Laufdiktat, LernBox, Lernwörter, Tastenwelt, Mathe, Haus, Duell, Lehrer-Klassen …) gibt es eine Stufe: `aus` · `vorschau` (nur mit Schalter) · `frei`.
- Navigation, Dashboard und Routen lesen dieses Register. Nicht freigegebene Bereiche erscheinen nicht, auch nicht als leere Kacheln, und ihre Routen leiten um.
- Die Lehrkraft kann auf ihrem Gerät eine Vorschau einschalten, um neue Bereiche zu testen, ohne sie Schülern freizugeben.
- Damit ist das alles-oder-nichts-Gate aus `proxy.ts` und `src/pilot-mode.ts` ersetzt.

### 1.3 Widersprüche im Repo selbst

- **Tier ohne Auswahl:**
  - Der Pilotvertrag vom 19.09. sagt „zufälliges Tier“.
  - Code und Unit-Test vom 21.09. sagen `null`, also „Lernender“.
  - Der Live-Test folgt jetzt der neueren Code-Regel.
  - Vorschlag: zufälliges Tier bei der ersten Nutzung. Kinder sollen sich sofort wiedererkennen, und das Design zeigt immer ein Tier. Danach Vertrag, Code und Tests vereinheitlichen.
- **Veraltete Doku:** `docs/architecture.md` beschreibt noch den Pilotmodus als aktuellen Stand, und Kapitel 18 im Vault führt Häuser, den kontinuierlichen Scanmodus und den Leistungsbrief als offen, obwohl sie inzwischen umgesetzt sind.
- **Supabase-Migration:** Die Reparaturmigration ist laut `docs/repair-plan.md` nicht auf der produktiven Datenbank angewendet. Ohne sie funktioniert das Laufdiktat im Echtbetrieb nicht mit dem aktuellen Code.

### 1.4 Langfristiger Schulbetrieb: was sonst leicht übersehen wird

- **Datenverlust auf Schülergeräten:**
  - Local-first heißt: iPad zurückgesetzt oder Browserdaten gelöscht, dann ist der Lernstand weg.
  - Vorhandene Sicherung: Export und Import als Datei.
  - Nötig im Plan: sichtbarer Hinweis auf die letzte Sicherung, eine Erinnerung und die Behandlung von gelöschtem Speicher (Kap. 18: offen). Cloud-Backup kommt später.
- **Geteilte Geräte:** Schul-iPads und Stationsgeräte werden oft von mehreren Kindern genutzt. Die heutige Annahme „ein Gerät = ein Kind“ muss in der Oberfläche erkennbar sein: Profil wechseln oder abmelden, und kein persönlicher Speicher im Stationsmodus (bereits umgesetzt).
- **Datenschutz vor dem Echtbetrieb** (Nr. 9, 42):
  - AV-Vertrag Supabase
  - Löschfristen für Abgabe- und Hausprotokolle (heute nur manuell)
  - Informationstexte
  - Freigabe durch die Schule
    Das sind organisatorische Aufgaben, die nicht im Code gelöst werden. Der Plan hält sie trotzdem als Freigabebedingung fest.
- **Datenformat-Migrationen:** Jede Änderung an Dexie-Schemata braucht eine Migration und einen Test mit alten Daten (Kap. 18: „Migrations- und Rückfallstrategie“ offen). Beim UI-Umbau werden Datenformate **nicht** geändert, außer dort, wo es ausdrücklich geplant ist.
- **Ein einziges Gestaltungssystem:** Heute existieren nebeneinander `app/globals.css` (über 1.000 Zeilen Codex-Stile), `student-module-shell.css` und die `lr-*`-Stile der Häuser. Der Umbau ersetzt das durch **eine** Token- und Komponentenschicht. Sonst wächst jede neue Seite ihren eigenen Stil.
- **Leistung auf älteren Geräten:** Schriften, Tier-SVGs und große Listen gilt es zu beachten, etwa bei Wortbanken mit mehr als 100 Wörtern. Das Budget wird in Phase 1 festgelegt.
- **Abhängigkeit vinext (Beta):** bleibt, wie im Vault beschlossen. Kein Versionswechsel während des UI-Umbaus.
- **Wiederherstellbarkeit:** `codex/repair-room-contracts` bleibt unverändert als Rückfallstand erhalten. `main` liegt 90 Commits zurück. Das Zusammenführen erfolgt am Ende über einen PR.

---

## 2. Zielbild: Screens, Routen und Codex-Bausteine

| Design                            | Route (Ziel)                                          | Datenquelle / Fachlogik aus Codex                                     | Stand heute                                                 |
| --------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1a/2a Landing, Tierwahl, Raumcode | `/`                                                   | `learner-profile`, `live-room-join`                                   | Codex-Layout                                                |
| 2b/3a/3b Dashboard „Heute“        | `/lernen`                                             | `LearningRecommendation` (Heute üben), Lernereignisse, Fortschritt    | Codex-Kacheln                                               |
| Profil (Tier, Klasse, Sicherung)  | `/lernen/einstellungen`                               | Profil, Einschreibung, Export/Import                                  | vorhanden, anderes Layout                                   |
| 4a–4c LernBox                     | `/lernbox`                                            | Leitner-Kern, Stapel, Sitzung, „Meine Fehler jetzt üben“              | vorhanden                                                   |
| 4d–4f Wortspeicher                | `/frei/german/lernwoerter` → im Design „Wortspeicher“ | Lernwörter mit 5 Merkstufen, Wortbanken (je ≥ 100 Wörter), Strategien | fachlich weiter als das Design                              |
| 5a/5b Laufdiktat Schüler          | `/raum`                                               | Raumvertrag, Spiel, Battle, Stationen                                 | vorhanden                                                   |
| 5c/5d Laufdiktat Lehrkraft        | `/lehrer/live`                                        | Lehrer-Wizard, Live-Auswertung                                        | vorhanden                                                   |
| 6a–6c Tastenwelt                  | `/frei/typing` → „Tastenwelt“                         | Tipp-Kern (Genauigkeit vor Tempo, unsichere Tasten)                   | fachlich vorhanden, Lernweg/Stationen aus dem Design fehlen |
| 7a–7c Mein Haus / Lehrer-Scan     | `/haus`, `/lehrer/haeuser`                            | Hauspunkte, signierter Brief                                          | gerade ergänzt                                              |
| 1d/2c/3c/3d Lehrerbereich         | `/lehrer/*`                                           | Klassen, Material, Aufgaben, Einstellungen                            | vorhanden                                                   |
| Kopfrechnen                       | `/frei/mathematics`                                   | Generator, Fehlerfamilien                                             | nicht im Design, im Design-Stil ergänzen                    |

Die Routen bleiben stabil, weil QR-Codes und Links darauf zeigen. Umbenennungen erfolgen nur mit Weiterleitung.

---

## 3. Umgang mit Inhalten: übernehmen oder exemplarisch füllen

Für jeden Screen gilt eine von zwei Regeln:

- **Übernehmen:** Wenn Codex die Funktion hat, wird sie in das Design-Layout gebracht. Das Design gibt Anordnung und Stil vor, Codex liefert Daten und Verhalten. Beispiele: LernBox, Lernwörter, Tipptraining, Laufdiktat.
- **Exemplarisch + Wissensablage:**
  - Das gilt, wenn das Design etwas zeigt, das Codex nicht hat (z. B. Tastenwelt-Lernweg mit 10 Stationen, Abzeichen) oder wenn Codex fachlich mehr kann, als das Design darstellt (z. B. 5 Merkstufen, Wortbank-Strategien).
  - Der Screen wird mit gekennzeichneten Beispielinhalten gefüllt.
  - Das Fachwissen wird in `docs/inhalte/<bereich>.md` abgelegt: welche Regeln, Daten und Tests es in Codex bereits gibt, wo der Code liegt und was für die spätere Anbindung fehlt.

Beispielinhalte sind im Code als solche markiert und erscheinen im Schulbetrieb nur in der Vorschau-Stufe (siehe 1.2).

---

## 4. Phasen

Jede Phase endet mit:

- einem eigenen Commit und Push
- grünem `npm run check`
- fokussierten Browser- und axe-Tests
- Screenshots im Vergleich zur Design-Vorlage (hell/dunkel, 390 px und 1280 px)

### Phase 0 – Entscheidungen und Grundlage (klein)

- Offene Punkte aus Abschnitt 1 entscheiden und als Entscheidung Nr. 47 im Vault festhalten; Kapitel 20 (Design) und 17 (Einstieg) anpassen.
- Design-Vorlage und gerenderte Referenzbilder je Screen nach `docs/design/` legen.
- Branch `claude/lernraum-ui` anlegen.

### Phase 1 – Gestaltungssystem

- Tokens aus dem Design (hell/dunkel, dunkle Navigationsflächen, Schriften Work Sans/Fredoka, Radien, Abstände, Schatten).
- Grundkomponenten: Button, Karte, Chip, Segmentschalter, Ziffernfeld für den Code, Fortschrittsbalken und -ring, Sheet/Dialog, Leerzustand, Tieravatar.
- Kontrastprüfung beider Modi (WCAG AA) mit einem automatischen Test.
- Leistungsbudget festlegen.
- **Fertig, wenn:** Eine Komponentenübersicht (nur in der Entwicklung) alle Bausteine in beiden Modi zeigt und axe keine Befunde meldet.

### Phase 2 – App-Rahmen, Navigation, Freigaberegister

- Schülerrahmen: Leiste plus Seitenpanel (Desktop), untere Navigation (mobil), Theme-Schalter.
- Lehrerrahmen: dunkle Seitenleiste, mobile Variante.
- Freigaberegister (1.2) ersetzt das Pilot-Gate, mit Tests für Sichtbarkeit und Weiterleitung.
- **Fertig, wenn:** Alle Routen im neuen Rahmen laufen, nicht freigegebene Bereiche unsichtbar sind und bei 320 px nichts horizontal scrollt.

### Phase 3 – Einstieg und Laufdiktat Schüler

- Landing nach 1a/2a mit Codex-Beitritt (Code, QR, Direktlink, Wiedereintritt).
- Lobby, Spiel, Battle, Stationen, Abschluss nach 5a/5b.
- Tierregel vereinheitlichen (1.3).
- **Fertig, wenn:** Die Live-e2e-Suite in allen Profilen grün läuft und die Zustände (ungültig, offline, beendet) im Design dargestellt sind.

### Phase 4 – Laufdiktat Lehrkraft

- Wizard (Diktat → Modus → Lobby → Live) nach 5c/5d auf Basis der Codex-Lehrerlogik.

### Phase 5 – LernBox

- Stapelliste, Sitzung, Abschluss und „Meine Fehler jetzt üben“ nach 4a–4c.

### Phase 6 – Wortspeicher (Lernwörter)

- Design 4d–4f als Oberfläche. Codex-Merkstufen, Wortbanken und Strategien einbinden, soweit sie ins Layout passen; Rest in `docs/inhalte/lernwoerter.md`.

### Phase 7 – Tastenwelt

- Lernweg und Übung nach 6a–6c auf dem Codex-Tippkern. Stationen, die Codex nicht hat, exemplarisch füllen und dokumentieren.

### Phase 8 – Dashboard „Heute“ und Profil

- Dashboard nach 2b/3a aus `LearningRecommendation` und echten Ereignissen. Motivationselemente (Serie, Abzeichen) nur bei eingeschaltetem Schalter.
- Profil mit Tier, Klasse, Datensicherung und Hinweis zur letzten Sicherung.

### Phase 9 – Lehrerbereich

- Klassen, Material, Aufgaben, Einstellungen, Häuser im Lehrerrahmen nach 1d/2c/3c/3d.

### Phase 10 – Motivation (abschaltbar)

- Haus, Türme und Missionen nach 7a–7c hinter dem Schalter. Duell bleibt ausgeblendet, bis es fachlich existiert.

### Phase 11 – Aufräumen und Freigabe

- Alte Stile und Komponenten entfernen; es darf keine zweite Stilschicht übrig bleiben.
- Doku (`docs/architecture.md`, Pilotvertrag, README) und Vault (Kap. 17, 18, 20) auf den Stand bringen.
- Qualitätsbericht nach Vorlage (Kap. 21) erstellen, PR gegen `main`.

---

## 5. Stand (29. September 2026)

Phasen 0–11 sind auf `claude/lernraum-ui` umgesetzt, jeweils als eigener Commit. Abweichungen vom Plan:

- Phase 9: Klassen, Material, Aufgaben und Einstellungen laufen im neuen Lehrerrahmen, ihre Inhalte aber noch als `.ui-legacy`. Neu im Design sind die Übersicht und die Klassenliste.
- Phase 11: `app/globals.css` ist auf die tatsächlich genutzten Regeln reduziert, aber noch nicht aufgelöst. Die zweite Stilschicht verschwindet erst, wenn Klassenbereich, Kopfrechnen und Lehrer-Unterseiten umgebaut sind.
- Motivation steht im Register auf `aus` (Standard laut Entscheidung 47), nicht auf `vorschau`.
- Der Pull Request gegen `main` wird erst auf ausdrücklichen Wunsch erstellt.

Der Qualitätsbericht steht im Vault unter `21 - Qualitätsgrundlage und Freigabe/Qualitätsbericht - Lernraum UI.md`.

## 6. Arbeitsweise

- Ich arbeite phasenweise auf `claude/lernraum-ui`, mit einem Commit pro abgeschlossenem Schritt. `codex/repair-room-contracts` bleibt unberührt.
- Datenformate und Supabase-Verträge ändere ich nur, wenn eine Phase es ausdrücklich vorsieht, dann mit Migration und Test.
- Nach jeder Phase: kurze Rückmeldung mit Screenshots. Gemäß `AGENTS.md` wird CI nach dem Push nicht aktiv abgefragt.
- Organisatorische Punkte (Datenschutz, AV-Vertrag, Supabase-Migration in Produktion) werden als Freigabebedingung geführt, nicht im Code „gelöst“.
