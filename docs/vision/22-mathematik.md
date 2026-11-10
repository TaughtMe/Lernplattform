# Vision Lernraum – Rolle 22: Mathematikdidaktik

Stand: 10.11.2026. Geprüft am Code der Version 0.9.7, an den Wellen-Plänen 1
bis 3, am Gesamtaudit (D-008, D-009, G-008, G-009), an den Entscheidungen 7,
10, 31, 38, 39, 47, 57, 58, 59 und an Vault 23. Grundlage sind die Berichte 10,
11 und 12 sowie die Antworten des Entwicklers (`01-planung.md`, Abschnitt 4,
mit Nachtrag vom 10.11.2026). Die roten Linien aus Bericht 12 (RL-1 bis RL-13)
gelten.

Kennzeichen: [Beleg] Repository, [Fachstand] Forschung oder anerkannte Praxis
mit Quelle, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser
Rolle. Webquellen stehen am Ende mit Abrufdatum. Webangaben stammen aus
Suchergebnissen; Originaltexte habe ich nicht gelesen (siehe 3.5).

## 1. Kurzfazit

1. Der Kopfrechengenerator ist technisch sauber, fachlich aber blind für das,
   was Rechnen schwer macht: Er zieht Zahlen gleichverteilt und weiß nicht,
   ob eine Aufgabe einen Zehnerübergang hat. Der Audit-Befund D-009 gilt am
   Code von 0.9.7 unverändert [Beleg].
2. Lernraum zählt nur Richtigkeit. Ein Kind, das 8 + 7 zählend löst, gilt im
   Startpunkt und im Kompetenzprofil als sicher. Damit kann Üben das Zählen
   festigen statt es abzulösen [Fachstand].
3. Für die Mittelschule fehlt fast alles oberhalb der Grundschule:
   Stellenwert großer Zahlen, Zehnereinmaleins, Dezimalzahlen, Größen,
   Brüche, Prozent. Brüche lassen sich heute nicht einmal als Bruch
   beantworten, nur als Dezimalzahl [Beleg].
4. Die Fehlerklassifikation ist im Kern richtig und ehrlich gebaut. Zwei
   Regeln vergeben aber falsche Namen (Zehnerübergang ohne Übergang,
   „Rechenart verwechselt“ bei Mal mit Null), und zwei häufige Muster fehlen.
5. Die Entscheidungen C4-4 und C4-5 (kein Tipp bei unbekannter Fehlerart,
   Fehlerart nur in der CSV) sind fachlich klug. Eine einzelne Antwort trägt
   keine Diagnose.
6. Der größte Hebel mit kleinem Prüfaufwand: Generator und Familien nach
   Aufgabenmerkmalen ordnen, Startpunkt mit festen, fachlich gewählten
   Aufgaben, Antwortzeit nur lokal und nur zur Einordnung erfassen.
7. Das Kopfrechnen im Live-Raum trägt, weil alle zugleich rechnen, sofort
   Rückmeldung bekommen und die Lehrkraft nichts vorbereiten muss. Tempo ist
   Teil des Reizes, schadet aber Kindern, die noch zählen. Passende neue
   Formate sind Überschlag, Zerlegen und Ableiten, nicht Sachaufgaben.
8. Lernraum sollte Mathematik als „Grundrechnen bis Klasse 9“ ausbauen und
   Geometrie, Prüfungsvorbereitung und Diagnostik anderen überlassen. Das
   berührt Entscheidung 38 und ist eine Entscheidungsvorlage.

## 2. Ist-Stand in Lernraum

### 2.1 Was es gibt

| Teil                     | Was es heute tut                                                                                                                                                                                                           | Beleg                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Generator Plus/Minus     | Beide Zahlen gleichverteilt im Zahlenraum; Regeln für Null, negative Ergebnisse, Lücken. Standard im freien Üben: Plus und Minus, 0 bis 20, 10 Aufgaben.                                                                   | `src/domain/mental-math.ts`, `generateOperands` (Z. 551–564); `mental-math-app.tsx`, Z. 107–113 |
| Generator Mal/Geteilt    | Immer Einmaleins: Reihe 1–10 mal 0–10, Geteilt als Umkehrung. Der gewählte Zahlenraum ändert daran nichts (kein 30 · 4, kein 600 : 3).                                                                                     | `mental-math.ts`, Z. 554–560                                                          |
| Eigene Terme             | Dezimalzahl, Klammer, Potenz, Bruch, Wurzel mit sicherem Parser; Antwort nur als Dezimalzahl lesbar.                                                                                                                       | `evaluateMentalMathExpression`; `parseDecimalAnswer` (Z. 762–781)                     |
| Antwortprüfung           | Exakt, Tausenderpunkt, Komma; bei 1 : 3 zählt jede richtig gerundete Eingabe ab zwei Stellen.                                                                                                                              | `mathAnswerMatches` (Z. 830–849); Welle 1, M-2                                        |
| Fehlerklassifikation     | Acht Regeln: Vorzeichen, Zahlendreher, Stellenwert, Komma, Rechenart, Zehnerübergang (±10), um eins daneben, Nachbaraufgabe; sonst „unbekannt“.                                                                            | `mental-math-feedback.ts`, Z. 103–171                                                 |
| Tipp und Lösungsweg      | Tipp nach dem ersten Fehler nur bei erkannter Fehlerart; Lösungsweg nach dem zweiten Fehler, ohne Endergebnis (Zerlegen am Zehner, Kernaufgabe 5 ·, Umkehraufgabe).                                                        | `mentalMathHint`, `mentalMathSolutionSteps`; Welle 2, C4-2 bis C4-4                   |
| Fehlerübung              | Nur Fehler erzeugen Wiederholungen (1/3/7/14 Tage). Nachübung zieht neue Aufgaben derselben Familie: Rechenart, Lücke, Reihe oder Zahlenraumstufe.                                                                        | `math-practice.ts`, `mathReviews`, `mathFamilyKey`, `buildMathReviewRound`; Entsch. 57 |
| Startpunkt               | Sechs Stufen (bis 10, bis 20, bis 100, Mal, Geteilt, bis 1000), je zwei **zufällige** Aufgaben, Ende nach zwei Fehlern auf einer Stufe. Mathe-Vorschlag wird nicht eingestellt.                                            | `start-point.ts`, Z. 236–310; Bericht 10, Abschnitt 4                                 |
| Kompetenzprofil „sicher“ | Je Familie: mindestens 5 verschiedene Aufgaben ohne Hilfe richtig, an mindestens 2 Tagen, kein offener Fehlerposten unter Box 3.                                                                                          | `competence-profile.ts`, `mathEntry` (Z. 286–323)                                     |
| Live-Raum                | Lehrkraft würfelt eine Aufgabenliste, jedes Kind rechnet im eigenen Tempo; Battle lädt Rückstand stärker auf (34 statt 25); Tempo-Punkte nur zuschaltbar; Tafelansicht mit „Häufigsten Fehlern“; erste falsche Antwort je Aufgabe an den Server (32 Zeichen), Fehlerart nur in der CSV. | `use-math-content.ts`; `live-game-feedback.ts`; Welle 2, C4-5; Welle 3, D5-5          |
| Fortschritt              | Kein Mathe-Abschnitt auf „Mein Fortschritt“.                                                                                                                                                                               | Suche nach „math“/„rechn“ in `app/lernen/fortschritt/` ohne Treffer                   |
| Antwortzeit              | Im freien Üben nicht erfasst. Jedes Ereignis trägt aber den Zeitpunkt der Antwort (`occurredAt`). Im Live-Raum gibt es eine Dauer je Kind und die Tempo-Punkte.                                                           | `learning-bundle.ts`, Z. 78; `storage/math-practice.ts`; `live-game.tsx`, Z. 273, 458 |

### 2.2 Was falsch oder schwach ist

- **Gleichverteilung.** Im Standard (0–20) hat nur gut ein Viertel der Aufgaben
  einen Zehnerübergang, ein Viertel enthält 0 oder 1 (Audit D-009, Messung D7;
  der Code ist seither an dieser Stelle unverändert) [Beleg].
- **Familien zu grob.** „Plus bis 100“ fasst 34 + 5 und 37 + 48 zusammen. Die
  Nachübung zu einem Fehler bei 37 + 48 kann lauter Aufgaben ohne Übergang
  bringen (`buildMathReviewRound` erzeugt zufällig in der Familie) [Beleg].
- **Familie nach Einstellung, nicht nach Aufgabe.** Die Zahlenraumstufe kommt
  aus `options.maxValue`. 3 + 4 in einer Runde „bis 100“ zählt als Aufgabe
  „bis 100“ und hilft, diese Familie „sicher“ zu machen [Beleg].
- **Startpunkt prüft das Falsche.** Zwei zufällige Aufgaben „bis 20“ können
  3 + 5 und 12 − 1 sein. Dann prüft die Stufe den Zehnerübergang gar nicht.
  Zwei Aufgaben je Stufe sind zudem sehr wenig [Beleg; Wirkung Vermutung].
- **Fehlerklassifikation, Regel „Zehnerübergang“.** Sie greift bei jeder
  Abweichung um 10, auch ohne Übergang: 34 + 25 = 69 heißt in der CSV
  „Zehnerübergang“, obwohl es keinen gibt (`classifyMentalMathError`, Z. 155–156,
  prüft den Übergang nicht) [Beleg].
- **Mal mit Null.** 6 · 0 = 6 landet bei „Rechenart verwechselt“, weil 6 + 0 = 6
  ist (Z. 146–153). Fachlich ist das die Null-Regel, keine Verwechslung [Beleg].
- **Lösungsweg „Zähle in 4er-Schritten“** für kleine Reihen (Z. 407–411) ist
  ein Zählweg. Für die Zweier- und Viererreihe passt Verdoppeln besser, für
  die Fünferreihe die Hälfte der Zehnerreihe [Empfehlung].
- **Brüche.** Eine Lehrkraft kann `\frac{1}{3}+\frac{1}{6}` stellen, das Kind
  muss aber „0,5“ tippen; „1/2“ ist keine lesbare Antwort [Beleg]. Für
  Bruchrechnen in Jahrgang 6 ist das fachlich falsch.

### 2.3 Ergänzungen zu Bericht 10

- Bericht 10 nennt „Zahlenraum frei wählbar (bis 1 000 000)“. Das gilt nur für
  Plus und Minus. Mal und Geteilt bleiben immer im kleinen Einmaleins [Beleg].
- „Mathe-Fortschritt ungeprüft“ (Bericht 10, 2.1): geprüft, es gibt ihn nicht.
- Der Auftrag sagt, Lernraum messe keine Antwortzeit. Das stimmt für das
  freie Üben; im Live-Raum wird Dauer gemessen und auf Wunsch als Tempo
  gezeigt (D5-5).

## 3. Fachstand und Vorbilder

### 3.1 Was gesichert ist

| Aussage                                                                                                                                                                                                                         | Kennzeichen und Quelle                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Viele Kinder verfehlen die Mindeststandards: 2021 rund 22 % in Klasse 4 (+6 Punkte seit 2016); 2024 in Klasse 9 knapp 9 % den Mindeststandard für den Ersten Schulabschluss und rund 34 % den für den Mittleren Schulabschluss. | [Fachstand] IQB-Bildungstrend 2021 und 2024 (Q1, Q2; Werte aus Pressetexten, Bericht nicht gelesen)                                           |
| Verfestigtes zählendes Rechnen ist der zentrale Stolperstein. Der Übergang zu Ableitungsstrategien (aus 5 + 5 wird 5 + 6) gelingt, wenn er ausdrücklich erarbeitet wird; sonst rechnen viele Kinder lange zählend weiter.        | [Fachstand] Gaidoschik 2010; Gaidoschik und Fellmann 2015 (Q3, Q4)                                                                            |
| Schwierigkeiten in der Sekundarstufe I gehen oft auf schwaches Zahl- und Stellenwertverständnis zurück; Basiskompetenzen entwickeln sich bis in die Sekundarstufe weiter.                                                      | [Fachstand] Buchwald u. a. 2022 zu Levumi (Q5)                                                                                               |
| Reihenfolge: Vorstellung aufbauen (mit Material), Ableiten aus Kernaufgaben, erst dann wiederholt abrufen.                                                                                                                      | [Fachstand] PIKAS, Modul „Nicht zählendes Rechnen“ (Q6); „Mathe sicher können“, Förderbausteine (Q7)                                          |
| Virtuelle Anschauungsmittel wirken im Mittel moderat (etwa d = 0,34 über 32 Berichte), stark abhängig von Vergleich, Inhalt und Dauer.                                                                                          | [Fachstand] Moyer-Packenham und Westenskow 2013, zitiert nach Q8                                                                             |
| Genauigkeit beim Einordnen auf dem Zahlenstrahl hängt eng mit Rechenleistung zusammen; lineare Zahlenspiele verbessern Zahlvorstellung bei jungen Kindern.                                                                     | [Fachstand] Schneider u. a. 2018 (Korrelation), Siegler und Ramani (Q9). Für Jugendliche ist die Übertragung **ungeprüft**.                  |
| Verteiltes Wiederholen festigt besser als massiertes Üben.                                                                                                                                                                       | [Fachstand] im Repository bereits Grundlage (Entscheidung 57, Begründung)                                                                   |
| Zahlendreher sind ein deutsches Risiko, weil Zahlwörter die Einer vor den Zehnern nennen.                                                                                                                                       | [Fachstand] Zuber u. a. 2009, zitiert im Audit D-008 (nicht im Original verifiziert)                                                         |

### 3.2 Was umstritten ist: Zeit und Angst

[Fachstand] Ob Zeitdruck Mathematikangst erzeugt, ist offen. Boaler vertritt
das deutlich; Education Week stellt 2024 fest, dass es dazu wenig direkte
Forschung gibt, und eine kleine Studie fand keinen Unterschied zwischen offen
und verdeckt gemessener Zeit (Q10). Gleichzeitig gibt es Belege, dass geübtes
schnelles Abrufen bei Basisfakten die Leistung hebt (Fuchs u. a.; laut Q11 von
What Works Clearinghouse als „stark“ belegt). Übereinstimmung herrscht in
einem Punkt: Tempo-Übung erst, wenn das Kind die Aufgabe sicher und
nicht-zählend lösen kann. Daraus folgt für Lernraum: Zeit **messen** ist
fachlich sinnvoll, Zeit **zeigen und belohnen** nur in bewusst gewählten
Spielformen.

### 3.3 Vorbilder

| Angebot                      | Was gut ist                                                                                | Warum nicht nachbauen                                           | Quelle                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------- |
| „Mathe sicher können“ (DZLM) | Förderbausteine Stellenwert, Operationen, Brüche, Prozent für Klasse 4–7 mit Standortbestimmung | Unterrichtsmaterial, nicht als App gedacht; Lizenz je Datei prüfen | Q7; Lizenz s. 3.5         |
| PIKAS (DZLM)                 | Darstellungsmittel, Ablösung vom Zählen, Fortbildungsmodule                                | dito                                                            | Q6                        |
| Levumi                       | Kostenlose Lernverlaufstests: Zahlenstrahl, Zahlzerlegung, Platzhalter, Grundrechenarten  | Diagnostik mit Konto auf Uni-Servern; nicht nachbauen, verweisen | Q5; Bericht 11, W-4       |
| bettermarks, Mathegym        | Schrittweise Rückmeldung, Sek-I-Breite                                                     | kostenpflichtig, Konto; Pflegeaufwand eines ganzen Lehrwerks    | Bericht 11, Tabelle 3.1   |
| Zahlenzorro                  | Grundschule, Statistik für Lehrkräfte                                                     | Grundschule, Lizenz kostet (laut Medienzentrum Wiesbaden 125–213 € je Jahr, Stand ungeprüft) | Q12                       |
| Zearn, Khan Academy          | kostenlos, gut belegt (Zearn)                                                              | englisch, US-Lehrplan                                           | Bericht 11, P1, O1        |

### 3.4 Bayern, Mittelschule

[Fachstand] LehrplanPLUS Mittelschule Jahrgang 5 beginnt mit „Natürliche
Zahlen: Zahlenraum über eine Milliarde hinaus“ und „Grundrechenarten“;
Jahrgang 6 ordnet Brüche am Zahlenstrahl und behandelt Zehnerbrüche (Q13).
Die KMK-Standards für Erster und Mittlerer Schulabschluss (2022) sind der
länderübergreifende Bezug (Q14, Inhalt nicht gelesen).

### 3.5 Grenzen der Recherche und Lizenzen

- WebFetch habe ich nicht genutzt; alle Webangaben stammen aus Suchauszügen.
- **PIKAS:** Materialien laut Auszügen unter CC BY-SA 4.0, Fotos mit Personen
  ausgenommen (Q6). Je Datei prüfen.
- **„Mathe sicher können“:** Ein Modulhandbuch nennt CC BY-SA, die Bücher
  erscheinen bei Cornelsen (Q7). **Lizenz ungeprüft** je Material.
- **Levumi, IQB, KMK, LehrplanPLUS:** nur als Bezug und Verweis, nicht als
  Inhalt. Lizenz ungeprüft.

## 4. Zielbild

### 4.1 Kind

- Es tippt „Mathe“ und wählt aus wenigen, verständlich benannten Paketen:
  „Plus und Minus über den Zehner“, „Einmaleins – die schweren Reihen“,
  „Große Zahlen“, „Komma und Geld“, „Brüche und Prozent“. Der Zahlenraum ist
  eine Feineinstellung, keine Pflichtfrage.
- Aufgaben haben einen Kern: Zehnerübergang, Ableiten aus Kernaufgaben,
  Stellenwert. Triviale Aufgaben sind selten.
- Nach einem Fehler sieht es eine passende Strategie oder ein Bild (Zwanzigerfeld,
  Rechenstrich, Punktefeld), nie die Fehlerart und nie das Ergebnis.
- Es wird nicht gehetzt. Keine Uhr im freien Üben. Im Profil steht bei
  Basisfakten irgendwann „sicher und flüssig“, ohne Sekunden.
- Für Jugendliche ist die Gestaltung sachlich; der Einstieg beginnt nicht bei
  3 + 4.

### 4.2 Lehrkraft

- Startet Kopfrechnen im Live-Raum wie heute in Sekunden. Zusätzlich kann sie
  Formate wie „Überschlag“ oder „Zerlegen“ wählen.
- Sieht an der Tafel die häufigsten Fehleraufgaben der Klasse und nutzt sie
  für ein Gespräch über Rechenwege.
- Bekommt in der CSV wie heute Fehlerarten als Vermutung, ergänzt um eine
  Zusammenfassung je Merkmal für die Klasse (nicht je Kind).
- Findet für Diagnose einen Verweis auf Levumi und auf Fördermaterial von PIKAS
  und „Mathe sicher können“.

### 4.3 Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“

| Lage                         | Heute                                                                                 | Im Zielbild                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Fremdes Gerät ohne Lernstand | Kind wählt Rechenart, Zahlenraum, Anzahl; Standard 0–20 ist für Jugendliche zu leicht | Paketwahl in zwei Tippern oder Startpunkt (etwa 3 Minuten), danach 20 Minuten im passenden Paket mit gemischten Formaten [Empfehlung] |
| Eigenes Gerät mit Lernstand  | Portion wiederholt nur Mathe-Fehler                                                   | Portion mischt Fehler, fällige Basisfakten und Neues im gewählten Paket; flüssige Fakten treten zurück                          |
| Live-Raum                    | trägt schon heute                                                                     | unverändert einfach, mit zwei bis drei weiteren Formaten                                                                        |

Der Prüfstein trägt auf fremden Geräten nur, wenn die Pakete ohne Lernstand
sinnvoll sind (Nachtrag, Antwort 2). Deshalb kommt die Ordnung nach Merkmalen
vor jeder Steuerung.

## 5. Konkrete Bausteine

Prüfaufwand der Lehrkraft: kein, S (Stichprobe oder kurze Regeltabelle), M
(jede Zeile sichten), L (fachlich neu bewerten). Generierte Aufgaben brauchen
nur die Prüfung der Regel, nicht jeder Aufgabe.

| Nr.   | Baustein                                                                                                                                                         | Nutzen und Szenario                                                                                   | Entw. | Prüfung | Abhängigkeiten        | Berührte Entscheidungen                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----- | ------- | --------------------- | --------------------------------------------- |
| MA-1  | Generator nach Aufgabentypen gewichten: Zehnerübergang, Verdoppeln, Fast-Verdoppeln, Kern- und Nachbaraufgaben; 0, 1 und · 10 höchstens 5 %. Merkmal „Übergang ja/nein“ und Stellenwerttyp (ZE + E, ZE + ZE) in der Familie. | Jede Runde übt die Hürde. Grundlage für alles Weitere.                                                | S–M   | S       | –                     | 38; 57 (Familienbegriff)                      |
| MA-2  | Fehlerklassifikation schärfen: „Zehnerübergang“ nur bei echtem Übergang; neue Regeln „Null-Regel“ (6 · 0 = 6), „stellenweise kleiner von größer“ (53 − 27 = 34), „Übertrag bei Hundertern“ (±100). | Ehrlichere CSV, passendere Tipps.                                                                     | S     | S       | –                     | C4-1, C4-5 (keine Änderung der Sichtbarkeit)  |
| MA-3  | Nachübung nach Merkmal: Ein Fehler mit Übergang bringt neue Aufgaben mit Übergang in derselben Stellenwertart.                                                   | Fehlerübung trifft die Schwierigkeit.                                                                 | S     | kein    | MA-1                  | 31, 38                                        |
| MA-4  | Startpunkt Mathe neu: feste, fachlich gewählte Aufgaben je Stufe (z. B. 8 + 7 und 13 − 6 für „bis 20“); Stufen für die Mittelschule (Zehnereinmaleins, große Zahlen, Komma); Einstieg in der Mitte, bei Fehlern abwärts; Vorschlag wird direkt eingestellt. | Jugendliche starten nicht bei 3 + 4. Fremdes Gerät: in drei Minuten ein passendes Paket.            | M     | S       | MA-1, MA-11           | Welle 3, D2-1; 59                             |
| MA-5  | Regel „sicher“ für Mathe: Unter den 5 sicheren Aufgaben müssen mindestens 3 das Familienmerkmal tragen; Familie nach den Zahlen der Aufgabe, nicht nach der Einstellung. | „Sicher bei Plus bis 100“ heißt dann auch: über den Zehner.                                           | S     | kein    | MA-1                  | Welle 3, D2-3                                 |
| MA-6  | Flüssigkeit lokal: Antwortzeit je Aufgabe nur auf dem Gerät speichern; im Profil „sicher und flüssig“ bei Basisfakten, ohne Sekundenzahl; keine Belohnung, keine Übertragung. | Zählende Kinder werden erkennbar, ohne Druck. Grundlage für MA-7.                                     | M     | kein    | MA-5                  | Vault 23 („kein Bonus“), D5-5; 2, 9 (lokal)   |
| MA-7  | Basisfakten auch nach richtiger Antwort wiederholen, solange sie nicht flüssig sind (kleines Einmaleins, Plus und Minus bis 20).                                 | Automatisierung braucht verteiltes Abrufen, nicht nur Fehlerreparatur.                                | S     | kein    | MA-6                  | **57** („nur Fehler werden wiederholt“)       |
| MA-8  | Darstellungen als Hilfe: Zwanzigerfeld (Fünferstruktur), Rechenstrich, Punktefeld für das Einmaleins, Stellenwerttafel. Im Lösungsweg „Zeig es am Bild“, mit Abbau: erst Bild, dann nur Vorstellen. | Rechenschwache Kinder bekommen eine Vorstellung statt eines Zählwegs.                                 | M     | S       | –                     | C4-3, C4-4                                    |
| MA-9  | Neue Formate im freien Üben: Ableiten („Welche Aufgabe hilft dir bei 6 · 7?“), Überschlag mit Spanne, Zahlenstrahl einordnen, Blitzblick (strukturierte Menge kurz zeigen), Fehler finden („Mia rechnet 53 − 27 = 34“). | Verstehen statt nur Ergebnis; Abwechslung in 20 Minuten.                                              | M     | S–M     | MA-1, MA-8            | 55 (keine Satzformate, nicht betroffen)       |
| MA-10 | Live-Formate: Überschlag mit Toleranz, Zerlegen (Lücken wie 100 = 37 + _), Ableiten mit Auswahl; Klassenziel kooperativ („Wir schaffen 300 Aufgaben“).           | Mehr als Ergebnis-Tippen, ohne Mehraufwand für die Lehrkraft.                                         | S–M   | S       | MA-1                  | 7, 10, 39, D5-5; Frage 5 (Rolle 24)           |
| MA-11 | Mittelschul-Paket 1: Zehnereinmaleins (30 · 4, 560 : 8), große Zahlen und Runden, Komma und Geld, Größen umrechnen (m, cm, kg, g, h, min).                       | Jahrgang 5–7 und Grundlagen für den Ersten Schulabschluss; generierbar, kaum Text.                    | M     | S–M     | MA-1                  | **38** (Umfang des Kerns)                     |
| MA-12 | Mittelschul-Paket 2: Brüche und Prozent im Kopf; Eingabe als Bruch; Bruchstreifen; ½ = 0,5 = 50 %; 10 %, 25 %, 50 % von einer Zahl.                              | Jahrgang 6–9; häufige Lücke vor dem Abschluss.                                                         | L     | M       | MA-11, MA-8           | **38**                                        |
| MA-13 | Mathe in „Mein Fortschritt“ und im Profil sichtbar, je Familie in Kinderworten.                                                                                  | Das Kind sieht, was es kann.                                                                          | S     | kein    | MA-5                  | 57 (Rückstand nie als Zahl)                   |
| MA-14 | Merkmal-Zusammenfassung der Klasse in der CSV („9 Fehler mit Zehnerübergang, 4 mit Null-Regel“), ohne Kindbezug.                                                | Lehrkraft plant die nächste Stunde aus einem Blick.                                                   | S     | kein    | MA-2                  | C4-5 (Entscheidungsvorlage)                   |
| MA-15 | Verweisseite: Levumi für Diagnose, PIKAS und „Mathe sicher können“ für Förderung.                                                                               | Keine Scheindiagnostik; Lehrkraft findet das Richtige.                                                | S     | S       | Prüfung der Angaben   | Bericht 11, W-4; RL-13                        |

Reihenfolge nach Nutzen je Aufwand: MA-1, MA-2, MA-3, MA-5, MA-4, MA-13, dann
MA-6 und MA-7, dann MA-8 bis MA-11, zuletzt MA-12. Das passt zur
Priorität des Entwicklers (Mathe nach Rechtschreibung, Lesen und Vokabeln,
Frage 7): MA-1 bis MA-5 sind klein und lassen sich im Unterricht sofort
erproben (Frage 6).

**Prüfzeit insgesamt** [Empfehlung]: MA-1 bis MA-11 brauchen zusammen etwa
eine Regeltabelle je Paket und eine Liste fester Startpunkt-Aufgaben, grob
3 bis 5 Stunden Prüfung. MA-12 braucht Sichtung der Bruch- und Prozentregeln
und der Bilder, grob 4 bis 6 Stunden. Sachaufgaben sind bewusst nicht dabei.

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                     | Grund                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Große Bibliothek von Sachaufgaben                               | Jeder Text braucht fachliche und sprachliche Prüfung (L), Kontexte veralten, Sprache überfordert DaZ-Kinder. Eigene Aufgaben der Lehrkraft bleiben möglich. |
| Geometrie, Funktionen, Prüfungsvorbereitung (Quali, Abschluss)  | Entscheidung 38; Pflegeaufwand eines Lehrwerks; bettermarks, Mathegym und Schulbuch decken das ab.                                    |
| Eigener Rechenschwäche-Test, Label „Dyskalkulie“                | Validierung braucht Forschung (Audit F.4, Bericht 11); Merkmal wäre sensibel (RL-1, RL-2, RL-13). Verweis auf Levumi (MA-15).         |
| Countdown, Zeitlimit oder Sekundenanzeige im freien Üben        | Fachstand zu Angst offen; Tempo-Übung erst bei sicherem, nicht-zählendem Rechnen; Vault 23.                                            |
| Rangliste einzelner Kinder nach Tempo                           | RL-6; Entscheidungen 7 und 10.                                                                                                        |
| Fehlerart oder Flüssigkeit eines Kindes an Server oder Lehrkraft | RL-3 solange S1 offen; Entscheidungen 2, 4, 10. Bleibt lokal.                                                                          |
| Handschriftliche Rechenwege, Fotos von Heften                   | Stifte nicht überall (Annahme Frage 2); RL-10; Auswertung ohne KI zur Laufzeit nicht möglich.                                         |
| Freie Texteingabe „Erkläre deinen Rechenweg“ mit Auswertung     | ohne KI zur Laufzeit nicht auswertbar (Rahmenbedingung 2). Rechenwege vergleicht die Klasse an der Tafel.                             |
| Übernahme fremder Arbeitsblätter als Inhalt                     | Lizenz je Datei ungeprüft; Share-alike bindet das Paket (Bericht 12, E-3). Nur als Ideenquelle und Verweis.                           |

## 7. Offene Entscheidungen für den Entwickler

| Nr.  | Frage                                                                                                                                                                  | Empfehlung                                                                                                                                                       | Ohne Entscheidung                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| MD-1 | Soll der Mathe-Kern aus Entscheidung 38 („basale Kopfrechenkompetenz“) auf „Grundrechnen bis Klasse 9“ erweitert werden: Stellenwert, Zehnereinmaleins, Komma, Größen, Brüche und Prozent im Kopf? | Ja, als neuer Eintrag im Protokoll. Geometrie und Prüfungsstoff bleiben ausdrücklich draußen.                                                                    | Mathe bleibt auf Grundschulniveau; die Mittelschule bekommt nur Nachholstoff.                      |
| MD-2 | Darf Lernraum die Antwortzeit je Aufgabe lokal speichern, um „flüssig“ von „sicher, aber zählend“ zu unterscheiden?                                                    | Ja: nur auf dem Gerät, nie als Sekundenzahl für das Kind, nie übertragen, nicht in der Sicherung nötig. Schwelle relativ zum eigenen Verlauf, kalibrierbar.        | Zählende Kinder gelten weiter als sicher; MA-7 ist nicht möglich.                                  |
| MD-3 | Sollen Basisfakten auch nach richtiger Antwort wiederkommen (Abweichung von Entscheidung 57)?                                                                          | Ja, nur für kleines Einmaleins und Plus/Minus bis 20 und nur bis „flüssig“.                                                                                      | Automatisieren bleibt dem Zufall des freien Übens überlassen.                                      |
| MD-4 | Soll der Startpunkt Mathe feste statt zufälliger Aufgaben nutzen, in der Mitte beginnen und den Vorschlag direkt einstellen? (offene Abstimmung aus 0.9.7)             | Ja. Ich liefere gern eine Liste von 16 bis 20 festen Aufgaben zur Prüfung (S).                                                                                   | Der Startpunkt misst zufällig und überfordert oder unterfordert Jugendliche.                      |
| MD-5 | Soll das Kind bei unbekannter Fehlerart statt nichts ein Bildangebot bekommen („Zeig es am Bild“), das keine Vermutung enthält? (berührt C4-4)                         | Ja, als Angebot, nicht als Tipp. C4-4 bleibt im Kern: kein geratener Strategiehinweis.                                                                          | Nach dem ersten Fehler steht weiter nur „Noch nicht.“                                              |
| MD-6 | Soll die CSV eine Zusammenfassung der Fehlermerkmale der Klasse bekommen (MA-14)? (berührt C4-5)                                                                       | Ja, nur je Klasse und nur in der CSV. Keine Anzeige je Kind in der Oberfläche.                                                                                  | Die Lehrkraft muss die Zeilen selbst auszählen.                                                    |
| MD-7 | Wie viel Tempo im Live-Kopfrechnen? (mit Rolle 24 abzuwägen)                                                                                                           | Fachlich: Tempo nur bei Aufgaben, die die Klasse schon sicher kann; lieber Klassen- oder Teamtempo als Einzelwertung; Tempo-Punkte bleiben zuschaltbar, Standard aus. | Stand D5-5 bleibt.                                                                                 |

### Annahmen dieses Berichts

- Zielgruppe bayerische Mittelschule mit Grundschul-Grundlagen (Frage 1).
- Prüfzeit höchstens etwa zwei Stunden pro Woche (Frage 6, Hinweis).
- Stifte nicht überall; keine Handschrift-Eingabe (Frage 2).
- Startpunkt, Training und Profil werden verlinkt (Nachtrag, Antwort 3).

### Nicht geprüft

- Verhalten im Browser, Verteilung der Aufgaben in einem eigenen Lauf (ich
  stütze mich auf Audit D7 und den unveränderten Code).
- Originaltexte der Studien, IQB-Berichte, KMK-Standards und Lizenzseiten.
- Ob die Levumi-Tests für Jugendliche altersgerecht sind.

## Quellen

Alle abgerufen am 10.11.2026 über die Websuche; Inhalte aus Suchauszügen.

| Nr. | Quelle                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | https://mb.sachsen-anhalt.de/fileadmin/tsa_rssinclude/bildungsministerium_17_10_2022_pressemitteilung_iqb-bildungstrend-2021-fuer-den-primarbereich-vorgestellt-sachsen-anhalt-weitgehend-im-bundesweiten-trend.pdf; https://www.kmk.org/aktuelles-1/artikelansicht/erste-ergebnisse-zum-iqb-bildungstrend-2021-geringere-leistungen-in-deutsch-und-mathematik-in-schulisch-herausfordernden-zeiten.html |
| Q2  | https://www.iqb.hu-berlin.de/media/documents/IQB_Bildungstrend2024_Pr%C3%A4sentationsfolien-7.pdf; https://www.news4teachers.de/2025/10/iqb-bildungstrend-2024-das-ranking-so-schneiden-die-einzelnen-bundeslaender-ab/ |
| Q3  | https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_3_-_Umgang_mit_Rechenschwierigkeiten/IM/Informationstexte/Beitrag_Gaidoschik.pdf                                                    |
| Q4  | https://core.ac.uk/download/46916729.pdf (Gaidoschik und Fellmann 2015)                                                                                                                            |
| Q5  | https://epub.uni-regensburg.de/52061/1/Buchwald%20et%20al.%20%282022%29_Lernverlaufsdiagnostik%20in%20Mathemaik.pdf                                                                                |
| Q6  | https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Fortbildung_neu/Haus_3_Rechenschwierigkeiten/Modul_4/steckbrief_modul_4_nicht_zaehlendes_rechnen_11_und_1-1.pdf; Lizenz: https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/FOM/Unterrichtsentwicklung/planungsbogen_inhaltliche_fragen.pdf |
| Q7  | https://mathe-sicher-koennen.dzlm.de/mskfiles/uploads/Dokumente/dzlm-mathesicher-modulhandbuch-201028_0.pdf; https://cris-portal.uni-muenster.de/portal/en/publication/193641271                  |
| Q8  | https://digitalcommons.usu.edu/teal_facpub/2399                                                                                                                                                    |
| Q9  | https://www.frontiersin.org/articles/10.3389/fpsyg.2021.638004/full; https://education.umd.edu/sites/default/files/uploads/Ramani%20et%20al.%2C%202012%20%281%29.pdf                              |
| Q10 | https://www.edweek.org/teaching-learning/do-timed-tasks-really-worsen-math-anxiety/2024/08                                                                                                         |
| Q11 | https://www.kqed.org/mindshift/61712/do-math-drills-help-children-learn                                                                                                                            |
| Q12 | https://www.wiesbaden.de/en/microsite/medienzentrum/paedagogische-software/sammelbestellungen                                                                                                      |
| Q13 | https://www.distanzunterricht.bayern.de/fileadmin/user_upload/lernenzuhause/Mittelschule/LP_Herbst_21/Mathe_Herbst_21/Mathematik_Schwerpunktsetzungen_5_2021_22.pdf; https://www.lehrplanplus.bayern.de/schulart/mittelschule/jgs/5/fach/mathematik |
| Q14 | https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-ESA-MSA-Mathe.pdf                                                                                      |
