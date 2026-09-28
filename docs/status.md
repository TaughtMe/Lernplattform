# Stand und offene Punkte (Audit Repo + Vault)

Stand: 28.09.2026 · Grundlage: `obsidian-export/Lernplattform` (Kapitel 00–20, besonders 17 Entwicklungsplan, 18 Aufgabenübersicht, 19 Entscheidungsprotokoll) und das UI-Design „Lernraum UI" (Turns 1–7).

## 1. Umgesetzt mit diesem Stand

| Bereich | Screens (Design) | Was funktioniert |
| --- | --- | --- |
| Einstieg | 2a Landing | Tier, 4-stelliger Raumcode, QR-Scan (BarcodeDetector), Lehrer-Login |
| Schülerdashboard | 2b, 3a, 3b | Streak-Ring aus echten Tagesdaten, Wochenleiste, fällige Karten, schwierige Wörter, Abzeichen, hell/dunkel |
| Profil | (2-Notiz) | Tier tauschen (60 Tiere), Haus, **Klasse per Einschreibe-QR beitreten**, Datensicherung als Datei + Wiederherstellung |
| LernBox | 4a–4c | Stapel, 5 Boxen, Schreiben/Mündlich, beide Richtungen, getrennte Lernstände „gewusst"/„geschrieben", zweite Chance („Ja, Box bleibt"), höchstens ein Aufstieg pro Runde, kurzfristige Wiederholung, **„Meine Fehler jetzt üben"**, eigener Stapel anlegen, Sprachausgabe |
| Wortspeicher | 4d–4f | 6 Rechtschreib-Sammlungen, hören + Lückensatz + Tipp, Groß-/Kleinschreibung zählt, Buchstabenvergleich, „Verdeckt neu schreiben" (erzwungener verdeckter Abruf nach Fehler), Wortliste mit Filter/Bearbeiten/Löschen/Hinzufügen |
| Laufdiktat Schüler | 5a, 5b | Beitritt per Code, Lobby, Zwei-Finger-Halten → Lesen → Schreiben, Freie Übung mit Buchstaben-Hilfe, **Battle mit Ladung, Tinte, Flimmern, Schild**, Stationsmodus mit Schülernummern, Fortschritt/Resync über Supabase, Fehlerwörter → Wortspeicher bzw. LernBox |
| Laufdiktat Lehrkraft | 5c, 5d | 4 Schritte (Diktat → Modus → Lobby → Live), Text/Vokabeln, Teilen nach Satz/Zeile/Wort, Datei-Import, 4 Modi mit Optionen, QR + Code, Teilnehmende (online/getrennt, entfernen), Live-Fortschritt, Stationsraster, häufigste Fehler, CSV, Ergebnis wird abgelegt |
| Lehrerbereich | 1d, 2c, 3c, 3d | Lokale Lehrer-PIN, Klassen anlegen/wechseln, Inhalte Text/Mathe-Generator/Vokabeln anlegen, bearbeiten, ablegen, öffnen, Auswertung mit Löschfunktion |
| Tastenwelt | 6a–6c | Lernweg mit 10 Stationen, Übung mit echter Tastatur (ISO/kleine Enter-Taste), Fingerfarben, nächste Taste, Fehler-Stopp, Tier-Coach, Serie, XP, Sterne, Heatmap unsicherer Tasten, Tasten-Extra, mobile Variante mit Bildschirmtastatur, Tagesziel 10 Minuten |
| Mein Haus | 7a–7c | Türme (1 Stock = 50 Punkte pro Kopf), Tageslimit 150, Missionen, **QR-Leistungsbrief** mit Freigabe-Chips und fortlaufender Standnummer; Lehrkraft: fortlaufender Scanmodus (Ton/Vibration/grüner Rahmen), neu/aktualisiert/doppelt/veraltet/klassenfremd/ungültig, Beamer-Ansicht, Einschreibe-QR, Protokoll löschen |

Supabase: siehe [supabase/README.md](../supabase/README.md). Ohne Konfiguration laufen Raum-Screens im Demo-Modus (Schüler: Beispieltext, Lehrkraft: simulierte Klasse).

## 2. Probleme, die beim Durchgehen aufgefallen sind

1. **Client-Navigation war im ursprünglichen Repo defekt.** `vinext 1.0.0-beta.2` warf beim Klick auf jeden `<Link>` „e is not a function" (auch auf dem alten Stand reproduziert). Behoben durch Update auf `vinext 1.0.0` + `@vitejs/plugin-rsc 0.5.35`. Folge: Der Build ist jetzt ein reiner Cloudflare-Worker; `npm start`/`npm run preview` nutzen `vite preview` (workerd), die HTML-Tests laufen mit einem Stub für `cloudflare:workers` (`tests/cloudflare-stub.mjs`).
2. **Raumcode-Format:** Das Design zeigt „4K2P" (alphanumerisch), das Supabase-Schema erlaubt nur `^[0-9]{4}$`. Umgesetzt ist der numerische Code, damit Laufdiktat und Lernraum dieselbe Datenbank nutzen können.
3. **Entscheidungsprotokoll Nr. 2 vs. Supabase:** Dort steht, dass es in Version 1 *keine permanente* Schüler-Lehrer-Synchronisation über Supabase gibt. Umgesetzt ist nur der flüchtige Live-Raum des Laufdiktats (Tiername, Fortschritt der laufenden Sitzung, Aufräumen nach Raumende). Persönliche Lernstände verlassen das Gerät nie – ein Test prüft, dass `room-api.ts` nicht auf den persönlichen Speicher zugreift. Bitte trotzdem im Vault festhalten, dass der Live-Raum als „temporäre Klassenansicht" (Kapitel 13) gilt.
4. **Leistungsbrief ist nicht signiert/verschlüsselt.** Beschlossen ist ein verschlüsselter und signierter Brief (Nr. 4). Umgesetzt: versioniertes Format, Prüfsumme, Standnummer, klassenfremd-Erkennung. Offen: Geräteschlüssel beim Einschreiben erzeugen, Brief signieren, Lehrergerät prüft Signatur.
5. **Einschreibung vereinfacht.** Der Einschreibe-QR ist klassenweit (Klasse + Haus), nicht individuell je Schüler; die Mitgliedschafts-ID erzeugt das Schülergerät. Offen: individuelle Codes, Kopplung an Geräteschlüssel, Zweitgerät nur mit Lehrerbestätigung.
6. **Lehrer-Authentifizierung nur lokal (PIN, SHA-256 + Salt).** Schützt den Lehrerbereich auf geteilten Geräten, ist aber kein Konto. Die Supabase-RPCs zum Öffnen von Räumen sind (wie im Laufdiktat) anonym, geschützt durch Rate-Limit und Access-Token.
7. **Hausstand auf Schülergeräten ist ein Beispielstand.** Wegen Air-Gap (Nr. 5) haben Schüler keinen Rückkanal; der echte Stand steht in der Beamer-Ansicht der Lehrkraft. Missionen sind teils Beispielwerte.
8. **`app/chatgpt-auth.ts` und `.openai/hosting.json`** stammen aus der ursprünglichen Hosting-Vorlage und werden nicht verwendet. `worker/index.ts` hat bestehende TypeScript-Fehler (`Fetcher`, `D1Database` ohne `@cloudflare/workers-types`).
9. **Speicher:** localStorage statt IndexedDB (Konzept 14/15). Für die aktuelle Datenmenge ausreichend; der Adapter ist in `src/storage/local-store.ts` gekapselt und kann ersetzt werden.

## 3. Noch fehlende Funktionen aus dem Vault

**Vokabel-Kern (Kapitel 03, 05, 06, 18 „Jetzt")**
- Tags und Stapel-Verwaltung (umbenennen, löschen, Tags filtern)
- Tagesauswahl über alle Quellen („Heute lernen" bündelt fällige, schwierige und zuletzt fehlerhafte Inhalte)
- Ereignisprotokoll `LearningEventV1` wird noch nicht persistiert (Boxlogik arbeitet direkt auf dem Lernstand)
- Übergabe Laufdiktat → LernBox nutzt noch keine stabilen Lehrer-IDs über mehrere Sitzungen hinweg (nur je Sitzung dublettenfrei)
- Testmodus mit Auswertung „ohne direktes Feedback"

**Lernwörter (Kapitel 07, 18 „Danach")**
- Fünf Merkstufen (abschreiben → Lücken → verdeckt → Blöcke) getrennt von der Leitner-Box
- 5.000-Punkte-Wertung, Merkbonus, Sterne pro Wort
- Rechtschreibphänomen-Erkennung ist nur eine Heuristik (`spellingSetFor`), keine echte Fehleranalyse

**Plattform (Kapitel 01, 04, 13, 14, 16)**
- PWA-Offlinebetrieb (Service Worker, Caching) – das Manifest ist vorhanden, ein Service Worker nicht
- Verschlüsselter Export und optionales Cloud-Backup (WebDAV/OneDrive …); aktuell unverschlüsselte JSON-Sicherung
- Namenszuordnung Tier ↔ Klarname nur lokal beim Lehrer (bewusst noch nicht umgesetzt; rechtlich zu prüfen)
- Löschfristen automatisch (derzeit manuelles Löschen)

**Weitere Module**
- Duelle (Kapitel 09) – Seite ist Platzhalter, Battle im Raum ist nutzbar
- Mathe über Kompetenz-IDs und Aufgabenfamilien (Kapitel 18 „Langfristig"); vorhanden ist der Generator + − · : und Mathe im Laufdiktat
- Barrierefreiheit systematisch testen (Screenreader-Durchgang, Kontraste im Dunkelmodus)

## 4. Offene Entscheidungen (aus Kapitel 18)

- Abzüge für Selbstkorrekturen, Fehlversuche und Hilfen
- Grenzen des Merkbonus, Regeln für Rückstufung bei Lernwörtern
- Umfang der ersten festen Lernwortlisten
- Erstes produktives Minimum endgültig abgrenzen
- Neu: alphanumerische Raumcodes (Schemaänderung) ja/nein
