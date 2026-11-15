# Umsetzungsplan LernBox: mischbare Fragearten und Zuordnen in zwei Spalten

Stand: 15.11.2026. Grundlage: Entscheidung des Entwicklers vom 15.11.2026
(`obsidian-export/Lernplattform/25 - Vision/Roadmap.md`, Etappe 1, „LernBox wie
Quizlet“). Baut auf `docs/umsetzungsplan-lernbox-lernformen.md` auf (umgesetzt
als Vorschau, Regeln LF-1 bis LF-8).

Dieser Plan ist ein Bauplan für eine Person ohne Vorwissen. Geprüft am Code
des Standes `b79f61e`. Festlegungen mit dem Vermerk **Vorschlag** soll der
Entwickler bestätigen (Abschnitt 13). Bis dahin gelten sie als Arbeitsstand.

## 1. Ziel und Abgrenzung

**Fragearten mischen.** Im Start-Fenster wählt das Kind eine, zwei oder drei
Fragearten: **Schreiben**, **Mündlich** (aufdecken und selbst bewerten) und
**Auswahl** (bis zu vier Antworten). Mehrere Fragearten wechseln sich in
derselben Runde Karte für Karte ab. Jede Frageart behält ihre Wirkung auf die
Boxen. Die zuletzt gewählte Mischung merkt sich das Gerät.

**Der „Test“ geht darin auf.** Die Lernform „Test“ (Vorschau seit 14.11.2026)
entfällt als eigener Knopf und als eigene Ansicht. Ihre Auswahlfrage lebt als
Frageart „Auswahl“ in der normalen Runde weiter.

**Zuordnen bleibt ein eigenes Spiel** für ein Kind, neu mit zwei Spalten: links
die Vorderseiten, rechts die Rückseiten, jede Spalte für sich gemischt,
höchstens 6 Paare je Runde.

Nicht Teil dieses Plans:

- Ein neues Lernereignis-Format, neue Tabellen, Änderungen an Sicherung oder
  Abgleich.
- Auswahl und Zuordnen für „Heute dran“, „Meine Fehler“ und „Box üben“
  (Begründung in FA-11).
- Uhr, Bestzeit, Punkte, Sterne, Rangliste.
- Gruppen-Memory oder Zuordnen-Duell im Live-Raum (Roadmap, „Später“).
- Eine Liste „Das üben wir noch“ am Ende der Runde (Frage F-4).
- Eine Begrenzung der Rundengröße. Die Runde nimmt die Karten wie heute
  (`startSession` in `app/components/learning-box-app.tsx`).

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 15.11.2026: `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`
(Entscheidungen 1 bis 76) und `Entscheidungsindex.md`, gesucht nach Lernform,
Test, Auswahl, Zuordnen, Mündlich, Selbsteinschätzung, Fälligkeit,
Tagesportion, Uhr, Punkte, Vorlesen.

| Entscheidung                                                         | Inhalt                                                                                                                                                                                                                                                                   | Folge für diesen Plan                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 20, 57 (Leitner aus Ereignissen)                                     | Der Kartenstand muss sich aus den Ereignissen nachspielen lassen. Kein Aufstieg vor der Fälligkeit, nur der erste Versuch je Runde zählt.                                                                                                                                | Schreiben und Mündlich laufen weiter nur über `processLearningBoxResult` und `putCardAndEvent`. Auswahl schreibt nichts (FA-5).                                                                                                            |
| 23 (LernBox-Sitzung)                                                 | Aufdecken ist ein schwächerer Nachweis als Schreiben.                                                                                                                                                                                                                    | Wiedererkennen (Auswahl, Zuordnen) ist noch schwächer und ändert keine Box (FA-5, ZU-1).                                                                                                                                                   |
| 24, 26 (integrieren statt nachbauen)                                 | Keine zweite Wiederholungslogik.                                                                                                                                                                                                                                         | Die Mischung ist eine Eigenschaft der bestehenden Runde, kein zweiter Rundenablauf. Der Sonderweg des Tests (LF-4, LF-5) entfällt.                                                                                                         |
| 57 (Tagesportion)                                                    | Ein Element der Portion ist erledigt, sobald ein Ereignis dazu vorliegt (`src/domain/daily-plan.ts`).                                                                                                                                                                    | Auswahl erzeugt kein Ereignis und würde „Heute dran“ nie abschließen. Deshalb dort keine Auswahl (FA-11).                                                                                                                                  |
| 57, Ergänzung 26.10.; 64                                             | Selbsteinschätzung hebt höchstens bis Box 3; ein Stapel wird mündlich nicht „sicher“.                                                                                                                                                                                    | Gilt unverändert für jede mündliche Frage der Mischung (FA-4). Der Hinweis im Start-Fenster bleibt.                                                                                                                                        |
| 58 (Vorlesen nur in der Aufgabe)                                     | Kein Vorlese-Knopf auf Start- und Einstellungsblättern.                                                                                                                                                                                                                  | Im Start-Fenster kommt keiner dazu. Der Knopf an der Fragekarte bleibt, auch bei Auswahlfragen.                                                                                                                                            |
| 37 mit G6, 66, 70; Vault 23                                          | „Genauigkeit vor Geschwindigkeit“; Tempo höchstens für die ganze Klasse.                                                                                                                                                                                                 | Zuordnen bleibt ohne Uhr und ohne Bestzeit (ZU-6).                                                                                                                                                                                         |
| 39, 47 (Belohnung aus, Freigaberegister)                             | Belohnungssysteme sind gebaut, aber aus. Jeder Bereich hat eine Stufe.                                                                                                                                                                                                   | Keine Sterne. Alles bleibt im Bereich `lernbox-lernformen`, Stufe `vorschau` (Abschnitt 7).                                                                                                                                                |
| Plan Lernformen, LF-1 bis LF-8 und V-1–V-9; Antworten vom 15.11.2026 | Umgesetzt. Am 15.11.2026 („Nach dem Testen“, `docs/vision/01-planung.md`) hat der Entwickler entschieden: Rückmeldung im Test erst am Ende, wie umgesetzt (Nr. 1); `lernbox-lernformen` sofort auf `frei` (Nr. 2); vorerst keine Sterne (Nr. 3). **Nicht im Protokoll.** | Dieser Plan ersetzt LF-3 bis LF-7. **Zwei Punkte stehen in Spannung zu den Antworten vom selben Tag:** FA-10 (sofortige Rückmeldung) zu Nr. 1 und der Wegfall des Tests zu Nr. 2. Siehe Fragen F-3 und F-9; ohne Antwort gilt Abschnitt 7. |
| Vision „Keine Diagnose, kein Test“                                   | Lernraum misst nicht.                                                                                                                                                                                                                                                    | Mit dem Wegfall des Namens „Test“ erledigt sich Vorschlag V-7.                                                                                                                                                                             |

Ergebnis: **Kein Widerspruch zu einer Entscheidung im Protokoll.** Es gibt aber
eine Umkehr gegenüber dem gebauten Stand: Die Lernform „Test“ wird
zurückgenommen, bevor sie ins Protokoll kam. Nach `AGENTS.md` gehört das mit
„Zurückgenommen“ und „Nicht wieder einbauen“ ins Protokoll.

### Entscheidungsvorlage E-1 (Entwurf für das Protokoll, Nummer vergibt der Entwickler)

> **LernBox: mischbare Fragearten, Zuordnen in zwei Spalten – 15. November 2026**
>
> **Beschlossen:** Eine LernBox-Runde mischt bis zu drei Fragearten Karte für
> Karte: Schreiben, Mündlich und Auswahl. Schreiben wirkt wie der
> Schreibmodus, Mündlich hebt höchstens bis Box 3, Auswahl ändert nichts.
> Zuordnen ist ein eigenes Spiel mit zwei Spalten und höchstens 6 Paaren je
> Runde; es ändert nichts. Regeln FA-1 bis FA-15 und ZU-1 bis ZU-8 in
> `docs/umsetzungsplan-lernbox-fragearten.md`.
>
> **Zurückgenommen:** die Lernform „Test“ (`docs/umsetzungsplan-lernbox-lernformen.md`,
> Vorschau vom 14.11.2026) mit ihren Sonderregeln: LF-5 (eine Schreibfrage vor
> dem Termin ändert auch bei einem Fehler nichts), Rückmeldung erst am Ende
> (V-3), „Diese Karten jetzt üben“ (LF-7) und das Raster aus gemischten
> Kacheln beim Zuordnen.
>
> **Begründung:** Entscheidung des Entwicklers vom 15.11.2026. Eine Runde mit
> wählbaren Fragearten ersetzt den Test und braucht keine eigene Regel neben
> dem Schreibmodus (Entscheidung 24).
>
> **Nicht wieder einbauen:** einen eigenen Test-Modus neben den Fragearten;
> Auswahlfragen oder Zuordnen, die eine Box oder einen Termin ändern; eine
> Schreibfrage mit milderer Wirkung als der Schreibmodus.

## 3. Regeltabellen

Gelesen dazu: `src/domain/spaced-repetition.ts` (`REPETITION_RULES.lernbox`,
K-1 bis K-8), `src/domain/learning-box.ts` (`processLearningBoxResult`,
`LEARNING_BOX_SELF_CHECK_MAX_BOX`), `src/domain/daily-plan.ts`,
`app/components/learning-box-app.tsx`.

### 3.1 Fragearten

Kennungen im Code: `writing`, `oral`, `choice`.

| Nr.   | Regel                                                                                                                                                                                                                                                                                                                                      | Begründung                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FA-1  | Das Kind wählt **eine, zwei oder drei** Fragearten. Die letzte gewählte lässt sich nicht abwählen.                                                                                                                                                                                                                                         | Entscheidung vom 15.11.2026.                                                                                                                       |
| FA-2  | **Gemischt wird Karte für Karte:** Jeder Eintrag der Runde (Karte und Richtung) bekommt genau eine Frageart. Die gewählten Arten sind gleichmäßig verteilt (Anzahlen unterscheiden sich höchstens um 1, vor FA-8), die Reihenfolge ist zufällig.                                                                                           | „Mehrere werden Karte für Karte gemischt.“                                                                                                         |
| FA-3  | **Schreiben wirkt genau wie der Schreibmodus:** `processLearningBoxResult` mit `mode: "writing"`, gespeichert mit `putCardAndEvent` und der `roundId` der Runde. Auch ein Fehler vor dem Termin setzt auf Box 1 (K-4), wie heute im Schreibmodus.                                                                                          | Entscheidung vom 15.11.2026; kein Sonderweg (Entscheidung 24). **Ersetzt LF-4 und LF-5.**                                                          |
| FA-4  | **Mündlich wirkt genau wie der mündliche Modus:** `mode: "oral"`, Aufstieg höchstens bis Box 3 (`LEARNING_BOX_SELF_CHECK_MAX_BOX`).                                                                                                                                                                                                        | Entscheidungen 57 und 64.                                                                                                                          |
| FA-5  | **Auswahl ändert nichts:** keine Box, kein Termin, kein Lernereignis, kein Schreibzugriff, weder bei richtiger noch bei falscher Antwort.                                                                                                                                                                                                  | Wiedererkennen ist kein freier Abruf; Ratewahrscheinlichkeit 25 %. Wie LF-3.                                                                       |
| FA-6  | **Jede Karte kommt in der Runde eines Stapels genau einmal vor** (eine Frage, eine Richtung, eine Frageart). In „Heute dran“ kann eine Karte wie bisher vorwärts und rückwärts vorkommen; das bestimmt die Tagesportion.                                                                                                                   | Entscheidung vom 15.11.2026; `buildQueue` und `buildPlanQueue` bleiben.                                                                            |
| FA-7  | **Lösungsschutz:** Keine Antwort einer Auswahlfrage (richtige oder falsche) darf eine gültige Schreibweise der Lösung einer **späteren** Schreib- oder mündlichen Frage derselben Runde sein. Verglichen wird mit `answerKeys(…, { compatibility: true })`, unabhängig von der Richtung.                                                   | „Die Lösung einer Schreibfrage darf nie vorher als Auswahlantwort sichtbar sein.“ Für mündliche Fragen gilt dasselbe, weil auch sie Boxen bewegen. |
| FA-8  | **Ersatz:** Verletzt die richtige Antwort einer Auswahlfrage FA-7 oder findet sich kein einziger zulässiger Ablenker, wird die Frage zur Schreibfrage, wenn Schreiben gewählt ist, sonst zur mündlichen Frage. Ist nur Auswahl gewählt, entfällt die Karte aus der Runde. Bleibt keine Karte, gibt es keine Runde (Meldung in Ablauf 5.2). | Es darf nie eine Auswahlfrage mit nur einer Antwort geben. Mit 1 oder 2 Ablenkern hat die Frage 2 oder 3 Antworten (wie bisher).                   |
| FA-9  | **Nur der erste Versuch zählt** (K-3): unverändert über `attempted`. Auch Auswahlfragen tragen ihren Schlüssel ein, damit die Zählung der Runde stimmt.                                                                                                                                                                                    | Regel C3-1.                                                                                                                                        |
| FA-10 | **Rückmeldung sofort nach jeder Frage:** Schreiben wie bisher. Auswahl zeigt dieselbe Rückmeldekarte mit „Box n bleibt · nur geübt“. Mündlich geht wie bisher ohne Karte weiter.                                                                                                                                                           | Der Test zeigte das Ergebnis erst am Ende (V-3). In einer Lernrunde ist die sofortige Rückmeldung der Normalfall. **Vorschlag**, siehe F-3.        |
| FA-11 | **Wo es welche Frageart gibt:** siehe Tabelle 3.2.                                                                                                                                                                                                                                                                                         | „Heute dran“ und „Meine Fehler“ müssen ihre Wirkung behalten.                                                                                      |
| FA-12 | **Die zuletzt gestartete Mischung wird gemerkt** (je Gerät, Abschnitt 4.2). Fragearten, die ein Start-Fenster nicht anbietet, werden dort nur ausgeblendet, nicht aus dem Gemerkten gelöscht.                                                                                                                                              | Entscheidung vom 15.11.2026. Ein Start von „Heute dran“ soll die Mischung für Stapel nicht verändern.                                              |
| FA-13 | **Ablenker** sind Lösungen anderer Karten **desselben Stapels wie die gefragte Karte** in derselben Richtung. Es gelten die bisherigen Ausschlüsse (`pickDistractors`): gleiche Frage, Schreibweise wäre auch richtig, Schreibweise schon unter den Antworten. Neu dazu kommt FA-7.                                                        | Gleiche Sprache und gleicher Stoff; die geprüfte Logik bleibt.                                                                                     |
| FA-14 | **Auswahl gibt es ab 4 Karten im Stapel** (`LEARNING_BOX_FORM_MIN_CARDS`).                                                                                                                                                                                                                                                                 | Wie LF-8.                                                                                                                                          |
| FA-15 | **Ohne Freigabe bleibt alles wie heute:** Ist der Bereich `lernbox-lernformen` nicht sichtbar, zeigt das Start-Fenster „Schreiben“ und „Mündlich“ als Einfachwahl, ohne Auswahl und ohne Zuordnen.                                                                                                                                         | Die LernBox ist `frei` und im Schulbetrieb. Neues trifft kein Kind ungefragt.                                                                      |

Folgen, die man kennen muss:

- Eine Karte, die heute dran ist und eine Auswahlfrage bekommt, bleibt dran.
  Der Stapel wird mit Auswahl allein nie „erledigt“. Das ist gewollt; das
  Start-Fenster sagt es (Ablauf 5.1, Hinweiszeile).
- Der Test stellte höchstens 10 Fragen. Die Runde hat keine solche Grenze
  (Frage F-5).
- Im Schreibmodus eines Stapels kommen zuerst die Karten, die heute dran
  sind; gibt es keine, kommen alle. Ein Fehler stuft dann auch eine Karte
  zurück, die noch nicht dran war. Das ist das bestehende Verhalten und gilt
  jetzt auch für Schreibfragen in der Mischung (FA-3).

### 3.2 Angebot je Start-Fenster

| Start (`scope`)                | Schreiben | Mündlich | Auswahl | Zuordnen | Begründung                                                                                                                               |
| ------------------------------ | --------- | -------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Stapel mit mindestens 4 Karten | ja        | ja       | ja      | ja       | –                                                                                                                                        |
| Stapel mit 1 bis 3 Karten      | ja        | ja       | nein    | nein     | FA-14, ZU-7.                                                                                                                             |
| „Heute dran“ (`heute`)         | ja        | ja       | nein    | nein     | Ein Element der Portion ist erst mit einem Ereignis erledigt. Auswahl und Zuordnen erzeugen keines; „X von 20“ bliebe stehen.            |
| „Meine Fehler“ (`errors`)      | ja        | ja       | nein    | nein     | Ein Fehler schließt sich nur durch einen Abruf (K-7). Wiedererkennen ließe die Karte in „Meine Fehler“ stehen. **Vorschlag**, siehe F-1. |
| „Box üben“ (`box:<n>`)         | ja        | ja       | nein    | nein     | Die Runde ist ohnehin „nur üben“. Auswahl dort wäre harmlos, bringt aber Karten vieler Stapel zusammen. **Vorschlag**, siehe F-2.        |

Schreiben und Mündlich dürfen überall gemischt werden: Beide gibt es dort
schon heute, beide wirken über den Kern, beide erzeugen ein Ereignis. Die
Leitner-Wirkung von „Heute dran“ und „Meine Fehler“ bleibt damit vollständig
erhalten.

### 3.3 Zuordnen

| Nr.  | Regel                                                                                                                                                                                                           | Begründung                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ZU-1 | **Zuordnen ändert nichts** (LF-1) und macht keine Karte früher dran (LF-2).                                                                                                                                     | Unverändert.                                                                             |
| ZU-2 | **Zwei Spalten:** links die Vorderseiten (`side: "term"`), rechts die Rückseiten (`side: "meaning"`). Jede Spalte ist für sich gemischt. Höchstens 6 Paare je Runde (`MATCH_PAIRS_PER_ROUND`).                  | Entscheidung vom 15.11.2026.                                                             |
| ZU-3 | **Ein Zug** besteht aus einer Kachel je Spalte, in beliebiger Reihenfolge. Gehören beide zur selben Karte, ist das Paar gefunden. Sonst ist es ein Fehlversuch; beide Kacheln bleiben liegen.                   | Wie bisher.                                                                              |
| ZU-4 | **Zweite Kachel in derselben Spalte: Die Wahl wechselt** auf diese Kachel. Das ist kein Fehlversuch. Dieselbe Kachel noch einmal: Wahl aufgehoben.                                                              | Bisher zählten zwei Kacheln derselben Seite als Fehlversuch. In Spalten wäre das unfair. |
| ZU-5 | **Gefundene Kacheln** verschwinden; ihr Platz bleibt leer, damit nichts springt.                                                                                                                                | Wie bisher.                                                                              |
| ZU-6 | **Keine Uhr, keine Bestzeit, keine Punkte, keine Sterne.** Kein automatischer Rundenwechsel.                                                                                                                    | Entscheidungen 37/G6, 39, 70.                                                            |
| ZU-7 | **Angebot** nur im Start-Fenster eines Stapels mit mindestens 4 Karten, als eigener Knopf neben der Runde.                                                                                                      | „Zuordnen bleibt ein eigenes Spiel.“                                                     |
| ZU-8 | **Rundenzahl und Kartenwahl unverändert:** höchstens 3 Runden (`MATCH_MAX_ROUNDS`), gleichmäßig verteilt, Karten mit gleichem Begriff oder gleicher Bedeutung entfallen (`pickMatchCards`). **Vorschlag**, F-6. | Die Entscheidung nennt nur die Paare je Runde.                                           |

## 4. Datenformat und tolerantes Lesen

### 4.1 Lernereignisse und Karten

**Keine Formatänderung.** Schreib- und mündliche Fragen erzeugen dieselben
Ereignisse wie heute (`mode: "writing"` bzw. `"oral"`). Auswahl und Zuordnen
schreiben nichts. `LearningBoxMode` bleibt `"oral" | "writing"`; `choice` ist
kein Wert für Ereignisse oder für `processLearningBoxResult`. Sicherung,
Abgleich und Nachspielen (`src/domain/learning-box-replay.ts`) bleiben
unverändert.

### 4.2 Gemerkte Mischung

- Ort: `localStorage`, Schlüssel `lernraum-lernbox-fragearten`, Wert ein
  JSON-Array, z. B. `["writing","choice"]`.
- Lesen (tolerant): Kein Eintrag, kein JSON, kein Array oder kein bekannter
  Wert ergibt `["writing"]`. Unbekannte Werte und Doppelte entfallen. Die
  Reihenfolge wird normalisiert (`writing`, `oral`, `choice`).
- Schreiben: beim Start einer Runde, nicht beim Antippen im Start-Fenster.
  Geschrieben wird die Wahl des Kindes, verbunden mit den nicht angebotenen
  gemerkten Arten (FA-12). Beispiel: gemerkt `["writing","choice"]`, Start von
  „Heute dran“ mit Schreiben und Mündlich ergibt `["writing","oral","choice"]`.
- `localStorage` kann fehlen oder gesperrt sein: `try`/`catch` wie in
  `app/components/use-textbox-layout.ts`; dann gilt die Wahl nur, bis die
  Seite neu lädt.
- Die Mischung ist eine Einstellung des Geräts, kein Lernstand. Sie gehört
  nicht in die Sicherung und nicht in den Abgleich.
- Prüfen: Räumt der Gastmodus beim Beenden `localStorage` ab
  (`src/storage/guest-mode.ts`)? Wenn er eine Liste von Schlüsseln führt,
  kommt der neue Schlüssel dazu.

### 4.3 Zwischenstand der Runde („Weitermachen“)

Heute (`src/domain/learning-box-snapshot.ts`): ein `mode` für die ganze
Runde, `queue` aus `{ cardId, direction }`.

Neu:

```ts
const kind = z.enum(["writing", "oral", "choice"]);
// im Schema
mode: z.enum(["oral", "writing", "mixed"]),
queue: z.array(
  z.object({ cardId, direction, kind: kind.optional() }),
),
// zusätzliche Prüfung (refine): bei mode "mixed" trägt jeder Eintrag `kind`
```

| Nr.  | Regel                                                                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ZS-1 | **Einheitliche Runde (nur Schreiben oder nur Mündlich): genau das bisherige Format**, `mode` wie bisher, kein `kind` an den Einträgen. Ältere Software setzt diese Runde wie bisher fort.                                                                 |
| ZS-2 | **Jede andere Runde** (zwei oder drei Arten, oder nur Auswahl): `mode: "mixed"` und `kind` an jedem Eintrag.                                                                                                                                              |
| ZS-3 | **Ältere Software** kennt `"mixed"` nicht. Ihr Schema lehnt den Zwischenstand ab und bietet kein „Weitermachen“ an (`parseRoundSnapshot` liefert `null`). Das ist gewollt: lieber kein Angebot als eine Auswahlfrage, die als Schreibfrage gewertet wird. |
| ZS-4 | **Neue Software liest alte Zwischenstände:** Fehlt `kind`, gilt `mode` für jeden Eintrag.                                                                                                                                                                 |
| ZS-5 | **Unbekannter Wert** in `kind` oder `mode`, oder `"mixed"` ohne `kind`: Der Zwischenstand gilt als nicht vorhanden. Kein Raten.                                                                                                                           |
| ZS-6 | **Antworten einer Auswahlfrage stehen nicht im Zwischenstand.** Beim Fortsetzen werden sie für die noch offenen Auswahlfragen neu gebildet (mit FA-7 und FA-13). Findet sich dann kein Ablenker mehr, entfällt der Eintrag wie eine gelöschte Karte.      |
| ZS-7 | `ROUND_SNAPSHOT_VERSION` in `src/domain/round-snapshot.ts` bleibt 1. Der Umschlag gilt für alle Module.                                                                                                                                                   |

### 4.4 Was vom „Test“ gespeichert ist

Geprüft: **nichts, das abgelöst werden müsste.**

- Der Test hat keinen Zwischenstand. `useRoundGuard` bekommt für Lernformen
  `resumable: false`; `learningBoxSnapshotSchema` kennt nur `oral` und
  `writing`.
- Seine Schreibantworten sind gewöhnliche Schreib-Ereignisse. Sie bleiben
  gültig.
- Die Wahl „Test“ wurde nie gemerkt; das Start-Fenster öffnete nie damit.
- Möglich ist ein Zwischenstand der Übungsrunde „Fehler aus dem Test (nur
  üben)“. Er ist eine normale Runde (`mode: "writing"`, `practice: true`) und
  lässt sich nach der Umstellung unverändert fortsetzen (ZS-4). Nichts zu tun.

## 5. Abläufe

### 5.1 Start-Fenster

Datei: `app/views/lernbox/parts/start-sheet.tsx`.

1. Das Kind tippt einen Stapel, „Heute dran“, „Meine Fehler“ oder eine Box an.
2. **Ohne Freigabe** (`formsVisible` nicht `true`): alles wie heute, aber
   ohne „Zuordnen“ und „Test“ (FA-15).
3. **Mit Freigabe:** Unter „Wie willst du üben?“ stehen die angebotenen
   Fragearten nach Tabelle 3.2 als Schalter (`button` mit `aria-pressed`, in
   der vorhandenen Gruppe `role="group"`). Mehrere dürfen gedrückt sein.
4. **Vorgabe:** die gemerkte Mischung, geschnitten mit dem Angebot. Bleibt
   nichts übrig, ist „Schreiben“ gedrückt.
5. **Letzte Frageart:** Tippt das Kind die einzige gedrückte Art an, bleibt
   sie gedrückt. Die Statuszeile (`role="status"`, von Anfang an im DOM) sagt:
   „Eine Frageart brauchst du mindestens.“
6. **Hinweiszeile** (Klasse `hint`), aus der Wahl zusammengesetzt:
   - Mündlich gewählt (nicht bei einer Box): „Mündlich zählt bis Box 3.
     Danach musst du schreiben.“ (besteht)
   - Auswahl gewählt: „Auswahl ist nur Üben. Dabei wird nichts verschoben.“
   - Mehr als eine Art gewählt: „Die Fragen wechseln sich ab.“
7. **Richtung:** wie bisher (entfällt nur bei „Heute dran“).
8. **„Los geht's“** ruft `onStart({ scope, kinds, direction })`.
9. **Zuordnen** (nur nach Tabelle 3.2): unter „Los geht's“ ein zweiter,
   schwächer gestalteter Knopf „Zuordnen spielen“ mit der Zeile „Finde die
   Paare. Nur üben, nichts wird verschoben.“ Er ruft
   `onStartForm({ scope, form: "match", direction })`.
10. Kein Vorlese-Knopf (Entscheidung 58).

Die Texte dürfen kein Wort aus `src/domain/child-glossary.ts` enthalten
(„fällig“, „Durchgang“ …); `child-glossary.test.ts` prüft das.

### 5.2 Runde mit gemischten Fragearten

Neue reine Funktionen in `src/domain/learning-box-question-kinds.ts`.

**Aufbau der Runde** (`planQuestionKinds`):

1. `startSession` bestimmt die Karten und Richtungen wie heute (`buildQueue`
   bzw. `buildPlanQueue`). Daran ändert sich nichts.
2. Fragearten normalisieren und mit dem Angebot des Start-Fensters schneiden
   (Tabelle 3.2). Die Anbindung prüft das noch einmal, nicht nur die Ansicht.
3. Eine Liste mit `n` Fragearten bilden: Art `i % k` für `i` von 0 bis
   `n − 1`, dann mischen (`shuffleLearningBoxItems`, Zufall von außen). Der
   Eintrag `i` der Runde bekommt die Art `i` der Liste (FA-2).
4. **Von hinten nach vorn** jede Auswahlfrage prüfen. So stehen die Arten der
   späteren Einträge schon fest:
   1. Geschützte Schlüssel sammeln: alle `answerKeys` der Lösungen der
      späteren Einträge mit Art `writing` oder `oral` (FA-7).
   2. Liegt ein Schlüssel der eigenen Lösung darin: Ersatz nach FA-8.
   3. Ablenker wählen wie `pickDistractors`, zusätzlich ohne Karten, deren
      Lösung einen geschützten Schlüssel hat. Kartenvorrat: alle Karten des
      Stapels der gefragten Karte.
   4. Kein Ablenker: Ersatz nach FA-8. Sonst Antworten mischen und mit dem
      Index der richtigen Antwort am Eintrag ablegen.
5. Ist die Runde danach leer (nur Auswahl gewählt, zu wenige verschiedene
   Karten): keine Runde, Meldung „Dafür sind zu wenige verschiedene Karten im
   Stapel.“ (`FORM_NOTICE_FEW_CARDS`).

**In der Runde** (`app/views/lernbox/parts/study.tsx`):

6. Kopfzeile: „{n} übrig · {Frageart}“ mit „Schreiben“, „Mündlich“ oder
   „Auswahl“ je Frage.
7. **Schreibfrage:** unverändert (Eingabe, „Prüfen“, Rückmeldung, „Weiter“).
8. **Mündliche Frage:** unverändert („Antwort zeigen“, „Nicht gewusst“ /
   „Gewusst“, dann sofort die nächste Frage).
9. **Auswahlfrage:** Fragekarte wie sonst, darunter die Antworten als
   Radiogruppe (`fieldset` mit `legend` „Welche Antwort stimmt?“, echte
   `input type="radio"`, Klassen `choiceList`, `choice`, `choiceInput`,
   `choiceOn` aus dem bisherigen Test). „Prüfen“ ist ohne Wahl gesperrt.
   Danach die Rückmeldekarte: „Gewusst“ oder „Nicht gewusst“, Frage, richtige
   Lösung, bei falscher Wahl „Du: …“ durchgestrichen, darunter „Box n bleibt ·
   nur geübt“ (das ist der vorhandene Zweig `feedback.practice`). Kein
   „Weiß ich nicht“.
10. **Wirkung** in `assess` (Anbindung): `kind` des Eintrags entscheidet.
    `writing` und `oral`: wie heute mit `mode` = `kind`. `choice`: weder
    `processLearningBoxResult` noch `putCardAndEvent`; Karte unverändert,
    Zählung und `attempted` wie sonst.
11. **Ende:** wie heute („x gewusst · y noch zu üben“). Hatte die Runde
    Auswahlfragen, steht darunter: „Auswahlfragen waren nur Üben.“
12. **Zwischenstand:** nach jeder bewerteten Antwort wie heute (`persist`),
    im Format aus Abschnitt 4.3.
13. **Fortsetzen:** `restoreLearningBoxQueue` liefert `kind` je Eintrag;
    danach bildet `buildChoiceOptions` die Antworten der offenen Auswahlfragen
    neu (ZS-6).

### 5.3 Zuordnen in zwei Spalten

Domain: `src/domain/learning-box-forms.ts`.

1. Kartenwahl und Runden wie bisher (`pickMatchCards`, `buildMatchRounds`).
2. Jede Runde liefert statt `tiles` zwei Listen: `left` (Vorderseiten) und
   `right` (Rückseiten), jede für sich gemischt. Ist die Reihenfolge beider
   Spalten zufällig gleich (jede Zeile wäre ein Paar) und hat die Runde mehr
   als ein Paar, wird die rechte Spalte um eine Stelle gedreht.
3. Spielzug nach ZU-3 und ZU-4 (`matchReducer`).
4. Über jeder Spalte steht eine Überschrift mit der Sprache der Seite aus dem
   Stapel (`frontLabel`, `backLabel`, z. B. „Deutsch“ und „Englisch“).
5. Rückmeldezeile, Rundenende, Spielende, „Noch einmal“ und Abbruch bleiben
   wie im Lernformen-Plan, Abschnitt 5.2, Punkte 5 bis 9.

### 5.4 Wegfall des Tests

1. `LbForm` wird `"match"`. Der Knopf „Test“ und seine Hinweiszeile entfallen.
2. `app/views/lernbox/parts/test.tsx` und `test.test.tsx` werden gelöscht.
   Die Radiogruppe zieht in `study.tsx` um.
3. Aus `src/domain/learning-box-forms.ts` entfallen `buildLearningBoxTest`,
   `gradeLearningBoxTestAnswer`, `learningBoxTestAnswerCounts`,
   `summarizeLearningBoxTest`, `TestQuestion`, `TestAnswer`, `TestSummary`,
   `TEST_MAX_QUESTIONS`. `pickDistractors` zieht in die neue Datei um;
   `TEST_CHOICES` heißt dort `CHOICE_OPTIONS`.
4. Aus `app/components/learning-box-forms.ts` entfallen `answer`, `settle`,
   `counted`, `pending` und alles zu `kind: "test"`. In
   `learning-box-app.tsx` entfallen `practiceMissed`, `startPractice`,
   `practiceBusy` und `leaveCount`.
5. Vor dem Löschen mit `grep` prüfen, dass nichts anderes die Namen nutzt.

## 6. Barrierefreiheit und Design

Vorlage und Regeln: `docs/design/README.md`. Alles liegt in
`app/views/lernbox/` mit `lernbox-screen.module.css`; nach jeder CSS-Änderung
`npm run css-types`, die erzeugte `.d.ts` wird committet. Keine festen
Farbwerte, nur die Farbrollen.

| Zweck                    | Bestehende Klasse oder Komponente                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Start-Fenster            | `Modal`, `segmentSheet`, `segmentWide`, `segOn`, `segOff`, `hint`, `field`, `fieldLabel`, `cta` |
| Runde, Kopf, Fortschritt | `study`, `studyHead`, `backSquare`, `progress`, `FormHead`, `FormProgress`                      |
| Fragekarte, Eingabe      | `card`, `cardHead`, `eyebrow`, `question`, `answerRow`, `answer`, `check`, `next`               |
| Auswahlantworten         | `choiceList`, `choice`, `choiceOn`, `choiceInput` (bisher im Test)                              |
| Rückmeldung              | `resultWrap`, `result`, `resultBad`, `resultGiven`, `resultNext`                                |
| Zuordnen                 | `matchTile`, `matchTileOn`, `matchTileWrong`, `matchGap`, `matchStatus`, `matchRoundDone`       |
| Symbole                  | `Icon` aus `app/ui/icons` (`check`, `close`, `back`, `speaker`)                                 |

Neu: `matchColumns` (Raster mit zwei gleich breiten Spalten, auch bei 320 px),
`matchColumn` (eine Spalte, Kacheln untereinander), `matchColumnTitle`,
`startSecondary` (Knopf „Zuordnen spielen“; vorher prüfen, ob es schon eine
passende Klasse für einen Nebenknopf gibt). `matchGrid` entfällt.

Anforderungen:

- **Schalter der Fragearten:** echte `button` mit `aria-pressed`. Der Zustand
  ist nicht nur Farbe: `segOn` hat schon eine andere Fläche; zusätzlich ein
  Häkchen-Symbol (`Icon name="check"`) vor dem Text der gedrückten Schalter.
- **Fokus bei jeder neuen Frage:** Schreibfrage im Eingabefeld (wie heute),
  mündliche Frage auf „Antwort zeigen“, Auswahlfrage auf der Frage-Überschrift
  (`tabIndex={-1}`), nicht auf einer Antwort, damit keine vorgewählt wirkt.
  Heute hängt der Fokus-Effekt an `study.mode`; er muss an Frage **und**
  Frageart hängen, sonst bleibt der Fokus beim Wechsel der Art liegen.
- **Rückmeldung:** Karte mit `role="status"` (besteht), Fokus auf „Weiter“.
- **Zuordnen, Semantik:** zwei Gruppen (`role="group"`) mit `aria-labelledby`
  auf ihre Überschrift. Kacheln bleiben `button` mit `aria-pressed`.
- **Zuordnen, Fokus:** Nach einem Paar bekommt die erste offene Kachel der
  **linken** Spalte den Fokus. Nach einem Fehlversuch bleibt er, wo er ist.
  Tab-Reihenfolge: erst die linke Spalte von oben nach unten, dann die rechte.
- **Touch-Ziele:** mindestens 44 × 44 px, Kacheln `min-height: 56px`. Bei
  320 px Breite stehen zwei Spalten nebeneinander; lange Texte umbrechen
  (`overflow-wrap: anywhere`). Kein waagerechter Überlauf (Projekt
  `minimum-width`).
- **Nicht nur Farbe:** gewählt = dicker Rahmen und `aria-pressed`; falsch =
  Kreuz-Symbol und gestrichelter Rahmen (besteht).
- **Bewegung:** keine neue Animation. Falls doch, unter
  `@media (prefers-reduced-motion: reduce)` abschalten.
- **Lösung nicht verraten:** kein `data-correct`, keine Kartenkennung an
  Auswahlantworten oder Kacheln.

## 7. Freigabestufe

Der Bereich `lernbox-lernformen` in `src/domain/release.ts` bleibt. Seine
Stufe wird in diesem Plan **nicht** geändert: Sie bleibt, wie sie beim Bau
steht (der Entwickler hat am 15.11.2026 `frei` entschieden; im Stand `b79f61e`
steht noch `vorschau`). Nur die Beschriftung ändert sich. Steht der Bereich
auf `frei`, ersetzt der Umbau den Test mit dem Merge für alle Kinder
(Frage F-9). Im Beispiel steht die Stufe des geprüften Standes:

```ts
"lernbox-lernformen": {
  label: "LernBox: Fragearten mischen und Zuordnen",
  // Kein eigener Pfad: schaltet die Fragearten und „Zuordnen“ im Start-Fenster
  // (docs/umsetzungsplan-lernbox-fragearten.md).
  routes: [],
  stage: "vorschau",
},
```

Die Kennung bleibt, damit ein gesetztes `LERNRAUM_FREIGABE` weiter gilt. Die
Tabelle im `README.md` zwischen `<!-- freigabe:start -->` und
`<!-- freigabe:end -->` neu erzeugen (`releaseStagesMarkdown()`), sonst
schlägt `src/domain/release-docs.test.ts` fehl. Die Stufe ändert nur der
Entwickler.

## 8. Betroffene Dateien

| Datei                                                     | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/learning-box-question-kinds.ts`               | **Neu.** `LearningBoxQuestionKind`, `LEARNING_BOX_QUESTION_KINDS`, `CHOICE_OPTIONS = 4`, `normalizeQuestionKinds(value: unknown)`, `offeredQuestionKinds(scope, deckSize)` (Tabelle 3.2), `mergeRememberedKinds(remembered, chosen, offered)` (FA-12), `planQuestionKinds(entries, kinds, cardsByDeck, random)` (Ablauf 5.2), `buildChoiceOptions(…)`, `gradeChoice`. Rein, Zufall von außen.                                                                 |
| `src/domain/learning-box-question-kinds.test.ts`          | **Neu.** Fälle 1 bis 14 aus Abschnitt 9.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/domain/learning-box-forms.ts`                        | Test-Teil entfernen (Ablauf 5.4). `MatchRound` wird `{ left: MatchTile[]; right: MatchTile[]; pairs: number }`. `matchReducer` nach ZU-3 und ZU-4. Kopfkommentar anpassen.                                                                                                                                                                                                                                                                                    |
| `src/domain/learning-box-forms.test.ts`                   | Test-Fälle entfernen, Zuordnen-Fälle 15 bis 19 anpassen und ergänzen.                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/domain/learning-box-snapshot.ts`                     | Schema und `LearningBoxSnapshotSource` nach Abschnitt 4.3. `buildLearningBoxSnapshot` wählt das Format nach ZS-1 und ZS-2. `restoreLearningBoxQueue` gibt `kind` je Eintrag zurück (ZS-4).                                                                                                                                                                                                                                                                    |
| `src/domain/learning-box-snapshot.test.ts`                | Fälle 20 bis 25.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/domain/release.ts`, `README.md`                      | Beschriftung des Bereichs, Freigabe-Tabelle (Abschnitt 7).                                                                                                                                                                                                                                                                                                                                                                                                    |
| `app/views/lernbox/parts/types.ts`                        | `LbQuestionKind`. `LbForm = "match"`. `LbStudy`: `mode` wird `kind`, dazu `options: readonly string[]`, `chosen: string \| null`, `hadChoice: boolean`. `LbMatch`: `leftLabel`, `rightLabel`. Props: `kinds` statt `mode`; `onStart` mit `kinds`; neu `onChoose(option)`. `LbTest`, `onTestAnswer`, `onPracticeMissed` und `{ kind: "test" }` entfallen.                                                                                                      |
| `app/views/lernbox/parts/start-sheet.tsx`                 | Ablauf 5.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `app/views/lernbox/parts/study.tsx`                       | Auswahlfrage, Kopfzeile, Fokus, Schlusszeile (Ablauf 5.2). Die Datei hat 269 Zeilen; die Auswahlfrage als eigene Komponente `ChoiceQuestion` in `parts/choice-question.tsx`.                                                                                                                                                                                                                                                                                  |
| `app/views/lernbox/parts/match.tsx`                       | Zwei Spalten, Fokusregel, Überschriften.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `app/views/lernbox/parts/test.tsx`, `test.test.tsx`       | **Löschen.**                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `app/views/lernbox/lernbox-screen.tsx`                    | Zweig `main.kind === "test"` entfernen.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app/views/lernbox/lernbox-screen.module.css` (+ `.d.ts`) | Neue Klassen, `matchGrid` und nur vom Test genutzte Klassen entfernen (`testForm`, `testSkip`, `missed…` nur, wenn `grep` keine andere Nutzung zeigt).                                                                                                                                                                                                                                                                                                        |
| `app/components/learning-box-question-kinds.ts`           | **Neu.** `readRememberedKinds()`, `writeRememberedKinds()` mit `localStorage` (Abschnitt 4.2).                                                                                                                                                                                                                                                                                                                                                                |
| `app/components/learning-box-forms.ts`                    | Nur noch Zuordnen (Ablauf 5.4); reicht `leftLabel` und `rightLabel` aus dem Stapel durch.                                                                                                                                                                                                                                                                                                                                                                     |
| `app/components/learning-box-app.tsx`                     | `QueueItem` bekommt `kind` und bei Auswahl `options`, `correctOption`. Zustand `kinds` statt `mode` (Vorgabe aus `readRememberedKinds`, nach der Hydration in `useEffect` lesen). `startSession` ruft `planQuestionKinds`; `assess` nach Ablauf 5.2, Punkt 10; `persist` und `resumeSession` nach Abschnitt 4.3. Test-Reste entfernen. Die Datei hat 1049 Zeilen bei einer ESLint-Grenze `max-lines` 1000: Neues gehört in die Domain oder in die neue Datei. |
| Tests der Ansichten und Anbindung                         | `start-sheet.test.tsx`, `match.test.tsx`, neu `choice-question.test.tsx`, `learning-box-forms.test.tsx`, `learning-box-forms-flow.test.tsx`, `learning-box-app.test.tsx`, `learning-box-resume.test.tsx` (Abschnitt 9).                                                                                                                                                                                                                                       |
| `e2e/lernbox-lernformen.spec.ts`                          | Test-Fälle durch Fälle 40 bis 48 ersetzen.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `docs/inhalte/lernbox.md`                                 | „Fachlich vorhanden“: Fragearten, Zuordnen in Spalten, Wegfall des Tests, Verweis auf diesen Plan.                                                                                                                                                                                                                                                                                                                                                            |
| `docs/umsetzungsplan-lernbox-lernformen.md`               | Oben ein Hinweis: „Test und Raster-Zuordnen sind abgelöst durch `docs/umsetzungsplan-lernbox-fragearten.md`.“                                                                                                                                                                                                                                                                                                                                                 |
| Dieser Plan                                               | Am Ende „Umgesetzt“ mit Datum und Abweichungen.                                                                                                                                                                                                                                                                                                                                                                                                               |

Ansichten in `app/views/` sind rein (ESLint): keine Importe aus
`app/components/`, `src/storage/`, `src/integrations/`.

Erst nach der Bestätigung durch den Entwickler: Entscheidungsvorlage E-1 in
`Anwendung.md` und `Entscheidungsindex.md` eintragen.

## 9. Testfälle

### Unit (Vitest), Domain

Fragearten (`learning-box-question-kinds.test.ts`), Zufall als feste Folge:

1. `normalizeQuestionKinds`: `["choice","writing","writing","x"]` ergibt
   `["writing","choice"]`; `null`, `"abc"`, `[]` ergeben `["writing"]`.
2. `offeredQuestionKinds`: Stapel mit 4 Karten bietet alle drei; mit 3 Karten,
   für `heute`, `errors` und `box:2` nur `writing` und `oral`.
3. `mergeRememberedKinds`: gemerkt `["writing","choice"]`, gewählt
   `["writing","oral"]`, angeboten ohne `choice` ergibt
   `["writing","oral","choice"]`.
4. Eine Art gewählt: Jeder Eintrag hat diese Art.
5. Zwei Arten, 7 Einträge: Anzahlen 4 und 3. Drei Arten, 9 Einträge: je 3.
6. Jede Karte der Eingabe kommt genau einmal heraus (FA-6); die Reihenfolge
   der Einträge bleibt wie in der Eingabe.
7. **Lösungsschutz (FA-7):** 200 Läufe mit verschiedenem Zufall über einen
   Stapel mit 12 Karten und allen drei Arten. In keinem Lauf ist eine Antwort
   einer Auswahlfrage eine gültige Schreibweise der Lösung einer späteren
   Schreib- oder mündlichen Frage.
8. Lösungsschutz mit Alternativen: Karte „groß | gross“ ist später
   Schreibfrage; weder „groß“ noch „gross“ noch „groß / gross“ steht vorher
   unter den Antworten.
9. Zwei Karten mit derselben Rückseite („big → groß“, „large → groß“): Ist
   die eine später Schreibfrage, wird die andere davor nicht zur Auswahlfrage,
   sondern ersetzt (FA-8).
10. Ersatz: Schreiben gewählt ergibt eine Schreibfrage; nur Mündlich und
    Auswahl gewählt ergibt eine mündliche Frage.
11. Nur Auswahl gewählt, Stapel aus vier gleichen Rückseiten: leere Runde.
12. Ablenker stammen nur aus dem Stapel der gefragten Karte und aus derselben
    Richtung; keine Antwort doppelt; die richtige Antwort ist genau einmal
    dabei; höchstens 4 Antworten.
13. Bereits gestellte Schreibfragen dürfen später Ablenker liefern.
14. `buildChoiceOptions` beim Fortsetzen: Für einen Eintrag an Stelle `i`
    gelten nur die Einträge nach `i` als geschützt.

Zuordnen (`learning-box-forms.test.ts`):

15. Eine Runde hat `left` und `right` gleicher Länge (höchstens 6); `left`
    enthält nur `term`, `right` nur `meaning`; jede Karte steht in beiden.
16. Erst links, dann rechts dieselbe Karte: Paar. Erst rechts, dann links:
    auch ein Paar.
17. Links A, rechts B: Fehlversuch, `mistakes` 1, beide bleiben.
18. Links A, dann links B: kein Fehlversuch, `selected` ist B (ZU-4).
19. Dieselbe Kachel zweimal: Wahl aufgehoben. Bestehende Fälle zu Rundenende
    und Spielende bleiben grün.

Zwischenstand (`learning-box-snapshot.test.ts`):

20. Runde nur aus Schreibfragen: Das Ergebnis ist bytegleich zum bisherigen
    Format (kein `kind`, `mode: "writing"`).
21. Gemischte Runde: `mode: "mixed"`, `kind` an jedem Eintrag.
22. Runde nur aus Auswahlfragen: `mode: "mixed"`.
23. Alter Zwischenstand ohne `kind`: Jeder Eintrag bekommt `mode` als Art.
24. `mode: "mixed"` mit einem Eintrag ohne `kind`, oder `kind: "foo"`: Das
    Schema lehnt ab.
25. Das **bisherige** Schema (im Test als Kopie festgehalten) lehnt einen
    gemischten Zwischenstand ab (ZS-3).

### Unit (Vitest), Ansichten und Anbindung

Start-Fenster (`start-sheet.test.tsx`):

26. Ohne `formsVisible`: „Schreiben“ und „Mündlich“ als Einfachwahl, kein
    „Auswahl“, kein „Zuordnen spielen“; `onStart` bekommt genau eine Art.
27. Mit `formsVisible`, Stapel mit 4 Karten: drei Schalter, „Zuordnen
    spielen“ ist da.
28. Stapel mit 3 Karten, `heute`, `errors`, `box:2`: kein „Auswahl“, kein
    „Zuordnen spielen“.
29. Zwei Schalter drücken, „Los geht's“: `onStart` mit beiden Arten.
30. Die einzige gedrückte Art antippen: bleibt gedrückt, Statuszeile zeigt
    den Hinweis.
31. Vorgabe `["writing","choice"]` im Start-Fenster von `heute`: nur
    „Schreiben“ ist gedrückt.
32. „Zuordnen spielen“ ruft `onStartForm` mit `form: "match"`, nicht
    `onStart`. Es gibt keinen Knopf „Test“.

Auswahlfrage und Runde (`choice-question.test.tsx`, `learning-box-app.test.tsx`):

33. Auswahlfrage: `fieldset` mit `legend`, „Prüfen“ ohne Wahl gesperrt; nach
    der Wahl ruft „Prüfen“ `onCheck` genau einmal (auch bei Doppelklick).
34. Rückmeldung einer Auswahlfrage zeigt „Box 1 bleibt · nur geübt“.
35. Im DOM einer Auswahlfrage steht kein `data-correct` und keine
    Kartenkennung.
36. **Auswahl schreibt nichts:** Runde nur mit Auswahl, richtig und falsch
    beantwortet: `putCardAndEvent` wird nie gerufen.
37. Gemischte Runde: Schreibfrage richtig ruft `putCardAndEvent` mit
    `mode: "writing"`, mündliche Frage mit `mode: "oral"`; eine mündlich
    gewusste Karte in Box 3 bleibt in Box 3.
38. Schlusszeile „Auswahlfragen waren nur Üben.“ nur, wenn die Runde eine
    Auswahlfrage hatte.
39. Fortsetzen (`learning-box-resume.test.tsx`): gemischte Runde nach zwei
    Antworten unterbrechen, fortsetzen: gleiche Reihenfolge, gleiche Arten,
    Auswahlfragen haben wieder Antworten; schon bewertete Einträge wirken
    nicht noch einmal.

Zuordnen (`match.test.tsx`): Fälle des Lernformen-Plans (8 bis 12) auf zwei
Spalten umstellen; neu: zwei Gruppen mit Namen; Spaltenwechsel der Wahl ohne
Fehlversuch; Fokus nach einem Paar in der linken Spalte.

### Playwright (`e2e/lernbox-lernformen.spec.ts`)

Vorbereitung wie bisher (Cookie `lernraum-vorschau=1`, Stapel mit 8 Vokabeln
über „Viele einfügen“). Die Reihenfolge ist zufällig: Die Tests lesen, was auf
dem Bildschirm steht, und schlagen die Lösung in ihrer Liste nach. Kein
`Math.random`-Ersatz in der Seite. Import aus `./fixtures`, axe über
`analyzeAccessibility`.

40. **Start-Fenster:** drei Schalter, „Zuordnen spielen“, kein „Test“. axe
    ohne Befund mit zwei gedrückten Schaltern.
41. **Gemischte Runde, alle drei Arten:** 8 Fragen durchspielen; der Test
    erkennt die Art an der Oberfläche (Eingabefeld, „Antwort zeigen“,
    Radiogruppe) und antwortet richtig. Unterwegs: Die Kopfzeile nennt die
    Art. axe ohne Befund auf je einer Frage jeder Art und auf der Rückmeldung
    einer Auswahlfrage.
42. **Lösungsschutz im Browser:** In Fall 41 sammelt der Test alle Texte der
    Auswahlantworten und prüft bei jeder späteren Schreib- und mündlichen
    Frage, dass ihre Lösung nicht darunter war.
43. **Wirkung:** Nach Fall 41 liegen im Diagramm genau so viele Karten in
    Box 2, wie Schreib- und mündliche Fragen richtig beantwortet wurden; die
    Karten der Auswahlfragen liegen in Box 1.
44. **Nur Auswahl:** Runde spielen, danach liegen alle 8 Karten in Box 1 und
    der Stapel ist weiter „neu“.
45. **Gemerkte Mischung:** Mit Schreiben und Auswahl starten, Runde beenden,
    Seite neu laden, Start-Fenster öffnen: beide sind gedrückt. Start-Fenster
    von „Meine Fehler“: nur „Schreiben“ ist gedrückt.
46. **Zuordnen in zwei Spalten:** 4 Kacheln je Spalte; links nur deutsche,
    rechts nur englische Wörter. Zwei Kacheln links nacheinander: kein
    Fehlversuch. Ein falsches Paar: Status „Das passt nicht zusammen“. Alle
    Paare lösen, zweite Runde, Ergebnis „8 Paare · 1 Fehlversuch“. axe ohne
    Befund auf dem Spielfeld und auf dem Ergebnis.
47. **Tastatur und Touch-Ziele:** Zuordnen nur mit Tab und Enter (Fokus
    danach sichtbar). Nur `mobile-chrome` und `minimum-width`: Kacheln,
    Schalter und Auswahlantworten mindestens 44 px hoch und breit; kein
    waagerechter Überlauf bei 320 px.
48. **Weitermachen** (in `e2e/runden-fortsetzen.spec.ts`): gemischte Runde
    nach drei Fragen über „Runde beenden“ verlassen, „Weitermachen“ zeigt
    „3 von 8“, die nächste Frage ist beantwortbar.

## 10. Prüfbefehle

Wenn `node_modules` fehlt, zuerst `npm ci`.

```sh
npm run css-types
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:render
npx playwright test e2e/lernbox-lernformen.spec.ts e2e/runden-fortsetzen.spec.ts e2e/platform-quality.spec.ts --project=desktop-chromium --project=mobile-chrome --project=minimum-width --trace off
```

Während der Arbeit gezielt:
`npx vitest run src/domain/learning-box app/views/lernbox app/components/learning-box`.
`npm run test:design` ist lokal nur im Vergleich mit dem Ausgangsstand
aussagekräftig (`AGENTS.md`). Nach dem Push GitHub Actions nicht abfragen.

## 11. Fallstricke und was nicht passieren darf

- **Auswahl und Zuordnen schreiben nie.** Kein `putCardAndEvent`, kein
  `learningBoxCards.put`, kein „früher dran“.
- **`choice` gelangt nie in ein Lernereignis** und nie in
  `processLearningBoxResult`. `LearningBoxMode` bleibt zweiwertig. TypeScript
  soll das erzwingen: `kind` vor dem Aufruf auf `writing | oral` einengen,
  kein `as`.
- **Keine eigene Box-Rechnung.** Schreiben und Mündlich rufen nur
  `processLearningBoxResult`.
- **Lösungsschutz nicht aufweichen:** Die Prüfung läuft von hinten nach vorn
  und nach jedem Ersatz mit den endgültigen Arten. Wer die Reihenfolge der
  Einträge später noch mischt, bricht FA-7.
- **Angebot zweimal prüfen:** Das Start-Fenster blendet aus; die Anbindung
  schneidet die Arten vor dem Start noch einmal mit `offeredQuestionKinds`.
  Sonst gelangt über die gemerkte Mischung eine Auswahlfrage in „Heute dran“.
- **Bestehende Tests nicht still anpassen** (`AGENTS.md`). Tests zum Test
  werden gelöscht, weil die Funktion entfällt; das im Commit nennen. Schlägt
  ein anderer bestehender Test fehl, Abweichung nennen und nachfragen.
- **Zwischenstand:** Einheitliche Runden behalten das alte Format (ZS-1). Ein
  gemischter Zwischenstand darf von alter Software nicht gelesen werden
  können (ZS-3); deshalb `mode: "mixed"` und nicht `"writing"`.
- **Hydration:** `localStorage` erst nach der Hydration lesen (`useEffect`
  oder `useSyncExternalStore`), sonst weicht das Server-HTML ab.
- **Doppelt absenden:** Enter plus Klick wertet eine Frage nur einmal
  (`attempted`, und „Prüfen“ wird nach dem ersten Absenden gesperrt).
- **Ein `useRoundGuard`**, nicht zwei.
- **Keine Uhr, keine Punkte, keine Sterne, kein Konfetti.**
- **Kein Vorlese-Knopf im Start-Fenster.**
- **Kein Wort aus dem Kinder-Glossar** in neuen Texten („fällig“ usw.).
- **`max-lines` 1000** in `app/**`.
- **Nicht committen:** `public/sw.js`, `public/version.json`.
- **Die Stufe des Bereichs nicht ändern**, weder auf `frei` noch zurück auf
  `vorschau`. Das entscheidet der Entwickler.

## 12. Reihenfolge der Umsetzung

Jeder Schritt ist für sich grün (`lint`, `typecheck`, `test:unit`) und wird
einzeln committet und gepusht.

1. **Domain Fragearten:** neue Datei mit Tests 1 bis 14. Noch nichts
   angebunden.
2. **Zwischenstand:** Schema und Tests 20 bis 25. Die Anbindung schreibt
   weiter das alte Format.
3. **Runde:** `QueueItem.kind`, `assess`, `persist`, `resumeSession`,
   `choice-question.tsx`, `study.tsx`. Das Start-Fenster liefert noch eine
   Art. Tests 33 bis 39.
4. **Start-Fenster und Merken:** Schalter, `localStorage`, Tests 26 bis 32.
5. **Test entfernen:** Ablauf 5.4. Danach `grep -rn "TestQuestion\|onTestAnswer\|practiceMissed" app src e2e`
   ohne Treffer.
6. **Zuordnen in Spalten:** Domain, Ansicht, CSS, Tests 15 bis 19 und
   `match.test.tsx`.
7. **Freigabe-Beschriftung und README.**
8. **Playwright:** Fälle 40 bis 48.
9. **Doku:** `docs/inhalte/lernbox.md`, Hinweis im Lernformen-Plan,
   Abschnitt „Umgesetzt“ hier.
10. **Nach Bestätigung:** Entscheidungsvorlage E-1 ins Protokoll.

## 13. Fragen an den Entwickler

| Nr. | Frage                                                                                                                                                                                                                        | Empfehlung                                                                                                                                                                          | Alternative und ihre Folge                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1 | Gelten die Fragearten auch für „Heute dran“ und „Meine Fehler“?                                                                                                                                                              | Ja für Schreiben und Mündlich (mischbar). **Keine Auswahl**, kein Zuordnen. So bleibt die Leitner-Wirkung vollständig.                                                              | Auswahl dort als „nur üben“: Die Karte bleibt offen, „X von 20“ zählt nicht weiter. Kinder verstehen kaum, warum die Portion nicht fertig wird.                                  |
| F-2 | Auswahl bei „Box üben“?                                                                                                                                                                                                      | Nein, vorerst nur im Stapel.                                                                                                                                                        | Ja: harmlos (nur üben), braucht aber Ablenker je Stapel; kleiner Folgeschritt.                                                                                                   |
| F-3 | Rückmeldung bei Auswahlfragen sofort oder erst am Ende? Du hast am 15.11.2026 für den Test „erst am Ende“ bestätigt. In der gemischten Runde stehen Auswahlfragen aber zwischen Schreibfragen, die sofort Rückmeldung geben. | Sofort, für alle Fragearten gleich. **Bitte ausdrücklich bestätigen**, weil es deine Antwort zum Test umdreht.                                                                      | Erst am Ende: Dann bräuchte die Runde eine Schlussliste nur für Auswahlfragen, während Schreibfragen weiter sofort Rückmeldung geben. Das ist für Kinder schwer zu durchschauen. |
| F-4 | Soll die Liste „Das üben wir noch“ mit „Diese Karten jetzt üben“ am Rundenende erhalten bleiben?                                                                                                                             | Nein, in diesem Schritt nicht. Falsch geschriebene Karten stehen schon in „Meine Fehler“.                                                                                           | Ja, als Folgeschritt für alle Runden. Etwa ein halber Tag; die Regel LF-7 (nur üben) gälte weiter.                                                                               |
| F-5 | Rundengröße: Der Test hatte höchstens 10 Fragen, die Runde nimmt alle Karten, die dran sind.                                                                                                                                 | Unverändert lassen und im Unterricht beobachten.                                                                                                                                    | Grenze von 10 oder 20 je Runde. Das ändert auch den heutigen Schreibmodus und braucht eine eigene Entscheidung.                                                                  |
| F-6 | Zuordnen: weiter höchstens 3 Runden zu 6 Paaren je Spiel?                                                                                                                                                                    | Ja.                                                                                                                                                                                 | Eine Zeile in `learning-box-forms.ts`.                                                                                                                                           |
| F-7 | Überschriften der Spalten beim Zuordnen: Sprachen des Stapels („Deutsch“, „Englisch“)?                                                                                                                                       | Ja. Bei einem Stapel Deutsch → Englisch stünde sonst „Vokabeln“ über den deutschen Wörtern.                                                                                         | Fest „Vokabeln“ und „Bedeutungen“.                                                                                                                                               |
| F-8 | Schreibfrage vor dem Termin: Ein Fehler setzt auf Box 1 (wie der Schreibmodus, FA-3). Einverstanden?                                                                                                                         | Ja. Das ist „Schreiben wie der Schreibmodus“ wörtlich. Die mildere Testregel LF-5 entfällt.                                                                                         | LF-5 behalten: Dann gäbe es zwei Schreibregeln in derselben Runde, je nach Start-Fenster.                                                                                        |
| F-9 | Freigabe: Du gibst `lernbox-lernformen` sofort frei (Antwort vom 15.11.2026). Dann sind Zuordnen und Test für alle sichtbar, wenn dieser Plan gebaut wird.                                                                   | Der Umbau erscheint mit dem Merge für alle, in der Stufe, die der Bereich dann hat. Kein zweiter Bereich. Vorher eine Woche in der eigenen Klasse über einen Vorschau-Build prüfen. | Neuer Bereich `lernbox-fragearten` auf `vorschau`: Dann müssten Test und Raster-Zuordnen bis zur Freigabe im Code bleiben (doppelter Code, etwa ein Tag mehr).                   |
