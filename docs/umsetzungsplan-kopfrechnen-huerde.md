# Umsetzungsplan Kopfrechnen: Aufgaben mit Hürde, ehrliche Fehlerarten, treffende Nachübung

Stand: 15.11.2026. Grundlage: Bericht 22 (`docs/vision/22-mathematik.md`,
Bausteine MA-1, MA-2, MA-3, MA-5 und die Codebefunde in Abschnitt 2.2), Audit
D-009 (`docs/audits/2026-10-19-lernraum-gesamtaudit.md`), Roadmap Etappe 1,
Zeile „Mathe“.

Dieser Plan ist ein Bauplan für eine Person ohne Vorwissen. Geprüft am Code
des Standes `b79f61e`. Alle Beispielaufgaben in den Tabellen sind von Hand
nachgerechnet und sollen als Tabellentests übernommen werden. Festlegungen mit
dem Vermerk **Vorschlag** soll der Entwickler bestätigen (Abschnitt 13).

## 1. Ziel und Abgrenzung

Vier Teile, die aufeinander aufbauen:

- **A. Merkmale einer Aufgabe** (neu, Grundlage für alles): Übergang je
  Stelle, „am vollen Zehner“, trivial, Form der Zahlen.
- **B. Generator mit Hürde (MA-1):** In jeder Runde hat mindestens die Hälfte
  der Plus- und Minusaufgaben einen Übergang; höchstens 5 % der Aufgaben sind
  trivial.
- **C. Fehlerarten richtig benennen (MA-2):** „Zehnerübergang“ nur bei echtem
  Übergang; 6 · 0 = 6 ist die Null-Regel; neu „kleiner von größer“ und
  „Hunderterübergang“.
- **D. Nachübung, die den Fehler trifft (MA-3):** Neue Aufgaben haben dieselbe
  Form und denselben Übergang wie die Fehleraufgabe.
- **E. „Sicher“ auch über den Zehner (MA-5):** Die Familie richtet sich nach
  den Zahlen der Aufgabe; triviale Aufgaben zählen nicht; für Plus und Minus
  braucht es Aufgaben mit Übergang.

Befunde am Code, die der Plan behebt (alle bestätigt):

| Befund                                                                                                          | Stelle                                                            |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Plus und Minus ziehen beide Zahlen gleichverteilt; Mal und Geteilt ziehen den zweiten Faktor aus 0 bis 10.      | `generateOperands` in `src/domain/mental-math.ts`                 |
| „Zehnerübergang“ greift bei jeder Abweichung um 10, auch ohne Übergang (34 + 25 = 69).                          | `classifyMentalMathError` in `src/domain/mental-math-feedback.ts` |
| 6 · 0 = 6 heißt „Rechenart verwechselt“, weil 6 + 0 = 6 ist.                                                    | ebenda, Regel `operation-mix`                                     |
| Die Nachübung erzeugt beliebige Aufgaben der Familie; zu 37 + 48 können lauter Aufgaben ohne Übergang kommen.   | `buildMathReviewRound` in `src/domain/math-practice.ts`           |
| Die Familie kommt aus der Einstellung (`options.maxValue`): 3 + 4 in einer Runde „bis 100“ zählt als „bis 100“. | `mathFamilyKey` in `src/domain/math-practice.ts`                  |
| „Sicher“ verlangt 5 verschiedene saubere Aufgaben an 2 Tagen; 5 + 0 und 6 + 1 zählen mit.                       | `mathEntries` in `src/domain/competence-profile.ts`               |

Nicht Teil dieses Plans:

- Startpunkt Mathe (MA-4), Mathe in „Mein Fortschritt“ (MA-13), Antwortzeit
  (MA-6, MA-7), Bilder (MA-8), neue Formate (MA-9, MA-10), Stoff der
  Mittelschule (MA-11, MA-12), Zusammenfassung in der CSV (MA-14).
- Eigene Quoten für Verdoppeln, Fast-Verdoppeln, Kern- und Nachbaraufgaben
  (Frage F-6).
- Änderungen am Format von Lernereignissen, an Sicherung, Abgleich oder
  Supabase.
- Der Lösungsweg „Zähle in 4er-Schritten“ (Bericht 22, 2.2) und die Eingabe
  von Brüchen.
- Aufgaben mit negativen Zahlen, Kommazahlen und gemischte Terme: Sie haben
  keine Merkmale und laufen wie heute.

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 15.11.2026: `Anwendung.md` (Entscheidungen 1 bis 76),
`Entscheidungsindex.md`, dazu die Regeln C4-1 bis C4-5
(`docs/umsetzungsplan-audit-welle-2.md`) und D2-3
(`docs/umsetzungsplan-audit-welle-3.md`), gesucht nach Kopfrechnen, Familie,
Zahlenraum, Fehlerart, Tipp, sicher, Wiederholung, Tempo.

| Entscheidung                              | Inhalt                                                                                                                                               | Folge für diesen Plan                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 38 (gemeinsamer Mathematikkern)           | Freies Üben und Live-Raum nutzen denselben Generator. Fehler werden als Familie mit Zahlenraum gespeichert; die Förderübung erzeugt neue Rechnungen. | Die Gewichtung sitzt im gemeinsamen Generator und gilt für beide. Die Nachübung erzeugt weiter neue Aufgaben, jetzt mit passender Form (Teil D). |
| 31 (Lernkreislauf)                        | Rechenfehler aktivieren neue Aufgaben derselben Kopfrechenfamilie.                                                                                   | Bleibt; die Familie wird genauer bestimmt (Teil E), die Aufgaben treffen das Merkmal (Teil D).                                                   |
| 57 (Wiederholungsregeln Mathe)            | Nur Fehler werden wiederholt; Stufen 1/3/7/14 Tage; gezählt nach Familien (Rechenart, Lücke, Reihe oder Zahlenraum).                                 | Unverändert. Das Format des Familienschlüssels bleibt; nur die Herkunft der Zahlenraumstufe ändert sich (SI-1).                                  |
| 59, Welle 3 D2-3 (Profil, Regel „sicher“) | „Sicher“ ist eine Projektion aus Ereignissen; die pädagogische Abstimmung steht ausdrücklich aus.                                                    | Teil E schärft die Regel. Nichts wird gespeichert oder migriert. Ergänzung fürs Protokoll siehe unten.                                           |
| 64 („sicher“ nie aus Selbsteinschätzung)  | Strengere Lesart von „sicher“.                                                                                                                       | Passt: Teil E macht „sicher“ strenger, nie lockerer.                                                                                             |
| C4-1, C4-5                                | Die Fehlerart ist eine Vermutung, nur für die Lehrkraft und nur in der CSV; leer bei unbekannt.                                                      | Bleibt. Neue Fehlerarten erscheinen nur in der CSV. Wo bisher fälschlich „Zehnerübergang“ stand, bleibt die Zelle jetzt leer (FK-6).             |
| C4-2, C4-3, C4-4                          | Tipp nach dem ersten Fehler nur bei erkannter Fehlerart; nie das Ergebnis; ohne erkannte Fehlerart nur „Noch nicht.“                                 | Neue Tipps nennen kein Ergebnis (Abschnitt 5.3). Wo die Fehlerart jetzt unbekannt ist, gibt es keinen Tipp mehr; das folgt C4-4.                 |
| 69 (Grundrechnen bis Klasse 9)            | Erweiterung des Kerns, geplant.                                                                                                                      | Nicht berührt. Die Merkmale sind so angelegt, dass MA-11 sie erweitern kann.                                                                     |
| 37 mit G6, 70; Vault 23                   | Kein Tempo-Bonus für das einzelne Kind.                                                                                                              | Keine Zeitmessung, keine Tempo-Wertung.                                                                                                          |
| 65 (Fehler an der Tafel erst ab sechs)    | Projektion.                                                                                                                                          | Nicht berührt; die Fehlerart steht nie an der Tafel.                                                                                             |

Ergebnis: **Kein Widerspruch, keine Rücknahme.** Die Regel „sicher“ für Mathe
wird ergänzt. Dafür ein Entwurf ohne „Zurückgenommen“:

### Entscheidungsvorlage E-1 (Ergänzung, Nummer vergibt der Entwickler)

> **Kopfrechnen: Aufgaben mit Hürde und „sicher“ über den Zehner – (Datum)**
>
> **Beschlossen:** Der Generator stellt in jeder Runde mindestens die Hälfte
> der Plus- und Minusaufgaben mit Übergang und höchstens 5 % triviale Aufgaben
> (0, 1, · 10). Die Aufgabenfamilie richtet sich nach den Zahlen der Aufgabe,
> nicht nach der Einstellung. Für „sicher“ zählen triviale Aufgaben nicht; bei
> Plus und Minus müssen mindestens 3 der sicheren Aufgaben einen Übergang
> haben. Regeln in `docs/umsetzungsplan-kopfrechnen-huerde.md`. Ergänzt 38, 57
> und 59.
>
> **Begründung:** Bericht 22 (MA-1, MA-5); Audit D-009.
>
> **Bekannte Grenzen:** Eine Familie kann nach dem Update von „sicher“ auf „im
> Aufbau“ zurückfallen. Aufgaben mit negativen Zahlen und Kommazahlen haben
> keine Merkmale.

## 3. Regeltabellen

Schreibweise: E(x) ist die Einerziffer, Z(x) die Zehnerziffer einer Zahl.
Alle Merkmale gelten nur für ganze Zahlen ab 0.

### 3.1 Teil A: Merkmale (ME)

| Nr.   | Merkmal                       | Definition                                                                                                                                                               | Ja                                          | Nein                               |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------- |
| ME-1  | **Trivial**, Plus/Minus       | Eine der beiden Zahlen ist 0 oder 1, oder das Ergebnis von Minus ist 0.                                                                                                  | 5 + 0, 1 + 8, 9 − 1, 14 − 0, 7 − 7          | 8 + 2, 12 − 11, 2 + 2              |
| ME-2  | **Trivial**, Mal              | Ein Faktor ist 0, 1 oder 10.                                                                                                                                             | 6 · 0, 1 · 7, 10 · 4                        | 2 · 2, 5 · 9                       |
| ME-3  | **Trivial**, Geteilt          | Der Teiler ist 1 oder 10, oder das Ergebnis ist 0, 1 oder 10.                                                                                                            | 0 : 6, 7 : 7, 8 : 1, 70 : 7, 30 : 10        | 56 : 7, 20 : 5                     |
| ME-4  | **Zehnerübergang**, Plus      | E(a) + E(b) ist größer als 10.                                                                                                                                           | 8 + 7, 34 + 8, 37 + 48, 85 + 47             | 34 + 25, 26 + 4, 14 + 3, 370 + 250 |
| ME-5  | **Zehnerübergang**, Minus     | E(a) ist kleiner als E(b), und E(a) ist nicht 0.                                                                                                                         | 13 − 6, 53 − 27, 32 − 7, 623 − 458          | 17 − 4, 30 − 4, 58 − 23, 400 − 150 |
| ME-6  | **Am vollen Zehner**          | Plus: E(a) + E(b) ist genau 10 (beide Einer nicht 0). Minus: E(a) ist 0 und E(b) ist nicht 0.                                                                            | 7 + 3, 26 + 4, 20 − 7, 30 − 4               | 8 + 7, 40 − 20                     |
| ME-7  | **Übertrag an den Einern**    | Zehnerübergang (ME-4, ME-5) oder am vollen Zehner (ME-6). Das ist der technische Übertrag, den ein Kind vergessen kann.                                                  | 8 + 7, 26 + 4, 13 − 6, 30 − 4               | 34 + 25, 17 − 4                    |
| ME-8  | **Hunderterübergang**         | Plus: Z(a) + Z(b) + Übertrag aus den Einern (0 oder 1, ME-7) ist mindestens 10. Minus: Z(a) minus Übertrag aus den Einern ist kleiner als Z(b).                          | 85 + 47, 370 + 250, 400 − 150, 623 − 458    | 420 + 130, 37 + 48, 580 − 230      |
| ME-9  | **Hürde**                     | Zehnerübergang (ME-4, ME-5) oder Hunderterübergang (ME-8). Trivial geht vor: Eine triviale Aufgabe hat nie eine Hürde. „Am vollen Zehner“ allein ist **keine** Hürde.    | 8 + 7, 13 − 6, 370 + 250                    | 7 + 3, 20 − 7, 34 + 25, 9 + 1      |
| ME-10 | **Form** einer Zahl           | 0: `N`. 1–9: `E`. 10, 20 … 90: `Z`. übrige 11–99: `ZE`. 100, 200 … 900: `H`. übrige volle Zehner 110–990: `HZ`. übrige 101–999: `HZE`. Ab 1000: `T` mit der Stellenzahl. | 7 → E, 40 → Z, 37 → ZE, 250 → HZ, 623 → HZE | –                                  |
| ME-11 | **Sonderfaktor**, Mal/Geteilt | Der Faktor, der nicht die Reihe ist (bei Geteilt das Ergebnis), ist 0, 1 oder 10; sonst „keiner“.                                                                        | 6 · 0 → 0, 7 : 7 → 1                        | 7 · 8 → keiner                     |

Kontrollrechnungen zu ME-8: 85 + 47: Einer 5 + 7 = 12 (Übertrag 1), Zehner
8 + 4 + 1 = 13, also Hunderterübergang. 370 + 250: Einer 0, Zehner 7 + 5 = 12.
400 − 150: Einer 0 − 0, Zehner 0 < 5. 623 − 458: Einer 3 < 8 (Übertrag 1),
Zehner 2 − 1 = 1 < 5. 420 + 130: Zehner 2 + 3 = 5. 580 − 230: Zehner 8 ≥ 3.

Bei Lückenaufgaben gelten die Merkmale der vollständigen Aufgabe
(`task.source`). Hat eine Aufgabe eine negative Zahl, eine Kommazahl oder ist
sie ein gemischter Term, liefert die Merkmalsfunktion `null`.

### 3.2 Teil B: Generator (GW)

Gilt für eine Runde mit `n` Aufgaben, davon `m` Plus- und Minusaufgaben.

| Nr.  | Regel                                                                                                                                                                                                                                                                       | Beispiel                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| GW-1 | **Hürde:** Mindestens ⌈m / 2⌉ der Plus- und Minusaufgaben haben eine Hürde (ME-9).                                                                                                                                                                                          | 10 Aufgaben Plus/Minus: mindestens 5. 7: mindestens 4.                                  |
| GW-2 | **Trivial:** Höchstens ⌊n · 0,05⌋ Aufgaben der Runde dürfen trivial sein.                                                                                                                                                                                                   | 10 Aufgaben: keine. 20: höchstens 1. 50: höchstens 2.                                   |
| GW-3 | **Ablauf:** Die Rechenart je Aufgabe wird wie heute gezogen. Dann werden ⌈m / 2⌉ Plus/Minus-Plätze zufällig als „Hürde“ bestimmt, ⌊n · 0,05⌋ der übrigen Plätze als „frei“, alle anderen als „nicht trivial“. Je Platz werden die Zahlen gezogen, bis sie zum Platz passen. | –                                                                                       |
| GW-4 | **Nie strenger werfen als heute:** Findet ein Platz in 200 Versuchen keine passende Aufgabe, wird er „nicht trivial“; findet er auch dann keine, wird er „frei“ und läuft durch den heutigen Code samt dessen Rückfall.                                                     | Zahlen 0–10: Plus mit Übergang gibt es nicht; die Plätze werden „nicht trivial“.        |
| GW-5 | **Ohne Merkmale keine Quote:** Ist `minValue` kleiner als 0 oder sind negative Ergebnisse erlaubt, gilt nur GW-2 (über die Zahlen 0 und 1); GW-1 entfällt.                                                                                                                  | Zahlen −20 bis 20.                                                                      |
| GW-6 | **Einstellungen gehen vor:** Zahlenraum, Null-Regeln, Reihen, Lücken und eindeutige Lücken (`isGapUnique`) gelten unverändert und zusätzlich.                                                                                                                               | Nur die Zehnerreihe gewählt: alle Aufgaben sind trivial; nach GW-4 kommen sie trotzdem. |
| GW-7 | **Keine Aufgabe doppelt in einer Runde** (gleiche Zahlen, gleiche Rechenart, gleiche Lücke), solange es in 20 Versuchen eine andere gibt.                                                                                                                                   | –                                                                                       |
| GW-8 | **Einschalten:** Die Gewichtung ist ein eigener Schalter am Aufruf (`mix: "hurdle"`), kein Feld der Übungsoptionen. Ohne Schalter erzeugt der Generator genau wie heute.                                                                                                    | Wer einschaltet, steht in Abschnitt 5.2.                                                |

Was „passt“ je Platz:

| Platz         | Plus, Minus                        | Mal, Geteilt               |
| ------------- | ---------------------------------- | -------------------------- |
| Hürde         | ME-9 ist erfüllt                   | kommt nicht vor            |
| nicht trivial | nicht trivial (ME-1)               | nicht trivial (ME-2, ME-3) |
| frei          | alles, was die Einstellung erlaubt | alles                      |

Erwartung im Standard (Plus und Minus, 0 bis 20, 10 Aufgaben): in **jeder**
Runde mindestens 5 Aufgaben mit Zehnerübergang und keine triviale. Im
Zahlenraum 0 bis 20 gibt es 36 Plus- und 36 Minusaufgaben mit Übergang (z. B.
2 + 9 bis 9 + 9; 11 − 2 bis 18 − 9); deshalb GW-7.

### 3.3 Teil C: Fehlerarten (FK)

Reihenfolge der Prüfung; die erste passende Regel gewinnt. Neu oder geändert
sind FK-4, FK-5, FK-7, FK-8.

| Nr.   | Kennung                        | Bezeichnung in der CSV | Regel                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FK-1  | `sign`                         | Vorzeichen             | unverändert                                                                                                                                                                                                                                                               |
| FK-2  | `digit-swap`                   | Zahlendreher           | unverändert                                                                                                                                                                                                                                                               |
| FK-3  | `place-value`, `decimal-point` | Stellenwert, Komma     | unverändert                                                                                                                                                                                                                                                               |
| FK-4  | `zero-rule` **neu**            | Null-Regel             | Aufgabe ohne Lücke mit einer 0. Mal: ein Faktor ist 0, der andere `k` ist nicht 0, Antwort `k`. Plus: ein Summand ist 0, der andere nicht, Antwort 0. Minus: `k − 0`, Antwort 0. Geteilt: `0 : k`, Antwort `k`.                                                           |
| FK-5  | `smaller-from-larger` **neu**  | kleiner von größer     | Minus mit ganzen Zahlen ab 0 und einem Übertrag (ME-7 oder ME-8). Die Antwort ist die Zahl aus den stellenweisen Abständen (je Stelle größere minus kleinere Ziffer). Gilt **nicht**, wenn die Antwort um genau 10 oder 100 neben der Lösung liegt (dann FK-7 oder FK-8). |
| FK-6  | `operation-mix`                | Rechenart verwechselt  | unverändert, kommt aber nach FK-4 und FK-5.                                                                                                                                                                                                                               |
| FK-7  | `tens-bridge` **geändert**     | Zehnerübergang         | Plus oder Minus, Antwort um genau 10 daneben **und** die Aufgabe hat einen Übertrag an den Einern (ME-7). Ohne Übertrag: weiter zur nächsten Regel.                                                                                                                       |
| FK-8  | `hundreds-bridge` **neu**      | Hunderterübergang      | Plus oder Minus, Antwort um genau 100 daneben **und** die Aufgabe hat einen Hunderterübergang (ME-8).                                                                                                                                                                     |
| FK-9  | `off-by-one`                   | um eins daneben        | unverändert                                                                                                                                                                                                                                                               |
| FK-10 | `neighbor-fact`                | Nachbaraufgabe         | unverändert                                                                                                                                                                                                                                                               |
| –     | `unknown`                      | (leere Zelle)          | alles andere                                                                                                                                                                                                                                                              |

Prüftabelle (jede Zeile wird ein Testfall; „heute“ ist am Code nachvollzogen):

| Nr. | Aufgabe   | Antwort | Lösung | Heute                 | Neu                   | Warum                                                                                              |
| --- | --------- | ------- | ------ | --------------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| P1  | 34 + 25   | 69      | 59     | Zehnerübergang        | (leer)                | 4 + 5 = 9, kein Übertrag.                                                                          |
| P2  | 14 + 3    | 7       | 17     | Zehnerübergang        | (leer)                | kein Übertrag.                                                                                     |
| P3  | 37 + 48   | 75      | 85     | Zehnerübergang        | Zehnerübergang        | 7 + 8 = 15, Übertrag vergessen.                                                                    |
| P4  | 37 + 48   | 95      | 85     | Zehnerübergang        | Zehnerübergang        | Übertrag doppelt gezählt.                                                                          |
| P5  | 8 + 7     | 5       | 15     | Zehnerübergang        | Zehnerübergang        | Übertrag vergessen.                                                                                |
| P6  | 26 + 4    | 20      | 30     | Zehnerübergang        | Zehnerübergang        | am vollen Zehner, Übertrag nach ME-7.                                                              |
| P7  | 30 − 4    | 36      | 26     | Zehnerübergang        | Zehnerübergang        | Übertrag nach ME-7.                                                                                |
| P8  | 53 − 27   | 36      | 26     | Zehnerübergang        | Zehnerübergang        | Zehner nicht entbündelt.                                                                           |
| P9  | 53 − 27   | 34      | 26     | (leer)                | kleiner von größer    | 5 − 2 = 3, 7 − 3 = 4.                                                                              |
| P10 | 623 − 458 | 235     | 165    | (leer)                | kleiner von größer    | 6 − 4 = 2, 5 − 2 = 3, 8 − 3 = 5.                                                                   |
| P11 | 52 − 27   | 35      | 25     | Zehnerübergang        | Zehnerübergang        | Auch stellenweise ergibt sich 35; um 10 daneben geht vor (FK-5).                                   |
| P12 | 400 − 150 | 350     | 250    | (leer)                | Hunderterübergang     | Auch stellenweise ergibt sich 350; um 100 daneben geht vor (FK-5).                                 |
| P13 | 85 + 47   | 32      | 132    | (leer)                | Hunderterübergang     | Übertrag in den Hunderter vergessen.                                                               |
| P14 | 370 + 250 | 520     | 620    | (leer)                | Hunderterübergang     | 7 + 5 = 12.                                                                                        |
| P15 | 420 + 130 | 650     | 550    | (leer)                | (leer)                | 2 + 3 = 5, kein Hunderterübergang.                                                                 |
| P16 | 6 · 0     | 6       | 0      | Rechenart verwechselt | Null-Regel            | FK-4 vor FK-6.                                                                                     |
| P17 | 0 · 9     | 9       | 0      | Rechenart verwechselt | Null-Regel            |                                                                                                    |
| P18 | 6 + 0     | 0       | 6      | Rechenart verwechselt | Null-Regel            |                                                                                                    |
| P19 | 6 − 0     | 0       | 6      | Rechenart verwechselt | Null-Regel            |                                                                                                    |
| P20 | 0 : 5     | 5       | 0      | Rechenart verwechselt | Null-Regel            |                                                                                                    |
| P21 | 6 · 0     | 60      | 0      | (leer)                | (leer)                | keine Regel passt.                                                                                 |
| P22 | 6 · 1     | 7       | 6      | um eins daneben       | um eins daneben       | unverändert.                                                                                       |
| P23 | 8 + 5     | 40      | 13     | Rechenart verwechselt | Rechenart verwechselt | 8 · 5; unverändert.                                                                                |
| P24 | 20 − 7    | 27      | 13     | Rechenart verwechselt | Rechenart verwechselt | 20 + 7; FK-5 ergäbe 27 auch (2 − 0, 7 − 0), aber 20 − 7 hat nur „am vollen Zehner“. Siehe Hinweis. |
| P25 | 45 + 23   | 86      | 68     | Zahlendreher          | Zahlendreher          | unverändert.                                                                                       |
| P26 | 13 − 6    | 8       | 7      | um eins daneben       | um eins daneben       | unverändert.                                                                                       |
| P27 | 7 · 8     | 49      | 56     | Nachbaraufgabe        | Nachbaraufgabe        | unverändert.                                                                                       |

Hinweis zu P24: 20 − 7 hat nach ME-7 einen Übertrag, und stellenweise ergibt
sich 27. Damit träfe FK-5 vor FK-6. Beide Deutungen sind plausibel
(„7 − 0 = 7“ oder „plus statt minus“). Festlegung (**Vorschlag**): Liefert
FK-5 dieselbe Zahl wie eine andere Rechenart mit denselben Zahlen, gilt
„Rechenart verwechselt“. Im Code: FK-5 greift nur, wenn die Antwort in
`otherResults(…)` nicht vorkommt.

### 3.4 Teil D: Nachübung (NU)

| Nr.  | Regel                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NU-1 | **Plus, Minus:** Neue Aufgaben haben dieselbe Rechenart, dieselbe Lückenposition (wie heute), dieselbe Form beider Zahlen (ME-10) und dieselben Übergänge (Zehnerübergang ja/nein, am vollen Zehner ja/nein, Hunderterübergang ja/nein) wie die Fehleraufgabe. |
| NU-2 | **Zahlenraum der Nachübung** ist die Stufe der Fehleraufgabe nach ihren Zahlen (SI-1): bis 20, bis 100, bis 1000, sonst die Einstellung des Postens.                                                                                                           |
| NU-3 | **Mal, Geteilt:** dieselbe Reihe wie heute. Hat die Fehleraufgabe keinen Sonderfaktor (ME-11), haben die neuen Aufgaben auch keinen. Hat sie einen (0, 1 oder 10), behalten die neuen Aufgaben ihn; die Reihe ist dann frei aus den Reihen der Einstellung.    |
| NU-4 | **Stufenweiser Rückfall:** Finden sich in 200 Versuchen nicht genug Aufgaben, entfällt zuerst die Form, dann der Übergang; zuletzt gilt das heutige Verhalten. Eine Nachübung kommt immer zustande.                                                            |
| NU-5 | **Keine neue Aufgabe gleicht der Fehleraufgabe** oder einer anderen neuen Aufgabe desselben Postens, solange es Auswahl gibt.                                                                                                                                  |
| NU-6 | Anzahl der Posten (5), Anzahl der neuen Aufgaben, die Fehleraufgabe am Anfang (`includeOriginal`) und `practiceKey` bleiben, wie sie sind.                                                                                                                     |
| NU-7 | Aufgaben ohne Merkmale (negativ, Komma, gemischter Term) laufen wie heute.                                                                                                                                                                                     |

Prüftabelle:

| Nr. | Fehleraufgabe | Form und Merkmal                     | Passende Nachübung (Beispiele)  | Passt nicht              |
| --- | ------------- | ------------------------------------ | ------------------------------- | ------------------------ |
| N1  | 8 + 7         | E + E, Zehnerübergang, bis 20        | 6 + 9, 7 + 5, 9 + 4             | 3 + 5, 7 + 3, 13 + 4     |
| N2  | 13 − 6        | ZE − E, Zehnerübergang, bis 20       | 15 − 8, 12 − 5, 14 − 9          | 17 − 4, 43 − 6, 20 − 7   |
| N3  | 34 + 8        | ZE + E, Zehnerübergang, bis 100      | 47 + 6, 58 + 5, 29 + 4          | 34 + 5, 37 + 48          |
| N4  | 37 + 48       | ZE + ZE, Zehnerübergang, bis 100     | 26 + 57, 48 + 39, 15 + 68       | 21 + 43, 34 + 8, 85 + 47 |
| N5  | 53 − 27       | ZE − ZE, Zehnerübergang, bis 100     | 62 − 35, 81 − 46, 74 − 28       | 58 − 23, 53 − 7          |
| N6  | 30 − 4        | Z − E, am vollen Zehner, bis 100     | 50 − 7, 80 − 3, 40 − 6          | 32 − 7, 38 − 4           |
| N7  | 370 + 250     | HZ + HZ, Hunderterübergang, bis 1000 | 480 + 360, 290 + 150, 560 + 270 | 420 + 130, 375 + 250     |
| N8  | 7 · 8         | Reihe 7, kein Sonderfaktor           | 7 · 6, 9 · 7, 7 · 4             | 7 · 1, 7 · 10, 0 · 7     |
| N9  | 56 : 7        | Reihe 7, kein Sonderfaktor           | 42 : 7, 63 : 7, 28 : 7          | 7 : 7, 70 : 7, 0 : 7     |
| N10 | 6 · 0         | Sonderfaktor 0, Reihe frei           | 4 · 0, 0 · 9, 7 · 0             | 6 · 3                    |

### 3.5 Teil E: „Sicher“ (SI)

| Nr.  | Regel                                                                                                                                                                                                                                                                                                                                                   | Beispiel                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| SI-1 | **Familie nach den Zahlen:** Für Plus und Minus bestimmt die größte Zahl der Aufgabe (beide Zahlen und das Ergebnis, als Betrag) die Stufe: bis 20, bis 100, bis 1000, darüber. Lässt sich die Aufgabe nicht lesen, gilt wie heute die Einstellung. Mal und Geteilt bleiben bei der Reihe. Das **Format** des Schlüssels bleibt (`add:normal:bis-100`). | 3 + 4 aus einer Runde „bis 100“ gehört zu „Plus bis 20“. 37 + 48 zu „bis 100“. 370 + 250 zu „bis 1000“.                                              |
| SI-2 | **Triviale Aufgaben zählen nicht als sichere Aufgabe.** Sie zählen weiter als geübt.                                                                                                                                                                                                                                                                    | 5 + 0, 6 + 1, 7 · 1, 10 · 4 füllen die fünf sicheren Aufgaben nicht.                                                                                 |
| SI-3 | **Plus und Minus brauchen die Hürde:** Unter den sicheren Aufgaben der Familie sind mindestens 3 mit Hürde (ME-9).                                                                                                                                                                                                                                      | „Plus bis 100“ mit 34 + 25, 41 + 6, 52 + 30, 20 + 15, 61 + 8 ist **nicht** sicher. Mit 37 + 48, 34 + 8 und 56 + 27 statt dreien davon ist es sicher. |
| SI-4 | **Mal und Geteilt:** nur SI-2. Keine weitere Bedingung.                                                                                                                                                                                                                                                                                                 | Reihe 7 mit 7 · 3, 7 · 4, 7 · 6, 7 · 8, 7 · 9 ist sicher (wenn Tage und Box stimmen).                                                                |
| SI-5 | **Ohne Merkmale keine Hürde:** Hat keine geübte Aufgabe der Familie Merkmale (nur negative Zahlen oder Kommazahlen), entfällt SI-3.                                                                                                                                                                                                                     | –                                                                                                                                                    |
| SI-6 | **Die übrigen Bedingungen bleiben:** mindestens 5 sichere Aufgaben (`COMPETENCE_MIN_SAFE_OBJECTS`), an mindestens 2 Tagen, kein offener Posten unter Box 3.                                                                                                                                                                                             | –                                                                                                                                                    |
| SI-7 | **Was dem Kind fehlt**, sagt „Mein Stand“ in einem Satz: neuer Grund `hurdle` mit dem Text „Rechne noch Aufgaben über den Zehner.“                                                                                                                                                                                                                      | –                                                                                                                                                    |

Folge, die man kennen muss: „Sicher“ ist eine Projektion. Nach dem Update
werden alle Familien neu berechnet. Eine Familie kann von „sicher“ auf „im
Aufbau“ fallen, und Aufgaben wandern in eine andere Stufe (SI-1). Es wird
nichts gelöscht und nichts migriert.

## 4. Datenformat und tolerantes Lesen

**Kein Format ändert sich.**

- Lernereignisse: `math: { task, options, answer }` bleibt. `mathOptionsSchema`
  ist `.strict()`; deshalb ist `mix` **kein** Feld der Optionen, sondern ein
  eigener Parameter des Aufrufs (GW-8). Ein neues Feld in den Optionen ließe
  ältere Software die Ereignisse ablehnen.
- Merkmale werden nie gespeichert. Sie werden jedes Mal aus `task.source`
  berechnet. Alte Ereignisse bekommen sie damit von selbst.
- Der Familienschlüssel behält sein Format. Gespeicherte Tagesportionen
  (`dailyPlans`) tragen ihn im Feld `key` (`mathematics:<Familie>`); erledigt
  wird ein Element über `objectIds`, nicht über den Schlüssel. Ein Plan von
  heute mit einem alten Schlüssel bleibt deshalb abschließbar (Testfall 33).
- Fehlerart: nur eine Zeichenkette in der CSV, die auf dem Lehrergerät
  entsteht (`src/integrations/laufdiktat/teacher-results.ts`). Kein Feld am
  Server, keine Migration. Der Typ `MentalMathErrorKind` bekommt drei Werte
  dazu; er wird nirgends gespeichert (vor dem Bau mit `grep` bestätigen).
- Live-Raum: Die Aufgaben entstehen auf dem Lehrergerät und gehen wie heute
  als Zeilen in den Raum. Kein Protokoll ändert sich.
- Tolerantes Lesen: Die Merkmalsfunktion liefert `null` für alles, was sie
  nicht versteht, und wirft nie. Jede Regel dieses Plans behandelt `null` als
  „ohne Merkmal“.

## 5. Abläufe

### 5.1 Merkmale (Teil A)

Neue Datei `src/domain/mental-math-features.ts`, rein, ohne Zufall:

```ts
export type MathNumberForm =
  "N" | "E" | "Z" | "ZE" | "H" | "HZ" | "HZE" | `T${number}`;

export type MathTaskFeatures = {
  trivial: boolean;
  /** ME-4, ME-5 */
  tensBridge: boolean;
  /** ME-6 */
  fullTen: boolean;
  /** ME-8 */
  hundredsBridge: boolean;
  /** ME-9 */
  hurdle: boolean;
  /** ME-10, bei Mal und Geteilt nicht genutzt */
  leftForm: MathNumberForm;
  rightForm: MathNumberForm;
  /** ME-11, nur Mal und Geteilt */
  specialFactor: 0 | 1 | 10 | null;
};

/** `null` bei negativen Zahlen, Kommazahlen und gemischten Termen. */
export function mathTaskFeatures(
  expression: MentalMathExpression,
): MathTaskFeatures | null;

/** Liest `task.source`; `null`, wenn es kein einfacher Term ist. */
export function mathFeaturesOfTask(
  task: MentalMathTask,
): MathTaskFeatures | null;

/** NU-1, NU-3: dieselbe Form und dieselben Übergänge. */
export function sameMathShape(
  a: MathTaskFeatures,
  b: MathTaskFeatures,
  level: "form-and-bridge" | "bridge",
): boolean;
```

### 5.2 Generator (Teil B)

1. `generateMentalMathTasks(options, random, extra?)` bekommt einen dritten
   Parameter `extra?: { mix?: "uniform" | "hurdle"; accept?: (features) => boolean }`.
   Ohne `extra` läuft der heutige Code unverändert (gleiche Folge von
   Zufallszahlen, alle bestehenden Tests bleiben grün).
2. Mit `mix: "hurdle"`: Ablauf nach GW-3 bis GW-7. `generateOperands` hat
   schon einen Parameter `accept`; die Platzbedingung wird mit der
   Lückenbedingung per UND verbunden.
3. Wer einschaltet:

   | Aufrufer                                                                 | Schalter                                                           |
   | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
   | Freies Üben, `createTasks` in `app/frei/mathematics/mental-math-app.tsx` | `mix: "hurdle"`                                                    |
   | Live-Raum, `generateMentalMathSource` in `teacher-session.ts`            | `mix: "hurdle"`, wenn `count` mindestens 4 ist                     |
   | Eine Zeile neu würfeln, `generateSingleMathLine`                         | kein Schalter (eine einzelne Aufgabe hätte sonst immer eine Hürde) |
   | Nachübung, `buildMathReviewRound`                                        | `accept` nach NU-1 bis NU-4, kein `mix`                            |
   | Startpunkt, `buildMathStartPoint` in `src/domain/start-point.ts`         | kein Schalter (MA-4 ist ein eigener Schritt, Frage F-4)            |

### 5.3 Fehlerarten und Tipps (Teil C)

1. `classifyMentalMathError` in der Reihenfolge der Tabelle 3.3.
2. `MENTAL_MATH_ERROR_LABELS` bekommt die drei Bezeichnungen.
3. `mentalMathHint` bekommt drei Fälle (der `switch` ist erschöpfend;
   TypeScript meldet fehlende Fälle). Texte, ohne Ergebnis und ohne
   Fehlerart (C4-2):

   | Fehlerart               | Tipp für das Kind                                                                                                                                     |
   | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `zero-rule`, Mal        | „Denk an die Null: Was bleibt, wenn du eine Zahl null mal nimmst?“                                                                                    |
   | `zero-rule`, Geteilt    | „Denk an die Null: Was bekommt jeder, wenn es nichts zu verteilen gibt?“                                                                              |
   | `zero-rule`, Plus/Minus | „Denk an die Null: Was ändert sich, wenn nichts dazukommt oder weggeht?“                                                                              |
   | `smaller-from-larger`   | der vorhandene `bridgeHint`; wenn er nichts liefert: „Zieh immer die zweite Zahl von der ersten ab. Reichen die Einer nicht, nimm einen Zehner dazu.“ |
   | `hundreds-bridge`       | „Achte auf den Hunderter: Rechne in zwei Schritten über den vollen Hunderter.“                                                                        |

4. Bei Lückenaufgaben bleibt der bestehende Tipp („Setze deine Zahl in die
   Lücke …“).
5. Wo die Fehlerart jetzt `unknown` ist (P1, P2), gibt es nach C4-4 keinen
   Tipp mehr; der Lösungsweg bleibt.

### 5.4 Nachübung (Teil D)

In `buildMathReviewRound` (`src/domain/math-practice.ts`), je Posten:

1. Merkmale der Fehleraufgabe lesen. `null`: heutiger Weg (NU-7).
2. `maxValue` nach NU-2 bestimmen.
3. Erzeugen mit `accept: (f) => sameMathShape(original, f, "form-and-bridge")`.
4. Reicht es nicht: noch einmal mit `"bridge"`, dann ohne `accept` (NU-4).
5. Doppelte entfernen (NU-5) und auf die bisherige Anzahl kürzen.

### 5.5 „Sicher“ (Teil E)

1. `mathFamilyKey` (`src/domain/math-practice.ts`): Stufe nach SI-1.
2. `mathEntries` (`src/domain/competence-profile.ts`): `MathFamilyData`
   bekommt `hurdleTasks: Set<string>` und `featured: boolean`. Ein sauberes
   Ereignis trägt seine `learningObjectId` nur dann in `cleanTasks` ein, wenn
   die Aufgabe nicht trivial ist (SI-2), und zusätzlich in `hurdleTasks`,
   wenn sie eine Hürde hat. Achtung: In der Nachübung zählt eine neue Aufgabe
   über `practiceKey` auf den Posten der Fehleraufgabe; maßgeblich sind die
   Merkmale der **beantworteten** Aufgabe (`event.math.task`).
3. `mathEntry`: neuer Grund `"hurdle"` in `CompetenceMissing`, wenn die
   Familie Plus oder Minus ist, `featured` gilt und `hurdleTasks.size < 3`
   (`COMPETENCE_MIN_HURDLE_OBJECTS = 3`).
4. `app/views/diagnostik/profile-copy.ts`: Text für `hurdle` in
   `MATH_MISSING` (SI-7).

## 6. Barrierefreiheit und Design

Es entsteht **keine neue Ansicht und kein neues Bedienelement**.

- Tipps erscheinen im vorhandenen Hinweisbereich des Kopfrechnens
  (`app/frei/mathematics/mental-math-app.tsx`, Aufruf von `mentalMathHint`);
  dessen `aria-live`-Verhalten bleibt.
- Der Satz in „Mein Stand“ läuft durch `competenceExplanation`
  (`app/views/diagnostik/profile-copy.ts`) und die vorhandene Zeile.
- Wortwahl: Die Texte nutzen kein Wort aus `src/domain/child-glossary.ts`
  („Zahlenraum“, „fällig“ …) und bleiben bei höchstens etwa 10 Wörtern je
  Satz (`docs/design/README.md`). `child-glossary.test.ts` prüft die
  Schüleransichten; die neuen Tipps stehen in der Domain und sind deshalb
  zusätzlich von Hand zu prüfen.
- Die Fehlerart erscheint weiter nie in der Oberfläche (C4-1, C4-5).
- Der Designvergleich ist nicht betroffen (keine Änderung an Ansichten).

## 7. Freigabestufe

Kein neuer Bereich. Der Bereich „Kopfrechnen“ (`/frei/mathematics`) steht in
`src/domain/release.ts` auf `frei` und bleibt es.

Begründung: Der Plan korrigiert Fachlogik ohne neue Oberfläche und ohne
Datenänderung, wie die Korrekturen der Wortboxen vom 14.11.2026. Ein
Schalter im Freigaberegister passt nicht, weil Familie und „sicher“ in der
Domain berechnet werden, die das Register nicht kennt. Der Generator ist
über `mix` an genau drei Stellen eingeschaltet und dort in einer Zeile
abschaltbar. **Vorschlag**, siehe F-5.

## 8. Betroffene Dateien

| Datei                                            | Änderung                                                                                                                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/mental-math-features.ts`             | **Neu** (Ablauf 5.1). Importiert nur Typen und `parseMentalMathExpression` aus `mental-math.ts`; kein Import in die Gegenrichtung, außer über den Parameter `accept` (sonst entsteht ein Kreis).                                       |
| `src/domain/mental-math-features.test.ts`        | **Neu.** Fälle 1 bis 9.                                                                                                                                                                                                                |
| `src/domain/mental-math.ts`                      | Dritter Parameter `extra` an `generateMentalMathTasks`; Platzlogik GW-3 bis GW-7. Die Datei hat 909 Zeilen: Die Platzlogik kommt in eine neue Datei `src/domain/mental-math-mix.ts`, die `generateOperands` nutzt (dafür exportieren). |
| `src/domain/mental-math-mix.test.ts`             | **Neu.** Fälle 10 bis 18.                                                                                                                                                                                                              |
| `src/domain/mental-math-feedback.ts`             | Fehlerarten, Bezeichnungen, Tipps (Ablauf 5.3). Kopfkommentar von `classifyMentalMathError` an die neue Reihenfolge anpassen.                                                                                                          |
| `src/domain/mental-math-feedback.test.ts`        | Prüftabelle P1 bis P27 als `it.each`; Fälle 19 bis 23.                                                                                                                                                                                 |
| `src/domain/math-practice.ts`                    | `mathFamilyKey` nach SI-1; `buildMathReviewRound` nach Ablauf 5.4.                                                                                                                                                                     |
| `src/domain/math-practice.test.ts`               | Prüftabelle N1 bis N10; Fälle 24 bis 28.                                                                                                                                                                                               |
| `src/domain/competence-profile.ts`               | Ablauf 5.5, Punkte 2 und 3.                                                                                                                                                                                                            |
| `src/domain/competence-profile.test.ts`          | Fälle 29 bis 34 (Datei suchen; falls die Mathe-Fälle woanders liegen, dort ergänzen).                                                                                                                                                  |
| `app/views/diagnostik/profile-copy.ts` (+ Test)  | Text für `hurdle`.                                                                                                                                                                                                                     |
| `app/frei/mathematics/mental-math-app.tsx`       | `createTasks` übergibt `{ mix: "hurdle" }`. Sonst nichts.                                                                                                                                                                              |
| `src/integrations/laufdiktat/teacher-session.ts` | `generateMentalMathSource` übergibt `mix: "hurdle"` ab 4 Aufgaben.                                                                                                                                                                     |
| `e2e/math-practice.spec.ts`                      | Fälle 35 bis 37.                                                                                                                                                                                                                       |
| `docs/inhalte/kopfrechnen.md`                    | **Neu.** Die Tabellen 3.1 bis 3.5 als Inhaltsbeschreibung für die fachliche Prüfung, mit Vermerk „ungeprüft“ bis zur Durchsicht durch den Entwickler; in `docs/inhalte/README.md` verlinken.                                           |
| Dieser Plan                                      | Am Ende „Umgesetzt“ mit Datum und Abweichungen.                                                                                                                                                                                        |

**Nicht anfassen:** `mathOptionsSchema`, `mathTaskSchema`,
`learningEventV1Schema`, `src/domain/spaced-repetition.ts`, `mathReviews`,
`src/domain/start-point.ts`, `supabase/`.

## 9. Testfälle

### Unit (Vitest), Domain

Merkmale (`mental-math-features.test.ts`):

1. Jede Zeile „Ja“ und „Nein“ aus Tabelle 3.1 als `it.each` (ME-1 bis ME-9).
2. Form (ME-10): 0 → N, 7 → E, 40 → Z, 37 → ZE, 300 → H, 250 → HZ, 623 → HZE,
   1000 → T4, 25 000 → T5.
3. Die Kontrollrechnungen zu ME-8 (sechs Aufgaben).
4. Trivial geht vor: 9 + 1 und 10 · 4 haben `hurdle: false`.
5. Sonderfaktor (ME-11): 6 · 0 → 0, 0 · 6 → 0, 7 : 7 → 1, 70 : 7 → 10,
   7 · 8 → `null`.
6. `null` bei −3 + 5, 2,5 + 1 und einem gemischten Term; die Funktion wirft
   nie (Eigenschaftstest mit `fast-check` über ganze Zahlen von −1000 bis
   100 000).
7. Lückenaufgabe: Merkmale der vollständigen Aufgabe (`_ + 7 = 15` wie
   8 + 7).
8. Eigenschaft: Für Plus mit a, b ≥ 0 gilt `tensBridge` genau dann, wenn
   `(a % 10) + (b % 10) > 10`; `tensBridge` und `fullTen` sind nie beide
   wahr.
9. `sameMathShape`: 37 + 48 und 26 + 57 gleich; 37 + 48 und 34 + 8 gleich nur
   auf der Stufe `"bridge"`; 37 + 48 und 21 + 43 nie.

Generator (`mental-math-mix.test.ts`), Zufall aus einem festen Startwert:

10. **Ohne Schalter unverändert:** Für 20 feste Zufallsfolgen liefert
    `generateMentalMathTasks(options, random)` dieselben Aufgaben wie vor der
    Änderung (Erwartung als feste Liste im Test, vor dem Umbau aufgenommen).
11. **Messung D7:** Standard (Plus und Minus, 0 bis 20, 10 Aufgaben), 1000
    Runden: in **jeder** Runde mindestens 5 Aufgaben mit Hürde und 0 triviale.
12. 0 bis 100 und 0 bis 1000, je 1000 Runden zu 10 Aufgaben: GW-1 und GW-2
    in jeder Runde.
13. Alle vier Rechenarten, 20 Aufgaben, 1000 Runden: höchstens 1 triviale
    Aufgabe je Runde; mindestens die Hälfte der Plus- und Minusaufgaben mit
    Hürde.
14. 50 Aufgaben: höchstens 2 triviale.
15. Zahlen 0 bis 10 (keine Hürde bei Plus möglich): wirft nicht, keine
    triviale Aufgabe.
16. Nur Zehnerreihe gewählt, nur Mal: wirft nicht, liefert 10 Aufgaben.
17. `minValue: −20`: wirft nicht; GW-1 wird nicht verlangt.
18. Lückenmodus mit fester Position: GW-1 und GW-2 gelten, jede Lücke ist
    eindeutig (`isGapUnique`); keine Aufgabe doppelt (GW-7) in 1000 Runden im
    Zahlenraum 0 bis 100.

Fehlerarten (`mental-math-feedback.test.ts`):

19. Prüftabelle P1 bis P27 als `it.each` (Spalte „Neu“).
20. Bestehende Tests bleiben grün. Schlägt einer fehl, weil er das alte
    Verhalten von P1 oder P16 festhält: nicht still ändern, sondern im Commit
    und im Abschnitt „Umgesetzt“ nennen, mit Verweis auf FK-4 und FK-7.
21. Jede neue Fehlerart hat eine Bezeichnung und einen Tipp; kein Tipp
    enthält die Lösung der Aufgabe als Zahl (Schleife über P1 bis P27).
22. Lückenaufgaben: FK-4 und FK-5 greifen nicht.
23. `unknown` liefert weiter keinen Tipp (C4-4).

Nachübung und Familie (`math-practice.test.ts`):

24. Prüftabelle N1 bis N10: Für jede Fehleraufgabe erfüllen alle neuen
    Aufgaben aus 200 Läufen `sameMathShape(…, "form-and-bridge")` bzw. bei
    Mal und Geteilt NU-3; keine gleicht der Fehleraufgabe.
25. NU-2: Fehleraufgabe 13 − 6 mit Einstellung „bis 100“: alle neuen Aufgaben
    liegen im Zahlenraum bis 20.
26. NU-4: Fehleraufgabe 99 + 99 bei Zahlen bis 198 (es gibt keine zweite
    Aufgabe ZE + ZE mit Zehner- und Hunderterübergang, die nicht dieselbe
    wäre und im Zahlenraum bleibt, außer wenigen wie 98 + 99): Die Runde kommt
    zustande und wirft nicht. Zusätzlich mit einer Bedingung, die alles
    ablehnt (Testhilfe): Ergebnis wie vor der Änderung.
27. Negative Zahlen und gemischter Term: Ergebnis wie vor der Änderung.
28. SI-1: `mathFamilyKey` für 3 + 4 mit `maxValue: 100` ist
    `add:normal:bis-20`; 37 + 48 → `bis-100`; 370 + 250 → `bis-1000`;
    7 · 8 unverändert `multiply:normal:reihe-7`; nicht lesbare Aufgabe: Stufe
    aus der Einstellung.

„Sicher“ (`competence-profile.test.ts`):

29. Fünf saubere Aufgaben ohne Hürde an zwei Tagen („Plus bis 100“): „im
    Aufbau“ mit Grund `hurdle`.
30. Dieselbe Familie mit drei Aufgaben mit Hürde: „sicher“.
31. Fünf saubere triviale Aufgaben (5 + 0, 6 + 1 …): `safe` ist 0, Grund
    `breadth`.
32. Reihe 7 mit fünf nicht trivialen Aufgaben: „sicher“; mit 7 · 0, 7 · 1,
    7 · 10 und zwei weiteren: nicht sicher.
33. Tagesportion: Ein gespeicherter Plan mit einem Element
    `mathematics:add:normal:bis-100` und passenden `objectIds` gilt nach
    einem Ereignis zu diesen `objectIds` als erledigt, auch wenn die Aufgabe
    jetzt zu „bis 20“ gehört (Test in `src/storage/daily-plan.test.ts`).
34. Familie nur mit negativen Zahlen: SI-3 entfällt (Verhalten wie vorher).

### Playwright (`e2e/math-practice.spec.ts`)

Import aus `./fixtures`, axe über `analyzeAccessibility`. Die Aufgaben sind
zufällig: Die Tests lesen die Aufgabe vom Bildschirm und rechnen selbst.

35. **Runde mit Hürde:** Standardrunde starten, alle 10 Aufgaben lesen und
    richtig lösen. Mindestens 5 haben einen Zehnerübergang, keine enthält 0
    oder 1 als Zahl.
36. **Tipp bei der Null-Regel:** Nur Mal, Reihe wählen, so lange „Neue
    Aufgaben“ bzw. Runden starten, bis eine Aufgabe mit 0 erscheint, ist
    wegen GW-2 unzuverlässig. Deshalb über **eigene Aufgaben**, falls das
    freie Üben sie anbietet; sonst entfällt dieser Fall im Browser und bleibt
    Unit-Test 21. Vor dem Bau prüfen und hier vermerken.
37. **„Mein Stand“:** Nach einer Runde ohne Fehler zeigt „Mein Stand“
    (`/lernen/profil`) die Familie „Plus bis 20“ bzw. „Minus bis 20“ als „im
    Aufbau“; axe ohne Befund. (Der Satz zu `hurdle` ist Unit-Test, weil er
    eine gezielte Vorgeschichte braucht.)

## 10. Prüfbefehle

Wenn `node_modules` fehlt, zuerst `npm ci`.

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:render
npx playwright test e2e/math-practice.spec.ts e2e/diagnostik.spec.ts e2e/learner-profile.spec.ts --project=desktop-chromium --project=mobile-chrome --trace off
```

Während der Arbeit gezielt:
`npx vitest run src/domain/mental-math src/domain/math-practice src/domain/competence-profile src/storage/daily-plan`.
Wenn der Raumdienst lokal konfiguriert ist, zusätzlich `npm run test:e2e:live`
(Kopfrechnen im Live-Raum nutzt denselben Generator). Nach dem Push GitHub
Actions nicht abfragen (`AGENTS.md`).

## 11. Fallstricke und was nicht passieren darf

- **`mix` nie in `MathOptions` oder in ein Ereignis schreiben.** Das Schema
  ist `.strict()`.
- **Ohne Schalter bleibt der Generator bytegleich** (Test 10). Der Startpunkt
  und alle bestehenden Tests hängen an der heutigen Folge der Zufallszahlen.
- **Nie werfen, wo heute nicht geworfen wird** (GW-4, NU-4). Eine Runde oder
  Nachübung, die nicht zustande kommt, ist schlimmer als eine ohne Quote.
- **Keine Endlosschleife:** Jede Suche hat eine feste Obergrenze (200 bzw. 20
  Versuche).
- **Die Quote gilt je Runde, nicht nur im Mittel.** Ein Test, der nur den
  Durchschnitt über 1000 Runden prüft, übersieht Runden ohne Hürde.
- **„Am vollen Zehner“ ist keine Hürde** (7 + 3, 20 − 7), zählt aber als
  Übertrag für die Fehlerart (ME-7). Beides nicht verwechseln.
- **Trivial geht vor Hürde.** 9 + 1 ist trivial, nicht „am vollen Zehner“.
- **Reihenfolge der Fehlerarten** genau nach Tabelle 3.3. FK-4 und FK-5
  müssen vor `operation-mix` stehen; FK-5 weicht bei ±10, ±100 und bei einer
  anderen Rechenart (P24).
- **Die Fehlerart nie dem Kind zeigen** und nie an den Server senden.
- **Tipps verraten kein Ergebnis.**
- **Familienschlüssel: Format nicht ändern.** `mathFamilyLabel`, die
  Tagesportion und die Empfehlungen (`src/storage/learning-recommendations.ts`)
  lesen es.
- **Bestehende Tests nicht still anpassen** (`AGENTS.md`). Betroffen sein
  können Tests zu `tens-bridge` ohne echten Übergang, zu 6 · 0 und zu
  `mathFamilyKey` mit `maxValue`. Jede Änderung einzeln begründen.
- **Kein Kreis-Import** zwischen `mental-math.ts` und den neuen Dateien
  (ESLint prüft Abhängigkeiten; `docs/umsetzungsplan-abhaengigkeiten.md`).
- **Fachlogik bleibt framework-frei** (`src/domain/` ohne React).
- **Nicht committen:** `public/sw.js`, `public/version.json`.

## 12. Reihenfolge der Umsetzung

Jeder Schritt ist für sich grün und wird einzeln committet und gepusht.

1. **Merkmale:** `mental-math-features.ts` mit Tests 1 bis 9. Nichts nutzt
   sie.
2. **Fehlerarten:** Tabelle 3.3, Tipps, Tests 19 bis 23. Sichtbar nur in CSV
   und Tipp.
3. **Generator:** Test 10 zuerst (hält das alte Verhalten fest), dann
   `mental-math-mix.ts`, Tests 11 bis 18. Noch nirgends eingeschaltet.
4. **Einschalten:** freies Üben und Live-Raum; Playwright 35.
5. **Nachübung:** Ablauf 5.4, Tests 24 bis 27.
6. **Familie nach Zahlen:** SI-1, Tests 28 und 33.
7. **„Sicher“:** SI-2 bis SI-7, Tests 29 bis 32, 34; Playwright 37.
8. **Doku:** `docs/inhalte/kopfrechnen.md`, Abschnitt „Umgesetzt“ hier.
9. **Nach Bestätigung:** Entscheidungsvorlage E-1 ins Protokoll.

Die Schritte 2, 3 und 5 bis 7 brauchen nur Schritt 1. Wer unterbrochen wird,
hinterlässt nach jedem Schritt einen lauffähigen Stand.

## 13. Fragen an den Entwickler

| Nr. | Frage                                                                                                                  | Empfehlung                                                                                                                          | Alternative und ihre Folge                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| F-1 | Zählen 7 + 3 und 20 − 7 („am vollen Zehner“) als Zehnerübergang für die Quote von 50 %?                                | Nein (ME-9). Sie sind eine eigene, leichtere Stufe und kommen unter den übrigen Aufgaben vor.                                       | Ja: Die Quote wird leichter erfüllt; in einer Runde bis 20 könnten dann die Hälfte der Aufgaben Ergänzungen zur 10 sein.                   |
| F-2 | Ist „trivial“ richtig gefasst (0 oder 1 als Zahl, Faktor 10, Ergebnis 0 bei Minus, bei Geteilt Ergebnis 0, 1 oder 10)? | Ja, wie Tabelle 3.1.                                                                                                                | Nur 0 und 1: Dann bleiben 10 · 4 und 70 : 7 häufig.                                                                                        |
| F-3 | Darf eine Familie nach dem Update von „sicher“ auf „im Aufbau“ zurückfallen?                                           | Ja. Es ist die ehrlichere Aussage, und es geht nichts verloren. In der Beta sind wenige Kinder betroffen.                           | Stichtag: Die neue Regel gälte nur für neue Familien. Das braucht gespeicherten Zustand und widerspricht der Projektion (Entscheidung 20). |
| F-4 | Soll auch der Startpunkt Mathe die Gewichtung bekommen?                                                                | Noch nicht. MA-4 (feste Aufgaben je Stufe) ist der richtige Weg und ein eigener Schritt.                                            | Jetzt einschalten: eine Zeile, aber zwei zufällige Aufgaben je Stufe bleiben zu wenig.                                                     |
| F-5 | Ohne Vorschau direkt in den freien Bereich?                                                                            | Ja. Es ist eine fachliche Korrektur ohne neue Oberfläche. Vor dem Merge eine Woche in der eigenen Klasse über einen Vorschau-Build. | Schalter im Freigaberegister nur für den Generator im freien Üben; Familie und „sicher“ lassen sich so nicht schalten.                     |
| F-6 | Eigene Quoten für Verdoppeln, Fast-Verdoppeln, Kern- und Nachbaraufgaben (MA-1, zweiter Teil)?                         | Später, nach der Erprobung der Hürde. Erst sehen, wie sich 50 % Übergang im Unterricht anfühlen.                                    | Jetzt: braucht eine größere Typentabelle und deine Prüfung jeder Quote.                                                                    |
| F-7 | 34 + 25 = 69 (um 10 daneben, ohne Übergang): leere Zelle in der CSV, kein Tipp?                                        | Ja. Eine leere Zelle ist ehrlicher als ein geratener Name (so steht es schon im Code).                                              | Neue Fehlerart „Zehner verrechnet“ mit dem Tipp „Rechne zuerst die Zehner, dann die Einer.“ Kleiner Zusatz.                                |
| F-8 | Sind die Tipps zur Null-Regel recht (Fragen statt Regelsatz, damit das Ergebnis nicht dasteht)?                        | Ja, wie Abschnitt 5.3.                                                                                                              | Regelsatz („Mal null ist immer null.“): klarer, verrät aber das Ergebnis und widerspricht C4-2.                                            |
| F-9 | Für „sicher“ bei Plus und Minus: 3 von 5 sicheren Aufgaben mit Hürde?                                                  | Ja (Bericht 22, MA-5).                                                                                                              | Alle 5 mit Hürde: strenger, dauert länger.                                                                                                 |
