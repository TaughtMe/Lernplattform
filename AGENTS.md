# Projektanweisungen für Coding-Agenten

Gemeinsame, verbindliche Regelbasis für Codex und Claude Code (`CLAUDE.md` verweist hierher). Fachregeln stehen im Skill `.agents/skills/lernraum-feature/SKILL.md` und in den Fachdokumenten, nicht hier.

## Branches und Freigabe

- `claude/lernraum-ui-v2` ist der Produktivbranch. Nie direkt darauf pushen.
- Jede Änderung auf einem eigenen Arbeitsbranch umsetzen und nur per Pull Request gegen `claude/lernraum-ui-v2` anbieten. GitHub Actions laufen für Pull Requests; ein Arbeitsbranch ohne Pull Request wird nicht geprüft (Ausnahme: `codex/**`).
- Kein automatisches Merge, kein Auto-Merge und kein Deployment in die Produktivumgebung durch Agenten. Merge und Freigabe entscheidet die projektverantwortliche Person.
- Änderungen mit möglicher Wirkung auf Schülerdaten, Speicherung, Migrationen oder Synchronisierung im Pull Request ausdrücklich als solche kennzeichnen und nach den Risikoregeln des Skills prüfen.
- Vor riskanten Migrationen (Dexie, Supabase) Wiederherstellbarkeit sicherstellen: Migrationskette getestet, Rückweg oder Sicherung beschrieben.

## Prüfungen und CI

Lokale Prüfungen beschleunigen die Arbeit; maßgeblich für Zusammenführung sind die Quality Gates in GitHub (`docs/engineering-quality.md`, Abschnitt „Quality Gates“). Ein nicht bestätigter CI-Lauf gilt nicht als bestanden.

1. **Während der Entwicklung:** nur die betroffenen Unit- und Integrationstests; bei UI-Änderungen gezielte Browser- und Barrierefreiheitstests. Erfolgreiche Tests unveränderten Codes nicht wiederholen.
2. **Vor dem Push:** relevante statische Prüfungen (`format:check`, `lint`, `typecheck`) und Produktions-Build; bei Funktionsänderungen die zugehörigen Regressionstests. Bei Änderungen an `src/domain`, `src/storage`, `src/speech`, `src/integrations` oder `supabase/` lokal das vollständige `npm run check` (Abdeckungsgrenzen, Datenbankverträge).
3. **Nach dem Push:** GitHub Actions führen `npm run check` (Job `code-quality`), die vollständige Cross-Browser-Matrix, Produktions- und Designtests aus; Cloudflare läuft selbstständig. Status nicht wiederholt abfragen, keine Automation, Heartbeat- oder Monitoring-Agenten dafür anlegen.
4. **Bei gemeldetem Fehlschlag** oder auf ausdrücklichen Wunsch: zuerst nur den fehlgeschlagenen Job und sein Log öffnen.

- Ein lokaler `npm run test:design` mit älterem Chromium ist nur im Vergleich aussagekräftig: denselben Lauf auf dem Ausgangsstand (vor den eigenen Commits) wiederholen; nur zusätzliche rote Ansichten zählen als Befund. Maßgeblich ist `design-quality` in GitHub (siehe `docs/design/README.md`).
- Dokumentationsausnahme: Ändert ein Pull Request nur Dokumentation (`docs/` außer `docs/design/`, `obsidian-export/`, `*.md`), entfallen Browser- und Designtests; `code-quality` läuft immer.
- Token-Effizienz schwächt keine Quality Gates ab: Cross-Browser-Matrix, Barrierefreiheit und sicherheitskritische Tests bleiben verbindlich.

## Modell- und Agentenauswahl

Das günstigste Modell wählen, das die Aufgabe zuverlässig löst; höher nur mit konkretem Komplexitäts- oder Qualitätsgrund.

| Aufgabe                                                                   | Claude Code         | Codex (sinngemäß)                     |
| ------------------------------------------------------------------------- | ------------------- | ------------------------------------- |
| Dokumentation, Formatierung, klar spezifizierte kleine Änderungen         | Haiku               | kleinstes Modell, niedriges Reasoning |
| Normale Implementierung, React-Komponenten, Tests, Integration, Reviews   | Sonnet              | Standardmodell, mittleres Reasoning   |
| Komplexe Architektur, kritische Migrationen, schwierige Sicherheitsfragen | Opus nur bei Bedarf | höchstes Reasoning nur bei Bedarf     |

Die Bezeichnungen gelten, soweit die Ausführungsumgebung sie anbietet.

- Opus nicht routinemäßig für Implementierung oder Code-Reviews.
- Subagenten nur für klar abgrenzbare Teilaufgaben; kleine Änderungen direkt erledigen. Höchstens zwei ausführende Subagenten gleichzeitig und nur bei unabhängigen Aufgaben.
- Nach zwei unterschiedlichen erfolglosen Lösungsansätzen oder einem kritischen Architekturkonflikt anhalten und eskalieren; keine Reparaturschleifen.
- Ist das Modellkontingent erschöpft: Stand im Übergabeformat festhalten und stoppen. Keine unautorisierte kostenpflichtige API-Nutzung oder Modellsubstitution.

## Kontext sparsam halten

- Projektwissen aufgabenbezogen laden: `docs/README.md` als Index nutzen, nur relevante Abschnitte lesen, den Vault `obsidian-export/` nie vollständig laden.
- Ein neuer Agent erhält nur: Aufgabe mit Akzeptanzkriterien, relevante Dateipfade, betroffene Schnittstellen und Architekturregeln, Arbeitsbranch und Ausgangscommit, bekannte Blocker. Keine Chatverläufe, keine Rohlogs.
- Für zusammenhängende Folgeaufträge einen vorhandenen Agenten weiterverwenden, wenn das Kontextaufbau spart.
- Rückmeldungen knapp: Ergebnis, Änderungen, Prüfungen, Blocker.

## Übergabe unterbrochener Arbeit

Nur bei tatsächlichem Bedarf (längere Arbeit, Abbruch, Kontingentende), nicht nach jeder kleinen Änderung. Ablageort: Statusabschnitt des zugehörigen `docs/umsetzungsplan-*.md`, sonst die Pull-Request-Beschreibung. Keine Sitzungsprotokolle.

```
Übergabe <Datum>
Auftrag/Stand: …
Branch / letzter Commit: …
Erledigt: … (nur tatsächlich abgeschlossene Schritte)
Prüfungen: <Befehl> → <Ergebnis>
Offen/Blocker: …
Nächster Schritt: …
```

Ausführliche Begründung der Prüfstrategie: `obsidian-export/Lernplattform/21 - Qualitätsgrundlage und Freigabe/Anwendung.md`.
