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

## Nächster fachlicher Schritt

Als nächstes sollte `LearningBundleV1` mit realen Beispieldaten aus Laufdiktat und LernBox abgeglichen werden. Danach folgen ein IndexedDB-Adapter, Migrationsregeln und Tests für Dubletten, Ereignis-Idempotenz und die vier getrennten Lernstände.
