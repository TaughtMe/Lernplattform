# Prüfinstanz A – Softwarearchitektur und Codequalität

Gesamtaudit Lernraum, untersuchter Stand `c30b916` (App-Version 0.8.0), Prüfdatum
20.10.2026. Nur lesend geprüft; alle Reproduktionen liegen außerhalb des
Repositorys im Scratchpad
(`/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-a/`).

Konzept (Vault/Docs), tatsächliche Implementierung (Code) und eigene Empfehlung
sind in jedem Befund getrennt ausgewiesen.

---

## 1 Untersuchte Dateien

**Dokumentation und Konfiguration:** `docs/architecture.md`,
`docs/engineering-quality.md`, `docs/upstream-integration.md`,
`docs/cloud-sync.md` (Teil), `docs/umsetzungsplan-abhaengigkeiten.md` (Teil),
`obsidian-export/Lernplattform/06 - Lernlogik und Leitner-Boxen/Anwendung.md`,
`eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`,
`vite.config.ts`, `next.config.ts`, `worker/index.ts`, `proxy.ts`,
`playwright.config.ts`, `playwright.live.config.ts`,
`.github/workflows/quality.yml`, `.github/dependabot.yml`,
`.agents/skills/lernraum-feature/SKILL.md`, `.openai/hosting.json`,
`build/sites-vite-plugin.ts`, `scripts/generate-service-worker.mjs`,
`scripts/service-worker.template.js`, `public/version.json`.

**Fachkern (`src/domain`, vollständig oder in den maßgeblichen Teilen):**
`learning-bundle.ts`, `learning-box.ts`, `learning-box-replay.ts`,
`leitner-schedule.ts`, `vocabulary-session.ts`, `learning-word-progress.ts`
(+ Test), `math-practice.ts`, `word-round.ts`, `word-store-progress.ts`,
`live-vocabulary-placement.ts`, `adaptive-learning.ts`,
`learning-recommendation.ts`, `daily-plan.ts`, `class-workspace.ts`,
`class-seal.ts`, `teacher-workspace.ts` (Signaturteil), `release.ts`,
`personal-backup.ts` (Schemata), `textbox-library.ts` (Kopf).

**Speicher (`src/storage`):** `personal-learning-events.ts` (vollständig, 1263
Zeilen), `learning-recommendations.ts`, `daily-plan.ts`, `math-practice.ts`,
`personal-backup.ts`, `progress-schema.ts`, `local-data-boundaries.ts`,
`learning-event-identity.ts`, `teacher-class-settings.ts` (Schema/Versionen).

**Integrationen:** `src/integrations/cloud-sync/{sync,model,hash}.ts`, Übersicht
aller übrigen Dateien (Größen, Imports), `app/components/cloud-sync-client.ts`,
`app/components/cloud-sync-panel.tsx` (Teil).

**Oberfläche (`app/`):** `app/layout.tsx`, `app/chatgpt-auth.ts`,
`app/release/release-config.ts`, `app/lernen/{learner-home.tsx,use-learner-dashboard.ts}`,
`app/views/lernen/home-screen.tsx` (Teil), `app/frei/mathematics/mental-math-app.tsx`
(Logikteil), `app/raum/spiel/live-game.tsx` (Struktur + `submit`),
`app/components/learning-box-app.tsx` (Logikteil),
`app/components/learning-word-app.tsx` (Rundenabschluss),
`app/components/teacher-workspace-manager.tsx` (Aufgabenteil),
`app/components/first-learning-round.tsx` (Speicherteil),
`app/frei/typing/typing-world.tsx` (Logikteil),
`app/views/tastenwelt/keyboard-settings.ts`, `app/views/lernbox/parts/home.tsx`
(Ladezustand), alle `page.tsx` (Server-/Client-Anteil), Importgraph aller Dateien
in `app/views` und `app/ui`.

---

## 2 Ausgeführte Prüfungen (mit echten Ergebnissen)

| #   | Prüfung                                                                                                           | Ergebnis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | Importanalyse `src/domain` (alle Nicht-Testdateien)                                                               | Externe Importe nur `zod` (20 Dateien) und ein Typimport aus `src/tastschreiben`. **Kein** Import aus `storage`, `integrations`, `dexie`, `@supabase`, React. Web-Crypto-Nutzung in `class-seal.ts`, `houses.ts`, `teacher-workspace.ts`.                                                                                                                                                                                                                                                                                                                                                                                                        |
| P2  | Importanalyse `app/views` und `app/ui`                                                                            | `app/views`: kein Import aus Speicher/Integrationen/Komponenten. `app/ui`: 9 Importe aus `src/storage`, `src/integrations` und `app/components` (u. a. `app/ui/shell/student-shell.tsx:4`, `app/ui/use-learner-profile.ts:8`). `app/views/tastenwelt/keyboard-settings.ts:25,50` nutzt `localStorage` direkt.                                                                                                                                                                                                                                                                                                                                    |
| P3  | ESLint-Architekturregeln per `ESLint.lintText` mit virtuellen Pfaden (14 Fälle, `repro-a/eslint/check-rules.mjs`) | Blockiert: Speicher-/Komponenten-/`dexie`-Importe in `app/views`, `react` in `src/domain`. **Erlaubt** (nicht erkannt): `dexie`, `../storage/*`, `../integrations/*`, `@supabase/*` in `src/domain`; `../integrations/*` in `src/storage`; `dexie` in `app/components`; Speicherzugriff aus `app/views` über Hooks in `app/ui`/`app/lernen`; `window.localStorage` in `app/views`.                                                                                                                                                                                                                                                               |
| P4  | Volle Vitest-Suite mit Abdeckung inkl. `app/**` und `src/**` (Bericht nur ins Scratchpad)                         | 178 Testdateien, 1683 Tests bestanden. Abdeckung (v8, Zeilen/Zweige): `src/domain` 98,3 %/93,2 %, `src/storage` 92,6 %/87,1 %, `src/integrations` 95,6 %/90,1 %, `src/tastschreiben` 95,1 %/**81,3 %**, `app/views` 65,4 %/62,0 %, `app/components` 65,0 %/55,0 %, `app/ui` 64,6 %/65,4 %, übriges `app/` 67,3 %/61,0 %. **Gesamt 78,7 % Zeilen, 72,2 % Zweige.** 0 % Unit-Abdeckung u. a. für `app/frei/typing/typing-world.tsx`, `app/views/tastenwelt/practice-screen.tsx`, `app/components/student-settings-panel.tsx`, `app/frei/german/laufdiktat/running-dictation-app.tsx`, `app/ui/update-toast.tsx`; `learning-box-app.tsx` 44 %/35 %. |
| P5  | Repro `a-poison-event.test.tsx` (3 Tests)                                                                         | Ein Ereignis mit einem zusätzlichen Feld lässt `events.list`, `recommendations.list`, `dailyPlan.progress` und `math.reviews` mit `ZodError` scheitern. Startseite zeigt danach „Heute ist nichts dran – frei üben“, kein Alert, 30 fällige Karten unsichtbar. Kontrolle ohne Zusatzereignis: „0 von 20 Aufgaben heute“.                                                                                                                                                                                                                                                                                                                         |
| P6  | Repro `a-merge-divergence.test.ts`                                                                                | Schüler-Handabgleich zweier Geräte: Ergebnis `added 1, updated 0, conflicts 1`; Kartenstand `reverseBox 2`, Nachspielen der vorhandenen Ereignisse ergibt `reverseBox 3`. Fortschritt von Gerät B fehlt im Kartenstand, das Ereignis ist vorhanden.                                                                                                                                                                                                                                                                                                                                                                                              |
| P7  | Repro `a-leitner-divergence.test.ts` (2 Tests)                                                                    | Fünfmal richtig in 40 Minuten (neue Runden, ohne Hilfe): LernBox Box 2 (fällig in 3 Tagen), Lernwort **Box 5, Merkstufe 6, fällig in 30 Tagen**, Ereignis-Leitner **Box 5/30 Tage**, Mathe Stufe 1/1 Tag. Fehler und 10 Minuten später richtig (neue Runde): LernBox Box 1, Ereignis-Leitner Box 1, **Lernwort Box 2**.                                                                                                                                                                                                                                                                                                                          |
| P8  | Repro `a-storage-unavailable.test.tsx` (IndexedDB wirft `SecurityError`)                                          | LernBox: dauerhaft „LernBox wird geladen …“, unbehandelte `SecurityError`-Rejection. Startseite: „Heute ist nichts dran“. Tastenwelt: „0 von 50 Stationen geschafft“ ohne Hinweis. Kopfrechnen, Wortspeicher, Textbox: korrekter Fehlerhinweis.                                                                                                                                                                                                                                                                                                                                                                                                  |
| P9  | Messung `a-perf-year.test.ts` (200 Tage × 30 bzw. 60 Ereignisse)                                                  | 6 000 Ereignisse = 2 750 KB JSON; Zod-Prüfung aller Ereignisse 44 ms, `mathReviews` 10 ms, `dailyPlanCandidates` 11 ms (Node, Arbeitsplatzrechner). Mit fake-indexeddb: `recommendations.list` 89 ms, `dailyPlan.progress` 174 ms. 12 000 Ereignisse = 5 502 KB, Rechenzeit gleiche Größenordnung.                                                                                                                                                                                                                                                                                                                                               |
| P10 | Hypothese „Dexie wirft `VersionError`, wenn die Datenbank neuer als die App ist“                                  | **Widerlegt.** Dexie 4 öffnet eine Datenbank mit höherer nativer Version ohne Fehler und ergänzt fehlende Teile. Kein Befund. (Archiviert als `widerlegt-version-downgrade.tsx.txt`.)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| P11 | Playwright/Chromium gegen laufenden Dev-Server (`repro-a/browser/rsc-nav.mjs`)                                    | Klick von `/ueben` auf `/lernen/einstellungen` löst `fetch /lernen/einstellungen?_rsc=…` (Header `rsc: 1`) aus: Client-Navigation braucht einen Server-Roundtrip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| P12 | Nachrechnen des Service-Worker-Fingerabdrucks (nur lesend, `repro-a/fingerprint.mjs`)                             | Aktuell berechnet `bff775c1f28b`, eingecheckt `b5f357495db3` (veraltet). 178 der 622 gehashten Dateien sind Testdateien.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| P13 | Registry/Audit                                                                                                    | `vinext`: erste Version 16.02.2026, `1.0.0` am 28.09.2026, danach 1.0.1, 1.1.0, 1.2.0, 1.2.1 binnen 17 Tagen; Maintainer: eine Person plus Cloudflare-Bot. `npm audit`: 10 Meldungen (7 hoch) nur in Entwicklungsabhängigkeiten, `--omit=dev`: 0.                                                                                                                                                                                                                                                                                                                                                                                                |
| P14 | Web (vinext-README, online abgerufen)                                                                             | README: „not yet a drop-in replacement for every application or production workload“, Produktion „with caution“, „OpenNext is the safer choice“.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| P15 | Kennzahlen (Zeilen, Zustände, Casts)                                                                              | 410 Produktionsdateien in `app`/`src`/`proxy`/`worker`: 0 × `any`, 0 × `@ts-ignore`, 171 `as`-Casts, ca. 101 Non-null-Assertions, 24 `eslint-disable` (alle mit Begründung). 150 von 187 `.tsx`-Dateien `"use client"`. 145 `void f()`-Aufrufe ohne `.catch`, 0 × `console.error/warn`, 0 Error Boundaries (`error.tsx`/`global-error.tsx`).                                                                                                                                                                                                                                                                                                     |
| P16 | Bundle des vorhandenen Builds der Hauptinstanz (`dist/client`)                                                    | 2 092 KB JS (unkomprimiert) in 115 Dateien; größte: KaTeX/`math-display` 256 KB, React 214 KB, Supabase-Client 209 KB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Alle Reproduktionen: `cd /home/user/Lernplattform && AUDIT_DIR=…/scratchpad/repro-a npx vitest run --config …/scratchpad/repro/vitest.audit.config.mts` – 5 Dateien, 11 Tests, alle grün (sie belegen die beschriebenen Fehlverhalten).

---

## 3 Nicht untersuchte Bereiche

- Supabase-SQL-Migrationen, RLS, Raum-API-Sicherheit, Kryptografie im Detail (Prüfinstanz B).
- Offlineverhalten und Service-Worker-Lebenszyklus im echten Browser (B); nur die
  RSC-Navigation wurde stichprobenartig geprüft.
- Oberfläche, Barrierefreiheit, WebKit/iPad (C); kein echtes iPad, kein WebKit verfügbar.
  Performance-Zahlen stammen vom Arbeitsplatzrechner; auf älteren Schul-iPads
  ist ein Mehrfaches zu erwarten (nicht gemessen).
- Pädagogische Bewertung der Wiederholungsregeln (D). A-004 bewertet nur die
  Abweichung vom eigenen Konzept und die Architekturursache.
- Quellrepositories `LernBoxV2` und `Laufdiktat` (nicht verfügbar): Die
  Integrationsregel „Upstream prüfen, nicht neu entwerfen“ konnte nicht gegen die
  Quellen geprüft werden.
- Produktions-Hosting (Cloudflare-Konto, Deploy-Pipeline, `.openai/hosting.json`-Ziel): kein Zugriff.
- Git-Historie vor 30.09.2026 (flacher Klon).
- Merge-Engine des Lehrer-Abgleichs (`merge.ts`, `engine.ts`, `dedupe.ts`) nur
  strukturell, nicht auf Korrektheit geprüft; dort existieren Eigenschaftstests.

---

## 4 Befunde

### A-001 – Ein einziges unpassendes Lernereignis legt alle Lernstandsprojektionen lahm; strikte Schemata verhindern Vorwärtskompatibilität und Rollback

- **Bereich:** Datenhaltung, Datenverträge, Betrieb
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-bundle.ts:4` (Kommentar „Keep additive changes backward compatible within v1“), `:16-31` (geschlossene Enums `eventSourceSchema`, `learningAreaSchema`), `:74-109` (`learningEventV1Schema … .strict()`); Lesewege mit `parse` statt `safeParse`: `src/storage/personal-learning-events.ts:753-756` (`list`), `src/storage/learning-recommendations.ts:179-190` (`list`), `src/storage/daily-plan.ts:176-182` (`readSources`) und `:232-238` (`progress`), `src/storage/math-practice.ts:68` (`reviews`). Gegenbeispiel mit toleranter Prüfung: `src/storage/teacher-sync-store.ts:258` (`safeParse`, ungültige Datensätze werden übersprungen).
- **Beschreibung:**
  _Konzept:_ Der Kommentar verspricht additive, rückwärtskompatible Erweiterungen innerhalb von v1; `docs/architecture.md` beschreibt, dass `math` „additiv“ ergänzt wurde.
  _Implementierung:_ Das Ereignisschema ist `.strict()`, alle Enums sind geschlossen, und jede Projektion validiert **alle** Ereignisse mit `parse`. Ein einziger Datensatz mit einem unbekannten Feld oder Enum-Wert (neuere App-Version, zurückgerollte Version, zweiter Tab mit altem Stand, beschädigter Datensatz) lässt Empfehlungen, Tagesportion, Mathe-Wiederholung und Ereignisliste vollständig scheitern. Der Lehrer-Abgleich ist dagegen tolerant gebaut – der Lernkern der Kinder ist also robuster geschützt als nötig gegen Veränderung und schwächer geschützt gegen Ausfall.
- **Reproduktion / Prüfweg:** `repro-a/a-poison-event.test.tsx`: ein gültiges und ein Ereignis mit Zusatzfeld `confidence` in die Tabelle `learningEvents`. Ergebnis: alle vier Lesewege werfen `ZodError`; `LearnerHome` zeigt „Heute ist nichts dran – frei üben“ statt „0 von 20 Aufgaben heute“.
- **Betroffene Nutzergruppen:** alle Schülerinnen und Schüler auf betroffenen Geräten; Lehrkraft beim Ausrollen/Zurückrollen von Versionen.
- **Mögliche Folgen:** Nach einem fehlerhaften Release ist ein Rollback nicht gefahrlos möglich: Geräte, die mit der neuen Version Ereignisse geschrieben haben, verlieren mit der alten Version stumm Tagesportion und Wiederholungen (Daten bleiben gespeichert, sind aber unsichtbar). Jede künftige Erweiterung des Vertrags (neues Modul, neues Feld) bricht ältere Geräte im Mischbetrieb (Schul-iPad aktualisiert, Heimgerät nicht).
- **Empfehlung:** (1) Lesen tolerant machen: `safeParse` je Datensatz, ungültige Ereignisse in eine Quarantäne-Liste und einen sichtbaren Hinweis „n Einträge konnten nicht gelesen werden“, Projektionen über den Rest. (2) Für Lesen ein nicht-striktes Schema (unbekannte Felder entfernen statt ablehnen), für Schreiben das strikte. (3) Unbekannte Enum-Werte beim Lesen auf „unbekannt“ abbilden und in Projektionen ignorieren. (4) `schemaVersion` je Ereignis. (5) Regressionstest „Ereignis aus Version n+1 in Version n“.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Ein Test schreibt ein Ereignis mit unbekanntem Feld und unbekanntem `source` in die Datenbank; Startseite, LernBox-Portion und Mathe-Wiederholung zeigen weiterhin die übrigen Daten und einen Hinweis.

### A-002 – Fehler sehen aus wie leere Daten oder enden in Dauer-Laden; keine einheitliche Fehlerbehandlung

- **Bereich:** Fehlerbehandlung, Zustände
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/lernen/use-learner-dashboard.ts:63-119` (`load().catch` setzt `loaded: true` mit leerem Stand), `app/lernen/learner-home.tsx:13-60` (`loaded` wird nicht an die Ansicht weitergereicht), `app/views/lernen/home-screen.tsx:113-119`; `app/components/learning-box-app.tsx:222-241` (`refresh` ohne Fehlerzweig), `:243-245` (`migrateLegacyLearningBox().then(…)` ohne `catch`), `:392-412` (`assess` ohne `try/catch`, Aufruf per `void`); `app/views/lernbox/parts/home.tsx:88-89`; `app/frei/typing/typing-world.tsx:87-96` (`refresh` ohne `catch`) und `:121-128` (Rundenspeicherung ohne `catch`, keine Wiederholung). Keine `error.tsx`/`global-error.tsx` im gesamten `app/`.
- **Beschreibung:**
  _Konzept:_ `docs/engineering-quality.md` Regel 6: „Laden, leer, erfolgreich, offline, eingeschränkt und fehlgeschlagen werden als eigene Zustände behandelt. Fehler dürfen nicht wie leere Daten aussehen.“ Der Projekt-Skill wiederholt das.
  _Implementierung:_ Jeder Container löst Laden/Fehler selbst. Kopfrechnen, Wortspeicher und Textbox tun es vorbildlich; Startseite, LernBox und Tastenwelt nicht. Es gibt keine Fehlergrenzen, keine globale Behandlung unbehandelter Promises, 145 `void`-Aufrufe ohne `.catch` und keinerlei Protokollierung (0 × `console.error`), also auch keine Möglichkeit, einen Fehler vom Schülergerät zu diagnostizieren.
- **Reproduktion / Prüfweg:** `repro-a/a-storage-unavailable.test.tsx` (IndexedDB wirft `SecurityError`, wie in Safari/Firefox bei blockierten Website-Daten): LernBox bleibt dauerhaft bei „LernBox wird geladen …“ (unbehandelte Rejection), Startseite „Heute ist nichts dran – frei üben“, Tastenwelt „0 von 50 Stationen geschafft“. Zusätzlich P5 (Giftereignis → „nichts dran“).
- **Betroffene Nutzergruppen:** Schülerinnen und Schüler (sehen „nichts zu tun“ oder einen verlorenen Fortschritt), Lehrkraft (bekommt keine Fehlermeldung, nur „das Kind hat nichts gemacht“).
- **Mögliche Folgen:** Stumme Datenverluste (Tastenwelt-Runde gilt als abgeschlossen, wird aber nicht gespeichert), falsche Rückmeldung „Tagesziel erledigt“, Supportfälle ohne Diagnosemöglichkeit; bei einem Renderfehler weißer Bildschirm statt Wiederherstellungsangebot.
- **Empfehlung:** Ein gemeinsamer Ladebaustein (z. B. `useLoad<T>()` mit Zustand `loading | ready | empty | error`) statt Eigenbau je Container; `error.tsx` je Bereich (Schüler, Lehrkraft, Raum) mit „Neu laden“ und „Sicherung herunterladen“; globale `unhandledrejection`-Erfassung in ein lokales Diagnoseprotokoll (ohne Personenbezug), das die Lehrkraft exportieren kann; ESLint-Regel `@typescript-eslint/no-floating-promises` (typbewusst) einführen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Für jeden Schüler-Container existiert ein Test „Speicher nicht verfügbar“ mit sichtbarem `role="alert"`; `no-floating-promises` ist aktiv; es gibt eine Fehlergrenze je Bereich.

### A-003 – Ereignisquelle nur dem Namen nach: Lernstände sind überwiegend veränderliche Primärzustände; nach dem Gerätezusammenführen widersprechen sich Kartenstand und Ereignisse

- **Bereich:** Architektur, Datenmodell, Synchronisation
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-box-replay.ts:106-128` (`replayLearningBoxCard`, nur in Tests verwendet: `src/domain/learning-box.test.ts`, `src/storage/learning-box.test.ts`); `src/storage/personal-learning-events.ts:360-397` (`putCardAndEvent`: Kartenstand wird gespeichert, Ereignis daneben), `:669-680` (Platzierung aus Unterrichtsrunde ohne Ereignis), `:793-861` (`recordAttempt` Lernwörter: Ereignis ohne Merkstufe/Box), `:1175-1232` (`importFromLesson`: setzt Box/Fälligkeit ohne Ereignis); `src/storage/personal-backup.ts:188-236` (Karten: „neuer gewinnt“, sonst Konflikt ohne Auflösung), `:237-252` (Lernwörter: `lastPracticedAt` gewinnt); `app/components/cloud-sync-panel.tsx:140-149` (Meldung nennt Konflikte nicht).
- **Beschreibung:**
  _Konzept:_ Vault 06: „Boxstand und Fälligkeit werden aus unveränderlichen Lernereignissen abgeleitet. Dadurch entsteht kein zweiter widersprüchlicher Lernstand.“ `docs/engineering-quality.md` Regel 3: Projektionen „müssen reproduzierbar neu berechnet werden können“; LernBox-Kartenstand sei ein „Zwischenspeicher“.
  _Implementierung:_ Echte Ereignisquelle ist nur Mathe (`mathReviews` als reine Projektion) und die Vokabel-Ereignisse ohne Karte. LernBox-Karte, Lernwort-Fortschritt, Tastenwelt-Fortschritt und Textbox-Einheiten sind veränderliche Primärzustände; Ereignisse sind ein Begleitprotokoll. Das Nachspielen existiert nur im Test, die nötigen „Ausgangsstände“ (Platzierung, Sicherung, Neuanlage) werden nirgends gespeichert – ein Nachspielen in Produktion ist also grundsätzlich unmöglich. Für Lernwörter fehlen Merkstufe und Box im Ereignis; der Stand ist nicht rekonstruierbar. Wortspeicher hält drei Zustände nebeneinander (`learningWordProgress`, `wordRounds`, `learningEvents`).
- **Reproduktion / Prüfweg:** `repro-a/a-merge-divergence.test.ts`: Gerät B übt die Rückrichtung (früher), Gerät A die Vorwärtsrichtung (später); Handabgleich B → A. Ergebnis `added 1, conflicts 1`, gespeichert `reverseBox 2`, Nachspielen der nun vorhandenen Ereignisse `reverseBox 3`. Der Konflikt wird in der Cloud-Meldung nicht erwähnt.
- **Betroffene Nutzergruppen:** Kinder mit zwei Geräten (Schule/Zuhause) oder Gerätewechsel; künftig alle, sobald eine Lernregel korrigiert werden muss.
- **Mögliche Folgen:** Stiller Fortschrittsverlust nach dem Abgleich; ein korrigierter Fehler in der Lernlogik (siehe A-004) kann nicht rückwirkend auf vorhandene Lernstände angewendet werden – entgegen der Regel „Änderungen der Lernlogik benötigen Regressionstests mit bestehenden Lernhistorien“. Die Dokumentation erweckt eine Sicherheit, die der Code nicht bietet; die Kosten der Ereignisquelle (Identitäten, Unveränderlichkeit, Speicherwachstum) fallen an, ihr Nutzen nicht.
- **Empfehlung:** Bewusst entscheiden und dokumentieren. Variante a (empfohlen, wenn Mehrgerätenutzung ein Ziel ist): Ereignisse vollständig machen (Merkstufe, Box vorher/nachher, Platzierung als eigenes Ereignis `placement`, Sicherungsimport als `baseline`), Projektionen aus Ereignissen berechnen und nur als Cache speichern, Zusammenführen = Vereinigung der Ereignisse + Neuberechnung. Variante b: Ereignisse ehrlich als Protokoll führen, Regel 3 und Vault 06 anpassen, Zusammenführen pro Richtung/Feld statt pro Karte und Konflikte sichtbar machen.
- **Aufwand (grob):** L
- **Erfolgskriterium:** Der Merge-Test aus `a-merge-divergence` ergibt `reverseBox 3`; ein Test baut alle Projektionen aus einer Sicherung mit nur Ereignissen deterministisch neu auf; Doku und Code stimmen überein.

### A-004 – Mehrere parallele Wiederholungslogiken mit widersprüchlichen Regeln; Lernwörter verletzen die eigene Leitner-Spezifikation

- **Bereich:** Fachlogik, Integrationsregel
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch (Code), pädagogische Tragweite durch D zu bewerten
- **Fundstelle:** `src/domain/learning-word-progress.ts:24-68` (`updateLearningWordProgress`), `src/domain/leitner-schedule.ts:33-99` (`deriveLeitnerProgress`), `src/domain/learning-box.ts:352-433` (`processLearningBoxResult`) und `:444-470` (`placeLiveVocabularyCard`), `src/domain/math-practice.ts:171-228` (`mathReviews`), `src/domain/live-vocabulary-placement.ts`, `src/domain/vocabulary-session.ts`; Test, der das Verhalten festschreibt: `src/domain/learning-word-progress.test.ts:40-62` (neun Aufstiege zum selben Zeitpunkt → Box 5).
- **Beschreibung:**
  _Konzept:_ `docs/architecture.md`: „keine parallele Eigenimplementierung derselben Fachregel“. Vault 06, Grundregeln: „Nach einem Fehler doch richtig → bleibt in Box 1“, „höchstens ein Aufstieg je Runde“, „Kein Aufstieg vor der Fälligkeit“ (für die LernBox ausdrücklich, als „strengere Regel des Lernraums“).
  _Implementierung:_ Mindestens vier eigenständige Wiederholungsmaschinen (LernBox-Karte, Ereignis-Leitner, Lernwort, Mathe) plus zwei Platzierungsregeln. Sie teilen nur die Intervalltabelle, nicht die Regeln: „zu frühes Üben“ verhindert den Aufstieg in LernBox und Mathe, nicht bei Lernwort und Ereignis-Leitner; „Fehler schließen ohne Aufstieg“ gilt in LernBox (8-h-Fenster) und Ereignis-Leitner, nicht bei Lernwörtern. Die Empfehlungs- und Portionslogik entscheidet zusätzlich doppelt (`learning-recommendations.ts` und `storage/daily-plan.ts`).
- **Reproduktion / Prüfweg:** `repro-a/a-leitner-divergence.test.ts`. Fünfmal richtig in 40 Minuten: LernBox Box 2/3 Tage; **Lernwort Box 5, Merkstufe 6, 30 Tage**; Ereignis-Leitner Box 5/30 Tage; Mathe Stufe 1/1 Tag. Fehler, 10 Minuten später richtig: LernBox und Ereignis-Leitner Box 1, **Lernwort Box 2**.
- **Betroffene Nutzergruppen:** Kinder im Wortspeicher (Kern des Rechtschreibziels), Lehrkräfte, die sich auf „gefestigt“ verlassen.
- **Mögliche Folgen:** Ein Kind, das dieselbe Wortbox an einem Nachmittag mehrfach übt, gilt für alle Wörter als „gemeistert“; die Wörter verschwinden für 30 Tage aus der Tagesportion – die verteilte Wiederholung wird für das Kernmodul ausgehebelt. Gleich benannte Begriffe („Box 1–5“, „fällig“) bedeuten in jedem Modul etwas anderes; jede Regeländerung muss an mehreren Stellen nachgezogen werden.
- **Empfehlung:** Ein gemeinsamer, reiner Wiederholungskern (`spaced-repetition.ts`) mit expliziter Regelkonfiguration (Intervalle, Erholungsfenster, Aufstieg nur ab Fälligkeit, ein Aufstieg je Runde, Hilfe-/Selbstkorrektur-Behandlung); Module übergeben nur ihre Ergebnisse. Die Vault-Tabelle als tabellengetriebener Regressionstest für jedes Modul; Eigenschaftstest „Aufstieg höchstens einmal je Fälligkeit“. Bestehende Lernwort-Stände nach Korrektur neu bewerten (setzt A-003 voraus oder eine einmalige Heuristik).
- **Aufwand (grob):** M
- **Erfolgskriterium:** Alle Module bestehen dieselbe Regeltabelle aus Vault 06; `a-leitner-divergence` liefert für Lernwörter Box 2 bzw. Box 1.

### A-005 – Die Abdeckungszahl 96 % ist für die Gesamtanwendung irreführend; Tests schreiben teilweise Fehlverhalten fest

- **Bereich:** Testbarkeit, Qualitätssicherung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `vitest.config.ts:23-28` (`coverage.include` nur `src/domain`, `src/storage`, `src/speech`, `src/integrations`); `src/tastschreiben/` fehlt; `docs/engineering-quality.md` („Mindestabdeckung“).
- **Beschreibung:** _Implementierung:_ `app/` (38 836 Zeilen, 69 Testdateien) und `src/tastschreiben` werden nicht gemessen. Gemessen inklusive dieser Bereiche: 78,7 % Zeilen, 72,2 % Zweige statt 96,1 %. Ungedeckt sind gerade Abläufe mit Datenfolgen: Tastenwelt-Übung und -Speicherung (0 %), Sicherung/Wiederherstellung in den Schülereinstellungen (0 %), Laufdiktat allein (0 %), Update-Hinweis des Service Workers (0 %), LernBox-Container (44 % Zeilen, 35 % Zweige), Cloud-Panel (29 %). `src/tastschreiben` läge mit 81,3 % Zweigen unter der eigenen 85-%-Schwelle. Zudem prüfen manche Tests das Ist- statt des Soll-Verhaltens (A-004: Test bestätigt neun Aufstiege an einem Zeitpunkt). Eigenschaftstests gibt es in 6 Dateien, davon 3 im Cloud-Abgleich – keine für die Lernregeln von Lernwort, Mathe oder Ereignis-Leitner.
- **Reproduktion / Prüfweg:** P4 (Vitest mit `--coverage.include='app/**/*.{ts,tsx}' --coverage.include='src/**/*.{ts,tsx}'`, Bericht im Scratchpad).
- **Betroffene Nutzergruppen:** Entwickler/Lehrkraft (falsches Sicherheitsgefühl), indirekt alle Nutzer.
- **Mögliche Folgen:** Regressionen in Containern (z. B. A-002) bleiben unentdeckt, obwohl die Kennzahl „grün“ ist.
- **Empfehlung:** Zwei Kennzahlen ausweisen (Kern streng, `app/` mit realistischer, steigender Schwelle, z. B. 70 %/60 %); `src/tastschreiben` in den Kern aufnehmen; je Container ein Test für Speicherfehler; Lernregeln mit tabellengetriebenen Soll-Tests aus dem Vault absichern.
- **Aufwand (grob):** S (Konfiguration) bis M (fehlende Tests)
- **Erfolgskriterium:** `npm run check` misst `app/` und `src/tastschreiben`; die Doku nennt beide Zahlen.

### A-006 – Browser-Tests prüfen den Entwicklungsserver, nicht das ausgelieferte Artefakt

- **Bereich:** Testarchitektur, CI
- **Status:** bestätigt (Codeanalyse); lokale Nichtstartbarkeit des Produktionsservers von der Hauptinstanz reproduziert
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `playwright.config.ts:28-33` (`webServer.command: "npm run dev"`), `:12-14` (`workers: 1`, `retries: 2` in CI), `:24` (`serviceWorkers: "block"`); `.github/workflows/quality.yml:98-99` (`npm run build`, danach Playwright gegen `npm run dev` – Build bleibt ungenutzt); `app/release/release-config.ts:15-18` (Vorschau ist außerhalb von `NODE_ENV=production` immer an); `tests/rendered-html.test.mjs` (13 Zeichenkettenprüfungen gegen den Produktions-Worker).
- **Beschreibung:** Die gesamte Cross-Browser-Suite läuft gegen `vinext dev` mit eingeschalteter Vorschau (alle `vorschau`-Bereiche sichtbar, im Schulbetrieb nicht), ohne Service Worker, seriell wegen Bedarfskompilierung und mit zwei Wiederholungen je Test. Das Produktionsbundle (Minifizierung, RSC im Produktionsmodus, Worker-Laufzeit, Service Worker) wird nur über 13 serverseitige HTML-Prüfungen berührt; eine Hydration im Browser gegen den Produktions-Build findet nie statt. Lokal lässt sich kein Produktionsserver starten (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, Protokoll der Hauptinstanz).
- **Reproduktion / Prüfweg:** Konfiguration lesen; `scratchpad/prod-server.log`.
- **Betroffene Nutzergruppen:** alle (Fehler, die nur im Produktionsmodus auftreten, erreichen die Nutzer ungetestet).
- **Mögliche Folgen:** Produktionsspezifische Fehler (z. B. der dokumentierte Manifest-Fehler von vinext) werden erst im Einsatz bemerkt; `retries: 2` kann instabile Tests verdecken.
- **Empfehlung:** Mindestens ein Chromium- und ein WebKit-Projekt gegen den Produktions-Build in der Worker-Laufzeit (z. B. `wrangler dev` auf `dist/`) und im Schulbetrieb ohne Vorschau; den ungenutzten Build-Schritt entweder nutzen oder entfernen; Wiederholungen nur mit Meldung „flaky“ zulassen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Ein CI-Job führt `platform-quality.spec.ts` gegen das gebaute Worker-Artefakt ohne Vorschau-Cookie aus.

### A-007 – Plattformrisiko: junges Framework, Cloudflare-gebundenes dynamisches SSR und RSC-Navigation für eine Local-first-PWA

- **Bereich:** Abhängigkeiten, Architekturgrundentscheidung
- **Status:** begründetes Risiko (Teilfakten bestätigt: P11, P13, P14)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel (Eintrittswahrscheinlichkeit), hoch (Fakten)
- **Fundstelle:** `package.json` (`vinext 1.1.0`, `@vitejs/plugin-rsc`, `@cloudflare/vite-plugin`), `vite.config.ts:1-80`, `worker/index.ts`, `app/layout.tsx:38-41` (`headers()`) und `:96-100` (`cookies()`), `proxy.ts`; Vorlagenreste: `.openai/hosting.json`, `build/sites-vite-plugin.ts` (kopiert nicht existierende `drizzle/`), `vite.config.ts` (D1/R2-Platzhalter „site-creator“), `worker/index.ts` (Bildoptimierung mit `IMAGES`-Bindung), `app/chatgpt-auth.ts` (ungenutzt), `scripts/service-worker.template.js` (Ausnahmen `/signin-with-chatgpt`, `/callback`).
- **Beschreibung:**
  _Konzept:_ Local-first-PWA, Daten nur auf dem Gerät, datenschutzfreundlich, offline nutzbar, langfristig schulartübergreifend.
  _Implementierung:_ Das Root-Layout liest bei jeder Anfrage Cookies und Header; damit ist jede Seite dynamisch serverseitig gerendert, und jede Client-Navigation lädt eine RSC-Nutzlast vom Server (P11). Fachlich nötig ist der Server nur für Freigabe-Cookie, Umgebungsvariablen und Metadaten – alles ließe sich zur Build-Zeit oder im Client lösen. Das Framework vinext ist acht Monate alt, seit drei Wochen 1.0, hat eine Hauptperson als Maintainer, vier Releases in 17 Tagen und rät im README selbst zur Vorsicht im Produktivbetrieb („OpenNext is the safer choice“). Der Produktionsserver lässt sich außerhalb von Cloudflare nicht starten. `vinext` und `react-server-dom-webpack` stehen als Entwicklungsabhängigkeiten, landen aber im Worker-Bundle – `npm audit --omit=dev` (0 Meldungen) prüft den ausgelieferten Framework-Code also nicht.
- **Reproduktion / Prüfweg:** P11 (RSC-Fetch), P13 (Registry), P14 (README), `prod-server.log`.
- **Betroffene Nutzergruppen:** alle; Schulträger (Betrieb, Datenschutz-Folgenabschätzung muss einen Server-Dienstleister berücksichtigen, obwohl keine Lerndaten dorthin fließen).
- **Mögliche Folgen:** Offline-Navigation hängt vom Fallback-Verhalten des Frameworks und vom Cache bereits besuchter Seiten ab; Breaking Changes oder Aufgabe von vinext treffen die gesamte Anwendung; Wechsel des Hostings erfordert Umbau. Die Vorlagenreste verwirren und vergrößern die Angriffs- und Pflegefläche.
- **Empfehlung:** Architekturentscheidung neu bewerten: Für eine Anwendung, die zu 80 % aus Client-Komponenten besteht und keine Serverdaten nutzt, ist ein statischer Build (Vite-SPA mit Router oder statischer Export) mit vorab gecachten Routen einfacher, offline robuster und hosterunabhängig; Supabase bleibt clientseitig. Kurzfristig: Freigabestufen und öffentliche Konfiguration zur Build-Zeit einbetten, dynamische Server-APIs aus dem Root-Layout entfernen, Vorlagenreste löschen, Ausstiegsplan dokumentieren.
- **Aufwand (grob):** L (Wechsel) / S (Aufräumen)
- **Erfolgskriterium:** Alle Seiten lassen sich als statische Dateien ausliefern; Client-Navigation funktioniert ohne Netz für alle Lernbereiche; keine Vorlagenreste.

### A-008 – Komplexität ohne entsprechenden Nutzen: Lehrer-Geräteabgleich, doppelte Abgleichwege, Eigen-SHA-256, tote und prototypische Pfade

- **Bereich:** Komplexität, Wartbarkeit
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Umfang), mittel (Nutzenbewertung)
- **Fundstelle:** `src/integrations/cloud-sync/` (≈ 3 760 Zeilen Logik ohne `testing/`, ≈ 3 150 Zeilen Unit-Tests), Cloud-Oberfläche ≈ 2 330 Zeilen (`app/components/cloud-*`, `sync-conflicts-host.tsx`, `app/ui/cloud-*`, `app/ui/sync-conflicts.tsx`, `app/sync/`); zweiter Lehrerweg v1: `src/integrations/cloud-sync/sync.ts:41-59`, eingeblendet in `app/components/cloud-sync-setup.tsx:118`; eigene SHA-256-Implementierung `src/integrations/cloud-sync/hash.ts:1-85`; Klassenstempel ECDSA `src/domain/class-seal.ts` (Zweck laut Kommentar: selbst ausgestellte Schreiberleichterung verhindern); Häuser ≈ 1 500 Zeilen (Stufe `aus`); toter Zweig `app/raum/spiel/live-game.tsx:666` (`!LAUFDIKTAT_PILOT` mit `LAUFDIKTAT_PILOT = true as const` in `src/pilot-mode.ts`, zusätzlich nicht idempotente `crypto.randomUUID()`-Ereignis-ID); ungenutzt: `app/chatgpt-auth.ts`, `LocalRepositoryFactory` (`src/storage/local-data-boundaries.ts:20-25`), Parameter `secondChance` in `processLearningBoxResult`.
- **Beschreibung:** Der automatische Geräteabgleich einer einzelnen Lehrkraft (HLC, Merge-Engine, Grabsteine, Duplikaterkennung, Umschlag-Verschlüsselung, drei Anbieter) ist mit ≈ 6 100 Zeilen Produktionscode größer als alle fünf Schüler-Lerncontainer zusammen (LernBox, Wortspeicher, Kopfrechnen, Textbox, Tastenwelt: ≈ 3 400 Zeilen). Daneben existiert weiter der Handabgleich v1 (unverschlüsselt, andere Datei). Die SHA-256-Eigenimplementierung dient nur der Änderungserkennung, widerspricht aber dem Wortlaut von Regel 7 („Keine eigene Kryptografie“) und existiert nur, damit `merge.ts` synchron bleibt. Für die Kernziele (Rechtschreib-/Mathe-Grundkompetenzen) trägt dieser Teil nichts bei, bindet aber Pflegeaufwand und Prüfkapazität.
- **Reproduktion / Prüfweg:** Zeilenzählung (P15); Importanalyse; Lesen der genannten Stellen.
- **Betroffene Nutzergruppen:** Entwickler/Lehrkraft (Pflege), indirekt alle.
- **Mögliche Folgen:** Verteilte Aufmerksamkeit (A-001 bis A-004 betreffen den Lernkern, während Randfunktionen ausgebaut sind); mehr Fläche für Fehler und Sicherheitsprüfung.
- **Empfehlung:** Funktionsstopp für Randfunktionen bis zur Stabilisierung des Lernkerns; v1-Lehrerabgleich entfernen; Hash vor dem Merge asynchron mit Web Crypto berechnen oder eine nicht-kryptografische Prüfsumme verwenden; tote Zweige, `chatgpt-auth.ts`, `LocalRepositoryFactory`, `secondChance` löschen; Häuser/Duell in einen Feature-Branch oder ein Archiv auslagern. Prüfen, ob „Vorbereiten zu Hause, Unterricht an der Tafel“ nicht mit einer verschlüsselten Datei-Übergabe ausreichend gelöst ist.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Kein ungenutzter Produktionscode (Prüfung z. B. mit `knip`); dokumentierte Begründung pro Randfunktion mit Nutzen für die Kernziele.

### A-009 – Erweiterbarkeit: kein Modulvertrag; ein neues Lernmodul berührt rund 20 Dateien und mehrere geschlossene Enums

- **Bereich:** Erweiterbarkeit, Schul-Rollout
- **Status:** bestätigt (Codeanalyse); Rollout-Aussagen begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel bis hoch
- **Fundstelle:** geschlossene Modullisten: `src/domain/class-workspace.ts:3` (`classModuleSchema`), `src/domain/learning-bundle.ts:16-31`, `src/domain/daily-plan.ts:16` (`DAILY_PLAN_MODULES`), `src/domain/release.ts` (`RELEASE_AREAS`), `src/domain/personal-learning-space.ts`, `app/lernen/dashboard-data.ts:11`, `app/lernen/use-learner-dashboard.ts` (`openByModule`), `src/storage/learning-recommendations.ts:17-25` (`eventModule`) und `:171-345` (modulweise Sonderfälle), `src/storage/daily-plan.ts:88-170`, Backup-Schema `src/domain/personal-backup.ts`, Dexie-Versionen `src/storage/personal-learning-events.ts:86-153`. Inhalte als Quellcode: `src/domain/textbox-library.ts` (1 031 Zeilen Texte), `german-learning-content.ts`, `vocabulary-catalog.ts`.
- **Beschreibung:**
  _Konzept:_ `docs/architecture.md`: Module „stellen ihre nativen Fälligkeiten über einen Modul-Adapter bereit“.
  _Implementierung:_ Einen solchen Adapter gibt es nicht; Empfehlung und Tagesportion kennen jedes Modul explizit. Die zuletzt ergänzte Textbox berührt 19 Produktionsdateien außerhalb ihres Moduls, dazu Dexie-Version, Sicherungsschema und E2E-Listen. Ein Modul „Bruchrechnen“ bräuchte: Route + Container + Ansicht, Freigabebereich, `classModuleSchema`, `learningAreaSchema` (bzw. `math`-Erweiterung), ggf. `eventSourceSchema`, `DAILY_PLAN_MODULES`, Kandidaten in Empfehlung und Portion, Fortschrittsseite, Dashboard-Zuordnung, Lehrer-Klassenkonfigurator, Sicherungsschema, ggf. Dexie-Version und Raum-Modus (SQL). Wegen A-001 bricht jede Enum-Erweiterung ältere Geräte und ältere Lehrkraft-Pakete. Für Schul-Rollout fehlen strukturell: mehrere Lehrkräfte pro Klasse (Klassenstempel und Lehrerdaten gehören einem Gerät/einer Lehrkraft), Schulverwaltung, Geräteverwaltung, Inhalte als austauschbare Datenpakete.
- **Reproduktion / Prüfweg:** `grep -rliE "textbox" app src` außerhalb des Moduls (19 Treffer); Lesen der Enums.
- **Betroffene Nutzergruppen:** Entwicklung, künftige Schulen/Schularten, Fachlehrkräfte an der Mittelschule.
- **Mögliche Folgen:** Jeder Ausbau multipliziert die Fehlerstellen aus A-004; schulartübergreifende Inhalte erfordern Code-Releases.
- **Empfehlung:** Modulvertrag (`LearningModule` mit `id`, `routes`, `candidates(state, now)`, `isCompletedBy(event)`, `progressSummary`) und Registry, aus der Freigabe, Empfehlung, Portion und Dashboard gespeist werden; offene Modul-IDs als String mit bekannter Liste statt geschlossener Enums in gespeicherten Daten; Inhalte als versionierte JSON-Pakete. Mehrlehrkraft-/Schulbetrieb als ausdrückliche Nicht-Ziel- oder Ziel-Entscheidung festhalten.
- **Aufwand (grob):** L
- **Erfolgskriterium:** Ein Beispielmodul lässt sich mit ≤ 5 Berührungspunkten außerhalb seines Ordners ergänzen; ältere Geräte ignorieren unbekannte Module ohne Fehler.

### A-010 – Architekturregeln nur teilweise maschinell abgesichert

- **Bereich:** Schichtentreue
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `eslint.config.mjs:62-78` (Kern: nur `next`, `react`, `@/app/*` verboten), `:79-100` (Ansichten); `app/ui/shell/student-shell.tsx:4`, `app/ui/use-learner-profile.ts:8`, `app/ui/shell/use-teacher-nav-data.ts:8`, `app/views/tastenwelt/keyboard-settings.ts:25,50`.
- **Beschreibung:**
  _Konzept:_ Regel 1/4/5: Kern kennt „Oberfläche, Browser und Speicher nicht“; „Direkter IndexedDB-Zugriff aus Komponenten ist verboten“; „Bausteine sind reine Darstellung ohne Speicherzugriff“.
  _Implementierung:_ Der Kern hält die Regel heute tatsächlich ein (P1) – aber nur durch Disziplin: ESLint ließe `dexie`, `storage`, `integrations` und `@supabase` in `src/domain` zu; `src/tastschreiben` (Fachlogik) ist gar nicht erfasst; `app/components` darf `dexie` importieren; `app/ui` greift auf Speicher zu; eine „reine“ Ansicht nutzt `localStorage` direkt.
- **Reproduktion / Prüfweg:** P3 (`repro-a/eslint/check-rules.mjs`).
- **Betroffene Nutzergruppen:** Entwicklung (insbesondere KI-Agenten, die sich auf die Regeln verlassen).
- **Mögliche Folgen:** Schleichende Erosion der Schichten bei weiterem Ausbau.
- **Empfehlung:** Verbotsmuster für `src/domain` und `src/tastschreiben` um `dexie`, `@supabase/*`, `**/storage/*`, `**/integrations/*` ergänzen; `app/components` ohne `dexie`; `no-restricted-globals` (`localStorage`, `indexedDB`) für `app/views` und `app/ui`; ggf. `dependency-cruiser` für transitive Regeln.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Alle 14 Fälle aus P3 werden wie dokumentiert blockiert.

### A-011 – Monolithische Container, uneinheitliche Trennung von Ansicht und Ablauf, ad-hoc Daten- und Ereigniskopplung

- **Bereich:** Codequalität, Wartbarkeit
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/raum/spiel/live-game.tsx` (970 Zeilen, eine Komponente mit 25 `useState`, 10 `useEffect`, `submit` Zeilen 621-750 mit Speichern, Bewertung, Battle-Ladung und Fortschrittsmeldung); `app/frei/mathematics/mental-math-app.tsx` (902 Zeilen, 28 `useState`, eigenes Markup außerhalb `app/views`); `app/haus/house-app.tsx`, `app/frei/german/laufdiktat/running-dictation-app.tsx`, `app/lehrer/haeuser/teacher-houses.tsx` (eigenes Markup, nicht in der Bestandsliste von `docs/architecture.md`); `window`-Ereignis `teacher-data-changed` als Datenbus (`app/components/teacher-workspace-manager.tsx:410-418`, `app/components/cloud-sync-client.ts:29`); ≥ 30 Stellen erzeugen eigene Dexie-Instanzen (`new PersonalLearningDatabase()` als Standardparameter in fast jeder Repository-Fabrik, `useMemo` in Containern), Schließen nur in `use-learner-dashboard.ts`.
- **Beschreibung:** _Konzept:_ „Umfangreiche Screens trennen Zustand und Abläufe (Hook) von der Darstellung … etwa `app/raum/spiel/`.“ _Implementierung:_ Gerade `app/raum/spiel/live-game.tsx` ist das Gegenbeispiel. Die Dateigrößen liegen knapp unter der ESLint-Grenze von 1 000 Zeilen – die Grenze wirkt als Deckel, nicht als Anlass zur Zerlegung. Die Bestandstabelle in `docs/architecture.md` ist auf Dateiebene für `app/components` korrekt, erfasst aber die gemischten Module außerhalb davon nicht.
- **Reproduktion / Prüfweg:** Zählung `useState`/`useEffect`; Suche nach Containern mit ≥ 15 HTML-Elementen außerhalb `app/views`, `app/ui`, `app/components`.
- **Betroffene Nutzergruppen:** Entwicklung.
- **Mögliche Folgen:** Schwer testbare Abläufe (Kopfrechnen-Container 68 % Zweige, Live-Spiel 74 %), Regressionsrisiko bei Änderungen am Unterrichtskern.
- **Empfehlung:** Zustandsautomaten der Abläufe (Runde, Antwort, Speichern) als reine Funktionen/Reducer in `src/` herauslösen, Container auf Verdrahtung reduzieren; eine Datenbankinstanz je Bereich als Modul-Singleton mit expliziter Subscription statt Fensterereignissen (z. B. Dexie `liveQuery`); Bestandstabelle um alle gemischten Module ergänzen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Keine Komponente > 400 Zeilen mit mehr als 10 Zustandsvariablen; Abläufe von Live-Spiel und Kopfrechnen sind ohne DOM testbar.

### A-012 – Datenwachstum und Projektionsaufwand: alles wird bei jeder Ansicht vollständig geladen und validiert

- **Bereich:** Performance, Datenhaltung
- **Status:** bestätigt (gemessen); Auswirkung auf Schul-iPads begründetes Risiko
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `src/storage/personal-learning-events.ts:86-153` (Index nur `id, learningObjectId, occurredAt, roundId`, kein Modul-/Quellindex); `app/lernen/use-learner-dashboard.ts:66-78` (Empfehlungen + Portion + Rohliste: 3–4 Vollscans, bis zu 3 vollständige Zod-Prüfungen je Aufruf); `src/storage/daily-plan.ts:186-238`; `app/components/learning-box-app.tsx:222-241` (jede LernBox-Aktion lädt Karten und Portion neu); `app/frei/mathematics/mental-math-app.tsx:186-189` (lädt alle Ereignisse aller Module für Mathe).
- **Beschreibung:** Keine Kompaktierung, Archivierung oder inkrementelle Projektion. Messung (P9): 6 000 Ereignisse pro Schuljahr ≈ 2,75 MB; einmalige Zod-Prüfung 44 ms, `dailyPlan.progress` 174 ms (fake-indexeddb) auf dem Arbeitsplatzrechner. Für ein Schuljahr unkritisch; linear wachsend und auf älteren iPads um ein Mehrfaches langsamer (nicht gemessen). Der Schüler-Handabgleich lädt jedes Mal die komplette Sicherung hoch.
- **Reproduktion / Prüfweg:** `repro-a/a-perf-year.test.ts`.
- **Betroffene Nutzergruppen:** Kinder mit mehrjähriger Nutzung, ältere Geräte.
- **Mögliche Folgen:** Spürbare Wartezeiten beim Start nach mehreren Schuljahren; wachsende Sicherungs- und Cloud-Dateien.
- **Empfehlung:** Index `[learningArea+occurredAt]`; Ereignisse nur einmal je Ansicht laden und an alle Projektionen reichen; abgeschlossene Zeiträume zu Schnappschüssen verdichten (setzt A-003a voraus); Messung auf einem echten Schul-iPad.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Startseite mit 20 000 Ereignissen auf einem iPad der 6./7. Generation < 500 ms bis zur Anzeige.

### A-013 – Uneinheitliche Validierung, doppelte Schemata und verstreute Datumslogik

- **Bereich:** Codequalität, Konsistenz
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** LernBox-Karten/-Stapel werden beim Lesen gar nicht validiert (`src/storage/personal-learning-events.ts:333-560`), Ereignisse streng (A-001); doppelte Schemata mit unterschiedlicher Strenge: `src/storage/progress-schema.ts:20-38` (ohne `.strict()`, entfernt Zusatzfelder) vs. `src/domain/personal-backup.ts:40-66` (`.strict()`); Tagesgrenzen: `src/domain/adaptive-learning.ts:39` (UTC-Tag `occurredAt.slice(0, 10)`) vs. `app/lernen/use-learner-dashboard.ts:80-82` (`localDayKey`); `DAY_MS`/`86_400_000` mindestens zehnmal eigenständig definiert (u. a. `learning-box.ts:68`, `learning-word-progress.ts:54`, `math-practice.ts:217`, `storage/daily-plan.ts:27`, `learning-box-app.tsx:73`); `leitner-schedule.ts:24-28` rechnet mit `setUTCDate`.
- **Beschreibung:** _Konzept:_ „Datumsarithmetik wird nicht verstreut selbst implementiert“; „alle externen oder gespeicherten Daten“ werden mit Zod geprüft. _Implementierung:_ beides nur teilweise. Aktive Tage auf der Fortschrittsseite (UTC) und auf der Startseite (lokal) können zwischen 0 und 2 Uhr voneinander abweichen.
- **Reproduktion / Prüfweg:** Suche nach `slice(0, 10)`, `86_400_000`, `DAY_MS`; Vergleich der Schemata.
- **Betroffene Nutzergruppen:** Entwicklung; geringfügig Kinder (Anzeige aktiver Tage).
- **Mögliche Folgen:** Abweichende Zählungen, Pflegeaufwand bei Schemaänderungen (zwei Stellen).
- **Empfehlung:** Ein Zeitmodul (`local-day.ts` erweitern) für alle Tages- und Intervallrechnungen; ein Schema je Datensatz (strenges Schreib-, tolerantes Leseschema, siehe A-001); Karten beim Lesen prüfen.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Keine Literal-Tageslänge außerhalb des Zeitmoduls; ein Schema je gespeichertem Typ.

### A-014 – Eingecheckte, veraltete Service-Worker-Dateien; Fingerabdruck mit Testdateien

- **Bereich:** Build, Auslieferung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `public/sw.js`, `public/version.json` (eingecheckt, `b5f357495db3`); `scripts/generate-service-worker.mjs:11-41` (hasht `app`, `src`, `worker` inkl. aller Testdateien, nicht aber `package-lock.json`, `public/`, `proxy.ts`).
- **Beschreibung:** Der eingecheckte Fingerabdruck entspricht nicht dem Quellstand (`bff775c1f28b`). Da `prebuild` neu erzeugt, ist das ausgelieferte Artefakt korrekt – die eingecheckte Datei ist jedoch irreführend und erzeugt bei jedem lokalen `dev`/`build` Diffs. 178 von 622 gehashten Dateien sind Tests: Eine reine Teständerung löst bei allen Nutzern einen Update-Hinweis aus; eine reine Lockfile-Änderung dagegen nicht.
- **Reproduktion / Prüfweg:** P12 (`repro-a/fingerprint.mjs`).
- **Betroffene Nutzergruppen:** Entwicklung; Nutzer (unnötige Update-Hinweise).
- **Mögliche Folgen:** Verwirrung, unnötige Aktualisierungsaufforderungen im Unterricht.
- **Empfehlung:** Generierte Dateien in `.gitignore`; Fingerabdruck aus dem gebauten `dist/client` (tatsächlich ausgelieferte Dateien) berechnen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** `git status` bleibt nach `npm run build` sauber; Teständerungen ändern den Fingerabdruck nicht.

### A-015 – Demo-Pfad schreibt echte, nicht idempotente Lernereignisse

- **Bereich:** Datenhygiene, prototypische Pfade
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `app/components/first-learning-round.tsx:175-215` (`storeResult`: `id: crypto.randomUUID()`, `practice.route: "/klasse/7b/aufgaben/vokabeln"`, `classContext.classId: "klasse-7b"`); `src/storage/daily-plan.ts:100-116` (Fehler-Ereignisse mit `practice` werden Portionselemente); `src/domain/release.ts:125-130` (Demo-Klasse `vorschau`, „Testgelände der Browser-Tests“); `proxy.ts:22-36` (Vorschau-Cookie 365 Tage).
- **Beschreibung:** Wer die Vorschau auf einem Schülergerät einschaltet (z. B. Lehrkraft zum Vorführen), erzeugt über die Demo-Klasse echte Lernereignisse mit Zufalls-ID (Doppeltipp → Doppelereignis, entgegen „keine doppelten Ereignisse“). Fehler daraus landen als Portionselemente mit einer Route, die ohne Vorschau umgeleitet wird – solche Elemente sind dann nicht erledigbar. Produktionscode dient zugleich als Test-Fixture.
- **Reproduktion / Prüfweg:** Lesen der Fundstellen; nicht im Browser nachgestellt.
- **Betroffene Nutzergruppen:** Kinder auf Geräten mit aktivierter Vorschau.
- **Mögliche Folgen:** Dauerhaft offene, unerledigbare Tagesportion; verfälschte Statistik.
- **Empfehlung:** Demo-Pfade in einen getrennten Datenbereich schreiben oder ohne Speicherung betreiben; Test-Fixtures nicht als Produktionsroute; Vorschau-Cookie befristen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Demo-Nutzung verändert `lernraum:personal:v1` nicht.

### A-016 – Benennung und Sprachmischung in persistierten Werten

- **Bereich:** Code-Konsistenz
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** Routen `/frei/mathematics`, `/frei/german`, `/frei/typing` neben `/lernbox`, `/lernen`, `/raum`; gespeicherte Werte `"laufend"`/`"abgeschlossen"` (Textbox), `"eigen"`/`"unterricht"` (Wortboxen), `"richtig"`/`"gross-klein"` (Wortrunden) neben `"correct"`/`"not-assessed"` (Ereignisse), `"UEBUNG"`/`"BATTLE"`; zwei verschiedene Hooks `useContentLibrary` (`app/lehrer/use-content-library.ts`, `app/lehrer/live/hooks/use-content-library.ts`); Metadaten „Lernraum – Laufdiktat“/„Datensparsames Laufdiktat …“ in `app/layout.tsx:52-58`.
- **Beschreibung:** Englische Bezeichner, deutsche Kommentare sind konsistent; problematisch ist die Mischung in **gespeicherten** Werten und Routen, weil Umbenennungen dort Migrationen erzwingen.
- **Reproduktion / Prüfweg:** Lesen der Schemata und Routen.
- **Betroffene Nutzergruppen:** Entwicklung.
- **Mögliche Folgen:** Höherer Einarbeitungsaufwand, Fehler bei Vergleichen.
- **Empfehlung:** Konvention festschreiben (z. B. gespeicherte Werte englisch, UI-Texte deutsch); bei der nächsten Schema-Version vereinheitlichen; Metadaten aktualisieren; gleichnamige Hooks umbenennen.
- **Aufwand (grob):** S (Konvention) / M (Migration)
- **Erfolgskriterium:** Konvention dokumentiert; neue Schemata halten sie ein.

### A-017 – Wartbarkeit durch eine Einzelperson: Umfang und Änderungstempo übersteigen, was ohne KI-Agenten pflegbar ist

- **Bereich:** Wartbarkeit, Projektorganisation
- **Status:** begründetes Risiko / offene Frage
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel (flacher Klon, nur 30.09.–19.10.2026 sichtbar)
- **Fundstelle:** Gesamtumfang ≈ 61 000 Zeilen Produktionscode (`app/` 38 836, `src/` 21 942) und ≈ 39 000 Zeilen Tests; im sichtbaren Zeitraum 180 Commits, davon 153 unter der Autorenkennung „Claude“; ≈ 20 Umsetzungspläne in `docs/`, 57 Entscheidungen im Vault.
- **Beschreibung:** Die Codebasis wächst in einem Tempo, das eine einzelne Lehrkraft nur mit KI-Unterstützung halten kann. Das ist legitim, aber dann muss die Architektur besonders einfach und regelgesichert sein. Tatsächlich sind Randfunktionen (A-008) und doppelte Logik (A-004) entstanden, während die Kernverträge (A-001, A-003) fragil sind. Der Bus-Faktor ist 1; Schulträger können ohne Betriebs- und Übergabekonzept nicht auf den Weiterbetrieb vertrauen.
- **Reproduktion / Prüfweg:** `git log` (flacher Klon), Zeilenzählung.
- **Betroffene Nutzergruppen:** Schulen, die die Anwendung einsetzen; die Lehrkraft selbst.
- **Mögliche Folgen:** Wissensverlust, steigende Kosten pro Änderung, Abhängigkeit von Agenten-Werkzeugen.
- **Empfehlung:** Umfang aktiv reduzieren (A-008), kurze Architekturentscheidungsdokumente (ADR) für die tragenden Entscheidungen (Datenmodell, Framework, Sync), „Kernverträge“ mit Änderungsprotokoll, ein Übergabe-/Betriebsdokument für Schulträger.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Eine fremde Entwicklerin kann mit `docs/` in einem Tag ein kleines Feature im Lernkern umsetzen; dokumentierter Betriebs- und Ausstiegsplan.

### A-018 – Local-first ohne Persistenzanforderung: Daten der Kinder hängen am Browser-Speicher des Geräts

- **Bereich:** Datenhaltung (Schnittstelle zu B)
- **Status:** begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** kein Aufruf von `navigator.storage.persist()` im gesamten Code (Suche in `app/`, `src/`); einzige Datenhaltung IndexedDB des Geräts; Sicherung nur manuell (Erinnerung in `src/storage/backup-reminder.ts`).
- **Beschreibung:** Die Architektur macht den Browser-Speicher zur einzigen Quelle der Wahrheit. WebKit begrenzt laut eigener Aussage von 2020 skriptschreibbaren Speicher (IndexedDB u. a.) in Safari auf sieben Tage ohne Interaktion; für Home-Screen-Web-Apps gelte ein eigener Zähler bzw. eine Ausnahme. Quellen (nur Sekundärquellen erreichbar, aktuelles Verhalten **nicht online verifiziert**): [Search Engine Land: „What Safari’s 7-day cap on script-writeable storage means for PWA developers“](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519), [WebKit Bugzilla 237350](https://bugs.webkit.org/show_bug.cgi?id=237350). Schul-iPads, die die Seite in Safari statt als installierte App nutzen, wären nach Ferien gefährdet.
- **Reproduktion / Prüfweg:** Codesuche; Verhalten auf echtem iPad nicht prüfbar (kein Gerät).
- **Betroffene Nutzergruppen:** Kinder auf Schul-iPads, besonders nach Ferien.
- **Mögliche Folgen:** Vollständiger Verlust des Lernstands ohne Warnung.
- **Empfehlung:** `navigator.storage.persist()` anfordern und Ergebnis anzeigen; Installation als Home-Screen-App für Schulgeräte verbindlich machen und prüfen (`display-mode: standalone`); automatische lokale Sicherung bzw. Sicherung über den Klassen-Rückweg. Detailprüfung durch B.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Die App zeigt den Persistenzstatus; Testprotokoll eines Schul-iPads nach 14 Tagen Nichtnutzung.

---

## 5 Bewertung der Dimensionen (0–5)

| Dimension                  | Note | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architektur                |  2,5 | Stark: framework-freier Fachkern ohne Speicher-/UI-Abhängigkeiten, reine Ansichten, getrennte Datenbereiche, transaktionale Ereignis- und Zustandsschreibung, idempotente Ereignis-IDs. Schwach: Die tragende Behauptung „Lernstände aus unveränderlichen Ereignissen“ trifft nur für Mathe zu (A-003); die Wiederholungsregel existiert mehrfach und widersprüchlich (A-004); die Datenverträge sind nicht vorwärtskompatibel (A-001); die Laufzeitplattform (dynamisches SSR/RSC auf jungem Framework) passt nicht zum Local-first-Ziel (A-007); Randfunktionen sind überdimensioniert (A-008). |
| Codequalität               |    3 | Sehr strenger TypeScript-Modus, 0 × `any`, 0 × `@ts-ignore`, begründete Lint-Ausnahmen, saubere reine Funktionen im Kern. Dagegen: monolithische Container (A-011), 145 unbehandelte Promises, keine Fehlergrenzen, uneinheitliche Fehlerzustände (A-002), toter Code und Vorlagenreste, verstreute Datumslogik (A-013).                                                                                                                                                                                                                                                                          |
| Wartbarkeit                |    2 | Gute Dokumentationsdisziplin (Bestandstabelle stimmt auf Dateiebene, Freigabetabelle per Test gegen README geprüft), aber 61 000 Zeilen bei Bus-Faktor 1 (A-017), Doku-Code-Drift in den tragenden Aussagen (Ereignisquelle, Modul-Adapter, Datumsregel), mehrere parallele Mechanismen (zwei Lehrer-Abgleiche, zwei Empfehlungslogiken), Plattformbindung.                                                                                                                                                                                                                                       |
| Erweiterbarkeit            |    2 | Kein Modulvertrag, ≈ 20 Berührungspunkte pro neuem Modul, geschlossene Enums in gespeicherten Daten (A-009, A-001), Inhalte im Quellcode, keine Mehrlehrkraft- oder Schulstruktur. Positiv: Freigaberegister als zentrale Sichtbarkeitssteuerung, versioniertes Austauschformat `LearningBundleV1` als Ansatz.                                                                                                                                                                                                                                                                                    |
| Testbarkeit / Testqualität |    3 | Kern und Speicher hervorragend getestet (98 %/93 % bzw. 93 %/87 %), Eigenschaftstests im Sync-Kern, PGlite-Datenbankverträge, Render-Tests gegen den Worker. Aber: Kennzahl schließt `app/` aus (real 78,7 %/72,2 %, A-005), Browser-Suite prüft den Dev-Server mit Vorschau statt des Artefakts (A-006), Lernregeln ohne Soll-Tabellen-Tests, einzelne Tests schreiben Fehlverhalten fest (A-004).                                                                                                                                                                                               |

## 6 Die fünf wichtigsten Befunde

1. **A-001 (P1)** – Ein unpassendes Ereignis legt Empfehlungen, Tagesportion und Mathe-Wiederholung lahm; kein gefahrloser Rollback, keine Vorwärtskompatibilität.
2. **A-004 (P1)** – Parallele, widersprüchliche Wiederholungslogiken; der Wortspeicher hebt Wörter nach einem Nachmittag auf Box 5/30 Tage und verletzt die eigene Leitner-Spezifikation.
3. **A-003 (P2)** – „Ereignisquelle“ nur dem Namen nach; nach dem Gerätezusammenführen widersprechen sich Kartenstand und Ereignisse, Regelkorrekturen sind nicht rückwirkend anwendbar.
4. **A-002 (P2)** – Fehler erscheinen als „nichts dran“, „0 von 50“ oder Dauer-Laden; keine Fehlergrenzen, keine Diagnose.
5. **A-007 (P2)** – Dynamisches SSR/RSC auf einem acht Monate alten, Cloudflare-gebundenen Framework für eine Local-first-PWA; Produktionsartefakt lokal nicht startbar und in der Browser-Suite ungetestet (zusammen mit A-006).

## 7 Echte Stärken

- **Fachkern sauber isoliert:** `src/domain` importiert nachweislich nur `zod` und einen Typ; Zufall und Zeit sind fast überall injizierbar; Fachregeln als reine, benannte Funktionen.
- **Reine Ansichten wirklich rein:** `app/views` importiert weder Speicher noch Integrationen; ESLint erzwingt das wirksam (bis auf `localStorage`, A-010).
- **Typdisziplin:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`; kein `any`, kein `@ts-ignore`; `eslint-disable` nur mit Begründung (erzwungen).
- **Schreibpfade robust:** Zustand und Ereignis werden in einer Dexie-Transaktion geschrieben; inhaltsbasierte Ereignis-IDs (`learningEventIdentity`) machen Wiederholungen idempotent; „unveränderlich“ wird beim Schreiben geprüft.
- **Mathe-Wiederholung als echte Projektion** (`mathReviews`): deterministisch, gut dokumentiert, aus Ereignissen rekonstruierbar – das Muster, das für die übrigen Module fehlt.
- **Vorbildliche Fehlerzustände** in Kopfrechnen, Wortspeicher und Textbox (P8) – zeigen, dass das Muster bekannt ist.
- **Tolerante Verarbeitung im Lehrer-Abgleich** (`safeParse` je Datensatz, Eigenschaftstests für Merge/HLC/Hash).
- **Dokumentation mit Selbstprüfung:** Freigabetabelle im README wird per Test gegen `release.ts` geprüft; Bestandstabelle der Komponenten stimmt auf Dateiebene.
- **Abhängigkeitspflege:** gepinnte Versionen, gruppierte Dependabot-Updates, 0 bekannte Schwachstellen in Laufzeitabhängigkeiten (mit der Einschränkung aus A-007).
