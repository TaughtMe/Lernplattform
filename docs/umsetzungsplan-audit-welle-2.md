# Umsetzungsplan Audit – Welle 2

Stand: 26.10.2026. Grundlage: Welle 2 aus `docs/umsetzungsplan-audit-welle-1.md`; braucht das tolerante Lesen (Regel S-1, seit 0.9.1).

Welle 2 ändert gespeicherte Formate (C1, C5, C6). Die Pakete setzen deshalb das tolerante Lesen aus Welle 1 voraus. Jedes Paket hat eine eigene Regeltabelle; die Pakete sind getrennt umsetzbar, außer wo die Tabelle etwas anderes sagt.

## C1 LernBox – Abrufzeitpunkt je Richtung (G-005, G-011)

Formatänderung.

| Nr.  | Regel                                                                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1-1 | Neue optionale Kartenfelder `forwardLastReviewed` und `reverseLastReviewed`. `lastReviewed` bleibt der letzte Abruf in irgendeiner Richtung (Abgleich, Sicherung).               |
| C1-2 | Fehlt das Richtungsfeld, gilt `lastReviewed` für die Richtung (Migration beim Lesen).                                                                                            |
| C1-3 | Eine Abfrage setzt nur das Feld ihrer Richtung.                                                                                                                                  |
| C1-4 | Die 8-Stunden-Regel liest nur den Abrufzeitpunkt der eigenen Richtung.                                                                                                           |
| C1-5 | Die Platzierung aus dem Live-Raum setzt den Abrufzeitpunkt der geübten Richtung (vorwärts).                                                                                      |
| C1-6 | Erholungsfall: Richtig beantwortet, aber weniger als 8 Stunden nach dem letzten Abruf dieser Richtung. Das gilt in jeder Box: kein Aufstieg, die Karte ist morgen wieder fällig. |

## C2 Fehlbewertungen (G-002, G-003, G-012)

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2-1 | Eine gemeinsame Vergleichsnormalisierung auf Ziel und Eingabe in LernBox und Laufdiktat: Unicode NFC, Apostrophe → `'`, Anführungszeichen → `"`, Bindestrich- und Minus-Varianten → `-`, Leerraum vereinheitlicht. Die Fingerabdrücke bleiben unverändert.                                                                                                                                          |
| C2-2 | Alternativen: der ganze Text, Teile getrennt an „\|“ und „/“, Klammerteile optional („(to) go“ → „to go“ und „go“).                                                                                                                                                                                                                                                                                 |
| C2-3 | Ein Komma trennt nur nach Bestätigung in der Importvorschau.                                                                                                                                                                                                                                                                                                                                        |
| C2-4 | Satzanfänge werden bei der Übernahme in den Wortspeicher kleingeschrieben, außer das Wort ist als Nomen bekannt oder steht im Text auch mitten im Satz groß. Ein reiner Groß-/Kleinfehler am Satzanfang wird nicht als Fehlerwort übernommen.                                                                                                                                                       |
| C2-5 | Nomen mit Artikel: Im Wortspeicher stehen Nomen mit Artikel („das Essen“), das Kind schreibt ihn mit; „das Essen“ und „essen“ haben getrennte Lernstände. Die Übernahme aus dem Laufdiktat setzt „der“, „die“ oder „das“ (klein) vor das Nomen, wenn es direkt davorsteht; sonst bleibt das Nomen allein. Eigene Wortboxen zeigen bei bekannten Nomen ohne Artikel nur einen Tipp. Keine Migration. |

## C3 Erster Versuch zählt (D-010)

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C3-1 | LernBox: Je Karte und Richtung zählt in einer Runde nur der erste Versuch.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| C3-2 | Selbsteinschätzung („Gewusst“ nach dem Aufdecken) hebt höchstens bis Box 3. Box 4 und 5 gibt es nur schriftlich.                                                                                                                                                                                                                                                                                                                                                                                                   |
| C3-3 | Textbox: Ein Durchgang lässt sich beliebig oft wiederholen. Jeder Versuch ist vollwertig und hat einen eigenen Prozentwert (nichts heißt „Übung“ oder „zählt nicht“); kein Versuch geht verloren, alle stehen im Verlauf des Textes (z. B. „25 % → 27 % → 100 %“, mit Zeitpunkt, höchstens 100 je Durchgang). Ergebnis, Fehlerwörter und Lernereignis folgen dem jeweils letzten Versuch; der Bestwert zählt nur Durchgang 4. Ersetzt die frühere Fassung „erster Versuch zählt“ (0.9.4). Entscheidung 27.10.2026. |

## C4 Kopfrechnen (D-008)

| Nr.  | Regel                                                                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C4-1 | Regelbasierte Fehlerklassifikation als reine Funktion. Sie ist nur für die Lehrkraft sichtbar und zeigt ihre Unsicherheit.                                                                                                                                |
| C4-2 | Erster Fehlversuch: Strategiehinweis statt nur „Noch nicht“.                                                                                                                                                                                              |
| C4-3 | Zweiter Fehlversuch oder „Lösungsweg zeigen“: Lösungsweg in kurzen Schritten mit Ergebnis. Gewertet wird der erste Versuch.                                                                                                                               |
| C4-4 | Unbekannte Fehlerart: kein Tipp, auch kein allgemeiner Strategietipp. Nach dem ersten Fehler erscheint nur „Noch nicht.“; der Lösungsweg (zweiter Fehler oder Knopf) bleibt. Entscheidung 27.10.2026.                                                     |
| C4-5 | Fehlerart für die Lehrkraft nur in der CSV („Ergebnisse als CSV herunterladen“, Abschnitt je Kind und Aufgabe mit Spalte „Fehlerart (Vermutung)“, leer bei unbekannt), nicht in der Oberfläche. Entscheidung 27.10.2026. Umgesetzt (siehe Vermerk unten). |

Umsetzung von C4-5 (27.10.2026): Migration `supabase/migrations/20261027120000_math_first_wrong_answers.sql` ergänzt `room_students.first_wrong_answers jsonb` und ein 14. Argument `p_first_wrong_answers jsonb default null` für `upsert_progress_secure`; der Lehrkraft-Abruf `get_room_students_secure` liefert die Spalte mit. Server: nur Aufgabentexte von Mathe-Wörtern des Raums als Schlüssel, höchstens so viele Einträge wie der Raum Wörter hat, je Antwort höchstens 32 Zeichen, insgesamt höchstens 64 KiB (wie `word_errors`); die zuerst gespeicherte Antwort je Aufgabe bleibt erhalten. Alte Clients (0.9.4) rufen weiter mit 13 Argumenten auf. Client: `LiveProgress.firstWrongAnswers` (nur Mathe, gekürzt in `first-wrong-answers.ts`), Kindseite `app/raum/spiel/live-game.tsx`, lokal gesichert im Schnappschuss `live-trace.ts`. CSV: `buildTeacherResultCsv` hängt einen Abschnitt „Name; Aufgabe; Fehlversuche; Fehlerart (Vermutung)“ an (eine Zeile je Kind und Aufgabe mit Fehlversuchen), weil eine Liste in der Kindzeile nicht sortierbar wäre. Die Fehlerart berechnet `classifyMentalMathError` auf dem Lehrergerät; die Aufgabe wird über `mathTasksByErrorKey` aus den Raumwörtern (Aufgabentext und Lösung) gewonnen. Die Datenschutzerklärung (Abschnitt „Live-Räume“) und `docs/live-sicherheit-bereitstellung.md` nennen die Übertragung. Die Migration muss vor dem neuen Client eingespielt werden; ein neuer Client gegen den alten Server scheitert nur in Mathe-Räumen nach einer falschen Antwort.

## C5 Lernarchiv (Box 6) im Wortspeicher

Formatänderung. Bestätigt am 27.10.2026; abweichend vom Vorschlag geht ein falsches Archivwort auf Box 1 zurück.

| Nr. | Regel                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------- |
| A-1 | Box 5 → Box 6, wenn die fällige Wiederholung in Box 5 beim ersten Versuch auf Stufe 6 (freier Abruf) ohne Hilfe richtig ist. |
| A-2 | Archivwörter sind nie regulär fällig.                                                                                        |
| A-3 | Höchstens ein Archivwort je Tagesportion („Bonus“), jedes höchstens alle 30 Tage.                                            |
| A-4 | Bonus richtig → bleibt in Box 6, der nächste Bonus frühestens in 30 Tagen. Falsch oder mit Hilfe → Box 1, morgen fällig.     |
| A-5 | Ältere App-Versionen legen Box-6-Datensätze in Quarantäne (tolerantes Lesen). Nichts geht verloren.                          |

## C6 Gastmodus (B-009, B-010)

| Nr. | Regel                                                                                       |
| --- | ------------------------------------------------------------------------------------------- |
| G-1 | Der Lehrer-QR wird mit dem Klassenschlüssel signiert und ist 90 Minuten gültig.             |
| G-2 | Prüfung von Signatur und Ablauf. Kennt das Gerät die Klasse, muss der Schlüssel passen.     |
| G-3 | Bestätigung auf Geräten mit Lernstand, mit dem Angebot, vorher eine Sicherung zu erstellen. |
| G-4 | Hinweis „Gastmodus“ mit der Schaltfläche „Gastmodus beenden“.                               |
| G-5 | Löschumfang: alle Schülerdaten, nie die Lehrerdatenbank.                                    |
| G-6 | Der Link zum Lehrerbereich ist im Gastmodus ausgeblendet.                                   |
| G-7 | Bereinigung beim nächsten Start nach 12 Stunden.                                            |
| G-8 | Freigabe zunächst `vorschau`.                                                               |
| G-9 | Eigene E2E-Tests für den Gastmodus.                                                         |

## C7 Schonfrist

Keine eigene Regeltabelle. Die Festlegungen stehen in `docs/umsetzungsplan-lernbox-schonfrist.md`. Die offene Frage aus Welle 1 ist dort im Abschnitt „Klärung Box 1 (C7)“ geklärt.

## Prüfungen

- Gezielte Unit-Tests je Paket.
- Gebündelter Browserlauf nach dem Zusammenführen der Pakete.
- Vollständige Cross-Browser-Suite in GitHub. Sie bleibt verpflichtend.
