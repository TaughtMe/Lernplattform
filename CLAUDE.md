# Projektanweisungen für Claude Code

Die verbindlichen Anweisungen für alle KI-Agenten stehen in `AGENTS.md` und
gelten hier unverändert:

@AGENTS.md

## Ergänzungen für Claude Code

- Leichte Aufgaben aus der Liste „Aufgaben, die Haiku übernehmen kann“ in
  `AGENTS.md` gehen an den Subagenten `haiku-helfer`
  (`.claude/agents/haiku-helfer.md`). Der Auftrag nennt Dateien, erwartetes
  Ergebnis und Prüfkommando.
- Nach der Rückmeldung von `haiku-helfer` liest das Hauptmodell den Diff,
  führt die Prüfung selbst aus und übernimmt Commit und Push.
- Nach einem Pull Request, einem roten CI-Lauf oder einer längeren Sitzung
  bietet das Hauptmodell die Rückschau `/rueckschau` an
  (`.claude/skills/rueckschau/SKILL.md`). Sie verwandelt wiederkehrende
  Stolperstellen bevorzugt in automatische Prüfungen statt in neue Regeln.
