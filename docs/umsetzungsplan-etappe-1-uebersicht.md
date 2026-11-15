# Etappe 1: Übersicht über vier Baupläne

Stand: 15.11.2026. Alle vier Pläne sind am Code des Standes `b79f61e` geprüft
und für eine Umsetzung ohne Vorwissen geschrieben. Sie enthalten keinen
Produktionscode. Lernraum hat keine festen Termine (Antwort des Entwicklers
vom 15.11.2026); die Reihenfolge unten ist eine Empfehlung, kein Zeitplan.

## 1. Die Pläne

| Nr. | Plan                                                                                                       | In einem Satz                                                                                                                                                                  | Sichtbar für            |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| 1   | [LernBox: Fragearten](umsetzungsplan-lernbox-fragearten.md)                                                | Eine Runde mischt Schreiben, Mündlich und Auswahl Karte für Karte, jede mit ihrer Box-Regel; der „Test“ geht darin auf, Zuordnen bekommt zwei Spalten.                         | Kinder                  |
| 2   | [Schnell erstellen und sofort live](umsetzungsplan-schnell-erstellen-live.md)                              | Drei kurze Einstiege auf der Lehrer-Startseite (Liste einfügen, aus einer Wortbox, Kopfrechnen live) führen ohne Assistenten in die Lobby, ohne Änderung an Server und Tokens. | Lehrkraft               |
| 3   | [Kopfrechnen mit Hürde](umsetzungsplan-kopfrechnen-huerde.md)                                              | Jede Runde hat mindestens zur Hälfte Aufgaben mit Übergang und kaum triviale; Fehlerarten stimmen, die Nachübung trifft den Fehler, „sicher“ gilt erst über den Zehner.        | Kinder, Lehrkraft (CSV) |
| 4   | [Kernwörter](umsetzungsplan-kernwoerter.md) mit [Muster](inhalte/kernwoerter-muster-auslautverhaertung.md) | Ein Schema für ausgezeichnete Rechtschreibwörter, das über `wordKey` zum Wortspeicher passt, und 30 ungeprüfte Musterwörter zur Auslautverhärtung.                             | noch niemand            |

## 2. Wichtigster Befund je Plan

| Plan | Befund                                                                                                                                                                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Der Test hat **keinen gespeicherten Zwischenstand**, der abgelöst werden müsste. Die Mischung wird eine Eigenschaft der normalen Runde. Auswahl gibt es **nicht** in „Heute dran“ und „Meine Fehler“, weil eine Auswahlfrage kein Lernereignis erzeugt und die Tagesportion nie fertig würde. |
| 2    | Ablage und Start-Absicht können fast alles schon. Es fehlen nur Einstiege. Der Plan kommt **ohne Supabase-Änderung** aus; die Start-Absicht trägt weiter nur Kennungen (Entscheidung 60). Eine Wortliste wird beim Kind eine Wortbox, kein LernBox-Stapel.                                    |
| 3    | „Zehnerübergang mindestens 50 %“ wird **je Runde garantiert**, nicht nur im Mittel. Der Schalter liegt bewusst außerhalb der gespeicherten Übungsoptionen, weil deren Schema streng ist. Familien können nach dem Update von „sicher“ auf „im Aufbau“ zurückfallen.                           |
| 4    | Kernwörter lassen sich **ohne jede Änderung an gespeicherten Daten** einbauen (Nachschlagen über `wordKey`, wie die Bedeutungshilfen). Offen ist, ob die Hörprobe beim Verlängern in bairischer Aussprache trägt; das ist dieselbe Frage wie beim „summenden“ s.                              |

## 3. Empfohlene Reihenfolge

| Rang | Plan                 | Warum an dieser Stelle                                                                                                                                                       |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Plan 3, Schritte 1–4 | Reine Fachlogik, keine neue Oberfläche, mit Tabellentests abgesichert. Verbessert sofort das freie Üben und jede Kopfrechen-Runde im Live-Raum.                              |
| 2    | Plan 2, Baustein C   | „Kopfrechnen live“ ist der kleinste Baustein und der Türöffner für Kolleginnen. Er profitiert von Rang 1, hängt aber nicht davon ab.                                         |
| 3    | Plan 1               | Die jüngste Entscheidung des Entwicklers und der größte Umbau. Er ersetzt den gerade freigegebenen Test; deshalb erst die Fragen 1 bis 3 unten beantworten.                  |
| 4    | Plan 2, B und A      | Wortbox-Schnellstart, dann „Liste einfügen“ mit den drei Wegen.                                                                                                              |
| 5    | Plan 3, Schritte 5–7 | Nachübung und „sicher“; sie brauchen nur die Merkmale aus Schritt 1.                                                                                                         |
| 6    | Plan 4               | Gehört zur Etappe 3 und hat keine sichtbare Wirkung. Er kann jederzeit nebenher laufen; der Engpass ist die Prüfzeit des Entwicklers, nicht der Bau. Frage 26 vorher klären. |

## 4. Abhängigkeiten

| Von                | Zu                                   | Art                                                                                                                              |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Plan 2, Baustein C | Plan 3, Teil B                       | **weich:** Die Jahrgangsvorgaben bekommen mit Plan 3 von selbst mehr Aufgaben mit Übergang. Reihenfolge beliebig.                |
| Plan 2, Baustein B | Wortboxen fachlich durchgesehen      | **fachlich:** Befund F3 aus Bericht 20 ist offen (Frage 14).                                                                     |
| Plan 1 und Plan 2  | `src/domain/release.ts`, `README.md` | **Dateikonflikt:** Beide ändern das Freigaberegister und die erzeugte Tabelle. Nacheinander mergen und die Tabelle neu erzeugen. |
| Plan 4             | Plan 1 bis 3                         | keine.                                                                                                                           |
| Alle               | Entscheidungsprotokoll               | Vorlagen stehen in Plan 1 (E-1, mit Rücknahme) und Plan 3 (E-1, Ergänzung). Eintragen erst nach der Bestätigung.                 |

Die vier Pläne berühren sonst getrennte Verzeichnisse (`app/views/lernbox`,
`app/lehrer`, `src/domain/mental-math*`, `src/domain/core-words*`) und lassen
sich in getrennten Arbeitskopien bauen.

## 5. Modellempfehlung

| Plan | Modell | Begründung                                                                                                                                                                                             |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Sonnet | Der Plan nennt jede Datei und jeden Testfall. Heikel sind der Lösungsschutz (FA-7) und der Zwischenstand; beide sind als Domain-Schritte mit Tests vorgezogen. Diese beiden Schritte einzeln reviewen. |
| 2    | Sonnet | Viele kleine Teile, klare Grenzen („nicht anfassen“). Die Sicherheitsregeln SL-1 bis SL-10 beim Review gezielt prüfen.                                                                                 |
| 3    | Sonnet | Regeln stehen als Prüftabellen; jeder Schritt hält sich selbst über Tests. Test 10 (altes Verhalten unverändert) zuerst schreiben lassen.                                                              |
| 4    | Sonnet | Schema und Prüfungen sind ausgeschrieben. Die Übertragung der 30 Wörter ist Fleißarbeit; wichtig ist nur: nichts am Inhalt ändern.                                                                     |

Für alle gilt: einen Schritt je Sitzung (Abschnitt 12 des jeweiligen Plans),
nach jedem Schritt committen und pushen, und bei einem Widerspruch zwischen
Test und Code nachfragen statt anpassen (`AGENTS.md`).

## 6. Entscheidungen vom 15.11.2026, die die Pläne berühren

Quelle: `docs/vision/01-planung.md`, „Entscheidungen des Entwicklers nach dem
Testen (15.11.2026)“, und die Roadmap.

| Entscheidung                                                        | Wirkung auf die Pläne                                                                                                                                            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mischbare Fragearten; Zuordnen in zwei Spalten                      | Plan 1 als Ganzes.                                                                                                                                               |
| Test: Rückmeldung erst am Ende, wie umgesetzt (Nr. 1)               | Steht in Spannung zu Plan 1, FA-10 (sofortige Rückmeldung in der gemischten Runde). Frage 1.                                                                     |
| `lernbox-lernformen` sofort `frei` (Nr. 2)                          | Plan 1 ändert die Stufe nicht; der Umbau erscheint dann mit dem Merge für alle. Frage 2.                                                                         |
| Vorerst keine Sterne (Nr. 3)                                        | Plan 1 und Plan 3 bauen keine Belohnung.                                                                                                                         |
| Störangriffe im Battle wieder standardmäßig an (Nr. 4)              | Plan 2, SL-8: Schnellwege setzen nichts Eigenes und nehmen die Standardwerte des Raums. **Achtung:** Im Stand `b79f61e` stehen die Standardwerte noch auf „aus“. |
| Keine zweite Prüferin; Erprobung in anderen Klassen (Nr. 9)         | Plan 4: Der Prüfvermerk kennt nur den Entwickler. Die Prüfzeit für Inhalte bleibt der Engpass.                                                                   |
| Hobby, keine festen Termine (Nr. 11)                                | Kein Plan nennt ein Datum. Erprobungsfristen („eine Woche in der eigenen Klasse“) sind Vorschläge.                                                               |
| Zweites Jahr: erst Großschreibung und das/dass, dann Lesen (Nr. 12) | Plan 4: Das Schema hat Wortart und Beispielsatz, die beides später braucht.                                                                                      |
| Schreiberleichterung pausiert (Nr. 13)                              | Kein Plan nutzt sie. Plan 2 startet Räume auch ohne Klasse; der Klassenstempel spielt für die Schnellwege keine Rolle.                                           |

Noch nicht im Entscheidungsprotokoll (nicht Teil dieser Pläne, aber nach
`AGENTS.md` nötig, weil Festlegungen umgedreht werden): die Umkehr von
Entscheidung 66 (Störangriffe), die Pause von Entscheidung 50
(Schreiberleichterung) und die Freigabe von `lernbox-lernformen`.

## 7. Alle Fragen an den Entwickler

Die Nummer in Klammern verweist auf die Frage im jeweiligen Plan (Abschnitt
13). **Fett** sind die Fragen, ohne deren Antwort der Bau nicht beginnen
sollte.

### Plan 1: LernBox-Fragearten

| Nr. | Frage                                                                                                            | Empfehlung                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Rückmeldung bei Auswahlfragen sofort oder erst am Ende? Du hast für den Test „erst am Ende“ bestätigt.** (F-3) | Sofort, für alle Fragearten gleich. Bitte ausdrücklich bestätigen, weil es die Antwort zum Test umdreht.    |
| 2   | **Der Umbau ersetzt den freigegebenen Test mit dem Merge für alle. Einverstanden?** (F-9)                        | Ja, ohne zweiten Bereich; vorher eine Woche über einen Vorschau-Build in der eigenen Klasse prüfen.         |
| 3   | **Gelten Fragearten auch für „Heute dran“ und „Meine Fehler“?** (F-1)                                            | Schreiben und Mündlich ja (mischbar), Auswahl und Zuordnen nein. So bleibt die Leitner-Wirkung vollständig. |
| 4   | Eine Schreibfrage vor dem Termin setzt bei einem Fehler auf Box 1, wie der Schreibmodus. Einverstanden? (F-8)    | Ja; die mildere Testregel entfällt.                                                                         |
| 5   | Auswahl auch bei „Box üben“? (F-2)                                                                               | Nein, vorerst nur im Stapel.                                                                                |
| 6   | Soll die Liste „Das üben wir noch“ mit „Diese Karten jetzt üben“ am Rundenende bleiben? (F-4)                    | Nein, nicht in diesem Schritt.                                                                              |
| 7   | Rundengröße: Der Test hatte höchstens 10 Fragen, die Runde nimmt alle Karten, die dran sind. (F-5)               | Unverändert lassen und beobachten.                                                                          |
| 8   | Zuordnen weiter mit höchstens 3 Runden zu 6 Paaren? (F-6)                                                        | Ja.                                                                                                         |
| 9   | Spaltenüberschriften beim Zuordnen: die Sprachen des Stapels? (F-7)                                              | Ja („Deutsch“, „Englisch“).                                                                                 |

### Plan 2: Schnell erstellen und sofort live

| Nr. | Frage                                                                                                                        | Empfehlung                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 10  | **Stimmen die Jahrgangsvorgaben für „Kopfrechnen live“, auch Lücken ab Klasse 7 und negative Ergebnisse ab Klasse 8?** (F-1) | So übernehmen und im Unterricht nachstellen; jede Zeile ist schnell geändert.                   |
| 11  | Welche Spielform ist bei „Kopfrechnen live“ voreingestellt? (F-2)                                                            | „Freies Üben“; „Battle“ einen Tipp daneben, die Wahl wird gemerkt.                              |
| 12  | Wortliste an die Kinder als Wortbox im Wortspeicher statt als LernBox-Stapel? (F-3)                                          | Ja; eine LernBox-Karte braucht zwei Seiten.                                                     |
| 13  | Dürfen erzeugte Einträge (je Wortbox und je Vorgabe einer) in der Ablage stehen? (F-4)                                       | Ja; sonst müsste die Start-Absicht Inhalte tragen (Entscheidung 60).                            |
| 14  | Welche mitgelieferten Wortboxen dürfen in die Schnellwahl, solange Befund F3 offen ist? (F-5)                                | Alle, die du durchgesehen hast; die betroffene bis dahin ausnehmen.                             |
| 15  | 10 Wörter je Wortbox-Runde, 20 Rechenaufgaben? (F-6)                                                                         | Ja.                                                                                             |
| 16  | Freigabe von „Schnell starten“? (F-7)                                                                                        | `vorschau`, nach eigener Erprobung `frei`; dabei die Design-Referenzen der Startseite erneuern. |

### Plan 3: Kopfrechnen mit Hürde

| Nr. | Frage                                                                                                              | Empfehlung                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 17  | **Zählen 7 + 3 und 20 − 7 („am vollen Zehner“) als Zehnerübergang für die Quote?** (F-1)                           | Nein; sie sind eine leichtere Stufe.                              |
| 18  | **Darf eine Familie nach dem Update von „sicher“ auf „im Aufbau“ zurückfallen?** (F-3)                             | Ja; es ist die ehrlichere Aussage, und nichts geht verloren.      |
| 19  | Ist „trivial“ richtig gefasst (0 oder 1 als Zahl, Faktor 10, Ergebnis 0; bei Geteilt Ergebnis 0, 1 oder 10)? (F-2) | Ja.                                                               |
| 20  | Soll auch der Startpunkt Mathe die Gewichtung bekommen? (F-4)                                                      | Noch nicht; feste Aufgaben je Stufe (MA-4) sind der richtige Weg. |
| 21  | Ohne Vorschau direkt in den freien Bereich? (F-5)                                                                  | Ja, als fachliche Korrektur; vorher eine Woche im Vorschau-Build. |
| 22  | Eigene Quoten für Verdoppeln, Fast-Verdoppeln, Kern- und Nachbaraufgaben? (F-6)                                    | Später, nach der Erprobung der Hürde.                             |
| 23  | 34 + 25 = 69 (um 10 daneben, ohne Übergang): leere Zelle in der CSV, kein Tipp? (F-7)                              | Ja.                                                               |
| 24  | Tipps zur Null-Regel als Frage statt als Regelsatz? (F-8)                                                          | Ja; ein Regelsatz verriete das Ergebnis.                          |
| 25  | Für „sicher“ bei Plus und Minus: 3 von 5 sicheren Aufgaben mit Hürde? (F-9)                                        | Ja.                                                               |

### Plan 4: Kernwörter

| Nr. | Frage                                                                                                             | Empfehlung                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 26  | **Hören deine Klassen beim Verlängern den Unterschied zwischen d und t, g und k, b und p (Hunde – bunte)?** (F-1) | Mit fünf Wortpaaren in der Klasse ausprobieren, bevor du die 30 Wörter prüfst. |
| 27  | Ist das Schema vollständig, oder fehlen Silben und Wortfamilie des Kernworts? (F-2)                               | So starten.                                                                    |
| 28  | Prüfst du in der Tabelle oder brauchst du eine Prüfansicht in der App? (F-3)                                      | Tabelle für die ersten 30; danach nach gestoppter Zeit entscheiden.            |
| 29  | Stimmen die Auswahlregeln (keine -ig-Wörter, keine s-Wörter, keine unbeweisbaren Wörter)? (F-4)                   | Ja.                                                                            |
| 30  | Zählt „ver-“ in „Vertrag“ als zweite Stelle? (F-5)                                                                | Ja.                                                                            |
| 31  | Sollen veraltete Wörter (Magd, Trug, Tugend, Leib) aus der Wortbank verschwinden? (F-6)                           | Ja, in einem eigenen kleinen Schritt.                                          |
| 32  | Welches Phänomen kommt als zweites Muster? (F-7)                                                                  | Doppelkonsonanten.                                                             |
| 33  | Ist die geschätzte Häufigkeit nützlich? (F-8)                                                                     | Behalten, als Schätzung gekennzeichnet.                                        |

## 8. Was der Entwickler selbst tun muss

- Die fett gesetzten Fragen beantworten (1, 2, 3, 10, 17, 18, 26).
- Die 30 Kernwörter prüfen und dabei die Zeit stoppen
  (`docs/inhalte/kernwoerter-muster-auslautverhaertung.md`, Abschnitt „Was der
  Entwickler bei jedem Wort prüft“).
- Die Jahrgangsvorgaben für Kopfrechnen live durchsehen (Plan 2, Tabelle zu
  Baustein C).
- Die Regeltabellen des Kopfrechnens durchsehen (Plan 3, Abschnitt 3); sie
  werden beim Bau nach `docs/inhalte/kopfrechnen.md` übernommen.
- Nach jeder Erprobung entscheiden, wann ein Bereich `frei` wird.
