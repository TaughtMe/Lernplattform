# Design-Vorlage „Lernraum UI“

Verbindliche Gestaltungsgrundlage seit Entscheidung 47 (Vault, 29.09.2026). Seit Entscheidung 48 wird die Oberfläche vom Design aus gebaut: [../umsetzungsplan-lernraum-ui-v2.md](../umsetzungsplan-lernraum-ui-v2.md).

- `lernraum-ui.dc.html` + `support.js`: das Design-Canvas (Turns 1–8). Zum Öffnen im Browser werden React 18 und Babel von unpkg.com geladen; die Tiere kommen aus `public/animals`.
- `screens.json`: alle Referenzzustände. Jeder Eintrag nennt Screen, Größe der Fläche und die Klicks im Canvas, die den Zustand herstellen. Der Status sagt, was mit dem Zustand geschieht:
  - `umgesetzt`: Es gibt unter `/entwicklung/screens/<id>` eine Ansicht, die der Designvergleich prüft.
  - `referenz`: Der Entwurf dient als Vorlage für Ideen, wird aber nicht 1:1 gebaut, weil eine neuere Fassung ihn ersetzt (1a–1c, 1d, 2c). Er erscheint im Katalog als offen und wird nicht verglichen.
  - `offen`: noch nicht umgesetzt.
  - Optional `hide` (Selektoren, die vor dem Vergleich ausgeblendet werden) und `ready` (Selektor, auf den vor dem Vergleich gewartet wird, z. B. `dialog[open]` für modale Dialoge, die erst nach dem Laden des Skripts erscheinen).
- Ergänzungen ohne Vorlage (Start-Overlay, Dialog „Klassen zuordnen“) stehen nur im Katalog, in `app/entwicklung/screens/manifest.ts` (`3c-start`, `3d-start`, `3c-assign`). Sie haben kein Referenzbild und werden nicht verglichen.
- `referenz/<id>.png`: die Innenfläche jeder Design-Karte, gerendert mit Chromium und den lokal ausgelieferten Schriften Work Sans und Fredoka. Neu erzeugen mit `npm run design:references` (ohne Netz: `DESIGN_UMD_DIR`, siehe Skript).

Vergleich: `npm run test:design` rendert jede umgesetzte Ansicht in der Größe der Vorlage und vergleicht sie mit dem Referenzbild.

| Screen              | Inhalt                                                                                 | Ziel-Route                 |
| ------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| 1a–1c               | frühe Einstiegsvarianten (Referenz für 2a/2b)                                          | –                          |
| 1d, 2c              | Lehrer-Cockpit, frühe Fassung (Status `referenz`)                                      | –                          |
| 3c, 3d              | Lehrerbereich „Inhalte“ mobil/Desktop                                                  | `/lehrer`                  |
| 2a                  | Landingpage: Tier, Raumcode, Lehrerzugang                                              | `/`                        |
| 2b, 3a, 3b          | Schülerdashboard (Serienring, Woche, fällig, schwierige Wörter)                        | `/lernen`                  |
| 4a–4c, 4g–4j, 8a–8b | LernBox: Übersicht mit Plus und Stift (8), Karte (4a–4c), Ergebnis einer Karte (4g–4j) | `/lernbox`                 |
| 4d–4f               | Wortspeicher (Lernwörter)                                                              | `/frei/german/lernwoerter` |
| 5a–5b               | Laufdiktat Schüler                                                                     | `/raum`                    |
| 5c–5d               | Laufdiktat Lehrkraft                                                                   | `/lehrer/live`             |
| 6a–6c               | Tastenwelt                                                                             | `/frei/typing`             |
| 7a–7c               | Mein Haus, Häuser-Scan                                                                 | `/haus`, `/lehrer/haeuser` |
