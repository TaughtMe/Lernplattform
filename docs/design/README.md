# Design-Vorlage „Lernraum UI“

Verbindliche Gestaltungsgrundlage seit Entscheidung 47 (Vault, 29.09.2026). Der Umsetzungsplan steht in [../umsetzungsplan-lernraum-ui.md](../umsetzungsplan-lernraum-ui.md).

- `lernraum-ui.dc.html` + `support.js`: das Design-Canvas (Turns 1–7). Zum Öffnen im Browser werden React 18 und Babel von unpkg.com geladen; die Tiere kommen aus `public/animals`.
- `referenz/*.png`: gerenderte Referenzbilder je Screen. Die Schriften Work Sans/Fredoka fehlen darin, weil Google Fonts beim Rendern nicht erreichbar war. Maßgeblich sind Anordnung, Farben und Proportionen.

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
