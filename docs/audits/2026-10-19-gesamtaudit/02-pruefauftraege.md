# Prüfaufträge und Befundformat – Gesamtaudit 2026-10-19

## Gemeinsame Regeln für alle Prüfinstanzen

1. **Nur lesen.** Keine Änderung an Code, Konfiguration, Tests, `AGENTS.md`,
   bestehender Dokumentation oder dem Vault. Kein `git commit`, kein `git push`,
   kein `git stash`, kein `git checkout` von Dateien.
2. **Einzige Schreibstelle:** die eigene Befunddatei unter
   `docs/audits/2026-10-19-gesamtaudit/` (siehe Tabelle). Hilfsskripte und
   Reproduktionen nur im Scratchpad der Sitzung, nie im Repository.
3. **Keine Produktivsysteme.** Kein Zugriff auf das echte Supabase-Projekt,
   Cloudflare oder Cloud-Konten.
4. **Builds und Browser-Suiten führt die Hauptinstanz aus.** Prüfinstanzen
   dürfen gezielt einzelne Vitest-Dateien ausführen
   (`npx vitest run <pfad>`), aber nicht `npm run build`, `npm run check` oder
   `npm run test:e2e*` (Port- und Dateikonflikte).
5. **Evidenzpflicht:** jeder technische Befund mit Pfad, Funktion und
   Zeilenbereich; Reproduktionsweg angeben. Keine erfundenen Testergebnisse.
6. **Trennung:** bestätigt (reproduziert) / bestätigt (Codeanalyse) /
   begründetes Risiko / offene Frage. Pädagogische Aussagen: forschungsgestützt
   (mit Quelle und Grenzen der Übertragbarkeit) vs. eigene Hypothese.
7. **Priorisierung:** P0 kritisch, P1 hoch, P2 mittel, P3 niedrig. Kosmetik
   nicht aufblasen.
8. **Konzept vs. Implementierung:** Vault/Docs beschreiben Ziele; geprüft wird,
   was der Code tatsächlich tut.

## Befundformat

```markdown
### X-000 – Kurztitel

- **Bereich:**
- **Status:** bestätigt (reproduziert) | bestätigt (Codeanalyse) | begründetes Risiko | offene Frage
- **Schweregrad:** P0 | P1 | P2 | P3
- **Sicherheit der Einschätzung:** hoch | mittel | niedrig
- **Fundstelle:** `pfad/datei.ts:120-145` (`funktionsname`)
- **Beschreibung:**
- **Reproduktion / Prüfweg:**
- **Betroffene Nutzergruppen:**
- **Mögliche Folgen:**
- **Empfehlung:**
- **Aufwand (grob):** S (< 1 Tag) | M (1–3 Tage) | L (> 3 Tage)
- **Erfolgskriterium:**
```

Jede Befunddatei beginnt mit: untersuchte Dateien, ausgeführte Prüfungen (mit
Ergebnis), nicht untersuchte Bereiche. Sie endet mit einer Bewertung der
eigenen Dimensionen (0–5, mit Begründung) und den fünf wichtigsten Befunden.

## Prüfinstanzen

| ID  | Rolle                                            | Befunddatei              | Präfix |
| --- | ------------------------------------------------ | ------------------------ | ------ |
| A   | Softwarearchitektur und Codequalität             | `agent-a-architektur.md` | `A-`   |
| B   | Sicherheit, Datenschutz, Offline-Zuverlässigkeit | `agent-b-sicherheit.md`  | `B-`   |
| C   | QA, UI/UX, Barrierefreiheit (Browser)            | `agent-c-qa-ux.md`       | `C-`   |
| D   | Pädagogik, Lernwissenschaft, Diagnostik          | `agent-d-paedagogik.md`  | `D-`   |
| E   | Schularten, Differenzierung, Unterrichtspraxis   | `agent-e-schularten.md`  | `E-`   |
| F   | Red Team (nach A–E)                              | `agent-f-redteam.md`     | `F-`   |

Die Hauptinstanz führt aus: `npm run check`, Chromium-E2E (`test:e2e:chromium`),
lokale Live-Tests (Chromium, abgefangene RPCs), Designvergleich (nur als
Vergleich) und eigene Stichproben. Ergebnisse stehen in `00-stand.md`.
