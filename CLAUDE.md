# Lernraum – Einstieg für Claude Code

@AGENTS.md

`AGENTS.md` ist die gemeinsame, verbindliche Regelbasis für Claude Code und Codex. Diese Datei ergänzt nur den Einstieg; bei Abweichungen gilt `AGENTS.md`.

## Produktivbranch schützen

- Produktivbranch ist der GitHub-Standardbranch (`git ls-remote --symref origin HEAD`, derzeit `claude/lernraum-ui-v2`): nie direkt pushen; mergen nur auf ausdrücklichen Auftrag und bei grünen Pflicht-Checks, nie eigenständig deployen.
- Arbeit auf eigenem Branch, Übernahme nur per Pull Request.

## Fachliche Arbeit

- Features, UI-Änderungen und Fehlerbehebungen: Skill `.agents/skills/lernraum-feature/SKILL.md` lesen und befolgen.
- Architektur: `docs/architecture.md`; Coding-, Test- und Quality-Gate-Standard: `docs/engineering-quality.md`; Geräte: `docs/device-support.md`; Gestaltung: `docs/design/README.md`.
- `docs/README.md` ist der Index der maßgeblichen Quellen.

## Kontext sparsam laden

- Nur aufgabenbezogene Dokumente und Abschnitte lesen; `obsidian-export/` gezielt durchsuchen, nie vollständig laden.
- Modellwahl, Subagenten und Übergabeformat: siehe `AGENTS.md`.

## Mehrere Agenten

Gilt, wenn eine Hauptsitzung Arbeit an Subagenten verteilt oder mehrere Sitzungen am selben Plan arbeiten.

- **Eine Tafel je Vorhaben.** Die Statustafel im zugehörigen `docs/umsetzungsplan-*.md` ist die einzige Quelle für „wer macht was“ (derzeit `docs/umsetzungsplan-vision-etappe-1.md`). Vor dem Start den Baustein auf `in Arbeit (<Agent>)` setzen; einen Baustein, der schon `in Arbeit` steht, nicht anfassen.
- **Getrennte Dateien.** Parallel laufen nur Bausteine ohne gemeinsame Dateien. Die Hauptsitzung nennt jedem Subagenten seine Dateien bzw. Ordner; gemeinsam genutzte Stellen (`src/domain/release.ts`, `README.md`, Entscheidungsprotokoll, die Statustafel selbst) ändert nur die Hauptsitzung.
- **Eigener Worktree.** Ausführende Subagenten arbeiten isoliert (`isolation: "worktree"`), committen dort und pushen nicht. Die Hauptsitzung führt ihre Commits zusammen und pusht.
- **Höchstens zwei** ausführende Subagenten gleichzeitig (`AGENTS.md`); Modell nach der Tabelle dort.
- **Rückmeldung** im Format: Baustein · Commit(s) · geänderte Dateien · was wie umgesetzt · Abweichung vom Bericht oder offene Frage. Die Hauptsitzung trägt das in die Spalte „Wie / Commit“ ein.
- **Prüfen gesammelt.** Subagenten führen nur Typecheck, Lint und die Unit-Tests ihrer Dateien aus. `npm run check` und Browser-Tests laufen einmal in der Hauptsitzung, nachdem mehrere Bausteine zusammengeführt sind.
- **Entscheidungen bleiben beim Entwickler.** Ändert ein Baustein eine Freigabestufe oder nimmt er eine Festlegung zurück, hält der Subagent an und meldet es; die Hauptsitzung fragt nach.
