# PWA, Offlinebetrieb und Sicherheit

## PWA

Die Plattform soll installierbar und nach dem ersten Laden weitgehend offline nutzbar sein. Unterrichtsräume und Live-Duelle benötigen eine Verbindung; persönliche Lernrunden nicht.

## Gemeinsame Plattform

Getrennte Webseiten auf verschiedenen Domains können nicht ohne Weiteres auf denselben lokalen Speicher zugreifen. Langfristig ist daher eine gemeinsame PWA oder ein klar geteilter technischer Kern unter derselben Herkunft sinnvoll.

## Offlinebetrieb

- Inhalte lokal zwischenspeichern
- Lernereignisse offline erfassen
- Synchronisation später nachholen
- Konflikte sichtbar und reproduzierbar lösen
- App-Version und Datenformat getrennt versionieren

## Sicherheit

- kurzlebige Raum- und Abrufschlüssel
- Lehrerfunktionen rollenbasiert schützen
- Backup-Ziele nur über geschützte Verbindungen anbinden; zusätzliche Dateiverschlüsselung optional halten
- Namenszuordnungen lokal schützen
- keine geheimen Schlüssel dauerhaft im Frontend hinterlegen
- Eingaben und Schülertexte validieren

## Grenzen

Eine reine PWA kann lokale Manipulation, Screenshots oder Appwechsel nicht vollständig verhindern. Das muss bei Prüfungen und Ranglisten berücksichtigt werden.
