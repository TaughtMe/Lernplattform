# Version 0.9.2

Stand: 26.10.2026. Grundlage ist Version 0.9.1 (`489464c`) auf
`claude/lernraum-ui-v2`. Die bestehende UI v2 und die LernBox-Regeln aus 0.9.1
bleiben erhalten.

## Änderungen

- Live-Räume verwenden tokengebundene Serverabfragen für Anwesenheit, Fortschritt
  und Spielaktionen. Öffentliche Raumkanäle entfallen; der Server prüft Absender,
  Empfänger, Raum, Sitzung und die Häufigkeit von Spielaktionen.
- Persönliche Sicherungen v2 bewahren unbekannte Zusatzfelder und unlesbare
  JSON-Originale separat auf, auch nach Wiederherstellung und erneutem Export.
  Die lokale Datenbank erhält dafür eine Rettungstabelle (Version 8).
- Einzelwortblöcke akzeptieren Leerzeichen als Trenner. Mehrdeutige Eingaben mit
  mehrwortigen Begriffen erhalten einen Formathinweis und verbrauchen keinen
  Versuch. Rechtschreibung und Groß-/Kleinschreibung werden weiterhin bewertet.

## Vor der produktiven Freigabe

Die Migration `20261022045055_secure_room_activity.sql` muss vor dem neuen Client
eingespielt sein. Zusätzlich sind öffentliche Realtime-Zugänge zu sperren und
alte Verbindungen zu beenden. Ein Push oder Merge wendet die Migration nicht an.
Die vollständige Cross-Browser-CI sowie die Abnahme in der Testumgebung und auf
realen Geräten bleiben erforderlich.

- [Live-Sicherheit: Bereitstellung und Abnahme](live-sicherheit-bereitstellung.md)
- [Sicherungsformat v2 und Grenzen eines Rollbacks](backup-v2-recovery.md)

Die Änderungen wurden mit gezielten Funktions-, Speicher-, Datenbank- und
Browserprüfungen einschließlich automatisierter Barrierefreiheitsproben geprüft.
Die lokalen Datenbanktests verwenden PGlite, die Live-Browsertests kontrollierte
HTTP-Antworten. Beides ersetzt keine Prüfung der produktiven Supabase-Instanz.
