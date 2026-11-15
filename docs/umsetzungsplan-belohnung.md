# Umsetzungsplan: Belohnung beim eigenen Üben

Stand: 15.11.2026. Geprüft am Code des Zweigs `claude/bauplaene` (Stand
`80aacfe`) und am Diff von PR #57. Der Plan enthält keinen Produktionscode
und ist für eine Umsetzung ohne Vorwissen geschrieben. Quellen: Roadmap
Etappe 1 (`obsidian-export/Lernplattform/25 - Vision/Roadmap.md`, Zeile
„Belohnung beim eigenen Üben“), Bericht 24 (`docs/vision/24-motivation-live-raum.md`,
M24-10, M24-11), Bericht 31 (`docs/vision/31-inklusion.md`, I31-4, O6) und
Vault 23 (`obsidian-export/Lernplattform/23 - Ramagotchi und nachhaltige Gamification/Anwendung.md`).

## 1. Ziel und Abgrenzung

Ein Kind, das allein übt, bekommt in jedem Übungsbereich dieselbe Art von
Rückmeldung: bis zu drei Sterne je Runde mit fester Bedeutung, ein
Wochenziel „an X von 5 Schultagen“ und Anzeigen, die nach oben zählen.
Grundlage ist ein **lokaler Übungszähler**: eine Zeile je abgeschlossener
Runde, in allen Bereichen gleich aufgebaut. Der Entwickler hat Sterne für
Zuordnen und Test am 15.11.2026 abgelehnt, „weil noch kein Zähler zum
Auswerten vorhanden ist“; diesen Zähler liefert der Plan zuerst.

Bereiche: Wortspeicher, LernBox (Schreiben, Mündlich, Zuordnen, Test bzw.
gemischte Fragearten), Kopfrechnen, Textbox, Laufdiktat allein.

Nicht Teil dieses Plans:

- Ranglisten, Vergleiche zwischen Kindern, Häuser, Serie, Abzeichen, Duell
  (Bereiche `motivation` und `duell` bleiben `aus`).
- Jede Übertragung: Der Zähler steht nicht im Leistungsbrief, nicht im
  Abgabenachweis, nicht im Live-Raum und nicht auf einem Server.
- Ramagotchi, Stufen, kosmetische Gegenstände (Vault 23, Stufe 2 und 3).
- Sterne im Live-Raum. Dort bleibt alles, wie es ist.
- Änderungen an Box, Fälligkeit, Lernereignissen oder Tagesportion. Die
  Belohnung liest nur.
- „Erledigt aus gezählten Runden“ für Aufträge (Entscheidung 62). Der Zähler
  ist dafür später brauchbar, wird hier aber nicht angebunden.
- Uhr, Dauer, Tempo. Der Zähler speichert keine Dauer.

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 15.11.2026: `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`
und `Entscheidungsindex.md` (Einträge 1 bis 76 auf diesem Zweig), gesucht
nach Stern, Belohnung, Punkte, Serie, Abzeichen, Rangliste, Haus, Motivation,
Wochenziel, „Zurückgenommen“ und „Nicht wieder einbauen“.

| Entscheidung                                                        | Inhalt                                                                                                                                  | Folge für diesen Plan                                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 (Local-first)                                                     | Lernstand bleibt auf dem Gerät.                                                                                                         | Der Zähler ist eine lokale Tabelle. Nichts davon wird gesendet (BL-8).                                                                                                                  |
| 7 (Klassenranking lokal), 10 („Bewusst nicht übernommen“)           | Keine öffentliche Rangliste aller Schüler nach absoluter Leistung. Häuser sind gebaut und aus.                                          | Kein Vergleich, keine Summe für andere sichtbar, kein Beitrag an ein Haus.                                                                                                              |
| 20, 57 (Leitner aus Ereignissen)                                    | Der Kartenstand ergibt sich aus Lernereignissen.                                                                                        | Eine Zählerzeile ist kein Lernereignis und ändert keinen Lernstand (BL-11).                                                                                                             |
| 23, 64 (Selbsteinschätzung)                                         | Mündlich hebt höchstens bis Box 3. „Nicht wieder einbauen: ‚sicher‘ aus Selbsteinschätzung, in keinem Fach.“                            | Mündliche Runden bekommen den Stern „Aus dem Kopf“ nicht (BL-2).                                                                                                                        |
| 37 mit D-012, 66 (Battle)                                           | Tempo-Punkte sind als Mangel vermerkt. „Nicht wieder einbauen: Ladung, die Schnelligkeit belohnt.“                                      | Kein Stern hängt an Zeit. Der Zähler kennt keine Dauer (BL-9).                                                                                                                          |
| 39 (Ramagotchi erst nach stabilem Lernkern)                         | Belohnung nur aus sinnvollen Lernsignalen; kein Verlust; verzeihende Ziele; abschaltbar; vor breiter Einführung mit Schülern erproben.  | Sterne gehen nie verloren (BL-7). Wochenziel ohne „verpasst“ (WZ-4). Eigener Bereich `belohnung`, Stufe `vorschau`, dazu ein Schalter am Gerät (Abschnitt 7).                           |
| 47 (Freigaberegister, Motivation aus)                               | Serie, Abzeichen und Häuser liegen hinter `motivation` und sind aus.                                                                    | Der Plan schaltet `motivation` nicht ein und baut keine Serie. `countStreak` bleibt hinter dem Schalter.                                                                                |
| 56 (Textbox, Bestwert)                                              | Prozent und Bestwert werden ruhig gezeigt.                                                                                              | Bleibt. Die Sterne treten daneben, sie ersetzen den Bestwert nicht.                                                                                                                     |
| 62 („Erledigt“ aus gezählten Runden)                                | Geplant; braucht gezählte Runden.                                                                                                       | Der Zähler ist so gebaut, dass 62 ihn später lesen kann (`area`, `contentId`, `day`). Keine Anbindung in diesem Plan.                                                                   |
| 70 (Klassentempo ohne Rangliste)                                    | Offen, nur für die ganze Klasse.                                                                                                        | Nicht berührt.                                                                                                                                                                          |
| 73 („Mein Stand“)                                                   | Name der Profilseite.                                                                                                                   | Der Rückblick (Abschnitt 5.5) verlinkt auf „Mein Stand“.                                                                                                                                |
| Antwort vom 15.11.2026, Nr. 3 („vorerst keine Sterne“)              | Sterne für Zuordnen und Test abgelehnt, solange kein Zähler da ist.                                                                     | Kein Widerspruch, aber eine Bedingung: Sterne für diese Formen erst, wenn der Zähler gebaut ist und der Entwickler Frage 1 bestätigt. Zuordnen bekommt höchstens einen Stern (BL-4).    |
| Befund D-012, Schalter „Sterne am Ende zeigen“ im Laufdiktat allein | Fünf Sterne nach Fehlerquote (`computeRunningDictationStars`), abschaltbar je Gerät (`app/frei/german/laufdiktat/stars-preference.ts`). | **Änderung eines bestehenden Verhaltens:** Die fünf Sterne nach Fehlerquote würden durch die drei einheitlichen ersetzt. Frage 2. Bei „Ja“ kommt ein Eintrag mit „Zurückgenommen“ dazu. |

Ergebnis: **Kein Widerspruch zu einer gültigen Entscheidung und keine
Rücknahme, die diesem Plan entgegensteht.** Zwei Punkte brauchen vor dem Bau
die Bestätigung des Entwicklers (Fragen 1 und 2). Nach der Bestätigung
bekommt das Protokoll eine neue Entscheidung mit den Regeln BL, WZ und AZ;
die nächste freie Nummer beim Eintragen prüfen (der Zweig von PR #57 nennt im
Code schon 78 und 79).

## 3. Regeln

### 3.1 Sterne je Runde (BL)

Jede abgeschlossene Runde kann bis zu drei Sterne bringen. Jeder Stern hat
einen Namen, den das Kind liest; es gibt keine Punktzahl dahinter.

| Nr.   | Regel                                                                                                                                                                                                                                                                                                  | Begründung                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| BL-1  | **Stern „Geübt“:** Die Runde wurde bis zum Ende bearbeitet und hatte mindestens 5 Aufgaben (hat der Inhalt weniger, dann alle). Richtig oder falsch spielt keine Rolle.                                                                                                                                | Belohnt das Üben selbst. Ein schwaches Kind bekommt ihn in jeder Runde.                                                       |
| BL-2  | **Stern „Aus dem Kopf“:** Mindestens 3 Aufgaben der Runde wurden als freier Abruf beantwortet: geschrieben, ohne sichtbare Vorlage, ohne Hilfe, im ersten Versuch richtig. Selbsteinschätzung (Mündlich), Auswahl, Zuordnen, Abschreiben und Lücken mit Vorlage zählen nicht.                          | Freier Abruf ist die wirksame Lernhandlung (Entscheidung 23). Die Schwelle ist absolut und niedrig, kein Prozentwert.         |
| BL-3  | **Stern „Dran geblieben“:** Mindestens 3 Aufgaben, die heute dran waren, wurden so beantwortet, dass sie für den Lernstand zählen, davon mindestens eine richtig. **Oder** mindestens ein früherer Fehler wurde heute im ersten Versuch richtig abgerufen.                                             | Bindet die Belohnung an das, was die Wiederholungslogik heute verlangt, und an Verbesserung (Vault 23, „Verbesserungsbonus“). |
| BL-4  | **Welche Form welchen Stern geben kann,** steht in Tabelle 3.2. Wiedererkennen (Zuordnen, Auswahl) gibt höchstens „Geübt“.                                                                                                                                                                             | Es darf sich nicht lohnen, nur leichte Lernformen zu wählen.                                                                  |
| BL-5  | **„Geübt“ und „Aus dem Kopf“ gibt es je Inhalt und Tag einmal.** Inhalt ist der Stapel, die Wortbox, der Text, das Diktat oder die Rechenart mit Zahlenraum (`contentId`). „Dran geblieben“ ist nicht begrenzt; es begrenzt sich selbst, weil eine beantwortete fällige Aufgabe nicht mehr fällig ist. | Vault 23: „Sehr leichte Aufgabe wiederholt: geringe oder keine Zusatzbelohnung“.                                              |
| BL-6  | **Höchstens 9 Sterne je Tag zählen.** Weitere Runden werden gezählt und zeigen ihre Sterne grau mit dem Satz „Für heute hast du alle Sterne gesammelt. Dein Üben zählt trotzdem.“                                                                                                                      | Vault 23: Erfahrung je Zeitraum gedeckelt; lange Sitzungen bringen nicht mehr.                                                |
| BL-7  | **Sterne gehen nie verloren.** Kein Abzug für Fehler, Abbruch, Pause oder eine spätere Rückstufung der Karte. Eine abgebrochene Runde bringt keinen Stern und keine Meldung.                                                                                                                           | Entscheidung 39.                                                                                                              |
| BL-8  | **Nur lokal.** Keine Zeile, keine Summe und kein Wochenziel verlässt das Gerät, außer in der persönlichen Sicherung des Kindes.                                                                                                                                                                        | Entscheidungen 2 und 10.                                                                                                      |
| BL-9  | **Keine Zeit.** Der Zähler speichert weder Dauer noch Antwortzeiten. Kein Stern hängt an Tempo.                                                                                                                                                                                                        | Entscheidungen 37 (D-012) und 66.                                                                                             |
| BL-10 | **Früherer Fehler** heißt: Das letzte Lernereignis dieses Lernobjekts vor Rundenbeginn war falsch und liegt an einem früheren lokalen Tag. Ein Fehler von heute zählt nicht.                                                                                                                           | Verhindert, absichtlich falsch zu antworten und sich gleich danach zu „verbessern“.                                           |
| BL-11 | **Die Belohnung liest nur.** Sie ändert keine Karte, kein Lernereignis, keine Tagesportion. Scheitert das Schreiben der Zählerzeile, endet die Runde normal und zeigt keine Sterne.                                                                                                                    | Entscheidungen 20 und 57; Lernstand, Leistungswertung und Belohnung bleiben getrennte Größen (Vault 23).                      |
| BL-12 | **Jede Runde zählt genau einmal.** Die Zeile trägt die Kennung der Runde; ein zweites Schreiben derselben Kennung ändert nichts.                                                                                                                                                                       | Kein doppeltes Zählen bei doppeltem Klick, Neuladen oder „Weitermachen“.                                                      |
| BL-13 | **Abschaltbar:** Bereich `belohnung` im Freigaberegister und ein Schalter am Gerät „Sterne zeigen“. Ohne Sterne sieht das Kind nur seine Zahlen („14 richtig“).                                                                                                                                        | Entscheidung 39; Bericht 31, I31-4.                                                                                           |

### 3.2 Was jede Lernform geben kann

| Bereich und Form                                          | Geübt | Aus dem Kopf                                        | Dran geblieben                                                 | Höchstens |
| --------------------------------------------------------- | ----- | --------------------------------------------------- | -------------------------------------------------------------- | --------- |
| LernBox, Schreiben (Stapel, „Heute dran“, „Meine Fehler“) | ja    | ja                                                  | ja                                                             | 3         |
| LernBox, Mündlich                                         | ja    | nein (Selbsteinschätzung)                           | ja, soweit die Antwort ein Lernereignis erzeugt                | 2         |
| LernBox, „Box üben (nur üben)“ und „Fehler aus dem Test“  | ja    | ja, wenn geschrieben                                | nein (nichts zählt für den Lernstand)                          | 2         |
| LernBox, Zuordnen                                         | ja    | nein                                                | nein                                                           | 1         |
| LernBox, Test bzw. gemischte Runde                        | ja    | nur aus den Schreibfragen                           | nur aus Schreib- und mündlichen Fragen, die ein Ereignis haben | 3         |
| Wortspeicher, Stufe 1 bis 3 (Abschreiben, Lücken)         | ja    | nein (Vorlage oder Muster sichtbar)                 | ja, soweit der Wiederholungskern die Antwort wertet            | 2         |
| Wortspeicher, Stufe 4 bis 6                               | ja    | ja                                                  | ja                                                             | 3         |
| Kopfrechnen                                               | ja    | ja, ohne Lösungshilfe                               | ja (fällige Aufgaben und Tagesportion)                         | 3         |
| Textbox, je Durchgang                                     | ja    | ja (geschrieben wird nach dem Merken, ohne Vorlage) | nein (keine Fälligkeit je Wort)                                | 2         |
| Laufdiktat allein                                         | ja    | ja: Sätze ohne erneutes Hinsehen im ersten Versuch  | nein (Textrunden erzeugen kein Lernsignal, Befund D-011)       | 2         |

Folge: Der dritte Stern ist nur dort zu holen, wo die Wiederholungslogik
arbeitet. Wer nur Zuordnen spielt, bekommt je Stapel und Tag einen Stern; wer
seine fälligen Karten schreibt, bekommt drei.

### 3.3 Wochenziel (WZ)

| Nr.  | Regel                                                                                                                                           | Begründung                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| WZ-1 | **Übungstag** ist ein lokaler Tag mit mindestens einer Zählerzeile oder, für Tage vor dem Update, mindestens einem Lernereignis.                | Alte Wochen bleiben richtig, ohne Daten nachzutragen.       |
| WZ-2 | Die Woche läuft von Montag bis Sonntag. Angezeigt wird „X von 5 Schultagen“. Samstag und Sonntag zählen mit; mehr als 5 wird nicht angezeigt.   | M24-10. Wer am Freitag krank war, kann am Samstag aufholen. |
| WZ-3 | Das Ziel ist eine Zahl von 2 bis 5, Standard 3. Das Kind stellt sie in den Einstellungen selbst ein; die Änderung gilt sofort, auch nach unten. | Vault 23: persönliches, verzeihendes Wochenziel.            |
| WZ-4 | **Kein „verpasst“.** Vergangene Tage ohne Üben sehen aus wie kommende Tage. Es gibt keinen Text „nicht geübt“.                                  | M24-10.                                                     |
| WZ-5 | Ist das Ziel erreicht, steht dort „Wochenziel geschafft“. Es gibt dafür keinen Stern und keinen Ton.                                            | Das Ziel ist die Belohnung; keine zweite Währung.           |
| WZ-6 | Keine Serie über Wochen, keine Erinnerung, keine Meldung zu vergangenen Wochen. Gezählt wird nur nach oben: „4 Wochenziele geschafft“.          | Entscheidung 39; I31-4.                                     |

### 3.4 Anzeigen, die nach oben zählen (AZ)

| Nr.  | Stelle (am Code geprüft)                                                      | Heute                                                                                        | Neu                                                                                                             |
| ---- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| AZ-1 | `app/views/wortspeicher/overview-screen.tsx:169`                              | „{secure} / {total} sicher“                                                                  | „{secure} Wörter sicher“ (bei 1: „1 Wort sicher“; bei 0 entfällt die Zeile)                                     |
| AZ-2 | `app/views/wortspeicher/completion-screen.tsx:114`                            | „Wortbox: {mastered} von {total} Wörtern auf Stufe {stage} auf Anhieb richtig ({percent} %)“ | „{mastered} Wörter dieser Wortbox auf Stufe {stage} auf Anhieb richtig“, ohne Gesamtzahl und ohne Prozent       |
| AZ-3 | `app/views/lernen/home-screen.tsx:261`                                        | „{activeDays} von 7 Tagen“                                                                   | „{min(activeDays, 5)} von 5 Schultagen“, nach WZ-5 „Wochenziel geschafft“                                       |
| AZ-4 | `app/views/lernen/home-screen.tsx`, Zustand `missed` der Wochentage           | eigene Darstellung für verpasste Tage                                                        | wie `upcoming` (WZ-4)                                                                                           |
| AZ-5 | `app/views/lernbox/parts/study.tsx:253` (`boxFrom`, `boxTo`, `nextLabel`)     | „Box 4 → Box 1 · …“, auch nach unten                                                         | Bei einem Fehler nur „kommt morgen wieder“; der Aufstieg bleibt sichtbar. Keine Regeländerung (Bericht 31, O6). |
| AZ-6 | Laufdiktat allein, Ende der Runde (`running-dictation-app.tsx`, um Zeile 411) | fünf Sterne nach Fehlerquote                                                                 | „{n} richtig“ und die drei einheitlichen Sterne (Frage 2)                                                       |
| AZ-7 | Neu: Summen                                                                   | –                                                                                            | „{n} Sterne diese Woche“, „{n} Sterne gesammelt“                                                                |

Bleibt unverändert: der Fortschritt innerhalb einer Runde („Aufgabe 3 von 10“),
weil er eine kurze Strecke zeigt und kein Rückstand ist, und die Tagesportion
(`{due.done} / {due.total}`, höchstens 20, Entscheidung 57). Beim Bau mit
`grep -rn "/ {\|von {\|%" app/views --include=*.tsx` nach weiteren Stellen
suchen; jede Stelle, die einen Bestand gegen eine große Gesamtzahl stellt,
bekommt die Form von AZ-1.

## 4. Wie Belohnung und Leitner-Logik zusammenpassen

1. **Getrennte Größen.** Box und Fälligkeit entstehen weiter nur aus
   Lernereignissen. Die Zählerzeile entsteht danach, aus dem fertigen Ergebnis
   der Runde. Es gibt keinen Weg von einem Stern zu einer Box.
2. **Gleiche Richtung.** Der dritte Stern hängt an „dran“ und „zählt für den
   Lernstand“. Das ist genau die Bedingung, unter der die LernBox eine Karte
   bewegt (fällig, Schreiben oder Mündlich). Was Leitner will, bringt die
   meisten Sterne.
3. **Leichte Formen lohnen nicht.** Zuordnen und Auswahl erzeugen kein
   Lernereignis (LF-1, LF-3 bzw. FA-5) und deshalb nie „Dran geblieben“; sie
   sind kein freier Abruf und deshalb nie „Aus dem Kopf“. Es bleibt ein Stern
   je Stapel und Tag (BL-5).
4. **Ein Fehler kostet nichts.** Eine fällige Karte, die falsch geschrieben
   wird, geht auf Box 1 (K-4). Die Runde behält ihre Sterne; die Anzeige sagt
   „kommt morgen wieder“ (AZ-5). Morgen ist die Karte dran und kann als
   „früherer Fehler“ den dritten Stern bringen.
5. **Kein Vorteil durch Absicht.** Absichtlich falsch antworten bringt nichts:
   Der Fehler von heute zählt nicht als „früherer Fehler“ (BL-10), und eine
   richtige Antwort auf dieselbe fällige Karte hätte den Stern auch gebracht.
6. **Kein Üben vor dem Termin wird bestraft oder belohnt.** Eine Runde ohne
   fällige Karten kann „Geübt“ und „Aus dem Kopf“ bringen, aber nicht „Dran
   geblieben“. Das passt zu „kein Aufstieg vor Fälligkeit“.
7. **Deckel statt Dauer.** Neun Sterne sind mit drei vollen Runden erreicht.
   Mehr Zeit bringt nicht mehr Sterne, zählt aber für das Wochenziel.

## 5. Datenformat und tolerantes Lesen

### 5.1 Zählerzeile

Neue Tabelle `practiceRounds` in `PersonalLearningDatabase`
(`src/storage/personal-learning-events.ts`), neue Dexie-Version 9:
`practiceRounds: "id, day, area, finishedAt"`. Die anderen Tabellen bleiben
unverändert.

| Feld         | Typ                                  | Bedeutung                                                                                                   |
| ------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`         | Text, 1 bis 200 Zeichen              | Kennung der Runde (`roundId`, Kennung der Wortspeicher-Runde, Textbox: `sitzung:durchgang:versuch`).        |
| `rule`       | ganze Zahl ab 1                      | Fassung der Sternregeln beim Schreiben, zuerst 1.                                                           |
| `area`       | Text bis 40 Zeichen                  | `wortspeicher`, `lernbox`, `kopfrechnen`, `textbox`, `laufdiktat`. Bewusst kein festes Enum.                |
| `form`       | Text bis 40 Zeichen                  | z. B. `schreiben`, `muendlich`, `zuordnen`, `test`, `gemischt`, `stufe-4`, `durchgang-2`. Kein festes Enum. |
| `contentId`  | Text bis 200 Zeichen                 | Stapel, Wortbox, Text, Diktat oder Rechenart mit Zahlenraum; für BL-5.                                      |
| `day`        | `JJJJ-MM-TT`                         | Lokaler Tag beim Abschluss (`localDayKey` aus `src/domain/local-day.ts`), fest gespeichert.                 |
| `finishedAt` | ISO-Zeit                             | Zeitpunkt des Abschlusses. Kein Beginn, keine Dauer.                                                        |
| `items`      | ganze Zahl ≥ 0                       | bearbeitete Aufgaben.                                                                                       |
| `recall`     | ganze Zahl ≥ 0                       | freie Abrufe, im ersten Versuch richtig (BL-2).                                                             |
| `due`        | ganze Zahl ≥ 0                       | Aufgaben, die dran waren und für den Lernstand zählten.                                                     |
| `dueCorrect` | ganze Zahl ≥ 0                       | davon richtig.                                                                                              |
| `recovered`  | ganze Zahl ≥ 0                       | frühere Fehler, jetzt richtig (BL-10).                                                                      |
| `earned`     | `{ practiced, recall, kept }` (Wahr) | Welche Sterne die Runde nach BL-1 bis BL-5 verdient hat.                                                    |
| `counted`    | 0 bis 3                              | Wie viele davon nach BL-6 zählen. Summen addieren nur dieses Feld.                                          |

Die Zeile enthält keine Wörter, keine Antworten, keine Fehlerlisten und keine
Namen.

### 5.2 Tolerantes Lesen

- **Unbekannte Felder bleiben erhalten:** Das Schema ist nicht `strict`; es
  lässt zusätzliche Felder durch (`z.looseObject` bzw. `.passthrough()`), damit
  eine spätere Fassung Felder ergänzen kann und eine ältere sie beim Sichern
  nicht verliert.
- **Unbekannte Werte:** Eine Zeile mit unbekanntem `area` oder `form` zählt in
  den Summen mit und fehlt nur in der Aufteilung nach Bereich.
- **Höhere `rule`:** Die Zeile wird gelesen; `earned` und `counted` gelten, wie
  sie gespeichert sind. Sterne werden nie neu berechnet (BL-7).
- **Unlesbare Zeile:** wird übersprungen und nicht gelöscht; Vorgehen wie in
  `src/storage/unreadable-records.ts`. Summen und Wochenziel rechnen ohne sie.
- **Fehlende Tabelle oder leere Tabelle** (vor dem Update, nach dem Einspielen
  einer alten Sicherung): alle Summen 0; das Wochenziel nutzt die
  Lernereignisse (WZ-1).
- **Zahlen außerhalb des Bereichs** (`counted` 7, negative Werte): beim Lesen
  auf den gültigen Bereich begrenzen, nicht verwerfen.

### 5.3 Sicherung

`src/domain/personal-backup.ts`: `personalDataSchema` bekommt
`practiceRounds: z.array(practiceRoundSchema).max(100_000).default([])`, wie
`wordRounds`; die Liste der Tabellen in `personalBackupRecoveryRecordSchema`
bekommt `"practiceRounds"`. Alte Sicherungen bleiben lesbar (leere Liste).
`schemaVersion` bleibt. Eine neue Sicherung lässt sich mit älterer Software
nicht einspielen, weil `personalDataSchema` `strict` ist; das war bei
`textboxSessions` und `wordRounds` genauso und wird in der Versionsnotiz
genannt.

### 5.4 Einstellungen am Gerät

| Schlüssel im `localStorage` | Werte                   | Tolerantes Lesen                                                                                                                                            |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lernraum-sterne`           | fehlt = an, `"0"` = aus | Jeder andere Wert gilt als an. Fehlt der Schlüssel, gilt für das Laufdiktat weiter der alte Schlüssel `lernraum-laufdiktat-sterne`; er wird nicht gelöscht. |
| `lernraum-wochenziel`       | `"2"` bis `"5"`         | Fehlt oder ungültig: 3.                                                                                                                                     |

Beide Schlüssel kommen in die Liste von `src/storage/clear-student-data.ts`
(der Test `clear-student-data.test.ts` prüft die Liste). Die Tabelle wird dort
schon über `database.tables` geleert.

### 5.5 Rückblick „Das kannst du jetzt“ (M24-11)

Einmal je Woche zeigt die Fortschrittsseite, welche Teilbereiche aus „Mein
Stand“ seit Montag von „neu“ nach „im Aufbau“ oder nach „sicher“ gewandert
sind. Keine Zahl zum Rückstand. Beim Bau zuerst prüfen, ob
`buildCompetenceProfile` (`src/domain/competence-profile.ts:501`) einen
Stichtag annimmt; dann wird das Profil zweimal berechnet (Montag 0 Uhr und
jetzt) und nichts gespeichert. Nimmt es keinen Stichtag an, bleibt der
Rückblick aus diesem Plan heraus und wird ein eigener kleiner Schritt; ein
gespeicherter Wochen-Schnappschuss wäre ein zweites neues Format und lohnt
dafür nicht.

## 6. Abläufe und Darstellung

1. **Ende einer Runde.** Der Container des Bereichs ruft einmal
   `recordPracticeRound` mit den Zahlen der Runde. Die Ansicht bekommt
   `earned`, `counted` und den Satz zu BL-6. Unter dem bisherigen Ergebnis
   steht eine Zeile mit drei Sternen; verdiente sind gefüllt und benannt
   („Geübt“, „Aus dem Kopf“, „Dran geblieben“), nicht verdiente sind leer und
   nennen den Weg dorthin in einem Satz („Schreibe drei Antworten aus dem
   Kopf“). Kein Stern wird als „verloren“ gezeigt.
2. **Ohne Sterne** (Schalter aus oder Bereich nicht sichtbar): Die Zeile
   entfällt; das Ergebnis zeigt wie heute die Zahlen. Der Zähler schreibt
   weiter, solange der Bereich sichtbar ist, damit das Wochenziel stimmt.
3. **Startseite.** Im Feld „Diese Woche“: „X von 5 Schultagen“ bzw.
   „Wochenziel geschafft“ und darunter „{n} Sterne diese Woche“.
4. **Fortschrittsseite** (`/lernen/fortschritt`): „{n} Sterne gesammelt“,
   „{n} Wochenziele geschafft“, eine kleine Tabelle „Diese Woche“ mit Runden
   und Sternen je Bereich und Form. Diese Tabelle ist zugleich die Auswertung,
   die der Entwickler für die Erprobung braucht.
5. **Barrierefreiheit.** Sterne sind kein reines Bild: Jede Zeile hat einen
   Text („2 von 3 Sternen: Geübt, Aus dem Kopf“). Keine Animation, die sich
   nicht mit `prefers-reduced-motion` abschaltet; kein Ton. Farbe ist nie der
   einzige Unterschied zwischen verdient und offen.

## 7. Freigabestufe

Neuer Bereich `belohnung` in `src/domain/release.ts`, ohne eigene Route,
Stufe `vorschau`. Er schaltet das Schreiben des Zählers, die Sternzeile, das
Wochenziel und die Summen. Die Anzeigen AZ-1, AZ-2 und AZ-5 sind fachliche
Korrekturen ohne Schalter. `motivation` bleibt `aus`. Auf `frei` erst nach
einer Erprobung in der eigenen Klasse (Entscheidung 39) und auf Ansage.

## 8. Betroffene Dateien und Reihenfolge

Ein Schritt je Sitzung, nach jedem Schritt committen und pushen.

**Schritt 1: Fachlogik (rein, ohne Oberfläche)**

| Datei                                | Änderung                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/practice-reward.ts`      | Neu: `practiceRoundSchema`, `PRACTICE_REWARD_RULE = 1`, Grenzen als Konstanten (5, 3, 3, 9), `awardStars(round, sameDayRounds)` nach BL-1 bis BL-6, `formCapabilities(area, form)` nach Tabelle 3.2, `summarizeStars(rounds, now)`, `weekGoal(rounds, eventDays, goal, now)`. |
| `src/domain/practice-reward.test.ts` | Neu: Tabellentests (Abschnitt 9).                                                                                                                                                                                                                                             |

**Schritt 2: Speicherung**

| Datei                                                         | Änderung                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/storage/personal-learning-events.ts`                     | Version 9 mit `practiceRounds`.                                                                                                                                                                                                                                       |
| `src/storage/practice-rounds.ts`                              | Neu: `createPracticeRoundRepository(database)` mit `record(input)` (eine Transaktion: vorhandene Kennung zurückgeben, sonst Zeilen des Tages lesen, `awardStars`, `put`), `listSince(day)`, `earlierMistakes(ids, day)` nach BL-10 über den Index `learningObjectId`. |
| `src/domain/personal-backup.ts` und Speicherung der Sicherung | Abschnitt 5.3; Export und Einspielen der neuen Tabelle.                                                                                                                                                                                                               |
| `src/storage/clear-student-data.ts` mit Test                  | Die zwei Schlüssel aus 5.4.                                                                                                                                                                                                                                           |

**Schritt 3: Freigabe und gemeinsame Ansicht**

| Datei                                | Änderung                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `src/domain/release.ts`, `README.md` | Bereich `belohnung`; die erzeugte Tabelle der Standardstufen neu erzeugen.                 |
| `app/ui/round-stars.tsx` mit Test    | Neu: reine Ansicht der Sternzeile (Abschnitt 6, Punkt 1 und 5).                            |
| `app/ui/use-stars-preference.ts`     | Neu: Schalter nach 5.4; `app/frei/german/laufdiktat/stars-preference.ts` liest ihn zuerst. |
| `app/lernen/einstellungen/`          | Schalter „Sterne zeigen“ und Wahl des Wochenziels.                                         |

**Schritt 4: Wortspeicher und Kopfrechnen anbinden**

`app/components/learning-word-app.tsx` mit `app/views/wortspeicher/completion-screen.tsx`;
`app/frei/mathematics/mental-math-app.tsx`. Je Bereich zuerst am Code klären,
woher `due` und `recovered` kommen (welches `learningObjectId` die Ereignisse
tragen), und das im Commit nennen.

**Schritt 5: Textbox und Laufdiktat allein**

`app/components/textbox-app.tsx` mit `app/views/textbox/completion-screen.tsx`;
`app/frei/german/laufdiktat/running-dictation-app.tsx` (AZ-6, nur nach Antwort
auf Frage 2).

**Schritt 6: LernBox**

`app/components/learning-box-app.tsx`, `app/components/learning-box-forms.ts`,
`app/views/lernbox/parts/study.tsx`, `match.tsx`, `test.tsx`, dazu AZ-5.
**Erst nach dem Plan „LernBox: Fragearten“**, weil er Runde und Test umbaut;
sonst wird zweimal angebunden.

**Schritt 7: Wochenziel und Startseite**

`app/lernen/dashboard-data.ts` (`weekStates` ohne `missed`),
`app/lernen/use-learner-dashboard.ts`, `app/lernen/learner-home.tsx`,
`app/views/lernen/home-screen.tsx` (AZ-3, AZ-4, AZ-7). Die Design-Referenzen
der Startseite erneuern (`docs/design/README.md`).

**Schritt 8: Anzeigen im Wortspeicher** (AZ-1, AZ-2) und die Suche nach
weiteren Stellen.

**Schritt 9: Fortschrittsseite** (Abschnitt 6, Punkt 4) und, wenn möglich,
der Rückblick (5.5).

**Schritt 10: Doku.** `docs/inhalte/` je Bereich ein Absatz; dieser Plan
bekommt den Abschnitt „Umgesetzt“.

**Schritt 11: nach der Bestätigung (nicht vorher).** Neue Entscheidung im
Protokoll mit BL, WZ und AZ; bei „Ja“ zu Frage 2 mit „Zurückgenommen“ (fünf
Sterne nach Fehlerquote im Laufdiktat allein) und „Nicht wieder einbauen“
(Sterne nach Fehlerquote oder Tempo im eigenen Üben).

## 9. Testfälle

**`practice-reward.test.ts`**

1. Runde mit 5 Aufgaben, alle falsch: nur „Geübt“.
2. Runde mit 4 Aufgaben bei einem Inhalt mit 4: „Geübt“; bei einem Inhalt mit
   10: kein Stern.
3. Drei freie Abrufe richtig im ersten Versuch: „Aus dem Kopf“; zwei: nicht.
4. Mündliche Runde mit 10 richtigen Antworten: kein „Aus dem Kopf“.
5. Zuordnen, fehlerfrei: genau ein Stern; zweites Spiel desselben Stapels am
   selben Tag: kein Stern; am nächsten Tag wieder einer.
6. Drei fällige Aufgaben, eine richtig: „Dran geblieben“; drei fällige, keine
   richtig: nicht; eine Aufgabe mit früherem Fehler richtig: ja.
7. Fehler von heute, danach richtig: `recovered` bleibt 0 (BL-10).
8. Zehnter Stern des Tages: `earned` gesetzt, `counted` 0, Summe bleibt 9.
9. Tageswechsel um Mitternacht: `day` aus der lokalen Zeit; der Deckel gilt je
   `day`.
10. `summarizeStars`: Woche Montag bis Sonntag, Gesamtsumme, unbekanntes
    `area` zählt in der Summe.
11. `weekGoal`: 3 Tage bei Ziel 3 ist geschafft; Samstag zählt; 6 Übungstage
    zeigen 5; eine Woche ohne Üben liefert keinen Zustand „verpasst“.
12. `weekGoal` vor dem Update: Tage nur aus Lernereignissen.
13. Tolerantes Lesen: zusätzliches Feld bleibt erhalten; `rule: 2` wird
    gelesen; `counted: 7` wird 3; Zeile ohne `id` wird übersprungen.

**Speicherung (mit `fake-indexeddb`, wie `src/storage/*.test.ts`)**

14. `record` zweimal mit derselben Kennung: eine Zeile, Sterne unverändert.
15. Zwei `record` gleichzeitig am selben Tag: zusammen höchstens 9 gezählte
    Sterne (Transaktion).
16. Datenbank von Version 8 mit Daten öffnen: alle alten Tabellen unverändert,
    `practiceRounds` leer.
17. Sicherung ohne `practiceRounds` einspielen: gelingt, Zähler leer.
    Sicherung mit `practiceRounds` exportieren und einspielen: gleiche Zeilen.
18. „Alle Daten löschen“ leert Tabelle und beide Schlüssel.
19. `record` wirft: Die aufrufende Runde endet trotzdem (je Bereich ein Test).

**Ansichten und Bereiche**

20. `round-stars`: Text für 0, 1, 2, 3 Sterne; ohne Farbe unterscheidbar;
    axe ohne Befund.
21. Je Bereich: Die Sternzeile fehlt, wenn `belohnung` nicht sichtbar oder der
    Schalter aus ist; das bisherige Ergebnis steht unverändert da.
22. LernBox: Eine Runde ändert Karten und Lernereignisse mit und ohne
    `belohnung` genau gleich (gleiche Karten, gleiche Ereignisse).
23. Startseite: „2 von 5 Schultagen“; kein Element mit dem Zustand `missed`.
24. Wortspeicher-Übersicht: „12 Wörter sicher“, kein „/“.
25. Ein Browser-Test (`e2e/belohnung.spec.ts`, Import aus `./fixtures`): eine
    Wortspeicher-Runde auf Stufe 4 zeigt drei benannte Sterne; nach Neuladen
    steht die Summe auf der Startseite.

## 10. Prüfbefehle

```
npx vitest run src/domain/practice-reward.test.ts src/storage
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/belohnung.spec.ts
npx prettier --check docs/umsetzungsplan-belohnung.md
```

Nach
Schritt 7 zusätzlich `npm run test:design` im Vergleich zum Ausgangsstand
(`AGENTS.md`).

## 11. Fallstricke und was nicht passieren darf

- **Kein Schreibzugriff auf den Lernstand.** `practice-rounds.ts` schreibt nur
  in `practiceRounds`. Test 22 hält das fest.
- **Kein Stern aus Zeit.** Kein Feld für Dauer, auch nicht „für später“.
- **Dexie-Version.** Ein Gerät, auf dem noch ein Tab mit der alten App offen
  ist, kann eine Datenbank der Version 9 nicht öffnen. Vor dem Bau nachsehen,
  wie die Sprünge auf Version 7 und 8 das gelöst haben (Update-Hinweis,
  `versionchange`), und es genauso machen.
- **Sicherung.** `personalDataSchema` ist `strict`: Das neue Feld muss im
  selben Schritt in Schema, Export, Einspielen und Wiederherstellungsliste
  stehen, sonst scheitert die Sicherung als Ganzes.
- **Doppelte Meldung.** Jeder Bereich hat genau eine Stelle, an der eine Runde
  endet. `record` nicht aus einem Effekt aufrufen, der bei jedem Rendern
  läuft; die Kennung schützt zusätzlich (BL-12).
- **„Weitermachen“.** Eine fortgesetzte Runde behält ihre Kennung
  (`roundSnapshot`). Die Zahlen der Runde müssen über die Unterbrechung
  stimmen; fehlt eine Zahl im Zwischenstand, lieber `recall` und `due` zu
  niedrig zählen als zu hoch. Kein neues Feld im Zwischenstand ohne
  tolerantes Lesen.
- **Test und Code widersprechen sich:** nicht den Test anpassen, sondern
  nachfragen (`AGENTS.md`). Das gilt besonders für Tests, die heute „von 7
  Tagen“ oder fünf Sterne im Laufdiktat erwarten: Das sind Folgen der Fragen
  2 und 4, keine Fehler.
- **Tagesportion.** Die Tagesportion wird aus Lernereignissen berechnet. Die
  Zählerzeile darf dort nicht mitzählen.
- **Gastmodus.** Auf Gastgeräten werden Schülerdaten gelöscht; der Zähler
  gehört dazu (Liste in `clear-student-data.ts`).
- **Leistungsbrief.** `practiceRounds` taucht in keinem Brief, Nachweis oder
  QR-Code auf. Beim Review gezielt nach Importen von `practice-rounds`
  außerhalb von `app/lernen`, `app/frei`, `app/components` und `app/ui`
  suchen.
- **Sprache.** Keine Wörter wie „verpasst“, „nur“, „leider“, „noch nicht“ in
  der Sternzeile. Die Prüfung `src/domain/child-glossary.ts` gilt auch hier.
- **Design-Referenzen.** Startseite und Abschlussbildschirme haben
  Referenzbilder. Jede sichtbare Änderung dort braucht neue Referenzen im
  selben Schritt.

## 12. Fragen an den Entwickler

| Nr. | Frage                                                                                                                                                                         | Empfehlung                                                                                                              | Alternative                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| B-1 | **Drei Sterne mit fester Bedeutung („Geübt“, „Aus dem Kopf“, „Dran geblieben“) statt Sterne nach Fehlerquote. Zuordnen und Auswahl bekommen höchstens einen. Einverstanden?** | Ja. So lohnt sich die leichte Form nicht, und ein schwaches Kind bekommt trotzdem in jeder Runde einen Stern.           | Sterne nach Anteil richtiger Antworten. Einfacher zu erklären, belohnt aber Können statt Üben und benachteiligt Schwache. |
| B-2 | **Dürfen die fünf Sterne nach Fehlerquote im Laufdiktat allein durch die drei einheitlichen ersetzt werden?**                                                                 | Ja, nur im eigenen Üben; im Live-Raum bleibt alles. Eintrag mit „Zurückgenommen“ im Protokoll.                          | Laufdiktat behält seine fünf Sterne und bekommt keine einheitlichen. Dann ist die Belohnung nicht einheitlich.            |
| B-3 | **Wochenziel: Standard 3 von 5, vom Kind zwischen 2 und 5 wählbar?**                                                                                                          | Ja. Drei Tage sind auch nach einer kranken Woche erreichbar.                                                            | Fest 5 von 5, oder die Lehrkraft legt es fest (bräuchte einen neuen Weg zum Gerät des Kindes).                            |
| B-4 | Zählen Samstag und Sonntag für „X von 5 Schultagen“?                                                                                                                          | Ja, als Ausgleich, höchstens 5.                                                                                         | Nur Montag bis Freitag.                                                                                                   |
| B-5 | Höchstens 9 gezählte Sterne je Tag?                                                                                                                                           | Ja; im Unterricht beobachten, ob Kinder den Deckel erreichen.                                                           | Kein Deckel (BL-5 begrenzt schon), oder 6.                                                                                |
| B-6 | Soll der Zähler schon schreiben, wenn `belohnung` auf `vorschau` steht und das Kind nichts davon sieht?                                                                       | Nein. Geschrieben wird nur, wo der Bereich sichtbar ist. So trifft ein Fehler im Zähler zuerst nur Geräte mit Vorschau. | Immer schreiben; dann gibt es zum Start der Freigabe schon Daten.                                                         |
| B-7 | Gehört der Rückblick „Das kannst du jetzt“ (M24-11) in diesen Plan?                                                                                                           | Nur, wenn er sich ohne neues gespeichertes Format berechnen lässt (5.5). Sonst eigener Schritt.                         | Mit Wochen-Schnappschuss sofort bauen.                                                                                    |
| B-8 | Soll die Rückstufung nach einem Fehler für das Kind nur noch „kommt morgen wieder“ heißen (AZ-5)?                                                                             | Ja; die Regel selbst bleibt (Bericht 31, O6).                                                                           | Boxwechsel weiter zeigen.                                                                                                 |
| B-9 | Reicht die Tabelle auf der Fortschrittsseite als Auswertung für die Erprobung?                                                                                                | Ja. Sie zeigt je Bereich und Form Runden und Sterne der Woche, nur auf dem Gerät des Kindes.                            | Eine eigene Ansicht unter `/entwicklung`.                                                                                 |

## 13. Umgesetzt

Noch nichts. Dieser Abschnitt bekommt nach jedem Schritt Datum, Abweichungen
und offene Punkte.
