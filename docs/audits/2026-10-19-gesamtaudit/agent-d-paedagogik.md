# Prüfinstanz D – Pädagogik, Didaktik, Lernpsychologie, Kompetenzdiagnostik

Gesamtaudit Lernraum · Commit `c30b916` · App-Version 0.8.0 · Bericht vom 20.10.2026

Rolle: unabhängige Prüfung der pädagogischen Qualität, gleichrangig zur Technik. Geprüft wurde,
**was der Code tatsächlich tut**. Vault und Umsetzungspläne werden nur als Konzept herangezogen.
Konzept, Implementierung und Empfehlung sind in jedem Befund getrennt.

Fortsetzung: Ein erster Lauf dieser Instanz brach ohne Bericht ab. Die Befunde aus A und B
werden hier nicht erneut geprüft, sondern über ihre IDs angesprochen. Das gilt vor allem für
**A-004**: Die parallelen, widersprüchlichen Wiederholungslogiken (ein Lernwort erreicht nach
einem Nachmittag Box 5) gelten hier als technische Tatsache. Bewertet werden nur ihre
pädagogischen Folgen.

**Kennzeichnung der Aussagen:**

- **[F]**: forschungsgestützt, mit Quelle (Abschnitt 14) und den Grenzen der Übertragbarkeit.
- **[H]**: plausible eigene Hypothese, nicht empirisch belegt.
- **[F, n. o. v.]**: Quelle aus Fachkenntnis, nicht online verifiziert.

Kein Befund behauptet, etwas sei „wissenschaftlich bewiesen“.

---

## 1 Untersuchte Dateien

**Konzept (Vault-Kopie im Repository und Dokumentation)**

- `obsidian-export/Lernplattform/03, 06, 07, 08, 10, 22, 23, 24/Anwendung.md`
- `obsidian-export/Lernplattform/19 - Entscheidungsprotokoll/Anwendung.md`, Entscheidungen 20, 30,
  31, 38, 49, 50, 54, 55, 56 und 57
- `docs/umsetzungsplan-tagesportion.md` (vollständig)
- `docs/umsetzungsplan-wortspeicher.md`, Abschnitte 2 und 6–8
- `docs/umsetzungsplan-textbox.md`, Abschnitt 1
- `docs/inhalte/README.md`, `lernbox.md`, `wortspeicher.md`, `textbox.md`, `tastenwelt.md`
- `docs/audits/2026-10-19-gesamtaudit/00-stand.md`, `01-bestandsaufnahme.md`,
  `02-pruefauftraege.md`
- Berichte A und B: nur die Befundüberschriften und die Top-5 sowie A-004 vollständig

**Fachlogik (vollständig gelesen)**

- `src/domain/learning-word.ts`, `learning-word-progress.ts`, `word-round.ts`,
  `word-store-progress.ts` (Ausschnitt), `homophones.ts`, `german-learning-content.ts`
- `src/domain/learning-box.ts`, `learning-box-replay.ts` (Ausschnitt), `leitner-schedule.ts`
- `src/domain/daily-plan.ts`, `src/storage/daily-plan.ts` (Kandidaten)
- `src/domain/math-practice.ts`, `src/domain/mental-math.ts` (Generator, Prüfung),
  `src/storage/math-practice.ts`
- `src/domain/textbox-text.ts`, `textbox-session.ts` (Ausblendung, Bewertung),
  `textbox-progress.ts`, `text-compare.ts`, `spelling-tolerance.ts`
- `src/domain/textbox-library.ts`: alle 50 Texte mit Kennzahlen. 27 Texte inhaltlich gelesen
  (TXT-001–012, 013–017, 018–034, 039–042, 044–046, 050). Alle Zielwortlisten der
  Schwerpunkte Dehnungs-h, Auslautverhärtung, Doppelkonsonanten, Wortbausteine und
  Zusammensetzungen geprüft.
- `src/domain/adaptive-learning.ts`, `learning-recommendation.ts`, `progress-reflection.ts`,
  `live-game-feedback.ts`, `running-dictation.ts` (Prüfung, Sterne), `houses.ts` (Punkte)
- `src/tastschreiben/curriculum.ts` (Lektionsfolge, Wortpools), `typing-progress.ts`,
  `typing-stats.ts`, `text-generator.ts` (Ausschnitt), `app/frei/typing/typing-coach.ts`

**Oberfläche (pädagogisch relevante Stellen)**

- `app/components/learning-word-app.tsx`: Start, Vorauswahl der Stufe, Aufzeichnung
- `app/views/wortspeicher/round-screen.tsx`, `stage-prompt.tsx`, `stage-copy.ts`,
  `cover-answer.tsx`, `feedback-panel.tsx`, `listen-answer.tsx`, `completion-screen.tsx`
- `app/components/learning-box-app.tsx`: Bewertung und Rückmeldung
- `app/frei/mathematics/mental-math-app.tsx`: Standardeinstellungen, Rückmeldung
- `app/frei/german/laufdiktat/running-dictation-app.tsx`: Laufdiktat allein
- `app/raum/spiel/live-game.tsx`: Auswertung, Hilfen, Tempo-Punkte, Battle
- `src/integrations/laufdiktat/live-session.ts`: `evaluateLiveAnswer`, Modi
- `app/views/laufdiktat/teacher-dictation/live-step.tsx`, `settings-step.tsx`, `constants.ts`
- `app/lehrer/live/dictation-adapter.ts` (`strugglingNames`)
- `app/lernen/fortschritt/page.tsx`, `app/components/adaptive-progress-panel.tsx`
- `app/ui/lernraum-ui.css`: Flimmer-Animation

## 2 Ausgeführte Prüfungen mit echten Ergebnissen

Alle Reproduktionen liegen im Scratchpad unter
`/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-d/`.
Sie wurden mit der Audit-Konfiguration ausgeführt:
`AUDIT_DIR=… npx vitest run --config …/repro/vitest.audit.config.mts`.
Ergebnis: 3 Testdateien, 13 Tests, alle bestanden. Die Ausgaben stehen in `d-*.out.txt`.

| Nr. | Prüfung                                                                                                                                  | Ergebnis (wörtlich aus der Ausgabe bzw. zusammengefasst)                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `updateLearningWordProgress`: dreimal Stufe 1 (Abschreiben) an Tag 0, 1 und 4                                                            | Box 2 → **Box 3 („sicher“) nach dem zweiten Abschreiben** → Box 4, fällig in 14 Tagen. Ein Wort auf Merkstufe 5, das auf Stufe 1 abgeschrieben wird, steigt auf **Merkstufe 6**.                                                                                                                                                                                     |
| D2  | Lückenmuster der Stufen 2 und 3 (`buildLearningWordPattern`) gegen die kritische Stelle je Wortbox                                       | Dehnungs-h, Stufe 2: Das h ist in 96/108 Wörtern verdeckt. ie, Stufe 2: 0/108 ganz sichtbar. Doppelkonsonanten, Stufe 2: 86/105 teilweise sichtbar. Beispiele: `Straße→S__a_e`, `Biene→B__ne`, `Fahrrad→F__r__d`. Die Zahl der Lücken verrät jeweils die Wortlänge.                                                                                                  |
| D3  | Phänomenzuordnung der festen Wortboxen                                                                                                   | Auslautverhärtung: **15/111 enden auf -ng**. Dehnungs-h: **12/108 mit silbentrennendem bzw. hörbarem h**. s/ss/ß: **26/133 Wörter mit s nach langem Vokal**, für die der angezeigte Regeltext ß vorhersagt. „Silbieren“ bei **24/105** (Doppelkonsonanten) und **16/105** (ck/tz) einsilbigen Wörtern. 45 Wörter stehen in mehreren Boxen.                           |
| D4  | Bedeutungshilfen der Stufe 6, die das Zielwort selbst enthalten                                                                          | **4 Treffer:** „Mal: das erste Mal“, „Laib: ein Laib Brot“, „Weise: … Art und Weise“, „das: das Haus“                                                                                                                                                                                                                                                                |
| D5  | LernBox, Modus Karteikarten (`mode: "oral"`), fünfmal „Gewusst“ an Tag 0/1/4/11/25                                                       | **Box 5, Abstand 30 Tage.** Die Selbsteinschätzung steigt genau wie eine geschriebene Antwort auf.                                                                                                                                                                                                                                                                   |
| D6  | `checkRunningDictationAnswer`, Laufdiktat allein, Text                                                                                   | Fehlender Schlusspunkt, doppeltes Leerzeichen oder kleiner Satzanfang: jeweils **false**, also der ganze Satz falsch                                                                                                                                                                                                                                                 |
| D7  | Kopfrechengenerator, 20 000 Aufgaben je Einstellung                                                                                      | Standard (+/−, 0–20): **26,1 % mit Operand 0 oder 1**, 13,6 % mit 0, **nur 27,3 % mit Zehnerübergang**. Bis 100: 40,9 % mit Zehnerübergang. Einmaleins über alle Reihen: ×0 9,2 %, ×1 17,1 %, ×10 15,6 %.                                                                                                                                                            |
| D8  | Textbox, Durchgang 4, TXT-022 (37 Wörter)                                                                                                | Fehlerfrei geschrieben, aber zwei Sätze vertauscht: **78 %**. Fehlerfrei, zwei Sätze vergessen: **62 %**. Alle Wörter geschrieben, jedes vierte falsch: **73 %**.                                                                                                                                                                                                    |
| D9  | Simulation des Bestwerts im Wortspeicher: 10 000 Kinder, wahre Trefferquote konstant 60 %, 10 Wörter je Runde                            | Mittlerer Bestwert nach Runde 1/3/5/10: **60,1 / 72,9 / 77,5 / 82,8 %**. „Neuer Bestwert!“ erscheint in **15,2 %** der Runden 2–10, **ohne jedes Lernen**.                                                                                                                                                                                                           |
| D10 | `summarizePersonalLearning`: Fehler und 15 s später Selbstkorrektur in derselben Runde                                                   | `improvedObjects = 1`. Die Anzeige „frühere Fehler verbessert“ zählt also die sofortige Korrektur.                                                                                                                                                                                                                                                                   |
| D11 | `phenomenonErrorStats`, TXT-024 (Dehnungs-h): letzter Satz vergessen, sonst fehlerfrei                                                   | 80 %. Als „Dehnungs-h“-Fehler gezählt: **10**. Davon ist **ein** Wort ein Zielwort („sehr“).                                                                                                                                                                                                                                                                         |
| D12 | Komponente `CoverAnswer` (Stufe 4), gerendert mit Testing Library                                                                        | Getippt „Strasse“ → übernommen **„Strass“** (6 Striche). „Fahhrrad“ → „Fahhrra“. Die Eingabe wird auf die Wortlänge abgeschnitten.                                                                                                                                                                                                                                   |
| D13 | Kennzahlen aller 50 Textbox-Texte                                                                                                        | Leicht: 16 Texte, Ø 43,3 Wörter, Ø 7,2 Wörter je Satz, Zielwortanteil Ø 17 %. Mittel: 17 Texte, Ø 70 Wörter, Ø 9,2 Wörter je Satz, Zielwortanteil Ø 15 %. Schwer: 17 Texte, Ø 119 Wörter, Ø 10,3 Wörter je Satz, Zielwortanteil Ø 14 %. Der längste Satz hat 21 Wörter (TXT-050).                                                                                    |
| D14 | Browser: Chromium 1194, iPad-Mini-Viewport, Dev-Server :3002, Startblatt der Wortbox „s, ss und ß“                                       | Angezeigt wird: „Strategie: Ableiten · Nach langem Vokal steht ß, nach kurzem Vokal ss. Sprich das Wort deutlich in Silben.“ Stufe 6 ist deaktiviert, weil in Headless-Chromium keine deutsche Stimme vorhanden ist (Umgebungseffekt).                                                                                                                               |
| D15 | Suche nach Diagnosefunktionen (`eingangstest`, `einstufung`, `kompetenzcheck`, `diagnos`, `mastery`, `lernverlauf`) in `app/` und `src/` | Keine Funktion gefunden. Der frühere Modus „TEST“ wird in `live-session.ts:28-30` auf „LAUFDIKTAT“ umgeschrieben.                                                                                                                                                                                                                                                    |
| D16 | Webrecherche (WebSearch)                                                                                                                 | Bestätigt: Latimier, Peyre & Ramus 2021; Jones et al. (Retrieval vs. Rainbow Writing, DOI 10.1007/s10648-015-9330-6); Bayerischer Grundwortschatz mit 623 verbindlichen Wörtern bis Jahrgangsstufe 4; Levumi (kostenfrei, Lesen, Rechtschreiben, Mathematik); Streichung von „Jogurt“ und „Spagetti“ 2024. Die App verwendet dort richtig „Joghurt“ und „Spaghetti“. |

Nicht wiederholt, weil bereits durch die Hauptinstanz ausgeführt: `npm run check` mit 1683
grünen Tests sowie die Chromium-E2E-Suite.

## 3 Nicht untersuchte Bereiche und Grenzen

- **Keine echten Kinder, keine echten iPads.** Aussagen zu Bearbeitungszeit, Tippgeschwindigkeit
  und Motivationswirkung sind Schätzungen oder Hypothesen.
- **Stufe 6 (Hören)** war im Browser nicht ausführbar, weil die deutsche Stimme fehlte. Sie wurde
  nur im Code geprüft.
- **Bayerischer Grundwortschatz:** Die Wortliste selbst (PDF auf lehrplanplus.bayern.de) war
  nicht abrufbar. Ein wortgenauer Abgleich war daher nicht möglich. Bestätigt sind nur der
  Umfang (623 Wörter bis Jahrgangsstufe 4) und das Auswahlprinzip (häufige Wörter,
  orientiert an den Rechtschreibprinzipien).
- **Textbox:** 27 von 50 Texten inhaltlich gelesen. Für alle 50 wurden Kennzahlen berechnet und
  die Zielwörter der oben genannten Schwerpunkte vollständig geprüft. Eine vollständige
  Lektorierung aller Texte steht aus.
- **Live-Laufdiktat:** Nur der Code wurde geprüft, keine echte Unterrichtsrunde (Supabase).
  Lehrer-Aufgaben (`vorschau`), Spiegelschrift, Duell und Häuser (`aus`) wurden nur gestreift.
- **Nicht vertieft, weil bei anderen Instanzen:** Schulartübergreifende Eignung, DaZ und
  Differenzierung im Klassenalltag (Instanz E); Barrierefreiheit der Animationen (Instanz C).
- **Keine eigene Literaturrecherche in Datenbanken.** Quellen ohne Online-Bestätigung sind als
  „n. o. v.“ gekennzeichnet.

---

## 4 Befunde

Die Reihenfolge folgt dem Schweregrad, innerhalb eines Schweregrads der Tragweite für die
Kernziele Rechtschreibung und Mathematik.

### D-001 – Abschreiben zählt als gesicherter Abruf: Stufe 1 hebt Leitner-Box und Merkstufe, „sicher“ nach zweimal Abschreiben

- **Bereich:** Wortspeicher, Lernwort-Lernstand, Tagesportion
- **Status:** bestätigt (reproduziert, D1) und bestätigt (Codeanalyse)
- **Schweregrad:** P1
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `src/domain/learning-word-progress.ts:23-68` (`updateLearningWordProgress`, Box 34-41,
    Merkstufe 42-52): Die gewählte Stufe beeinflusst den Box-Aufstieg nicht. Die Merkstufe
    steigt auf `max(gespeichert, Runde) + 1`.
  - `app/views/wortspeicher/round-screen.tsx:128-175` und `stage-prompt.tsx:12`: In Stufe 1
    steht das Wort sichtbar über dem Eingabefeld, die Überschrift lautet „Selbstständig
    schreiben“.
  - `src/storage/personal-learning-events.ts:793-857` (`recordAttempt`): Das Ereignis wird als
    `answerMode: "typed"`, `help: "none"` gespeichert, ohne Angabe der Stufe.
  - `app/components/learning-word-app.tsx:232-252` (`openStart`): Für „Fällige“ und die
    Tagesportion wird die **niedrigste** Merkstufe vorgewählt.
  - `src/storage/personal-learning-events.ts:1209-1228`: Fehlerwörter aus dem Laufdiktat
    starten mit Stufe 1.
- **Beschreibung:**
  - _Konzept:_ Vault 07 beschreibt Merkstufe (Hilfebedarf) und Leitner-Box (Wiederholung) als
    getrennte Größen. Vault 06 verlangt „Hinweis oder Lösung verwendet → kein Aufstieg“.
  - _Implementierung:_ Eine richtige Eingabe auf **jeder** Stufe gilt als „unabhängiger
    Erfolg“. Auf Stufe 1 ist die Lösung aber während der Eingabe vollständig sichtbar.
    Abschreiben hebt die Box. Nach dem zweiten Abschreiben erreicht das Wort Box 3, die
    Fortschrittsseite und die Kacheln zählen es als „sicher“ (`word-store-progress.ts:147`,
    `box >= 3`).
  - Zusammen mit A-004 (kein Fälligkeitsschutz bei Lernwörtern) reichen mehrere
    Abschreibrunden an einem Nachmittag für Box 5 und 30 Tage Pause.
  - Die Tagesportion wählt für fällige Wörter die leichteste gespeicherte Stufe vor. Bei
    Wörtern aus dem Laufdiktat ist das Stufe 1. Die geplante verteilte Wiederholung wird so
    standardmäßig zur Abschreibübung, und jede Eingabe hakt das Portionselement ab
    (`daily-plan.ts:226-269`).
- **Reproduktion / Prüfweg:** `repro-d/d-paedagogik.test.ts`, Test D1.
- **Betroffene Nutzergruppen:**
  - alle Kinder im Wortspeicher, besonders schwache Rechtschreiber, die verständlicherweise die
    leichteste Stufe wählen
  - Lehrkräfte und Eltern, die „sicher“ oder den Laufzettel lesen
- **Mögliche Folgen:**
  - **[F]** Abrufüben ist dem Abschreiben beim Rechtschreiblernen überlegen, auch bei Erst- und
    Zweitklässlern (Jones et al., Vergleich mit Rainbow Writing). Massiertes Üben erzeugt hohe
    Sofortleistung bei schlechter Behaltensleistung (Cepeda et al. 2006). Grenze der
    Übertragbarkeit: englische Wörter, kurze Studien.
  - **[H]** Kinder und Lehrkräfte bekommen eine **Scheinkompetenz** angezeigt. Genau die Wörter,
    die im Unterricht falsch geschrieben wurden, verschwinden nach Abschreibübungen für Wochen
    aus der Wiederholung. Das Kernziel Rechtschreibung wird an der wirksamsten Stelle
    ausgehebelt.
- **Empfehlung:**
  - Stufen 1–3 als **Üben ohne Box-Aufstieg** behandeln, analog zur Regel „Hinweis → kein
    Aufstieg“. Die Merkstufe darf dort steigen, die Box nicht.
  - Die Box nur bei Abruf ohne Schriftbild heben: Stufe 5/6 und Stufe 4 ohne Längenhinweis,
    siehe D-002.
  - Die Stufe im Ereignis speichern und die Ereignisart ehrlich benennen (`help: "copy"`).
  - In der Tagesportion fällige Wörter auf mindestens Stufe 4 (besser 6) vorwählen. Die
    Merkstufe je Wort nicht mehr über die Rundenstufe hochziehen (`max(...) + 1`).
  - Bestehende Stände nach A-003 neu bewerten oder einmalig zurücksetzen.
- **Aufwand (grob):** S für die Regel, M mit Neubewertung der Bestände
- **Erfolgskriterium:**
  - Ein Regressionstest „dreimal Stufe 1 an drei Tagen → Box 1, Merkstufe ≤ 2“ ist grün.
  - „Sicher“ ist nur über Abrufe ohne Schriftbild an mindestens zwei verschiedenen Tagen
    erreichbar.

### D-002 – Stufe 4 und die Lückenstufen verraten genau die Rechtschreibentscheidung, die geübt werden soll

- **Bereich:** Wortspeicher, Aufgabenqualität
- **Status:** bestätigt (reproduziert, D2 und D12)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `app/views/wortspeicher/cover-answer.tsx:22-53` (`CoverAnswer`): ein Strich je Buchstabe,
    `maxLength={slots.length}`, Eingabe wird abgeschnitten
  - `src/domain/learning-word.ts:24-41` (`buildLearningWordPattern`,
    `buildLearningWordLengthPattern`): ein Unterstrich je Buchstabe, fester Rhythmus
    `index % 3` bzw. `% 4`
- **Beschreibung:**
  - _Konzept:_ Vault 07 und Plan 2.3 sehen für Stufe 4 vor: „Wort aus dem Gedächtnis, Striche
    zeigen die Länge“. Die Längenhilfe ist dort ausdrücklich gewollt.
  - _Implementierung:_ Bei sechs von acht Wortboxen unterscheidet sich die typische
    Fehlschreibung genau durch die **Buchstabenzahl**:
    - Doppelkonsonant: „Schif“ statt „Schiff“
    - ck/tz: „Glük“ statt „Glück“
    - ie: „Bine“ statt „Biene“
    - Dehnungs-h: „Farrad“ statt „Fahrrad“
    - ß/ss: „Strasse“ statt „Straße“
  - Die Striche und Lücken beantworten also die Frage, die das Phänomen ausmacht: Ist ein
    Zusatzbuchstabe nötig oder nicht? In Stufe 4 ist eine zu lange Schreibweise gar nicht
    eingebbar. „Strasse“ wird zu „Strass“ abgeschnitten (D12), eine fehlende Stelle bleibt als
    leerer Strich sichtbar.
  - Die Lückenmuster der Stufen 2 und 3 setzen die Lücken mechanisch und nicht an die
    kritische Stelle. Beim Dehnungs-h sind 96/108 h verdeckt, aber die Lückenzahl verrät, dass
    ein Buchstabe dazugehört.
- **Reproduktion / Prüfweg:** `repro-d/d-cover-answer.test.tsx` (D12) und D2.
- **Betroffene Nutzergruppen:** alle Wortspeicher-Nutzer. Besonders betroffen sind Kinder, die
  bis Stufe 4 üben und nie Stufe 5 oder 6 wählen.
- **Mögliche Folgen:**
  - **[H]** Stufe 4 gilt als „aus dem Gedächtnis“ und hebt die Box (D-001), prüft die
    orthografische Entscheidung aber nicht.
  - **[F, Übertragungsgrenze]** Das Verdecken-Vergleichen-Format (Cover-Copy-Compare) ist an
    sich gut belegt (Joseph et al. 2012). Sein Kern ist jedoch das **freie** Aufschreiben ohne
    Hinweis.
- **Empfehlung:**
  - Stufe 4 mit freiem Eingabefeld ohne Längenstriche anbieten, höchstens mit Silbenbögen.
    Die Längenstriche als ausdrücklich gekennzeichnete Hilfe einblenden, die den Aufstieg
    hemmt.
  - Stufen 2 und 3 als **Entscheidungslücken** an der kritischen Stelle gestalten,
    z. B. „Stra_e“ mit Auswahl s/ss/ß oder „Fa_rad“, statt Buchstaben abzuzählen.
  - Die kritische Stelle je Wort über ein Phänomenmuster der Wortbox bestimmen.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - In Stufe 4 sind beliebig lange Eingaben möglich, ohne Hinweis auf die Länge.
  - Ein Test belegt für jede Phänomen-Wortbox, dass die kritische Stelle in Stufe 2/3 nie
    über die Lückenzahl erschließbar ist.

### D-003 – Keine Kompetenzdiagnostik: kein Eingangstest, keine Kompetenzchecks, keine Lernverlaufsmessung, keine Kompetenzschätzung

- **Bereich:** Diagnostik, adaptive Steuerung
- **Status:** bestätigt (Codeanalyse, D15)
- **Schweregrad:** P1, gemessen am erklärten Ziel „diagnosegestützte adaptive Angebote,
  Kompetenzchecks“
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `src/domain/adaptive-learning.ts:11-45`: zählt nur Aktivitäten, Tage und „verbesserte“
    Objekte
  - `src/domain/learning-recommendation.ts:42-73`: Reihenfolge Fehler > fällig > nächster
    Schritt
  - `src/domain/daily-plan.ts:145-213`: Kontingente nach Fälligkeit
  - `src/integrations/laufdiktat/live-session.ts:28-30`: „TEST“ wird zu „LAUFDIKTAT“
  - `app/components/learning-word-app.tsx:232-252`: Stufe von Hand gewählt
  - `app/frei/mathematics/mental-math-app.tsx:98-112`: Zahlenraum und Rechenart von Hand
    gewählt
- **Beschreibung:**
  - _Konzept:_ Vault 22 beschreibt einen „Förderkreislauf“, in dem jedes Lernsignal den
    fachlich passenden nächsten Schritt aktiviert. Vault 08 nennt einen Modus
    „Lernstandscheck“.
  - _Implementierung:_ „Adaptiv“ heißt im Code dreierlei:
    1. Ein falsch beantwortetes Objekt wird wieder fällig.
    2. Leitner-Abstände wachsen.
    3. Die Tagesportion mischt Fehler, Wiederholungen und Neues nach festen Kontingenten.
  - Es gibt keine Einschätzung, **welche Kompetenz** ein Kind beherrscht, etwa welche
    Rechtschreibphänomene, welche Einmaleinsreihen oder ob der Zehnerübergang sitzt.
  - Es gibt keinen Einstieg, der Inhalte oder Schwierigkeit vorschlägt, und keinen
    wiederkehrenden, vergleichbaren Check.
  - Merkstufe, Wortbox, Zahlenraum und Textschwierigkeit wählt das Kind selbst. Die Empfehlung
    „empfohlen“ ist der Modus der gespeicherten Stufen.
  - Einen Lernstandscheck gibt es nicht mehr.
  - Die erhobenen Daten sind teilweise brauchbar: In Mathe werden falsche Antworten
    gespeichert, in der Textbox Merk- und Schreibzeiten. Ausgewertet wird davon nichts.
  - Antwortzeiten fehlen für Wörter und Rechenaufgaben ganz. Die Wortstufe fehlt im Ereignis.
- **Reproduktion / Prüfweg:** Suche D15. Lesen der genannten Funktionen.
- **Betroffene Nutzergruppen:**
  - Lehrkräfte, die Förderentscheidungen treffen wollen
  - Kinder, die ohne Orientierung zwischen 8 Wortboxen, 6 Stufen und 50 Texten wählen
- **Mögliche Folgen:**
  - **[H]** Die Plattform kann ihr Kernversprechen „diagnosegestützt“ nicht einlösen.
    Lernzeit verteilt sich nach Vorliebe und Fälligkeit, nicht nach Förderbedarf.
  - **[F]** Datengestützte Förderentscheidungen wirken nur, wenn Messung **und** Anpassung
    erfolgen (Stecker, Fuchs & Fuchs 2005; Jung et al. 2018, g ≈ 0,37 für datenbasierte
    Individualisierung bei intensivem Förderbedarf). Messung allein wirkt nicht.
- **Empfehlung:** siehe Abschnitt 9. Kurz:
  - Kein langer Eingangstest.
  - Stattdessen **kurze, parallele Lernverlaufsproben** (3–5 Minuten, alle 2–3 Wochen) auf
    einer festen, curricular verankerten Itembank.
  - Dazu ein **transparentes Beherrschungskriterium je Teilkompetenz** aus den
    Übungsdaten und eine einfache Fehlerklassifikation.
  - Für Förderdiagnosen bestehende validierte Verfahren nutzen (Levumi, HSP, DEMAT), nicht
    nachbauen.
- **Aufwand (grob):** L
- **Erfolgskriterium:**
  - Für jedes Kind liegt je Kernbereich (Grundwortschatz-Rechtschreibung,
    Einspluseins/Einmaleins) eine Verlaufslinie aus vergleichbaren Proben vor.
  - Die Tagesportion nutzt den Beherrschungsstand je Teilkompetenz.
  - Die Lehrkraft sieht je Kind (lokal) die nächsten Förderschwerpunkte.

### D-004 – Fortschrittsanzeigen messen Rauschen, Sofortkorrektur oder Wiedererkennung statt Lernzuwachs

- **Bereich:** Fortschrittsdarstellung, Rückmeldung zur Leistung
- **Status:** bestätigt (reproduziert, D9, D10, D1) und bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Mechanik, mittel für die Wirkung
- **Fundstelle:**
  - `app/components/learning-word-app.tsx` (`finish`, „Neuer Bestwert!“)
  - `src/domain/word-round.ts:86-99` (`sampleRoundWords`, Zufallsauswahl) und `:322-328`
    (`wordRoundPercent`)
  - `src/domain/textbox-progress.ts:32` (`TEXTBOX_MASTERED_PERCENT = 90`)
  - `src/domain/textbox-session.ts:352-366` (`repeatRound`)
  - `src/domain/adaptive-learning.ts:20-31` (`improvedObjects`)
  - `app/components/adaptive-progress-panel.tsx:69-70` („frühere Fehler verbessert“)
- **Beschreibung:**
  1. **Bestwert:** Jede Wortspeicher-Runde zieht 10 zufällige Wörter aus 100–133. Bei einer
     wahren Trefferquote von 60 % streut der Rundenwert mit etwa ±15 Prozentpunkten
     (Standardabweichung). Der Bestwert ist das Maximum dieser verrauschten Werte. Er steigt
     **ohne jedes Lernen** nach zehn Runden im Mittel von 60 auf 83 %. „Neuer Bestwert!“
     erscheint in 15 % der Runden, ebenfalls ohne Lernen (D9). Die Planungsdokumente nennen die
     eingeschränkte Vergleichbarkeit („nur ungefähr vergleichbar“). Die Oberfläche feiert die
     Werte trotzdem als Fortschritt.
  2. **„Frühere Fehler verbessert“** auf „Mein Fortschritt“ zählt jedes Objekt, das nach einem
     Fehler irgendwann richtig war. Dazu gehört die Wiederholung 15 Sekunden später direkt
     nach dem Buchstabenvergleich mit der richtigen Lösung (D10). Das ist Sofortkorrektur
     nach Vorlage, kein späterer selbstständiger Abruf.
  3. **„Gemeistert“ in der Textbox** (Bestwert ≥ 90 %) ist über „Durchgang wiederholen“ in
     derselben Sitzung erreichbar: Merkphase, gleicher Text, gleiche Lücken. Das misst die
     Wiedergabe eines eben gelesenen Textes. Vault 24 räumt das unter „Bekannte Grenzen“ ein.
     Die Oberfläche sagt trotzdem „gemeistert“.
  4. **„x / y sicher“** beruht auf D-001 und A-004.
- **Reproduktion / Prüfweg:** D9, D10. Codepfade wie angegeben.
- **Betroffene Nutzergruppen:**
  - Kinder: Selbstbild und Selbstregulation
  - Lehrkräfte und Eltern: Laufzettel und Fortschrittsseite
- **Mögliche Folgen:**
  - **[F]** Rückmeldung wirkt nur, wenn sie zutreffend über den Abstand zum Ziel informiert
    (Hattie & Timperley 2007). Rückmeldungen auf Selbst- oder Vergleichsebene können Leistung
    sogar senken (Kluger & DeNisi 1996).
  - **[H]** Verrauschte „Rekorde“ lehren Kinder, Zufallsschwankungen als Können zu deuten.
    Auf Dauer entwerten sie die Rückmeldung, weil auch Rückschritte ohne Grund auftreten.
- **Empfehlung:**
  - Fortschritt über **feste, parallele Wortstichproben** oder über den Anteil „Wörter mit
    Abruf an zwei verschiedenen Tagen“ darstellen, nicht über Rundenmaxima.
  - Den Bestwert nur innerhalb gleicher Wortmengen vergleichen oder durch einen gleitenden
    Mittelwert mit Spannweite ersetzen.
  - „Frühere Fehler verbessert“ erst zählen, wenn der richtige Abruf frühestens am Folgetag
    und ohne Hilfe erfolgt.
  - „Gemeistert“ in der Textbox nur für die erste vollständige Einheit eines Tages ohne
    Wiederholung des Durchgangs werten, oder ganz durch eine Transferprobe ersetzen (D-005).
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - Die Simulation D9 zeigt mit der neuen Kennzahl keinen Anstieg bei konstanter Fähigkeit.
  - D10 liefert 0.

### D-005 – Textbox: Der Hauptwert misst vor allem das Behalten des Textes; die Schwerpunktstatistik ist eine Scheindiagnose

- **Bereich:** Textbox, Bewertung, Diagnostik, Arbeitsbelastung
- **Status:** bestätigt (reproduziert, D8, D11); Zeitbedarf als begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Mechanik, mittel für den Zeitbedarf
- **Fundstelle:**
  - `src/domain/textbox-session.ts:270-339` (`submitRound`, Durchgang 4 mit `alignWords`)
  - `src/domain/text-compare.ts:133-198` (`alignWords`) und `:256-285` (`scoreWords`)
  - `src/domain/textbox-progress.ts:192-218` (`phenomenonErrorStats`)
  - `src/domain/textbox-session.ts:156` (`memorizeSeconds`)
- **Beschreibung:**
  - _Konzept:_ Vault 24 und Entscheidung 54 beschreiben ein Rechtschreibtraining für Kinder
    mit LRS. Die Grenze „trainiert auch das Gedächtnis“ ist benannt.
  - _Implementierung, Durchgang 4:_ Der Hauptwert verlangt, einen Text von 30–180 Wörtern
    nach 60–120 Sekunden Merkzeit **vollständig aus dem Gedächtnis** in richtiger Reihenfolge
    zu schreiben. Vergessene Wörter zählen als Fehler, umgestellte Wörter als Fehler und
    zusätzlich als Abzug.
    - Ein Kind, das **fehlerfrei** schreibt, aber zwei Sätze vergisst, erhält 62 %.
    - Ein Kind, das jedes vierte Wort **falsch** schreibt, aber alles behält, erhält 73 % (D8).
  - Die Kennzahl ordnet also vor allem nach Arbeitsgedächtnis und Textbehalten. Die
    Zielgruppe LRS ist hier überdurchschnittlich oft eingeschränkt.
  - Die Fortschrittsseite zeigt „Schwerpunkte mit den meisten Fehlern“ und verlinkt die
    passende Wortbox. Dabei wird **jedes** falsche und **jedes vergessene** Wort dem
    Schwerpunkt des Textes zugerechnet, unabhängig davon, ob es das Phänomen enthält. Ein
    vergessener Satz ergibt 10 „Dehnungs-h-Fehler“, davon ist ein einziges Wort ein Zielwort
    (D11). Sortiert wird nach absoluter Fehlerzahl. Längere oder häufiger geübte Schwerpunkte
    erscheinen dadurch automatisch als „Schwäche“.
  - _Zeitbedarf [H]:_ Über die vier Durchgänge werden etwa 2,3 × die Textlänge getippt: leicht
    ≈ 100, mittel ≈ 160, schwer ≈ 275 Wörter. Dazu kommen bis zu 4/6/8 Minuten Merkzeit. Bei
    angenommenen 5–10 getippten Wörtern pro Minute (Grundschulkind, iPad; Annahme, nicht
    gemessen) dauert eine Einheit etwa 15–25 / 22–40 / 35–60 Minuten. Das liegt weit über
    dem Ziel von 10 Minuten. Die gespeicherten Schreibzeiten (`writingMs`) könnten das
    überprüfen.
- **Reproduktion / Prüfweg:** D8, D11 in `repro-d/d-paedagogik.test.ts`.
- **Betroffene Nutzergruppen:**
  - Kinder mit LRS und Arbeitsgedächtnisschwäche
  - Lehrkräfte, die die Schwerpunktstatistik als Diagnose lesen
- **Mögliche Folgen:**
  - **[F]** Bei Kindern mit Lese-Rechtschreibschwierigkeiten ist das phonologische
    Arbeitsgedächtnis häufig eingeschränkt (z. B. Steinbrink & Klatte 2008, n. o. v.). Hohe
    Gedächtnislast konkurriert mit der Rechtschreibentscheidung (Cognitive-Load-Theorie,
    Sweller).
  - **[H]** Fehlzuweisungen führen zu falschen Übungsempfehlungen. Niedrige Werte durch
    Vergessen können demotivieren, obwohl die Rechtschreibung gut war.
- **Empfehlung:**
  - Durchgang 4 als **Diktat** gestalten: satzweise vorlesen (Sprachausgabe vorhanden), dann
    schreiben. Alternativ zwei Kennzahlen getrennt zeigen:
    **Rechtschreibquote** = richtig geschriebene ÷ geschriebene Originalwörter, und
    **Vollständigkeit**.
  - Die Schwerpunktstatistik nur aus **Zielwörtern** bzw. phänomentragenden Wörtern berechnen
    und als Quote ausweisen.
  - Eine Transferprobe mit ungeübtem Paralleltext desselben Schwerpunkts als eigentlichen
    Lernnachweis anbieten.
  - Merkzeit und Länge für „leicht“ an der Zielgruppe ausrichten.
  - Zielgröße „10 Minuten“ für leicht prüfen, z. B. 2 Durchgänge plus Diktat.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - Bei D8 erhält „fehlerfrei, zwei Sätze vergessen“ eine Rechtschreibquote von 100 %.
  - D11 meldet höchstens die tatsächlich fehlerhaften Zielwörter.
  - Die Median-Einheitsdauer aus `writingMs` im Probedurchlauf liegt bei leicht ≤ 12 Minuten.

### D-006 – Fachliche Fehler in Wortlisten, Regeltexten, Zielwörtern und Bedeutungshilfen

- **Bereich:** Inhalte Rechtschreibung (Wortspeicher, Textbox, Stufe 6)
- **Status:** bestätigt (Codeanalyse und fachliche Prüfung, D3, D4, D14)
- **Schweregrad:** P2. Die Inhalte sind als Entwurf gekennzeichnet, sind aber freigegeben
  (`frei`) und vermitteln teils falsche Regeln.
- **Sicherheit der Einschätzung:** hoch, bei Aussprachefragen mittel (regionale Varianten)
- **Fundstelle:**
  - `src/domain/german-learning-content.ts:44-56, 88-101, 103-117, 119-132, 177-184`
  - `src/domain/homophones.ts:25-48`
  - `src/domain/textbox-library.ts`: TXT-024 (`:427`), TXT-034 (`:616`), TXT-046 (`:891`),
    TXT-011 (`:176`), TXT-001 (`:10`)
- **Beschreibung:** Die Hauptinstanz hat geprüft, ob das Phänomen-Muster vorkommt. Geprüft
  wird hier, ob das Wort ein **Beispiel des didaktischen Phänomens** ist.
  1. **s, ss und ß: Regeltext widerspricht der eigenen Box.** Angezeigt wird: „Nach langem
     Vokal steht ß, nach kurzem Vokal ss.“ 26 von 133 Wörtern derselben Box haben einen langen
     Vokal oder Zwielaut **mit s**: Hase, Nase, Rose, Haus, Maus, Reise, lesen, Gras, Glas,
     Preis … Die Regel sagt dort ß voraus. Es fehlt die Bedingung „stimmlos“ (Hase/Soße) und
     die Strategie **Verlängern** (Gras → Gräser, Fuß → Füße). Weitere Mängel derselben Box:
     - „Sonne, Sand, Salz, Suppe, Sofa“ enthalten kein Entscheidungsproblem.
     - „das/dass“ ist ein grammatischer Fall, als Einzelwort nicht lösbar.
     - Als Strategie steht „Ableiten“, der Text empfiehlt „in Silben sprechen“.
  2. **Auslautverhärtung: 15/111 Wörter auf -ng** (Ring, lang, jung, Anfang …). Das ist kein
     Auslautverhärtungsfall: Auch die Verlängerung „Ringe“ macht kein /g/ hörbar. Weitere
     Mängel:
     - Archaische oder ungeeignete Wörter für Grundschulkinder: „Magd“, „Trug“, „Tugend“,
       „Raub“; „Zugweg“ und „Wegesrand“ sind kaum gebräuchlich.
     - Englische Lehnwörter „Club“ und „Job“ stehen in der Verlängerungs-Box.
  3. **Dehnungs-h: 12/108 Fehlzuordnungen.**
     - Silbentrennendes h (Reh, Zeh, Kuh, Schuh, froh, Ruhe, Truhe, drohen, Drohung,
       Zahnweh, Ruhestand): Es ist durch Verlängern hörbar (Re-he) und folgt einer anderen
       Strategie als das Dehnungs-h.
     - Hörbares h: Ahorn.
     - Strategie „Merken“ für die ganze Box verwischt diese Unterscheidung.
     - „Wahn“ und „Gewehr“ sind für die Grundschule ungeeignet. Die Textbox-Richtlinie selbst
       nennt „keine Angstthemen“.
  4. **Textbox-Zielwörter mit gleicher Verwechslung:**
     - TXT-024 (Dehnungs-h): „sehen, stehen, Reh“, 3 von 6 Zielwörtern sind
       silbentrennendes h.
     - TXT-034: „weh, sah, ruhig“, 3 von 7.
     - TXT-046: „sehe, ruhen“.
     - TXT-011: „sah“.
     - TXT-001 nutzt den **Namen** „Bello“ als Doppelkonsonant-Zielwort.
     - TXT-024 enthält den umgangssprachlichen Satz „weil ich sehr Hunger habe“.
     - TXT-023 enthält Füllsätze nur für Zielwörter („Seine Hand ist schnell und sicher.“).
  5. **Langes i:**
     - „Ferien“ (Fe-ri-en) enthält kein langes i.
     - Strategie „Merken“ für die regelhafteste Schreibung des Deutschen (offene Silbe → ie)
       verschenkt die Regel. Didaktisch üblich ist „Schwingen/Silbieren“ [F, n. o. v.].
  6. **„Silbieren“** als Strategie für 40 einsilbige Wörter (Schiff, Glück, Platz, nass …).
     Silbieren greift erst nach Verlängern (Schif-fe).
  7. **ä/äu „Ableiten“:** „spät, später, zäh, Käfer, Käfig, Säge, gähnen, Mädchen, Märchen,
     ärgerlich“ haben kein verwandtes Wort mit a/au. Es sind Merkwörter. Die Box enthält nur
     ä-Wörter und keine e-Kontraste, obwohl der Titel „ä/e und äu/eu“ lautet (siehe D-007).
  8. **„Merkwörter & Fremdwörter“** behauptet „keine verlässliche Strategie“. Dort stehen aber
     lautgetreu schreibbare Wörter wie Dame, Park, Sport, Salat, Paket, Firma, November.
  9. **„Becker“** (ck/tz-Box) ist ein Familienname. Gemeint ist „Bäcker“.
  10. **Gleich klingende Wörter:**
      - „Weg/weg“ sind in der Standardaussprache **nicht** gleich klingend ([veːk]/[vɛk]).
      - „Bären/Beeren“ nur in regionaler Aussprache.
      - Vier Bedeutungshilfen zeigen in der „nur hören“-Stufe das Zielwort selbst: „das erste
        **Mal**“, „ein **Laib** Brot“, „Art und **Weise**“, „**das** Haus“ (D4).
- **Reproduktion / Prüfweg:** D3, D4 (Ausgabe mit allen Wortlisten), D14 (Browser). Fachliche
  Prüfung durch Lesen.
- **Betroffene Nutzergruppen:** alle Kinder im Rechtschreibtraining, besonders Kinder, die sich
  an Regeltexten orientieren. Außerdem die Lehrkraft, die laut `docs/inhalte/` noch prüfen
  soll.
- **Mögliche Folgen:**
  - **[H]** Kinder übernehmen eine falsche Regel („langer Vokal → ß“) und übergeneralisieren
    („Haße“).
  - **[H]** Strategiehinweise passen nicht zum Wort und verlieren dadurch ihre Glaubwürdigkeit.
- **Empfehlung:**
  - Wortlisten nach den Prinzipien des Grundwortschatzes neu ordnen: Dehnungs-h und
    silbentrennendes h trennen, -ng entfernen.
  - Den s/ss/ß-Regeltext korrigieren: „Hör genau: summt das s (Hase) → s. Zischt es nach
    langem Vokal (Soße) → ß, nach kurzem Vokal (Tasse) → ss. Am Wortende: verlängern.“
  - Strategie je Wort statt je Box angeben.
  - Bedeutungshilfen ohne Zielwort formulieren.
  - „Weg/weg“ aus der Gruppe nehmen.
  - Einen Prüftest ergänzen, der Hinweise auf das Zielwort prüft.
  - Die Lehrkraft-Prüfliste aus `docs/inhalte/` **vor** dem Einsatz abarbeiten. Bis dahin die
    betroffenen Boxen kennzeichnen.
- **Aufwand (grob):** M (inhaltlich), S je Einzelkorrektur
- **Erfolgskriterium:**
  - D3 liefert 0 bei -ng, silbentrennendem h und Langvokal-s ohne passenden Regeltext.
  - D4 liefert 0.
  - Die Prüfliste in `docs/inhalte/textbox.md` und `wortspeicher.md` ist abgehakt.

### D-007 – Wortboxen ohne Kontraste, ohne Niveaustufen und ohne lernstandsbezogene Auswahl

- **Bereich:** Wortspeicher, Differenzierung, Interleaving, Progression
- **Status:** bestätigt (Codeanalyse); Wirkung als begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Mechanik, mittel für die Wirkung
- **Fundstelle:**
  - `src/domain/german-learning-content.ts:16-132` (Listen)
  - `src/domain/word-round.ts:86-99` (`sampleRoundWords`: Zufall ohne Lernstand)
  - `app/components/learning-word-app.tsx:288-296` (`random: Math.random`)
- **Beschreibung:**
  1. **Nur Positivbeispiele:**
     - Die Dehnungs-h-Box enthält nur Wörter mit h. Die meisten langen Vokale im Deutschen
       sind aber **unmarkiert** (Tal, Schule, Name).
     - Die ie-Box enthält nur ie, nie i (Kino, Tiger, mir).
     - Die ä-Box enthält nur ä, nie e.
     - Wer weiß, in welcher Box er übt, kennt die Antwort auf die Phänomenfrage. Die
       Unterscheidung, die im freien Schreiben verlangt wird, wird nie geübt. Ausnahme ist
       s/ss/ß.
  2. **Keine Niveaustufen:**
     - Grundschulwörter (Hund, Kind) stehen neben Sek-I-Wortschatz (Vertrag, Verletzung,
       Übersetzung, Gesetz, Niveau, Saison, Universität, Praktikum, Vertrieb, Tugend).
     - Eine 10er-Runde für ein Kind der 2. Klasse kann davon mehrere enthalten.
     - Es gibt keine Zuordnung zu Jahrgangsstufen oder zum bayerischen Grundwortschatz
       (623 Wörter bis Jahrgangsstufe 4).
  3. **Auswahl ohne Lernstand:** „Nochmal üben“ zieht reinen Zufall. Bereits sichere Wörter
     kommen so oft wie unbekannte. Es gibt keine Priorität für Wörter mit Fehlern innerhalb
     der Box, nur über „Fällige“.
- **Reproduktion / Prüfweg:** Lesen der Listen. D3 (Mehrfachzuordnungen). Codepfad der
  Auswahl.
- **Betroffene Nutzergruppen:** jüngere Kinder (2./3. Klasse), schwache Rechtschreiber, DaZ
  (Instanz E).
- **Mögliche Folgen:**
  - **[F, Übertragungsgrenze]** Interleaving hilft vor allem beim Unterscheiden ähnlicher
    Kategorien. Für Wortlisten ohne Unterscheidungsaufgabe ist es nicht belegt
    (Brunmair & Richter 2019, n. o. v.).
  - **[H]** Blockweises Üben einer Minderheitenschreibung (h, ie, ä) fördert Übertragung auf
    Wörter ohne Markierung („Schuhle“, „Tieger“).
  - **[H]** Überforderung durch unpassende Wörter und Lernzeit für bereits Gekonntes.
- **Empfehlung:**
  - Je Phänomen eine **Kontrastbox**, z. B. „Mit oder ohne h?“, „i oder ie?“, „e oder ä?“,
    mit Entscheidungsaufgabe.
  - Wörter mit Niveau kennzeichnen (Grundwortschatz 1/2, 3/4, Sek I) und standardmäßig nach
    Jahrgang filtern.
  - Die Rundenauswahl gewichten: ungeübte und fehlerhafte Wörter bevorzugen, sichere nur
    gelegentlich einstreuen.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - Jede Phänomenbox hat einen Kontrastanteil von mindestens 30 %.
  - Ein Kind mit Jahrgangsstufe 2 erhält nur Wörter der Stufe 1/2.
  - Der Anteil sicherer Wörter in Runden liegt bei höchstens 20 %.

### D-008 – Rückmeldungen überwiegend „richtig/falsch“: kein Fehlerort, keine Strategie, keine Fehlerklassifikation

- **Bereich:** Feedback aller Module
- **Status:** bestätigt (reproduziert, D6) und bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `app/frei/german/laufdiktat/running-dictation-app.tsx:89-118, 432-455`
  - `src/domain/running-dictation.ts:103-122` (`checkRunningDictationAnswer`, Text:
    `input.trim() === item.target`)
  - `app/raum/spiel/live-game.tsx:665-742` („Noch nicht richtig. Versuche es erneut.“, Eingabe
    wird geleert)
  - `src/integrations/laufdiktat/live-session.ts:99-129`
  - `app/frei/mathematics/mental-math-app.tsx:862, 869-886`
  - `app/views/wortspeicher/feedback-panel.tsx:11-18`
- **Beschreibung:**
  - **Laufdiktat**, live und allein, ist das Unterrichtsformat für Texte. Ein Satz ist nur
    richtig, wenn er **zeichengenau** stimmt. Ein fehlender Punkt oder ein doppeltes
    Leerzeichen macht den ganzen Satz falsch (D6). Die Rückmeldung nennt **nicht, welches
    Wort** falsch war. Live wird die Eingabe gelöscht. Das Kind schreibt den ganzen Abschnitt
    neu, oft mit demselben Fehler.
  - **Kopfrechnen:** „Noch nicht – probiere es erneut“, ohne Hinweis auf eine Strategie, etwa
    Zerlegen am Zehner, Nachbaraufgabe oder Umkehraufgabe.
  - **Wortspeicher:** Der Buchstabenvergleich ist gut (Aufgabenebene). Ein Bezug zur Strategie
    der Box fehlt, etwa „Verlängere: Hunde → d“.
  - **Keine Fehlerart wird diagnostisch klassifiziert.** Möglich wären mit vorhandenen Daten:
    - Rechtschreibung: Phonem-Graphem-Fehler (Auslassung, falscher Laut), Regelfehler an der
      kritischen Stelle, Groß-/Kleinschreibung, Vertauschung bzw. Tippfehler.
    - Mathe: Zehnerübergang vergessen (±10), Zählfehler (±1),
      **Zahlendreher/Inversion** (74 statt 47, im Deutschen typisch), Nachbarfakt im
      Einmaleins (7·8 = 54/48), Operationsverwechslung.
  - Falsche Mathe-Antworten werden gespeichert (`math.answer`), aber nicht ausgewertet.
- **Reproduktion / Prüfweg:** D6. Lesen der Rückmeldetexte.
- **Betroffene Nutzergruppen:** alle Kinder, besonders LRS und Rechenschwäche. Lehrkräfte, die
  Fehlerarten wissen müssten.
- **Mögliche Folgen:**
  - **[F]** Informationsreiche Rückmeldung wirkt stärker als bloße Richtig/Falsch-Angabe
    (Wisniewski, Zierer & Hattie 2020, n. o. v.; Shute 2008). Bei einfachen Faktenaufgaben
    genügt oft die Angabe der richtigen Lösung. Bei Sätzen und Strategieaufgaben nicht.
  - **[F]** Zahlendreher sind ein sprachspezifisches Risiko deutschsprachiger Kinder
    (Zuber et al. 2009, n. o. v.).
  - **[H]** Unlokalisierte Fehlermeldungen führen zu Raten und Frust.
- **Empfehlung:**
  - Laufdiktat-Text wortweise mit `alignWords`/`compareGaps` auswerten, wie in Textbox und
    Wortspeicher. Fehlerwort markieren, richtige Wörter stehen lassen. Satzzeichen und
    Leerzeichen als Hinweis, nicht als Fehler.
  - Mathe: eine regelbasierte Fehlerklassifikation, etwa zehn Regeln als reine Funktion. Je
    Fehlerart ein kurzer Strategiehinweis und eine passende Nachfolgeaufgabe.
  - Wortspeicher: die Strategie der Box bzw. des Worts in der Fehlerrückmeldung anzeigen.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - D6 liefert für „fehlender Punkt“ ein „richtig mit Hinweis“.
  - Ein Testkatalog mit je 3 Beispielen pro Mathe-Fehlerart wird korrekt klassifiziert.

### D-009 – Kopfrechnen: grobe Aufgabenfamilien, viele triviale Aufgaben, keine Messung der Rechenflüssigkeit

- **Bereich:** Mathematik, Aufgabenqualität, Diagnostik
- **Status:** bestätigt (reproduziert, D7) und bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch für die Zahlen, mittel für die Wirkung
- **Fundstelle:**
  - `src/domain/mental-math.ts:447-525` (`generateOperands`, Gleichverteilung)
  - `src/domain/math-practice.ts:270-300` (`mathFamilyKey`) und `:171-227` (`mathReviews`)
  - `app/frei/mathematics/mental-math-app.tsx:98-112` (Standard +/−, 0–20)
- **Beschreibung:**
  1. **Verteilung:** Operanden sind gleichverteilt.
     - Im Standard (+/−, 0–20) haben 26 % der Aufgaben einen Operanden 0 oder 1, aber nur 27 %
       einen Zehnerübergang. Der Zehnerübergang ist die zentrale Hürde des Zahlenraums bis 20.
     - Im Einmaleins ohne gewählte Reihe sind ~26 % ×0/×1 und ~16 % ×10.
     - Kernaufgaben, Tauschaufgaben und Analogien (7+8 → 17+8) werden nicht gezielt erzeugt.
  2. **Familien zu grob:** „Addition, ohne Lücke, bis 100“ fasst 34+5 und 37+48 zusammen. Die
     Fehlerübung erzeugt neue Aufgaben derselben Familie zufällig, also oft **ohne** die
     Schwierigkeit, an der der Fehler lag.
  3. **Nur Richtigkeit zählt, nie die Zeit:**
     - Ein Kind, das 7+8 sicher, aber zählend löst, gilt als beherrschend.
     - Eine richtige Erstantwort erzeugt **nie** eine Wiederholung.
     - Nach 4 sauberen Antworten (1/3/7/14 Tage) gilt ein Posten als gefestigt und wird nie
       wieder angeboten.
     - Die Automatisierung von Basisfakten ist so weder steuerbar noch sichtbar.
  4. **Kein Mathe-Fortschritt** auf „Mein Fortschritt“ (`app/lernen/fortschritt/page.tsx`).
- **Reproduktion / Prüfweg:** D7.
- **Betroffene Nutzergruppen:** Kinder mit Rechenschwierigkeiten, besonders beim Ablösen vom
  zählenden Rechnen. Lehrkräfte.
- **Mögliche Folgen:**
  - **[F, n. o. v.]** Verfestigtes zählendes Rechnen gilt in der deutschsprachigen
    Mathematikdidaktik als zentraler Risikofaktor (Gaidoschik 2010; Häsel-Weide et al. 2013).
    Antwortzeiten sind ein üblicher Hinweis darauf, ob ein Ergebnis abgerufen oder gezählt
    wird. Der Hinweis ist nicht eindeutig.
  - **[H]** Ein Drittel der Übungszeit fließt im Standard in Aufgaben ohne Lerngehalt.
- **Empfehlung:**
  - Den Generator nach **Aufgabentypen** gewichten: Zehnerübergang, Verdoppeln,
    Fast-Verdoppeln, Kern- und Nachbaraufgaben. Triviale Aufgaben auf höchstens 5 % begrenzen.
  - Familien um das Merkmal „Übergang ja/nein“ und um den Stellenwerttyp (ZE+E, ZE+ZE)
    erweitern.
  - Antwortzeit **lokal erfassen** (nur zur Diagnose, nicht für Punkte). Daraus
    „richtig und flüssig“ (z. B. < 3 s, kalibrierbar) gegen „richtig, aber langsam“
    unterscheiden.
  - Basisfakten auch nach richtiger Erstantwort gelegentlich wiederholen.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - D7 zeigt im Standard ≥ 50 % Zehnerübergang und ≤ 5 % triviale Aufgaben.
  - Die Fortschrittsseite zeigt je Einmaleinsreihe „sicher und flüssig“.

### D-010 – LernBox: Selbsteinschätzung hebt bis Box 5; die getrennten Stände „Bedeutung“ und „Schreiben“ aus dem Konzept fehlen im Kartenmodell

- **Bereich:** LernBox/Vokabeln
- **Status:** bestätigt (reproduziert, D5) und bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `src/domain/learning-box.ts:352-433` (`processLearningBoxResult`: `mode` beeinflusst nur
    `writingStreak`)
  - `app/components/learning-box-app.tsx:392-440` (`assess`: kein `secondChance`)
  - `src/domain/learning-box-replay.ts:49-71` (Ereignis `help: "solution"` bei
    Selbsteinschätzung)
- **Beschreibung:**
  - _Konzept:_ Vault 03 sagt zu Karteikarten: „Dieser schwächere Nachweis … erlaubt wegen der
    gezeigten Lösung keinen regulären Aufstieg.“ Vault 06 nennt „Bedeutung richtig,
    Schreibfehler → Wissen bleibt, Schreiben fällt“ und „zweite Chance“.
  - _Implementierung:_ Fünfmal „Gewusst“ nach dem Aufdecken an fälligen Tagen ergibt Box 5
    (D5). Das gespeicherte Ereignis behauptet dagegen `help: "solution"`. Das ist ein
    weiterer Widerspruch im Sinne von A-004.
  - Eine Karte hat je Richtung nur **einen** Stand. Ein Tippfehler bei bekannter Bedeutung
    setzt auf Box 1, auch für Kinder mit LRS. Die Schreiberleichterung gilt nur im
    Live-Raum.
  - Die „zweite Chance“ existiert in der Fachlogik, die Oberfläche ruft sie nie auf.
- **Reproduktion / Prüfweg:** D5.
- **Betroffene Nutzergruppen:** Vokabellernende (Englisch GS 3/4, Mittelschule), Kinder mit
  LRS.
- **Mögliche Folgen:**
  - **[F, n. o. v.]** Lernende überschätzen beim Selbstbewerten ihren Abruf und beenden das
    Üben zu früh. Das senkt die Behaltensleistung (Dunlosky & Rawson 2012). Kinder sind
    metakognitiv noch ungenauer.
  - **[H]** Unerkannte Lücken liegen 30 Tage, Tippfehler werfen sichere Bedeutungen zurück.
    Beides verzerrt die Wiederholung.
- **Empfehlung:**
  - Selbsteinschätzung höchstens bis Box 2 oder 3 zählen lassen, oder nur mit
    Stichprobenkontrolle (jede dritte Karte schriftlich).
  - Einen Fast-richtig-Pfad einführen (`isWithinOneEdit`): Box bleibt, früher fällig.
  - Die zweite Chance in der Oberfläche anbieten.
  - Getrennte Stände Bedeutung/Schreiben entweder umsetzen oder im Vault streichen.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - D5 endet höchstens in Box 3.
  - Ein Tippfehler bei Box 4 führt zu Box 4, früher fällig.
  - Vault und Code stimmen überein.

### D-011 – Kein geschlossener Förderkreislauf: Module erzeugen ungleiche oder keine Lernsignale; „20 Aufgaben“ statt eines Zeitbudgets

- **Bereich:** Kohärenz des Lernsystems, Tagesportion
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** hoch
- **Fundstelle:**
  - `src/storage/daily-plan.ts:88-164` (`dailyPlanCandidates`: „neu“ nur für LernBox-Karten,
    Deutsch nur bei vorhandenem `learningWordProgress`, Mathe nur Fehler)
  - `app/frei/german/laufdiktat/running-dictation-app.tsx:66-72, 119-180` (Text: keine
    Ereignisse, keine Übernahme)
  - `src/storage/personal-learning-events.ts:1209-1228` (Fehlerwörter aus dem Unterricht ohne
    `incorrectAttempts` → in der Portion als „review“, nicht als „error“)
  - `src/domain/math-practice.ts:302-370` (ein Mathe-Element ≈ 8–10 Rechnungen)
- **Beschreibung:**
  - _Konzept:_ Vault 22: „Lernraum ist keine Sammlung einzelner Lernprogramme … Jede Übung
    erzeugt ein Lernsignal, das den fachlich passenden nächsten Schritt aktiviert.“
  - _Implementierung:_
    - **Laufdiktat allein (Text)** erzeugt **kein** Ereignis und übernimmt nichts.
    - **Textbox** erzeugt ein Sammelereignis je Einheit (≥ 90 % „richtig“). Fehlerwörter
      gelangen nur per Klick in den Wortspeicher.
    - **Tastenwelt** ist nicht Teil der Portion.
    - **Feste Wortboxen** speisen die Tagesportion nie mit neuen Wörtern. Das Gleiche gilt
      für Mathe: Ohne Lehrkraft-Vokabeln ist „Heute üben“ für ein Kind rein reaktiv, also nur
      frühere Fehler und Wiederholungen, ohne curricularen Fortschritt.
    - Im Unterricht falsch geschriebene Wörter werden in der Portion als „Wiederholung“
      einsortiert, nicht als „Fehler“. Sie konkurrieren dadurch mit älteren Wiederholungen.
  - „20 Aufgaben“ zählt heterogene Einheiten: eine Vokabelrichtung (~10 s), ein Lernwort auf
    frei gewählter Stufe, eine Mathe-Familie (8–10 Rechnungen). Ein Zeitbudget für die
    gewünschte **10-Minuten-Einheit** gibt es nicht. Der Begriff „10 Minuten“ kommt in der
    Lernoberfläche nicht vor.
- **Reproduktion / Prüfweg:** Lesen der Kandidatenbildung. Vergleich mit Vault 22.
- **Betroffene Nutzergruppen:** Kinder ohne Lehrkraftinhalte, Lehrkräfte, die eine kurze,
  planbare Einheit erwarten.
- **Mögliche Folgen:**
  - **[H]** Die Plattform wirkt wie eine Werkzeugsammlung. Lernzeit hängt von der Eigenwahl
    ab. Signale aus dem Unterricht werden abgeschwächt. Die Tagesportion ist je nach Inhalt
    3 oder 25 Minuten lang.
- **Empfehlung:**
  - **Gewichte statt Stückzahl** je Elementart (geschätzte Sekunden), Portion nach Zeit
    (Standard 10 Minuten).
  - Unterrichtsfehlerwörter als „error“ markieren.
  - Neue Inhalte aus einer **curricularen Sequenz** einspeisen: Grundwortschatz der
    Jahrgangsstufe, Einmaleinsreihen in Lehrplanreihenfolge.
  - Laufdiktat allein und Textbox-Fehler als Lernwort-Ereignisse übernehmen. Dabei nur
    falsch geschriebene, nicht vergessene Wörter.
- **Aufwand (grob):** M
- **Erfolgskriterium:**
  - Ein Kind ohne Lehrkraftinhalte erhält täglich eine Portion mit neuen Grundwortschatz- und
    Mathe-Elementen.
  - Die Portion dauert im Probedurchlauf im Median 8–12 Minuten.

### D-012 – Leistungsdruck durch Tempo-Wettbewerb, Tempo-Punkte und öffentlich sichtbare Fehlerzahlen; Widerspruch zu den eigenen Motivationsregeln

- **Bereich:** Motivation, Klassenklima
- **Status:** bestätigt (Codeanalyse); Wirkung als begründetes Risiko
- **Schweregrad:** P2
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:**
  - `app/views/laufdiktat/teacher-dictation/constants.ts:63-72` (Battle: „Wer zuerst fertig
    ist, gewinnt“, „Störangriffe“)
  - `app/raum/spiel/live-game.tsx:444-508` (`speedPoints` → „Tempo-Punkte“ am Ende jeder
    Live-Runde)
  - `src/domain/live-game-feedback.ts:2-6`
  - `app/frei/german/laufdiktat/running-dictation-app.tsx:304-318` (Sterne immer)
  - `app/views/laufdiktat/teacher-dictation/live-step.tsx:66-108` (Namen, Fehlerzahl, „Braucht
    Hilfe“)
  - `app/ui/lernraum-ui.css:1389-1456` (Flimmer-Angriff, ~2,6 Hz)
- **Beschreibung:**
  - _Konzept:_ Vault 10: „Genauigkeit zählt stärker als Geschwindigkeit“. Vault 23:
    „Schnelle Antwort: kein eigener Bonus“, ausdrücklich ausgeschlossen ist „Belohnung von
    Geschwindigkeit als Lernqualität“. Vault 22: keine Bloßstellung.
  - _Implementierung:_
    - Battle entscheidet nach **Tempo**, mit Tinten- und Flimmerangriffen auf andere Kinder.
      Langsamere Kinder bekommen mehr Ladung (`battleChargeGain`).
    - Jede Live-Runde endet mit „Tempo-Punkten“ (Zeichen pro Sekunde × 100).
    - Die Lehreransicht zeigt Namen, Fehlerzahl („3✕“) und „Braucht Hilfe“. Wird sie wie
      üblich für Raumcode/QR projiziert, ist das öffentlich.
  - _Positiv:_ Motivation, Häuser und Serie stehen standardmäßig auf `aus`. Es gibt keine
    Minuspunkte. Der Rückstand wird nicht als Zahl gezeigt.
- **Reproduktion / Prüfweg:** Lesen der Stellen. Die Flimmerfrequenz liegt unter der
  WCAG-Schwelle von 3 Blitzen/s. Barrierefreiheit gehört zu Instanz C.
- **Betroffene Nutzergruppen:**
  - langsame Schreiber, Kinder mit LRS, ADHS oder Prüfungsangst
  - Klassen, in denen die Lehrkraft projiziert
- **Mögliche Folgen:**
  - **[F]** Bestenlisten und Vergleich können Motivation und Leistung mindern (Hanus & Fox
    2015, n. o. v.). Rückmeldung, die Aufmerksamkeit auf das Selbst lenkt, wirkt oft negativ
    (Kluger & DeNisi 1996). Gamification wirkt im Mittel klein bis mittel und stark
    kontextabhängig (Sailer & Homner 2020, n. o. v.).
  - **[H]** Tempo-Wettbewerb beim Rechtschreiben lädt zu Flüchtigkeitsfehlern ein, das
    Gegenteil des Lernziels.
- **Empfehlung:**
  - Tempo-Punkte entfernen oder nur auf Wunsch der Lehrkraft und privat anzeigen.
  - Battle nach **Genauigkeit** werten (oder Teamwertung), Störangriffe standardmäßig aus.
  - Lehreransicht mit **Projektionsmodus**: nur Raumcode und Gesamtfortschritt, keine Namen
    mit Fehlerzahlen.
  - Sterne im Laufdiktat allein abschaltbar.
- **Aufwand (grob):** S
- **Erfolgskriterium:**
  - Keine Anzeige von Tempo als Punktwert ohne Lehrkraftentscheidung.
  - Der Projektionsmodus zeigt keine personenbezogenen Fehlerzahlen.

### D-013 – Eigene Wortboxen ohne Schreibprüfung: Falschschreibungen werden eingeübt und als „richtig“ bestätigt

- **Bereich:** Wortspeicher (eigene Wortboxen), LernBox (eigene Karten)
- **Status:** begründetes Risiko (Mechanik bestätigt per Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:**
  - `src/domain/word-box.ts` (Validierung nur Zeichen und Länge)
  - `src/domain/word-round.ts:207-210` (Vergleich gegen das gespeicherte Wort)
- **Beschreibung:** Ein Kind, das „Fahrad“ in seine Wortbox einträgt, übt künftig „Fahrad“. Die
  App bestätigt es mit „Richtig“. Bei LRS ist diese Gefahr am größten. Wörter aus Unterricht
  und Textbox sind dagegen korrekt, weil sie aus Originaltexten stammen.
- **Reproduktion / Prüfweg:** Codepfad. Eine Eingabe „Fahrad“ in einer eigenen Box wird
  akzeptiert.
- **Betroffene Nutzergruppen:** Kinder mit LRS, jüngere Kinder.
- **Mögliche Folgen:** **[H]** Falsche Wortbilder werden gefestigt.
- **Empfehlung:**
  - Abgleich gegen eine lokale Wortliste (Grundwortschatz plus alle festen Boxen). Bei
    Unbekanntem ein Hinweis „Bitte mit Wörterbuch oder Lehrkraft prüfen“.
  - Optional ein Haken „von der Lehrkraft geprüft“.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Unbekannte Wörter werden beim Anlegen gekennzeichnet.

### D-014 – Tastenwelt: solider Lehrgang, aber Freischaltung nach einem einzigen genauen Durchgang, kleingeschriebene Nomen und wenig Sinn auf der Bildschirmtastatur

- **Bereich:** Tastschreiben
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch für die Mechanik
- **Fundstelle:**
  - `src/tastschreiben/typing-progress.ts:15-32` (`completed` sobald ein Versuch ≥ 90 %;
    `problemChars` nur vom letzten Versuch)
  - `src/tastschreiben/curriculum.ts:155-175, 280-300` (Wortpools „glas, hals, jagd, rad,
    tag, uhr, tür, haus …“)
  - `app/frei/typing/typing-coach.ts:54-64`
- **Beschreibung:**
  - Die Lektionsfolge entspricht dem motorischen Lernaufbau: Finger einzeln, dann kombiniert,
    Reihe für Reihe, Genauigkeit vor Tempo. Das ist gut.
  - Eine Lektion gilt aber nach **einem** Durchgang mit ≥ 90 % als bestanden, ohne
    Übungsumfang oder Wiederholung an anderen Tagen. Das passt nicht zur Automatisierung.
    **[F, n. o. v.]** Motorische Fertigkeiten brauchen verteilte Übung.
  - Vor der Einführung der Großbuchstaben werden Nomen klein geübt („glas“, „uhr“, „haus“).
    Das steht im Widerspruch zum Rechtschreibziel derselben Plattform. Ein Kind mit LRS
    tippt dutzendfach „tür“.
  - Auf dem iPad mit Bildschirmtastatur sind Fingerlektionen fachlich sinnlos. Vault 07
    erkennt das an, die App bietet sie trotzdem gleich an.
- **Reproduktion / Prüfweg:** Lesen.
- **Betroffene Nutzergruppen:** Tastenwelt-Nutzer, iPad-Klassen.
- **Mögliche Folgen:** **[H]** Scheinfortschritt im Lehrgang, Konflikt mit der
  Groß-/Kleinschreibung.
- **Empfehlung:**
  - Freischaltung nach zwei Durchgängen ≥ 90 % an verschiedenen Tagen oder nach einer
    Mindestzeichenzahl.
  - Wortpools vor den Großbuchstaben auf Kleinwörter beschränken (als, das, sag, lag, fallen,
    rufen …).
  - Bei fehlender Hardwaretastatur einen eigenen Lernweg „Tippgenauigkeit“ ohne
    Fingerlektionen anbieten.
- **Aufwand (grob):** S
- **Erfolgskriterium:**
  - Kein Wortpool enthält ein klein geschriebenes Nomen.
  - Die Freischaltung braucht ≥ 2 Tage.

### D-015 – Wiederholungsparameter sind unbelegt und werden nicht ausgewertet

- **Bereich:** Spacing, Kalibrierung
- **Status:** offene Frage (Parameter), bestätigt (Codeanalyse: keine Auswertung)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** mittel
- **Fundstelle:**
  - `src/domain/leitner-schedule.ts:14-20` (`LEITNER_INTERVAL_DAYS`)
  - `src/domain/math-practice.ts:80` (`MATH_REVIEW_DAYS`)
  - `src/domain/daily-plan.ts:14` (Kontingente)
- **Beschreibung:**
  - Die Staffel 1/3/7/14/30 ist im Vault als „vorläufig, pädagogisch zu erproben“
    gekennzeichnet. Das ist ehrlich.
  - **[F]** Verteiltes Abrufüben ist massiertem deutlich überlegen. Für **wachsende**
    Abstände gegenüber gleichmäßigen fand eine Metaanalyse keinen Vorteil (Latimier, Peyre &
    Ramus 2021). Die Staffel ist also vertretbar, aber nicht begründet.
  - Die App erhebt die nötigen Daten bereits: die erste Antwort bei Fälligkeit je Box. Eine
    **Behaltensquote je Box** wird nicht berechnet. Die Tagesportion (6 Fehler, 4 neue,
    20 gesamt) ist ebenfalls unkalibriert.
  - Mathe-Posten gelten nach 14 Tagen dauerhaft als „gefestigt“. Eine Erhaltungswiederholung
    fehlt.
- **Reproduktion / Prüfweg:** Lesen.
- **Betroffene Nutzergruppen:** alle Lernenden. Die Lehrkraft als Entscheiderin über
  Parameter.
- **Mögliche Folgen:** **[H]** Zu lange oder zu kurze Abstände bleiben unbemerkt.
- **Empfehlung:**
  - Eine lokale Kennzahl „richtig bei Fälligkeit je Box“ einführen, als Zielkorridor etwa
    80–90 %. Im Lehrer-Export nur aggregiert.
  - Im Probedurchlauf Abstände danach nachsteuern.
  - Eine Erhaltungsstufe (60 Tage) für Mathe einführen.
- **Aufwand (grob):** S–M
- **Erfolgskriterium:** Eine Behaltensquote je Box ist sichtbar. Parameteränderungen sind damit
  begründet.

### D-016 – Schreiberleichterung akzeptiert bedeutungsändernde Ein-Buchstaben-Abweichungen

- **Bereich:** LRS-Toleranz (Entscheidung 50), Live-Vokabeln
- **Status:** bestätigt (Codeanalyse)
- **Schweregrad:** P3
- **Sicherheit der Einschätzung:** hoch für die Mechanik
- **Fundstelle:**
  - `src/domain/spelling-tolerance.ts:9-42` (`toleratesSpelling`)
  - `src/integrations/laufdiktat/live-session.ts:116-127`
- **Beschreibung:** Ab 4 Buchstaben wird jede Abweichung um einen Buchstaben angenommen, auch
  wenn ein **anderes Wort** entsteht: „house/horse“, „Haus/Hals“, „where/were“.
  Abgemildert ist das durch zwei Dinge: Die Platzierung erfolgt nur als „practice“, und die
  richtige Schreibung wird angezeigt („So schreibt man es: …“).
- **Reproduktion / Prüfweg:** `isWithinOneEdit("horse","house") === true` (Codelesung).
- **Betroffene Nutzergruppen:** Kinder mit Schreiberleichterung.
- **Mögliche Folgen:** **[H]** Bedeutungsfehler werden als Schreibfehler verbucht.
- **Empfehlung:** Toleranz nicht anwenden, wenn die Eingabe einer anderen Lösung derselben
  Runde oder einem Wort einer Stoppliste entspricht. Optional nur Vertauschung, Doppelung und
  Auslassung tolerieren.
- **Aufwand (grob):** S
- **Erfolgskriterium:** Ein Test „horse ≠ house“ ist grün.

---

## 5 Modulweise Bewertung

| Modul                         | Fachliche Richtigkeit                                                      | Aufgabenqualität und Progression                                                                                                                                                                       | Rückmeldung                                                                                                      | Wiederholung, Fehlertoleranz                                                               | Transfer                                                                                      | Motivation                                                      |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **LernBox / Vokabeln**        | Abhängig von Lehrkraft- und Kindinhalten. Alternativen über „\|“ sind gut. | Leitner mit „kein Aufstieg vor Fälligkeit“ und 8-h-Erholungsfenster: **gut**. Selbsteinschätzung bis Box 5 (D-010).                                                                                    | Richtig/Falsch mit Lösung und Boxwechsel (Aufgabenebene). Kein Fast-richtig, keine zweite Chance.                | Ein Tippfehler setzt auf Box 1. LRS-Erleichterung nur live.                                | Beide Richtungen getrennt: gut. Kein Satzkontext.                                             | Ruhig, sichtbares Fächermodell.                                 |
| **Wortspeicher / Merkstufen** | Mehrere Phänomenfehler und ein falscher Regeltext (D-006)                  | Stufenidee (Abschreiben → Lücke → Verdecken → Merkblock → Hören) **didaktisch stark**. Abschreiben zählt aber als Abruf (D-001), Längenhinweis verrät die Entscheidung (D-002). Keine Niveaus (D-007). | Buchstabenvergleich, Fehlerart, Homophonhinweise: **die beste Rückmeldung der Plattform**. Strategiebezug fehlt. | Wiederholung bis richtig. Sofortkorrektur zählt richtig als „mit Selbstkorrektur“.         | Textbox-Brücke vorhanden. Kontrastaufgaben fehlen.                                            | Prozent, Bestwert (verrauscht, D-004). „Geschafft!“ freundlich. |
| **Textbox**                   | Texte kindgerecht, lebensweltlich. Einzelne Fehlzuordnungen (D-006).       | Satzlängen altersgerecht (Ø 7/9/10 Wörter). Vier Durchgänge mit wachsender Ausblendung sind ein schlüssiges Fading. Durchgang 4 überfordert das Gedächtnis (D-005).                                    | Wort-für-Wort-Gegenüberstellung mit Fehlerarten: **gut**. Schwerpunktstatistik irreführend.                      | Keine verteilte Wiederholung. Fehlerwörter nur manuell weiter.                             | Derselbe Text wiederholt trainiert Wiedererkennung. Transfer unbelegt (ehrlich dokumentiert). | Bestwert, „gemeistert“ durch Wiederholen erreichbar.            |
| **Kopfrechnen**               | Rechnerisch korrekt, Parser ohne `eval`.                                   | Neue Aufgaben derselben Familie statt Kopie: **gut**. Verteilung und Familien zu grob (D-009).                                                                                                         | Nur „Noch nicht“, Lösung auf Wunsch.                                                                             | Nur Fehler werden wiederholt, gefestigt nach 14 Tagen.                                     | Platzhalteraufgaben (Lücken) vorhanden: gut.                                                  | Neutral.                                                        |
| **Laufdiktat live**           | Lehrkraftinhalte.                                                          | Klassisches Unterrichtsformat mit Merkspanne (Aufdecken gezählt), Üben-Modus mit gestuften Buchstabenhilfen: **gut**.                                                                                  | Satz zeichengenau, Fehlerort unbekannt (D-008).                                                                  | Übernahme in LernBox und Wortspeicher nach Ergebnis (Entscheidung 49): **gut durchdacht**. | Satz- und Textebene.                                                                          | Sterne optional. Tempo-Punkte immer, Battle (D-012).            |
| **Laufdiktat allein**         | Kindeingabe.                                                               | Gleiches Prinzip, „Noch einmal ansehen“ unbegrenzt und ungezählt.                                                                                                                                      | Nur „Noch nicht richtig“.                                                                                        | Text hinterlässt **keinerlei** Lernsignal (D-011).                                         | –                                                                                             | Sterne immer.                                                   |
| **Tastenwelt**                | Korrekt.                                                                   | Systematischer Lehrgang: **gut**. Freischaltung zu früh, Kleinschreibung (D-014).                                                                                                                      | Genauigkeit, unsichere Tasten, Tempo nur informativ: gut.                                                        | Tasten-Extra für unsichere Zeichen: gut.                                                   | Wörter, Sätze, Texte.                                                                         | Sterne/Medaillen an Genauigkeit gekoppelt: vertretbar.          |

## 6 Kohärentes Lernsystem oder Sammlung?

**Konzept:** Vault 22 und Entscheidung 31 beschreiben ausdrücklich einen Kreislauf, keine
Sammlung.

**Befund:** Die Plattform ist heute eine **gut gebaute Sammlung mit einem dünnen gemeinsamen
Kern**. Den gemeinsamen Kern bilden:

1. das Lernereignis
2. die Tagesportion aus LernBox, Lernwörtern und Mathe-Fehlern
3. zwei echte Brücken: Laufdiktat → LernBox/Wortspeicher und Wortspeicher ↔ Textbox

Was fehlt:

- **Gemeinsames Kompetenzmodell:** kein „Phänomen Dehnungs-h“ als Lernobjekt über Wortspeicher,
  Textbox und Laufdiktat hinweg, kein „Zehnerübergang“ über Kopfrechnen und Laufdiktat-Mathe.
- **Curriculare Sequenz**, die festlegt, was als Nächstes neu kommt.
- **Gemeinsame Regeln:** Vier Wiederholungslogiken widersprechen sich (A-004). „Fällig“,
  „sicher“ und „gemeistert“ bedeuten in jedem Modul etwas anderes.
- **Rückfluss** aus Textbox, Laufdiktat allein und Tastenwelt in die Steuerung.

**[H]** Für Kinder ist das zunächst kein Problem, die Oberfläche ist einheitlich. Für die
Lernwirksamkeit ist es eines: Erkenntnisse aus einem Modul („verwechselt s/ß“) steuern das
nächste nicht.

## 7 Lernwirksamkeit: Leitfragen

| Prinzip                          | Forschungslage                                                                                                                                                                                                                      | Umsetzung im Code                                                                                                                                                              | Urteil                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Abrufübung**                   | **[F]** robust, auch bei Kindern und beim Rechtschreiben (Roediger & Karpicke 2006; Adesope et al. 2017 g ≈ 0,6, n. o. v.; Jones et al. zu Rechtschreibung bei 6–8-Jährigen). Grenze: meist Laborwörter, kurze Behaltensintervalle. | Vorhanden in LernBox (Schreiben), Wortspeicher Stufen 5/6, Laufdiktat. Entwertet durch Stufe 1/4 als „Abruf“ (D-001, D-002) und Selbstbewerten (D-010).                        | Prinzip richtig gewählt, Nachweisstärke nicht konsequent unterschieden.       |
| **Verteilung (Spacing)**         | **[F]** verteiltes > massiertes Abrufüben (g ≈ 0,74). Wachsend ≈ gleichmäßig (Latimier et al. 2021). Optimaler Abstand hängt vom Behaltensziel ab (Cepeda et al. 2008, n. o. v.).                                                   | LernBox und Mathe mit Fälligkeitsschutz. **Lernwörter ohne** (A-004), daher ein Nachmittag = 30 Tage Pause. Textbox ohne Spacing.                                              | Gut in LernBox, verfehlt im Kernmodul Rechtschreibung.                        |
| **Interleaving**                 | **[F]** wirksam für ähnliche Kategorien und Mathe-Aufgabentypen (Rohrer et al.; Brunmair & Richter 2019, n. o. v.). Für reine Wortlisten nicht belegt.                                                                              | Tagesportion mischt Module, Mathe „gemischt“ möglich. Wortboxen ohne Kontraste (D-007).                                                                                        | Ansatz vorhanden. Die Stelle, an der es wirken würde (Unterscheidung), fehlt. |
| **Festigung / Automatisierung**  | **[F, n. o. v.]** Basisfakten brauchen Flüssigkeit, nicht nur Richtigkeit.                                                                                                                                                          | Keine Zeitmessung, gefestigt nach 4 Antworten (D-009). Tastenwelt nach einem Durchgang (D-014).                                                                                | Schwach.                                                                      |
| **Transfer vs. Wiedererkennung** | **[F]** Rechtschreibunterricht verbessert Rechtschreibung, der Transfer ins freie Schreiben ist kleiner (Graham & Santangelo 2014, n. o. v.).                                                                                       | Textbox: derselbe Text viermal, Bestwert über Wiederholungen (D-004, D-005). Wortspeicher: Einzelwörter, keine Satz- oder Textanwendung außer über Textbox.                    | Wiedererkennung wird als Können ausgewiesen. Transfer nicht gemessen.         |
| **Kognitive Belastung**          | **[F]** Sweller. Arbeitsgedächtnis bei LRS häufig begrenzt (n. o. v.).                                                                                                                                                              | Stufe 5 Blockgröße wählbar: gut. Textbox Durchgang 4 sehr hoch (D-005).                                                                                                        | Gemischt.                                                                     |
| **Oberflächliche Routinen**      | **[H]**                                                                                                                                                                                                                             | Abschreiben mit Box-Aufstieg, Bestwert durch Wiederholen, Karteikarten „Gewusst“.                                                                                              | Mehrere Wege, Fortschritt ohne Lernen zu erzeugen.                            |
| **Fehlvorstellungen**            | **[F, n. o. v.]** Diagnostische Fehleranalyse (HSP: alphabetische, orthografische, morphematische Strategie; Mathe: Zählfehler, Stellenwert, Inversion) ist didaktischer Standard.                                                  | Keine Klassifikation (D-008). Daten dafür teilweise vorhanden.                                                                                                                 | Fehlt.                                                                        |
| **Feedbackqualität**             | **[F]** Hattie & Timperley: Aufgabe, Prozess, Selbstregulation, Selbst. Kluger & DeNisi: ein Drittel der Interventionen schadet.                                                                                                    | Fast nur Aufgabenebene. Prozessebene (Strategie) fehlt. Selbstregulationsebene: generische Reflexionsfragen zum Ergebnis („Ist dein Ergebnis gestiegen?“), nicht zum Vorgehen. | Mittel im Wortspeicher und in der Textbox, sonst schwach.                     |
| **Selbstregulation**             | **[F, n. o. v.]** Kinder überschätzen sich (Destan & Roebers 2015; Dunlosky & Rawson 2012).                                                                                                                                         | Freie Wahl von Box, Stufe und Text ohne Ziel- oder Planungshilfe. Vorauswahl leichteste Stufe. Selbstbewerten zählt voll.                                                      | Viel Wahlfreiheit, wenig Gerüst.                                              |
| **Motivation (SDT)**             | **[F]** Autonomie, Kompetenz, Eingebundenheit (Ryan & Deci). Erwartete greifbare Belohnungen können intrinsische Motivation untergraben (Deci, Koestner & Ryan 1999). Symbolisches oder verbales Lob kaum.                          | Motivationsschicht standardmäßig aus, keine Minuspunkte, Rückstand verborgen, Tagesziel erreichbar: **gut**. Bestwert-Rauschen, Tempo-Punkte, Battle (D-004, D-012).           | Überwiegend gut. Kompetenzrückmeldung aber unzuverlässig.                     |
| **Leistungsdruck**               | **[H]**                                                                                                                                                                                                                             | Tempo-Wettbewerb und Fehlerzahlen in der Lehreransicht.                                                                                                                        | Begrenzt, aber vermeidbar.                                                    |

## 8 Adaptive Steuerung und Diagnostik

**Gibt es Kompetenzschätzung, Eingangstest oder Kompetenzchecks?**
Nein (D-003). Verifiziert per Codesuche und Lesen der Steuerfunktionen. Der Modus „TEST“ wird
auf „LAUFDIKTAT“ abgebildet.

**Sind die erhobenen Daten geeignet?**
Teilweise:

- **Geeignet:** Einzelereignisse mit Ergebnis, Hilfe und Selbstkorrektur; falsche Mathe-Antworten;
  Textbox-Zeiten; Tippfehler je Taste.
- **Ungeeignet oder fehlend:**
  - Antwortzeiten bei Wörtern und Mathe
  - die Merkstufe im Ereignis (Abschreiben und Hören sind nicht unterscheidbar)
  - Bezug Wort → Phänomen
  - vergleichbare Messzeitpunkte
- Geteilte Geräte vermischen Daten mehrerer Kinder (B-010). Zufallsauswahl macht Prozentwerte
  unvergleichbar (D-004).

**Zufallstreffer und Flüchtigkeitsfehler?**

- Ein einzelner richtiger Abruf hebt die Box. Ein einzelner Tippfehler setzt auf Box 1 zurück,
  in LernBox und Lernwort.
- Ein Flüchtigkeitsfehler ist von einer Wissenslücke nicht unterscheidbar.
- Ein praktikables Kriterium wäre:
  - Fehler **an der kritischen Stelle** des Phänomens oder **wiederholt über Tage** → Lücke.
  - Ein-Buchstaben-Abweichung **außerhalb** der kritischen Stelle, z. B. eine Vertauschung,
    und beim nächsten Versuch ohne Hilfe richtig → wahrscheinlich Flüchtigkeit. Folge: Box
    bleibt, früher fällig.

**Gefahr falscher Einordnung:** hoch, und zwar in beide Richtungen:

- **Überschätzung:** Abschreiben, Längenhinweis, Selbstbewerten, Bestwert-Maximum.
- **Unterschätzung:** Textbox misst Gedächtnis; Tippfehler setzen zurück.

**Verhältnis Test- zu Lernzeit:** Heute gibt es keine Testzeit. Das ist gut für die Lernzeit,
schlecht für die Steuerung. Kurze Proben (siehe 9) kosten etwa 5 % der Übungszeit.

## 9 Bewertung des Konzepts „Eingangstest → Übungsphasen → wiederkehrende Kompetenzchecks“ und Gegenvorschlag

### 9.1 Kritik am angedachten Konzept

1. **Ein Eingangstest ist für den Zweck zu teuer und zu ungenau.**
   - Rechtschreibung (hunderte Wörter, ≥ 10 Phänomene) und Grundrechenarten sind breite
     Bereiche. Ein für Kinder zumutbarer Test (10–15 Minuten) liefert je Teilkompetenz nur
     wenige Items. Die Einzeldiagnose ist dann unzuverlässig.
   - **[H]** Ohne Normierung und Validierung lässt sich nicht sagen, was „68 %“ bedeutet.
   - Ein Test am ersten Tag erzeugt Prüfungsgefühl und einen Ankereffekt.
   - Der Wert veraltet schnell, weil im Unterricht gelernt wird.
2. **Ein Test nützt nur, wenn er eine Entscheidung ändert.** Heute gibt es keinen
   Steuerungsmechanismus, der eine Einstufung nutzen würde (D-003). Erst die Steuerung bauen,
   dann die Messung.
3. **Wiederkehrende Kompetenzchecks** sind sinnvoll, aber nur unter vier Bedingungen:
   - parallele Formen gleicher Schwierigkeit
   - gleiche Bedingungen (ohne Hilfen, ohne Längenhinweis)
   - kurze Dauer
   - ein Bezugspunkt (Lehrplan, Grundwortschatz)

   Sonst messen sie die zufällige Wortauswahl (D-004).

4. **Formale Diagnostik nicht nachbauen.** Für LRS oder Rechenschwäche gibt es in Bayern
   eigene Verfahren und Zuständigkeiten (Schulpsychologie; Annahme, nicht verifiziert). Eine
   Lehrkraft-App sollte das nicht ersetzen.

### 9.2 Gegenvorschlag: Lernverlaufsdiagnostik plus Beherrschungskriterien (technisch und organisatorisch umsetzbar)

**A. Kurze Lernverlaufsproben (curriculumbasierte Messung) [F]**
(Deno 1985; Souvignier, Förster & Schulte 2014; Plattformen quop und Levumi, n. o. v. außer
Levumi)

- **Rechtschreibung:**
  - Alle 2–3 Wochen 15–20 Wörter, **diktiert per Sprachausgabe** (Stufe-6-Mechanik
    vorhanden).
  - Gezogen aus dem Grundwortschatz der Jahrgangsstufe, **geschichtet nach Phänomen**: je
    Probe gleiche Anzahl Dehnungs-h, ie, Doppelkonsonant, Auslaut, s/ss/ß, ä, Groß/klein.
  - Die Proben sind parallel (gleiche Schichtung, gleiche Wortfrequenzbänder). Die Wörter
    werden in der Woche davor nicht geübt.
  - Auswertung zweifach: Wörter richtig **und** Graphemtreffer (in Anlehnung an die HSP).
    Die Graphemtreffer sind empfindlicher für Fortschritt bei schwachen Schreibern.
- **Mathe:**
  - 2-Minuten-Probe „richtige Aufgaben je Minute“ je Bereich (Einspluseins bis 20,
    Einmaleins), parallele Formen aus festen Aufgabenpools mit gleicher Typverteilung.
  - Die Antwortzeit wird mitgespeichert.
- **Darstellung:**
  - Verlaufslinie mit Ziellinie.
  - Einfache, transparente Entscheidungsregel, z. B. „4 Punkte hintereinander unter der
    Ziellinie → Förderung anpassen“ [F, n. o. v.].
  - Für das Kind nur ermutigend („Du schreibst jetzt 12 von 18 Wörtern richtig – vor einem
    Monat waren es 8“), ohne Klassenvergleich.
- **Grenzen:**
  - Eigene Proben sind **nicht normiert**. Sie taugen zur Verlaufsbeobachtung des einzelnen
    Kindes, nicht zum Vergleich mit Normen und nicht zur Benotung.
  - Für belastbare Diagnostik Levumi (kostenfrei, Rechtschreiben und Mathe) oder etablierte
    Tests parallel nutzen.

**B. Beherrschungskriterium je Teilkompetenz aus den Übungsdaten (Mastery)**

- Teilkompetenz = Phänomen bzw. Wortgruppe oder Mathe-Aufgabentyp/Reihe.
- „Beherrscht“ heißt z. B.: ≥ 3 richtige Abrufe **ohne Schriftbild** an **≥ 2 verschiedenen
  Tagen**, davon der letzte nach ≥ 7 Tagen. Für Mathe zusätzlich die Antwortzeit unter einer
  kalibrierbaren Schwelle.
- Transparent, erklärbar, als reine Funktion testbar.
- **[F, n. o. v.]** Mastery Learning wirkt im Mittel positiv (Kulik et al. 1990). Die Kriterien
  sind aber kontextabhängig.

**C. Fehlerklassifikation** (siehe D-008) als Brücke zwischen Probe und Übung. Eine Probe zeigt
z. B. „Auslautfehler“. Daraus folgt die Übung „Verlängern“ mit Kontrastwörtern.

**D. Bayesian Knowledge Tracing oder IRT nur gezielt**

- Sinnvoll, wenn je Teilkompetenz viele gleichartige Items vorliegen und die Zuordnung Item →
  Kompetenz sauber ist, etwa bei Einmaleinsreihen.
- Für Rechtschreibung mit wortspezifischem Gedächtnisanteil und wenigen Daten pro Kind ist
  ein einfaches Zählkriterium (B) robuster und für Lehrkräfte nachvollziehbar.
- **[H]** BKT-Parameter brauchen Kalibrierdaten, die ein Einzelentwickler nicht hat.

**E. Organisatorisch**

- Proben im Unterricht als gemeinsame Fünf-Minuten-Routine, etwa am Montag, damit Bedingungen
  vergleichbar sind.
- Ergebnisse bleiben lokal. Die Lehrkraft erhält sie per QR/Datei nur aggregiert: je Kind
  Probewert und Top-2-Fehlerarten. Das ist datensparsam (siehe Instanz B).

**F. Evaluation der Plattform selbst [H]**

- Vor der Ausweitung ein kleiner Probedurchlauf mit Vor- und Nachprobe an **ungeübten**
  Paralleltexten und -wörtern.
- Ideal ist ein Wechsel geübter und ungeübter Wortgruppen innerhalb der Klasse. Erst das
  trennt Übungs- von Transfereffekt.

## 10 Unterrichtsqualität nach Hilbert Meyer: Beitrag der Plattform und Aufgabe der Lehrkraft

| Merkmal (Meyer 2004)                | Beitrag der Plattform                                        | Muss die Lehrkraft leisten                                                   | Risiko                                                                                           |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 Klare Strukturierung              | Feste Abläufe (Merken → Schreiben → Kontrolle), Tagesportion | Einbettung in Wochenplan und Stundenphase                                    | gering                                                                                           |
| 2 Hoher Anteil echter Lernzeit      | Kurze Runden, wenig Ablenkung im Lernmodus                   | Klare Zeitfenster. Die Textbox überschreitet sie (D-005).                    | **Beschäftigung ohne Lernzuwachs** durch Abschreiben und Wiederholen auf Bestwert (D-001, D-004) |
| 3 Lernförderliches Klima            | Keine Minuspunkte, ruhige Prozentanzeige, Motivation aus     | Projektion steuern, Battle sparsam                                           | Tempo- und Fehlerzahlen öffentlich (D-012)                                                       |
| 4 Inhaltliche Klarheit              | Strategieangaben je Wortbox                                  | **Strategien einführen und korrigieren**                                     | Falscher s/ß-Regeltext, unpassende Strategien (D-006)                                            |
| 5 Sinnstiftendes Kommunizieren      | Reflexionsfragen                                             | Gespräch über Strategien und Fehler                                          | Fragen nur zum Ergebnis                                                                          |
| 6 Methodenvielfalt                  | Sechs Stufen, Text, Diktat, Spiel                            | Analoges Schreiben, Sprechen, Partnerarbeit                                  | Monokultur des Tippens auf dem iPad (Handschrift fehlt) [H]                                      |
| 7 Individuelles Fördern             | Freie Wahl, Schreiberleichterung, „Braucht Hilfe“ live       | **Diagnose und Förderplanung**, denn die Plattform liefert sie nicht (D-003) | Wahlfreiheit ersetzt keine Passung                                                               |
| 8 Intelligentes Üben                | Leitner, Fehlerübung mit neuen Aufgaben, Merkstufen          | Übungsauswahl begleiten                                                      | Übungsformen ohne Abrufanforderung zählen als Lernen                                             |
| 9 Transparente Leistungserwartungen | Laufzettel, Bestwert, „kein Prüfungsnachweis“ (ehrlich)      | Erwartung pro Kind formulieren                                               | „Sicher“ und „gemeistert“ versprechen mehr, als sie messen                                       |
| 10 Vorbereitete Umgebung            | Offline, eigenes Gerät, keine Konten                         | Geräte, Kopfhörer, Tastaturen                                                | Geteilte Geräte (B-010)                                                                          |

**Fazit [H]:** Die Plattform kann die Merkmale 1, 2, 8 und 10 gut stützen. Bei 4, 7 und 9
täuscht sie derzeit mehr Leistung vor, als sie erbringt. Ohne Lehrkraft, die Strategien
einführt, Wortwahl kontrolliert und Ergebnisse deutet, droht **„wenig wirksame
Beschäftigung“**: Kinder sind zufrieden aktiv, die Anzeigen steigen, der Zuwachs im freien
Schreiben bleibt ungewiss.

## 11 Bewertung der Dimensionen (0–5)

| Dimension                         | Wert    | Begründung                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Didaktische Qualität              | **2,0** | Starke Grundideen: Merkstufen als Fading-Weg, Textbox-Fading, Fehlerübung mit neuen Aufgaben, Tastaturlehrgang, Laufdiktat-Übernahme nach Ergebnis. Ernste Mängel in Inhalt (D-006), Aufgabenkonstruktion (D-002, D-009), Differenzierung (D-007) und Validität des Textbox-Hauptwerts (D-005). |
| Qualität des Feedbacks            | **2,0** | Wortspeicher (Buchstabenvergleich, Homophone) und Textbox (Wortvergleich) gut auf Aufgabenebene. Laufdiktat und Kopfrechnen nur richtig/falsch, keine Prozess- oder Strategieebene. Leistungsrückmeldung irreführend (D-004).                                                                   |
| Kompetenzdiagnostik               | **0,5** | Nicht vorhanden. Einzig die Lehrer-Live-Ansicht („Häufigste Fehler“, „Braucht Hilfe“) und teilweise brauchbare Rohdaten (falsche Mathe-Antworten) zählen positiv.                                                                                                                               |
| Adaptives Lernen                  | **1,5** | Regelbasierte Fälligkeit und eine durchdachte Tagesportion. Keine Kompetenzschätzung, Stufe und Schwierigkeit von Hand, widersprüchliche Wiederholungsregeln (A-004), reaktive statt curricularer Steuerung (D-011).                                                                            |
| Lernwirksamkeit (Plausibilität)   | **2,0** | Abrufübung und Spacing sind richtig gewählt. Im Kernmodul werden sie durch Abschreiben-als-Abruf, Längenhinweis, Selbstbewerten und Massieren (A-004) neutralisiert. Mathe ohne Flüssigkeit, Textbox ohne Transfer.                                                                             |
| Motivation ohne schädlichen Druck | **3,0** | Bewusst zurückhaltend: Motivation, Serie und Häuser aus; keine Minuspunkte; erreichbares Tagesziel; Rückstand verborgen. Abzug für Tempo-Punkte, Battle nach Tempo, öffentliche Fehlerzahlen und Bestwert-Rauschen.                                                                             |

## 12 Die fünf wichtigsten Befunde

1. **D-001 (P1)**: Abschreiben (Stufe 1) hebt Leitner-Box und Merkstufe. „Sicher“ nach
   zweimal Abschreiben. Mit A-004 und der Vorauswahl der leichtesten Stufe in der
   Tagesportion wird die verteilte Wiederholung im Kernmodul Rechtschreibung zur
   Abschreibübung.
2. **D-003 (P1)**: Keine Kompetenzdiagnostik, kein Check, keine Lernverlaufsmessung. Das
   erklärte Ziel „diagnosegestützt“ ist nicht umgesetzt. Gegenvorschlag in Abschnitt 9.
3. **D-002 (P2)**: Längenstriche und Lückenzahl verraten genau die Rechtschreibentscheidung
   (Doppelung, h, ie, ck/tz, ß/ss). Stufe 4 schneidet zu lange Eingaben ab.
4. **D-005 (P2)**: Der Textbox-Hauptwert misst Textbehalten stärker als Rechtschreibung. Die
   Schwerpunktstatistik schreibt vergessene Wörter dem Phänomen zu und empfiehlt falsche
   Übungen. Die Einheit dauert weit über 10 Minuten.
5. **D-006 (P2)**: Fachliche Inhaltsfehler: falscher s/ss/ß-Regeltext gegen 26 Wörter
   derselben Box, -ng als Auslautverhärtung, silbentrennendes h als Dehnungs-h (auch in
   Textbox-Zielwörtern), unpassende Strategien, Bedeutungshilfen mit Zielwort.

Direkt dahinter: D-004 (Scheinfortschritt durch Bestwert-Rauschen und Sofortkorrektur), D-008
(Rückmeldung ohne Fehlerort und Strategie), D-009 (Kopfrechnen ohne Zehnerübergang-Fokus und
ohne Flüssigkeit).

## 13 Echte Stärken (geprüft, nicht nur behauptet)

- **Die Merkstufenidee** von Abschreiben über Lücke, Verdecken und Merkblock bis Hören ist ein
  schlüssiger Fading-Weg. Stufe 4 entspricht im Kern dem gut belegten Cover-Copy-Compare
  (Joseph et al. 2012, n. o. v.). Stufen 5 und 6 sind echte Abrufformen. Die Mängel liegen in
  der Bewertung, nicht in der Idee.
- **Homophone in Stufe 6:** Bedeutungshilfe, freundliche Rückmeldung „Das klingt genauso.
  Gemeint war …“, Groß-/Kleinfälle bewusst ausgenommen. Das ist didaktisch durchdacht (bis auf
  D-006 Punkt 10).
- **Buchstabenvergleich** im Wortspeicher und **Wort-für-Wort-Kontrolle** in der Textbox mit
  Fehlerarten (falsch, Groß/Klein, fehlt, zusätzlich, fast richtig): informative Rückmeldung
  auf Aufgabenebene, mit Farbe und Text.
- **LernBox-Regeln** „kein Aufstieg vor Fälligkeit“, „Fehlerschluss ohne Aufstieg im
  8-h-Fenster“, „ein Aufstieg je Fälligkeit“ (`learning-box.ts:352-433`). Das steht der
  Spacing-Forschung näher als viele Karteikarten-Apps.
- **Mathe-Fehlerübung erzeugt neue Aufgaben derselben Familie** statt der identischen Rechnung
  (`buildMathReviewRound`). Platzhalteraufgaben (Lücken links, rechts, Ergebnis) fördern das
  Operationsverständnis.
- **Laufdiktat-Übernahme nach Ergebnis** (Entscheidung 49): sicher gewusst → Box 2, Übungsbedarf
  → sofort fällig, Abschreibvorlage → Box 1. Eine ehrliche, kleine Diagnose aus dem
  Unterricht. Live zeigt die Lehreransicht „Häufigste Fehler“ und „Braucht Hilfe“ als echte
  formative Information für die Lehrkraft.
- **Tagesportion**: deterministisch, gedeckelt, Rückstand nicht als Zahl, freies Üben erhöht
  das Ziel nicht, „Tagesziel geschafft – alles Weitere ist ein Extra“. Das schützt vor
  Überforderung und Endlosschleifen [H, plausibel].
- **Motivationsschicht zurückhaltend**: Serie, Häuser und Duell standardmäßig aus. Keine
  Minuspunkte. Vault 23 schließt Vernachlässigungsmechanik ausdrücklich aus.
- **Textbox-Texte** kindgerecht, lebensweltlich, freundlich, mit altersgerechten Satzlängen
  (D13) und einem Zielwortanteil im eigenen Korridor.
- **Tastenwelt-Lehrgang** systematisch (Finger isoliert → kombiniert, Reihe für Reihe,
  Genauigkeit vor Tempo, Tempo nur informativ).
- **Ehrliche Dokumentation der Grenzen**: „Wirksamkeit nicht belegt“, „Prozentwerte nur
  ungefähr vergleichbar“, „Laufzettel kein Prüfungsnachweis“, Intervalle „vorläufig“. Selten so
  offen.
- **Datensparsame Grundhaltung**: Lernsignale bleiben lokal. Eine spätere Diagnostik nach
  Abschnitt 9 ist damit vereinbar.

## 14 Quellen

Online geprüft am 20.10.2026:

- Latimier, A., Peyre, H. & Ramus, F. (2021). A meta-analytic review of the benefit of spacing
  out retrieval practice episodes on retention. _Educational Psychology Review, 33_, 959–987.
  doi:10.1007/s10648-020-09572-8. Kennwerte laut Sekundärzusammenfassung, Originalartikel nicht
  geöffnet.
- Jones, A. C. et al. Beyond the rainbow: Retrieval practice leads to better spelling than does
  rainbow writing. _Educational Psychology Review_, doi:10.1007/s10648-015-9330-6. Erst- und
  Zweitklässler; Retrieval > Abschreiben. Autorenliste und Jahr (2016) aus Fachkenntnis.
- Bayerischer Grundwortschatz LehrplanPLUS GS: 623 Wörter bis Jahrgangsstufe 4. Laut Antwort
  der Staatsregierung (Bayerischer Landtag, Drucksachen WP19). Die PDFs
  „5_Grundwortschatz 1_2“ und „6_Grundwortschatz 3_4“ waren nicht abrufbar.
- Levumi (TU Dortmund, EU Flensburg, CAU Kiel): kostenfreie Lernverlaufsdiagnostik für Lesen,
  Rechtschreiben und Mathematik. Quellen: Friedrich-Verlag; Studienseminar RLP; Mau 2024
  (Dissertation, Flensburg).
- Rat für deutsche Rechtschreibung (2024): Streichung von „Jogurt“ und „Spagetti“.

Aus Fachkenntnis, **nicht online verifiziert**:

- Adesope, Trevisan & Sundararajan (2017), Rethinking the use of tests, _Review of Educational
  Research_.
- Brunmair & Richter (2019), Similarity matters: A meta-analysis of interleaved learning,
  _Psychological Bulletin_.
- Cepeda et al. (2006), Distributed practice in verbal recall tasks, _Psychological Bulletin_;
  Cepeda et al. (2008), Spacing effects in learning, _Psychological Science_.
- Deci, Koestner & Ryan (1999), A meta-analytic review of experiments examining the effects of
  extrinsic rewards on intrinsic motivation, _Psychological Bulletin_.
- Deno (1985), Curriculum-based measurement, _Exceptional Children_.
- Destan & Roebers (2015), What are the metacognitive costs of young children's
  overconfidence?, _Metacognition and Learning_.
- Dunlosky & Rawson (2012), Overconfidence produces underachievement, _Learning and
  Instruction_.
- Gaidoschik (2010), _Wie Kinder rechnen lernen – oder auch nicht_. Häsel-Weide et al. (2013),
  _Ablösung vom zählenden Rechnen_.
- Graham & Santangelo (2014), Does spelling instruction make students better spellers, readers,
  and writers?, _Reading and Writing_.
- Hanus & Fox (2015), Assessing the effects of gamification in the classroom, _Computers &
  Education_.
- Hattie & Timperley (2007), The power of feedback, _Review of Educational Research_.
- Joseph et al. (2012), A meta-analytic review of the cover-copy-compare and variations of this
  self-management procedure, _Psychology in the Schools_.
- Jung, McMaster, Kunkel, Shin & Stecker (2018), Effects of data-based individualization,
  _Learning Disabilities Research & Practice_.
- Kluger & DeNisi (1996), The effects of feedback interventions on performance, _Psychological
  Bulletin_.
- Kulik, Kulik & Bangert-Drowns (1990), Effectiveness of mastery learning programs, _Review of
  Educational Research_.
- May, P. _Hamburger Schreib-Probe (HSP)_.
- Meyer, H. (2004), _Was ist guter Unterricht?_, Cornelsen Scriptor.
- Roediger & Karpicke (2006), Test-enhanced learning, _Psychological Science_.
- Ryan & Deci (2000/2017), Selbstbestimmungstheorie.
- Sailer & Homner (2020), The gamification of learning: a meta-analysis, _Educational
  Psychology Review_.
- Shute (2008), Focus on formative feedback, _Review of Educational Research_.
- Souvignier, Förster & Schulte (2014), Wirksamkeit formativen Assessments – Lernverlaufsdiagnostik
  (quop).
- Stecker, Fuchs & Fuchs (2005), Using curriculum-based measurement to improve student
  achievement, _Psychology in the Schools_.
- Steinbrink & Klatte (2008), Phonological working memory in German children with poor reading
  and spelling abilities, _Dyslexia_.
- Sweller (1988), Cognitive load during problem solving, _Cognitive Science_.
- Wisniewski, Zierer & Hattie (2020), The power of feedback revisited, _Frontiers in
  Psychology_.
- Zuber, Pixner, Moeller & Nuerk (2009), On the language specificity of basic number
  processing, _Journal of Experimental Child Psychology_.

## 15 Reproduktionsartefakte (Scratchpad, nicht im Repository)

Ordner: `/tmp/claude-0/-home-user-Lernplattform/c2fe15db-371c-56e7-8bd8-eafd11c1a5af/scratchpad/repro-d/`

- `d-paedagogik.test.ts`: D1–D11, Ausgabe in `d-paedagogik.out.txt`
- `d-cover-answer.test.tsx`: D12, Ausgabe in `d-cover-answer.out.txt`
- `d-textbox-content.test.ts`: D13, Ausgabe in `d-textbox-content.out.txt`
- `browser/d-wortspeicher.mjs`: D14, Bildschirmfoto `browser/startblatt-s-ss-sz.png`

Ausführen:

```
cd /home/user/Lernplattform && AUDIT_DIR=<repro-d> npx vitest run --config <scratchpad>/repro/vitest.audit.config.mts
```
