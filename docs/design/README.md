# Design-Vorlage „Lernraum UI“

Verbindliche Gestaltungsgrundlage seit Entscheidung 47 (Vault, 29.09.2026). Seit Entscheidung 48 wird die Oberfläche vom Design aus gebaut: [../umsetzungsplan-lernraum-ui-v2.md](../umsetzungsplan-lernraum-ui-v2.md).

- `lernraum-ui.dc.html` + `support.js`: das Design-Canvas (Turns 1–9). Zum Öffnen im Browser werden React 18 und Babel von unpkg.com geladen; die Tiere kommen aus `public/animals`.
- `lehrerbereich-v2.dc.html` (+ dasselbe `support.js`): das Canvas „Lehrerbereich v2“ (Turns 10–17, Handoff vom 19.10.2026). Verbindlich ist der neueste Stand: 15a/15c/15d (Start), 14b (Schritt 1 Inhalt), 14c mit dem Ende aus 15b (Schritt 2 Modus), 16a/16b (Schritt 2 auf Tablet und Handy) und 17a–17c (Verwalten). 10–13 und 14a sind überholte Zwischenstände und dienen nur als Ideenquelle. Einträge in `screens.json` mit `"source": "lehrerbereich-v2.dc.html"` werden aus dieser Datei gerendert; die Fläche ist dort die Karte ohne ihren 1-px-Rahmen.
- `screens.json`: alle Referenzzustände. Jeder Eintrag nennt Screen, Größe der Fläche und die Klicks im Canvas, die den Zustand herstellen. Der Status sagt, was mit dem Zustand geschieht:
  - `umgesetzt`: Es gibt unter `/entwicklung/screens/<id>` eine Ansicht, die der Designvergleich prüft.
  - `referenz`: Der Entwurf dient als Vorlage für Ideen, wird aber nicht 1:1 gebaut, weil eine neuere Fassung ihn ersetzt (1a–1c, 1d, 2c). Er erscheint im Katalog als offen und wird nicht verglichen.
    - 5c-import, 5c-settings, 5c-options, 5d-import, 5d-settings: Schritt „Inhalt“ und „Modus“ des Lehrkraft-Laufdiktats folgen seit Lehrerbereich v2 den Screens 14b, 14c und 16a/16b. Lobby und Live (5c-lobby, 5c-live, 5d-lobby, 5d-live) bleiben umgesetzt.
    - 15b: das Ende von Schritt 2 allein. Die Vorlage zeigt es schon in 14c, verglichen wird es dort. Einzeln liegt die Abweichung über der Toleranz, weil der Test die Systemschrift der Knöpfe auf Liberation Sans Regular abbildet (fett synthetisch), die Vorlage aber echtes Liberation Sans Bold rendert; auf der kleinen Fläche (1180 × 80) fällt das stärker ins Gewicht.
  - `offen`: noch nicht umgesetzt.
  - Optional `hide` (Selektoren, die vor dem Vergleich ausgeblendet werden) `touch` (der Test läuft mit hasTouch/isMobile, damit die Touch-Darstellung gewählt wird, z. B. 5a-hold/5b-hold) und `ready` (Selektor, auf den vor dem Vergleich gewartet wird, z. B. `dialog[open]` für modale Dialoge, die erst nach dem Laden des Skripts erscheinen).
- Ergänzungen ohne Vorlage (Start-Overlay, Dialog „Klassen zuordnen“) stehen nur im Katalog, in `app/entwicklung/screens/manifest.ts` (`3c-start`, `3d-start`, `3c-assign`). Sie haben kein Referenzbild und werden nicht verglichen.
- `referenz/<id>.png`: die Innenfläche jeder Design-Karte. Für noch nicht umgesetzte Ansichten wird sie aus der Vorlage gerendert, mit Chromium und den lokal ausgelieferten Schriften Work Sans und Fredoka. Neu erzeugen mit `npm run design:references` (ohne Netz: `DESIGN_UMD_DIR`, siehe Skript).

Vergleich: `npm run test:design` rendert jede umgesetzte Ansicht in der Größe der Vorlage und vergleicht sie mit dem Referenzbild.

**Regel für Referenzbilder.** Das Referenzbild einer umgesetzten Ansicht ist der abgenommene App-Stand (so entschieden in `3c08ab4`), nicht mehr die Vorlage. `npm run design:references` (Render aus der Vorlage) ist nur für neue Ansichten gedacht. Umgesetzte Ansichten werden ausschließlich über den Workflow „Design-Referenzen erneuern“ (`.github/workflows/design-references.yml`) neu erzeugt, und erst nach Sichtprüfung der geänderten Bilder im Pull Request freigegeben.

Auslösen: Im Pull Request das Label `design-referenzen-erneuern` setzen. Der Workflow committet die geänderten PNGs auf den Branch des Pull Requests und entfernt das Label danach wieder; die Bilder dann in der Dateiansicht des Pull Requests prüfen. Alternativ „Run workflow“ im Actions-Menü (Eingabe: Branch), das aber nur erscheint, wenn die Datei auf dem Standard-Branch liegt. Prüflauf auf dem Bild-Commit: Ein Push mit dem `GITHUB_TOKEN` startet normalerweise keine Workflows, und „Re-run“ eines älteren Laufs prüft den alten Commit, nicht den neuen. Es zählt nur ein Lauf, der zum Commit der Bilder gehört. Ist das Geheimnis `DESIGN_REFERENCES_TOKEN` (Token mit Schreibrecht auf Inhalte) angelegt, pusht der Workflow damit und die Quality-Läufe starten selbst (gegebenenfalls mit „Approve and run“). Ohne dieses Geheimnis den Lauf auf dem neuen Commit von Hand anstoßen, z. B. durch einen weiteren Commit auf dem Branch, und im Lauf prüfen, dass die Commit-ID die des Bild-Commits (oder jünger) ist.

Label einmalig anlegen: `gh label create design-referenzen-erneuern`.

**Wo verglichen wird.** Der Job `design-quality` in `.github/workflows/quality.yml` und der Workflow laufen im offiziellen Playwright-Container (`mcr.microsoft.com/playwright:v<Version>-noble`). Die Version muss der von `@playwright/test` in `package-lock.json` entsprechen, damit Betriebssystem, Schriften und Chromium überall gleich sind. Lokal kann der Vergleich je nach Rechner abweichen; maßgeblich ist der Lauf in GitHub.

Der Test und das Render-Skript bilden die Systemschriften der Schaltflächen (`-apple-system`, `BlinkMacSystemFont`, „Segoe UI“) auf Liberation Sans ab, wie die Vorlage unter Linux. Der Vergleich ist damit unabhängig vom Rechner (Mac, Cloud-Container mit Inter-Umleitung, CI). Die neun Bilder aus Commit `3c08ab4` (3c, 3d, 3d-dark, 5c-import, 5c-live, 5c-live-dark, 5c-lobby, 5c-options, 5d-import) stammen aus der Ansicht, wie dort begründet, und wurden mit dieser Schrift neu aufgenommen.

| Screen                 | Inhalt                                                                                    | Ziel-Route                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1a–1c                  | frühe Einstiegsvarianten (Referenz für 2a/2b)                                             | –                                                              |
| 1d, 2c                 | Lehrer-Cockpit, frühe Fassung (Status `referenz`)                                         | –                                                              |
| 3c, 3d                 | Lehrerbereich „Inhalte“ mobil/Desktop                                                     | `/lehrer`                                                      |
| 2a                     | Landingpage: Tier, Raumcode, Lehrerzugang                                                 | `/`                                                            |
| 2b, 3a, 3b             | Schülerdashboard (Serienring, Woche, fällig, schwierige Wörter)                           | `/lernen`                                                      |
| 4a–4c, 4g–4j, 8a–8b    | LernBox: Übersicht mit Plus und Stift (8), Karte (4a–4c), Ergebnis einer Karte (4g–4j)    | `/lernbox`                                                     |
| 4d–4f                  | Wortspeicher (Lernwörter)                                                                 | `/frei/german/lernwoerter`                                     |
| 5a–5b                  | Laufdiktat Schüler                                                                        | `/raum`                                                        |
| 5c–5d                  | Laufdiktat Lehrkraft                                                                      | `/lehrer/live`                                                 |
| 6a–6c                  | Tastenwelt                                                                                | `/frei/typing`                                                 |
| 7a–7c                  | Mein Haus, Häuser-Scan                                                                    | `/haus`, `/lehrer/haeuser`                                     |
| 9a–9f                  | Textbox: Auswahl als Kartenraster (9b/9c), Eingabe auf liniertem Papier (9d–9f)           | `/frei/german/textbox`                                         |
| 15a, 15c, 15d          | Lehrerbereich v2: Start (Neues Laufdiktat, Vorbereitet/Archiv, aus anderen Klassen holen) | `/lehrer`                                                      |
| 14b, 14c, 15b, 16a–16b | Lehrerbereich v2: Schritt 1 Inhalt, Schritt 2 Modus                                       | `/lehrer/live`                                                 |
| 17a–17c                | Lehrerbereich v2: Einstellungen, Freigabe an Schüler, Klassen                             | `/lehrer/einstellungen`, `/lehrer/material`, `/lehrer/klassen` |
