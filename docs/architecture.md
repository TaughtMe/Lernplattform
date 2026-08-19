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

## Nächster fachlicher Schritt

Als Nächstes: reale Beispieldaten aus dem Laufdiktat gegen `LearningBundleV1` gegenprüfen, den Vokabelmodus im Laufdiktat entwickeln und die dublettenfreie Übergabe Laufdiktat → LernBox darauf aufsetzen. In der LernBox selbst fehlen noch eine sichtbare Box-/Fälligkeits-Übersicht pro Stapel sowie die persönliche Fehlerrunde „Meine Fehler jetzt üben“.
