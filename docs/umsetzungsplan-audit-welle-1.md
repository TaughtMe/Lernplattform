# Umsetzungsplan Audit – Welle 1

Stand: 21.10.2026. Grundlage: Gesamtaudit vom 19./20.10.2026
(`docs/audits/2026-10-19-lernraum-gesamtaudit.md`, Red Team
`docs/audits/2026-10-19-gesamtaudit/agent-f-redteam.md`) und die Festlegungen des
Entwicklers vom 21.10.2026.

Welle 1 enthält nur Änderungen, die **kein gespeichertes Datenformat ändern** – mit
einer Ausnahme: Paket 1 macht das Lesen tolerant (Audit K1) und ist Voraussetzung
für alle späteren Formatänderungen (Red Team 6.15).

## Festlegungen

### Wortspeicher und Leitner (Lernwörter)

| Nr.  | Regel                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-1  | **Freies Üben** ist jede Runde außerhalb der Wortbox „Trainingswörter heute“ (`faellig`). Es ändert die Leitner-Box nie.                                                                                                                  |
| W-2  | Freies Üben, erster Versuch an einem Wort **richtig ohne Hilfe**: Box und Fälligkeit bleiben.                                                                                                                                             |
| W-3  | Freies Üben, **Fehler oder „Wort zeigen“**: Box bleibt, das Wort wird spätestens am nächsten Tag fällig (`dueAt = min(dueAt, Beginn des nächsten lokalen Tages)`).                                                                        |
| W-4  | Ein Wort ohne Lernstand, das frei geübt wird, erhält Box 1 und ist am nächsten Tag fällig.                                                                                                                                                |
| W-5  | **Fällige Wiederholung** findet nur in „Trainingswörter heute“ statt (auch über `?heute=1`). Wählbar sind nur Stufe 4, 5 und 6 (freier Abruf), Vorwahl Stufe 4. Stufen 1–3 sind dort mit Begründung gesperrt.                             |
| W-6  | In der fälligen Wiederholung zählt nur der **erste Versuch** an einem Wort, und nur, wenn das Wort zu diesem Zeitpunkt fällig ist (`dueAt <= now`). Richtig ohne Hilfe: Box + 1 (höchstens 5), Fälligkeit nach dem Abstand der neuen Box. |
| W-7  | Fällige Wiederholung, erster Versuch **falsch oder mit „Wort zeigen“** (F-001): Box 1, am nächsten Tag fällig. Spätere Versuche in derselben Runde (Selbstkorrektur) ändern nichts mehr.                                                  |
| W-8  | Merkstufe (`stage` im Lernstand): richtig auf Anhieb ohne Hilfe → `max(bisher, Stufe)`, **ohne +1**. Fehler oder Hilfe → `max(1, min(bisher, Stufe) − 1)`. Abschreiben (Stufe 1) hebt die Merkstufe damit nie über das bereits Gezeigte.  |
| W-9  | Prozentwert einer Runde: wie bisher nur der erste Versuch (`wordRoundPercent`). Korrekturen ändern ihn nicht. Alle Runden werden gespeichert.                                                                                             |
| W-10 | Anzeige: Übersicht und Startblatt zeigen das **letzte Ergebnis** („Zuletzt 80 %“), nicht den Bestwert.                                                                                                                                    |
| W-11 | Ergebnis einer Stichprobe ehrlich benennen: „8 von 10 Wörtern dieser Runde auf Anhieb richtig“; bei einer Stichprobe zusätzlich „Runde aus 10 von 34 Wörtern der Wortbox“. **Annahme**, bitte bestätigen.                                 |
| W-12 | „Meine Fehlerwörter“ zeigt keinen Prozentwert, sondern „n Wörter geübt“. Die Runde wird weiter gespeichert (Format unverändert); ein optionaler Prozentwert im Format folgt erst nach K1.                                                 |
| W-13 | Zielkonflikt Motivation (Red Team 3.2): Der Rundenabschluss zeigt zusätzlich die **Übungsmenge des Tages** („Heute 40 Wörter geübt“), abgeleitet aus den gespeicherten Runden des lokalen Tages.                                          |

### Mathematik

| Nr. | Regel                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 | C-013: Kinder sehen vor der Runde **keine Lösungen**. Die Vorschau zeigt nur Art und Anzahl der Aufgaben, die Runde mischt die Reihenfolge. „Neu würfeln“ und Vorschau mit Lösung bleiben nur im Lehrermodus.           |
| M-2 | G-008: exakter Dezimalvergleich. Tausenderpunkt und -leerzeichen in gültigen Dreiergruppen werden entfernt, „,“ wird Dezimaltrenner, „−“ wird „-“. `0,001` für `0,01` ist falsch; `1.000` und `1 000` für 1000 richtig. |
| M-3 | G-009: Im Lückenmodus entsteht keine Lücke, deren Wert durch eine Null nicht eindeutig ist (Generator zieht neu). Jede erzeugte Lückenaufgabe hat genau eine Lösung.                                                    |

### Vokabelimport

| Nr. | Regel                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V-1 | Schülerinnen und Schüler tippen Vokabeln in **Zeilen mit zwei Feldern** (Vorderseite, Rückseite) und optionalem Tag – wie der Lehrer-Editor. „Weitere Zeile“ fügt eine Zeile an; Enter im letzten Feld springt in die nächste Zeile.                     |
| V-2 | Datei- und Einfügeimport bleibt und nutzt **einen gemeinsamen Parser** für Schüler und Lehrkraft (Tab oder Semikolon, Alternativen mit `\|`, dritte Spalte Tag).                                                                                         |
| V-3 | Beide Importe haben eine kurze **Anleitung** (Aufbau einer Zeile, Beispiel, Excel/Sheets-Hinweis) und eine **Vorlage** zum Herunterladen (`vokabeln-vorlage.csv`, UTF-8 mit BOM, Semikolon, Kopfzeile `Vorderseite;Rückseite;Tag`, drei Beispielzeilen). |
| V-4 | Vor dem Übernehmen zeigt der Import eine **Vorschau** der erkannten Paare und nennt übersprungene Zeilen mit Grund. Die Kopfzeile der Vorlage wird erkannt und nicht als Vokabel übernommen.                                                             |

### Datensicherung und Speicher

| Nr. | Regel                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1 | K1/A-001: Gespeicherte Daten werden **tolerant gelesen**: unbekannte Zusatzfelder werden beim Lesen entfernt, ungültige Datensätze kommen in Quarantäne (nicht gelöscht) und werden mit einem Hinweis gezählt. Geschrieben wird weiter streng. |
| S-2 | B-001: Die Sicherung enthält LernBox-Ordner (`learningBoxFolders`, `folderId`). Ältere Sicherungen ohne Ordner bleiben lesbar. Verwaiste `folderId` werden beim Einspielen entfernt.                                                           |
| S-3 | Ein **Strukturtest** scheitert, sobald eine Dexie-Tabelle oder ein Feld weder im Sicherungsschema steht noch ausdrücklich ausgenommen ist.                                                                                                     |
| S-4 | B-002: Vor dem ersten Lernen auf iPad/iPhone im Browser (nicht installiert) erscheint die Empfehlung, die App zuerst zum Home-Bildschirm hinzuzufügen, mit Hinweis auf den getrennten Speicher.                                                |
| S-5 | B-002: Auf einem Gerät ohne Lernstand bietet die Lernen-Startseite gut sichtbar „Ich habe schon gelernt – Sicherung einspielen“ an.                                                                                                            |
| S-6 | Eine fehlgeschlagene Sicherung nennt den Grund und einen nächsten Schritt statt nur „konnte nicht erstellt werden“.                                                                                                                            |

## Pakete (parallel umsetzbar)

| Paket | Inhalt             | Hauptdateien                                                                                                                                                                                                  |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | S-1, S-2, S-3, S-6 | `src/storage/personal-learning-events.ts` (nur Lesepfade), `src/storage/daily-plan.ts`, `src/storage/personal-backup.ts`, `src/domain/personal-backup.ts`                                                     |
| 2     | W-1 bis W-13       | `src/domain/learning-word-progress.ts`, `src/domain/word-round.ts`, `recordAttempt` in `personal-learning-events.ts`, `app/components/learning-word-app.tsx`, `app/views/wortspeicher/*`                      |
| 3     | M-1 bis M-3        | `src/domain/mental-math.ts`, `src/domain/math-practice.ts`, `app/frei/mathematics/mental-math-app.tsx`                                                                                                        |
| 4     | V-1 bis V-4        | `app/views/lernbox/parts/import-sheet.tsx`, `src/domain/learning-box.ts` (`parseLearningBoxImport`), `src/domain/running-dictation.ts` (`parseVocabularyTable`), `app/views/laufdiktat/vocabulary-editor.tsx` |
| 5     | S-4, S-5           | Lernen-Startseite (`app/views/lernen`, `app/views/start`), `app/landing/install-button.tsx`                                                                                                                   |

Paket 1 und 2 berühren dieselbe Datei an verschiedenen Stellen: Paket 1 ändert nur
Lesepfade, Paket 2 nur `createLearningWordProgressRepository().recordAttempt`.

### Prüfungen je Paket

- Während der Umsetzung: gezielte Unit-Tests (`npx vitest run <Dateien>`),
  `npm run lint`, `npm run typecheck`, `npm run format:check`.
- Browser-Tests werden **gebündelt** nach dem Zusammenführen aller Pakete in einem
  Lauf ausgeführt (`npm run build`, danach die betroffenen Playwright-Spezifikationen
  mit `--project=desktop-chromium --project=mobile-chrome`). Pakete passen
  bestehende E2E-Spezifikationen an und ergänzen neue, führen sie aber nicht selbst aus.
- Die vollständige Cross-Browser-Suite bleibt in GitHub verpflichtend.

## Welle 2 (nach Welle 1, braucht K1)

- **Schonfristen und Rückstufung nach Zeit**, Kennzeichnung „gefährdet“ bzw. „lange
  nicht geübt“. Offen: Gilt die Schonfrist in Box 1? Ferien aussetzen oder auf eine
  Rückstufung begrenzen?
- **Lernarchiv (Box 6):** Bedingung „fällige Wiederholung in Box 5 auf Anhieb richtig,
  freier Abruf, ohne Hilfe“; gelegentlich ein Archivwort in der Tagesportion; Bonus
  höchstens alle 30 Tage (Entscheidung 39). Formatänderung der Boxliste.
- **Gastmodus** für geteilte Geräte: signierter, zeitlich begrenzter Lehrer-QR
  (90 Minuten), Bestätigung auf Geräten mit Lernstand, Löschumfang ohne
  Lehrerdatenbank, Link zum Lehrerbereich im Gastmodus ausgeblendet, eigene E2E-Tests.
- **Mathe-Hinweise zu Fehlern** (D-008) statt nur „Noch nicht“.
- **Erster Versuch überall:** Selbsteinschätzung der LernBox (D-010) und Textbox.
- **Fehlbewertungen** G-002, G-003, G-012 (Voraussetzung für das Kompetenzprofil).
- **Diagnostik:** Eingangstest als Startpunkt ohne Etikett, Kompetenzprofil auf einem
  gemeinsamen Wiederholungskern (Audit M1), Tagestrainings 10/20 Minuten,
  Zeitmessung pausiert bei Inaktivität und im Hintergrund, ohne Arbeit zu verwerfen.
