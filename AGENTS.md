# Projektanweisungen für Codex

## Prüfungen und CI

- Wähle lokale Prüfungen proportional zu Risiko und Umfang der Änderung. Führe während der Umsetzung bevorzugt gezielte Tests für die betroffenen Funktionen aus.
- Prüfe vor einem Push die relevanten statischen Checks und den Produktions-Build. Ergänze bei UI-Änderungen fokussierte Browser- und Barrierefreiheitstests.
- Nach einem Push dürfen GitHub Actions und Cloudflare selbstständig weiterlaufen. Frage ihren Status nicht wiederholt ab und erstelle dafür keine Automation oder Heartbeat-Aufgabe.
- Prüfe externe CI-Ergebnisse nur auf ausdrücklichen Wunsch oder wenn ein konkreter Fehlschlag gemeldet wurde. Öffne dann zuerst nur den fehlgeschlagenen Job und sein Log.
- Die vollständige Cross-Browser-Suite bleibt in GitHub verpflichtend. Token-Effizienz darf die geltenden Quality Gates nicht abschwächen.
- Ein lokaler `npm run test:design` mit älterem Chromium ist nur im Vergleich aussagekräftig: Denselben Lauf auf dem Ausgangsstand (vor den eigenen Commits) wiederholen; nur zusätzliche rote Ansichten zählen als Befund. Maßgeblich ist `design-quality` in GitHub (siehe `docs/design/README.md`).
- Ausnahme: Ändert ein Pull Request nur Dokumentation (`docs/` außer `docs/design/`, `obsidian-export/`, `*.md`), entfallen Browser- und Designtests; `code-quality` läuft immer. Kein Browser- oder Designtest liest diese Dateien.

Die ausführliche Begründung steht im Vault unter `obsidian-export/Lernplattform/21 - Qualitätsgrundlage und Freigabe/Anwendung.md`.
