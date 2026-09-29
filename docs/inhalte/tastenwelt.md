# Tastenwelt (Tastschreiben)

Oberfläche: `app/components/typing/typing-app.tsx` (Design 6a–6c), Route
`/frei/typing`. Lernweg: `src/tastschreiben/stations.ts`.

## Fachlich vorhanden und im Design übernommen

- **Lehrgang mit 50 Lektionen** (`src/tastschreiben/curriculum.ts`): jeder Finger
  zuerst isoliert, dann kombiniert, je Reihe; danach Großbuchstaben, Zahlen,
  Zeichen und Umlaute, Wörter, Sätze, zusammenhängender Text. Lektionen werden
  nacheinander freigeschaltet (ab 90 % Genauigkeit).
- **Lernweg mit zehn Stationen** (Design 6c): Die Lektionen sind fachlich zu
  Grundstellung, obere Reihe, untere Reihe, Großbuchstaben, Zahlen, Umlaute und
  Zeichen, alle Tasten, Wörter, Sätze und Abschreibtexte gebündelt. Jede
  Lektion ist genau einer Station zugeordnet (Test in `stations.test.ts`).
- Übung mit Zeichen-Kacheln, Bildschirmtastatur mit Fingerfarben und Hinweis
  auf den nächsten Finger; Genauigkeit vor Tempo; Auswertung mit
  Genauigkeit, Korrekturen, Wörtern pro Minute (nur zur Info) und unsicheren
  Zeichen.
- **Unsichere Tasten** über alle Lektionen und **Tasten-Extra**: eine
  Drill-Runde nur mit diesen Zeichen (neu im Umbau, nutzt den vorhandenen
  Drill-Generator).
- Ziffernblock als optionaler Zusatzweg (7 Übungen), Spiel „Buchstabenregen“
  nach drei Lernschritten.

## Im Design gezeigt, fachlich noch nicht vorhanden

- **Tagesziel „6 von 10 Minuten“ und Serie** (Design 6c): Übungszeit je Tag wird
  nicht erfasst. Grundlage wären Dauer und Tag der Lernereignisse
  (`learningArea: "typing"`). Serie und Abzeichen gehören zur abschaltbaren
  Motivation (Entscheidung 47) und kommen mit dem Dashboard.
- **Sterne je Station, XP und Level** (Design 6a/6c): nicht vorhanden; bewusst
  erst mit der Motivationsschicht (Vault Kap. 23, Entscheidung 39).
- **Heatmap auf der Tastatur** (Design 6c): angezeigt werden die unsicheren
  Zeichen als eingefärbte Tasten-Chips, nicht auf der vollständigen Tastatur.
- **Tier-Coach mit wechselnden Tipps** (Design 6a): Das eigene Tier und die
  Lektionsbeschreibung erscheinen neben der Übung; kontextabhängige Tipps je
  Taste gibt es noch nicht (die Bildschirmtastatur nennt den nächsten Finger).
- **Mobile Übung mit Bildschirmtastatur** (Design 6b): Die Übung läuft auf
  Touchgeräten, ist aber auf physische Tastaturen ausgelegt (Vault Kap. 18:
  „Physische Tastatur und Bildschirmtastatur unterscheiden“ offen).
