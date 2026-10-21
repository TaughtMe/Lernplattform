# Arbeitsstand – Gesamtaudit Lernraum (begonnen 2026-10-19)

Dieses Dokument macht das Audit nach einer Unterbrechung fortsetzbar. Es wird
von der Hauptinstanz nach jeder Phase aktualisiert.

## Rahmen

- Untersuchter Commit: `c30b916` (Branch `claude/gallant-mayer-2rz18j`)
- Vom Nutzer festgelegt: keine Commits/Pushes; Lieferung der Dokumente zum
  Herunterladen; maßgeblicher Vault liegt im OneDrive des Nutzers, bearbeitet
  wird die Repository-Kopie `obsidian-export/Lernplattform/`.
- Keine Änderungen an Anwendungscode. Build-Läufe erzeugen `public/sw.js` und
  `public/version.json` neu; beide werden am Ende per `git checkout` auf den
  Commit-Stand zurückgesetzt.

## Phasenstatus

| Phase                               | Status                                 | Ergebnis                                   |
| ----------------------------------- | -------------------------------------- | ------------------------------------------ |
| I Bestandsaufnahme                  | abgeschlossen                          | `01-bestandsaufnahme.md`                   |
| Prüfaufträge                        | abgeschlossen                          | `02-pruefauftraege.md`                     |
| II Technik (A, B, G), QA (C)        | abgeschlossen (20.10.)                 | `agent-a/b/c/g-*.md`                       |
| III Pädagogik (D), V Schularten (E) | abgeschlossen (20.10.)                 | `agent-d-*.md`, `agent-e-*.md`             |
| VII Red Team (F) + Gegenprüfung     | abgeschlossen (20.10., dritter Anlauf) | `agent-f-redteam.md`                       |
| Abschlussbericht                    | abgeschlossen                          | `../2026-10-19-lernraum-gesamtaudit.md`    |
| VIII Dokumentation/Vault            | abgeschlossen                          | Änderungsprotokoll im Bericht, Abschnitt O |

## Ausgeführte Prüfungen der Hauptinstanz

| Prüfung                                                                                                                                                    | Ergebnis                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                                                                   | erfolgreich                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run check` (2 min 38 s)                                                                                                                               | grün: Prettier, ESLint, Typecheck, 178 Testdateien / 1683 Tests bestanden, Abdeckung 96,1 % Statements / 91,5 % Branches (nur `src/domain`, `src/storage`, `src/speech`, `src/integrations`), 19 Datenbanktests, Build, 13 Render-Tests                                                                                                                                                                                                                               |
| Lokaler Produktionsserver (`vinext start`)                                                                                                                 | nicht startbar (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, Cloudflare-Build); Browserprüfungen laufen gegen `vinext dev` auf Port 3002                                                                                                                                                                                                                                                                                                                                         |
| Chromium-E2E (Projekte desktop-chromium, mobile-chrome, minimum-width + Zusatzprojekt iPad-Mini-Viewport in Chromium), Dev-Server Port 3002, Chromium 1194 | 346 bestanden, 30 übersprungen, 4 fehlgeschlagen (18 min). Alle 4 Fehlschläge = derselbe Test `platform-quality.spec.ts:1029`, der `http://localhost:3000` fest einträgt statt `baseURL` zu nutzen. Mit TCP-Weiterleitung 3000→3002 erneut ausgeführt: 4/4 bestanden. Ergebnis: keine Produktfehler in der Chromium-Suite. WebKit/Firefox nicht ausführbar.                                                                                                           |
| Lokale Live-Tests (`e2e/live`, abgefangene Supabase-RPCs), 20.10. nachmittags                                                                              | 68 bestanden, 7 übersprungen, 0 fehlgeschlagen (3,4 min; Projekte desktop-chromium, mobile-chrome, minimum-width). Die Überspringungen sind im Test selbst so vorgesehen (Zwei-Finger-Geste nur auf Touch-Geräten, Tastaturweg nur am Computer). Dev-Server auf Port 3002 mit den Umgebungsvariablen aus `playwright.live.config.ts`, Weiterleitung 3001→3002 wegen eines fest eingetragenen Ports in `writing-relief.spec.ts:94`. Kein echtes Supabase, kein WebKit. |
| Designvergleich (`test:design`)                                                                                                                            | bewusst nicht ausgeführt: laut `AGENTS.md` nur als Vergleich vor/nach eigenen Änderungen aussagekräftig; das Audit ändert keinen Code                                                                                                                                                                                                                                                                                                                                 |

## Beobachtungen der Hauptinstanz (eingeordnet in A-005, A-006, A-014, B-013)

- Abdeckungsschwellen gelten nicht für `app/` (38 836 Zeilen) und nicht für
  `src/tastschreiben/`.
- Eingecheckte `public/sw.js`/`public/version.json` tragen einen veralteten
  Fingerabdruck (zuletzt in `a8834d7` erzeugt, danach Quelländerungen); der
  Build erzeugt ihn ohnehin neu.
- Playwright blockiert Service Worker in der E2E-Suite.

## Eingegangene Berichte und Gegenprüfung durch die Hauptinstanz

| Bericht                  | Eingang (20.10.) | Befunde                                                       | Unabhängig nachgeprüft durch Hauptinstanz                                                                                                                                                                                                                                       |
| ------------------------ | ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Architektur            | 04:23            | 18 (2 × P1, 9 × P2, 7 × P3)                                   | A-004 per Codelesung bestätigt: `learning-word-progress.ts:35-41` steigt bei jedem unabhängigen Erfolg ohne Fälligkeitsprüfung; `storage/daily-plan.ts:134` nutzt dieses `dueAt` für die Tagesportion                                                                           |
| B Sicherheit/Offline     | 04:27            | 24 (7 × P1, 11 × P2, 6 × P3)                                  | B-001 durch erneutes Ausführen der Reproduktion bestätigt: `ZodError` bei `exportPersonalLearningBackup` (`src/storage/personal-backup.ts:117`), Schema `personalBackupDeckSchema` ohne `folderId`                                                                              |
| D Pädagogik              | 11:16            | 16 (2 × P1, 10 × P2, 4 × P3)                                  | D-001 per Codelesung bestätigt (`usedHelp` nur über Hilfe-Schaltfläche, Stufe 1 zählt als unabhängiger Erfolg); D-006 Punkt 1 per Skript bestätigt (Hase, Nase, Rose, Haus, Reise, lesen, Gras, Glas, Preis in der Box „s, ss und ß“ mit Regeltext „Nach langem Vokal steht ß“) |
| E Schularten/Praxis      | 12:29            | 10 (3 × P1, 6 × P2, 1 × P3)                                   | E-001 per Codelesung bestätigt (`isWritingReliefActive`, `class-seal.ts:150-180`: erste passende Mitgliedschaft des Geräts genügt); E-005 per Suche bestätigt (Krieg ×2, Krieger, Gewehr, Friedhof, Dieb ×2, Diebstahl, quälen, lähmen in `german-learning-content.ts`)         |
| C QA/UX/Barrierefreiheit | 12:49            | 15 (1 × P1, 8 × P2, 6 × P3)                                   | C-006 per Codelesung bestätigt: `app/views/lehrer/teacher-frame.module.css` (`.frame` mit `height:100%`, `overflow:hidden`), keine Druckregel für den Lehrerrahmen; einzige Druckregel in `app/ui/lernraum-ui.css:3014`                                                         |
| G Korrektheit            | 12:49            | 14 (2 × P1, 11 × P2, 1 × P3)                                  | G-001 per Codelesung bestätigt: `src/domain/learning-word.ts:14` trennt nur an Zeilenumbruch, Komma und Semikolon (`/[\n,;]+/u`)                                                                                                                                                |
| F Red Team               | 17:34            | Gegenprüfung aller 17 P1, 2 neue Befunde (F-001 P2, F-002 P3) | F-001 per Codelesung bestätigt: `learning-word-progress.ts:36-55` hält bei richtiger Antwort mit Hilfe die Box und setzt den vollen Abstand                                                                                                                                     |

## Unterbrechung am 20.10.2026

Der Workflow-Lauf `wf_6bfbba35-0b2` endete um ca. 04:40 UTC: C, D, E, G, F und V1
scheiterten an einem Nutzungslimit der Sitzung, bevor sie Berichte schrieben.
Erhalten sind A und B (Ergebnisse im Workflow-Journal zwischengespeichert) sowie
Teilskripte von C im Scratchpad (`repro-c/`). Fortsetzung ab 10:51 UTC per
Wiederaufnahme desselben Workflows: A und B werden aus dem Zwischenspeicher
übernommen und nicht erneut ausgeführt; C, D, E, G erhalten einen
Fortsetzungshinweis mit den bereits vorliegenden Befunden, damit nichts doppelt
geprüft wird. Bereits abgeschlossene Testreihen (`npm run check`, Chromium-E2E)
werden nicht wiederholt.

## Zweite Unterbrechung und Neuorganisation (20.10.2026, 12:10 UTC)

Der zweite Lauf lieferte D (Pädagogik); C, E, G, F, V1 und V2 scheiterten erneut am
Nutzungslimit. Gegenmaßnahmen ab 12:15 UTC:

- Neuer, schlanker Folgeworkflow `wf_36f30717-bae` nur für C, E, G und das Red Team
  F; A, B und D werden als fertige Berichte übergeben und nicht erneut ausgeführt.
- Alle Prüfinstanzen schreiben ihre Befunddatei ab dem ersten Befund fortlaufend
  (Ergebnissicherung bei erneutem Abbruch).
- Die zusätzlichen Gegenprüfer V1/V2 entfallen vorerst; das Red Team prüft alle
  P0/P1-Befunde. Die Hauptinstanz ergänzt eigene Stichproben (siehe Tabelle oben).
- Vorarbeit der abgebrochenen Läufe (Skripte, Screenshots, Lesbarkeitsmessung in
  `repro-c/`, `repro-e/`) wird wiederverwendet.
- Sicherungskopie aller Audit-Dateien im Scratchpad (`backup/`).

## Dritter Anlauf und Abschluss (20.10.2026, ab 17:10 UTC)

- C, E und G lagen um 12:50 UTC vor. Das Red Team brach erneut am
  Nutzungslimit ab, hatte aber die Gegenprüfungen zu A-001 bis B-011 bereits
  gesichert. Fortsetzung per Wiederaufnahme desselben Workflows: C, E und G
  kamen aus dem Zwischenspeicher, nur F lief mit einem Fortsetzungshinweis
  weiter und hat die vorhandenen Urteile übernommen, nicht neu geprüft.
- Ergebnis F: keine P1-Behauptung widerlegt; A-001, B-003 (im Pilot), B-008,
  C-006 und G-011 auf P2 gesenkt; A-004/D-001 und B-010/E-001 als je ein
  Befund geführt; D-003, E-002, E-003 als Konzeptlücken; E-005 auf P3; zwei
  neue Befunde F-001 (P2) und F-002 (P3).
- Endstand: 99 Befunde, 0 × P0, 12 × P1, 60 × P2, 27 × P3.
- Lokale Live-Tests nachgeholt (siehe Tabelle oben).
- Abschlussbericht aus Bausteinen zusammengesetzt; vollständiger Katalog in
  `befundkatalog.md` (erzeugt aus den Prüfberichten und den Urteilen der
  Gegenprüfung).
- Dokumentation: Auditprotokoll im Vault angelegt, Übersicht und
  Entscheidungsindex ergänzt, datierte Hinweise in `docs/architecture.md` und
  `docs/laufdiktat-pilot-product-contract.md`, Korrektur zum Lernstandscheck in
  `01-bestandsaufnahme.md`.
- Dieses Dokument wurde beim Abschluss durch einen Skriptfehler geleert und
  aus der Sitzung wiederhergestellt; inhaltlich ist nichts verloren.

## Abschlussprüfung der Dokumentation

| Prüfung                            | Ergebnis                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prettier --check docs`            | alle Dateien im Prettier-Stil                                                                                                                                                                                                              |
| Wikilinks im Vault (Skript)        | 172 Links, keiner defekt; einzige Meldung ist der bekannte Bildanhang in Vault 20, den Obsidian über den Dateinamen auflöst                                                                                                                |
| Markdown-Links in `docs/` (Skript) | 68 Links, keiner defekt                                                                                                                                                                                                                    |
| `git status` / `git diff`          | nur Dokumentation: 2 Dateien in `docs/` und 25 Vault-Notizen ergänzt (keine Zeile entfernt); neue Dateien in `docs/audits/`, `docs/README.md` und zwei neue Vault-Notizen; kein Anwendungscode, keine Konfiguration, `public/` unverändert |
| Commit, Push                       | keine (Vorgabe des Nutzers)                                                                                                                                                                                                                |

## Nächste Schritte

Keine offenen Audit-Schritte. Die Übernahme in den OneDrive-Vault erfolgt von
Hand anhand der Dateizuordnung im Lieferpaket.
