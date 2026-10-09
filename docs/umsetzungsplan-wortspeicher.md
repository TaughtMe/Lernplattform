# Umsetzungsplan: Wortspeicher – Überarbeitung und Verbindung zur Textbox

Stand: 09.10.2026 · Ausgangsstand `claude/lernraum-ui-v2` @ `c013990` (Version 0.8.0, Textbox frei)

> **Fortschritt:** Paket A bis E umgesetzt (Stand 09.10.2026, Branch `claude/wortspeicher-umbau`).
> A: Fachlogik, Dexie-Version 6, Repositories, Backup. B: neue Oberfläche mit Wortboxen, Startblatt,
> Runden, Prozentwert und Bestwert. C: Stufe 6 mit vorbereiteter Stimme (`src/speech/`). D: Verlauf,
> Fortschrittsabschnitt, Laufzettel. E: Laufdiktat-Übernahme, Textbox-Brücke, Dokumentation. Offen sind
> der Probedurchlauf der Lehrkraft (Teil 8), die fachliche Prüfung der Wortbox „s, ss und ß“ und der
> gleich klingenden Wörter sowie die Kalibrierung (Abschnitt 8). `claude/lernraum-ui-v2` wurde nicht
> verändert.

> **Festgehaltene Abweichungen:**
>
> - `useHelp` heißt `applyHelp`, weil Funktionen mit `use…` von der Hook-Lint-Regel als React-Hook
>   behandelt werden.
> - `WordRoundState` trägt zusätzlich `blockAttempts`, `firstKinds`, `failedWords` und
>   `settledWords` (Zustand des laufenden Blocks). `submitWordAnswer` liefert je Wort einen
>   `AttemptRecord`; schon richtig abgeschlossene Wörter eines Stufe-5-Blocks werden bei
>   Wiederholungen nicht erneut im Lernstand verbucht. Eine leere Eingabe wirft.
> - `isNewBest` ist nur wahr, wenn es frühere Runden dieser Wortbox und Stufe gibt (wie in der
>   Textbox: die erste Runde zeigt „erster Bestwert“ statt „Neuer Bestwert!“).
> - `addWords` meldet in `skipped` nur ungültige Wörter und solche über der Grenze; Doppelte werden
>   still zusammengelegt. `importFromLesson` liefert in `added` alle übernommenen Wörter (auch
>   solche, die schon in der Wortbox standen) und `full`, wenn gültige Wörter nicht mehr passten.
> - Das Sitzungsfeld `wordStoreTransfer` ist Pflichtfeld des geparsten `LiveSession`; vier
>   bestehende Testdaten-Objekte wurden um `wordStoreTransfer: "none"` ergänzt.
> - Die Liste der gleich klingenden Wörter enthält über die Beispiele des Plans hinaus weitere
>   Gruppen (u. a. das/dass, viel/fiel, wahr/war); die Lehrkraft prüft sie.
> - **Bedeutungshilfe in Stufe 6 (bitte prüfen):** Plan 2.4 widerspricht sich leicht: Sichtbar sein sollen
>   nur Lautsprecher, Eingabefeld und Knöpfe („kein Schriftbild“), das Beispiel der Hilfe lautet aber
>   „Rad – zum Fahren“. Umgesetzt ist nur die Bedeutung („Bedeutung: zum Fahren“), ohne das Wort, damit
>   die Schreibweise nicht verraten wird. Die Rückmeldung nach einem Fehler nennt das Wort wie im Plan
>   („Gemeint war ‚Rad‘ (zum Fahren).“).
> - „Nochmal üben“ und jede neue Runde ziehen die Wörter zufällig (`sampleRoundWords` mit
>   injizierbarem Zufallsgenerator); `selectLearningWordRound` bleibt als gleichmäßige Verteilung ohne
>   Generator erhalten.
> - „Aus dem Unterricht“ erlaubt nur Wörter und die Wortbox zu löschen (Plan 2.1), kein Hinzufügen oder
>   Ändern. In Stufe 1 gibt es keinen Knopf „Wort zeigen“, weil das Wort ohnehin sichtbar ist.
> - Der Link „Wörter mit den meisten Fehlern“ der Fortschrittsseite nutzt `?woerter=…&quelle=fehler`;
>   das Blatt heißt dann „Wörter mit den meisten Fehlern“ (Speichertitel „Meine Fehlerwörter“, Runden
>   unter der Id `fehler`). Neue Hilfen in `practice-bridge.ts`: `parseSourceParam`, `buildHistoryLink`,
>   `parseHistoryParams`.
> - Die Lehrerraum-Einstellung „Wörter in den Wortspeicher“ wird wie `vocabularyTransfer` aus dem
>   gespeicherten Raum zurückgesetzt; eine ältere Vorlage ohne Feld ergibt „Aus“.
> - `src/speech/` enthält `voices.ts` (`normalizeSpeechLang`, `rankVoice`, `pickVoice`) und `speaker.ts`
>   (`preloadVoices`, `speak`, `isSpeechAvailable`, `prepareSpeech`, `hasVoiceFor`, `stopSpeaking`,
>   `resetSpeechState` für Tests). `spokenMath` und die Umstellung der übrigen Stellen bleiben wie im Plan
>   außen vor; das Vorladen beim App-Start geschieht im Hook `useSpeech` beim Öffnen des Wortspeichers,
>   nicht in `service-worker-registration`.
> - Ein Test (`homophones.test.ts`) hält `docs/inhalte/wortspeicher.md` und die Liste der gleich klingenden
>   Wörter synchron.
> - Die Browser-Tests liefen lokal nur in Chromium (Desktop, Pixel 7, 320 px) mit der vorinstallierten
>   Chromium-Version (lokale, nicht eingecheckte Playwright-Konfiguration); `npm run test:e2e:live` lief für
>   den neuen Test und die Vokabelübernahme in Desktop-Chromium. Die vollständige Cross-Browser-Suite
>   bleibt in GitHub verpflichtend.

Dieser Plan ist die Arbeitsgrundlage für einen KI-Agenten. Grundlage sind das Konzept
„Lernraum – Konzept: Textbox und Rechtschreibtraining“ vom 08.10.2026 (§2.2, §6.3, §8.4, §10),
die Designreferenzen 4d–4f (`docs/design/referenz/`) und die Rückmeldungen der
projektverantwortlichen Lehrkraft vom 09.10.2026. Die fachlichen Entscheidungen in Abschnitt 2
sind **verbindlich**. Werte mit dem Vermerk „kalibrierbar“ sind Startwerte für den
Probedurchlauf und stehen jeweils als benannte Konstante an einer Stelle. Wo der Code etwas
anderes nahelegt, gilt dieser Plan. Bei echten Widersprüchen erst nachfragen und nicht selbst
umentscheiden. Jede Abweichung wird im Kopf dieses Plans unter „Festgehaltene Abweichungen“
notiert.

Vorbild für Aufbau, Code-Stil und Tests ist die Textbox (`docs/umsetzungsplan-textbox.md`,
`src/domain/textbox-*.ts`, `app/components/textbox-app.tsx`, `app/views/textbox/`). Wo dieser
Plan „wie in der Textbox“ sagt, ist genau dieses Muster gemeint.

## 0. Arbeitsweise

- **Branch:** `claude/wortspeicher-umbau`, abgezweigt von `claude/lernraum-ui-v2`.
  `claude/lernraum-ui-v2` ist in Cloudflare als Produktionsstand aktiv, und Schüler nutzen den
  Wortspeicher bereits (Bereich `wortspeicher` steht auf `frei`). **Niemals direkt auf
  `claude/lernraum-ui-v2` pushen.** Die Lehrkraft übernimmt nach dem Probedurchlauf selbst.
- **Regeln lesen:** `AGENTS.md`, `docs/engineering-quality.md`, `docs/architecture.md`,
  `docs/umsetzungsplan-lernraum-ui-v2.md` (Abschnitt „Regeln für die Anbindung“),
  `docs/umsetzungsplan-textbox.md` (Muster), `docs/umsetzungsplan-vorlesen.md` (Abschnitt 3.1
  und 3.2, Sprachausgabe).
- **Keine neuen Abhängigkeiten.** Diagramme kommen aus `app/ui/charts.tsx`. Zod gilt an allen
  Grenzen, auch für lokal gespeicherte Daten und Adressparameter.
- **Ansichten bleiben rein:** Kein Speicherzugriff und keine Sprachausgabe in `app/views/`.
  Logik gehört in reine Funktionen unter `src/domain/` (bzw. `src/speech/`) und in Hooks unter
  `app/components/`. Dexie wird nur über typisierte Repositories in `src/storage/` angesprochen.
- **Keine Supabase-Migration und kein Server.** Der Wortspeicher läuft vollständig lokal. Keine
  Wörter, Eingaben oder Ergebnisse gehen an einen Server oder an die Lehrkraft. Auch die
  Übernahme aus dem Laufdiktat (2.8) entsteht nur auf dem Schülergerät.
- **Bestehende Tests nicht löschen, überspringen oder abschwächen.** Tests, die den alten
  Ablauf prüfen (`app/components/learning-word-bridge.test.tsx`,
  `e2e/practice-illustrations.spec.ts`, `e2e/platform-quality.spec.ts`,
  `src/domain/learning-word*.test.ts`), werden auf den neuen Ablauf umgeschrieben.
- **Prüfen vor jedem Push:** `npm run check` (Format, Lint, Typen, Coverage, DB-Tests, Build,
  Render). Bei UI-Änderungen zusätzlich `npm run test:e2e:chromium`. Die Coverage-Grenzen aus
  `vitest.config.ts` (90 % für `src/domain` und `src/storage`) dürfen nicht sinken. Der neue
  Ordner `src/speech/` wird in dieselbe Coverage-Grenze aufgenommen.
- **Sprache:** Oberflächentexte, Kommentare und Commit-Nachrichten auf Deutsch, im Stil des
  bestehenden Codes. Commits klein und pro Arbeitsschritt.

## 1. Ausgangslage (Stand `c013990`)

| Bereich        | Heute                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Oberfläche     | Eine Datei `app/components/learning-word-app.tsx` (ca. 800 Zeilen) mischt Zustand, Speicherzugriff und Darstellung. Route `/frei/german/lernwoerter`.                                |
| Merkstufen     | 5 Stufen (`src/domain/learning-word.ts`). Das Kind wählt die Stufe für die ganze Runde von Hand („Stufe ausprobieren“).                                                              |
| Wortlisten     | 7 feste Sammlungen mit je ≥ 100 Wörtern (`src/domain/german-learning-content.ts`). „Eigene Wörter“ ist nur ein Textfeld, das **nicht** gespeichert wird.                             |
| Lernstand      | Je Wort Merkstufe, Leitner-Box (1–5) und Fälligkeit in `learningWordProgress` (Dexie), dazu ein `LearningEventV1` je Versuch (`createLearningWordProgressRepository`).               |
| Ergebnis       | Der Abschluss zeigt nur Zählwerte („bereit für die nächste Stufe“, „mit Hilfe“). Es gibt keinen Prozentwert, keinen Bestwert, keinen Verlauf, keine Diagramme und keinen Laufzettel. |
| Stufe 5        | Ein Merkblock gilt nur als ganz richtig oder ganz falsch (`evaluateLearningWords`).                                                                                                  |
| Rückmeldung    | Nach einem Fehler steht nur die richtige Lösung da. Kein Buchstabenvergleich.                                                                                                        |
| Hören          | Keine Sprachausgabe im Wortspeicher. Es gibt noch keinen gemeinsamen Sprachbaustein (`src/speech/` fehlt, der Vorlese-Plan ist nicht umgesetzt).                                     |
| Laufdiktat     | Der Abschluss im Live-Raum verspricht „… liegen jetzt in deinem Wortspeicher“, aber `savedWords` ist immer leer (`app/raum/spiel/live-game.tsx`). Für Texte gibt es keine Übernahme. |
| Textbox-Brücke | Vorhanden (Textbox-Plan 2.22/2.23, `src/domain/practice-bridge.ts`): „Mit einem Text weiterüben“ und `?woerter=` füllt das ungespeicherte Textfeld vor.                              |

## 2. Fachliche Entscheidungen (verbindlich)

### 2.1 Begriffe

- **Wortbox:** eine benannte Liste von Wörtern. Es gibt drei Arten:
  - **Feste Wortboxen:** die vorbereiteten Sammlungen aus `german-learning-content.ts`. Sie sind
    vorbefüllt und nicht bearbeitbar.
  - **Eigene Wortboxen:** vom Kind angelegt, benannt und gefüllt. Dauerhaft lokal gespeichert,
    jederzeit bearbeitbar und löschbar.
  - **Wortbox „Aus dem Unterricht“:** wird automatisch angelegt, sobald das erste Wort aus einem
    Laufdiktat übernommen wird (2.8). Das Kind kann Wörter daraus löschen oder die ganze Box
    löschen. Bei der nächsten Übernahme entsteht sie neu.
- **Merkstufe:** die Übungsform (1–6, siehe 2.3). Sie wird für eine Runde gewählt.
- **Leitner-Box:** der Wiederholungsabstand je Wort (1–5). Sie bleibt fachlich unverändert und
  steuert „Trainingswörter heute“ und „x / y sicher“ (sicher = mindestens Box 3).
- **Runde:** eine Übung mit einer Wortbox auf einer Merkstufe mit einer gewählten Anzahl Wörter.
  Eine Runde ergibt einen Prozentwert (2.5).

In der Oberfläche heißt es durchgehend „Wortbox“ (statt „Thema“ oder „Sammlung“). Im Code dürfen
`collection`-Namen für die festen Wortboxen bleiben. Der Adressparameter `?sammlung=` bleibt
gültig, weil Textbox und Fortschrittsseite ihn benutzen.

### 2.2 Wortboxen

- Feste und eigene Wortboxen erscheinen als Kacheln wie im Design 4d/4f: Titel, zwei bis drei
  Beispielwörter, Fortschrittsbalken „x / y sicher“, Knopf ☰ für die Wortliste. Dazu kommt die
  Zeile „Stufe n · Bestwert x %“ für die höchste Merkstufe, in der es schon eine abgeschlossene
  Runde gibt. Ohne Runde steht „Noch nicht geübt“.
- Reihenfolge: zuerst „Aus dem Unterricht“ (wenn vorhanden), dann eigene Wortboxen (zuletzt
  geändert zuerst), dann feste Wortboxen in der Reihenfolge des Codes. Als letzte Kachel:
  „Neue Wortbox“.
- **Antippen einer Kachel** öffnet das Startblatt (2.3) und nicht sofort die Übung.
- **☰ bei einer festen Wortbox:** Wortliste lesen und „Als eigene Wortbox kopieren“ (legt eine
  eigene Wortbox mit Titel „<Titel> (Kopie)“ und allen Wörtern an).
- **☰ bei einer eigenen Wortbox:** Titel ändern, Wort hinzufügen (Eingabefeld, Enter fügt hinzu;
  eingefügte Listen mit Zeilenumbruch, Komma oder Semikolon werden wie in `parseLearningWords`
  getrennt), Wort ändern, Wort löschen, Wortbox löschen. Löschen fragt einmal nach. Der Lernstand
  eines Wortes (`learningWordProgress`) bleibt beim Löschen aus einer Wortbox erhalten, weil
  dasselbe Wort in anderen Wortboxen stehen kann.
- **Grenzen (Zod):** Titel 1–60 Zeichen, Wort 1–60 Zeichen ohne Steuerzeichen und ohne `<` `>`,
  höchstens 500 Wörter je Wortbox, höchstens 50 eigene Wortboxen. Doppelte Wörter in einer
  Wortbox werden ohne Rückfrage zusammengelegt (Vergleich nach NFC und `toLocaleLowerCase("de-DE")`,
  wie `learningWordId`).
- **Neue feste Wortbox „s, ss und ß“** (Design 4d, Textbox-Schwerpunkt `s-ss-sz`): mindestens
  100 eindeutige Wörter, Strategie „Ableiten“ bzw. „Merken“ nach Fachlage, gleiche Regeln wie die
  übrigen Wortbanken. Die Lehrkraft prüft die Liste fachlich vor der Freigabe.
  `PHENOMENON_TO_COLLECTION` in `src/domain/textbox-text.ts` erhält `"s-ss-sz": "s-ss-sz"`.

### 2.3 Merkstufen und Startblatt

Die Merkstufe wird **weiterhin von Hand gewählt**. Neu ist die Stufe 6.

| Stufe | Titel               | Darstellung                                                         | Lernhandlung                              |
| ----- | ------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| 1     | Abschreiben         | vollständiges Wort sichtbar                                         | fehlerfrei abschreiben                    |
| 2     | Wenige Lücken       | wenige Buchstaben fehlen                                            | Lücken ergänzen                           |
| 3     | Viele Lücken        | viele Buchstaben fehlen                                             | Wort weitgehend rekonstruieren            |
| 4     | Ansehen & verdecken | Wort ansehen, dann verdecken, Striche zeigen die Länge              | Wort aus dem Gedächtnis auf den Strichen  |
| 5     | Wörter merken       | mehrere Wörter ansehen (Blockgröße 1, 2, 3 oder 5)                  | ohne feste Reihenfolge aus dem Gedächtnis |
| 6     | Hören und schreiben | **nur** das gesprochene Wort, kein Schriftbild, keine Längenstriche | gehörtes Wort schreiben                   |

- Das **Startblatt** (`Sheet` aus `app/ui/sheet.tsx`) zeigt: Titel der Wortbox, Strategie, die
  sechs Merkstufen als Auswahlkarten mit **Bestwert je Stufe** („Bestwert 80 %“ bzw. „–“),
  „Wörter in dieser Runde“ (5, 10 Standard, 20, alle), bei Stufe 5 die Blockgröße, den Knopf
  „Starten“ und den Link „Verlauf ansehen“ (2.7).
- Vorauswahl der Stufe: die Stufe der letzten Runde dieser Wortbox, sonst Stufe 1.
- „Gemischt trainieren“ (fällige Wörter aus allen Wortboxen) öffnet dasselbe Startblatt mit der
  Wortbox „Trainingswörter heute“. Vorausgewählt ist die leichteste fällige Merkstufe (wie heute).
- Stufe 6 ist nur wählbar, wenn das Gerät eine deutsche Stimme hat (2.4). Sonst ist die Karte
  deaktiviert und trägt den Hinweis „Auf diesem Gerät gibt es keine deutsche Stimme.“
- Die gespeicherte Merkstufe je Wort wird weiter nach den bisherigen Regeln fortgeschrieben
  (`updateLearningWordProgress`, jetzt bis Stufe 6). Sie dient nur noch als Empfehlung: Im
  Startblatt steht bei einer Stufe der Hinweis „empfohlen“, wenn die meisten Wörter der Wortbox mit
  Lernstand auf dieser Stufe stehen.

### 2.4 Stufe 6: Hören und schreiben

- Es wird **nur das einzelne Wort** gesprochen, kein Satz und kein Lückensatz. Das Design 4e
  (Lückensatz „Der ___ bellt laut.“) wird für diese Stufe ausdrücklich **nicht** umgesetzt.
- Sichtbar sind nur: großer Lautsprecher-Knopf „Anhören“, das Eingabefeld, „Prüfen“ und
  „Wort zeigen“.
- „Anhören“ darf beliebig oft gedrückt werden und zählt **nicht** als Hilfe (wie Vorlesen in
  Entscheidung 49). „Wort zeigen“ zeigt das Schriftbild und zählt als Hilfe.
- **Die Stimme muss vor der ersten Ausgabe vollständig bereit sein.** Ablauf beim Tippen auf
  „Starten“ (dieser Klick ist die Nutzergeste, die iOS für Ton verlangt):
  1. Stimmenliste laden und warten, bis eine deutsche Stimme gewählt werden kann (höchstens
     3 s, kalibrierbar). Während dieser Zeit zeigt der Knopf „Stimme wird vorbereitet …“.
  2. Aufwärmen: eine stumme Äußerung (`volume = 0`, ein Leerzeichen) mit der gewählten Stimme
     sprechen und auf ihr Ende warten (höchstens 1,5 s). Damit sind Sprachdienst und Stimme
     geladen, bevor das erste Wort kommt, und der Anfang des ersten Wortes wird nicht
     abgeschnitten.
  3. Erst dann beginnt die Runde, und das erste Wort wird gesprochen.
  4. Findet sich in Schritt 1 keine deutsche Stimme, startet die Runde nicht. Es erscheint ein
     ruhiger Hinweis mit dem Vorschlag, eine andere Stufe zu wählen.
- Jedes Wort wird beim Erscheinen automatisch einmal gesprochen. Vor jedem Sprechen wird eine
  laufende Ausgabe beendet (`cancel()`), danach wird nach einer kurzen Pause (50 ms) gesprochen,
  weil manche Browser ein `speak()` direkt nach `cancel()` verwerfen.
- Immer `utterance.voice` **und** `utterance.lang = "de-DE"` setzen. Tempo 0,9 (kalibrierbar).
- Groß- und Kleinschreibung zählt wie in allen Stufen.
- **Gleich klingende Wörter** (z. B. Rad/Rat, Meer/mehr, Weg/weg, Feld/fällt, Lied/Lid, Stadt/statt)
  sind beim Hören nicht unterscheidbar. Für sie gibt es eine Bedeutungshilfe, die in Stufe 6
  **immer** unter dem Lautsprecher steht, z. B. „Rad – zum Fahren“. Sie zählt nicht als Hilfe.
  Schreibt das Kind das gleich klingende andere Wort, zählt das als Fehler, die Rückmeldung sagt
  aber freundlich: „Das klingt genauso. Gemeint war ‚Rad‘ (zum Fahren).“ Die Liste deckt
  mindestens alle Wörter der festen Wortboxen ab, die ein geläufiges gleich klingendes Wort haben.
  Die Lehrkraft prüft sie fachlich.

### 2.5 Runde, Bewertung und Rückmeldung

- **Prozentwert einer Runde** = Wörter, die **auf Anhieb** richtig waren ÷ Wörter der Runde × 100,
  gerundet auf ganze Prozent.
- **Auf Anhieb richtig** heißt: Die erste abgeschickte Antwort zu diesem Wort war exakt richtig,
  und für dieses Wort wurde keine Hilfe („Wort zeigen“) benutzt. Eine spätere Selbstkorrektur ist
  für den Lernstand weiterhin „richtig mit Selbstkorrektur“, zählt im Prozentwert aber nicht.
- **Stufe 5** wird künftig **je Wort** bewertet: Ein Wort des Merkblocks ist auf Anhieb richtig,
  wenn es in der ersten Antwort zum Block exakt vorkommt (Reihenfolge egal, jedes eingegebene
  Wort zählt höchstens einmal). Zusätzliche Wörter werden angezeigt, aber nicht abgezogen. Der
  Block wird wie heute so lange wiederholt, bis alle Wörter stimmen. Auch der Lernstand je Wort
  (`recordAttempt`) wird dann je Wort und nicht mehr für den ganzen Block geschrieben.
- Die Zeit fließt nicht in die Bewertung ein (Regel aus `docs/engineering-quality.md`).
- **Rückmeldung nach einem Fehler:**
  - Fehlerart wie in der Textbox (`compareGaps` aus `src/domain/text-compare.ts`): „falsch“,
    „nur Groß-/Kleinschreibung“, mit Hinweis „fast richtig“ bei einem Buchstaben Abstand.
  - **Buchstabenvergleich** (Lücke aus `docs/inhalte/wortspeicher.md`): Eingabe und richtiges Wort
    untereinander, abweichende, fehlende und zusätzliche Buchstaben markiert, immer mit Farbe
    **und** Unterstreichung bzw. Symbol und mit Text für Screenreader („3. Buchstabe: m statt n“).
  - Danach „Noch einmal versuchen“ wie heute. In Stufe 4 und 5 wird vorher das Wort wieder
    gezeigt (Merkphase), in Stufe 6 wird es wieder gesprochen.
- **Abschluss einer Runde:** Prozentwert groß, ruhig und ohne Abwertung; „Neuer Bestwert!“, wenn
  der Wert für diese Wortbox und Stufe höher ist als alle früheren; die drei bisherigen Zählwerte
  bleiben; dazu die Liste der Wörter, die nicht auf Anhieb richtig waren. Aktionen: „Nochmal
  üben“ (gleiche Wortbox, gleiche Stufe, neue Wortauswahl), „Andere Stufe wählen“ (Startblatt),
  „Verlauf ansehen“, Textvorschlag (2.9) und „Andere Übung wählen“.
- **Abgebrochene Runden** werden nicht als Runde gespeichert. Der Lernstand der schon geübten
  Wörter bleibt wie heute erhalten.

### 2.6 Lernstand je Wort

- `learningWordProgress`, Leitner-Abstände (1, 3, 7, 14, 30 Tage) und die Regeln für Aufstieg,
  Verbleib und Rückstufung bleiben unverändert. Einzige Änderung: Die Merkstufe reicht jetzt bis 6.
- Jeder Versuch erzeugt wie heute ein `LearningEventV1` mit `source: "learning-word"`. Ein
  Rundenabschluss erzeugt **kein** zusätzliches Ereignis (sonst würden Serie und Tagesaktivität
  doppelt zählen).

### 2.7 Bestwert, Verlauf, Statistik und Laufzettel

- **Bestwert** wie in der Textbox: Es zählt immer das beste Ergebnis, nie das letzte. Bestwert,
  letzter Wert und Anzahl der Runden werden je **Wortbox und Merkstufe** aus den gespeicherten
  Runden **abgeleitet** und nicht separat gespeichert.
- **Verlauf einer Wortbox** (eigene Ansicht, erreichbar aus Startblatt und Abschluss):
  - Umschalter für die Merkstufe (`Segmented`, nur Stufen mit Runden sind aktiv).
  - Bestwert, letztes Ergebnis, Anzahl der Runden für die gewählte Stufe.
  - Umschalter Linie/Säule aus `app/ui/charts.tsx` (Y: Prozent, X: Runde bzw. Datum).
  - Liste aller Runden mit Datum, Stufe, Prozentwert und Anzahl Wörter. Jede Runde lässt sich
    aufklappen und zeigt die Wörter mit Ergebnis.
  - Einklappbarer Kasten „Schau dir dein Diagramm an“ mit den Reflexionsfragen (wie Textbox, ab
    2 Runden, standardmäßig zu).
  - Aktion „Diese Stufe üben“.
- **Fortschrittsseite** (`/lernen/fortschritt`, Konzept §8.4): neuer Abschnitt „Wortspeicher“ vor
  dem Textbox-Abschnitt:
  - Kennzahlen: trainierte Wörter (Wörter mit Lernstand), sichere Wörter (Box ≥ 3), Wiederholungen
    (Summe der Versuche), abgeschlossene Runden.
  - Verteilung der Wörter auf die Merkstufen 1–6 (Balken mit Zahl, keine Prozentachse).
  - Liniendiagramm aller Rundenergebnisse über die Zeit.
  - „Wörter mit den meisten Fehlern“ (höchstens 5) mit Link zum Üben.
  - Der Abschnitt erscheint nur bei sichtbarem Bereich `wortspeicher`.
- **Laufzettel (Ausgabe):** druckbare Seite wie der Textbox-Laufzettel:
  - Freiwilliges Feld für Name oder Kennung, wird **nicht** gespeichert.
  - Tabelle: Wortbox, Bestwert je Stufe 1–6 (oder „–“), Anzahl Runden, zuletzt geübt.
  - Darunter die Kennzahlen aus der Fortschrittsseite.
  - „Drucken oder als PDF sichern“ (`window.print()`), Druck-CSS.
  - Hinweis: „Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein
    Prüfungsnachweis.“

### 2.8 Übernahme aus dem Laufdiktat (Lehrkraft entscheidet)

Wie bei den Vokabeln (Entscheidung 49, `vocabularyTransfer`) entscheidet die Lehrkraft beim
Erstellen eines **Text**-Laufdiktats, ob Wörter in den Wortspeicher der Kinder übernommen werden.

- **Einstellung im Lehrerraum** (nur Inhaltsart Text): „Wörter in den Wortspeicher“ mit den
  Werten **„Aus“**, **„Falsch geschriebene Wörter“** (Standard) und **„Alle Wörter“**. Die Wahl
  wird wie `vocabularyTransfer` im Lehrerraum gemerkt und wiederhergestellt.
- Neues Feld der Sitzung `wordStoreTransfer: "none" | "errors" | "all"`. Ältere Sitzungen ohne
  Feld gelten als `"none"`. Für Vokabeln und Mathe ist es immer `"none"`.
- **„Falsch geschriebene Wörter“:** Bei jeder falschen oder nur tolerant angenommenen Antwort
  (Schreiberleichterung) vergleicht das Schülergerät Eingabe und Zieltext Wort für Wort
  (`tokenizeText` und `alignWords` aus `src/domain/text-compare.ts`). Übernommen werden die
  Originalwörter mit der Fehlerart `falsch` oder `gross-klein`. Ausgelassene (`fehlt`) und
  zusätzliche Wörter werden nicht übernommen, weil sie im Laufdiktat meist auf unvollständiges
  Abschreiben und nicht auf Rechtschreibung zurückgehen. Reine Zahlen werden nie übernommen.
- **„Alle Wörter“:** alle verschiedenen Wörter der Textteile, die das Kind erreicht hat, mit
  mindestens 4 Buchstaben (kalibrierbar). Falsch geschriebene Wörter kommen unabhängig von ihrer
  Länge immer dazu.
- **Wohin:** in die Wortbox „Aus dem Unterricht“. Falsch geschriebene Wörter werden zusätzlich
  **sofort fällig**: Hat das Wort noch keinen Lernstand, entsteht einer mit Stufe 1, Box 1 und
  Fälligkeit jetzt (ohne Lernereignis, ohne Versuch). Hat es einen, geht es auf Box 1 und wird
  jetzt fällig, die Merkstufe bleibt. Andere Wörter landen nur in der Wortbox.
- **Wann und wie oft:** an denselben Stellen wie die Vokabelübernahme (reguläres Ende und
  vorzeitiges Ende durch die Lehrkraft), **einmal pro Runde und Gerät** (eigene Markierung,
  getrennt von der Vokabelübernahme). Im Stationsmodus nie (mehrere Kinder an einem Gerät).
- **Ist die Wortbox voll** (500 Wörter), werden zuerst die falsch geschriebenen Wörter
  übernommen, der Rest entfällt, und der Hinweis lautet: „Deine Wortbox ‚Aus dem Unterricht‘ ist
  voll. Lösche Wörter, die du sicher kannst.“
- **Abschlussbildschirm im Live-Raum:** `savedWords` enthält die übernommenen Wörter. Angezeigt
  werden höchstens 5, danach „und n weitere“. Ein Link „Im Wortspeicher üben“ erscheint, wenn der
  Bereich `wortspeicher` sichtbar ist.
- **Datenschutz:** Die gemerkten Fehlerwörter liegen während der Runde nur im lokalen
  Schnappschuss (`sessionStorage`, `src/integrations/laufdiktat/live-trace.ts`) und danach in der
  lokalen Datenbank. An den Raum geht nichts Neues.

### 2.9 Verbindung zur Textbox

Es gibt weiterhin **keine** zweite Trainingsanwendung (Konzept §2.2).

- **Wortspeicher → Textbox:** Der Abschluss einer Runde zeigt, wenn der Bereich `textbox`
  sichtbar ist, den besten passenden Text direkt als Karte: Titel, Schwierigkeit und
  „enthält 4 deiner 6 Wörter“ (`rankTextsForWords` aus `src/domain/textbox-progress.ts`). Die
  Karte führt mit `buildTextboxLink` in die Textbox, wo der Text mit den geübten Wörtern als
  `extraTargets` startet (vorhanden). Ohne Treffer bleibt der bisherige Knopf „Mit einem Text
  weiterüben“. Übergeben werden alle Wörter der Runde (nicht nur die richtig geschriebenen) und
  bei festen Wortboxen die Sammlungs-Id.
- **Textbox → Wortspeicher:** `?woerter=` öffnet statt des alten Textfelds ein Blatt „Wörter aus
  der Textbox“ mit der Wortliste und zwei Aktionen:
  - „Jetzt üben“: öffnet das Startblatt mit einer vorübergehenden Wortbox „Aus der Textbox“
    (nicht gespeichert; ihre Runden werden unter der Id `textbox` gespeichert).
  - „In eine Wortbox speichern“: Auswahl einer eigenen Wortbox oder „Neue Wortbox“ (Vorschlag
    für den Titel: „Aus der Textbox“).
  - Es wird nichts ohne diese Aktion gespeichert.
- Eine automatische Übernahme von Textbox-Fehlern ist **nicht** Teil dieses Plans.

### 2.10 Freigabe

- Der Bereich `wortspeicher` bleibt `frei`. Es gibt keinen neuen Freigabebereich. Die
  Überarbeitung wird auf dem Arbeitsbranch fertiggestellt und erst nach dem Probedurchlauf von
  der Lehrkraft übernommen.
- Die Einstellung „Wörter in den Wortspeicher“ im Lehrerraum hängt am Bereich `wortspeicher`:
  Ist er nicht sichtbar, wird sie nicht angezeigt und die Sitzung bekommt `"none"`.

## 3. Umsetzung

### Teil 1: Fachlogik (rein, vollständig getestet)

#### 3.1 Merkstufe 6

`src/domain/learning-word.ts`:

- `LEARNING_WORD_STAGES = [1, 2, 3, 4, 5, 6] as const`.
- `updateLearningWordStage` und `updateLearningWordProgress`
  (`src/domain/learning-word-progress.ts`) begrenzen auf 6 statt 5.
- `src/storage/progress-schema.ts`: Für `stage` ein eigenes Schema 1–6. `box` bleibt 1–5.
- `src/domain/personal-backup.ts`: `learningWordProgressBackupSchema` erlaubt Stufe 6.
- Neue Funktion `evaluateLearningWordBlock(expected, input)` → je erwartetem Wort `{ word,
correct, result: WordResult }`, zusätzliche Wörter getrennt. `evaluateLearningWords` bleibt für
  bestehende Aufrufer erhalten, bis sie umgestellt sind, und wird dann entfernt.

#### 3.2 Wortboxen

Neue Datei `src/domain/word-box.ts`:

```ts
export const WORD_BOX_LIMITS = {
  titleMax: 60,
  wordMax: 60,
  wordsPerBox: 500,
  ownBoxes: 50,
};
export const wordBoxWordSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[^\p{Cc}<>]+$/u),
    addedAt: z.iso.datetime({ offset: true }),
    source: z.enum(["eigen", "laufdiktat", "textbox", "kopie"]),
  })
  .strict();
export const wordBoxSchema = z
  .object({
    id: z.string().regex(/^(eigen-[0-9a-f-]{36}|unterricht)$/),
    kind: z.enum(["eigen", "unterricht"]),
    title: z.string().trim().min(1).max(60),
    words: z.array(wordBoxWordSchema).max(500),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type WordBox = z.infer<typeof wordBoxSchema>;

/** Einheitliche Sicht auf feste, eigene und vorübergehende Wortboxen. */
export type WordBoxView = {
  id: string; // Sammlungs-Id, eigen-<uuid>, "unterricht", "faellig" oder "textbox"
  kind: "fest" | "eigen" | "unterricht" | "faellig" | "textbox";
  title: string;
  words: string[];
  strategy?: SpellingStrategy;
  editable: boolean;
};
export function wordKey(word: string): string; // NFC, trim, toLocaleLowerCase("de-DE")
export function addWords(
  box: WordBox,
  words: string[],
  source,
  now,
): { box: WordBox; added: string[]; skipped: string[] };
export function renameWord(
  box: WordBox,
  from: string,
  to: string,
  now,
): WordBox;
export function removeWord(box: WordBox, word: string, now): WordBox;
export function copyCollection(
  collection: LearningWordCollection,
  id: string,
  now,
): WordBox;
export function allWordBoxViews(
  own: WordBox[],
  collections: readonly LearningWordCollection[],
): WordBoxView[]; // Reihenfolge nach 2.2
```

- `wordKey` ersetzt die doppelten Hilfsfunktionen in `learning-word-app.tsx` und wird von
  `learningWordId` mitbenutzt.
- `addWords` legt Doppelte zusammen und hält die Grenze von 500 ein (`skipped` meldet den Rest).

#### 3.3 Runde als Zustandsautomat

Neue Datei `src/domain/word-round.ts`, nach dem Muster von `textbox-session.ts`:

```ts
export type WordRoundPhase = "memorize" | "recall" | "feedback" | "complete";
export type WordRoundWordResult = {
  word: string;
  firstTry: boolean; // auf Anhieb richtig (2.5)
  attempts: number;
  usedHelp: boolean;
  firstResult: WordResultKind | "fehlt"; // Fehlerart des ersten Versuchs
};
export type WordRoundState = {
  roundId: string;
  boxId: string;
  stage: LearningWordStage;
  blockSize: LearningWordBlockSize;
  blocks: string[][];
  index: number;
  phase: WordRoundPhase;
  usedHelp: boolean;
  incorrectAttempts: number;
  results: WordRoundWordResult[];
  lastFeedback?: WordRoundFeedback;
};
export function startWordRound(input: {
  roundId;
  boxId;
  stage;
  blockSize;
  roundSize;
  words: string[];
}): WordRoundState;
export function finishMemorize(state): WordRoundState;
export function useHelp(state): WordRoundState;
export function submitWordAnswer(
  state,
  input: string,
): { state: WordRoundState; correct: boolean; attempts: AttemptRecord[] };
export function continueAfterFeedback(state): WordRoundState;
export function advanceWordRound(state): WordRoundState; // nach der kurzen Erfolgsanzeige
export function wordRoundPercent(results: WordRoundWordResult[]): number;
```

- `AttemptRecord` enthält alles, was `recordAttempt` des Repositories braucht (Wörter, richtig,
  Hilfe, Selbstkorrektur, Stufe, `attemptId`). Der Container ruft das Repository damit auf, die
  Domäne bleibt ohne Speicher.
- Startphase: Stufe 4 und 5 beginnen mit `memorize`, alle anderen mit `recall`.
- Die Wortauswahl nutzt `selectLearningWordRound`, die Blöcke `chunkLearningWords`.
- Ungültige Übergänge werfen (wie in der Textbox).
- Die Erfolgsanzeige (650 ms) bleibt eine reine Oberflächenangelegenheit im Container.

#### 3.4 Buchstabenvergleich

Neue Datei `src/domain/letter-diff.ts`:

```ts
export type LetterDiff = {
  kind: "gleich" | "falsch" | "fehlt" | "zuviel";
  expected?: string;
  actual?: string;
  position: number;
};
export function diffLetters(expected: string, actual: string): LetterDiff[];
export function describeLetterDiff(diff: LetterDiff[]): string[]; // Texte für Screenreader
```

Levenshtein auf Buchstabenebene (Graphem-sicher über `Array.from` nach NFC). Groß-/Kleinfehler
erscheinen als `falsch` mit eigenem Text („groß statt klein“).

#### 3.5 Gleich klingende Wörter

Neue Datei `src/domain/homophones.ts`:

```ts
export type HomophoneGroup = { words: Record<string, string> }; // Wort → Bedeutungshilfe
export const HOMOPHONE_GROUPS: readonly HomophoneGroup[];
export function homophoneHint(word: string): string | undefined;
export function isHomophoneOf(target: string, input: string): boolean;
```

- Die Gruppen werden beim Modulstart mit Zod geprüft.
- Test: Für jedes Wort der festen Wortboxen, das in einer Gruppe steht, gibt es eine Hilfe. Eine
  zusätzliche Prüfliste in `docs/inhalte/wortspeicher.md` nennt die aufgenommenen Gruppen für die
  Lehrkraft.

#### 3.6 Auswertung über mehrere Runden

Neue Datei `src/domain/word-store-progress.ts`:

```ts
export type WordRoundRecord = z.infer<typeof wordRoundSchema>; // siehe 3.9
export type WordBoxStageSummary = {
  stage: LearningWordStage;
  rounds: number;
  bestPercent?: number;
  lastPercent?: number;
  lastPracticedAt?: string;
};
export function summarizeWordBox(
  boxId: string,
  rounds: WordRoundRecord[],
): Record<LearningWordStage, WordBoxStageSummary>;
export function headlineForBox(
  summary,
): { stage: LearningWordStage; bestPercent: number } | undefined; // höchste Stufe mit Runde
export function recommendedStage(
  words: string[],
  progress: LearningWordProgress[],
): LearningWordStage | undefined;
export function summarizeWordStore(
  progress: LearningWordProgress[],
  rounds: WordRoundRecord[],
): {
  trainedWords: number;
  secureWords: number;
  repetitions: number;
  rounds: number;
  byStage: Record<LearningWordStage, number>;
  mostErrors: { word: string; incorrectAttempts: number }[];
};
export function isNewBest(boxId, stage, percent, rounds): boolean;
```

- Die Reflexionsfragen werden aus `reflectionQuestions` (`textbox-progress.ts`) in eine
  gemeinsame Funktion `reflectionQuestionsFor(history: { percent: number }[])` in
  `src/domain/progress-reflection.ts` gezogen. Die Textbox ruft sie unverändert über ihre
  bisherige Funktion auf; ihre Tests bleiben grün.

#### 3.7 Übernahme aus dem Laufdiktat (rein)

Neue Datei `src/integrations/laufdiktat/word-store-transfer.ts`:

```ts
export type WordStoreTransferChoice = "none" | "errors" | "all";
export function misspelledWords(target: string, input: string): string[]; // falsch + gross-klein, ohne Zahlen
export function buildWordStoreTransfer(
  session: LiveSession,
  trace: LiveTransferTrace,
): { words: string[]; errorWords: string[] } | undefined;
```

- Der Rundenschnappschuss `LiveTransferTrace` und `liveTraceSchema` (`live-trace.ts`) erhalten
  additiv `wordMisspellings?: Record<string, string[]>` (Schlüssel `liveWordErrorKey`).
- „Alle Wörter“ nimmt nur Textteile bis einschließlich `currentIndex` bzw. alle bei `finished`.
- `src/integrations/laufdiktat/live-session.ts`: `wordStoreTransfer: z.enum(["errors", "all",
"none"]).default("none")`.
- `src/integrations/laufdiktat/teacher-session.ts`: Option `wordStoreTransfer`, nur bei
  `contentMode === "text"`, sonst `"none"`; Standard im Lehrerraum `"errors"`.

#### 3.8 Tests Teil 1

Je Datei ein `*.test.ts` daneben. Mindestens:

- Stufe 6: Auf- und Abstieg bis 6, Box bleibt höchstens 5, altes Backup mit Stufe 1–5 lädt.
- Stufe 5 je Wort: alle richtig, teilweise richtig, Doppelte in der Eingabe, zusätzliche Wörter,
  Groß-/Kleinfehler.
- Runde: vollständiger Durchlauf für jede Stufe, Hilfe verhindert „auf Anhieb“, Selbstkorrektur
  zählt nicht im Prozentwert, Prozent gerundet, ungültige Übergänge werfen.
- Wortbox: Doppelte, Grenze 500, ungültige Wörter, Umbenennen auf ein vorhandenes Wort
  (zusammenlegen), Kopie einer festen Wortbox, Reihenfolge von `allWordBoxViews`.
- Buchstabenvergleich: gleich, ein falscher, fehlender, zusätzlicher Buchstabe, Umlaute, ß,
  Groß-/Kleinfehler, leere Eingabe.
- Gleich klingende Wörter: Hilfe vorhanden, `isHomophoneOf` in beide Richtungen.
- Auswertung: Bestwert bleibt bei schlechterem neuen Ergebnis, Stufen getrennt, `headlineForBox`,
  `recommendedStage`, `summarizeWordStore` mit leeren Daten.
- Übernahme: falsch geschriebene Wörter aus Satz und Eingabe, Groß-/Kleinfehler, fehlende Wörter
  werden nicht übernommen, Zahlen nie, „Alle Wörter“ mit Mindestlänge und `currentIndex`,
  `"none"` ergibt nichts, alte Sitzung ohne Feld gilt als `"none"`.

### Teil 2: Speicherung und Backup

#### 3.9 Dexie-Tabellen

In `src/storage/personal-learning-events.ts`:

- `version(6)` wiederholt die vollständige `stores`-Zuordnung aus `version(5)` und ergänzt
  `wordBoxes: "id, kind, updatedAt"` und `wordRounds: "id, boxId, stage, completedAt"`.
- Rundendatensatz (`wordRoundSchema`, Zod, `.strict()`, in `src/domain/word-store-progress.ts`,
  in `progress-schema.ts` nur exportiert wie bei der Textbox):

```ts
type WordRoundRecord = {
  id: string; // roundId
  boxId: string;
  boxTitle: string; // Titel zum Zeitpunkt der Runde, für gelöschte Wortboxen
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  blockSize?: 1 | 2 | 3 | 5; // nur Stufe 5
  startedAt: string;
  completedAt: string;
  words: WordRoundWordResult[]; // höchstens 500, Wörter auf 60 Zeichen begrenzt
  percent: number; // 0–100
};
```

#### 3.10 Repositories

Nach dem Muster von `createTextboxRepository`:

```ts
createWordBoxRepository(db?) {
  list(): Promise<WordBox[]>;
  create(title: string, words?: string[], source?): Promise<WordBox>; // wirft ab 50 eigenen Wortboxen
  rename(id: string, title: string): Promise<void>;
  addWords(id: string, words: string[], source): Promise<{ added: string[]; skipped: string[] }>;
  renameWord(id: string, from: string, to: string): Promise<void>;
  removeWord(id: string, word: string): Promise<void>;
  remove(id: string): Promise<void>;
  copyCollection(collectionId: string): Promise<WordBox>;
  importFromLesson(input: { words: string[]; errorWords: string[]; sourceId: string; now?: Date }): Promise<{ added: string[]; full: boolean }>;
}
createWordRoundRepository(db?) {
  list(): Promise<WordRoundRecord[]>;
  listByBox(boxId: string): Promise<WordRoundRecord[]>;
  save(round: WordRoundRecord): Promise<void>; // idempotent über die Id, abgeschlossene Runden sind unveränderlich
}
```

- `importFromLesson` legt in **einer** rw-Transaktion über `wordBoxes` und
  `learningWordProgress` die Wortbox „Aus dem Unterricht“ an bzw. ergänzt sie und setzt die
  falsch geschriebenen Wörter fällig (2.8). Es schreibt **kein** Lernereignis.
- `createLearningWordProgressRepository.recordAttempt` bleibt, nimmt aber Stufe 6 an.
- Jedes Lesen wird mit Zod geprüft.

#### 3.11 Backup, Export, Import und Schüler-Cloud-Sync

Wie in Textbox-Plan 2.13, von Hand an allen Stellen:

1. `src/domain/personal-backup.ts`: `wordBoxes` und `wordRounds` in `personalDataSchema` und
   `PersonalLearningBackupInput`, Standardwert `[]`, damit ältere Backups weiter laden.
2. `parsePersonalLearningBackup`: auch der Rückfallpfad liefert beide Felder als `[]`.
3. `src/storage/personal-backup.ts`, `exportPersonalLearningBackup`: beide Tabellen mitlesen.
4. `restorePersonalLearningBackup`: beide Tabellen in die Transaktion aufnehmen.
   - `wordBoxes`: Zusammenführen über die Id. Gleiche Id: Wörter beider Stände vereinigen (über
     `wordKey`), Titel und Zeitstempel vom neueren `updatedAt`. Über 500 Wörter: Konflikt.
   - `wordRounds`: Zusammenführen über die Id. Gleiche Id mit verschiedenem Inhalt: Konflikt.
5. Die Union `PersonalBackupRestoreConflict.collection` um `"wordBoxes"` und `"wordRounds"`
   ergänzen.

Der Schüler-Cloud-Sync (`src/integrations/cloud-sync/sync.ts`) nutzt dieselbe Backup-Datei und
ist damit abgedeckt. Der Lehrer-Geräteabgleich bleibt unberührt.

#### 3.12 Tests Teil 2

Mit `import "fake-indexeddb/auto"`, benannter Datenbank und `db.delete()` in `afterEach`:

- Migration v5 → v6 behält alle bisherigen Daten (inklusive Textbox).
- Wortboxen: anlegen, umbenennen, Wörter hinzufügen/ändern/löschen, Grenzen, Kopie,
  `importFromLesson` (neue Box, vorhandene Box, volle Box, Fälligkeit, kein Lernereignis).
- Runden: speichern, doppeltes Speichern, Unveränderlichkeit.
- Backup-Rundlauf mit beiden Tabellen, Import eines alten Backups ohne Felder, Zusammenführung
  und Konflikte.

### Teil 3: Oberfläche neu aufbauen

#### 3.13 Aufteilung nach Container, Hook und Ansichten

- `app/components/use-word-store.ts`: lädt Wortboxen, Lernstand und Runden über die
  Repositories, liefert `loading | ready | unavailable` und die Aktionen aus 3.10. Nimmt optional
  Repositories entgegen (für Tests, wie `useTextbox`).
- `app/components/learning-word-app.tsx` wird zum schlanken Container: steuert den
  Zustandsautomaten aus 3.3, ruft `recordAttempt` und `save`, liest `?woerter=` und `?sammlung=`
  und reicht reine Props an die Ansichten. Der Export `LearningWordApp` bleibt, damit
  `app/frei/german/lernwoerter/page.tsx` unverändert bleibt.
- Ein Doppelklick auf „Prüfen“ oder ein doppelter Abschluss darf keine doppelten Einträge
  erzeugen.
- Die `roundId` wird mit `crypto.randomUUID()` erzeugt, die Wortbox-Id mit
  `eigen-${crypto.randomUUID()}`.

#### 3.14 Ansichten

Unter `app/views/wortspeicher/`, jeweils rein (nur Props), Tokens aus `app/ui/tokens.css`, in
hellem und dunklem Farbschema geprüft. Bausteine aus `app/ui/primitives.tsx` und `app/ui/sheet.tsx`
wiederverwenden. Vorhandene `ui-ws__*`-Klassen aus `app/ui/lernraum-ui.css` dürfen
weiterbenutzt werden; neue Gestaltung kommt in `app/views/wortspeicher/wortspeicher.module.css`
(wie `app/views/textbox/textbox.module.css`).

- `overview-screen.tsx`: Design 4d (Handy) und 4f (breit): Kopfzeile „Wortspeicher“, dunkle
  Karte „n Trainingswörter heute“ mit „Gemischt trainieren“, Kachelraster nach 2.2.
- `start-sheet.tsx`: Startblatt nach 2.3.
- `box-editor-screen.tsx`: Wortliste nach 2.2 (feste Wortbox nur lesen plus „Als eigene Wortbox
  kopieren“; eigene Wortbox bearbeiten). Jedes Wort ist eine Zeile mit „Ändern“ und „Löschen“
  (zugängliche Namen „‚Sonne‘ ändern“, „‚Sonne‘ löschen“).
- `round-screen.tsx`: Kopfzeile mit Zurück, Titel, „Merkstufe n · Titel · Wort x / y“ und
  Fortschrittsbalken wie heute; darin je nach Stufe:
  - `stage-prompt.tsx` für Stufe 1–3 (Muster wie `getPrompt`),
  - `cover-answer.tsx` für Stufe 4 (heutiges `UnderlineAnswer`),
  - `memory-block.tsx` für Stufe 5 (Merkanzeige und Textfeld, Enter prüft, Umschalt + Enter neue
    Zeile),
  - `listen-answer.tsx` für Stufe 6 (2.4, Zustände „wird vorbereitet“, „spricht“, „bereit“).
- `feedback-panel.tsx`: Fehlerart, Buchstabenvergleich (3.4), Hinweis bei gleich klingenden
  Wörtern, „Noch einmal versuchen“.
- `completion-screen.tsx`: Abschluss nach 2.5 mit Textvorschlag (2.9).
- `history-screen.tsx`: Verlauf nach 2.7.
- `textbox-words-sheet.tsx`: Blatt „Wörter aus der Textbox“ nach 2.9.

Bedienung wie bisher (Entscheidung 29): Eingabefelder erhalten automatisch den Fokus, Enter prüft,
richtige Antworten werden kurz bestätigt und gehen automatisch weiter. Einfügen, Ablegen,
Autokorrektur und Rechtschreibprüfung werden in den Eingabefeldern gesperrt
(`STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES`, `isBlockedRunningDictationInput`). Auf dem Handy bleibt
das aktive Eingabefeld über der Bildschirmtastatur sichtbar (Design 4e).

#### 3.15 Übersicht „Üben“ und Startseite

- Kacheltext in `app/ueben/practice-overview.tsx` anpassen: „Wörter in Wortboxen sammeln und in
  sechs Merkstufen sicher schreiben“.
- Die Empfehlung „Fällige Lernwörter wiederholen“ (`src/storage/learning-recommendations.ts`) und
  die Liste „Schwierig“ im Dashboard bleiben, Route unverändert.

#### 3.16 Tests Teil 3

- Komponententests über Rollen und Labels: Wortbox anlegen, umbenennen, Wort hinzufügen, ändern,
  löschen; feste Wortbox kopieren; Startblatt zeigt Bestwerte je Stufe; jede Stufe 1–5 einmal
  durchspielen; Fehler zeigt Buchstabenvergleich; Hilfe verhindert „auf Anhieb“; Abschluss zeigt
  Prozent und „Neuer Bestwert!“; doppelter Abschluss erzeugt eine Runde; `?woerter=` öffnet das
  Blatt und speichert nur nach Aktion.
- `app/components/learning-word-bridge.test.tsx` auf den neuen Ablauf umstellen.
- Playwright (`e2e/`): eigene Wortbox anlegen, drei Wörter eintragen, Stufe 1 mit einem
  absichtlichen Fehler durchspielen, Prozentwert prüfen, Runde mit 100 % wiederholen, Bestwert im
  Startblatt prüfen. Auf `minimum-width` (320 px) ohne waagrechtes Scrollen. axe-Prüfung von
  Übersicht, Startblatt, Wortliste und Runde.

### Teil 4: Stufe 6 und Sprachausgabe

#### 3.17 Gemeinsamer Sprachbaustein

Neuer Ordner `src/speech/`, **genau nach** `docs/umsetzungsplan-vorlesen.md` Abschnitt 3.1 und
3.2 (`normalizeSpeechLang`, `rankVoice`, `pickVoice`, `preloadVoices`, `speak`,
`isSpeechAvailable`, Vorladen beim App-Start), damit der Vorlese-Plan später darauf aufbauen
kann. Zusätzlich für Stufe 6:

```ts
export type SpeechReadiness = "ready" | "no-voice" | "unavailable";
/** Wartet auf eine passende Stimme (höchstens timeoutMs) und wärmt sie mit einer stummen Äußerung auf. */
export function prepareSpeech(
  lang: string,
  options?: { timeoutMs?: number; warmupMs?: number },
): Promise<SpeechReadiness>;
export function hasVoiceFor(lang: string): boolean;
```

- `prepareSpeech` muss im Klick-Handler von „Starten“ aufgerufen werden (Nutzergeste).
- `speak` erhält die 50-ms-Pause nach `cancel()` (2.4).
- Die Umstellung von `live-game.tsx`, `station-game.tsx` und `learning-box-app.tsx` (Vorlese-Plan
  3.3) und die Einstellungsseite „Vorlesestimme“ (3.4) gehören **nicht** zu diesem Plan.
- Hook `app/components/use-speech.ts`: Bereitschaft, `prepare`, `say(word)`. Die Ansicht bekommt
  nur Zustände und Rückrufe.

#### 3.18 Stufe 6 in der Runde

- `listen-answer.tsx` nach 2.4; Bedeutungshilfe aus `homophoneHint`.
- Startblatt deaktiviert Stufe 6 ohne deutsche Stimme (`hasVoiceFor("de-DE")` nach
  `preloadVoices`).
- Nach dem Aufwärmen wird jedes Wort beim Erscheinen gesprochen, danach erhält das Eingabefeld
  den Fokus.

#### 3.19 Tests Teil 4

- Unit-Tests für `src/speech/` wie im Vorlese-Plan Abschnitt 5, dazu: `prepareSpeech` wartet auf
  `voiceschanged` bzw. Nachfragen, gibt nach der Zeitgrenze `no-voice` zurück, spricht die stumme
  Äußerung mit `volume = 0` vor dem ersten Wort, setzt beim **ersten** Wort schon
  `utterance.voice`; `speak` ruft erst `cancel()` und nach 50 ms `speak()` auf (Fake-Timer).
- Komponententest Stufe 6 mit einem Stub für `speechSynthesis` (`getVoices`,
  `addEventListener`, `speak`, `cancel`): „Anhören“ zählt nicht als Hilfe, „Wort zeigen“ schon;
  gleich klingendes Wort ergibt die besondere Rückmeldung.
- Playwright: Stufe 6 mit über `addInitScript` nachgebautem `speechSynthesis`; ohne Stimmen ist
  die Stufe deaktiviert.

### Teil 5: Verlauf, Statistik und Laufzettel

#### 3.20 Verlauf einer Wortbox

`history-screen.tsx` nach 2.7, erreichbar über `?wortbox=<id>&ansicht=verlauf` (Zod-geprüft,
unbekannte Id führt zur Übersicht). Diagramme aus `app/ui/charts.tsx` mit Wertetabelle.

#### 3.21 Fortschrittsseite

`app/components/word-store-progress-section.tsx` mit eigenem Hook, eingebunden in
`app/lernen/fortschritt/page.tsx` vor `TextboxProgressSection`, Inhalt nach 2.7.

#### 3.22 Laufzettel

Neue Route `app/frei/german/lernwoerter/laufzettel/page.tsx` mit Container
`app/components/word-store-worksheet.tsx` und Ansicht
`app/views/wortspeicher/worksheet-screen.tsx` (Muster: Textbox-Laufzettel). Link „Laufzettel“ auf
der Übersicht (Kopfzeile) und im Verlauf. Die Route fällt durch das längste Präfix in den Bereich
`wortspeicher`; `src/domain/release.test.ts` um diesen Fall ergänzen.

#### 3.23 Tests Teil 5

Verlauf mit 0, 1 und vielen Runden, Stufenumschalter, Linie/Säule, Reflexionsfragen erst ab
2 Runden; Fortschrittsabschnitt leer und gefüllt, unsichtbar ohne Bereich; Laufzettel rendert
alle Spalten, Namensfeld wird nicht gespeichert, Druckknopf ruft `window.print()`.

### Teil 6: Laufdiktat-Übernahme und Textbox-Brücke

#### 3.24 Lehrerraum

- `app/lehrer/live/use-teacher-live-room.tsx`: Zustand `wordStoreTransfer` (Standard
  `"errors"`), gemerkt und wiederhergestellt wie `vocabularyTransfer`, übergeben an
  `buildTeacherSession`.
- Im Editor für Text-Inhalte (`app/lehrer/live/`, dort, wo bei Vokabeln „transfer“ eingestellt
  wird) ein `Segmented` „Wörter in den Wortspeicher“: Aus / Falsch geschriebene / Alle Wörter, mit
  kurzer Erklärung („Die Wörter bleiben auf den Geräten der Kinder. Du siehst sie nicht.“). Nur
  sichtbar, wenn der Bereich `wortspeicher` sichtbar ist.

#### 3.25 Schülergerät im Live-Raum

- `app/raum/spiel/live-game.tsx`: Bei falscher oder tolerant angenommener Antwort auf ein
  Text-Element `misspelledWords(target, input)` berechnen und im lokalen Schnappschuss unter
  `wordMisspellings` ergänzen (nur wenn `wordStoreTransfer !== "none"`).
- Neuer Hook `app/components/use-live-word-store-transfer.ts` nach dem Muster von
  `useLiveVocabularyTransfer`, mit `runLiveWordStoreTransfer` in
  `src/integrations/laufdiktat/word-store-transfer.ts` (Stationsmodus nie, einmal pro Runde und
  Gerät mit eigener Markierung in `live-trace.ts`, parallele Aufrufe teilen sich ein Promise).
- `app/components/live-room-join.tsx`: an denselben Stellen aufrufen wie die Vokabelübernahme
  und das Ergebnis als `savedWords` an den Abschlussbildschirm geben (2.8).

#### 3.26 Textbox-Brücke

- Abschluss der Runde: Textvorschlag nach 2.9. Die Textbibliothek wird erst beim Abschluss
  geladen (`import()`), damit die Übersicht klein bleibt.
- `?woerter=`: Blatt „Wörter aus der Textbox“ nach 2.9.
- `PHENOMENON_TO_COLLECTION` um `"s-ss-sz"` ergänzen (2.2).

#### 3.27 Tests Teil 6

- `teacher-session.test.ts`: `wordStoreTransfer` nur bei Text, Standard, alte Optionen.
- `live-session.test.ts`: altes Sitzungsobjekt ohne Feld.
- Übernahme: reguläres und vorzeitiges Ende, einmal pro Gerät, Stationsmodus, `"none"`, volle
  Wortbox, Anzeige „und n weitere“.
- Wenn die lokale Live-Suite läuft (`npm run test:e2e:live`): neuer Test nach dem Muster von
  `e2e/live/vocabulary-transfer.spec.ts`. Läuft sie in der Umgebung nicht, im Bericht vermerken.
- Brücke: Textvorschlag mit und ohne Treffer, unsichtbar ohne Bereich `textbox`, Blatt speichert
  nur nach Aktion.

### Teil 7: Dokumentation

#### 3.28 Dokumentation

- `docs/inhalte/wortspeicher.md` neu fassen: Wortboxen, sechs Merkstufen, Bewertung, Statistik,
  Übernahme, Liste der gleich klingenden Wörter als Prüfliste für die Lehrkraft, Prüfliste für die
  neue Wortbox „s, ss und ß“. Erledigte Punkte aus „Im Design gezeigt, fachlich noch nicht
  vorhanden“ entfernen; der Lückensatz bleibt dort als bewusst nicht umgesetzt vermerkt.
- `obsidian-export/Lernplattform/07 - Adaptive Merkstrecke/Anwendung.md`: Tabelle auf sechs
  Stufen, Abschnitt zu Wortboxen, Prozentwert und Übernahme.
- `19 - Entscheidungsprotokoll/Anwendung.md`: **Entscheidung 55** „Wortspeicher: Wortboxen,
  Stufe 6 und Übernahme aus dem Laufdiktat – 9. Oktober 2026“ mit den Punkten aus Abschnitt 2.
- `18 - Aufgabenübersicht/Anwendung.md`: Abschnitt „Lernwörter“ abhaken bzw. ergänzen
  („Lernwörter aus … eigenen Texten übernehmen“, „Fehlerwörter aus dem Laufdiktat“), neuer
  Abschnitt „Wortspeicher-Überarbeitung“ mit den Paketen aus Abschnitt 4.
- `24 - Textbox/Anwendung.md`: Verweis auf die erweiterte Brücke.
- Diesen Plan im Kopf unter **Fortschritt** aktualisieren.

### Teil 8: Probedurchlauf (Checkliste für die Lehrkraft)

1. „Üben“ → „Wortspeicher“ öffnen. Die Übersicht entspricht 4d (Handy) bzw. 4f (breit).
2. Feste Wortbox über ☰ ansehen und „Als eigene Wortbox kopieren“.
3. Neue eigene Wortbox anlegen, fünf Wörter eintragen, eines ändern, eines löschen.
4. Wortbox antippen: Startblatt mit sechs Stufen und „–“ als Bestwert.
5. Stufe 1 mit einem absichtlichen Fehler spielen: Buchstabenvergleich prüfen. Abschluss zeigt
   z. B. 80 %. Nochmal üben ohne Fehler: „Neuer Bestwert!“ und 100 % im Startblatt.
6. Stufe 5 mit Blockgröße 3: Ein Wort falsch, zwei richtig. Der Prozentwert zählt je Wort.
7. Stufe 6 auf jedem Schulgerät: Schon das **erste** Wort ist vollständig und in guter Stimme zu
   hören. „Anhören“ wiederholt. Ein gleich klingendes Wort (z. B. „Rat“ statt „Rad“) zeigt die
   besondere Rückmeldung.
8. Verlauf öffnen, Stufe wechseln, Linie/Säule umschalten.
9. Laufzettel öffnen, Namen eintragen, drucken bzw. als PDF sichern.
10. „Mein Fortschritt“: Abschnitt „Wortspeicher“ prüfen.
11. Live-Laufdiktat mit Text und „Falsch geschriebene Wörter“ starten, auf einem Schülergerät
    zwei Wörter falsch schreiben. Abschluss nennt die Wörter; sie liegen in „Aus dem Unterricht“
    und zählen zu „Trainingswörter heute“.
12. Dasselbe mit „Alle Wörter“ und mit „Aus“.
13. Eine Runde abschließen und den Textvorschlag öffnen. Die Textbox startet mit den geübten
    Wörtern markiert. In der Textbox Fehler machen und „Fehlerwörter im Wortspeicher üben“: Das
    Blatt erscheint, „In eine Wortbox speichern“ legt sie ab.
14. Backup exportieren, Website-Daten löschen, Backup importieren: Wortboxen und Runden sind
    wieder da.
15. Alles auf einem Handy im Hoch- und Querformat wiederholen (Schritte 3–7).
16. Werte notieren, die angepasst werden sollen (Abschnitt 8).

## 4. Reihenfolge und Pakete

| Paket | Inhalt         | Ergebnis                                                                               |
| ----- | -------------- | -------------------------------------------------------------------------------------- |
| A     | Teil 1, Teil 2 | Fachlogik, Stufe 6 im Datenmodell, Wortboxen, Runden, Backup; ohne Oberfläche          |
| B     | Teil 3         | Neuer Wortspeicher mit Wortboxen, Stufen 1–5, Prozentwert und Bestwert; Checkliste 1–6 |
| C     | Teil 4         | Stufe 6 mit vorbereiteter Stimme; Checkliste 7                                         |
| D     | Teil 5         | Verlauf, Fortschrittsseite, Laufzettel; Checkliste 8–10                                |
| E     | Teil 6, Teil 7 | Laufdiktat-Übernahme, Textbox-Brücke, Dokumentation; Checkliste 11–16                  |

Jedes Paket endet mit grünem `npm run check` (ab Paket B zusätzlich
`npm run test:e2e:chromium`), Push auf `claude/wortspeicher-umbau`, Aktualisierung von
„Fortschritt“ in diesem Plan und einem kurzen Bericht. Zwischen den Paketen nicht auf eine
Freigabe warten, außer ein Paket wirft eine echte fachliche Frage auf.

**Inhalte, die die Lehrkraft prüft, bevor sie übernimmt:** Wortbox „s, ss und ß“ (2.2) und die
Liste der gleich klingenden Wörter (2.4). Beide entwirft der Agent in Paket A.

## 5. Nicht Teil dieses Plans

- Lückensätze bzw. Beispielsätze je Wort (Design 4e) und Satzdiktat
- automatische Übernahme von Textbox-Fehlern ohne Rückfrage
- Übernahme aus dem eigenen Laufdiktat (`/frei/german/laufdiktat`) und aus Tests
- Lernwortlisten, die die Lehrkraft als Inhalt verteilt
- 5.000-Punkte-Wertung, Sterne und Merkbonus (Vault Kap. 18)
- automatische Wahl der Merkstufe
- Umstellung der übrigen Vorlesestellen und Einstellungsseite „Vorlesestimme“ (Vorlese-Plan 3.3
  und 3.4)
- Sprachmodelle im Browser oder Cloud-Sprachausgabe
- Übermittlung von Ergebnissen an Lehrkräfte, QR-Abgabe oder Klassenranking

## 6. Bekannte Grenzen (dokumentieren, nicht lösen)

- Eine Runde nimmt aus großen Wortboxen jedes Mal andere Wörter. Prozentwerte derselben Stufe
  sind deshalb nur ungefähr vergleichbar.
- Ältere App-Versionen auf einem zweiten Gerät kennen Stufe 6 und die Backup-Felder `wordBoxes`
  und `wordRounds` nicht. Vor dem Cloud-Abgleich müssen alle Geräte aktualisiert sein.
- Sprachausgabe und Stimmenqualität hängen vom Gerät ab. Ohne deutsche Stimme gibt es keine
  Stufe 6.
- Die Übernahme aus dem Laufdiktat erkennt Fehlerwörter durch Wortvergleich. Bei stark
  abweichenden Eingaben kann ein Wort falsch zugeordnet werden.
- Lokale Daten gehen verloren, wenn Browserdaten gelöscht werden. Schutz bieten Backup und die
  Backup-Erinnerung.
- Der Laufzettel ist nicht manipulationssicher.

## 7. Abschluss

- `npm run check` und `npm run test:e2e:chromium` sind grün.
- Push auf `claude/wortspeicher-umbau`, nicht auf `claude/lernraum-ui-v2`.
- Bericht an die Lehrkraft: umgesetzte Pakete, Branch, festgehaltene Abweichungen, offene
  Punkte, Hinweise für den Probedurchlauf (Teil 8) und die zu prüfenden Inhalte.

## 8. Später zu kalibrieren (nach dem Probedurchlauf)

- Wartezeit auf die Stimme (3 s) und Aufwärmzeit (1,5 s)
- Sprechtempo in Stufe 6 (0,9)
- Mindestlänge bei „Alle Wörter“ (4 Buchstaben)
- Größe der Wortboxen (500) und Anzahl eigener Wortboxen (50)
- ob fehlende Wörter aus dem Laufdiktat doch übernommen werden sollen
- ob die Kachel statt der höchsten Stufe einen anderen Bestwert zeigen soll
- Lückenmuster der Stufen 2 und 3 (`buildLearningWordPattern`)
