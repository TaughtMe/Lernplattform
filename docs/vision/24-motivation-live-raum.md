# Vision Lernraum – Rolle 24: Motivation, Spielformen und Live-Raum

Stand: 10.11.2026. Grundlage: Code der Version 0.9.7, Berichte 10, 11 und 12,
`01-planung.md` Abschnitt 1 und 4 einschließlich „Nachtrag nach Phase 1“,
Vault 02, 09, 10, 22, 23, Entscheidungsprotokoll, Audit D-012 und Welle 3
(D5-5), Websuche vom 10.11.2026.

Kennzeichen: [Beleg] Repository, [Fachstand] Forschung oder anerkannte Praxis
mit Quelle, [Vermutung] plausibel, nicht belegt, [Empfehlung] Vorschlag dieser
Rolle. Webquellen stehen am Ende (W1 bis W11). WebFetch war gesperrt (Host nicht
auflösbar); alle Webangaben stammen aus Suchauszügen und sind am Volltext
**ungeprüft**. Es gibt keine Nutzungsdaten, nur die Rückmeldung der Kollegen.

## 1. Kurzfazit

1. Der Live-Raum ist kein Quiz im Kahoot-Stil. Alle starten gemeinsam, dann
   arbeitet jedes Kind **im eigenen Tempo**: Aufgabe einprägen, verdecken,
   Ergebnis tippen (`app/raum/spiel/live-game.tsx`). Es gibt keine Frage-Uhr,
   keine Rangliste und keine Punkte für Schnelligkeit, außer die Lehrkraft
   schaltet Tempo-Punkte ein. [Beleg]
2. Was zündet, ist vermutlich die Mischung aus gemeinsamem Start, sofortiger
   Rückmeldung, vielen Aufgaben in kurzer Zeit, Tier statt Name und der
   Lehrkraft als Spielleitung. Das Tempo entsteht im Raum: Man hört und sieht,
   wer fertig ist. [Vermutung]
3. Zwischen „schnell, spielerisch, motivierend“ (Antwort 5) und den
   Grundsätzen gibt es eine echte Spannung, aber keinen unauflösbaren
   Widerspruch. Die Grundsätze verbieten **Tempo als individuelle Belohnung**
   und **öffentliche Einzelranglisten** (Entscheidungen 7, 10, Vault 23,
   RL-6). Sie verbieten nicht, dass sich eine Runde schnell anfühlt.
4. Meine Empfehlung: **Tempo kollektiv machen, Genauigkeit individuell
   belohnen.** Die Klasse spielt gegen die Uhr und gegen ihren eigenen
   Klassenrekord, das Kind sammelt Sterne für Richtigkeit und sieht privat,
   ob es besser geworden ist. Das ist eine Entscheidungsvorlage (Abschnitt 7,
   E-1), weil Vault 23 „Schnelle Antwort: kein eigener Bonus“ dann präzisiert
   werden muss.
5. Der größte Hebel mit wenig Aufwand ist ein **Teammodus** mit zufälligen
   Rundenteams und einem Klassenziel auf der Tafel. Er ist mit den Grundsätzen
   vereinbar, braucht keine Häuser und keine neuen Daten über einzelne Kinder.
6. Das Battle hat formal keine Sieger, belohnt aber weiter indirekt Tempo:
   Wer schneller richtig antwortet, lädt schneller Angriffe. Störangriffe sind
   standardmäßig an
   (`src/integrations/laufdiktat/teacher-session.ts`, Standard für
   `battleOptions`). Das Audit hatte „standardmäßig aus“ empfohlen. [Beleg]
7. Neue Live-Formate lohnen sich zuerst dort, wo die Lehrkraft **nichts
   vorbereiten** muss: Kopfrechnen mit Schnellstart und Rechtschreibung aus
   den mitgelieferten Wortboxen. Lesen live ist später und teuer in der
   Prüfung.
8. Beim Üben allein tragen ein erreichbares Tagesziel und sichtbares Können
   („neu → im Aufbau → sicher“) mehr als Punkte. Dafür ist fast alles gebaut;
   es fehlt ein „Das kannst du jetzt“-Rückblick.
9. Die ausgeschaltete Motivationsschicht (Häuser, Serie, Abzeichen, Duell)
   soll weiter ruhen. Der kleinste sinnvolle erste Schritt liegt im Live-Raum,
   nicht im Üben allein, und lässt sich im Unterricht sofort erproben.
10. Für Vierzehnjährige wirken Tiere und Sterne schnell kindlich. Die geheimen
    Figuren (Harry Potter, Marvel, Star Wars) sprechen Jugendliche an, sind
    aber markenrechtlich ungeprüft (`public/figuren/QUELLE.md`).

## 2. Ist-Stand in Lernraum

### 2.1 Der Live-Raum, zerlegt in Wirkelemente

| Element                      | So ist es gebaut [Beleg]                                                                                                                                                                                                            | Wirkung [Vermutung, außer markiert]                                                                                               | Risiko                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Beitritt ohne Konto          | 4-stelliger Code oder QR, Lobby mit eigenem Tier (`app/components/live-room-join.tsx`, Ansichten `lobby`, `starting`, `game`)                                                                                                       | In 60 Sekunden spielt die ganze Klasse. Das ist für Lehrkräfte vermutlich der stärkste Einzelfaktor („ohne Vorbereitung sofort“). | gering                                                                                                           |
| Gemeinsamer Start            | Lehrkraft drückt „Sitzung starten“; alle sehen zugleich den ersten Abschnitt (`lobby-step.tsx`, Z. 80–83)                                                                                                                           | Spannung wie beim Startschuss; Zugehörigkeit („wir spielen jetzt“).                                                               | gering                                                                                                           |
| Eigenes Tempo nach dem Start | Jedes Kind geht Aufgabe für Aufgabe allein weiter (`live-game.tsx`, Z. 255–312)                                                                                                                                                     | Schwächere werden nicht von einer Frage-Uhr überholt. Das ist ein großer Vorteil gegenüber Kahoot.                                | Schnelle sind früh fertig und warten.                                                                            |
| Merk-Komponente bei Mathe    | Aufgabe halten zum Ansehen, loslassen zum Schreiben; die Aufgabe ist beim Tippen verdeckt, erst nach 2 Fehlern wieder sichtbar (`showTaskAfterErrors`, Z. 823–829)                                                                  | Macht aus Kopfrechnen ein Gedächtnisspiel.                                                                                        | Zusätzliche Last für das Arbeitsgedächtnis, gerade bei schwachen Rechnern (Abschnitt 3).                         |
| Sofortige Rückmeldung        | „Richtig“ nach 0,55 s weiter; „Noch nicht richtig. Versuche es erneut.“ (Z. 761)                                                                                                                                                    | Hoher Takt, viele Erfolgserlebnisse.                                                                                              | gering; die Meldung ist neutral formuliert.                                                                      |
| Tiere statt Namen            | Anonymer Serverschlüssel, Anzeige „Fuchs 2“ (`participant-display.ts`)                                                                                                                                                              | Spielfigur, Schutz vor Bloßstellung.                                                                                              | Mitschüler können Tiere den Kindern zuordnen, wenn sie aufs Tablet schauen.                                      |
| Sterne am Ende               | 0 Fehler = 5 Sterne, sonst nach Fehlerquote (`computeRunningDictationStars`, `running-dictation.ts`, Z. 241–251); abschaltbar                                                                                                       | Belohnt Genauigkeit, nicht Tempo. Passt zu Vault 10.                                                                              | 1 Stern bei vielen Fehlern kann entmutigen.                                                                      |
| Tempo-Punkte                 | Zeichen pro Sekunde × 100, nur privat am Ende, nur wenn eingeschaltet (`live-game-feedback.ts`; `showTempoPoints ?? false`)                                                                                                         | Unbekannt, ob Kollegen sie nutzen (Antwort 5 sagt dazu nichts).                                                                   | Widerspricht Vault 23, wenn eingeschaltet; bei Mathe sagt „Zeichen pro Sekunde“ wenig.                           |
| Battle                       | Ladung je richtige Antwort 25, für Zurückliegende 34 (`battleChargeGain`); Tinte, Flimmern, Schild; Ziele sind die bis zu drei Nächstplatzierten (`pickRunningDictationBattleCandidates`); Meldung „Angriff von Fuchs“ (Z. 322–332) | Starker Spielreiz für Ältere; der Aufholbonus ist gut gedacht.                                                                    | Schnelle laden schneller (Tempo indirekt); Angriffe treffen beim Lesen; Absender wird genannt; Störung standard. |
| Tafelansicht                 | „Für die Tafel“: Code, QR, „12 von 24 fertig“, Gesamtbalken, höchstens 5 häufigste Fehlerwörter, keine Namen (`live-projection.ts`, `live-step.tsx`, Z. 190–260)                                                                    | Das ist bereits ein gemeinsames Ziel. Der Balken ist die Keimzelle eines Klassenspiels.                                           | Sieht man nur, wenn die Lehrkraft umschaltet; die Lehreransicht mit „Braucht Hilfe“ ist der Standard.            |
| Rolle der Lehrkraft          | Startet, beobachtet je Tier Fortschritt, Fehler, „Braucht Hilfe“, CSV (`live-step.tsx`, Z. 102–163)                                                                                                                                 | Spielleitung und Förderblick zugleich.                                                                                            | Projiziert sie die Lehreransicht, sind Fehlerzahlen je Tier öffentlich (Audit D-012).                            |
| Danach allein weiter         | „Meine Fehler üben“, „Weitere Aufgaben üben“ (Z. 567–598); Fehlerwörter in Wortspeicher und LernBox                                                                                                                                 | Brücke vom Spiel ins Lernen; die Alleinstellung laut Bericht 11.                                                                  | Auf fremden Geräten geht diese Brücke verloren (Nachtrag 2).                                                     |
| Stationen                    | Geteilte Geräte mit Nummern, Schreiben auf Papier, keine Übernahme (`station-game.tsx`; Entscheidung 49)                                                                                                                            | Bewegung, ohne eigenes Gerät.                                                                                                     | gering                                                                                                           |

### 2.2 Üben allein als Motivationsträger

| Träger                   | Stand [Beleg]                                                                                                                  | Bewertung                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Tagesportion             | 20 Aufgaben, „Noch 3 Aufgaben, dann ist der Tag voll“, Rückstand nie als Zahl (`home-screen.tsx`, Z. 268–289; Entscheidung 57) | Sehr gut: erreichbares, klares Ziel. Nur auf festen Geräten sinnvoll (Nachtrag 2).                                                         |
| Wochenanzeige            | „Diese Woche: X von 7 Tagen“, vergangene Tage „nicht geübt“ (`home-screen.tsx`, Z. 235–263)                                    | Zählt Wochenende mit und zeigt Lücken. Vault 23 verlangt verzeihende Ziele („3 von 5 Tagen“).                                              |
| Tagestraining            | 10 oder 20 Minuten, aktive Zeit (`daily-training.ts`)                                                                          | Gute Wahlfreiheit (Autonomie). Heute nicht verlinkt; wird behoben (Nachtrag 3).                                                            |
| Kompetenzprofil          | „neu / im Aufbau / sicher“, sicher erst nach Abruf an zwei Tagen (`competence-profile.ts`; Welle 3, D2-3)                      | Ehrlichster Motivationsträger, den Lernraum hat. Zeigt Können statt Fleiß.                                                                 |
| Fortschrittsseite        | Aktivität, Wortspeicher, Textbox; Reflexionsfragen ab zwei Ergebnissen (`progress-reflection.ts`)                              | „Wie stark hast du dich verbessert?“ ist gut. „Ist dein Ergebnis bei jeder Übung gestiegen?“ setzt einen Maßstab, den niemand halten kann. |
| Erstkontakt              | „Loslegen“ führt ins freie Üben (`first-contact.ts`)                                                                           | Ehrlich; auf fremden Geräten der Normalfall.                                                                                               |
| Serie, Abzeichen, Häuser | gebaut, `motivation: aus` (`release.ts`; `houses.ts`)                                                                          | ruhen (Antwort 7, Nachtrag 4).                                                                                                             |

### 2.3 Was falsch oder veraltet ist

- Vault 10, Nachtrag Welle 3, sagt „der Battle nach Tempo ist nicht Teil von
  Welle 3“. Welle 3, D5-5, hat das Battle aber umgetextet („Gemeinsam die
  Runde abschließen“, `constants.ts`). Der Vault ist hier älter als der Code.
  [Beleg]
- Audit D-012 empfahl „Störangriffe standardmäßig aus“ und G6 „Absendertext
  nicht anzeigen“. Beides ist nicht umgesetzt (`teacher-session.ts`;
  `live-game.tsx`, Z. 322, 330). Bericht 10 nennt das nicht; es ist kein
  Fehler des Berichts, aber eine Lücke. [Beleg]
- Bericht 11 fand keine Studien zu Tempo und Wettbewerb bei Schwächeren. Ich
  habe einige gefunden (Abschnitt 3); sie sind uneinheitlich.

## 3. Fachstand und Vorbilder

### 3.1 Was gesichert ist und was umstritten

| Befund                                                                                                                                                                                                                                                                                            | Sicherheit                                | Quelle                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| Gamification wirkt im Mittel klein bis mittel: kognitiv g = 0,49, motivational g = 0,36. Die motivationale Wirkung ist in strengen Studien nicht stabil. Spielgeschichte und soziale Interaktion sind günstige Moderatoren; Wettbewerb **mit** Zusammenarbeit wirkt besser als Wettbewerb allein. | [Fachstand], mittel                       | Sailer & Homner 2020 (W1)                                              |
| Eine Kursreihe mit Rangliste und Abzeichen senkte über 16 Wochen Motivation und Zufriedenheit und über die Motivation die Prüfungsnote.                                                                                                                                                           | [Fachstand], ein Kurs                     | Hanus & Fox 2015 (W2)                                                  |
| Neuheitseffekt: Die Wirkung fiel nach etwa vier Wochen ab und erholte sich teilweise ab Woche sechs (Gewöhnung).                                                                                                                                                                                  | [Fachstand], Hochschule                   | Rodrigues u. a. 2022 (W3)                                              |
| Rückmeldung über die **eigene Verbesserung** im Vergleich steigerte bei leistungsschwachen Grundschulkindern Motivation und Matheleistung, ohne den Starken zu schaden. Rückmeldung über die **absolute Rangposition** schadete in einer anderen Untersuchung den Schwachen.                      | [Fachstand], Arbeitspapier, ungeprüft     | Univ. Mainz, Diskussionspapier 1908 (W4)                               |
| Endlose Ranglisten schaden; Zusammenarbeit gleicht das nicht vollständig aus. Vergleich mit Nachbarplätzen wirkt eher als mit der Spitze.                                                                                                                                                         | [Fachstand], klein                        | Übersicht Tampere (W5); HKU-Studie (W6)                                |
| Kooperatives Lernen mit Teampunkten aus **Verbesserung** (STAD, Teams-Games-Tournaments) wirkt positiv auf Leistung; reine Gruppenarbeit ohne individuelle Verantwortung weniger.                                                                                                                 | [Fachstand], gut belegt, Zahlen ungeprüft | Meta-Analyse 164 Studien zu kooperativen Methoden (W7)                 |
| Mathe-Angst verdrängt Arbeitsgedächtnis; unter Zeitdruck ist der Zusammenhang stärker. Ob Zeittests Angst **verursachen**, ist experimentell nicht belegt.                                                                                                                                        | [Fachstand], umstritten                   | Übersichten W8, W9                                                     |
| Erwartete, an Leistung gebundene Belohnungen können intrinsische Motivation untergraben; Lob und Rückmeldung über Können kaum.                                                                                                                                                                    | [Fachstand]                               | Deci, Koestner & Ryan 1999, zitiert im Audit (Volltext hier ungeprüft) |
| Quiz-Formate im Unterricht: hohe mittlere Effekte, aber anbieternahe Metaanalyse.                                                                                                                                                                                                                 | [Fachstand], fraglich                     | Özdemir 2025, Bericht 11 (J2)                                          |

Was daraus folgt [Empfehlung]: Wettbewerb ist nicht per se schädlich. Schädlich
sind **absolute, dauerhafte, öffentliche** Vergleiche einzelner Kinder.
Günstig sind Vergleiche mit sich selbst, Teamwertungen mit individueller
Verantwortung und Spielelemente, die nach wenigen Wochen nicht verpuffen, weil
sie an echtes Können gekoppelt sind.

### 3.2 Vorbilder

| Anbieter | Was sich lohnt                                                                                                                                                                                                         | Quelle, Stand                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Kahoot   | Punkte hängen standardmäßig von der Antwortzeit ab. Es gibt aber eine „Accuracy experience“, die nur Richtigkeit wertet, und einen Teammodus mit kurzer Beratungszeit („team talk“) und Wertung nach Teamdurchschnitt. | support.kahoot.com (W10), Suchauszug |
| Blooket  | Teammodi, in denen jede Antwort einzeln gegeben wird, aber in einen Teamtopf zählt.                                                                                                                                    | Drittseiten (W11), ungeprüft         |
| Gimkit   | Teammodi; im Spiel eine Ingame-Währung. Einzelheiten nur aus Drittquellen.                                                                                                                                             | W11, ungeprüft                       |

Bemerkenswert [Vermutung]: Selbst der Marktführer bietet inzwischen einen Modus
ohne Tempo. Das spricht dafür, dass Lehrkräfte das Problem kennen. Der
Live-Raum hat mit dem Arbeiten im eigenen Tempo schon einen Vorteil, den
Kahoot nicht hat: Kein Kind wird von der Frage-Uhr abgehängt.

## 4. Zielbild

### 4.1 Kind im Live-Raum

Das Kind scannt den QR, sieht sein Tier und die Lobby. Die Tafel zählt
„3, 2, 1“. Es rechnet im eigenen Tempo. Jede richtige Antwort lässt den
Klassenbalken an der Tafel wachsen; im Teammodus wächst zusätzlich der Balken
seines Rundenteams („Team Bernstein“). Es sieht auf dem eigenen Gerät eine
**Richtig-Serie** („5 richtig in Folge“), nicht seine Zeit. Am Ende bekommt es
Sterne für Genauigkeit und, wenn es auf einem festen Gerät spielt, privat den
Satz „Besser als letztes Mal: 2 Fehler weniger“. Kein Kind sieht eine
Platzierung anderer Kinder. Danach führt „Meine Fehler üben“ ins Üben allein.

### 4.2 Lehrkraft im Live-Raum

Sie wählt „Schnellstart Kopfrechnen“ oder eine Wortbox und öffnet den Raum in
unter einer Minute. Sie entscheidet je Runde: **Ruhig** (wie heute),
**Gegen die Uhr** (die Klasse gegen ihren eigenen Klassenrekord), **Team**
(zufällige Rundenteams, Wertung nach Richtigkeit je Kopf) oder **Battle**. Die
Tafel zeigt das Klassenziel und am Ende einen kurzen Showmoment („Die Klasse
hat 412 Aufgaben gelöst, 94 % richtig, neuer Klassenrekord“). Ihre eigene
Ansicht mit „Braucht Hilfe“ bleibt auf ihrem Gerät.

### 4.3 Kind beim Üben allein

Auf einem festen Gerät: Tagesportion, Wochenziel „3 von 5 Schultagen“,
Kompetenzprofil und einmal pro Woche ein Rückblick „Das kannst du jetzt“. Auf
einem fremden Gerät: freies Üben mit Richtig-Serie und Sternen, ohne
Gedächtnis über den Tag hinaus.

### 4.4 Prüfstein „Tablet in die Hand, ohne Vorbereitung, 20 Minuten“

| Situation             | Trägt heute?                                                                                             | Trägt im Zielbild?                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Live, Kopfrechnen     | Ja: Generator ohne Eingabe (`generateMentalMathSource`); die Lehrkraft stellt aber mehrere Optionen ein. | Ja, mit Schnellstart in zwei Tipps; drei Runden à 5 bis 7 Minuten mit Moduswechsel.    |
| Live, Rechtschreibung | Nur mit selbst getipptem Text oder Ablage                                                                | Ja, mit Wortbox als Quelle (M24-6).                                                    |
| Live, Vokabeln        | Nur mit eigener Liste                                                                                    | Nur mit eigener Liste; mitgelieferte Vokabeln sind Sache von Rolle 23.                 |
| Allein, fremdes Gerät | Freies Üben (Nachtrag 2)                                                                                 | Freies Üben mit Richtig-Serie; 20 Minuten tragen, wenn die Inhalte altersgerecht sind. |
| Allein, eigenes Gerät | Tagesportion, Training (nach Verlinkung)                                                                 | dazu Wochenziel und Rückblick                                                          |

## 5. Konkrete Bausteine

Aufwand: S bis etwa eine Woche, M zwei bis vier Wochen, L länger. Prüfaufwand
der Lehrkraft für Inhalte: kein, S, M, L. Alle Bausteine lassen sich im
Unterricht erproben (Antwort 6).

| Nr.    | Baustein                                                                                                                                                                                                                                                                                 | Nutzen und Szenario                                                                                                                       | Entw. | Prüf. | Abhängigkeiten                                           | Berührte Entscheidungen                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| M24-1  | **Klassenziel an der Tafel:** Countdown „3, 2, 1“ beim Start auf Tafel und Geräten; Klassenbalken zählt richtige Antworten aller; Rundenende mit Showmoment (gelöst, Anteil richtig, häufigster Fehler). Nur Summen, nie Kinder.                                                         | Gemeinsames Spielgefühl ohne Vergleich. Jede Mathestunde.                                                                                 | S     | kein  | Projektionsmodus (vorhanden)                             | 7, 10; D5-5                                                        |
| M24-2  | **Modus „Gegen die Uhr“:** Die Klasse spielt eine feste Zeit (z. B. 5 Minuten) und versucht, mehr richtige Aufgaben als beim letzten Mal zu schaffen. Der Klassenrekord liegt nur auf dem Lehrergerät, je Klasse und Aufgabenart. Falsche Antworten zählen nicht, ziehen aber nichts ab. | Liefert „schnell“ als kollektiven Reiz. Kein Kind wird schneller belohnt als ein anderes; jeder richtige Beitrag hilft.                   | S–M   | kein  | M24-1; Klassen auf dem Lehrergerät                       | Vault 23 („Schnelle Antwort: kein eigener Bonus“): **Vorlage E-1** |
| M24-3  | **Teammodus mit Rundenteams:** Beim Start werden zufällige Teams (3 bis 4, nach Farben) gebildet, jede Runde neu. Wertung: richtige Antworten je aktivem Mitglied, gedeckelt; Sterne-Schnitt des Teams. Team-ID liegt bei den Raumdaten und wird mit ihnen nach 24 h gelöscht.           | Zusammenarbeit, Zugehörigkeit, Spannung. Schwache Kinder tragen bei, ohne dass ihr Anteil sichtbar wird.                                  | M     | kein  | M24-1; Supabase-Migration Raumtabelle                    | 7 (Teamwerte bevorzugt), 10, 39; Häuser ruhen: **Vorlage E-3**     |
| M24-4  | **Battle nach Genauigkeit:** Ladung aus Richtig-Serien statt aus jeder richtigen Antwort (Fehler setzt die Serie zurück, nicht die Ladung); Störangriffe standardmäßig aus; ohne Absendername („Ein Angriff!“); Tinte nicht während der Merkphase.                                       | Behält den Reiz des Battles für Ältere, entkoppelt es vom Tempo.                                                                          | S     | kein  | –                                                        | 37; Audit D-012, G6: **Vorlage E-2**                               |
| M24-5  | **Richtig-Serie und privater Vergleich mit sich selbst:** im Spiel „5 richtig in Folge“; am Ende auf festen Geräten „2 Fehler weniger als letztes Mal“ (lokal). Tempo-Punkte werden zu „schneller als letztes Mal“, nur wenn die Genauigkeit gleich oder besser ist.                     | Verbesserung statt Rangplatz (W4). Auch das schwächste Kind kann gewinnen.                                                                | S     | kein  | lokale Lernereignisse (vorhanden)                        | Vault 23; D5-5: **Vorlage E-1**                                    |
| M24-6  | **Schnellstart:** Voreinstellungen in zwei Tipps (Einmaleins, Zehnerübergang, Plus/Minus bis 1000, Wortbox „Doppelkonsonanten“ usw.). Wortboxen werden als Live-Quelle wählbar.                                                                                                          | Prüfstein ohne Vorbereitung. Vertretungsstunde.                                                                                           | S     | S     | Wortboxen fachlich geprüft (Rolle 20)                    | 38, 51, 55                                                         |
| M24-7  | **Formatvertrag für Live-Spiele:** Ein Format = Inhaltsart × Spielregel × Tafelansicht. Lobby, Beitritt, Tier, Fortschritt, Übernahme bleiben gemeinsam. Neue Formate brauchen nur Regel und Ansicht.                                                                                    | Neue Formate mit wenig Aufwand; senkt das Risiko für Code und Tests.                                                                      | M     | kein  | Modulvertrag (Audit L1, Rolle 10)                        | 37, 47                                                             |
| M24-8  | **Rechtschreibformate live:** Lückenwort (Wort mit fehlender Stelle aus einer Wortbox) und „Richtig oder falsch geschrieben?“ als Schnellrunde, immer mit Auflösung im richtigen Wortbild.                                                                                               | Zielgruppe Mittelschule, Priorität 1 (Antwort 7).                                                                                         | M     | M     | M24-7; Rolle 20 (Fehlschreibungen nur mit Lösung zeigen) | 55, 57                                                             |
| M24-9  | **Lesen live (später):** kurzer Satz, Ja/Nein-Frage zum Inhalt, Team-Wertung.                                                                                                                                                                                                            | Lesen als Pfeiler 2; aber jede Frage muss geprüft werden.                                                                                 | M     | L     | M24-7; Rolle 21; Lizenz der Texte                        | 58                                                                 |
| M24-10 | **Wochenziel verzeihend:** „X von 5 Schultagen“ statt „X von 7“, ohne „nicht geübt“ für vergangene Tage.                                                                                                                                                                                 | Kein Schuldgefühl am Montag nach einem kranken Freitag.                                                                                   | S     | kein  | –                                                        | 39, Vault 23                                                       |
| M24-11 | **Rückblick „Das kannst du jetzt“:** einmal pro Woche, aus dem Kompetenzprofil: was von „neu“ nach „im Aufbau“ oder „sicher“ gewandert ist. Keine Zahl zum Rückstand.                                                                                                                    | Ehrlicher Fortschritt; zeigt auch einem schwachen Kind Können. Passt zum freiwilligen Wochenrückblick an die Lehrkraft (Bericht 11, W-3). | S     | kein  | Profil verlinkt (Nachtrag 3)                             | 31, 57                                                             |
| M24-12 | **Jugendgerechte Ansprache:** Tier wahlweise als schlichtes Symbol; Texte ohne Kindchenschema; Sterne optional als „5/5 richtig“. Figuren mit Marken (Marvel, Star Wars, Harry Potter, Mario) vor Bezirkseinsatz prüfen oder ersetzen.                                                   | Vierzehnjährige nehmen die Oberfläche ernst.                                                                                              | S     | S     | Rolle 12 (Marken)                                        | 47, Audit E-004                                                    |
| M24-13 | **Erprobung ohne Telemetrie** (Entscheidung 39): Beobachtungsbogen auf Papier für Kollegen, drei Fragen an die Klasse per Handzeichen, je zwei Wochen „Ruhig“, „Gegen die Uhr“, „Team“. Beobachtet wird: Wer gibt auf? Wer rät? Wer will noch eine Runde?                                | Klärt, was an Antwort 5 wirklich das Tempo ist. Ohne Daten auf dem Server.                                                                | S     | kein  | M24-1 bis M24-3                                          | 9, 39                                                              |

Reihenfolge [Empfehlung]: M24-13 vorbereiten, dann M24-1, M24-4 und M24-6
(alles S), danach M24-2 oder M24-3 je nach Entscheidung E-1 und E-3. M24-7 vor
jedem neuen Format. Im Üben allein M24-10 und M24-11 nach der Verlinkung.

### 5.1 Abwägung: Tempo und Wettbewerb

| Variante                                      | So fühlt es sich an          | Für schwache Kinder                                            | Passt zu den Entscheidungen?                                    | Empfehlung                |
| --------------------------------------------- | ---------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| A Wie heute: Tempo-Punkte zuschaltbar, privat | ruhig, fair                  | geschützt                                                      | ja, wenn aus; eingeschaltet widerspricht es Vault 23            | behalten, umbauen (M24-5) |
| B Tempo kollektiv: Klasse gegen Uhr/Rekord    | schnell, gemeinsam           | jeder richtige Beitrag zählt; niemand sieht, wer wenig beitrug | Vault 23 meint individuelle Belohnung; Präzisierung nötig (E-1) | **ja**                    |
| C Tempo privat gegen eigenen Bestwert         | persönliche Herausforderung  | gut, wenn an Genauigkeit gekoppelt (W4)                        | dto.                                                            | ja, als Zusatz            |
| D Rundenteams nach Richtigkeit                | Wettbewerb mit Zugehörigkeit | gut, mit Deckel und Wertung je Kopf (W1, W7)                   | ja (Entscheidung 7: Teamwerte bevorzugt)                        | **ja**                    |
| E Rangliste der Tiere mit Tempo-Punkten       | wie Kahoot                   | schadet vermutlich den Schwächsten (W2, W4, W5)                | nein: Entscheidungen 7, 10, RL-6                                | **nein**                  |

Offen bleibt [Vermutung]: Auch kollektives Tempo kann Druck erzeugen („Wegen
dir schaffen wir den Rekord nicht“). Deshalb zählt in B und D nur Positives,
die Beiträge Einzelner sind nicht sichtbar, und die Erprobung (M24-13) achtet
genau darauf.

## 6. Grenzen und was wir nicht bauen

| Nicht bauen                                                                 | Grund                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Öffentliche Rangliste einzelner Kinder oder Tiere, auch „Top 3“             | Entscheidungen 7, 10; RL-6; schadet laut W2, W4, W5 vor allem den Schwächsten. Tiere sind kein Schutz vor Zuordnung im Klassenzimmer. |
| Frage-Uhr mit Punktabzug nach Antwortzeit                                   | Nimmt dem Live-Raum seinen Vorteil (eigenes Tempo); Arbeitsgedächtnis unter Zeitdruck (W8).                                           |
| Ausscheiden („Wer falsch liegt, fliegt raus“)                               | Die Schwachen spielen am wenigsten; widerspricht „kein Verlust“ (Vault 23).                                                           |
| Ingame-Währung, Glücksräder, Kisten mit Zufallsinhalt                       | „manipulative Zufallsbelohnungen“ (Vault 23, Bewusst nicht); lenkt von der Sache ab.                                                  |
| Punkte, die über die Runde hinaus gesammelt und verglichen werden           | Das wären Häuser; sie ruhen (Nachtrag 4).                                                                                             |
| Serie, die bei einem verpassten Tag auf null fällt                          | Entscheidung 39.                                                                                                                      |
| Störangriffe als Standard, Flimmern bei Kindern mit Anfallsrisiko           | Audit D-012; Barrierefreiheit.                                                                                                        |
| Sitzungsabgleich für Haus- oder Teampunkte über die Runde hinaus jetzt      | Häuser „später“ (Nachtrag 4); Rundenteams brauchen ihn nicht.                                                                         |
| Fehlerdaten einzelner Kinder in neuen Live-Formaten über das Heutige hinaus | RL-3, solange S1 offen ist.                                                                                                           |
| Namen statt Tieren im Live-Raum                                             | RL-4; Frage 4.                                                                                                                        |

Grenzen dieses Berichts: keine Nutzungsdaten; WebFetch gesperrt, alle
Studien nur aus Suchauszügen; Spielmodi von Blooket und Gimkit nur aus
Drittquellen; ob Kollegen Tempo-Punkte oder Battle nutzen, ist unbekannt.

## 7. Offene Entscheidungen für den Entwickler

| Nr. | Frage                                                                                                                                                                                                                                                                                   | Empfehlung                                                                                                                           | Ohne Entscheidung                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| E-1 | Darf Tempo als **gemeinsames** Spielelement kommen (Klasse gegen die Uhr, Klassenrekord) und privat als „schneller als letztes Mal“, wenn die Genauigkeit stimmt? Das präzisiert Vault 23 „Schnelle Antwort: kein eigener Bonus“ zu „kein individueller Bonus im Vergleich zu anderen“. | Ja. Neuer Eintrag im Entscheidungsprotokoll; Vault 23 und Entscheidung 7 gelten sonst unverändert.                                   | Tempo bleibt nur als zuschaltbare Tempo-Punkte; der von dir genannte Reiz „schnell“ wird nicht gestaltet. |
| E-2 | Soll das Battle nach Genauigkeit laden, Störangriffe standardmäßig aus und Absender ungenannt sein?                                                                                                                                                                                     | Ja (M24-4). Das setzt die offenen Empfehlungen aus D-012 und G6 um.                                                                  | Battle belohnt weiter indirekt Tempo.                                                                     |
| E-3 | Dürfen zufällige **Rundenteams** im Live-Raum kommen, obwohl Häuser ruhen?                                                                                                                                                                                                              | Ja. Sie leben nur eine Runde, haben keinen Namen eines Kindes und keinen Punktestand über die Runde hinaus. Häuser bleiben „später“. | Kein Teamformat; Zusammenarbeit bleibt außen vor (W1, W7).                                                |
| E-4 | Sollen Tempo-Punkte in der heutigen Form (Zeichen pro Sekunde) entfallen und durch M24-5 ersetzt werden?                                                                                                                                                                                | Ja, nach der Erprobung. Vorher Kollegen fragen, ob sie sie nutzen.                                                                   | Die Option bleibt; bei Mathe misst sie wenig Sinnvolles.                                                  |
| E-5 | Wochenanzeige auf „von 5 Schultagen“ umstellen?                                                                                                                                                                                                                                         | Ja (M24-10).                                                                                                                         | Kinder sehen am Montag Lücken vom Wochenende.                                                             |
| E-6 | Was geschieht mit Markenfiguren (Marvel, Star Wars, Harry Potter, Mario) vor dem Einsatz im Schulamtsbezirk?                                                                                                                                                                            | Vor der Öffnung prüfen lassen oder durch freie Figuren ersetzen; Rolle 12 einbeziehen.                                               | Markenrisiko wächst mit jeder Schule.                                                                     |
| E-7 | Willst du die Erprobung (M24-13) mit zwei bis drei Kollegen vor dem Bau von M24-2 und M24-3 machen?                                                                                                                                                                                     | Ja, mit Papierbogen und ohne Daten. Sie klärt, was „schnell, spielerisch, motivierend“ genau meint.                                  | Gebaut wird auf Vermutungen über den Reiz.                                                                |

## Quellen

Alle abgerufen am 10.11.2026 über die Websuche (nur Auszüge, Volltext
ungeprüft). Nur zitiert, keine Inhalte übernommen; Lizenzen daher nicht
einschlägig.

| Nr. | Quelle                                                                                                                                                       | Adresse                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Sailer, M. & Homner, L. (2020): The Gamification of Learning: a Meta-analysis. Educational Psychology Review 32, 77–112                                      | https://link.springer.com/article/10.1007/s10648-019-09498-w                                                                                                           |
| W2  | Hanus, M. D. & Fox, J. (2015): Assessing the effects of gamification in the classroom. Computers & Education 80, 152–161                                     | https://dblp.org/rec/journals/ce/HanusF15                                                                                                                              |
| W3  | Rodrigues, L. u. a. (2022): Gamification suffers from the novelty effect but benefits from the familiarization effect. IJETHE                                | https://dro.dur.ac.uk/36081                                                                                                                                            |
| W4  | Johannes-Gutenberg-Universität Mainz, Gutenberg School of Management and Economics, Discussion Paper 1908 (Feldexperiment zu relativer Leistungsrückmeldung) | https://download.uni-mainz.de/RePEc/pdf/Discussion_Paper_1908.pdf (nicht abrufbar)                                                                                     |
| W5  | Konferenzbeitrag GaLA 2020 zu Ranglisten (Universität Tampere)                                                                                               | https://trepo.tuni.fi/bitstream/10024/130150/1/GaLA_Conf_2020_paper_leaderboard.pdf                                                                                    |
| W6  | Studie zu relativen Ranglisten, HKU Scholars Hub                                                                                                             | https://hub.hku.hk/bitstream/10722/368255/1/content.pdf                                                                                                                |
| W7  | Cooperative Learning Methods: A Meta-Analysis (164 Studien, acht Methoden)                                                                                   | https://typeset.io/pdf/cooperative-learning-methods-a-meta-analysis-1gsgjl6t24.pdf                                                                                     |
| W8  | Übersicht zu Mathe-Angst und Arbeitsgedächtnis                                                                                                               | https://mrbartonmaths.com/research/anxiety.html                                                                                                                        |
| W9  | Hechinger Report: Proof Points – Do math drills help children learn?                                                                                         | https://hechingerreport.org/proof-points-do-math-drills-help-children-learn/                                                                                           |
| W10 | Kahoot Support: How points work; Accuracy experience; Team experience                                                                                        | https://support.kahoot.com/hc/articles/115002303908, https://support.kahoot.com/hc/articles/39818967108627, https://support.kahoot.com/hc/en-us/articles/4408679135891 |
| W11 | Vergleichsseiten Blooket/Gimkit/Kahoot (Drittanbieter, teils mit Eigeninteresse)                                                                             | https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/, https://nibble-app.com/blog/blooket-vs-gimkit                                                                    |
