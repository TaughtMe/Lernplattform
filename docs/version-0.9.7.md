# Version 0.9.7

Stand: 05.11.2026. Grundlage ist Version 0.9.5 (`3923b3b`) auf
`claude/lernraum-ui-v2`; eine Version 0.9.6 gibt es nicht. Umgesetzt sind die
Freigaben aus Entscheidung 59.

## Änderungen

- Freigaben: Startpunkt, Tagestraining und Kompetenzprofil (`diagnostik`),
  Aufgaben der Lehrkraft (`lehrer-aufgaben`) und Spiegelschrift
  (`spiegelschrift`) sind ohne Vorschau sichtbar (Stufe `frei`).
- Cloud-Abgleich: Google Drive ist abgeschaltet, weil der Abgleich dort noch
  nicht funktioniert. Es erscheint als „Noch nicht eingerichtet“. Eine schon
  gespeicherte Google-Drive-Verbindung wird nicht fortgesetzt; die Statuszeile
  nennt den Grund. OneDrive und WebDAV bleiben.
- Wortspeicher (4d–4f): Der Stand der App ist als Referenz der Vorlage
  festgehalten; Schritt 7 des Umbaus ist abgeschlossen (nur Dokumentation).

## Formatänderungen

Keine.

## Offen

- Die pädagogische Abstimmung der Diagnostik (Stufenfolgen des Startpunkts,
  Regel „sicher“) steht noch aus und wird in der Beta beobachtet.
- `/lehrer/aufgaben` ist noch in der alten Oberfläche und hat keine Überschrift
  der Ebene 1.
- Die offenen Punkte aus [Version 0.9.5](version-0.9.5.md) gelten weiter.

Für die produktive Freigabe gelten die Voraussetzungen aus
[Version 0.9.2](version-0.9.2.md) unverändert.
