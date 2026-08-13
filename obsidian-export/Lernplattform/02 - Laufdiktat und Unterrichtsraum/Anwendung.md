# Laufdiktat und Unterrichtsraum

## Zweck

Der Unterrichtsraum ermöglicht gemeinsame, von der Lehrkraft gesteuerte Aktivitäten: Laufdiktat, Mathematik, Vokabelübungen, Stationen, Battles und kurze Lernstandschecks.

## Anwendung

1. Die Lehrkraft wählt einen Inhalt oder Stapel.
2. Sie startet einen Raum.
3. Schüler treten per Raumcode oder QR-Code bei.
4. Aufgaben erscheinen auf den Schülergeräten.
5. Die Lehrkraft verfolgt aggregierten Live-Fortschritt.
6. Nach der Abgabe erscheint die Auswertung ohne vorheriges direktes Feedback.
7. Je nach Einstellung werden alle, nur fehlerhafte oder keine Vokabeln an die persönliche LernBox übergeben.
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
- Nach einer Vokabelrunde werden je nach Auswahl alle, nur fehlerhafte oder keine Vokabeln über `LearningBundleV1` in die gemeinsame persönliche LernBox übergeben.
- **Meine Fehler jetzt üben** öffnet anschließend direkt die LernBox; vorhandene Karten werden nicht dupliziert, sondern wieder fällig markiert.

Noch nicht Teil dieses Schritts sind Live-Raum, Lehrer-Dashboard, Stationen, Battle und Realtime. Sie werden ebenfalls nativ integriert und verwenden später dieselbe Fachlogik und denselben Ergebnisadapter.
