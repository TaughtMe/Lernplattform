# Laufdiktat-Pilot: Betrieb und Pilotbeobachtung

## Pilotfreigabe provisionieren

Die Migration `20260831120000_gate_pilot_room_creation.sql` sperrt neue Räume zunächst vollständig. Ein Betreiber legt den Freigabecode ausschließlich in der Supabase-SQL-Konsole an; der Klartext gehört weder ins Repository noch in Browser-Umgebungsvariablen:

```sql
insert into private.teacher_pilot_keys (label, token_hash)
values ('begleiteter Pilot', encode(extensions.digest('<starken Freigabecode einsetzen>', 'sha256'), 'hex'));
```

Nach dem Pilot wird der Schlüssel mit `active = false` deaktiviert. Schüler-, Lehrkraft- und Freigabetoken werden niemals in QR-Codes oder Beitrittslinks aufgenommen.

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
