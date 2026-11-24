# Vision Lernraum – Rolle 31: Inklusion und Förderschwerpunkt Lernen

Stand: 10.11.2026. Geprüft am Code der Version 0.9.7, an den Berichten 10 bis
12 und 20 bis 25, am Gesamtaudit (Bericht E vollständig, C und D in Auszügen,
Abschlussbericht G und H), an den Entscheidungen 50, 57 und 58 und an Vault 13
und 20. Es gelten die Antworten des Entwicklers in `01-planung.md`,
Abschnitt 4, mit beiden Nachträgen. Die roten Linien RL-1 bis RL-13 aus
Bericht 12 gelten.

Kennzeichen: [Beleg] Repository, [Fachstand] Forschung oder anerkannte Praxis
mit Quelle, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser
Rolle. Webangaben stammen aus Suchauszügen vom 10.11.2026; kein Original wurde
vollständig gelesen. „n. o. v.“ heißt: aus Fachkenntnis, nicht online geprüft.
Mein Kürzel für Bausteine ist I31.

## 1. Kurzfazit

1. Lernraum ist für Kinder mit Förderschwerpunkt Lernen näher am Ziel, als die
   Fachberichte vermuten lassen: Es gibt kein Konto, kein Tempo im freien
   Üben, keine Ranglisten, keinen sichtbaren Rückstand, und der Startpunkt
   endet nach zwei Fehlern [Beleg].
2. Die größten Hürden sind heute nicht die Inhalte, sondern Lesemenge, Zahl der
   Entscheidungen beim Einstieg, fehlendes Vorlesen in den Aufgaben und
   Anzeigen, die Misserfolg sichtbar machen („0 / 105 sicher“).
3. Der Vorlese-Knopf ist nach Entscheidung 58 in Aufgaben erlaubt, aber an
   keiner Stelle eingebunden [Beleg]. Ihn einzubauen ist der billigste und am
   besten belegte Schritt für meine Prüffälle.
4. Die Fachberichte planen fast durchgehend für Kinder, die flüssig lesen und
   viel tippen. Kleine Änderungen öffnen die meisten Bausteine (Tabelle
   „Gegenlesen“, Abschnitt 3.4).
5. „Hohe Erfolgsquote“ heißt für die Auswahl in „Heute“: Fehler nicht gebündelt
   an den Anfang stellen und bei vielen Fehlern in einer Sitzung mehr Bekanntes
   und weniger Neues bringen, ohne ein Merkmal zu speichern.
6. Neutrale Hilfen (Vorlesen, weniger auf einmal, ohne Uhr, Aufgabe bleibt
   sichtbar, größere Schrift) sind etwas anderes als Toleranz bei der
   Schreibprüfung. Sie stehen nicht im Zielkonflikt mit dem Rechtschreiblernen
   (Nachtrag 1) und kosten wenig.
7. Für ältere Kinder mit frühem Lernstand fehlt eine schmale unterste Stufe
   (lautgetreue Wörter, Silben) in jugendgerechter Form. Ein Anlautlehrgang
   für Jahrgang 1 ist dagegen nicht leistbar.
8. Live-Formate mit Klassentempo (Bericht 24) sind vertretbar, wenn jeder
   Beitrag positiv zählt, Serien nicht abreißen und Fehler an der Tafel in
   Kleingruppen nicht zuzuordnen sind.
9. Lernraum leistet keine Förderdiagnostik und soll Förderplanung nur mit
   Übungsmaterial und mit dem, was das Kind selbst zeigt, unterstützen.
10. Kinder mit Förderschwerpunkt geistige Entwicklung, nicht alphabetisierte
    Kinder und Kinder mit Unterstützter Kommunikation bedient Lernraum auch in
    der fertigen Fassung nicht. Das soll die Vision offen sagen.

## 2. Ist-Stand in Lernraum

### 2.1 Vier Prüffälle

Erfundene Kinder, an denen ich jeden Vorschlag prüfe. Sie stehen für häufige
Lagen in der bayerischen Mittelschule [Vermutung, aus Praxis].

| Kürzel | Kind                                                                                                                                                                        | Was es braucht                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P1     | **Leon**, Jahrgang 7, Förderschwerpunkt Lernen, inklusiv beschult. Liest silbierend auf Stand etwa Jahrgang 2, versteht mündlich gut, will nicht „wie ein Baby“ üben.       | wenig Text, Vorlesen, jugendgerechte Inhalte unterhalb der Grundschulmitte, kein Jahrgangsetikett |
| P2     | **Sara**, Jahrgang 5, rechnet zählend, Zahlvorstellung bis 100 unsicher, rechnet langsam, aber oft richtig.                                                                 | Anschauung, keine Uhr, Aufgaben mit Kern statt Zufall, Erfolg am Anfang                           |
| P3     | **Elif**, Jahrgang 6, LRS, gute Auffassung, schnell in Mathe, schreibt lautorientiert und vermeidet Schreiben.                                                              | Strategie statt Rot, Wiedererkennen vor freiem Schreiben, kleine Mengen, keine Bloßstellung       |
| P4     | **Tim**, Jahrgang 8, kurze Aufmerksamkeit, Angst vor Fehlern, emotional-soziale Auffälligkeiten; sitzt beim Nachsitzen am Lehrertablet und bricht bei Misserfolg sofort ab. | sofortiger Erfolg, kurze Einheiten, keine abreißenden Serien, keine Zahl, die ihn schlecht macht  |

### 2.2 Was sich seit dem Audit geändert hat

Das Audit bewertete Lernraum 0.8.0 für Förderschwerpunkt Lernen und Sprache
mit „mit Anpassungen geeignet“, für Jahrgang 1/2, geistige Entwicklung und
DaZ-Anfänger als ungeeignet (Abschlussbericht G, Kernaussagen 1 und 3;
`agent-e-schularten.md`, Abschnitt 8).

| Bereich                 | Heute [Beleg]                                                                                                                                                                                                                                                         | Wirkung für die Prüffälle                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Kinder-Glossar          | Verbotene Fachwörter mit Test (`src/domain/child-glossary.ts`, „Runde“ statt „Durchgang“, „heute dran“ statt „fällig“)                                                                                                                                                | gut; die Wortwahl ist geregelt, die **Menge** an Text nicht                                              |
| Vorlesen in der Aufgabe | Entscheidung 58 erlaubt den Knopf in Aufgaben; `ReadAloudButton` steht aber nur in `app/ui/read-aloud-button.tsx` und im eigenen Test, eingebunden ist er nirgends (Suche in `app/`, `src/`). Vorlesen gibt es nur in LernBox, Live, Station und Wortspeicher-Stufe 6 | für P1 der wichtigste offene Punkt; Anweisungen und Rückmeldungen liest niemand vor                      |
| Rundenschutz            | Rückfrage beim Verlassen, „Weitermachen“ (Welle 3, D5-1)                                                                                                                                                                                                              | gut für P4: ein Fehltipp löscht keine Arbeit                                                             |
| Tagesportion            | 20 Aufgaben, Rückstand nie als Zahl (Entscheidung 57); Größe ist eine Konstante (`daily-plan.ts`, Z. 7), zuerst bis zu 6 Fehler (Z. 14)                                                                                                                               | Ziel erreichbar, aber für alle gleich groß; ein Kind mit vielen Fehlern beginnt mit sechs Fehleraufgaben |
| Erstkontakt             | „Loslegen“ führt zu sechs Kacheln mit je einem Satz (`app/ueben/practice-overview.tsx`), danach drei bis vier weitere Wahlen (Bericht 10, 4a)                                                                                                                         | für P1 und P4 zu viele Entscheidungen vor der ersten Aufgabe                                             |
| Startpunkt              | Abbruch nach zwei Fehlern einer Stufe; unterste Rechtschreibstufe ist „langes i“ mit „Biene“ und „Spiegel“ (`start-point.ts`, Z. 31, 158–165)                                                                                                                         | kurz und schonend; P1 kann aber schon an Stufe 1 scheitern, eine lautgetreue Stufe fehlt                 |
| Fehleranzeige           | „Noch nicht sicher“, „Noch nicht richtig. Versuche es erneut.“ (`feedback-panel.tsx`; `live-game.tsx`, Z. 761); Buchstabenvergleich mit Position                                                                                                                      | neutral im Ton, gut                                                                                      |
| Fortschrittsanzeigen    | Wortbox-Kachel „{sicher} / {gesamt} sicher“ und „% der Box“ (`app/views/wortspeicher/overview-screen.tsx`, Z. 48, 169)                                                                                                                                                | bei 105 Wörtern je Box sieht P1 wochenlang „3 / 105“                                                     |
| Rückstufung             | Lernwort: Fehler oder Hilfe setzen auf Box 1; LernBox: Fehler auf Box 1 (`spaced-repetition.ts`, Z. 139–172)                                                                                                                                                          | fachlich üblich (Leitner), solange das Kind es nicht als Verlust erlebt                                  |
| Zeit und Gedächtnis     | Kein Tempo im freien Üben; Live-Mathe verdeckt die Aufgabe beim Tippen (Bericht 24, 2.1); Textbox-Merkzeit 60/90/120 s (`textbox-session.ts`, Z. 24–27); Durchgang 4 wertet weiter das Behalten (D-005; Suche nach „Rechtschreibquote“ in `src/` ohne Treffer)        | P1, P2 und P3 scheitern hier am Arbeitsgedächtnis, nicht am Lerngegenstand                               |
| Zwei-Finger-Geste       | Laufdiktat zeigt den Satz nur bei zwei Fingern oder A+L; Mauszeiger zählen nicht (`src/domain/hold-to-reveal.ts`, Kopfkommentar)                                                                                                                                      | Audit E-007 offen; schließt Kinder mit motorischen Einschränkungen aus (WCAG 2.5.1)                      |
| Schreiberleichterung    | Toleranz von einem Buchstaben, nur Vokabeln, nur Live, über Klassenstempel (`spelling-tolerance.ts`, `class-seal.ts`, Entscheidung 50); Freigabe-Bit im Einschreibe-QR lesbar (Bericht 12, 2)                                                                         | hilft P3 nur in Englisch live; das Merkmal ist das Einzige, das ein Kind als „LRS-Kind“ kennzeichnet     |
| Einstellungen           | Spiegelschrift ist bereits eine gerätelokale Einstellung des Kindes (`docs/device-support.md`); Schriftgröße, Mengen, Silbenhilfe gibt es nicht (Suche ohne Treffer)                                                                                                  | Vorbild für neutrale Hilfen ohne Merkmal                                                                 |

### 2.3 Wo die Oberfläche heute noch überfordert

| Hürde             | Befund                                                                                                                                               | Prüffall |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Lesemenge         | Jede Kachel, jedes Startblatt und jede Rückmeldung ist Text; keine Regel begrenzt die Länge [Beleg: Glossar regelt nur Wörter]                       | P1       |
| Wahlmöglichkeiten | Bis zur ersten Aufgabe vier bis fünf Entscheidungen beim Kind (Bericht 10, 4a; Bericht 25, 2.2)                                                      | P1, P4   |
| Tipplast          | Jede Antwort wird getippt; Auswahl- oder Legeformate fehlen außerhalb der Selbsteinschätzung                                                         | P1, P3   |
| Zeit              | Merkzeit der Textbox, verdeckte Aufgabe im Live-Mathe, Tempo-Punkte zuschaltbar                                                                      | P2, P3   |
| Fehleranzeige     | Ton neutral; aber große Nenner, Prozentwerte je Box, Sterne nach Fehlerquote im Laufdiktat (Bericht 24, 2.1)                                         | P1, P4   |
| Selbststeuerung   | Kind wählt Box, Stufe und Menge selbst; Vorauswahl ist die leichteste Stufe; Kinder überschätzen sich (Audit D, Selbstregulation)                    | P3, P4   |
| Inhaltlicher Ton  | Textbox mit Grundschul-Lebenswelt, Tiere und Sterne (Bericht 21, 2.2; Bericht 24, Nr. 10)                                                            | P1, P4   |
| Gerätewechsel     | Auf fremden Geräten ist alles Geübte am Ende weg; die Kinder, die am meisten Wiederholung brauchen, haben am seltensten ein festes Gerät [Vermutung] | alle     |

## 3. Fachstand und Vorbilder

### 3.1 Was gesichert ist

| Aussage                                                                                                                                                                                                                           | Kennzeichen und Quelle (Abruf 10.11.2026)                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bei Lernschwierigkeiten wirken direkte Anleitung und Strategieunterricht am stärksten, besonders kombiniert; ein Bündel aus Vorstrukturierung und ausdrücklicher Übung erklärt in einer Analyse rund 16 % der Effektunterschiede. | [Fachstand] Swanson 1999, Swanson und Hoskyn 2001, nur Suchauszüge (readingrockets.org/article/33084; journals.ku.edu/focusXchild/article/download/6785/6139); Zahlen ungeprüft     |
| Gute Übungsphasen zielen auf etwa 80 % Erfolg: hoch genug für Zuversicht, niedrig genug für Lernen.                                                                                                                               | [Fachstand] Rosenshine 2012, „Principles of Instruction“, über Sekundärquellen (reonline.org.uk/research/10-principles-of-instruction); Originalwortlaut ungeprüft                  |
| Vorlesen per Sprachausgabe verbessert das Leseverstehen von Kindern mit Leseschwierigkeiten mäßig (d = 0,35, 22 Studien).                                                                                                         | [Fachstand] Wood u. a. 2018, Journal of Learning Disabilities 51(1) (apps.asha.org/EvidenceMaps, Zusammenfassung)                                                                   |
| Lernsoftware allein wirkt bei schwachen Lesern schwach; eingebunden in Kleingruppenarbeit stärker.                                                                                                                                | [Fachstand] Cheung und Slavin 2013, zitiert in Bericht 21 (Q14)                                                                                                                     |
| Abruf aus dem Gedächtnis und verteiltes Wiederholen wirken auch bei Kindern; Kinder überschätzen ihre eigene Leistung.                                                                                                            | [Fachstand] im Audit belegt (`agent-d-paedagogik.md`, Abschnitt 7: Roediger und Karpicke; Destan und Roebers 2015)                                                                  |
| Rückmeldung über die eigene Verbesserung hilft schwachen Kindern; absolute Rangplätze schaden ihnen.                                                                                                                              | [Fachstand] Bericht 24, 3.1 (W4, W2, W5)                                                                                                                                            |
| Arbeitsgedächtnis ist bei LRS häufig eingeschränkt; hohe Gedächtnislast konkurriert mit der Rechtschreibentscheidung.                                                                                                             | [Fachstand] Audit D-005 (Steinbrink und Klatte 2008, Sweller; n. o. v.)                                                                                                             |
| Für barrierearme Oberflächen gibt es Muster für kognitive Barrieren: klarer Zweck je Seite, vertraute und gleichbleibende Gestaltung, Fehler vermeiden und leicht rückgängig machen.                                              | [Fachstand] W3C, „Making Content Usable for People with Cognitive and Learning Disabilities“, Working Group Note 2021 (w3.org/TR/coga-usable); ergänzend zu WCAG 2.2, nicht Pflicht |

### 3.2 Was umstritten oder gut gemeint ist

| Hilfe                                       | Lage                                                                                                                                   | Quelle                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Besondere Schriften für Legastheniker       | kein Vorteil; OpenDyslexic las sich in einer Studie langsamer, Dyslexie brachte keinen Gewinn                                          | [Fachstand] Wery und Diliberto 2017, Kuster u. a. 2018, über Sekundärquellen (nessy.com; lexercise.com); Originale ungeprüft |
| Größerer Buchstabenabstand                  | in einer Studie schneller und genauer, Nachweise schwer zu wiederholen                                                                 | [Fachstand] Zorzi u. a. 2012 (PNAS), über Sekundärquellen; ungeprüft                                                         |
| Farbige Silbenmarkierung                    | keine klaren Vorteile für Leseanfänger, Befunde uneinheitlich; Silbentraining selbst wirkt                                             | [Fachstand] Brügelmann 2025 (pedocs.de/volltexte/2025/33973); Müller, Karageorgos und Richter 2021 (Uni Würzburg, Preprint)  |
| Leichtere Texte statt Unterstützung         | Wechsel auf leichtere Texte half Jugendlichen beim Verstehen kaum, außer sehr schwachen Zweitsprachlernenden                           | [Fachstand] Lupo u. a. 2019, Reading Research Quarterly, nur über Kommentar (readingrockets.org, Shanahan)                   |
| Digitale Medien im Förderschwerpunkt Lernen | eigene Wirksamkeitsstudien habe ich nicht gefunden; Überblicke sagen, allgemeingültige Aussagen für Schülergruppen seien nicht möglich | [Fachstand] Jungjohann 2024 (eldorado.tu-dortmund.de); Bertelsmann Stiftung „lernen digital“ 2015                            |
| Zeitdruck und Angst                         | Zusammenhang belegt, Ursache nicht; Tempo erst bei sicherem, nicht-zählendem Rechnen                                                   | [Fachstand] Bericht 22, 3.2; Bericht 24, 3.1                                                                                 |

Folgerung [Empfehlung]: Lernraum soll belegte Hilfen bauen (Vorlesen, kleine
Schritte, hohe Erfolgsquote, Strategie-Rückmeldung) und gut gemeinte nicht
bewerben. „Größere Schrift“ ist ein Komfort für das Auge, keine Förderung.
Silbenfärbung baue ich nicht ein.

### 3.3 Sprache und Bilder

- Leichte Sprache folgt in Deutschland DIN SPEC 33429:2025-03 (kostenlos bei
  DIN Media), Einfache Sprache DIN 8581-1 [Fachstand, dinmedia.de, Suchauszug].
  Für Jugendliche in der Mittelschule empfehle ich **Einfache Sprache** mit
  kurzen Sätzen; Leichte Sprache mit Mediopunkt wirkt im Klassenzimmer
  vermutlich auffällig [Vermutung].
- Freie Symbole: OpenMoji (CC BY-SA 4.0, Bericht 12) und Mulberry Symbols
  (CC BY-SA 4.0 laut globalsymbols.com und opensymbols.org; Original-Lizenztext
  ungeprüft). ARASAAC scheidet wegen NC aus (RL-7). Beide CC-BY-SA-Sammlungen
  passen zur Inhaltslizenz CC BY-SA 4.0 (Nachtrag 2, Antwort 11).
- Vorbilder sind eher Verfahren als Apps: Lautlesetandem des ISB (Bericht 21),
  nicht-zählendes Rechnen nach PIKAS (Bericht 22), Levumi für
  Lernverlaufsmessung (Bericht 11). Eine App, die für Jugendliche mit
  Grundschulstand ohne Konto gut funktioniert, habe ich nicht gefunden.

### 3.4 Gegenlesen der Berichte 20 bis 25

| Bericht             | Trägt für die Prüffälle                                                                                                                                                        | Schließt aus                                                                                                                                                                                                                                              | Änderungsvorschlag                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20 Rechtschreibung  | Rückmeldung mit Strategie am Fehlerort (R20-5), Beweiswort vor Wort (R20-7), Schwelle mit Gelegenheiten, keine Ursache, „Schreib ins Heft“ (R20-14), 30 Kernwörter je Phänomen | Stufe A „zuletzt oder gar nicht“: P1 hat keinen Einstieg. Kontrastrunden mit einem Drittel Kontrast senken die Erfolgsquote am Anfang. Satzdiktat (R20-11) belastet Arbeitsgedächtnis und Tipplast. Stufe 4 ohne Längenstriche wird schwerer.             | Schmale Stufe „Grundlagen: lautgetreu und Silbe“ mit Jugendwortschatz (I31-6). Kontraste erst, wenn die Positivwörter zu etwa 80 % sitzen. Satzdiktat mit Sätzen bis sechs Wörter und satzweisem Wiederhören. Längenstriche als neutrale Hilfe „Aufgabe zeigen“ abschaltbar. |
| 21 Lesen            | Tandem und Chorlesen mit Gegenüber, satzweises Vorlesen (L21-4), Dreiklang hören – mitsprechen – lesen, kein Normwert                                                          | Stufe 1 mit 80 bis 250 Wörtern ist für P1 zu lang. Wort-Blitz „kurz zeigen“ ist Zeitdruck. Eine-Minute-Lesen und Wörter pro Minute vor dem Partner beschämen. „Steht nicht im Text“ ist für Förderschwerpunkt Lernen schwer. Countdown bei „Stimmt das?“. | Stufe 0 mit 40 bis 80 Wörtern und Sätzen bis acht Wörter. Blitzdauer wählbar, Standard „länger zeigen“. Minute-Lesen nur als eigener Vergleich und abschaltbar. Erst „stimmt / stimmt nicht“, die dritte Antwort später. Aufgaben vorlesbar (I31-1).                         |
| 22 Mathematik       | Aufgaben mit Kern statt Zufall (MA-1, MA-3), Darstellungen mit Abbau (MA-8), keine Uhr im freien Üben, Flüssigkeit nur lokal (MA-6), Bildangebot statt Schweigen (MD-5)        | Startpunkt „in der Mitte, bei Fehlern abwärts“ (MA-4) beginnt für P2 mit Misserfolg. Formate wie „Fehler finden (Mia rechnet …)“ und „Welche Aufgabe hilft dir?“ sind Lesetext. Live-Mathe verdeckt die Aufgabe.                                          | Startpunkt mit einer sicher lösbaren Aufgabe beginnen, dann springen (I31-8). Kurze Aufgabentexte vorlesbar, Bilder vor Text. Raumoption „Aufgabe bleibt sichtbar“ (I31-10).                                                                                                 |
| 23 Vokabeln und DaZ | „Kennenlernen“ vor dem Abruf (R23-10), Hörmodus, kleine Themen, Sprechen ohne Erkennung, Bild bei konkreten Nomen                                                              | Lückensatz und deutscher Beispielsatz verdoppeln die Lesemenge. Freies Schreiben englischer Wörter ist für P3 die schwerste Form.                                                                                                                         | Auswahl aus drei als erste Abrufform (zählt wie Aufdecken höchstens bis Box 3), Schreiben danach. Sätze bis acht Wörter. Bilder aus OpenMoji oder Mulberry (I31-13).                                                                                                         |
| 24 Motivation, Live | Eigenes Tempo nach dem Start, Klassentempo statt Einzeltempo, Battle nach Genauigkeit, Team mit Wertung je Kopf, verzeihendes Wochenziel, „Das kannst du jetzt“                | Richtig-Serie reißt ab und trifft P4. „Besser als letztes Mal“ fehlt an schlechten Tagen und wird bemerkt. „Gegen die Uhr“: zählende Kinder tragen wenig bei. In der Förderstunde mit vier Kindern verraten „häufigste Fehler“ an der Tafel das Kind.     | Zähler „Richtige heute“, der nie fällt, statt Serie. Vergleich mit sich selbst nur, wenn er positiv ist, sonst nichts. Zwei Niveaus im selben Raum (I31-10). Fehleranzeige an der Tafel erst ab sechs Teilnehmenden (I31-9).                                                 |
| 25 Lehrkraft-Alltag | Schnellstart ohne Wahlkette (L25-1), Drei-Tipp-Wahl (L25-3), Klassengerät (L25-8), „Meinen Stand zeigen“ (L25-7), keine Klassenübersicht mit Namen                             | Auftragsziel „3 Runden“ benachteiligt langsame Kinder. Der Schnellstart fragt zuerst nach dem Fach in Textform. Die Abschlussseite „9 von 12 sicher“ ist für P4 eine Note.                                                                                | Ziel wahlweise in Minuten („10 Minuten geübt“). Fächer als Bildkacheln mit Vorlesen. Abschluss nennt zuerst, was gelang („9 Wörter sicher“), ohne Nenner. Drei-Tipp-Wahl setzt auf Wunsch auch die Hilfen für diese Sitzung (I31-2).                                         |

Querschnitt: Alle sechs Berichte setzen zuverlässiges Lesen der Anweisung
voraus. Kein Bericht nennt das Vorlesen der Aufgabenstellung als Baustein,
obwohl es erlaubt und gebaut ist.

## 4. Zielbild

### 4.1 Kind

- **Ein Weg, wenige Wahlen.** Auf einem fremden Gerät tippt das Kind sein Tier,
  dann „20 Minuten üben“, dann eine von drei Bildkacheln. Jede Kachel hat einen
  Vorlese-Knopf in der Aufgabe, nicht auf dem Startblatt (Entscheidung 58).
- **Hilfen ohne Etikett.** Unter „Darstellung“ findet jedes Kind dieselben
  Schalter: „Vorlesen immer anbieten“, „Weniger auf einmal“, „Ohne Uhr“,
  „Aufgabe bleibt sichtbar“, „Größere Schrift“. Sie liegen nur auf dem Gerät
  wie heute die Spiegelschrift, gelten nicht für die Bewertung und verlassen
  das Gerät nie (RL-1, RL-2).
- **Erfolg zuerst.** Jede Runde beginnt mit etwas, das das Kind kann. Fehler
  kommen eingestreut, nicht als Block. Fällt die Trefferquote in der Sitzung
  unter etwa 70 %, bringt Lernraum mehr Bekanntes und keine neuen Aufgaben.
- **Fehler als Hinweis.** Nach einem Fehler sieht das Kind die richtige Form
  und die Strategie (Bericht 20, R20-5; Bericht 22, MA-8), dann einen zweiten
  Versuch. Kein Rot, kein Abzug, keine Zahl zum Rückstand.
- **Können statt Lücke.** Anzeigen zählen nach oben: „12 Wörter sicher“, nicht
  „12 / 105“. „Kommt morgen wieder“ statt „zurück in Box 1“.
- **Ernst genommen.** Grundlagen heißen „Grundlagen“ und „Aufbau“, nie
  „Klasse 2“. Wörter und Texte handeln von Bus, Handy, Geld, Fußball, Arbeit.
  Tiere sind wahlweise schlichte Symbole (Bericht 24, M24-12).

### 4.2 Lehrkraft und Förderlehrkraft

- Stellt am Kindgerät in drei Tipps Thema, Niveau und auf Wunsch Hilfen ein
  (Bericht 25, L25-3). Die Hilfen gelten für diese Sitzung und werden im
  Klassengerät-Modus mit gelöscht.
- Druckt für die Förderstunde Übungsbogen aus geprüften Kernwörtern („Schreib
  ins Heft“ mit Lösung zum Aufklappen) und Übungskarten-QR für mitgelieferte
  Übungen (L25-4).
- Sieht für das Fördergespräch, was das Kind selbst zeigt: das
  Kompetenzprofil („im Aufbau: d oder t am Ende“), später den freiwilligen
  Kurzbericht nach S1 (R12-7). Kein Verlauf, keine Ursache, kein Etikett.
- Findet im Lehrerbereich eine Seite „Was Lernraum bei Förderung kann und
  nicht kann“ mit Verweis auf Levumi und auf die Sonderpädagogik vor Ort.

### 4.3 Grenze zur Förderdiagnostik

| Erlaubt                                                                  | Nicht erlaubt                                                                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Phänomen nennen, wenn die Schwelle aus Bericht 20, 3.3 erreicht ist      | Prozentrang, Jahrgangsniveau, „Lesealter“, Normvergleich (RL-13)                                          |
| Übung vorschlagen, Belegwörter dem Kind zeigen                           | „Verdacht auf LRS“, „Rechenschwäche“, Ursachen (Bericht 20, 3.3)                                          |
| Momentaufnahme, die das Kind der Lehrkraft zeigt                         | Zeitreihe je Kind auf dem Lehrergerät, Förderplanfelder, Diagnosefelder (Bericht 12, 5.1; RL-2 sinngemäß) |
| Verweis auf Levumi, Schulpsychologie, Mobilen Sonderpädagogischen Dienst | eigene Tests mit diagnostischem Anspruch (Audit F.4, I.6)                                                 |

Förderdiagnostik und Förderplan bleiben Aufgabe der Sonderpädagogik und der
Schule [Fachstand, n. o. v.]. Angaben zu Förderbedarf gehören nicht in
Lernraum, auch nicht lokal beim Kind (RL-1, RL-2; Antwort Frage 4).

### 4.4 Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“

**Leon (P1), Nachsitzen, Lehrertablet im Tafelmodus, kein Lernstand:**

| Zeit        | Leon tut                                       | Das Gerät zeigt                                                                                                           |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0:00        | tippt Tier, „20 Minuten üben“, Kachel „Wörter“ | drei Bildkacheln, kein Fließtext                                                                                          |
| 0:30        | Startpunkt, erstes Wort „Handy“                | Wort wird vorgelesen; die erste Stufe ist lautgetreu und sicher lösbar                                                    |
| 2:00        | scheitert zweimal bei „ie“                     | „Gut. Wir üben jetzt Wörter mit Silben.“ Öffnet „Grundlagen: lautgetreu und Silbe“, Runde mit fünf Wörtern                |
| 2:00–12:00  | hört, schwingt die Silben, schreibt            | Vorlesen jeder Aufgabe, Fehler mit richtiger Form und zweitem Versuch, Fehlerwörter eingestreut                           |
| 12:00–18:00 | Wort-Blitz mit langer Anzeige                  | Wörter der Runde, Auswahl aus drei                                                                                        |
| 20:00       | zeigt der Lehrkraft den Abschluss              | „Heute sicher: 9 Wörter. Silben schwingen hilft dir.“ Startkarte zum Mitnehmen; danach wird alles gelöscht (Klassengerät) |

Trägt, wenn I31-1, I31-6, I31-8 und L25-1 gebaut sind. Ohne lokale deutsche
Stimme entfällt das Vorlesen; dann braucht P1 eine Erwachsene für den Einstieg
(Entscheidung 58, „Bekannte Grenzen“).

**Tim (P4), eigenes Gerät mit Lernstand:** „Weiterlernen“ öffnet die Portion
mit „Weniger auf einmal“ (zehn statt 20 Aufgaben, fünf je Runde). Die ersten
zwei Aufgaben sind sicher, Fehler kommen eingestreut. Nach zehn Minuten fragt
das Gerät „Noch eine Runde?“ statt eine Uhr zu zeigen. Trägt mit I31-2 und
I31-3.

**Sara (P2) und Elif (P3)** tragen mit den Fachbausteinen, wenn Startpunkt,
Anschauung und Wiedererkennen vor dem Schreiben kommen (Tabelle 3.4).

## 5. Konkrete Bausteine

Aufwand für eine Person mit KI-Unterstützung: S bis etwa eine Woche, M zwei
bis vier Wochen, L länger. Prüfaufwand der Lehrkraft für Inhalte: kein, S, M,
L. Fast alle Bausteine lassen sich im Unterricht sofort erproben (Antwort
Frage 6).

| Nr.    | Baustein                                                                                                                                                                                                                               | Nutzen und Szenario                                                                        | Entw. | Prüfung           | Abhängigkeiten              | Berührte Entscheidungen                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- | ----------------- | --------------------------- | -------------------------------------------------------- |
| I31-1  | **Vorlesen in jeder Aufgabe:** `ReadAloudButton` an Aufgabenstellung, Rückmeldung und Lösung in Wortspeicher, Kopfrechnen, Textbox, Startpunkt; nur `localOnly`                                                                        | P1 arbeitet ohne Erwachsene; belegt (Wood u. a. 2018)                                      | S     | kein              | R12-10 (lokale Stimmen)     | 58 (ausdrücklich erlaubt)                                |
| I31-2  | **Neutrale Hilfen unter „Darstellung“:** Vorlesen anbieten, Weniger auf einmal (Runde 5, Portion 10), Ohne Uhr, Aufgabe bleibt sichtbar, Größere Schrift; gerätelokal wie die Spiegelschrift; auch per Drei-Tipp-Wahl für eine Sitzung | P1, P3, P4 ohne Merkmal; keine Toleranz, also kein Konflikt mit Rechtschreiblernen         | S–M   | kein              | L25-3 für die Lehrkraftwahl | 50 (unberührt), 57 (Portionsgröße), RL-2: **Vorlage O1** |
| I31-3  | **Erfolgsquote steuern:** Portion und Training streuen Fehler zwischen Bekanntes; bei unter etwa 70 % richtig in der Sitzung keine neuen Aufgaben und mehr Wiederholung; nur im Speicher der Sitzung                                   | Hohe Erfolgsquote ohne gespeichertes Merkmal; P4 bricht nicht ab                           | M     | kein              | –                           | 57 („zuerst Fehler“): **Vorlage O2**                     |
| I31-4  | **Anzeigen, die nach oben zählen:** „12 Wörter sicher“ statt „12 / 105“ und „% der Box“; „kommt morgen wieder“ statt Boxwechsel; Laufdiktat-Ende „14 richtig“ wahlweise statt Sternen                                                  | Kein Dauer-Misserfolg auf der Startseite                                                   | S     | kein              | –                           | 56 (Bestwert), W-12 (Vorbild ohne Prozent)               |
| I31-5  | **Einzelzeiger-Alternative zur Zwei-Finger-Geste:** Knopf „Aufdecken“ mit gezählter Ansichtszeit, auch per Taste                                                                                                                       | Kinder mit motorischen Einschränkungen spielen mit (Audit E-007, WCAG 2.5.1)               | S–M   | kein              | –                           | –                                                        |
| I31-6  | **Wortbox „Grundlagen: lautgetreu und Silbe“:** 30 bis 60 lautgetreue Wörter aus der Lebenswelt Jugendlicher, zwei- und dreisilbig, mit Silbengrenze; unterste Stufe des Startpunkts                                                   | P1 hat einen Einstieg ohne Anlautbilder                                                    | S     | S (etwa 1 h)      | R20-2 (Kernwort-Modell)     | 30 (Nachtrag 2, Kernbestand erlaubt): **Vorlage O4**     |
| I31-7  | **Jugendgerechte Grundlagen:** Stufen „Grundlagen / Aufbau“, nie Jahrgangsangaben für das Kind; Themenliste für Wörter und Texte ohne Kinderwelt; Textbox-Texte der Grundschule nur als „Grundlagen“ (E21-6)                           | P1 und P4 nehmen die Übung ernst (Audit E-004, Bericht 11, W-2)                            | S     | S                 | R20-3, L21-6                | –                                                        |
| I31-8  | **Startpunkt mit Erfolg zuerst:** erste Aufgabe je Fach sicher lösbar; Abbruch nach zwei Fehlern bleibt; Ergebnis nennt zuerst, was gelang; Vorschlag wird eingestellt (L25-2)                                                         | P2 und P4 erleben den Einstieg nicht als Test                                              | S     | S                 | R20-9, MA-4                 | 59; Welle 3, D2                                          |
| I31-9  | **Kleingruppen-Schutz an der Tafel:** „häufigste Fehler“ und Fehlerzahlen erst ab sechs Teilnehmenden; die Ansicht „Braucht Hilfe“ nie in der Projektion                                                                               | Förderstunde mit vier Kindern ohne Bloßstellung                                            | S     | kein              | –                           | Welle 3, D5-5: **Vorlage O5**                            |
| I31-10 | **Live für alle:** Raumoption „Aufgabe bleibt sichtbar“; zwei Niveaus im selben Raum (Kind wählt leicht oder normal, jede richtige Antwort zählt gleich); Zähler „Richtige heute“ statt Serie                                          | P2 trägt zu „Gegen die Uhr“ und Team bei (Bericht 24)                                      | M     | S                 | M24-1 bis M24-3, M24-7      | 38, 47; Bericht 24, E-1                                  |
| I31-11 | **Druckbogen für die Förderstunde:** aus Kernwörtern und Startkarte ein Blatt „Schreib ins Heft“ mit verdeckter Lösung und Strategie                                                                                                   | Förderlehrkraft hat Material ohne Gerät für jedes Kind                                     | S     | kein (geprüft)    | R20-3, R20-14               | –                                                        |
| I31-12 | **Lesemengen-Regel als Test:** in Schüleransichten Hinweise höchstens ein Satz, Aufgabenanweisung höchstens zwölf Wörter, höchstens vier Wahlen je Bildschirm vor der ersten Aufgabe; Prüfung wie beim Kinder-Glossar                  | Schützt vor schleichender Textzunahme durch neue Bausteine (Abschlussbericht H.4, Warnung) | S     | kein              | `child-glossary.test.ts`    | –                                                        |
| I31-13 | **Bilder für konkrete Nomen** aus OpenMoji oder Mulberry (CC BY-SA 4.0), nur wo eindeutig; Quelle je Datei                                                                                                                             | Englisch-Grundlagen und später DaZ; Wiedererkennen ohne Lesen                              | M     | M (Eindeutigkeit) | R12-12, R23-1               | RL-7                                                     |
| I31-14 | **Beobachtung mit Prüffällen:** Bogen aus L25-15 um vier Fragen ergänzen: Bricht das Kind ab? Fragt es nach Hilfe? Wirkt es beschämt? Wie viel war richtig (geschätzt)?                                                                | Prüft, ob die Hilfen wirken, ohne Daten aus der App                                        | S     | kein              | L25-15                      | 9, 39                                                    |
| I31-15 | **Seite „Förderung mit Lernraum“** im Lehrerbereich: was Lernraum kann, was nicht, für wen es nicht gedacht ist; Verweise auf Levumi und die Sonderpädagogik                                                                           | Ehrliche Erwartung bei Kolleginnen und Schulleitung                                        | S     | S                 | MA-15, L21-13               | RL-13                                                    |

Reihenfolge [Empfehlung]: I31-1, I31-4, I31-9 und I31-14 sofort (alles S, kein
Prüfaufwand). Dann I31-2, I31-8 und I31-5. I31-6 und I31-7 mit den ersten
Rechtschreibinhalten (Bericht 20), I31-3 nach der Verlinkung des Trainings.
I31-10 mit den Live-Formaten aus Bericht 24, I31-13 mit Bericht 23. I31-12 vor
jedem neuen Schülerbereich.

## 6. Grenzen und was wir nicht bauen

### 6.1 Nicht bauen

| Nicht bauen                                                                 | Grund                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Merkmal „LRS“, „Förderbedarf“ oder „Nachteilsausgleich“ in neuen Funktionen | RL-1, RL-2; Antwort Frage 4; Hilfen brauchen kein Merkmal                                               |
| Ausbau der Toleranz auf Deutsch-Module                                      | Zielkonflikt mit dem Rechtschreiblernen (Nachtrag 1); Audit E-006 teilt die Einschätzung                |
| Silbenfärbung, Legastheniker-Schriften                                      | Wirkung unbelegt oder widerlegt (3.2); Silbendaten fehlen (Bericht 21, 6)                               |
| Anlautlehrgang mit Anlauttabelle, Bildern und Nachspuren                    | nicht die Zielgruppe, braucht Ton, Bild und Handschrift; für eine Person nicht pflegbar (Bericht 20, 6) |
| Förderplan, Förderziele, Beobachtungsprotokoll je Kind                      | wird ein Förderdatum auf dem Lehrergerät; Datenballast (Bericht 25, 4.7); Aufgabe der Schule            |
| Automatische Einstufung „schwach“ und dauerhafte Anpassung danach           | wäre ein abgeleitetes Merkmal; I31-3 wirkt nur in der Sitzung                                           |
| Belohnung für Durchhalten, die bei Lücken verfällt                          | Entscheidung 39; trifft P4 zuerst                                                                       |

### 6.2 Wen Lernraum auch in der fertigen Fassung nicht bedient

| Gruppe                                                         | Grund                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Förderschwerpunkt geistige Entwicklung                         | braucht elementare Formate, Bild, Handlung, Begleitung; Abschlussbericht G, Kernaussage 3              |
| Nicht oder anders alphabetisierte Kinder, Erstleseunterricht   | Lernraum alphabetisiert nicht (Bericht 23, 4.4); Stufe A nur schmal für Ältere                         |
| Kinder mit Unterstützter Kommunikation                         | Symbolkommunikation und Sprachausgabegeräte sind eigene Systeme                                        |
| Blinde Kinder und Kinder, die nur mit Bildschirmleser arbeiten | Grundlagen sind prüfbar (axe ohne Verstoß, Abschlussbericht H.1), Übungen sind aber visuell; ungeprüft |
| Kinder in akuter emotionaler Krise                             | brauchen Beziehung, nicht ein Gerät; Lernraum darf nicht als Beschäftigung im Nachsitzen gelten        |
| Kinder, die LRS- oder Dyskalkulie-Therapie brauchen            | Lernraum ist Übung, keine Therapie und keine Diagnostik                                                |

Die Vision soll „für Kinder mit Lücken in den Grundlagen, auch mit
Förderschwerpunkt Lernen“ sagen, nicht „für alle Kinder“.

## 7. Offene Entscheidungen für den Entwickler

| Nr. | Frage                                                                                                                                                                                                  | Empfehlung                                                                                                                                                                                                                                | Ohne Entscheidung                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| O1  | Sollen neutrale Hilfen (Vorlesen anbieten, weniger auf einmal, ohne Uhr, Aufgabe bleibt sichtbar, größere Schrift) als Geräteeinstellung jedes Kindes kommen, getrennt von der Schreiberleichterung?   | Ja. Sie ändern Menge und Darstellung, nicht die Bewertung, und betreffen deshalb Nachtrag 1 nicht. Einstellbar vom Kind und per Drei-Tipp-Wahl für eine Sitzung. Als neuer Eintrag im Entscheidungsprotokoll; berührt 57 (Portionsgröße). | Es bleibt bei einer Hilfe, die nur in Englisch live wirkt und ein Merkmal braucht. |
| O2  | Darf die Portion Fehler zwischen bekannte Aufgaben streuen und bei niedriger Trefferquote in der Sitzung keine neuen Aufgaben bringen? Das ändert die Reihenfolge „zuerst Fehler“ aus Entscheidung 57. | Ja, mit Zielwert etwa 80 % richtig, nur in der Sitzung berechnet, nie gespeichert. Startwert in der Erprobung prüfen (I31-14).                                                                                                            | Kinder mit vielen Fehlern beginnen jeden Tag mit bis zu sechs Fehleraufgaben.      |
| O3  | Was geschieht mit der Schreiberleichterung (Entscheidung 50), wenn der Einsatzrahmen (S1) geklärt wird?                                                                                                | Bis dahin unverändert lassen, nicht ausbauen. Bei S1 wählen: (a) Freigabe im QR verschlüsseln (R12-9, M) oder (b) auslaufen lassen und durch O1 ersetzen; (b) braucht einen Eintrag „Zurückgenommen“ und „Nicht wieder einbauen“.         | Das lesbare Freigabe-Bit bleibt im Einschreibe-QR (Bericht 12, 2).                 |
| O4  | Darf eine schmale unterste Stufe „lautgetreu und Silbe“ für Ältere kommen, obwohl Bericht 20 Stufe A „zuletzt oder gar nicht“ empfiehlt?                                                               | Ja, als eine Wortbox ohne Anlautbilder und Handschrift, mit Jugendwortschatz, etwa eine Stunde Prüfzeit. Kein Lehrgang.                                                                                                                   | Für P1 beginnt Lernraum bei „ie“ und damit mit Misserfolg.                         |
| O5  | Sollen Fehlerzahlen und „häufigste Fehler“ an der Tafel erst ab sechs Teilnehmenden erscheinen?                                                                                                        | Ja. In Förderstunden sind Tiere bei vier Kindern kein Schutz (Bericht 24, 2.1, Risiko „Tiere statt Namen“).                                                                                                                               | Die Projektion kann in kleinen Gruppen ein einzelnes Kind bloßstellen.             |
| O6  | Bleibt „Fehler setzt auf Box 1“ für Lernwörter und LernBox?                                                                                                                                            | Ja, die Regeltabelle ist begründet und getestet. Geändert wird nur die Anzeige für das Kind (I31-4). Eine mildere Rückstufung erst prüfen, wenn die Beobachtung Frust daran festmacht.                                                    | Kinder sehen weiter Boxwechsel als Verlust.                                        |
| O7  | Soll die Vision ausdrücklich sagen, welche Gruppen Lernraum nicht bedient (6.2), auch gegenüber Schulleitungen im Bezirk?                                                                              | Ja, auf der Seite I31-15 und im Schulpaket (R12-2).                                                                                                                                                                                       | Kolleginnen erwarten Inklusion für alle und sind enttäuscht.                       |

### Annahmen dieses Berichts

- Zielgruppe bayerische Mittelschule mit Grundschul-Grundlagen (Frage 1);
  Kinder mit Förderschwerpunkt Lernen sitzen inklusiv in diesen Klassen oder in
  Förderstunden [Vermutung].
- Eigene und geteilte Geräte (Frage 2); Stifte nicht überall.
- Ohne Namen und ohne Förderangaben, bis S1 geklärt ist (Frage 4).
- Prüfzeit höchstens etwa zwei Stunden pro Woche (Frage 6); fast alle meine
  Bausteine brauchen keine Prüfzeit.

### Nicht geprüft

- Verhalten im Browser, auch die tatsächliche Textmenge der Ansichten; alle
  Aussagen stammen aus Code und Dokumenten.
- Ob Schul-iPads eine lokale deutsche Stimme haben (Bericht 10, 7.4); davon
  hängt I31-1 ab.
- Alle Studien nur über Suchauszüge oder Sekundärquellen; Lizenztext von
  Mulberry Symbols am Original; bayerische Regeln zu Förderdiagnostik und
  Mobilem Sonderpädagogischem Dienst.
- Audit-Bericht C nur über den Abschlussbericht H; Wirkung der Hilfen auf
  Kinder ohne Erprobung.

## Quellen

Alle abgerufen am 10.11.2026 über die Websuche, nur Suchauszüge.

- Swanson, Metaanalysen zu Lernschwierigkeiten: readingrockets.org/article/33084;
  journals.ku.edu/focusXchild/article/download/6785/6139
- Rosenshine, Principles of Instruction (Sekundärquelle):
  reonline.org.uk/research/10-principles-of-instruction
- Wood, Moxley, Tighe und Wagner 2018, Text-to-Speech:
  apps.asha.org/EvidenceMaps/Articles/ArticleSummary/8f7b9dd3-41fb-48c6-86a5-3e25ad47bc7b
- Schriften und Buchstabenabstand (Sekundärquellen):
  nessy.com/dyslexia-explained/understanding-dyslexia/dyslexia-fonts-do-they-work;
  lexercise.com/blog/dyslexia-fonts
- Brügelmann 2025, farbige Silbengliederung:
  pedocs.de/volltexte/2025/33973/pdf/Bruegelmann_2025_Farbige_Silbengliederung.pdf
- Müller, Karageorgos und Richter 2021, Silbentraining:
  psychologie.uni-wuerzburg.de (Preprint)
- Lupo u. a. 2019 (Kommentar):
  readingrockets.org/blogs/shanahan-on-literacy/cool-new-study-text-difficulty-and-adolescent-literacy
- Jungjohann 2024, Digitale Bildung in Inklusion und Sonderpädagogik:
  eldorado.tu-dortmund.de/bitstream/2003/42453
- W3C, Making Content Usable for People with Cognitive and Learning
  Disabilities: w3.org/TR/coga-usable
- DIN SPEC 33429:2025-03, Leichte Sprache: dinmedia.de/de/technische-regel/din-spec-33429/387728031
- Mulberry Symbols, Lizenz: globalsymbols.com/symbolsets/mulberry;
  opensymbols.org/repositories/mulberry (Lizenz CC BY-SA 4.0 laut diesen
  Seiten, Original ungeprüft)
