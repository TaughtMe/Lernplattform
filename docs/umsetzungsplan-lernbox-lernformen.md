# Umsetzungsplan LernBox: Lernformen „Zuordnen“ und „Test“

Stand: 14.11.2026. Grundlage: Vision, Etappe 1 „LernBox wie Quizlet“
(`obsidian-export/Lernplattform/25 - Vision/Roadmap.md`, `Anwendung.md`).

Dieser Plan ist ein Bauplan für eine Person ohne Vorwissen. Der Domain-Kern
(Abschnitt 8, Schritt 1) liegt schon im Branch; alles andere ist offen.
Festlegungen mit dem Vermerk **Vorschlag** soll der Entwickler bestätigen
(Abschnitt 12). Bis dahin gelten sie als Arbeitsstand.

## 1. Ziel und Abgrenzung

Die LernBox bekommt zu „Schreiben“ und „Mündlich“ (Karteikarten) zwei weitere
Lernformen für **einen Stapel**:

- **Zuordnen:** Begriffe und Bedeutungen liegen gemischt als Kacheln da. Das
  Kind tippt zwei Kacheln an. Ein richtiges Paar verschwindet, ein falsches
  bekommt kurz Rückmeldung. Runden von etwa 6 Paaren, ohne Uhr.
- **Test:** kurze Prüfung aus höchstens 10 Karten mit Schreib- und
  Auswahlfragen. Am Ende steht ein Ergebnis mit den falsch beantworteten
  Karten und dem Knopf „Diese Karten jetzt üben“.

Nicht Teil dieses Plans:

- Zuordnen und Test für „Heute dran“, „Meine Fehler“ oder „Box üben“. Sie
  gibt es nur im Start-Fenster eines Stapels.
- Uhr, Bestzeit, Punkte, Sterne, Rangliste (siehe Abschnitt 2).
- „Weitermachen“ nach Neuladen für Zuordnen und Test. Beide sind kurz; ein
  abgebrochenes Spiel beginnt neu.
- Ein neues Lernereignis-Format, neue Tabellen, Änderungen an Sicherung oder
  Abgleich.
- Ziehen und Ablegen. Zuordnen funktioniert nur über Antippen.

## 2. Prüfung des Entscheidungsprotokolls

Geprüft am 14.11.2026: `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`
und `Entscheidungsindex.md`, gesucht nach Lernform, Auswahl, Multiple Choice,
Zuordnen, Gamification, Quizlet, Kahoot, Uhr, Zeitdruck, Punkte, Rangliste.

| Entscheidung                                                     | Inhalt                                                                                                                  | Folge für diesen Plan                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 23 (LernBox-Sitzung)                                             | Jede Bewertung erzeugt ein Lernereignis. Aufdecken ist ein schwächerer Nachweis und führt nicht zum regulären Aufstieg. | Wiedererkennen (Zuordnen, Auswahlfrage) ist noch schwächer als Aufdecken und ändert keine Box (LF-1, LF-3). |
| 20, 57 (Leitner aus Ereignissen)                                 | Der Kartenstand muss sich aus den Ereignissen nachspielen lassen.                                                       | Kein Kartenstand ohne Ereignis ändern. Deshalb auch kein „früher fällig“ ohne Ereignis (LF-2).              |
| 24, 26 (integrieren statt nachbauen)                             | Keine zweite Wiederholungslogik neben dem gemeinsamen Kern.                                                             | Schreibfragen laufen über `processLearningBoxResult`, nichts Eigenes.                                       |
| 37 mit G6 und D-012, Vault 10 und 23                             | „Genauigkeit vor Geschwindigkeit“; Tempo-Punkte sind als Mangel vermerkt.                                               | Zuordnen hat keine Uhr, keine Bestzeit, keine Tempo-Wertung.                                                |
| 39 (Ramagotchi erst nach stabilem Lernkern), 47 (`motivation`)   | Belohnungssysteme sind gebaut, aber aus.                                                                                | Keine Sterne oder Punkte für die neuen Lernformen in diesem Schritt.                                        |
| 47 (Freigaberegister)                                            | Jeder Bereich hat eine Stufe.                                                                                           | Eigener Bereich ohne Route, Stufe `vorschau` (Abschnitt 7).                                                 |
| Vision B3 („Klassentempo“), Offene Entscheidungen Nr. 11         | Tempo höchstens für die ganze Klasse und erst nach Erprobung; das einzelne Kind bekommt keinen Tempo-Bonus.             | Bestätigt: keine Uhr beim Zuordnen.                                                                         |
| Rücknahme Vorlese-Knopf (Eintrag „Zurückgenommen“ zu D5-3/C-007) | Kein Vorlese-Knopf auf Startseite, Start- und Einstellungsblättern.                                                     | Im Start-Fenster kommt kein Vorlese-Knopf dazu.                                                             |
| Vision „Keine Diagnose, kein Test“                               | Lernraum misst nicht; gemeint ist Diagnostik.                                                                           | Der „Test“ ist eine Übungsform ohne Note und ohne Meldung an die Lehrkraft. Benennung siehe Vorschlag V-7.  |

Ergebnis: **Kein Widerspruch.** Es gibt keine Festlegung und keine Rücknahme
zu Auswahlaufgaben, Multiple Choice oder Zuordnen in der LernBox. Dieser Plan
nimmt nichts zurück; ein Eintrag „Zurückgenommen“ ist nicht nötig. Nach der
Bestätigung durch den Entwickler bekommt das Protokoll eine neue Entscheidung
mit den Regeln LF-1 bis LF-8 (Abschnitt 8, Schritt 7).

## 3. Regeltabelle: Wirkung auf Box und Fälligkeit

Gelesen dazu: `src/domain/spaced-repetition.ts` (`REPETITION_RULES.lernbox`,
Regeln K-1 bis K-8), `docs/umsetzungsplan-audit-welle-3.md` D1,
`src/domain/learning-box.ts` (`processLearningBoxResult`).

| Nr.  | Regel                                                                                                                                                                                                                                                                                                           | Begründung                                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LF-1 | **Zuordnen ändert nichts:** keine Box, keine Fälligkeit, kein Lernereignis, kein Schreibzugriff auf die Datenbank. Wie „Box üben (nur üben)“.                                                                                                                                                                   | Wiedererkennen ist kein freier Abruf (Entscheidung 23). Bei sechs Paaren löst sich das letzte Paar von selbst.                                                                                                                               |
| LF-2 | **Ein Fehler beim Zuordnen macht die Karte nicht früher fällig.** (**Vorschlag** V-1, die Alternative steht dort.)                                                                                                                                                                                              | Ein geänderter Termin ohne Ereignis bricht das Nachspielen (Entscheidung 20/57). Ein Ereignis dafür bräuchte ein neues Format. Im Zweifel ändert eine Lernform nichts.                                                                       |
| LF-3 | **Auswahlfragen im Test ändern nichts**, weder richtig noch falsch. Kein Lernereignis.                                                                                                                                                                                                                          | Wie LF-1; Ratewahrscheinlichkeit 25 %.                                                                                                                                                                                                       |
| LF-4 | **Schreibfrage im Test, Karte in der gefragten Richtung fällig** (`isLearningBoxCardDue`, neue Karten sind fällig): wirkt genau wie der Schreibmodus. `processLearningBoxResult` mit `mode: "writing"`, gespeichert mit `putCardAndEvent`. Richtig: eine Box höher bzw. Erholung nach K-7. Falsch: Box 1 (K-4). | Freier schriftlicher Abruf einer fälligen Karte ist derselbe Nachweis wie im Schreibmodus. Kein Sonderweg neben dem Kern (Entscheidung 24).                                                                                                  |
| LF-5 | **Schreibfrage im Test, Karte nicht fällig:** ändert nichts, auch bei einem Fehler. Kein Lernereignis.                                                                                                                                                                                                          | „Kein Aufstieg vor Fälligkeit“. Der Schreibmodus setzte einen frühen Fehler auf Box 1 (`mistakeOutsideSchedule: "reset"`); im Test wählt das Kind die Karten nicht selbst, deshalb gilt hier die mildere Lesart. Im Zweifel nichts.          |
| LF-6 | **Nur der erste Versuch zählt:** Jede Karte kommt im Test genau einmal vor (eine Frage, eine Richtung). Die Antwort wird einmal abgegeben; ein Zurück gibt es nicht. Das Ereignis trägt die `roundId` des Tests; `putCardAndEvent` schreibt je Runde, Karte und Richtung nur einmal.                            | Regel K-3 / C3-1.                                                                                                                                                                                                                            |
| LF-7 | **„Diese Karten jetzt üben“** startet eine Übungsrunde im Schreibmodus mit `practice: true`: nichts wird verschoben oder gespeichert.                                                                                                                                                                           | Die Lösungen standen gerade auf dem Ergebnisbildschirm. Sofortige Verbesserung ist kein selbstständiger Abruf (Kommentar an `processLearningBoxResult`). Eine im Test falsch geschriebene fällige Karte liegt schon in Box 1 und ist fällig. |
| LF-8 | **Angebot ab 4 Karten im Stapel** (`LEARNING_BOX_FORM_MIN_CARDS`). Darunter zeigt das Start-Fenster die beiden Lernformen nicht.                                                                                                                                                                                | Eine Auswahlfrage braucht drei falsche Antworten; Zuordnen mit zwei Paaren ist kein Spiel.                                                                                                                                                   |

Folgen, die man kennen muss:

- Ein Test kann Karten **zurückstufen**: Eine fällige Karte, die schriftlich
  falsch beantwortet wird, geht auf Box 1 (LF-4). Das Ergebnis sagt dem Kind
  deshalb, wie viele Schreibantworten „für deine Boxen gezählt“ haben.
- Eine fällige Karte, die im Test richtig geschrieben wurde, ist danach nicht
  mehr fällig und fällt aus „Heute dran“. Das ist gewollt und gleich wie im
  Schreibmodus eines Stapels.
- Schonfrist und wirksame Box (`docs/umsetzungsplan-lernbox-schonfrist.md`)
  gelten unverändert, weil LF-4 nur `processLearningBoxResult` aufruft.

## 4. Lernereignisse und tolerantes Lesen

- **Keine Formatänderung.** Es gibt kein neues Feld, keinen neuen Wert für
  `mode` oder `source` und keine neue Ereignisart.
- Das einzige Ereignis entsteht in LF-4 und ist von einem Ereignis des
  Schreibmodus nicht zu unterscheiden: `repository.putCardAndEvent({ card, correct, direction, mode: "writing", roundId })`
  (`src/storage/personal-learning-events.ts`). `roundId` ist eine frische
  `crypto.randomUUID()` je Test.
- Zuordnen, Auswahlfragen und nicht fällige Schreibfragen schreiben nichts.
- Regel S-1 / K1 (`docs/umsetzungsplan-audit-welle-1.md`, tolerantes Lesen)
  wird damit nicht berührt: Ältere Software liest die neuen Ereignisse wie
  jedes Schreib-Ereignis. Sicherung, Abgleich und Nachspielen
  (`src/domain/learning-box-replay.ts`) bleiben unverändert.
- Nachteil, bewusst in Kauf genommen: Aus den Ereignissen ist nicht
  ablesbar, dass eine Antwort aus einem Test stammt. Soll das später
  auswertbar sein, wäre ein **optionales** Feld der richtige Weg (ältere
  Software entfernt es beim Lesen, S-1). Siehe Vorschlag V-6.

## 5. Abläufe

### 5.1 Einstieg (Start-Fenster eines Stapels)

1. Das Kind tippt in der Übersicht einen Stapel an. Das Start-Fenster
   (`app/views/lernbox/parts/start-sheet.tsx`) öffnet sich wie bisher.
2. Unter „Wie willst du üben?“ stehen bisher „Schreiben“ und „Mündlich“.
   Neu kommen „Zuordnen“ und „Test“ dazu, wenn **alle** Bedingungen gelten:
   Bereich `lernbox-lernformen` ist sichtbar (Abschnitt 7), `scope` ist die
   Kennung eines Stapels (nicht `heute`, `errors`, `box:<n>`), der Stapel hat
   mindestens 4 Karten (`supportsLearningBoxForms(deck.total)`).
3. Bei vier Knöpfen wird die Reihe auf schmalen Geräten zu eng. Die
   Knopfgruppe bekommt dann zwei Spalten (neue Klasse, siehe Abschnitt 6).
4. Hinweiszeile unter der Gruppe (Klasse `hint`), je nach Wahl:
   - Zuordnen: „Finde die Paare. Nur üben, nichts wird verschoben.“
   - Test: „Bis zu 10 Fragen. Nur geschriebene Antworten zu fälligen Karten
     zählen für deine Boxen.“
5. Richtungswahl: bei „Zuordnen“ ausgeblendet (beide Seiten liegen offen),
   bei „Test“ wie bisher (vorwärts, rückwärts, gemischt).
6. „Los geht's“ ruft bei Schreiben/Mündlich weiter `onStart`, bei den neuen
   Lernformen `onStartForm({ scope, form, direction })`.
7. Die zuletzt gewählte Übungsart (`mode` in `learning-box-app.tsx`) merkt
   sich weiter nur Schreiben/Mündlich. Das Start-Fenster öffnet nie mit
   Zuordnen oder Test als Vorgabe.

### 5.2 Zuordnen

Domain: `buildMatchRounds`, `startMatch`, `matchReducer` in
`src/domain/learning-box-forms.ts` (liegt vor).

1. **Kartenwahl:** alle Karten des Stapels, gemischt (Fisher-Yates,
   `shuffleLearningBoxItems`). Höchstens 18 Karten je Spiel
   (`MATCH_PAIRS_PER_ROUND` 6 × `MATCH_MAX_ROUNDS` 3). Eine Karte entfällt,
   wenn ihr Begriff oder ihre Bedeutung (Vergleichsschlüssel `answerKey` mit
   `compatibility: true`) schon bei einer gewählten Karte vorkommt. Sonst
   lägen zwei gleiche Kacheln da und ein Paar wäre nicht eindeutig.
2. **Runden:** `ceil(n / 6)` Runden, gleichmäßig verteilt (7 Karten: 4 + 3,
   nicht 6 + 1; 12 Karten: 6 + 6). Unter 2 eindeutigen Paaren gibt es kein
   Spiel; die App zeigt dann die Meldung „Dafür sind zu wenige verschiedene
   Karten im Stapel.“ und bleibt in der Übersicht.
3. **Kacheln:** je Karte zwei Kacheln (`term` = Vorderseite, `meaning` =
   Rückseite), alle Kacheln der Runde gemeinsam gemischt. Alternativen
   („home | house“) stehen als „home / house“ auf der Kachel.
4. **Spielzug:** Erste Kachel antippen: sie ist gewählt (`aria-pressed`,
   dicker Rahmen). Dieselbe Kachel noch einmal: Wahl aufgehoben. Zweite
   Kachel:
   - gleiche Karte: Paar gefunden, beide Kacheln verschwinden. Ihr Platz im
     Raster bleibt leer, damit nichts springt.
   - sonst (auch zwei Kacheln derselben Seite): Fehlversuch. Beide Kacheln
     zeigen etwa 1,2 Sekunden die Rückmeldung „passt nicht“ (Kreuz-Symbol
     und gestrichelter Rahmen, nicht nur Farbe), bleiben liegen und sind
     danach wieder normal. Ein Antippen während der Rückmeldung beendet sie
     sofort und zählt als neue Wahl (`matchReducer` macht das schon).
5. **Rückmeldezeile** unter dem Raster, `role="status"`: nach einem Paar
   „Richtig: Haus – house“, nach einem Fehlversuch „Das passt nicht
   zusammen. Versuch es noch einmal.“ Der Text bleibt stehen, bis der
   nächste Zug ihn ersetzt.
6. **Rundenende:** Sind alle Paare gefunden, erscheint statt des Rasters
   „Runde 1 von 2 geschafft“ und der Knopf „Nächste Runde“ (bekommt den
   Fokus). Kein automatischer Wechsel nach Zeit.
7. **Spielende** nach der letzten Runde: Ergebnis mit Überschrift „Alle
   Paare gefunden“, darunter „12 Paare · 3 Fehlversuche“ (bei 0: „ohne
   Fehlversuch“). Keine Zeit, keine Punkte. Zwei Knöpfe: „Noch einmal“
   (neues Spiel mit neu gemischten Karten) und „Zur LernBox“.
8. **Abbruch:** „Runde beenden“ (Pfeil oben links) fragt über den
   bestehenden `useRoundGuard` nach, solange das Spiel läuft.
9. Gespeichert wird nichts (LF-1).

### 5.3 Test

Domain: `buildLearningBoxTest`, `gradeLearningBoxTestAnswer`,
`learningBoxTestAnswerCounts`, `summarizeLearningBoxTest` (liegt vor).

1. **Kartenwahl:** alle Karten des Stapels, gemischt, die ersten 10
   (`TEST_MAX_QUESTIONS`). Jede Karte genau einmal.
2. **Richtung** je Frage aus der Wahl im Start-Fenster
   (`learningBoxDirectionAt`; gemischt wechselt ab).
3. **Aufteilung:** Die erste Hälfte (abgerundet) sind **Schreibfragen**,
   danach kommen die **Auswahlfragen**. Grund: Die Lösung einer Schreibfrage
   darf nicht vorher als Auswahlantwort auf dem Bildschirm gestanden haben.
4. **Ablenker einer Auswahlfrage:** bis zu 3 Lösungen **anderer Karten
   desselben Stapels in derselben Richtung**, zufällig gewählt. Eine Karte
   scheidet als Ablenker aus, wenn
   - ihre Frage gleich lautet wie die gestellte Frage,
   - eine ihrer gültigen Schreibweisen (`answerKeys`, also auch „|“, „/“,
     Klammerteile) auch für die gestellte Frage richtig wäre,
   - eine ihrer Schreibweisen schon unter den gewählten Antworten ist.

   Die Antworten (1 richtige + Ablenker, höchstens 4 = `TEST_CHOICES`)
   werden gemischt. Findet sich **kein** Ablenker, wird die Frage zur
   Schreibfrage. Mit 1 oder 2 Ablenkern hat die Frage 2 oder 3 Antworten.

5. **Schreibfrage:** Karte mit der Frage wie im Schreibmodus (Klassen
   `card`, `question`), Eingabefeld (`answer`) und Knopf „Weiter“. Enter
   sendet ab. „Weiter“ ist ohne Eingabe gesperrt; daneben steht „Weiß ich
   nicht“ (zählt als falsch, Eingabe leer).
6. **Auswahlfrage:** dieselbe Karte, darunter die Antworten als
   Radiogruppe (`fieldset` mit `legend`, echte `input type="radio"`, als
   Kacheln gestaltet). „Weiter“ ist ohne Wahl gesperrt; „Weiß ich nicht“
   wie oben.
7. **Keine Rückmeldung zwischen den Fragen.** Richtig oder falsch erfährt
   das Kind erst im Ergebnis; das unterscheidet den Test vom Schreibmodus
   (**Vorschlag** V-3). Die Kopfzeile zeigt „Frage 3 von 10“, der
   Fortschrittsbalken (`progress`) läuft mit.
8. **Bewertung** je Antwort mit `gradeLearningBoxTestAnswer`. Schreibfragen
   nutzen dieselbe Prüfung wie der Schreibmodus
   (`answerMatches(…, { compatibility: true })`, Alternativen inklusive);
   ein Unit-Test hält die Gleichheit mit `evaluateLearningBoxAnswer` fest.
9. **Wirkung** je Antwort (in `app/components/`, nicht in der Ansicht):
   Karte **frisch** aus dem aktuellen Kartenstand nehmen, dann
   `learningBoxTestAnswerCounts(question, card, Date.now())`. Bei `true`:
   `processLearningBoxResult(card, { correct, direction, mode: "writing", now })`
   und `repository.putCardAndEvent({ card: updated, correct, direction, mode: "writing", roundId })`.
   Bei `false`: nichts. Die App zählt mit, wie viele Antworten gewirkt
   haben.
10. **Ergebnis** nach der letzten Frage (`summarizeLearningBoxTest`):
    - Überschrift „Test geschafft“ (bekommt den Fokus, `tabIndex={-1}`),
      darunter „7 von 10 richtig“ in einem `role="status"`-Bereich.
    - Zeile zur Wirkung: „3 geschriebene Antworten haben für deine Boxen
      gezählt.“ bzw. bei 0: „Für deine Boxen hat nichts gezählt. Das war
      nur Üben.“
    - Liste „Das üben wir noch“ mit jeder falschen Frage: Frage, richtige
      Lösung, darunter „Du: …“ (durchgestrichen, wie `resultGiven`) oder
      „Du: keine Antwort“.
    - Knopf „Diese Karten jetzt üben“ (nur bei mindestens einer falschen
      Frage): startet die Übungsrunde nach LF-7 mit genau diesen Karten und
      Richtungen, Titel „Fehler aus dem Test (nur üben)“.
    - Knopf „Zur LernBox“. Bei 0 Fehlern steht „Alles richtig“ statt der
      Liste.
11. **Abbruch:** wie beim Zuordnen über `useRoundGuard`. Schon abgegebene
    Antworten bleiben gewertet (sie stehen in der Datenbank).

## 6. Barrierefreiheit und Design

Vorlage und Regeln: `docs/design/README.md` (auch das Glossar der
Kinder-Wortwahl). Alles liegt in `app/views/lernbox/` mit dem CSS-Modul
`lernbox-screen.module.css`; nach jeder CSS-Änderung `npm run css-types`.

Bestehendes wiederverwenden:

| Zweck                          | Bestehende Klasse oder Komponente                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Rahmen der Runde, Kopf, Zurück | `study`, `studyHead`, `backSquare`, `studyTitles`, `studyTitle`, `ThemeSwitch` (wie in `parts/study.tsx`)                         |
| Fortschritt                    | `progress` mit `role="progressbar"`                                                                                               |
| Fragekarte                     | `card`, `cardHead`, `eyebrow`, `question`                                                                                         |
| Eingabe und Hauptknopf         | `answerRow`, `answer`, `check`, `next`, `cta`                                                                                     |
| Ergebnis                       | `resultWrap`, `result`, `doneTitle`, `resultNext`, `resultGiven`                                                                  |
| Start-Fenster                  | `Modal`, `segmentSheet`, `segOn`, `segOff`, `hint`, `field`, `fieldLabel`                                                         |
| Symbole                        | `Icon` aus `app/ui/icons` (`check`, `close`, `back`)                                                                              |
| Farben                         | Rollen `--accent`, `--accent-bg`, `--good`, `--good-bg`, `--bad`, `--bad-bg`, `--line2`, `--surface`, `--ring`, `--ink`, `--ink2` |

Neue Klassen kommen in dieselbe CSS-Datei (nicht in ein zweites Modul: Die
Container-Abfrage `@container lernbox` gehört zu `.screen`). Keine festen
Farbwerte, nur die Farbrollen; Dunkelmodus ergibt sich daraus.

Anforderungen:

- **Tastatur:** Kacheln und Antworten sind echte `button`- bzw.
  `input type="radio"`-Elemente in Lesereihenfolge. Keine eigene
  Pfeiltasten-Logik beim Zuordnen; Tab und Enter/Leertaste genügen.
- **Fokus beim Zuordnen:** Verschwindet ein Paar, hatte eine der beiden
  Kacheln den Fokus. Danach bekommt die erste noch offene Kachel den Fokus;
  nach der letzten der Knopf „Nächste Runde“ bzw. die Ergebnis-Überschrift.
  Nach einem Fehlversuch bleibt der Fokus, wo er ist.
- **Fokus im Test:** Bei jeder neuen Frage steht der Fokus im Eingabefeld
  (Schreibfrage) bzw. auf der Frage-Überschrift (Auswahlfrage,
  `tabIndex={-1}`), nicht auf einer Antwort, damit keine vorgewählt wirkt.
- **Sichtbarer Fokus:** `:focus-visible` mit `outline: 3px solid var(--ring)`
  und `outline-offset: 2px` an Kacheln und Radio-Kacheln (bei den Radios
  über `:has(input:focus-visible)` oder `:focus-within`).
- **Touch-Ziele:** mindestens 44 × 44 px, Kacheln `min-height: 56px`.
  Raster beim Zuordnen: 2 Spalten unter 760 px, 3 Spalten ab 760 px (bei
  12 Kacheln also 6 bzw. 4 Reihen). Lange Texte umbrechen
  (`overflow-wrap: anywhere`), nichts wird abgeschnitten. Prüfen bei 320 px
  Breite (Projekt `minimum-width`).
- **Nicht nur Farbe:** gewählt = dicker Rahmen und `aria-pressed="true"`;
  falsch = Kreuz-Symbol und gestrichelter Rahmen; richtig = Kachel
  verschwindet und Text in der Rückmeldezeile.
- **`aria-live`:** Rückmeldezeile beim Zuordnen und Ergebniszeilen beider
  Lernformen als `role="status"`. Der Bereich ist von Anfang an im DOM und
  wird nur mit Text gefüllt, sonst liest ihn ein Screenreader nicht vor.
- **Verschwundene Kacheln:** Platzhalter `div` mit `aria-hidden="true"`,
  kein gesperrter Knopf.
- **Bewegung:** Rückmeldung ohne Wackeln. Falls ein Übergang dazukommt, ihn
  unter `@media (prefers-reduced-motion: reduce)` abschalten (Block am Ende
  der CSS-Datei).
- **Wortwahl:** „Paar“, „Fehlversuch“, „Das üben wir noch“. Nicht
  „falsch“ als Überschrift, kein „verloren“, keine Zeitangaben.

## 7. Freigabestufe

Neuer Bereich im Freigaberegister (`src/domain/release.ts`), nach dem Muster
von `spiegelschrift` und `lehrer-geraet`:

```ts
"lernbox-lernformen": {
  label: "LernBox: Zuordnen und Test",
  // Kein eigener Pfad: schaltet die beiden Lernformen im Start-Fenster
  // eines Stapels (docs/umsetzungsplan-lernbox-lernformen.md).
  routes: [],
  stage: "vorschau",
},
```

Stand 15.11.2026: Die Stufe ist inzwischen `frei` (V-8). Ursprüngliche Begründung für `vorschau`: Die LernBox selbst ist `frei` und wird im
Schulbetrieb genutzt. Neue Teile kamen im Projekt bisher zuerst als Vorschau
und wurden nach der Erprobung durch die Lehrkraft freigegeben (Textbox,
Entscheidung 54; Aufgaben, Diagnostik, Spiegelschrift, Entscheidung 59). Die
Regeln LF-2, LF-4 und LF-5 sind zudem Vorschläge; LF-4 kann Karten
zurückstufen. Bis zur Bestätigung soll das kein Kind ungefragt treffen. Zum
Ausprobieren: Vorschau am Gerät einschalten oder
`LERNRAUM_FREIGABE=lernbox-lernformen=frei` setzen.

Die Tabelle im `README.md` zwischen `<!-- freigabe:start -->` und
`<!-- freigabe:end -->` muss neu erzeugt werden, sonst schlägt
`src/domain/release-docs.test.ts` fehl (Ausgabe von
`releaseStagesMarkdown()` einsetzen, dann `npx prettier --write README.md`).

## 8. Betroffene Dateien und Reihenfolge

Nach jedem Schritt committen und pushen.

**Schritt 1: Domain (erledigt, Commit „Domain-Kern für Zuordnen und Test“)**

| Datei                                   | Stand                                                                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/learning-box-forms.ts`      | Neu, fertig. Konstanten, `shuffleLearningBoxItems`, `supportsLearningBoxForms`, `buildMatchRounds`, `startMatch`, `matchReducer`, `buildLearningBoxTest`, `gradeLearningBoxTestAnswer`, `learningBoxTestAnswerCounts`, `summarizeLearningBoxTest`. |
| `src/domain/learning-box-forms.test.ts` | Neu, 23 Tests, grün. Bei Änderungen an der Domain mitziehen.                                                                                                                                                                                       |

Die Datei darf angepasst werden, wenn die Oberfläche etwas anderes braucht.
Die Regeln aus Abschnitt 3 und 5 gehen vor.

**Schritt 2: Freigabe**

| Datei                        | Änderung                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| `src/domain/release.ts`      | Bereich `lernbox-lernformen` wie in Abschnitt 7.                          |
| `README.md`                  | Freigabe-Tabelle neu erzeugen.                                            |
| `src/domain/release.test.ts` | Nur anpassen, falls ein Test die Bereiche aufzählt (prüfen, nicht raten). |

**Schritt 3: Typen und Ansichten**

| Datei                                         | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/views/lernbox/parts/types.ts`            | Neu: `LbForm = "match" \| "test"`; `LbMatch = { title: string; gameKey: string; rounds: readonly MatchRound[] }`; `LbTest = { title: string; testKey: string; questions: readonly TestQuestion[]; counted: number }`. `main` um `{ kind: "match"; match: LbMatch }` und `{ kind: "test"; test: LbTest }` erweitern. Neue Props: `formsVisible?: boolean`, `onStartForm?`, `onMatchAgain?`, `onFormFinished?`, `onTestAnswer?(question, correct)`, `onPracticeMissed?(items: { cardId: string; direction: "forward" \| "reverse" }[])`. Typen aus `src/domain/` dürfen importiert werden (wie `LearningBoxDeckState`). |
| `app/views/lernbox/parts/match.tsx`           | Neu. `useReducer(matchReducer, rounds, startMatch)`; Zeitgeber für `clear-wrong` (1200 ms, in `useEffect` mit Aufräumen); Fokusführung; meldet das Spielende einmal über `onFormFinished`. Der Elternteil setzt `key={match.gameKey}`, damit „Noch einmal“ den Zustand neu aufbaut.                                                                                                                                                                                                                                                                                                                                   |
| `app/views/lernbox/parts/test.tsx`            | Neu. Eigener Zustand: Index, Eingabe, gewählte Antwort, `answers`. Je Antwort `gradeLearningBoxTestAnswer`, dann `onTestAnswer(question, correct)`; nach der letzten Frage `onFormFinished` und Ergebnis aus `summarizeLearningBoxTest`. Elternteil setzt `key={test.testKey}`.                                                                                                                                                                                                                                                                                                                                       |
| `app/views/lernbox/lernbox-screen.tsx`        | `main.kind === "match"` und `"test"` auf die neuen Teile verzweigen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `app/views/lernbox/parts/start-sheet.tsx`     | Ablauf 5.1. Lokaler Zustand `LbMode \| LbForm`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app/views/lernbox/lernbox-screen.module.css` | Neue Klassen (z. B. `segmentWide`, `matchGrid`, `matchTile`, `matchTileOn`, `matchTileWrong`, `matchGap`, `matchStatus`, `choiceList`, `choice`, `testActions`, `missedList`). Danach `npm run css-types`; die erzeugte `.d.ts` wird committet.                                                                                                                                                                                                                                                                                                                                                                       |

Ansichten in `app/views/` sind rein (ESLint): keine Importe aus
`app/components/`, `src/storage/`, `src/integrations/`.

**Schritt 4: Anbindung**

| Datei                                  | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/learning-box-forms.ts` | Neu: Hook `useLearningBoxForms({ cards, deckById, repository, onNotice })`. Hält `form` (`match` oder `test`, mit `finished`, `roundId`, `counted`), baut das Spiel bzw. den Test (`buildMatchRounds`, `buildLearningBoxTest`), setzt LF-4/LF-5 in `answer(question, correct)` um und liefert `main`-Ansichtsmodell und Handler. Eigene Datei, weil `learning-box-app.tsx` mit 934 gezählten Zeilen an der ESLint-Grenze `max-lines` 1000 liegt.                                                                                                                                                                                          |
| `app/components/learning-box-app.tsx`  | `useAreaVisible("lernbox-lernformen")` an `formsVisible` geben. Hook einbinden. `main` vorrangig aus dem Hook, wenn eine Lernform läuft. `useRoundGuard`: `active` auch bei laufender Lernform; `onLeave` beendet beide (ein einziger Aufruf des Hooks bleiben). `onBack` und `onEndSession` gelten auch für die Lernformen. `onPracticeMissed`: `setSession` wie in `startSession`, aber `practice: true`, `mode: "writing"`, `queue` aus den gemeldeten Karten und Richtungen (Karten frisch aus `cards`), Titel nach LF-7; vorher die Lernform schließen und `refresh()` abwarten. Beim Verlassen einer Lernform `refresh()` aufrufen. |

**Schritt 5: Tests** (Abschnitt 9)

| Datei                                          | Änderung                                                                                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/views/lernbox/parts/start-sheet.test.tsx` | Neu (Muster: `deck-grid.test.tsx`, `card-row.test.tsx`).                                                                                                               |
| `app/views/lernbox/parts/match.test.tsx`       | Neu.                                                                                                                                                                   |
| `app/views/lernbox/parts/test.test.tsx`        | Neu.                                                                                                                                                                   |
| `app/components/learning-box-forms.test.ts(x)` | Neu: LF-3 bis LF-6 mit `fake-indexeddb`, falls im Projekt schon so getestet (in bestehenden `app/components/*.test.tsx` nachsehen), sonst mit einem Repository-Double. |
| `e2e/lernbox-lernformen.spec.ts`               | Neu. Import aus `./fixtures`, axe über `analyzeAccessibility`.                                                                                                         |

**Schritt 6: Doku**

| Datei                     | Änderung                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/inhalte/lernbox.md` | Unter „Fachlich vorhanden“: beide Lernformen, Wirkung nach LF-1 bis LF-8, Freigabe `vorschau`, Verweis auf diesen Plan.                      |
| Dieser Plan               | Am Ende einen Abschnitt „Umgesetzt“ mit Datum, Abweichungen und offenen Punkten ergänzen. Abschnitt 12 bleibt, bis der Entwickler antwortet. |

**Schritt 7: nach der Bestätigung durch den Entwickler (nicht vorher)**

`obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md` und
`Entscheidungsindex.md`: neue Entscheidung mit der nächsten freien Nummer
(Regeln LF-1 bis LF-8, bestätigte Vorschläge). Freigabe auf `frei` nur auf
Ansage.

## 9. Testfälle

### Unit (Vitest), Domain: vorhanden

Mischen behält alle Elemente · Angebot ab 4 Karten · eine Runde enthält beide
Seiten jeder Karte · 7 Karten ergeben 4 + 3, 12 ergeben 6 + 6 · höchstens
3 Runden zu 6 Paaren, keine Kachel doppelt · gleiche Begriffe oder
Bedeutungen entfallen · Alternativen als „a / b“, unter 2 Paaren kein Spiel ·
richtiges Paar verschwindet · falsches Paar zählt als Fehlversuch, Kacheln
bleiben, `clear-wrong` räumt ab · zwei Kacheln derselben Seite sind ein
Fehlversuch · erneutes Antippen hebt die Wahl auf · gefundene und unbekannte
Kacheln werden ignoriert · Rundenende, `next-round`, Spielende · Test: jede
Karte einmal, erst Schreib-, dann Auswahlfragen · höchstens 10 Fragen · vier
verschiedene Antworten aus dem Stapel, eine richtig · kein Ablenker, der auch
richtig wäre · Richtung rückwärts und gemischt · ohne Ablenker Schreibfrage ·
Schreibfrage bewertet wie `evaluateLearningBoxAnswer` · Auswahlfrage nach
gewählter Antwort, leer ist falsch · Zusammenfassung nennt falsche und
fehlende Antworten · nur Schreibfragen fälliger Karten wirken.

### Unit (Vitest), neu

Start-Fenster (`start-sheet.test.tsx`):

1. Stapel mit 4 Karten und `formsVisible`: „Zuordnen“ und „Test“ sind da.
2. Stapel mit 3 Karten: beide fehlen.
3. `formsVisible` fehlt oder ist `false`: beide fehlen.
4. `scope` „heute“, „errors“, „box:2“: beide fehlen.
5. „Zuordnen“ gewählt: keine Richtungswahl; „Los geht's“ ruft
   `onStartForm({ scope, form: "match", direction })`, nicht `onStart`.
6. „Test“ gewählt, Richtung „Gemischt“: `onStartForm` mit `form: "test"`
   und `direction: "mixed"`.
7. „Schreiben“ gewählt: weiter `onStart` (Regression).

Zuordnen (`match.test.tsx`):

8. Zeigt 2 × Paare Kacheln als Knöpfe; die erste Wahl setzt
   `aria-pressed="true"`.
9. Richtiges Paar: beide Knöpfe sind weg, die Statuszeile nennt das Paar,
   der Fokus liegt auf einer offenen Kachel.
10. Falsches Paar: beide Knöpfe bleiben, Statuszeile „Das passt nicht
    zusammen. …“; nach 1200 ms (Fake-Timer) ist die Markierung weg.
11. Letztes Paar der Runde: „Nächste Runde“ hat den Fokus; nach der
    letzten Runde steht das Ergebnis mit Paaren und Fehlversuchen und
    `onFormFinished` wurde genau einmal gerufen.
12. „Noch einmal“ ruft `onMatchAgain`, „Zur LernBox“ ruft `onEndSession`.

Test (`test.test.tsx`):

13. Schreibfrage: „Weiter“ ist ohne Eingabe gesperrt; Enter sendet ab und
    ruft `onTestAnswer(question, true/false)` genau einmal.
14. Auswahlfrage: Radiogruppe mit beschriftetem `fieldset`; „Weiter“ ohne
    Wahl gesperrt; die gewählte Antwort wird gewertet.
15. „Weiß ich nicht“ wertet falsch und geht weiter.
16. Zwischen den Fragen erscheint kein „richtig/falsch“.
17. Ergebnis: „x von y richtig“ in `role="status"`, Liste der falschen
    Fragen mit Lösung und Eingabe, Zeile zur Wirkung aus `counted`.
18. „Diese Karten jetzt üben“ ruft `onPracticeMissed` mit genau den
    falschen Karten und Richtungen; bei 0 Fehlern fehlt der Knopf.

Wirkung (`learning-box-forms.test`):

19. Zuordnen komplett durchgespielt: `putCardAndEvent` wird nie gerufen.
20. Auswahlfrage richtig und falsch: kein Aufruf.
21. Schreibfrage, Karte fällig, richtig: ein Aufruf mit `mode: "writing"`,
    der `roundId` des Tests und einer Karte eine Box höher.
22. Schreibfrage, Karte fällig, falsch: ein Aufruf, Karte in Box 1.
23. Schreibfrage, Karte nicht fällig, richtig und falsch: kein Aufruf.
24. `counted` zählt nur die Fälle 21 und 22.

### Playwright (`e2e/lernbox-lernformen.spec.ts`)

Vorbereitung je Test: Cookie `lernraum-vorschau=1` setzen (Muster:
`enablePreview` in `e2e/platform-quality.spec.ts`), Stapel mit 8 Vokabeln
über „Viele einfügen“ anlegen (Muster: `e2e/runden-fortsetzen.spec.ts`,
Modul „LernBox“, samt `chooseFromPlusMenu`).

25. **Ohne Vorschau** (kein Cookie): Das Start-Fenster zeigt „Schreiben“
    und „Mündlich“, aber weder „Zuordnen“ noch „Test“.
26. **Zuordnen, ganzer Durchlauf:** starten; es liegen 12 Kacheln da. Ein
    absichtlich falsches Paar antippen: Status „Das passt nicht zusammen“,
    beide Kacheln sind noch da. Dann alle Paare lösen (die Zuordnung kennt
    der Test aus seiner Vokabelliste), „Nächste Runde“, zweite Runde lösen,
    Ergebnis zeigt „8 Paare“ und „1 Fehlversuch“. axe ohne Befund auf dem
    Spielfeld (vor dem ersten Zug und mit einer gewählten Kachel) und auf
    dem Ergebnis.
27. **Zuordnen nur mit Tastatur:** eine Kachel mit Tab erreichen, Enter,
    zur Partnerkachel tabben, Enter: Das Paar ist weg und der Fokus liegt
    auf einem sichtbaren Element (`expect(page.locator(":focus")).toBeVisible()`).
28. **Zuordnen ändert nichts:** Danach stehen im Diagramm weiter alle
    8 Karten in Box 1 und der Stapel ist weiter „neu“.
29. **Test, ganzer Durchlauf:** starten; „Frage 1 von 8“. Vier
    Schreibfragen: zwei richtig, eine falsch, eine „Weiß ich nicht“. Vier
    Auswahlfragen: drei richtig, eine falsch. Ergebnis „5 von 8 richtig“,
    drei Einträge unter „Das üben wir noch“, Zeile „4 geschriebene Antworten
    haben für deine Boxen gezählt.“ axe ohne Befund auf einer
    Schreibfrage, einer Auswahlfrage und dem Ergebnis.
30. **Test wirkt nur über Schreibfragen:** Nach Fall 29 liegen genau
    2 Karten in Box 2 (die richtig geschriebenen), 6 in Box 1.
31. **„Diese Karten jetzt üben“:** Aus dem Ergebnis startet eine Runde
    „Fehler aus dem Test (nur üben)“ mit „3 übrig“; eine richtige Antwort
    zeigt „Box 1 bleibt“.
32. **Touch-Ziele (nur `mobile-chrome`):** Jede Kachel und jede
    Auswahlantwort ist mindestens 44 px hoch und breit (`boundingBox`);
    die Seite hat keinen waagerechten Überlauf.
33. **Abbruch:** „Runde beenden“ während eines Tests fragt nach; nach dem
    Bestätigen steht die Übersicht ohne „Weitermachen“-Angebot.

Die Reihenfolge der Kacheln und Fragen ist zufällig. Die Tests lesen
deshalb, was auf dem Bildschirm steht, und schlagen die Lösung in ihrer
Vokabelliste nach. Kein `Math.random`-Ersatz in der Seite.

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
npx playwright test e2e/lernbox-lernformen.spec.ts e2e/runden-fortsetzen.spec.ts e2e/platform-quality.spec.ts --project=desktop-chromium --project=mobile-chrome --trace off
```

Während der Arbeit gezielt:
`npx vitest run src/domain/learning-box-forms.test.ts app/views/lernbox`.
`npm run test:design` ist mit lokalem Chromium nur im Vergleich mit dem
Ausgangsstand aussagekräftig (`AGENTS.md`); maßgeblich ist `design-quality`
in GitHub. Nach dem Push GitHub Actions nicht abfragen (`AGENTS.md`).

## 11. Fallstricke und was nicht passieren darf

- **Kein Schreibzugriff aus Zuordnen und Auswahlfragen.** Weder
  `putCardAndEvent` noch `learningBoxCards.put`. Auch kein „früher fällig“
  (LF-2), solange V-1 nicht anders entschieden ist.
- **Keine Formatänderung** an Lernereignissen, Karten, Sicherung oder
  Zwischenstand (`learning-box-snapshot.ts`). `LearningBoxMode` bleibt
  `"oral" | "writing"`; „match“ und „test“ sind keine Modi der Runde,
  sondern eigene Ansichten.
- **Kein Aufstieg über Umwege:** LF-4 ruft nur `processLearningBoxResult`.
  Keine eigene Box-Rechnung, kein direkter Aufruf von `reviewRepetition`.
- **Frischer Kartenstand:** Die Fälligkeit wird beim Antworten geprüft, mit
  der Karte aus dem aktuellen Stand, nicht mit einer Kopie vom Testbeginn.
- **Doppelt absenden:** Enter plus Klick oder ein Doppelklick darf eine
  Frage nicht zweimal werten. Die Ansicht geht nach der ersten Abgabe
  sofort weiter; zusätzlich schützt die Ereigniskennung aus Runde, Karte
  und Richtung.
- **Kein Widerspruch zwischen Test und Code still auflösen** (`AGENTS.md`):
  Schlägt ein bestehender Test fehl, Abweichung nennen und nachfragen,
  nicht den Test anpassen.
- **Keine Uhr, keine Bestzeit, keine Punkte, keine Sterne, kein Konfetti.**
  Kein automatischer Rundenwechsel nach Zeit. Der Zeitgeber von 1,2 s räumt
  nur die Fehl-Markierung ab; im `useEffect` aufräumen, sonst läuft er nach
  dem Verlassen weiter.
- **Kein Vorlese-Knopf im Start-Fenster** (Rücknahme D5-3).
- **Kein Ziehen und Ablegen.**
- **Lösung nicht verraten:** Im DOM steht an Kacheln und Antworten kein
  Merkmal für richtig/falsch (kein `data-correct`, keine Kartenkennung als
  sichtbares Attribut bei Auswahlantworten).
- **`max-lines` 1000** in `app/**`: Logik in den Hook, nicht in
  `learning-box-app.tsx`.
- **Ein `useRoundGuard`**, nicht zwei; sonst fragt die Zurück-Geste doppelt.
- **Zwischenstand:** Der „Weitermachen“-Zwischenstand einer älteren Runde
  darf durch Zuordnen oder Test nicht gelöscht oder überschrieben werden.
  Die Übungsrunde nach LF-7 ersetzt ihn wie jede neue Runde
  (`roundSnapshot.clear()` in `startSession`); das ist das bestehende
  Verhalten.
- **Hydration:** Browser-Tests importieren aus `e2e/fixtures.ts`, nie aus
  `@playwright/test`.
- **Nicht committen:** `public/sw.js`, `public/version.json` (erzeugt der
  Build).
- **Freigabe:** `frei` seit 15.11.2026 (V-8, entschieden).
- **Branch:** nie auf `claude/nifty-ramanujan-pzpa90` pushen.

## 12. Vorschläge zur Bestätigung durch den Entwickler

| Nr. | Frage                                                                                                 | Vorschlag                                                                                                     | Alternative und ihre Folge                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V-1 | Soll ein Fehler beim Zuordnen die Karte früher fällig machen?                                         | Nein (LF-2). Zuordnen ist reines Üben.                                                                        | Ja, „spätestens morgen fällig“, Box bleibt. Braucht ein Lernereignis mit einem neuen optionalen Feld, damit das Nachspielen stimmt; ältere Software ignoriert es (S-1). Mehraufwand etwa ein Tag. |
| V-2 | Dürfen Schreibfragen im Test fällige Karten bewegen, auch nach unten?                                 | Ja (LF-4), genau wie der Schreibmodus.                                                                        | Der ganze Test ist nur Üben. Einfacher zu erklären, aber fällige Karten müssen danach noch einmal geschrieben werden.                                                                             |
| V-3 | Rückmeldung im Test erst am Ende? **Entschieden 15.11.2026: ja.**                                     | Ja. Das unterscheidet den Test vom Schreibmodus und entspricht Quizlet.                                       | Sofort nach jeder Frage. Für jüngere Kinder evtl. freundlicher; der Test wird dann zu einem zweiten Schreibmodus mit Auswahlfragen.                                                               |
| V-4 | Größen: 6 Paare je Runde, höchstens 3 Runden; Test höchstens 10 Fragen, halb Schreiben, halb Auswahl. | So übernehmen und im Unterricht beobachten.                                                                   | Andere Zahlen sind eine Zeile in `learning-box-forms.ts`.                                                                                                                                         |
| V-5 | Lernformen auch für „Meine Fehler“ und „Heute dran“?                                                  | Vorerst nur für Stapel. „Heute dran“ soll Leitner-wirksam bleiben.                                            | Zuordnen für „Meine Fehler“ wäre ein kleiner Folgeschritt.                                                                                                                                        |
| V-6 | Soll später auswertbar sein, dass eine Antwort aus einem Test stammt?                                 | Nein, vorerst kein neues Ereignisfeld.                                                                        | Optionales Feld am Ereignis (tolerant, S-1).                                                                                                                                                      |
| V-7 | Name „Test“?                                                                                          | „Test“, wie in der Vision und bei Quizlet. Die Hinweiszeile sagt, dass es um Üben geht.                       | „Probe“ oder „Quiz“, falls „Test“ in der Klasse Druck erzeugt (Vision: „Keine Diagnose, kein Test“).                                                                                              |
| V-8 | Freigabe **(entschieden 15.11.2026: sofort `frei`)**                                                  | `vorschau`, nach zwei Wochen Erprobung in der eigenen Klasse auf `frei`.                                      | Sofort `frei`.                                                                                                                                                                                    |
| V-9 | Sterne für Zuordnen und Test? **Entschieden 15.11.2026: keine Sterne.**                               | Nein, bis das Belohnungssystem der LernBox insgesamt entschieden ist (Entscheidung 39, Bereich `motivation`). | –                                                                                                                                                                                                 |

## 13. Umgesetzt

Stand: 14.11.2026, Branch `claude/lernbox-lernformen`. Schritte 2 bis 6 sind
gebaut. Am 15.11.2026 hat der Entwickler entschieden: **V-3** Rückmeldung im
Test erst am Ende, wie umgesetzt; **V-8** sofort `frei`, ohne zwei Wochen
Vorschau (`lernbox-lernformen` steht auf `frei`); **V-9** vorerst keine Sterne,
weil es noch keinen Zähler zum Auswerten gibt (Erweiterungsstelle als Kommentar
in `src/domain/release.ts`, nichts ausgebaut). Die übrigen Vorschläge V-1 bis
V-9 sind wie empfohlen umgesetzt.

Abweichungen und Unklarheiten, jeweils mit der vorsichtigsten Wahl:

- **Fall 26, Zahl der Kacheln:** Der Plan nennt „12 Kacheln“ bei 8 Vokabeln.
  Nach Abschnitt 5.2 ergeben 8 Karten 4 + 4 Paare, also 8 Kacheln je Runde. Der
  Test prüft 8 Kacheln (die Domain ist maßgeblich).
- **Fall 25, ohne Vorschau:** Der Entwicklungsserver der Browser-Suite zeigt
  Vorschau-Bereiche immer (`NODE_ENV` ungleich `production`), ein fehlendes
  Cookie ändert dort nichts. Der Fall steht deshalb als Unit-Test
  (`start-sheet.test.tsx`, „zeigt ohne Freigabe weder Zuordnen noch Test“).
- **Hook:** `useLearningBoxForms` hat zusätzlich `settle()` (wartet auf
  geschriebene Testantworten) und liefert `running`; `close()` schließt eine
  Lernform. Die Karten für „Diese Karten jetzt üben“ liest die App einzeln mit
  `repository.getCard` frisch aus der Datenbank, nicht aus `cards`.
- **Rückfrage beim Verlassen:** `useRoundGuard` bekommt `resumable: false`, wenn
  eine Lernform läuft („Die Übung fängt dann wieder von vorn an.“), weil dafür
  kein Zwischenstand gehalten wird.
- **Ergebnis des Tests:** Die Zeile zur Wirkung (`counted`) bleibt leer
  (`counted: null`), bis alle Schreibantworten gespeichert sind, damit sie nicht
  kurz „nichts gezählt“ meldet.
- **Hinweiszeile des Tests:** Der Plan formuliert „zu fälligen Karten“. „fällig“
  steht als Fachwort in `src/domain/child-glossary.ts` und fällt im Schülertext
  durch `child-glossary.test.ts`. Der Text lautet deshalb: „Bis zu 10 Fragen.
  Nur geschriebene Antworten zu Karten, die heute dran sind, zählen für deine
  Boxen.“ Der Test blieb unverändert.
