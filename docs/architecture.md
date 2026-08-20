# Architekturgrundlage

## Gewählter Schnitt

Lernraum wird als gemeinsame PWA mit einem geteilten fachlichen Kern aufgebaut. Die Oberfläche und die noch beweglichen Module bleiben voneinander getrennt:

- `app/` enthält Navigation, Seiten und rein visuelle Komponenten.
- `src/domain/` enthält versionierte, framework-unabhängige Verträge.
- `src/storage/` definiert getrennte lokale Datenbereiche und Speicheradapter.
- Laufdiktat und LernBox tauschen später ausschließlich `LearningBundleV1` und unveränderliche `LearningEventV1`-Ereignisse aus.

## Warum dieser Schnitt jetzt sinnvoll ist

Laufdiktat und LernBox werden noch weiterentwickelt. Eine direkte Zusammenführung ihrer internen Zustände würde deshalb unnötige Kopplung erzeugen. Stabilisiert werden zunächst nur die Grenzen: IDs, Paketversion, Ereignisse, Lernrichtungen und lokale Datenbereiche.

## Datenbereiche

1. **Persönlich:** Vokabeln, Lernereignisse, Projektionen und Einstellungen.
2. **Klasse:** veröffentlichte Inhaltspakete und pseudonyme Mitgliedschaften.
3. **Lehrer:** Klassenlisten, Namenszuordnungen und Abgabeprotokolle.

Kein Bereich erhält automatisch Zugriff auf einen anderen. Übertragungen verwenden ein explizites, versioniertes Format.

## Stand der LernBox-Integration

Die persönliche LernBox ist als erster funktionierender Kern umgesetzt, orientiert an `TaughtMe/LernBoxV2`:

- `src/domain/leitner.ts` überträgt die Regeln aus "06 - Lernlogik und Leitner-Boxen" (getrennter Auf-/Abstieg für Wissen und Schreiben, kein Aufstieg bei Hilfe/Selbstkorrektur, höchstens ein Aufstieg pro Runde) in reine, getestete Funktionen auf `LearningProgressV1`.
- `src/storage/indexeddb-repository.ts` implementiert `LocalRepositoryFactory` browserseitig über IndexedDB, ausschließlich für den Datenbereich `personal`.
- `src/domain/lernbox-service.ts` bündelt Stapel-/Vokabel-CRUD, die Fälligkeits-Warteschlange, das Verbuchen von Lernereignissen sowie Export/Import von `LearningBundleV1`-Dateien (Import ist global fingerprint-dedupliziert, bestehende Lernstände werden dabei nie überschrieben).
- `app/lernbox/` bindet das als Client-Komponente ein: Stapel anlegen, Vokabeln hinzufügen, in beiden Richtungen üben (Bedeutung und Schreiben getrennt abgefragt), als Datei sichern/wiederherstellen.

## Stand der Laufdiktat-Integration

Der klassische Laufdiktat-Modus (Wort ansehen → verdecken → aus dem Gedächtnis schreiben) ist unter `/raum` (Schüler) und `/lehrer` (Lehrkraft) angebunden, orientiert an `TaughtMe/Laufdiktat` (Live-Räume über Supabase Realtime + eine gesicherte Postgres-RPC-Schicht):

- `src/laufdiktat/` enthält die aus dem Referenzrepo portierte Logik: `room-api.ts` (RPC-Wrapper, 1:1 auf die mitkopierten Migrationen abgestimmt), `use-game-room.ts`/`use-dashboard-room.ts` (Presence, DB-autoritativer Resync, Heartbeat, Debounce gegen Broadcast-Fluten), sowie reine, getestete Utils (`check-answer.ts`, `scoring.ts`, `seeded-shuffle.ts`, `app-version.ts`).
- `supabase/migrations/` sind unverändert aus dem Referenzrepo übernommen (Raum-/Fortschrittstabellen, RLS-gehärtete `*_secure()`-Funktionen, Teilnehmer-Heartbeat).
- `public/animals/` (Tier-Avatare) und die Namensgenerierung sind mit übernommen.
- **Bewusst nicht übernommen** (siehe `src/types.ts`/Komponenten): Battle-Modus, Stationen-Modus, Mathe-Modus, QR-Scan, PWA-Update-Fortsetzung, Text-Theme. Diese bleiben vorerst Alleinstellungsmerkmale von `TaughtMe/Laufdiktat`.
- **Nicht live testbar in dieser Umgebung:** Es gab beim Portieren keinen Zugriff auf ein echtes Supabase-Projekt. Verifiziert wurden Build/Typecheck/Lint, alle reinen Utils per Unit-Test, sowie der komplette UI-Fluss im echten Browser gegen eine unerreichbare Platzhalter-Supabase-URL (kein Crash, sauberes Fehlerhandling, keine Hydration-Fehler) — dabei wurde ein echter Bug gefunden und behoben (verworfener Closure-Zustand beim Öffnen der Lobby direkt nach dem Wörter-Import). Der eigentliche Live-Raum-Betrieb (Presence, Realtime-Sync über mehrere Geräte) ist ungetestet und muss nach der Supabase-Einrichtung manuell geprüft werden.
- Lehrer-Authentifizierung ist laut Entscheidungsprotokoll weiterhin offen; `/lehrer` ist bis dahin nicht zusätzlich geschützt.

**Setup:** Supabase-Projekt anlegen, die SQL-Dateien unter `supabase/migrations/` in Dateinamen-Reihenfolge anwenden, `.env.example` nach `.env` kopieren und die Werte eintragen (siehe dort).

## Nächster fachlicher Schritt

Live-Raum-Betrieb nach der Supabase-Einrichtung manuell mit mindestens zwei Geräten durchspielen. Danach: Vokabelmodus im Laufdiktat (WordItem `kind: "vocabulary"` ist bereits vorbereitet) und die dublettenfreie Übergabe Laufdiktat → LernBox über `LearningBundleV1`. In der LernBox selbst fehlen noch eine sichtbare Box-/Fälligkeits-Übersicht pro Stapel sowie die persönliche Fehlerrunde „Meine Fehler jetzt üben“.
