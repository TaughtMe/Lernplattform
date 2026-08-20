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
- **Vervollständigt:** `src/domain/leitner.ts` hat jetzt `minBox()` (schwächster der vier Tracks, als einfaches "wie gut sitzt das schon"-Signal). Die Stapelübersicht zeigt pro Stapel "N fällig"/"N auf Box 1", jede Vokabel im Stapel ihre aktuelle Box. Ein zweiter Übungsknopf „Meine Fehler jetzt üben" (`errorQueue()`) startet eine Runde nur mit Vokabeln, die auf mindestens einem Track noch auf Box 1 stehen — unabhängig vom regulären Fälligkeits-Rhythmus.

## Laufdiktat ↔ LernBox

Die im Architekturschnitt vorgesehene Übergabe ist umgesetzt, an der einzigen dafür vorgesehenen Stelle — `LearningBundleV1`:

- `src/laufdiktat/lernbox-bridge.ts`: `vocabularyWordsToBundle()` baut aus den `kind: "vocabulary"`-Wörtern einer Laufdiktat-Runde ein `LearningBundleV1` (reine Funktion, keine IndexedDB-Abhängigkeit, deshalb ohne Browser testbar).
- Lehrer-Dashboard: neuer Import-Tab „Vokabeln" (`Wort = Übersetzung`, mehrere Übersetzungen mit `/` getrennt) neben Text und Mathe.
- Schülerseite: Ist eine beendete Runde Vokabeln, erscheint auf dem Ergebnis-Screen „In meine LernBox übernehmen" — ruft `createLernBoxService(...).importBundle(...)` direkt im Browser auf, ganz ohne Supabase. Die globale Fingerprint-Deduplizierung aus der LernBox greift dabei unverändert: dieselbe Liste zweimal übernehmen (z. B. von zwei Geräten oder nach einer Wiederholungsrunde) erzeugt keine doppelten Vokabeln.
- Per End-to-End-Test (Bundle bauen → `importBundle` → erneut importieren) verifiziert, inklusive des Dedup-Falls.

## Stand der Laufdiktat-Integration

Der klassische Laufdiktat-Modus (Wort ansehen → verdecken → aus dem Gedächtnis schreiben) ist unter `/raum` (Schüler) und `/lehrer` (Lehrkraft) angebunden, orientiert an `TaughtMe/Laufdiktat` (Live-Räume über Supabase Realtime + eine gesicherte Postgres-RPC-Schicht):

- `src/laufdiktat/` enthält die aus dem Referenzrepo portierte Logik: `room-api.ts` (RPC-Wrapper, 1:1 auf die mitkopierten Migrationen abgestimmt), `use-game-room.ts`/`use-dashboard-room.ts` (Presence, DB-autoritativer Resync, Heartbeat, Debounce gegen Broadcast-Fluten), `use-battle-mode.ts`/`attack-candidates.ts` (Battle-Mechanik), `math-tasks.ts` (Aufgaben-Generator und -Parser), `build-hint.ts`/`strict-typing.ts` (Freies Üben, strenger Eingabemodus), sowie weitere reine, getestete Utils (`check-answer.ts`, `scoring.ts`, `seeded-shuffle.ts`, `app-version.ts`).
- `supabase/migrations/` sind unverändert aus dem Referenzrepo übernommen (Raum-/Fortschrittstabellen, RLS-gehärtete `*_secure()`-Funktionen, Teilnehmer-Heartbeat, inkl. Stationsnummer).
- `public/animals/` (Tier-Avatare) und die Namensgenerierung sind mit übernommen; QR-Beitritt (Kamera-Scan) und QR-Anzeige (Lehrer-Dashboard) sind mit `qr-scanner`/`qrcode.react` nachgebaut.
- **Alle vier Modi sind angebunden:** Laufdiktat (klassisch), Freies Üben (gestufte Hinweise über `buildHint`, danach Abtipp-Phase), Battle (Aufladebalken, Tinten-/Flimmer-Angriffe, Schild) und Stationen (`app/components/laufdiktat/station-game.tsx` — ein gemeinsam genutztes Tablet je Station statt persönlicher Geräte, Fortschritt über die `station-N`-Konvention aus den Migrationen). Dazu ein Mathe-Inhaltstyp (Generator + manuelle Eingabe, `+ − · :`) im Dashboard-Import.
- **Neu, über das Original hinaus:** Nach einer beendeten Runde kann ein Schüler mit „Nur meine Fehler üben“ die falsch beantworteten Aufgaben lokal in einer Übungsrunde wiederholen (Freies-Üben-Hinweise, ohne Server-Meldung an die Lehrkraft) — eine erste, einfache Umsetzung der gewünschten fehlerbasierten Übungszuordnung.
- **Bewusst nicht übernommen:** komplexe LaTeX-Mathe-Aufgaben (Brüche/Wurzeln/Potenzen, KaTeX-Rendering), Lückenaufgaben, Text-Vorlesen (TTS), PWA-Update-Fortsetzung nach Versions-Mismatch (Schüler muss manuell neu laden), Karaoke-Tippanzeige, Dark/Light-Theme.
- **Nicht live testbar in dieser Umgebung:** Es gab beim Portieren keinen Zugriff auf ein echtes Supabase-Projekt. Verifiziert wurden Build/Typecheck/Lint, alle reinen Utils per Unit-Test (Leitner-, Check-Answer-, Hint-, Mathe- und Angriffsziel-Logik), sowie mehrere UI-Flüsse im echten Browser gegen eine unerreichbare Platzhalter-Supabase-URL (Moduswahl, Mathe-Generator, QR-Scan-Overlay mit simulierter Kamera, Stationsmodus-Einstellungen — kein Crash, sauberes Fehlerhandling, keine Hydration-Fehler). Dabei wurden zwei echte Bugs gefunden und behoben: ein verworfener Closure-Zustand beim Öffnen der Lobby direkt nach dem Wörter-Import, und ein Zugriff auf einen Ref während des Renderns. Der eigentliche Live-Raum-Betrieb (Presence, Realtime-Sync über mehrere Geräte, Battle-Angriffe zwischen echten Mitschülern, Stationen-Tablets) ist ungetestet und muss nach der Supabase-Einrichtung manuell geprüft werden.
- Lehrer-Authentifizierung ist laut Entscheidungsprotokoll weiterhin offen; `/lehrer` ist deshalb bewusst **nicht mehr über die Kopfzeile verlinkt** (nur per direkter URL erreichbar) und bis zu einer Authentifizierungsentscheidung nicht zusätzlich geschützt.

**Setup:** Supabase-Projekt anlegen, die SQL-Dateien unter `supabase/migrations/` in Dateinamen-Reihenfolge anwenden, `.env.example` nach `.env` kopieren und die Werte eintragen (siehe dort).

### Selbstständiges Mathe-Üben ohne Raum

Unter `/mathe-ueben` (verlinkt von `/raum`) können Schüler ohne Raumcode und ohne Lehrkraft üben — läuft komplett lokal, braucht kein Supabase:

- `src/laufdiktat/adaptive-math.ts`: eine Schwierigkeitsleiter (`LEVELS`, aktuell 7 Stufen, von reiner Addition bis 0–100 mit allen vier Rechenarten) plus eine reine Zustandsübergangsfunktion `nextAdaptiveState()` — drei richtige Antworten in Folge stufen eine Stufe hoch, zwei falsche in Folge eine runter, Streaks werden dabei jeweils zurückgesetzt. Der Schwierigkeitsgrad orientiert sich damit laufend am Leistungsstand der Schülerin/des Schülers, ohne dass irgendein Fortschritt serverseitig gespeichert wird.
- `app/components/laufdiktat/self-practice.tsx`: „Automatisch, passend zu deinem Können" (adaptiv) oder „Eigene Aufgaben erstellen" (derselbe Generator wie im Lehrer-Dashboard, frei wählbare Rechenarten und Zahlenraum) — jeweils mit fester Anzahl (10/20/30) oder unbegrenzt mit jederzeitigem „Beenden".
- Vollständig im echten Browser verifiziert (kein Supabase nötig): Stufenanstieg bei Serien richtiger Antworten geprüft (1→1→1→2→2→2→3→3→3→4), manueller Generator mit eingeschränkten Rechenarten erzeugt nur passende Aufgaben, unbegrenzter Modus zählt im Abschluss nur tatsächlich beantwortete Aufgaben (ein Zähl-Bug wurde dabei gefunden und behoben). 8 zusätzliche Unit-Tests für die Stufenlogik.

## Nächster fachlicher Schritt

Live-Raum-Betrieb nach der Supabase-Einrichtung manuell mit mindestens zwei Geräten durchspielen. In Laufdiktat fehlen noch: komplexe Mathe-Aufgaben (Brüche/Wurzeln/Potenzen), Lückenaufgaben, Vorlesen, automatische Update-Fortsetzung, Karaoke-Tippanzeige, Dark/Light-Theme (siehe "Stand der Laufdiktat-Integration").
