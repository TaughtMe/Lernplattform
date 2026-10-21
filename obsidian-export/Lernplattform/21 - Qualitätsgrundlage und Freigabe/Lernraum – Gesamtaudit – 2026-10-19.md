---
tags:
  - lernplattform
  - audit
  - qualität
status: abgeschlossen
stand: 2026-10-20
prüfstand: c30b916
bericht: docs/audits/2026-10-19-lernraum-gesamtaudit.md
---

# Lernraum – Gesamtaudit – 2026-10-19

> **Maßgeblich ist der Abschlussbericht im Repository:** `docs/audits/2026-10-19-lernraum-gesamtaudit.md`. Diese Notiz fasst ihn für den Vault zusammen. Alle Empfehlungen sind **Vorschläge zur Prüfung**. Sie ändern keine Entscheidung im [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]], solange die projektverantwortliche Lehrkraft sie nicht beschließt.

## 1 Datum, Ziel und Prüfstand

- **Zeitraum:** 19. und 20.10.2026
- **Prüfstand:** Commit `c30b916`, Branch `claude/gallant-mayer-2rz18j`, App-Version 0.8.0
- **Ziel:** unabhängige, kritische Gesamtbewertung von Technik, Sicherheit und Datenschutz, Bedienbarkeit, Barrierefreiheit, Pädagogik, Schulpraxis und Produktstrategie; Abgleich von Konzept (Vault, `docs/`) und Code; Aufbereitung der Dokumentation.
- **Rahmen:** nur lesend. Kein Anwendungscode, keine Konfiguration und keine verbindliche Entwicklungsanweisung wurden verändert. Kein Zugriff auf Produktivsysteme. Keine Rechtsberatung.

## 2 Beteiligte Prüfinstanzen

| Instanz | Schwerpunkt | Befunde |
| --- | --- | --- |
| A | Architektur, Codequalität, Wartbarkeit | 18 |
| B | Sicherheit, Datenschutz, Offline, Datenverlust | 24 |
| C | QA, Bedienbarkeit, Barrierefreiheit (Browser) | 15 |
| D | Pädagogik, Lernwissenschaft, Diagnostik | 16 |
| E | Schularten, Differenzierung, Unterrichtspraxis | 10 |
| G | Funktionale Korrektheit der Lernlogik | 14 |
| F | Red Team: Gegenprüfung aller P1-Befunde, Widersprüche, Grundsatzfragen | 2 neue |
| Hauptinstanz | Steuerung, eigene Tests und Stichproben, Konsolidierung, Dokumentation | – |

## 3 Untersuchte Bereiche

Alle 24 Funktionsbereiche dieses Vaults und die Dokumente in `docs/`; im Code `src/domain`, `src/storage`, `src/integrations`, `src/speech`, `src/tastschreiben`, `app/` und `supabase/` (Migrationen, RPCs, Rechte). Der Abgleich Konzept ↔ Code steht als Statushinweis in jeder Bereichsnotiz und als Tabelle in [[../00 - Übersicht|Übersicht]].

## 4 Durchgeführte Tests und Ergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| `npm run check` | grün: 1 683 Tests; Abdeckung 96,1 % – gemessen nur für `src/`, mit `app/` 78,7 % Zeilen |
| Browser-Suite in Chromium (Entwicklungsserver) | 346 bestanden, 30 übersprungen, keine Produktfehler |
| Live-Tests `e2e/live` (abgefangene Supabase-Aufrufe) | 68 bestanden, 7 vorgesehen übersprungen |
| Reproduktionen der Prüfinstanzen | rund 80 eigene Scratch-Tests und Skripte, 26 Seiten und 32 Zustände im Browser, axe-core ohne Verstoß |
| Nicht möglich | WebKit/iPad, Produktionsbuild im Browser, Produktivsysteme, Nutzerstudie, Wirksamkeitsmessung |

## 5 Wichtigste Befunde

Nach der Gegenprüfung: 97 Befunde der Fachprüfungen und 2 neue des Red Teams, davon **0 × P0, 12 × P1, 60 × P2, 27 × P3**. Drei der P1 sind Konzeptlücken, zwei P1-Paare beschreiben je dieselbe Ursache. Keine P1-Behauptung wurde widerlegt; fünf wurden in der Schwere gesenkt, drei Paare zusammengeführt.

1. **Falscher Lernstand im Kernmodul Rechtschreibung:** Abschreiben zählt als Abruf und hebt Box und Merkstufe; Lernwörter steigen ohne Fälligkeit; richtige Stufe-5-Antworten mit Leerzeichen gelten als dreifacher Fehler; „Wort zeigen“ schützt besser als ein ehrlicher Versuch (A-004, D-001, G-001, F-001). Abweichung von [[../06 - Lernlogik und Leitner-Boxen/Anwendung|Lernlogik und Leitner-Boxen]].
2. **Datensicherung und Datenhaltung:** Die Sicherung bricht ab, sobald LernBox-Ordner genutzt werden (B-001); strikte Datenverträge machen Schemaänderungen riskant (A-001); keine Maßnahme gegen Speicherlöschung unter iPadOS/Safari (B-002).
3. **Ein Gerät ist eine Person:** keine Trennung mehrerer Kinder; die Schreiberleichterung gilt für das Gerät (B-010, E-001). Schwere hängt von der Geräteausstattung ab.
4. **Rechtsrahmen und Schutz:** Impressum untersagt den laufenden Einsatz, AVV, Verzeichnis und Freigabe fehlen (B-011); Lehrerdaten auf geteilten Geräten ungeschützt (B-009).
5. **Konzeptlücken:** keine Diagnostik (D-003), Lehrkraft kann außer Vokabeln nichts zuweisen (E-002) und erfährt fast nichts über Lernstände (E-003).
6. **Stärken:** sauber isolierter Fachkern, sorgfältige Supabase-Seite mit Fähigkeitsmodell, Tiere statt Namen, keine Telemetrie, technisch sehr gute Barrierefreiheit, unterrichtstaugliches Live-Laufdiktat, druckarme Motivation.

## 6 Kritische Risiken

- **Stille Fehlbewertung** von Lernständen, die weder Kind noch Lehrkraft sehen können.
- **Datenverlust ohne Abhilfe** durch eine Sicherung, die ohne Ursache und Ausweg scheitert, durch Speicherlöschung (vor allem in Safari statt Home-Bildschirm) oder durch Zurücksetzen beim Abgleich (G-010).
- **Sensible Informationen an falscher Stelle:** LRS-Freigabe lesbar im Einschreibe-QR (B-008), Klarnamen im ungeschützten Lehrerbereich, automatische CSV auf dem Tafelrechner.
- **Zulässigkeit** des laufenden Einsatzes ungeklärt (rechtlich zu prüfen).
- **Ein-Personen-Abhängigkeit** bei 61 000 Zeilen und einem jungen Framework (A-007, A-017).

## 7 Empfehlungen (Vorschläge zur Prüfung)

- **Weiterverfolgen:** Local-first ohne Schülerkonten, Live-Laufdiktat mit Übernahme, LernBox.
- **Überarbeiten:** Merkstufen-Bewertung, Textbox als Diktat, Kopfrechnen, Tagesportion, Lehrerbereich, Schreiberleichterung (durch neutrale Übungsanpassungen ersetzen).
- **Einfrieren:** Geräte-Abgleich der Lehrkraft, Häuser, Duell, Ramagotchi, neue Module.
- **Nicht entwickeln:** Eingangstest und eigene LRS-/Dyskalkulie-Diagnostik, Ranglisten, KI-generierte Übungstexte ohne Prüfung, eigener Server für Lehrerkonten.
- **Diagnostik:** zuerst Datenvalidität, dann ehrlicher Beherrschungsstand; für Lernverlaufsdiagnostik bestehende, validierte Werkzeuge (z. B. Levumi) nutzen.

## 8 Offene Fragen

- Welche Geräteausstattung hat die Pilotklasse (1:1, Klassensatz, Koffer)? Davon hängt die Schwere von B-010/E-001 ab.
- Wie viele Kinder und Lehrkräfte nutzen Lernraum derzeit, mit Klarnamen oder LRS-Haken?
- Supabase-Betrieb: Tarif, Pausierung in den Ferien, Region, Kontingente, Überwachung (B-020)?
- **Rechtlich zu prüfen** (behördliche Datenschutzbeauftragte, Schulleitung): Wer ist Verantwortlicher? AVV mit Supabase und Cloudflare? Ist das LRS-Merkmal eine besondere Kategorie? Ist eine DSFA erforderlich?
- Welche Zielgruppe gilt für Version 1 (Vorschlag: Jgst. 3–6 und Basisförderung, LernBox für alle)?
- Ereignisquelle vollständig umsetzen oder ehrlich als Protokoll führen (A-003)?
- Verhalten auf echten iPads (Speicher, Autokorrektur, Druck aus Safari) ist nicht geprüft.

## 9 Entscheidungen zur Dokumentation

- Überholte Inhalte werden **gekennzeichnet, nicht gelöscht**. Historische Abschnitte bleiben erhalten.
- Jede Bereichsnotiz trägt die Eigenschaft `umsetzungsstand` (Implementiert, Teilweise implementiert, Geplant, Vorgeschlagen, Überholt, Ungeklärt) und einen datierten Hinweis mit Belegen.
- Audit-Empfehlungen werden nicht als Aufgaben in [[../17 - Entwicklungsplan/Anwendung|Entwicklungsplan]] oder [[../18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]] eingetragen.
- Das Entscheidungsprotokoll bleibt unverändert; Gültigkeit und Audit-Hinweise stehen im [[../19 - Entscheidungsprotokoll/Entscheidungsindex|Entscheidungsindex]].
- Der verbindliche Standard `docs/engineering-quality.md` und `AGENTS.md` bleiben unverändert; Abweichungen sind im Bericht benannt.

## 10 Strukturänderungen im Vault

- **Neu:** diese Notiz; [[../19 - Entscheidungsprotokoll/Entscheidungsindex|Entscheidungsindex]].
- **Ergänzt:** [[../00 - Übersicht|Übersicht]] (Block „Projektstand auf einen Blick“, Hinweise bei „Offene Entscheidungen“ und „Aktuelle Priorität“); 24 Bereichsnotizen `Anwendung.md` (Eigenschaften und Statushinweis).
- **Nicht verändert:** Ordnerstruktur, Dateinamen, bestehende Wikilinks, Obsidian-Konfiguration. Keine Notiz gelöscht.

## 11 Links zum vollständigen Bericht

- Abschlussbericht: `docs/audits/2026-10-19-lernraum-gesamtaudit.md` (maßgeblich)
- Befundkatalog mit allen Feldern: `docs/audits/2026-10-19-gesamtaudit/befundkatalog.md`
- Prüfberichte A–G und Arbeitsstand: `docs/audits/2026-10-19-gesamtaudit/`
- Dokumentationsindex: `docs/README.md`

## 12 Priorisierte nächste Schritte (Vorschlag zur Prüfung)

1. **Einsatzrahmen klären** mit Schulleitung und behördlicher Datenschutzbeauftragter; bis dahin keine Klarnamen und LRS-Haken im Echtbetrieb.
2. **Lernwort-Regeln und Stufe 5 korrigieren**, in derselben Änderung die Übungsmenge sichtbar machen (A-004, D-001, F-001, G-001).
3. **Sicherung reparieren**, Strukturtest, danach tolerantes Lesen (B-001, A-001).
4. **Speicherschutz:** Installation vor dem ersten Lernen, Wiederherstellung auf leerem Gerät (B-002).
5. **Beobachtungsphase und Gerätemodell:** vier Wochen datensparsam beobachten (Gerätezählung, Installation, Sicherungen), dann das Gerätemodell entscheiden – feste Zuordnung, Profile je Kind oder bei Koffer-iPads ein verschlüsselt mit dem Kind reisender Lernstand (B-010, E-001; Bericht M.8).
6. Danach: Antwortprüfung vereinheitlichen, Inhaltsfehler beheben, Fehlerwörter je Tier für die Lehrkraft, Auftrags-QR für Lernwörter, Abbruchdialog.

Die vollständige Roadmap mit Abhängigkeiten steht im Bericht, Abschnitt J.

## Änderungsprotokoll

| Datum | Änderung |
| --- | --- |
| 2026-10-20 | Notiz angelegt (Gesamtaudit vom 19./20.10.2026). |
