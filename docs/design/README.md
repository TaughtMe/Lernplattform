# Design-Vorlage „Lernraum UI“

Verbindliche Gestaltungsgrundlage seit Entscheidung 47 (Vault, 29.09.2026). Seit Entscheidung 48 wird die Oberfläche vom Design aus gebaut: [../umsetzungsplan-lernraum-ui-v2.md](../umsetzungsplan-lernraum-ui-v2.md).

- `lernraum-ui.dc.html` + `support.js`: das Design-Canvas (Turns 1–7). Zum Öffnen im Browser werden React 18 und Babel von unpkg.com geladen; die Tiere kommen aus `public/animals`.
- `screens.json`: alle Referenzzustände. Jeder Eintrag nennt Screen, Größe der Fläche und die Klicks im Canvas, die den Zustand herstellen. `"status": "umgesetzt"` bedeutet, dass es unter `/entwicklung/screens/<id>` eine Ansicht gibt, die der Designvergleich prüft.
- `referenz/<id>.png`: die Innenfläche jeder Design-Karte, gerendert mit Chromium und den lokal ausgelieferten Schriften Work Sans und Fredoka. Neu erzeugen mit `npm run design:references` (ohne Netz: `DESIGN_UMD_DIR`, siehe Skript).

Vergleich: `npm run test:design` rendert jede umgesetzte Ansicht in der Größe der Vorlage und vergleicht sie mit dem Referenzbild.

| Screen         | Inhalt                                                          | Ziel-Route                 |
| -------------- | --------------------------------------------------------------- | -------------------------- |
| 1a–1c          | frühe Einstiegsvarianten (Referenz für 2a/2b)                   | –                          |
| 1d, 2c, 3c, 3d | Lehrer-Cockpit, Lehrerbereich mobil/Desktop                     | `/lehrer/*`                |
| 2a             | Landingpage: Tier, Raumcode, Lehrerzugang                       | `/`                        |
| 2b, 3a, 3b     | Schülerdashboard (Serienring, Woche, fällig, schwierige Wörter) | `/lernen`                  |
| 4a–4c          | LernBox                                                         | `/lernbox`                 |
| 4d–4f          | Wortspeicher (Lernwörter)                                       | `/frei/german/lernwoerter` |
| 5a–5b          | Laufdiktat Schüler                                              | `/raum`                    |
| 5c–5d          | Laufdiktat Lehrkraft                                            | `/lehrer/live`             |
| 6a–6c          | Tastenwelt                                                      | `/frei/typing`             |
| 7a–7c          | Mein Haus, Häuser-Scan                                          | `/haus`, `/lehrer/haeuser` |
