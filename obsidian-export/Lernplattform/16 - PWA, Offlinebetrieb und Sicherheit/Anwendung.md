---
umsetzungsstand: Teilweise implementiert
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# PWA, Offlinebetrieb und Sicherheit

> **Umsetzungsstand laut Gesamtaudit vom 19./20.10.2026: Teilweise implementiert.** Installierbarkeit und Service Worker sind umgesetzt. Offline funktioniert nur, was unter der aktuellen Version schon besucht wurde; nach einem Update kaum etwas (B-013). Lehrerfunktionen sind nicht rollenbasiert geschützt (Entscheidung 43; B-009). Sicherheitsheader und CSP fehlen (B-015). Details: [[../21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit 2026-10-19]].


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
