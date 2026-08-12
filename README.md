# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Dieses Repository enthält den gemeinsamen Unterbau der Lernplattform: die schülerorientierte Startseite, stabile Moduleinstiege und den ersten versionierten Datenvertrag. Laufdiktat und LernBox bleiben bewusst als unabhängig entwickelbare Module angebunden.

## Lokal starten

```bash
npm install
npm run dev
```

## Prüfen

```bash
npm test
npm run lint
```

Die Architekturentscheidungen stehen in [docs/architecture.md](docs/architecture.md), der verbindliche Coding- und Bibliotheksstandard in [docs/engineering-quality.md](docs/engineering-quality.md) und die mobile Teststrategie in [docs/device-support.md](docs/device-support.md). Die vollständige fachliche Konzeption liegt derzeit unter `obsidian-export/Lernplattform`.
