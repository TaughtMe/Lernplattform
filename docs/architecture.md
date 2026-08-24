# Architekturgrundlage

## Gewählter Schnitt

Lernraum wird als eine gemeinsame PWA aufgebaut. LernBoxV2 und Laufdiktat sind verbindliche, bereits funktionsfähige Quellreferenzen für die Fachmodule:

- `app/` enthält die gemeinsame Navigation und die Lernraum-Einstiege.
- Wiederverwendbare Fachlogik, Bedienabläufe und Tests werden gezielt portiert.
- App-Hüllen, Router, PWA-Manifeste, Service Worker, eigene Themes und doppelte Einstellungen werden nicht übernommen.
- `src/domain/` enthält die framework-unabhängige Lernlogik und die plattformweiten Verträge für Klasse, Freigabe, Herkunft und Ergebnisübergabe.
- `src/storage/` stellt gemeinsame persönliche, Klassen- und Lehrerdatenbereiche bereit.

## Integrationsregel

Vor einer neuen Fachimplementierung wird immer zuerst im jeweiligen Quellrepository geprüft, ob die Funktion dort bereits vorhanden ist. Geeigneter Code wird auf seine Abhängigkeiten geprüft, gezielt portiert und an das gemeinsame Routing, Theme, Datenmodell, die Identität, Klassenfreigaben und den Ergebnisfluss angepasst. Eine zweite Anwendung innerhalb des Lernraums und eine parallele Eigenimplementierung derselben Fachregel sind nicht vorgesehen.

Die aktuell abgeglichenen Quellstände und die Übernahmeregeln stehen in [upstream-integration.md](upstream-integration.md).

## Datenbereiche

1. **Persönlich:** Vokabeln, Lernereignisse, Projektionen und Einstellungen.
2. **Klasse:** veröffentlichte Inhaltspakete und pseudonyme Mitgliedschaften.
3. **Lehrer:** Klassenlisten, Namenszuordnungen und Abgabeprotokolle.

Kein Bereich erhält automatisch Zugriff auf einen anderen. Übertragungen verwenden ein explizites, versioniertes Format.

## Geräteübergreifende Grundlage

Alle Module werden mobile-first und responsiv entwickelt. Gemeinsame Navigation, Layout-Tokens und Bedienregeln liegen im Plattformkern, damit Laufdiktat und LernBox keine abweichenden mobilen Sonderlösungen benötigen. Die verbindliche Geräte- und Browsermatrix steht in [device-support.md](device-support.md).

Der verbindliche Coding-, Bibliotheks- und Teststandard steht in [engineering-quality.md](engineering-quality.md).

## Aktueller fachlicher Stand

LernBox, Laufdiktat, Kopfrechnen, Lernwörter und Tastschreiben laufen nativ unter gemeinsamen Lernraum-Routen. Lernwörter speichern Merkstufe und Wiederholungsfälligkeit getrennt; Tastschreiben bewertet Genauigkeit vor Geschwindigkeit. Beide Module schreiben typisierte Ereignisse in den persönlichen Lernverlauf. Dadurch kann **Heute üben** fällige Lernwörter und noch unsichere Tipp-Lektionen als fachlich passende nächste Schritte aufnehmen.

`LearningBundleV1` bleibt das versionierte Austauschformat zwischen Modulen und transportiert beispielsweise fehlerhafte Laufdiktat-Vokabeln dublettenfrei in die persönliche LernBox. Vollständige persönliche Antworten bleiben lokal.

Der nächste fachliche Schritt ist, die noch statischen Katalogeinträge der Tagesauswahl durch ein vollständig gemeinsames Lernobjekt- und Empfehlungssystem zu ersetzen. Erst danach werden Duelle, Häuser oder weitere Motivationsfunktionen priorisiert.
