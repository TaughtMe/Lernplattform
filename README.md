# Lernraum

Gemeinsam lernen, im Unterricht und zu Hause.

Lernraum verbindet das Laufdiktat im Unterricht mit dem persönlichen Weiterlernen: LernBox (Vokabeln), Wortspeicher (Rechtschreibung), Tastenwelt (Tastschreiben) und Häuser (Teampunkte, QR-Leistungsbrief). Die Oberfläche folgt dem Design „Lernraum UI" (warmes Anthrazit, Bernstein-Akzent, hell und dunkel, mobil und Desktop).

## Bereiche

| Pfad | Inhalt |
| --- | --- |
| `/` | Einstieg mit Tier und Raumcode |
| `/start` | Schülerdashboard mit Streak-Ring |
| `/lernen`, `/lernen/wortspeicher` | LernBox und Wortspeicher |
| `/raum?code=1234` | Laufdiktat für Schüler (Laufdiktat, Freie Übung, Battle, Stationen) |
| `/tastenwelt` | Tastschreibtraining |
| `/haus` | Häuser, Missionen, QR-Leistungsbrief |
| `/profil` | Tier, Klasse beitreten, Datensicherung |
| `/lehrer` | Lehrerbereich (lokale PIN): Inhalte, Räume, Auswertung, Häuser |

## Lokal starten

```bash
npm install
npm run dev
```

Für Live-Räume `.env.example` nach `.env.local` kopieren und die Supabase-Werte eintragen (siehe [supabase/README.md](supabase/README.md)). Ohne diese Werte laufen Räume im Demo-Modus.

## Prüfen

```bash
npm test          # Build, Domain-Tests, Render-Tests
npm run lint
npm run preview   # Produktions-Build lokal im Worker-Runtime
```

## Dokumentation

- [docs/architecture.md](docs/architecture.md) – Schnitt, Datenbereiche, Datenflüsse
- [docs/status.md](docs/status.md) – was umgesetzt ist, gefundene Probleme, offene Punkte aus dem Vault
- `obsidian-export/Lernplattform` – fachliche Konzeption
