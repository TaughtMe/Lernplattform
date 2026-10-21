# Prüfinstanz G – Funktionale Korrektheit der Lernlogik und der Ergebnisberechnungen

Stand: 20.10.2026, Commit `c30b916` (App 0.8.0). Bericht wird fortlaufend geschrieben
(Ergebnissicherung). Reproduktionen liegen im Scratchpad unter `repro-g/`.

## 1 Rahmen

- **Rolle:** Prüfinstanz G, funktionale Korrektheit (Antwortprüfung, Mathematik, Leitner,
  Tagesportion, Prozent-/Punktwerte, Abbrüche, Sicherung).
- **Nicht wiederholt (bereits belegt):** A-001, A-003, A-004, A-013, B-001, D-001, D-002,
  D-004, D-005, D-006, D-008, D-009, D-010, D-016. Wo sie mein Thema berühren, wird auf die
  ID verwiesen.

## 2 Untersuchte Dateien

- **Antwortprüfung:** `src/domain/running-dictation.ts`, `running-dictation-input.ts`, `vocabulary-session.ts`, `learning-word.ts`, `learning-word-progress.ts`, `text-compare.ts`, `letter-diff.ts`, `spelling-tolerance.ts`, `homophones.ts`, `word-box.ts` (`wordKey`), `learning-bundle.ts` (`normalizeVocabularyText`), `src/integrations/laufdiktat/live-session.ts` (`evaluateLiveAnswer`), `word-store-transfer.ts`
- **Mathematik:** `src/domain/mental-math.ts`, `math-practice.ts`, `src/storage/math-practice.ts`, `app/frei/mathematics/mental-math-app.tsx`
- **Leitner/LernBox:** `src/domain/learning-box.ts`, `leitner-schedule.ts`, `live-vocabulary-placement.ts`, `src/storage/personal-learning-events.ts` (Ausschnitte: `putCardAndEvent`, Bündelübernahme, `recordAttempt`, `importFromLesson`), `app/components/learning-box-app.tsx`
- **Tagesportion:** `src/domain/daily-plan.ts`, `src/storage/daily-plan.ts`, `src/domain/local-day.ts`, `app/lernen/plan-today.ts`, `use-learner-dashboard.ts`, `learner-home.tsx`, `app/components/use-word-store.ts`
- **Werte und Abläufe:** `src/domain/word-round.ts`, `word-store-progress.ts`, `textbox-session.ts`, `textbox-progress.ts`, `live-game-feedback.ts`, `progress-reflection.ts`, `adaptive-learning.ts`, `src/tastschreiben/typing-stats.ts`, `typing-progress.ts`, `typing-session.ts`, `app/components/learning-word-app.tsx`, `textbox-app.tsx`, `app/views/wortspeicher/*` (Eingabefelder), `app/views/textbox/*-screen.tsx` (Eingabefelder), `app/frei/german/laufdiktat/running-dictation-app.tsx`, `app/frei/typing/typing-world.tsx`
- **Sicherung:** `src/domain/personal-backup.ts`, `src/storage/personal-backup.ts`, `src/integrations/cloud-sync/sync.ts`
- **Konzept:** Vault 06 (Leitner), Vault 19 Entscheidung 49/50, `docs/umsetzungsplan-tagesportion.md`; Berichte A, B, D (nur Überschriften, Top-5 und berührte Befunde)

## 3 Ausgeführte Prüfungen

Alle Reproduktionen liegen im Scratchpad unter `repro-g/` und laufen mit der Audit-Konfiguration (`vitest.audit.config.mts`) gegen den unveränderten Repository-Code. Ergebnisse sind den Konsolenausgaben entnommen.

| Datei                                        | Inhalt                                                                                                         | Ergebnis                                                                                                                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `g1-antwortpruefung.test.ts`                 | Zeichentabelle LernBox/Laufdiktat/Live, Stufe 5, Toleranzpaare, Wortausrichtung                                | 6/6 grün; belegt G-001, G-002, G-003, G-014.6; Wortausrichtung korrekt (siehe Stärken)                                                                                                        |
| `g2-laufdiktat-saetze.test.ts`               | Satzzerlegung mit Datum, Abkürzung, Uhrzeit, Dezimalzahl, Anführungszeichen                                    | grün; 6 von 7 Beispielen falsch zerlegt (G-004)                                                                                                                                               |
| `g3-stufe5-herabstufung.test.ts`             | Stufe 5 mit Leerzeichen → Ereignisse und Lernstand                                                             | grün; alle drei Wörter `correct:false`, Box 3 → 1 (G-001)                                                                                                                                     |
| `g4-lernbox-plan.test.ts` (TZ Europe/Berlin) | Richtungskopplung, „falsch = erledigt“, gelöschte Karte, Quoten-Eigenschaftstest (3000 Läufe), Kalendertag     | 5/5 grün; G-005, G-006, G-007 belegt; Quoten halten (≤ 20, eindeutige Schlüssel, ≤ 10 neu, ≤ 4 neu bei Rückstand)                                                                             |
| `g5-mathe.test.ts`                           | Eingabetabelle, Parser, Mehrdeutigkeit von Lücken (80 200 Aufgaben), Generatorgrenzen (fast-check, 2000 Läufe) | Eingabe/Parser/Grenzen grün; Mehrdeutigkeitstest lieferte das Ergebnis, überschritt aber das Standard-Zeitlimit von 5 s (Messwerte trotzdem ausgegeben, G-009); Generatorgrenzen ohne Verstoß |
| `g6-sicherung.test.ts`                       | Zwei Geräte, Sicherung einspielen in beide Richtungen                                                          | grün; G-010 belegt                                                                                                                                                                            |
| `g7-live-platzierung.test.ts`                | Platzierung „practice“/„reset“ + LernBox-Antwort                                                               | grün; G-011 belegt                                                                                                                                                                            |
| `g8-wortkey.test.ts`                         | Groß-/Kleinkollisionen der Lernwort-ID                                                                         | keine Kollision in festen Wortboxen; „essen/Essen“ teilen Lernstand (G-012)                                                                                                                   |
| `g9-satzanfang.test.ts`                      | Übernahme Laufdiktat → Wortspeicher                                                                            | grün; Satzanfänge großgeschrieben übernommen (G-012)                                                                                                                                          |
| `g10-rest.test.ts`                           | Division mit Rest, Unicode-Minus in Lehreraufgaben                                                             | grün; G-014.1/2 belegt                                                                                                                                                                        |

Webrecherche (WebSearch, 20.10.2026) zur iPad-„Intelligenten Interpunktion“: Sie ist eine systemweite Tastatureinstellung (Einstellungen → Allgemein → Tastatur). Ob `autocorrect="off"` sie je Feld abschaltet, ließ sich nicht belegen. Quellen: [leancrew.com – A Mac smart quote curiosity](https://leancrew.com/all-this/2025/03/a-mac-smart-quote-curiosity/), [Stack-Overflow-Spiegel „ios 11 safari html disable smart punctuation“](https://dev.library.kiwix.org/content/stackoverflow_en_nopic_2021-08/questions/48678359/ios-11-safari-html-disable-smart-punctuation), [Apple-Community-Diskussion](https://origin-discussions2-us-dr-prz.apple.com/thread/250339387). Das Verhalten der iPad-Bildschirmtastatur bei Umschalt + Enter und bei Autokorrektur ist **nicht** auf einem Gerät geprüft (kein iPad, kein WebKit).

Nicht wiederholt (laut Auftrag): `npm run check`, Chromium-E2E, Prüfungen aus A, B, D.

## 4 Nicht untersuchte Bereiche

- Verhalten auf echten iPads (Bildschirmtastatur, Intelligente Interpunktion, Autokorrektur, Umschalt + Enter); keine Browserläufe durch G.
- Live-Raum-Ablauf im Browser (Stationsmodus, Battle, Übernahme bei Seitenwechsel); nur Fachlogik gelesen.
- Lehrkraft-Mathe im Laufdiktat (`app/lehrer/live/dictation-adapter.ts`, Lückenbildung bei Ketten) nur über `mathTaskFromPrompt` und `evaluateLiveAnswer` geprüft.
- Cloud-Abgleich-Engine (`src/integrations/cloud-sync/engine.ts`, HLC, Merge der Lehrerdaten) nicht geprüft; nur der Schülerweg `sync.ts` → `restorePersonalLearningBackup`.
- `learning-box-replay.ts`, ereignisbasierter Leitner (`deriveLeitnerProgress`) und `vocabulary-session.ts` nur gelesen (A-003/A-004 decken sie ab).
- Tastenwelt-Spiel „Fallende Wörter“, Spiegelschrift, Duell, Häuser (nicht freigegeben bzw. außerhalb des Schwerpunkts).
- Sommerzeitwechsel nur rechnerisch betrachtet (24-h-Abstände verschieben sich um eine Stunde, durch den LernBox-Puffer unkritisch; für Lernwörter/Mathe gilt G-006).

## 5 Befunde

### G-001 – Wortspeicher Stufe 5: richtig geschriebene, mit Leerzeichen getrennte Wörter gelten alle als falsch und stufen jedes Wort auf Box 1 zurück

- **Bereich:** Antwortprüfung Wortspeicher (Merkblock, Stufe 5), Lernstandsberechnung
- **Status:** bestätigt (reproduziert) für die Fachlogik; begründetes Risiko für die iPad-Bedienung (nicht auf einem Gerät geprüft)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch (Logik), mittel (Häufigkeit auf dem iPad)
- **Fundstelle:** `src/domain/learning-word.ts:10-22` (`parseLearningWords` trennt nur an `\n , ;`), `:61-111` (`evaluateLearningWordBlock`); `src/domain/word-round.ts:194-211, 213-248` (`evaluate`, `submitWordAnswer` erzeugt je Wort einen Fehlversuch); `src/domain/learning-word-progress.ts:37-62` (falsch → Box 1, Stufe −1, sofort fällig); `app/views/wortspeicher/memory-block.tsx:20-33` (Enter sendet ab, Hinweis „Umschalt + Enter erzeugt eine neue Zeile“); `app/components/learning-word-app.tsx:158` (Standard-Blockgröße 3)
- **Beschreibung:** In Stufe 5 schreibt das Kind 2, 3 oder 5 Wörter aus dem Gedächtnis in ein Textfeld. Die Eingabe wird nur an Zeilenumbruch, Komma und Semikolon getrennt, **nicht an Leerzeichen**. „Hund Katze Maus“ ist damit _ein_ Wort: Es wird „Hund“ als „falsch“ zugeordnet, „Katze“ und „Maus“ gelten als „fehlt“. `submitWordAnswer` meldet für **jedes** Wort einen Fehlversuch; `updateLearningWordProgress` setzt jedes auf Box 1, senkt die Merkstufe und macht es sofort fällig. Die Oberfläche nennt als Trennung nur „Umschalt + Enter“; Komma und Semikolon werden nirgends erwähnt, Leerzeichen sind die natürliche Wahl eines Kindes. Enter allein sendet sofort ab. Auf der iPad-Bildschirmtastatur gibt es nach meinem Kenntnisstand keine zuverlässige Umschalt-Enter-Kombination (nicht auf Gerät verifiziert). Die Standard-Blockgröße ist 3.
- **Reproduktion / Prüfweg:** `repro-g/g3-stufe5-herabstufung.test.ts` und `g1-antwortpruefung.test.ts`:
  ```ts
  submitWordAnswer(finishMemorize(startWordRound({stage:5, blockSize:3, words:["Hund","Katze","Maus"], …})), "Hund Katze Maus")
  // attempts: Hund/Katze/Maus jeweils correct:false
  updateLearningWordProgress({box:3, stage:5, …}, {correct:false, stage:5, …})
  // → {"box":1,"stage":4,"dueAt": jetzt}
  evaluateLearningWordBlock(["Hund","Katze","Maus"], "Hund Katze Maus")
  // → Hund: falsch ("Hund Katze Maus"), Katze: fehlt, Maus: fehlt
  evaluateLearningWordBlock([...], "Hund, Katze, Maus").allCorrect === true
  ```
- **Betroffene Nutzergruppen:** alle Kinder, die Stufe 5 mit Blockgröße > 1 wählen, besonders auf iPads ohne Hardwaretastatur; Lehrkräfte, die Merkstufen und „sicher“-Zahlen lesen.
- **Mögliche Folgen:** Eine vollständig richtige Leistung wird als dreifacher Fehler gespeichert, die Wörter fallen auf Box 1 zurück, Merkstufe sinkt, die Wörter füllen am nächsten Tag die Fehlerquote der Tagesportion. Das Kind erlebt „falsch“, obwohl es richtig geschrieben hat; die Rückmeldung zeigt „Hund Katze Maus statt Hund“. Der Fehler ist für Lehrkräfte unsichtbar.
- **Empfehlung:** In Stufe 5 an jedem Leerraum trennen (`/[\s,;]+/u`); Mehrwortausdrücke kommen in den eingebauten Wortboxen nicht vor, für eigene Boxen mit Leerzeichen getrennte Eingabefelder je Wort verwenden. Alternativ ein Eingabefeld je Wort (wie Stufe 1–4). Hinweistext anpassen. Ein Komponententest „Leerzeichen, Komma, Zeilenumbruch ergeben dasselbe Ergebnis“.
- **Aufwand (grob):** S
- **Erfolgskriterium:** `evaluateLearningWordBlock(["Hund","Katze","Maus"], "Hund Katze Maus").allCorrect === true`; ein Browsertest auf iPad-Viewport gibt drei Wörter ohne Umschalttaste ein und erhält „Richtig“.

### G-002 – Typografische Apostrophe und Anführungszeichen sowie zerlegte Umlaute machen richtige Antworten falsch (LernBox, Laufdiktat)

- **Bereich:** Antwortprüfung LernBox, Laufdiktat (Text und Vokabeln, live und allein)
- **Status:** bestätigt (reproduziert) für die Vergleichslogik; begründetes Risiko für die Häufigkeit auf dem iPad
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Logik); mittel (ob iPadOS bei `autocorrect="off"` die „Intelligente Interpunktion“ unterdrückt, ist nicht verifiziert)
- **Fundstelle:** `src/domain/learning-bundle.ts:231-237` (`normalizeVocabularyText`: NFKC, Leerraum, Kleinschreibung – keine Zeichenäquivalenzen); `src/domain/learning-box.ts:158-173` (`evaluateLearningBoxAnswer`); `src/domain/running-dictation.ts:91-122` (`normalizeVocabularyAnswer`, Text: `input.trim() === item.target` ohne NFC); `src/integrations/laufdiktat/live-session.ts:82-129` (`normalizeAnswer`, Text: `value === word.targetWord`)
- **Beschreibung:** Keine Antwortprüfung setzt `’ ‘ ʼ` mit `'`, `„ “ ” » «` mit `"` oder `‑ –` mit `-` gleich. Englische Vokabeln enthalten häufig Apostrophe („don't“, „I'm“, „o'clock“). Lehrkräfte erstellen Listen am PC (gerades `'`) oder kopieren aus Word (typografisches `’`); die iPad-Tastatur ersetzt `'`/`"` bei eingeschalteter „Intelligenter Interpunktion“ (Standard) durch typografische Zeichen. Laut Recherche ist das eine systemweite Tastatureinstellung; ob `autocorrect="off"` sie im Eingabefeld abschaltet, ist offen (Quellen siehe Abschnitt 3). Passt das Zeichen nicht, ist die richtige Antwort nicht eingebbar. In der LernBox fällt die Karte auf Box 1, im Live-Laufdiktat gilt der Abschnitt als falsch, das Kind schreibt ihn neu. Zusätzlich vergleicht die Laufdiktat-Textprüfung ohne Unicode-Normalisierung: Ein zerlegt (NFD) eingegebenes „ä“ ist falsch. Das kommt bei Bildschirmtastaturen selten vor, bei kopierten Lehrertexten (PDF, macOS) aber durchaus auf der Zielseite.
- **Reproduktion / Prüfweg:** `repro-g/g1-antwortpruefung.test.ts`:
  ```
  LernBox  "don't" vs "don’t" → false;  "don’t" vs "don't" → false;  "E-Mail" vs "E‑Mail"(U+2011) → false
  Laufdiktat Text  "Der Bär läuft." vs NFD-Eingabe → false;  "Tom's Hund bellt." vs "Tom’s …" → false
  Live evaluateLiveAnswer(text, NFD) → "wrong";  Vokabel "don't"/"don’t" → "wrong" (mit Schreiberleichterung "tolerated")
  Positiv: NFD in LernBox (NFKC) → true; geschütztes Leerzeichen → true; Wortspeicher/Textbox normalisieren NFC → richtig
  ```
- **Betroffene Nutzergruppen:** Kinder mit Englisch-/Französisch-Vokabeln (Apostroph, Elision „l'école“), Laufdiktat mit wörtlicher Rede oder Apostroph; Lehrkräfte, die Fehlerzahlen auswerten.
- **Mögliche Folgen:** Fachlich richtige Antworten werden als falsch gewertet und zurückgestuft; Kinder lernen, dass „die App spinnt“; Fehlerstatistiken der Lehrkraft enthalten Scheinfehler.
- **Empfehlung:** Eine einzige Vergleichsnormalisierung für alle Module: NFC (bzw. NFKC), Apostroph-Familie → `'`, Anführungszeichen-Familie → `"`, Bindestrich-/Minus-Varianten → `-`, alle Leerräume → ein Leerzeichen; auf Ziel und Eingabe anwenden. Für das Laufdiktat zusätzlich D-008 (wortweiser Vergleich) umsetzen. Tabellentest mit den Zeichenpaaren dieses Befunds.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Alle Zeilen der obigen Tabelle liefern „richtig“; ein Eigenschaftstest „Ersetzen eines Zeichens durch seine typografische Variante ändert das Ergebnis nicht“ ist grün.

### G-003 – LernBox und Laufdiktat-Vokabeln kennen nur „|“ als Alternativtrenner; übliche Schreibweisen aus Vokabellisten („(to) go“, „home / house“, „groß, riesig“) machen jede kürzere richtige Antwort falsch

- **Bereich:** Antwortprüfung LernBox, Import, Vokabelpakete
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch (Logik), mittel (Häufigkeit hängt von den Inhalten ab)
- **Fundstelle:** `src/domain/learning-box.ts:150-173` (`learningBoxAlternatives` nur `|`), `:208-228` (`parseLearningBoxImport`: `;` ist Spaltentrenner); `src/domain/running-dictation.ts:144-174` (`parseVocabularyTable`, nur `|`)
- **Beschreibung:** Vokabellisten aus Lehrwerken und von Lehrkräften schreiben Varianten mit Schrägstrich oder Komma und optionale Teile in Klammern. Die Prüfung vergleicht die ganze Zeichenkette. „go“ und „to go“ sind für „(to) go“ falsch; „home“ ist für „home / house“ falsch; „groß“ ist für „groß, riesig“ falsch. Richtig ist nur die wörtliche Abschrift einschließlich Klammer oder Schrägstrich. Ein Semikolon in der Antwort zerlegt beim Massenimport die Zeile in Spalten (das zweite Synonym wird zum Tag). Umgekehrt ist die LernBox bei der Groß-/Kleinschreibung immer tolerant: „der hund“ gilt für „der Hund“ als richtig. Das ist im Live-Laufdiktat schaltbar (`caseSensitive`), in der LernBox nicht, und widerspricht der strengen Prüfung im Wortspeicher.
- **Reproduktion / Prüfweg:** `repro-g/g1-antwortpruefung.test.ts` (`evaluateLearningBoxAnswer`): „(to) go“/„go“ → false, „(to) go“/„to go“ → false, „home / house“/„home“ → false, „groß, riesig“/„groß“ → false, „home | house“/„house“ → true, „der Hund“/„der hund“ → true, „Hund“/„hund“ → true.
- **Betroffene Nutzergruppen:** Kinder der Sekundarstufe mit Lehrwerkslisten; Lehrkräfte, die Listen per „Viele einfügen“ übernehmen.
- **Mögliche Folgen:** Systematische Scheinfehler bei Synonym- und Klammervokabeln; Karten pendeln zwischen Box 1 und 2. Kinder lernen die Schreibweise der Liste („home / house“) statt der Vokabel. Deutsche Nomen werden in der Rückrichtung ohne Großschreibung als richtig verbucht.
- **Empfehlung:** Beim Anlegen/Import `/` und `,` (außerhalb von Klammern) als Alternativtrenner anbieten (mit Vorschau); optionale Klammerteile als zwei Alternativen expandieren („to go“, „go“). In der Vorschau zeigen, welche Antworten akzeptiert werden. Groß-/Kleinschreibung je Stapel einstellbar machen, für Deutsch als Antwortsprache standardmäßig streng.
- **Aufwand (grob):** M
- **Erfolgskriterium:** Für „(to) go“ werden „go“ und „to go“ akzeptiert; Importvorschau zeigt die erkannten Alternativen; Test für Semikolon in der Antwort.

### G-004 – Laufdiktat zerlegt Texte an jedem Punkt: Datumsangaben, Abkürzungen, Uhrzeiten, Dezimalzahlen und wörtliche Rede ergeben unsinnige Abschnitte

- **Bereich:** Laufdiktat (live und allein), Aufbereitung des Lehrer- bzw. Kindertextes
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/running-dictation.ts:124-142` (`parseRunningDictationText`, Muster `[^.!?]+[.!?]+(?:[”’“»›)\]}]+)?`); genutzt von `src/integrations/laufdiktat/teacher-session.ts:114` und `app/frei/german/laufdiktat/running-dictation-app.tsx:77`
- **Beschreibung:** Jeder Punkt beendet einen Abschnitt. Das schließende gerade Anführungszeichen `"` und das deutsche `«` fehlen in der Liste der nachgestellten Zeichen und wandern an den Anfang des nächsten Abschnitts. Zeilenumbrüche verhindern die Zerlegung nicht; die Lehrkraft hat keinen Ausweg.
- **Reproduktion / Prüfweg:** `repro-g/g2-laufdiktat-saetze.test.ts`:
  ```
  "Am 3. Oktober ist Feiertag. Wir haben frei." → ["Am 3.","Oktober ist Feiertag.","Wir haben frei."]
  "Wir treffen uns z. B. am Montag. …"          → ["Wir treffen uns z.","B.","am Montag.", …]
  "Dr. Meier kommt um 8.30 Uhr. Er ist nett."   → ["Dr.","Meier kommt um 8.","30 Uhr.", …]
  "Es kostet 3.50 Euro. …"                      → ["Es kostet 3.","50 Euro.", …]
  'Sie rief: "Halt!" Dann ging sie.'            → ['Sie rief: "Halt!', '" Dann ging sie.']
  "Sie rief: »Halt!« Dann ging sie."            → ["Sie rief: »Halt!","« Dann ging sie."]
  "Sie rief: „Halt!“ Dann ging sie."            → korrekt
  ```
- **Betroffene Nutzergruppen:** Lehrkräfte mit eigenen Diktattexten (Datumsangaben und „z. B.“ sind in Grundschuldiktaten häufig), Kinder im Laufdiktat.
- **Mögliche Folgen:** Abschnitte wie „B.“ oder „Am 3.“ sind Merkeinheiten ohne Sinn. Abschnitte, die mit `"` oder `«` und Leerzeichen beginnen, muss das Kind zeichengenau so abschreiben; in Verbindung mit D-008 (zeichengenauer Vergleich) und G-002 wird die richtige Wiedergabe der wörtlichen Rede praktisch unmöglich. Die Zahl der Abschnitte und damit Sterne und Fehlerquote verfälschen sich.
- **Empfehlung:** Satzende nur bei `[.!?]` gefolgt von Leerraum und Großbuchstabe/Anführungszeichen, mit einer kurzen Ausnahmeliste (z. B., d. h., usw., Dr., Nr., Ordinalzahl vor Monatsnamen, Ziffer.Ziffer). Alle schließenden Anführungszeichen (`" « ” “ ’ »`) an den Satz anhängen. Vorschau der Abschnitte für die Lehrkraft mit der Möglichkeit, Zeilenumbrüche als harte Abschnittsgrenze und einzig gültige Grenze festzulegen.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Die sieben Beispiele ergeben jeweils zwei bzw. drei vollständige Sätze; Eigenschaftstest: Verbinden der Abschnitte mit Leerzeichen ergibt den Originaltext.

### G-005 – LernBox: Beide Richtungen teilen sich `lastReviewed`; die 8-Stunden-Regel blockiert den Aufstieg der anderen Richtung

- **Bereich:** Leitner-Logik LernBox (Vault 06 „beide Richtungen unabhängig“, 8-Stunden-Regel)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-box.ts:45-66` (ein Feld `lastReviewed` je Karte), `:375-381` (`recovering` prüft `card.lastReviewed`), `:400-432` (beide Zweige setzen `lastReviewed: now`); `app/components/learning-box-app.tsx:398-416` („Eine Karte kann in der Runde zweimal vorkommen (vorwärts und rückwärts)“); `src/storage/daily-plan.ts:77` (`occurredAt` für Fehler ebenfalls aus dem gemeinsamen Feld)
- **Beschreibung:** Box, Abstand und Termin sind je Richtung getrennt gespeichert, der Zeitpunkt der letzten Abfrage nicht. Die Regel „richtig in Box 1 weniger als 8 Stunden nach dem letzten Abruf → kein Aufstieg“ liest deshalb auch einen Abruf der **anderen** Richtung. In der Tagesportion stehen Vorwärts- und Rückwärtselement derselben Karte typischerweise in derselben Runde. Wurden beide Richtungen vor Tagen falsch beantwortet und sind beide jetzt fällig, steigt nur die zuerst abgefragte auf; die zweite bleibt trotz eigenständigem, fälligem, richtigem Abruf in Box 1 und kommt morgen erneut. Umgekehrt kann eine Abfrage der anderen Richtung den Erholungsabstand verkürzen oder verlängern.
- **Reproduktion / Prüfweg:** `repro-g/g4-lernbox-plan.test.ts`: Beide Richtungen am 18.10. falsch; am 20.10. vorwärts richtig (→ Box 2), eine Minute später rückwärts richtig → `reverseBox` bleibt **1**. Gegenprobe ohne vorherige Vorwärtsabfrage → `reverseBox` **2**. Ausgabe: `{"forwardAfter":2,"reverseAfterBoth":1,"reverseAlone":2}`.
- **Betroffene Nutzergruppen:** alle LernBox-Nutzer mit Rückrichtung (ab Box 2 in der Portion), besonders Kinder mit vielen Fehlerkarten.
- **Mögliche Folgen:** Richtig gelernte Vokabeln bleiben einen zusätzlichen Zyklus in Box 1; die Fehlerquote der Portion (max. 6) wird mit Karten belegt, die nicht mehr fehlerhaft sind; „Meine Fehler“ und „schwierig“ auf der Startseite zeigen Scheinfehler.
- **Empfehlung:** `lastReviewed` je Richtung führen (`reverseLastReviewed`) oder die Regel auf den Zeitpunkt des letzten **Fehlers dieser Richtung** stützen. Regressionstest wie oben; Migration: fehlendes Feld aus `lastReviewed` übernehmen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Der Test ergibt `reverseAfterBoth = 2`; ein Eigenschaftstest „Abfragen der einen Richtung ändern das Ergebnis der anderen nicht“ ist grün.

### G-006 – „1/3/7/14 Tage“ verschieben sich bei fester Übungszeit um einen Kalendertag (Lernwörter, Mathe), weil Fälligkeit auf die Minute gerechnet und die Portion einmal am Tag gebildet wird

- **Bereich:** Tagesportion, Fälligkeit, Zeitrechnung
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-word-progress.ts:53-55` (`now + Tage × 86 400 000`); `src/domain/math-practice.ts:212-218` (dito); `src/storage/daily-plan.ts:133-150` (`word.dueAt > now`, `review.dueAt > now` streng, ohne Puffer), `:197-227` (Portion einmal je Tag fest); zum Vergleich `src/domain/learning-box.ts:316-327` (`isLearningBoxCardDue` mit 4 bzw. 12 Stunden Puffer)
- **Beschreibung:** Die Portion entsteht beim ersten Öffnen des Tages und bleibt fest („Was im Laufe des Tages neu fällig wird, kommt erst morgen“). Lernwort- und Mathe-Fälligkeiten liegen exakt 24 h × Tage nach dem letzten Üben, auf die Minute. Übt ein Kind täglich zur selben Zeit (Zielbild: kurze Einheit zu Stundenbeginn), entsteht die Portion einige Minuten **vor** dem Fälligkeitszeitpunkt. Das Element fehlt in der heutigen Portion und erscheint erst morgen. Jeder Abstand wird so um einen Tag länger (1→2, 3→4, 7→8 …). Die LernBox hat dafür einen Puffer von 4 bzw. 12 Stunden, die beiden anderen Module nicht. Das ist eine weitere Ausprägung von A-004 (parallele Regeln) mit eigener, messbarer Folge. Zusätzlich zeigt die LernBox-Rückmeldung nach einem Fehler „kommt morgen wieder“, obwohl die Karte sofort fällig ist (`nextLabel`, `learning-box-app.tsx:166-171`, `Math.max(1, …)`).
- **Reproduktion / Prüfweg:** `repro-g/g4-lernbox-plan.test.ts` (TZ=Europe/Berlin): Lernwort Montag 08:05 richtig → `dueAt` Donnerstag 08:05; Portion Donnerstag 08:00 → **nicht enthalten**, Freitag 08:00 → enthalten. LernBox gleicher Ablauf → Donnerstag enthalten. Mathe: Fehler 08:01, saubere Antwort 08:05 (neue Runde) → fällig Dienstag 08:05; Portion Dienstag 08:00 → **nicht enthalten**, Mittwoch → enthalten. Ausgabe: `{"wortThu0800":false,"wortFri0800":true,"lernboxThu0800":true,"mathTue0800":false,"mathWed0800":true}`.
- **Betroffene Nutzergruppen:** Kinder, die regelmäßig zur gleichen Zeit üben (Unterrichtsroutine); Lehrkräfte, die sich auf die dokumentierten Abstände verlassen.
- **Mögliche Folgen:** Abstände sind systematisch länger als dokumentiert; an manchen Tagen ist die Portion kleiner oder leer („Heute ist nichts dran“), obwohl am selben Vormittag etwas fällig wird; Mathe und Lernwörter verhalten sich anders als die LernBox.
- **Empfehlung:** Fälligkeit als **lokaler Kalendertag** führen (`dueDay = localDayKey(now) + n Tage`) und in der Portion „fällig, wenn `dueDay ≤ heute`“ prüfen, für alle Module über eine gemeinsame Funktion (siehe A-004, A-013). Die LernBox-Puffer dann entfernen. Rückmeldetext nach Fehlern an den tatsächlichen Termin anpassen.
- **Aufwand (grob):** M (inkl. Migration bestehender Zeitstempel)
- **Erfolgskriterium:** Der obige Test ergibt für alle drei Module „Donnerstag bzw. Dienstag enthalten“; Eigenschaftstest: Für jede Übungszeit t und jede Portionszeit am Tag `t + n` ist das Element enthalten.

### G-007 – Tagesportion: Eine falsche Antwort zählt als „erledigt“; gelöschte Karten bleiben für immer offen und erzeugen eine Sackgasse

- **Bereich:** Tagesportion, Fortschrittsanzeige der Startseite
- **Status:** bestätigt (reproduziert) für die Fachlogik; bestätigt (Codeanalyse) für die Sackgasse in der Oberfläche
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/daily-plan.ts:220-268` (`dailyPlanProgress`: jedes Ereignis erledigt, unabhängig vom Ergebnis; keine Prüfung, ob das Objekt noch existiert); `app/components/learning-box-app.tsx:155-164` (`buildPlanQueue` verwirft gelöschte Karten stillschweigend), `:276-279` und `:356-360` (leere Warteschlange → „Dein Teil für heute ist geschafft“); `app/lernen/learner-home.tsx:24-47` und `app/lernen/use-learner-dashboard.ts:72-91` (Ring `done/total`, „Weiterlernen“ führt zum ersten offenen Modul); `src/storage/personal-learning-events.ts:345, 409, 494` (Löschen entfernt die Karte, nicht das Portionselement)
- **Beschreibung:** (1) Ein Element gilt als erledigt, sobald irgendein Ereignis vorliegt, auch ein falsches. Zwanzig falsche Antworten ergeben „20 von 20, Tagesziel geschafft“. Das ist im Umsetzungsplan so gewollt („wie oft geübt wurde, ist gleichgültig“), die Oberfläche nennt es aber Ziel und Erfolg, nicht „bearbeitet“. Die falsch beantworteten Elemente kommen erst morgen wieder (Plan fest). (2) Löscht das Kind eine Karte oder einen Stapel, die in der heutigen Portion stehen, bleibt das Element offen: Der Ring bleibt z. B. bei 19/20, „Weiterlernen“ führt in die LernBox, die meldet „Dein Teil für heute ist geschafft“, und zurück auf der Startseite ist wieder ein Element offen.
- **Reproduktion / Prüfweg:** `repro-g/g4-lernbox-plan.test.ts`: Portion mit einem Fehlerelement, ein falsches Ereignis → `{"done":1,"total":1}`; Portion mit Karte c1, Karte gelöscht → `total − done = 1` ohne Möglichkeit, ein Ereignis zu erzeugen. Oberflächenpfad per Codelesung (Zeilen oben).
- **Betroffene Nutzergruppen:** Kinder (Erfolgsmeldung trotz Fehlern; Endlosschleife „Weiterlernen“), Lehrkräfte und Eltern, die „Tagesziel geschafft“ als Lernerfolg lesen.
- **Mögliche Folgen:** Die zentrale Fortschrittsanzeige misst Aktivität, nicht Können; ein Kind kann durch Raten „fertig“ werden. Gelöschte Inhalte verhindern dauerhaft (bis Mitternacht) den Abschluss und führen in eine Schleife.
- **Empfehlung:** Anzeige ehrlich benennen („20 bearbeitet, davon 14 richtig“) oder falsch beantwortete Elemente am Rundenende ein zweites Mal anbieten und erst dann als bearbeitet zählen. In `dailyPlanProgress` Elemente ohne existierendes Objekt als erledigt bzw. entfallen werten (Kartenliste übergeben), oder beim Löschen das Portionselement entfernen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Test „Karte der Portion gelöscht → `total` sinkt oder Element erledigt“; die Startseite unterscheidet „bearbeitet“ und „richtig“.

### G-008 – Zahlenprüfung: absolute Toleranz 0,01 wertet typische Kommafehler als richtig; Tausenderpunkt und Tausenderleerzeichen werten richtige Ergebnisse als falsch

- **Bereich:** Mathe-Antwortprüfung (Kopfrechnen inkl. eigener Aufgaben, Laufdiktat-Mathe live)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/mental-math.ts:625-634` (`checkMentalMathAnswer`: `replace(",", ".")`, `Number(…)`, `Math.abs(…) < 0.01`); `src/integrations/laufdiktat/live-session.ts:80, 107-114` (`NUMERIC_TOLERANCE = 0.01`, gleiche Umwandlung); Aufrufer `src/storage/math-practice.ts:51-55`
- **Beschreibung:** Die Toleranz ist **absolut** 0,01 statt an die Stellen der Lösung gebunden. Bei Dezimalaufgaben (eigene Aufgaben im Kopfrechnen, Lehrer-Mathe im Laufdiktat, Klasse 5/6) gelten damit falsche Ergebnisse als richtig, gerade die typischen Stellenwertfehler. Umgekehrt werden Schreibweisen, die Kinder in der Schule lernen, als Fehler verbucht: „1.000“ ergibt die Zahl 1, „1 000“ ist keine Zahl. Beides speichert ein Fehlerereignis und legt einen Wiederholungsposten an. Kleinere Auffälligkeiten: Unicode-Minus „−3“ (so zeigt die App selbst Minus an) und „- 3“ sind falsch; „0x10“ und „1e1“ gelten als 16 bzw. 10.
- **Reproduktion / Prüfweg:** `repro-g/g5-mathe.test.ts`:
  ```
  checkMentalMathAnswer({answer: 0.01}, "0,001")  → true   (0,1 · 0,1: Kommafehler gilt als richtig; live ebenso "correct")
  checkMentalMathAnswer({answer: 0.025}, "0,02") → true;  "0,03" → true
  checkMentalMathAnswer({answer: 3}, "2,995")     → true
  checkMentalMathAnswer({answer: 1/3}, "0,34")    → true;  "1/3" → false
  checkMentalMathAnswer({answer: 1000}, "1.000") → false;  "1 000" → false;  ({answer: 1}, "1.000") → true
  checkMentalMathAnswer({answer: -3}, "−3")       → false; "- 3" → false
  ```
- **Betroffene Nutzergruppen:** Kinder mit Dezimal- und Größenaufgaben (Sek I, Klasse 4 Größen); Kinder im Zahlenraum bis 1 000 000; Lehrkräfte, die Fehlerlisten auswerten.
- **Mögliche Folgen:** Fehlvorstellungen zur Kommaverschiebung werden bestätigt statt erkannt; richtige Ergebnisse mit Tausendertrennung werden zum „Fehler“, erzeugen Wiederholungen und verfälschen die Fehlerfamilien (D-009).
- **Empfehlung:** Exakten Dezimalvergleich verwenden: Eingabe nach Entfernen von Tausenderpunkten/-leerzeichen (nur in gültigen Dreiergruppen) und Ersetzen von „,“ und „−“ in eine Dezimalzahl umwandeln; Lösung auf ihre Nachkommastellen runden und exakt vergleichen. Für nicht abbrechende Ergebnisse (1/3) eine Bruchantwort zulassen oder die geforderte Rundung im Aufgabentext nennen. `Number()` durch einen strengen regulären Ausdruck ersetzen.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Tabellentest: „0,001“ für 0,01 falsch; „1.000“ und „1 000“ für 1000 richtig; „1.000“ für 1 falsch; „−3“ für −3 richtig.

### G-009 – Lückenaufgaben mit Null sind mehrdeutig („0 · _ = 0“): jede andere richtige Zahl wird als Fehler gewertet

- **Bereich:** Mathe-Generator, Lückenmodus (Einmaleins, Division)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/mental-math.ts:447-525` (`generateOperands`: Faktor 0…10, Null nur mit `excludeZeroOperand` ausgeschlossen), `:567-596` (`buildMentalMathTask`: eine einzige Lösung), `:598-623` (`generateMentalMathTasks`: Lückenposition zufällig); `app/frei/mathematics/mental-math-app.tsx:105-112` (Standard: Nullen erlaubt, Lückenposition „gemischt“)
- **Beschreibung:** Im Lückenmodus entstehen Aufgaben wie „0 · _ = 0“, „_ · 0 = 0“ oder „0 : _ = 0“. Jede Zahl (bei der Division jede von 0 verschiedene) ist eine richtige Lösung, akzeptiert wird nur der zufällig gezogene Faktor. Die richtige Antwort „0“ oder „1“ wird als Fehler gespeichert und erzeugt einen Wiederholungsposten in der Familie „Reihe n“.
- **Reproduktion / Prüfweg:** `repro-g/g5-mathe.test.ts` (20 050 Lückenaufgaben je Rechenart, Standard ohne Nullausschluss, Zahlenraum 100): Multiplikation **637 (3,2 %)** mehrdeutig, Beispiel „0 · _ = 0 (erwartet 6, auch richtig z. B. 0)“; Division **629 (3,1 %)**, Beispiel „0 : _ = 0 (erwartet 5, auch richtig z. B. 1)“; Addition/Subtraktion 0.
- **Betroffene Nutzergruppen:** Grundschulkinder beim Einmaleins mit Lücken; Kinder mit Rechenschwäche, die gerade die Nullregel verstanden haben.
- **Mögliche Folgen:** Ein mathematisch richtiges Verständnis („jede Zahl mal 0 ist 0“) wird als falsch zurückgemeldet; das ist didaktisch besonders schädlich. Fehlerstatistik und Familienwiederholung werden verfälscht.
- **Empfehlung:** Im Lückenmodus keine Lücke an einer Stelle bilden, deren Wert durch eine Null nicht bestimmt ist (Generator neu ziehen), oder jede Zahl akzeptieren, die die Gleichung erfüllt (Gleichung mit der Eingabe auswerten statt mit `task.answer` vergleichen). Letzteres löst auch Lehrer-Lückenaufgaben im Laufdiktat.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Eigenschaftstest: Für jede erzeugte Lückenaufgabe gibt es genau eine ganze Zahl im Zahlenraum, die die Gleichung erfüllt – oder die Prüfung akzeptiert alle.

### G-010 – Sicherung/Cloud-Abgleich: „neuerer Datensatz gewinnt“ überschreibt monotone Werte; eine bestandene Tastenwelt-Lektion wird wieder gesperrt, Bestwerte sinken

- **Bereich:** Persönliche Sicherung und Schüler-Cloud-Abgleich (Zusammenführung jenseits von B-001)
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/storage/personal-backup.ts:237-267` (`restorePersonalLearningBackup`: `learningWordProgress` und `typingProgress` werden als ganzer Datensatz ersetzt, wenn `lastPracticedAt` neuer ist); `src/integrations/cloud-sync/sync.ts:16-33` (Schüler-Abgleich = Sicherung hochladen + fremde Sicherung einspielen); `src/tastschreiben/typing-progress.ts:10-31` (`completed`, `bestWpm`, `bestAccuracy` sind monoton gedacht)
- **Beschreibung:** Beim Einspielen einer Sicherung bzw. beim Cloud-Abgleich zweier Geräte gewinnt bei Tastenwelt- und Lernwort-Fortschritt der Datensatz mit dem jüngeren Übungszeitpunkt **vollständig**. Felder, die nur wachsen dürfen (`completed`, Bestwerte, Versuchszähler), werden dadurch zurückgesetzt. Das Ergebnis meldet „aktualisiert“, keinen Konflikt. Für Lernwörter ist „jüngster Stand gewinnt“ beim Box-Wert vertretbar, die Zähler (`attempts`, `incorrectAttempts`, `helpUses`) des anderen Geräts gehen aber verloren und widersprechen danach den zusammengeführten Ereignissen (vgl. A-003). LernBox-Karten werden dagegen vorsichtig behandelt (Konflikt statt Überschreiben), was A-003 beschreibt.
- **Reproduktion / Prüfweg:** `repro-g/g6-sicherung.test.ts` (zwei fake-indexeddb-Datenbanken): Gerät A „lesson-3“ `completed: true, bestWpm 18, bestAccuracy 96, attempts 4` (Mo); Gerät B `completed: false, bestWpm 9, bestAccuracy 80, attempts 1` (Di). B exportiert, A spielt ein → `{"updated":2,"conflicts":[]}`, A hat danach `completed: false, bestWpm 9, bestAccuracy 80, attempts 1`; Lernwort „Hund“ Box 4/5 Versuche → Box 1/1 Versuch. Rückweg A → B: `unchanged 2`, d. h. beide Geräte sind jetzt dauerhaft auf dem schlechteren Stand.
- **Betroffene Nutzergruppen:** Kinder mit Schul- und Heimgerät oder Gerätewechsel, die den Cloud-Abgleich oder Sicherungsdateien nutzen.
- **Mögliche Folgen:** Freigeschaltete Lektionen sind wieder gesperrt, Bestwerte und Medaillen sinken ohne Grund; Lernwort-Statistiken („x-mal falsch“, „Wiederholungen“) werden kleiner. Das Kind verliert sichtbar Erreichtes – demotivierend und für Lehrkräfte unerklärlich.
- **Empfehlung:** Feldweise zusammenführen: `completed = a || b`, Bestwerte `max`, Zähler als Summe nur über neue Ereignisse (besser: aus Ereignissen ableiten, A-003), `lastPracticedAt = max`, Box/Stufe vom jüngeren Stand. Eigenschaftstest „Zusammenführen ist kommutativ, idempotent und verringert keinen monotonen Wert“.
- **Aufwand (grob):** S (Tastenwelt), M (Lernwörter mit Zählern)
- **Erfolgskriterium:** Der Test ergibt nach dem Abgleich `completed: true, bestWpm 18, bestAccuracy 96`; Kommutativitätstest grün.

### G-011 – Fehler in der Unterrichtsrunde beschleunigen den LernBox-Aufstieg: „practice“/„reset“ machen die Karte fällig, ohne den Abrufzeitpunkt zu setzen

- **Bereich:** Laufdiktat → LernBox (Entscheidung 49), Leitner-Regeln „kein Aufstieg vor Fälligkeit“ und 8-Stunden-Regel
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/domain/learning-box.ts:444-470` (`placeLiveVocabularyCard`: setzt nur `box/level/interval/nextReview`), `:352-397` (`processLearningBoxResult`: `early` hängt an `nextReview`, `recovering` an `lastReviewed` und nur an Box 1); `src/storage/personal-learning-events.ts:655-680` (Übernahme: `lastReviewed` bleibt alt, ohne Platzierung `nextReview: now`)
- **Beschreibung:** Entscheidung 49 will, dass Wörter mit Fehlversuchen im Unterricht „bald wieder geübt“ werden („Box bleibt, sofort fällig“ bzw. „Box 1, sofort fällig“). Technisch wird dafür nur `nextReview = jetzt` gesetzt. Damit fällt der Schutz „zu frühes Üben ist nur Üben“ weg, und weil `lastReviewed` nicht aktualisiert wird, greift auch die 8-Stunden-Regel nicht. Die erste richtige LernBox-Antwort nach der Stunde, auch zehn Minuten später, hebt die Karte deshalb **eine Box höher** als ohne Unterrichtsrunde. Ein Wort, das im Unterricht zweimal falsch war, verschwindet für 14 statt 5 Tage aus der Wiederholung. Nach einer Hilfe oder drei Fehlversuchen („reset“) landet es nach einer sofortigen richtigen Antwort in Box 2 (3 Tage). Derselbe Fehler direkt in der LernBox ergibt Box 1 (1 Tag). Die „ehrliche Kontrolle“ der Runde wirkt also umgekehrt.
- **Reproduktion / Prüfweg:** `repro-g/g7-live-platzierung.test.ts`: Karte in Box 3, zuletzt vor 2 Tagen geübt (nächste Fälligkeit in 5 Tagen). Richtig nach 10 Minuten:
  ```
  ohne Unterrichtsrunde        → Box 3, nächste Fälligkeit 5 Tage (zu früh, kein Aufstieg)
  nach „practice“ (2 Fehler)   → Box 4, 14 Tage
  nach „reset“ (Hilfe/≥3)      → Box 2, 3 Tage
  Fehler direkt in der LernBox → Box 1, 1 Tag
  ```
- **Betroffene Nutzergruppen:** alle Kinder, deren Lehrkraft Vokabel-Laufdiktate mit Übernahme nutzt (Standard „Nur Übungsbedarf übernehmen“); Kinder mit Schreiberleichterung (tolerierte Wörter sind immer „practice“).
- **Mögliche Folgen:** Genau die Wörter, mit denen ein Kind im Unterricht Mühe hatte, steigen nach einer einzigen Sofortwiederholung schneller auf als sichere Wörter. Die Lehrkraft verlässt sich auf die Übernahme als Förderinstrument, die Wiederholung wird aber verkürzt.
- **Empfehlung:** Platzierung als echtes Ereignis behandeln: `lastReviewed = now` setzen (dann greift die 8-Stunden-Regel) und für „practice“ einen eigenen Zustand „Fehler offen“ führen, dessen nächste richtige Antwort den Fehler nur schließt (wie `recovering`), unabhängig von der Box. Alternativ „practice“ als Box − 1 platzieren. Regressionstest wie oben.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Im Test ergeben „practice“ und „reset“ nach 10 Minuten keinen Aufstieg; nach ≥ 8 Stunden genau eine Box.

### G-012 – Laufdiktat → Wortspeicher übernimmt Satzanfänge großgeschrieben; die Einzelwortübung verlangt dann „Heute“ und wertet das richtige „heute“ als Fehler

- **Bereich:** Übernahme Laufdiktat → Wortspeicher (Plan 2.8, Entscheidung 49), Antwortprüfung Wortspeicher, Lernwort-Identität
- **Status:** bestätigt (reproduziert)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:** `src/integrations/laufdiktat/word-store-transfer.ts:43-61` (`misspelledWords`: übernimmt `expected` wörtlich, auch „gross-klein“ am Satzanfang), `:67-98` (`buildWordStoreTransfer`: `wordsOf(tokenizeText(targetWord))` ohne Satzanfangsbehandlung); `src/storage/personal-learning-events.ts:1175-1232` (`importFromLesson`); `src/domain/text-compare.ts:224-252` (`compareGaps`: Groß-/Kleinabweichung = Fehler); `src/domain/learning-word-progress.ts:19-21` (`learningWordId` ohne Groß-/Kleinschreibung)
- **Beschreibung:** Wörter werden aus den Sätzen des Laufdiktats so übernommen, wie sie im Satz stehen. Satzanfänge sind großgeschrieben („Heute“, „Plötzlich“, „Leider“). Im Wortspeicher werden sie als Einzelwörter geübt, und die Prüfung verlangt die Großschreibung: Das orthografisch richtige „heute“ gilt als Groß-/Kleinfehler. Hat ein Kind im Diktat „heute“ am Satzanfang kleingeschrieben, wird zusätzlich „Heute“ als _Fehlerwort_ übernommen und sofort fällig gesetzt; geübt wird dann ein Wort, dessen Schreibung gar nicht das Problem war (Problem: Großschreibung am Satzanfang). Weil die Lernwort-ID die Groß-/Kleinschreibung ignoriert, teilen sich „essen/Essen“, „heute/Heute“ und „Weg/weg“ in eigenen bzw. übernommenen Wortboxen **einen** Lernstand; das Feld `word` wechselt mit jedem Versuch die Schreibung.
- **Reproduktion / Prüfweg:** `repro-g/g9-satzanfang.test.ts`: `misspelledWords("Heute gehen wir in den Zoo. Plötzlich regnet es.", "heute gehen … plözlich …")` → `["Heute","Plötzlich"]`; „Alle Wörter“ → `["Heute","gehen","Plötzlich","regnet"]`; `compareGaps(["Heute"],["heute"])` → `gross-klein`. `repro-g/g8-wortkey.test.ts`: „essen“ Box 3 → ein falscher Versuch mit „Essen“ → derselbe Datensatz `learning-word:essen`, `word: "Essen"`, Box 1. In den eingebauten Wortboxen gibt es keine solche Kollision (geprüft).
- **Betroffene Nutzergruppen:** Kinder, deren Lehrkraft Text-Laufdiktate mit Übernahme in den Wortspeicher nutzt; Kinder mit eigenen Wortboxen.
- **Mögliche Folgen:** Es wird eine falsche Einzelwortschreibung eingeübt und belohnt („Heute“), die richtige wird als Fehler zurückgemeldet; Fehlerwortlisten enthalten Scheinfehler; Lernstände unterschiedlicher Wörter vermischen sich.
- **Empfehlung:** Bei der Übernahme das erste Wort eines Satzes nur übernehmen, wenn es auch im Wortinneren eines Satzes großgeschrieben vorkommt oder in einem Wörterbuch/den Wortboxen als Nomen bekannt ist; sonst kleinschreiben oder (sicherer) Satzanfänge nicht übernehmen. Einen reinen Groß-/Kleinfehler am Satzanfang nicht als Wortfehler übernehmen, sondern als Satzregel zurückmelden. Lernwort-ID mit Groß-/Kleinschreibung bilden (Migration: bestehende IDs nach `word` aufspalten).
- **Aufwand (grob):** S (Übernahme), M (ID-Migration)
- **Erfolgskriterium:** Der Test liefert keine Satzanfangswörter mit fälschlicher Großschreibung; „essen“ und „Essen“ haben getrennte Lernstände.

### G-013 – Laufdiktat allein: Eingabefeld ohne `autocorrect="off"` – die iPad-Autokorrektur kann Rechtschreibfehler vor der Prüfung beheben

- **Bereich:** Laufdiktat allein (`/frei/german/laufdiktat`), Antwortprüfung
- **Status:** begründetes Risiko (Codeanalyse; Verhalten der iPad-Autokorrektur nicht auf Gerät geprüft)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:** `app/frei/german/laufdiktat/running-dictation-app.tsx:415-421` (nur `autoComplete="off"` und `spellCheck={false}`); zum Vergleich `src/domain/running-dictation-input.ts:1-6` (`STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES`, genutzt in Live-Raum, Wortspeicher, Textbox) und `app/views/lernbox/parts/study.tsx:147-149`
- **Beschreibung:** Alle anderen Schreibfelder schalten Autokorrektur, Großschreibhilfe und Einfügen ab (Entscheidung 29). Das Feld des Laufdiktats allein nicht: Weder `autocorrect`/`autocapitalize` noch das Blockieren von Einfügen und Ersetzungen (`isBlockedRunningDictationInput`) sind gesetzt. Safari auf dem iPad korrigiert standardmäßig bekannte Falschschreibungen beim Leerzeichen; die Prüfung vergleicht anschließend die korrigierte Zeichenkette.
- **Reproduktion / Prüfweg:** Codevergleich der Eingabeattribute (`grep -rn autoCorrect app`). Auf einem iPad: „Das Farad steht im Hof.“ tippen – erwartet Korrektur zu „Fahrrad“ (nicht ausgeführt, kein Gerät).
- **Betroffene Nutzergruppen:** Kinder, die das Laufdiktat zu Hause oder in Freiarbeit allein üben.
- **Mögliche Folgen:** Rechtschreibfehler werden unsichtbar korrigiert und als richtig gewertet; Sterne und „geschafft“ messen die Autokorrektur.
- **Empfehlung:** `STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES` und die Einfüge-/Ersetzungssperre wie in den anderen Modulen verwenden; ein statischer Test, der alle Antwortfelder auf diese Attribute prüft.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Alle Antwortfelder tragen `autocorrect="off"`, `autocapitalize`, `spellcheck=false` und blockieren `insertReplacementText`.

### G-014 – Kleinere Korrektheitsmängel (gesammelt)

- **Bereich:** verschiedene
- **Status:** bestätigt (reproduziert) bzw. bestätigt (Codeanalyse), je Punkt angegeben
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle / Beschreibung / Prüfweg:**
  1. **Division mit Rest nicht abbildbar** (reproduziert, `repro-g/g10-rest.test.ts`): `parseMentalMathTask("17 : 5")` erwartet `3,4`; „3 R 2“ ist falsch. In Klasse 3/4 ist „17 : 5 = 3 Rest 2“ die übliche Form. `src/domain/mental-math.ts:598-623, 625-634`.
  2. **Unicode-Minus in Lehreraufgaben** (reproduziert): `mathTaskFromPrompt("8 − (−3)", "11")` wird zum „gemischten Ausdruck“ ohne Familie und ohne Varianten, weil der Operand nur `-?` (ASCII) zulässt. Die App zeigt Minus selbst als „−“ an. `src/domain/mental-math.ts:80-104`.
  3. **Fehlerwörter aus dem Laufdiktat zählen in der Tagesportion nicht als Fehler** (Codeanalyse): `importFromLesson` setzt `box: 1, dueAt: now`, erhöht aber `incorrectAttempts` nicht; `dailyPlanCandidates` stuft deshalb neu übernommene Fehlerwörter als „review“ ein (`src/storage/personal-learning-events.ts:1205-1225`, `src/storage/daily-plan.ts:133-143`). Die Fehlerquote (6, jüngste zuerst) greift nicht; bei Rückstand stehen sie hinter älteren Wiederholungen.
  4. **LernBox in zwei Tabs: verlorene Aktualisierung** (Codeanalyse): `assess` rechnet mit der beim Rundenstart geladenen Karte, `putCardAndEvent` schreibt sie ohne erneutes Lesen (`app/components/learning-box-app.tsx:390-416`, `src/storage/personal-learning-events.ts:360-395`). Beantwortet ein zweiter Tab dieselbe Karte, überschreibt er das Ergebnis des ersten, z. B. wird ein Fehler (Box 1) durch einen veralteten Stand + „richtig“ zu Box 3. Wortspeicher (`recordAttempt` liest in der Transaktion) und Mathe (Projektion) sind davon nicht betroffen.
  5. **„kommt morgen wieder“ nach einem Fehler** (Codeanalyse, bereits in G-006 erwähnt): `nextLabel` rundet `nextReview = jetzt` auf mindestens einen Tag (`learning-box-app.tsx:166-171`); tatsächlich ist die Karte sofort fällig (z. B. unter „Meine Fehler“), in die Portion kommt sie erst morgen.
  6. **Toleranz-Beispiele für D-016 im Deutschen** (reproduziert, `g1`): `toleratesSpelling` akzeptiert Bett/Beet, Mine/Miene, Lid/Lied, Stil/Stiel, Wal/Wahl, Hand/Hund, Maus/Haus. Nur bei Vokabeln im Live-Raum mit Schreiberleichterung relevant; Schweregrad und Empfehlung wie D-016.
- **Betroffene Nutzergruppen:** je Punkt Grundschulkinder (1), Lehrkräfte mit eigenen Aufgaben (2), Kinder nach Laufdiktaten (3), Kinder mit mehreren Tabs (4), alle LernBox-Nutzer (5).
- **Mögliche Folgen:** Einzelne Scheinfehler oder falsche Einordnungen, jeweils ohne breite Wirkung.
- **Empfehlung:** (1) Antwortformat „q R r“ bei nicht aufgehender Division; (2) `−` im Operandenmuster zulassen; (3) beim Import `incorrectAttempts + 1`; (4) Karte in der Transaktion neu lesen und `processLearningBoxResult` dort anwenden; (5) Text „noch heute in ‚Meine Fehler‘, in der Portion morgen“.
- **Aufwand (grob):** S je Punkt
- **Erfolgskriterium:** je ein Regressionstest pro Punkt.

---

## 6 Bewertung der Dimensionen

| Dimension                                | Note (0–5) | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Funktionale Korrektheit                  | **2,5**    | Die rechnenden Kerne sind sauber: Generatorgrenzen und Nullregeln ohne Verstoß in 2000 Eigenschaftsläufen, sicherer Parser mit korrekter Rangfolge, Wortausrichtung ohne Folgefehler, Quoten der Tagesportion stabil. Die **Grenze zwischen Eingabe und Prüfung** ist dagegen fehleranfällig: In häufigen, realistischen Situationen werden richtige Antworten als falsch gewertet (Stufe 5 mit Leerzeichen bei Standard-Blockgröße 3, Apostrophe, Synonym-Schreibweisen, Tausendertrennung, „0 · _ = 0“, Satzanfänge im Wortspeicher), und falsche als richtig (Kommafehler bei absoluter Toleranz 0,01, mögliche Autokorrektur im Laufdiktat allein). Nichts davon ist durch Tests abgedeckt, weil die Tests die eigene Normalform voraussetzen. |
| Zuverlässigkeit der Lernstandsberechnung | **2**      | Zusätzlich zu A-004/D-001 weicht der berechnete Lernstand an mehreren Stellen still von den dokumentierten Regeln ab: Fehler im Unterricht beschleunigen den Aufstieg (G-011), die Richtungen einer Karte sind über `lastReviewed` gekoppelt (G-005), Abstände verlängern sich bei fester Übungszeit um einen Tag (G-006), die Tagesportion zählt Bearbeitetes als Erledigtes und bleibt bei gelöschten Karten offen (G-007), der Geräteabgleich setzt monotone Werte zurück (G-010) und Fehlbewertungen aus G-001 fließen direkt in Box und Merkstufe. Die Fehler sind für Kinder und Lehrkräfte unsichtbar, weil keine Ansicht die Herleitung eines Standes zeigt.                                                                               |

## 7 Die fünf wichtigsten Befunde

1. **G-011 (P1)** – Fehler in der Unterrichtsrunde beschleunigen den LernBox-Aufstieg (Box 3 → 4 nach zwei Fehlversuchen und einer Sofortwiederholung). Das kehrt die Absicht von Entscheidung 49 um.
2. **G-001 (P1)** – Wortspeicher Stufe 5: richtige, mit Leerzeichen getrennte Wörter werden alle als falsch gespeichert und auf Box 1 zurückgestuft (Standard-Blockgröße 3).
3. **G-006 (P2)** – Bei täglicher Übung zur festen Zeit verlängert sich jeder Lernwort- und Mathe-Abstand um einen Kalendertag; LernBox verhält sich anders.
4. **G-008 (P2)** – Zahlenprüfung: „0,001“ gilt für 0,1 · 0,1 als richtig, „1.000“ und „1 000“ für 1000 als falsch.
5. **G-002/G-003 (P2)** – Apostrophe, Anführungszeichen, Schrägstrich-/Komma-Synonyme und Klammern machen richtige Vokabel- und Laufdiktatantworten falsch.

Knapp dahinter: G-010 (Abgleich sperrt bestandene Lektionen wieder), G-012 (Satzanfänge großgeschrieben in den Wortspeicher), G-005 (Richtungskopplung), G-007 („erledigt“ trotz falscher Antwort; Sackgasse bei gelöschten Karten), G-009 (mehrdeutige Nulllücken).

## 8 Echte Stärken (geprüft, nicht nur gelesen)

- **Mathe-Generator und Parser:** 2000 zufällige Konfigurationen (Rechenarten, Zahlenraum, Negativ, Nullregeln, Reihen) ohne einen Operanden oder ein Ergebnis außerhalb der Grenzen, ohne nicht ganzzahlige Division. Der Ausdrucksparser kommt ohne `eval` aus und rechnet `2^3^2 = 512`, `-2^2 = -4`, `12 : 4 : 3 = 1`, `0,1 + 0,2 = 0,3` richtig (Rundung auf 1e-9).
- **Wortausrichtung der Textbox:** Ein eingefügtes oder fehlendes Wort verschiebt die übrigen Bewertungen nicht (7/7 bzw. 6/6 richtig erkannt).
- **Tagesportion:** Quoten, Eindeutigkeit und Obergrenze halten in 3000 zufälligen Kandidatenmengen. Die Erzeugung läuft in einer Datenbanktransaktion, sodass zwei Tabs denselben Plan erhalten. Ungültige oder leere Pläne werden neu erzeugt.
- **Doppeltes Absenden** ist in allen geprüften Modulen abgefangen: synchrone Refs im Wortspeicher und in der Textbox, `busy`-Ref und wiederverwendetes Ereignis in Mathe, Ereignis-ID je Runde/Karte/Richtung in der LernBox, Übernahme je Live-Sitzung höchstens einmal.
- **Sicherung:** Einspielen ist atomar (eine Transaktion), idempotent (zweites Einspielen: alles „unverändert“) und liest ältere Formate (fehlende Tabellen als leer, alter LernBox-Export). LernBox-Karten werden nicht durch ältere Stände überschrieben.
- **Unicode:** Wortspeicher und Textbox normalisieren NFC, die LernBox NFKC; geschützte Leerzeichen und zerlegte Umlaute sind dort kein Problem. Die Tastenwelt-Statistik ist gegen Division durch null abgesichert.
- **Textbox:** Fortsetzen, Wiederholen und Verwerfen eines Durchgangs halten gespeicherten und angezeigten Stand konsistent.
