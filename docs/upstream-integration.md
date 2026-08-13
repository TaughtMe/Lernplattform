# Integration der bestehenden Anwendungen

## Verbindliche Quellen

| Modul      | Repository            | abgeglichener Stand                        | Rolle                                                                                                    |
| ---------- | --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| LernBox    | `TaughtMe/LernBoxV2`  | `64051b6da45a9a29ce67cdecceef815718a13818` | Referenz für Decks, Karten, Leitner-Lernen, Import/Export und lokale Speicherung                         |
| Laufdiktat | `TaughtMe/Laufdiktat` | `6c2ade41eadd2721f051df168244ed09563cea21` | vollständige Referenz für Dashboard, Räume, Spielmodi, Stationen, Battle, Importe, Feedback und Realtime |

Ein neuer Abgleich aktualisiert die Commit-IDs in diesem Dokument. Änderungen werden anschließend als Upstream-Differenz geprüft, statt Funktionen im Lernraum erneut zu entwerfen.

## Was gezielt übernommen wird

- fachliche Regeln und Zustandsübergänge
- vorhandene Lern- und Unterrichtsabläufe
- getestete Utility-Funktionen und Validierungen
- zugängliche Interaktionsmuster, soweit sie in die Lernraum-Komponenten passen
- vorhandene Unit-Tests als Integrationsschutz

## Was ausdrücklich nicht übernommen wird

- eigenständige App- und Layout-Hüllen
- eigener Router oder eingebettete Seiten per iframe
- eigenes PWA-Manifest und eigener Service Worker
- eigene Theme-, Navigations- oder allgemeine Einstellungsverwaltung
- parallele IndexedDB-Datenbank für denselben persönlichen Lernbereich

## Was der Lernraum bereitstellt

- gemeinsame Kopfzeile, Navigation und responsives Theme
- native Darstellung unter stabilen Lernraum-Routen
- Klassen- und Modulfreigaben
- Zuordnung zu Schüler, Klasse und Lehrkraft
- Übergabe vorhandener Ergebnisse an den gemeinsamen Lernverlauf und das optionale Klassenranking
- gemeinsame lokale Datenbereiche, Cache und Realtime-Konfiguration

Diese Ergänzungen dürfen das Verhalten des Quellmoduls nicht stillschweigend verändern. Abweichungen brauchen einen dokumentierten pädagogischen oder technischen Grund und einen Test.

## Integrationsreihenfolge

1. LernBox-Fachlogik für Decks, Karten, Leitner-Stände, Richtungen und Sicherungen in den gemeinsamen Domänen- und Speicherbereich portieren.
2. Eine native LernBox-Oberfläche mit Lernraum-Theme und gemeinsamer Navigation bereitstellen.
3. Laufdiktat-Fachlogik und benötigte Unterrichtsabläufe ebenso gezielt integrieren.
4. Fehler und Ergebnisse über `LearningBundleV1` dublettenfrei an die persönliche LernBox übergeben.
5. Die Tests beider Quellprojekte in das gemeinsame Quality Gate aufnehmen.
6. Upstream-Änderungen regelmäßig commitgenau abgleichen.

## Aktueller Laufdiktat-Port

Aus Laufdiktat `6c2ade4` sind jetzt nativ übernommen und durch gemeinsame Tests geschützt:

- typabhängige Antwortprüfung für Text und Vokabeln
- Vokabelimport mit Alternativantworten und drei Abfragerichtungen
- deterministische, stufenweise Hinweise im freien Üben
- Textzerlegung für Sätze und Zeilen im persönlichen Einstieg
- ursprüngliche Fünf-Sterne-Berechnung nach Fehlerquote
- Ablauf Ansehen → Verdecken → Schreiben → Rückmeldung → Abschluss

Die App-Hülle, ihr Router, Service Worker, eigenes Theme und Zustandsspeicher wurden bewusst nicht übernommen. Live-Räume, Lehrer-Dashboard, Stationen und Battle folgen in getrennten, getesteten Integrationsschritten.
