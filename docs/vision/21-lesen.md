# Vision Lernraum – Rolle 21: Lesedidaktik

Stand: 10.11.2026. Geprüft am Code der Version 0.9.7 (Arbeitsstand `5781803`),
an den Berichten 10, 11 und 12 und an den Antworten des Entwicklers vom 09. und
10.11.2026 (`01-planung.md`, Abschnitt 4). Kennzeichen: [Beleg] Repository,
[Fachstand] Forschung oder anerkannte Praxis mit Quelle, [Vermutung] plausibel,
nicht belegt, [Empfehlung] Vorschlag dieser Rolle. Quellen stehen am Ende
(Q1 bis Q19).

**Grenze der Webprüfung:** Der Abruf von `lesen.bayern.de` scheiterte an der
Namensauflösung der Sitzung. Alle Webangaben stammen aus Suchergebnissen mit
Auszügen, abgerufen am 10.11.2026. Kein Studientext wurde im Original gelesen.

## 1. Kurzfazit

1. Lesen ist in Lernraum heute ein Nebenprodukt der Rechtschreibung: Es gibt
   keinen Lesetext, keine Leseaufgabe und keine Lesemessung. Die 50
   Textbox-Texte sind Rechtschreibtexte mit Grundschul-Lebenswelt und ungeprüft.
2. Am besten belegt ist für schwache Leserinnen und Leser das **wiederholte,
   begleitete Lautlesen** (Lautlesetandem). Digitale Leseprogramme allein
   wirken nach Überblicksstudien nur schwach. Das Gerät soll deshalb das Lesen
   mit einem Gegenüber organisieren, nicht ersetzen.
3. Ohne Spracherkennung kann das Gerät nicht zuhören. Es kann aber Text groß
   zeigen, satzweise vorlesen, Zeit nehmen, Durchgänge zählen und eine
   Partnerin Stolperstellen antippen lassen. Damit lässt sich ein Tandem und
   ein Lesen allein nach dem bayerischen FiLBY-Dreiklang („leise mitlesen –
   halblaut mitlesen – laut lesen“) bauen.
4. Die ersten Bausteine brauchen **keine neuen Inhalte**: ein Tandem-Begleiter,
   der auch mit Papiertexten funktioniert, ein „Chorlesen an der Tafel“ und ein
   „Wort-Blitz“ aus den vorhandenen 885 Wörtern. Sie lassen sich sofort im
   Unterricht erproben.
5. Für die Mittelschule fehlen Texte, die leicht zu lesen, aber nicht kindlich
   sind. Ein erster brauchbarer Bestand sind 30 Texte in drei Lesestufen mit je
   vier bis sechs Verstehensaufgaben. Das kostet die Lehrkraft rund 8 bis 10
   Stunden Prüfzeit [Vermutung].
6. Verstehen lässt sich ohne freie Antworten prüfen: „stimmt / stimmt nicht /
   steht nicht im Text“, dazu den Beleg im Text antippen. Das senkt das Raten.
7. Als spontanes Live-Format eignet sich „Stimmt das?“ (kurze Sätze, Antippen),
   so schnell gestartet wie das Kopfrechnen. Ob Tempo dabei mitspielt, ist eine
   Entscheidung (Frage 5, Entscheidungen 10, 39, 47).
8. Lernraum sagt über das Lesen eines Kindes nur, was es selbst geübt und
   gemessen hat, ohne Normwert und ohne Diagnose. Für Lernverlaufsdiagnostik
   verweist Lernraum auf Levumi.

## 2. Ist-Stand in Lernraum

### 2.1 Was es gibt

| Bereich                          | Befund                                                                                                                                                                                                                              | Beleg                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Lesetexte, Leseaufgaben          | keine. Die Textbox ist ein Rechtschreibtraining; Lesen kommt nur in der Merkphase vor (60/90/120 s).                                                                                                                                | [Beleg] `src/domain/textbox-session.ts`, `MEMORIZE_SECONDS`; Entscheidung 54                          |
| Textbox-Texte                    | 50 Texte, 36 bis 133 Wörter, mittlere Satzlänge 6 bis 12,5 Wörter; Gattungen Geschichte, Alltag, Erlebnis, Sachtext, Schule. Keine Aufgaben zum Verstehen, keine Lesestufe, keine Quelle oder Lizenz im Schema.                     | [Beleg] eigene Auszählung von `textbox-library.ts`; Schema `textbox-text.ts`                          |
| Spiegelschrift                   | nur im Lesetext der Merkphase, 7 Tage, nur lokal                                                                                                                                                                                    | [Beleg] `src/domain/mirror-reading.ts`; `docs/umsetzungsplan-spiegelschrift.md`, 1.2–1.4              |
| Sprachausgabe                    | `speak()` mit Stimmenwahl und Schalter `localOnly`; keine Wortmarkierung (`onboundary` wird nirgends genutzt); spricht einen Text als eine einzige Äußerung                                                                         | [Beleg] `src/speech/speaker.ts`, Z. 145–176; Suche nach `boundary` in `src/`, `app/`                  |
| Vorlese-Knopf                    | Die Komponente `ReadAloudButton` ist **nirgends eingebunden**. Vorlesen in Aufgaben gibt es nur im Live- und Stationsspiel und im Laufdiktat über eigenen Code mit direktem `speechSynthesis`-Aufruf. Die Textbox liest nichts vor. | [Beleg] Suche nach `ReadAloudButton`: nur Definition; `live-game.tsx`, Z. 620–633; `station-game.tsx` |
| Laufdiktat                       | liest, merkt, schreibt Sätze; Hinweis deckt Teile des Zielsatzes auf. Lesen ist Mittel, nicht Gegenstand.                                                                                                                           | [Beleg] `src/domain/running-dictation.ts`, `buildRunningDictationHint`                                |
| Tagesportion, Profil, Startpunkt | kennen kein Lesen (Module: Vokabeln, Deutsch, Mathe)                                                                                                                                                                                | [Beleg] Bericht 10, 2.4; `DAILY_PLAN_MODULES`                                                         |

### 2.2 Stichprobe der Textbox-Texte (15 Texte gelesen)

Gelesen: TXT-001 bis -005, -009, -012, -013, -019, -028, -031, -036, -039,
-045, -049, -050.

- **Niveau:** Für Lesen in Jahrgang 2 bis 4 sprachlich passend (Audit: LIX
  18,6 / 24,7 / 31,7; `agent-e-schularten.md`, E-009) [Beleg]. Für 12- bis
  15-Jährige thematisch kindlich: „Der kleine Hund“, „Einkaufen mit Oma“,
  „Auf dem Spielplatz“ [Beleg, Titel].
- **Qualität:** Erzählungen sind meist stimmig (TXT-012, -036, -045). Einige
  Sätze stehen erkennbar für Zielwörter da: „Mir ist heiß, weil ich so
  konzentriert arbeite.“ (TXT-028); „Mit Schneeflocken und Regentropfen
  schließt sich der Wasserkreislauf.“ (TXT-013, sachlich schief) [Beleg].
- **Folge:** Als Lesetexte taugen sie nach Prüfung für die Grundlagenstufe
  (Leseanfänger, Nachholer), nicht als Hauptbestand für die Mittelschule
  [Empfehlung].

### 2.3 Korrekturen an den Phase-1-Berichten

| Bericht                     | Aussage                                                  | Richtig ist                                                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10, Abschnitt 5             | „Sprachausgabe: nur Gerätestimmen“                       | Nur der (nicht eingebundene) Vorlese-Knopf erzwingt lokale Stimmen. Bericht 12 nennt LernBox, Live- und Stationsspiel ohne `localOnly`; zusätzlich ruft `app/components/use-speech.ts`, Z. 59 (Wortspeicher Stufe 6, Startpunkt) `speak(word, lang)` ohne `localOnly` auf. |
| 10, Abschnitt 6; Entsch. 58 | Vorlese-Knopf „steht dort, wo das Kind den Text braucht“ | Die Komponente ist an keiner Stelle eingebunden [Beleg]. Ob das so gewollt ist, ist offen.                                                                                                                                                                                 |
| –                           | –                                                        | `speak()` beendet sein Warten nach 12 s (`SAFETY_TIMEOUT_MS`). Für einen ganzen Lesetext (60 s und mehr) würde der Knopf zu früh „fertig“ melden, während die Stimme weiterspricht [Beleg für die Konstante, Wirkung Vermutung].                                           |

## 3. Fachstand und Vorbilder

### 3.1 Lage

- IGLU 2021: 25,4 % der Viertklässler erreichen nicht Kompetenzstufe III, die
  für „Lesen, um zu lernen“ nötig ist (2016: 19 %) [Fachstand, Q1].
- PISA 2022: rund ein Viertel der 15-Jährigen in Deutschland liegt im Lesen
  unter Stufe 2; Mittelwert 480 Punkte [Fachstand, Q2].
- IQB-Bildungstrend 2022, Jahrgang 9: knapp 9 % verfehlen im Lesen den
  Mindeststandard für den Ersten Schulabschluss, in Bayern etwa 11,5 %; 33 %
  verfehlen den Mindeststandard für den Mittleren Schulabschluss [Fachstand,
  Q3]. Der Bildungstrend 2024 prüfte Mathematik und Naturwissenschaften, nicht
  Lesen [Fachstand, Q4].
- Für die Mittelschule heißt das [Vermutung]: In jeder Klasse sitzen Jugendliche,
  die nicht flüssig genug lesen, um Texte zu verstehen. Das ist die Zielgruppe
  dieses Pfeilers.

### 3.2 Was wirkt, nach Teilbereich

Das Mehrebenenmodell (Rosebrock und Nix) trennt Prozessebene (Wort- und
Satzerkennung, lokale und globale Kohärenz), Subjektebene (Motivation,
Selbstbild) und soziale Ebene (Gespräch über Texte) [Fachstand, Q7,
Sekundärquelle]. Leseflüssigkeit umfasst genaues, ausreichend schnelles und
sinngemäß betontes Lesen [Fachstand, Q7].

| Teilbereich             | Was belegt ist                                                                                                                                                                                                                                     | Was Hoffnung ist                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Wort- und Satzerkennung | Systematisches Üben der Dekodierung ist für Anfänger wirksam (National Reading Panel; Q5, nicht am Original geprüft).                                                                                                                              | Blitzlesen von Wörtern am Gerät: verbreitete Praxis, eigene Wirkungsbelege nicht gefunden. |
| Leseflüssigkeit         | Begleitetes wiederholtes Lautlesen: mittlerer Effekt (gewichtet 0,41; NRP, Q5). Lautlesetandems verbesserten bei leseschwachen Zwölfjährigen Flüssigkeit und Verstehen (Rosebrock u. a. 2010, zitiert in Q6). Wirkung hängt an der Umsetzung (Q6). | Stilles Lesen allein ohne Rückmeldung: Wirkung nach NRP nicht ausreichend belegt (Q5).     |
| Leseverständnis         | Explizite Lesestrategien: im Mittel etwa sechs Monate Lernvorsprung (EEF, Q13). „Wir werden Textdetektive“: d = 0,47 kurz-, 0,30 mittelfristig bei schwachen Viertklässlern (Q12).                                                                 | Strategien helfen erst, wenn das Wortlesen nicht alle Aufmerksamkeit bindet (Q7, Q10).     |
| Digitale Förderung      | Lernsoftware für schwache Leser: kleiner Effekt (+0,14); am stärksten, wenn sie in Kleingruppenunterricht eingebunden ist (+0,32) (Cheung und Slavin 2013, Q14).                                                                                   | Adaptive Software allein: neuere Synthese ohne signifikanten Effekt (Q14, Suchauszug).     |
| Lesemotivation          | Antolin: kurzfristig starke Wirkung auf Leseverhalten, nur qualitativ, kleine Stichprobe (Meier 2019, Q15).                                                                                                                                        | Punkte als Anreiz: Langzeitwirkung unbelegt (Q15).                                         |

Schluss [Empfehlung]: Das Gerät ist dort am stärksten, wo es ein belegtes
Verfahren mit einem Gegenüber leichter macht. Es ist am schwächsten als
Lesemaschine, die allein Fragen stellt.

### 3.3 Vorbilder

| Vorbild                             | Was es macht                                                                                                                                                                   | Was Lernraum übernimmt                                                                         | Quelle, Lizenz                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| ISB, Lautleseverfahren (Bayern)     | Lesetandem für alle Schularten, Jgst. 2 bis 8; Kombiverfahren dreimal pro Woche 15 bis 20 Minuten über drei bis fünf Wochen                                                    | Ablauf, Rollen, Takt; nur verlinken                                                            | Q8; Lizenz ungeprüft              |
| FiLBY und FiLBY-SEK (Bayern)        | Dreiklang „leises Mitlesen – halblautes Mitlesen – lautes Partnerlesen“; Hördateien in verschiedenen Lesegeschwindigkeiten, auch für Jgst. 5; Sekundarstufen-Projekt 2024–2027 | Dreiklang als Ablauf „Lesen allein“; Tempostufen der Stimme; Anschluss an Material der Schule  | Q9; Lizenz ungeprüft              |
| Berlin-Brandenburg, Trainingspakete | Lautlese-Tandem-Material Niveau C für Jgst. 5/6 und Sek I                                                                                                                      | Idee der Niveaustufen                                                                          | Q10; Lizenz ungeprüft             |
| „Lesen macht stark“ (Niedersachsen) | Module Leseflüssigkeit, Diagnostik, Strategien, Motivation für Sek I                                                                                                           | Reihenfolge: erst Flüssigkeit, dann Strategien                                                 | Q11; Lizenz ungeprüft             |
| Levumi                              | kostenlose Lernverlaufstests, u. a. Leseflüssigkeit (Silben, Wörter, Pseudowörter) und sinnkonstruierendes Lesen                                                               | Verweis statt Nachbau                                                                          | Q16; Angebot 2026 ungeprüft       |
| Antolin                             | Quiz zu Büchern, Punkte, Punktabzug bei Fehlern                                                                                                                                | Lesen geschieht außerhalb, das Gerät würdigt es. Nicht: Buchquiz, Punktabzug (Entscheidung 10) | Q15; kostenpflichtig (Bericht 11) |

## 4. Zielbild

### 4.1 Kind

- In „Üben“ gibt es die Kachel **Lesen**. Sie bietet drei Wege: „Text lesen“
  (allein), „Zu zweit lesen“ (Tandem) und „Wort-Blitz“.
- **Auf einem fremden Gerät** wählt das Kind die Lesestufe an einem Probesatz
  je Stufe („Kannst du das gut lesen?“). Es bekommt einen Text dieser Stufe.
  Nichts setzt Lernstand voraus (Antwort Nachtrag 2).
- **Auf dem eigenen Gerät** schlägt Lernraum denselben Text noch zwei- bis
  dreimal an Folgetagen vor und zeigt den eigenen Verlauf („1. Lesen 2:10 min, 3. Lesen 1:35 min“).
- Die Ansprache ist sachlich und für Jugendliche geeignet. Texte der Stufe 1
  sind leicht zu lesen, handeln aber von Themen 12- bis 15-Jähriger.
- Kein Mikrofon, keine Aufnahme, keine Wertung von außen.

### 4.2 Lehrkraft

- Startet ohne Vorbereitung ein **Chorlesen an der Tafel**: Text wählen, Tempo
  wählen, die Phrase wird im Takt markiert, alle lesen mit.
- Startet im Live-Raum **„Stimmt das?“** wie das Kopfrechnen: Code, Stufe,
  los.
- Teilt die Klasse in Tandems ein. Der Tandem-Begleiter funktioniert auch mit
  dem Text aus dem Lesebuch auf Papier.
- Erfährt vom Lesen allein nur, was ein Kind freiwillig im Kurzbericht zeigt
  (R12-7 aus Bericht 12), zum Beispiel „3 Texte, je 3-mal gelesen“.
- Findet einen Verweis auf Levumi für echte Lernverlaufsmessung.

### 4.3 Durchgespieltes Beispiel: 20 Minuten, Jahrgang 4, schwache Leseflüssigkeit

Annahme: Mia liest langsam und stockend, versteht einfache Sätze. Text
„Der Igel im Laub“, Stufe 1, 110 Wörter, selbst erstellt.

**Allein am Gerät**

| Minute  | Mia tut                                               | Das Gerät zeigt                                                                                                 |
| ------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0–1     | tippt „Lesen“, „Text lesen“, Stufe 1                  | Probesatz je Stufe, dann den Text groß, mit Zeilenabstand                                                       |
| 1–4     | hört zu und liest leise mit                           | Gerätestimme liest **satzweise**; der aktuelle Satz ist hinterlegt. Tempo „ruhig“                               |
| 4–7     | liest halblaut mit der Stimme                         | gleicher Ablauf, Tempo „normal“                                                                                 |
| 7–12    | liest zweimal laut allein, tippt „Start“ und „Fertig“ | „1. Mal: 2:20 min · 2. Mal: 1:55 min“. Frage „Wie lief es?“ mit drei Antworten. Kein Normwert                   |
| 12–16   | löst vier Aufgaben                                    | „Stimmt / stimmt nicht / steht nicht im Text“, danach „Tippe den Satz an, der das zeigt“. Lösung mit Textstelle |
| 16–20   | Wort-Blitz mit acht Wörtern aus dem Text              | Wort erscheint kurz, dann Auswahl aus drei ähnlichen Wörtern („Laub / Lab / Leib“)                              |
| Schluss | –                                                     | eigenes Gerät: „Morgen liest du den Text noch einmal.“ Fremdes Gerät: „Das war Text 4.“                         |

Grenze: Das Gerät weiß nicht, ob Mia richtig gelesen hat. Die Zeit misst nur
das Durchlesen, nicht die Genauigkeit.

**Zu zweit (Lautlesetandem)**

| Minute | Mia (Sportlerin) und Jonas (Trainer) tun                                                                         | Das Gerät zeigt                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0–2    | lesen die Rollenkarte                                                                                            | Regeln in drei Sätzen; Zeichen für „ich lese allein“ und „Stopp, Fehler“                           |
| 2–12   | lesen den Text viermal, erst synchron, dann Mia allein; bei einem Fehler tippt Jonas das Wort an, Mia wiederholt | Durchgangszähler 1 bis 4; angetippte Wörter werden hinterlegt; Uhr je Durchgang                    |
| 12–14  | Eine-Minute-Lesen: Mia liest allein, Jonas tippt nach 60 s das letzte Wort an                                    | „74 Wörter in einer Minute, 2 Stolperstellen. Im 1. Durchgang: 55 Wörter.“                         |
| 14–18  | lösen die vier Aufgaben gemeinsam                                                                                | wie oben                                                                                           |
| 18–20  | sehen die Stolperwörter an                                                                                       | „raschelt, Winterschlaf, Igelmutter“, Knopf „Im Wortspeicher üben“ (bestehende Brücke, Entsch. 55) |

Mit Papiertext entfallen Wortmarkierung und Wörterzahl; Uhr, Rollen,
Durchgänge und Selbsteinschätzung bleiben.

**Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“:** Allein
trägt er, sobald ein Bestand mitgeliefert ist. Auf einem fremden Gerät fehlt
nur die Wiederholung an Folgetagen. Das Tandem braucht eine Minute
Einteilung durch die Lehrkraft; das ist Unterrichtsorganisation, keine
Vorbereitung in Lernraum. Ohne lokale deutsche Stimme entfallen die Minuten
1 bis 7; der Ablauf beginnt dann mit dem lauten Lesen [Empfehlung].

## 5. Konkrete Bausteine

Aufwand: S bis eine Woche, M zwei bis vier Wochen, L länger. Prüfaufwand:
Zeit der Lehrkraft für Inhalte.

| Nr.    | Baustein                                                                                                                                                           | Nutzen und Szenario                                                       | Entw. | Prüfung                            | Abhängigkeiten                           | Entscheidungen                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ----- | ---------------------------------- | ---------------------------------------- | ------------------------------------ |
| L21-1  | **Tandem-Begleiter**: Rollen, Uhr, Durchgänge, Selbsteinschätzung; mit Bildschirmtext zusätzlich Fehler antippen und Eine-Minute-Lesen                             | Förderstunde, Leseband; sofort im Unterricht testbar, auch mit Papiertext | S–M   | kein                               | –                                        | 2 (lokal)                            |
| L21-2  | **Chorlesen an der Tafel**: Projektion, Phrase im wählbaren Takt markiert                                                                                          | ganze Klasse, spontan, ohne Schülergeräte                                 | S     | kein (vorhandene Texte)            | Projektion „Für die Tafel“               | 47, 48; `lehrer-geraet` Vorschau     |
| L21-3  | **Wort-Blitz**: Wort kurz zeigen, Auswahl aus drei ähnlichen Formen; Wörter aus den Wortboxen                                                                      | Wortlesen automatisieren; nutzt Bestand der Rechtschreibung               | S     | S (Ablenker, etwa 2 h)             | –                                        | 30                                   |
| L21-4  | **Satzweises Vorlesen**: Text in Sätze teilen, jeden Satz einzeln mit `localOnly` sprechen und hinterlegen; drei Tempostufen; 12-s-Grenze je Satz statt je Text    | Grundlage für Mitlesen; ohne Wortereignisse des Browsers                  | S     | kein                               | –                                        | 58 (Vorlesen in der Aufgabe), R12-10 |
| L21-5  | **Lesetext als Datenpaket**: Schema mit Lesestufe, Wortzahl, Thema, Quelle, Lizenz, Aufgaben; automatische Prüfung von Satzlänge und Wortzahl im Test              | Texte ohne Code-Änderung ergänzbar; Lizenz je Text nachweisbar            | M     | kein                               | Modulvertrag L1 (Bericht 10)             | 54                                   |
| L21-6  | **Erster Lesebestand**: 3 Stufen × 10 Texte, 80–250 Wörter, Sachtext und Erzählung für 11- bis 15-Jährige; selbst erstellt (KI zur Entwicklungszeit), CC BY-SA 4.0 | Inhalt für L21-7 und L21-8                                                | S     | L (8–10 h, etwa 15–20 min je Text) | L21-5; Lizenzordnung R12-12              | 54 (Prüfpflicht)                     |
| L21-7  | **Text lesen allein**: Dreiklang hören – mitsprechen – allein lesen, Zeit je Lesen, Selbsteinschätzung, Wiederholung an Folgetagen auf festen Geräten              | Lesen allein, Frühfertige, Hausaufgabe                                    | M     | kein                               | L21-4, L21-6                             | 57 (Portion), 58                     |
| L21-8  | **Verstehensaufgaben**: stimmt / stimmt nicht / steht nicht im Text, Beleg antippen, Sätze ordnen, Überschrift zuordnen; keine freien Antworten                    | Verstehen prüfen ohne Raten und ohne KI                                   | M     | M (in L21-6 enthalten)             | L21-5                                    | 55 (Lückensatz 4e nicht umgesetzt)   |
| L21-9  | **„Stimmt das?“ live**: kurze Sätze, alle tippen zugleich; Klassensumme statt Einzelwertung; Lesezeit je Stufe                                                     | spontan wie Kopfrechnen; Leseanlass für die ganze Klasse                  | M     | M (300 Sätze, etwa 3 h)            | Raumformat, Supabase-Migration           | 10, 39, 47, 52; Frage 5              |
| L21-10 | **Strategiekarten**: vor, beim, nach dem Lesen (Überschrift, Bild, unbekanntes Wort, Abschnitt zusammenfassen) als Hilfe in L21-8                                  | Strategie dort, wo sie gebraucht wird                                     | S     | S (1 h)                            | L21-8                                    | 58                                   |
| L21-11 | **Mein Lesen**: eigener Verlauf je Text (Zeit, Wörter pro Minute aus dem Tandem), lokal, in der Sicherung; ohne Norm                                               | Kind sieht eigenen Fortschritt                                            | S     | kein                               | L21-1, L21-7                             | 2, 9; RL-13                          |
| L21-12 | **Lesen im Kurzbericht**: nur Zahl der Texte und Wiederholungen                                                                                                    | Rückmeldung an die Lehrkraft (Frage 3)                                    | S     | kein                               | R12-7                                    | 4, 5, 6, 10, 41 (Vorlage)            |
| L21-13 | **Verweis Levumi** im Lehrerbereich, zusammen mit W-4 (Bericht 11)                                                                                                 | echte Lernverlaufsmessung ohne Nachbau                                    | S     | S (Anbieterangaben)                | W-4                                      | –                                    |
| L21-14 | später: **Aufnahmen zur Entwicklungszeit** (CC0-Stimme, zwei Tempi) mit genauer Satzzeit                                                                           | gleiche Stimme auf allen Geräten                                          | M     | M (Anhören)                        | R12-13                                   | 58                                   |
| L21-15 | später: **Text der Lehrkraft** lokal eintippen und im Tandem nutzen; Weitergabe per Code erst nach rechtlicher Prüfung                                             | Text aus dem Unterricht                                                   | M     | kein                               | Übergabe um Elementart Text (Entsch. 42) | 42; RL-8 sinngemäß                   |

**Reihenfolge** [Empfehlung]: L21-1, L21-2, L21-3 und L21-4 zuerst. Sie
brauchen keine Prüfzeit und passen zur reichlich vorhandenen Erprobungszeit
im Unterricht (Antwort Frage 6). Danach L21-5, L21-6 und L21-7, dann L21-8 und
L21-10, zuletzt L21-9. Rechtschreibung bleibt nach Antwort Frage 7 vorn; die
Prüfzeit für L21-6 konkurriert mit Rolle 20 und muss im Roadmap-Plan gerechnet
werden.

**Zum Bestand:** Wiederholtes Lesen braucht wenige Texte, die oft gelesen
werden. Ein Block von vier Wochen mit zwei Texten pro Woche braucht acht Texte
je Stufe [Vermutung, abgeleitet aus Q8]. 10 Texte je Stufe reichen für einen
Block und eine Auswahl. Mehr erst nach Erprobung.

**Woher die Texte kommen:**

| Quelle                                        | Lizenz                                 | Eignung                                             |
| --------------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| selbst erstellt, KI zur Entwicklungszeit      | eigene Wahl, Vorschlag CC BY-SA 4.0    | höchste Passung; Prüfaufwand L                      |
| Textbox-Texte                                 | eigen                                  | nur Grundlagenstufe, nach Prüfung                   |
| Klexikon, MiniKlexikon (Sachtexte für Kinder) | CC BY-SA (laut Sekundärquelle, Q17)    | Ideen und Fakten für Sachtexte; kindliche Ansprache |
| Wikisource, gemeinfreie Texte                 | gemeinfrei bzw. CC BY-SA (Bericht 12)  | gering, Sprache veraltet                            |
| FiLBY, ISB, Länderpakete                      | Lizenz ungeprüft                       | nur verlinken                                       |
| Lesebuch der Schule                           | geschützt; § 60a Abs. 3 UrhG zu prüfen | nur auf Papier mit dem Tandem-Begleiter             |

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                        | Grund                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Spracherkennung, auch lokal                        | KI zur Laufzeit, Mikrofon, RL-9 und RL-10; Fehlerkennung bei schwachen Lesern unzuverlässig [Vermutung]                  |
| Aufnahmen der Kinderstimme                         | RL-10; Pflege von Löschfristen; geteilte Geräte                                                                          |
| Buchquiz wie Antolin, Punktabzug                   | Buchinhalte urheberrechtlich heikel (Bericht 11), Entscheidung 10, Wirkung unbelegt (Q15)                                |
| Normwerte, „Lesealter“, Ampel „unter Durchschnitt“ | keine belastbaren deutschen Normen gefunden (Q19, uneinheitlich); RL-13; Levumi leistet das                              |
| Lesetempo als Ziel („schneller lesen“)             | Flüssigkeit heißt auch genau und betont (Q7); Tempo allein verleitet zum Überfliegen [Vermutung]                         |
| Freie Antworten auswerten                          | braucht KI zur Laufzeit                                                                                                  |
| Ranglisten nach gelesenen Texten                   | RL-6, Entscheidung 10                                                                                                    |
| große Textbibliothek                               | Prüfzeit und Pflege zählen doppelt; Wiederholen braucht wenige Texte                                                     |
| automatische Stufe nach gemessener Zeit            | Messung ohne Zuhören ist zu ungenau für eine Steuerung                                                                   |
| Wortweises Mitlesen über `boundary`-Ereignisse     | Safari meldet teils nur Sätze, nicht Wörter (Q18, ungeprüft); satzweises Vorlesen (L21-4) reicht                         |
| Silbenmarkierung jetzt                             | Silbendaten fehlen im Repository; automatische Trennung folgt Schreibsilben, nicht Sprechsilben [Vermutung]; Prüfaufwand |

## 7. Offene Entscheidungen für den Entwickler

| Nr.   | Frage                                                                                                                    | Empfehlung                                                                                                                                       | Ohne Entscheidung                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| E21-1 | Sollen Tandem-Begleiter, Chorlesen und Wort-Blitz als erster Lesebaustein kommen, noch vor eigenen Texten?               | Ja. Kein Prüfaufwand, sofort im Unterricht erprobbar.                                                                                            | Lesen wartet auf den Textbestand und damit auf Prüfzeit.       |
| E21-2 | Dürfen 8 bis 10 Stunden Prüfzeit für 30 Lesetexte eingeplant werden, und wann gegenüber der Rechtschreibung?             | Ja, verteilt über ein Halbjahr, nach den ersten Rechtschreibinhalten.                                                                            | Kein Lesen allein mit eigenem Text; nur Tandem und Tafel.      |
| E21-3 | Soll „Stimmt das?“ im Live-Raum einen Countdown haben?                                                                   | Countdown als Spielgefühl, Klassensumme, keine Einzelwertung; Lesezeit nach Stufe, damit schwache Leser mitkommen (Entsch. 10, 39, 47; Frage 5). | Rolle 24 entscheidet allgemein; Lesen übernimmt das Ergebnis.  |
| E21-4 | Zeigt Lernraum „Wörter pro Minute“?                                                                                      | Nur im Tandem, nur als eigener Vergleich, nicht im Kurzbericht, solange S1 offen ist.                                                            | Nur Lesezeit in Minuten, keine Wörterzahl.                     |
| E21-5 | Kommt Lesen in die Tagesportion (Entscheidung 57)?                                                                       | Nicht in die 20 Aufgaben; eigene Kachel; später als Lesezeit im Tagestraining.                                                                   | Lesen bleibt freies Üben.                                      |
| E21-6 | Werden die Textbox-Texte nach Prüfung auch als Lesetexte der Grundlagenstufe genutzt?                                    | Ja, gekennzeichnet „Grundlagen“, nicht für Jugendliche.                                                                                          | Die Grundlagenstufe braucht eigene Texte.                      |
| E21-7 | Soll der Vorlese-Knopf (`ReadAloudButton`) wieder an Aufgaben stehen, und sollen alle Sprachausgaben `localOnly` nutzen? | Ja zu `localOnly` überall (R12-10); Knopf in den Leseaufgaben einsetzen (erlaubt nach Entsch. 58).                                               | Texte können an Netzwerkstimmen gehen; Knopf bleibt ungenutzt. |
| E21-8 | Dürfen Lehrkräfte Texte aus dem Lesebuch eintippen und per Code an die Klasse geben?                                     | Lokal ja; Weitergabe erst nach Prüfung von § 60a Abs. 3 UrhG (Juristin, Bericht 12).                                                             | Lesebuchtexte nur auf Papier mit dem Tandem-Begleiter.         |

**Annahmen dieses Berichts:** Stifte spielen keine Rolle. Stimmen auf
Schulgeräten sind ungeprüft (Bericht 10, 7.4). Zielgruppe ist die bayerische
Mittelschule mit Grundlagen aus der Grundschule (Antwort Frage 1). Alles
funktioniert ohne Namen und ohne Förderangaben (Antwort Frage 4).

**Nicht geprüft:** Originaltexte aller Studien; Inhalt und Lizenz von FiLBY,
ISB- und Länderpaketen; Lizenzseite des Klexikons; aktuelles Levumi-Angebot;
Verhalten der Gerätestimmen auf Schul-iPads und Chromebooks; die 35 nicht
gelesenen Textbox-Texte im Einzelnen.

## Quellen

Alle abgerufen am 10.11.2026, ausschließlich als Suchauszug.

| Nr. | Inhalt                                    | Adresse                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | IGLU 2021                                 | https://www.bmftr.bund.de/SharedDocs/Pressemitteilungen/DE/2023/05/160523-IGLU21.html                                                                                                                                                                                                                                           |
| Q2  | PISA 2022, Ländernotiz                    | https://www.oecd.org/pisa/publications/Countrynote_DEU_German.pdf                                                                                                                                                                                                                                                               |
| Q3  | IQB-Bildungstrend 2022                    | https://www.kmk.org/aktuelles-1/artikelansicht/iqb-bildungstrend-2022-kompetenzrueckgaenge-in-deutsch-aber-weitere-fortschritte-in-englisch.html; https://www.bllv.de/fileadmin/BLLV/Download/Themen/Leistung/Zusammenfassung_IQB_2022_Klasse_9_Bayern.pdf                                                                      |
| Q4  | IQB-Bildungstrend 2024                    | https://www.iqb.hu-berlin.de/media/documents/IQB_Bildungstrend2024_Pr%C3%A4sentationsfolien-7.pdf                                                                                                                                                                                                                               |
| Q5  | National Reading Panel, Kapitel Fluency   | https://www.nichd.nih.gov/sites/default/files/publications/pubs/nrp/Documents/ch3.pdf                                                                                                                                                                                                                                           |
| Q6  | Lauer-Schmaltz, Rosebrock, Gold 2014      | https://www.pedocs.de/volltexte/2019/17152/pdf/Didaktik_Deutsch_2014_37_Lauer-Schmaltz_et-al_Lautlesetandems_in_der_Grundschule.pdf                                                                                                                                                                                             |
| Q7  | Fadler, Böhme 2018, Lautlesetandems       | https://www.uni-potsdam.de/fileadmin/projects/inklusion/PDFs/ZEIF-Blog/Fadler_B%C3%B6hme_2018_Lautlesetandems.pdf                                                                                                                                                                                                               |
| Q8  | ISB, Lesetandem und Kombiverfahren        | https://www.lesen.bayern.de/fileadmin/user_upload/Lesen/Methoden/Einzelphasen/Lautleseverfahren_Lesetandem.pdf; https://www.lesen.bayern.de/fileadmin/user_upload/Lesen/Methoden/gesamter_Leseprozesse/Lautleseverfahren_Kombi.pdf                                                                                              |
| Q9  | FiLBY, FiLBY-SEK                          | https://www.km.bayern.de/lernen/schularten/grundschule/schulprofile-und-programme; https://www.isb.bayern.de/fileadmin/user_upload/Realschule/Infobriefe/Deutsch/infobrief_d_2021.pdf; https://www.uni-regensburg.de/sprache-literatur-kultur/fakultaet/ags/didaktik-der-deutschen-sprache-und-literatur/forschung/lesedidaktik |
| Q10 | Berlin-Brandenburg, Trainingspaket C      | https://bildungsserver.berlin-brandenburg.de/fileadmin/bbb/themen/sprachbildung/Lesecurriculum/Lesefluessigkeit/Lesefluessigkeit_Trainingspaket_C_2024-11-24.pdf                                                                                                                                                                |
| Q11 | „Lesen macht stark“, Sekundarbereich      | https://bildungsportal-niedersachsen.de/fileadmin/2_Portale/Lesefoerderung/Das_Wichtigste_zu_LMS_NDS_Sekundarbereich_2024_03.pdf                                                                                                                                                                                                |
| Q12 | Walter 2020, Textdetektive                | https://www.pedocs.de/volltexte/2021/21614/pdf/ESP_2020_4_Walter_Verbesserung_des_Leseverstaendnisses.pdf                                                                                                                                                                                                                       |
| Q13 | EEF Toolkit, Reading comprehension        | https://educationendowmentfoundation.org.uk/news/latest-updates-to-the-toolkit/                                                                                                                                                                                                                                                 |
| Q14 | Cheung, Slavin 2013                       | https://learntechlib.org/p/133202                                                                                                                                                                                                                                                                                               |
| Q15 | Meier 2019, Antolin                       | https://www.peterlang.com/document/1058723                                                                                                                                                                                                                                                                                      |
| Q16 | Levumi                                    | https://bildung.rlp.de/fileadmin/user_upload/studienseminar.rlp.de/fs-kl/DiBi-Toolbox/Karteikarten/Diagnostik/DIAGNOSTIK_Levumi.pdf; https://epub.uni-regensburg.de/47843/1/SiWol_Jungjohann_Gebhardt.pdf                                                                                                                       |
| Q17 | Klexikon                                  | https://en.wikipedia.org/wiki/Klexikon                                                                                                                                                                                                                                                                                          |
| Q18 | `boundary`-Ereignis, Browserunterstützung | https://caniuse.com/mdn-api_speechsynthesisutterance_boundary_event                                                                                                                                                                                                                                                             |
| Q19 | Richtwerte Lesetempo (uneinheitlich)      | https://www.bildung-lsa.de/files/eb6f117b6ed6bc0b94db87e77676b3bb/Klassenstufe5_6_Lesen.pdf                                                                                                                                                                                                                                     |
