# Lernraum – Gesamtaudit vom 19./20.10.2026 (Abschlussbericht)

|                         |                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prüfstand               | Commit `c30b916`, Branch `claude/gallant-mayer-2rz18j`, App-Version 0.8.0                                                                                                                                              |
| Zeitraum                | 19. und 20.10.2026                                                                                                                                                                                                     |
| Art                     | unabhängiges Red-Team-Gesamtaudit; nur lesend, keine Änderung am Anwendungscode                                                                                                                                        |
| Status dieses Dokuments | **maßgeblich** für die Ergebnisse des Audits. Zusammenfassung im Vault: `obsidian-export/Lernplattform/21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19.md`. Belege: `2026-10-19-gesamtaudit/` |
| Verbindlichkeit         | Alle Empfehlungen sind **Vorschläge zur Prüfung**. Sie ändern keine bestehende Entscheidung, solange die projektverantwortliche Lehrkraft sie nicht beschließt.                                                        |

**Lesehilfe.** Schweregrade: **P0** sofortiger Stopp (Datenverlust,
Sicherheitslücke mit realem Schaden, rechtswidriger Betrieb) · **P1** vor
weiterem Klasseneinsatz beheben · **P2** im nächsten Ausbauschritt beheben ·
**P3** Pflege. Evidenz: **bestätigt (reproduziert)** durch eigenen Test oder
Browserlauf · **bestätigt (Codeanalyse)** durch Lesen des Codes · **begründetes
Risiko** plausibel, aber nicht ausgelöst · **offene Frage** mit verfügbaren
Mitteln nicht entscheidbar. Konzept (Vault, `docs/`), Implementierung (Code)
und Empfehlung sind durchgehend getrennt.

## Inhalt

- A – Management Summary
- B – Bewertungsmatrix
- C – Befundkatalog
- D – Die zehn wichtigsten Probleme
- E – Die zehn größten Verbesserungschancen
- F – Pädagogisches Gutachten
- G – Schularten- und Zielgruppenmatrix
- H – UX-Gutachten
- I – Strategische Empfehlungen
- J – Priorisierte Roadmap
- K – Abschließendes Expertenurteil
- L – Technisches Gutachten
- M – Gegenprüfung durch das Red Team
- N – Durchgeführte Prüfungen und Grenzen des Audits
- O – Dokumentationsänderungen und Änderungsprotokoll
- Anhang 1 – Funktions- und Architekturübersicht (Konzept und Implementierung)
- Anhang 2 – Dateien des Audits

## A – Management Summary

**Was geprüft wurde.** Lernraum ist eine Local-first-Lernplattform einer
Lehrkraft: ein Live-Laufdiktat für den Unterricht sowie persönliches Üben von
Rechtschreibung (Wortspeicher, Textbox, Laufdiktat allein), Kopfrechnen,
Vokabeln (LernBox) und Tastschreiben, dazu ein Lehrerbereich ohne Konto. Rund
61 000 Zeilen Produktionscode und 39 000 Zeilen Tests. Sechs fachliche
Prüfinstanzen und ein Red Team haben Code, Dokumentation und Vault unabhängig
geprüft und ihre Aussagen mit rund 80 eigenen Tests und Skripten belegt.

**Gesamturteil.** Lernraum ist ein **technisch diszipliniertes, ehrgeiziges
Einzelprojekt mit einem unterrichtstauglichen Kern, aber noch kein
schulreifes Produkt.** Das Live-Laufdiktat funktioniert und ist gut getestet.
Die Serverseite und die Datensparsamkeit sind sorgfältiger als in vielen
kommerziellen Angeboten. Die automatisch prüfbare Barrierefreiheit ist sehr
gut. Die Schwächen liegen dort, wo es für Lernen und Vertrauen am meisten
zählt:

- **Der Lernstand ist im Kernmodul Rechtschreibung nicht verlässlich.**
  Abschreiben zählt als Abruf, Wörter steigen ohne Fälligkeit auf, und
  richtige Antworten können als dreifacher Fehler gespeichert werden. Niemand
  sieht das.
- **Die Daten der Kinder sind schlechter geschützt, als es Local-first
  verlangt.** Die Sicherung versagt bei LernBox-Ordnern, gegen
  Speicherlöschung unter iPadOS gibt es keine Maßnahme, und ein Gerät gilt
  als eine Person.
- **Der Einsatzrahmen ist nicht geklärt.** Das eigene Impressum schließt den
  Schulbetrieb aus, der laut Code bereits stattfindet. Der Lehrerbereich ist
  auf geteilten Geräten ungeschützt.
- **Der pädagogische Anspruch ist größer als die Umsetzung.** Es gibt keine
  Diagnostik, keine Steuerung außerhalb des Live-Raums und kaum Rückmeldung an
  die Lehrkraft. „Adaptiv“ bedeutet heute: Fehler und Fälligkeiten werden
  wiederholt.

**Zahlen nach der Gegenprüfung.** 97 Befunde der Fachprüfungen und 2 neue des Red Teams: **0 × P0, 12 × P1, 60 × P2, 27 × P3**. Das Red Team konnte keine
P1-Behauptung widerlegen. Es hat fünf in der Schwere gesenkt und drei Paare als
gemeinsame Ursache zusammengeführt. Drei P1 sind Konzeptlücken, keine Defekte.

**Abstand zum schulreifen Produkt** (Schätzung, Vorschlag zur Prüfung):

| Einsatzstufe                                    | Was fehlt                                                                                                                                                                                              | Grobe Dauer                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Pilot in der eigenen Klasse, Lehrkraft anwesend | Sofortmaßnahmen S1–S14 (Lernwort-Regeln, Sicherung, Speicherschutz, Antwortprüfung, Inhaltsfehler, Datenschutzerklärung, Vorbereitung einer Beobachtungsphase) und **Freigabe durch die Schulleitung** | 1–2 Wochen Entwicklung plus Klärung |
| Regelbetrieb in mehreren Klassen einer Schule   | zusätzlich K1–K13, Entscheidung zum Gerätemodell, Schutz des Lehrerbereichs, Rückkanal zur Lehrkraft                                                                                                   | etwa ein Vierteljahr                |
| Einsatz an weiteren Schulen und Schularten      | zusätzlich M1–M11 und L1–L4: gemeinsamer Wiederholungskern, Gerätemodell, Datenschutzpaket, Evaluation, Betrieb ohne Ein-Personen-Abhängigkeit                                                         | ein Schuljahr und mehr              |

**Wichtigste Empfehlung.** Die nächsten Wochen gehören nicht neuen Funktionen,
sondern der **Korrektheit des Lernkerns und der Sicherheit der Daten**. Die
acht größten Verbesserungschancen sind Reparaturen oder kleine Ergänzungen
bestehender Wege (Abschnitt E). Parallel sollte die Lehrkraft fünf Grundsatzentscheidungen treffen
(Abschnitt K): Einsatzrahmen, Zielgruppe und Gerätemodell, Funktionsstopp für
Randfunktionen, ein Wiederholungskern, Diagnostik und Rückkanal.

**Grenzen.** Geprüft wurde ohne iPad und ohne WebKit, ohne Produktivsysteme,
ohne Nutzerstudie und ohne Wirksamkeitsmessung. Aussagen zum Rechtsrahmen
benennen Prüffragen und sind keine Rechtsberatung (Abschnitt N).

## B – Bewertungsmatrix

Skala: **0** nicht vorhanden · **1** gravierend mangelhaft · **2** deutliche
Mängel, nur eingeschränkt tragfähig · **3** solide mit erkennbaren Lücken ·
**4** gut · **5** vorbildlich. Bewertet wird der Stand von Commit `c30b916`
gemessen am Ziel „verlässlicher Einsatz in Schulen“, nicht am Aufwand eines
Einzelprojekts. Die Spalte „Prüfinstanz“ nennt die Einzelbewertung; die
Endnote berücksichtigt die Gegenprüfung und die anderen Berichte.

| Dimension                      | Prüfinstanz                   | Endnote | Begründung (Befunde)                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architektur                    | A: 2,5                        | **2,5** | Sauber isolierter Fachkern und klare Schichten. Die tragenden Versprechen (Ereignisquelle, eine Fachregel je Regel) hält der Code nicht (A-003, A-004); dynamisches Server-Rendering passt schlecht zu Local-first (A-007).                                                                              |
| Codequalität                   | A: 3                          |   **3** | Strenge Typisierung (0 × `any`), reine Ansichten, idempotente Schreibwege. Abzug für uneinheitliche Fehlerbehandlung (A-002), monolithische Container (A-011) und verstreute Datumslogik (A-013).                                                                                                        |
| Sicherheit und Datenschutz     | B: 2,5                        | **2,5** | Serverseite und Datensparsamkeit überdurchschnittlich. Lücken an den Rändern: Realtime (B-003), Lehrerdaten auf geteilten Geräten (B-009), keine Personentrennung (B-010), Rechtsrahmen (B-011). B-008 nach Gegenprüfung P2.                                                                             |
| Zuverlässigkeit                | B: 2 · G: 2                   |   **2** | Datenverlust möglich, ohne dass Kinder ihn beheben können (B-001, B-002, G-010); Lernstände weichen still von den Regeln ab (A-004, G-005, G-006, G-011); ein unbekanntes Feld legt Projektionen lahm (A-001).                                                                                           |
| Wartbarkeit                    | A: 2                          |   **2** | 61 000 Zeilen Produktionscode, Bus-Faktor 1 (A-017); vier Wiederholungslogiken (A-004); Abgleich-Code größer als die Lerncontainer (A-008). Positiv: gute Tests im Fachkern, klare Regeln in `AGENTS.md`.                                                                                                |
| Benutzerfreundlichkeit         | C: 2,5 (Kind) · 2 (Lehrkraft) |   **2** | Ruhige, einheitliche Oberfläche. Aber: Runden enden ohne Rückfrage (C-001), Erwachsenensprache (C-007), Erstkontakt in der Tastenwelt (C-003), widersprüchliche Statusanzeigen (C-008); für Lehrkräfte Einzelanlage, Inhalte nur über den Laufdiktat-Assistenten, QR-Bogen unvollständig (C-006, C-010). |
| Barrierefreiheit               | C: 3,5                        |   **3** | Technisch sehr gut: 0 axe-Verstöße in 26 Seiten und 32 Zuständen, reduzierte Bewegung, Fokusführung. Abzug für feste Merkzeit ohne Pause (C-002), fehlendes Vorlesen der Anleitungen und Sprachniveau (C-007), Zwei-Finger-Geste ohne Alternative (E-007).                                               |
| Didaktische Qualität           | D: 2                          |   **2** | Richtige Grundideen (Abrufübung, Spacing, Fading, gedeckelte Portion) werden im Kernmodul durch die Bewertungsregeln neutralisiert (D-001, D-002, A-004); fachliche Inhaltsfehler (D-006, E-005).                                                                                                        |
| Qualität des Feedbacks         | D: 2                          |   **2** | Buchstabengenaue Rückmeldung im Wortspeicher ist gut. Sonst meist richtig/falsch ohne Fehlerort, Strategie oder Fehlerklassifikation (D-008); richtige Antworten werden teils als falsch gemeldet (G-001, G-002).                                                                                        |
| Kompetenzdiagnostik            | D: 0,5                        | **0,5** | Kein Kompetenzmodell, keine Lernverlaufsmessung, keine Beherrschungskriterien (D-003). Fortschrittsanzeigen messen teils Abschreiben, Wiedererkennung oder Zufall (D-004).                                                                                                                               |
| Adaptives Lernen               | D: 1,5                        | **1,5** | Regelbasierte Wiederholung von Fehlern und Fälligkeiten ist vorhanden. Eine Anpassung an den Lernstand (Auswahl, Hilfen, Schwierigkeit) gibt es nicht; die Wortauswahl im Wortspeicher ist zufällig (D-011, F).                                                                                          |
| Differenzierung und Inklusion  | E: 1,5                        | **1,5** | Stufen und Zahlenräume sind frei wählbar, aber ohne Empfehlung. Die Schreiberleichterung wirkt je Gerät statt je Kind (E-001) und nur im Live-Raum (E-006); Förderschule kaum bedient (E-004).                                                                                                           |
| Praktischer Unterrichtseinsatz | E: 2,5                        | **2,5** | Das Live-Laufdiktat ist unterrichtstauglich und gut getestet (68 Live-Tests grün). Außerhalb davon fehlen Steuerung und Rückkanal für die Lehrkraft (E-002, E-003), Vertretungsfähigkeit (E-008) und ein Gerätemodell für Koffer-iPads (E-001).                                                          |
| Erweiterbarkeit                | A: 2                          |   **2** | Kein Modulvertrag, rund 20 Berührungspunkte je neuem Modul, geschlossene Enums in den Datenverträgen (A-009, A-001).                                                                                                                                                                                     |

Ergänzende Dimensionen der Prüfinstanzen: funktionale Korrektheit 2,5 (G),
Motivation ohne schädlichen Druck 3 (D), Test- und Prüfqualität 3 (A, C).

**Lesart:** Die technische Basis liegt im Mittelfeld (2–3). Die Dimensionen,
die den pädagogischen Anspruch tragen – Diagnostik, Adaptivität,
Differenzierung –, liegen deutlich darunter (0,5–1,5). Der Abstand zwischen
Selbstbeschreibung und Umsetzung ist dort am größten.

## C – Befundkatalog

97 Befunde der Fachprüfungen und 2 neue des Red Teams: **0 × P0, 12 × P1, 60 × P2, 27 × P3**. Die Tabellen zeigen jeden Befund in Kurzform mit der Schwere **nach
der Gegenprüfung**. Der **vollständige Katalog mit allen Feldern** (Bereich,
Beschreibung, Belege, Betroffene, Folgen, Schwere, Evidenzstatus, Empfehlung,
Aufwand, Erfolgskriterium) steht in
[`2026-10-19-gesamtaudit/befundkatalog.md`](2026-10-19-gesamtaudit/befundkatalog.md);
Reproduktionswege und Testauszüge in den Prüfberichten. Die Spalte „Prüfung F“
nennt das Urteil des Red Teams. „Empfehlung angepasst“ oder „Teilaussage
korrigiert“ heißt: Das Red Team hat die Empfehlung oder eine Teilaussage eines
P2-/P3-Befunds eingeschränkt (Einzelheiten im Befundkatalog und in Abschnitt
M.6). „–“ heißt: nicht gesondert gegengeprüft.

| Prüfinstanz |     P1 |     P2 |     P3 | gesamt |
| ----------- | -----: | -----: | -----: | -----: |
| A           |      1 |     10 |      7 |     18 |
| B           |      5 |     13 |      6 |     24 |
| C           |      0 |      9 |      6 |     15 |
| D           |      2 |     10 |      4 |     16 |
| E           |      3 |      5 |      2 |     10 |
| G           |      1 |     12 |      1 |     14 |
| F           |      0 |      1 |      1 |      2 |
| **Summe**   | **12** | **60** | **27** | **99** |

#### Prüfinstanz A – Architektur und Codequalität (Detail: `2026-10-19-gesamtaudit/agent-a-architektur.md`)

| ID    | Befund                                                                                                                                       | Bereich                                      | Schwere        | Evidenz                             | Prüfung F            | Aufwand                        | Betroffene                                                                               | Erfolgskriterium (kurz)                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------- | ----------------------------------- | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A-001 | Ein einziges unpassendes Lernereignis legt alle Lernstandsprojektionen lahm; strikte Schemata verhindern Vorwärtskompatibilität und Rollback | Datenhaltung, Datenverträge, Betrieb         | P2 (vorher P1) | bestätigt (repro.)                  | abgeschwächt         | M                              | alle Schülerinnen und Schüler auf betroffenen Geräten; Lehrkraft beim …                  | Ein Test schreibt ein Ereignis mit unbekanntem Feld und unbekanntem `source` in die Datenbank; Startseite, LernBox-Portion und …             |
| A-002 | Fehler sehen aus wie leere Daten oder enden in Dauer-Laden; keine einheitliche Fehlerbehandlung                                              | Fehlerbehandlung, Zustände                   | P2             | bestätigt (repro.)                  | –                    | M                              | Schülerinnen und Schüler (sehen „nichts zu tun“ oder einen verlorenen Fortschritt), …    | Für jeden Schüler-Container existiert ein Test „Speicher nicht verfügbar“ mit sichtbarem `role="alert"`; `no-floating-promises` ist aktiv; … |
| A-003 | Ereignisquelle nur dem Namen nach: Lernstände sind überwiegend veränderliche Primärzustände; nach dem Gerätezusammenführen widersprechen …   | Architektur, Datenmodell, Synchronisation    | P2             | bestätigt (repro.)                  | Empfehlung angepasst | L                              | Kinder mit zwei Geräten (Schule/Zuhause) oder Gerätewechsel; künftig alle, sobald eine … | Der Merge-Test aus `a-merge-divergence` ergibt `reverseBox 3`; ein Test baut alle Projektionen aus einer Sicherung mit nur Ereignissen …     |
| A-004 | Mehrere parallele Wiederholungslogiken mit widersprüchlichen Regeln; Lernwörter verletzen die eigene Leitner-Spezifikation                   | Fachlogik, Integrationsregel                 | P1             | bestätigt (repro.)                  | bestätigt            | M                              | Kinder im Wortspeicher (Kern des Rechtschreibziels), Lehrkräfte, die sich auf …          | Alle Module bestehen dieselbe Regeltabelle aus Vault 06; `a-leitner-divergence` liefert für Lernwörter Box 2 bzw. Box 1.                     |
| A-005 | Die Abdeckungszahl 96 % ist für die Gesamtanwendung irreführend; Tests schreiben teilweise Fehlverhalten fest                                | Testbarkeit, Qualitätssicherung              | P2             | bestätigt (repro.)                  | –                    | S (Konfiguration) bis M …      | Entwickler/Lehrkraft (falsches Sicherheitsgefühl), indirekt alle Nutzer.                 | `npm run check` misst `app/` und `src/tastschreiben`; die Doku nennt beide Zahlen.                                                           |
| A-006 | Browser-Tests prüfen den Entwicklungsserver, nicht das ausgelieferte Artefakt                                                                | Testarchitektur, CI                          | P2             | bestätigt (Code)                    | –                    | M                              | alle (Fehler, die nur im Produktionsmodus auftreten, erreichen die Nutzer ungetestet).   | Ein CI-Job führt `platform-quality.spec.ts` gegen das gebaute Worker-Artefakt ohne Vorschau-Cookie aus.                                      |
| A-007 | Plattformrisiko: junges Framework, Cloudflare-gebundenes dynamisches SSR und RSC-Navigation für eine Local-first-PWA                         | Abhängigkeiten, Architekturgrundentscheidung | P2             | begr. Risiko                        | Empfehlung angepasst | L (Wechsel) / S (Aufräumen)    | alle; Schulträger (Betrieb, Datenschutz-Folgenabschätzung muss einen …                   | Alle Seiten lassen sich als statische Dateien ausliefern; Client-Navigation funktioniert ohne Netz für alle Lernbereiche; keine …            |
| A-008 | Komplexität ohne entsprechenden Nutzen: Lehrer-Geräteabgleich, doppelte Abgleichwege, Eigen-SHA-256, tote und prototypische Pfade            | Komplexität, Wartbarkeit                     | P2             | bestätigt (Code)                    | –                    | M                              | Entwickler/Lehrkraft (Pflege), indirekt alle.                                            | Kein ungenutzter Produktionscode (Prüfung z. B. mit `knip`); dokumentierte Begründung pro Randfunktion mit Nutzen für die Kernziele.         |
| A-009 | Erweiterbarkeit: kein Modulvertrag; ein neues Lernmodul berührt rund 20 Dateien und mehrere geschlossene Enums                               | Erweiterbarkeit, Schul-Rollout               | P2             | bestätigt (Code) / teils Risiko     | –                    | L                              | Entwicklung, künftige Schulen/Schularten, Fachlehrkräfte an der Mittelschule.            | Ein Beispielmodul lässt sich mit ≤ 5 Berührungspunkten außerhalb seines Ordners ergänzen; ältere Geräte ignorieren unbekannte Module ohne …  |
| A-010 | Architekturregeln nur teilweise maschinell abgesichert                                                                                       | Schichtentreue                               | P3             | bestätigt (repro.)                  | –                    | S                              | Entwicklung (insbesondere KI-Agenten, die sich auf die Regeln verlassen).                | Alle 14 Fälle aus P3 werden wie dokumentiert blockiert.                                                                                      |
| A-011 | Monolithische Container, uneinheitliche Trennung von Ansicht und Ablauf, ad-hoc Daten- und Ereigniskopplung                                  | Codequalität, Wartbarkeit                    | P3             | bestätigt (Code)                    | –                    | M                              | Entwicklung.                                                                             | Keine Komponente > 400 Zeilen mit mehr als 10 Zustandsvariablen; Abläufe von Live-Spiel und Kopfrechnen sind ohne DOM testbar.               |
| A-012 | Datenwachstum und Projektionsaufwand: alles wird bei jeder Ansicht vollständig geladen und validiert                                         | Performance, Datenhaltung                    | P3             | bestätigt (gemessen) / teils Risiko | –                    | S–M                            | Kinder mit mehrjähriger Nutzung, ältere Geräte.                                          | Startseite mit 20 000 Ereignissen auf einem iPad der 6./7. Generation < 500 ms bis zur Anzeige.                                              |
| A-013 | Uneinheitliche Validierung, doppelte Schemata und verstreute Datumslogik                                                                     | Codequalität, Konsistenz                     | P3             | bestätigt (Code)                    | –                    | S–M                            | Entwicklung; geringfügig Kinder (Anzeige aktiver Tage).                                  | Keine Literal-Tageslänge außerhalb des Zeitmoduls; ein Schema je gespeichertem Typ.                                                          |
| A-014 | Eingecheckte, veraltete Service-Worker-Dateien; Fingerabdruck mit Testdateien                                                                | Build, Auslieferung                          | P3             | bestätigt (repro.)                  | –                    | S                              | Entwicklung; Nutzer (unnötige Update-Hinweise).                                          | `git status` bleibt nach `npm run build` sauber; Teständerungen ändern den Fingerabdruck nicht.                                              |
| A-015 | Demo-Pfad schreibt echte, nicht idempotente Lernereignisse                                                                                   | Datenhygiene, prototypische Pfade            | P3             | bestätigt (Code)                    | –                    | S                              | Kinder auf Geräten mit aktivierter Vorschau.                                             | Demo-Nutzung verändert `lernraum:personal:v1` nicht.                                                                                         |
| A-016 | Benennung und Sprachmischung in persistierten Werten                                                                                         | Code-Konsistenz                              | P3             | bestätigt (Code)                    | –                    | S (Konvention) / M (Migration) | Entwicklung.                                                                             | Konvention dokumentiert; neue Schemata halten sie ein.                                                                                       |
| A-017 | Wartbarkeit durch eine Einzelperson: Umfang und Änderungstempo übersteigen, was ohne KI-Agenten pflegbar ist                                 | Wartbarkeit, Projektorganisation             | P2             | begr. Risiko                        | –                    | M                              | Schulen, die die Anwendung einsetzen; die Lehrkraft selbst.                              | Eine fremde Entwicklerin kann mit `docs/` in einem Tag ein kleines Feature im Lernkern umsetzen; dokumentierter Betriebs- und Ausstiegsplan. |
| A-018 | Local-first ohne Persistenzanforderung: Daten der Kinder hängen am Browser-Speicher des Geräts                                               | Datenhaltung (Schnittstelle zu B)            | P2             | begr. Risiko                        | –                    | S                              | Kinder auf Schul-iPads, besonders nach Ferien.                                           | Die App zeigt den Persistenzstatus; Testprotokoll eines Schul-iPads nach 14 Tagen Nichtnutzung.                                              |

#### Prüfinstanz B – Sicherheit, Datenschutz, Offline (Detail: `2026-10-19-gesamtaudit/agent-b-sicherheit.md`)

| ID    | Befund                                                                                                                           | Bereich                                           | Schwere          | Evidenz                           | Prüfung F            | Aufwand                | Betroffene                                                                               | Erfolgskriterium (kurz)                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------- | --------------------------------- | -------------------- | ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| B-001 | Persönliche Sicherung bricht ab, sobald ein LernBox-Stapel in einem Ordner liegt                                                 | Datenintegrität / Sicherung (Schülergerät)        | P1               | bestätigt (repro.)                | bestätigt            | S                      | alle Kinder, die Ordner nutzen (z. B. „Buch Klasse 5“); damit auch deren …               | Round-Trip-Test mit Ordnern grün; ein Strukturtest scheitert, sobald eine neue Dexie-Tabelle oder ein neues Feld nicht im Sicherungsschema … |
| B-002 | Keine Antwort auf Speicherlöschung unter iPadOS/Safari; Sicherungserinnerung ist rein passiv                                     | Zuverlässigkeit / Datenverlust                    | P1               | bestätigt (Code) / teils Risiko   | bestätigt            | M                      | alle Kinder, besonders auf iPads in Safari (nicht installiert), auf …                    | Auf einem echten iPad (Safari und Home-Bildschirm) belegt ein Testprotokoll: `persisted()` ist `true` oder es gibt einen Hinweis, …          |
| B-003 | Realtime-Kanäle ohne Autorisierung: Präsenz fälschen, Angriffe senden, mithören                                                  | Sicherheit Live-Raum (Supabase Realtime)          | P2 (vorher P1) ² | bestätigt (Code)                  | abgeschwächt         | M (Variante b) bis L … | Lehrkräfte (Beamer-Anzeige, CSV), alle Kinder im Raum (Störungen, Mitlesen von Fehlern). | Ein Client ohne gültigen Teilnehmertoken kann den Raumkanal nicht abonnieren (Testumgebung). Die Lehrerliste zeigt nur serverseitig …        |
| B-008 | LRS-Freigabe im Einschreibe-QR lesbar und am QR sichtbar                                                                         | Datenschutz (sensible Information über Kinder)    | P2 (vorher P1)   | bestätigt (repro.)                | abgeschwächt         | S (1–2), M (3)         | Kinder mit Lese-Rechtschreib-Störung/-Schwäche und deren Eltern; Lehrkräfte als …        | Codes mit und ohne Freigabe sind gleich lang und gleich groß. Ein Test prüft die Längengleichheit. Die Dokumentation beschreibt die …        |
| B-009 | Lehrerdaten ohne Zugriffsschutz auf geteilten Geräten; „Lehrer-Login“ täuscht Schutz vor                                         | Datenschutz / Rollen (Entscheidung 43)            | P1               | bestätigt (Code)                  | bestätigt            | S (1), M (2–3)         | Kinder (Daten über sie), Lehrkräfte (Verantwortung), Schulleitung.                       | Auf einem als „geteilt“ markierten Gerät liegen keine Schülernamen/LRS-Daten im Klartext in IndexedDB (Test). Der Lehrerbereich mit …        |
| B-010 | Schülergeräte: keine Trennung mehrerer Kinder, kein Profilwechsel, kein Löschen                                                  | Datenschutz / Zuverlässigkeit                     | P1 ¹             | bestätigt (Code)                  | bestätigt            | L                      | Grundschulen mit geteilten Geräten (in Bayern verbreitet; Annahme, nicht verifiziert), … | E2E-Test: zwei Profile auf einem Gerät sehen sich gegenseitig nicht. Löschen entfernt alle Tabellen eines Profils.                           |
| B-011 | Rechtsrahmen: Echtbetrieb mit Kindern ohne AVV, Verzeichnis, DSFA, Freigabe; Datenschutzerklärung unvollständig und teils falsch | Datenschutz-Compliance (bayerischer Schulkontext) | P1               | bestätigt (Dokumente)             | bestätigt            | M (Dokumente), …       | Schulleitung (Verantwortliche), Lehrkräfte, Kinder und Eltern (Transparenz).             | Schriftliche Freigabe der Schule. Verzeichnis und DSFA (oder dokumentierte Schwellwertprüfung) liegen vor. Jede Datenverarbeitung aus …      |
| B-004 | Vierstelliger Raumcode als einzige Schranke: Lösungen lesen, Stationsstände überschreiben                                        | Sicherheit Live-Raum (RPC)                        | P2               | bestätigt (repro.)                | –                    | M                      | Lehrkräfte (verfälschte Ergebnisse), Kinder (Stationsfortschritt überschrieben).         | DB-Vertragstest: Ein zweiter Teilnehmer kann eine belegte Station nicht überschreiben. `word_errors` mit fremden Schlüsseln wird …           |
| B-005 | Rate-Limit vertraut dem linken `X-Forwarded-For`-Eintrag; Schul-NAT teilt einen Topf                                             | Sicherheit / Verfügbarkeit Supabase               | P2               | bestätigt (repro.) / teils Risiko | –                    | S–M                    | alle Schulen; Betreiber (Kosten/Kontingente).                                            | Dokumentierter Gateway-Test. DB-Vertragstest mit gefälschtem linken Eintrag bleibt gesperrt.                                                 |
| B-006 | Inhaltsübertragung ohne Rate-Limit: Speicher-DoS des gemeinsamen Supabase-Projekts                                               | Verfügbarkeit Supabase                            | P2               | bestätigt (repro.)                | –                    | S                      | alle Schulen (Ausfall der Live-Räume).                                                   | DB-Vertragstest: die 21. Reservierung in 10 min von einer Adresse scheitert. Upload über z. B. 512 KiB wird abgewiesen.                      |
| B-007 | CSV-Export neutralisiert keine Formeln; Inhalte sind von Fremden steuerbar                                                       | Web-Sicherheit / Lehrkraftgerät                   | P2               | bestätigt (repro.)                | –                    | S                      | Lehrkräfte.                                                                              | Einheitstest mit Formelpräfixen grün.                                                                                                        |
| B-012 | Sprachausgabe bevorzugt Cloud-Stimmen; Texte gehen an Google/Microsoft                                                           | Datenschutz (Drittübermittlung)                   | P2               | bestätigt (repro.)                | –                    | S                      | Kinder und Lehrkräfte an Windows-/ChromeOS-Geräten.                                      | Test: Bei vorhandener lokaler Stimme wird nie eine `localService=false`-Stimme gewählt.                                                      |
| B-013 | Offline-Fähigkeit schmaler als behauptet; nach jedem Update fast nichts mehr offline; keine echten Offline-Tests                 | Zuverlässigkeit / PWA                             | P2               | bestätigt (Code)                  | –                    | M                      | Kinder beim Üben zu Hause ohne oder mit schlechtem Netz; Klassen mit instabilem WLAN.    | E2E gegen Produktionsbuild: nach SW-Update und Netzabschaltung starten `/lernen`, LernBox, Wortspeicher und Kopfrechnen. Lie-Fi-Navigation … |
| B-014 | Geräte-Abgleich akzeptiert unverschlüsselte Datei trotz Passwort (Downgrade)                                                     | Datenintegrität Cloud-Abgleich                    | P2               | bestätigt (repro.)                | –                    | S                      | Lehrkräfte mit verschlüsseltem Abgleich.                                                 | Der Repro-Test endet mit Status `locked` und unveränderten lokalen Daten.                                                                    |
| B-015 | Keine Sicherheitsheader/CSP; Drittanbieter-Skript mit vollem Zugriff auf Kinderdaten und Schlüssel                               | Web-Sicherheit (Defense in Depth)                 | P2               | bestätigt (Code)                  | –                    | M                      | alle.                                                                                    | Header-Test in `rendered-html.test.mjs` bzw. gegen den Worker. Mozilla Observatory mindestens B+.                                            |
| B-019 | Live-Raum-Identität nur im Sitzungsspeicher: Tab-Verlust auf dem iPad kostet Fortschritt bzw. Raumsteuerung                      | Zuverlässigkeit Live-Raum                         | P2               | begr. Risiko                      | Empfehlung angepasst | S–M                    | Kinder auf älteren iPads (Speicherdruck), Lehrkräfte am iPad.                            | E2E: Kontext schließen, neu öffnen → derselbe Teilnehmer, derselbe Fortschritt.                                                              |
| B-020 | Supabase-Betrieb: Pausierung, Kontingente, Überwachung unbekannt                                                                 | Verfügbarkeit / Betrieb                           | P2               | offene Frage                      | –                    | S                      | alle Live-Raum-Nutzer.                                                                   | Dokumentierter Tarif, Alarme und Ferientest.                                                                                                 |
| B-016 | Zugangsdaten im Browser: Refresh-Token und ggf. WebDAV-Passwort im Klartext                                                      | Sicherheit Cloud-Abgleich                         | P3               | bestätigt (Code)                  | –                    | S                      | Lehrkräfte.                                                                              | Keine Token im Klartext im Speicher (Test).                                                                                                  |
| B-017 | Inhaltsübertragung: Geheimnisse entstehen auf dem Server; manuelle Codes sperrbar                                                | Kryptografie-Design                               | P3               | bestätigt (Code)                  | –                    | S–M                    | Lehrkräfte, Kinder (Verfügbarkeit des Abrufs).                                           | Der Server sieht nie ein Klartextgeheimnis (Vertragstest prüft Signatur der RPC).                                                            |
| B-018 | Leistungsbriefe, Aufgaben- und Entfernungscodes sind fälschbar                                                                   | Integrität Klassenkommunikation                   | P3               | bestätigt (Code)                  | –                    | S–M                    | Lehrkräfte (Vertrauen in Leistungsbriefe), Kinder (Streiche).                            | Ein unsignierter Aufgaben-QR wird abgewiesen (Test).                                                                                         |
| B-021 | Host-Header fließt ungeprüft in Metadaten                                                                                        | Web-Sicherheit                                    | P3               | bestätigt (repro.)                | –                    | S                      | keine unmittelbar.                                                                       | Test mit gefälschtem Header liefert die konfigurierte Domain.                                                                                |
| B-022 | Abhängigkeiten: Auditbefund harmlos, Begründung methodisch schief, Framework-Reife ein Risiko                                    | Lieferkette                                       | P3               | bestätigt (ausgeführt)            | –                    | S                      | Betreiber.                                                                               | `npm audit --omit=dev` umfasst die Worker-Laufzeit; das Register nennt den Prüfrhythmus mit Datum.                                           |
| B-023 | `SECURITY DEFINER` mit `search_path`, der `public` zuerst durchsucht                                                             | Datenbankhärtung                                  | P3               | bestätigt (Code)                  | –                    | S                      | Betreiber.                                                                               | Abfrage auf `pg_proc.proconfig` im Vertragstest grün.                                                                                        |
| B-024 | Sicherheits- und Offline-Eigenschaften sind kaum durch Tests abgesichert                                                         | Qualitätssicherung (Querschnitt)                  | P2               | bestätigt (Code)                  | –                    | M                      | alle (indirekt).                                                                         | Jeder Befund B-001 bis B-021 hat einen Regressionstest.                                                                                      |

#### Prüfinstanz C – QA, UI/UX, Barrierefreiheit (Detail: `2026-10-19-gesamtaudit/agent-c-qa-ux.md`)

| ID    | Befund                                                                                                                                    | Bereich                                                      | Schwere        | Evidenz            | Prüfung F              | Aufwand                      | Betroffene                                                                                 | Erfolgskriterium (kurz)                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- | ------------------ | ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| C-001 | Übungsrunden gehen bei einem Fehltipp, „Zurück“ oder Neuladen ohne Rückfrage verloren (außer Textbox)                                     | Schülerablauf, Fehler- und Abbruchverhalten                  | P2             | bestätigt (repro.) | Empfehlung angepasst   | M                            | jüngere Kinder und Kinder mit geringer Aufmerksamkeit (Fehltipps auf die große untere …    | E2E-Test je Modul: Runde starten, 3 Antworten, Neuladen bzw. Zurück → Angebot „Weitermachen“ mit Stand 3/10; Tipp auf die Leiste → …        |
| C-002 | Feste Merkzeit in der Textbox ohne Pause oder Verlängerung                                                                                | Barrierefreiheit (WCAG 2.2.1 „Zeitbegrenzung anpassbar“), …  | P2             | bestätigt (repro.) | Empfehlung angepasst   | S                            | Kinder mit LRS, langsame Leser, DaZ-Kinder, Kinder mit Aufmerksamkeitsschwierigkeiten.     | Bei aktivierter Einstellung endet keine Merkphase ohne Handlung des Kindes; ein Komponententest prüft das.                                  |
| C-003 | Erstes Öffnen: „Heute ist nichts dran“, und „Weiterlernen“ führt ein neues Kind in die Tastenwelt                                         | Schülerablauf (Szenario 1 „erstes Öffnen“), Orientierung     | P2             | bestätigt (repro.) | –                      | S (1–3), M (4)               | alle Kinder beim ersten Kontakt, besonders jüngere Kinder mit wenig Leseerfahrung (sie …   | E2E-Test „frisches Gerät“: Die Hauptschaltfläche führt in ein Deutsch- oder Mathe-Angebot; kein Widerspruch zwischen Statuszeile und …      |
| C-004 | Tastenwelt auf dem iPad: Bildschirmtastatur verdeckt Vorlage oder Tastaturgrafik                                                          | Schülerablauf auf Tablets, Bildschirmtastatur                | P3             | begr. Risiko       | –                      | S                            | alle Kinder an iPads ohne Tastaturhülle.                                                   | Auf einem iPad ohne Tastatur erscheint der Hinweis statt einer nicht nutzbaren Übung; Prüfung auf Gerät dokumentiert.                       |
| C-005 | Fokus geht beim Schließen von Blättern verloren; „Menü“ ohne Menü-Tastaturbedienung                                                       | Barrierefreiheit (WCAG 2.4.3 Fokusreihenfolge, 4.1.2 …       | P3             | bestätigt (repro.) | –                      | S                            | Kinder mit motorischen Einschränkungen (Schaltersteuerung, Tastatur), VoiceOver-Nutzer, …  | Nach Escape/Schließen steht der Fokus auf dem auslösenden Element (automatisierter Test für Wortspeicher, LernBox, Textbox, Lehrerdialoge). |
| C-006 | QR-Bogen druckt nur die erste Bildschirmseite: bei 24 Kindern fehlen 12 Codes                                                             | Lehrerablauf (Klasse einrichten, Einschreibung), Druck       | P2 (vorher P1) | bestätigt (repro.) | abgeschwächt           | S                            | Lehrkräfte beim Einrichten einer Klasse; die Hälfte der Kinder kann sich nicht per Bogen … | PDF eines Bogens mit 30 Schülern enthält alle 30 Namen ohne angeschnittene Codes und ohne Bedienelemente; automatisierter Test grün.        |
| C-007 | Sprache für Erwachsene: Fachwörter, lange Hinweistexte, keine vorgelesenen Anleitungen                                                    | Verständlichkeit für Kinder (Szenario 2 „Aufgabe nicht …     | P2             | bestätigt (Code)   | Teilaussage korrigiert | M                            | Erst- und Zweitklässler, DaZ-Kinder, Kinder mit LRS, Kinder mit geringer Aufmerksamkeit …  | Kein Schülertext über LIX 40; Glossar-Test grün; in einem kurzen Probelauf mit 5 Kindern der 2./3. Klasse können alle ohne Hilfe sagen, …   |
| C-008 | Widersprüchliche Statusanzeigen: „erledigt“ bei 6 offenen Karten, neue Karten als „schwierig“, „üben wir noch einmal“ bei „nichts fällig“ | Schülerablauf (Szenarien 3, 6, 7), Verlässlichkeit der …     | P2             | bestätigt (repro.) | –                      | S–M                          | alle Kinder, besonders Kinder mit Lernschwierigkeiten (sie verlassen sich auf die …        | Für jeden der fünf Fälle ein automatisierter Test; keine Ansicht nennt einen Stapel „erledigt“, solange Karten dieses Stapels in „Heute …   |
| C-009 | „Mein Fortschritt“ ist nur über Profil → „Klasse und Datenschutz“ erreichbar; parallele Einstiege verwirren                               | Navigation, Szenario 6 „Fortschritt verstehen“               | P3             | bestätigt (Code)   | –                      | S                            | Kinder (Selbstwirksamkeit braucht sichtbaren Fortschritt), Lehrkräfte, die Kinder auf …    | Fortschritt ist von „Lernen“ mit einem Tipp erreichbar; Navigationskonzept mit höchstens einem Einstieg je Modul dokumentiert.              |
| C-010 | Lehrerablauf: viele Einzelschritte, Inhalte hängen am Laufdiktat-Assistenten, Demo-Werte als echte Eingaben, Technikjargon                | Benutzerfreundlichkeit Lehrkraft (Klasse anlegen, Inhalte, … | P2             | bestätigt (repro.) | –                      | M (1, 3, 4, 6: S; 2, 5: M–L) | Lehrkräfte ohne Technikaffinität, Vertretungslehrkräfte, Kollegium bei einer schulweiten … | Eine Lehrkraft ohne Vorwissen richtet im Test eine Klasse mit 25 Kindern samt druckfertigem Bogen in unter 10 Minuten ein. Kein Formular …  |
| C-011 | Laufdiktat allein: kein Fokus auf dem Antwortfeld, Rückmeldung wird nicht angesagt                                                        | Barrierefreiheit (WCAG 4.1.3 Statusmeldungen, 2.4.3 …        | P3             | bestätigt (repro.) | –                      | S                            | Kinder mit VoiceOver oder Schaltersteuerung; alle iPad-Nutzer (zusätzlicher Tipp je …      | `s-ld-focus`-Prüfung meldet Fokus im Antwortfeld und eine Statusregion mit der Rückmeldung.                                                 |
| C-012 | Nach 0 % schlägt die Textbox als Hauptaktion den schwereren Durchgang vor                                                                 | Szenario 4 „frustrierende Bewertung“, Ablaufsteuerung        | P3             | bestätigt (repro.) | –                      | S                            | Kinder mit LRS, schwächere Schreiber, Kinder mit geringer Frustrationstoleranz.            | Komponententest: bei 0–59 % ist „Durchgang wiederholen“ die Hauptaktion.                                                                    |
| C-013 | Kopfrechnen zeigt vor der Runde alle Aufgaben mit Lösungen in derselben Reihenfolge; Einstieg ist ein Generator für Erwachsene            | Schülerablauf Kopfrechnen, Szenario 8 (Schwierigkeit …       | P2             | bestätigt (repro.) | –                      | S (Vorschau), M (Pakete)     | Kinder mit Rechenschwäche (Ablesen statt Rechnen), jüngere Kinder (überfordernde …         | Im Schülermodus erscheint vor der Runde keine Lösung; E2E-Test prüft, dass der Setup-Text kein „= <Ergebnis>“ der ersten Rundenaufgabe …    |
| C-014 | Testlücken bei kritischen Nutzerabläufen: Druck, Abbruch/Fortsetzen, Erstkontakt, Fokus-Rückgabe, Mehrtagesverlauf                        | Testabdeckung kritischer Abläufe (E2E, Barrierefreiheit)     | P2             | bestätigt (Code)   | –                      | M                            | alle; indirekt die Lehrkraft als einzige Entwicklerin bzw. einziger Entwickler, die sich … | Die sechs Szenarien laufen in CI; ein absichtlich wiedereingebauter Fehler aus C-006 oder C-008 lässt die Suite rot werden.                 |
| C-015 | Kleinere Bedien- und Darstellungspunkte (Sammelbefund)                                                                                    | Touch-Ziele, Rückmeldungsdarstellung, Konsistenz             | P3             | bestätigt (repro.) | –                      | S                            | jüngere Kinder (Feinmotorik), Kinder mit geringer Lesemotivation.                          | Alle Bedienelemente der Schülerseiten ≥ 44 px; Rückmeldung bei Totalfehlern höchstens zwei Zeilen.                                          |

#### Prüfinstanz D – Pädagogik und Diagnostik (Detail: `2026-10-19-gesamtaudit/agent-d-paedagogik.md`)

| ID    | Befund                                                                                                                                   | Bereich                                                  | Schwere | Evidenz                           | Prüfung F              | Aufwand                  | Betroffene                                                                                 | Erfolgskriterium (kurz)                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------- | --------------------------------- | ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | Abschreiben zählt als gesicherter Abruf: Stufe 1 hebt Leitner-Box und Merkstufe, „sicher“ nach zweimal Abschreiben                       | Wortspeicher, Lernwort-Lernstand, Tagesportion           | P1      | bestätigt (repro.)                | verschärft             | S für die Regel, M mit … | - alle Kinder im Wortspeicher, besonders schwache Rechtschreiber, die …                    | - Ein Regressionstest „dreimal Stufe 1 an drei Tagen → Box 1, Merkstufe ≤ 2“ ist grün. - „Sicher“ ist nur über Abrufe ohne Schriftbild an … |
| D-002 | Stufe 4 und die Lückenstufen verraten genau die Rechtschreibentscheidung, die geübt werden soll                                          | Wortspeicher, Aufgabenqualität                           | P2      | bestätigt (repro.)                | Empfehlung angepasst   | M                        | alle Wortspeicher-Nutzer. Besonders betroffen sind Kinder, die bis Stufe 4 üben und nie …  | - In Stufe 4 sind beliebig lange Eingaben möglich, ohne Hinweis auf die Länge. - Ein Test belegt für jede Phänomen-Wortbox, dass die …      |
| D-003 | Keine Kompetenzdiagnostik: kein Eingangstest, keine Kompetenzchecks, keine Lernverlaufsmessung, keine Kompetenzschätzung                 | Diagnostik, adaptive Steuerung                           | P1      | bestätigt (Code)                  | bestätigt              | L                        | - Lehrkräfte, die Förderentscheidungen treffen wollen - Kinder, die ohne Orientierung …    | - Für jedes Kind liegt je Kernbereich (Grundwortschatz-Rechtschreibung, Einspluseins/Einmaleins) eine Verlaufslinie aus vergleichbaren …    |
| D-004 | Fortschrittsanzeigen messen Rauschen, Sofortkorrektur oder Wiedererkennung statt Lernzuwachs                                             | Fortschrittsdarstellung, Rückmeldung zur Leistung        | P2      | bestätigt (repro.)                | –                      | M                        | - Kinder: Selbstbild und Selbstregulation - Lehrkräfte und Eltern: Laufzettel und …        | - Die Simulation D9 zeigt mit der neuen Kennzahl keinen Anstieg bei konstanter Fähigkeit. - D10 liefert 0.                                  |
| D-005 | Textbox: Der Hauptwert misst vor allem das Behalten des Textes; die Schwerpunktstatistik ist eine Scheindiagnose                         | Textbox, Bewertung, Diagnostik, Arbeitsbelastung         | P2      | bestätigt (repro.) / teils Risiko | Teilaussage korrigiert | M                        | - Kinder mit LRS und Arbeitsgedächtnisschwäche - Lehrkräfte, die die …                     | - Bei D8 erhält „fehlerfrei, zwei Sätze vergessen“ eine Rechtschreibquote von 100 %. - D11 meldet höchstens die tatsächlich fehlerhaften …  |
| D-006 | Fachliche Fehler in Wortlisten, Regeltexten, Zielwörtern und Bedeutungshilfen                                                            | Inhalte Rechtschreibung (Wortspeicher, Textbox, Stufe 6) | P2      | bestätigt (Code)                  | –                      | M (inhaltlich), S je …   | alle Kinder im Rechtschreibtraining, besonders Kinder, die sich an Regeltexten …           | - D3 liefert 0 bei -ng, silbentrennendem h und Langvokal-s ohne passenden Regeltext. - D4 liefert 0. - Die Prüfliste in …                   |
| D-007 | Wortboxen ohne Kontraste, ohne Niveaustufen und ohne lernstandsbezogene Auswahl                                                          | Wortspeicher, Differenzierung, Interleaving, Progression | P2      | bestätigt (Code) / teils Risiko   | –                      | M                        | jüngere Kinder (2./3. Klasse), schwache Rechtschreiber, DaZ (Instanz E).                   | - Jede Phänomenbox hat einen Kontrastanteil von mindestens 30 %. - Ein Kind mit Jahrgangsstufe 2 erhält nur Wörter der Stufe 1/2. - Der …   |
| D-008 | Rückmeldungen überwiegend „richtig/falsch“: kein Fehlerort, keine Strategie, keine Fehlerklassifikation                                  | Feedback aller Module                                    | P2      | bestätigt (repro.)                | Empfehlung angepasst   | M                        | alle Kinder, besonders LRS und Rechenschwäche. Lehrkräfte, die Fehlerarten wissen müssten. | - D6 liefert für „fehlender Punkt“ ein „richtig mit Hinweis“. - Ein Testkatalog mit je 3 Beispielen pro Mathe-Fehlerart wird korrekt …      |
| D-009 | Kopfrechnen: grobe Aufgabenfamilien, viele triviale Aufgaben, keine Messung der Rechenflüssigkeit                                        | Mathematik, Aufgabenqualität, Diagnostik                 | P2      | bestätigt (repro.)                | –                      | M                        | Kinder mit Rechenschwierigkeiten, besonders beim Ablösen vom zählenden Rechnen. …          | - D7 zeigt im Standard ≥ 50 % Zehnerübergang und ≤ 5 % triviale Aufgaben. - Die Fortschrittsseite zeigt je Einmaleinsreihe „sicher und …    |
| D-010 | LernBox: Selbsteinschätzung hebt bis Box 5; die getrennten Stände „Bedeutung“ und „Schreiben“ aus dem Konzept fehlen im Kartenmodell     | LernBox/Vokabeln                                         | P2      | bestätigt (repro.)                | –                      | M                        | Vokabellernende (Englisch GS 3/4, Mittelschule), Kinder mit LRS.                           | - D5 endet höchstens in Box 3. - Ein Tippfehler bei Box 4 führt zu Box 4, früher fällig. - Vault und Code stimmen überein.                  |
| D-011 | Kein geschlossener Förderkreislauf: Module erzeugen ungleiche oder keine Lernsignale; „20 Aufgaben“ statt eines Zeitbudgets              | Kohärenz des Lernsystems, Tagesportion                   | P2      | bestätigt (Code)                  | –                      | M                        | Kinder ohne Lehrkraftinhalte, Lehrkräfte, die eine kurze, planbare Einheit erwarten.       | - Ein Kind ohne Lehrkraftinhalte erhält täglich eine Portion mit neuen Grundwortschatz- und Mathe-Elementen. - Die Portion dauert im …      |
| D-012 | Leistungsdruck durch Tempo-Wettbewerb, Tempo-Punkte und öffentlich sichtbare Fehlerzahlen; Widerspruch zu den eigenen Motivationsregeln  | Motivation, Klassenklima                                 | P2      | bestätigt (Code) / teils Risiko   | –                      | S                        | - langsame Schreiber, Kinder mit LRS, ADHS oder Prüfungsangst - Klassen, in denen die …    | - Keine Anzeige von Tempo als Punktwert ohne Lehrkraftentscheidung. - Der Projektionsmodus zeigt keine personenbezogenen Fehlerzahlen.      |
| D-013 | Eigene Wortboxen ohne Schreibprüfung: Falschschreibungen werden eingeübt und als „richtig“ bestätigt                                     | Wortspeicher (eigene Wortboxen), LernBox (eigene Karten) | P3      | begr. Risiko                      | –                      | S–M                      | Kinder mit LRS, jüngere Kinder.                                                            | Unbekannte Wörter werden beim Anlegen gekennzeichnet.                                                                                       |
| D-014 | Tastenwelt: solider Lehrgang, aber Freischaltung nach einem einzigen genauen Durchgang, kleingeschriebene Nomen und wenig Sinn auf der … | Tastschreiben                                            | P3      | bestätigt (Code)                  | –                      | S                        | Tastenwelt-Nutzer, iPad-Klassen.                                                           | - Kein Wortpool enthält ein klein geschriebenes Nomen. - Die Freischaltung braucht ≥ 2 Tage.                                                |
| D-015 | Wiederholungsparameter sind unbelegt und werden nicht ausgewertet                                                                        | Spacing, Kalibrierung                                    | P3      | offene Frage                      | –                      | S–M                      | alle Lernenden. Die Lehrkraft als Entscheiderin über Parameter.                            | Eine Behaltensquote je Box ist sichtbar. Parameteränderungen sind damit begründet.                                                          |
| D-016 | Schreiberleichterung akzeptiert bedeutungsändernde Ein-Buchstaben-Abweichungen                                                           | LRS-Toleranz (Entscheidung 50), Live-Vokabeln            | P3      | bestätigt (Code)                  | –                      | S                        | Kinder mit Schreiberleichterung.                                                           | Ein Test „horse ≠ house“ ist grün.                                                                                                          |

#### Prüfinstanz E – Schularten, Differenzierung, Praxis (Detail: `2026-10-19-gesamtaudit/agent-e-schularten.md`)

| ID    | Befund                                                                                                                                       | Bereich                                                      | Schwere        | Evidenz                         | Prüfung F            | Aufwand                      | Betroffene                                                                                 | Erfolgskriterium (kurz)                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- | ------------------------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| E-001 | Das Kernmodell „ein Gerät = ein Kind“ passt nicht zur Geräteausstattung der Grund- und Förderschulen; die LRS-Erleichterung hängt am Gerät … | Unterrichtspraxis, Geräteorganisation, Inklusion …           | P1 ¹           | bestätigt (repro.)              | bestätigt            | S (1), L (2), M (3)          | Grundschulen und Förderzentren mit geteilten Geräten; Kinder mit LRS (Erleichterung …      | Test: Zwei Mitgliedschaften derselben Klasse auf einem Gerät → keine Erleichterung, Hinweis an die Lehrkraft. Doku nennt unterstützte …      |
| E-002 | Die Lehrkraft kann Differenzierung außerhalb des Live-Raums kaum steuern: an Kinder übertragbar sind nur Vokabeln                            | Differenzierung, Lehrerperspektive, Grundschule …            | P1             | bestätigt (Code)                | bestätigt            | S–M (1), L (2), M (3)        | Lehrkräfte aller Schularten; besonders Grundschule, Förderschule, Deutschklassen; …        | Eine Lehrkraft kann in unter 3 Minuten für drei Leistungsgruppen je einen QR erzeugen, der das Kind ohne weitere Auswahl in die …            |
| E-003 | Die Lehrkraft erfährt aus der Plattform fast nichts über Lernstände; die Live-Ergebnisse sind nur Tiernamen ohne Verlauf                     | Lehrerperspektive, Diagnostik im Unterricht, Spannungsfeld … | P1             | bestätigt (Code)                | bestätigt            | M (1), M (2), M–L (3), S (4) | Lehrkräfte aller Schularten, besonders Förderlehrkräfte und Klassenleitungen in Grund- …   | Nach einer Live-Runde kann die Lehrkraft ohne Mitschrift sagen, welches Kind welche Wörter falsch schrieb; nach vier Wochen kann sie je …    |
| E-004 | Kein Zielgruppen- und Niveaumodell: Sprache, Mengen und Eingabeform setzen selbstständige Leser und Tipper voraus                            | Eignung nach Jahrgangsstufe und Förderbedarf (Jgst. 1/2, …   | P2             | bestätigt (Code) / teils Risiko | –                    | S (1), M–L (2), M (3)        | Jgst. 1/2; Kinder mit Förderschwerpunkt Lernen, Sprache oder geistige Entwicklung; …       | Zielgruppe dokumentiert. In einer Beobachtung mit fünf Kindern der Zielstufe startet jedes Kind die vorgesehene Übung ohne …                 |
| E-005 | Feste Wortboxen enthalten Kriegs-, Gewalt- und Todeswörter in zufälligen Runden – belastend für Grundschulkinder und Kinder mit …            | Altersangemessenheit, DaZ/Deutschklassen, traumasensibler …  | P3 (vorher P2) | bestätigt (repro.)              | abgeschwächt         | M                            | Grundschulkinder, Kinder in Deutschklassen, Kinder mit Fluchterfahrung, Förderschulen.     | Jede feste Wortbox trägt eine Niveaustufe; ein Test stellt sicher, dass Grundstufenboxen keine Wörter einer gepflegten Ausschlussliste …     |
| E-006 | LRS-Unterstützung setzt an der falschen Stelle an: Toleranz nur bei Vokabeln im Live-Raum, keine Anpassung in den Deutsch-Modulen            | Inklusion, LRS, Nachteilsausgleich/Notenschutz (Bayern), …   | P2             | bestätigt (repro.)              | –                    | M (1), L (2), S (3)          | Kinder mit LRS, DaZ-Kinder, Kinder mit Förderschwerpunkt Lernen; Lehrkräfte und …          | Kein Datenfeld mehr, das „LRS“ oder eine Diagnose bedeutet; mindestens drei Übungsanpassungen wirken in Wortspeicher, Textbox und …          |
| E-007 | Das klassische Laufdiktat verlangt eine Zwei-Hand-Geste ohne Alternative für Kinder mit motorischen Einschränkungen oder Bildschirmleser     | Inklusion, Barrierefreiheit, Förderschwerpunkt körperliche … | P2             | bestätigt (Code)                | Empfehlung angepasst | S–M                          | Kinder mit Förderschwerpunkt körperliche und motorische Entwicklung oder Sehen in …        | Ein Kind kann den Laufdiktat-Modus mit einem einzelnen Zeiger oder per Tastatur mit einer Taste vollständig bearbeiten; axe- und …           |
| E-008 | Organisationsaufwand: Einschreibung je Kind und Gerät, keine Übergabe an Vertretung, Teamteaching oder neues Schuljahr                       | Lehrerperspektive, Schulorganisation                         | P2             | bestätigt (Code)                | –                    | S (1), M (2), M (3), S (4)   | Klassenleitungen, Fachlehrkräfte (z. B. Englisch in Jgst. 3/4), Förderlehrkräfte, MSD, …   | Neues Schuljahr ohne erneutes Scannen; eine Vertretung kann mit einem Übergabecode ohne Personendaten einen Klassenraum mit Wirkung des …    |
| E-009 | „Schulartübergreifend“ ist nicht eingelöst: Inhalte und Ansprache passen faktisch zu Jgst. 3–6; in Sek I und Gymnasium trägt nur die LernBox | Eignung Sekundarstufe I, Realschule, Gymnasium (G9), …       | P2             | bestätigt (Code) / teils Risiko | –                    | S (1), L (2), L (3)          | Lehrkräfte der Sek I und des Gymnasiums; Schulleitungen, die über eine schulweite …        | README und Vault 00 nennen Zielschularten und -stufen; jede Funktion trägt im Freigaberegister eine Zielstufe; eine Sek-I-Lehrkraft findet … |
| E-010 | Differenzierung nach oben und für Motivationsschwache fehlt weitgehend                                                                       | Differenzierung (leistungsstarke und hochbegabte Kinder, …   | P3             | bestätigt (Code) / teils Risiko | –                    | M–L                          | leistungsstarke und hochbegabte Kinder; Kinder mit geringer Lernmotivation, besonders in … | Ein Kind, das eine Wortbox im Einstieg fehlerfrei bewältigt, erhält sie nicht als Übungsportion; die Lehrkraft kann ein Wochenziel je Kind … |

#### Prüfinstanz G – Funktionale Korrektheit (Detail: `2026-10-19-gesamtaudit/agent-g-korrektheit.md`)

| ID    | Befund                                                                                                                                       | Bereich                                                     | Schwere        | Evidenz                           | Prüfung F            | Aufwand              | Betroffene                                                                                 | Erfolgskriterium (kurz)                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------- | --------------------------------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| G-001 | Wortspeicher Stufe 5: richtig geschriebene, mit Leerzeichen getrennte Wörter gelten alle als falsch und stufen jedes Wort auf Box 1 zurück   | Antwortprüfung Wortspeicher (Merkblock, Stufe 5), …         | P1             | bestätigt (repro.) / teils Risiko | bestätigt            | S                    | alle Kinder, die Stufe 5 mit Blockgröße > 1 wählen, besonders auf iPads ohne …             | `evaluateLearningWordBlock(["Hund","Katze","Maus"], "Hund Katze Maus").allCorrect === true`; ein Browsertest auf iPad-Viewport gibt drei …  |
| G-002 | Typografische Apostrophe und Anführungszeichen sowie zerlegte Umlaute machen richtige Antworten falsch (LernBox, Laufdiktat)                 | Antwortprüfung LernBox, Laufdiktat (Text und Vokabeln, …    | P2             | bestätigt (repro.) / teils Risiko | –                    | S                    | Kinder mit Englisch-/Französisch-Vokabeln (Apostroph, Elision „l'école“), Laufdiktat mit … | Alle Zeilen der obigen Tabelle liefern „richtig“; ein Eigenschaftstest „Ersetzen eines Zeichens durch seine typografische Variante ändert … |
| G-003 | LernBox und Laufdiktat-Vokabeln kennen nur „/“ als Alternativtrenner; übliche Schreibweisen aus Vokabellisten („(to) go“, „home / house“, …  | Antwortprüfung LernBox, Import, Vokabelpakete               | P2             | bestätigt (repro.)                | Empfehlung angepasst | M                    | Kinder der Sekundarstufe mit Lehrwerkslisten; Lehrkräfte, die Listen per „Viele …          | Für „(to) go“ werden „go“ und „to go“ akzeptiert; Importvorschau zeigt die erkannten Alternativen; Test für Semikolon in der Antwort.       |
| G-004 | Laufdiktat zerlegt Texte an jedem Punkt: Datumsangaben, Abkürzungen, Uhrzeiten, Dezimalzahlen und wörtliche Rede ergeben unsinnige …         | Laufdiktat (live und allein), Aufbereitung des Lehrer- …    | P2             | bestätigt (repro.)                | –                    | S–M                  | Lehrkräfte mit eigenen Diktattexten (Datumsangaben und „z. B.“ sind in …                   | Die sieben Beispiele ergeben jeweils zwei bzw. drei vollständige Sätze; Eigenschaftstest: Verbinden der Abschnitte mit Leerzeichen ergibt … |
| G-005 | LernBox: Beide Richtungen teilen sich `lastReviewed`; die 8-Stunden-Regel blockiert den Aufstieg der anderen Richtung                        | Leitner-Logik LernBox (Vault 06 „beide Richtungen …         | P2             | bestätigt (repro.)                | –                    | S                    | alle LernBox-Nutzer mit Rückrichtung (ab Box 2 in der Portion), besonders Kinder mit …     | Der Test ergibt `reverseAfterBoth = 2`; ein Eigenschaftstest „Abfragen der einen Richtung ändern das Ergebnis der anderen nicht“ ist grün.  |
| G-006 | „1/3/7/14 Tage“ verschieben sich bei fester Übungszeit um einen Kalendertag (Lernwörter, Mathe), weil Fälligkeit auf die Minute gerechnet …  | Tagesportion, Fälligkeit, Zeitrechnung                      | P2             | bestätigt (repro.)                | Empfehlung angepasst | M (inkl. Migration … | Kinder, die regelmäßig zur gleichen Zeit üben (Unterrichtsroutine); Lehrkräfte, die sich … | Der obige Test ergibt für alle drei Module „Donnerstag bzw. Dienstag enthalten“; Eigenschaftstest: Für jede Übungszeit t und jede …         |
| G-007 | Tagesportion: Eine falsche Antwort zählt als „erledigt“; gelöschte Karten bleiben für immer offen und erzeugen eine Sackgasse                | Tagesportion, Fortschrittsanzeige der Startseite            | P2             | bestätigt (repro.)                | –                    | S                    | Kinder (Erfolgsmeldung trotz Fehlern; Endlosschleife „Weiterlernen“), Lehrkräfte und …     | Test „Karte der Portion gelöscht → `total` sinkt oder Element erledigt“; die Startseite unterscheidet „bearbeitet“ und „richtig“.           |
| G-008 | Zahlenprüfung: absolute Toleranz 0,01 wertet typische Kommafehler als richtig; Tausenderpunkt und Tausenderleerzeichen werten richtige …     | Mathe-Antwortprüfung (Kopfrechnen inkl. eigener Aufgaben, … | P2             | bestätigt (repro.)                | –                    | S                    | Kinder mit Dezimal- und Größenaufgaben (Sek I, Klasse 4 Größen); Kinder im Zahlenraum …    | Tabellentest: „0,001“ für 0,01 falsch; „1.000“ und „1 000“ für 1000 richtig; „1.000“ für 1 falsch; „−3“ für −3 richtig.                     |
| G-009 | Lückenaufgaben mit Null sind mehrdeutig („0 · _ = 0“): jede andere richtige Zahl wird als Fehler gewertet                                    | Mathe-Generator, Lückenmodus (Einmaleins, Division)         | P2             | bestätigt (repro.)                | Empfehlung angepasst | S                    | Grundschulkinder beim Einmaleins mit Lücken; Kinder mit Rechenschwäche, die gerade die …   | Eigenschaftstest: Für jede erzeugte Lückenaufgabe gibt es genau eine ganze Zahl im Zahlenraum, die die Gleichung erfüllt – oder die …       |
| G-010 | Sicherung/Cloud-Abgleich: „neuerer Datensatz gewinnt“ überschreibt monotone Werte; eine bestandene Tastenwelt-Lektion wird wieder …          | Persönliche Sicherung und Schüler-Cloud-Abgleich …          | P2             | bestätigt (repro.)                | –                    | S (Tastenwelt), M …  | Kinder mit Schul- und Heimgerät oder Gerätewechsel, die den Cloud-Abgleich oder …          | Der Test ergibt nach dem Abgleich `completed: true, bestWpm 18, bestAccuracy 96`; Kommutativitätstest grün.                                 |
| G-011 | Fehler in der Unterrichtsrunde beschleunigen den LernBox-Aufstieg: „practice“/„reset“ machen die Karte fällig, ohne den Abrufzeitpunkt zu …  | Laufdiktat → LernBox (Entscheidung 49), Leitner-Regeln …    | P2 (vorher P1) | bestätigt (repro.)                | abgeschwächt         | S                    | alle Kinder, deren Lehrkraft Vokabel-Laufdiktate mit Übernahme nutzt (Standard „Nur …      | Im Test ergeben „practice“ und „reset“ nach 10 Minuten keinen Aufstieg; nach ≥ 8 Stunden genau eine Box.                                    |
| G-012 | Laufdiktat → Wortspeicher übernimmt Satzanfänge großgeschrieben; die Einzelwortübung verlangt dann „Heute“ und wertet das richtige „heute“ … | Übernahme Laufdiktat → Wortspeicher (Plan 2.8, …            | P2             | bestätigt (repro.)                | –                    | S (Übernahme), M …   | Kinder, deren Lehrkraft Text-Laufdiktate mit Übernahme in den Wortspeicher nutzt; Kinder … | Der Test liefert keine Satzanfangswörter mit fälschlicher Großschreibung; „essen“ und „Essen“ haben getrennte Lernstände.                   |
| G-013 | Laufdiktat allein: Eingabefeld ohne `autocorrect="off"` – die iPad-Autokorrektur kann Rechtschreibfehler vor der Prüfung beheben             | Laufdiktat allein (`/frei/german/laufdiktat`), …            | P2             | begr. Risiko                      | –                    | S                    | Kinder, die das Laufdiktat zu Hause oder in Freiarbeit allein üben.                        | Alle Antwortfelder tragen `autocorrect="off"`, `autocapitalize`, `spellcheck=false` und blockieren `insertReplacementText`.                 |
| G-014 | Kleinere Korrektheitsmängel (gesammelt)                                                                                                      | verschiedene                                                | P3             | bestätigt (repro.)                | –                    | S je Punkt           | je Punkt Grundschulkinder (1), Lehrkräfte mit eigenen Aufgaben (2), Kinder nach …          | je ein Regressionstest pro Punkt.                                                                                                           |

#### Prüfinstanz F – Red Team (neue Befunde) (Detail: `2026-10-19-gesamtaudit/agent-f-redteam.md`)

| ID    | Befund                                                                  | Bereich                                       | Schwere | Evidenz            | Prüfung F                | Aufwand | Betroffene                                                                              | Erfolgskriterium (kurz)                                                                                                                     |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------- | ------- | ------------------ | ------------------------ | ------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001 | „Wort zeigen“ schützt den Lernstand besser als ein ehrlicher Versuch    | Wortspeicher, Lernwort-Lernstand, Hilfe-Regel | P2      | bestätigt (repro.) | bestätigt (Hauptinstanz) | S       | - Kinder im Wortspeicher, besonders fehlerscheue und schwache Rechtschreiber, die bei … | Regressionstest „Hilfe → richtig“ ergibt nie einen längeren Abstand als „falsch → richtig“. Beide Wege ergeben höchstens Box 1, fällig in … |
| F-002 | Ergebnis-CSV wird beim Beenden des Live-Raums ungefragt heruntergeladen | Lehrer-Live-Raum, Daten auf geteilten Geräten | P3      | bestätigt (Code)   | –                        | S       | Lehrkräfte an geteilten Tafel- und Koffergeräten; Kinder, deren pseudonyme Ergebnisse … | Test: „Raum beenden“ erzeugt ohne Klick keinen Download.                                                                                    |

¹ B-010 und E-001 (ein gemeinsamer Befund): P1 bei geteilten Geräten (Klassensatz, Koffer), P2 bei 1:1-Ausstattung.
² B-003: P2 im Grundschulpilot auf verwalteten iPads, P1 vor einem Einsatz in der Sekundarstufe oder einem breiteren Rollout.

## D – Die zehn wichtigsten Probleme

Rangfolge nach Folgen für Lernen, Daten und Zulässigkeit, nicht nach Anzahl der
Befunde. Zusammengehörige Befunde sind gebündelt; die Schwere ist der Stand
nach der Gegenprüfung.

| Rang | Problem                                                                                                                                                                                                                                                                                                                  | Befunde                                         | Schwere                              | Evidenz                                 | Warum es oben steht                                                              |
| ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------- |
|    1 | **Der Lernstand im Kernmodul Rechtschreibung wird still falsch berechnet.** Abschreiben zählt als Abruf und hebt Box und Merkstufe; Lernwörter steigen ohne Fälligkeit; richtige Stufe-5-Antworten werden als dreifacher Fehler gespeichert. Vier Abschreibrunden an einem Nachmittag ergeben „gefestigt, 30 Tage Ruhe“. | A-004, D-001, G-001 (dazu F-001, G-011, G-005)  | P1                                   | reproduziert (A, D, F, G, Hauptinstanz) | trifft das erklärte Hauptziel; für Kind und Lehrkraft unsichtbar                 |
|    2 | **Die Sicherung versagt, sobald ein Kind LernBox-Ordner nutzt**, und strikte Datenverträge machen jede Schemaänderung zum Ausfallrisiko.                                                                                                                                                                                 | B-001, A-001                                    | P1 (Bündel)                          | reproduziert                            | Sicherung ist die einzige Absicherung des rein lokalen Lernstands                |
|    3 | **Keine Maßnahme gegen Speicherlöschung unter iPadOS/Safari**, keine Wiederherstellungsführung auf einem leeren Gerät.                                                                                                                                                                                                   | B-002, A-018                                    | P1                                   | Codeanalyse, Recherche                  | Totalverlust ohne Vorwarnung möglich, besonders bei Safari statt Home-Bildschirm |
|    4 | **Ein Gerät ist eine Person.** Auf geteilten Geräten mischen sich Lernstände; die Schreiberleichterung gilt für alle Kinder des Geräts.                                                                                                                                                                                  | B-010, E-001                                    | P1 bei geteilten Geräten, P2 bei 1:1 | reproduziert                            | schließt Klassensätze und Koffer-iPads aus, also gerade die Grundschule          |
|    5 | **Der Rechtsrahmen trägt keinen Echtbetrieb.** Das eigene Impressum untersagt den Einsatz, der laut Code stattfindet; AVV, Verzeichnis, Schwellwertprüfung und Freigabe fehlen; die Datenschutzerklärung ist teils falsch.                                                                                               | B-011                                           | P1                                   | Dokumenten- und Codeanalyse             | betrifft die Zulässigkeit; rechtlich zu prüfen, nicht Rechtsberatung             |
|    6 | **Lehrerdaten sind auf geteilten Geräten ungeschützt** („Lehrer-Login“ ohne Login), obwohl der Abgleich sie planmäßig auf den Tafelrechner legt; die CSV landet beim Beenden automatisch im Download-Ordner.                                                                                                             | B-009, E-003 (Hinweis F)                        | P1                                   | Codeanalyse                             | Klarnamen und LRS-Merkmale vor der Klasse                                        |
|    7 | **Die Lehrkraft kann außerhalb des Live-Raums kaum steuern und erfährt fast nichts** über Lernstände.                                                                                                                                                                                                                    | E-002, E-003                                    | P1 (Konzeptlücke)                    | Codeanalyse                             | der Förderkreislauf aus Vault 22 bleibt offen                                    |
|    8 | **Es gibt keine Diagnostik; „adaptiv“ und „diagnosegestützt“ überziehen.** Fortschrittsanzeigen messen teils Abschreiben, Wiedererkennung oder Zufall.                                                                                                                                                                   | D-003, D-004, D-011                             | P1 (Konzeptlücke)                    | Codeanalyse, reproduziert               | Erwartungen von Lehrkräften und Schulleitung werden nicht eingelöst              |
|    9 | **Richtige Antworten werden als falsch gewertet und Inhalte enthalten Fachfehler:** typografische Zeichen, Synonym-Schreibweisen, Tausendertrennung, Nulllücken, Satzanfänge; falscher s/ss/ß-Regeltext, belastende Wörter in Grundstufenboxen.                                                                          | G-002, G-003, G-008, G-009, G-012, D-006, E-005 | P2 (Bündel; E-005 P3)                | reproduziert                            | untergräbt Vertrauen und lehrt im Einzelfall Falsches                            |
|   10 | **Die Kinderoberfläche überfordert ohne Lehrkraft:** Runden enden ohne Rückfrage, Erwachsenensprache, Erstkontakt in der Tastenwelt, widersprüchliche Statusanzeigen.                                                                                                                                                    | C-001, C-007, C-003, C-008                      | P2 (Bündel)                          | reproduziert im Browser                 | entscheidet über selbstständiges Arbeiten                                        |

Knapp dahinter: öffentliche Realtime-Kanäle (B-003), unvollständiger QR-Bogen
(C-006), Plattformrisiko vinext/Cloudflare (A-007) und eingeschränkter
Offlinebetrieb (B-013).

## E – Die zehn größten Verbesserungschancen

„Reparatur“ behebt einen Fehler am Bestehenden, „neue Funktion“ erweitert den
Umfang. Die Reihenfolge gewichtet Nutzen gegen Aufwand.

| Rang | Chance                                                                                                                                    | Art                       | Aufwand | Befunde                    | Erwarteter Nutzen                                                                  |
| ---: | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | -------------------------- | ---------------------------------------------------------------------------------- |
|    1 | Lernwort-Regeln und Stufe 5 korrigieren (Fälligkeit, Abschreiben und „Wort zeigen“ ohne Aufstieg, ein Feld je Wort, Übungsmenge sichtbar) | Reparatur                 | S–M     | A-004, D-001, F-001, G-001 | Der Wortspeicher misst wieder, was er anzeigt; größter Lerngewinn je Stunde Arbeit |
|    2 | Sicherung reparieren, Strukturtest und tolerantes Lesen                                                                                   | Reparatur                 | S–M     | B-001, A-001               | Schutz vor stillem Datenverlust; Voraussetzung für jede spätere Formatänderung     |
|    3 | Installation vor dem ersten Lernen und Wiederherstellung auf leerem Gerät anbieten                                                        | Reparatur                 | S       | B-002                      | wirksamster Hebel gegen Speicherlöschung                                           |
|    4 | Gemeinsame Antwort-Normalisierung und exakte Zahlenprüfung                                                                                | Reparatur                 | S       | G-002, G-003, G-008, G-009 | weniger falsche Rückmeldungen, mehr Vertrauen                                      |
|    5 | Auftrags-QR für Lernwörter (`?woerter=` existiert bereits), später für Zahlenraum und Text                                                | neue Funktion, klein      | S–M     | E-002                      | Differenzierung ohne Personendaten und ohne Server                                 |
|    6 | Fehlerwörter je Tier in der Lehreransicht, CSV nur auf Klick                                                                              | Reparatur/kleine Funktion | S       | E-003, B-009               | erster Rückkanal aus vorhandenen Daten                                             |
|    7 | Inhaltskorrekturen in den Wortboxen und Bedeutungshilfen                                                                                  | Reparatur                 | S–M     | D-006, E-005               | fachlich richtige, grundschulgeeignete Inhalte                                     |
|    8 | Abbruchdialog, Fortsetzen und Leerzustand für neue Kinder                                                                                 | Reparatur                 | S–M     | C-001, C-003               | weniger verlorene Arbeit und Verwirrung                                            |
|    9 | Einsatzrahmen und Datenschutzpaket für die Schulleitung                                                                                   | Organisation              | S–M     | B-011, B-020               | macht den Einsatz zulässig und übertragbar                                         |
|   10 | Kleiner, ausgewerteter Probedurchlauf mit geübten und ungeübten Wörtern                                                                   | Organisation              | M       | D-015, I.5                 | erste belastbare Aussage zur Wirksamkeit                                           |

Die ersten acht Chancen sind Reparaturen oder kleine Ergänzungen bestehender
Wege. Keine neue Lernfunktion steht in der oberen Hälfte: Der größte Hebel
liegt darin, das Vorhandene korrekt und verlässlich zu machen.

## F – Pädagogisches Gutachten

Grundlage: Bericht D (`agent-d-paedagogik.md`) mit 16 Befunden und 16
Reproduktionen, Bericht E (Schularten), Bericht C (Abläufe) sowie eigene
Stichproben der Hauptinstanz (D-001, D-006 Punkt 1 unabhängig bestätigt).
Forschungsaussagen sind als **[F]** (forschungsgestützt, mit Grenzen) oder
**[H]** (plausible Hypothese) gekennzeichnet; Quellen stehen in Bericht D,
Abschnitt 14.

### F.1 Gesamturteil

Lernraum hat die **richtigen pädagogischen Leitideen** gewählt:

- Abrufübung statt Wiedererkennen
- verteilte Wiederholung
- ein Fading-Weg vom Abschreiben zum freien Schreiben (Merkstufen 1–6)
- eine gedeckelte Tagesportion
- eine bewusst zurückhaltende Motivationsschicht

Im Kernmodul Rechtschreibung **neutralisieren die Bewertungsregeln diese Ideen**:

- Abschreiben auf Stufe 1 zählt als selbstständiger Abruf und hebt die
  Wiederholungsbox (D-001).
- Die Wiederholung der Lernwörter kennt keinen Fälligkeitsschutz (A-004).
- Längenstriche verraten die Rechtschreibentscheidung (D-002).
- Die Tagesportion wählt für fällige Wörter die Stufe der letzten Runde,
  ohne frühere Runde die leichteste Stufe vor (präzisiert durch F).
- „Wort zeigen“ schützt den Lernstand besser als ein ehrlicher Fehlversuch
  (F-001).

Ein Kind kann so an einem Nachmittag durch Abschreiben alle Wörter einer Box auf
„sicher“ und für 30 Tage aus der Tagesportion bringen (im freien Üben kommen
sie zufällig wieder, F). Das ist der
folgenreichste pädagogische Befund des Audits, weil er unbemerkt bleibt: Die
Anzeigen steigen, das Kind ist zufrieden, die Lehrkraft sieht „sicher“.

**Diagnostik gibt es nicht** (D-003): keinen Eingangstest, keine
Kompetenzchecks, keine Lernverlaufsmessung und keine Kompetenzschätzung. Das
erklärte Ziel „diagnosegestützte adaptive Lernangebote“ ist daher **nicht
umgesetzt**, auch nicht teilweise. „Adaptiv“ bedeutet im Code nur:

- Fehler werden wieder fällig.
- Abstände wachsen.
- Eine Tagesportion mischt nach festen Kontingenten.

Das ist eine solide **regelbasierte Wiederholungssteuerung**, aber keine
diagnosegestützte Adaption.

Urteil: Die Plattform ist heute eine **gut gebaute Sammlung von
Übungswerkzeugen mit einem dünnen gemeinsamen Kern**, kein geschlossener
Förderkreislauf (D-011). In der Hand einer Lehrkraft, die Strategien einführt,
Inhalte prüft und Ergebnisse deutet, kann sie sinnvolles Üben unterstützen.
Ohne diese Begleitung droht „zufriedene Beschäftigung“: Die Kinder sind aktiv,
die Anzeigen steigen, aber ob das freie Schreiben besser wird, bleibt
ungewiss **[H]**.

### F.2 Lernwirksamkeit nach Prinzipien

| Prinzip               | Stand der Forschung (Grenzen)                                                                                         | Umsetzung                                                                                              | Urteil                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Abrufübung            | **[F]** robust, auch beim Rechtschreiben jüngerer Kinder (Jones et al.); meist Laborwörter, kurze Behaltensintervalle | LernBox-Schreiben, Wortspeicher 5/6, Laufdiktat gut; Stufe 1/4 und Selbsteinschätzung zählen als Abruf | Prinzip richtig, Nachweisstärke nicht unterschieden    |
| Verteiltes Üben       | **[F]** verteilt > massiert; wachsende ≈ gleichbleibende Abstände (Latimier et al. 2021)                              | LernBox und Mathe mit Fälligkeitsschutz; Lernwörter ohne                                               | gut in der LernBox, verfehlt im Rechtschreib-Kernmodul |
| Interleaving          | **[F]** wirkt bei ähnlichen Kategorien; für reine Wortlisten nicht belegt                                             | Wortboxen nur mit Positivbeispielen, keine Kontraste (D-007)                                           | Ansatz vorhanden, wirksame Stelle fehlt                |
| Automatisierung       | **[F, n. o. v.]** Basisfakten brauchen Flüssigkeit                                                                    | keine Antwortzeit, Mathe nach vier Antworten „gefestigt“ (D-009)                                       | schwach                                                |
| Transfer              | **[F, n. o. v.]** Transfer ins freie Schreiben kleiner als Übungseffekt                                               | Textbox wiederholt denselben Text, Bestwert über Wiederholung                                          | Wiedererkennung wird als Können ausgewiesen            |
| Feedback              | **[F]** Hattie & Timperley; Kluger & DeNisi (ein Teil der Rückmeldungen schadet)                                      | Wortspeicher und Textbox gut auf Aufgabenebene; Laufdiktat und Kopfrechnen nur richtig/falsch          | mittel bis schwach                                     |
| Fehlvorstellungen     | **[F, n. o. v.]** diagnostische Fehleranalyse ist didaktischer Standard                                               | keine Fehlerklassifikation (D-008), obwohl Daten vorliegen                                             | fehlt                                                  |
| Kognitive Belastung   | **[F]** Sweller; Arbeitsgedächtnis bei LRS häufig begrenzt                                                            | Textbox-Durchgang 4 verlangt vollständigen Textabruf (D-005)                                           | für die Zielgruppe LRS problematisch                   |
| Selbstregulation      | **[F, n. o. v.]** Kinder überschätzen sich                                                                            | freie Wahl ohne Ziel- oder Planungshilfe, Selbsteinschätzung zählt voll                                | viel Wahlfreiheit, wenig Gerüst                        |
| Motivation ohne Druck | **[F]** Selbstbestimmungstheorie; Wirkung von Gamification klein und kontextabhängig                                  | Motivation aus, keine Minuspunkte, Rückstand verborgen; aber Tempo-Punkte, Battle nach Tempo           | überwiegend gut                                        |

### F.3 Module im Einzelnen und konkrete Verbesserungen

**Wortspeicher (Kernmodul Rechtschreibung)**

- Die Stufenidee ist didaktisch stark und entspricht im Kern dem gut belegten
  Cover-Copy-Compare-Verfahren. Der Buchstabenvergleich und die Hinweise bei
  gleich klingenden Wörtern sind die beste Rückmeldung der Plattform.
- Verbesserungen:
  1. Stufen 1–3 als Üben ohne Box-Aufstieg werten.
  2. Die Box nur bei Abruf ohne Schriftbild heben; Stufe und Hilfeart im
     Ereignis speichern.
  3. Fällige Wörter in der Tagesportion mindestens auf Stufe 4 (ohne
     Längenstriche) oder 6 vorwählen.
  4. Stufe 4 ohne Längenstriche anbieten; Lücken der Stufen 2/3 an die
     kritische Stelle setzen (Entscheidungslücke s/ss/ß, h, ie).
  5. Inhalte korrigieren:
     - s/ss/ß-Regeltext richtigstellen (stimmhaft/stimmlos, Verlängern)
     - -ng aus der Auslautverhärtung nehmen
     - silbentrennendes h vom Dehnungs-h trennen
     - Bedeutungshilfen ohne Zielwort formulieren
     - Strategie je Wort statt je Box angeben
  6. Kontrastboxen („mit oder ohne h?“, „i oder ie?“) und Niveaukennzeichnung
     nach dem bayerischen Grundwortschatz (623 Wörter bis Jahrgangsstufe 4)
     einführen.
  7. Eigene Wörter vor der Übernahme gegen eine Wortliste prüfen (D-013).

**Textbox**

- Texte sind kindgerecht, die Satzlängen altersgerecht. Vier Durchgänge mit
  wachsender Ausblendung sind schlüssiges Fading.
- Verbesserungen:
  1. Durchgang 4 als Diktat (satzweise vorlesen) gestalten oder zwei Kennzahlen
     zeigen: Rechtschreibquote und Vollständigkeit.
  2. Die Schwerpunktstatistik nur aus Zielwörtern berechnen.
  3. „Gemeistert“ nicht über „Durchgang wiederholen“ erreichbar machen.
  4. Eine Transferprobe mit ungeübtem Paralleltext anbieten.
  5. Für „leicht“ eine Einheit von höchstens 10–12 Minuten anstreben.

**LernBox (Vokabeln)**

- Die Leitner-Regeln (kein Aufstieg vor Fälligkeit, 8-Stunden-Fenster, ein
  Aufstieg je Fälligkeit) stehen der Spacing-Forschung näher als viele
  Karteikarten-Apps.
- Verbesserungen:
  1. Selbsteinschätzung höchstens bis Box 2–3 zählen lassen.
  2. Einen Fast-richtig-Pfad einführen: Box bleibt, früher fällig.
  3. Die vorhandene zweite Chance in der Oberfläche anbieten.
  4. Getrennte Stände „Bedeutung/Schreiben“ entweder umsetzen oder im Konzept
     streichen.

**Kopfrechnen**

- Neue Aufgaben derselben Familie statt bloßer Kopien und Lückenaufgaben sind
  gut.
- Verbesserungen:
  1. Den Generator gewichten: Zehnerübergang ≥ 50 %, triviale Aufgaben ≤ 5 %,
     Kern- und Nachbaraufgaben.
  2. Familien um „Übergang ja/nein“ und Stellenwerttyp erweitern.
  3. Antwortzeit lokal erfassen, um „richtig und flüssig“ zu unterscheiden.
  4. Eine einfache Fehlerklassifikation einführen (Zählfehler ±1,
     Zehnerübergang ±10, Zahlendreher, Nachbarfakt) mit Strategiehinweis.
  5. Mathe-Fortschritt auf der Fortschrittsseite zeigen.

**Laufdiktat (live und allein)**

- Die Übernahme nach Ergebnis (Entscheidung 49) ist eine ehrliche, kleine
  Diagnose aus dem Unterricht. Die Lehreransicht mit „Häufigste Fehler“ und
  „Braucht Hilfe“ liefert echte formative Information.
- Verbesserungen:
  1. Texte wortweise auswerten und das Fehlerwort markieren; Satzzeichen und
     Leerzeichen als Hinweis statt als Fehler werten.
  2. Tempo-Punkte entfernen oder abschaltbar machen; Battle nach Genauigkeit
     werten.
  3. Einen Projektionsmodus ohne Namen und Fehlerzahlen anbieten.
  4. Textrunden im Laufdiktat allein als Lernereignis speichern.

**Tastenwelt**

- Der Lehrgang ist systematisch.
- Verbesserungen:
  1. Freischaltung erst nach zwei Durchgängen an verschiedenen Tagen.
  2. Keine kleingeschriebenen Nomen in den Wortpools.
  3. Auf Geräten mit Bildschirmtastatur einen eigenen Weg „Tippgenauigkeit“ ohne
     Fingerlektionen anbieten.

### F.4 Diagnostik und adaptive Steuerung: Bewertung des angedachten Konzepts

Das vom Auftraggeber angedachte Konzept „Eingangstest → Übungsphasen →
wiederkehrende Kompetenzchecks“ ist **in dieser Form nicht zu empfehlen**:

1. Ein für Kinder zumutbarer Eingangstest liefert je Teilkompetenz zu wenige
   Aufgaben für eine verlässliche Einzeldiagnose. Er erzeugt Prüfungsgefühl und
   veraltet schnell.
2. Eine Einstufung nützt nur, wenn ein Steuerungsmechanismus sie verwendet. Der
   fehlt heute. Erst die Steuerung bauen, dann messen.
3. Wiederkehrende Checks sind nur aussagekräftig mit parallelen Formen,
   gleichen Bedingungen ohne Hilfen, kurzer Dauer und einem curricularen
   Bezug. Ohne diese Bedingungen messen sie die Zufallsauswahl (D-004).

**Empfohlenes Verfahren** (Vorschlag zur Prüfung; Details in Bericht D, Abschnitt 9):

- **Kurze Lernverlaufsproben** im Sinn der curriculumbasierten Messung **[F]**:
  - alle 2–3 Wochen 3–5 Minuten
  - Rechtschreibung: 15–20 diktierte Wörter aus dem Grundwortschatz, nach
    Phänomen geschichtet, Auswertung nach Wörtern und Graphemtreffern
  - Mathe: zwei Minuten „richtige Aufgaben je Minute“ aus festen Pools
  - Darstellung als Verlaufslinie für das Kind, ohne Klassenvergleich
- **Beherrschungskriterium je Teilkompetenz** aus Übungsdaten: z. B. drei
  richtige Abrufe ohne Schriftbild an mindestens zwei verschiedenen Tagen,
  der letzte nach mindestens sieben Tagen; in Mathe zusätzlich eine
  Zeitschwelle.
- **Einfache Fehlerklassifikation** als Brücke zwischen Probe und Übung.
- **Keine eigene Förderdiagnostik:** Für LRS und Rechenschwäche bestehende,
  validierte Verfahren und die schulpsychologischen Zuständigkeiten nutzen
  (z. B. Levumi als kostenfreie Lernverlaufsdiagnostik; HSP, DEMAT).
- **Grenze:** Eigene Proben sind nicht normiert. Sie taugen zur
  Verlaufsbeobachtung des einzelnen Kindes, nicht zur Benotung und nicht zum
  Vergleich.

**Einwand der Gegenprüfung (F) und konsolidierte Empfehlung:** Das Red Team
hält eigene Lernverlaufsproben für eine Einzellehrkraft für kaum validierbar:
Parallele Formen gleicher Schwierigkeit verlangen Pilotdaten und
psychometrische Prüfung. Außerdem würde jede Kompetenzanzeige auf den heutigen
Lernständen deren Fehler erben (D-001, G-001, G-007) und wäre eine
Scheindiagnose mit Zahlen. Konsolidiert empfiehlt das Audit deshalb diese
Reihenfolge:

1. die Selbstbeschreibung „diagnosegestützt“ vorerst durch
   „wiederholungsgestützt“ ersetzen;
2. zuerst die Datenvalidität herstellen (Roadmap S4–S6);
3. danach einen ehrlichen Beherrschungsstand je Wortbox oder Phänomen mit
   sichtbarer Herleitung zeigen;
4. für echte Lernverlaufsdiagnostik bestehende, validierte Werkzeuge nutzen
   (z. B. Levumi, quop) statt eigene Tests nachzubauen.

Eigene kurze Proben bleiben möglich, aber nur als Übungsrückblick für das Kind,
ohne diagnostischen Anspruch. Die Einschätzung von D (eigene Proben als
Hauptweg) und F (validierte Werkzeuge als Hauptweg) unterscheidet sich hier;
das Audit folgt F.

### F.5 Unterrichtsqualität nach Hilbert Meyer

Die Plattform kann folgende Merkmale gut stützen:

- klare Strukturierung (1)
- echte Lernzeit (2), sofern die Bewertungsregeln repariert sind
- intelligentes Üben (8)
- vorbereitete Umgebung (10), mit Ausnahme geteilter Geräte

Bei drei Merkmalen täuscht sie derzeit mehr vor, als sie leistet:

- **inhaltliche Klarheit (4):** fehlerhafte Regeltexte
- **individuelles Fördern (7):** keine Diagnose
- **transparente Leistungserwartungen (9):** „sicher“ und „gemeistert“
  versprechen mehr, als sie messen

Sinnstiftendes Kommunizieren über Strategien und Fehler, Methodenvielfalt
einschließlich Handschrift sowie Diagnose und Förderplanung bleiben Aufgabe der
Lehrkraft. Die Plattform sollte das ausdrücklich sagen, statt es durch Anzeigen
zu überdecken.

## G – Schularten- und Zielgruppenmatrix

Grundlage: Bericht E (`agent-e-schularten.md`, Abschnitte 5–9) mit eigener
Gegenprüfung von E-001 und E-005 durch die Hauptinstanz. Die Bewertung „G“
heißt „passt zu Alter und Fach“, nicht „lernwirksam belegt“ (dazu Abschnitt F).
Es gab keine Erprobung mit Kindern.

Legende: **G** geeignet · **A** mit Anpassungen geeignet · **U** ungeeignet ·
**–** nicht freigegeben.

| Funktion             | GS 1/2 | GS 3/4 | MS 5–7 | MS 8–10 / M | RS  | Gym 5–10 | Gym OS | SFZ Lernen | SFZ Sprache | Förderschw. GE | inklusiv | DaZ |
| -------------------- | ------ | ------ | ------ | ----------- | --- | -------- | ------ | ---------- | ----------- | -------------- | -------- | --- |
| LernBox              | U      | A      | G      | G           | G   | G        | A      | A          | A           | U              | A        | A   |
| Wortspeicher         | U      | A      | A      | A           | A   | U        | U      | A          | A           | U              | A        | A   |
| Textbox              | U      | A      | A      | U           | U   | U        | U      | A          | A           | U              | A        | A   |
| Kopfrechnen          | A      | G      | A      | U           | U   | U        | U      | A          | A           | U              | A        | G   |
| Laufdiktat live      | U      | G      | G      | G           | G   | G        | A      | A          | A           | U              | A        | A   |
| Laufdiktat allein    | U      | U      | A      | A           | A   | A        | A      | U          | U           | U              | U        | U   |
| Tastenwelt¹          | U      | A      | G      | G           | G   | A        | U      | A          | A           | U              | A        | A   |
| Tagesportion         | U      | A      | A      | A           | A   | A        | U      | A          | A           | U              | A        | A   |
| Fortschritt (Kind)   | A      | A      | A      | A           | A   | A        | A      | A          | A           | U              | A        | A   |
| Lehrerbereich        | A      | A      | A      | A           | A   | A        | A      | A          | A           | U              | A        | A   |
| Schreiberleichterung | U      | A      | A      | A           | A   | A        | A      | A          | U           | –              | A        | –   |

¹ nur mit Hardwaretastatur; auf der Bildschirmtastatur U (D-014).

### Kernaussagen

1. **Tatsächliche Zielgruppe:** Die Plattform passt heute zu
   **Jahrgangsstufe 3–6** (Grundschule 3/4, Mittelschule 5/6) und zur
   **Basisförderung** (Förderschwerpunkte Lernen und Sprache mit
   Anpassungen). Hinzu kommt die **LernBox für alle Schularten** sowie das
   **Live-Laufdiktat** als Unterrichtsmethode bis in die Sekundarstufe I
   (E-009).
2. **Gerätemodell und Inhalte passen nicht zusammen:** Wo die Inhalte passen,
   in der Grundschule und im SFZ, fehlt meist die 1:1-Ausstattung; das Modell
   „ein Gerät = ein Kind“ trägt dort nicht (E-001, B-010). Wo 1:1 üblich ist,
   in der Sekundarstufe I etwa ab Jahrgangsstufe 7/8 über „Digitale Schule der
   Zukunft“ (laut Sekundärquelle), fehlen passende Inhalte. Das ist der
   **zentrale strukturelle Befund** für die Schularten.
3. **Jahrgangsstufe 1/2, Förderschwerpunkt geistige Entwicklung und
   DaZ-Anfänger** sind heute keine geeignete Zielgruppe: zu text- und
   tipplastig, ohne Bild- und Vorleseunterstützung (E-004). Das sollte
   ausdrücklich gesagt werden, statt Inklusion für alle Gruppen nahezulegen.
4. **Sekundarstufe I ab Jahrgangsstufe 7, Realschule und Gymnasium:** Es
   tragen nur LernBox und Live-Laufdiktat. Wortspeicher, Textbox und
   Kopfrechnen liegen unter dem Niveau, die Ansprache mit Tieren und Sternen
   ist für Jugendliche unpassend (Hypothese).
5. **Inklusion:**
   - Das einzige Inklusionsmerkmal, die Schreiberleichterung, wirkt nur bei
     Vokabeln im Live-Raum.
   - Es gilt für das Gerät statt für das Kind (E-001, zweimal reproduziert) und
     steht lesbar im Einschreibe-QR (B-008).
   - Die Zwei-Finger-Geste im Laufdiktat hat keine Einzelzeiger-Alternative
     (E-007; WCAG 2.5.1, Stufe A).
6. **Belastende Inhalte:** Die festen Wortboxen enthalten Kriegs-, Gewalt- und
   Todeswörter. Eine zufällige 10er-Runde enthält in vier Boxen mit 27–39 %
   Wahrscheinlichkeit mindestens eines davon (E-005). Für Grundschulkinder und
   Kinder mit Fluchterfahrung in Deutschklassen ist das vermeidbar belastend.

### Gemeinsame Plattform – ja, aber nicht eine Oberfläche

**Gemeinsam bleiben sollten:**

- Datenbasis und Lernereignisse
- LernBox und Live-Raum
- Klassenverwaltung

Das vermeidet Doppelpflege.

**Nötig sind** (Vorschlag zur Prüfung):

- zwei **Oberflächenprofile** (Position von E):
  - „Grundstufe“: Bild, Vorlesen, wenig Text, Vorgaben der Lehrkraft
  - „Sekundarstufe“: sachlich, ohne Tiere, mehr Selbststeuerung
  - _Einwand der Gegenprüfung:_ Das verdoppelt die Pflegefläche bei einem
    Bus-Faktor von 1 (A-017). Der Bericht empfiehlt deshalb zuerst die
    Zielgruppe Jgst. 3–6 und die Sekundarstufe nur über die LernBox; ein
    zweites Profil erst bei belegtem Bedarf (Abschnitt M.5).
- **niveaugestufte Inhalte** nach dem bayerischen Grundwortschatz (Jgst. 1/2,
  3/4) und einem Sek-I-Wortschatz
- **neutrale Übungsanpassungen** statt eines LRS-Kennzeichens („weniger auf
  einmal“, „ohne Tempo“, „Vorlesen“, „große Schrift“, „Silbenhilfe“); damit
  entfällt B-008 an der Wurzel (E-006)

### Grenzen schulartübergreifender Nutzung

1. Eine altersgerechte Ansprache für 6- bis 19-Jährige lässt sich in einer
   einzigen Oberfläche nicht lösen.
2. Die Geräteausstattung unterscheidet sich grundlegend.
3. Die Datenschutzlage unterscheidet sich: Einwilligungsfähigkeit,
   Volljährigkeit in der Oberstufe, Förderdaten im SFZ.
4. Die Pflege niveaugestufter Inhalte für alle Schularten übersteigt die
   Kapazität einer Einzelperson (A-017).

### Lehrerperspektive in Kürze

**Zusatznutzen heute:**

- Live-Laufdiktat: weniger Organisationsaufwand als analog, automatische
  Korrektur, Übernahme der Fehlerwörter auf das Gerät des Kindes
- LernBox mit Vokabelübergabe

**Was fehlt:**

- **Steuerung:** Die Lehrkraft kann außer Vokabeln nichts zuweisen; jede
  Niveauentscheidung trifft das Kind selbst (E-002).
- **Rückmeldung:** Aus dem freien Üben erfährt die Lehrkraft nichts, aus dem
  Live-Raum nur Tiernamen ohne Verlauf (E-003).
- **Organisation:** keine Übergabe an Vertretung, Teamteaching oder ein neues
  Schuljahr (E-008).

Das Spannungsfeld zwischen Datenschutz und Diagnosebedarf ist bewusst
entstanden und für das freie Üben richtig entschieden. Es verlagert aber die
gesamte diagnostische Arbeit zurück ins Analoge.

**Vertretbarer Mittelweg (Vorschlag zur Prüfung):**

- ein freiwilliger, vom Kind ausgelöster Kurzbericht mit wenigen Kennwerten
- eine lokale Ergebnisablage auf dem Lehrergerät mit Löschfrist

## H – UX-Gutachten

Grundlage: Bericht C (`agent-c-qa-ux.md`):

- Browserprüfung mit Chromium in den Ansichten iPad hoch/quer, iPhone, 320 px
  und 200 % Zoom, jeweils hell und dunkel sowie mit reduzierter Bewegung
- 26 Seiten und 32 Zustände mitten in Runden
- echte Abläufe mit simulierter Uhr über zwei Wochen

Dazu die Berichte E (Lehrerperspektive) und A-002 (Fehlerzustände). Es gab
keine Nutzerstudie mit Kindern oder Lehrkräften; Aussagen zur Verständlichkeit
sind Expertenurteil plus Lesbarkeitsmessung.

### H.1 Was gut ist

- **Automatisch prüfbare Barrierefreiheit auf hohem Niveau:**
  - axe-core meldet in 26 Seiten auf vier Geräteansichten und in 32
    Zuständen mitten in Runden keinen Verstoß; einzige Ausnahme ist ein
    Randartefakt der klebenden Leiste.
  - kein horizontales Scrollen, robust bei erhöhten Textabständen
  - Bewegung lässt sich abschalten, Fokusrahmen sind sichtbar
- **Ruhige, einheitliche Oberfläche:** große Hauptaktionen, die
  Übungsübersicht mit Bildkacheln, eine Startseite ohne Konto.
- **Fokusführung in Runden:** Eingabefeld fokussiert,
  Statusmeldungen per `role="status"`.
- **Buchstabengenaue Rückmeldung** im Wortspeicher („3. Buchstabe fehlt: f“).
- **Textbox setzt nach Neuladen fort.** Dieses Muster fehlt den anderen
  Modulen.
- **Ton ohne Druck:** keine Strafserien, „Diese Woche x von 7 Tagen“.

### H.2 Schülerabläufe: die acht Szenarien des Auftrags

| Szenario                                | Beobachtung (Befund)                                                                                                                                                                                                                                                                                                                                                                                                                      | Bewertung   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1 Erstes Öffnen                         | „Heute ist nichts dran“ und zugleich „Weiterlernen“. Die Hauptschaltfläche führt ein neues Kind in die **Tastenwelt** statt zu Rechtschreibung oder Mathe (C-003). Ohne Lehrkraftinhalte bleibt die Tagesportion leer (D-011).                                                                                                                                                                                                            | mangelhaft  |
| 2 Aufgabe nicht verstanden              | Erwachsenensprache: „Merkstufe“, „Durchgang“, „Wiederholungsfälligkeit“ („Durchgang“ 67-mal, „Merkstufe“ 15-mal in der Oberfläche), WebDAV-Begriffe im Kinderprofil. Anleitungen werden nicht vorgelesen. Stufe 1 heißt „Abschreiben“, die Ansicht „Selbstständig schreiben“ (C-007).                                                                                                                                                     | mangelhaft  |
| 3 Mehrfach derselbe Fehler              | Der Wortspeicher sagt „üben wir noch einmal“, die Übersicht direkt danach „nichts fällig“; „Nochmal üben“ zieht andere Wörter (C-008). Laufdiktat und Kopfrechnen melden nur „Noch nicht“ ohne Fehlerort (D-008). Stufe 5 wertet richtige Leerzeichen-Eingaben als dreifachen Fehler (G-001).                                                                                                                                             | mangelhaft  |
| 4 Frustrierende Bewertung               | Prozent und Bestwert werden ruhig gezeigt (gut). Aber: Bestwert schwankt zufällig (D-004), Textbox-Merkzeit läuft ohne Pause ab (C-002), Tempo-Punkte im Live-Raum (D-012), richtige Antworten werden als falsch gewertet (G-001, G-002, G-003, G-009).                                                                                                                                                                                   | ausreichend |
| 5 Versehentlich beendet                 | Fehltipp auf die untere Leiste, Zurück-Geste oder Neuladen beenden Wortspeicher-, Kopfrechen-, Laufdiktat- und Tastenwelt-Runden **ohne Rückfrage**; nur die Textbox setzt fort (C-001).                                                                                                                                                                                                                                                  | mangelhaft  |
| 6 Fortschritt verstehen                 | „Mein Fortschritt“ ist nur über Profil → „Klasse und Datenschutz“ erreichbar (C-009). Die Kennzahlen messen teils Rauschen oder Sofortkorrektur (D-004). Mathe fehlt auf der Seite.                                                                                                                                                                                                                                                       | mangelhaft  |
| 7 Regelmäßig über Wochen                | Die Tagesportion wächst sinnvoll und ist gedeckelt (gut). Widersprüche gibt es bei „erledigt“, „schwierig“ und „alles geschafft“ (C-008). Falsch beantwortete Elemente zählen als erledigt (G-007). Abstände verlängern sich um einen Tag (G-006). Unter iPadOS/Safari fehlt jeder Schutz gegen Speicherlöschung (B-002; das Risiko liegt vor allem bei Safari statt Home-Bildschirm und bei Geräten, die andere Klassen täglich nutzen). | ausreichend |
| 8 Wechsel zwischen Schwierigkeitsgraden | Stufen, Textschwierigkeit und Zahlenraum sind frei wählbar, aber ohne Empfehlung oder Niveaumodell (D-003, E-004). Nach 0 % schlägt die Textbox den schwereren Durchgang vor (C-012).                                                                                                                                                                                                                                                     | ausreichend |

### H.3 Lehrerabläufe

| Ablauf                | Beobachtung (Befund)                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Klasse einrichten     | 24 Kinder werden einzeln angelegt (27 Klicks, kein Listenimport). Der **QR-Bogen druckt nur 12 von 24 Codes** (C-006, zweimal als PDF reproduziert; nach Gegenprüfung P2, weil sichtbar). In der Einzelansicht verrät die Größe des QR-Codes die Schreiberleichterung (B-008). |
| Inhalte anlegen       | „Inhalte → Neu“ führt in den Laufdiktat-Assistenten. Die Freigabe ist ein zweites Formular, vorbelegt mit Demo-Vokabeln als echten Werten. Seiten tragen drei Namen (C-010).                                                                                                   |
| Differenzieren        | Außer Vokabeln lässt sich nichts zuweisen; Wortlisten, Texte und Rechenvorgaben wählt das Kind selbst (E-002).                                                                                                                                                                 |
| Ergebnisse sehen      | Live: Tiere mit Fehlerzahlen, CSV ohne Namen und Fehlerwörter je Kind. Aus dem freien Üben kommt nichts (E-003).                                                                                                                                                               |
| Vertretung, Schuljahr | keine Übergabe ohne Personendaten, kein „Klasse übernehmen“ (E-008)                                                                                                                                                                                                            |
| Technik               | Meldungen in Entwicklersprache („Publishable Key“, „IndexedDB“, „WebDAV … App-Passwort“), auch im Kinderprofil (C-007, C-010)                                                                                                                                                  |

### H.4 Konkrete Verbesserungen (Vorschläge zur Prüfung)

1. **Druckregel für den Lehrerrahmen** mit E2E-Test „Bogen mit 30 Kindern“
   (S; behebt C-006).
2. **Leerzustand für neue Kinder:** drei Bildkarten „Wörter üben“,
   „Rechnen“, „Vokabeln“ statt „Weiterlernen“. Die Tastenwelt nur mit
   Hardwaretastatur empfehlen (S; C-003).
3. **Zwischenstand speichern und „Weitermachen“ anbieten** wie in der
   Textbox; die untere Leiste in Runden ausblenden. Eine Rückfrage nur bei
   ausdrücklichem „Runde beenden“, nicht bei jeder Navigation – das wirkt
   unter iOS wie eine Falle (M; C-001, Gegenprüfung M.6).
4. **Kinder-Glossar mit Lint-Test:**
   - „Stufe“ statt „Merkstufe“, „Runde“ statt „Durchgang“
   - Hinweistexte höchstens einen Satz lang
   - Vorlese-Knopf an jeder Anleitung, mit lokaler Stimme (B-012)

   Aufwand M; behebt C-007.

5. **Eine gemeinsame Funktion „Was ist heute offen?“** für Startseite,
   LernBox, Wortspeicher und Portion. „Neu“ ist nicht „schwierig“ und nicht
   „erledigt“; die Anzeige unterscheidet „bearbeitet“ und „richtig“ (S–M;
   C-008, G-007).
6. **„Mein Fortschritt“ als Kachel** auf „Mein Lernraum“. Lernwerkstatt und
   Fachseiten zusammenführen (S; C-009).
7. **„Mehr Zeit“ als Profileinstellung**, auch von der Lehrkraft setzbar. Die
   Textbox-Merkzeit ohne harte Grenze, aber mit der Regel „Vorlage und
   Eingabe nie gleichzeitig sichtbar“ (S; C-002, Gegenprüfung M.5).
8. **Lehrkraft-Ersteinrichtung „Klasse in 5 Minuten“:**
   - Namensliste einfügen
   - Inhalte unabhängig vom Laufdiktat anlegen
   - Beispieldaten nur als Platzhalter

   Aufwand M; behebt C-010.

9. **Kopfrechnen:** keine Vorschau aller Aufgaben mit Lösungen vor der Runde
   (S; C-013).
10. **Tests für genau diese Abläufe:** Druck, Abbruch und Fortsetzen, frisches
    Gerät, Mehrtagesverlauf (M; C-014).

**Warnung vor Nebenwirkungen:** Mehr Funktionen auf den Schülerseiten würden
die Hauptschwäche, Sprache und Orientierung, verschärfen. Die Verbesserungen
oben **reduzieren** die Oberfläche oder machen sie ehrlicher. Sie fügen keine
neuen Bereiche hinzu.

## I – Strategische Empfehlungen

Alle Empfehlungen sind **Vorschläge zur Prüfung**. Sie ändern keine
bestehende Entscheidung, solange die projektverantwortliche Lehrkraft sie nicht
beschließt.

### I.1 Welches Lernproblem löst Lernraum heute besonders gut?

- **Das Laufdiktat im Unterricht:** weniger Organisation als analog,
  automatische Korrektur, Merkspanne durch verdecktes Abschreiben.
  - Die Übernahme der Fehlerwörter auf das Gerät des Kindes ist nach den
    Reparaturen G-011 und G-012 ein echter Mehrwert gegenüber Papier.
- **Vokabeln wiederholen (LernBox):** ein Leitner-System mit strengeren und
  besser begründeten Regeln als viele Karteikarten-Apps, das ohne Konto und
  datensparsam arbeitet.

Für **Rechtschreibung und Rechnen außerhalb des Live-Raums**, also das im
Auftrag genannte Kernziel, ist der Nutzen heute nicht belegt und durch die
Bewertungsfehler (A-004, D-001, G-001) eher gefährdet.

### I.2 Hat die Plattform einen klar erkennbaren pädagogischen Kern?

Im Konzept ja: Vault 22 beschreibt einen Förderkreislauf aus Unterricht,
persönlicher Wiederholung und Rückmeldung. Im Code nur in Ansätzen. Es gibt
sieben Module mit vier Wiederholungslogiken, aber kein gemeinsames
Kompetenzmodell, keine curriculare Sequenz und keinen Rückkanal zur Lehrkraft
(D-011, E-003).

**Vorschlag:** Den Kern ausdrücklich auf **„Unterricht → persönliche,
verteilte Wiederholung → kurze Rückmeldung an die Lehrkraft“** für
Grundwortschatz-Rechtschreibung, Basisfakten Mathe und Vokabeln festlegen.
Jede Funktion muss sich daran messen lassen.

### I.3 Unterschied zu gewöhnlichen Übungsplattformen

Lernraum unterscheidet sich in drei echten Punkten:

1. Local-first ohne Konten bei gleichzeitigem Live-Unterrichtsformat
2. die Übernahme von Unterrichtsfehlern in die persönliche Wiederholung
3. eine bewusst druckarme Motivation

Alle drei sind wertvoll. Die meisten kommerziellen Plattformen haben dafür eine
Diagnostik und eine Lehreransicht, die Lernraum fehlt.

### I.4 Weiterverfolgen, überarbeiten, aufgeben

| Idee / Funktion                                    | Empfehlung                                                                                                                                                                              | Begründung (Befunde)       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Local-first, keine Schülerkonten, keine Telemetrie | **weiterverfolgen**, mit Speicherschutz und verlässlicher Sicherung; bei Koffer-iPads als Normalfall die Variante „verschlüsselter Lernstand reist mit dem Kind“ prüfen (Abschnitt M.8) | B-002, B-010, E-003        |
| Live-Laufdiktat mit Übernahme nach Ergebnis        | **weiterverfolgen**; Realtime absichern, Tempo-Punkte abschaltbar, Projektionsmodus                                                                                                     | B-003, D-012, G-011        |
| LernBox (Leitner)                                  | **weiterverfolgen**; Selbsteinschätzung begrenzen, Richtungen entkoppeln                                                                                                                | D-010, G-005               |
| Merkstufen im Wortspeicher                         | **überarbeiten**: Box nur bei Abruf ohne Schriftbild, Entscheidungslücken, Kontraste, Grundwortschatz-Niveaus                                                                           | D-001, D-002, D-007, A-004 |
| Textbox                                            | **überarbeiten**: Diktat statt Gedächtnistext, zwei Kennzahlen, kürzere Einheit, Transferprobe                                                                                          | D-005, C-002               |
| Kopfrechnen                                        | **überarbeiten**: Aufgabentypen gewichten, Flüssigkeit messen, Fehlerklassifikation                                                                                                     | D-009, G-008, G-009        |
| Tagesportion                                       | **überarbeiten**: Zeitbudget statt Stückzahl, curriculare Neuzugänge, ehrliche Anzeige „bearbeitet/richtig“                                                                             | D-011, G-006, G-007        |
| Ereignisquelle als Architekturprinzip              | **entscheiden**; empfohlen: ehrlich als Protokoll führen (Variante b), Doku anpassen                                                                                                    | A-003                      |
| Schreiberleichterung mit Klassenstempel            | **ersetzen** durch neutrale, nicht diagnosegebundene Übungsanpassungen für alle Module                                                                                                  | B-008, E-001, E-006, D-016 |
| Lehrerbereich ohne Login                           | **überarbeiten**: lokale Sperre für Personendaten, Tafelmodus „nur Material“                                                                                                            | B-009                      |
| Geräte-Abgleich der Lehrkraft (E 53)               | **einfrieren**; v1-Handabgleich entfernen; verschlüsselt erzwingen, sobald Personendaten enthalten sind                                                                                 | A-008, B-014               |
| Cloud-Abgleich im Kinderprofil                     | **aus der Kinderoberfläche entfernen** bzw. hinter Freigabe durch Lehrkraft oder Eltern legen                                                                                           | C-007, B-011, G-010        |
| Vinext/RSC auf Cloudflare                          | **Ausstiegspfad mit Auslösekriterien festlegen**, Wechsel vertagen; kurzfristig nur Vorlagenreste und Server-APIs im Root-Layout bereinigen                                             | A-006, A-007               |
| Häuser, Duell, Ramagotchi                          | **aufgeschoben lassen** (wie beschlossen, E 39); vor einer Freigabe Nutzen im Unterricht belegen                                                                                        | D-012, E-010               |
| Eingangstest                                       | **nicht bauen**; stattdessen ehrlicher Beherrschungsstand aus validen Übungsdaten; Lernverlaufsdiagnostik mit bestehenden Werkzeugen                                                    | D-003, Abschnitt F.4       |
| „Schulartübergreifend“ als Version-1-Ziel          | **aufgeben**; Zielgruppe Jgst. 3–6 und Basisförderung plus LernBox für alle; ein zweites Oberflächenprofil nur bei belegtem Bedarf                                                      | E-004, E-009               |

### I.5 Zusätzliche Vorschläge, die bisher nicht berücksichtigt sind

1. **Evaluation einplanen:** Vor einer Ausweitung einen kleinen
   Probedurchlauf mit Vor- und Nachprobe an **ungeübten** Paralleltexten und
   -wörtern durchführen. Ideal wechseln sich geübte und ungeübte Wortgruppen
   ab. Erst das trennt Übungs- von Transfereffekt (D, Abschnitt 9F).
2. **Betriebs- und Datenschutzpaket für Schulen:**
   - Vorlage für das Verzeichnis der Verarbeitungstätigkeiten
   - DSFA-Schwellwertprüfung
   - Elterninformation in einfacher Sprache
   - AVV-Weg
   - Übergaberegel bei Lehrerwechsel
   - Ferientest gegen die Pausierung des Supabase-Projekts

   Ohne dieses Paket entscheidet keine Schulleitung sachgerecht (B-011, B-020).

3. **Gerätemodell ausdrücklich festlegen:** „feste Gerätezuordnung“,
   „Geteiltes iPad“ (Betriebssystem) oder „Profile je Kind“ (App).
   - Ein „Stationsmodus für alles“ ohne persönlichen Lernstand ist für
     Koffer-Klassen eine ehrliche Notlösung, aber kein Ziel: Er schaltet die
     verteilte Wiederholung gerade in der Grundschule ab (E-001, Gegenprüfung).
   - „Geteiltes iPad“ setzt verwaltete Apple-Accounts und MDM voraus; die
     temporäre Sitzung löscht beim Abmelden alle Daten (F, nicht online
     verifiziert).
4. **Auftrags-QR der Lehrkraft:** ein QR ohne Personendaten, der eine Gruppe
   direkt in eine Wortliste, einen Zahlenraum oder einen Text führt. Die
   nötigen Parameter existieren teilweise schon (E-002).
5. **Freiwilliger Kurzbericht des Kindes an die Lehrkraft** mit wenigen
   Kennwerten (sichere Wörter je Phänomen, Rechenarten mit Fehlern) und eine
   lokale Ergebnisablage mit Löschfrist (E-003, Vault 11).
6. **Ein Kinder-Glossar mit Lint-Test** und ein Vorlese-Knopf an jeder
   Anleitung (C-007).
7. **Gemeinsamer Wiederholungskern mit Regeltabelle** aus Vault 06 als
   tabellengetriebener Regressionstest für jedes Modul (A-004).
8. **Inhalte als versionierte Datenpakete** statt im Quellcode, mit
   Niveaukennzeichnung und Prüfliste für die Lehrkraft (A-009, D-006).

9. **Beobachtungsphase vor der Priorisierung:** vier Wochen datensparsam
   beobachten (Gerätezählung, Installationsstatus, Sicherungen, kurze
   Unterrichtsbeobachtung). Davon hängt ab, ob das Gerätemodell oder der
   Lernkern das wichtigste Problem ist (Abschnitt M.9).

### I.6 Was bewusst NICHT entwickelt werden sollte

- **Kein Eingangstest und keine eigene LRS- oder Dyskalkulie-Diagnostik.** Sie
  wären zu ungenau und nicht normiert, und es gibt die Zuständigkeit der
  Schulpsychologie (D, Abschnitt 9).
- **Keine Ranglisten**, kein Ausbau von Tempo-Wettbewerb und keine weitere
  Gamification, bevor der Lernkern stimmt (D-012, Entscheidung 39).
- **Keine neuen Module** (z. B. Bruchrechnen), bevor es einen Modulvertrag
  gibt (A-009) und ein konkreter Bedarf in einer Pilotklasse belegt ist (E-009).
- **Keine KI-generierten Übungstexte ohne fachliche Prüfung.** Schon die
  geprüften Texte enthalten Zuordnungsfehler (D-006).
- **Kein eigener Server für Lehrerkonten**, solange der Einzelplatzbetrieb
  reicht. Stattdessen eine lokale Sperre (B-009).
- **Keine animierten Mehrfach-QR-Codes und kein Prüfungsmodus.** Der Aufwand
  ist hoch, und der Nutzen für Grundlagenübung fehlt (Vault 08, 11).
- **Keinen weiteren Ausbau des Geräte-Abgleichs** (A-008).

### I.7 Architekturentscheidungen, die die Weiterentwicklung behindern

1. **Strikte Datenverträge mit geschlossenen Enums ohne tolerantes Lesen**
   (A-001): Jede Erweiterung bricht ältere Geräte.
2. **Kein Modulvertrag** (A-009): rund 20 Berührungspunkte je neuem Modul.
3. **Parallele Wiederholungslogiken** (A-004): Jede Regeländerung muss an
   vier Stellen erfolgen.
4. **Dynamisches Server-Rendering auf einem jungen Framework** (A-007): Es
   bindet Hosting und Offlinefähigkeit an eine schmale Abhängigkeit.
5. **Ein Gerät ist eine Person** (B-010, E-001): ein Grundsatz, der die
   Grund- und Förderschule ausschließt.

## J – Priorisierte Roadmap (Vorschlag zur Prüfung)

Zeitangaben sind grobe Schätzungen für eine Lehrkraft mit KI-Unterstützung. Sie
sind nicht verbindlich. Abhängigkeiten stehen in der Spalte „setzt voraus“. Die
Befund-IDs verweisen auf den Katalog (Abschnitt C). Die Reihenfolge
berücksichtigt die Einwände der Gegenprüfung (Abschnitt M), vor allem: **Jede
Änderung an einem gespeicherten Datenformat setzt tolerantes Lesen (K1)
voraus**, sonst wiederholt sich das Muster von B-001.

### J.1 Sofort (1–2 Wochen): kritische Fehler und offensichtliche Reparaturen

| Nr. | Maßnahme                                                                                                                                                                                                                                                                                                                                                                                                                      | Befunde                    | Aufwand  | setzt voraus |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- | ------------ |
| S1  | **Einsatzrahmen klären:** Schulleitung und behördliche Datenschutzbeauftragte einbeziehen; bis zur Freigabe keine Klarnamen und keine LRS-Haken im Echtbetrieb                                                                                                                                                                                                                                                                | B-011, B-008               | S (org.) | –            |
| S2  | Sicherung reparieren (`folderId`, Ordner, verwaiste Verweise beim Einspielen) und **ein** Strukturtest „jede Dexie-Tabelle und jedes Feld in Lese-, Schreib- und Sicherungsschema“                                                                                                                                                                                                                                            | B-001, A-001               | S        | –            |
| S3  | Installation **vor** dem ersten Lernen anleiten; auf einem leeren Gerät prominent „Ich habe schon gelernt – Sicherung einspielen“; fehlgeschlagene Sicherung als Warnzustand; `navigator.storage.persist()` als billiger Zusatz                                                                                                                                                                                               | B-002, A-018               | S–M      | –            |
| S4  | Lernwort-Regeln korrigieren: kein Aufstieg vor Fälligkeit, Stufen 1–3 ohne Box- und Merkstufen-Aufstieg, „Wort zeigen“ wie die Live-Regel behandeln (kein längerer Abstand als nach einem Fehlversuch), Erklärung „Abschreiben ist Üben“; **in derselben Änderung** die Übungsmenge sichtbar machen („heute 40 Wörter geschrieben“), damit Fleiß nicht unsichtbar wird; bestehende Lernwörter ab Box 3 einmalig fällig setzen | A-004, D-001, F-001        | S–M      | –            |
| S5  | Stufe 5: ein Eingabefeld je Wort wie in den Stufen 1–4 (statt Trennung an Leerzeichen)                                                                                                                                                                                                                                                                                                                                        | G-001                      | S        | –            |
| S6  | Gemeinsame Antwort-Normalisierung (Apostrophe, Anführungszeichen, NFC, Bindestriche); Zahlenprüfung exakt (Tausender, Unicode-Minus); Nulllücken eindeutig                                                                                                                                                                                                                                                                    | G-002, G-008, G-009        | S        | –            |
| S7  | Battle: frei gewählten Absendertext nicht mehr anzeigen, Angriffe nur von bekannten Teilnehmern annehmen                                                                                                                                                                                                                                                                                                                      | B-003 (Sofortteil)         | S        | –            |
| S8  | QR-Bogen-Druckregel mit E2E-Test, der die Namen im PDF zählt; einheitliche QR-Größe und -Nutzlast mit und ohne Freigabe                                                                                                                                                                                                                                                                                                       | C-006, B-008 (Sofortteil)  | S        | –            |
| S9  | Laufdiktat allein: strenge Eingabeattribute (Autokorrektur aus)                                                                                                                                                                                                                                                                                                                                                               | G-013                      | S        | –            |
| S10 | Inhaltskorrekturen: s/ss/ß-Regeltext, -ng, silbentrennendes h, Bedeutungshilfen ohne Zielwort, belastende Wörter aus Grundstufenboxen                                                                                                                                                                                                                                                                                         | D-006, E-005               | S–M      | –            |
| S11 | Datenschutzerklärung berichtigen (ungenutzte ChatGPT-Anmeldung entfernen, Supabase-Übergabe und Sprachausgabe nennen); Startseite „Lehrerbereich“ statt „Lehrer-Login“                                                                                                                                                                                                                                                        | B-011, B-009               | S        | S1           |
| S12 | Selbstbeschreibung ehrlich machen: „diagnosegestützt/adaptiv“ in Vault und App-Texten durch „wiederholungsgestützt“ ersetzen, bis eine Diagnostik existiert                                                                                                                                                                                                                                                                   | D-003                      | S        | –            |
| S13 | Live-Auswertung: Fehlerwörter je Tier in der Lehreransicht zeigen (Daten liegen vor); CSV nur auf ausdrücklichen Klick statt automatisch beim Beenden, Formeln neutralisieren                                                                                                                                                                                                                                                 | E-003, F-002, B-007, B-009 | S        | –            |
| S14 | Datensparsame Beobachtungsphase (4 Wochen, ohne Datenexport) vorbereiten: Gerätezählung und Zuteilung, Installationsstatus, vorhandene Sicherungen, 15 Minuten Unterrichtsbeobachtung an fünf Geräten                                                                                                                                                                                                                         | Abschnitt M.9              | S (org.) | –            |

### J.2 Kurzfristig (bis etwa 6 Wochen): Qualität und Bedienbarkeit

| Nr. | Maßnahme                                                                                                                                                                             | Befunde                    | Aufwand | setzt voraus |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ------- | ------------ |
| K1  | **Tolerantes Lesen** der Ereignisse und Pakete: unbekannte Zusatzfelder ignorieren, Ereignisse mit unbekannten Pflichtwerten in Quarantäne, Hinweis; Test „Ereignis aus Version n+1“ | A-001                      | M       | S2           |
| K2  | Einheitliche Lade- und Fehlerzustände, Fehlergrenzen je Bereich, `no-floating-promises`                                                                                              | A-002                      | M       | –            |
| K3  | Realtime absichern: inhaltsleeres Wecksignal auf nicht erratbarem Thema, Präsenz für die Lehreransicht nur aus registrierten Teilnehmern                                             | B-003, B-004               | M       | S7           |
| K4  | Zwischenstand speichern und „Weitermachen“ anbieten wie in der Textbox; Rückfrage nur bei ausdrücklichem „Runde beenden“                                                             | C-001                      | M       | –            |
| K5  | Erstkontakt: Leerzustand mit Kernfächern statt Tastenwelt                                                                                                                            | C-003                      | S       | –            |
| K6  | Ehrliche Anzeigen: „bearbeitet/richtig“, „neu“ ≠ „schwierig“, Bestwert durch geglätteten Wert, „frühere Fehler“ erst ab Folgetag                                                     | C-008, G-007, D-004        | S–M     | S4           |
| K7  | Kinder-Glossar mit Lint-Test, kurze Hinweise, Vorlesen der Anleitungen mit lokaler Stimme                                                                                            | C-007, E-004, B-012        | M       | –            |
| K8  | Lehrerablauf: Namensliste einfügen, Inhalte unabhängig vom Laufdiktat anlegen, keine Demo-Werte                                                                                      | C-010, E-008               | M       | –            |
| K9  | Auftrags-QR ohne Personendaten: zuerst für Lernwörter (`?woerter=` existiert, S), dann Zahlenraum und Text                                                                           | E-002                      | S–M     | –            |
| K10 | Tempo-Punkte abschaltbar und standardmäßig aus; Projektionsmodus ohne Namen und Fehlerzahlen                                                                                         | D-012                      | S       | –            |
| K11 | Browser-Tests gegen den Produktionsbuild ohne Vorschau; Offline-Suite mit Service Worker; Tests für Druck, Abbruch, frisches Gerät                                                   | A-006, B-013, B-024, C-014 | M       | –            |
| K12 | Abdeckung für `app/` und `src/tastschreiben` ausweisen; Regeltabelle aus Vault 06 als Test für alle Module                                                                           | A-005, A-004               | S–M     | S4           |
| K13 | LernBox: Abrufzeitpunkt je Richtung; Platzierung aus dem Unterricht setzt den Abrufzeitpunkt der geübten Richtung                                                                    | G-005, G-011               | S–M     | K1           |

### J.3 Mittelfristig (Schulhalbjahr): pädagogische und architektonische Verbesserungen

| Nr. | Maßnahme                                                                                                                                                                                                                                                                           | Befunde                    | Aufwand  | setzt voraus                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- | --------------------------- |
| M1  | Ein gemeinsamer Wiederholungskern für LernBox, Lernwörter und Mathe; Fälligkeit als lokaler Kalendertag; Merkstufe im Lernwort-Ereignis                                                                                                                                            | A-004, G-006, A-013, D-001 | M        | K1, K12                     |
| M2  | Ereignisquelle: empfohlen Variante b (Ereignisse ehrlich als Protokoll, Doku anpassen, feldweises Zusammenführen, Stufe und Hilfe im Ereignis)                                                                                                                                     | A-003, G-010               | L        | M1                          |
| M3  | Gerätemodell umsetzen, abhängig von der Ausstattung: feste Zuordnung (Local-first mit Sicherung), Profile je Kind an festen Geräten oder – bei Koffer-iPads – ein verschlüsselt mit dem Kind reisender Lernstand (Variante des Red Teams, prüfen); Stationsmodus nur als Notlösung | B-010, E-001               | L        | S1, S14, Entscheidung 2 (K) |
| M4  | Neutrale Übungsanpassungen statt LRS-Kennzeichen, wirksam in allen Modulen; Einzeltipp-Alternative und Merkzeit ohne harte Grenze, ohne die Regel „Vorlage und Eingabe nie gleichzeitig sichtbar“ zu verletzen                                                                     | E-006, B-008, C-002, E-007 | M–L      | M3                          |
| M5  | Ehrlicher Beherrschungsstand je Wortbox oder Phänomen mit sichtbarer Herleitung; für Lernverlaufsdiagnostik bestehende, validierte Werkzeuge nutzen (z. B. Levumi, quop) statt eigene Tests                                                                                        | D-003, D-004               | M        | S4–S6, M1                   |
| M6  | Fehlerklassifikation Rechtschreibung und Mathe, für die Lehrkraft mit sichtbarer Unsicherheit, für das Kind nur als Übungsempfehlung; Laufdiktat wortweise auswerten                                                                                                               | D-008, G-004               | M        | –                           |
| M7  | Wortspeicher: Entscheidungslücken nur als Gerüst ohne Box-Aufstieg, Kontrastboxen, Grundwortschatz-Niveaus; Textbox als Diktat mit zwei Kennzahlen (vorher Pilotdaten zum Zeitbedarf auswerten)                                                                                    | D-002, D-005, D-007        | M–L      | S10                         |
| M8  | Freiwilliger Kurzbericht des Kindes an die Lehrkraft und lokale Ergebnisablage mit Löschfrist                                                                                                                                                                                      | E-003                      | M–L      | S1, M5                      |
| M9  | Lehrerbereich: „Tafelmodus nur Material“ auf geteilten Geräten zuerst, danach lokale Sperre; Vertretungsfreigabe ohne Personendaten; Schuljahreswechsel                                                                                                                            | B-009, E-008               | M        | S1                          |
| M10 | Kopfrechnen: Aufgabentypen gewichten, Flüssigkeit lokal messen                                                                                                                                                                                                                     | D-009                      | M        | –                           |
| M11 | Probedurchlauf mit Evaluation (geübte und ungeübte Wörter, Vor- und Nachprobe, Bearbeitungszeiten)                                                                                                                                                                                 | D-015, I.5                 | M (org.) | S2–S10                      |

### J.4 Langfristig (ab Schuljahr 2027/28): strategische Produktentwicklung

| Nr. | Maßnahme                                                                                                                                                              | Befunde      | setzt voraus  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------- |
| L1  | Modulvertrag und Inhalte als versionierte Datenpakete                                                                                                                 | A-009        | M1, M2        |
| L2  | Ausstieg aus dynamischem Server-Rendering (statischer Build) nur nach festgelegten Auslösekriterien; vorher nur Vorlagenreste und Build-Zeit-Konfiguration bereinigen | A-007        | K11, M3       |
| L3  | Sekundarstufe über die LernBox bedienen; ein zweites Oberflächenprofil nur bei belegtem Bedarf und tragbarem Pflegeaufwand                                            | E-004, E-009 | K7, L1, A-017 |
| L4  | Betriebs- und Datenschutzpaket für weitere Schulen; Übergabe- und Betriebsdokument (Bus-Faktor)                                                                       | B-011, A-017 | S1, M8, M9    |
| L5  | Erst danach und nur bei belegtem Nutzen: Motivationsschicht (Entscheidung 39), weitere Fächer                                                                         | D-012, E-010 | M11           |

### J.5 Abhängigkeiten in Kürze

- **S1** ist Voraussetzung für jeden Echtbetrieb mit Klarnamen oder
  LRS-Informationen.
- **S14** (Beobachtungsphase) liefert die Fakten für die Gerätefrage und
  damit für M3, M4 und M8.
- **S2 und K1** sind Voraussetzung für jede Änderung an gespeicherten Formaten:
  K13, M1, M2 und neue Elementarten in Übertragungspaketen (E-002).
- **S4–S6** stellen die Datenvalidität her. Erst danach lohnt eine
  Beherrschungsanzeige oder Rückmeldung an die Lehrkraft (M5, M8). Eine
  Diagnostik auf heutigen Daten wäre eine Scheindiagnose (Gegenprüfung D-003).
- **M3**, das Gerätemodell, bestimmt, wie M4 (Übungsanpassungen) und M8
  (Kurzbericht) personengebunden werden können.
- **M11**, die Evaluation, sollte vor jeder Ausweitung auf weitere Klassen und
  vor L5 stehen.

## K – Abschließendes Expertenurteil

### Was ist an Lernraum bereits wirklich gut?

- **Ein sauber isolierter Fachkern.** `src/domain` importiert nachweislich nur
  `zod`, ist streng typisiert und als reine Funktionen testbar. Die
  Schreibpfade sind transaktional und idempotent.
- **Datenschutz durch Technikgestaltung an vielen Stellen:**
  - keine Schülerkonten, keine Telemetrie
  - Tiere statt Namen im Raum
  - verschlüsselte 24-Stunden-Übergabe
  - Supabase-Fähigkeitsmodell mit Vertragstests

  Das ist mehr als in vielen kommerziellen Schulprodukten.

- **Das Live-Laufdiktat** als echte Unterrichtsmethode mit Übernahme der
  Fehlerwörter.
- **Die Leitner-Regeln der LernBox** mit Fälligkeitsschutz und
  Erholungsfenster.
- **Die Merkstufen-Idee als Fading-Weg** und die buchstabengenaue Rückmeldung
  im Wortspeicher.
- **Automatisch prüfbare Barrierefreiheit:** 0 axe-Verstöße in 26 Seiten und
  32 Zuständen.
- **Eine bewusst druckarme Motivation** (Motivation aus, keine Minuspunkte,
  Rückstand verborgen).
- **Ehrliche Dokumentation von Grenzen** („Wirksamkeit nicht belegt“,
  „Laufzettel kein Prüfungsnachweis“).

### Was ist nur scheinbar gut?

- **„96 % Testabdeckung“:** Gemessen wird nur `src/`. Mit `app/` sind es
  78,7 % der Zeilen (A-005). Wichtiger: Abdeckung misst Ausführung, nicht
  Richtigkeit. Die Kernfehler D-001, G-001 und F-001 liegen in Dateien mit
  nahezu 100 % Abdeckung.
- **„1 683 grüne Tests“:** Sie prüfen die eigene Normalform. Typografische
  Zeichen, Leerzeichen in Stufe 5 und Tausendertrennung kommen nicht vor
  (G-001, G-002). Ein Test schreibt das falsche Lernwort-Verhalten sogar fest
  (A-004).
- **„Adaptiv“ und „diagnosegestützt“:** Im Code steckt eine regelbasierte
  Wiederholungssteuerung ohne jede Kompetenzschätzung (D-003).
- **„Lernstände aus unveränderlichen Ereignissen“:** Das gilt nur für Mathe
  (A-003).
- **„Offlinefähig“:** Offline funktioniert nur, was unter der aktuellen
  Version schon besucht wurde. Nach einem Update bleibt fast nichts übrig
  (B-013).
- **„Sicher“, „gemeistert“, „Bestwert“, „Tagesziel geschafft“:** Diese Anzeigen
  messen Abschreiben, Wiederholen desselben Textes, Zufallsschwankung oder
  bloße Bearbeitung (D-001, D-004, G-007).
- **„Local-first = datenschutzkonform“:** Die lokale Datenhaltung senkt das
  Risiko, ersetzt aber nicht AVV, Verzeichnis und Freigabe (B-011). Gleichzeitig
  verursacht sie neue Risiken: LRS im QR (B-008), keine Personentrennung auf
  geteilten Geräten (B-010).
- **„Schulartübergreifend“:** Inhalte und Ansprache passen zu Jgst. 3–6
  (E-009).

### Wo liegen die größten verborgenen Risiken?

1. **Stille Fehlbewertung des Lernstands:** Wörter gelten nach Abschreiben als
   „sicher“ und verschwinden für Wochen aus der Tagesportion (A-004, D-001);
   „Wort zeigen“ verschiebt nicht abrufbare Wörter ebenso (F-001).
   Richtige Antworten werden als dreifacher Fehler gespeichert (G-001).
   Unterrichtsfehler beschleunigen den Aufstieg (G-011). Weder Kind noch
   Lehrkraft können das sehen.
2. **Datenverlust ohne Abhilfe:** Die Sicherung scheitert bei Ordnern mit
   einer Meldung ohne Ursache und Ausweg (B-001), Safari kann den Speicher
   löschen (B-002), und der Abgleich setzt Erreichtes zurück (G-010). Am
   stärksten gefährdet sind Kinder, die in Safari statt über den
   Home-Bildschirm lernen.
3. **Sensible Informationen an falscher Stelle:**
   - LRS-Status lesbar im Einschreibe-QR (B-008)
   - Schreiberleichterung für das falsche Kind auf geteilten Geräten (E-001)
   - Klarnamen und LRS-Haken im ungeschützten Lehrerbereich auf Tafel und
     Koffer-iPad (B-009)
4. **Rechtlicher Rahmen:** Laut Dokumentation läuft der Betrieb bereits mit
   Klassen, laut eigenem Impressum ist er nicht zulässig (B-011).
5. **Ein-Personen-Abhängigkeit:** 61 000 Zeilen, Bus-Faktor 1, ein junges
   Framework (A-007, A-017).

### Was würde ein erfahrener Softwarearchitekt grundlegend anders machen?

- **Eine einzige Wiederholungs- und Bewertungsmaschine** mit Regeltabelle als
  Test, statt vier Implementierungen (A-004).
- **Datenverträge tolerant lesen und streng schreiben;** Schemaversion je
  Ereignis (A-001).
- **Ereignisse entweder vollständig machen** (Projektionen als Cache) **oder
  ehrlich als Protokoll führen** (A-003).
- **Eine statisch auslieferbare Client-App ohne dynamisches Server-Rendering**
  für eine Local-first-PWA. Browser-Tests gegen das ausgelieferte Artefakt
  (A-006, A-007).
- **Ein Modulvertrag mit Registry** und Inhalte als Datenpakete (A-009).
- **Randfunktionen einfrieren**, bis der Kern stimmt (A-008).

### Was würde ein erfahrener Bildungswissenschaftler grundlegend anders machen?

- **Zuerst festlegen, welche Kompetenz gefördert wird,** dann das
  Kompetenzmodell aufbauen: Grundwortschatz nach Phänomen und Jahrgangsstufe,
  Basisfakten Mathe. Danach Übungen und Messung daran ausrichten (D-003,
  D-007).
- **Nachweisstärke konsequent trennen.** Abschreiben, Lücke mit Längenhinweis
  und Selbsteinschätzung sind Üben. Nur der freie Abruf an verschiedenen Tagen
  zählt als Beherrschung (D-001, D-002, D-010).
- **Lernverlaufsdiagnostik mit validierten Werkzeugen statt Eingangstest,**
  Fehlerklassifikation statt Richtig/Falsch, Transferprobe statt Bestwert (D-003, D-004, D-005, D-008).
- **Die Wirksamkeit früh in einem kleinen, ehrlich ausgewerteten Pilot
  prüfen,** mit geübten und ungeübten Wörtern (D, Abschnitt 9F).

### Was würde ein Schüler vermutlich kritisieren?

- „Ich hab die drei Wörter richtig geschrieben und es sagt, alle falsch.“ (G-001)
- „Ich hab aus Versehen unten getippt, jetzt ist alles weg.“ (C-001)
- „Was ist eine Merkstufe? Was ist ein Durchgang?“ (C-007)
- „Beim ersten Mal kam ich in so ein Tastaturspiel.“ (C-003)
- „Bei der Textbox war der Text weg, bevor ich fertig gelesen hatte.“ (C-002)
- „Beim Battle gewinnen immer die Schnellen, und mein Bildschirm hat
  geflackert.“ (D-012)
- „Da stand ‚don’t‘ ist falsch, aber ich hab’s richtig geschrieben.“ (G-002)

### Was würde eine Lehrkraft nach vier Wochen tatsächlicher Nutzung kritisieren?

1. „Ich weiß nicht, was die Kinder in der Übungszeit machen und ob es etwas
   bringt.“ (E-003)
2. „Auf dem iPad von gestern sind die Wörter eines anderen Kindes; Ben hatte
   Mias Erleichterung.“ (E-001)
3. „Ich kann den Kindern nicht einfach die Wörter der Woche geben.“ (E-002)
4. „Der QR-Bogen hatte nur die halbe Klasse.“ (C-006)
5. „Die Kleinen kommen ohne mich nicht zurecht.“ (C-007, E-004)
6. „Die Textbox schaffen die Langsamen in der Übungszeit nicht am Stück.“
   (D-005; Zeitbedarf geschätzt, nicht gemessen)
7. „Auf zwei Koffer-iPads, die eine andere Klasse in Safari nutzt, war alles
   weg.“ (B-002; denkbares Szenario, nicht beobachtet)
8. „Die Liste nach dem Laufdiktat zeigt nur Tiere; wer war Fuchs 2?“ (E-003)
9. „Die Vertretung konnte nichts damit machen.“ (E-008)

### Was müsste sich ändern, damit die Plattform in unterschiedlichen Schulen dauerhaft erfolgreich eingesetzt werden kann?

1. **Ein geklärter Rechtsrahmen** mit Datenschutzpaket für Schulleitungen
   (B-011).
2. **Ein Gerätemodell, das geteilte Geräte beherrscht** (B-010, E-001).
3. **Ein korrekter, gemeinsamer Lernkern:** Wiederholung, Bewertung,
   Antwortprüfung (A-004, D-001, G-001, G-002).
4. **Verlässliche Datensicherheit gegen Verlust** (B-001, B-002).
5. **Steuerung und Rückkanal für Lehrkräfte**, ohne die Datensparsamkeit
   aufzugeben (E-002, E-003).
6. **Eine ehrliche Zielgruppe** mit passenden Inhalten und Oberflächen (E-009).
7. **Betrieb, der nicht an einer Person hängt:** Übergabe- und
   Betriebsdokument, einfachere Plattform (A-017).

### Welche fünf Entscheidungen sollte der Entwickler als Nächstes treffen?

1. **Einsatzrahmen:** Echtbetrieb nur nach Freigabe durch die Schulleitung
   unter Beteiligung der Datenschutzbeauftragten. Bis dahin keine Klarnamen
   und keine LRS-Merkmale im Klassenbetrieb.
2. **Zielgruppe und Gerätemodell:** Version 1 für Jgst. 3–6 und
   Basisförderung plus LernBox. Nach einer kurzen Beobachtungsphase
   (Gerätezählung, Installation, Sicherungen) festlegen, ob feste
   Gerätezuordnung, Profile je Kind oder – bei Koffer-iPads – ein
   verschlüsselt mit dem Kind reisender Lernstand gelten (Abschnitt M.8).
3. **Funktionsstopp für Randfunktionen** (Geräte-Abgleich, Häuser, Duell,
   Spiegelschrift). Die nächsten Wochen gehören nur der Korrektheit des
   Lernkerns und der Datensicherheit.
4. **Ein Wiederholungskern und eine Ereignisstrategie:** entscheiden, ob
   Ereignisse vollständig werden oder Protokoll bleiben, und alle Module auf
   eine Regeltabelle bringen.
5. **Diagnostik- und Rückkanalkonzept:** zuerst valide Übungsdaten, dann
   Beherrschungskriterien; für Diagnostik bestehende Werkzeuge statt eines
   Eingangstests; ein freiwilliger Kurzbericht an
   die Lehrkraft und ein kleiner, ausgewerteter Pilot vor jeder Ausweitung.

## L – Technisches Gutachten

Grundlage: Berichte A (`agent-a-architektur.md`), B (`agent-b-sicherheit.md`),
G (`agent-g-korrektheit.md`), Red Team F sowie die von der Hauptinstanz
ausgeführten Prüfungen (Abschnitt N).

### Architektur und Codequalität

**Stark**

- Der Fachkern `src/domain` importiert nachweislich nur `zod` (A, Prüfschritt 1).
- Strenger TypeScript-Modus: 0 × `any`, 0 × `@ts-ignore`.
- Reine Ansichten sind per ESLint erzwungen.
- Schreibpfade sind transaktional und idempotent.
- Das Freigaberegister ist per Test mit dem README abgeglichen.

Das ist überdurchschnittliche Ingenieursdisziplin für ein Einzelprojekt.

**Schwach**

- **Ereignisquelle nur dem Namen nach:** Die tragenden Architekturversprechen
  hält der Code nur teilweise (A-003). Nur Mathe ist eine echte Projektion aus
  Ereignissen.
- **Mehrfache Wiederholungslogik:** Die Wiederholungsregel ist viermal
  unterschiedlich implementiert (A-004). Ausgerechnet die Lernwörter verletzen
  die eigene Spezifikation.
- **Zerbrechliche Datenverträge:** Ein einziges unbekanntes Feld legt
  Tagesportion, Empfehlungen und Mathe-Wiederholung lahm (A-001, nach
  Gegenprüfung P2; zusammen mit B-001 ein Ursachenbündel). Ein Rollback
  nach einem fehlerhaften Release ist damit nicht gefahrlos möglich.
- **Uneinheitliche Fehlerbehandlung:** Speicherfehler erscheinen als „heute
  nichts dran“ oder als Dauer-Laden (A-002). Es gibt keine Fehlergrenzen und
  keine Diagnose.

**Plattform**

- Die Laufzeitplattform passt schlecht zum Local-first-Ziel (A-007). Jede
  Seite wird dynamisch auf einem Cloudflare-Worker gerendert, mit einem acht
  Monate alten Framework.
- Der Produktionsserver ist lokal nicht startbar, und die Browser-Tests prüfen
  den Entwicklungsserver statt des ausgelieferten Artefakts (A-006).

**Komplexität und Wartbarkeit**

- Randfunktionen sind größer als der Lernkern (A-008): Der Geräte-Abgleich der
  Lehrkraft umfasst ≈ 6 100 Zeilen, alle Schüler-Lerncontainer zusammen
  ≈ 3 400 Zeilen.
- 61 000 Zeilen Produktionscode bei einem Bus-Faktor von 1 (A-017) sind nur
  mit KI-Unterstützung pflegbar. Dann muss die Architektur besonders einfach
  und regelgesichert sein, und das ist sie in den tragenden Verträgen nicht.

### Sicherheit, Datenschutz und Zuverlässigkeit

**Stark**

- **Supabase-Seite:**
  - Tabellen ohne Clientrechte, nur fähigkeitsgebundene RPCs
  - Tokens werden nur gehasht gespeichert
  - 24-Stunden-Löschung
  - 19 Datenbank-Vertragstests gegen die Originalmigrationen
- **Datensparsamkeit:**
  - Tiere statt Klarnamen im Raum
  - keine Telemetrie, keine Tracker
  - selbst gehostete Schriften
- **Kryptografie:** AES-GCM, PBKDF2 und PKCE sind solide umgesetzt (B).

**Schwach an den Rändern**

- **Sicherung:** Die persönliche Sicherung bricht vollständig ab, sobald ein
  Kind einen LernBox-Ordner nutzt (B-001, von der Hauptinstanz reproduziert).
- **Speicherlöschung:** Gegen die Speicherlöschung unter iPadOS/Safari gibt es
  keine Maßnahme (B-002): keine Persistenzanforderung und kein Hinweis auf
  getrennte Speicher bei der Home-Bildschirm-Installation.
- **Realtime-Kanäle:**
  - Sie sind öffentlich (B-003). Jeder mit Raumcode und öffentlichem Schlüssel
    kann Teilnehmer auf dem Lehrer-Beamer fälschen, Battle-Angriffe senden und
    Fehlerwörter mitlesen.
  - Der vierstellige Code ist die einzige Schranke vor Lösungen und
    Stationsständen (B-004).
- **Personentrennung:**
  - Die LRS-Freigabe steht lesbar im Einschreibe-QR; in der projizierten
    Einzelansicht verrät sie die Größe des Codes (B-008, nach Gegenprüfung P2).
  - Der Lehrerbereich ist auf geteilten Geräten ungeschützt (B-009).
  - Auf Schülergeräten gibt es keine Trennung mehrerer Kinder (B-010).
- **Rechtsrahmen:**
  - Für den Echtbetrieb mit Kindern fehlen AVV, Verzeichnis,
    DSFA-Schwellwertprüfung und Freigabe durch die Schule (B-011).
  - Das eigene Impressum untersagt den laufenden Einsatz.
  - Die Datenschutzerklärung beschreibt eine ChatGPT-Anmeldung, die die
    App nicht verwendet (Rest der Projektvorlage), und verschweigt reale
    Verarbeitungen.
- **Offline:** Offline funktioniert nur, was unter der aktuellen
  Service-Worker-Version schon besucht wurde. Nach einem Update bleibt fast
  nichts mehr offline nutzbar (B-013).

### Funktionale Korrektheit

Ergebnis der Prüfinstanz G (`agent-g-korrektheit.md`, 14 Befunde, alle mit
eigenen Scratch-Tests reproduziert oder per Codeanalyse belegt):

**Stark (geprüft, nicht nur gelesen)**

- **Mathe-Generator und Parser:** 2 000 zufällige Konfigurationen ohne einen
  Operanden oder ein Ergebnis außerhalb der Grenzen. Der Ausdrucksparser kommt
  ohne `eval` aus und rechnet Rangfolge und Kommazahlen richtig.
- **Wortausrichtung der Textbox:** Ein eingefügtes oder fehlendes Wort
  verschiebt die übrigen Bewertungen nicht.
- **Tagesportion:** Quoten und Obergrenze halten in 3 000 zufälligen
  Kandidatenmengen; zwei Tabs erhalten denselben Plan.
- **Doppeltes Absenden** ist in allen geprüften Modulen abgefangen.
- **Sicherung (ohne Ordner):** Einspielen ist atomar, idempotent und liest
  ältere Formate.

**Schwach: die Grenze zwischen Eingabe und Prüfung**

Die rechnenden Kerne sind sauber, aber an der Stelle, wo eine echte Eingabe auf
die Prüfung trifft, werden in realistischen Situationen richtige Antworten als
falsch gewertet und einige falsche als richtig:

- Wortspeicher Stufe 5: richtige, mit Leerzeichen getrennte Wörter gelten
  alle als falsch und fallen auf Box 1 (G-001, P1).
- Typografische Apostrophe und Anführungszeichen der iPad-Tastatur, übliche
  Synonym-Schreibweisen („(to) go“, „home / house“) und Tausendertrennung
  machen richtige Antworten falsch (G-002, G-003, G-008).
- „0,001“ gilt für 0,1 · 0,1 als richtig (absolute Toleranz 0,01; G-008);
  „0 · _ = 0“ akzeptiert nur eine Zahl (G-009).
- Satzanfänge aus dem Laufdiktat landen großgeschrieben im Wortspeicher
  (G-012); im Laufdiktat allein ist die iPad-Autokorrektur nicht abgeschaltet
  (G-013, auf dem Gerät nicht geprüft).

**Schwach: still abweichender Lernstand**

- Fehler in der Unterrichtsrunde beschleunigen den LernBox-Aufstieg
  (G-011, nach Gegenprüfung P2). Das kehrt die Absicht von Entscheidung 49
  um und trifft gerade Kinder mit Schreiberleichterung.
- Beide Richtungen einer Karte teilen den Abrufzeitpunkt (G-005).
- Bei fester Übungszeit verlängert sich jeder Lernwort- und Mathe-Abstand um
  einen Kalendertag (G-006).
- Eine falsche Antwort zählt in der Tagesportion als „erledigt“ (G-007).
- Der Abgleich setzt bestandene Tastenwelt-Lektionen und Bestwerte zurück
  (G-010).

Keiner dieser Fälle ist durch Tests abgedeckt, weil die Tests die eigene
Normalform der Eingabe voraussetzen. Für Kind und Lehrkraft sind die Fehler
unsichtbar, denn keine Ansicht zeigt, wie ein Lernstand zustande kommt.
Bewertung G: funktionale Korrektheit 2,5; Zuverlässigkeit der
Lernstandsberechnung 2.

## M – Gegenprüfung durch das Red Team

Vollständiger Bericht: `2026-10-19-gesamtaudit/agent-f-redteam.md`.

### M.1 Vorgehen

Das Red Team (F) hatte den Auftrag, jede P1-Behauptung zu **widerlegen** oder
in der Schwere zu senken, fachübergreifende Widersprüche offenzulegen,
überschätzte Stärken und riskante Empfehlungen zu benennen und nach
übersehenen Problemen zu suchen. Es hat dazu eigene Scratch-Tests und einen
Druckversuch ausgeführt und alle Fundstellen selbst gelesen. Die Hauptinstanz
hat zusätzlich A-004, B-001, D-001, D-006, E-001, E-005, G-001, C-006 und den
neuen Befund F-001 unabhängig am Code bestätigt. Separate Gegenprüfer für
Technik und Pädagogik entfielen wegen wiederholter Abbrüche durch ein
Nutzungslimit; das Red Team hat ihre Aufgabe für alle P1-Befunde übernommen.

Das Red Team bewertet die Berichte selbst: Belastbarkeit der P1-Befunde 4,0,
Kalibrierung der Schweregrade 2,5, Aussagekraft der Empfehlungen 3,0,
Konsistenz zwischen den Berichten 2,5 und Kohärenz der
Grundsatzentscheidungen der Plattform 2,0. Die handwerkliche Qualität des
Codes ist deutlich höher als die Stimmigkeit dieser Entscheidungen.

### M.2 Ergebnis für die P1-Befunde

Keine P1-Behauptung ließ sich widerlegen. Alle 17 Mechanismen sind
reproduziert oder im Code belegt. Die Schwere war aber an mehreren Stellen zu
hoch angesetzt, und einige Befunde beschreiben dieselbe Ursache.

| Befund              | Urteil                      | Schwere                                           | Kern der Begründung                                                                                                |
| ------------------- | --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A-001               | abgeschwächt                | P1 → P2                                           | entsteht nur bei Versionsschiefe auf demselben Gerät; zusammen mit B-001 ein Ursachenbündel „Schemaevolution“ (P1) |
| A-004 + D-001       | bestätigt, D-001 verschärft | P1 (ein Befund)                                   | Abschreiben hebt auch die Merkstufe auf den Höchstwert                                                             |
| B-001               | bestätigt                   | P1                                                | Meldung ohne Ursache und Abhilfe statt „still“                                                                     |
| B-002               | bestätigt                   | P1                                                | Plattformmechanismus teilweise überzeichnet (siehe M.4)                                                            |
| B-003               | abgeschwächt                | P2 im Pilot, P1 vor Rollout                       | realistischer Angreifer ist ein Kind im Raum                                                                       |
| B-008               | abgeschwächt                | P1 → P2                                           | auf dem Bogen sind alle Codes gleich groß                                                                          |
| B-009               | bestätigt                   | P1                                                | Pilotszenario legt Lehrerdaten auf den Tafelrechner                                                                |
| B-010 + E-001       | bestätigt                   | P1 bei geteilten Geräten, P2 bei 1:1 (ein Befund) | Ausstattung der Pilotklasse unbekannt                                                                              |
| B-011               | bestätigt                   | P1                                                | kein P0, weil der Server nur pseudonyme Daten erhält                                                               |
| C-006               | abgeschwächt                | P1 → P2                                           | sichtbarer Fehler ohne Daten- oder Lernschaden                                                                     |
| D-003, E-002, E-003 | bestätigt                   | P1 als **Konzeptlücke**                           | getrennt von Defekten priorisieren                                                                                 |
| G-001               | bestätigt                   | P1                                                | eine richtige Leistung erzeugt drei gespeicherte Fehler                                                            |
| G-011               | abgeschwächt                | P1 → P2                                           | nur Karten, die schon in der LernBox liegen; eine Stufe                                                            |

**Bereinigtes Bild:** sieben echte P1-Problemgruppen – Schemaevolution
(B-001/A-001), Speicherlöschung (B-002), Gerät = Person (B-010/E-001),
falscher Lernstand (A-004/D-001 und G-001), Lehrerdaten (B-009),
Rechtsrahmen (B-011) – plus drei Konzeptlücken (D-003, E-002, E-003).

### M.3 Bestätigte Probleme, begründete Risiken und Hypothesen

| Kategorie                                                                | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bestätigte Probleme** (reproduziert oder eindeutig im Code)            | falscher Lernstand im Wortspeicher (A-004, D-001, G-001, F-001); Sicherung mit Ordnern (B-001); keine Persistenz- oder Wiederherstellungsmaßnahme (B-002, Codeteil); Lernstand und Freigabe je Gerät (B-010, E-001); ungeschützter Lehrerbereich (B-009); Widerspruch Impressum ↔ Einsatz (B-011); unvollständiger QR-Bogen (C-006); Unterrichtsfehler beschleunigen die LernBox (G-011); Antwortprüfung (G-002, G-003, G-008, G-009, G-012); Inhaltsfehler (D-006); fehlende Diagnostik, Steuerung und Rückmeldung (D-003, E-002, E-003) |
| **Begründete Risiken** (plausibel, aber nicht ausgelöst)                 | tatsächliche Speicherlöschung auf Schul-iPads (B-002, Plattformteil); Missbrauch der Realtime-Kanäle (B-003); Autokorrektur im Laufdiktat allein (G-013); Plattform- und Ein-Personen-Risiko (A-007, A-017); Supabase-Betrieb in den Ferien (B-020); Datenwachstum über Jahre (A-012)                                                                                                                                                                                                                                                     |
| **Hypothesen und offene Fragen** (ohne Nutzungsdaten nicht entscheidbar) | Geräteausstattung der Pilotklasse; tägliche Nutzung als Voraussetzung der Abstände; Zeitbedarf der Textbox (D-005); taktischer Einsatz von „Wort zeigen“ (F-001); Wirkung belastender Wörter (E-005); Lesart von „sicher“ durch Lehrkräfte; übertragbare Effektstärken aus der Forschung                                                                                                                                                                                                                                                  |

### M.4 Korrigierte Einzelaussagen (in diesen Bericht übernommen)

- **QR-Bogen und LRS:** Auf dem gedruckten Bogen sind alle Codes 180 px groß.
  Nur die projizierte Einzelansicht verrät die Freigabe über die Größe (B-008,
  E).
- **Speicherlöschung:** Die 7-Tage-Regel von WebKit zählt Tage mit
  Safari-Nutzung ohne Besuch der Seite, keine Kalendertage. Ferien mit
  ruhenden Geräten lösen sie nicht aus. Gefährdet sind vor allem Safari statt
  Home-Bildschirm und Geräte, die andere Klassen täglich nutzen.
- **Sicherung:** Der Fehler ist sichtbar, aber ohne Ursache und Abhilfe für
  das Kind (B-001).
- **Textbox-Dauer:** Die Schätzung „15–60 Minuten“ beruht auf einer
  angenommenen Tippgeschwindigkeit. Ein einzelner Durchgang passt eher in
  10 Minuten (D-005). Vor einer Umgestaltung sollten Pilotdaten ausgewertet
  werden.
- **Sprachniveau:** Lesbarkeitsindizes für Oberflächenfragmente werden nicht
  als Messgröße zitiert. C-007 trägt sich über Begriffszählungen.
- **Aufwand E-003:** Fehlerwörter je Teilnehmer liegen dem Lehrergerät schon
  vor (S statt M).
- **E-005:** Der Code-Befund stimmt; die Belastungswirkung ist nicht belegt
  (P3).
- **Effektstärken** aus der Forschung beschreiben eine Richtung, keinen
  erwartbaren Effekt für Grundschulkinder beim deutschen Rechtschreiben auf
  dem iPad.

### M.5 Fachübergreifende Widersprüche

Die Widersprüche werden nicht künstlich aufgelöst. Die Spalte „Folgerung“ gibt
die Haltung dieses Berichts wieder.

| Spannung                                        | Positionen                                                                                                                                                                                                          | Folgerung im Bericht                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datensparsamkeit ↔ Diagnosebedarf der Lehrkraft | B: keine neuen Datenflüsse ohne Rechtsrahmen. D/E: Rückkanal, Namen in der CSV, Kurzbericht. F: Kurzbericht per QR ist fälschbar und selbstselektiv; die Ablage läge am Tafelrechner.                               | Zuerst nur Fehlerwörter je Tier (keine neuen Datenflüsse) und CSV nur auf Klick (F-002). Alles Weitere erst nach S1 (Einsatzrahmen).                                                |
| Strenge Wiederholungsregeln ↔ Motivation        | A, D, G: kein Aufstieg ohne echten Abruf. C, E, D: Frust nach 0 %, ein Tippfehler setzt auf Box 1.                                                                                                                  | Die Korrektur von D-001 nur zusammen mit einer sichtbaren Übungsmenge umsetzen (Roadmap S4).                                                                                        |
| Toleranz ↔ Rechtschreiblernen                   | E: neutrale Anpassungen für alle. D/G: Toleranz akzeptiert bedeutungsändernde Abweichungen. Ungelöst: Die LernBox vergleicht ohne Groß- und Kleinschreibung, obwohl sie bei deutschen Antworten Lerngegenstand ist. | Normalisierung von Scheinfehlern (G-002) ist keine Toleranz. Für die LernBox zuerst klären, ob sie Bedeutung oder Schreibung trainiert; Vault 06 verlangt getrennte Stände (D-010). |
| Barrierefreiheit ↔ didaktischer Zweck           | C/E: Merkzeit ohne harte Grenze, Einzeltipp statt Zwei-Finger-Geste. F: Ohne Gegenmaßnahme wird das Laufdiktat zur Abschreibübung.                                                                                  | Beide Anpassungen umsetzen, aber die Regel „Vorlage und Eingabe nie gleichzeitig sichtbar“ als Test festschreiben (Roadmap M4).                                                     |
| Breite ↔ Pflegbarkeit                           | E: zwei Oberflächenprofile, Inhalte für alle Schularten. A/F: Pflegefläche halbieren, Bus-Faktor 1.                                                                                                                 | Der Bericht folgt A/F: Zielgruppe Jgst. 3–6, Sekundarstufe über die LernBox; ein zweites Profil nur bei belegtem Bedarf.                                                            |
| Barrierefreiheit 3,5 (C) ↔ 3,0 (F)              | C misst automatisch prüfbare Kriterien; F verweist auf Zwei-Finger-Geste und feste Merkzeit.                                                                                                                        | Endnote 3 (Abschnitt B).                                                                                                                                                            |
| Diagnostik                                      | D: eigene Lernverlaufsproben als Hauptweg. F: für eine Einzellehrkraft kaum validierbar; erst Datenvalidität.                                                                                                       | Der Bericht folgt F (Abschnitt F.4): validierte Werkzeuge wie Levumi, eigener Beherrschungsstand erst nach S4–S6.                                                                   |

### M.6 Empfehlungen mit Nebenwirkungen

Das Red Team hat 15 Empfehlungen benannt, die bei wörtlicher Umsetzung neue
Probleme erzeugen. Die Roadmap (Abschnitt J) berücksichtigt sie:

- **Reihenfolge bei Datenformaten:** Jede Schemaänderung (Stufe im Ereignis,
  neue Paketarten, Abrufzeit je Richtung, neue Ereignistypen) bricht ohne
  tolerantes Lesen ältere Geräte. Deshalb steht K1 vor K13, M1 und M2.
- **Profile je Kind** lösen nur „mehrere Kinder an einem festen Gerät“. Bei
  wechselnd zugeteilten Koffer-iPads läge der Lernstand verteilt auf vielen
  Geräten. Deshalb steht die Ausstattungsfrage vor M3.
- **Abbruchdialog bei jeder Navigation** wirkt unter iOS wie eine Falle.
  Besser: Zwischenstand speichern und „Weitermachen“ anbieten, Dialog nur bei
  ausdrücklichem Beenden (K4).
- **Ereignisquelle:** Die vollständige Variante (A-003a) kostet L und genau
  die Komplexität, die A-008 kritisiert. Empfohlen wird Variante b (ehrliches
  Protokoll, feldweises Zusammenführen) (M2).
- **Statischer Build jetzt** wäre ein Großumbau bei offenen S-Korrekturen. Von
  A-007 jetzt nur den kleinen Teil umsetzen; den Wechsel mit
  Auslösekriterien vertagen (L2).
- **Weitere Einzelfälle:** Entscheidungslücken nur als Gerüst ohne
  Box-Aufstieg (D-002); Fehlerklassifikation nur für die Lehrkraft und mit
  sichtbarer Unsicherheit (D-008); Komma nicht automatisch als
  Alternativtrenner (G-003); Nulllücken nicht bilden statt jede Zahl
  akzeptieren (G-009); Umstellung auf Kalendertage mit Begrenzung der
  zusätzlich fälligen Elemente (G-006); Teilnehmertoken nur mit Rückfrage
  dauerhaft speichern (B-019).

### M.7 Neue Befunde des Red Teams

- **F-001 (P2, reproduziert, von der Hauptinstanz bestätigt):** Im Wortspeicher
  ist „Wort zeigen“ günstiger als ein ehrlicher Versuch. Mit Hilfe bleibt die
  Box, und die nächste Wiederholung rückt 7, 14 oder 30 Tage weg; ein
  Fehlversuch setzt auf Box 1. Das belohnt Fehlervermeidung statt Abruf und
  gehört in dieselbe Korrektur wie D-001 (Roadmap S4).
- **F-002 (P3, Codeanalyse):** Beim Beenden des Live-Raums wird die
  Ergebnis-CSV ungefragt heruntergeladen, laut Pilotszenario am Tafelrechner.
  P2, sobald Namen oder Fehlerwörter je Kind hineinkommen (Roadmap S13).

Die systematische Suche nach übersehenen Problemen (TODO-Marker,
`innerHTML`, `localStorage`, `eslint-disable`, leere `catch`-Blöcke,
Service-Worker-Update in der Runde, Zeitzonen, Formatversionen) ergab darüber
hinaus nichts Neues von Gewicht.

### M.8 Grundsatzentscheidungen, die neu bewertet werden sollten

Das Red Team benennt fünf Grundsatzentscheidungen. Sie sind im
Entscheidungsindex des Vaults den bestehenden Entscheidungen zugeordnet.

1. **„Ein Gerät ist ein Kind“, der Browser-Speicher ist die einzige Kopie.**
   Daraus folgen sechs der sieben P1-Gruppen. F schlägt als Alternative vor,
   dass der Lernstand **verschlüsselt mit dem Kind reist**: eine Lernkarte mit
   QR, das Chiffrat auf dem Server, der Server sieht keinen Klartext.
   - _Haltung dieses Berichts:_ Das ist die konsequenteste Antwort auf
     Koffer-iPads, kostet aber L, verlangt einen Auftragsverarbeiter und
     widerspricht kurzfristig dem Funktionsstopp (Punkt 2). Sie sollte erst
     geprüft werden, wenn die Ausstattungsfrage Koffer-iPads als Normalfall
     ergibt und der Einsatzrahmen (S1) steht. Bei fester Gerätezuordnung
     genügen Local-first mit verlässlicher Sicherung und Speicherschutz.
2. **Breite vor Tiefe** bei Bus-Faktor 1: Funktionsstopp außerhalb des Kerns,
   ein gemeinsamer Wiederholungskern, Randfunktionen einfrieren statt
   löschen. Der Bericht teilt diese Einschätzung.
3. **Differenzierung durch Selbstwahl:** gelenkte Autonomie (Startpunkt per
   Auftrags-QR, Stufenaufstieg nach transparentem Kriterium, Anzeigen trennen
   „geübt“ und „gekonnt“). Der Bericht teilt diese Einschätzung.
4. **Leitner mit Exaktvergleich und Totalrückstufung:** Scheinfehler kosten
   den ganzen Lernstand eines Wortes; die Abstände setzen tägliche Nutzung
   voraus. F schlägt Box − 1 bei Einzelfehlern außerhalb der kritischen
   Stelle und Fälligkeit in Übungseinheiten vor.
   - _Haltung dieses Berichts:_ Normalisierung und die Unterscheidung von
     Abruf, Hilfe und Abschreiben sind eindeutig richtig. Box − 1 und
     Übungseinheiten ändern Vault 06 und Entscheidung 57; sie sind eine
     **Option zur Prüfung** nach der Beobachtungsphase, keine Empfehlung.
5. **Echtbetrieb als Privatprojekt vor geklärtem Rechtsrahmen:** Pilot formal
   an die Schule binden; bis dahin ein Datensparmodus (Kürzel statt
   Klarnamen, kein LRS-Merkmal, Lehrerbereich nicht auf geteilten Geräten).
   Der Bericht teilt diese Einschätzung (Roadmap S1).

### M.9 Ungeprüfte Annahmen und Beobachtungsphase

Das Red Team listet 16 Annahmen über Kinder und Lehrkräfte, die weder im
Repository noch in den Berichten mit Daten belegt sind. Die wichtigsten:

- Ein Gerät gehört einem Kind.
- Kinder üben fast täglich.
- Kinder wählen ihre Stufe passend und nutzen Hilfe nicht taktisch.
- Kinder oder Familien sichern regelmäßig, die App ist installiert.
- Auf den Schul-iPads gibt es eine deutsche Systemstimme, und die Kamera ist
  für den QR-Scan freigegeben.

**Vorschlag zur Prüfung:** eine datensparsame Beobachtungsphase von vier
Wochen ohne Datenexport. Dazu gehören eine Gerätezählung, die Sichtprüfung der
Installation, 15 Minuten Unterrichtsbeobachtung an fünf Geräten und lokale
Zähler, die die Lehrkraft am Gerät abliest. Ohne diese Phase bleiben die
Prioritäten dieses Audits in der Größenordnung unsicher, vor allem bei der
Gerätefrage.

## N – Durchgeführte Prüfungen und Grenzen des Audits

### N.1 Prüfungen der Hauptinstanz

| Prüfung                                                                                                       | Ergebnis                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                      | erfolgreich                                                                                                                                                                                              |
| `npm run check` (Prettier, ESLint, Typecheck, Vitest, Build)                                                  | grün: 178 Testdateien, 1 683 Tests, 19 Datenbanktests, 13 Render-Tests; Abdeckung 96,1 % Anweisungen / 91,5 % Zweige, **gemessen nur für `src/domain`, `src/storage`, `src/speech`, `src/integrations`** |
| Chromium-E2E (Dev-Server, Projekte desktop-chromium, mobile-chrome, minimum-width, iPad-Viewport in Chromium) | 346 bestanden, 30 übersprungen; 4 Fehlschläge durch einen fest eingetragenen Port im Test, mit Weiterleitung 4/4 bestanden. Keine Produktfehler gefunden.                                                |
| Lokale Live-Tests `e2e/live` (abgefangene Supabase-RPCs)                                                      | 68 bestanden, 7 im Test vorgesehen übersprungen, 0 fehlgeschlagen                                                                                                                                        |
| Lokaler Produktionsserver (`vinext start`)                                                                    | nicht startbar (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, Cloudflare-Build); alle Browserprüfungen liefen deshalb gegen den Entwicklungsserver                                                                   |
| Designvergleich `test:design`                                                                                 | bewusst nicht ausgeführt: laut `AGENTS.md` nur als Vorher-Nachher-Vergleich aussagekräftig, das Audit ändert keinen Code                                                                                 |
| Stichproben zu P1-Befunden                                                                                    | A-004, B-001 (erneut reproduziert), D-001, D-006, E-001, E-005, G-001, C-006 unabhängig am Code bestätigt (Tabelle in `00-stand.md`)                                                                     |

### N.2 Prüfungen der Prüfinstanzen

Alle Reproduktionen liegen als Scratch-Tests und Skripte außerhalb des
Repositorys. Sie sind in den Berichten mit Testcode-Auszug und Ergebnis
dokumentiert.

| Instanz | Art der Prüfungen                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A       | 8 Scratch-Tests (Leitner-Vergleich, Abgleich-Divergenz, vergiftetes Ereignis, Datenwachstum), Abdeckung inklusive `app/` (78,7 % Zeilen, 72,2 % Zweige)                                                                                                 |
| B       | 10 Scratch-Tests und Skripte (Sicherung, Einschreibe-QR, Umschlag, CSV), PGlite-Tests gegen die Originalmigrationen, `npm audit`                                                                                                                        |
| C       | 39 Skripte, 208 Screenshots, 7 PDFs: 26 Seiten und 32 Zustände in vier Ansichten, axe-core, Lesbarkeitsmessung, Druck als PDF, zwei Wochen mit simulierter Uhr                                                                                          |
| D       | 4 Skripte zu Wortlisten, Regeltexten, Aufgabenverteilung im Kopfrechnen; Literaturabgleich                                                                                                                                                              |
| E       | 3 Skripte und 13 Screenshots zu Lehrerabläufen und Schulartszenarien                                                                                                                                                                                    |
| G       | 10 Scratch-Tests, teils mit fast-check (2 000 bzw. 3 000 Zufallsläufe)                                                                                                                                                                                  |
| F       | 6 eigene Scratch-Tests (vergiftetes Ereignis, Abschreiben, „Wort zeigen“, Stufe 5, Live-Platzierung, Schreiberleichterung) und ein Druckversuch als PDF mit Gegenprobe; Codelesung zu allen P1-Befunden; systematische Suche nach übersehenen Problemen |

### N.3 Was dieses Audit nicht leisten konnte

- **Keine echten Schulgeräte:** Es gab kein iPad und kein WebKit, nur ein
  älteres Chromium (Revision 1194). Aussagen zu Safari, iPadOS-Speicher,
  Autokorrektur und Tastatur sind Codeanalyse und Recherche, nicht Messung.
- **Keine Produktivsysteme:** Supabase, Cloudflare und Cloud-Konten wurden
  nicht berührt. Betrieb, Kontingente, Pausierung und Protokolle sind deshalb
  offene Fragen (B-020).
- **Kein ausgeliefertes Artefakt im Browser:** Der Produktionsbuild ließ sich
  lokal nicht starten. Service Worker und Offlinebetrieb sind nur per
  Codeanalyse und Teilversuch bewertet.
- **Keine Nutzerstudie:** Aussagen zur Verständlichkeit für Kinder und
  Lehrkräfte beruhen auf Expertenurteil, Lesbarkeitsmessung und simulierten
  Abläufen.
- **Keine Wirksamkeitsmessung:** Ob Lernraum Lernzuwachs erzeugt, lässt sich
  aus dem Code nicht beantworten. Die pädagogischen Urteile bewerten die
  Plausibilität der Lernmechanik.
- **Keine Rechtsberatung:** Die Aussagen zu AVV, Verzeichnis, DSFA und
  Freigabe beschreiben den Stand der Dokumente und benennen Prüffragen. Die
  rechtliche Bewertung gehört zur behördlichen Datenschutzbeauftragten und zur
  Schulleitung.
- **Keine vollständige Inhaltsprüfung:** Wortlisten und Texte wurden per
  Skript und in Stichproben geprüft, nicht Wort für Wort.

## O – Dokumentationsänderungen und Änderungsprotokoll

Grundsätze: Es wurde kein Anwendungscode, kein Test, keine Konfiguration,
keine Obsidian-Einstellung, nicht `AGENTS.md` und nicht der verbindliche
Standard `docs/engineering-quality.md` verändert. Keine Notiz wurde gelöscht,
verschoben oder umbenannt, und kein bestehender Text wurde entfernt.
Überholte Aussagen sind gekennzeichnet, nicht gestrichen. Alle Empfehlungen
sind als **Vorschlag zur Prüfung** markiert. Es gibt keinen Commit; alle
Änderungen sind mit `git diff` und `git status` nachvollziehbar und mit
`git checkout -- <datei>` umkehrbar. Der Strukturplan mit Begründung steht in
`2026-10-19-gesamtaudit/03-dokumentation-strukturplan.md`.

### O.1 Neue Dateien

| Datei                                                                               | Zweck                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/audits/2026-10-19-lernraum-gesamtaudit.md`                                    | **maßgeblicher Abschlussbericht** dieses Audits                                                                                                 |
| `docs/audits/2026-10-19-gesamtaudit/00-stand.md`                                    | Arbeitsstand, ausgeführte Prüfungen, Unterbrechungen                                                                                            |
| `docs/audits/2026-10-19-gesamtaudit/01-bestandsaufnahme.md`                         | Bestandsaufnahme (Phase I)                                                                                                                      |
| `docs/audits/2026-10-19-gesamtaudit/02-pruefauftraege.md`                           | Regeln und Befundformat für die Prüfinstanzen                                                                                                   |
| `docs/audits/2026-10-19-gesamtaudit/03-dokumentation-strukturplan.md`               | Dokumentationsinventur und Strukturplan (Phase VIII)                                                                                            |
| `docs/audits/2026-10-19-gesamtaudit/agent-a- … agent-g-*.md`                        | sieben Prüfberichte (A, B, C, D, E, F, G) mit allen Belegen                                                                                     |
| `docs/README.md`                                                                    | Dokumentationsindex: Statuslegende, maßgebliche Quelle je Thema, Status der Umsetzungspläne                                                     |
| Vault `19 - Entscheidungsprotokoll/Entscheidungsindex.md`                           | Gültigkeit und Umsetzungsstand der Entscheidungen 1–57, neun Grundsatzentscheidungen mit Audit-Erkenntnissen und den Alternativen des Red Teams |
| Vault `21 - Qualitätsgrundlage und Freigabe/Lernraum – Gesamtaudit – 2026-10-19.md` | Auditprotokoll im Vault (Zusammenfassung, verweist auf den Bericht)                                                                             |

### O.2 Geänderte Dateien

| Datei                                       | Änderung                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault `00 - Übersicht.md`                   | neuer Block „Projektstand auf einen Blick“ (Statuslegende, zentrale Einstiege, Umsetzungsstand aller 24 Bereiche); datierte Hinweise bei „Offene Entscheidungen“ und „Aktuelle Priorität“ (als historischer Stand gekennzeichnet); Eigenschaften `stand`, `audit` |
| Vault `01 … 24 /Anwendung.md` (24 Notizen)  | Eigenschaften `umsetzungsstand` und `audit`; Hinweisblock unter der Überschrift mit Status, belegten Abweichungen und Befund-IDs. Der übrige Text ist unverändert                                                                                                 |
| `docs/architecture.md`                      | datierter Hinweis im Abschnitt „Aktueller fachlicher Stand“ (Ereignisquelle, Wiederholungsregeln, nächster Schritt; A-003, A-004)                                                                                                                                 |
| `docs/laufdiktat-pilot-product-contract.md` | datierter Statushinweis „Überholt als Beschreibung der Standardfreigaben“; Text unverändert erhalten                                                                                                                                                              |

### O.3 Bewusst nicht geändert

- `docs/engineering-quality.md`: Regel 3 und die Abdeckungsangabe weichen vom
  Code ab (A-003, A-005). Der Standard ist verbindlich; eine Änderung ist
  Entscheidung der projektverantwortlichen Lehrkraft. Der Hinweis steht im
  Dokumentationsindex.
- `docs/security-risk-register.md`: Die neuen Risiken aus Bericht B sind im
  Index als fehlend vermerkt. Ob und mit welcher Bewertung sie in das Register
  übernommen werden, ist eine Entscheidung, keine Dokumentationspflege.
- Das Entscheidungsprotokoll (Vault 19, `Anwendung.md`) bleibt inhaltlich
  unverändert. Gültigkeit und Audit-Hinweise stehen im neuen
  Entscheidungsindex.
- Vault 17 (Entwicklungsplan) und 18 (Aufgabenübersicht): Audit-Maßnahmen
  wurden nicht als Aufgaben eingetragen. Die Hinweisblöcke verweisen auf die
  Roadmap des Audits als Vorschlag zur Prüfung.

### O.4 Maßgebliche Fassung und Übernahme in den OneDrive-Vault

- **Maßgeblich** ist dieser Bericht. Das Auditprotokoll im Vault ist eine
  Zusammenfassung. Die Agentenberichte sind Belege, keine eigenständigen
  Empfehlungen; wo sie von diesem Bericht abweichen (etwa bei der Schwere nach
  der Gegenprüfung), gilt dieser Bericht.
- Bearbeitet wurde die Exportkopie `obsidian-export/Lernplattform/`. Der
  maßgebliche Vault liegt im OneDrive der Lehrkraft und kann neuer sein. Die
  Änderungen werden deshalb als einzelne Dateien, als Patch und mit einer
  Dateizuordnung geliefert. Neue Notizen lassen sich direkt kopieren. Bei
  geänderten Notizen sollte nur der Hinweisblock und die Eigenschaften
  übernommen werden, damit neuere Inhalte im OneDrive-Vault erhalten bleiben.

### O.5 Abschlussprüfung der Dokumentation

Die Ergebnisse der abschließenden Link- und Formatprüfung stehen in
`2026-10-19-gesamtaudit/00-stand.md`.

## Anhang 1 – Funktions- und Architekturübersicht: Konzept und Implementierung

Statuskennzeichnung: **Implementiert** (im Code vorhanden und im Audit überprüft),
**Teilweise** (vorhanden, aber unvollständig oder mit wesentlichen Abweichungen),
**Geplant** (nur dokumentiert), **Überholt**, **Ungeklärt**.

### Lernbereiche für Schülerinnen und Schüler

| Bereich (Route)                                                   | Was der Code tatsächlich tut                                                                                                                                                                                       | Status                               | Wichtigste Abweichungen vom Konzept (Befund)                                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startseite / „Mein Lernraum“ (`/`, `/lernen`)                     | Tier-Profil ohne Konto, Tagesportion „X von 20 Aufgaben heute“ aus LernBox-Karten, Lernwörtern und Mathe-Fehlern; Wochenstreifen; Sicherungserinnerung nur in den Einstellungen                                    | Implementiert                        | Tagesportion zählt Stückzahl, kein Zeitbudget (D-011); Speicherfehler erscheinen als „nichts dran“ (A-002)                                                                                            |
| Üben-Übersicht (`/ueben`)                                         | Kacheln: LernBox, Wortspeicher, Tastenwelt, Kopfrechnen, Laufdiktat allein (Textbox über Wortspeicher/Üben)                                                                                                        | Implementiert                        | Vault 01/22 beschreiben noch „Heute üben, Fächer, Meine Inhalte, Mein Fortschritt“                                                                                                                    |
| LernBox (`/lernbox`)                                              | Stapel, Ordner, Karten, Schreib- und Karteikartenmodus, Leitner 1/3/7/14/30 Tage je Richtung, kein Aufstieg vor Fälligkeit, Import/Export, Vorlesen, Abruf von Lehrkraftpaketen per Code                           | Teilweise                            | Selbsteinschätzung hebt bis Box 5 (D-010); getrennte Stände „Bedeutung/Schreiben“ aus Vault 06 fehlen; Ordner brechen die Gesamtsicherung (B-001)                                                     |
| Wortspeicher (`/frei/german`)                                     | 8 feste Wortboxen (104–133 Wörter), eigene Wortboxen, Merkstufen 1–6 (Abschreiben bis Hören), Prozentwert und Bestwert je Runde, Buchstabenvergleich, Übernahme aus Laufdiktat, Brücke zur Textbox                 | Teilweise                            | Lernwort-Wiederholung ohne Fälligkeitsschutz (A-004), Abschreiben hebt Box (D-001), Längenstriche verraten die Entscheidung (D-002), fachliche Inhaltsfehler (D-006), keine Kontraste/Niveaus (D-007) |
| Textbox (`/frei/german/textbox`)                                  | 50 Texte, vier Durchgänge mit 20/40/70/100 % Ausblendung, Wort-für-Wort-Kontrolle, Bestwert, Verlauf, Laufzettel, Spiegelschrift (Vorschau)                                                                        | Teilweise                            | Hauptwert misst Textbehalten (D-005); Schwerpunktstatistik schreibt vergessene Wörter dem Phänomen zu; Einheit deutlich länger als 10 Minuten                                                         |
| Kopfrechnen (`/frei/mathematics`)                                 | Grundrechenarten mit Zahlenraum, Einmaleinsreihen, Lückenaufgaben, eigene Aufgaben mit sicherem Parser, Fehlerwiederholung nach Aufgabenfamilien (1/3/7/14 Tage), neue Aufgaben statt Kopien                       | Teilweise                            | Gleichverteilte Operanden mit vielen trivialen Aufgaben, keine Messung der Rechenflüssigkeit, grobe Familien (D-009)                                                                                  |
| Tastenwelt (`/frei/typing`)                                       | Lehrgang von Grundstellung bis Texte, Fehler-Stopp, Genauigkeit vor Tempo, unsichere Tasten                                                                                                                        | Implementiert                        | Freischaltung nach einem Durchgang ≥ 90 %, kleingeschriebene Nomen (D-014); nicht Teil der Tagesportion                                                                                               |
| Laufdiktat allein (`/frei/german/laufdiktat`)                     | Text- und Vokabelrunden mit Ansehen/Verdecken/Schreiben, Sterne                                                                                                                                                    | Teilweise                            | Textrunden erzeugen kein Lernereignis (D-011); Satz nur zeichengenau richtig (D-008)                                                                                                                  |
| Laufdiktat-Raum (`/raum`)                                         | Beitritt per 4-stelligem Code/QR, Tier-Pseudonym, Lobby, Modi Laufdiktat, Freie Übung, Battle, Stationen; Übernahme von Vokabeln/Wörtern nach Ergebnis (E 49, 55); Schreiberleichterung über Klassenstempel (E 50) | Implementiert                        | Realtime-Kanäle ohne Autorisierung (B-003), Code als einzige Schranke (B-004), Tempo-Punkte und Battle nach Tempo (D-012); Modus „Lernstandscheck“ existiert nicht mehr („TEST“ → „LAUFDIKTAT“)       |
| Klasse beitreten, Aufgaben (`/lernen/klasse`, `/lernen/aufgaben`) | Einschreibung per individuellem QR mit Namensbestätigung, Aufgabenübernahme per QR, signierter Abgabenachweis                                                                                                      | Implementiert                        | LRS-Freigabe im QR erkennbar (B-008); Abgabenachweise fälschbar (B-018); Lehrer-Aufgaben stehen auf `vorschau`                                                                                        |
| Fortschritt (`/lernen/fortschritt`)                               | Aktivität, aktive Tage, „frühere Fehler verbessert“, Wortspeicher- und Textbox-Abschnitt                                                                                                                           | Teilweise                            | Kennzahlen zeigen Rauschen/Sofortkorrektur (D-004); kein Mathe-Fortschritt; aktive Tage nach UTC (A-013)                                                                                              |
| Einstellungen, Sicherung, Schüler-Cloud                           | Tierwahl, Datei-Sicherung, Verzeichnis-Sicherung, Handabgleich mit eigenem Cloudkonto                                                                                                                              | Teilweise                            | Sicherung scheitert bei Ordnern (B-001); keine Persistenzanforderung (B-002); Schüler-Cloud unverschlüsselt                                                                                           |
| Häuser, Serie, Abzeichen (`/haus`)                                | gebaut, Freigabe `aus`                                                                                                                                                                                             | Implementiert, ausgeschaltet         | bewusst zurückgehalten (E 39, 47)                                                                                                                                                                     |
| Duell (`/duell`)                                                  | Platzhalter, Freigabe `aus`                                                                                                                                                                                        | Geplant                              | Vault 09 beschreibt ein vollständiges Konzept                                                                                                                                                         |
| Ramagotchi                                                        | nicht vorhanden                                                                                                                                                                                                    | Geplant                              | Vault 23, Entscheidung 39                                                                                                                                                                             |
| Eingangstest, Kompetenzchecks, Kompetenzschätzung                 | nicht vorhanden (Codesuche ohne Treffer)                                                                                                                                                                           | Nicht vorhanden / Ungeklärt als Ziel | Im Auftrag genannt, in Vault und Entscheidungen nicht beschlossen (D-003)                                                                                                                             |
| QR-Ranking-Leistungsbrief                                         | nur Haus-Leistungsbrief (ausgeschaltet) und Aufgaben-Abgabenachweis                                                                                                                                                | Teilweise                            | verschlüsselter Ranking-Brief aus Entscheidung 4 nicht umgesetzt                                                                                                                                      |

### Lehrerbereich

| Bereich                                            | Was der Code tatsächlich tut                                                                                                                  | Status                    | Abweichungen (Befund)                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Inhalte und Klassen (`/lehrer`, `/lehrer/klassen`) | Ablage für Text, Mathe, Vokabeln je Klasse; Klassen, Schülerliste, Einschreibe-QR-Bögen, Schreiberleichterung je Kind, Klassenstempel (ECDSA) | Implementiert             | kein Zugriffsschutz, Startseite verlinkt „Lehrer-Login“ (B-009); LRS im QR erkennbar (B-008)           |
| Laufdiktat-Lehrkraft (`/lehrer/live`)              | Inhalt → Optionen → Lobby → Live-Ansicht mit Fortschritt, häufigen Fehlern, „Braucht Hilfe“, CSV                                              | Implementiert             | Präsenz fälschbar (B-003), CSV-Formeln (B-007), Namen mit Fehlerzahlen bei Projektion sichtbar (D-012) |
| Material an Schüler (`/lehrer/material`)           | verschlüsselte 24-h-Übergabe von Vokabelpaketen über Supabase                                                                                 | Implementiert             | nur Vokabeln; Geheimnisse serverseitig erzeugt (B-017); kein Rate-Limit beim Anlegen (B-006)           |
| Aufgaben (`/lehrer/aufgaben`)                      | strukturierte Aufträge, QR-Verteilung, Abgabeprotokoll                                                                                        | Implementiert, `vorschau` | Aufgaben-QR unsigniert (B-018)                                                                         |
| Geräte-Abgleich (Einstellungen)                    | automatischer Abgleich zwischen Geräten einer Lehrkraft über WebDAV/OneDrive/Google Drive, optional verschlüsselt (E 53)                      | Implementiert             | ≈ 6 100 Zeilen für eine Randfunktion (A-008); Downgrade auf unverschlüsselt (B-014)                    |

### Architektur in einem Satz je Schicht

- **Fachkern `src/domain`**: reine TypeScript-Funktionen, importiert nur `zod`
  (A, Prüfschritt 1). Stärke der Codebasis.
- **Speicher `src/storage`**: Dexie/IndexedDB, persönliche Datenbank in Version 7,
  getrennte Lehrerdatenbank; Ereignisse plus veränderliche Zustände (A-003).
- **Integrationen `src/integrations`**: Supabase-Räume (RPC-Fähigkeitsmodell),
  verschlüsselte Inhaltsübergabe, Cloud-Abgleich.
- **Oberfläche `app/`**: Vinext (Next-kompatibel, RSC) auf Cloudflare Worker; reine
  Ansichten in `app/views`, Container in `app/components`; Service Worker selbst
  generiert.
- **Steuerung `proxy.ts` + `src/domain/release.ts`**: Freigaberegister für
  Sichtbarkeit, keine Zugriffsrechte.

## Anhang 2 – Dateien des Audits

| Datei                                                     | Inhalt                                               |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `2026-10-19-gesamtaudit/00-stand.md`                      | Arbeitsstand, ausgeführte Prüfungen, Unterbrechungen |
| `2026-10-19-gesamtaudit/01-bestandsaufnahme.md`           | Bestandsaufnahme (Phase I)                           |
| `2026-10-19-gesamtaudit/02-pruefauftraege.md`             | Regeln und Befundformat                              |
| `2026-10-19-gesamtaudit/03-dokumentation-strukturplan.md` | Dokumentationsinventur und Strukturplan              |
| `2026-10-19-gesamtaudit/befundkatalog.md`                 | vollständiger Befundkatalog                          |
| `2026-10-19-gesamtaudit/agent-a-architektur.md`           | Prüfinstanz A                                        |
| `2026-10-19-gesamtaudit/agent-b-sicherheit.md`            | Prüfinstanz B                                        |
| `2026-10-19-gesamtaudit/agent-c-qa-ux.md`                 | Prüfinstanz C                                        |
| `2026-10-19-gesamtaudit/agent-d-paedagogik.md`            | Prüfinstanz D                                        |
| `2026-10-19-gesamtaudit/agent-e-schularten.md`            | Prüfinstanz E                                        |
| `2026-10-19-gesamtaudit/agent-f-redteam.md`               | Red Team F                                           |
| `2026-10-19-gesamtaudit/agent-g-korrektheit.md`           | Prüfinstanz G                                        |

Reproduktionsskripte, Screenshots und PDFs liegen nicht im Repository. Sie
sind in den Berichten mit Code-Auszug und Ergebnis beschrieben und lassen sich
danach nachbauen.
