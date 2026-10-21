# Bestandsaufnahme (Phase I) – Gesamtaudit 2026-10-19

Arbeitsdokument der Hauptinstanz. Dient allen Prüfinstanzen als gemeinsame
Ausgangsbasis, damit nicht jede Instanz dieselben Dateien erneut erschließt.
Maßgeblich für Befunde ist immer der Code, nicht diese Zusammenfassung.

## Untersuchter Stand

- Repository: `TaughtMe/Lernplattform`, Branch `claude/gallant-mayer-2rz18j`
- Commit: `c30b916464c2c3dfe976ae828ad8ca851b4c8736` (2026-10-19, „docs: Lokaler
  Designvergleich mit älterem Chromium nur im Vergleich werten“)
- App-Version laut `package.json`: `0.8.0`
- Umgebung des Audits: Linux-Container, Node 22.22.0, npm 10.9.4, nur Chromium
  (kein WebKit, kein Firefox, keine echten iPads)

## Technologie

- Vinext (`vinext@1.1.0`, Vite 8, `@vitejs/plugin-rsc`) als Next.js-kompatibles
  App-Router-Framework, ausgeliefert als Cloudflare Worker (`worker/index.ts`)
- React 19.3, TypeScript 5.9 (strict), Zod 4, Dexie 4 (IndexedDB)
- Supabase (`@supabase/supabase-js` 2.117) nur für Live-Räume (Laufdiktat) und
  den verschlüsselten 24-h-Inhaltsübergaberaum; Migrationen in
  `supabase/migrations/` (9 Dateien)
- PWA mit selbst generiertem Service Worker (`scripts/generate-service-worker.mjs`
  → `public/sw.js`)
- Cloud-Abgleich (Google Drive, OneDrive, WebDAV) in
  `src/integrations/cloud-sync/` (HLC, Merge, Envelope-Verschlüsselung)
- Tests: Vitest (+ fake-indexeddb, fast-check, Testing Library),
  Playwright (7 Projekte inkl. WebKit/iPad Mini), axe-core, PGlite-Datenbanktests,
  Design-Pixelvergleich (`test:design`)

## Umfang (Zeilen, ohne Tests)

| Bereich      | Zeilen |
| ------------ | -----: |
| `app/`       | 38 836 |
| `src/`       | 21 942 |
| `supabase/`  |  1 238 |
| Tests gesamt | 39 314 |

Größte Dateien: `src/storage/personal-learning-events.ts` (1263),
`src/domain/textbox-library.ts` (1031, Textinhalte), `app/raum/spiel/live-game.tsx`
(970), `app/components/teacher-workspace-manager.tsx` (948),
`app/frei/mathematics/mental-math-app.tsx` (902), `app/components/cloud-sync-setup.tsx`
(895), `app/components/learning-word-app.tsx` (873), `app/components/live-room-join.tsx`
(860), `app/components/learning-box-app.tsx` (840).

## Schichten

- `src/domain/` – framework-unabhängige Fachlogik (Leitner, Mathe-Wiederholung,
  Tagesportion, Textbox, Wortspeicher, Laufdiktat-Antwortprüfung,
  Rechtschreibtoleranz, Klassenstempel, Einschreibung, Freigaberegister …)
- `src/storage/` – Dexie-Repositorien (persönliche Lernereignisse, Tagesplan,
  Sicherung, Lehrerdaten, Klasseneinstellungen …)
- `src/integrations/` – Supabase-Raum-Client, Inhaltsübertragung mit AES-GCM,
  Cloud-Abgleich, Backup, Passphrasen-Krypto
- `src/tastschreiben/`, `src/speech/` – Tastschreib-Fachlogik, Sprachausgabe
- `app/` – Routen, Container (`app/components/`), reine Ansichten (`app/views/`),
  Gestaltung (`app/ui/`)
- `proxy.ts` – Freigaberegister-Umleitung (Sichtbarkeit, keine Zugriffsrechte)

## Lernbereiche laut Freigaberegister (`src/domain/release.ts`, README)

| Bereich           | Route(n)                       | Standard   |
| ----------------- | ------------------------------ | ---------- |
| Laufdiktat-Raum   | `/raum`                        | `frei`     |
| Laufdiktat Lehrer | `/lehrer/live`                 | `frei`     |
| Kopfrechnen       | `/frei/mathematics`            | `frei`     |
| Mein Lernraum     | `/lernen`, `/ueben`, …         | `frei`     |
| LernBox           | `/lernbox`, `/frei/vocabulary` | `frei`     |
| Wortspeicher      | `/frei/german`                 | `frei`     |
| Textbox           | `/frei/german/textbox`         | `frei`     |
| Laufdiktat allein | `/frei/german/laufdiktat`      | `frei`     |
| Tastenwelt        | `/frei/typing`                 | `frei`     |
| Lehrerbereich     | `/lehrer`                      | `frei`     |
| Lehrer-Aufgaben   | `/lehrer/aufgaben`             | `vorschau` |
| Spiegelschrift    | –                              | `vorschau` |
| Motivation/Häuser | `/haus`, `/lehrer/haeuser`     | `aus`      |
| Duell             | `/duell`                       | `aus`      |
| Demo-Klasse 7b    | `/klasse/7b`                   | `vorschau` |

## Abgleich mit der Auftragsbeschreibung (erste Einschätzung, zu verifizieren)

| Im Auftrag genannt                  | Vorgefunden                                                                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wortspeicher                        | vorhanden (`/frei/german`, Merkstufen 1–6, Wortboxen)                                                                                                                       |
| Textbox                             | vorhanden (`/frei/german/textbox`, 4 Durchgänge, 50 Texte)                                                                                                                  |
| Mathematiktraining                  | als „Kopfrechnen“ (`/frei/mathematics`, Grundrechenarten, Aufgabenfamilien)                                                                                                 |
| Weitere Module                      | LernBox (Vokabeln/Leitner), Laufdiktat (Live-Raum + allein), Tastenwelt, Lehrerbereich, Cloud-Sync                                                                          |
| Zehn-Minuten-Einheiten              | nicht als Konzept gefunden; stattdessen „Tagesportion 20 Aufgaben“ (Entscheidung 57)                                                                                        |
| Eingangstest / Kompetenzchecks      | im Code nicht gefunden (Suche nach „Eingangstest“, „Diagnose“, „Kompetenzcheck“ ohne Treffer)                                                                               |
| Lernstandscheck                     | entfallen: ein alter Raummodus „TEST“ wird beim Laden als „LAUFDIKTAT“ behandelt (`src/integrations/laufdiktat/live-session.ts:28-30`); korrigiert am 20.10. nach Bericht E |
| Diagnosegestützte adaptive Angebote | regelbasierte Wiederholung (Leitner, Mathe-Fehlerfamilien, Tagesportion), keine Kompetenzschätzung                                                                          |

## Dokumentation

- Repository: `README.md`, `AGENTS.md`, `docs/` (39 Markdown-Dateien, davon
  ~20 Umsetzungspläne), `docs/inhalte/`, `docs/design/`, `docs/brand/`
- Vault-Kopie: `obsidian-export/Lernplattform/` (00 Übersicht + 24 nummerierte
  Bereiche, je `Anwendung.md`; 19 = Entscheidungsprotokoll mit Entscheidungen 1–57,
  53 fehlt dort und ist in `docs/cloud-sync.md` beschrieben)
- Maßgeblicher Vault des Nutzers liegt außerhalb des Repositories (OneDrive);
  das Audit arbeitet auf der Repository-Kopie.

## Testinfrastruktur – Auffälligkeiten

- `playwright.config.ts` blockiert Service Worker (`serviceWorkers: "block"`):
  Offlineverhalten wird in der E2E-Suite nicht geprüft (zu verifizieren, ob
  eigener Test existiert).
- `test:e2e:live` läuft gegen lokalen Dev-Server mit abgefangenen Supabase-RPCs
  (`page.route`), nicht gegen Produktion.
