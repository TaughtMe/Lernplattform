# Projektanweisungen für KI-Agenten (Codex, Claude Code)

## Prüfungen und CI

- Wähle lokale Prüfungen proportional zu Risiko und Umfang der Änderung. Führe während der Umsetzung bevorzugt gezielte Tests für die betroffenen Funktionen aus.
- Prüfe vor einem Push die relevanten statischen Checks und den Produktions-Build. Ergänze bei UI-Änderungen fokussierte Browser- und Barrierefreiheitstests.
- Nach einem Push dürfen GitHub Actions und Cloudflare selbstständig weiterlaufen. Frage ihren Status nicht wiederholt ab und erstelle dafür keine Automation oder Heartbeat-Aufgabe.
- Prüfe externe CI-Ergebnisse nur auf ausdrücklichen Wunsch oder wenn ein konkreter Fehlschlag gemeldet wurde. Öffne dann zuerst nur den fehlgeschlagenen Job und sein Log.
- Die vollständige Cross-Browser-Suite bleibt in GitHub verpflichtend. Token-Effizienz darf die geltenden Quality Gates nicht abschwächen.
- Ein lokaler `npm run test:design` mit älterem Chromium ist nur im Vergleich aussagekräftig: Denselben Lauf auf dem Ausgangsstand (vor den eigenen Commits) wiederholen; nur zusätzliche rote Ansichten zählen als Befund. Maßgeblich ist `design-quality` in GitHub (siehe `docs/design/README.md`).
- Ausnahme: Ändert ein Pull Request nur Dokumentation (`docs/` außer `docs/design/`, `obsidian-export/`, `*.md`), entfallen Browser- und Designtests; `code-quality` läuft immer. Kein Browser- oder Designtest liest diese Dateien.

Die ausführliche Begründung steht im Vault unter `obsidian-export/Lernplattform/21 - Qualitätsgrundlage und Freigabe/Anwendung.md`.

## Modellwahl und Delegation an Haiku

Leichte, klar abgegrenzte Aufgaben gehen an ein kleines Modell (Claude Haiku), damit das Hauptmodell (Sonnet bzw. Opus) für Fachlogik, Architektur und Sicherheit frei bleibt. In Claude Code geschieht das über den Subagenten `haiku-helfer` (`.claude/agents/haiku-helfer.md`, `model: haiku`); `CLAUDE.md` bindet diese Datei ein.

### Regeln

- Haiku bekommt nur Aufgaben mit **eindeutigem Ergebnis und eindeutiger Prüfung**: ein Kommando, ein Test oder ein Diff, der ohne Fachwissen zu beurteilen ist.
- Der Auftrag nennt die betroffenen Dateien, das erwartete Ergebnis und das Prüfkommando. Haiku soll nicht selbst entscheiden, _was_ zu tun ist, nur _wie_ es mechanisch umgesetzt wird.
- Das Hauptmodell liest den Diff, lässt die Prüfung laufen und verantwortet Commit und Push. Haiku committet und pusht nicht selbst.
- Ist der Auftrag unklar, berührt er unerwartet Dateien außerhalb des Auftrags oder schlägt die Prüfung zweimal fehl, bricht Haiku ab und meldet den Stand zurück, statt zu raten.
- Die Quality Gates gelten unverändert. Delegation spart Tokens, nicht Prüfungen.

### Aufgaben, die Haiku übernehmen kann

**Suchen und Zusammenfassen (nur lesend)**

1. Fundstellen suchen: Wo wird eine Funktion, ein Typ, eine CSS-Klasse (`ui-*`, `is-*`) oder eine Route verwendet? Welche Testdateien decken ein Modul ab?
2. Bestandsaufnahmen als Liste: Domain-Module unter `src/domain/` ohne zugehörige `*.test.ts`, E2E-Specs je Route, Umsetzungspläne unter `docs/` mit ihrem Status.
3. Logs kürzen: Aus einem fehlgeschlagenen CI-Job-Log oder einer langen lokalen Test-, Lint- oder Typecheck-Ausgabe die eigentlichen Fehlermeldungen mit Datei und Zeile herausziehen. Die Ursachenanalyse bleibt beim Hauptmodell.
4. Diff zusammenfassen: Commit-Nachricht, PR-Beschreibung oder Versionsnotiz als Entwurf aus einem fertigen Diff schreiben.

**Mechanische Pflege mit festem Kommando**

5. Formatierung und Lint-Autofix: `npm run format`, `npx eslint --fix` für rein mechanische Befunde; danach `npm run format:check` und `npm run lint`.
6. CSS-Modul-Typen neu erzeugen: `npm run css-types`, Prüfung mit `npm run typecheck`.
7. Freigabe-Tabelle im `README.md` aus `releaseStagesMarkdown()` (`src/domain/release.ts`) zwischen die Marker setzen, `npx prettier --write README.md`, Prüfung mit `npx vitest run src/domain/release-docs.test.ts`.
8. Versionsanhebung nach Vorgabe des Hauptmodells: `npm version <x.y.z> --no-git-tag-version`.
9. App-Icons mit unverändertem Prefix neu erzeugen: `node scripts/generate-app-icons.mjs`, wenn sich die Quellgrafik geändert hat. Einen neuen Prefix samt Anpassung von Manifest, `app/layout.tsx` und Service-Worker-Vorlage legt das Hauptmodell fest.

**Dokumentation**

10. Links prüfen und reparieren: relative Markdown-Links in `docs/` und Wikilinks in `obsidian-export/` auf existierende Ziele prüfen; defekte Links melden oder bei eindeutigem Ziel korrigieren.
11. Verzeichnisse und Übersichten nachziehen, z. B. neue Dateien in `docs/README.md` oder `docs/inhalte/README.md` eintragen.
12. Rechtschreibung und Tippfehler in Dokumentation und Code-Kommentaren korrigieren, ohne Formulierungen inhaltlich umzuschreiben.
13. Frontmatter im Vault (`stand`, `umsetzungsstand`, Tags) nach einer vom Hauptmodell genannten Änderung aktualisieren.

**Code mit vorgegebenem Muster**

14. Umbenennungen und Importpfad-Änderungen über mehrere Dateien, wenn altes und neues Muster exakt vorgegeben sind; Prüfung mit `npm run typecheck` und `npm run lint`.
15. Zusätzliche Testfälle nach bestehendem Muster, wenn die Erwartungswerte vorgegeben sind oder eindeutig aus der Dokumentation folgen (z. B. weitere Tabellenfälle in einer vorhandenen `src/domain/*.test.ts`); Prüfung mit `npx vitest run <datei>`.
16. Test-Fixtures und Beispieldaten nach einem vorhandenen Zod-Schema anlegen, wenn Umfang und Inhalt vorgegeben sind.
17. Veraltete Testselektoren in E2E-Specs an umbenannte Beschriftungen anpassen, wenn alte und neue Beschriftung genannt sind.

### Aufgaben, die beim Hauptmodell bleiben

- Lernlogik und pädagogische Regeln: Leitner-Boxen, LernBox-Schonfrist, adaptive Merkstrecke, Tagesportion, Bewertung von Eingaben.
- Lernereignisse, Replay und Projektionen, Dexie-Migrationen, Datenformat-Versionen, Export und Wiederherstellung.
- Sicherheit und Datenschutz: Supabase, Rollen und Token, Raum- und Klassen-Siegel, Synchronisation, Web Crypto.
- Service-Worker-Logik (`scripts/service-worker.template.js`), Caching und Offlineverhalten.
- Oberfläche und Barrierefreiheit: Layout, Design-Referenzen beurteilen, Fokus- und Screenreader-Verhalten.
- Texte, die Schüler oder Lehrkräfte in der App lesen.
- Ursachenanalyse fehlgeschlagener Tests, Rückschau-Maßnahmen (`/rueckschau`), Abhängigkeits-Updates, Architekturentscheidungen und Umsetzungspläne.
- Alles, was im Auftrag nicht eindeutig beschrieben werden kann.
