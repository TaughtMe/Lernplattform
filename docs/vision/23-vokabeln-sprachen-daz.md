# Vision Lernraum – Rolle 23: Vokabeln, Fremdsprachen und Deutsch als Zweitsprache

Stand: 10.11.2026. Geprüft am Code der Version 0.9.7 (Arbeitsstand `5781803`),
an den Berichten 10, 11 und 12, am Entscheidungsprotokoll und am Vault. Es
gelten die Antworten des Entwicklers vom 09. und 10.11.2026 (`01-planung.md`,
Abschnitt 4). Gewicht nach Auftrag des Entwicklers: Grundwortschatz Englisch
und die Trennung vom Lehrwerk-Wortschatz. DaZ (Deutsch als Zweitsprache) steht
auf der Warteliste (Antwort Frage 7) und wird hier nur als spätere Etappe
skizziert.

Kennzeichnung: [Beleg] Repository, [Fachstand] Forschung oder anerkannte
Praxis mit Quelle, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag
dieser Rolle. Webangaben stammen aus Suchergebnissen mit Auszügen, abgerufen am
10.11.2026. Der Abruf von `lehrplanplus.bayern.de` wurde vom Netz der Sitzung
abgewiesen; Lehrplanangaben sind deshalb **nicht am Original geprüft**.

## 1. Kurzfazit

1. Die LernBox ist technisch fertig für einen mitgelieferten Wortschatz, aber
   ihr Eintrag kennt nur Vorder- und Rückseite und einen Tag. Für Sätze,
   Wortart und Formen fehlt das Datenformat; das ist die eigentliche Vorarbeit.
2. Ein erster Grundwortschatz Englisch sollte klein sein: rund 250 Einträge
   „Grundlagen“ (Grundschulniveau, Zahlen, Unterrichtssätze) für Kinder der
   Mittelschule mit Lücken, danach in Lieferungen von je 100 Einträgen bis
   etwa 1 000. Gegliedert nach Thema und Stufe, geordnet nach Häufigkeit.
3. Als freie Quelle für Auswahl und Reihenfolge eignet sich die New General
   Service List (NGSL, CC BY-SA 4.0). Wörter, Sätze und Lücken schreiben wir
   selbst. Lehrwerk-Listen, Oxford- und Cambridge-Listen fließen nicht ein.
4. Prüfzeit: Ein Eintrag mit Wortpaar, Wortart und einem Lückensatz kostet die
   Lehrkraft etwa 1 bis 1,5 Minuten, also 1,5 bis 2,5 Stunden je 100 Einträge
   [Vermutung]. Mit zwei Prüfstunden pro Woche sind 250 Einträge in gut zwei
   Wochen geprüft.
5. Der Lehrwerk-Import ist schon gut (Vorlage, Vorschau, Alternativen,
   Bibliotheksdatei, Code). Es fehlen eine Satzspalte und die Verknüpfung mit
   Einträgen, die es im Grundwortschatz schon gibt. Ein öffentlicher Tauschort
   bleibt ausgeschlossen (RL-8).
6. Didaktisch fehlen Lückensatz, Hörmodus, Formenreihen und ein kurzes
   „Kennenlernen“ vor dem Abruf. Alles geht ohne Spracherkennung und ohne KI.
7. Der größte Hebel für den Live-Raum: Mit mitgeliefertem Wortschatz startet
   eine Vokabelrunde so spontan wie das Kopfrechnen.
8. Befund: Die LernBox und der Live-Raum rufen die Sprachausgabe am lokalen
   Stimmenfilter vorbei auf. Bericht 10 („nur Gerätestimmen“) stimmt dort nicht.
9. Weitere Sprachen und DaZ sind später sinnvoll, scheitern heute aber nicht an
   der Technik, sondern an der Prüfzeit. Für DaZ-Brückensprachen braucht es
   muttersprachliche Prüferinnen.

## 2. Ist-Stand in Lernraum

### 2.1 Was es gibt

| Bereich              | Stand                                                                                                                                                        | Beleg                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Karteneintrag        | Frage, Antwort, ein Tag, Quelle, Stände je Richtung, `sourceLinks` für mehrere Herkünfte                                                                     | `src/domain/learning-box.ts`, Z. 50–78                                                                      |
| Übergabeformat       | Vokabel mit `prompt`, `answer` (Text, Sprache, Alternativen) und Tags; streng geprüft, keine weiteren Felder                                                 | `src/domain/learning-bundle.ts`, Z. 39–62                                                                   |
| Import               | Tab oder Semikolon, „\|“ für Alternativen, dritte Spalte Tag, ab der vierten wird verworfen; Vorlage mit BOM, Kopfzeilenerkennung, Komma nur auf Bestätigung | `src/domain/vocabulary-import.ts`, Kopfkommentar; Welle 1, V-1 bis V-4                                      |
| Antwortprüfung       | Typografische Varianten gleichgesetzt, Alternativen über „\|“, „/“ und Klammern                                                                              | `src/domain/answer-normalization.ts`, Z. 1–80                                                               |
| Wiederholung         | Leitner 1/3/7/14/30 je Richtung, kein Aufstieg vor Fälligkeit, Selbsteinschätzung höchstens Box 3, Rückstufung nach 14 Tagen Überfälligkeit                  | `src/domain/spaced-repetition.ts`, Z. 132–148; Entscheidung 57; `docs/umsetzungsplan-lernbox-schonfrist.md` |
| Modi                 | Schreiben und „Mündlich“ (Aufdecken mit Selbsteinschätzung, „zählt bis Box 3“), Richtung fest oder gemischt                                                  | `app/views/lernbox/parts/start-sheet.tsx`, Z. 56, 72                                                        |
| Fehlerrunde          | „Meine Fehler“ über alle Stapel (Karten, die nach einem Abruf in Box 1 liegen)                                                                               | `app/components/learning-box-app.tsx`, Z. 111–117, 381–383; `app/views/lernbox/parts/home.tsx`, Z. 61–69    |
| Tagesportion         | höchstens 4 neue Karten am Tag, ohne Rückstand bis 10                                                                                                        | `src/domain/daily-plan.ts`, Z. 14                                                                           |
| Lehrkraft            | Ablage mit Vokabelpaketen, Auswahl nach Paket und Tag fürs Laufdiktat, Bibliotheksdatei (JSON), Übergabe per Code oder QR für 24 Stunden                     | `src/domain/teacher-content-library.ts`; `vocabulary-catalog.ts`; Entscheidung 42                           |
| Live-Raum            | Vokabel-Laufdiktat; Übernahme in die LernBox mit Platzierung nach Ergebnis; Stationsmodus übernimmt nie; Schreiberleichterung nur hier                       | `src/domain/live-vocabulary-placement.ts`; Entscheidungen 49, 50                                            |
| Sprachausgabe        | Stimmenwahl mit Qualitätsbonus, Kurzcode `en` → `en-GB`; Filter auf lokale Stimmen nur über `speak(…, { localOnly: true })`                                  | `src/speech/voices.ts`, Z. 13–18; `src/speech/speaker.ts`, Z. 92–99, 166                                    |
| Mitgelieferte Wörter | **keine Vokabeln**                                                                                                                                           | Bericht 10, 2.2                                                                                             |

### 2.2 Was fehlt

- Kein Feld für Wortart, Formen, Beispielsatz, Lückensatz, Bild oder Thema
  jenseits des Tags [Beleg: Schemata oben].
- Kein Kartentyp mit mehr als zwei Seiten, also keine Formenreihe wie
  „go – went – gone“ [Beleg].
- Kein Hörmodus in der LernBox, der nur das gesprochene Wort zeigt. Den gibt es
  nur im Wortspeicher als Stufe 6 für Deutsch (Entscheidung 55).
- Kein mitgelieferter Bestand, also auf einem fremden Gerät keine Vokabelarbeit
  ohne Lehrkraft (Bericht 10, Abschnitt 4).
- Dubletten: Der Fingerabdruck vergleicht nur Vorder- und Rückseite; eine Karte
  in umgekehrter Richtung gilt als neu (Entscheidung 49, „Bekannte Grenzen“).
  Entscheidung 40 verlangt den Abgleich über Sprachpaar, Grundform und
  Bedeutung; das ist offen (`docs/inhalte/lernbox.md`, „Offene fachliche
  Punkte“).

### 2.3 Was falsch oder veraltet ist

| Stelle                                                                                | Aussage                                   | Befund                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bericht 10, Abschnitt 5, Zeile „Sprachausgabe“; `01-planung.md`, K13                  | „nur Gerätestimmen“                       | **Stimmt nicht überall.** `say()` in der LernBox (`learning-box-app.tsx`, Z. 349–356), der Live-Raum (`app/raum/spiel/live-game.tsx`, Z. 631–633) und der Stationsmodus (`station-game.tsx`, Z. 138–141) rufen `speechSynthesis` direkt auf, ohne den Filter `localService`. Chrome kann dann eine Netzstimme wählen, und der Text geht an einen Server [Vermutung, im Browser ungeprüft]. Das berührt B-012 und RL-9. |
| `docs/inhalte/lernbox.md`, „Im Design gezeigt“; `01-planung.md`, 1.3; `00-auftrag.md` | stapelübergreifende Fehlerrunde fehlt     | **Veraltet.** „Meine Fehler“ ist gebaut (Belege in 2.1).                                                                                                                                                                                                                                                                                                                                                               |
| `createLearningBoxDeck` und `voices.ts`                                               | Standard `en-US`, Kurzcode `en` → `en-GB` | Uneinheitlich. Für bayerische Schulen ist britisches Englisch üblich [Vermutung].                                                                                                                                                                                                                                                                                                                                      |

## 3. Fachstand und Vorbilder

### 3.1 Wortschatzarbeit

| Aussage                                                                                                                                                                                                                        | Einordnung                                                   | Quelle                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Bewusstes Lernen mit Wortkarten, Listen, Schreiben und Lückensätzen wirkt, aber unzuverlässig: sofort etwa 60 % Abruf der Bedeutung, verzögert 39 %; beim Abruf der Form 58 % und 25 %. Lernrichtung beeinflusst das Ergebnis. | [Fachstand] Metaanalyse, 22 Studien                          | Webb, Yanagisawa & Uchihara 2020, Modern Language Journal 104(4); Auszug über x-mol.com/paper/1341861690617110528 |
| Wortkarten am Rechner sind nützlich; entscheidend sind Abruf, Abstand und Rückmeldung.                                                                                                                                         | [Fachstand]                                                  | Nakata 2008, ReCALL (cambridge.org, Artikel S0958344008000219); Nakata 2011, CALL 24, 17–38                       |
| Abruf festigt besser als Wiederlesen; verteilte Wiederholung besser als gebündelte.                                                                                                                                            | [Fachstand] gut gesichert                                    | Audit, `agent-d-paedagogik.md`, Abschnitt Abrufübung, mit Belegen                                                 |
| Rezeptiv vor produktiv: Erst Bedeutung erkennen, dann Form abrufen. Form-Abruf ist schwerer und fällt stärker ab.                                                                                                              | [Fachstand], gestützt durch die Zahlen oben                  | Webb u. a. 2020                                                                                                   |
| Wörter in Wendungen und Kollokationen (feste Wortverbindungen wie „make a mistake“) lernen.                                                                                                                                    | [Fachstand], anerkannte Praxis; Einzelstudien hier ungeprüft | Nation, Learning Vocabulary in Another Language (Buch, hier nicht geprüft)                                        |
| Eigene Beteiligung (Satz bilden, Lücke füllen) hilft beim beiläufigen Lernen; wie stark, ist umstritten.                                                                                                                       | [Fachstand], umstritten                                      | Metaanalyse zur Involvement Load Hypothesis, Language Learning, DOI 10.1111/lang.12444 (nur Titel geprüft)        |

Folge für Lernraum [Empfehlung]: Die LernBox macht das Wichtigste richtig
(Abruf, Abstand, Richtungen getrennt). Was fehlt, ist der Satz: Ein Wort wird
im Satz eingeführt, im Lückensatz abgerufen und erst danach frei geschrieben.

### 3.2 Lehrplan

- Englisch beginnt in Bayern in Jahrgangsstufe 3 mit zwei Stunden. Für 3/4
  nennt eine Präsentation der Universität Bamberg einen verbindlichen
  Wortschatz von 150 Wörtern plus Zahlen und eine Liste von Classroom Phrases
  (vc.uni-bamberg.de, Suchauszug; ISB, Fachlehrplan Englisch 3/4 aktualisiert,
  isb.bayern.de). Schwerpunkt der Grundschule ist Hören und Sprechen (Audit,
  `agent-e-schularten.md`, Z. 265).
- Mittelschule: Ein Lehrplanvergleich von Klett nennt für LehrplanPLUS „550
  Wörter und Wendungen“ statt 600 (static.klett.de, Mittelschule BY
  Lehrplanvergleich Englisch). Für welche Jahrgangsstufe die Zahl gilt, zeigt
  der Auszug nicht. Themen der Jahrgangsstufe 5 sind Alltag: Familie, Freunde,
  Haustiere, Tagesablauf, Mahlzeiten. **Ungeprüft am Original.**
- Die Lehrplanzahlen sind ein Bezug, keine Wortliste. Die Grundschulliste wird
  nicht 1:1 übernommen (Bericht 12, E-5 sinngemäß).

### 3.3 Freie Quellen für den Grundwortschatz Englisch

| Quelle                                  | Inhalt                                             | Lizenz                                                                                                                                          | Verwendung                                                                                |
| --------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| NGSL 1.2 und NGSL-Spoken                | rund 2 800 häufigste Wörter; gesprochene Teilliste | CC BY-SA 4.0 laut Projektseite (newgeneralservicelist.com), auch kommerziell; genaue Version im Fußtext ungeprüft                               | [Empfehlung] Auswahl und Reihenfolge; Namensnennung; ShareAlike passt zu E-3 (Bericht 12) |
| CEFR-J Wordlist                         | Wörter mit Niveau A1 bis B2                        | „kostenfrei für Forschung und kommerziell mit Zitat“ (github.com/openlanguageprofiles/olp-en-cefrj); keine CC-Lizenz; **am Original ungeprüft** | nur intern zur Niveauprüfung, keine Niveauwerte ausliefern (wie childLex, RL-7)           |
| Oxford 3000, English Vocabulary Profile | Wörter mit Niveau                                  | Verlagsrecht, keine freie Lizenz [Vermutung]                                                                                                    | nicht verwenden                                                                           |
| Dolch-Liste                             | 220 Sichtwörter, USA 1948                          | **Lizenz ungeprüft**                                                                                                                            | nicht nötig; Lesewörter für Erstleser, nicht für Fremdsprache                             |
| Tatoeba (Sätze EN–DE)                   | Beispielsätze                                      | CC BY 2.0 FR, teils CC0 (Bericht 12, 3.5)                                                                                                       | nur als Ideenquelle; selbst formulierte Sätze sind leichter zu prüfen [Vermutung]         |
| Wiktionary                              | Bedeutungen, Aussprache                            | CC BY-SA 4.0 (Bericht 12)                                                                                                                       | Nachschlagen beim Erstellen                                                               |
| OpenMoji                                | Bilder für konkrete Nomen                          | CC BY-SA 4.0 (Bericht 12)                                                                                                                       | optional, nur eindeutige Bilder                                                           |
| Gerätestimme `en-GB`, nur lokal         | Aussprache zur Laufzeit                            | keine Inhaltslizenz nötig                                                                                                                       | Standard; vorher den Befund in 2.3 beheben                                                |

### 3.4 Vorbilder

| Angebot             | Was es gut macht                                                  | Was Lernraum nicht übernimmt                                                                             | Quelle                                           |
| ------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| phase6              | Lehrwerkgenaue Vokabelpakete der Verlage (Klett, Cornelsen u. a.) | Diese Pakete sind lizenziert und meist kostenpflichtig. Genau das kann Lernraum nicht mitliefern (RL-8). | phase6.de, klett-sprachen.de/phase6 (Suchauszug) |
| Anki                | Lückentext-Karten, freie Planung, lokal                           | Für Kinder schwer bedienbar [Vermutung]; FSRS-Wechsel nicht (Bericht 11)                                 | Bericht 11                                       |
| Quizlet             | Riesiger Fundus geteilter Karteien                                | Offener Tauschort mit Lehrwerk-Listen (RL-8); Bezahlstufen                                               | Bericht 11                                       |
| Duolingo (Sprachen) | Satzbasiertes Lernen mit Hören                                    | Kursbaum, Konto, Serien; Stand ungeprüft (Bericht 11)                                                    | –                                                |

Lehre [Empfehlung]: Der Markt trennt bereits so, wie der Entwickler es will.
Verlage verkaufen den Lehrwerk-Wortschatz. Ein freier, lehrwerkunabhängiger
Grundwortschatz mit Sätzen und ohne Konto ist die Lücke, die Lernraum füllen
kann.

## 4. Zielbild

Gegliedert nach den vier Schichten des Entwicklers.

### 4.1 Schicht 1: Grundwortschatz Englisch, mitgeliefert

**Kind.** Unter „Üben → Englisch“ liegen fertige Themen: „Zahlen und Zeit“,
„Schule“, „Familie und Freunde“, „Essen“, „Mein Tag“, „Freizeit“ und weitere.
Jedes Thema hat 20 bis 30 Einträge in zwei Stufen: „Grundlagen“
(Grundschulniveau) und „Klasse 5/6“. Eine Runde hat drei Teile:

1. **Kennenlernen** (neu): Wort hören, Satz lesen, Bild bei konkreten Nomen,
   Bedeutung aus drei wählen. Zählt nicht als Abruf.
2. **Abrufen**: Lückensatz, dann Deutsch → Englisch schreiben, dann
   Englisch → Deutsch.
3. **Fehler wiederholen** am Ende derselben Runde.

Mit „In meine LernBox“ übernimmt das Kind ein Thema. Ab dann führt es die
Tagesportion wie jede Karte (höchstens 4 neue am Tag, Entscheidung 57).

**Lehrkraft.** Sie sieht dieselben Themen in der Ablage, kann sie in den
Live-Raum legen oder per Code weitergeben, ohne etwas zu tippen.

**Gliederung.** Thema (Lebenswelt Jahrgang 5 bis 7), Stufe (Grundlagen,
Klasse 5/6, Klasse 7/8), innerhalb des Themas nach Häufigkeit (NGSL). Keine
Einheiten eines Lehrwerks, keine Reihenfolge eines Lehrwerks.

**Umfang.** Erste Lieferung 250 Einträge „Grundlagen“; dann je 100 pro Monat
bis etwa 1 000. Mehr nicht, solange die Prüfzeit knapp ist.

**Beispiel: vollständiger Eintrag Grundwortschatz Englisch**

```text
id:           en-core-food-012
revision:     1
thema:        Essen (food)
stufe:        Grundlagen
deutsch:      das Frühstück
englisch:     breakfast
alternativen: –
wortart:      Nomen, nicht zählbar im Normalfall
wendung:      have breakfast (frühstücken)
satz:         I have breakfast at seven o'clock.
satz_de:      Ich frühstücke um sieben Uhr.
lückensatz:   I have ___ at seven o'clock.   Lösung: breakfast
aussprache:   Gerätestimme en-GB, nur lokal
bild:         OpenMoji „Brot und Tasse“ (CC BY-SA 4.0) – optional
quelle:       Auswahl nach NGSL (CC BY-SA 4.0); Satz selbst erstellt
lizenz:       CC BY-SA 4.0 (Inhaltspaket, Entscheidung E-3 aus Bericht 12)
geprüft:      Lehrkraft, Datum
```

Pflicht sind Wortpaar, Wortart, ein Satz mit Lücke und die Quelle. Bild und
Wendung sind optional. Unregelmäßige Formen stehen als eigenes Feld
(`formen: go – went – gone`) und speisen die Formenreihe (R23-9).

**Prüfzeit je 100 Einträge** [Vermutung, an der Erprobung zu messen]:

| Umfang des Eintrags                     | Minuten je Eintrag | Stunden je 100 |
| --------------------------------------- | ------------------ | -------------- |
| nur Wortpaar mit Alternativen           | 0,3–0,5            | 0,5–0,8        |
| plus Wortart und Formen                 | 0,5–0,7            | 0,8–1,2        |
| plus ein Satz und Lückensatz (Standard) | 1–1,5              | 1,5–2,5        |
| plus Bild                               | 1,2–1,8            | 2–3            |

Entwürfe entstehen zur Entwicklungszeit mit KI, mit zwei Regeln, die die
Prüfung abkürzen: Sätze verwenden nur Wörter aus Stufe und Thema darunter, und
jede Lücke hat genau eine sinnvolle Lösung. Ein Prüfskript meldet vor der
Lehrkraft Lücken mit mehreren passenden Wörtern im selben Thema.

### 4.2 Schicht 2: Lehrwerk-Wortschatz, durch die Lehrkraft

**Lehrkraft, Ziel fünf Minuten je Unit:** Liste aus dem eigenen Material in
Excel oder Sheets tippen oder einfügen, Vorschau prüfen, speichern. Neu:

- Optionale vierte Spalte „Satz“ mit `___` für die Lücke. Bleibt sie leer,
  übt das Kind ohne Lückensatz.
- Hinweis in der Vorschau: „12 dieser Wörter gibt es schon im Grundwortschatz.
  Verknüpfen?“ Dann zählt ein Lernstand für beide Herkünfte (Entscheidung 40,
  Feld `sourceLinks` ist schon da).
- Weitergabe wie heute: Code an die eigene Klasse, Bibliotheksdatei an
  Kolleginnen der Schule. Beim Teilen ein kurzer Hinweis: „Nur für deine
  Klasse oder Schule. Nicht veröffentlichen.“

Tipp ohne Code: Auf dem iPad lässt sich Text aus einem Foto der eigenen
Vorlage kopieren (Systemfunktion, nicht Lernraum) [Vermutung, Gerätestand
ungeprüft].

**Kind:** merkt keinen Unterschied, außer der Herkunft am Stapel
(„Lehrkraft“ statt „Lernraum“).

**Rote Linien:** Kein Katalog „Lehrwerk X, Unit 3“ auf einem Server, keine
mitgelieferten Lehrwerk-Listen (RL-8). Ob eine vollständige Lektionsliste ein
„wesentlicher Teil“ nach § 87b UrhG ist, bleibt zu prüfen (Bericht 12, 3.3).

### 4.3 Schicht 3: Weitere Sprachen, später

Die Technik ist sprachneutral (Sprache je Stapelseite, Stimmenwahl je Sprache,
`src/speech/voices.ts` kennt `fr`, `es`). Was sich ändert:

| Thema    | Französisch, Spanisch                                 | Latein                                                        |
| -------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Schrift  | Akzente (é, ñ); Eingabehilfe mit Tasten über dem Feld | keine Akzente                                                 |
| Prüfung  | Schalter „Akzent zählt“; Standard ja [Empfehlung]     | –                                                             |
| Genus    | Artikel als Pflichtfeld (le/la, el/la)                | Genus und Stammformen; Formenreihe zwingend                   |
| Stimme   | auf vielen Geräten vorinstalliert [Vermutung]         | keine Stimme; Hörmodus entfällt                               |
| Didaktik | wie Englisch, mit Sätzen                              | Lesen und Übersetzen, Formen; passt schlechter zum Paarmodell |

**Reihenfolge** [Empfehlung]: Französisch vor Spanisch, Latein zuletzt.
Bundesweit lernen etwa 1,29 Millionen Kinder Französisch (2021/22,
dserver.bundestag.de, Drucksache 20/9827, auf Basis Destatis); als zweite
Fremdsprache folgen Latein und Spanisch (studienkreis.de nach Destatis, Jahr
ungenannt). Für die bayerische Mittelschule ist Englisch die Fremdsprache;
eine zweite spielt dort kaum eine Rolle [Vermutung, ungeprüft]. Weitere
Sprachen nützen also vor allem Kolleginnen an Realschule und Gymnasium, nicht
der Zielgruppe. Das spricht dafür, sie nach dem Schulamtsbezirk anzugehen.

**Stimmen auf Schul-iPads prüfen.** Safari zeigt nur vorinstallierte Stimmen,
nachgeladene oft nicht; die Liste ändert sich mit iPadOS-Versionen
(developer.apple.com/forums/thread/723503, Suchauszug). Prüfweg: eine kleine
Seite im Lehrerbereich „Stimmen dieses Geräts“, die `getVoices()` mit Sprache
und `localService` auflistet und je Sprache einen Probesatz spricht. Eine
Lehrkraft öffnet sie auf drei Geräten des Koffers und notiert das Ergebnis.
Kosten: S, keine Daten verlassen das Gerät.

### 4.4 Schicht 4: Deutsch als Zweitsprache, Warteliste

Nur die Leitplanken für später:

- **Eigener Bereich**, nicht die LernBox mit anderer Sprache. Bildwortschatz
  des Schulalltags (Klassenzimmer, Körper, Essen, Wege), immer mit Artikel und
  Plural, gesprochen, mit Bild. Abruf zuerst über Bild und Hören, Schreiben
  später.
- **Herkunftssprache als Brücke**: eine Übersetzung als ausklappbare Hilfe je
  Stapel, nie als Profilmerkmal des Kindes (RL-2). Quellen: Wiktionary
  (CC BY-SA), Lehrkraft, Sprachmittler. Prüfen kann sie nur, wer die Sprache
  spricht. Das ist der eigentliche Engpass.
- **Nicht oder anders alphabetisierte Kinder**: Lernraum alphabetisiert nicht.
  Für sie taugt höchstens Bild und Hören ohne Schreiben.
- **Risiken**: belastende Wörter (Krieg, Flucht, Tod) gehören nicht in den
  Bestand (Audit, `agent-e-schularten.md`, Z. 138); kein Merkmal DaZ oder
  Herkunftssprache verlässt das Gerät (RL-1).
- **Leistbar?** Ein Bildwortschatz von 150 Wörtern ohne Brückensprache ja
  (Prüfung M). Brückensprachen nur, wenn je Sprache eine Prüferin gefunden ist.

**Beispiel: vollständiger Eintrag im DaZ-Bereich**

```text
id:           daz-schule-007
revision:     1
thema:        Im Klassenzimmer
stufe:        Start
wort:         der Stuhl
artikel:      der
plural:       die Stühle
silben:       Stuhl
satz:         Ich sitze auf dem Stuhl.
lückensatz:   Ich sitze auf dem ___.   Lösung: Stuhl
bild:         OpenMoji „Stuhl“ (CC BY-SA 4.0)
aussprache:   Gerätestimme de-DE, nur lokal; später Piper „thorsten“ (CC0)
brücke:       optional je Stapel, z. B. uk: стілець – nur nach Prüfung durch
              eine Person mit Ukrainisch; sonst leer
quelle:       selbst erstellt
lizenz:       CC BY-SA 4.0
geprüft:      Lehrkraft (Deutsch), Prüferin (Brückensprache), Datum
```

### 4.5 Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“

| Lage                          | Ablauf                                                                                                                                          | Trägt es?                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Fremdes Gerät, ohne Lernstand | „Üben → Englisch → Thema → Grundlagen“. Kennenlernen (5 min), Abruf mit Lückensatz (10 min), Fehler wiederholen (5 min). Kein Konto, kein Code. | Ja, mit Schicht 1. Heute nein: ohne Lehrkraftinhalt gibt es nichts zu üben. Im Gastmodus geht das Geübte verloren. |
| Eigenes Gerät, mit Lernstand  | Übernommene Themen und Lehrwerk-Stapel laufen in der Tagesportion; „Meine Fehler“ über alle Stapel.                                             | Ja. Mit nur 4 neuen Karten am Tag füllt Englisch allein keine 20 Minuten; die Portion mischt Module.               |
| Live-Raum                     | Lehrkraft wählt Thema aus dem Grundwortschatz, Start, Code an die Tafel.                                                                        | Ja, ohne Tippen. Heute braucht die Vokabelrunde eine vorbereitete Liste.                                           |

## 5. Konkrete Bausteine

Aufwand: S bis etwa eine Woche, M zwei bis vier Wochen, L länger, je für eine
Person mit KI-Unterstützung. Prüfaufwand: Stunden der Lehrkraft für Inhalte.

### 5.1 Schicht 1: Grundwortschatz Englisch

| Nr.    | Baustein                                                                                                                         | Nutzen und Szenario                                            | Entw. | Prüfung                       | Abhängigkeiten          | Entscheidungen                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----- | ----------------------------- | ----------------------- | ------------------------------------------------------- |
| R23-1  | Wortschatzpaket als Datenformat: stabile ID, Revision, Thema, Stufe, Wortart, Formen, Satz, Lücke, Quelle, Lizenz; Quelle `core` | Grundlage für alles; Inhalte ohne Code-Release austauschbar    | M     | kein                          | Modulvertrag (Audit L1) | 40, 41 (stabile IDs, Revision); Sicherungsschema        |
| R23-2  | Grundwortschatz „Grundlagen“, 250 Einträge in 10 Themen                                                                          | Nachholen in Jahrgang 5–7; Vertretungsstunde ohne Vorbereitung | S     | M (4–6 h)                     | R23-1; Lizenz E-3       | Bericht 12, R12-12                                      |
| R23-3  | Ausbau „Klasse 5/6“ und „7/8“ in Lieferungen zu 100 bis etwa 1 000                                                               | Begleitend zum Unterricht, lehrwerkunabhängig                  | S je  | L (15–20 h über ein Halbjahr) | R23-2 erprobt           | –                                                       |
| R23-4  | Themen frei üben und „In meine LernBox“                                                                                          | Prüfstein auf fremdem Gerät                                    | M     | kein                          | R23-1, R23-2            | 41 (frei zugänglich), 57 (neue Karten)                  |
| R23-5  | Lückensatz als Abfrageform der LernBox                                                                                           | Wort im Satz abrufen statt Wortgleichung                       | M     | in R23-2 enthalten            | R23-1                   | 55 (Lückensatz nur im Wortspeicher abgelehnt) → Vorlage |
| R23-6  | Hörmodus: englisches Wort hören, Bedeutung oder Schreibung eingeben                                                              | Hören ist Kern des Grundschul- und Anfangsunterrichts          | S     | kein                          | R23-7                   | 58 (Vorlesen in der Aufgabe erlaubt)                    |
| R23-7  | Sprachausgabe an allen drei Stellen nur über lokale Stimmen; Seite „Stimmen dieses Geräts“                                       | Behebt Befund 2.3; klärt Stimmen auf Schul-iPads               | S     | kein                          | –                       | 58; B-012; RL-9                                         |
| R23-8  | „Mündlich“ erweitern: Satz laut sprechen, Vorbild anhören, selbst einschätzen                                                    | Sprechen üben ohne Spracherkennung                             | S     | kein                          | R23-7                   | 23, 57 (bis Box 3)                                      |
| R23-9  | Formenreihe als Kartentyp (unregelmäßige Verben, Plural)                                                                         | „go – went – gone“ ab Jahrgang 6                               | M     | S (100 Verben, 1–2 h)         | R23-1                   | 40 (ein Lernobjekt)                                     |
| R23-10 | „Kennenlernen“ vor dem ersten Abruf (hören, Satz, Auswahl aus drei), ohne Boxwirkung                                             | Rezeptiv vor produktiv; weniger Frust bei neuen Wörtern        | S     | kein                          | R23-2                   | 23 (Nachweisstärke)                                     |

### 5.2 Schicht 2: Lehrwerk-Wortschatz

| Nr.    | Baustein                                                                              | Nutzen und Szenario                            | Entw. | Prüfung | Abhängigkeiten          | Entscheidungen    |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- | ------- | ----------------------- | ----------------- |
| R23-11 | Import mit optionaler Satzspalte und Wortart; Vorlage erweitert                       | Lehrwerk-Wörter auch im Lückensatz             | S     | kein    | R23-1, R23-5            | Welle 1, V-2, V-3 |
| R23-12 | Verknüpfen mit Grundwortschatz statt Dublette; Abgleich über Sprachpaar und Grundform | Ein Lernstand je Wort, gleich welcher Herkunft | M     | kein    | R23-1                   | 40, 41, 49        |
| R23-13 | Hinweis beim Teilen „nur Klasse oder Schule“; keine Verlagsnamen als Vorlage          | Schützt Lehrkraft und Entwickler               | S     | kein    | –                       | RL-8              |
| R23-14 | Rechtsfrage „ganze Lektionsliste“ klären lassen (kein Code)                           | Sicherheit für das Teilen unter Kolleginnen    | –     | –       | Schulpaket (Bericht 12) | –                 |

### 5.3 Schicht 3: Weitere Sprachen

| Nr.    | Baustein                                                  | Nutzen und Szenario                     | Entw. | Prüfung                 | Abhängigkeiten       | Entscheidungen |
| ------ | --------------------------------------------------------- | --------------------------------------- | ----- | ----------------------- | -------------------- | -------------- |
| R23-15 | Akzent-Eingabehilfe, Schalter „Akzent zählt“, Artikelfeld | Französisch und Spanisch sauber üben    | S     | kein                    | R23-1                | –              |
| R23-16 | Grundwortschatz Französisch A1, 300 Einträge              | Kolleginnen an Realschule und Gymnasium | S     | M (Fachkollegin, 5–7 h) | R23-2 erprobt, R23-7 | –              |

### 5.4 Schicht 4: DaZ (Warteliste)

| Nr.    | Baustein                                                         | Nutzen und Szenario                 | Entw. | Prüfung                       | Abhängigkeiten | Entscheidungen |
| ------ | ---------------------------------------------------------------- | ----------------------------------- | ----- | ----------------------------- | -------------- | -------------- |
| R23-17 | Bildwortschatz Schule, 150 Wörter mit Artikel, Plural, Bild, Ton | Erste Wochen in Regelklasse         | M     | M (4–5 h)                     | R23-1, R23-7   | RL-1, RL-2     |
| R23-18 | Brückensprache je Stapel                                         | Verstehen über die Herkunftssprache | S     | L je Sprache, fremde Prüferin | R23-17         | RL-1, RL-2     |

### 5.5 Live-Raum

| Nr.    | Baustein                                                                                | Nutzen und Szenario                                       | Entw. | Prüfung | Abhängigkeiten       | Entscheidungen                |
| ------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----- | ------- | -------------------- | ----------------------------- |
| R23-19 | Vokabelrunde aus dem Grundwortschatz: Thema wählen, Start                               | So spontan wie Kopfrechnen; erste fünf Minuten der Stunde | M     | kein    | R23-2                | 38, 49, 52                    |
| R23-20 | Neue Formate: Hör-Blitz (Tafel spricht, alle schreiben), Lückensatz-Blitz, Formen-Blitz | Abwechslung mit denselben Daten                           | M     | kein    | R23-5, R23-9, R23-19 | 49; Tempo: Rolle 24 (Frage 5) |

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                | Grund                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Spracherkennung, Aussprachebewertung                       | RL-9; Browser-Erkennung läuft teils über Herstellerserver; Kinderstimmen werden schlecht erkannt [Vermutung] |
| Aufnahmen des Kindes speichern                             | RL-10; Sprechen mit Selbsteinschätzung reicht für die Übung                                                  |
| Lehrwerk-Listen mitliefern, öffentlicher Tauschort         | RL-8, § 87b UrhG                                                                                             |
| Niveauangaben aus CEFR-J, Oxford oder Cambridge ausliefern | Lizenz ungeprüft oder nicht frei (RL-7)                                                                      |
| KI-Übersetzung oder Satzbildung zur Laufzeit               | Rahmenbedingung 2                                                                                            |
| Kursbaum wie Duolingo, Grammatikkurs                       | Pflege doppelt; Grammatik ist Unterricht, nicht Wortschatztrainer                                            |
| Latein-Formentrainer                                       | Eigene Didaktik, außerhalb der Zielgruppe                                                                    |
| Alphabetisierung im DaZ-Bereich                            | Fachlich eigene Aufgabe, für eine Person nicht leistbar                                                      |
| Feld „Herkunftssprache“ im Kindprofil                      | RL-2                                                                                                         |
| Wechsel von Leitner auf FSRS                               | Bericht 11; Entscheidungen 20, 57                                                                            |

## 7. Offene Entscheidungen für den Entwickler

| Nr.   | Frage                                                                                                 | Empfehlung                                                                                                             | Ohne Entscheidung                                                           |
| ----- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| E23-1 | Was ist Pflicht in einem Grundwortschatz-Eintrag?                                                     | Wortpaar, Wortart, ein Satz mit Lücke, Quelle. Bild optional. Etwa 2 h Prüfung je 100.                                 | Nur Wortpaare: schnell geprüft, aber wieder Wortgleichungen.                |
| E23-2 | Darf die LernBox einen Lückensatz bekommen, obwohl Entscheidung 55 ihn im Wortspeicher nicht umsetzt? | Ja, nur für Vokabeln. Entscheidung 55 betrifft das Design 4e im Wortspeicher.                                          | Kein Kontext im Vokabeltraining.                                            |
| E23-3 | Britisches Englisch als Standard?                                                                     | Ja, `en-GB`; amerikanische Schreibung als Alternative (`colour \| color`).                                             | Standard bleibt `en-US` in der LernBox, `en-GB` in der Stimmenwahl.         |
| E23-4 | Unter welcher Lizenz stehen die Inhaltspakete (E-3 aus Bericht 12)?                                   | CC BY-SA 4.0; dann ist die NGSL nutzbar.                                                                               | Die NGSL kann nicht als Grundlage dienen; Auswahl rein nach eigenem Urteil. |
| E23-5 | Sprachausgabe überall nur mit lokalen Stimmen?                                                        | Ja, sofort (R23-7). Fehlt die Stimme, fehlt der Knopf, wie in Entscheidung 58.                                         | Text kann auf manchen Geräten an Herstellerserver gehen.                    |
| E23-6 | Teilen von Lehrwerk-Listen unter Kolleginnen: nur Datei und Code in der Schule?                       | Ja, mit Hinweis; die Rechtsfrage im Schulpaket klären lassen.                                                          | Teilen bleibt möglich, aber ohne Hinweis und ohne geklärte Grenze.          |
| E23-7 | Wann und welche zweite Sprache?                                                                       | Erst nach der Erprobung des Grundwortschatzes Englisch im Schulamtsbezirk; dann Französisch.                           | Weitere Sprachen bleiben wie heute: nur über Import.                        |
| E23-8 | Unter welcher Bedingung kommt DaZ von der Warteliste?                                                 | Wenn R23-1 und R23-7 stehen und für jede Brückensprache eine Prüferin gefunden ist; Bildwortschatz zuerst ohne Brücke. | DaZ bleibt ungeeignet für Anfänger (Audit, G, Kernaussage 3).               |

**Annahmen dieses Berichts:** Prüfzeit höchstens zwei Stunden pro Woche
(Frage 6); Stifte und Tastaturen nicht überall (Frage 2); Rechtsrahmen offen,
also keine Namen und keine Merkmale (Frage 4).

**Nicht geprüft:** Lehrplantexte am Original (Netzsperre für
`lehrplanplus.bayern.de`); genaue Lizenzversion der NGSL 1.2 und die
Bedingungen der CEFR-J am Original; Verhalten der Sprachausgabe im Browser
(Befund 2.3 ist aus dem Code abgeleitet); Stimmen auf Schul-iPads; Schülerzahlen
je Fremdsprache 2024/25 (Destatis-Tabelle 21111-0006 nicht abgerufen);
Prüfzeiten je Eintrag (Schätzung, in der Erprobung zu messen).

### Webquellen (abgerufen am 10.11.2026, Suchauszüge)

- newgeneralservicelist.com, Seiten „New General Service List 1.2“ und
  „Word Lists“
- github.com/openlanguageprofiles/olp-en-cefrj
- x-mol.com/paper/1341861690617110528 (Webb, Yanagisawa & Uchihara 2020)
- cambridge.org/core, Nakata 2008, ReCALL, Artikel S0958344008000219
- static.klett.de/assets/pondus/Mittelschule_BY_Lehrplanvergleich_Englisch.pdf
- isb.bayern.de, Englisch Fachlehrplan aktualisiert 3–4; vc.uni-bamberg.de
  (Präsentation LehrplanPLUS Grundschule)
- dserver.bundestag.de/btd/20/098/2009827.pdf; studienkreis.de,
  Pressemitteilung „Sprachen lernen“ (2023)
- developer.apple.com/forums/thread/723503;
  developer.mozilla.org, SpeechSynthesisVoice.localService
- phase6.de (Schullizenz), klett-sprachen.de/phase6
