# Lernraum – Einstieg für Claude Code

@AGENTS.md

`AGENTS.md` ist die gemeinsame, verbindliche Regelbasis für Claude Code und Codex. Diese Datei ergänzt nur den Einstieg; bei Abweichungen gilt `AGENTS.md`.

## Produktivbranch schützen

- Produktivbranch ist der GitHub-Standardbranch (`git ls-remote --symref origin HEAD`, derzeit `claude/lernraum-ui-v2`): nie direkt pushen, nie selbst mergen oder deployen.
- Arbeit auf eigenem Branch, Übernahme nur per Pull Request.

## Fachliche Arbeit

- Features, UI-Änderungen und Fehlerbehebungen: Skill `.agents/skills/lernraum-feature/SKILL.md` lesen und befolgen.
- Architektur: `docs/architecture.md`; Coding-, Test- und Quality-Gate-Standard: `docs/engineering-quality.md`; Geräte: `docs/device-support.md`; Gestaltung: `docs/design/README.md`.
- `docs/README.md` ist der Index der maßgeblichen Quellen.

## Kontext sparsam laden

- Nur aufgabenbezogene Dokumente und Abschnitte lesen; `obsidian-export/` gezielt durchsuchen, nie vollständig laden.
- Modellwahl, Subagenten und Übergabeformat: siehe `AGENTS.md`.
