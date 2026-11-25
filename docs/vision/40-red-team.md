# Vision Lernraum – Rolle 40: Red Team

Stand: 11.11.2026. Geprüft: die Berichte 10 bis 31, `01-planung.md` (Abschnitte 1 und 4 mit beiden Nachträgen), der Code der Version 0.9.7, das Entscheidungsprotokoll, die Wellen-Pläne 1 bis 3, die Versionsnotizen 0.9.2 bis 0.9.7 und der Abschlussbericht des Audits (Abschnitte I, J, K, M).

Kennzeichen: [Beleg] Repository, [Fachstand] Quelle außerhalb, [Vermutung] plausibel, nicht belegt, [Empfehlung] mein Vorschlag. Ein Einwand ohne Beleg ist als Meinung markiert.

**Grenzen.** WebFetch war gesperrt (kein Host erreichbar). Alle Webangaben stammen aus Suchergebnissen vom 11.11.2026. Der Git-Verlauf dieser Sitzung reicht nur bis zum 27.10.2026 zurück (110 Commits). Zur Zeit (Frage 6) gibt es keine Zahl; ich rechne mit der Annahme der Planung: sechs Stunden je Woche, davon zwei für das Prüfen von Inhalten.

Die Abschnitte 1 bis 9 folgen der Gliederung des Auftrags. Die Abschnitte 10 bis 13 enthalten die Zusatzaufträge der Hauptsitzung.

## 1. Kurzurteil

1. Die Berichte sind einzeln gut und ehrlich. Zusammen ergeben sie 146 Bausteine. Kein Bericht hat die Summe gezogen.
2. Nach dem Maßstab der Fachleute sind das 140 bis 230 Arbeitswochen, also drei bis fünf Jahre. In zwölf Monaten passt etwa ein Drittel.
3. Der Engpass ist nicht das Programmieren. Welle 3 mit fünf Paketen war in zwei Tagen gebaut [Beleg]. Der Engpass ist die Abnahme durch den Entwickler: entscheiden, im Unterricht erproben, Inhalte prüfen.
4. Dafür gibt es einen harten Beleg: Startpunkt, Training und Profil sind seit dem 05.11. „frei“ und nirgends verlinkt. Der Vorlese-Knopf steht laut Entscheidung 58 „in der Aufgabe“ und ist nirgends eingebaut. 50 Texte warten seit dem 08.10. auf die Prüfung.
5. Den Widerspruch zum Funktionsstopp des Audits hat das Gremium einzeln gelöst (Handschrift fast gestrichen, DaZ auf der Warteliste) und in der Summe überspielt. Der Modulvertrag steht in sechs Bausteinen als Abhängigkeit und gehört niemandem.
6. Der teuerste Teil, die Förderung aus Fehlermustern, nützt nur Kindern mit festem Gerät, die an mehreren Tagen üben. Wie viele das sind, weiß niemand.
7. Das Ziel „Schulamtsbezirk in zwölf Monaten“ hängt an einem Gespräch, das noch nicht geführt ist (S1). Das Impressum untersagt heute den Schulbetrieb.
8. Der Prüfstein ist mit etwa acht kleinen Bausteinen erfüllbar. Alles Weitere ist Tiefe.
9. Die Vision sollte „schmal, geprüft, im Unterricht erprobt“ versprechen, nicht „das Wissen von Anton“.
10. Mein Zuschnitt: drei Etappen, rund 65 meist kleine Bausteine, eine Inhaltslinie zur Zeit, Lesetexte und Satzformate erst im zweiten Jahr.

## 2. Faktenprüfung

### 2.1 Aussagen über den heutigen Stand (am Code geprüft)

| Bericht    | Aussage                                                                                        | Prüfung                                                                                                                                                             | Ergebnis   |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 10         | Kein Link führt zu Startpunkt, Training, Profil                                                | Suche in `app/`, `src/`: Treffer nur in den drei Seiten und in `release.ts`, Z. 131                                                                                 | bestätigt  |
| 10         | Die Portion kennt drei Module                                                                  | `src/domain/daily-plan.ts`, Z. 16                                                                                                                                   | bestätigt  |
| 10         | 885 Wörter in 8 Wortboxen                                                                      | eigene Auszählung von `german-learning-content.ts`: 105, 105, 111, 104, 108, 108, 133, 111                                                                          | bestätigt  |
| 10         | Sprachausgabe „nur Gerätestimmen“                                                              | vier Aufrufe ohne Filter (Abschnitt 10, Nr. 3)                                                                                                                      | **falsch** |
| 10         | Audit-Fehler der Wortboxen „behoben“                                                           | „Ferien“ steht weiter in „Langes i“ (Z. 83); Strategie „Merken“ für ie (Z. 165–167)                                                                                 | ungenau    |
| 10         | Entscheidung 53 fehlt im Protokoll                                                             | Überschriften springen von 52 auf 54                                                                                                                                | bestätigt  |
| 12         | Keine Lizenzdatei, `"private": true`                                                           | Wurzelverzeichnis; `package.json`, Z. 4                                                                                                                             | bestätigt  |
| 12         | Impressum: „nicht öffentlich zugänglich“, „nicht im regulären Schulbetrieb“                    | `app/impressum/page.tsx`, Z. 20, 26                                                                                                                                 | bestätigt  |
| 12         | IP als ungesalzener SHA-256                                                                    | `supabase/migrations/20260825124001_*.sql`, Z. 71                                                                                                                   | bestätigt  |
| 12, 21, 23 | Text kann an Netzstimmen gehen, das sei ein Leck                                               | Die Datenschutzerklärung nennt Online-Stimmen bereits (`app/datenschutz/page.tsx`, Abschnitt 5). Falsch ist nur die Aussage „nur lokale Stimmen“ in Entscheidung 58 | ungenau    |
| 20         | „Club“, „Job“, „Zugweg“, „Zieltür“, „Fehlwort“ in den Boxen                                    | `german-learning-content.ts`, Z. 52, 55, 80, 99                                                                                                                     | bestätigt  |
| 20         | Startpunkt prüft „Ableiten“ mit „Mädchen“                                                      | `start-point.ts`, Z. 163                                                                                                                                            | bestätigt  |
| 20         | „Weg“ und „weg“ als gleich klingend                                                            | `homophones.ts`, Z. 28                                                                                                                                              | bestätigt  |
| 20         | TXT-002 führt „nah“ als Dehnungs-h                                                             | `textbox-library.ts`, TXT-002                                                                                                                                       | bestätigt  |
| 21, 31     | `ReadAloudButton` ist nirgends eingebunden                                                     | Treffer nur in `app/ui/read-aloud-button.tsx` und im eigenen Test                                                                                                   | bestätigt  |
| 21         | `speak()` wartet höchstens 12 Sekunden                                                         | `src/speech/speaker.ts`, Z. 16                                                                                                                                      | bestätigt  |
| 22         | Mal und Geteilt bleiben immer im kleinen Einmaleins                                            | `mental-math.ts`, Z. 554–560                                                                                                                                        | bestätigt  |
| 22         | „Zehnerübergang“ greift bei jeder Abweichung um 10                                             | `mental-math-feedback.ts`, Z. 155–156                                                                                                                               | bestätigt  |
| 23         | „Meine Fehler“ über alle Stapel ist gebaut (Planung 1.3 veraltet)                              | `learning-box-app.tsx`, Z. 111–117                                                                                                                                  | bestätigt  |
| 24         | Störangriffe im Battle sind Standard                                                           | `teacher-session.ts`, Z. 163: `{ ink: true, flicker: true }`                                                                                                        | bestätigt  |
| 24         | Wochenanzeige „X von 7 Tagen“, „nicht geübt“                                                   | `app/views/lernen/home-screen.tsx`, Z. 240, 257                                                                                                                     | bestätigt  |
| 24         | Markenfiguren, Rechte ungeprüft                                                                | `public/figuren/` (u. a. `batman.svg`, `mario.svg`, `harry.svg`); `QUELLE.md`                                                                                       | bestätigt  |
| 25         | `materialId` wertet die Schülerseite nicht aus                                                 | Treffer nur im Lehrerbereich und im Abgleich                                                                                                                        | bestätigt  |
| 30         | Ein einzelner Fehler legt die Startstufe fest                                                  | `start-point.ts`, Z. 138–139                                                                                                                                        | bestätigt  |
| 31         | Kachel „3 / 105 sicher“, „% der Box“                                                           | `overview-screen.tsx`, Z. 48, 169                                                                                                                                   | bestätigt  |
| 25         | Zielbild zeigt auf fremdem Gerät „9 von 12 sicher“                                             | „sicher“ verlangt zwei Tage (`competence-profile.ts`); Bericht 30 hat das schon berichtigt                                                                          | falsch     |
| 21         | Chorlesen braucht „keine Prüfzeit (vorhandene Texte)“                                          | Die vorhandenen Texte sind ungeprüfte Entwürfe (`docs/inhalte/textbox.md`, „Stand“)                                                                                 | **falsch** |
| 31         | Vorlesen „in der Aufgabe, nicht auf dem Startblatt“ (4.1) und „Bildkacheln mit Vorlesen“ (3.4) | Die Fachwahl des Schnellstarts ist ein Startblatt. Der Bericht widerspricht sich selbst und berührt Entscheidung 58                                                 | ungenau    |

### 2.2 Aussagen zum Fachstand und zu Quellen (Websuche, 11.11.2026)

| Bericht | Aussage                                                          | Prüfung                                                                                                                                              | Ergebnis                     |
| ------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 23      | NGSL steht unter CC BY-SA 4.0                                    | Projektseiten nennen CC BY-SA 4.0 für NGSL-Spoken, NAWL und NGSL-GR; für die Kernliste 1.2 erschien der Lizenztext nicht (newgeneralservicelist.com) | weitgehend bestätigt         |
| 12      | Supabase Free: 500 MB, 2 Projekte, Pause nach 7 Tagen            | Preisseite: „paused after 1 week of inactivity“; Wiederherstellung von Hand im Dashboard (supabase.com/pricing)                                      | bestätigt                    |
| 12      | Cloudflare Free: 100 000 Anfragen je Tag, statische Dateien frei | Doku: statische Dateien „free and unlimited“, 10 ms CPU, 20 000 Dateien (developers.cloudflare.com/workers/platform/pricing, /limits)                | bestätigt                    |
| 12      | OpenMoji CC BY-SA 4.0; ARASAAC CC BY-NC-SA                       | openmoji.org/faq; aulaabierta.arasaac.org (Nutzungsbedingungen)                                                                                      | bestätigt                    |
| 12      | Piper-Stimme „thorsten“: CC0, vom englischen Modell abgeleitet   | Modellkarte: Datensatz CC0, „finetuned from … lessac“ (huggingface.co/rhasspy/piper-voices)                                                          | bestätigt                    |
| 12, 23  | Chrome schickt Text bei Netzstimmen an einen Server              | `localService` ist so definiert (developer.mozilla.org); eine amtliche Aussage zum heutigen Chrome fand ich nicht                                    | nicht prüfbar                |
| 11, 30  | Levumi ist kostenlos                                             | Registrierung belegt (epub.ub.uni-muenchen.de/108476); zu Kosten 2026 kein Treffer, levumi.de nicht erreichbar                                       | nicht prüfbar                |
| 11      | Orthografietrainer.net: kostenlos, über 5 000 Sätze, ab Klasse 5 | Uni Potsdam bestätigt; der Bildungsserver nennt das Angebot werbefinanziert (bildungsserver.de). Für „werbefrei“ als Unterschied wichtig             | ungenau                      |
| 20      | Grundwortschatz Bayern: 623 Wörter                               | Antwort der Staatsregierung (bayern.landtag.de, Wahlperiode 19, Drucksachennummer nicht geprüft); ein Verlag nennt 503, Widerspruch ungeklärt        | bestätigt                    |
| 21      | IGLU 2021: 25,4 % unter Stufe III                                | Pressemappe des IFS, KMK-Mitteilung (2016: 18,9 %)                                                                                                   | bestätigt                    |
| 21      | Begleitetes Lautlesen: Effekt 0,41                               | National Reading Panel, Kapitel 3 (nichd.nih.gov)                                                                                                    | bestätigt                    |
| 21, 31  | Lernsoftware bei schwachen Lesern +0,14, in Kleingruppen +0,32   | Cheung und Slavin 2013 (learntechlib.org/p/133202); die +0,32 ruhen auf drei Studien (apps.asha.org)                                                 | bestätigt, schmale Grundlage |
| 24      | Gamification: g = 0,49 kognitiv, 0,36 motivational               | Sailer und Homner 2020 (opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)                                                    | bestätigt                    |
| 31      | Vorlesen per Sprachausgabe: d = 0,35, 22 Studien                 | Wood u. a. 2018, Vertrauensbereich 0,14 bis 0,56 (pmc.ncbi.nlm.nih.gov/articles/PMC5494021)                                                          | bestätigt                    |

Ergebnis: Die Berichte zitieren sauber. Die Schwäche liegt nicht in den Zahlen, sondern im Schluss von den Zahlen auf Lernraum (Abschnitt 6.3).

## 3. Verstöße gegen Rahmenbedingungen und Entscheidungen

### 3.1 Rahmenbedingungen durch die Hintertür

| Bedingung                   | Wo sie berührt wird                                                                                                                                                                                                                                                                                                                                         | Bewertung [Empfehlung]                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Kostenlos                   | Kein Verstoß. Der Live-Raum hängt aber an einem Tarif, der nach einer Woche ohne Zugriff pausiert [Fachstand, 2.2]. Das KI-Kontingent des Entwicklers plant kein Bericht ein.                                                                                                                                                                               | R12-5 in Etappe 1.                                                                              |
| Keine KI zur Laufzeit       | Netzstimmen des Browsers sind ein Cloud-Dienst zur Laufzeit [Beleg, Abschnitt 10]. „Kritzeln“ auf dem iPad kann Antworten verändern (Bericht 20, ungeprüft).                                                                                                                                                                                                | Sofortliste Nr. 3; R20-16.                                                                      |
| Ohne Login und Vorbereitung | Klassengerät-Modus: einmal je Gerät einrichten (L25-8). Gast-QR braucht eine angelegte Klasse. Übungskarten müssen gedruckt werden (L25-4). Der „freiwillige“ Kurzbericht wird zur Pflicht, sobald eine Lehrkraft ihn von allen einsammelt; ein Verfahren für Nichtteilnahme ohne Nachteil ist seit Entscheidung 11 offen [Beleg, Protokoll, „Noch offen“]. | Vertretbar, aber offen sagen. Kurzbericht erst nach S1.                                         |
| Eine Person                 | 146 Bausteine; vier Paketformate (R20-2, L21-5, R23-1, M24-7) plus F30-1; drei verschiedene Entlastungsregeln (F30-5: fünf von acht falsch; I31-3: unter 70 %; Startpunkt: Nachsteuern nach acht Aufgaben); vier Beobachtungsbögen, keiner durchgeführt.                                                                                                    | Ein Format, eine Regel, ein Heft.                                                               |
| Datenschutz für Kinder      | Der Live-Raum legt schon heute Fehlerwörter und erste falsche Antworten je Tier bei Supabase ab, 24 Stunden, Irland, ohne Vertrag zur Auftragsverarbeitung [Beleg, Bericht 10, 2.3; Bericht 12]. Jedes neue Live-Format (M24-8, R23-19, R23-20, MA-10, L21-9) vergrößert diesen Fluss vor S1. L25-5 bringt gezählte Runden je Kind auf das Lehrergerät.     | Vor S1 höchstens ein neues Live-Format mit Fehlerdaten (R23-19). L25-5 ohne Klarnamen erproben. |
| Datenschutz für Kinder      | I31-2 legt Schalter wie „Weniger auf einmal“ auf das Gerät. Das ist kein Datenfluss, aber ein sichtbares Ersatzmerkmal, wenn die Lehrkraft es vor anderen setzt [Vermutung].                                                                                                                                                                                | Kein Einstellungsblatt (Abschnitt 11, O1).                                                      |
| Freie Inhalte               | Markenfiguren sind im Einsatz (`src/domain/figures.ts`). Die Herkunft der 60 Tierbilder ist nicht dokumentiert (Bericht 12). Die Lizenz des Grundwortschatzes ist ungeprüft. Inhalte liegen im Quellcode; Code- und Inhaltslizenz lassen sich so nicht trennen.                                                                                             | Vor der Lizenzdatei klären (Abschnitt 12).                                                      |

### 3.2 Entscheidungen, die berührt werden, ohne dass es klar gesagt wird

| Vorschlag                                          | Entscheidung                                                                                                                        | Befund                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| I31-2 neutrale Hilfen (S–M, fünf Schalter)         | Nachtrag 1, Nr. 1: „Schreiberleichterung / neutrale Übungseinstellung: muss nicht sein … nur umsetzen, wenn der Aufwand gering ist“ | Bericht 31 erklärt den Nachtrag für nicht betroffen. Er nennt die neutrale Übungseinstellung aber ausdrücklich. Entscheidungsvorlage O1. |
| I31, Tabelle 3.4: Fachkacheln „mit Vorlesen“       | 58: „Nicht wieder einbauen“ auf Start- und Einstellungsblättern                                                                     | Widerspruch im Bericht selbst (2.1). Ohne neue Entscheidung gilt 58.                                                                     |
| M24-2, M24-3, M24-5 neue Spielformen               | 39: Gamification erst nach stabilem Lernkern, erprobt                                                                               | Bericht 24 nennt 39 nur bei M24-3. Nachtrag 2, Nr. 6 erlaubt Klassentempo, nicht die Reihenfolge vor der Erprobung.                      |
| E30-3, E30-4, O1, O2                               | 57 (Portion, „zuerst Fehler“, „nur Fehler“ in Mathe, Größe 20)                                                                      | Vier Vorlagen ändern dieselbe Entscheidung an vier Stellen. Rolle 50 sollte daraus **einen** neuen Eintrag machen.                       |
| E30-2, O5                                          | Entscheidungen des Entwicklers vom 27.10. (Welle 3, D2 und D5-5)                                                                    | Benannt. Beide kehren eine drei Wochen alte Festlegung um und brauchen „Zurückgenommen“.                                                 |
| L21 (15 Bausteine), R23-1 bis R23-10, MA-11, MA-12 | Audit I.6: keine neuen Module vor Modulvertrag und belegtem Bedarf; „z. B. Bruchrechnen“                                            | Keine Entscheidung, aber eine Empfehlung, die der Entwickler nie verworfen hat. MA-12 ist genau das genannte Beispiel.                   |
| L21-2 Chorlesen mit vorhandenen Texten             | 54 und Nachtrag 2, Nr. 4                                                                                                            | Nur mit den 15 geprüften Texten zulässig.                                                                                                |

### 3.3 Was vom Red Team des Audits weiter gilt

M.8 Nr. 2 (Breite vor Tiefe) und Nr. 5 (Echtbetrieb vor geklärtem Rahmen) gelten unverändert. M.9 gilt vollständig: Keine der 16 Annahmen über Kinder und Geräte ist seither geprüft; im Repository gibt es kein Beobachtungsergebnis [Beleg, Bericht 10, S14]. Nr. 1 (Gerät gleich Kind) ist durch den Gastmodus gemildert, Nr. 3 (gelenkte Autonomie) ist gebaut, aber unerreichbar.

## 4. Kapazitätsrechnung

### 4.1 Summe der Bausteine

Zählweise: S = 1 Woche, M = 3, S–M = 2, L = 6 (untere Rechnung: 0,5 / 2 / 1 / 5). Prüfzeit nach den Angaben der Berichte.

| Bericht           | Bausteine | Entwicklung (Wochen, Mitte) | Prüfzeit der Lehrkraft (Stunden) |
| ----------------- | --------- | --------------------------- | -------------------------------- |
| 11 Wettbewerb     | 9         | 5 (Rest doppelt)            | 1                                |
| 12 Recht, Betrieb | 15        | 26                          | 9                                |
| 20 Rechtschreiben | 16        | 34                          | 19                               |
| 21 Lesen          | 15        | 28                          | 19                               |
| 22 Mathematik     | 15        | 32                          | 9                                |
| 23 Vokabeln, DaZ  | 20        | 37                          | 29 (dazu fremde Prüferinnen)     |
| 24 Motivation     | 13        | 22                          | 4                                |
| 25 Lehrkraft      | 15        | 27                          | 2                                |
| 30 Kreislauf      | 13        | 20                          | 2                                |
| 31 Inklusion      | 15        | 23                          | 6                                |
| **Summe**         | **146**   | **254**                     | **100**                          |

Nach Abzug der Doppelungen (etwa 19 Wochen) bleiben 140 bis 230 Wochen. Bei 46 Wochen im Jahr sind das **drei bis fünf Jahre**. Die Prüfzeit von 100 Stunden füllt bei zwei Stunden je Woche und 38 Schulwochen allein 1,3 Jahre.

### 4.2 Sind die Schätzungen glaubwürdig?

**Entwicklung: zu hoch.** Die Textbox wurde am 08.10. geplant und gebaut (`docs/umsetzungsplan-textbox.md`, „Paket A bis D umgesetzt“). Der Wortspeicher-Umbau folgte am 09.10. Welle 3 trägt als Plan und als „Stand der Umsetzung“ dasselbe Datum, 27.10.: gemeinsamer Wiederholungskern, Startpunkt, Training, Profil, Tafelmodus, Lernwortlisten und sechs Bedienpakete [Beleg]. Ein „M“ der Fachleute ist für die Code-Erzeugung eher zwei Tage als drei Wochen.

**Abnahme: fehlt in jeder Schätzung.** Was nach dem Bauen offen bleibt, zeigt das Repository:

| Offen seit | Was                                                                                                    | Beleg                                  |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 08.10.     | fachliche Prüfung der 50 Texte, Kalibrierung                                                           | `umsetzungsplan-textbox.md`, Kopf      |
| 09.10.     | Probedurchlauf Wortspeicher, Prüfung der Homophone                                                     | `umsetzungsplan-wortspeicher.md`, Kopf |
| 20.10.     | Einsatzrahmen (S1), Beobachtungsphase (S14)                                                            | Bericht 10, Abschnitt 3                |
| 27.10.     | fünf Entscheidungen aus Welle 3 (u. a. `lehrer-geraet`, Regel „sicher“)                                | Welle 3, „Offene Entscheidungen“       |
| 05.11.     | drei freigegebene Seiten ohne Link; niemand hat es im Gebrauch bemerkt, sondern das Gremium beim Lesen | Bericht 10, Kurzfazit 1                |

Der knappe Rohstoff ist die Aufmerksamkeit des Entwicklers. Meine Rechnung dafür [Vermutung, eigene Schätzung]: je S-Baustein 1,5 Stunden für Entscheiden, Ansehen am Gerät und einen Versuch im Unterricht, je M-Baustein 5 Stunden. Das ergibt rund 400 Stunden für alle Bausteine. Verfügbar sind bei sechs Wochenstunden etwa 275 Stunden im Jahr, davon 90 für Inhalte und 185 für alles andere. Also gut zwei Jahre, ohne Pflege.

**Prüfzeit: eher zu niedrig.** 40 Sekunden für ein Kernwort mit sieben Merkmalen (Bericht 20, 4.2) setzen fehlerfreie Vorschläge voraus. Die vorhandenen Listen enthalten nach Audit und Korrekturrunde noch mindestens fünf Fehlergruppen (F1 bis F5). Ich rechne mit dem Doppelten: 100 bis 200 Stunden.

### 4.3 Pflegelast und ein halbes Jahr Ausfall

| Was                       | Dauerlast                                                         | Bei sechs Monaten Ausfall                                                                                                        |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Live-Raum, Übergabe       | Supabase wach halten, Migrationen, Limits                         | Nach der ersten Ferienwoche pausiert; Wiederherstellung nur von Hand durch den Kontoinhaber. Der Türöffner fällt als Erstes aus. |
| App (statisch)            | Abhängigkeiten, junges Framework (Audit A-007), iPadOS-Änderungen | Läuft weiter, solange die Adresse bezahlt ist.                                                                                   |
| Inhalte                   | Fehlermeldungen von Kolleginnen; jede Korrektur ist ein Release   | Fehler bleiben stehen. Je mehr Inhalte, desto mehr.                                                                              |
| Lizenznachweise           | Quelle und Namensnennung je Datei (R12-12)                        | unkritisch                                                                                                                       |
| Stimmen, Sprachen         | je Betriebssystem verschieden, ändern sich mit Updates            | Vorlesen und Stufe 6 können still verschwinden.                                                                                  |
| Schulpaket, Verweisseiten | Rechtsstand, tote Links, Angaben zu Levumi                        | veraltet; bei Unterlagen für Schulleitungen heikel                                                                               |
| Weiterführung             | –                                                                 | Ohne Lizenz darf niemand übernehmen (Bericht 12, E-3).                                                                           |

Folge [Empfehlung]: R12-5, R12-12 und R12-14 gehören in die erste Etappe. Jeder Inhalt, der mitgeliefert wird, zählt doppelt.

## 5. Widersprüche zwischen den Berichten, als Wahl für den Entwickler

Bericht 30 hat acht Widersprüche aufgelöst (W1 bis W8). Diese bleiben:

| Nr. | Wer gegen wen                                                                                                                                   | Die Wahl                                                      | Empfehlung                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Mehr Inhalte (20: 19 h; 21: 19 h; 23: 29 h; 22: 9 h) gegen eine Prüfzeit von zwei Stunden je Woche                                              | alle Linien nebeneinander oder eine nach der anderen          | Eine Linie zur Zeit: Korrekturen, dann Kernwörter, dann Englisch als Wortpaare. Lesetexte im zweiten Jahr. Eine Fachkollegin als zweite Prüferin gewinnen. |
| B   | Spielfreude (24: gegen die Uhr, Richtig-Serie, „besser als letztes Mal“) gegen Schutz (31: Serie reißt ab, Vergleich fehlt an schlechten Tagen) | Reiz jetzt oder erst erproben                                 | Jetzt nur Klassenziel ohne Uhr (M24-1) und ein Zähler, der nie fällt. „Gegen die Uhr“ und Teams erst nach der Erprobung (M24-13).                          |
| C   | Rückmeldung (25: gezählte Runden; 20, 12: Kurzbericht) gegen Datensparsamkeit (12: RL-3; S1 offen)                                              | Werte auf dem Lehrergerät vor oder nach S1                    | Vor S1 nur „Kind zeigt seinen Stand“ (L25-7). S1 bekommt einen Termin.                                                                                     |
| D   | Startpunkt „in der Mitte“ (22, 30) gegen „Erfolg zuerst“ (31)                                                                                   | Tempo oder Schonung                                           | Eine sicher lösbare Aufgabe vorweg, die nicht zählt, dann Mitte.                                                                                           |
| E   | Kontrastwörter von Anfang an, ein Drittel (20) gegen Kontrast erst bei 80 % Sicherheit (31)                                                     | Entscheidung üben oder Erfolg sichern                         | Erste Runde ohne Kontrast mit Strategie, zweite Runde mit Kontrast. Keine Schwelle, die einen Lernstand braucht.                                           |
| F   | „Zuerst Fehler“ bleibt (30, Block 1) gegen Fehler streuen und 70-%-Regel (31, O2)                                                               | Entscheidung 57 ändern oder nicht                             | Nicht ändern. Erst beobachten (I31-14).                                                                                                                    |
| G   | Ein Paketformat mit Prüfansicht (30) gegen vier Fachformate (20, 21, 23, 24); der Modulvertrag (Audit L1) gehört niemandem                      | wer baut die Grundlage, und wie groß                          | Ein dünnes Format, Dateien im Repository, Prüfliste als erzeugte Tabelle. Keine Prüfansicht in der App.                                                    |
| H   | Zielgruppe „Mittelschule, alle Klassen“ (Antwort 1) gegen Inhalte, die bei der Grundschule enden; Stufe E kostet L und L (R20-12)               | was die Vision für Jahrgang 7 bis 9 verspricht                | Zwölf Monate: Grundlagen nachholen in jugendgerechter Form, Mathe bis etwa Jahrgang 7. Großschreibung und das/dass als erstes Ziel des zweiten Jahres.     |
| I   | „Sofort `localOnly` überall“ (12, 21, 23, 31) gegen Stufe 6, Startpunkt und Hörmodus, die ohne lokale Stimme entfallen                          | Datensparsamkeit oder Funktion auf Geräten ohne lokale Stimme | Erst die Seite „Stimmen dieses Geräts“ (R23-7) auf drei Gerätearten, dann umstellen, mit Hinweis statt stillem Wegfall.                                    |

## 6. Der Prüfstein am Zielbild

### 6.1 Geteiltes Gerät ohne Lernstand

Ablauf im Zielbild: Tier, „20 Minuten üben“, Fach, Startpunkt, eingestellte Übung mit Uhr, Formatwechsel, Abschluss.

- **Mathe: trägt.** Aufgaben werden erzeugt, es braucht fast keine Prüfzeit (MA-1, MA-4, MA-11).
- **Rechtschreibung: trägt nur mit lokaler deutscher Stimme.** Ohne Stimme gibt es nach Bericht 30 keinen Startpunkt und keine Stufe 6. Ob Schulgeräte eine haben, ist seit dem Audit ungeprüft (M.9).
- **Englisch und Lesen allein: tragen erst mit mitgelieferten Inhalten.**
- **„Genau das, was es braucht“: nein.** Drei Aufgaben je Stufe tragen keine Aussage über ein Kind; das sagt Bericht 30 selbst (4.5). Ehrlich ist: „in drei Minuten passend eingestellt“. Das deckt sich mit Nachtrag 1, Nr. 2.

### 6.2 Eigenes Gerät

Portion, Auffüllen, Muster und Stand tragen, **wenn** das Kind an mehreren Tagen übt. Die Abstände von 1, 3 und 7 Tagen und die Musterschwelle (neun Gelegenheiten an zwei Tagen) setzen das voraus. Feste Geräte gibt es eher ab Jahrgang 7 oder 8 (Bericht 25, 3); die Kinder mit den größten Lücken haben am seltensten eines (Bericht 31, 2.3) [beides Vermutung]. Das Zielbild verspricht hier mehr, als belegt ist.

### 6.3 Der kleinste Satz von Bausteinen

| Nr. | Baustein                                                                           | Aufwand |
| --- | ---------------------------------------------------------------------------------- | ------- |
| 1   | Startpunkt, Training, Profil verlinken                                             | S       |
| 2   | Startvorschlag einstellen (L25-2)                                                  | S       |
| 3   | Fachfehler beheben (R20-1)                                                         | S       |
| 4   | Generator nach Merkmalen, Mal und Geteilt über das Einmaleins hinaus (MA-1, MA-11) | S–M, M  |
| 5   | Startpunkt mit festen Aufgaben und Stufen bis Jahrgang 7 (F30-6, R20-9, MA-4)      | M       |
| 6   | Schnellstart mit Uhr (L25-1)                                                       | M       |
| 7   | Stimmen prüfen, Sprachausgabe vereinheitlichen (R23-7, R12-10)                     | S       |
| 8   | Lehrertablet sperrbar (L25-9)                                                      | S       |

Abstand zum heutigen Stand: drei M und fünf S. Das ist ein Vierteljahr, nicht ein Jahr.

### 6.4 Wunschdenken

- **Wirkung.** IGLU, PISA und IQB belegen den Bedarf, nicht die Wirkung von Lernraum. Lernsoftware allein wirkt bei schwachen Lesern schwach (+0,14) [Fachstand, 2.2]. Die Vision sollte keine Wirkung auf Lesekompetenz, Abschlüsse oder Chancengerechtigkeit versprechen. Die Wirksamkeitsprobe aus Bericht 30 (4.7) ist der einzige Weg zu einem eigenen Ergebnis.
- **Motivation.** Einzige Quelle ist „schnell, spielerisch, motivierend“ (Antwort 5). Nutzungsdaten gibt es nicht (Bericht 24).
- **„Das Wissen von Anton.“** Orthografietrainer.net hat über 5 000 Sätze und läuft seit 2008. Lernraum plant 300 Kernwörter, 30 Texte und 250 Vokabeln. Das ist richtig so, muss aber so heißen.
- **Bezirk in zwölf Monaten.** Es fehlen Freigabe, Verfahrensbeschreibung, Vertrag und ein Träger (Bericht 12, E-1). Nichts davon ist Code. Realistisch: die eigene Schule förmlich und zwei bis drei Pilotschulen.
- **Fehlerdeutung „recht sicher“ (Bericht 20).** Nicht erprobt. Billig prüfbar: 100 echte Falschschreibungen aus vorhandenen Live-CSV von Hand zuordnen [Empfehlung].
- **„Erprobung reichlich möglich.“** Stimmt für die Zeit im Unterricht. Auswerten kostet dieselbe knappe Aufmerksamkeit.

### 6.5 Fehlende Stimmen

- **Das Kind.** Kein Kind wurde beobachtet oder gefragt. Die vier Prüffälle in Bericht 31 sind erfunden.
- **Eltern.** Einwilligung unter 14, Üben am Familienhandy, Elterninformation: nur als Zeile im Schulpaket.
- **Systembetreuung und Sachaufwandsträger.** Sie entscheiden, ob die App installiert ist, die Kamera frei ist, Stimmen vorhanden sind und der Speicher bleibt.
- **Eine zweite Lehrkraft.** Niemand schlägt vor, die Inhaltsprüfung des Kerns zu teilen. Das wäre der größte Hebel gegen den Engpass [Empfehlung].
- **Technische Schulden.** Modulvertrag (L1), Ereignisquelle (M2), `no-floating-promises` (K2), Abdeckung von `app/` (K12), `/lehrer/aufgaben` in alter Oberfläche. Mehrere Bausteine ändern gespeicherte Formate (R20-2, R23-1, F30-3, MA-6); jeder braucht Sicherungs- und Migrationstests (Audit M.6).
- **Die laufende Audit-Roadmap.** S1, S14, M4, M8, M10 und M11 sind offen. Die Vision legt 146 Bausteine darauf.

## 7. Urteil je Baustein

„Streichen (12 M.)“ heißt: nicht im Zuschnitt für zwölf Monate, darf unter „später“ stehen. „Streichen“ ohne Zusatz heißt: nicht in die Vision.

| Nr.              | Urteil            | Grund                                                                                     |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| W-1              | kürzen            | Geht in R20-4 und R20-5 auf.                                                              |
| W-2              | tragen            | Als Leitlinie für Inhalte (I31-7), kein eigener Bau.                                      |
| W-3              | erst prüfen       | Gleich R12-7; nach S1.                                                                    |
| W-4              | tragen            | Eine Verweisseite (F30-9).                                                                |
| W-5              | kürzen            | Gleich L21-1, ohne eigene Texte.                                                          |
| W-6              | streichen         | Lehrplanzuordnung kostet M und M und muss bei jeder Lehrplanänderung nachgezogen werden.  |
| W-7              | erst prüfen       | Der Katalog ist ungelesen.                                                                |
| W-8              | streichen (12 M.) | Ein Link in mebis bringt Schulen vor der Freigabe.                                        |
| W-9              | tragen            | Gleich R12-12 und R12-14.                                                                 |
| R12-1            | tragen            | Tor für alles mit Namen und für jede fremde Schule.                                       |
| R12-2            | kürzen            | Zwei Seiten, und erst nach dem Gespräch: Der Datenschutzbeauftragte sagt, was er braucht. |
| R12-3            | tragen            | Das Impressum widerspricht dem Betrieb.                                                   |
| R12-4            | kürzen            | IP-Hash salzen und Vertrag abschließen; Regionswechsel nicht.                             |
| R12-5            | tragen            | Sonst scheitert die erste Stunde nach den Ferien.                                         |
| R12-6            | erst prüfen       | Nur bauen, wenn eine Schule ohne Vertrag es verlangt.                                     |
| R12-7            | erst prüfen       | Nach S1.                                                                                  |
| R12-8            | streichen         | Häuser ruhen (Nachtrag 1, Nr. 4); neuer Datenfluss ohne Nutzer.                           |
| R12-9            | erst prüfen       | Entfällt, wenn die Schreiberleichterung ausläuft (O3).                                    |
| R12-10           | tragen            | Sofortliste, nach der Geräteprüfung.                                                      |
| R12-11           | tragen            | Klein, Löschrecht.                                                                        |
| R12-12           | tragen            | Voraussetzung für Weitergabe und Weiterführung.                                           |
| R12-13           | streichen (12 M.) | Jede Aufnahme muss angehört werden; Dauerlast je neuem Wort.                              |
| R12-14           | tragen            | Bus-Faktor 1.                                                                             |
| R12-15           | kürzen            | Ein Absatz im Schulpaket.                                                                 |
| R20-1            | tragen            | Falsche Regeln stehen vor Kindern.                                                        |
| R20-2            | kürzen            | Datenmodell ja, Prüfansicht in der App nein.                                              |
| R20-3            | kürzen            | Mit 90 bis 120 Wörtern in drei bis vier Phänomenen beginnen, Zeit stoppen.                |
| R20-4            | erst prüfen       | An 100 echten Falschschreibungen erproben.                                                |
| R20-5            | tragen            | Wirkt auf jedem Gerät, auch ohne Lernstand.                                               |
| R20-6            | tragen            | Kern der fachlichen Verbesserung; Etappe 2.                                               |
| R20-7            | kürzen            | Nur „erst Beweiswort, dann Wort“.                                                         |
| R20-8            | erst prüfen       | Nur sinnvoll, wenn Kinder neun Gelegenheiten an zwei Tagen erreichen (Beobachtung).       |
| R20-9            | tragen            | Prüfstein; mit F30-6.                                                                     |
| R20-10           | kürzen            | Längenstriche entfernen; Lücken an der Stelle erst mit Kernwörtern.                       |
| R20-11, R20-12   | streichen (12 M.) | Größter Einzelposten (L und L); Leitziel des zweiten Jahres.                              |
| R20-13           | tragen            | Ausblenden sofort, Prüfen in Etappe 1.                                                    |
| R20-14           | tragen            | Fast kein Code.                                                                           |
| R20-15           | streichen (12 M.) | Braucht Kernwörter im Live-Raum und S1.                                                   |
| R20-16           | tragen            | 20 Minuten, klärt eine offene Frage.                                                      |
| L21-1            | tragen            | Kein Inhalt nötig, am besten belegtes Verfahren.                                          |
| L21-2            | kürzen            | Nur mit geprüften Texten.                                                                 |
| L21-3            | erst prüfen       | Wirkung laut Bericht selbst unbelegt; Ablenker kosten zwei Stunden.                       |
| L21-4 bis -8     | streichen (12 M.) | Eigener Lesebereich mit Texten ist ein neues Modul; zweites Jahr.                         |
| L21-9            | streichen         | Doppelt mit M24-9; 300 Sätze Prüfarbeit, neues Raumformat.                                |
| L21-10 bis -12   | streichen (12 M.) | Hängen an L21-7 und L21-8.                                                                |
| L21-13           | tragen            | In F30-9.                                                                                 |
| L21-14, L21-15   | streichen         | Aufnahmen und Weitergabe von Lesebuchtexten: Dauerlast und Rechtsfrage.                   |
| MA-1 bis MA-3    | tragen            | Klein, ohne Prüfzeit, sofort im Unterricht sichtbar.                                      |
| MA-4, MA-5       | tragen            | Prüfstein; MA-4 mit F30-6.                                                                |
| MA-6             | erst prüfen       | Antwortzeit enthält Tippzeit; Schwelle unerprobt.                                         |
| MA-7, MA-8, MA-9 | streichen (12 M.) | Hängen an MA-6 oder kosten M ohne Prüfstein-Nutzen.                                       |
| MA-10            | kürzen            | Klassenziel ist M24-1; weitere Formate später.                                            |
| MA-11            | tragen            | Erzeugbar; hebt Mathe auf Mittelschulniveau.                                              |
| MA-12            | streichen (12 M.) | L; das Audit nennt Bruchrechnen als Beispiel für „nicht vor belegtem Bedarf“.             |
| MA-13, MA-14     | tragen            | Klein.                                                                                    |
| MA-15            | tragen            | In F30-9.                                                                                 |
| R23-1            | kürzen            | Dasselbe Format wie F30-1; Satzfelder freiwillig.                                         |
| R23-2            | kürzen            | 250 Wortpaare mit Wortart; Sätze erst mit dem Lückensatz.                                 |
| R23-3            | streichen (12 M.) | 15 bis 20 Stunden Prüfzeit.                                                               |
| R23-4            | tragen            | Prüfstein Englisch.                                                                       |
| R23-5            | streichen (12 M.) | M; ohne ihn sind die Sätze nicht nötig.                                                   |
| R23-6            | erst prüfen       | Braucht eine lokale englische Stimme.                                                     |
| R23-7            | tragen            | Sofortliste.                                                                              |
| R23-8 bis -12    | streichen (12 M.) | Ausbau der LernBox nach der Erprobung des Bestands.                                       |
| R23-13, R23-14   | tragen            | Ein Satz in der App; eine Frage im Gespräch R12-1.                                        |
| R23-15, R23-16   | streichen         | Nicht die Zielgruppe (Bericht 23, 4.3).                                                   |
| R23-17           | streichen (12 M.) | Warteliste (Antwort 7).                                                                   |
| R23-18           | streichen         | Braucht fremde Prüferinnen je Sprache.                                                    |
| R23-19           | tragen            | Größter Hebel für den Live-Raum.                                                          |
| R23-20           | streichen (12 M.) | Drei neue Formate vor S1.                                                                 |
| M24-1            | tragen            | Gemeinsames Ziel ohne Vergleich.                                                          |
| M24-2, M24-3     | erst prüfen       | Erst die Erprobung M24-13.                                                                |
| M24-4            | tragen            | Zugesagt (Nachtrag 2, Nr. 7), klein.                                                      |
| M24-5            | kürzen            | Nur ein Zähler, der nie fällt (Bericht 31).                                               |
| M24-6            | tragen            | Nach R20-1.                                                                               |
| M24-7            | streichen (12 M.) | Ein Vertrag ohne zweites Format ist Arbeit auf Vorrat.                                    |
| M24-8            | streichen (12 M.) | Zeigt Falschschreibungen; M und M.                                                        |
| M24-9            | streichen         | Wie L21-9.                                                                                |
| M24-10           | tragen            | Klein.                                                                                    |
| M24-11           | streichen (12 M.) | Setzt F30-7 voraus.                                                                       |
| M24-12           | kürzen            | Nur Markenfiguren ersetzen.                                                               |
| M24-13           | tragen            | Im Beobachtungsheft (F30-12).                                                             |
| L25-1 bis -3     | tragen            | Kern des Prüfsteins.                                                                      |
| L25-4, L25-5     | tragen            | Zugesagt (Nachtrag 2, Nr. 8 und 10); Etappe 3; ohne Klarnamen erproben.                   |
| L25-6            | erst prüfen       | Zettel gehen verloren; die Drei-Tipp-Wahl reicht vielleicht.                              |
| L25-7            | tragen            | Rückmeldung ohne Datenfluss.                                                              |
| L25-8            | erst prüfen       | Erst zählen, wie viele Koffer-Geräte es gibt.                                             |
| L25-9, L25-10    | tragen            | Klein; offen seit Welle 3.                                                                |
| L25-11           | kürzen            | Namensliste einfügen jetzt; Schuljahresübernahme bis Juli 2027.                           |
| L25-12           | streichen (12 M.) | Hängt an R12-9 und S1.                                                                    |
| L25-13           | erst prüfen       | Nach S1.                                                                                  |
| L25-14, L25-15   | tragen            | Eine Seite; ein Bogen.                                                                    |
| F30-1            | kürzen            | Ein Format, Dateien im Repository, Prüfliste als Tabelle.                                 |
| F30-2            | tragen            | Dünn: Kennung, Name, Stufe, Route.                                                        |
| F30-3            | tragen            | Etappe 3: „sicher“ zählt heute Abschreiben als Abruftag.                                  |
| F30-4            | erst prüfen       | Wie R20-8.                                                                                |
| F30-5            | kürzen            | Nur Auffüllen über den Schnellstart; ohne Entlastungsregel und Eichung.                   |
| F30-6            | tragen            | Eine Regel statt drei.                                                                    |
| F30-7            | kürzen            | Zählung in Wörtern und „mündlich gewusst“; „gefestigt“ später.                            |
| F30-8            | streichen (12 M.) | Ändert Entscheidung 57; hängt an MA-6.                                                    |
| F30-9            | tragen            | Eine Seite statt vier.                                                                    |
| F30-10           | streichen (12 M.) | Setzt Kinder voraus, die über Monate am selben Gerät üben.                                |
| F30-11           | streichen (12 M.) | Festlegung ohne Bau vor S1 ist Arbeit auf Vorrat.                                         |
| F30-12           | tragen            | Wichtigster Baustein ohne Code.                                                           |
| F30-13           | tragen            | Zusammen mit der Verlinkung.                                                              |
| I31-1            | tragen            | Erlaubt, gebaut, nie eingesetzt.                                                          |
| I31-2            | kürzen            | Kein Einstellungsblatt (O1).                                                              |
| I31-3            | streichen (12 M.) | Dritte Steuerregel ohne Daten.                                                            |
| I31-4            | tragen            | Klein; „3 / 105“ entmutigt.                                                               |
| I31-5            | erst prüfen       | In der Beobachtung nach Bedarf fragen.                                                    |
| I31-6            | tragen            | Eine Wortbox, eine Stunde Prüfzeit.                                                       |
| I31-7            | tragen            | Leitlinie.                                                                                |
| I31-8            | kürzen            | Eine Aufwärmaufgabe, in F30-6.                                                            |
| I31-9            | tragen            | Klein.                                                                                    |
| I31-10           | kürzen            | Nur „Aufgabe bleibt sichtbar“.                                                            |
| I31-11, I31-13   | streichen (12 M.) | Hängen an Kernwörtern und Bildprüfung.                                                    |
| I31-12           | tragen            | Schützt vor Textzunahme durch neue Bausteine.                                             |
| I31-14           | tragen            | Im Beobachtungsheft.                                                                      |
| I31-15           | kürzen            | Ein Abschnitt auf der Seite F30-9.                                                        |

## 8. Zuschnitt für zwölf Monate und Streichliste

### 8.1 Drei Etappen

| Etappe                            | Bis            | Ergebnis im Unterricht                                                                                                                | Bausteine                                                                                                                                                                                                                                                                       | Inhaltsprüfung |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1 Reparieren, klären, messen      | Februar 2027   | Nichts Bekanntes ist mehr falsch. Kopfrechnen übt die Hürde. Die eigene Schule kennt den Einsatz. Ein eigenes Messergebnis liegt vor. | Sofortliste (Abschnitt 10); L25-2, L25-9, L25-10; MA-1, MA-2, MA-3, MA-5; M24-1, M24-4, M24-10; I31-4, I31-9, I31-12; F30-13; R23-7; R12-1, R12-3, R12-4, R12-5, R12-11, R12-12, R12-14; Beobachtungsheft F30-12 mit Wirksamkeitsprobe; R20-16; 100 Falschschreibungen zuordnen | etwa 6 h       |
| 2 Schnellstart                    | Pfingsten 2027 | Tablet in die Hand: in drei Minuten läuft eine passende Übung in Rechtschreibung oder Mathe, mit Strategie am Fehler.                 | F30-1 (dünn), F30-2, F30-6 mit R20-9 und MA-4; L25-1, L25-3; MA-11, MA-13; R20-2, R20-3 (erste 120 Wörter), R20-5, R20-6, R20-10, R20-14; I31-1, I31-6; L21-1, L21-2; F30-9 mit L25-14; R12-2 nach dem Gespräch                                                                 | etwa 12 h      |
| 3 Englisch-Grundlagen und Auftrag | November 2027  | Vokabelrunde live ohne Vorbereitung. Ein Auftrag öffnet die Übung. Das Kind zeigt seinen Stand.                                       | R23-1, R23-2 (Wortpaare), R23-4, R23-19; L25-4, L25-5, L25-7, L25-11; M24-6; F30-3, F30-7; R20-3 (bis 300 Wörter); MA-14. Nur bei gutem Beobachtungsergebnis: R20-8 mit F30-4, L25-8, M24-2                                                                                     | etwa 10 h      |

Das sind rund 65 Bausteine, davon etwa 45 klein. Nach meiner Rechnung aus 4.2 kosten sie etwa 130 Stunden Abnahme und 30 Stunden Inhaltsprüfung. Das lässt Luft für die Auswertung der Beobachtung und für das, was im Unterricht auffällt.

Jede Etappe endet mit einer Woche ohne neuen Code: offene Punkte schließen, Protokoll nachtragen [Empfehlung].

### 8.2 Streichliste

| Was die Vision nicht enthalten sollte                                 | Grund                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| „Mega-Plattform“, „Kompetenzlandkarte“ über alle Fächer               | Scheingenauigkeit (Bericht 30, 4.2); nicht leistbar.         |
| „Jede Schule“ oder „der Bezirk“ als Zusage für zwölf Monate           | Hängt an S1 und einem Träger, nicht am Code.                 |
| Wirkung auf PISA, Abschlüsse, Chancengerechtigkeit                    | Kein Beleg (6.4).                                            |
| Weitere Sprachen, Brückensprachen (R23-15, -16, -18)                  | Nicht die Zielgruppe; fremde Prüferinnen.                    |
| Lesen live (L21-9, M24-9)                                             | Hohe Prüfzeit, neues Raumformat, Fehlerdaten vor S1.         |
| Eigene Tonaufnahmen (R12-13, L21-14)                                  | Dauerlast je Wort.                                           |
| Haus-Sitzung über Supabase (R12-8), Lernstand über den Server         | Neuer Datenfluss ohne Nutzer; Aufwand L.                     |
| Lehrplanzuordnung in der Oberfläche (W-6)                             | Pflege bei jeder Lehrplanänderung.                           |
| Prüfansicht in der App (Teil von R20-2, F30-1)                        | Eine erzeugte Tabelle leistet dasselbe ohne neue Oberfläche. |
| Einstellungsblatt für Hilfen (I31-2), Erfolgsquoten-Steuerung (I31-3) | Nachtrag 1, Nr. 1; dritte Steuerregel.                       |
| Handschrifterkennung, Nachspuren, Anlautlehrgang, eigene Diagnostik   | Von den Fachberichten selbst ausgeschlossen; so übernehmen.  |

## 9. Was das Red Team nicht prüfen konnte

- Kein Original einer Webquelle (WebFetch gesperrt). Die Hosts supabase.com, developers.cloudflare.com, openmoji.org, newgeneralservicelist.com und levumi.de müssten in den Netzeinstellungen der Sitzung erlaubt werden.
- Den Lizenztext der NGSL-Kernliste 1.2, die Kosten von Levumi 2026, das Verhalten von Chrome bei Netzstimmen.
- Das Verhalten im Browser: Alle Befunde stammen aus Code und Dokumenten.
- Den Git-Verlauf vor dem 27.10.2026. Aussagen zur Bauzeit von Textbox und Wortspeicher stützen sich auf die Datumsangaben der Pläne.
- Die tatsächliche Wochenzeit des Entwicklers und sein KI-Kontingent. Alle Rechnungen in Abschnitt 4 beruhen auf der Annahme der Planung.
- Urheberschaft und Lizenz der Vorgänger-Repositorys für LernBox und Laufdiktat (`docs/upstream-integration.md`) und die Lizenzen der Abhängigkeiten im Einzelnen.
- Audit-Einzelberichte A bis E und G; vom Red Team des Audits nur die Fassung im Abschlussbericht (M.5 bis M.9).
- Ob die Zahl der Kinder mit festem Gerät das Bauen der Förderung aus Mustern rechtfertigt. Das kann nur die Beobachtung klären.

## 10. Sofort reparieren, unabhängig von der Vision

Geordnet nach Schaden für Kinder und nach Aufwand. Alle Punkte sind klein.

| Nr. | Was                                              | Beleg                                                                                                                                                                                                                                                                                                                                     | Was zu tun ist                                                                                                                                                                                   |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Fachfehler in den Wortboxen und Texten**       | `german-learning-content.ts`: „Ferien“ in „Langes i“ (Z. 83, zusätzlich Z. 123); Strategie „Merken“ für ie (Z. 165–167); „Club“, „Job“, „Zugweg“ (Z. 52, 55), „Zieltür“ (Z. 80), „Fehlwort“ (Z. 99); „Mädchen“, „Käfer“, „Säge“ in der Ableiten-Box (Z. 68) und im Startpunkt (`start-point.ts`, Z. 163); `homophones.ts`, Z. 28; TXT-002 | R20-1 umsetzen, etwa eine Stunde Prüfung. Texte nach Nachtrag 2, Nr. 4 sofort ausblenden. Zur s-Regel („summen“) erst Frage 7.5 aus Bericht 20 beantworten.                                      |
| 2   | **Startpunkt, Training, Profil nicht verlinkt**  | Treffer für die drei Adressen nur in den eigenen Seiten und in `src/domain/release.ts`, Z. 131; Bereich seit Entscheidung 59 `frei`                                                                                                                                                                                                       | Verlinken (Nachtrag 1, Nr. 3). Dabei den Namen festlegen (E30-7).                                                                                                                                |
| 3   | **Sprachausgabe ohne Filter für lokale Stimmen** | direkte Aufrufe: `app/components/learning-box-app.tsx`, Z. 350–355; `app/raum/spiel/live-game.tsx`, Z. 621–633; `app/raum/spiel/station-game.tsx`, Z. 137–141. Ohne `localOnly`: `app/components/use-speech.ts`, Z. 59 (Wortspeicher Stufe 6, Startpunkt). Filter nur in `src/speech/speaker.ts`, Z. 166                                  | Alle vier über `speak()` führen. Vor `localOnly` die Stimmen auf drei Gerätearten prüfen (Abschnitt 5, I). Wörter sind keine Personendaten; die Datenschutzerklärung nennt Online-Stimmen schon. |
| 4   | **Vorlese-Knopf nirgends eingebunden**           | `ReadAloudButton` nur in `app/ui/read-aloud-button.tsx` und im Test; Entscheidung 58 sagt, er „steht dort, wo das Kind den Text für die Aufgabe braucht“                                                                                                                                                                                  | In Aufgabenstellungen einsetzen (I31-1) oder das Protokoll berichtigen.                                                                                                                          |
| 5   | **Fehler im Entscheidungsprotokoll**             | Entscheidung 54: Texte „von der Lehrkraft fachlich geprüft“, laut `docs/inhalte/textbox.md` nicht. Entscheidung 53 fehlt (nur `docs/cloud-sync.md`). Die Rücknahme des Wortauftrags (Welle 3, D4) und die Festlegungen vom 27.10. (C4-5, C5, C3-3, D5-2, D5-5) stehen nur in Wellen-Plänen. Index, Zeilen 1, 23, 41, 44 und G4 veraltet   | Aufgabe der Rolle 50, zusammen mit den Einträgen zu Nachtrag 2 (berührt 30, 38, 45, 54, 55, 57).                                                                                                 |
| 6   | Battle: Störangriffe und Flimmern sind Standard  | `src/integrations/laufdiktat/teacher-session.ts`, Z. 163; Audit D-012                                                                                                                                                                                                                                                                     | Standard aus (M24-4, zugesagt in Nachtrag 2, Nr. 7).                                                                                                                                             |
| 7   | Markenfiguren im Einsatz                         | `public/figuren/` mit `QUELLE.md` („vor einer öffentlichen Nutzung … prüfen“); `src/domain/figures.ts`                                                                                                                                                                                                                                    | Vor jeder Lizenzdatei und jeder weiteren Schule ersetzen.                                                                                                                                        |
| 8   | Impressum widerspricht dem Betrieb               | `app/impressum/page.tsx`, Z. 20, 26                                                                                                                                                                                                                                                                                                       | Ehrlich fassen (Bericht 12, E-4).                                                                                                                                                                |

## 11. Offene Entscheidungen aus den Berichten 30 und 31

| Nr.   | Kern                                                                    | Empfehlung des Red Teams                                                                                                                                                                                                      |
| ----- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E30-1 | „Sicher“ bleibt, dazu „gefestigt“, Zählung in Wörtern, Einheiten von 30 | **Ja, in zwei Schritten.** Zählung in Wörtern sofort (mit I31-4). Einheiten von 30 erst mit den Kernwörtern. „Gefestigt“ später; es ist nur eine weitere Ableitung.                                                           |
| E30-2 | Vokabelstapel nicht mehr über Selbsteinschätzung „sicher“               | **Ja.** „Mündlich gewusst“ ist ehrlicher. Das nimmt die Festlegung vom 27.10. zurück und braucht den Eintrag „Zurückgenommen“.                                                                                                |
| E30-3 | Basisfakten in den Plan, Antwortzeit lokal speichern                    | **Teilen.** Basisfakten: ja, aber nach MA-1, frühestens im zweiten Jahr. Antwortzeit: nein, erst prüfen (Tippzeit, unerprobte Schwelle, neues Speicherformat).                                                                |
| E30-4 | „Heute“ als Zeiteinheit aus drei Blöcken                                | **Ja im Grundsatz, klein gebaut:** Portion plus Auffüllen über den Schnellstart. Entlastungsregel und geeichte Zeiten nicht.                                                                                                  |
| E30-5 | Gemeinsame Startpunkt-Regel                                             | **Ja,** mit einer Aufwärmaufgabe vorweg (Abschnitt 5, D). Vorher klären, wie viele Schulgeräte eine lokale Stimme haben; sonst entfällt der Rechtschreib-Startpunkt gerade dort, wo er gebraucht wird.                        |
| E30-6 | Musterschwelle für beide Fächer, Kurzbericht mit Zähler und Nenner      | **Schwelle ja, als Arbeitsannahme.** Gebaut wird erst nach der Probe an echten Falschschreibungen und der Beobachtung. Das Format des Kurzberichts jetzt nicht festlegen; vor S1 hat niemand etwas davon.                     |
| E30-7 | „Mein Stand“ statt „Kompetenzprofil“, Wortliste                         | **Ja,** zusammen mit der Verlinkung. Die interne Kennung `diagnostik` bleibt; ihre Umbenennung kostet nur.                                                                                                                    |
| E30-8 | Lesen allein zeigt Durchgänge, keine Zeiten                             | **Ja.** Es ist auch die billigere Lösung.                                                                                                                                                                                     |
| E30-9 | Wirksamkeitsprobe vor dem Bezirk                                        | **Ja, und früher:** in Etappe 1 mit den vorhandenen Lernwortlisten. Sie braucht keinen Code und liefert das erste eigene Ergebnis.                                                                                            |
| O1    | Neutrale Hilfen als Geräteeinstellung                                   | **Nur zum Teil.** Vorlesen in Aufgaben (I31-1) und die Raumoption „Aufgabe bleibt sichtbar“: ja. Kein Einstellungsblatt: Runden zu 5 gibt es schon (Entscheidung 30), freies Üben hat keine Uhr, Schriftgröße kann das Gerät. |
| O2    | Fehler streuen, bei unter 70 % nichts Neues                             | **Nein, erst beobachten.** Es ändert die feste Reihenfolge aus Entscheidung 57 und wäre die dritte Steuerregel ohne Daten.                                                                                                    |
| O3    | Schreiberleichterung bei S1                                             | **Bis dahin unverändert und im Alltag ungenutzt** (Datensparmodus, Audit M.8 Nr. 5). Bei S1 neige ich zu „auslaufen lassen“: Das lesbare Bit im QR ist das einzige LRS-Merkmal im System.                                     |
| O4    | Unterste Stufe „lautgetreu und Silbe“                                   | **Ja,** als schlichte Wortbox ohne Silbendaten. Eine Stunde Prüfzeit öffnet den Einstieg für die schwächsten Kinder der Zielgruppe.                                                                                           |
| O5    | Fehler an der Tafel erst ab sechs Teilnehmenden                         | **Ja.** Klein. Berührt die Festlegung vom 27.10. (D5-5) und braucht einen Eintrag.                                                                                                                                            |
| O6    | „Fehler setzt auf Box 1“ bleibt                                         | **Ja.** Nur die Anzeige ändern (I31-4).                                                                                                                                                                                       |
| O7    | Die Vision sagt, wen Lernraum nicht bedient                             | **Ja, unbedingt.** Kostet nichts und schützt vor falschen Erwartungen im Bezirk.                                                                                                                                              |

## 12. Lizenz für den Code

Ausgangslage [Beleg]: keine Lizenzdatei, `"private": true`, das Impressum nennt alles „urheberrechtlich geschützt“. Die Inhalte stehen nach Nachtrag 2, Nr. 11 unter CC BY-SA 4.0. Das ist **keine Rechtsberatung**.

| Lizenz          | Was sie bewirkt                                                                                                                                                                                                                                        | Eignung für Lernraum                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| MIT, Apache-2.0 | Jeder darf alles, auch geschlossen und mit Konten oder Werbung weiterbetreiben.                                                                                                                                                                        | Einfach, schützt aber das Ziel „bleibt frei“ nicht.                                                                |
| MPL-2.0         | Änderungen an vorhandenen Dateien bleiben offen; neue Dateien nicht.                                                                                                                                                                                   | Zu schwach für eine Web-App.                                                                                       |
| AGPL-3.0        | Wer eine geänderte Fassung im Netz betreibt, muss den Quelltext anbieten.                                                                                                                                                                              | Stärkster Schutz, weit bekannt. Nur englischer Text; schreckt manche Träger ab [Vermutung].                        |
| **EUPL-1.2**    | Wie AGPL auch für das Bereitstellen im Netz; amtliche deutsche Fassung; es gilt das Recht eines EU-Staats; der Anhang erlaubt die Verbindung mit GPL, AGPL und CC BY-SA für Nicht-Software [Fachstand, interoperable-europe.ec.europa.eu, Suchauszug]. | Für Schulamt, Sachaufwandsträger und eine mögliche Übergabe an eine öffentliche Stelle am leichtesten zu erklären. |

**Vorschlag [Empfehlung]: Code unter EUPL-1.2, Inhalte unter CC BY-SA 4.0, getrennt nach Ordnern.** Wer den stärksten Schutz will, nimmt AGPL-3.0; beide erfüllen den Zweck aus Bericht 12, E-3.

Vorher zu klären:

1. **Inhalte aus dem Quellcode lösen.** Wortboxen und Texte sind TypeScript-Konstanten. Erst als eigene Dateien lassen sie sich eindeutig unter CC BY-SA stellen (passt zu F30-1).
2. **Bilder.** Markenfiguren ersetzen; Herkunft der Tierbilder dokumentieren (Bericht 12). Sonst deckt die Lizenz Dateien, über die der Entwickler nicht verfügen darf.
3. **Name und Logo** „Lernraum“ ausdrücklich ausnehmen.
4. **Vorgänger-Repositorys** für LernBox und Laufdiktat: Urheberschaft und Lizenz prüfen (`docs/upstream-integration.md`).
5. **KI-erzeugter Code.** Ob er Urheberrechtsschutz genießt, ist offen [Vermutung]. Eine Copyleft-Lizenz ließe sich dann schwerer durchsetzen. Für das Ziel „jeder darf weiterführen“ schadet das nicht. Bei der Klärung des Einsatzrahmens eine Juristin fragen.
6. Die Abhängigkeiten (React, Dexie, Zod, KaTeX, Supabase-Client, QR-Bibliotheken, Schriften unter OFL) sind nach meiner Kenntnis frei und verträglich; im Einzelnen ungeprüft.

## 13. Entscheidungen vor der Zusammenführung

| Nr. | Frage                                                                                                                      | Empfehlung                                                                                        | Ohne Entscheidung                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Soll die Vision für zwölf Monate rund 65 Bausteine in drei Etappen enthalten und den Rest unter „später“ oder gar nicht?   | Ja (Abschnitt 8).                                                                                 | Rolle 50 schreibt 146 Bausteine in den Vault; in einem Jahr sind viele angefangen. |
| 2   | Ersetzt „eigene Schule förmlich, dann zwei bis drei Pilotschulen“ das Ziel „Schulamtsbezirk“? Wann ist das Gespräch zu S1? | Ja. Termin vor den Weihnachtsferien.                                                              | Alles mit Namen, Kurzbericht und fremden Schulen bleibt in der Schwebe.            |
| 3   | Wird die Förderung aus Fehlermustern (R20-8, F30-4, Kurzbericht) erst nach Beobachtung und Probe gebaut?                   | Ja. Kernwörter, Strategie am Fehler und Kontrastrunden kommen vorher; sie wirken auf jedem Gerät. | Der teuerste Teil wird für eine Gruppe gebaut, deren Größe niemand kennt.          |
| 4   | Eine Inhaltslinie zur Zeit (Korrekturen, Kernwörter, Englisch als Wortpaare), Lesetexte und Satzformate im zweiten Jahr?   | Ja. Dazu eine Fachkollegin als zweite Prüferin suchen.                                            | Vier Inhaltslinien teilen sich zwei Stunden je Woche.                              |
| 5   | Lesen im ersten Jahr nur als Tandem-Begleiter und Chorlesen, ohne eigenen Lesebereich?                                     | Ja. Das deckt Nachtrag 2, Nr. 5 und vermeidet ein neues Modul ohne Modulvertrag.                  | Ein fünfzehnteiliger Bereich beginnt neben der Rechtschreibung.                    |
| 6   | Lizenz: EUPL-1.2 für den Code, Markenfiguren vorher heraus?                                                                | Ja (Abschnitt 12).                                                                                | Bei Ausfall darf niemand weiterführen.                                             |
| 7   | Sprachausgabe überall nur lokal, auch wenn Vorlesen auf manchen Geräten dann fehlt?                                        | Ja, nach der Geräteprüfung und mit sichtbarem Hinweis.                                            | Entscheidung 58 und der Code widersprechen sich weiter.                            |
| 8   | E30-2 (eigene Festlegung zurücknehmen), E30-3 (Antwortzeit), O1 (Hilfen), O2 (Portion): wie in Abschnitt 11?               | E30-2 ja; Antwortzeit nein; O1 nur zum Teil; O2 nein.                                             | Entscheidung 57 wird an vier Stellen zugleich geändert.                            |

## Quellen der Websuche

Alle abgerufen am 11.11.2026, nur als Suchauszug.

- supabase.com/pricing; costbench.com/software/database-as-service/supabase/free-plan
- developers.cloudflare.com/workers/platform/pricing; developers.cloudflare.com/workers/platform/limits
- newgeneralservicelist.com (Seiten zu NGSL 1.2, NGSL-Spoken, NAWL, NGSL-GR); github.com/marmooo/mGSL
- openmoji.org/faq; aulaabierta.arasaac.org/en?p=66857
- huggingface.co/rhasspy/piper-voices (Modellkarte de_DE thorsten)
- developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService
- epub.ub.uni-muenchen.de/108476 (Anleitung Levumi); epub.ub.uni-muenchen.de/107880
- uni-potsdam.de/en/zelb/bildungsforschung-und-transfer/digital-labs/digital-pioneers/orthografietrainer; bildungsserver.de (Eintrag Orthografietrainer)
- bayern.landtag.de, Antwort der Staatsregierung zum Grundwortschatz (Wahlperiode 19)
- bllv.de/fileadmin/BLLV/Download/Studien/2021_IGLU_ZDF_Pressemappe_Kurzfassung.pdf; kmk.org (Mitteilung zu IGLU 2021)
- nichd.nih.gov/sites/default/files/publications/pubs/nrp/Documents/ch3.pdf
- learntechlib.org/p/133202; apps.asha.org/EvidenceMaps (Cheung und Slavin 2013)
- opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056 (Sailer und Homner 2020)
- pmc.ncbi.nlm.nih.gov/articles/PMC5494021 (Wood u. a. 2018)
- interoperable-europe.ec.europa.eu/page/eupl-compatible-open-source-licences; spdx.org/licenses/EUPL-1.2
