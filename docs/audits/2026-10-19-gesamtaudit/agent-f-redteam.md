# Prüfinstanz F – Red Team (Gegenprüfung und unabhängige Kritik)

Stand: 20.10.2026, Commit `c30b916`, App-Version 0.8.0. Bericht wird fortlaufend
geschrieben (Ergebnissicherung). Reproduktionen liegen im Scratchpad unter
`repro-f/`, nicht im Repository.

## Kopf

Rolle: Unabhängige Gegenprüfung aller P0/P1-Befunde der Prüfinstanzen A, B, C, D, E und G
sowie Kritik an Belegen, Empfehlungen und Grundsatzentscheidungen. Schwerpunkt laut
Nutzervorgabe: Qualität der Gegenprüfung und Aussagekraft der Empfehlungen vor neuen
Befunden. Nur lesend; einzige Schreibstelle ist diese Datei. Drei Anläufe: Der erste und
der zweite brachen am Nutzungslimit ab. Teil 1 bis B-011 stammt aus dem ersten Anlauf und
wurde unverändert übernommen.

### Untersuchte Dateien

- **Audit-Grundlagen und Berichte:** `00-stand.md`, `01-bestandsaufnahme.md`,
  `02-pruefauftraege.md`; vollständig gelesen: `agent-a-architektur.md` (Abschnitte 4–7),
  `agent-b-sicherheit.md`, `agent-c-qa-ux.md` (Abschnitte 1–3, C-001 bis C-014 in Auszügen,
  5–8), `agent-d-paedagogik.md` (D-001 bis D-003, Abschnitte 5–15), `agent-e-schularten.md`,
  `agent-g-korrektheit.md` (Abschnitte 1–4, G-001, G-007, G-010, G-011, G-014, 6–8).
  Übrige Einzelbefunde nur in der Kurzfassung des Auftrags.
- **Lernlogik:** `src/domain/learning-word-progress.ts` (+ `.test.ts:36-64`),
  `src/domain/learning-word.ts:1-112`, `src/domain/word-round.ts:86-300`,
  `src/domain/learning-box.ts:105-140, 291-470`, `src/domain/leitner-schedule.ts`,
  `src/domain/adaptive-learning.ts`, `src/domain/hold-to-reveal.ts`,
  `src/domain/practice-bridge.ts:25-85`, `src/domain/learning-bundle.ts:40-70`,
  `src/domain/student-assignment.ts:1-40`, `src/domain/personal-backup.ts:40-125`
- **Speicher und Integration:** `src/storage/personal-learning-events.ts:71-156, 333-397,
640-760, 793-861, 1175-1232`, `src/storage/daily-plan.ts:133-183`,
  `src/storage/personal-backup.ts:117-160`, `src/storage/student-classes.ts`,
  `src/domain/class-seal.ts`, `src/domain/class-enrollment.ts:37-54, 160-215, 325-376`,
  `src/integrations/laufdiktat/live-session.ts:20-40`, `teacher-results.ts`,
  `room-api.ts` (Ausschnitte), `word-store-transfer.ts:125-150`,
  `version-compatibility.ts`, `src/integrations/cloud-sync/sync.ts:16-33`
- **Oberfläche:** `app/views/wortspeicher/round-screen.tsx:120-180`, `stage-prompt.tsx`,
  `memory-block.tsx`, `app/components/learning-word-app.tsx:130-160, 220-260, 330-350`,
  `app/components/student-class-enrollment.tsx:110-160`,
  `app/components/student-settings-panel.tsx:190-280`, `app/components/cloud-sync-panel.tsx`
  (Fehlerzweige), `app/components/teacher-class-configurator.tsx:195-205, 350-395,
605-625`, `app/views/lehrer/teacher-frame.module.css`, `app/ui/base.css`,
  `app/ui/lernraum-ui.css:3005-3025`, `app/ui/update-toast.tsx`,
  `app/raum/use-writing-relief.ts`, `app/raum/spiel/live-game.tsx:440-515`,
  `app/lehrer/live/hooks/use-live-room-session.ts:355-475`,
  `app/frei/german/laufdiktat/running-dictation-app.tsx:405-425`,
  `app/views/lernbox/parts/study.tsx` (Eingabeattribute), `app/views/start/landing-screen.tsx`,
  `app/impressum/page.tsx`, `app/datenschutz/page.tsx`
- **Service Worker und Framework:** `scripts/service-worker.template.js`,
  `node_modules/vinext/dist/server/app-rsc-cache-busting.js` (Versionsschiefe)
- **Datenbank:** `supabase/migrations/20260825124001_migrate_laufdiktat_live_rooms.sql`
  (`student_key`-Prüfung)
- **Konzept:** Vault 06 (Leitner-Regeln, Live-Platzierung), 13, 19 (Einschreibung,
  Lehrerkontotrennung) **aus dem Commit-Stand** (`git show HEAD:…`). Die Vault-Dateien im
  Arbeitsverzeichnis sind von der Hauptinstanz geändert und wurden nicht verwendet.
  `docs/cloud-sync.md:197`, `docs/umsetzungsplan-lehrerbereich.md:65`.

### Ausgeführte Prüfungen

Alle Reproduktionen liegen im Scratchpad unter
`/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-f/`
und laufen mit der Audit-Konfiguration gegen den unveränderten Repository-Code.
Abschlusslauf am 20.10.2026: **6 Testdateien, 9 Tests, alle grün** (die Tests halten den
Ist-Zustand fest und geben die Werte auf der Konsole aus).

| Prüfung                                                                                                                  | Ergebnis                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f-a001-poison.test.ts` (2 Tests)                                                                                        | Ereignis mit Zusatzfeld → `dailyPlan.progress()` wirft `ZodError`. Sicherung mit einem Ereignis „aus der Zukunft“ → Import scheitert vollständig, 0 Ereignisse übernommen (A-001)   |
| `f-d001-copy.test.ts` (2 Tests)                                                                                          | Vier Abschreibrunden in 45 min: Box 2 → 3 → 4 → 5, fällig nach 30 Tagen. Fehler auf Stufe 6, dann einmal Abschreiben: Merkstufe 5 → 6, Box 1 → 2 (D-001, A-004)                     |
| `f-c006-print.mjs` (Playwright, Chromium 1194, Dev-Server 3002)                                                          | 24 Schüler, Druckmedium, A4-PDF: Desktop und iPad je 1 Seite, `pdftotext` 12/24 Namen. Mit einer Druckregel: 2 Seiten, 24/24 (C-006)                                                |
| `f-e001-relief.test.ts`                                                                                                  | Mia (Freigabe) und Ben auf einem Gerät → `true`; anderes Gerät nur mit Lea → `false` (E-001)                                                                                        |
| `f-g001-block.test.ts` (2 Tests)                                                                                         | Leerzeichen, geschütztes Leerzeichen und Punkt-Trennung → „falsch/fehlt/fehlt“; Komma und Zeilen → alles richtig. Drei Versuche mit `correct:false`, Box 3 → 1, Stufe 5 → 4 (G-001) |
| `f-g011-live.test.ts`                                                                                                    | Box 3: ohne Unterricht Box 3; nach `practice` Box 4 (14 d); nach `reset` Box 2 (3 d); Fehler in der LernBox Box 1 (1 d); `reset` und 9 h später Box 2 (G-011)                       |
| `f-001-help.test.ts`                                                                                                     | Box 4, Stufe 4: Hilfe → richtig ergibt Box 4, fällig in 14 d; falsch → richtig ergibt Box 1, fällig in 1 d (F-001)                                                                  |
| Abdeckung der vier Kerndateien mit den vorhandenen Unit-Tests (`npx vitest run` mit `--coverage`, Bericht im Scratchpad) | `learning-word-progress.ts` 100 %, `word-round.ts` 100 %, `learning-word.ts` 97,3 %, `learning-box.ts` 97,0 % Anweisungen; alle Tests grün                                          |
| Codesuchen (Teil 4.1)                                                                                                    | TODO/FIXME 0; `dangerouslySetInnerHTML` 3 (unkritisch); `storage.persist` 0 (B-002); `eslint-disable` 24 (begründet); `helpUses` nur geschrieben, nie gelesen                       |
| Webrecherche (erster Anlauf, B-002)                                                                                      | Apple-Klarstellung zur 7-Tage-Regel über Sekundärquellen (osnews.com, searchengineland.com); webkit.org aus dem Container nicht erreichbar                                          |

### Nicht untersuchte Bereiche

- **Keine eigene Prüfung** der P2/P3-Befunde außer den in Teil 2/3/6 genannten
  Stichproben (E-005, E-007, G-013, D-012 Tempo-Punkte, B-008 Bogengröße).
- **Keine echten iPads, kein Safari/WebKit, kein VoiceOver, keine MDM-Umgebung.** Druck über
  AirPrint, Bildschirmtastatur (Umschalt + Enter), Autokorrektur und die 7-Tage-Regel
  sind nicht auf Geräten geprüft.
- **Kein Live-Raum mit Supabase** (Regel: keine Produktivsysteme). F-002 und E-003 beruhen
  auf Codelesung.
- **Keine Rechtsprüfung.** Aussagen zu DSGVO/BaySchO sind Einschätzungen, keine Beratung.
- **Keine Nutzungsdaten, keine Beobachtung von Kindern oder Lehrkräften.** Alle
  Verhaltensannahmen sind in Teil 7 als ungeprüft gekennzeichnet.
- **Cloud-Abgleich-Engine der Lehrkraft** (HLC, Merge), Häuser, Duell, Spiegelschrift und
  Lehrer-Aufgaben nicht geprüft.
- Die zweite unabhängige Gegenprüfung (V1/V2) fand nicht statt. Diese Gegenprüfung ist
  daher die einzige für die P1-Befunde.

## Teil 1 – Gegenprüfung aller P0/P1-Befunde

Es gibt keinen P0-Befund in den Berichten A–E, G. Geprüft werden alle 17 P1-Befunde.

### Gegenprüfung A-001 – Strikte Ereignisschemata legen Projektionen lahm

- **Urteil:** im Mechanismus **bestätigt (reproduziert)**, in der Schwere **abgeschwächt (P1 → P2)**.
- **Beleg:** `repro-f/f-a001-poison.test.ts`. Ein Ereignis mit Zusatzfeld in
  `learningEvents` → `createDailyPlanRepository(db).progress()` wirft `ZodError`
  (`src/storage/daily-plan.ts:173-183`, `readSources`). Eine Sicherungs-/Cloud-Datei mit
  einem einzigen Ereignis „aus der Zukunft“ → `restorePersonalLearningBackup` wirft
  `ZodError`, danach 0 Ereignisse importiert (`src/storage/personal-backup.ts:132-160`).
- **Warum abgeschwächt:** Alle Schreibwege der App validieren mit demselben strikten
  Schema (`personal-learning-events.ts:384-385, 758, 838-839, 900-901, 1015-1016`;
  `personal-backup.ts:155`). Ein „vergiftetes“ Ereignis entsteht deshalb nur bei
  Versionsschiefe auf **demselben Gerät** (Rollback eines Releases, das ein Ereignisfeld
  ohne Dexie-Versionssprung ergänzt; zwei Tabs mit unterschiedlichem Service-Worker-Stand)
  oder bei Speicherbeschädigung. Ein Fremdgerät mit neuerer Version kann über Sicherung
  oder Cloud-Abgleich **nichts** einschleusen, dort scheitert stattdessen der gesamte
  Import (anderes Fehlerbild: Abgleich blockiert bis zum Update). Erhebt die
  Dexie-Version mit, scheitert ein Downgrade ohnehin früher mit `VersionError`
  (A hat das selbst geprüft, `repro-a/widerlegt-version-downgrade.tsx.txt`). Für einen
  Pilot mit einer Lehrkraft und seltenen Releases ist das ein P2-Robustheitsthema.
- **Was A unterschätzt:** Die Wurzel – strikte Schemata ohne Strukturtest gegen das
  Dexie-Schema – ist **nicht hypothetisch**: Sie hat mit B-001 (Ordner-Feld fehlt im
  Sicherungsschema) bereits einen realen, schweren Ausfall erzeugt. A-001 und B-001
  sollten im Abschlussbericht als ein Ursachenbündel „Schemaevolution“ geführt werden;
  dann ist das Bündel insgesamt P1, getragen von B-001.
- **Empfehlung (Bewertung):** A's Vorschläge (1) tolerantes Lesen mit Quarantäne und
  (5) Regressionstest „Ereignis aus Version n+1“ sind richtig. Vorschlag (3) „unbekannte
  Enum-Werte auf ‚unbekannt‘ abbilden“ ist für `assessment`/`direction` riskant: Eine
  Projektion, die unbekannte Bewertungen still ignoriert, verfälscht Fälligkeiten. Besser:
  Ereignisse mit unbekannten Pflichtwerten ganz in Quarantäne, nur unbekannte
  **Zusatzfelder** tolerieren (`z.object().passthrough()` bzw. `.strip()` beim Lesen).
  Wichtiger als (4) `schemaVersion` je Ereignis ist ein einziger Strukturtest, der jede
  Dexie-Tabelle und jedes Feld gegen Lese-, Schreib- und Sicherungsschema abgleicht.

### Gegenprüfung A-004 – Parallele Wiederholungslogiken, Lernwörter steigen ohne Fälligkeit

- **Urteil:** **bestätigt** (von der Hauptinstanz bereits per Codelesung bestätigt; hier nur
  Schwere und Empfehlung geprüft). Schwere P1 **angemessen**, aber nur im Bündel mit D-001.
- **Eigene Lesung:** `src/domain/learning-word-progress.ts:35-41` hebt die Box bei jedem
  `independentSuccess` ohne Blick auf `current.dueAt`. Ergänzend gefunden: Die
  Wortauswahl einer Wortspeicher-Runde ist **unabhängig vom Lernstand** – `sampleRoundWords`
  (`src/domain/word-round.ts:86-99`) zieht zufällig aus der Wortbox, ohne Box oder
  Fälligkeit zu beachten. Der Leitner-Stand eines Lernworts steuert also nur zwei Dinge:
  ob das Wort in der Tagesportion erscheint (`src/storage/daily-plan.ts:133-145`, nur bereits
  geübte Wörter, keine „neuen“) und was als „sicher“ angezeigt wird.
- **Folge für die Schwere:** A's Formulierung „Wörter verschwinden für 30 Tage“ gilt nur für
  die Tagesportion; im freien Üben kommen sie zufällig wieder. Der Schaden ist daher
  weniger ein Ausfall der Wiederholung als ein **falsches Mastery-Signal** („sicher“) und
  eine ausgehebelte Planung im Kernmodul. Zusammen mit D-001 (Abschreiben zählt als
  unabhängiger Erfolg) entsteht der Kernmangel: Vier Abschreibrunden an einem Nachmittag
  ergeben „gefestigt, 30 Tage Ruhe“. Das trifft das erklärte Hauptziel Rechtschreibung,
  deshalb bleibt P1 – als ein gemeinsamer Befund A-004/D-001, nicht zwei.
- **Empfehlung (Bewertung):** Ein gemeinsamer Wiederholungskern ist mittelfristig richtig,
  als **erster** Schritt aber zu groß und riskant (Refactoring über vier Module, Migration
  bestehender Stände). Kleinste wirksame Korrektur (S): In `updateLearningWordProgress`
  nur aufsteigen, wenn `current` fehlt oder `current.dueAt <= now`, und Stufe 1
  (Abschreiben) nie als Aufstieg werten. Die Vault-Regeltabelle als tabellengetriebener
  Test für alle Module (A's Vorschlag) ist der eigentliche Hebel und billig. Der Vorschlag,
  bestehende Lernwort-Stände „neu zu bewerten“, ist ohne vollständige Ereignishistorie
  (A-003) nicht sauber machbar; pragmatisch: alle Lernwörter mit Box ≥ 3 einmalig auf
  „fällig“ setzen, statt eine Heuristik zu erfinden.
- **Zielkonflikt (nicht aufgelöst):** „Kein Aufstieg vor Fälligkeit“ macht fleißiges
  Mehrfachüben an einem Tag für das Kind unsichtbar. Das ist lernwissenschaftlich gewollt
  (verteiltes statt massiertes Üben), kann aber motivierte Kinder entmutigen, wenn die
  Oberfläche nicht erklärt, warum sich nichts bewegt (siehe Teil 3).

### Gegenprüfung B-001 – Sicherung bricht bei LernBox-Ordnern ab

- **Urteil:** **bestätigt** (Hauptinstanz hat reproduziert; eigene Codelesung
  `src/domain/personal-backup.ts:67-77`: `personalBackupDeckSchema` `.strict()` ohne
  `folderId`; `personalDataSchema` `:104-120` ohne `learningBoxFolders`). Schwere P1
  **angemessen**: Es fallen alle drei Sicherungswege aus (Datei, Verzeichnis, Schüler-Cloud
  über `src/integrations/cloud-sync/sync.ts:16-23`), und Sicherung ist die einzige
  Absicherung gegen B-002.
- **Einschränkung:** Betroffen sind nur Kinder, die Ordner anlegen. Wie verbreitet das ist,
  ist unbekannt (keine Nutzungsdaten). Die Schwere ergibt sich nicht aus der Häufigkeit,
  sondern daraus, dass der Ausfall still ist und erst beim Datenverlust bemerkt wird.
- **Empfehlung (Bewertung):** B's Empfehlung ist gut und vollständig (Feld + Tabelle +
  verwaiste `folderId` beim Einspielen bereinigen + Strukturtest). Ergänzung: Der
  Strukturtest muss auch `A-001` abdecken (siehe dort) – ein Test für beide Befunde.
  Zusätzlich sollte die Sicherungserinnerung einen **fehlgeschlagenen** Sicherungsversuch
  als Warnzustand anzeigen, nicht nur „zuletzt gesichert vor n Tagen“.

### Gegenprüfung B-002 – Keine Maßnahme gegen Speicherlöschung (iPadOS/Safari)

- **Urteil:** Fehlen der Maßnahmen **bestätigt (Codeanalyse)**: `grep -rn "storage.persist\|storage.estimate\|persisted()" app src` → kein Treffer. Plattformteil **teilweise abgeschwächt**. P1 bleibt angemessen, weil der gesamte Lernstand nur lokal liegt.
- **Was überzeichnet ist:** Die 7-Tage-Regel von WebKit zählt **Tage mit Safari-Nutzung
  ohne Interaktion mit der Website**, keine Kalendertage. Zum Home-Bildschirm
  hinzugefügte Web-Apps haben laut Apples Klarstellung einen eigenen Zähler, und
  WebKit will dort Erstanbieterdaten nicht löschen (Websuche 20.10.2026: Apple-Klarstellung
  zitiert in osnews.com/?p=131566 und searchengineland.com; webkit.org selbst war aus
  dem Container nicht erreichbar). Schul-iPads, die in den Ferien in der Schule liegen,
  zählen keine Safari-Tage. Das reale Risiko liegt also bei (a) Safari statt
  Home-Bildschirm, mit privat mitgenommenen Geräten, (b) MDM-Löschprofilen oder Shared-iPad-Modus,
  (c) dem Speicherwechsel beim späteren „Zum Home-Bildschirm“ (B's Punkt 2 – der
  wichtigste und am wenigsten bekannte).
- **Bewertung der Empfehlungen:**
  - (1) `navigator.storage.persist()` ist unter iOS **kein verlässlicher Schutz**: Wie es
    mit der 7-Tage-Regel zusammenwirkt, ist nicht dokumentiert (Entwicklerberichte im
    Apple-Forum widersprechen sich, Thread 710157). Als billiger Zusatz sinnvoll, als
    Erfolgskriterium („`persisted()` ist true“) ungeeignet.
  - (2) Ein „Speicher-Kanarienvogel“ **funktioniert nicht wie beschrieben**. Eine
    vollständige Löschung entfernt auch die Markierung; ein gelöschtes und ein neues
    Gerät sind lokal nicht unterscheidbar. Er erkennt nur Teillöschungen. Wirksamer:
    Auf einem leeren Gerät immer prominent „Ich habe schon gelernt – Sicherung
    einspielen“ anbieten.
  - (3) Installation vor dem ersten Lernen ist der wirksamste und billigste Hebel (S).
  - (5) Eine schulseitige Sicherung, die die Lehrkraft einsammelt, steht im Konflikt mit
    B-011 und der Datensparsamkeit und vergrößert die Lehrerdaten auf geteilten Geräten
    (B-009). Nicht ohne Datenschutzkonzept umsetzen.

### Gegenprüfung B-003 – Realtime-Kanäle ohne Autorisierung

- **Urteil:** **bestätigt (Codeanalyse)**. Schwere **kontextabhängig**: P2 im Grundschulpilot
  auf verwalteten iPads, P1 vor einem Einsatz in Sek I oder einem breiteren Rollout.
- **Beleg:** `app/components/live-room-join.tsx:177-179` öffnet `room-${code}` ohne
  `private: true`. Der `attack`-Handler `:348-367` prüft nur `to` und `type`, nicht, ob
  `from` ein Teilnehmer ist. `fromLabel` ist beliebiger Freitext und wird dem Kind als
  „Angriff von ${from} geblockt.“ angezeigt (`app/raum/spiel/live-game.tsx:302-316`). Der
  Lehrer zeigt unbekannte Präsenzschlüssel wörtlich (`app/lehrer/live/lib/participant-display.ts:13-16`).
- **Verschärfung, die B nicht benennt:** Der realistischste Angreifer ist kein Fremder,
  sondern ein Kind **im Raum**: Es kennt Code und Teilnehmerschlüssel und kann einer
  Mitschülerin gezielt eine Nachricht mit frei gewähltem Absendertext schicken. Das
  ist ein Mobbingkanal im Battle-Modus. Fremde haben dagegen wenig Motiv.
- **Was die Schwere begrenzt:** Auf verwalteten iPads gibt es keine Entwicklerkonsole. Ein
  Angriff braucht einen eigenen Rechner und das Live-Fenster. Inhalte und Lösungen kommen
  nicht über Broadcast (B selbst: Start und Ende lösen nur einen autorisierten RPC-Abgleich aus).
- **Empfehlung (Bewertung):** Variante (b) – inhaltsleeres Wecksignal auf einem nicht
  erratbaren Thema (Raum-UUID), Präsenz für die Lehreransicht nur aus
  `room_participants` – ist klar vorzuziehen. Variante (a) mit anonymer Supabase-Auth
  erhöht genau die Komplexität, die A-008 kritisiert. Sofort und billig (S): `fromLabel`
  nicht mehr anzeigen, sondern das Tier aus der eigenen `peers`-Liste nachschlagen, und
  `attack` nur von bekannten Teilnehmern annehmen.

### Gegenprüfung B-008 – LRS-Freigabe im Einschreibe-QR

- **Urteil:** technisch **bestätigt (Codeanalyse)**, Schwere **abgeschwächt (P1 → P2)**.
- **Beleg:** `src/domain/class-enrollment.ts:166-174` (Flag-Bit 4), `:196-211` (Signatur
  angehängt), Einzelansicht `app/components/teacher-class-configurator.tsx:618-620`
  (`size={member.writingRelief ? 280 : 220}`).
- **Was überzeichnet ist:** Auf dem gedruckten QR-Bogen sind **alle** Codes 180 px groß
  (`teacher-class-configurator.tsx:380-388`, `size={180}`). Dort unterscheiden sich die
  Codes nur durch die Moduldichte (61 bzw. 69 Module laut B), und das erkennt ohne
  Vergleich kaum jemand. Dekodieren setzt voraus, dass man den URL-Fragmentteil
  base64-dekodiert und das Bitformat kennt. Die Aussage „auf dem gedruckten Bogen
  sichtbar“ ist damit nur eingeschränkt richtig. Realistisch sichtbar ist der Unterschied in der
  projizierten Einzelansicht (220 vs. 280 px).
- **Warum trotzdem relevant:** Das eigentliche Problem ist konzeptionell (siehe E-006): Ein
  Diagnosemerkmal wandert auf Papier und in einen dauerhaften Link. Die Sofortmaßnahme
  (gleiche Größe, gleich lange Nutzlast) kostet S und sollte trotz P2 vor dem nächsten
  Druck umgesetzt werden.

### Gegenprüfung B-009 – Lehrerdaten auf geteilten Geräten ungeschützt

- **Urteil:** **bestätigt (Codeanalyse)**, P1 **angemessen** – und zwar gerade für den Pilot.
- **Beleg:** `app/views/start/landing-screen.tsx:67-69` („Lehrer-Login“ ohne Login);
  `docs/umsetzungsplan-lehrerbereich.md:65` und Entscheidung 43 („Es gibt keinen
  Lehrer-Login“). Entscheidend: `docs/cloud-sync.md:197` nennt als **Pilotszenario**
  ausdrücklich „Laptop zu Hause, Tafel in der Schule“. Der Abgleich legt die
  Lehrerdaten also planmäßig auf einem Gerät ab, das Kinder im Unterricht bedienen.
- **Empfehlung (Bewertung):** (1) Umbenennen ist S und sofort richtig. (2) Eine
  lokale PIN ohne Verschlüsselung der IndexedDB schützt nur gegen Neugier am Bildschirm,
  nicht gegen Datenexport. B schlägt Verschlüsselung mit dem Abgleich-Schlüssel vor,
  das ist richtig, aber M–L. Pragmatischer erster Schritt: (3) „Tafelmodus nur Material“,
  erzwungen bei „geteiltes Gerät“. Er löst das Pilotszenario ohne Kryptoaufwand.

### Gegenprüfung B-010 – Keine Trennung mehrerer Kinder auf Schülergeräten

- **Urteil:** **bestätigt (Codeanalyse)**: eine Datenbank je Origin
  (`src/storage/personal-learning-events.ts:71-156`), keine Funktion zum Löschen oder
  Wechseln in `app/components/student-settings-panel.tsx` (einziger Treffer zu
  „lösch“: Zeile 342, Hinweis beim Laden einer Sicherung). B's gestufte Schwere (P1 bei
  geteilten Geräten, P2 bei 1:1) ist **sachgerecht**.
- **Doppelung:** B-010 und E-001 beschreiben dieselbe Ursache aus Datenschutz- bzw.
  Unterrichtssicht. Sie sollten im Abschlussbericht als **ein** Befund geführt werden,
  sonst wird ein Konstruktionsmerkmal doppelt gewichtet. Die Geräteausstattung der
  Pilotklasse ist im Repository nirgends dokumentiert (offene Frage an den Entwickler).
  Davon hängt ab, ob dies der wichtigste Befund des Audits ist oder ein P2.
- **Empfehlung (Bewertung):** „Eigene Dexie-Datenbank je Profil“ ist technisch richtig,
  hat aber Folgen, die B nicht nennt: Sicherung, Cloud-Abgleich, Tagesportion,
  Service-Worker-Daten und die Klassenmitgliedschaft müssen profilbezogen werden.
  Bei Klassensätzen braucht der Profilwechsel eine kindgerechte Auswahl, die Kinder
  nicht verwechseln und nicht gegenseitig nutzen. Ohne PIN ist die Trennung nur eine
  Ordnungs-, keine Schutzmaßnahme. Aufwand L ist realistisch.

### Gegenprüfung B-011 – Rechtsrahmen trägt keinen Echtbetrieb

- **Urteil:** **bestätigt (Dokumenten- und Codeanalyse)**, P1 **angemessen**.
- **Beleg:** `app/impressum/page.tsx` („keine echten personenbezogenen Daten … nicht im
  regulären Schulbetrieb“) gegen `app/components/live-room-join.tsx:237-242`
  (Kommentar zum Fall „18 angemeldet, 17 sichtbar“ aus „real classroom use“) und
  `docs/cloud-sync.md:197` (Pilot an der Tafel). `app/datenschutz/page.tsx:54` beschreibt
  eine ChatGPT-Anmeldung; `app/chatgpt-auth.ts` existiert. Der Widerspruch zwischen
  Impressum und tatsächlichem Einsatz ist damit belegt.
- **Einordnung:** Kein P0, weil der Server nach Codelage nur pseudonyme Daten erhält
  (Tier, Fortschritt, Fehlerwörter, gehashte IP). Klarnamen und LRS-Merkmal bleiben lokal.
  Die Empfehlung „DSFA wahrscheinlich“ ist für die **Live-Raum-Verarbeitung**
  nicht zwingend. Eine dokumentierte Schwellwertprüfung kann genügen (eigene
  Einschätzung, keine Rechtsberatung). Für die lokale Klassenverwaltung mit
  LRS-Merkmal sieht das anders aus. Die Empfehlung, Vertragspartner müsse die Schule bzw. der
  Sachaufwandsträger sein, ist richtig und für eine Einzellehrkraft der eigentliche
  Engpass: Das ist kein Entwicklungs-, sondern ein Organisationsproblem.
- **Zielkonflikt:** Jede Empfehlung, die Lehrkraft besser zu informieren (E-003,
  „Kurzbericht“), erzeugt neue Datenflüsse und verschärft B-011 (siehe Teil 3).

### Gegenprüfung C-006 – QR-Bogen druckt nur die erste Bildschirmseite

- **Urteil:** **bestätigt (reproduziert)**, Schwere **abgeschwächt (P1 → P2)**, aber als
  Sofortmaßnahme vor dem ersten Klasseneinsatz einzuplanen.
- **Beleg:** `repro-f/f-c006-print.mjs` (eigenes Skript, Chromium 1194, Dev-Server 3002):
  Klasse mit 24 Schülern anlegen, „QR-Bogen für die Klasse“, `emulateMedia("print")`,
  `page.pdf` A4. Ergebnis Desktop 1280×800 und iPad-Hochformat 810×1080: je **1 Seite**,
  `pdftotext` findet **12 von 24** Namen. Der Rahmen hat im Druckmedium weiter
  `overflow: hidden` (gemessen). Gegenprobe mit einer einzigen eingefügten Druckregel
  (`height:auto; overflow:visible` für Rahmen, Layout und Spalte): **2 Seiten, 24 Namen**.
  Ursache wie von C beschrieben: `app/views/lehrer/teacher-frame.module.css:7-16`
  (`.frame` mit `height:100%`, `overflow:hidden`) und `:27-34` (`.column` mit
  `overflow-y:auto`). Die globalen Druckregeln (`app/ui/lernraum-ui.css:3014-3023`,
  `app/ui/base.css:76-80`) blenden nur Navigation und Fußzeile aus.
- **Warum abgeschwächt:** Der Fehler ist **sichtbar** (die Druckvorschau zeigt eine Seite,
  spätestens beim 13. Kind fehlt ein Code) und richtet keinen Daten- oder Lernschaden an.
  Die Einzelansicht je Kind ist ein Ausweichweg, wenn auch ein langsamer. Bei Klassen mit
  höchstens 12 Kindern tritt er nicht auf. P1 wäre gerechtfertigt, wenn der Bogen der
  einzige Einschreibeweg wäre oder der Fehler still bliebe.
- **Grenze:** Chromium-PDF ist nicht iPad-Safari mit AirPrint. Ob Safari an derselben
  Stelle abschneidet, ist nicht geprüft (sehr wahrscheinlich, weil die Ursache im
  CSS-Kasten liegt, nicht im Druckdialog).
- **Empfehlung (Bewertung):** C's CSS-Regel ist richtig und ausreichend (S). Ergänzen:
  einen E2E-Test, der per `page.pdf` die Anzahl der Namen im Druck zählt (nicht nur den
  Bildschirm). Ohne diesen Test kehrt der Fehler bei der nächsten Rahmenänderung zurück,
  weil derselbe Rahmen alle Lehrerseiten umschließt.

### Gegenprüfung D-001 – Abschreiben zählt als gesicherter Abruf

- **Urteil:** **bestätigt (reproduziert)**, an einer Stelle **verschärft**. P1 angemessen;
  zusammen mit A-004 als **ein** Kernbefund führen.
- **Beleg:** `repro-f/f-d001-copy.test.ts`. Vier richtige Eingaben auf Stufe 1 im Abstand
  von 15 Minuten ergeben Box 2 → 3 → 4 → 5, nächste Fälligkeit nach 30 Tagen
  (`src/domain/learning-word-progress.ts:34-55`). In Stufe 1 zeigt
  `app/views/wortspeicher/round-screen.tsx:128-133` das Wort über dem Eingabefeld
  (`StagePrompt`). Die Schaltfläche „Wort zeigen“ fehlt dort (`:162-168`), also bleibt
  `usedHelp` immer `false`.
- **Verschärfung:** Abschreiben hebt auch die **Merkstufe** auf den Höchstwert. Ein
  Fehler auf Stufe 6 senkt die Merkstufe auf 5 und setzt Box 1. Eine einzige
  Abschreibrunde danach ergibt **Merkstufe 6** und Box 2 (Gegenprobe im selben Test;
  Ursache `Math.max(current.stage, input.stage) + 1`, `:42-48`). Die Merkstufe als Maß
  für den Hilfebedarf (Vault 07) wird damit bedeutungslos. Abschreiben signalisiert
  „braucht keine Hilfe mehr“.
- **Kleine Korrektur an D:** Die Vorauswahl nimmt zuerst die Stufe der **letzten Runde
  derselben Box** (`app/components/learning-word-app.tsx:225-246`,
  `lastStageOf(id) ?? dueStage ?? 1`). Die „leichteste fällige Stufe“ greift nur ohne
  frühere Runde. Weil Abschreiben die gespeicherte Stufe hochzieht (siehe oben), ist der
  Effekt „Tagesportion wird zur Abschreibübung“ schwächer als bei D beschrieben. Er
  bleibt aber für Kinder bestehen, die zuletzt Stufe 1 gewählt haben.
- **Empfehlung (Bewertung):** D's Kernregel (Stufen 1–3 ohne Box-Aufstieg) ist richtig und
  S. Zwei Einwände:
  1. „Fällige Wörter auf mindestens Stufe 4, besser 6 vorwählen“ verschiebt das Problem.
     Für schwache Rechtschreiber erzeugt freier Abruf als Standard viele Fehlversuche,
     also Box-1-Schleifen und Frust. Besser: Vorwahl Stufe 4/5, der Abruf entscheidet
     über die Box, und eine sichtbare Erklärung „Abschreiben ist Üben, zählt aber nicht als
     gemerkt“.
  2. „Die Stufe im Ereignis speichern“ ändert das strikte Ereignisschema. Ohne vorheriges
     tolerantes Lesen (A-001) bricht das Einspielen auf Geräten mit älterer Version, also
     dasselbe Muster wie B-001. Reihenfolge: zuerst A-001, dann das Schemafeld.

### Gegenprüfung D-003 – Keine Kompetenzdiagnostik

- **Urteil:** Fehlen **bestätigt (Codeanalyse)**. Suche nach
  `lernstandscheck|kompetenzcheck|eingangstest|diagnos` in `app/` und `src/`: kein Treffer.
  `src/domain/adaptive-learning.ts:11-45` zählt nur Aktivitäten, Tage und „verbesserte“
  Objekte. `src/integrations/laufdiktat/live-session.ts:25-29` schreibt `TEST` auf
  `LAUFDIKTAT` um. Schwere P1 **als Zielabweichung angemessen**, aber in einer anderen
  Kategorie als D-001, G-001 oder B-001: Hier fehlt ein Konzeptbaustein, es liegt kein
  Defekt vor. Im Abschlussbericht getrennt ausweisen, sonst konkurriert eine
  L-Neuentwicklung mit S-Fehlerbehebungen um dieselbe Priorität.
- **Was D unterschätzt:** Jede Diagnostik auf den **heutigen** Lernständen würde deren
  Fehler erben: Abschreiben als Abruf (D-001), richtige Antworten als falsch (G-001,
  G-002, G-003, G-012), falsche als erledigt (G-007). Eine Kompetenzanzeige aus diesen
  Daten wäre eine **Scheindiagnose mit Zahlen**, schlimmer als keine, weil Lehrkräfte ihr
  vertrauen würden. Reihenfolge: erst Datenvalidität, dann Diagnostik.
- **Empfehlung (Bewertung):** Der Gegenvorschlag „kurze parallele Lernverlaufsproben auf
  einer festen Itembank“ ist fachlich richtig, für eine Einzellehrkraft aber kaum
  validierbar. Parallelität, Schwierigkeitsgleichheit und Normen der Formen verlangen
  Pilotdaten und psychometrische Prüfung. Realistischer:
  1. Das Versprechen „diagnosegestützt“ aus Auftrag und Vault streichen oder auf
     „wiederholungsgestützt“ korrigieren (S).
  2. Aus den Übungsdaten nach Behebung von D-001/G-001 einen ehrlichen
     Beherrschungsstand je Wortbox oder Phänomen zeigen, mit sichtbarer Herleitung (M).
  3. Für echte Lernverlaufsdiagnostik auf bestehende, validierte Werkzeuge verweisen,
     etwa die Plattform Levumi (Universität Kiel u. a., kostenfrei) oder quop. Nicht
     nachbauen. D nennt das selbst; es sollte der Hauptweg sein, nicht der Zusatz. (Quellen
     aus Fachkenntnis, nicht online verifiziert.)

### Gegenprüfung E-001 – Schreiberleichterung gilt für das Gerät statt für das Kind

- **Urteil:** **bestätigt (reproduziert)**. Schwere **kontextabhängig** wie B-010; beide als
  ein Befund führen.
- **Beleg:** `repro-f/f-e001-relief.test.ts`. Mia mit gültig signierter Freigabe und Ben
  ohne Freigabe sind auf einem Gerät eingeschrieben: `isWritingReliefActive` ergibt `true`.
  Auf einem Gerät, auf dem nur Lea eingeschrieben ist, ergibt es `false`, auch wenn Mia
  tippt (`src/domain/class-seal.ts:150-180`). Die zweite Einschreibung derselben Klasse
  wird ohne Rückfrage ergänzt (`app/components/student-class-enrollment.tsx:131-147`,
  Schlüssel `membershipId`, `src/storage/student-classes.ts:17`).
- **Einordnung:** Die Erleichterung wirkt nur bei Vokabeln im Live-Raum (E-006). Der
  LRS-Teil von E-001 ist deshalb schmal. Der große Schaden ist der **gerätegebundene
  Lernstand** (Tagesportion, Wortspeicher, Fehlerwörter), und das ist B-010. Ob die
  Pilotklasse geteilte Geräte nutzt, ist im Repository nirgends dokumentiert (offene Frage
  an den Entwickler). Davon hängt ab, ob dieses Bündel der wichtigste Befund des Audits ist.
- **Empfehlung (Bewertung):**
  - E's Sofortmaßnahme (keine Erleichterung bei mehreren Mitgliedschaften derselben Klasse)
    ist richtig und S. „Hinweis an die Lehrkraft“ hat aber keinen Kanal. Gangbar ist ein
    Merkmal „geteiltes Gerät“ in der Teilnehmerliste des Live-Raums.
  - Vorschlag (3) „Stationsmodus für alles, ohne persönlichen Lernstand“ schaltet die
    verteilte Wiederholung, den didaktischen Kern, genau für die Grundschule ab. Das ist
    eine ehrliche Notlösung, aber kein Ziel.
  - Apples „Geteiltes iPad“ setzt verwaltete Apple-Accounts und MDM voraus. Im Modus
    „temporäre Sitzung“ werden alle Daten beim Abmelden gelöscht, was B-002 verschärfen
    würde (Fachkenntnis, nicht online verifiziert).

### Gegenprüfung E-002 – Lehrkraft kann außer Vokabeln nichts zuweisen

- **Urteil:** **bestätigt (Codeanalyse)**: `src/domain/learning-bundle.ts:50-62` kennt nur
  `kind: "vocabulary"`; `src/domain/student-assignment.ts:8-23` ist Freitext mit
  `materialId`. P1 als Zielabweichung („differenziertes, selbstständiges Arbeiten“)
  vertretbar. Wie D-003 ist es eine Konzeptlücke, kein Defekt.
- **Ergänzung:** Der kleinste Hebel existiert halb. `?woerter=` wird bereits gelesen
  (`src/domain/practice-bridge.ts:33-48`, `app/components/learning-word-app.tsx:136-139`,
  höchstens 50 Wörter). Für Lernwörter ist ein Auftrags-QR deshalb wirklich S. Für
  Kopfrechnen gibt es keine URL-Parameter, dort ist es M.
- **Empfehlung (Bewertung):**
  - (1) Auftrags-QR ist der beste Vorschlag des ganzen Audits zur Differenzierung: billig,
    ohne Personendaten, ohne Server.
  - (2) „Übertragungspaket um neue Elementarten erweitern“ trifft das strikte
    Bündelschema. Ohne vorheriges tolerantes Lesen (A-001) lehnen ältere App-Stände solche
    Pakete vollständig ab. Reihenfolge beachten.
  - Gruppen-QR-Kärtchen machen Leistungsgruppen im Raum sichtbar. Das ist im
    Grundschulalltag üblich (Farbgruppen), aber eine bewusste Entscheidung.

### Gegenprüfung E-003 – Lehrkraft erfährt fast nichts

- **Urteil:** **bestätigt (Codeanalyse)**, mit einer **Korrektur zum Aufwand**. P1 als
  Zielabweichung angemessen; sie steht im direkten Konflikt mit B-011 (siehe Teil 3).
- **Korrektur:** Fehlerwörter **je Kind** liegen dem Lehrergerät bereits vor. Jeder
  Teilnehmerdatensatz trägt `wordErrors` (`src/integrations/laufdiktat/room-api.ts:65,
179`), und `aggregateWordErrors` (`teacher-results.ts:4-12`) fasst sie nur für die Klasse
  zusammen. Der CSV-Export (`:51-98`) lässt sie weg. E's Empfehlung (1) „Fehlerwörter je
  Teilnehmer“ ist daher **S**, nicht M.
- **Neu, nicht in E:** Der CSV-Export startet beim Beenden des Raums **automatisch**
  (`app/lehrer/live/hooks/use-live-room-session.ts:440-445`, `exportCsv`). Das geschieht
  laut Pilotszenario am Tafelrechner (`docs/cloud-sync.md:197`), also im Download-Ordner
  eines geteilten Geräts. Reichert man die Datei wie empfohlen mit Namen und Fehlerwörtern
  je Kind an, liegt eine sensible Datei unbemerkt auf dem Gerät, das Kinder bedienen
  (Verbindung zu B-009). Bedingung für E's Empfehlung: Export nur auf ausdrücklichen Klick,
  Namen nur lokal auf dem Lehrergerät zuordnen.
- **Dokumentationsdrift bestätigt:** `TEST` → `LAUFDIKTAT` (`live-session.ts:25-29`),
  der Vault nennt den Lernstandscheck weiter.

### Gegenprüfung G-001 – Stufe 5: richtige, mit Leerzeichen getrennte Wörter gelten als falsch

- **Urteil:** **bestätigt (reproduziert)**, P1 **angemessen**: Eine richtige Leistung
  erzeugt drei gespeicherte Fehler, und das im Kernmodul, bei Standard-Blockgröße 3.
- **Beleg:** `repro-f/f-g001-block.test.ts`. `evaluateLearningWordBlock(["Hund","Katze",
"Maus"], …)`: mit Leerzeichen „Hund: falsch, Katze: fehlt, Maus: fehlt“, ebenso mit
  geschütztem Leerzeichen und mit „Hund. Katze. Maus.“; mit Komma oder Zeilen alles
  richtig. `submitWordAnswer` liefert drei Versuche mit `correct:false`. Das Fortschreiben
  setzt Box 3 auf Box 1, Stufe 5 auf 4, sofort fällig. Jeder Versuch wird sofort
  gespeichert (`app/components/learning-word-app.tsx:340-345`). Ein zweiter Versuch mit
  Kommas nach der Rückmeldung macht die Rückstufung nicht rückgängig.
- **Empfehlung (Bewertung):** G's Vorschlag „an jedem Leerraum trennen“ ist richtig für
  die eingebauten Boxen. In eigenen Wortboxen kann er aber Mehrwortausdrücke zerlegen
  („zu Hause“). Robuster und auf dem iPad besser bedienbar: **ein Eingabefeld je Wort**,
  wie in den Stufen 1–4. Dann entfällt die Mehrdeutigkeit ganz, und die Umschalt-Enter-Frage
  stellt sich nicht.

### Gegenprüfung G-011 – Unterrichtsfehler beschleunigen den LernBox-Aufstieg

- **Urteil:** **bestätigt (reproduziert)**, Schwere **abgeschwächt (P1 → P2)**.
- **Beleg:** `repro-f/f-g011-live.test.ts`. Karte in Box 3, zuletzt vor 2 Tagen geübt,
  nächste Fälligkeit in 5 Tagen, richtige Antwort 10 Minuten nach der Platzierung:
  ohne Unterricht Box 3 (7 d, kein Aufstieg); nach `practice` **Box 4 (14 d)**; nach
  `reset` **Box 2 (3 d)**; nach einem Fehler direkt in der LernBox Box 1 (1 d). Ursache wie
  von G beschrieben (`src/domain/learning-box.ts:444-470` setzt `lastReviewed` nicht).
- **Warum abgeschwächt:**
  - Betroffen sind nur Karten, die **schon in der LernBox liegen**. Neue Karten aus dem
    Unterricht erhalten `lastReviewed` = Anlagezeit (`createLearningBoxCard`,
    `learning-box.ts:108-139`; `personal-learning-events.ts:713-731`). Für sie greift die
    8-Stunden-Regel, es gibt keine Beschleunigung.
  - Die Abweichung beträgt eine Leitner-Stufe, nicht den gesamten Lernstand wie bei G-001
    oder D-001.
- **Was die Bedeutung trotzdem hebt:** Tolerierte Wörter von Kindern mit
  Schreiberleichterung sind immer `practice`. Gerade die Kinder, die mehr Wiederholung
  brauchen, bekommen systematisch weniger. Außerdem setzt die Übernahme **ohne**
  Platzierung (ältere Sitzungen) beide Richtungen auf „jetzt“ (`personal-learning-events.ts:
666-676`), mit demselben Effekt auch für sichere Wörter.
- **Empfehlung (Bewertung):** „`lastReviewed = now` setzen“ ist minimal und richtig. Weil
  `lastReviewed` aber für beide Richtungen gilt (G-005), blockiert das zugleich die
  Rückrichtung für 8 Stunden. G-005 und G-011 deshalb **gemeinsam** beheben, mit
  `lastReviewed` je Richtung. Das ist eine Schemaänderung, also wieder zuerst A-001.

### Zusammenfassung Teil 1

| Befund | Urteil       | Schwere vorgeschlagen → Red Team                               | Kernbeleg                                 |
| ------ | ------------ | -------------------------------------------------------------- | ----------------------------------------- |
| A-001  | abgeschwächt | P1 → P2 (im Bündel „Schemaevolution“ mit B-001: P1)            | `f-a001-poison.test.ts`                   |
| A-004  | bestätigt    | P1, als ein Befund mit D-001                                   | Codelesung, `f-d001-copy.test.ts`         |
| B-001  | bestätigt    | P1                                                             | Codelesung, Reproduktion der Hauptinstanz |
| B-002  | bestätigt    | P1 (Plattformteil teilweise überzeichnet)                      | `grep storage.persist` ohne Treffer       |
| B-003  | abgeschwächt | P1 → P2 im Pilot, P1 vor Rollout                               | Codelesung                                |
| B-008  | abgeschwächt | P1 → P2                                                        | Bogen: alle QR 180 px                     |
| B-009  | bestätigt    | P1                                                             | Pilotszenario `cloud-sync.md:197`         |
| B-010  | bestätigt    | P1 bei geteilten Geräten, P2 bei 1:1; mit E-001 zusammenführen | Codelesung                                |
| B-011  | bestätigt    | P1                                                             | Impressum vs. Echtbetrieb                 |
| C-006  | abgeschwächt | P1 → P2 (Sofortmaßnahme)                                       | `f-c006-print.mjs`: 12/24 Namen           |
| D-001  | verschärft   | P1 (mit A-004)                                                 | `f-d001-copy.test.ts`                     |
| D-003  | bestätigt    | P1 als Konzeptlücke, getrennt von Defekten                     | Suche, Codelesung                         |
| E-001  | bestätigt    | kontextabhängig, mit B-010 zusammenführen                      | `f-e001-relief.test.ts`                   |
| E-002  | bestätigt    | P1 als Konzeptlücke                                            | Codelesung                                |
| E-003  | bestätigt    | P1 als Konzeptlücke; Aufwand (1) S statt M                     | Codelesung                                |
| G-001  | bestätigt    | P1                                                             | `f-g001-block.test.ts`                    |
| G-011  | abgeschwächt | P1 → P2                                                        | `f-g011-live.test.ts`                     |

Keine P1-Behauptung ließ sich widerlegen. Fünf sind in der Schwere zu hoch angesetzt
(A-001, B-003 im Pilotkontext, B-008, C-006, G-011). Drei Paare beschreiben dieselbe
Ursache und sollten zusammengeführt werden (A-004/D-001, B-010/E-001, A-001/B-001).
Drei P1 sind Konzeptlücken, keine Defekte (D-003, E-002, E-003). Bereinigt bleiben
**sieben echte P1** in drei Gruppen:

- **Datenverlust und Datenhaltung:** B-001 mit A-001, B-002, B-010 mit E-001
  (kontextabhängig)
- **Falscher Lernstand:** A-004 mit D-001, G-001
- **Rechtsrahmen und Schutz:** B-009, B-011

Hinzu kommen die drei Konzeptlücken D-003, E-002 und E-003.

## Teil 2 – Unzureichend belegte oder überzeichnete Behauptungen

Geprüft wurde, ob tragende Aussagen der Berichte eine Fundstelle oder Quelle haben und
ob die Folgerung aus dem Beleg folgt. Aufgeführt ist nur, was die Bewertung oder die
Priorität verändert.

| Nr.  | Behauptung (Bericht)                                                                                                      | Problem                                                                                                                                                                                                                                                                                               | Beleg / Prüfweg                                                                                                                                                      | Folge für den Abschlussbericht                                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | „Der QR-Bogen verrät LRS-Kinder durch die Größe“ (E Abschnitt 6 und 9, aufbauend auf B-008)                               | **Falsch für den Bogen.** Auf dem Bogen sind alle Codes 180 px groß. Nur die Einzelansicht zeigt 220 bzw. 280 px.                                                                                                                                                                                     | `app/components/teacher-class-configurator.tsx:380-388` gegen `:618-620`. Bogen und Einzelansicht nutzen dieselbe Nutzlast (`createEnrollmentCode`, `:201`, `:386`). | E's Einordnung „hoch: Kinder vergleichen den Bogen“ beruht auf einer überzeichneten Vorlage. B-008 bleibt als Konzeptproblem bestehen (siehe Teil 1).                                                                                                                      |
| 2.2  | „Seltene Nutzung (1–3× pro Woche, Ferien) macht die 7-Tage-Regel wahrscheinlich“ (E Abschnitt 9 zu B-002)                 | **Mechanismus falsch.** WebKit zählt Tage mit Safari-Nutzung ohne Interaktion mit der Website, keine Kalendertage. Liegen die iPads in den Ferien ungenutzt, zählt nichts. Wöchentliche Nutzung bleibt unter 7 Zähltagen.                                                                             | WebKit-Ankündigung 2020, von A und B zitiert; siehe Gegenprüfung B-002.                                                                                              | Ein reales Risiko gibt es trotzdem, aber über einen anderen Weg: Koffer-iPads, die andere Klassen täglich in Safari nutzen, während diese Klasse eine Woche aussetzt. Die Empfehlung (Home-Bildschirm-Installation) bleibt richtig, die Begründung muss korrigiert werden. |
| 2.3  | „Der wichtigste Einschreibeweg scheitert ohne Fehlermeldung in der ersten Stunde“ (C-006)                                 | Überzeichnet: Die Druckvorschau zeigt eine Seite, der Fehler ist sichtbar, und es gibt einen Ausweichweg.                                                                                                                                                                                             | Eigene Reproduktion, Teil 1.                                                                                                                                         | Schwere P2 statt P1.                                                                                                                                                                                                                                                       |
| 2.4  | „Fehlerwörter je Kind: Aufwand M“ (E-003)                                                                                 | Die Daten liegen bereits je Teilnehmer im Lehrerclient.                                                                                                                                                                                                                                               | `room-api.ts:65, 179`; `teacher-results.ts:4-12`                                                                                                                     | Aufwand S. Damit ist es der billigste Hebel für E-003.                                                                                                                                                                                                                     |
| 2.5  | „Die Tagesportion wählt für fällige Wörter die leichteste Stufe“ (D-001)                                                  | Nur teilweise: Vorrang hat die Stufe der letzten Runde derselben Box.                                                                                                                                                                                                                                 | `learning-word-app.tsx:225-246`                                                                                                                                      | Der Kernbefund D-001 bleibt; die Teilbegründung abschwächen.                                                                                                                                                                                                               |
| 2.6  | „Eine Textbox-Einheit dauert 15–60 Minuten, weit über 10 Minuten“ (D-005, übernommen in E Abschnitt 5 und 6 als Tatsache) | Rechnung auf Basis einer **angenommenen** Tippgeschwindigkeit von 5–10 Wörtern pro Minute (D kennzeichnet das als [H]). Außerdem übersehen: Die Textbox setzt je Durchgang fort (C, Stärken: „Durchgang 2 offen … weiterüben“). Ein Durchgang „leicht“ (≈ 43 Wörter) passt rechnerisch in 10 Minuten. | D-005 Zeitbedarf; C Abschnitt 7                                                                                                                                      | Die Aussage gilt für die **ganze** Einheit am Stück, nicht für die Nutzung in 10-Minuten-Fenstern. E übernimmt die Hypothese als Befund. Vor einer Umgestaltung `writingMs` aus dem Pilot auswerten, wie D selbst vorschlägt.                                              |
| 2.7  | Oberflächen-LIX 51–54 als Beleg für Erwachsenensprache (C-007)                                                            | Methodisch schwach: LIX ist für zusammenhängende Texte gebaut. E verwirft denselben Ansatz für UI-Fragmente ausdrücklich („nur grob deutbar, nicht als Beleg verwendet“).                                                                                                                             | C Abschnitt 2 gegen E Abschnitt 2 und E-004                                                                                                                          | C-007 trägt sich auch ohne LIX (Begriffszählung „Durchgang“ 67×, „Merkstufe“ 15×, WebDAV im Kinderprofil). Den LIX-Wert im Abschlussbericht nicht als Messgröße zitieren.                                                                                                  |
| 2.8  | „Rechtschreibfelder ohne Autokorrektur – alle geprüften Eingabefelder“ (E, Stärken)                                       | Übergeneralisiert: Laufdiktat allein setzt `autoCorrect` und `autoCapitalize` nicht.                                                                                                                                                                                                                  | `app/frei/german/laufdiktat/running-dictation-app.tsx:415-421` (bestätigt G-013)                                                                                     | Die Stärke gilt für Wortspeicher, Textbox, LernBox und Live-Raum, nicht für alle Rechtschreibfelder.                                                                                                                                                                       |
| 2.9  | „1:1-Ausstattung erst ab Jgst. 7/8, Koffer in der Grundschule ist Normalfall“ (E-001, E-009, E Abschnitt 9)               | Nur Sekundärquellen; die Primärseiten waren nicht erreichbar. Wie die **Pilotklasse** ausgestattet ist, steht nirgends.                                                                                                                                                                               | E Abschnitt 13 nennt das selbst als Annahme                                                                                                                          | Diese eine Tatsachenfrage entscheidet, ob B-010/E-001 der wichtigste Befund des Audits ist oder ein P2. Sie muss vor der Priorisierung beim Entwickler erfragt werden.                                                                                                     |
| 2.10 | „Die Sicherung bricht still ab“ (B-001; in der Gegenprüfung Teil 1 übernommen)                                            | Nachtrag ohne Änderung des Urteils: Die manuelle Sicherung meldet „Die Sicherung konnte nicht erstellt werden.“, der Cloud-Abgleich eine Fehlermeldung. Der Ausfall ist also **sichtbar, aber ohne Ursache und ohne Abhilfe** für das Kind.                                                           | `app/components/student-settings-panel.tsx:224-229`; `app/components/cloud-sync-panel.tsx:93-96, 165-175`                                                            | Die Schwere P1 bleibt (keine Abhilfe, einzige Absicherung gegen B-002). Im Abschlussbericht „nicht behebbar“ statt „still“ schreiben.                                                                                                                                      |
| 2.11 | „Kriegs- und Gewaltwörter in 27–39 % der Runden – belastend“ (E-005)                                                      | Der Prozentwert hängt von der Breite der eigenen Wortliste ab (Krieg bis Diebstahl), und „belastend“ ist ein eigenes Urteil ohne Beleg einer Wirkung. Der Code-Befund (diese Wörter stehen in Grundschul-Wortboxen) ist richtig.                                                                      | E-005 kennzeichnet das selbst                                                                                                                                        | Als P3 „Wortwahl prüfen“ führen, Aufwand S. Eine P2-Einstufung neben echten Fehlbewertungen ist zu hoch.                                                                                                                                                                   |
| 2.12 | Effektstärken in D (Spacing g ≈ 0,74; Abrufübung g ≈ 0,6; datenbasierte Individualisierung g ≈ 0,37)                      | Teils aus Sekundärzusammenfassungen oder „n. o. v.“, korrekt gekennzeichnet. Für Grundschulkinder beim **deutschen** Rechtschreiben auf dem iPad gibt es keine dieser Studien direkt.                                                                                                                 | D Abschnitt 7 und 14                                                                                                                                                 | Im Abschlussbericht als Richtung, nicht als erwartbarer Effekt zitieren.                                                                                                                                                                                                   |
| 2.13 | „Der Mehrgeräte-Abgleich ist für Kinder relevant“ (A-003 Variante a, G-010)                                               | Wie viele Kinder zwei Geräte nutzen, ist unbekannt. Bei Koffer-iPads gibt es kein „Heimgerät“.                                                                                                                                                                                                        | keine Nutzungsdaten                                                                                                                                                  | Die Priorität von A-003a und G-010 hängt an derselben offenen Frage wie 2.9.                                                                                                                                                                                               |

## Teil 3 – Widersprüche zwischen technischen und pädagogischen Bewertungen

Die folgenden Spannungen werden **nicht aufgelöst**. Dokumentiert sind die Positionen
und, wo vorhanden, eine eigene Einschätzung, ausdrücklich als solche gekennzeichnet.

### 3.1 Datenschutz-Lokalität gegen Diagnosebedarf der Lehrkraft

- **Position B (B-011, B-009, 5.1):** Möglichst wenig Personenbezug, nichts zentral, keine
  neuen Datenflüsse ohne Rechtsrahmen. Pseudonyme bleiben personenbezogen.
- **Position E/D (E-003, D-003 Abschnitt 9.2 E):** Ohne Rückkanal ist die Plattform „eine
  Übungsmaschine ohne Rückkanal“. Empfohlen werden Namen im CSV, eine lokale
  Ergebnisablage beim Lehrer und ein vom Kind ausgelöster Kurzbericht.
- **Was beide übersehen:**
  - Der Kurzbericht per QR ist **fälschbar**. Das Kind kann seine Werte beliebig
    erzeugen (B-018, Vault 16). Als Förderbeleg taugt er nicht.
  - Er ist **selbstselektiv**: Gerade Kinder, die schlecht abschneiden, senden ihn
    seltener (eigene Hypothese).
  - Die Ergebnisablage liegt auf dem Lehrergerät, das laut Pilotszenario an der Tafel
    steht (B-009, F-002).
- **Eigene Einschätzung:** Konfliktarm ist nur, was keine neuen Datenflüsse erzeugt. Das
  sind die Fehlerwörter je Tier im CSV (Daten liegen schon vor) und eine Zuordnung
  Tier → Name ausschließlich auf einem geschützten Lehrergerät. Alles darüber hinaus
  setzt B-011 voraus.

### 3.2 Strenge Wiederholungsregeln gegen Motivation

- **Für strengere Regeln:**
  - A-004 und D-001: kein Aufstieg vor Fälligkeit, Abschreiben zählt nicht.
  - G-011: kein Aufstieg nach Unterrichtsfehlern.
- **Für weniger Frust:**
  - C-012: Frustspirale nach 0 %.
  - E-010: Motivationsschwache gehen leer aus.
  - D selbst (Abschnitt 8): Ein einzelner Tippfehler setzt auf Box 1, das ist zu hart.
- **Konflikt:** Werden D-001 und A-004 umgesetzt, sieht ein fleißiges Kind nach einem
  Nachmittag Üben **keinen** Fortschritt mehr. Heute sieht es Scheinfortschritt.
- **Kein Widerspruch in D selbst:** D ist strenger bei der Frage, _was als Abruf zählt_,
  und milder bei _Flüchtigkeitsfehlern_. Das ist konsistent, aber die Berichte
  formulieren es nicht als ein Regelpaket.
- **Eigene Einschätzung:** Eine Behebung von D-001 ohne gleichzeitige Anzeige von
  **Übungsmenge** („heute 40 Wörter geschrieben“) neben dem Lernstand verschlechtert die
  Motivation messbar wahrscheinlicher, als sie das Lernen verbessert. Beides gehört in
  dieselbe Änderung.

### 3.3 Toleranz gegen Rechtschreiblernen

- **E-006:** Die LRS-Toleranz gehört nicht an ein Diagnosemerkmal. Neutrale Anpassungen
  für alle.
- **D-016 / G-014.6:** Die Toleranz akzeptiert bedeutungsändernde Abweichungen (Bett/Beet,
  Hand/Hund).
- **G-002 / G-003:** Mehr Normalisierung (Apostroph, Alternativen). Das ist keine Toleranz,
  sondern die Beseitigung von Scheinfehlern, und kollidiert deshalb nicht mit D.
- **Echter, ungelöster Konflikt in der LernBox:** Die LernBox vergleicht immer ohne
  Groß-/Kleinschreibung (G-003), der Wortspeicher streng. Bei deutschen Antworten im
  Schreibmodus („der Hund“) ist Großschreibung Lerngegenstand. G empfiehlt „streng für
  Deutsch“. D bewertet die LernBox als Bedeutungstrainer. Das berührt die Frage, ob die
  LernBox Bedeutung oder Schreibung trainiert. Vault 06 verlangt getrennte Stände für
  beides, die nach D-010 im Kartenmodell fehlen. Ohne diese Trennung bleibt jede
  Toleranzentscheidung in der LernBox falsch für einen der beiden Zwecke.

### 3.4 Barrierefreiheit gegen didaktische Zwänge

- **C-002:** Merkzeit ohne harte Grenze. **D-005 und D-011:** Die Textbox ist ohnehin zu
  lang, gefordert ist ein 10-Minuten-Budget.
- **E-007:** Aufdecken per Einzeltipp statt Zwei-Finger-Geste. Didaktischer Zweck der Geste:
  Solange beide Hände den Satz aufdecken, kann das Kind nicht tippen. Das macht das
  Laufdiktat erst zur Merkübung.
- **Eigene Einschätzung:** Beide Empfehlungen sind richtig, müssen aber die Invariante
  „Vorlage und Eingabe nie gleichzeitig sichtbar“ erhalten. Sonst wird das Laufdiktat
  zur Abschreibübung, also D-001 im Live-Raum (siehe Teil 6).

### 3.5 Bewertungen, die sich gegenseitig widersprechen

| Aussage                                                                                         | Gegenbefund                                                                                                                                                  | Kommentar                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D Modultabelle: Kopfrechnen „rechnerisch korrekt“                                               | G-008 (Kommafehler gelten als richtig), G-009 (mehrdeutige Nulllücken), G-014.1 (Division mit Rest)                                                          | Der **Generator** ist korrekt, die **Antwortprüfung** nicht. D's Urteil gilt nur für den Generator.                                                                                       |
| D Stärken: LernBox-Regeln „näher an der Spacing-Forschung als viele Karteikarten-Apps“          | G-005 (Richtungen gekoppelt), G-011 (Unterricht beschleunigt), G-014.4 (verlorene Aktualisierung in zwei Tabs)                                               | Die **Regeln** sind gut, ihre **Umsetzung** weicht an drei Stellen still ab.                                                                                                              |
| D Stärken: Laufdiktat-Übernahme (Entscheidung 49) „gut durchdacht“, „ehrliche, kleine Diagnose“ | G-011, G-012 (Satzanfänge großgeschrieben), G-014.3 (Fehlerwörter zählen nicht als Fehler)                                                                   | Gut als Konzept, in drei Punkten fehlerhaft umgesetzt.                                                                                                                                    |
| D Stärken: Tagesportion „schützt vor Überforderung“                                             | G-007 (falsch = erledigt; Sackgasse), C-003 (leer beim Start), A-001 (ein Giftereignis legt sie lahm)                                                        | Als Konzept gut, im Betrieb die fragilste Anzeige.                                                                                                                                        |
| E Stärken: „QR-Bogen zum Drucken“                                                               | C-006 (druckt nur halb), B-008 (LRS in der Nutzlast)                                                                                                         | E hat den Druck nicht geprüft.                                                                                                                                                            |
| C: Barrierefreiheit 3,5                                                                         | E-007 (Zwei-Finger-Geste ohne Einzelzeiger-Alternative im Kernmodul Live-Raum, WCAG 2.5.1), C-002 (WCAG 2.2.1)                                               | C misst automatisch prüfbare Kriterien sehr gut. Ein Ausschluss einhändiger Kinder vom Laufdiktat-Modus spricht eher für 3,0.                                                             |
| B Stärken: Klassenstempel (ECDSA) verhindert selbst ausgestellte Freigaben                      | E-001 (Freigabe gilt für jedes Kind auf dem Gerät)                                                                                                           | Die Kryptografie schützt die **Echtheit** der Freigabe, nicht ihre **Zuordnung** zum Kind. Damit schützt sie die falsche Eigenschaft. Das deckt sich mit A-008 (Komplexität ohne Nutzen). |
| B, D, E Stärken: „ehrliche Dokumentation“                                                       | A-003 (Ereignisquelle nur dem Namen nach), G-005 (Vault 06: „Richtungen unabhängig“), E-003 (Lernstandscheck noch im Vault), B-011 (Impressum gegen Betrieb) | Ehrlich bei **pädagogischen Grenzen**, ungenau bei **Architektur und Betrieb**.                                                                                                           |
| E-009/E Abschnitt 5: zwei Oberflächenprofile und niveaugestufte Inhalte für alle Schularten     | A-017 (Bus-Faktor 1), A-008 (Funktionsstopp für Randfunktionen)                                                                                              | E fordert eine Verdopplung der Pflegefläche, A deren Halbierung. Beides zugleich ist für eine Einzelperson nicht leistbar (siehe Teil 8).                                                 |
| E-001 Empfehlung 3: „Stationsmodus für alles“ bei Koffer-Geräten                                | D: verteilte Wiederholung als Kern der Lernwirksamkeit                                                                                                       | Bei Koffer-Geräten entfiele genau der Teil, den D für wirksam hält.                                                                                                                       |

## Teil 4 – Eigene Suche nach übersehenen Problemen

### 4.1 Systematische Suche (Ergebnis auch ohne Befund dokumentiert)

| Suche                                                                                            | Ergebnis                                                                                                                                                                                                                                                                                                                                                                      | Bewertung                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TODO`, `FIXME`, `XXX`, `HACK` in `app/`, `src/`, `worker/`, `scripts/`, `proxy.ts` (ohne Tests) | 0 echte Treffer (nur ein Platzhalter „XXXX XXXX …“ in `student-content-transfer.tsx:151`)                                                                                                                                                                                                                                                                                     | keine versteckten Baustellen markiert                                                                                                                                 |
| `dangerouslySetInnerHTML`/`innerHTML`                                                            | 3 Stellen: KaTeX-Ausgabe (`math-display.tsx:45`, `trust:false` laut B) und zwei statische Startskripte (`layout.tsx:112-113`)                                                                                                                                                                                                                                                 | kein Fremddateneintrag; B-015 (fehlende CSP) bleibt                                                                                                                   |
| `Math.random`, `Date.now()`, `new Date()` in `src/domain`                                        | nur als Standardparameter (`learning-box.ts`, `mental-math.ts:588`, `math-practice.ts:304`, `learner-profile.ts:146,164`)                                                                                                                                                                                                                                                     | Zeit und Zufall injizierbar; die Reproduktionen dieses Berichts nutzen das                                                                                            |
| `localStorage`                                                                                   | 11 Dateien: Thema, Textbox-Layout, Tierprofil, Häuser, Spiegelschrift, Cloud-Token (B-016)                                                                                                                                                                                                                                                                                    | kein Lernstand in `localStorage`; das Tierprofil fällt bei B-002 mit weg                                                                                              |
| `eslint-disable`                                                                                 | 24 Stellen, alle mit Begründung                                                                                                                                                                                                                                                                                                                                               | unauffällig                                                                                                                                                           |
| leere `catch`-Blöcke                                                                             | 3                                                                                                                                                                                                                                                                                                                                                                             | A-002 deckt das breitere Problem ab                                                                                                                                   |
| Service-Worker-Update mitten in einer Runde                                                      | kein erzwungenes Neuladen. Neu geladen wird nur nach Tipp auf „Aktualisieren“ (`app/ui/update-toast.tsx:22-25, 65-69`) oder vor dem Beitritt zu einem Live-Raum (`src/integrations/laufdiktat/version-compatibility.ts:14-46`). vinext enthält eine RSC-Kompatibilitätsprüfung mit Rückfall auf harte Navigation (`node_modules/vinext/dist/server/app-rsc-cache-busting.js`) | Versionsschiefe ist durch das Framework abgefangen (nicht in Produktion geprüft). Ein Tipp auf „Aktualisieren“ in der Runde verliert die Runde (fällt unter C-001)    |
| Zeitzonen                                                                                        | UTC-Tag in `adaptive-learning.ts:40`, Fälligkeit auf die Minute                                                                                                                                                                                                                                                                                                               | von A-013 und G-006 abgedeckt                                                                                                                                         |
| Datenformat-Versionen                                                                            | Sicherung mit `schemaVersion: z.literal(…)` und `.strict()`                                                                                                                                                                                                                                                                                                                   | eine Sicherung einer neueren App-Version wird von einer älteren vollständig abgelehnt; gehört zu A-001                                                                |
| Inhalt der Schülersicherung                                                                      | `personalDataSchema` ohne Klassenmitgliedschaft, Freigabe und Tierprofil (`src/domain/personal-backup.ts:104-120`)                                                                                                                                                                                                                                                            | datenschutzfreundlich (keine LRS-Information in der privaten Cloud). Nach Datenverlust und Wiederherstellung muss das Kind neu einschreiben und erhält ein neues Tier |

### F-001 – „Wort zeigen“ schützt den Lernstand besser als ein ehrlicher Versuch

- **Bereich:** Wortspeicher, Lernwort-Lernstand, Hilfe-Regel
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Logik, niedrig für die Häufigkeit (keine
  Nutzungsdaten)
- **Fundstelle:**
  - `src/domain/learning-word-progress.ts:34-55` (`updateLearningWordProgress`): Mit
    `usedHelp` bleibt die Box, die Fälligkeit wird auf den **vollen Abstand der Box** gesetzt.
  - `src/domain/word-round.ts:183-192` (`applyHelp`), `:232-241` (`usedHelp` je Wort)
  - `app/views/wortspeicher/round-screen.tsx:141-145, 162-168`: Die Schaltfläche „Wort
    zeigen“ gibt es in Stufe 2–6; danach steht das Wort sichtbar über dem Eingabefeld.
  - `helpUses` wird gezählt (`learning-word-progress.ts:66`), aber nirgends angezeigt oder
    ausgewertet (Suche in `app/` und `src/`).
- **Beschreibung:**
  - _Konzept:_ Vault 06 verlangt „Hinweis oder Lösung verwendet → kein Aufstieg“. Für die
    Übernahme aus dem Unterricht legt dieselbe Notiz fest: „Abschreibvorlage (Lösung)
    angezeigt → Box 1, sofort fällig“.
  - _Implementierung:_ Im Wortspeicher hält „Wort zeigen“ die Box **und** verschiebt die
    nächste Wiederholung um 7, 14 oder 30 Tage. Ein ehrlicher Fehlversuch setzt dagegen
    auf Box 1, fällig morgen. Für ein unsicheres Kind ist es daher günstiger, sofort Hilfe
    zu holen, als es zu versuchen. Das Wort, das es nicht abrufen konnte, verschwindet
    für Wochen aus der Wiederholung.
  - Das ist derselbe Mechanismus wie D-001: Abschreiben mit sichtbarer Vorlage zählt als
    Lernfortschritt, hier in Form „kein Rückschritt plus volle Pause“.
- **Reproduktion / Prüfweg:** `repro-f/f-001-help.test.ts`. Lernwort in Box 4, fällig,
  Stufe 4:
  ```
  A  Hilfe → richtig        : Box 4, fällig in 14 d
  B  falsch → richtig       : Box 1, fällig in 1 d
  ```
  In Box 5 ergibt Weg A nach Codelesung 30 Tage.
- **Betroffene Nutzergruppen:**
  - Kinder im Wortspeicher, besonders fehlerscheue und schwache Rechtschreiber, die bei
    Unsicherheit zur Hilfe greifen
  - Lehrkräfte und Eltern, die „sicher“ lesen
- **Mögliche Folgen:**
  - **[H]** Die Wiederholung nicht abrufbarer Wörter fällt aus.
  - **[H]** Das System belohnt Fehlervermeidung statt Abrufversuch. Das widerspricht dem
    Prinzip Abrufübung, das D als Kern der Lernwirksamkeit bewertet.
  - Der Lernstand weicht von der plattformeigenen Live-Regel ab.
- **Empfehlung:** Hilfe wie die eigene Live-Regel behandeln: Box 1 (mindestens Box − 1),
  am nächsten Tag fällig, Merkstufe − 1. In derselben Änderung wie D-001 umsetzen, mit
  einer gemeinsamen Regeltabelle „Abrufnachweis“ (siehe A-004).
- **Aufwand (grob):** S
- **Erfolgskriterium:** Regressionstest „Hilfe → richtig“ ergibt nie einen längeren Abstand
  als „falsch → richtig“. Beide Wege ergeben höchstens Box 1, fällig in 1 Tag.

### F-002 – Ergebnis-CSV wird beim Beenden des Live-Raums ungefragt heruntergeladen

- **Bereich:** Lehrer-Live-Raum, Daten auf geteilten Geräten
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3 heute. P2, sobald die Empfehlung aus E-003 (Namen und Fehlerwörter je
  Kind im CSV) umgesetzt wird.
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/lehrer/live/hooks/use-live-room-session.ts:440-445` (`endRoom` ruft
  `exportCsv()`, sobald `students.length > 0`), `:459-474` (`exportCsv`: Datei
  `laufdiktat-ergebnisse-<Datum>.csv` per `link.click()`)
- **Beschreibung:** Jede beendete Runde legt ohne Rückfrage eine Ergebnisdatei im
  Download-Ordner ab. Laut Pilotszenario läuft der Lehrerbereich am Tafelrechner
  (`docs/cloud-sync.md:197`), also auf einem Gerät, das Kinder bedienen. Inhalt heute:
  Tiernamen, Fortschritt, Fehlerzahlen, Spicker, Sterne und die häufigsten Fehlerwörter.
  Die Zellen sind nicht gegen Formeln abgesichert (B-007).
- **Reproduktion / Prüfweg:** Codelesung der genannten Zeilen. Kein Browserlauf (Live-Raum
  ohne Supabase nicht startbar).
- **Betroffene Nutzergruppen:** Lehrkräfte an geteilten Tafel- und Koffergeräten; Kinder,
  deren pseudonyme Ergebnisse sich dort sammeln
- **Mögliche Folgen:**
  - Ergebnisdateien sammeln sich unbemerkt auf geteilten Geräten.
  - Mit E-003 (Namen) würden daraus personenbezogene Leistungsdaten im öffentlichen
    Download-Ordner.
  - Zusammen mit B-007 öffnet die Lehrkraft eine Datei mit fremdgesteuertem Inhalt in einem
    Tabellenprogramm.
- **Empfehlung:**
  - Export nur auf ausdrücklichen Klick, mit Hinweis „Datei liegt danach im Download-Ordner
    dieses Geräts“.
  - Formeln neutralisieren (B-007).
  - E-003 erst danach umsetzen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Test: „Raum beenden“ erzeugt ohne Klick keinen Download.

## Teil 5 – Überschätzte positive Eigenschaften

| Behauptete Stärke                                             | Was tatsächlich belegt ist                                                                                         | Was überschätzt wird                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **„96 % Abdeckung“** (`00-stand.md`)                          | 96,1 % Anweisungen und 91,5 % Zweige für `src/domain`, `src/storage`, `src/speech`, `src/integrations`             | `app/` (38 836 Zeilen) und `src/tastschreiben` sind nicht gemessen; einschließlich dieser Bereiche 78,7 % / 72,2 % (A-005). Wichtiger: Abdeckung misst **Ausführung, nicht Richtigkeit**. Die Kernfehler D-001, G-001, G-011 und F-001 liegen in Dateien mit nahezu voller Abdeckung. Eigene Messung mit den vorhandenen Unit-Tests: `learning-word-progress.ts` 100 % Anweisungen, `word-round.ts` 100 %, `learning-word.ts` 97,3 %, `learning-box.ts` 97,0 %. |
| **„1 683 grüne Tests“**                                       | Die Tests laufen grün, der Fachkern ist gut testbar                                                                | Mindestens ein Test schreibt Fehlverhalten fest: acht Aufstiege zum selben Zeitpunkt → Box 5 (`src/domain/learning-word-progress.test.ts:40-62`). Kein Test prüft Stufe 5 mit Leerzeichen, „Hilfe gegen Fehlversuch“, Druck des QR-Bogens oder eine Sicherung mit Ordnern. Die Tests prüfen die **eigene Normalform** (G), nicht die Regeln aus Vault 06.                                                                                                       |
| **„Adaptiv“**                                                 | Regelbasierte Fälligkeit (Leitner), Fehlerwiederholung in Mathe mit neuen Aufgaben, Tagesportion nach Kontingenten | Stufe, Wortbox, Zahlenraum und Text wählt das Kind. Die Wortauswahl einer Wortspeicher-Runde ist zufällig und lernstandsunabhängig (`word-round.ts:86-99`). Es gibt keine Kompetenzschätzung (D-003). Treffender wäre „wiederholungsgesteuert“.                                                                                                                                                                                                                 |
| **„Local-first = datenschutzkonform“**                        | Kein Server sieht Lernhistorien, keine Telemetrie, keine Tracker (B, geprüft)                                      | Local-first verlagert das Risiko auf **geteilte Geräte** (B-009, B-010, E-001), **Papier** (B-008, QR mit Klarname) und **Cloud-Stimmen** (B-012). Hinzu kommen die Cloud-Sicherung des Kindes ohne Verschlüsselung (B 5.1) und das Fehlen von Rechtsgrundlage, AVV und Verzeichnis (B-011). Datensparsamkeit ist nicht dasselbe wie Rechtmäßigkeit. Zudem ist der lokale Speicher die **einzige** Kopie (B-002).                                               |
| **„Offlinefähig“**                                            | Eine geladene Runde arbeitet bei Netzabbruch weiter; Live-Fortschritt wird nachgereicht (B-013)                    | Offline geht nur, was unter der aktuellen Service-Worker-Version schon besucht wurde. Nach jedem Update fast nichts. Ungetestet, weil die E2E-Suite Service Worker blockiert (B-013, `playwright.config.ts:24`).                                                                                                                                                                                                                                                |
| **„axe: 0 Verstöße“** (C)                                     | 26 Seiten × 4 Ansichten, 32 Rundenzustände                                                                         | axe prüft nur einen Teil von WCAG automatisch. Die Zwei-Finger-Geste (E-007, WCAG 2.5.1), die feste Merkzeit (C-002, 2.2.1) und die kognitive Zugänglichkeit (C-007) fallen durch dieses Raster.                                                                                                                                                                                                                                                                |
| **„Klassenstempel mit ECDSA“** (B)                            | Fälschungssichere Freigabe im Raum der echten Lehrkraft                                                            | Geschützt ist die Echtheit, nicht die Zuordnung zum Kind (E-001). Viel Kryptografie für ein Merkmal, das nur bei Vokabeln im Live-Raum wirkt (E-006).                                                                                                                                                                                                                                                                                                           |
| **„Datensparsamkeit im Live-Raum: Tiere statt Namen“** (B, E) | Server sieht keine Klarnamen                                                                                       | Realtime-Kanäle sind ohne Autorisierung (B-003). Mitschüler kennen die Tiere. Das Tier wechselt mit dem Gerät (E-001). Das Pseudonym schützt wenig und behindert die Diagnose (E-003).                                                                                                                                                                                                                                                                          |
| **„Ehrliche Dokumentation“** (B, D, E)                        | Offen bei pädagogischen Grenzen (Wirksamkeit unbelegt, Prozentwerte ungefähr)                                      | Ungenau bei tragenden Architektur- und Betriebsaussagen: Ereignisquelle (A-003), Modul-Adapter (A-009), „Richtungen unabhängig“ (G-005), Lernstandscheck (E-003), Impressum gegen Pilotbetrieb (B-011).                                                                                                                                                                                                                                                         |
| **„Tagesportion: deterministisch, gedeckelt“** (D, G)         | Kontingente halten in 3 000 Zufallsläufen (G)                                                                      | Falsche Antworten zählen als erledigt, gelöschte Karten erzeugen eine Sackgasse (G-007). Beim ersten Start ist sie leer (C-003). Ein einziges unlesbares Ereignis legt sie lahm (A-001).                                                                                                                                                                                                                                                                        |
| **„Sicherung atomar und idempotent“** (G)                     | richtig für das Einspielen                                                                                         | Das **Erstellen** scheitert bei LernBox-Ordnern (B-001). Beim Einspielen gewinnt der jüngere Datensatz ganz und setzt monotone Werte zurück (G-010). Eine einzige unbekannte Zeile verhindert den ganzen Import (A-001).                                                                                                                                                                                                                                        |
| **Auditbefund „keine P1 widerlegt“** (diese Gegenprüfung)     | Alle 17 P1-Mechanismen sind reproduzierbar oder im Code belegt                                                     | Das bestätigt die **Sorgfalt der Prüfinstanzen**, nicht die Schwere. Fünf P1 sind überzeichnet, drei doppelt gezählt, drei sind Konzeptlücken (Teil 1). Ein Abschlussbericht, der „17 × P1“ addiert, überzeichnet den Zustand.                                                                                                                                                                                                                                  |

## Teil 6 – Empfehlungen, die neue Probleme erzeugen würden

Bewertet sind Empfehlungen der anderen Berichte, die bei wörtlicher Umsetzung neue
technische oder didaktische Probleme verursachen. Die Teil-1-Bewertungen (A-001 Vorschlag 3,
B-002 Vorschläge 2 und 5, D-001 Vorwahl, E-001 Vorschlag 3, E-002 Vorschlag 2) werden hier
nicht wiederholt.

| Nr.  | Empfehlung                                                                                                                              | Neues Problem                                                                                                                                                                                                                                                                                                                                         | Besser                                                                                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | A-007: Wechsel auf statischen SPA-Build (L)                                                                                             | Großumbau aller Routen durch eine Einzelperson (A-017), während S-Korrekturen am Lernkern offen sind. Die RSC-Kompatibilitätsprüfung von vinext entfiele (Teil 4.1).                                                                                                                                                                                  | Erst Lernkern und Datenhaltung korrigieren. Von A-007 jetzt nur den S-Teil umsetzen (Vorlagenreste, Build-Zeit-Konfiguration). Den Wechsel mit Auslösekriterien vertagen.    |
| 6.2  | A-003 Variante a: vollständige Ereignisquelle mit Neuberechnung                                                                         | L-Aufwand und genau die Komplexität, die A-008 und A-017 kritisieren. Der Nutzen hängt am Mehrgerätebedarf, der unbelegt ist (Teil 2.13).                                                                                                                                                                                                             | Variante b (Ereignisse ehrlich als Protokoll, feldweises Zusammenführen, Doku korrigieren). Die Stufe und die Hilfe im Ereignis speichern genügt für spätere Neubewertungen. |
| 6.3  | B-010 und E-001 Vorschlag 2: Profil je Kind mit Bild-PIN und eigener Datenbank                                                          | Löst nur „mehrere Kinder an **einem festen** Gerät“. Bei Koffer-iPads mit wechselnder Zuteilung liegt der Lernstand eines Kindes danach verteilt auf vielen Geräten. Jedes Kind müsste auf jedem Gerät eingeschrieben werden (25 Kinder × 16 Geräte = 400 Einschreibungen). Die Lernstände laufen auseinander. Bild-PINs teilen Kinder untereinander. | Zuerst die Ausstattungsfrage klären (Teil 2.9). Bei Koffern muss der Lernstand mit dem Kind reisen, nicht auf dem Gerät liegen (Teil 8, G1).                                 |
| 6.4  | B-019: Teilnehmertoken dauerhaft speichern                                                                                              | Auf einem geteilten Gerät übernimmt das nächste Kind innerhalb des Raumfensters die Identität des vorigen.                                                                                                                                                                                                                                            | Speichern mit Rückfrage „Weiter als Fuchs 2?“ und Ablauf zum Raumende.                                                                                                       |
| 6.5  | C-001 (1) und (3): Abbruchdialog bei jeder Navigation, `history.pushState` je Runde                                                     | Zusätzliche Hürde bei jedem Tipp. Unter iOS wirkt die Zurück-Geste dann „kaputt“ (Verlaufsfalle).                                                                                                                                                                                                                                                     | Vorschlag (2) als Hauptmaßnahme: Zwischenstand speichern und „Weitermachen“ anbieten, wie in der Textbox. Den Dialog nur für ausdrückliches „Runde beenden“.                 |
| 6.6  | C-002: Merkzeit ohne harte Grenze; E-007: Aufdecken per Einzeltipp                                                                      | Ohne Gegenmaßnahme sind Vorlage und Eingabe gleichzeitig nutzbar. Laufdiktat und Textbox werden dann zur Abschreibübung (D-001 im Live-Raum).                                                                                                                                                                                                         | Die Invariante „Vorlage und Eingabe nie gleichzeitig sichtbar“ als Test festschreiben. Das Aufdecken zählen und als Hilfe werten.                                            |
| 6.7  | D-002: Entscheidungslücken mit Auswahl s/ss/ß                                                                                           | Wiedererkennen statt Abruf, mit 33–50 % Ratewahrscheinlichkeit. Zählt das als Aufstieg, entsteht derselbe Scheinfortschritt wie bei D-001.                                                                                                                                                                                                            | Nur als Stufe-2/3-Gerüst ohne Box-Aufstieg, wie für D-001 empfohlen.                                                                                                         |
| 6.8  | D-003 / D Abschnitt 9.2: Lernverlaufsproben per Sprachausgabe                                                                           | 25 iPads sprechen gleichzeitig, also braucht jedes Kind Kopfhörer. Einzelwörter ohne Satzkontext sind bei Homophonen mehrdeutig (Lied/Lid, Meer/mehr). Auf Windows- und Chrome-Geräten gehen die Texte an Cloud-Stimmen (B-012).                                                                                                                      | Proben mit Kontextsatz und Kopfhörerpflicht, oder die Lehrkraft diktiert und die Kinder tippen. Unabhängig davon nur auf korrigierten Lernständen (Teil 1, D-003).           |
| 6.9  | D-008: automatische Fehlerklassifikation                                                                                                | Heuristische Etiketten („Auslautfehler“) stigmatisieren bei Fehlklassifikation und täuschen Diagnosegenauigkeit vor.                                                                                                                                                                                                                                  | Nur der Lehrkraft und mit sichtbarer Unsicherheit zeigen, dem Kind nur die Übungsempfehlung.                                                                                 |
| 6.10 | E-003 (1) und (3): Namen im CSV, Kurzbericht per QR                                                                                     | Siehe F-002 (automatischer Download auf dem Tafelrechner) und Teil 3.1 (fälschbar, selbstselektiv).                                                                                                                                                                                                                                                   | Zuerst F-002, B-007 und B-009 beheben. Fehlerwörter je Tier sind der risikoarme erste Schritt.                                                                               |
| 6.11 | E-009 und E Abschnitt 5: zwei Oberflächenprofile, niveaugestufte Inhalte für alle Schularten                                            | Verdoppelt die Pflegefläche bei Bus-Faktor 1 (A-017).                                                                                                                                                                                                                                                                                                 | Zielgruppe ehrlich auf Jgst. 3–6 festlegen (E's eigene Positionierung). Die Sekundarstufe nur über die LernBox bedienen, ohne zweites Profil.                                |
| 6.12 | G-003: Komma als Alternativtrenner beim Import                                                                                          | Falsch-Positive: Bei „yes, please“ würde „please“ allein als richtig gelten.                                                                                                                                                                                                                                                                          | Nur „\|“ und „/“ automatisch trennen. Komma nur nach Bestätigung in der Vorschau, wie G selbst einschränkt.                                                                  |
| 6.13 | G-009, zweite Variante: jede Zahl akzeptieren, die die Gleichung erfüllt                                                                | Bei „0 · _ = 0“ ist dann jede Eingabe richtig, die Aufgabe ist wertlos.                                                                                                                                                                                                                                                                               | G's erste Variante: solche Lücken im Generator nicht bilden.                                                                                                                 |
| 6.14 | G-006: Fälligkeit auf Kalendertage umstellen und den LernBox-Puffer entfernen (M, mit Migration)                                        | Bei der Umstellung können auf einen Schlag viele Elemente fällig werden. Der Rückstand ist versteckt, das Kind sieht nur eine volle Portion.                                                                                                                                                                                                          | Migration mit Test „höchstens n zusätzlich fällige Elemente am Umstellungstag“. Den Puffer erst nach einer Beobachtungsphase entfernen.                                      |
| 6.15 | Mehrere Schemaänderungen (D-001 Stufe im Ereignis, E-002 neue Elementarten, G-005 `lastReviewed` je Richtung, A-003 neue Ereignistypen) | Jede einzelne bricht wegen der strikten Schemata ältere Geräte beim Einspielen (A-001, B-001).                                                                                                                                                                                                                                                        | **Reihenfolge verbindlich machen:** zuerst tolerantes Lesen plus Strukturtest (A-001/B-001), danach Schemaänderungen. Das ist die wichtigste Abhängigkeit im Maßnahmenplan.  |

## Teil 7 – Empirisch ungeprüfte Annahmen über Kinder und Lehrkräfte

Keine der folgenden Annahmen ist im Repository oder in den Berichten mit Nutzungsdaten
oder Beobachtung belegt. Spalte „Träger“: wer die Annahme trifft (Plattform = Code oder
Vault; Prüfinstanz = Bericht).

| Nr.  | Annahme                                                                                                                                   | Träger                                | Was davon abhängt                                                                             | Kleinster Prüfweg                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Ein Gerät gehört einem Kind.                                                                                                              | Plattform (Vault 01/13)               | B-010, E-001, G-010, Priorität des ganzen Audits                                              | Entwickler fragen: Gerätezahl und Zuteilung der Pilotklasse                                                         |
| 7.2  | Kinder üben (fast) täglich. Leitner-Abstände von 1/3/7 Tagen und eine Tagesportion „heute“ setzen das voraus.                             | Plattform (Vault 06, Entscheidung 57) | Bei 1–3 Einheiten pro Woche ist Box 1 („morgen“) bedeutungslos, und Rückstände bauen sich auf | Verteilung der aktiven Tage je Kind aus den lokalen Ereignissen eines Pilotgeräts (ohne Export, am Gerät angesehen) |
| 7.3  | Kinder wählen Stufe, Wortbox, Zahlenraum und Textstufe passend.                                                                           | Plattform                             | D-003, E-002; laut Forschung überschätzen Kinder sich (D Abschnitt 7)                         | Gewählte Stufe gegen Fehlerquote je Kind vergleichen                                                                |
| 7.4  | Kinder trennen Wörter in Stufe 5 mit Komma oder Zeilenumbruch, nutzen „Wort zeigen“ nicht taktisch und schreiben in Stufe 1 nicht nur ab. | Plattform                             | G-001, F-001, D-001                                                                           | 15 Minuten Unterrichtsbeobachtung an fünf Geräten                                                                   |
| 7.5  | Kinder oder Familien sichern regelmäßig.                                                                                                  | Plattform (Sicherungserinnerung)      | einzige Absicherung gegen B-002                                                               | Zählen, wie viele Pilotgeräte je eine Sicherung erstellt haben                                                      |
| 7.6  | Die App wird als Home-Bildschirm-App installiert.                                                                                         | Plattform und B                       | ob die 7-Tage-Regel greift (B-002)                                                            | Sichtprüfung der Pilotgeräte                                                                                        |
| 7.7  | Kinder tippen auf der Bildschirmtastatur 5–10 Wörter pro Minute.                                                                          | Prüfinstanz D                         | Zeitbedarf der Textbox (D-005)                                                                | `writingMs` aus Pilotdaten                                                                                          |
| 7.8  | Auf den Schul-iPads ist eine deutsche Systemstimme vorhanden.                                                                             | Plattform                             | Stufe 6, Vorlesen, D's Lernverlaufsproben                                                     | Stufe 6 auf einem Schulgerät öffnen                                                                                 |
| 7.9  | Kamera-Freigabe für den QR-Scan ist im MDM erlaubt.                                                                                       | Plattform, E                          | Einschreibung                                                                                 | ein Testscan auf einem Schulgerät                                                                                   |
| 7.10 | Lehrkräfte lesen „sicher“ und „gemeistert“ nicht als Kompetenzaussage.                                                                    | Plattform                             | Folgen von D-001, D-004, G-007                                                                | Kurzbefragung von zwei bis drei Lehrkräften                                                                         |
| 7.11 | Zurückhaltende Motivation ohne Spielelemente trägt über Wochen.                                                                           | Plattform, von D positiv bewertet     | Nutzungsdauer und Abbruch                                                                     | Aktive Tage nach 4 und 8 Wochen                                                                                     |
| 7.12 | Der Live-Raum läuft im Schul-WLAN stabil.                                                                                                 | Plattform                             | B-013, B-019                                                                                  | Protokoll der ersten fünf Live-Stunden                                                                              |
| 7.13 | In Grundschulen sind Koffer-iPads der Normalfall; 1:1 gibt es erst ab Jgst. 7/8.                                                          | Prüfinstanz E                         | Gewichtung von E-001                                                                          | siehe 7.1                                                                                                           |
| 7.14 | Kinder würden einen freiwilligen Kurzbericht senden.                                                                                      | Prüfinstanz E                         | Wirksamkeit von E-003 (3)                                                                     | im Pilot einmal anbieten und zählen                                                                                 |
| 7.15 | Der realistische Angreifer im Realtime-Kanal ist ein Mitschüler, kein Fremder.                                                            | Red Team (Teil 1, B-003)              | Gewichtung von B-003                                                                          | nicht empirisch prüfbar; Plausibilitätsannahme                                                                      |
| 7.16 | Kinder setzen Hilfe taktisch ein, wenn sie dadurch Rückstufungen vermeiden.                                                               | Red Team (F-001)                      | Häufigkeit von F-001                                                                          | Verhältnis `helpUses` zu `incorrectAttempts` auf Pilotgeräten                                                       |

**Folgerung:** Mit einer einzigen, datensparsamen Beobachtungsphase von vier Wochen ließe
sich ein Großteil dieser Annahmen prüfen: Gerätezählung, Sichtprüfung,
Unterrichtsbeobachtung und lokale Zähler, die die Lehrkraft am Gerät abliest. Ein
Datenexport ist dafür nicht nötig. Ohne diese Phase bleiben die Prioritäten des Audits
in der Größenordnung unsicher, vor allem bei 7.1 und 7.2.

## Teil 8 – Grundsatzentscheidungen, die neu bewertet werden sollten

Die Reihenfolge entspricht der Abhängigkeit: Ohne Klärung von G5 und G1 lassen sich G2 bis
G4 nicht sinnvoll priorisieren.

### G1 – „Ein Gerät ist ein Kind“, und der Browser-Speicher ist die einzige Kopie des Lernstands

- **Entscheidung:** Vault 13 („lokale Einzelplatznutzung“), Vault 19 im Abschnitt zur
  Einschreibung („Ein Gerätewechsel kann später über eine persönliche Sicherung … erfolgen“);
  `src/storage/personal-learning-events.ts` (eine Datenbank je Origin). Der Vault macht
  die Lehrerseite selbst davon abhängig, dass Schüler nicht dasselbe Geräteprofil
  verwenden (Vault 13, Vault 19 zur Lehrerkontotrennung). Im Pilot ist genau das der
  Fall (B-009).
- **Kritik:** Aus dieser einen Entscheidung folgen vier der sieben bereinigten P1-Befunde
  (B-001, B-002, B-010/E-001, B-009) und mehrere P2:
  - Datenverlust ohne Zweitkopie (B-002, B-001)
  - vermischte Lernstände und Freigaben auf geteilten Geräten (B-010, E-001)
  - Lehrerdaten auf Kindergeräten (B-009)
  - fehlender Rückkanal zur Lehrkraft (E-003)
  - Abgleichfehler beim Zusammenführen (G-010, A-003)

  Profile je Kind lösen das bei wechselnder Gerätezuteilung nicht (Teil 6.3).
  Datensparsamkeit ist ein richtiges Ziel. Die Wahl „nur lokal“ ist aber nur **ein** Mittel
  dazu und hier das teuerste.

- **Alternative (konkret):** **Der Lernstand reist mit dem Kind, verschlüsselt.**
  - Jedes Kind erhält eine Lernkarte mit QR, die eine zufällige Kennung und einen
    Schlüssel trägt.
  - Der Lernstand liegt als AES-GCM-Chiffrat auf dem Server; der Server sieht nur
    Chiffrat und Kennung.
  - Auf jedem Gerät: Karte scannen, laden, entschlüsseln, üben, verschlüsselt
    zurückschreiben, mit Offline-Warteschlange.
  - Die vorhandene Inhaltsübertragung (AES-GCM, PBKDF2, Supabase) liefert die Bausteine.
  - Die Lehrkraft kann die Schlüssel ihrer Klasse auf einem geschützten Gerät halten und
    damit **lokal** auswerten, ohne dass der Server Klartext sieht (löst Teile von E-003).
  - Rechtlich bleibt ein Auftragsverarbeiter (Chiffrat gilt als pseudonymes Datum), das
    Risiko ist aber deutlich kleiner als heute.
  - Aufwand L.
- **Ehrliche Notlösung, falls das nicht gewollt ist:** Für Koffer-Klassen offiziell nur
  Live-Raum und Stationsbetrieb ohne persönlichen Lernstand. Den persönlichen Lernraum nur
  bei fester Zuteilung oder dem Modus „Geteiltes iPad“ anbieten.

### G2 – Breite vor Tiefe: acht Lernbereiche und große Randfunktionen bei Bus-Faktor 1

- **Entscheidung:**
  - acht freigegebene Lernbereiche
  - Lehrer-Cloud-Abgleich mit ≈ 6 100 Zeilen
  - Häuser, Duell, Spiegelschrift und Aufgaben im Wartestand
  - vier eigenständige Wiederholungsmaschinen (A-004, A-008, A-017)
- **Kritik:** Die Kernversprechen Rechtschreibung und Mathematik haben heute die
  schwersten Korrektheitsmängel des Audits:
  - Rechtschreibung: D-001, G-001, F-001, G-012
  - Mathematik: G-008, G-009

  Die Randfunktionen dagegen sind ausgebaut. Jede neue Funktion vermehrt die Regelkopien.

- **Alternative:**
  - **Funktionsstopp** außerhalb des Kerns.
  - Ein gemeinsamer Wiederholungskern mit der Regeltabelle aus Vault 06 als
    tabellengetriebener Test.
  - Kernumfang: Wortspeicher, Kopfrechnen, LernBox, Live-Laufdiktat.
  - Tastenwelt nur mit Hardwaretastatur.
  - Lehrer-Cloud-Abgleich auf verschlüsselte Datei-Übergabe zurückführen (A-008).
  - Randfunktionen einfrieren statt löschen.

### G3 – Differenzierung durch Selbstwahl des Kindes, Fortschritt ohne Abrufnachweis

- **Entscheidung:** Stufe, Wortbox, Zahlenraum und Textstufe wählt das Kind. „Sicher“,
  „gemeistert“ und „Tagesziel“ zählen Aktivität, keinen Abruf (D-001, D-004, G-007).
- **Kritik:** Für Grundschulkinder und Kinder mit Förderbedarf ist das die schwächste Form
  der Differenzierung (E-002, D Abschnitt 7: Selbstüberschätzung). Die Anzeigen belohnen
  die bequemste Wahl.
- **Alternative: gelenkte Autonomie.**
  - Die Lehrkraft setzt per Auftrags-QR den Startpunkt (E-002, S für Wörter).
  - Die Stufe steigt automatisch nach einem transparenten Beherrschungskriterium
    (D Abschnitt 9.2 B: drei Abrufe ohne Schriftbild an zwei Tagen).
  - Das Kind wählt innerhalb dieses Rahmens Reihenfolge, Menge und Pause.
  - Die Anzeigen trennen „geübt“ und „gekonnt“.

### G4 – Kalendertags-Leitner mit Exaktvergleich und Totalrückstufung als einziges Lernsignal

- **Entscheidung:** Abstände 1/3/7/14/30 Tage, ein Fehler setzt auf Box 1, geprüft wird
  zeichengenau, ohne Fehlerart (Vault 06; D-008).
- **Kritik:**
  - Die Eingabeprüfung erzeugt in häufigen Lagen Scheinfehler (G-001, G-002, G-003,
    G-008, G-012). Jeder Scheinfehler kostet den **gesamten** Lernstand des Wortes.
  - Die Abstände setzen tägliche Nutzung voraus (Teil 7.2) und verschieben sich um einen
    Tag (G-006).
  - Ein Tippfehler außerhalb der kritischen Stelle gilt so viel wie eine Wissenslücke
    (D Abschnitt 8).
- **Alternative:**
  - Fälligkeit in **Übungseinheiten** statt Kalendertagen, oder Kalendertage mit lokalem
    Tagesschlüssel (G-006).
  - Einzelfehler außerhalb der kritischen Stelle: Box − 1 statt Box 1, wie in verbreiteten
    Wiederholungssystemen üblich (Fachkenntnis, nicht online verifiziert).
  - Eingaben vor der Prüfung normalisieren (Apostroph, Trenner, Tausenderzeichen).
  - Im Ereignis zwischen Abruf, Hilfe und Abschreiben unterscheiden (D-001, F-001).

### G5 – Echtbetrieb als Privatprojekt vor geklärtem Rechtsrahmen, ohne Lehrer-Login

- **Entscheidung:**
  - Das Impressum erklärt einen Demonstrationsbetrieb, laut Code und Doku läuft der
    Unterrichtseinsatz bereits (B-011).
  - Lehrerdaten mit Klarnamen und LRS-Merkmal liegen ungeschützt im Browser (B-009,
    Entscheidung 43).
- **Kritik:** Das ist kein Entwicklungsproblem. Es macht aber jede weitere Funktion, die
  Daten über Kinder erzeugt, rechtlich angreifbar, auch die Empfehlungen zu E-003 und
  D-003. Die Lehrkraft trägt das Risiko persönlich.
- **Alternative:**
  - Den Pilot formal an die Schule binden: Schulleitung als Verantwortliche,
    Datenschutzbeauftragte einbinden, AVV mit Supabase und Cloudflare, dokumentierte
    Schwellwertprüfung.
  - Bis dahin einen **Datensparmodus** erzwingen: Kürzel statt Klarnamen in der
    Klassenliste, kein LRS-Merkmal, Live-Raum nur pseudonym (wie heute), Lehrerbereich
    nicht auf geteilten Geräten.
- **Nachrangig, aber im selben Zug zu entscheiden:** Plattformwahl (A-007, dynamisches SSR
  auf jungem Framework). Neu bewerten, sobald G1 entschieden ist. Ein verschlüsselter
  Lernstand auf dem Server verändert die Anforderungen an die Laufzeit.

## Schluss

### Bewertung der eigenen Dimensionen (0–5)

| Dimension                                           |    Wert | Begründung                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Belastbarkeit der P1-Befunde (Evidenz der Berichte) | **4,0** | Alle 17 P1-Mechanismen sind reproduzierbar oder im Code eindeutig belegt; keiner ist widerlegt. Abzug für einzelne überzeichnete Folgerungen (B-008 Bogen, C-006 „ohne Fehlermeldung“, E zu B-002, D-005 Zeitbedarf) und für Urteile, die auf einer ungeklärten Tatsachenfrage beruhen (Geräteausstattung).                                                   |
| Kalibrierung der Schweregrade                       | **2,5** | Fünf von 17 P1 sind zu hoch angesetzt, drei Paare doppelt gezählt, drei Konzeptlücken stehen neben Defekten. Bereinigt bleiben sieben echte P1 und drei Konzeptlücken (Teil 1). Ohne diese Bereinigung überzeichnet ein Abschlussbericht den Zustand.                                                                                                         |
| Aussagekraft und Umsetzbarkeit der Empfehlungen     | **3,0** | Die meisten S-Empfehlungen sind präzise und haben prüfbare Erfolgskriterien (C-006, G-001, G-011, B-001). 15 Empfehlungen haben Nebenwirkungen (Teil 6). Die wichtigste Abhängigkeit, erst tolerantes Lesen und dann Schemaänderungen, nennt kein Bericht ausdrücklich (6.15).                                                                                |
| Konsistenz zwischen den Berichten                   | **2,5** | Mehrere Stärken eines Berichts sind Befunde eines anderen (Teil 3.5). E baut auf einer überzeichneten B-Aussage auf (2.1). E fordert mehr Oberfläche, A weniger. Die Widersprüche sind fachlich erklärbar, im Abschlussbericht aber offen auszuweisen.                                                                                                        |
| Kohärenz der Grundsatzentscheidungen der Plattform  | **2,0** | Zielbild (Grundschule, Diagnose, Differenzierung), Architektur (Gerät = Kind, lokal, acht Module) und Einsatzrealität (vermutlich geteilte Geräte, Echtbetrieb ohne Rechtsrahmen, Einzelperson) passen an vier Stellen nicht zusammen (Teil 8, G1 bis G5). Die handwerkliche Qualität des Codes ist deutlich höher als die Stimmigkeit dieser Entscheidungen. |

### Die fünf wichtigsten Befunde aus Sicht des Red Teams

1. **Falscher Lernstand im Rechtschreibkern** (D-001 verschärft, A-004, G-001, F-001): Abschreiben und
   „Wort zeigen“ zählen als Fortschritt oder schützen davor, richtige Leistungen in
   Stufe 5 zählen als Fehler. Alle vier Korrekturen sind S und gehören in eine Änderung
   mit einer gemeinsamen Regeltabelle. Sie sind Voraussetzung für jede Diagnostik.
2. **Datenhaltung ohne Netz** (B-001 mit A-001, B-002): Die Sicherung scheitert bei Ordnern,
   eine unbekannte Zeile blockiert ganze Importe, es gibt keine Zweitkopie. Zuerst
   tolerantes Lesen und ein Strukturtest, dann die Home-Bildschirm-Installation
   verbindlich machen, erst danach Schemaänderungen (Teil 6.15).
3. **„Ein Gerät ist ein Kind“** (B-010 mit E-001, G1): Die wichtigste offene Tatsachenfrage des
   Audits ist die Geräteausstattung der Pilotklasse. Profile je Kind lösen
   Koffer-Geräte nicht (Teil 6.3).
4. **Rechtsrahmen und Lehrerdaten auf geteilten Geräten** (B-011, B-009, G5): Bis zur
   Klärung einen Datensparmodus erzwingen. Jede Empfehlung, die der Lehrkraft mehr zeigt
   (E-003, D-003), hängt davon ab.
5. **Konzeptlücken Diagnose und Steuerung** (D-003, E-002, E-003): nicht als Defekte
   gewichten. Die billigsten Hebel zuerst:
   - Auftrags-QR für Lernwörter (S, `?woerter=` existiert)
   - Fehlerwörter je Tier im CSV (S, Daten liegen vor), erst nach F-002 und B-007
   - Keine Diagnostik auf den heutigen, fehlerhaften Lernständen

### Empfohlene Reihenfolge für den Maßnahmenplan (Vorschlag)

1. **Klären (ohne Code):**
   - Geräteausstattung der Pilotklasse (7.1)
   - Rechtsrahmen mit der Schulleitung (B-011)
   - bis dahin Datensparmodus
2. **Sofort, je S:**
   - C-006 (Druckregel)
   - G-001 (Eingabefeld je Wort)
   - D-001, A-004 und F-001 in einer Regeländerung, mit Anzeige der Übungsmenge (Teil 3.2)
   - G-011 mit G-005 vorbereiten
   - F-002 und B-007
   - B-008 (gleiche QR-Größe, gleiche Nutzlast)
3. **Fundament:**
   - A-001 und B-001: tolerantes Lesen, Strukturtest aller Tabellen
   - Danach die Schemaänderungen aus D-001, G-005 und E-002
4. **Erst danach:**
   - Grundsatzentscheidung G1
   - Diagnostik (D-003) und Lehrkraftrückkanal (E-003)
   - Plattformfrage (A-007)

### Echte Stärken (in dieser Gegenprüfung selbst festgestellt)

- **Prüfbarkeit des Fachkerns:** Zeit und Zufall sind überall injizierbar. Jede
  P1-Behauptung ließ sich in Minuten mit einem kleinen Unit-Test gegen die echten
  Domänenfunktionen nachstellen. Das ist die Grundlage dafür, die gefundenen Fehler mit
  Regressionstests dauerhaft zu schließen.
- **Kleine Fehlerursachen:** Der QR-Bogen braucht nachweislich eine einzige Druckregel
  (24/24 Namen nach der Regel). G-001, D-001, F-001 und G-011 sind Änderungen von wenigen
  Zeilen in reinen Funktionen.
- **Datensparsame Sicherung:** Die Schülersicherung enthält weder Klassenmitgliedschaft noch
  LRS-Freigabe noch Klarnamen (`personal-backup.ts:104-120`). Damit gelangt bei der
  Cloud-Sicherung des Kindes kein Förderdatum in private Konten.
- **Widerruf der Schreiberleichterung funktioniert:** Ein erneuter Scan ersetzt die
  Mitgliedschaft samt Freigabe (`student-class-enrollment.tsx:137-139`).
- **Updates unterbrechen keine Runde ungefragt:** Neu geladen wird nur auf Wunsch. Vor
  einem Live-Raum wird gezielt aktualisiert (`version-compatibility.ts`). Das Framework
  fängt Versionsschiefe bei der Navigation ab.
- **Der Rückkanal zur Lehrkraft ist zur Hälfte gebaut:** Fehlerwörter je Teilnehmer liegen
  im Lehrerclient vor. Es fehlt nur die Anzeige.
- **Das Problembewusstsein steht im Vault:** Vault 13 und 19 verlangen, den Lehrerbereich
  nicht auf mit Schülern geteilten Profilen zu nutzen. Der Stationsmodus verzichtet
  bewusst auf persönliche Übernahmen. Die Risiken waren bekannt; der Betrieb ist diesen
  eigenen Vorbehalten vorausgeeilt (so auch B).
- **Saubere Codehygiene:** keine TODO-Altlasten, jede Lint-Ausnahme begründet, keine
  Fremddaten in `innerHTML`.
