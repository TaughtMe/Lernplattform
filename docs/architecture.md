# Architekturgrundlage

## Gewählter Schnitt

Lernraum wird als gemeinsame PWA aufgebaut. LernBoxV2 und Laufdiktat sind dabei keine Vorbilder für einen Nachbau, sondern die verbindlichen, bereits funktionsfähigen Quellmodule:

- `app/` enthält die gemeinsame Navigation und die Lernraum-Einstiege.
- Die vorhandene Fachlogik, Bedienabläufe, Komponenten und Tests aus LernBoxV2 und Laufdiktat werden übernommen.
- `src/domain/` enthält nur die zusätzlichen plattformweiten Verträge für Klasse, Freigabe, Herkunft und Ergebnisübergabe.
- `src/storage/` ergänzt Adapter, wo persönliche, Klassen- und Lehrerdaten voneinander getrennt werden müssen.

## Integrationsregel

Vor einer neuen Fachimplementierung wird immer zuerst im jeweiligen Quellrepository geprüft, ob die Funktion dort bereits vorhanden ist. Vorhandener Code wird portiert und nur an Routing, Theme, Identität, Klassenfreigaben und den gemeinsamen Ergebnisfluss angepasst. Eine parallele Eigenimplementierung derselben LernBox- oder Laufdiktat-Funktion ist nicht vorgesehen.

Die aktuell abgeglichenen Quellstände und die Übernahmeregeln stehen in [upstream-integration.md](upstream-integration.md).

## Datenbereiche

1. **Persönlich:** Vokabeln, Lernereignisse, Projektionen und Einstellungen.
2. **Klasse:** veröffentlichte Inhaltspakete und pseudonyme Mitgliedschaften.
3. **Lehrer:** Klassenlisten, Namenszuordnungen und Abgabeprotokolle.

Kein Bereich erhält automatisch Zugriff auf einen anderen. Übertragungen verwenden ein explizites, versioniertes Format.

## Geräteübergreifende Grundlage

Alle Module werden mobile-first und responsiv entwickelt. Gemeinsame Navigation, Layout-Tokens und Bedienregeln liegen im Plattformkern, damit Laufdiktat und LernBox keine abweichenden mobilen Sonderlösungen benötigen. Die verbindliche Geräte- und Browsermatrix steht in [device-support.md](device-support.md).

Der verbindliche Coding-, Bibliotheks- und Teststandard steht in [engineering-quality.md](engineering-quality.md).

## Nächster fachlicher Schritt

Zuerst werden LernBoxV2 und Laufdiktat funktionsweise unter den Lernraum-Routen eingebunden. Danach werden die vorhandenen Speicher- und Realtime-Dienste über kleine Lernraum-Adapter mit Klassenfreigaben und Ergebnisübergabe verbunden. `LearningBundleV1` bleibt das Austauschformat zwischen den Modulen, ersetzt aber nicht deren vorhandene Fachlogik.
