# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Dieses Repository enthält den gemeinsamen Unterbau der Lernplattform: die schülerorientierte Startseite, stabile Moduleinstiege und den ersten versionierten Datenvertrag. Laufdiktat und LernBox bleiben bewusst als unabhängig entwickelbare Module angebunden.

## Lokal starten

```bash
npm install
npm run dev
```

Für Laufdiktat-Live-Räume (`/raum`, `/lehrer`) zusätzlich `.env.example` nach `.env` kopieren, ein Supabase-Projekt anlegen, die Migrationen unter `supabase/migrations/` anwenden und die Werte eintragen. Ohne das laden beide Seiten trotzdem, zeigen aber nur einen Hinweis statt echter Räume.

## Prüfen

```bash
npm test
npm run lint
```

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
