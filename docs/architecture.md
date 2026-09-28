# Architekturgrundlage

## Schnitt

Lernraum ist eine gemeinsame App (vinext/Next-App-Router, Cloudflare Worker) mit einem framework-unabhängigen fachlichen Kern:

- `app/` – Seiten, Komponenten, React-Hooks. Client-Komponenten lesen und schreiben ausschließlich über `app/hooks/use-stored.ts`.
- `app/lib/` – Browser-Anbindungen: Supabase-Client, Raum-RPCs (`room-api.ts`), Sprachausgabe.
- `src/domain/` – reine, getestete Logik ohne React/Next: Lernvertrag (`learning-bundle.ts`), Leitner-Regeln (`leitner.ts`), Diktat-Werkzeuge (`dictation.ts`), Tastenwelt (`typing.ts`), Häuser und Leistungsbrief (`houses.ts`), Einschreibung (`enrollment.ts`).
- `src/storage/` – lokale Datenbereiche (`local-store.ts`), persönliche Daten (`personal.ts`), Lehrerdaten (`teacher.ts`), abgeleitete Werte (`selectors.ts`).
- `supabase/migrations/` – Raum-Schema, identisch mit dem Laufdiktat-Repo.

## Datenbereiche (lokal, strikt getrennt)

1. **Persönlich** (`lernraum:personal:v1:*`): Profil, Stapel, Lernstände, Wortspeicher, Tastenwelt, Hauspunkte, Aktivität, Design.
2. **Klasse** (`lernraum:classes:v1:*`): reserviert für veröffentlichte Klasseninhalte.
3. **Lehrer** (`lernraum:teacher:v1:*`): Klassen, Inhalte, Ergebnisse, Klassenbriefkasten, PIN-Hash.

Kein Bereich liest automatisch einen anderen. Übergaben laufen über explizite Formate: Raumkonfiguration (`rooms.config`), QR-Leistungsbrief (`LR1.…`), Einschreibe-Code (`LRK1:…`), Sicherungsdatei.

## Datenflüsse

| Fluss | Weg | Inhalt |
| --- | --- | --- |
| Unterricht live | Supabase (RPC + Realtime `room-<code>`) | Aufgaben der Sitzung, Tiername, Fortschritt, Fehlerwörter – flüchtig, Raum wird beendet/aufgeräumt |
| Fehler → Weiterlernen | lokal auf dem Schülergerät | Fehlerwörter in den Wortspeicher, Vokabeln in die LernBox (Einstellung „alle / nur Fehler / keine") |
| Teampunkte | QR ohne Netzwerk (Air-Gap) | aggregierte Wochenwerte, Standnummer |
| Sicherung | Datei | kompletter persönlicher Bereich |

## Nächste technische Schritte

Siehe [status.md](status.md): Signatur für Leistungsbriefe, individuelle Einschreibung, IndexedDB-Adapter, Service Worker, verschlüsselte Sicherung, Ereignisprotokoll `LearningEventV1`.
