# Vision Lernraum – Rolle 20: Schriftspracherwerb, Rechtschreibung und Handschrift

Stand: 10.11.2026. Grundlage: Code der Version 0.9.7, Berichte 10, 11 und 12,
Antworten des Entwicklers vom 09. und 10.11.2026 (`01-planung.md`, Abschnitt 4
mit Nachtrag). Es gilt: Zielgruppe bayerische Mittelschule mit Grundlagen aus
der Grundschule; eigene und geteilte Geräte; Rechtschreibung mit Förderung aus
Fehlern hat Vorrang; Schreiberleichterung ist keine Priorität.

Kennzeichnung: [Beleg] = im Repository nachgeprüft; [Fachstand] = Forschung
oder anerkannte Praxis mit Quelle; [Vermutung] = plausibel, nicht belegt;
[Empfehlung] = mein Vorschlag. „n. o. v.“ = aus Fachkenntnis, nicht online
geprüft.

**Grenze der Recherche.** WebFetch erreichte `orthografietrainer.net`,
`lehrplanplus.bayern.de` und `link.springer.com` nicht. Alle Webangaben stammen
aus Suchauszügen vom 10.11.2026; kein Original wurde vollständig gelesen.

## 1. Kurzfazit

1. Professionell wird der Deutschbereich nicht durch mehr Wörter, sondern durch
   **weniger, aber ausgezeichnete Wörter**: Jedes Kernwort kennt seine
   schwierige Stelle, die passende Strategie, ein Beweiswort und ein
   Kontrastwort.
2. Heute ist ein Wort eine nackte Zeichenkette. Daraus kann weder eine gezielte
   Übung noch eine Fehlerdeutung entstehen (`german-learning-content.ts`).
3. Sieben von acht Wortboxen enthalten nur Positivbeispiele. Wer die Box kennt,
   kennt die Antwort. Die Entscheidung, die beim freien Schreiben verlangt
   wird, übt das Kind nie.
4. Eine getippte Falschschreibung lässt sich ohne KI recht sicher einem
   Phänomen zuordnen, wenn das Zielwort ausgezeichnet ist. Die **Ursache**
   lässt sich nie ableiten.
5. Eine Aussage über ein Kind braucht Fehler **und** Gelegenheiten. Ich
   empfehle eine feste Schwelle und den Wortlaut „Hier lohnt sich Üben“.
   Lernraum diagnostiziert nicht.
6. Ein erster Bestand von 300 Kernwörtern in zehn Phänomenen kostet die
   Lehrkraft etwa fünf Stunden Prüfzeit [Vermutung]. Das ist wertvoller als
   die Prüfung aller 50 Textbox-Texte.
7. Für die Mittelschule fehlen Großschreibung, das/dass, Getrennt- und
   Zusammenschreibung und Komma ganz. Sie brauchen Satzformate.
8. Handschrift: Schreiben ins Heft mit Selbstkontrolle am Gerät ist sofort
   machbar und sinnvoll. Nachspuren und Handschrifterkennung empfehle ich
   nicht.
9. Mehrere Fachfehler aus dem Audit stehen noch im Code, und ich habe weitere
   gefunden (Abschnitt 2.2).

## 2. Ist-Stand in Lernraum

### 2.1 Was es gibt

| Baustein         | Stand [Beleg]                                                                                                                                       | Beleg                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Wortboxen        | 8 Boxen, 885 Wörter, je Box ein Titel, ein Regeltext, **eine** Strategie für alle Wörter                                                            | `german-learning-content.ts`, `LEARNING_WORD_COLLECTIONS`      |
| Sechs Merkstufen | Abschreiben, wenige Lücken, viele Lücken, ansehen und verdecken, Wörter merken, hören und schreiben                                                 | `docs/inhalte/wortspeicher.md`                                 |
| Rückmeldung      | Buchstabenvergleich mit Position („3. Buchstabe: m statt n“); Text „Fast richtig: ein Buchstabe ist anders.“; kein Bezug zu Phänomen oder Strategie | `letter-diff.ts`; `app/views/wortspeicher/feedback-panel.tsx`  |
| Homophone        | 20 Gruppen mit Bedeutungshilfe, nur in Stufe 6                                                                                                      | `homophones.ts`                                                |
| Startpunkt       | 6 Stufen, je 2 feste Wörter, Abbruch nach 2 Fehlern einer Stufe; Ergebnis ist Wortbox und Merkstufe                                                 | `start-point.ts`, `SPELLING_LEVELS`                            |
| Textbox          | 50 Texte, vier Durchgänge mit wachsender Ausblendung; alle Texte ungeprüfte Entwürfe                                                                | `textbox-library.ts`; `docs/inhalte/textbox.md`, „Stand“       |
| Wiederholung     | Freies Üben ändert die Box nie; fällige Wiederholung nur auf Stufe 4 bis 6; Abschreiben hebt die Merkstufe nicht                                    | `umsetzungsplan-audit-welle-1.md`, W-1 bis W-8                 |
| Toleranz         | Ein Buchstabe Abweichung gilt als richtig, nur mit Schreiberleichterung, nur Live-Raum, nur Vokabeln                                                | `spelling-tolerance.ts`; Entscheidung 50                       |
| Fehlerübernahme  | Falsch geschriebene Wörter aus dem Text-Laufdiktat wandern in die Wortbox „Aus dem Unterricht“                                                      | `docs/inhalte/wortspeicher.md`, „Übernahme aus dem Laufdiktat“ |

**Boxen und Stufen im Verhältnis.** Die Boxen sagen, _was_ geübt wird
(Phänomen). Die Stufen sagen, _mit wie viel Hilfe_ (vom Abschreiben zum
Abruf). Das entspricht dem gut belegten Verfahren „Abdecken, Schreiben,
Vergleichen“ (Audit F.3). Es fehlen zwei Achsen: die **Entscheidung** zwischen
zwei möglichen Schreibungen und der **Transfer** in den Satz. In den Stufen 1
bis 5 sieht das Kind das Wortbild vorher. Sie üben das Einprägen, nicht das
Anwenden einer Strategie.

### 2.2 Was fachlich falsch oder schief ist

| Nr. | Befund                                                                                                                                                                                                                                                           | Beleg                                                           | Stand                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| F1  | „Ferien“ steht in „Langes i“. Es wird Fe-ri-en gesprochen und hat kein langes i. Das Wort steht zusätzlich in den Merkwörtern.                                                                                                                                   | `german-learning-content.ts`, Zeilen 83 und 123                 | Audit D-006 Nr. 5, **nicht behoben**          |
| F2  | „Langes i“ trägt die Strategie „Merken“ („als feste Wortbilder sichern“). ie ist aber der Regelfall für langes i in heimischen Wörtern. Merkwörter sind die Ausnahmen (Tiger, Kino, wir).                                                                        | `LEARNING_WORD_COLLECTIONS`, `long-i`                           | D-006 Nr. 5, nicht behoben                    |
| F3  | „Silbieren“ gilt für die ganze Box, auch für Einsilber (Schiff, Mann, Glück, Platz). Dort muss das Kind erst verlängern (Schif-fe), dann silbieren.                                                                                                              | Listen `doubleConsonants`, `ckAndTz`                            | D-006 Nr. 6, nicht behoben                    |
| F4  | „Club“ und „Job“ stehen in der Verlängern-Box; „Clubs“ und „Jobs“ machen das b nicht hörbar. „Zugweg“, „Zieltür“ und „Fehlwort“ sind keine gebräuchlichen Wörter; „Magd“, „Trug“, „Tugend“ sind veraltet.                                                        | Zeilen 52, 55, 80; Liste `silentH`                              | teils D-006 Nr. 2; teils **neu**              |
| F5  | „ä/e und äu/eu“ enthält Wörter ohne ableitbare Verwandte mit a: Mädchen, Märchen, Käfer, Käfig, Säge, spät, zäh, gähnen. Das sind Merkwörter. Der Startpunkt prüft die Stufe „Ableiten“ ausgerechnet mit „Mädchen“.                                              | Liste `umlautDerivation`; `SPELLING_LEVELS`                     | **neu**                                       |
| F6  | Der Regeltext s/ss/ß verlangt zu hören, ob das s „summt“. In süddeutscher Aussprache gibt es kein stimmhaftes s [Fachstand, Suchauszug aus Lehrmaterial, Fundstelle nicht zugeordnet]. Für bayerische Kinder ist die Probe unbrauchbar.                          | `s-ss-sz`, Feld `detail`                                        | **neu**                                       |
| F7  | „Weg“ und „weg“ gelten als gleich klingend. „Weg“ hat ein langes, „weg“ ein kurzes e [Fachstand, n. o. v.].                                                                                                                                                      | `homophones.ts`, `RAW_GROUPS`                                   | **neu**                                       |
| F8  | Sieben Boxen enthalten nur Positivbeispiele (nur ie, nur h, nur ä, nur d/g/b). Nur s/ss/ß hat einen Kontrast. Der Titel „ä/e und äu/eu“ verspricht einen Kontrast, den die Liste nicht enthält.                                                                  | alle Listen                                                     | D-007, offen (Bericht 10, M7)                 |
| F9  | Stufe 4 zeigt einen Strich je Buchstabe und schneidet längere Eingaben ab. Bei Doppelkonsonant, ie, h und ß verrät die Länge die Antwort. Die Lücken der Stufen 2 und 3 sitzen mechanisch (jeder dritte oder vierte Buchstabe), nicht an der schwierigen Stelle. | `cover-answer.tsx`, Zeile 47; `learning-word.ts`, Zeile 125 ff. | D-002, nicht behoben                          |
| F10 | Der Startpunkt stützt jede Stufe auf zwei Wörter. Stufe 1 heißt im Kommentar „lautnahes Schreiben“, prüft aber ie-Wörter. Es gibt keine Stufe oberhalb der Grundschule.                                                                                          | `start-point.ts`, Kopfkommentar und `SPELLING_LEVELS`           | Bericht 10 nennt die Obergrenze               |
| F11 | Textbox: TXT-002 führt „nah“ als Dehnungs-h (das h gehört zu „na-he“). TXT-016 („Vokallänge“) führt „steht, früh, gehe, zieht“. Themen und Ton („Mama kocht Tee“, „Bello“) sind Grundschule, nicht Mittelschule.                                                 | `textbox-library.ts`, TXT-002, TXT-016, TXT-001                 | **neu**, zusätzlich zu TXT-011, 024, 034, 046 |
| F12 | Die Wortauswahl einer Runde ist reiner Zufall ohne Lernstand.                                                                                                                                                                                                    | `word-round.ts`, `sampleRoundWords`                             | D-007 Nr. 3, nicht behoben                    |

**Korrektur zu Bericht 10.** Abschnitt 2.2 nennt für die Wortboxen
„Audit-Fehler behoben (0.9.3)“. Behoben sind der s/ss/ß-Regeltext, die
-ng-Wörter, das silbentrennende h und die Bedeutungshilfen
(`docs/version-0.9.3.md`). Offen sind F1 bis F3 und Teile von F4.

**Was ganz fehlt** [Beleg, Suche ohne Treffer]: Wortart je Wort,
Niveaustufen, Kontrastwörter, Beispielsätze, Zuordnung von Fehlern zu
Phänomenen, alle Inhalte der Sekundarstufe (Großschreibung im Satz,
Getrennt- und Zusammenschreibung, Komma). „das/dass“ gibt es nur als
Bedeutungshilfe.

## 3. Fachstand und Vorbilder

### 3.1 Systematik und Vorgaben

- Die deutsche Schreibung folgt vier Prinzipien: Laut-Buchstaben-Zuordnung,
  Silbe (Doppelkonsonant, ie, Dehnung), Wortstamm (Hund wegen Hunde, Bäume
  wegen Baum) und Satz (Großschreibung, Komma) [Fachstand, n. o. v.].
- Die KMK-Bildungsstandards für den Primarbereich nennen die Strategien
  „Mitsprechen, Ableiten, Einprägen“ [Fachstand; zitiert in der
  VERA-3-Handreichung des IQB 2022, schulentwicklung.nrw.de, Abruf
  10.11.2026; Wortlaut der Fassung von 2022 ungeprüft].
- Bayern: Der LehrplanPLUS Grundschule enthält einen verbindlichen
  Grundwortschatz von 623 Wörtern bis Jahrgangsstufe 4, in zwei Listen (1/2
  und 3/4) [Fachstand; Antworten der Staatsregierung, bayern.landtag.de,
  Suchauszug 10.11.2026]. Lizenz ungeprüft (Bericht 12, E-5).
- LehrplanPLUS Mittelschule, Lernbereich „Richtig schreiben“: Texte mit
  Rechtschreibstrategien prüfen, Wörterbuch nutzen [Fachstand, nur
  Suchauszug; Jahrgangsstufe und Wortlaut **ungeprüft**]. Ob es für die
  Mittelschule einen Grundwortschatz gibt, ist ungeprüft.
- FRESCH arbeitet mit Schwingen, Verlängern, Ableiten und Merken
  [Fachstand, n. o. v.]. Umstritten ist, ob Kinder die Vokallänge verlässlich
  hören; silbenanalytische Ansätze gehen deshalb über die Silbe statt über
  das Hören [Fachstand, n. o. v.]. Für Dialektsprecher wiegt der Einwand
  schwerer (F6).

### 3.2 Wie Fachverfahren Fehler deuten

| Verfahren                                    | Vorgehen [Fachstand]                                                                                                                                         | Lehre für Lernraum                                                                                                                                      | Quelle (Abruf 10.11.2026)                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Hamburger Schreib-Probe (HSP)                | Feste Wörter und Sätze; ausgewertet werden festgelegte „Lupenstellen“ je Strategie (alphabetisch, orthografisch, morphematisch, wortübergreifend). Normiert. | Fehler immer auf **vorab festgelegte Stellen** beziehen. Kritik: Fehldiagnosen bei Drittklässlern.                                                      | friedrich-verlag.de (HSP 1–10)                      |
| AFRA                                         | Ähnlich, das ganze Wort wird in Lupenstellen zerlegt.                                                                                                        | Fehler je **Gelegenheit** zählen, nicht absolut.                                                                                                        | Suchauszug, uni-due.de                              |
| Oldenburger Fehleranalyse (OLFA 3–9)         | Freie Texte; 35 Kategorien; verlangt etwa 350 Wörter und rund 50 Fehler; Markieren dauert über 30 Minuten.                                                   | Ein belastbares Profil braucht **Dutzende** Fehler. Einzelne Fehler tragen keine Aussage.                                                               | opendata.uni-halle.de (Reichardt 2022); hogrefe.com |
| Münsteraner Rechtschreibanalyse (Lernserver) | Handschriftliches Lückendiktat; Abgleich der Schreibungen mit einer Datenbank; Kategorien wie Konsonantenverdopplung, Groß-/Kleinschreibung; Förderplan.     | Der Abgleich „Falschschreibung zu Kategorie“ ist ein **Nachschlagen**, keine KI. Kostenpflichtig.                                                       | lernserver.de (Leistungsprofil)                     |
| Orthografietrainer.net                       | Über 5 000 Übungssätze ab etwa Klasse 5, automatische Auswertung, Trainingspläne.                                                                            | [Vermutung] Die Zuordnung hängt an der Aufgabe (jeder Satz gehört zu einer Regel), nicht an einer Analyse der Falschschreibung. Mechanik **ungeprüft**. | uni-potsdam.de (Praxisbeispiel)                     |

Gesichert ist außerdem: Abruf aus dem Gedächtnis wirkt stärker als Abschreiben
[Fachstand, Jones u. a. 2016, im Audit zitiert, n. o. v.].

### 3.3 Was sich ohne KI aus einer getippten Falschschreibung ablesen lässt

[Empfehlung, abgeleitet aus 3.2] Die Deutung vergleicht Eingabe und Zielwort
(das kann `letter-diff.ts` schon) und schlägt die abweichende Stelle in den
ausgezeichneten Stellen des Zielworts nach.

| Sicherheit              | Fehlerarten                                                                                                                                                                                                                 | Bedingung                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Sicher erkennbar**    | Groß-/Kleinschreibung; Doppelkonsonant vereinfacht (Sone); ck/k, tz/z; ie/i; h fehlt; s/ss/ß vertauscht; d/t, g/k, b/p am Wort- oder Silbenende; ä/e, äu/eu; Fuge im zusammengesetzten Wort (Fahrad); Homophon gewählt      | Die Abweichung trifft **genau** eine ausgezeichnete Stelle mit der erwarteten Verwechslung. |
| **Nur als Vermutung**   | Übergeneralisierung (Tieger, Schuhle); Tippfehler (Nachbartaste, zwei Buchstaben vertauscht); ausgelassene oder vertauschte Laute; mehrere Fehler in einem Wort; Fehler in nicht ausgezeichneten Wörtern (eigene Wortboxen) | Allgemeine Muster ohne Wortwissen. Zählt nicht für eine Aussage über das Kind.              |
| **Gar nicht erkennbar** | Die Ursache (LRS, Dialekt, Zweitsprache, Unaufmerksamkeit, Hörproblem); ob das Kind die Regel kennt oder rät; grammatische Entscheidungen am Einzelwort (das/dass, Nominalisierung); Komma                                  | Braucht Unterricht, Gespräch oder ein normiertes Verfahren.                                 |

**Wie viele Belege?** [Empfehlung] Ein „Muster“ gibt es erst, wenn alle vier
Bedingungen erfüllt sind: mindestens 3 sichere Fehler desselben Phänomens, an
mindestens 3 verschiedenen Wörtern, an mindestens 2 Tagen, und mindestens ein
Drittel Fehler bei mindestens 9 Gelegenheiten. Ohne den Bezug auf
Gelegenheiten sieht jede viel geübte Box wie eine Schwäche aus. Die Schwelle
ist ein fachlicher Vorschlag, nicht validiert, und muss im Unterricht erprobt
werden.

**Grenze zur Diagnostik.** Erlaubt: das Phänomen nennen, die Belegwörter
zeigen, eine Übung vorschlagen. Nicht erlaubt: Vergleich mit einer Norm,
Jahrgangsniveau, Prozentrang, Etiketten, Ursachen, Verlauf über Wochen an die
Lehrkraft (Audit F.4 und I.6; Bericht 12, RL-1, RL-3, RL-13 und Abschnitt
5.1: „Kategorien nur nach Rechtschreibphänomen, nie nach Ursache“).

### 3.4 Handschrift gegenüber Tippen

| Aussage                                                                                                                                                                                                | Einordnung                  | Quelle (Abruf 10.11.2026)                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------- |
| Metaanalyse, 22 Studien, 6 168 Kinder bis Klasse 6: mit der Hand geschriebene Texte sind besser (Effektstärke 0,53); beim Lesen keine klare Überlegenheit. Rechtschreibung nicht getrennt ausgewiesen. | [Fachstand], nur Abstract   | Malpique u. a., Australian Educational Researcher; ro.ecu.edu.au |
| Fünf- bis Sechsjährige lernen neue Buchstaben und Kunstwörter besser durch Schreiben oder Nachspuren mit der Hand als durch Tippen. Kleine Gruppen (12 bis 13 Kinder).                                 | [Fachstand], Einzelstudie   | Acha, Ibaibarriaga und Perea 2025; uv.es                         |
| Kinder mit Lese-Rechtschreib-Störung schrieben in einer Studie besser richtig, wenn sie tippend lernten; andere Kinder profitierten von beiden Wegen.                                                  | [Fachstand], nur Suchauszug | iris.unitn.it/handle/11572/453518                                |

Folgerung: Für **Schreibanfänger** ist der Vorteil der Hand gut gestützt. Für
das **Rechtschreiblernen älterer Kinder** fand ich keinen klaren Vorteil einer
Eingabeart; die Lage ist offen. Tippen ist für die Zielgruppe also kein
Fehler, aber die Abschlussprüfung wird mit der Hand geschrieben [Vermutung].

**Handschrifterkennung.** Die Aussage aus `00-auftrag.md`, Erkennung „glätte“
Falschschreibungen und lese Kinderschrift schlecht, ist **im Grundsatz
belegt, für das iPad nicht gemessen**:

- Wörterbücher und Sprachmodelle verbessern die Erkennung, machen sie aber
  unempfindlich für Wörter, die es nicht gibt, also für Falschschreibungen
  [Fachstand; Totev und Ward 2023, arxiv.org/abs/2309.10158].
- Gängige Modelle „korrigieren oder missdeuten“ Merkmale von Kinderschrift
  (Spiegelungen, lautgetreue Fehler); die Autoren mussten ein eigenes Modell
  auf Zeichenebene bauen [Fachstand, nur Abstract; Rangasrinivasan u. a.,
  ICDAR 2025, researchconnect.buffalo.edu].
- Die Web-Schnittstelle zur Handschrifterkennung gibt es in Chromium ab
  Version 99, anfangs nur auf ChromeOS [Fachstand; developer.chrome.com]. Für
  Safari auf dem iPad fand ich keinen Beleg: **ungeprüft**.
- „Kritzeln“ auf dem iPad wandelt Stiftschrift in jedem Textfeld in Text um,
  Deutsch seit iPadOS 14.5, nur mit Apple Pencil [Fachstand; macrumors.com].
  Ob es deutsche Falschschreibungen verändert, ist **ungeprüft**. Das
  betrifft Lernraum schon heute: Ein Kind mit Stift kann in jedes
  Antwortfeld kritzeln.

## 4. Zielbild

### 4.1 Rechtschreib-Landkarte

Bezug: Mittelschule mit Grundlagen. Die Stufen sind Lernschritte, keine
Jahrgänge; „üblich in“ dient nur der Orientierung [Empfehlung].

| Stufe | Inhalt                                                                                                             | Strategie                              | üblich in | Heute in Lernraum                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | --------- | ------------------------------------------------------- |
| A     | Lautgetreu schreiben; sp/st, qu; Endungen -er, -el, -en                                                            | Mitsprechen                            | 1–2       | fehlt                                                   |
| B     | ie als Regelfall; Doppelkonsonant, ck, tz                                                                          | Silbe (bei Einsilbern erst verlängern) | 2–4       | Boxen „Langes i“ (schief, F2), Doppelkonsonanten, ck/tz |
| C     | d/t, g/k, b/p am Ende; ä/äu; Wortbausteine (ver-, vor-, -ig, -lich, -ung); Fuge in Zusammensetzungen               | Verlängern, Ableiten, Zerlegen         | 3–5       | Boxen Auslaut und ä/äu (F4, F5); Bausteine fehlen       |
| D     | Merkstellen: Dehnungs-h, Doppelvokal, i ohne e, v/f, x/chs/cks, s nach langem Vokal                                | Merken, Wortfamilie                    | 3–6       | Boxen Dehnungs-h, s/ss/ß, Merkwörter                    |
| E     | Großschreibung im Satz und Nominalisierung (beim Laufen, etwas Neues); das/dass; Zeitangaben (heute Abend, abends) | Proben im Satz                         | 5–9       | fehlt (nur Homophon-Hilfe)                              |
| F     | Getrennt- und Zusammenschreibung; Komma bei Aufzählung, Nebensatz, wörtlicher Rede                                 | Proben im Satz                         | 6–9       | fehlt                                                   |
| G     | Fremdwortbausteine (-ieren, -tion, -ität, ph, th, y); Wortschatz für Bewerbung und Beruf                           | Baustein, Merken                       | 7–9       | ungeordnet in „Merkwörter & Fremdwörter“                |

**Reihenfolge** [Empfehlung]: zuerst B bis D mit Wortschatz für Jugendliche
(„Grundlagen nachholen“), dann E, dann G, dann F. Stufe A zuletzt oder gar
nicht: Sie braucht Anlautbilder, Ton und Handschrift, und das Audit hält
Jahrgang 1 und 2 für ungeeignet (`01-planung.md`, K9). Großschreibung und
Zeichensetzung gelten als häufigste Fehlerquellen in Texten der
Sekundarstufe [Fachstand, n. o. v.]; sie lassen sich am Einzelwort nicht üben.

### 4.2 Inhaltsmodell „Kernwort“

| Merkmal                                    | Wozu                                             | Rang             | Entsteht                                      |
| ------------------------------------------ | ------------------------------------------------ | ---------------- | --------------------------------------------- |
| Wort mit Artikel, Wortart                  | Großschreibung, eigener Lernstand je Wort        | unverzichtbar    | maschineller Vorschlag, Lehrkraft bestätigt   |
| Stellen: Position, Phänomen, Strategie     | Fehlerdeutung, Entscheidungslücke, Rückmeldung   | unverzichtbar    | Regelmuster schlagen vor, Lehrkraft bestätigt |
| Beweiswort je Stelle (Hunde, Baum)         | Verlängern und Ableiten als Aufgabe              | unverzichtbar    | Lehrkraft                                     |
| Kontrastwort (bunt zu Hund, Kino zu Biene) | Entscheidung üben, Übergeneralisierung vermeiden | unverzichtbar    | Lehrkraft                                     |
| Beispielsatz                               | Satzdiktat, Homophone, Großschreibung            | unverzichtbar    | Entwurf zur Entwicklungszeit, Lehrkraft prüft |
| Niveau (Grundlagen, Aufbau, Sekundarstufe) | Auswahl nach Alter, kein „Tugend“ neben „Hund“   | unverzichtbar    | Lehrkraft                                     |
| Geprüft am, durch                          | Ehrliche Kennzeichnung                           | unverzichtbar    | Prüfansicht                                   |
| Silben, Wortfamilie                        | Silbenbögen, Familienaufgaben                    | nützlich         | maschinell, Stichprobe                        |
| Häufigkeit, Bezug zum Grundwortschatz      | Auswahl                                          | nützlich, später | Lizenzfrage offen (Bericht 12, RL-7, E-5)     |
| Lautschrift, Bild, Tonaufnahme, Bedeutung  | –                                                | Luxus            | nicht bauen                                   |

**Umfang.** Erster Bestand: 10 Phänomene × 30 Wörter (20 Zielwörter, 10
Kontrastwörter) = 300 Kernwörter, ausgewählt aus den vorhandenen 885 und
ergänzt um Jugendwortschatz. **Prüfzeit** [Vermutung]: 40 Sekunden je Wort in
einer Prüfansicht plus 20 Sekunden je Satz, zusammen etwa 5 Stunden, bei zwei
Stunden je Woche also rund drei Wochen. Die ersten 30 Wörter mit Stoppuhr
prüfen und dann neu rechnen.

**Quellen.** Selbst erstellt (vorhandene Listen): frei. Wikidata-Lexeme für
Wortart und Formen: CC0. Wiktionary für Silben: CC BY-SA 4.0, bindet das
Inhaltspaket an dieselbe Lizenz. Grundwortschatz Bayern: nur als Bezug,
Lizenz ungeprüft. childLex: Lizenz ungeprüft, nicht mitliefern. Muster für
Silbentrennung: Lizenz ungeprüft.

### 4.3 Beispiel: drei Wörter und zwei Fehlerwege

```text
wort: der Hund          wortart: Nomen   niveau: Grundlagen   silben: Hund
stellen:
  - position 4 „d“   phänomen: d/t am Ende   strategie: Verlängern
    beweis: Hunde    erwartete Verwechslung: t
kontrast: bunt (bunte)          satz: Der Hund wartet vor der Tür.

wort: die Biene         wortart: Nomen   niveau: Grundlagen   silben: Bie-ne
stellen:
  - position 2–3 „ie“   phänomen: langes i   strategie: Silbe
    hinweis: Bie-ne, die erste Silbe endet offen   erwartete Verwechslung: i
kontrast: Kino (Merkwort mit i)   satz: Eine Biene landet auf dem Heft.

wort: das Fahrrad       wortart: Nomen   niveau: Grundlagen   silben: Fahr-rad
bausteine: fahr + Rad   wortfamilie: fahren
stellen:
  - position 3 „h“     phänomen: Dehnungs-h   strategie: Merken (wie fahren)
    erwartete Verwechslung: fehlt
  - position 4–5 „rr“  phänomen: Fuge         strategie: Zerlegen (Fahr|rad)
    erwartete Verwechslung: ein r
  - position 7 „d“     phänomen: d/t am Ende  strategie: Verlängern
    beweis: Räder      erwartete Verwechslung: t
kontrast: Ware (ohne h)          satz: Mein Fahrrad steht im Hof.
```

**Weg 1: „Hunt“ statt „Hund“.**

1. Vergleich: 4. Buchstabe t statt d (`letter-diff.ts`).
2. Nachschlagen: Position 4 ist eine Stelle „d/t am Ende“, t ist die
   erwartete Verwechslung. Deutung: sicher.
3. Rückmeldung sofort: „Verlängere: viele Hun-de. Jetzt hörst du das d.“
4. Zählen: 1 Fehler bei 1 Gelegenheit „d/t am Ende“. Noch keine Aussage. Das
   Wort wird morgen fällig (W-3, W-4).
5. Ist die Schwelle aus 3.3 erreicht, erscheint auf „Lernen“: „Hier lohnt sich
   Üben: d oder t am Wortende. Belege: Hunt, Walt, Bilt.“
6. Übung: erst das Beweiswort tippen (Hunde), dann das Wort (Hund); im Wechsel
   mit Kontrastwörtern (bunt, bunte). Danach Hören und Schreiben im Satz.
7. „Sicher“ wird das Phänomen nur über Abruf ohne Schriftbild an mehreren
   Tagen (Regel des Kompetenzprofils, `competence-profile.ts`).

**Weg 2: „Fahrad“ statt „Fahrrad“.**

1. Vergleich: ein r fehlt an Position 4 oder 5.
2. Nachschlagen: Die Stelle ist als **Fuge** ausgezeichnet, nicht als
   Doppelkonsonant. Ohne Auszeichnung würde eine allgemeine Regel
   „Doppelkonsonant vereinfacht“ melden und zur falschen Übung führen.
3. Rückmeldung: „Zerlege das Wort: Fahr + Rad. Jeder Teil behält seine
   Buchstaben.“
4. Zählen bei „Fuge“. Übung nach Erreichen der Schwelle: Wörter zerlegen und
   zusammensetzen (Schiff|fahrt, Bett|tuch).

Gegenprobe: „Hudn“ trifft keine Stelle, zwei Nachbarbuchstaben sind
vertauscht. Deutung „vermutlich vertippt“; zählt für kein Muster.

### 4.4 Kind, Lehrkraft, Prüfstein

**Kind.** Nach einem Fehler nennt die Rückmeldung die Stelle und die
Strategie. In Kontrastrunden entscheidet es („i oder ie?“). Auf dem eigenen
Gerät sieht es höchstens einen Übungsvorschlag mit Belegwörtern und kann ihn
ablehnen.

**Lehrkraft.** Sie prüft Kernwörter in einer Prüfansicht, nicht im Quellcode.
Im Live-Raum sieht sie wie heute Fehlerwörter je Tier; neu wäre eine Zeile
„Wörter mit d/t am Ende fielen oft falsch aus“, berechnet auf ihrem Gerät aus
den vorhandenen Daten. Zeigt ein Kind ihr einen Bericht, enthält er Phänomen
und Zahl, keine Ursache (Entscheidungsvorlage 7.6).

**Prüfstein auf fremdem Gerät** (Nachtrag 2: freies Üben). Das Kind wählt
„Rechtschreibung“, schreibt einen kurzen Startpunkt mit Kontrastwörtern und
übt danach 15 Minuten das erste Phänomen, an dem es zweimal scheitert, mit
Strategie-Rückmeldung. Es gibt keinen Vorschlag aus einem Muster, weil das
Gerät das Kind nicht kennt; das ist ehrlich. **Auf eigenem Gerät** speisen
Fehler und Muster die Tagesportion.

### 4.5 Übungsformen

| Format                                        | Passt zu                         | Stand heute             | Misst                                                                                                |
| --------------------------------------------- | -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Entscheidungslücke an der Stelle (B_ne: i/ie) | B, C, D mit Kontrastwörtern      | fehlt                   | Entscheidung; ist Wiedererkennen, hebt die Box nicht                                                 |
| Erst Beweiswort, dann Wort                    | d/t, g/k, b/p; ä/äu              | fehlt                   | Strategieanwendung                                                                                   |
| Sortieren in zwei Spalten                     | Merkstellen (mit h, ohne h)      | fehlt                   | Unterscheidung                                                                                       |
| Wörter zerlegen und bauen                     | Fuge, Wortbausteine, Wortfamilie | fehlt                   | Stammprinzip                                                                                         |
| Hören und Schreiben, Wort (Stufe 6)           | alle                             | vorhanden               | Schreibsicherheit; einziges Format, das heute Können zeigt                                           |
| Hören und Schreiben, Satz                     | E, F, Homophone, Transfer        | fehlt (Entscheidung 55) | Anwendung im Satz                                                                                    |
| Abschreiben (Stufe 1)                         | erster Kontakt mit einem Wort    | vorhanden               | Abschreiben, nicht Können (seit W-8 richtig gewertet)                                                |
| Lücken (Stufen 2, 3)                          | –                                | vorhanden               | Muster ergänzen; Lücken sitzen nicht an der schwierigen Stelle (F9)                                  |
| Ansehen und verdecken (Stufe 4)               | Merkwörter                       | vorhanden               | Merken mit Längenhilfe (F9)                                                                          |
| Wörter merken (Stufe 5)                       | –                                | vorhanden               | vor allem Merkspanne, weniger Rechtschreibung [Vermutung]                                            |
| Textbox                                       | Transfer                         | vorhanden               | vor allem Behalten des Textes (Audit D-005)                                                          |
| Fehler in fremdem Text korrigieren            | Jahrgang 7 bis 9                 | fehlt                   | Kontrolle; falsche Wortbilder vor schwachen Schreibern sind umstritten [Fachstand, n. o. v.]: später |

Neue Formate folgen den Regeln W-1 bis W-8: Sie sind freies Üben, Fehler
machen ein Wort fällig, richtige Antworten heben keine Box. Die Box steigt
weiter nur durch freien Abruf.

### 4.6 Textbox und Laufdiktat

Texte dienen dem Transfer, nicht der Deutung von Fehlern. [Empfehlung]:

- **Nicht alle 50 Texte prüfen.** Das kostet etwa 4 bis 7 Stunden
  [Vermutung, 5 bis 8 Minuten je Text] für Texte im Grundschulton.
- 15 Texte auswählen und prüfen (etwa 2 Stunden), die übrigen bis zur Prüfung
  ausblenden. TXT-002, 011, 024, 034 und 046 neu schreiben oder streichen.
- Neuer Zuschnitt: **Satzdiktat je Phänomen**. Die Beispielsätze der
  Kernwörter sind der Vorrat; es entsteht keine zweite Prüfarbeit.
- Später 20 kurze Texte (60 bis 90 Wörter) mit Themen für Jugendliche, zwei je
  Phänomen.

### 4.7 Handschrift

| Stufe                                             | Bewertung [Empfehlung]                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) Schreiben mit Selbstkontrolle, ohne Erkennung | **Bauen, zuerst mit Papier:** „Hör zu, schreib ins Heft, decke auf, vergleiche.“ Braucht keinen Stift am Gerät und fast keinen Code. Eine Schreibfläche am Bildschirm ist ein möglicher zweiter Schritt, wenn Stifte vorhanden sind.                   |
| (b) Nachspuren für Schreibanfänger                | **Nicht bauen.** Nutzen nur für Jahrgang 1; nicht die Zielgruppe. Ob Spuren mit dem Finger auf Glas das Schreiben mit dem Stift fördert, ist ungeprüft.                                                                                                |
| (c) Handschrifterkennung                          | **Nicht bauen.** Glättung von Fehlern im Grundsatz belegt (3.4), auf dem iPad im Browser nicht als Schnittstelle belegt, braucht Stift, und Erkennung auf dem Gerät ist ein lernendes System zur Laufzeit (harte Rahmenbedingung 2; Bericht 12, RL-9). |

**Ehrlichkeit der Selbstkontrolle.** Kinder überschätzen ihre Leistung
[Fachstand, Destan und Roebers 2015, im Audit zitiert, n. o. v.]. Regeln
[Empfehlung]: (1) Statt „War es richtig?“ fragt Lernraum nach der Stelle:
„Hast du ie geschrieben?“ (2) „Falsch“ wird immer geglaubt und macht das Wort
fällig. (3) „Richtig“ zählt als Übung und hebt höchstens bis Box 3, wie das
Aufdecken in der LernBox (Bericht 10, 2.1). (4) Ein Phänomen wird nie über
Selbstkontrolle „sicher“.

## 5. Konkrete Bausteine

Aufwand: S bis etwa eine Woche, M zwei bis vier Wochen, L länger. Prüfaufwand
der Lehrkraft für Inhalte: kein, S, M, L.

| Nr.    | Baustein                                                                                                        | Nutzen und Szenario                                           | Entwicklung | Prüfaufwand           | Abhängigkeiten                      | Entscheidungen            |
| ------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------- | --------------------- | ----------------------------------- | ------------------------- |
| R20-1  | Fachfehler F1 bis F7 und F11 beheben; Strategie für Einsilber „Verlängern, dann Silbe“                          | Keine falschen Regeln mehr vor Kindern                        | S           | S (1 Stunde)          | –                                   | 30                        |
| R20-2  | Inhaltsmodell „Kernwort“ und Prüfansicht für die Lehrkraft (Regelmuster schlagen Stellen vor)                   | Macht alle folgenden Bausteine möglich; Prüfen ohne Quellcode | M           | kein                  | Modulvertrag (Bericht 10, L1) hilft | 30                        |
| R20-3  | Kernbestand: 300 Wörter in 10 Phänomenen mit Kontrast, Beweiswort und Satz                                      | Jugendgerechter, geprüfter Wortschatz                         | S           | M (etwa 5 Stunden)    | R20-2                               | 30                        |
| R20-4  | Fehlerdeutung: Stelle × erwartete Verwechslung; Filter für Tippfehler; allgemeine Regeln nur als Vermutung      | Aus „ein Buchstabe ist anders“ wird ein Phänomen              | M           | S (Testfälle sichten) | R20-2, R20-3                        | –                         |
| R20-5  | Rückmeldung mit Strategie am Fehlerort                                                                          | Kind erfährt, was es tun kann; wirkt auch auf fremdem Gerät   | S           | S (etwa 15 Sätze)     | R20-4                               | –                         |
| R20-6  | Kontrastrunde mit Entscheidungslücke                                                                            | Übt die Entscheidung; Förderstunde ohne Vorbereitung          | M           | in R20-3              | R20-3                               | 30, 55 (nur Wortebene)    |
| R20-7  | Zweischritt „erst Beweiswort, dann Wort“; Zerlegen und Bauen                                                    | Strategie wird Handlung statt Merksatz                        | S–M         | in R20-3              | R20-3                               | –                         |
| R20-8  | Musterzähler mit Gelegenheiten und Schwelle; Vorschlag „Hier lohnt sich Üben“; Einspeisung in die Tagesportion  | Förderung aus eigenen Fehlern auf festem Gerät                | M           | kein                  | R20-4                               | 57, 59; Bericht 12, RL-13 |
| R20-9  | Startpunkt Rechtschreibung neu: 3 Wörter je Stufe mit Kontrast, Stufen bis E, Ergebnis öffnet direkt eine Runde | Prüfstein auf fremdem Gerät                                   | S–M         | S                     | R20-3                               | 59                        |
| R20-10 | Stufe 4 ohne Längenstriche; Lücken der Stufen 2 und 3 an der schwierigen Stelle                                 | Stufen messen, was sie anzeigen                               | S           | kein                  | R20-2                               | 55                        |
| R20-11 | Hören und Schreiben im Satz (Satzdiktat aus Beispielsätzen)                                                     | Transfer; Voraussetzung für Stufe E                           | M           | in R20-3              | R20-3; deutsche Stimme              | 55, 58                    |
| R20-12 | Pakete Sekundarstufe: Großschreibung und Nominalisierung, das/dass, später Komma                                | Kernstoff der Mittelschule                                    | L           | L                     | R20-11                              | 55                        |
| R20-13 | Textbox-Auswahl: 15 Texte prüfen, übrige ausblenden, 5 neu schreiben                                            | Kein ungeprüfter Inhalt vor Kindern                           | S           | M (etwa 2 Stunden)    | –                                   | 54                        |
| R20-14 | „Schreib ins Heft“ mit Selbstkontrolle an der Stelle                                                            | Handschrift ohne Stift am Gerät; Abwechslung zum Tippen       | S           | kein                  | R20-2                               | – (keine vorhanden)       |
| R20-15 | Phänomenzeile im Live-Raum und im freiwilligen Kurzbericht                                                      | Lehrkraft sieht, welches Phänomen die Klasse braucht          | M           | kein                  | R20-3; Rolle 25 und 30              | 4, 10; Bericht 12, RL-3   |
| R20-16 | Kritzeln-Test im Unterricht: 10 Falschschreibungen mit Stift in ein Antwortfeld schreiben, Ergebnis notieren    | Klärt die offene Frage aus 3.4 ohne Code                      | –           | S (20 Minuten)        | Gerät mit Stift                     | –                         |

Reihenfolge: R20-1 und R20-16 sofort; dann R20-2 bis R20-5; dann R20-6 bis
R20-10; R20-11 bis R20-15 danach.

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                     | Grund                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Handschrifterkennung, Nachspuren                                | Abschnitt 4.7                                                                                   |
| Lehrgang für Jahrgang 1 und 2 (Anlaute, lautgetreues Schreiben) | Nicht die Zielgruppe; braucht Ton, Bilder und Handschrift; Audit hält die Stufe für ungeeignet  |
| Prozentrang, Niveau nach Jahrgang, Etikett, Ursachendeutung     | Nicht normiert; Audit F.4, I.6; Bericht 12, RL-13                                               |
| Fehlerdeutung in freien Texten des Kindes                       | Ohne Zielwort keine Stelle; bräuchte Sprachanalyse zur Laufzeit                                 |
| Automatische Kommaprüfung in eigenen Sätzen                     | Braucht Satzanalyse; nur feste, geprüfte Sätze                                                  |
| Texte, die zur Laufzeit aus Lernwörtern entstehen               | Entscheidung 54; harte Rahmenbedingung 2                                                        |
| Übernahme fremder Wortlisten oder Häufigkeitswerte              | Bericht 12, RL-7, RL-8                                                                          |
| Alle 885 Wörter voll auszeichnen                                | Etwa 15 Stunden Prüfzeit [Vermutung] ohne Zusatznutzen; die übrigen Wörter bleiben als Wortbank |

Was eine App nicht leistet: das Gespräch über die Strategie, das Schreiben
eigener Texte, die Arbeit mit dem Wörterbuch und jede Diagnose. Das bleibt
Unterricht.

## 7. Offene Entscheidungen für den Entwickler

| Nr. | Frage                                                                                                                                                                    | Empfehlung                                                                                                                                                       | Ohne Entscheidung                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 7.1 | Darf ein geprüfter Kernbestand von 30 Wörtern je Phänomen Vorrang vor der Regel „mindestens 100 Wörter je Sammlung“ haben (Entscheidung 30)?                             | Ja. Die großen Boxen bleiben als Wortbank; Runden ziehen zuerst Kernwörter. Als Ergänzung zu Entscheidung 30 ins Protokoll.                                      | Es bleibt bei Masse ohne Merkmale; Fehlerdeutung und Kontraste sind nicht baubar. |
| 7.2 | Dürfen in einer Phänomen-Runde Kontrastwörter stehen, die das Phänomen **nicht** haben (Kino neben Biene)?                                                               | Ja, etwa ein Drittel.                                                                                                                                            | Kinder üben weiter nur Positivbeispiele (F8).                                     |
| 7.3 | Kommen Satzformate (Satzdiktat, Lücke im Satz für das/dass)? Entscheidung 55 hat „Hören und Lückensatz“ bewusst nicht umgesetzt.                                         | Ja, als neue Entscheidung: Ohne Satz gibt es keine Großschreibung, kein das/dass, kein Komma, also keinen Stoff der Mittelschule.                                | Lernraum bleibt bei Grundschulphänomenen am Einzelwort.                           |
| 7.4 | Textbox: alle 50 Texte prüfen, oder 15 prüfen und die übrigen ausblenden? Entscheidung 54 nennt die Texte „geprüft“, sie sind es nicht.                                  | 15 prüfen, Rest ausblenden, Protokoll berichtigen.                                                                                                               | Ungeprüfte Texte mit bekannten Fehlern bleiben frei sichtbar.                     |
| 7.5 | Wie soll die s-Schreibung für bayerische Kinder erklärt werden, wenn „summen“ nicht hörbar ist (F6)?                                                                     | Zwei Schritte: nach kurzem Vokal ss (Silbe); nach langem Vokal ist ß gegen s eine Merkstelle mit Wortfamilie. Du kennst die Aussprache deiner Klassen am besten. | Der Regeltext verlangt eine Unterscheidung, die viele Kinder nicht hören.         |
| 7.6 | Gilt die Schwelle aus 3.3 und der Wortlaut „Hier lohnt sich Üben“? Darf ein freiwilliger Bericht Phänomen und Zahl nennen (Entscheidungen 4 und 10: keine Einzelfehler)? | Schwelle ja, als Startwert zur Erprobung. Bericht: Phänomen und Zahl ja, Belegwörter nein, kein Verlauf; nur per QR, nicht über den Server (Bericht 12, RL-3).   | Entweder keine Förderung aus Fehlern oder Aussagen aus Einzelfehlern.             |
| 7.7 | Handschrift: „Schreib ins Heft“ mit Selbstkontrolle ja, Erkennung und Nachspuren nein? Haben deine Klassen Stifte?                                                       | Ja zu beidem. Vorher R20-16 durchführen. Die Entscheidung ins Protokoll, weil es zu Handschrift noch keine gibt.                                                 | Die Frage kommt wieder; Kritzeln verändert womöglich unbemerkt Antworten.         |
| 7.8 | Reihenfolge nach den Grundlagen: zuerst Großschreibung und das/dass (Stufe E) oder zuerst Fremd- und Berufswortschatz (Stufe G)?                                         | Stufe E zuerst; G ist schneller gebaut und kann vorgezogen werden, wenn die Prüfzeit knapp ist.                                                                  | Ich plane mit E vor G.                                                            |

**Annahmen dieses Berichts.** Stifte sind nicht überall vorhanden (Frage 2).
Prüfzeit höchstens zwei Stunden je Woche (Frage 6). Alle Zeitangaben zur
Prüfarbeit sind Schätzungen ohne Messung.

**Nicht geprüft.** Wortlaut des LehrplanPLUS Mittelschule und der beiden
Grundwortschatz-Listen; Mechanik von Orthografietrainer.net; Verhalten von
Kritzeln bei deutschen Falschschreibungen; Handschrift-Schnittstelle in
Safari; alle Studien nur als Abstract oder Suchauszug; die 40 nicht gelesenen
Textbox-Texte; Vault-Kapitel 06, 07 und 24 nur über die Berichte 10 und die
Inhaltsdokumente; Verhalten im Browser.
