# Textbox

## Zweck

Die Textbox ist ein eigener Übungsbereich im Lernraum für Rechtschreibtraining mit zusammenhängenden Texten, besonders für Schüler mit Lese-Rechtschreib-Schwierigkeiten (LRS). Ein Text wird in vier Durchgängen mit immer weniger Hilfe geschrieben, bis er im letzten Durchgang aus dem Gedächtnis entsteht. Alles läuft lokal auf dem Schülergerät; keine Eingaben, Ergebnisse oder Fehlerwörter gehen an einen Server.

Die verbindliche fachliche Grundlage ist `docs/umsetzungsplan-textbox.md` (Abschnitt 1). Das Konzept „Lernraum – Konzept: Textbox und Rechtschreibtraining“ vom 8. Oktober 2026 ist der Leitfaden. Entscheidung 54 hält die Festlegungen fest.

## Ablauf einer Trainingseinheit

Eine Einheit hat **vier Durchgänge** am selben Text. Jeder Durchgang hat drei Phasen: **Merken → Schreiben → Kontrolle**.

| Durchgang | Ausgeblendet (kalibrierbar) | Markierung beim Merken | Eingabe |
|---|---|---|---|
| 1 | ca. 20 % (die Zielwörter) | ja, Farbe und Unterstreichung | direkt in die Lücken |
| 2 | ca. 40 % | nein | direkt in die Lücken |
| 3 | ca. 70 % | nein | direkt in die Lücken (einheitliche Lückenbreite) |
| 4 | 100 % | entfällt | leeres, großes Schreibfeld |

- Die ausgeblendeten Mengen sind ineinander geschachtelt. Ausgewählt wird in dieser Reihenfolge: Zielwörter, weitere Wörter zum Schwerpunkt, längere Inhaltswörter, Rest. Die Reihenfolge innerhalb einer Gruppe ist über einen Seed (`trainingId`) nachvollziehbar, aber bei jeder Wiederholung anders.
- Merkzeit: leicht 60 s, mittel 90 s, schwer 120 s. „Ich bin bereit“ beendet sie vorzeitig. Merkzeit und Schreibzeit werden nur gespeichert, sie ändern die Bewertung nicht.
- Beim Schreiben ist der Originaltext nicht abrufbar. Einfügen, Ablegen, Autokorrektur und Rechtschreibprüfung sind gesperrt. Die Schreibzeit startet mit dem ersten Tastenanschlag.
- Leertaste, Enter und Tab springen zur nächsten Lücke, Shift+Tab und die Rücktaste in einer leeren Lücke zur vorherigen. Es gibt keinen automatischen Sprung bei erreichter Wortlänge. „Prüfen“ geht jederzeit.
- Aus dem Wortspeicher mitgebrachte Wörter, die im Text vorkommen, werden in Durchgang 1 zusätzlich ausgeblendet und markiert.

## Bewertung und Kontrolle

- Durchgang 1–3: richtige Lücken ÷ Lücken × 100. Durchgang 4 (Hauptwert): (richtige Originalwörter − zusätzliche Wörter) ÷ Wörter im Original × 100, mindestens 0 %, auf ganze Prozent gerundet.
- Fehlerarten: `richtig`, `falsch` (mit Hinweis „fast richtig“ bei einem Buchstaben Abstand), `gross-klein`, `fehlt`, `zusaetzlich`. Satzzeichen werden nur als Hinweis gezählt und fließen nicht ein.
- Die Kontrolle stellt Original und Eingabe Wort für Wort gegenüber. Fehlerarten haben Farbe **und** Symbol bzw. Text. Der Prozentwert wird ruhig und ohne Abwertung gezeigt. Eine Verbesserungsphase gibt es in dieser Version nicht.

## Bibliothek, Bestwert und Verlauf

- 50 Texte (Welle 1 und 2), je Schwierigkeit mindestens 10, jeder Schwerpunkt in mindestens 2 Texten. Wortanzahl: leicht 30–60, mittel 60–110, schwer 110–180. Zielwörter machen 10–25 % aus und müssen echte Beispiele für den Schwerpunkt sein. Die Texte sind Entwürfe eines KI-Agenten und werden von der Lehrkraft fachlich geprüft (`docs/inhalte/textbox.md`).
- Die Bibliothek filtert nach Schwierigkeit, Schwerpunkt und Status und zeigt **immer den Bestwert**, nie das letzte Ergebnis. Bestwert, letzter Wert und Anzahl werden aus den abgeschlossenen Einheiten abgeleitet.
- Nach jedem Durchgang wird die laufende Einheit gespeichert. Beim nächsten Öffnen erscheinen „Fortsetzen“ und „Neu beginnen“. Nur abgeschlossene Einheiten zählen für Bestwert, Verlauf und Statistik.
- Die Detailansicht eines Textes zeigt Bestwert, letztes Ergebnis, Versuche, alle Einheiten mit den vier Durchgangswerten und ein Linien- oder Säulendiagramm (eigenes SVG, Wertetabelle als Alternative). Ein zunächst geschlossener Kasten „Schau dir dein Diagramm an“ enthält die Reflexionsfragen aus dem Konzept.

## Verbindung zum Wortspeicher

Es gibt keine zweite Trainingsanwendung. Die Textbox hat zwei Zugänge: frei über „Üben“ und nach einer Wortspeicher-Übung.

- **Wortspeicher → Textbox:** Auf dem Abschlussbildschirm erscheint „Mit einem Text weiterüben“, sofern der Bereich `textbox` sichtbar ist. Der Link trägt die geübten Wörter (`?woerter=`, höchstens 50, mit Zod geprüft) und die Sammlung (`?sammlung=`). Die Textbox schlägt bis zu drei Texte mit den meisten dieser Wörter vor (Gleichstand: passender Schwerpunkt, dann niedrigere Schwierigkeit).
- **Textbox → Wortspeicher:** Auf dem Abschlussbildschirm erscheint „Fehlerwörter im Wortspeicher üben“. Der Wortspeicher öffnet das Blatt „Wörter aus der Textbox“ mit „Jetzt üben“ (vorübergehende Wortbox) und „In eine Wortbox speichern“. Es wird nichts ohne eine dieser Aktionen gespeichert (Entscheidung 55).
- **Wortspeicher → Textbox, erweitert:** Nach einer Runde zeigt der Wortspeicher den besten passenden Text als Karte („enthält 4 deiner 6 Wörter“); ohne Treffer bleibt „Mit einem Text weiterüben“.
- KI-generierte Texte aus Lernwörtern sind nicht Teil dieser Version.

## Statistik und Laufzettel

- Die Fortschrittsseite (`/lernen/fortschritt`) hat einen Abschnitt „Textbox“: geübte Texte, Übungen, Verteilung nach Schwierigkeit und Schwerpunkt, Liniendiagramm über alle Übungen und die Schwerpunkte mit den meisten Fehlern, mit Link zur passenden Sammlung im Wortspeicher. Ohne abgeschlossene Übung steht dort ein leerer Zustand.
- Der **Laufzettel** (`/frei/german/textbox/laufzettel`) ist eine druckbare Übersicht: Text, Schwierigkeit, Schwerpunkt, Datum der letzten Übung, Zahl der Übungen und Bestwert. Das Namensfeld ist freiwillig und wird **nirgends gespeichert**. Der Hinweis „Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein Prüfungsnachweis.“ steht sichtbar auf dem Bildschirm und im Ausdruck. Ein selbst erzeugter Laufzettel ist nicht manipulationssicher.

## Daten und Technik

- Dexie-Tabelle `textboxSessions` (Version 5 der persönlichen Datenbank), eine Trainingseinheit je Datensatz, Zod-geprüft bei jedem Lesen. Abgeschlossene Einheiten sind unveränderlich; höchstens eine laufende Einheit je Text.
- Der Abschluss schreibt in einer Transaktion die Einheit und ein Lernereignis (`source: "textbox"`, `learningObjectId: "textbox:<textId>"`). Doppeltes Abschließen erzeugt kein zweites Ereignis. Dadurch zählt eine Einheit für Serie und Tagesaktivität im Dashboard.
- Gespeicherte Eingaben sind je Wort auf 100 Zeichen gekürzt; Lücken erlauben 40, das Schreibfeld 4000 Zeichen.
- Datensicherung: `textboxSessions` ist Teil der persönlichen Sicherung. Ältere Sicherungen ohne dieses Feld lassen sich weiter einlesen. Beim Zusammenführen gewinnt `abgeschlossen` vor `laufend`, sonst das neuere `updatedAt`; zwei abgeschlossene Einheiten mit gleicher Id und anderem Inhalt ergeben einen Konflikt. Der Schüler-Cloud-Abgleich nutzt dieselbe Sicherungsdatei.
- Freigabe: Bereich `textbox`, seit 08.10.2026 auf Stufe `frei` (von der Lehrkraft freigegeben). Zurückhalten mit `LERNRAUM_FREIGABE=textbox=vorschau`.

## Bekannte Grenzen

- Ein fehlerfrei wiedergegebener, mehrfach geübter Text beweist keine allgemein verbesserte Rechtschreibung; die Textbox trainiert auch das Gedächtnis.
- Die Wirksamkeit der vierstufigen Methode für LRS ist nicht wissenschaftlich belegt.
- Ältere App-Versionen auf einem zweiten Gerät kennen die Quelle `textbox` und die Sicherungssammlung `textboxSessions` nicht. Vor dem Cloud-Abgleich müssen alle Geräte aktualisiert sein.
- Lokale Daten gehen verloren, wenn Browserdaten gelöscht werden. Schutz bieten Export, Sicherung und die Backup-Erinnerung.

## Später zu kalibrieren

Merkzeiten, Ausblendungsanteile, Lückenbreite in Durchgang 3, Wortanzahlen, Gewichtung von Groß-/Kleinschreibung und Satzzeichen, die Schwelle von 90 % für `assessment.writing` und die Frage, ob eine aktive Verbesserungsphase nötig ist.
