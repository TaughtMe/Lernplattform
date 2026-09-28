# Design-Vorlage „Lernraum UI"

`lernraum-ui.dc.html` ist das Design-Canvas (Turns 1–7), aus dem die Oberfläche umgesetzt wurde. Im Browser öffnen (braucht `support.js` im selben Ordner und die Tiere aus `public/animals`).

| Turn | Screens | Umsetzung |
| --- | --- | --- |
| 1–2 | Einstieg, Landing, Dashboard, Lehrerbereich | `app/page.tsx`, `app/start`, `app/lehrer` |
| 3 | Querformat, Lehrer mobil, hell/dunkel | `app/components/student-shell.tsx`, `app/lehrer/teacher-shell.tsx`, Tokens in `app/globals.css` |
| 4 | LernBox, Wortspeicher | `app/lernen` |
| 5 | Laufdiktat Schüler/Lehrer | `app/raum`, `app/lehrer/laufdiktat` |
| 6 | Tastenwelt | `app/tastenwelt` |
| 7 | Mein Haus, Lehrer-Scan | `app/haus`, `app/lehrer/haus` |
