---
name: rueckschau
description: Kurze Rückschau nach einem Pull Request, einem roten CI-Lauf oder einer längeren Arbeitssitzung. Findet Stolperstellen, die eine zusätzliche Runde gekostet haben, prüft, ob sie sich wiederholen, und schlägt vor, sie in eine automatische Prüfung (Test, Lint-Regel, Skript-Check, CI-Schritt) oder notfalls in eine kurze Regel in AGENTS.md zu verwandeln. Ändert Regeln und Prüfungen erst nach Freigabe.
---

# Rückschau

Ziel: Fehler, die sich wiederholen, sollen künftig keine Tokens mehr kosten.
Eine automatische Prüfung kostet in keiner Sitzung Tokens und greift immer;
eine Regel in `AGENTS.md` wird in jeder Sitzung mitgelesen. Deshalb gilt:
**erst automatisieren, nur im Ausnahmefall eine Regel schreiben.**

Halte die Rückschau selbst sparsam: wenige gezielte Befehle, keine
vollständigen Logs im eigenen Kontext.

## 1. Material sammeln

Delegiere das Sammeln an den Subagenten `haiku-helfer`, Auftrag etwa:

> Fasse für den Branch `<branch>` gegenüber `origin/main` zusammen:
> (a) Commits mit Nachbesserungen (z. B. „neu erzeugt“, „Prettier“, „Lint“,
> „Test angepasst“, „Fix“, Merge-Konflikte), (b) die Fehlermeldungen aus dem
> genannten CI-Log, falls eines vorliegt, jeweils mit Datei und Zeile,
> (c) offene oder umgesetzte Review-Hinweise. Höchstens 20 Zeilen, keine Bewertung.

Ergänze aus der laufenden Sitzung, was zusätzliche Runden gekostet hat:
roter CI-Lauf, vergessener Schritt, falsche Annahme über den Code, lange
Suche, Rückfrage, die sich aus der Doku hätte beantworten lassen.

## 2. Wiederholung prüfen

Lies `docs/agenten-rueckschau.md` und suche im Verlauf nach ähnlichen Fällen,
z. B. `git log --oneline -300 | grep -i "<stichwort>"`. Ein Befund zählt als
wiederkehrend, wenn er dort schon steht oder mindestens zweimal im Verlauf
vorkommt.

## 3. Maßnahme wählen

Für jeden Befund die erste passende Stufe:

1. **Automatische Prüfung:** Test, ESLint-Regel, `--check`-Modus eines
   Skripts, CI-Schritt in `.github/workflows/quality.yml` oder ein
   Claude-Code-Hook.
2. **Ursache beseitigen:** Skript, Kommando oder Ablauf so ändern, dass der
   Schritt entfällt (z. B. generierte Dateien nicht mehr einchecken).
3. **Regel in `AGENTS.md`:** nur bei wiederkehrenden Befunden, die sich nicht
   automatisieren lassen; eine Zeile, konkret, mit Datei oder Kommando.
4. **Nur protokollieren:** einmalige Befunde.

Prüfe außerdem in die Gegenrichtung: Regeln in `AGENTS.md`, die inzwischen
eine automatische Prüfung abdeckt, werden zur Streichung vorgeschlagen.
Ebenso Aufgaben in der Haiku-Liste, bei denen `haiku-helfer` wiederholt
abbrechen musste.

## 4. Vorschlag vorlegen

Gib dem Nutzer eine kurze Liste: Befund, Häufigkeit, vorgeschlagene Maßnahme
mit Stufe, geschätzter Aufwand. Setze nichts davon ohne Freigabe um.

Grenzen:

- Quality Gates werden nie abgeschwächt, Tests nie übersprungen oder gelockert.
- `AGENTS.md`, `CLAUDE.md`, `.claude/agents/` und `.claude/skills/` werden nur
  nach ausdrücklicher Freigabe geändert.
- Fachliche Entscheidungen (Lernlogik, Datenschutz, Oberfläche) sind keine
  Rückschau-Maßnahmen, sondern eigene Aufgaben.

## 5. Protokollieren

Trage jeden Befund in die Tabelle in `docs/agenten-rueckschau.md` ein oder
erhöhe bei einem bekannten Befund die Häufigkeit. Setze den Status auf
`umgesetzt`, sobald die Maßnahme gemergt ist. Erledigte Zeilen, die älter als
drei Monate sind, werden entfernt, damit die Datei kurz bleibt.
