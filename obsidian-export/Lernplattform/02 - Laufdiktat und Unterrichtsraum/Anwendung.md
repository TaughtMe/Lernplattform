---
umsetzungsstand: Implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Laufdiktat und Unterrichtsraum

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Implementiert.** Live-Raum (Laufdiktat, Freie Übung, Battle, Stationen) und Laufdiktat allein sind umgesetzt. Der Modus **Lernstandscheck existiert nicht mehr** (alte Einstellung „TEST“ wird als „LAUFDIKTAT“ behandelt). Befunde: Realtime-Kanäle ohne Autorisierung (B-003), Lösungen für jeden mit Raumcode lesbar (B-004), Satz nur zeichengenau richtig (D-008), Satzzerlegung an jedem Punkt (G-004), Unterrichtsfehler beschleunigen den LernBox-Aufstieg (G-011), Tempo-Punkte (D-012), Zwei-Finger-Geste ohne Alternative (E-007). Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].

> **Nachtrag Welle 3 (27.10.2026):** Zu D-012 sind Tempo-Punkte nur auf Wunsch der Lehrkraft eingeschaltet (Standard aus), und die Lehrer-Liveansicht hat einen Projektionsmodus ohne Namen mit Fehlerzahlen. Details: `docs/umsetzungsplan-audit-welle-3.md`.


## Zweck

Der Unterrichtsraum ermöglicht gemeinsame, von der Lehrkraft gesteuerte Aktivitäten: Laufdiktat, Mathematik, Vokabelübungen, Stationen, Battles und kurze Lernstandschecks.

## Anwendung

1. Die Lehrkraft wählt einen Inhalt oder Stapel.
2. Sie startet einen Raum.
3. Schüler treten per Raumcode oder QR-Code bei.
4. Aufgaben erscheinen auf den Schülergeräten.
5. Die Lehrkraft verfolgt aggregierten Live-Fortschritt.
6. Nach der Abgabe erscheint die Auswertung ohne vorheriges direktes Feedback.
7. Je nach Einstellung werden alle, nur Vokabeln mit Übungsbedarf oder keine Vokabeln an die persönliche LernBox übergeben. Die Platzierung folgt dem Ergebnis der Runde (Entscheidung 49); beendet die Lehrkraft die Runde vorzeitig, wird genauso übernommen.
8. Der Schüler kann über **„Meine Fehler jetzt üben“** unmittelbar eine persönliche Übungsrunde starten.

## Einstieg im Lernraum

Das klassische Laufdiktat wird nicht als frei wählbare Deutsch-Kachel dargestellt. Es ist eine gemeinsame Unterrichtsrunde und beginnt deshalb immer mit Raumcode oder QR-Code. Ein Codefeld steht sowohl im Klassenraum als auch unter **Freies Üben** bereit und führt in die native Lobby, danach in das Spiel.

Der QR-Scanner verwendet bevorzugt die rückseitige Kamera, lässt sich jederzeit schließen und fällt bei fehlender Kamerafreigabe auf die manuelle Code-Eingabe zurück. Ein gescannter Link wird nicht als fremde Adresse geöffnet; nur sein vierstelliger Raumcode wird übernommen.

Der persönliche Deutschbereich öffnet stattdessen direkt die Lernwörter. Die vorhandene Laufdiktat-Fachlogik darf außerdem in anderen Grundlagenmodulen weiterverwendet werden, insbesondere für das Kopfrechnen und seine Aufgabenfamilien.

## Regeln

- Lehrervokabeln werden mit stabiler ID übertragen.
- Bereits vorhandene Vokabeln werden nicht dupliziert. Übertragen werden nur Vokabel-ID, Abfragerichtung, Ergebnis, Antwortform, verwendete Hilfe, Test- oder Runden-ID und Zeitpunkt.
- Persönlicher Lernfortschritt bleibt lokal.
- Ein Fehler oder eine Hilfe beeinflusst den Lernstand nach denselben Regeln wie in der LernBox.
- Im Test falsch beantwortete Vokabeln werden als fällig markiert. Eine mit Hilfe gelöste Vokabel steigt nicht auf und wird kurzfristig erneut abgefragt.
- Bei der Übernahme aus einer Live-Runde gilt die Tabelle aus Entscheidung 49: sicher gewusst → Box 2 (neu) beziehungsweise unverändert (vorhanden); 1–2 Fehlversuche → Box 1 beziehungsweise Box bleibt, sofort fällig; Abschreibvorlage oder ab 3 Fehlversuchen → Box 1 (die Buchstabenhilfe zählt nicht als Hilfe); nicht erreicht → Box 1 (neu) beziehungsweise unverändert. Hilfen werden nur lokal im Sitzungsspeicher gemerkt.
- Eine Vokabel kann innerhalb einer Runde höchstens einmal aufsteigen.

## Spätere Übernahme aus Texten

Bei Textaufgaben kann die App Zieltext und Eingabe wortweise vergleichen. Ein einmaliger Fehler wird zunächst als Lernwort vorgeschlagen, wiederholte Übungsfehler oder Testfehler können automatisch übernommen werden. Passende Tags beschreiben Herkunft, Unterrichtseinheit, Datum und erkanntes Rechtschreibphänomen.

## Nutzen

Der Unterricht wird zum Ausgangspunkt des langfristigen Lernens.

## Aktueller nativer Stand – 13. August 2026

Im persönlichen Deutschbereich ist der erste vollständige Laufdiktat-Weg nativ umgesetzt. Er verwendet die geprüfte Fachlogik aus Laufdiktat `6c2ade4` für Antwortprüfung, Vokabelimport, gemischte Abfragerichtungen, deterministische Hinweise und Sternebewertung.

- Texte werden in Sätze und Zeilen zerlegt und über Ansehen, Verdecken und Schreiben geübt.
- Vokabeltabellen unterstützen Alternativantworten sowie beide Richtungen und eine gemischte Runde.
- Klassisches Laufdiktat und freies Üben mit stufenweisen Tipps sind getrennt auswählbar.
- Nach einer Vokabelrunde werden je nach Auswahl alle, nur Vokabeln mit Übungsbedarf oder keine Vokabeln über `LearningBundleV1` in die gemeinsame persönliche LernBox übergeben. Sicher Gewusstes startet in Box 2, Übungsbedarf in Box 1 (siehe Entscheidung 49).
- **Meine Fehler jetzt üben** öffnet anschließend direkt die LernBox; vorhandene Karten werden nicht dupliziert, sondern wieder fällig markiert.

Der Live-Raum und das vollständige Lehrerdashboard sind inzwischen ebenfalls nativ integriert:

- Die Lehrkraft erstellt Text-, Vokabel- oder Kopfrecheninhalte, importiert Text-/CSV-Dateien oder erzeugt Kopfrechenaufgaben.
- Freies Üben, Lernstandscheck, Battle und klassisches Laufdiktat sind als vier getrennte Modi verfügbar.
- QR-Code, Raumcode, Lobby, Teilnehmerstatus, sicherer Start, Wiederaufnahme nach Reload und Raumende folgen dem tokengebundenen Raumvertrag des Quellprojekts.
- Der klassische Stationsmodus verwendet Schülernummern, eine stabile optionale Reihenfolge pro Nummer, Spickerzählung und wiederaufnehmbaren Stationsfortschritt.
- Battle übernimmt Ladung, Tinte, Flimmern, Schild und Realtime-Zielangriffe innerhalb derselben Lernraum-Oberfläche.
- Das Live-Dashboard zeigt Aktivität, Abschluss, Fortschritt, Sterne, häufige Fehler und einen CSV-Export.

Die persönliche Übergabe von Vokabelfehlern an die LernBox bleibt davon getrennt erhalten. Die zentrale Live-Runde speichert keine vollständige persönliche Lernhistorie.
