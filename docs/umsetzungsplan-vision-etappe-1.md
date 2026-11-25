# Umsetzungsplan: Vision – Sofortliste und Etappe 1

Stand: 24.11.2026 · Branch `claude/nice-ramanujan-8nvuks` · Ausgangsstand `52a9505` (nach #61)

Quelle: `docs/vision/40-red-team.md` (Abschnitte 8, 10, 11, 13) und die Roadmap
`obsidian-export/Lernplattform/25 - Vision/Roadmap.md` mit den Entscheidungen des Entwicklers vom
12.11. und 15.11.2026 (`docs/vision/01-planung.md`, Schluss; Entscheidungen 60 bis 79).

## 0. Arbeitsweise

- Regeln: `AGENTS.md`, `CLAUDE.md` (Abschnitt „Mehrere Agenten“), `docs/engineering-quality.md`,
  Skill `.agents/skills/lernraum-feature/SKILL.md`.
- Ein Baustein ist klein und in wenigen Tagen in der Klasse testbar. Er gilt als **umgesetzt**, wenn
  Code und Unit-Tests stehen; **erprobt** erst nach Rückmeldung aus dem Unterricht.
- Geprüft wird gesammelt: nach mehreren Bausteinen einmal `npm run check` und die betroffenen
  Browser-Tests, nicht nach jedem Baustein (Wunsch des Entwicklers vom 24.11.2026).
- Freigaben ändert nur der Entwickler. Wo ein Baustein eine Stufe ändert, steht das in der Tafel.

## 1. Statustafel

Stände: `offen` · `in Arbeit (<Agent>)` · `umgesetzt` · `blockiert` · `entfällt`.
Wer einen Baustein beginnt, trägt sich hier ein (siehe `CLAUDE.md`).

### 1.1 Sofortliste (Bericht 40, Abschnitt 10)

| Nr. | Was                                    | Stand                  | Wie / Commit                                                                                                                                                                             |
| --- | -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fachfehler in Wortboxen und Texten     | umgesetzt              | Wortboxen, Startpunkt, gleich klingende Wörter berichtigt (`b2136c7`); s-Regel in zwei Schritten (`35456f8`, `7a8d6af`, E 75); Textbox-Zielwörter, Vermerk „ungeprüft“ (`a841d7b`, E 76) |
| 2   | Startpunkt, Training, Profil verlinken | umgesetzt              | Links in der Schüleroberfläche, „Mein Stand“ (`75ef9eb`, E 73)                                                                                                                           |
| 3   | Sprachausgabe nur mit lokalen Stimmen  | umgesetzt              | Alle Stellen über `speak()`, Hinweis statt Stille (`6c396c9`); beim Merge mit der Lernraum-Stimme vereint (`e3e04ef`, E 82)                                                              |
| 4   | Vorlese-Knopf in Aufgaben              | umgesetzt              | Ohne das Zielwort zu verraten (`e8ba8fa`, E 71)                                                                                                                                          |
| 5   | Entscheidungsprotokoll berichtigen     | umgesetzt              | 53 nachgetragen, 54 berichtigt, 60–76 (`ce0fd00`); Vorlese-Einträge auf 80–82 umnummeriert (`e3e04ef`)                                                                                   |
| 6   | Battle: Störangriffe standardmäßig aus | entfällt               | Erst aus (`9af5ecc`, E 66), nach dem Testen wieder an (`38753d6`, E 78). Ladung über Genauigkeit bleibt                                                                                  |
| 7   | Markenfiguren ersetzen                 | blockiert (Entwickler) | Entwickler klärt CC0 von Coco Material gegen Marken- und Figurenrechte (Entscheidung vom 12./15.11.)                                                                                     |
| 8   | Impressum ehrlich fassen               | umgesetzt (Entwurf)    | Beta-Betrieb beschrieben (`82ec302`); **Entwickler prüft den Text vor dem Merge**                                                                                                        |

### 1.2 Etappe 1: der Kern

| Baustein       | Was                                                                                        | Stand                        | Wie / Commit                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LF-0           | LernBox: Zuordnen und Test                                                                 | umgesetzt                    | `4896e41` ff., frei (E 77)                                                                                                                                                                                                                                               |
| „Meine Fehler“ | Stapelübergreifendes „Meine Fehler“ sichtbar machen                                        | umgesetzt (war schon gebaut) | Nur die Doku war veraltet (`ce6598b`)                                                                                                                                                                                                                                    |
| I31-9 / E 65   | Fehler an der Tafel erst ab sechs Teilnehmenden; „Braucht Hilfe“ nie in der Projektion     | umgesetzt                    | Fehlerwörter in der Projektion erst ab 6 Kindern (`LIVE_PROJECTION_MIN_PARTICIPANTS_FOR_MISTAKES`), Lehrerliste unverändert; E2E-Test folgt E 65 (`99b4ba5`, Agent Tafel)                                                                                                |
| M24-1          | Klassenziel an der Tafel: Countdown, Klassenbalken, Rundenende mit Showmoment (nur Summen) | umgesetzt (Tafel)            | Klassenbalken „X von Y Aufgaben geschafft“, Rundenende mit Anteil richtig und „Zum Üben“ ab 6 Kindern, Countdown 3-2-1 auf der Tafel (`99b4ba5`). **Countdown auf den Schülergeräten fehlt:** braucht Startzeit im Raumprotokoll/Supabase                                |
| MA-1           | Kopfrechnen-Generator nach Aufgabentypen gewichten (Übergang, Verdoppeln …)                | umgesetzt                    | Gewichtung nach Art (Übergang, Verdoppeln, Kern, Nachbar), 0/1/·10 höchstens 5 %, Merkmal `mathTaskFeature` (`ccb69eb`, Agent Mathe). Wirkt auch im Live-Raum und Startpunkt (mehr Übergänge)                                                                            |
| MA-2           | Fehlerklassifikation schärfen (echter Übergang, Null-Regel, „kleiner von größer“, ±100)    | umgesetzt                    | „Zehnerübergang“ nur bei echtem Übergang; neu Null-Regel, „kleiner von größer“, Hunderterübertrag; Sichtbarkeit unverändert (`db9c8d3`)                                                                                                                                  |
| MA-3           | Nachübung nach Merkmal (Übergang, Stellenwertart)                                          | umgesetzt                    | Nachübung zieht Aufgaben mit demselben Merkmal (`focus`); `mathFamilyKey` bewusst unverändert (`ccb69eb`)                                                                                                                                                                |
| M24-10         | Wochenziel „X von 5 Schultagen“, ohne „nicht geübt“ für vergangene Tage                    | umgesetzt                    | „X von 5 Schultagen“, höchstens 5; vergangene Tage ohne „nicht geübt“ (`bfe72b8`)                                                                                                                                                                                        |
| I31-4          | Anzeigen zählen nach oben („12 Wörter sicher“ statt „12 / 105“)                            | umgesetzt                    | Wortspeicher-Karten, Startblatt und Rundenende zählen geschaffte bzw. sichere Wörter, ohne Gesamtzahl und „% der Box“; Balken bleibt (`3888a0c`, E 83)                                                                                                                   |
| L25-10         | „Kopfrechnen live“ mit einem Knopf (Raum mit Jahrgangsvorgabe ohne Inhaltsschritt)         | umgesetzt                    | Abschnitt „Schnellstart“ auf `/lehrer`: Jahrgang 1–6 (Vorgabe 3), „Kopfrechnen live“ öffnet die Lobby ohne Inhaltsschritt (`9b01df1`, Agent Live-Start). **Jahrgangsvorgaben fachlich prüfen**                                                                           |
| LF-2           | Zuordnen in zwei Spalten, höchstens 6 Paare je Runde                                       | umgesetzt                    | Zwei Spalten, je Spalte gemischt; zweite Kachel derselben Spalte wechselt die Wahl statt Fehlversuch (`8315956`)                                                                                                                                                         |
| LF-3           | Mischbare Fragearten Schreiben, Mündlich, Auswahl; „Test“ geht darin auf                   | umgesetzt                    | Schreiben, Mündlich, Auswahl mehrfach wählbar, Karte für Karte gemischt, Rückmeldung je Karte; Auswahl ändert nichts; „Test“ entfernt; gemischte Runden ohne „Weitermachen“ (`31d4bbd`, Agent LernBox; E 84). Offen: Soll Auswahl allein immer den ganzen Stapel nehmen? |
| K8             | Inhalte unabhängig vom Laufdiktat anlegen: Liste → Laufdiktat, Battle, LernBox-Stapel      | in Arbeit (Hauptsitzung)     | Plan `docs/umsetzungsplan-inhalte-zuerst.md`: Inhaltsmodell und Ablage sind schon gemeinsam; zuerst K8-1 bis K8-3, Startseite und Editor nach Entscheidung                                                                                                               |
| M24-6          | Wortboxen als Live-Quelle, Voreinstellungen in zwei Tipps                                  | umgesetzt                    | Einmaleins, Plus/Minus bis 1000 und sechs Wortboxen als Live-Quelle (10 Wörter). „s, ss und ß“ fehlt bis zur Prüfung; Vorgabe „Zehnerübergang“ folgt (`9b01df1`)                                                                                                         |
| L25-11         | Namensliste einfügen (Teil 1)                                                              | umgesetzt (Teil 1)           | Namensliste einfügen: Zeilen/Semikolons, Tabellenspalten verbunden, Doppelte weg, höchstens 40 (`34ae40c`). Schuljahresübernahme offen                                                                                                                                   |
| L25-9          | `lehrer-geraet` auf `frei`                                                                 | umgesetzt                    | `lehrer-geraet` auf `frei`; Produktionslauf startet mit „Mein Gerät“ (`3888a0c`, E 85)                                                                                                                                                                                   |
| R12-12 / E 72  | Lizenz: Code EUPL-1.2, Inhalte CC BY-SA 4.0, Name und Logo ausgenommen                     | blockiert                    | Erst Markenfiguren (Sofortliste 7) und Inhalte als eigene Dateien                                                                                                                                                                                                        |
| Sterne (V-9)   | Sterne je Runde                                                                            | entfällt                     | Vorerst nicht (Entscheidung vom 15.11.); nur vorbereiten                                                                                                                                                                                                                 |
| R12-1, R12-14  | Gespräch Datenschutz; zweite Person mit Zugang                                             | entfällt                     | Kein Code. R12-14: Nein (15.11.)                                                                                                                                                                                                                                         |

## 2. Reihenfolge

1. Klein und ohne Prüfzeit zuerst: I31-9, MA-1 bis MA-3, M24-10, I31-4.
2. Live-Raum: M24-1, L25-10.
3. LernBox: LF-2, dann LF-3.
4. Schnell erstellen: K8, M24-6, L25-11.
5. Danach ein gesammelter Prüflauf (`npm run check`, Browser-Tests der berührten Bereiche).

## 3. Protokoll

Je Baustein eine Zeile in der Statustafel (Spalte „Wie / Commit“). Abweichungen vom Bericht und
Rückfragen an den Entwickler stehen hier.

- 24.11.2026: PR #57 auf den Vorlese-Stand gebracht (`e3e04ef`). Konflikt Entscheidung 71/Vision
  Nr. 5 („nur Gerätestimmen“) gegen 82 („Lernraum-Stimme für alle“) aufgelöst: Lernraum-Stimme
  zuerst, Gerätestimmen nur lokal. `CLAUDE.md` und die erweiterte `AGENTS.md` aus `210f80c`
  übernommen; sie lagen nur auf `claude/loving-meitner-rt4tn0`.
- 24.11.2026, gesammelter Prüflauf nach allen Bausteinen: `npm run check` grün (290 Dateien,
  3252 Unit-Tests, Coverage, Datenbankverträge, Build, Render). Browser-Tests in Chromium
  (Desktop, Mobil, Mindestbreite): Lernformen, Wortspeicher, Live-Raum, Lehrerinhalte,
  Tafelmodus, Fortsetzen, Sprachausgabe, Sprachmodell, Pilot, Gastmodus, Plattform,
  Profil, Hydration – alle grün; Produktionslauf (29) grün. Nicht lokal: Firefox, WebKit,
  Designtests (laufen in GitHub). Erwartet rot in `design-quality`: `/lehrer` (neuer
  Abschnitt „Schnellstart“), bis die Vorlage angepasst ist.
- Offen für den Entwickler: K8 (Inhalte unabhängig vom Laufdiktat) braucht Plan und
  Designvorlage; Jahrgangsvorgaben im Schnellstart prüfen; Wortbox „s, ss und ß“ prüfen;
  Impressum-Entwurf prüfen; Markenfiguren; Countdown auf Schülergeräten braucht eine
  Startzeit im Raumprotokoll; LF-3: soll „Auswahl“ allein immer den ganzen Stapel nehmen?
