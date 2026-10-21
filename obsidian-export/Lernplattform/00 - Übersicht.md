---
tags:
  - lernplattform
  - projektübersicht
  - bildung
status: prototyp
stand: 2026-10-20
audit: "[[Lernraum – Gesamtaudit – 2026-10-19]]"
---

# Lernplattform – Gesamtübersicht

## Projektstand auf einen Blick (Stand: 20.10.2026)

> Ergänzt beim [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Gesamtaudit vom 19./20.10.2026]]. Dieser Abschnitt fasst den im Code belegten Umsetzungsstand zusammen. Die übrigen Abschnitte dieser Seite beschreiben unverändert das Konzept. Empfehlungen des Audits sind **Vorschläge zur Prüfung**, keine Entscheidungen.

**Statuslegende:** Implementiert · Teilweise implementiert · Geplant · Vorgeschlagen · Überholt · Ungeklärt. Jede Bereichsnotiz trägt die Eigenschaft `umsetzungsstand` und unter der Überschrift einen Hinweis mit Belegen.

### Zentrale Einstiege

| Thema | Wo |
| --- | --- |
| Vision und pädagogischer Kern | Abschnitt „Leitidee“ unten; [[22 - Adaptiver Lernkreislauf/Anwendung\|Adaptiver Lernkreislauf]] |
| Architektur | Repository: `docs/architecture.md`, Übersicht aller Dokumente in `docs/README.md`; [[15 - Gemeinsames Datenmodell/Anwendung\|Gemeinsames Datenmodell]] |
| Module | Tabelle „Umsetzungsstand der Bereiche“ unten |
| Diagnostik und Kompetenzmodell | **Ungeklärt:** im Konzept ([[22 - Adaptiver Lernkreislauf/Anwendung\|22]], [[07 - Adaptive Merkstrecke/Anwendung\|07]]) beschrieben, im Code nicht vorhanden |
| Roadmap | [[17 - Entwicklungsplan/Anwendung\|Entwicklungsplan]] (Stand 29.09.2026); priorisierte Roadmap des Audits als Vorschlag zur Prüfung im [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19\|Auditprotokoll]] |
| Entscheidungen | [[19 - Entscheidungsprotokoll/Anwendung\|Entscheidungsprotokoll]] und [[19 - Entscheidungsprotokoll/Entscheidungsindex\|Entscheidungsindex]] (Gültigkeit, Umsetzung, Audit-Hinweise) |
| Risiken | [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19\|Auditprotokoll]] (Abschnitt Risiken); Repository: `docs/security-risk-register.md` |
| Qualität und Audits | [[21 - Qualitätsgrundlage und Freigabe/Anwendung\|Qualitätsgrundlage und Freigabe]]; [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19\|Gesamtaudit 2026-10-19]]; maßgeblicher Bericht im Repository: `docs/audits/2026-10-19-lernraum-gesamtaudit.md` |

### Umsetzungsstand der Bereiche

| Bereich | Stand | Wichtigste Einschränkung |
| --- | --- | --- |
| [[01 - Plattform und Navigation/Anwendung\|Plattform und Navigation]] | Teilweise implementiert | Oberfläche durch Entscheidung 48 teilweise überholt |
| [[02 - Laufdiktat und Unterrichtsraum/Anwendung\|Laufdiktat und Unterrichtsraum]] | Implementiert | Lernstandscheck entfallen |
| [[03 - Persönliche LernBox/Anwendung\|Persönliche LernBox]] | Teilweise implementiert | getrennte Stände je Richtung fehlen |
| [[04 - Lehrer-Cockpit/Anwendung\|Lehrer-Cockpit]] | Teilweise implementiert | nur Vokabeln zuweisbar, kaum Rückmeldung |
| [[05 - Vokabeln, Stapel und Tags/Anwendung\|Vokabeln, Stapel und Tags]] | Teilweise implementiert | Übernahme aus Duellen geplant |
| [[06 - Lernlogik und Leitner-Boxen/Anwendung\|Lernlogik und Leitner-Boxen]] | Teilweise implementiert | Lernwörter weichen von den Regeln ab |
| [[07 - Adaptive Merkstrecke/Anwendung\|Adaptive Merkstrecke]] | Teilweise implementiert | keine automatische Anpassung |
| [[08 - Übungs- und Testmodi/Anwendung\|Übungs- und Testmodi]] | Teilweise implementiert | Kontext- und Lückensätze geplant |
| [[09 - Duelle/Anwendung\|Duelle]] | Geplant | Platzhalter, Freigabe `aus` |
| [[10 - Häuser, Punkte und Motivation/Anwendung\|Häuser, Punkte und Motivation]] | Teilweise implementiert | gebaut, aber ausgeschaltet |
| [[11 - QR-Auswertung und Visualisierung/Anwendung\|QR-Auswertung und Visualisierung]] | Teilweise implementiert | Ranking-Leistungsbrief geplant |
| [[12 - Inhaltsübertragung und Synchronisation/Anwendung\|Inhaltsübertragung und Synchronisation]] | Implementiert | nur Vokabelpakete |
| [[13 - Datenschutz und Rollen/Anwendung\|Datenschutz und Rollen]] | Teilweise implementiert | Rechtsrahmen ungeklärt |
| [[14 - Lokale Daten, Export und Cloud-Backup/Anwendung\|Lokale Daten, Export und Cloud-Backup]] | Teilweise implementiert | Sicherung mit Ordnern defekt |
| [[15 - Gemeinsames Datenmodell/Anwendung\|Gemeinsames Datenmodell]] | Teilweise implementiert | Ereignisquelle nur bei Mathe |
| [[16 - PWA, Offlinebetrieb und Sicherheit/Anwendung\|PWA, Offlinebetrieb und Sicherheit]] | Teilweise implementiert | Offline nur eingeschränkt |
| [[17 - Entwicklungsplan/Anwendung\|Entwicklungsplan]] | Teilweise implementiert | Meilenstein vom 29.09.2026 nicht mehr aktuell |
| [[18 - Aufgabenübersicht/Anwendung\|Aufgabenübersicht]] | Teilweise implementiert | Haken teilweise veraltet |
| [[19 - Entscheidungsprotokoll/Anwendung\|Entscheidungsprotokoll]] | Implementiert | Index ergänzt |
| [[20 - Designgrundlage/Anwendung\|Designgrundlage]] | Implementiert | Farbrollen durch Entscheidung 47 überholt |
| [[21 - Qualitätsgrundlage und Freigabe/Anwendung\|Qualitätsgrundlage und Freigabe]] | Teilweise implementiert | Abdeckung ohne `app/` |
| [[22 - Adaptiver Lernkreislauf/Anwendung\|Adaptiver Lernkreislauf]] | Teilweise implementiert | Diagnostik nicht umgesetzt |
| [[23 - Ramagotchi und nachhaltige Gamification/Anwendung\|Ramagotchi und nachhaltige Gamification]] | Geplant | erst nach stabilem Lernkern |
| [[24 - Textbox/Anwendung\|Textbox]] | Implementiert | Hauptwert misst Textbehalten |

## Leitidee

Die Lernplattform verbindet Unterricht, selbstständiges Wiederholen und spielerisches Üben zu einem gemeinsamen Lernkreislauf:

> Unterrichtsinhalte verschwinden nicht nach einer Übung. Sie werden in die persönliche LernBox übernommen, langfristig wiederholt und in neuen Situationen abgerufen.

## Einstieg für Schüler

- **Mein Lernraum:** die eigenen Klassen und das freie Üben öffnen
- **Freies Üben:** Lernwörter, Kopfrechnen, Vokabeln und Tipptraining direkt und selbstbestimmt öffnen
- **Klasse:** nur die von der Lehrkraft aktivierten Lernbereiche sehen
- **Heute üben:** innerhalb einer Klasse fällige Inhalte und durch Fehler aktivierte Wiederholungen bearbeiten
- **Aufgaben:** alle von der Lehrkraft freigeschalteten Arbeitsaufträge sehen

## Einstieg für Lehrkräfte

- Inhalte und Vokabelstapel erstellen
- Unterrichtsräume und Laufdiktate starten
- Hilfen und Schwierigkeitsstufen einstellen
- Inhalte auf Schülergeräte übertragen
- Live-Fortschritt beobachten
- Gruppen, Häuser und gemeinsame Ziele verwalten
- Ergebnisse datensparsam visualisieren

## Funktionsbereiche

1. [[01 - Plattform und Navigation/Anwendung|Plattform und Navigation]]
2. [[02 - Laufdiktat und Unterrichtsraum/Anwendung|Laufdiktat und Unterrichtsraum]]
3. [[03 - Persönliche LernBox/Anwendung|Persönliche LernBox]]
4. [[04 - Lehrer-Cockpit/Anwendung|Lehrer-Cockpit]]
5. [[05 - Vokabeln, Stapel und Tags/Anwendung|Vokabeln, Stapel und Tags]]
6. [[06 - Lernlogik und Leitner-Boxen/Anwendung|Lernlogik und Leitner-Boxen]]
7. [[07 - Adaptive Merkstrecke/Anwendung|Adaptive Merkstrecke]]
8. [[08 - Übungs- und Testmodi/Anwendung|Übungs- und Testmodi]]
9. [[09 - Duelle/Anwendung|Duelle]]
10. [[10 - Häuser, Punkte und Motivation/Anwendung|Häuser, Punkte und Motivation]]
11. [[11 - QR-Auswertung und Visualisierung/Anwendung|QR-Auswertung und Visualisierung]]
12. [[12 - Inhaltsübertragung und Synchronisation/Anwendung|Temporäre Inhaltsübertragung und Synchronisation]]
13. [[13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]]
14. [[14 - Lokale Daten, Export und Cloud-Backup/Anwendung|Lokale Daten, Export und Cloud-Backup]]
15. [[15 - Gemeinsames Datenmodell/Anwendung|Gemeinsames Datenmodell]]
16. [[16 - PWA, Offlinebetrieb und Sicherheit/Anwendung|PWA, Offlinebetrieb und Sicherheit]]
17. [[17 - Entwicklungsplan/Anwendung|Entwicklungsplan]]
18. [[18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]]
19. [[19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]]
20. [[20 - Designgrundlage/Anwendung|Designgrundlage]]
21. [[21 - Qualitätsgrundlage und Freigabe/Anwendung|Qualitätsgrundlage und Freigabe]]
22. [[22 - Adaptiver Lernkreislauf/Anwendung|Adaptiver Lernkreislauf]]
23. [[23 - Ramagotchi und nachhaltige Gamification/Anwendung|Ramagotchi und nachhaltige Gamification]]
24. [[24 - Textbox/Anwendung|Textbox]]

## Grundprinzipien

- Schüler benötigen möglichst kein Konto.
- Persönliche Lernstände bleiben standardmäßig lokal auf dem Schülergerät.
- Lehrerinhalte und persönliche Schülerdaten werden technisch getrennt behandelt.
- Freies Üben bleibt persönlich; Klassenbereiche können ausdrücklich rankingfähige Ereignisse erzeugen.
- Eine Klasse kann alle Module enthalten. Die erstellende Lehrkraft aktiviert nur die benötigten Bereiche.
- Genauigkeit und Lernfortschritt zählen stärker als Geschwindigkeit.
- Lernstand und Leistungswertung bleiben getrennt: Eine selbst korrigierte Eingabe kann fachlich richtig sein, ohne die volle Punktzahl zu erhalten.
- Fehler führen nicht zu öffentlicher Bloßstellung oder Minuspunkten.
- Lehrkräfte sehen standardmäßig nur die für den Unterricht erforderlichen Daten.
- Alle Module verwenden ein gemeinsames, versioniertes Datenmodell.
- Qualität wird nicht nachträglich geprüft, sondern gehört zur Definition of Done jeder Funktion.

## Offene Entscheidungen

> **Hinweis Gesamtaudit (20.10.2026):** Die Frage nach der Reihenfolge der Cloud-Anbieter ist durch die Umsetzung beantwortet (`src/integrations/cloud-sync/`, `docs/cloud-sync.md`). Die übrigen Fragen sind weiterhin offen. Das Audit schlägt zusätzlich fünf nächste Entscheidungen vor (Einsatzrahmen, Zielgruppe und Gerätemodell, Funktionsstopp für Randfunktionen, Wiederholungskern, Diagnostik und Rückkanal); siehe [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Auditprotokoll]].

- Welche Daten darf das Lehrergerät dauerhaft speichern? Diese Entscheidung wird erst vor einer Nutzung durch weitere Lehrkräfte produktkritisch; der aktuelle Hauptnutzer arbeitet lokal auf dem eigenen Lehrergerät.
- In welcher Reihenfolge sollen Google Drive, Microsoft OneDrive und ein frei konfigurierbares WebDAV-Ziel umgesetzt werden? Eine lokale Verzeichnissicherung bildet den ersten, anbieterunabhängigen Weg. Die Sicherung persönlicher Lernstände hat Vorrang vor einer Mehrbenutzer-Lehrerarchitektur.
- Welche Lernstandsregeln werden in Version 1 verbindlich umgesetzt?
- Welche Funktionen gehören ins erste produktive Minimum?

## Aktuelle Priorität

> **Historischer Stand (vor dem Gesamtaudit vom 19./20.10.2026):** Erste Einsätze im Unterricht sind durch einen Codekommentar belegt (`app/components/live-room-join.tsx`). Datei- und Verzeichnissicherung sowie der Abgleich über Google Drive, OneDrive und WebDAV sind inzwischen umgesetzt. Prioritätsvorschläge des Audits stehen im [[21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19|Auditprotokoll]] und sind nicht beschlossen.

Vor ersten Live-Tests werden Vault, Browser-Tests und aktuelle Oberflächenverträge synchronisiert. Danach folgt die freiwillige Sicherung persönlicher Schülerdaten in ein lokales Verzeichnis oder wahlweise zu Google Drive, Microsoft OneDrive beziehungsweise einem WebDAV-kompatiblen Speicher wie Nextcloud. Eine zusätzliche anwendungsseitige Verschlüsselung ist keine Voraussetzung; die Sicherheitsmechanismen des gewählten Geräts oder Anbieters gelten. Lehrer-Mehrbenutzerbetrieb und eine vollständige Lehrer-Authentifizierung bleiben wichtig, sind für die derzeitige Nutzung durch einen Hauptnutzer aber nachgeordnet.
