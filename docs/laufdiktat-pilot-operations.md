# Laufdiktat-Pilot: Betrieb und Pilotbeobachtung

## Raumöffnung

Räume werden ohne separate Lehrkraftfreigabe geöffnet (siehe `20260901120000_remove_pilot_teacher_gate.sql` – hebt die Sperre aus `20260831120000_gate_pilot_room_creation.sql` wieder auf). `open_room_secure()` ist wie im ursprünglichen Laufdiktat nur pro Aufrufer ratenbegrenzt. Teilnehmer- und Raumtoken werden weiterhin niemals in QR-Codes oder Beitrittslinks aufgenommen.

## Unterstützte Pilotgeräte

- Aktuelle Versionen von Chrome/Edge, Firefox und Safari auf Desktop/Chromebook.
- Aktuelle iOS-Safari- und Android-Chrome-Versionen ab 320 CSS-Pixel Breite.
- Hoch- und Querformat; Eingaben mit Hardware- und Bildschirmtastatur.
- Die Oberfläche kann aus dem PWA-Cache starten. Live-Räume benötigen eine aktive Internetverbindung und eine konfigurierte Supabase-Verbindung.

## Bekannte Grenzen

- Kein persönliches Konto und keine langfristige Lernhistorie.
- Keine automatische Fehlerwiederholung nach der Runde.
- Wiederaufnahme ist an denselben Browsertab beziehungsweise dessen Sitzungsspeicher gebunden.
- Playwright-Emulation ersetzt keine Prüfung auf realen Schulgeräten.

## Unterrichtsbeobachtung

Für jede Pilotrunde werden ohne Schülerklarnamen notiert:

- Beitritt ohne zusätzliche Erklärung möglich: ja/nein.
- Zeit vom ersten Öffnen bis zur startbereiten Lobby.
- Gerät, Browser, Hoch-/Querformat und aufgetretene Verbindungsabbrüche.
- Notwendige Eingriffe der Lehrkraft und missverständliche Texte oder Aktionen.
- Erreichter Abschluss und beobachteter Wunsch nach Fehlerwiederholung.

## Rückfall

Der vollständige Vor-Pilot-Stand liegt am annotierten Git-Tag `pre-laufdiktat-pilot`. Ein Rückfall erfolgt als eigener Wiederherstellungsbranch; der Pilotbranch wird nicht destruktiv zurückgesetzt.
