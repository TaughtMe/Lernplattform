# Umsetzungsplan: Vision – Etappe 2

Stand: 25.11.2026 · Quelle: Roadmap `obsidian-export/Lernplattform/25 - Vision/Roadmap.md`, Etappe 2
„Schnellstart und mitgelieferte Grundlagen“; Bausteine aus `docs/vision/22-mathematik.md`,
`23-vokabeln-sprachen-daz.md`, `25-lehrkraft-alltag.md`, `30-foerderkreislauf.md`,
`31-inklusion.md`. Etappe 1: `docs/umsetzungsplan-vision-etappe-1.md`.

## 0. Arbeitsweise

Wie Etappe 1: `AGENTS.md`, `CLAUDE.md` (Abschnitt „Mehrere Agenten“), eine Statustafel, gesammelter
Prüflauf nach mehreren Bausteinen. Freigaben und Rücknahmen entscheidet der Entwickler.

## 1. Abgleich mit Entscheidung 86

Entscheidung 86 (25.11.2026) sagt: keine Vorauswahl nach Jahrgang oder Klassenstufe, kein
Raumstart ohne Einstellungsschritt. Mehrere Bausteine der Roadmap stellen eine Übung selbst ein.
Sie warten deshalb auf eine Entscheidung (E2-1 bis E2-3).

## 2. Statustafel

Stände: `offen` · `in Arbeit (<Agent>)` · `umgesetzt` · `Rückfrage` · `entfällt`.

| Baustein                  | Was                                                                                                 | Inhaltsprüfung | Stand                   | Wie / Commit                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------- | -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA-5                      | Regel „sicher“ für Mathe: unter 5 sicheren Aufgaben mindestens 3 mit dem Familienmerkmal            | nein           | Rückfrage               | E2-4: Die Regel „sicher“ ist eine offene Entscheidung aus Welle 3                                                                                                                                                            |
| MA-13                     | Mathe in „Mein Stand“ und „Mein Fortschritt“, je Familie in Kinderworten (prüfen, was schon da ist) | nein           | umgesetzt               | Abschnitt „Kopfrechnen“ in „Mein Fortschritt“: je Familie „12 Aufgaben richtig gerechnet · an 3 Tagen ohne Hilfe richtig“, Stand und „Üben“; keine Gesamtzahl, kein Prozent (`0405b3f`, Agent Fortschritt)                   |
| L25-7                     | „Meinen Stand zeigen“: ruhige Ansicht für die Lehrkraft, ohne Fehlerwörter                          | nein           | umgesetzt               | „Mein Stand“: „Meinen Stand zeigen“ öffnet eine große, ruhige Ansicht nur mit Bereichen und Stand, ohne Erklärungen mit Zahlen und ohne Üben; nichts wird übermittelt (`017bfce`)                                            |
| MA-11                     | Mittelschul-Paket 1: Zehnereinmaleins, große Zahlen und Runden, Komma und Geld, Größen umrechnen    | ja (Regeln)    | umgesetzt (freies Üben) | Arten Zehnereinmaleins, große Zahlen, Runden, Geld und Komma, Größen umrechnen; im freien Üben ausdrücklich wählbar, nichts vorgewählt; Live-Raum nur in der Domäne (`a0a49f6`, Agent Mathe). Fachliche Prüfung: Abschnitt 6 |
| L25-5                     | Auftrag öffnet die Übung, „erledigt“ aus gezählten Runden (Entscheidungen 62, 63)                   | nein           | offen                   | nach L25-4                                                                                                                                                                                                                   |
| L25-4                     | Übungskarten-QR mit Kennungen mitgelieferter Übungen, druckbarer Bogen                              | nein           | offen                   |                                                                                                                                                                                                                              |
| F30-9, L25-14             | Verweisseite (Levumi u. a.), Kurzanleitung, Seite für die Schulleitung                              | ja (Texte)     | offen                   |                                                                                                                                                                                                                              |
| R23-1, F30-1              | Ein Inhaltsformat für mitgelieferte Pakete (Wortpaare, Kernwörter)                                  | nein           | offen                   | vor R23-2                                                                                                                                                                                                                    |
| R23-2                     | 250 englische Wortpaare „Grundlagen“                                                                | **ja, 8–10 h** | offen                   | nach R23-1                                                                                                                                                                                                                   |
| R23-4, R23-19             | Themen frei üben, „In meine LernBox“; Vokabelrunde live aus dem Grundwortschatz                     | nein           | offen                   | nach R23-2                                                                                                                                                                                                                   |
| L25-1                     | „20 Minuten üben“ mit Uhr: Fach → Startpunkt → eingestellte Übung                                   | –              | Rückfrage               | E2-1                                                                                                                                                                                                                         |
| L25-2, MA-4, F30-6, I31-8 | Startpunkt stellt die Übung selbst ein; Mathe-Startpunkt neu                                        | –              | Rückfrage               | E2-2                                                                                                                                                                                                                         |
| L25-3                     | „Lehrkraft wählt“ am Kindgerät, Themenliste nach Jahrgang                                           | –              | Rückfrage               | E2-4                                                                                                                                                                                                                         | Regel „sicher“ für Mathe (MA-5): Unter den 5 sicheren Aufgaben einer Familie sollen mindestens 3 das Familienmerkmal tragen (z. B. Übergang). Heute reichen 5 beliebige Aufgaben an zwei Tagen. Ändern? | Ja. „Sicher bei Plus bis 100“ heißt dann auch: über den Zehner. |
| E2-3                      |

## 3. Reihenfolge

1. Ohne Inhaltsprüfung und ohne Konflikt: MA-13, L25-7; MA-5 nach E2-4.
2. MA-11 (Generator; die Regeln prüft der Entwickler danach).
3. L25-4, dann L25-5.
4. R23-1 mit F30-1, dann R23-2 (Inhaltsprüfung), dann R23-4 und R23-19.
5. Nach Entscheidung: L25-1, L25-2 mit MA-4, L25-3.

## 4. Entscheidungen für den Entwickler

| Nr.  | Frage                                                                                               | Vorschlag                                                                               |
| ---- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| E2-1 | „20 Minuten üben“ für das Kind: Fach wählen, kurzer Startpunkt, dann eine Übung mit Uhr. Gewünscht? | Ja, aber das Kind sieht die vorgeschlagene Übung und kann sie ändern, bevor es losgeht. |
| E2-2 | Soll der Startpunkt die Übung selbst einstellen (L25-2), oder nur vorschlagen?                      | Nur vorschlagen, mit „So üben“ und „Anders einstellen“.                                 |
| E2-3 | „Lehrkraft wählt“ am Kindgerät mit einer Themenliste nach Jahrgang?                                 | Ohne Jahrgang: Fach, Thema, Niveau (leicht, mittel, schwer).                            |

## 6. Fachliche Prüfung MA-11 (für den Entwickler)

1. Runden: ab 5 auf; Zehner nur bei dreistelligen, Hunderter bei vierstelligen, Tausender bei fünfstelligen Zahlen.
2. Zehnereinmaleins: nur ein Faktor ist ein Vielfaches von 10 oder 100 (30 · 4, 560 : 8); 30 · 40 fehlt.
3. Große Zahlen: Plus 1 000 bis 10 000, Minus bis 20 000, Schritte 100, 500, 1 000.
4. Komma und Geld: nur Plus und Minus; kein 3 · 0,5, kein Preis mal Menge.
5. Größen: m↔cm, kg↔g, h↔min; Minuten in Stunden nur bei Vielfachen von 30; keine Eingabe „1 h 30 min“.
6. Einheit in der Antwort darf stehen oder fehlen („4,25 €“ und „4,25“ zählen).
7. Sprachausgabe von „3 400“ (geschütztes Leerzeichen) auf einem echten Gerät prüfen.
8. Gewählte Arten ersetzen die Rechenarten; „Plus bis 100“ und „Große Zahlen“ lassen sich nicht mischen.
9. Live-Raum: Die Arten wären dort ein neues gespeichertes Feld der Vorbereitung; Runden und Größen passen nicht ins Zeilenformat. Erst nach Entscheidung.

## 5. Protokoll

- 25.11.2026: Plan angelegt.
