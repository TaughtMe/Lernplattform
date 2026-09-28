# Supabase – Live-Räume

Die Migrationen stammen unverändert aus [TaughtMe/Laufdiktat](https://github.com/TaughtMe/Laufdiktat/tree/main/supabase/migrations).
Lernraum und das bestehende Laufdiktat verwenden **dasselbe Schema und dieselben RPCs**
(`open_room_secure`, `join_room_secure`, `update_session_secure`, `upsert_progress_secure`,
`get_room_students_secure`, …) sowie denselben Realtime-Kanal `room-<code>`.
Ein bereits für das Laufdiktat eingerichtetes Supabase-Projekt kann daher direkt weiterverwendet werden.

## Einrichten

1. Supabase-Projekt anlegen (oder das Laufdiktat-Projekt wiederverwenden).
2. Migrationen in Reihenfolge anwenden: `supabase db push` oder die SQL-Dateien im SQL-Editor ausführen.
3. Aufräumen alter Räume planen (`select cleanup_abandoned_rooms()` per pg_cron, siehe `20260706130000_progress_and_cleanup.sql`).
4. In `.env.local` (lokal) bzw. in den Umgebungsvariablen des Hostings setzen:

```
NEXT_PUBLIC_SUPABASE_URL=https://<projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Die Variablen werden beim Build eingesetzt – nach Änderungen neu bauen.

## Was über Supabase läuft – und was nicht

- **Ja:** Raum, Raumcode, Aufgabenliste der laufenden Sitzung, Tiername im Raum, Fortschritt (Abschnitt, Fehler, Spicker), Fehlerwörter je Sitzung. Räume werden beendet bzw. nach 3 Stunden Inaktivität aufgeräumt.
- **Nein:** persönliche LernBox, Wortspeicher, Tastenwelt, Hauspunkte, Profil. Diese bleiben local-first auf dem Gerät (Entscheidungsprotokoll Nr. 2).
