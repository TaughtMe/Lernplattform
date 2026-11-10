# Vision Lernraum – Rolle 10: Ist-Stand

Stand: 10.11.2026. Geprüft am Code der Version 0.9.7 (Commit `6f2aa7f`),
an den Versionsnotizen 0.9.2 bis 0.9.7, den Wellen-Plänen 1 bis 3, dem
Entscheidungsprotokoll und dem Vault. Rangfolge bei Widersprüchen: Code, dann
Versionsnotizen, dann Wellen-Pläne, dann Audit und Vault. Es gelten die
Antworten des Entwicklers vom 09.11.2026 (`01-planung.md`, Abschnitt 4).

Kennzeichnung: [Beleg] = im Repository nachgeprüft; [Vermutung] = plausibel,
nicht belegt; „ungeprüft“ = in dieser Bestandsaufnahme nicht nachgeprüft.
Dieser Bericht gibt keine Produktempfehlungen.

## 1. Kurzfazit

1. Lernraum 0.9.7 hat einen Startpunkt, eine Tagesportion, ein Tagestraining
   und ein Kompetenzprofil; alles ist seit dem 05.11.2026 `frei`. **Aber kein
   Link in der Schüleroberfläche führt zu Startpunkt, Training oder Profil.**
   Sie sind nur über die eingetippte Adresse erreichbar (Suche nach
   `/lernen/startpunkt`, `/lernen/training`, `/lernen/profil` in `app/`:
   Treffer nur in den eigenen Seiten und in Tests).
2. Auf einem Gerät ohne Lernstand ist die Tagesportion leer. Neue Aufgaben
   entstehen nur aus LernBox-Karten; feste Wortboxen, Textbox und Tastenwelt
   liefern nichts in die Portion (`src/storage/daily-plan.ts`).
3. Startpunkt und mitgelieferte Inhalte zielen auf die Grundschule:
   Kopfrechnen endet bei „Plus und Minus bis 1000“, die Rechtschreibstufen
   reichen von „Biene“ bis „Fluss“ (`src/domain/start-point.ts`). Für die vom
   Entwickler genannte Zielgruppe Mittelschule (Jahrgang 5 bis 9/10) gibt es
   weder Stufen noch Inhalte oberhalb davon.
4. Mitgeliefert sind 885 Wörter in 8 Wortboxen, 20 Homophon-Gruppen, 50
   Textbox-Texte (alle ungeprüfte KI-Entwürfe), ein Kopfrechengenerator und 57
   Tastschreib-Lektionen. Vokabeln, Lesetexte und Mathematik über
   Kopfrechnen hinaus gibt es nicht.
5. Die Lehrkraft sieht über ein Kind nur, was im Live-Raum geschieht
   (pseudonym per Tier) und ob eine Aufgabe als erledigt gemeldet wurde. Vom
   Üben allein erfährt sie nichts.
6. Die meisten Sofort- und Kurzfrist-Maßnahmen des Audits sind erledigt. Offen
   sind vor allem der Rechtsrahmen (S1), die Beobachtungsphase (S14), die
   neutralen Übungsanpassungen (M4), der Kurzbericht an die Lehrkraft (M8) und
   der Modulvertrag (L1).
7. Inhalte liegen als TypeScript-Konstanten im Quellcode. Ein neuer
   Lernbereich berührt rund 20 Dateien außerhalb des Moduls selbst; einen
   Modulvertrag gibt es nicht.
8. Mehrere Vault-Stellen und der Entscheidungsindex beschreiben einen älteren
   Stand (Abschnitt 7).

## 2. Ist-Stand in Lernraum

### 2.1 Bereiche

Freigabestufen aus `src/domain/release.ts` [Beleg].

| Bereich                                                | Stufe                                     | Kerndateien                                                                                      | Was es heute kann                                                                                                                                                                                                         | Bekannte Grenzen                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live-Raum (Laufdiktat, Kopfrechnen, Stationen, Battle) | `raum`, `lehrer-live`: frei               | `app/raum/spiel/*`, `app/lehrer/live/*`, `src/integrations/laufdiktat/`, `supabase/migrations/`  | Beitritt per 4-stelligem Code oder QR, Tier-Pseudonym, Text, Vokabeln, Kopfrechnen; Stationen; Battle ohne Sieger; Tempo-Punkte nur zuschaltbar; Projektion „Für die Tafel“ ohne Namen; Übernahme in LernBox/Wortspeicher | Code 90 Minuten, Raum schließt nach 120 Minuten (Entscheidung 52); Stationsmodus übernimmt nichts (49)                                                          |
| Wortspeicher                                           | frei                                      | `src/domain/word-round.ts`, `learning-word-progress.ts`, `app/components/learning-word-app.tsx`  | 8 feste und eigene Wortboxen, Merkstufen 1–6, Lernarchiv (Box 6), Buchstabenvergleich, Box-Fortschritt, Brücke zur Textbox, Übernahme von Lernwortlisten                                                                  | Stufe wählt das Kind; Buchstabenvergleich ordnet Fehler keinem Phänomen zu (`letter-diff.ts`); Stufe 6 nur mit deutscher Stimme                                 |
| Textbox                                                | frei (Entscheidung 54)                    | `src/domain/textbox-library.ts`, `textbox-session.ts`, `app/views/textbox/*`                     | 50 Texte, vier Durchgänge (20/40/70/100 % Ausblendung), jeder Versuch gezählt, Verlauf, Laufzettel, Spiegelschrift                                                                                                        | Texte ungeprüft (2.2); nicht Teil der Portion                                                                                                                   |
| Laufdiktat allein                                      | frei                                      | `app/frei/german/laufdiktat/*`, `src/domain/running-dictation.ts`                                | Text- und Vokabelrunden, Autokorrektur aus, Sterne abschaltbar                                                                                                                                                            | Textrunden ohne Lernereignis (Audit D-011, am Code ungeprüft)                                                                                                   |
| LernBox                                                | frei                                      | `src/domain/learning-box.ts`, `vocabulary-import.ts`, `app/views/lernbox/*`                      | Stapel, Ordner, Schreib- und Aufdeckmodus, Leitner 1/3/7/14/30 je Richtung, Import mit Vorlage und Vorschau, Abruf von Paketen per Code                                                                                   | Aufdecken hebt höchstens bis Box 3; keine mitgelieferten Vokabeln                                                                                               |
| Kopfrechnen                                            | frei                                      | `src/domain/mental-math.ts`, `mental-math-feedback.ts`, `math-practice.ts`                       | 4 Grundrechenarten, Zahlenraum frei wählbar (bis 1 000 000), Lücken, Einmaleins 1–10, eigene Terme mit sicherem Parser, Tipp nach Fehler, Lösungsweg, Fehlerwiederholung nach Familien                                    | Nur ganzzahliger Generator; Fehlerart nur in der CSV der Lehrkraft                                                                                              |
| Tastenwelt                                             | frei                                      | `src/tastschreiben/*`, `app/frei/typing/typing-world.tsx`                                        | 50 Lektionen in 10 Stationen, 7 Ziffernblock-Übungen, Fehler-Stopp, unsichere Tasten, Spiel                                                                                                                               | nicht Teil der Portion; auf Hardwaretastatur ausgelegt                                                                                                          |
| Lernen: Tagesportion, Startseite                       | `lernen`: frei                            | `src/domain/daily-plan.ts`, `today-tasks.ts`, `first-contact.ts`, `app/lernen/learner-home.tsx`  | 20 Aufgaben je Tag (höchstens 6 Fehler, 4 Neue), Module wechseln ab; Karten je Bereich; Erstkontakt „Loslegen“ → „Üben“                                                                                                   | Nur LernBox, Lernwörter, Mathe; Rückstand nie als Zahl                                                                                                          |
| Startpunkt, Tagestraining, Kompetenzprofil             | `diagnostik`: frei (59)                   | `start-point.ts`, `daily-training.ts`, `active-time.ts`, `competence-profile.ts`, `app/lernen/*` | Startpunkt je Rechtschreibung und Kopfrechnen (höchstens 12 Aufgaben); Training 10/20 Minuten mit aktiver Zeit; Profil „neu / im Aufbau / sicher“                                                                         | Kein Link in der Oberfläche; Vorschlag wird nicht eingestellt (Mathe: „Stelle das beim Kopfrechnen ein.“); fachliche Abstimmung offen (`docs/version-0.9.7.md`) |
| Fortschritt                                            | frei                                      | `app/lernen/fortschritt/page.tsx`, `app/components/adaptive-progress-panel.tsx`                  | Aktivität, Wortspeicher- und Textbox-Abschnitt                                                                                                                                                                            | Mathe-Fortschritt ungeprüft                                                                                                                                     |
| Lehrerbereich                                          | `lehrer`: frei; `lehrer-geraet`: Vorschau | `app/lehrer/*`, `src/domain/teacher-*`, `class-seal.ts`, `class-enrollment.ts`                   | Klassen, Schülerliste, Einschreibe-QR, Schreiberleichterung, Ablage für Text, Mathe, Vokabeln, Lernwortlisten; Tafelmodus und PIN (Vorschau)                                                                              | Kein Login (43); Tafelmodus nicht frei                                                                                                                          |
| Aufgaben der Lehrkraft                                 | frei (59)                                 | `src/domain/student-assignment.ts`, `teacher-workspace.ts`, `app/lehrer/aufgaben/page.tsx`       | strukturierte Aufträge per QR, Abgabenachweis (HMAC)                                                                                                                                                                      | Seite noch in alter Oberfläche ohne Überschrift der Ebene 1 (`version-0.9.7.md`)                                                                                |
| Freigabe an Schüler                                    | frei                                      | `word-list-package.ts`, `transfer-payload.ts`, `app/components/student-content-transfer.tsx`     | Vokabelpakete und Lernwortlisten (bis 200 Wörter), verschlüsselt, 24 Stunden                                                                                                                                              | keine Texte, keine Mathe-Inhalte                                                                                                                                |
| Gastmodus                                              | frei (59)                                 | `src/domain/guest-pass.ts`, `src/storage/guest-mode.ts`, `app/gast/guest-entry.tsx`              | Signierter Gast-QR (90 Minuten), Rückfrage bei vorhandenem Lernstand, Löschung beim Beenden oder nach 12 Stunden                                                                                                          | Restrisiko SR-004 akzeptiert; braucht eine angelegte Klasse                                                                                                     |
| Sicherung und Abgleich                                 | `geraete-sync`: frei                      | `src/storage/personal-backup.ts`, `storage-protection.ts`, `src/integrations/cloud-sync/`        | Sicherungsdatei, Speicherschutz (`persist()`), Schüler-Handabgleich und Lehrer-Abgleich über OneDrive und WebDAV                                                                                                          | Google Drive aus (59); Tagespläne nicht in der Sicherung (57)                                                                                                   |
| Häuser, Serie, Abzeichen; Duell                        | aus                                       | `src/domain/houses.ts`, `app/haus/*`, `app/duell/page.tsx`                                       | Häuser mit Punktdeckel und Haus-Leistungsbrief per QR gebaut; Duell ist Platzhalter                                                                                                                                       | ruhen (Antwort Frage 7)                                                                                                                                         |

### 2.2 Mitgelieferte Inhalte

| Inhalt                       | Anzahl und Art                                                                                                                                              | Prüfstand                                                                                                                        | Beleg                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Wortboxen                    | 8 Boxen, 885 Wörter: Doppelkonsonanten 105, ck/tz 105, Auslautverhärtung 111, ä/äu 104, langes i 108, Dehnungs-h 108, s/ss/ß 133, Merk- und Fremdwörter 111 | Audit-Fehler behoben (0.9.3); fachliche Gesamtprüfung ungeprüft; keine Niveaustufen, keine Kontrastboxen                         | `src/domain/german-learning-content.ts`; `docs/version-0.9.3.md`                         |
| Homophone                    | 20 Gruppen mit Bedeutungshilfe (für Stufe 6)                                                                                                                | „Die Lehrkraft prüft die Liste“; ob geschehen, ungeprüft                                                                         | `src/domain/homophones.ts`                                                               |
| Textbox-Texte                | 50 (16 leicht, 17 mittel, 17 schwer)                                                                                                                        | **Entwürfe eines KI-Agenten, nicht fachlich geprüft**. TXT-011, -024, -034, -046 führen weiter silbentrennendes h als Dehnungs-h | `docs/inhalte/textbox.md`, „Stand“; `textbox-library.ts` (z. B. TXT-024: „sehen“, „Reh“) |
| Kopfrechnen                  | Generator, keine festen Aufgaben: 4 Rechenarten, Lücken, Einmaleins 1–10, eigene Terme mit Dezimalzahl, Klammer, Potenz, Bruch, Wurzel                      | Regeln getestet; Verteilung der Aufgaben laut Audit D-009 grob (am Code ungeprüft)                                               | `src/domain/mental-math.ts`, `math-practice.ts`; Entscheidung 38                         |
| Startpunkt                   | Rechtschreibung 12 feste Wörter in 6 Stufen; Kopfrechnen 6 Stufen von „bis 10“ bis „bis 1000“                                                               | „fachlicher Vorschlag … mit der Lehrkraft abzustimmen“                                                                           | `src/domain/start-point.ts`, Kopfkommentar                                               |
| Tastenwelt                   | 50 Lektionen, 10 Stationen, 7 Ziffernblock-Übungen                                                                                                          | –                                                                                                                                | `src/tastschreiben/curriculum.ts`, `stations.ts`                                         |
| Vokabeln                     | **keine**                                                                                                                                                   | –                                                                                                                                | `src/domain/vocabulary-catalog.ts` (nur Ablage der Lehrkraft)                            |
| Lesetexte, Mathe jenseits K. | **keine**                                                                                                                                                   | –                                                                                                                                | `01-planung.md`, 1.3                                                                     |

### 2.3 Datenflüsse

| Fluss                        | Was                                                                                                                                                                 | Wohin, wie lange                                                                  | Beleg                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Üben allein                  | Lernereignisse, Karten, Lernwörter, Runden, Textbox-Einheiten, Tagespläne                                                                                           | nur IndexedDB des Geräts                                                          | `src/storage/`; Entscheidung 2                                                               |
| Kind → Lehrkraft (Live-Raum) | Tier-Name, Position, Versuche, Fehler, Aufdecken, Dauer, Fehlerwörter mit Anzahl (`word_errors`), bei Mathe erste falsche Antwort je Aufgabe (höchstens 32 Zeichen) | Supabase, Tabelle `room_students`; beendete Räume werden nach 24 Stunden gelöscht | `supabase/migrations/20260825124001_*`, `20261105111441_*`, `20261003120000_*` (Aufräum-Job) |
| Lehrkraft-Ansicht und CSV    | Fortschritt je Tier, Fehlerwörter je Tier, CSV nur auf Klick, mit Abschnitt „Fehlerart (Vermutung)“                                                                 | Lehrergerät; Fehlerart nur in der CSV                                             | `docs/version-0.9.3.md`, `0.9.5.md`; Welle 2, C4-5                                           |
| Lehrkraft → Kind (Material)  | Vokabelpaket oder Lernwortliste                                                                                                                                     | Supabase nur als Chiffretext, 24 Stunden, Code oder QR                            | Entscheidung 42; Welle 3, D4                                                                 |
| Aufgaben                     | Auftrag per statischem QR; zurück ein HMAC-signierter Abgabenachweis (Aufgabe, Klasse, Mitgliedschaft, Zeit, Ergebnis, Standnummer)                                 | ohne Netz, Lehrergerät                                                            | Entscheidung 45                                                                              |
| Schreiberleichterung         | signierte Freigabe im Einschreibe-QR; im Raum nur der Stempelabdruck                                                                                                | keine LRS-Angabe an den Server                                                    | Entscheidung 50                                                                              |
| Sicherung                    | Datei oder Handabgleich in eigene Cloud (Schüler), automatischer Abgleich (Lehrkraft)                                                                               | Speicher der Nutzerin; Verschlüsselung optional                                   | `docs/cloud-sync.md`; `app/components/student-settings-panel.tsx`                            |

**Was die Lehrkraft über ein einzelnes Kind erfährt** [Beleg]: im Live-Raum
Fortschritt, Fehlerzahl und Fehlerwörter je Tier-Pseudonym, in der CSV
zusätzlich die erste falsche Mathe-Antwort mit vermuteter Fehlerart; bei
Aufgaben den Abgabenachweis. **Was nicht:** alles aus dem Üben allein, den
Startpunkt, das Kompetenzprofil, die Tagesportion, Box-Stände. Der
QR-Leistungsbrief aus Entscheidung 4 ist nur als Haus-Brief gebaut, und
Häuser sind aus (`src/domain/houses.ts`; Entscheidungsindex, Zeile 4).

### 2.4 Technische Voraussetzungen für neue Inhalte

- **Kein Modulvertrag** [Beleg]: Die Suche nach „Modulvertrag“ bleibt ohne
  Treffer. Es gibt nur den Ereignisvertrag `LearningEventV1`
  („Stable cross-module contract“, `src/domain/learning-bundle.ts`).
- **Inhalte im Quellcode** [Beleg]: Wortboxen, Texte, Homophone,
  Startpunkt-Stufen und Lektionen sind TypeScript-Konstanten. Jede Änderung ist
  ein Code-Release.
- **Feste Modullisten** [Beleg]: Die Portion kennt genau drei Module
  (`DAILY_PLAN_MODULES`: vocabulary, german, mathematics), Ereignisse vier
  Lernbereiche (`learningAreaSchema`), Klassen fünf Module
  (`classModuleSchema`).
- **Berührte Stellen** [Beleg]: Der jüngste Bereich, die Textbox, steht außer
  in eigenen Dateien in 20 weiteren Dateien in `src/` und `app/` (u. a.
  Freigaberegister, Üben-Übersicht, Leiste, Kompetenzprofil, Sicherungsschema,
  Löschen der Schülerdaten, Ereignisquelle, Fortschritt). Hinzu kommen
  Dexie-Version, Strukturtest der Sicherung und Designansichten.

## 3. Stand der Audit-Empfehlungen

Grundlage: Abschlussbericht, Abschnitte J und M.2. „Erledigt“ heißt: in
Versionsnotiz oder Wellen-Plan als umgesetzt beschrieben und, wo genannt, am
Code nachgesehen.

| Nr. | Kurz                                             | Stand                       | Beleg                                                                                                         |
| --- | ------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| P1  | Schemaevolution (A-001, B-001)                   | erledigt                    | Welle 1, S-1 bis S-3                                                                                          |
| P1  | Speicherlöschung (B-002)                         | teilweise                   | S-4 bis S-6; `storage-protection.ts` ruft `persist()`; Grundrisiko bleibt                                     |
| P1  | Gerät = Person (B-010, E-001)                    | teilweise                   | Gastmodus (C6); kein Profil je Kind, kein mitreisender Lernstand                                              |
| P1  | Falscher Lernstand (A-004, D-001, G-001)         | erledigt                    | W-1 bis W-13; D1; 0.9.2 (Einzelwortblöcke)                                                                    |
| P1  | Lehrerdaten auf geteilten Geräten (B-009)        | teilweise                   | Tafelmodus und PIN gebaut, nur Vorschau (`lehrer-geraet`)                                                     |
| P1  | Rechtsrahmen (B-011)                             | offen                       | Antwort Frage 4                                                                                               |
| S1  | Einsatzrahmen klären                             | offen                       | Antwort Frage 4                                                                                               |
| S2  | Sicherung reparieren, Strukturtest               | erledigt                    | Welle 1, S-2, S-3                                                                                             |
| S3  | Installation, „Sicherung einspielen“             | erledigt                    | Welle 1, S-4 bis S-6                                                                                          |
| S4  | Lernwort-Regeln, Übungsmenge sichtbar            | erledigt                    | Welle 1, W-1 bis W-13                                                                                         |
| S5  | Stufe 5: ein Feld je Wort                        | anders gelöst               | 0.9.2: Leerzeichen als Trenner, Formathinweis ohne Versuchsverlust                                            |
| S6  | Antwort-Normalisierung, Zahlen exakt             | erledigt                    | M-2, M-3; C2-1, C2-2                                                                                          |
| S7  | Battle-Absender                                  | erledigt                    | 0.9.2 (tokengebundene Abfragen, keine öffentlichen Kanäle)                                                    |
| S8  | QR-Bogen-Druck                                   | erledigt                    | 0.9.3                                                                                                         |
| S9  | Laufdiktat allein ohne Autokorrektur             | erledigt                    | 0.9.3                                                                                                         |
| S10 | Inhaltskorrekturen Wortboxen                     | erledigt                    | 0.9.3; vier Textbox-Texte offen (2.2)                                                                         |
| S11 | Datenschutzerklärung, „Lehrerbereich“            | teilweise                   | 0.9.3; Serverstandort und AVV nur angekündigt                                                                 |
| S12 | „adaptiv/diagnosegestützt“ ersetzen              | teilweise                   | App-Texte ohne Treffer; Vault-Kapitel 07 und 22 heißen weiter „Adaptiv…“                                      |
| S13 | Fehlerwörter je Tier, CSV auf Klick              | erledigt                    | 0.9.3                                                                                                         |
| S14 | Beobachtungsphase                                | offen                       | kein Ergebnis im Repository                                                                                   |
| K1  | Tolerantes Lesen                                 | erledigt                    | S-1; `src/domain/tolerant-read.ts`                                                                            |
| K2  | Lade- und Fehlerzustände, `no-floating-promises` | offen (teilweise ungeprüft) | Regel fehlt in `eslint.config.mjs`                                                                            |
| K3  | Realtime absichern                               | erledigt                    | 0.9.2                                                                                                         |
| K4  | Zwischenstand, „Weitermachen“                    | erledigt                    | D5-1 (Tastenwelt nur Rückfrage)                                                                               |
| K5  | Erstkontakt                                      | erledigt                    | D5-2                                                                                                          |
| K6  | Ehrliche Anzeigen                                | teilweise                   | D5-4, W-10, W-11; Bestwert in der Textbox bleibt (Entscheidung 56)                                            |
| K7  | Glossar, Vorlesen der Anleitungen                | anders entschieden          | Glossar D5-3; Vorlesen nur in der Aufgabe (Entscheidung 58)                                                   |
| K8  | Namensliste einfügen, keine Demo-Werte           | ungeprüft                   | –                                                                                                             |
| K9  | Auftrags-QR                                      | anders entschieden          | D4: Lernwortlisten über die Übertragung; Zahlenraum und Text fehlen                                           |
| K10 | Tempo-Punkte aus, Projektion                     | erledigt                    | D5-5                                                                                                          |
| K11 | Tests gegen Produktions-Build, offline           | teilweise                   | D5-6 (`playwright.production.config.ts`); Offline-Suite ungeprüft                                             |
| K12 | Abdeckung `app/`, Regeltabelle                   | teilweise                   | Regeltabelle D1; `vitest.config.ts` misst `app/` und `src/tastschreiben` nicht                                |
| K13 | Abrufzeitpunkt je Richtung                       | erledigt                    | C1                                                                                                            |
| M1  | Gemeinsamer Wiederholungskern                    | erledigt                    | D1, `src/domain/spaced-repetition.ts`                                                                         |
| M2  | Ereignisquelle Variante b                        | offen                       | kein Beleg in Wellen-Plänen                                                                                   |
| M3  | Gerätemodell                                     | teilweise                   | Gastmodus; Varianten „Profile je Kind“ und „Lernstand reist mit“ nicht gebaut                                 |
| M4  | Neutrale Übungsanpassungen                       | offen                       | `01-planung.md`, 1.3                                                                                          |
| M5  | Beherrschungsstand, Levumi                       | teilweise                   | Kompetenzprofil mit Regel „sicher“ (D2-3); keine Anbindung an Levumi                                          |
| M6  | Fehlerklassifikation                             | teilweise                   | nur Mathe, nur CSV (C4); Rechtschreibung ohne                                                                 |
| M7  | Wortspeicher-Gerüst, Kontraste, Niveaus          | teilweise                   | Stufen 1–3 in der Wiederholung gesperrt (W-5), Lernarchiv (C5); Kontraste, Niveaus, Textbox-Kennzahlen fehlen |
| M8  | Kurzbericht des Kindes                           | offen                       | Antwort Frage 3 öffnet den Weg                                                                                |
| M9  | Tafelmodus, Vertretung, Schuljahreswechsel       | teilweise                   | D3 (Vorschau); Rest ungeprüft                                                                                 |
| M10 | Kopfrechnen gewichten, Flüssigkeit               | offen (ungeprüft)           | –                                                                                                             |
| M11 | Probedurchlauf mit Evaluation                    | offen                       | kein Ergebnis im Repository                                                                                   |
| L1  | Modulvertrag, Inhalte als Datenpakete            | offen                       | 2.4                                                                                                           |
| L2  | Ausstieg aus Server-Rendering                    | offen                       | –                                                                                                             |
| L3  | Sekundarstufe nur über die LernBox               | vom Entwickler überholt     | Antwort Frage 1: Mittelschule, alle Klassen                                                                   |
| L4  | Betriebs- und Datenschutzpaket                   | offen                       | Antwort Frage 8 macht es für den Schulamtsbezirk nötig                                                        |
| L5  | Motivationsschicht                               | gebaut, aus                 | `release.ts` (`motivation`, `duell`)                                                                          |

Konzeptlücken des Audits: D-003 (Diagnostik) teilweise durch Startpunkt und
Profil; E-002 (Auftrag) anders gelöst durch Lernwortlisten; E-003
(Rückmeldung) teilweise durch Fehlerwörter je Tier und CSV.

## 4. Der Prüfstein am heutigen Code

Szene: „Tablet in die Hand, ohne Vorbereitung, 20 Minuten sinnvoll an genau
dem, was das Kind braucht.“ Nur aus dem Code abgeleitet [Beleg, wo nicht
anders markiert].

### (a) Fremdes Gerät ohne Lernstand

1. Startseite, Tier antippen (Entscheidung 48) → `/lernen`.
2. Kein Lernstand, keine Portion, keine Klasse: Begrüßung und „Loslegen“
   (`first-contact.ts`).
3. „Loslegen“ → `/ueben` mit sechs Kacheln (`app/ueben/practice-overview.tsx`).
4. Bereich wählen, dann Wortbox oder Zahlenraum, dann Stufe und Rundengröße.
5. Erste Aufgabe.

Das sind etwa vier bis fünf Entscheidungen, alle beim Kind. Die
**Tagesportion ist leer**: Kandidaten entstehen nur aus LernBox-Karten,
vorhandenen Lernwörtern und Mathe-Ereignissen (`dailyPlanCandidates`). Das
Training meldet „Heute ist noch nichts dran“. Der **Startpunkt** würde helfen,
ist aber nicht verlinkt. Wer ihn über die Adresse öffnet, bekommt nach
höchstens 12 Aufgaben einen Vorschlag. Rechtschreibung verlinkt die Wortbox
(`?sammlung=`), die Stufe muss das Kind selbst wählen. Bei Mathe steht nur
„Stelle das beim Kopfrechnen ein.“ Startpunkt-Fehler werden zu Lernereignissen.
Rechtschreibfehler werden als neues Lernwort erst am nächsten Tag fällig (W-4).
Mathe-Fehler sind laut Regeltabelle sofort fällig; weil ein leerer Plan neu
berechnet wird, können sie noch am selben Tag in die Portion kommen
(`src/storage/daily-plan.ts`, `today`; [Vermutung], nicht im Browser
geprüft).

**Bruch:** „genau das, was es braucht“ leistet das Gerät nicht. Für ein Kind
der Mittelschule endet der Startpunkt bei Grundschulniveau.

### (b) Gastmodus auf geteiltem Gerät

Die Lehrkraft braucht eine angelegte Klasse (Klassenstempel) und zeigt den
Gast-QR. `/gast` prüft Signatur und Ablauf. Hat das Gerät einen Lernstand,
fragt es nach und bietet eine Sicherung an. Danach geht es nach `/lernen`
(`app/gast/guest-entry.tsx`). Ab dort wie (a). Am Ende oder nach 12 Stunden
werden alle Schülerdaten gelöscht. Der Gast tritt dabei keiner Klasse bei.
Klassenaufgaben und Schreiberleichterung gibt es also nicht.

**Bruch:** Wie (a). Zusätzlich geht alles Geübte verloren. Ein Fehler von
heute kann morgen nicht wiederkommen.

### (c) Eigenes Gerät mit Lernstand

„Weiterlernen“ führt in das Modul des ersten offenen Portionselements. Die
Startseite zeigt Karten je Bereich (`today-tasks.ts`). Die Portion hat
höchstens 20 Elemente: zuerst Fehler, dann Fälliges, dann bis zu 4 neue
LernBox-Karten. Das Training (10 oder 20 Minuten) schätzt 20 s je Karte, 45 s
je Lernwort und 75 s je Rechenfamilie (`daily-training.ts`). Es zählt nur
aktive Zeit.

**Brüche:**

- Das Training ist nicht verlinkt; der Weg über „Weiterlernen“ hat keine Uhr.
- Neuer Rechtschreibstoff kommt nie über die Portion. Neue Wörter entstehen nur
  durch eigenes Üben, Übernahme aus dem Live-Raum oder eine Lernwortliste.
- Ohne Vokabeln der Lehrkraft gibt es keine neuen Aufgaben. Die Portion
  wiederholt dann nur.
- Je nach Mischung reichen 20 Elemente für etwa 7 bis 25 Minuten (Schätzwerte
  der Datei). „20 Minuten“ ist also nicht verlässlich gefüllt.
- Textbox, Tastenwelt und Laufdiktat allein fehlen in der Portion
  (Entscheidung 57, „Bekannte Grenzen“).

### Wo der Prüfstein heute trägt

Im **Live-Raum**: Code eintippen, Tier, sofort üben. Fehler wandern danach auf
das Gerät (Entscheidungen 49, 55). Das braucht aber einen Raum der Lehrkraft.
Die Lehrkraft muss ihn öffnen, das Kind übt dann ihren Inhalt, nicht seinen
eigenen.

## 5. Vorhandene Bausteine, auf denen die Vision aufbauen kann

| Baustein                           | Datei                                                                 | Stand                           | Lücke                                                                |
| ---------------------------------- | --------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| Wiederholungskern mit Regeltabelle | `src/domain/spaced-repetition.ts`, `testing/repetition-rule-table.ts` | frei, getestet                  | Fälligkeit setzt tägliche Nutzung voraus (Audit G8)                  |
| Tagesportion                       | `src/domain/daily-plan.ts`, `src/storage/daily-plan.ts`               | frei                            | nur drei Module; leer ohne Lernstand                                 |
| Tagestraining mit aktiver Zeit     | `daily-training.ts`, `active-time.ts`                                 | frei                            | nicht verlinkt; Schätzwerte unkalibriert                             |
| Startpunkt                         | `start-point.ts`, `src/storage/start-point.ts`                        | frei                            | nicht verlinkt; nur bis Grundschulniveau; Vorschlag nicht übernommen |
| Kompetenzprofil                    | `competence-profile.ts`                                               | frei                            | nicht verlinkt; Regel „sicher“ nicht abgestimmt                      |
| Fehlerklassifikation Mathe         | `mental-math-feedback.ts`                                             | Tipp für Kind, Fehlerart in CSV | Rechtschreibung ohne Gegenstück                                      |
| Buchstabenvergleich                | `letter-diff.ts`                                                      | frei                            | keine Zuordnung zu Phänomenen                                        |
| Wortboxen mit Strategie            | `german-learning-content.ts`                                          | 885 Wörter                      | keine Niveaus, Kontraste, Wortarten; Grundschulwortschatz            |
| Textbox                            | `textbox-library.ts`, `textbox-session.ts`                            | 50 Texte                        | ungeprüft; Niveau für Jugendliche ungeprüft                          |
| Lernwortlisten der Lehrkraft       | `word-list-package.ts`                                                | frei                            | nur Wörter, keine Texte oder Zahlenräume                             |
| Verschlüsselte 24-h-Übergabe       | `src/integrations/content-transfer/`, `transfer-payload.ts`           | frei                            | Richtung nur Lehrkraft → Kind                                        |
| Abgabenachweis (QR, signiert)      | `student-assignment.ts`, `teacher-workspace.ts`                       | frei                            | trägt keine Lernwerte                                                |
| Haus-Leistungsbrief (QR, signiert) | `houses.ts`                                                           | gebaut, aus                     | einziger gebauter Weg Kind → Lehrkraft mit Werten                    |
| Klassenstempel                     | `class-seal.ts`                                                       | frei                            | –                                                                    |
| Gastmodus                          | `guest-pass.ts`, `src/storage/guest-mode.ts`                          | frei                            | löscht alles; kein Mitnehmen des Lernstands                          |
| Live-Raum mit Übernahme            | `src/integrations/laufdiktat/`, Entscheidungen 49, 55                 | frei                            | Formate nur Laufdiktat, Kopfrechnen, Stationen, Battle               |
| Tafelmodus und PIN                 | `teacher-device.ts`, `teacher-lock.ts`                                | Vorschau                        | Freigabe offen                                                       |
| Kinder-Glossar mit Test            | `child-glossary.ts`                                                   | frei                            | –                                                                    |
| Sprachausgabe                      | `src/speech/`                                                         | nur Gerätestimmen               | Stimmen auf Schulgeräten ungeprüft                                   |

## 6. Entscheidungen, die die Vision berühren

| Thema               | Nr.                | Kernaussage                                                                                              | Folge für die Vision                                                                                   |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Konten und Login    | 2, 9, 43           | Lerndaten lokal, keine Schülerkonten; Lehrerbereich ohne Login bis Anbieter, Datenschutz, Kosten geklärt | Jeder Vorschlag mit Konto ist Entscheidungsvorlage                                                     |
| Rückkanal           | 2, 4, 5, 6, 10, 41 | Nur bewusst erzeugter, reduzierter QR-Brief; keine Einzelfehler, keine Lernhistorie, keine Dauer-Sync    | Antwort Frage 3 (Abgleich über Supabase für eine Sitzung) widerspricht 2 und 10 → Entscheidungsvorlage |
| Rückkanal           | Welle 2, C4-5      | Fehlerart Mathe nur in der CSV, nicht in der Oberfläche (27.10.2026)                                     | Steht nur im Wellen-Plan                                                                               |
| Übergabe            | 42                 | Supabase nur als verschlüsselter 24-h-Übergaberaum                                                       | Ein Abgleich von Punkten oder Berichten wäre ein neuer Fluss                                           |
| Diagnostik          | 59; Welle 3, D2    | Startpunkt statt Test, Profil als Ableitung, frei in der Beta; Abstimmung offen                          | Grundlage vorhanden, Einstieg fehlt (Abschnitt 4)                                                      |
| Gamification, Tempo | 7, 10, 39, 47      | Erst nach stabilem Lernkern; keine Rangliste nach absoluter Leistung; Motivation und Duell aus           | Antwort Frage 5 (Tempo reizt) steht in Spannung → Entscheidungsvorlage                                 |
| Tempo               | Welle 3, D5-5      | Tempo-Punkte nur zuschaltbar, Battle ohne Sieger                                                         | Steht nur im Wellen-Plan                                                                               |
| Inhalte und KI      | 30, 54             | Wortbanken ≥ 100, Runden 10; KI-Texte aus Lernwörtern nicht Teil der Textbox                             | Prüfzeit der Lehrkraft ist Engpass (2.2)                                                               |
| Zielgruppen         | –                  | Keine Entscheidung im Protokoll; Antwort Frage 1: Mittelschule Bayern, alle Klassen, plus Grundlagen     | Audit-Empfehlung Jgst. 3–6 und L3 sind überholt                                                        |
| Aufgabensteuerung   | 19, 44, 45         | Kein allgemeiner Aufgabenplaner; strukturierte Aufgaben mit Abgabenachweis erlaubt                       | Neue Aufträge müssen fachlich strukturiert bleiben                                                     |
| Aufgabensteuerung   | Welle 3, D4        | **Wortauftrag per URL-QR entfernt** (irritiert neben der Supabase-Übertragung)                           | Rücknahme steht nicht im Protokoll (`AGENTS.md` verlangt es)                                           |
| Vorlesen            | 58                 | Nur in der Aufgabe; „Nicht wieder einbauen“ auf Start- und Einstellungsblättern                          | Einzige förmliche Rücknahme im Protokoll                                                               |
| Lückensatz          | 55                 | Design 4e (Lückensatz) nicht umgesetzt                                                                   | Vor neuen Satzformaten beachten                                                                        |
| Förderbedarf        | 50                 | Schreiberleichterung nur über Klassenstempel, nur Live-Raum, nur Vokabeln; keine LRS-Angabe an Server    | Übungsanpassungen (M4) müssen das achten                                                               |
| Geräte-Abgleich     | 53                 | Abgleich der Lehrkraft über eigene Cloud; **nur in `docs/cloud-sync.md`**, nicht im Protokoll            | ruht (Antwort Frage 7)                                                                                 |
| Mathe-Kern          | 38                 | Basale Kopfrechenkompetenz; Geometrie und Prüfungsstoff nicht im Kern                                    | Mathe für Jahrgang 5–9 berührt diese Grenze → Entscheidungsvorlage                                     |

Weitere Festlegungen vom 27.10.2026 stehen nur in den Wellen-Plänen:
Archivwort falsch → Box 1 (C5), Textbox „letzter Versuch zählt“ (C3-3),
Projektion mit „Häufigsten Fehlern“ (D5-5), Wegfall der festen Startkarten
(D5-2).

## 7. Veraltete Dokumentation und offene Punkte

### 7.1 Vault und Dokumentation widersprechen dem Code

| Stelle                                                  | Aussage                                                                    | Heute                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Entscheidungsindex, Zeile 1 und G4                      | Startseite verlinkt „Lehrer-Login“                                         | behoben in 0.9.3                                                          |
| Entscheidungsindex, Zeile 23                            | Aufdecken hebt bis Box 5                                                   | höchstens Box 3 seit 0.9.4 (C3-2)                                         |
| Entscheidungsindex, Zeilen 41, 44                       | Freigabe nur Vokabeln; Aufgaben `vorschau`                                 | auch Lernwortlisten (D4); Aufgaben `frei` (59)                            |
| Entscheidung 51                                         | „Die Freigabe an Schüler bietet nur Vokabeln an“                           | dito                                                                      |
| Entscheidung 54                                         | Texte „von der Lehrkraft fachlich geprüft“                                 | laut `docs/inhalte/textbox.md` nicht geprüft                              |
| Entscheidung 57, „Bekannte Grenzen“                     | Später angelegte Karten erst morgen                                        | gilt nur bei nicht leerem Plan; leerer Plan wird neu berechnet            |
| Übersicht, Zeilen 03, 04, 12, 14                        | getrennte Stände je Richtung fehlen; nur Vokabeln; Ordner-Sicherung defekt | behoben (C1, D4, S-2)                                                     |
| Übersicht, Zeile 22; Vault 22, Nachtrag                 | „Diagnostik nicht umgesetzt“; „als Vorschau“                               | gebaut und `frei` (59)                                                    |
| Vault 22, Abschnitte zu „Heute üben / Mein Fortschritt“ | vier feste Einstiege                                                       | Navigation Lernen, Üben, Raum (48); im Vault selbst als überholt markiert |
| `docs/inhalte/tastenwelt.md`                            | Oberfläche in `app/components/typing/typing-app.tsx`                       | Datei fehlt; heute `app/frei/typing/typing-world.tsx`                     |
| Protokoll                                               | Entscheidung 53 fehlt; Rücknahme Wortauftrag fehlt                         | nur in `docs/cloud-sync.md` und Welle 3, D4                               |

### 7.2 Offene Punkte aus den Versionsnotizen

- Pädagogische Abstimmung von Startpunkt und Regel „sicher“
  (`version-0.9.7.md`).
- Offene Entscheidungen aus Welle 3: Freigabe `lehrer-geraet`, Uhr über Module,
  „Weitermachen“ 24 Stunden, Cloud-Abgleich aus den Kindereinstellungen.
- Serverstandort und Auftragsverarbeitung von Supabase (`version-0.9.3.md`).
- Vier Textbox-Texte mit falschen Zielwörtern; alle 50 Texte ungeprüft.
- „Essen“ und „essen“ ohne Artikel teilen einen Lernstand (`version-0.9.5.md`).
- Fehlerart bei komplexen Termen oft leer (`version-0.9.5.md`).

### 7.3 Annahmen und Antworten, mit denen dieser Bericht arbeitet

- Zielgruppe Mittelschule Bayern, alle Klassen, plus Grundschulgrundlagen
  (Frage 1). Daran gemessen fehlen Inhalte ab Jahrgang 5.
- Eigene und geteilte Geräte kommen beide vor (Frage 2); Stifte und
  Tastaturen: Annahme „nicht überall“.
- Rechtsrahmen nicht geklärt (Frage 4): Annahme „ohne Namen und ohne
  Förderangaben“ bleibt.

### 7.4 Nicht geprüft

- Verhalten im Browser; alle Aussagen stammen aus Code und Dokumenten.
- Offlinebetrieb, kostenlose Tarife, Stimmen auf Schulgeräten.
- Die Audit-Einzelberichte A bis G; K8, M9 (Vertretung, Schuljahreswechsel),
  M10 und der Mathe-Fortschritt.
- Ob Homophone und Wortboxen insgesamt fachlich abgenommen sind.
