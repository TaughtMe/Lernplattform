---
tags:
  - lernplattform
  - vision
  - roadmap
status: vorschlag
stand: 2026-11-11
umsetzungsstand: Vorgeschlagen
---

# Roadmap

> **Dieses Kapitel ist ein Vorschlag des Expertengremiums vom 11.11.2026. Nichts davon ist beschlossen.** Maßgeblich bleiben das [[../19 - Entscheidungsprotokoll/Anwendung|Entscheidungsprotokoll]] und die Berichte unter `docs/vision/`. Maßstab für Zuschnitt und Zeit ist der Bericht des Red Teams (`docs/vision/40-red-team.md`); wo der Entwickler am 11.11.2026 anders entschieden hat, gilt seine Antwort.

## Die Rechnung dahinter

- Die Fachberichte schlagen **146 Bausteine** vor. Das sind drei bis fünf Jahre.
- Angenommen sind **sechs Stunden in der Woche**, davon zwei für das Prüfen von Inhalten. Eine eigene Zahl des Entwicklers gibt es nicht; stimmt die Annahme nicht, verschieben sich alle Termine.
- Knapp ist nicht das Programmieren. Welle 3 mit fünf Paketen war in zwei Tagen gebaut. Knapp ist die **Abnahme**: entscheiden, am Gerät ansehen, im Unterricht ausprobieren, Inhalte prüfen. Der Beleg: Drei fertige Seiten waren freigegeben und nirgends verlinkt, und niemand hat es im Gebrauch bemerkt.
- Deshalb: **rund 65 meist kleine Bausteine in drei Etappen**, eine Inhaltslinie zur Zeit, und jede Etappe endet mit einer Woche ohne neuen Code.

Die Bausteine tragen die Nummern der Berichte: R12 Recht und Betrieb, R20 Rechtschreibung, L21 Lesen, MA Mathematik, R23 Vokabeln, M24 Motivation und Live-Raum, L25 Alltag der Lehrkraft, F30 Förderkreislauf, I31 Inklusion, W Wettbewerb. Aufwand: S bis etwa eine Woche, M zwei bis vier Wochen (nach dem Maßstab der Berichte; die reine Bauzeit ist kürzer). Die Stunden für die Abnahme sind eine Überschlagsrechnung nach der Formel des Red Teams (1,5 Stunden je S, 5 je M) [Vermutung].

## Anschluss an die laufende Audit-Roadmap

Die Vision ersetzt die offenen Punkte nicht, sie ordnet sie ein:

| Offener Punkt | Wo er hier steht |
| --- | --- |
| S1 Einsatzrahmen mit Schulleitung und Datenschutz | Etappe 1 (R12-1); Tor für alles mit Namen und für jede weitere Schule |
| S14 Beobachtungsphase | Etappe 1 (Beobachtungsheft F30-12) |
| M4 neutrale Hilfen | nur zum Teil: Vorlesen in der Aufgabe, „Aufgabe bleibt sichtbar“ |
| M8 Kurzbericht an die Lehrkraft | nach S1; vorher „Kind zeigt seinen Stand“ (Etappe 3) |
| L1 Modulvertrag | kein eigenes Projekt; ein dünnes Inhaltsformat in Etappe 2 (F30-1) |
| Welle 3: `lehrer-geraet` freigeben | Etappe 1 (L25-9) |
| Welle 3: Stufenfolgen des Startpunkts, Regel „sicher“ | Etappe 2 (F30-6) und Etappe 3 (F30-3, F30-7) |
| Welle 3: Uhr über Module hinweg | geht im Schnellstart mit Uhr auf (L25-1, Etappe 2) |
| Welle 3: „Beenden“ mit 24 Stunden „Weitermachen“; Cloud-Abgleich aus den Kindereinstellungen | vom Gremium nicht behandelt; bleiben offen |
| Version 0.9.7: `/lehrer/aufgaben` in alter Oberfläche | beim Umbau des Auftrags mit erledigen (L25-5, Etappe 3) |

Quellen: `docs/umsetzungsplan-audit-welle-3.md` („Offene Entscheidungen des Entwicklers“), `docs/version-0.9.7.md` („Offen“).

## Sofort reparieren

Unabhängig von jeder Vision. Alles ist klein. Geordnet nach Schaden für Kinder, dann nach Aufwand (Bericht 40, Abschnitt 10; am Code vom 11.11.2026 bestätigt). Damit kann die Arbeit in den Testtagen von Fable beginnen.

| Rang | Was | Was zu tun ist | Deine Zeit |
| --- | --- | --- | --- |
| 1 | **Fachfehler in Wortboxen und Texten.** „Ferien“ steht bei „Langes i“; ie hat die Strategie „Merken“; „Club“, „Job“, „Zugweg“, „Zieltür“, „Fehlwort“ sind keine tauglichen Beispiele; „Mädchen“, „Käfer“, „Säge“ lassen sich nicht ableiten und stehen auch im Startpunkt; „Weg“ und „weg“ gelten als gleich klingend; ein Text führt „nah“ als Dehnungs-h. | R20-1 umsetzen. Ungeprüfte Texte sofort ausblenden, 15 prüfen (R20-13). Vorher die Frage zur s-Regel beantworten ([[Offene Entscheidungen]], Nr. 6). | etwa 1 Stunde, dazu 2 Stunden für die Texte |
| 2 | **Startpunkt, Training und Stand sind nicht verlinkt.** Seit dem 05.11. freigegeben, nur über die eingetippte Adresse erreichbar. | Verlinken. Dabei „Kompetenzprofil“ in „Mein Stand“ umbenennen (F30-13). | ansehen |
| 3 | **Sprachausgabe ohne Filter.** An vier Stellen kann der Browser eine Netzstimme wählen; dann geht das Wort an einen fremden Dienst. Entscheidung 58 sagt „nur lokale Stimmen“. | Alle Stellen über eine Funktion führen. Erst die Stimmen auf drei Gerätearten prüfen (R23-7), dann auf „nur lokal“ umstellen, mit Hinweis statt stillem Wegfall. | 30 Minuten an drei Geräten |
| 4 | **Vorlese-Knopf nirgends eingebaut.** Er ist seit Entscheidung 58 in Aufgaben erlaubt und fertig. | In Aufgabenstellungen einsetzen (I31-1). | ansehen |
| 5 | **Fehler im Entscheidungsprotokoll.** Entscheidung 54 nennt die Texte „geprüft“; Entscheidung 53 fehlt; mehrere Festlegungen vom 27.10. stehen nur in Plänen; der Index ist stellenweise veraltet. | Einträge nachtragen. Entwürfe stehen in [[Offene Entscheidungen]]; das Gremium durfte das Protokoll nicht ändern. | lesen und freigeben |
| 6 | **Battle: Störangriffe und Flimmern sind Standard.** | Standard aus, Angriffe laden über Genauigkeit (M24-4; zugesagt). | – |
| 7 | **Markenfiguren im Einsatz** (Star Wars, Marvel, Harry Potter, Mario und andere). | Durch eigene Fantasiefiguren ersetzen, vor jeder Lizenzdatei und jeder weiteren Schule (M24-12, gekürzt). | Figuren auswählen |
| 8 | **Das Impressum untersagt den Schulbetrieb**, der stattfindet. | Ehrlich fassen (R12-3). | lesen |

## Etappe 1: Reparieren, klären, messen (bis Februar 2027)

**Ziel.** Nichts Bekanntes ist mehr falsch. Kopfrechnen übt die Hürde. Die eigene Schule kennt den Einsatz. Lernraum darf weitergeführt werden, wenn du ausfällst. Ein erstes eigenes Messergebnis liegt vor.

| Gruppe | Bausteine |
| --- | --- |
| Sofortliste | R20-1, R20-13, F30-13, R23-7 mit R12-10, I31-1, M24-4, M24-12 (nur Markenfiguren), R12-3 |
| Mathe | MA-1 (Aufgaben mit Hürde), MA-2 (Fehlerarten richtig benennen), MA-3 (Nachübung trifft den Fehler), MA-5 („sicher“ heißt auch über den Zehner) |
| Live-Raum | M24-1 (Klassenziel an der Tafel), L25-10 („Kopfrechnen live“ mit einem Knopf), I31-9 (Fehler an der Tafel erst ab sechs Kindern) |
| Kind | L25-2 (Startvorschlag wird eingestellt), M24-10 (Wochenziel „von 5 Schultagen“), I31-4 (Anzeigen zählen nach oben), I31-12 (Regel gegen wachsende Textmengen) |
| Lehrergerät | L25-9 (Tablet sperrbar, `lehrer-geraet` frei) |
| Recht und Betrieb | R12-1 (Gespräch mit Schulleitung und Datenschutz), R12-4 (Vertrag mit Supabase, IP-Kennung absichern), R12-5 (Server über die Ferien wach halten), R12-11 („Meine Daten löschen“), R12-14 (zweite Person mit Zugang, Notfallblatt) |
| **Lizenz** | R12-12: Code unter EUPL-1.2, Inhalte unter CC BY-SA 4.0 in eigenen Dateien |
| Messen, ohne Code | F30-12 Beobachtungsheft mit Wirksamkeitsprobe (enthält L25-15, M24-13, I31-14); R20-16 (Test mit dem Stift); 100 echte Falschschreibungen von Hand zuordnen |

**Die Lizenz gehört in diese Etappe** (Entscheidung des Entwicklers vom 11.11.2026). Reihenfolge:

1. Markenfiguren ersetzen.
2. Bildrechte festhalten: Die Tierbilder stammen von Coco Material und sind laut Anbieter frei nutzbar. Die Nutzungsbedingungen im Original ablegen und mit CC BY-SA abgleichen; notfalls liegen die Bilder getrennt unter ihren eigenen Bedingungen.
3. Urheberschaft und Lizenz der Vorgänger-Repositories für LernBox und Laufdiktat klären (`docs/upstream-integration.md`).
4. Wortboxen und Texte aus dem Programmcode in eigene Dateien verschieben, damit die Inhaltslizenz eindeutig gilt. Noch kein neues Format; das folgt in Etappe 2.
5. Lizenzdateien anlegen, Quellenliste je Datei, Name und Logo „Lernraum“ ausnehmen.

Das ist keine Rechtsberatung. Offene Punkte dazu stehen in [[Offene Entscheidungen]], Nr. 3.

- **Entwicklungsaufwand:** fast nur S. Abnahme etwa 45 bis 50 Stunden.
- **Prüfaufwand der Lehrkraft:** etwa 6 Stunden (Korrekturen, 15 Texte, Wortsätze der Probe, Sichten der Falschschreibungen).
- **Voraussetzungen:** ein Termin für R12-1, am besten vor den Weihnachtsferien; drei Gerätearten für die Stimmenprüfung; eine zweite Person für R12-14.
- **Wenn die Zeit nicht reicht**, wandern zuerst M24-10, I31-12 und MA-5 nach Etappe 2 [Empfehlung]. Sofortliste, Lizenz, R12-1 und das Beobachtungsheft bleiben.

**Woran du es im Unterricht merkst.** Eine Kollegin startet Kopfrechnen mit einem Knopf, und fast jede Aufgabe geht über den Zehner. An der Tafel wächst ein gemeinsamer Balken. Die erste Stunde nach den Ferien scheitert nicht am eingeschlafenen Server. Du hast auf Papier ein Ergebnis: Bei wie vielen Kindern liegen die geübten Wörter vorn?

## Etappe 2: Schnellstart (bis Pfingsten 2027)

**Ziel.** Tablet in die Hand: In drei Minuten läuft eine passende Übung in Rechtschreibung oder Mathe, mit Strategie am Fehler.

| Gruppe | Bausteine |
| --- | --- |
| Einstieg | L25-1 (Schnellstart „20 Minuten üben“ mit Uhr und Auffüllen, enthält F30-5 gekürzt), L25-3 (Drei-Tipp-Wahl der Lehrkraft), F30-6 mit R20-9 und MA-4 (ein Startpunkt mit einer Regel und einer Aufwärmaufgabe, I31-8) |
| Grundlage | F30-1 (ein dünnes Inhaltsformat; die Prüfliste ist eine erzeugte Tabelle, keine neue Ansicht in der App), F30-2 (eine Themenliste mit Namen in Kinderworten), R20-2 (Kernwort mit Stelle, Strategie, Beweis- und Kontrastwort) |
| Rechtschreibung | R20-3 (die ersten 120 Kernwörter in drei bis vier Phänomenen), R20-5 (Strategie am Fehler), R20-6 mit R20-7 gekürzt (Kontrastrunde; „erst Beweiswort, dann Wort“), R20-10 (Längenstriche weg), R20-14 („Schreib ins Heft“), I31-6 (Wortbox „lautgetreu und Silbe“) |
| Mathe | MA-11 (Zehnereinmaleins, große Zahlen, Komma, Geld, Größen), MA-13 (Mathe in „Mein Stand“) |
| Lehrkraft und Schule | F30-9 mit L25-14 (eine Verweisseite zu Levumi und Fördermaterial; eine Kurzanleitung; eine Seite für die Schulleitung), R12-2 gekürzt (Schulpaket auf zwei Seiten, nach dem Gespräch) |
| Live-Raum, klein | I31-10 gekürzt (Option „Aufgabe bleibt sichtbar“) |

**Nicht mehr enthalten:** Tandem-Begleiter und Chorlesen (L21-1, L21-2). Das Red Team hatte sie hier eingeplant; der Entwickler hat am 11.11.2026 entschieden, dass sie im Unterricht schwer umzusetzen sind.

- **Entwicklungsaufwand:** sechs bis sieben M, der Rest S. Abnahme etwa 55 Stunden. Das ist die **engste Etappe**: Bis Pfingsten stehen bei sechs Wochenstunden etwa 65 Stunden bereit, davon rund 45 für alles außer Inhalten. Es geht nur auf, wenn Etappe 1 pünktlich endet oder die Ferien mehr Zeit bringen.
- **Prüfaufwand der Lehrkraft:** etwa 12 Stunden (120 Kernwörter, Startpunkt-Aufgaben, Regeltabellen Mathe, unterste Wortbox, Texte der Seiten). Bei den ersten 30 Wörtern die Zeit stoppen.
- **Voraussetzungen:** Verlinkung und Stimmenprüfung aus Etappe 1; die Fachfehler sind behoben; das Gespräch R12-1 hat stattgefunden.
- **Wenn die Zeit nicht reicht**, wandern R20-10, R20-14 und MA-13 nach Etappe 3 [Empfehlung].

**Woran du es im Unterricht merkst.** Du gibst einem Kind das Koffer-Tablet, sagst „Rechtschreibung“ und setzt dich. Es fragt dich nichts. Nach 20 Minuten zeigt es dir die Abschlussseite. Ein Kind aus der 8. Klasse beginnt im Rechnen nicht bei 3 + 4.

## Etappe 3: Englisch-Grundlagen und Auftrag (bis November 2027)

**Ziel.** Eine Vokabelrunde läuft live ohne Vorbereitung. Ein Auftrag öffnet die Übung. Das Kind zeigt seinen Stand.

| Gruppe | Bausteine |
| --- | --- |
| Englisch | R23-1 (im gemeinsamen Inhaltsformat), R23-2 (250 Wortpaare „Grundlagen“ mit Wortart), R23-4 (Themen frei üben, „In meine LernBox“), R23-19 (Vokabelrunde live aus dem Grundwortschatz), R23-13 (ein Satz beim Teilen) |
| Auftrag | L25-4 (Übungskarten mit QR für mitgelieferte Übungen), L25-5 (Auftrag öffnet die Übung, gezählte Runden), L25-11 (Namensliste einfügen; Klasse ins neue Schuljahr bis Juli 2027) |
| Stand und Rückmeldung | L25-7 („Meinen Stand zeigen“), F30-3 (Abschreiben zählt nicht mehr für „sicher“), F30-7 gekürzt (Zählung in Wörtern, „mündlich gewusst“), MA-14 (Fehler der Klasse nach Merkmal) |
| Rechtschreibung | R20-3 (bis 300 Kernwörter), M24-6 (Wortboxen als Quelle im Live-Raum) |
| **Nur bei gutem Ergebnis der Beobachtung** | R20-8 mit F30-4 (Übung aus dem eigenen Fehlermuster), L25-8 (Klassengerät-Modus), M24-2 (Klasse gegen die Uhr) |

- **Entwicklungsaufwand:** vier M, der Rest S. Abnahme etwa 35 bis 40 Stunden; mit den drei bedingten Bausteinen etwa 50.
- **Prüfaufwand der Lehrkraft:** etwa 10 Stunden (250 Wortpaare, weitere 180 Kernwörter).
- **Voraussetzungen:** Etappe 2 ist im Unterricht erprobt; das Beobachtungsheft ist ausgewertet. L25-5 wird ohne Klarnamen erprobt, solange S1 offen ist.

**Woran du es im Unterricht merkst.** Fünf Minuten vor dem Gong: Englisch live, Thema „Essen“, ohne eine Vokabel getippt zu haben. Die Hausaufgabe ist ein QR-Code an der Tafel. Am nächsten Tag steht auf deinem Gerät „3 von 3 Runden“.

## Ab wann der Prüfstein gilt

| Lage | Erfüllt ab | Einschränkung |
| --- | --- | --- |
| Live-Raum | heute | die Lehrkraft muss einen Raum öffnen |
| Fremdes Gerät, Mathe | Etappe 2 | – |
| Fremdes Gerät, Rechtschreibung | Etappe 2 | nur mit deutscher Stimme auf dem Gerät; ob Schulgeräte eine haben, klärt Etappe 1 |
| Fremdes Gerät, Englisch | Etappe 3 | – |
| Eigenes Gerät | Etappe 2 | „aus eigenen Fehlermustern“ frühestens Ende Etappe 3, und nur nach guter Probe |
| Lesen | nicht in zwölf Monaten | – |

„Genau das, was es braucht“ erfüllt ein fremdes Gerät nie. Ehrlich ist: in drei Minuten passend eingestellt.

## Später

Nicht in den zwölf Monaten. Die Reihenfolge entscheidest du.

| Thema | Bausteine | Warum nicht früher |
| --- | --- | --- |
| Großschreibung, das/dass im Satz | R20-11, R20-12 | größter Einzelposten; eigentlicher Stoff der Mittelschule |
| **Leseverständnis** | L21-5, L21-6, L21-8, L21-10 | 8 bis 10 Stunden Prüfzeit; neuer Bereich. Lautlese-Formate (L21-1, -2, -4, -7) höchstens als Zusatz |
| Englisch-Ausbau, Lückensatz, Hörmodus, Formenreihen | R23-3, R23-5, R23-6, R23-8 bis R23-12 | 15 bis 20 Stunden Prüfzeit; erst den Bestand erproben |
| Brüche und Prozent; Bilder als Hilfe; Flüssigkeit | MA-12, MA-6 bis MA-9, F30-8 | erst bei belegtem Bedarf; Antwortzeit enthält Tippzeit |
| Kurzbericht per QR | R12-7, L25-13, F30-11, R20-15, L25-12 | erst nach S1 |
| Rückblick, Stufe „gefestigt“, „Das kannst du jetzt“ | F30-10, M24-11 | setzen Kinder voraus, die über Monate am selben Gerät üben |
| Teams, weitere Live-Formate | M24-3, M24-7, M24-8, R23-20, MA-10 | erst die Erprobung; neue Formate bringen neue Daten auf den Server |
| Häuser und Hauspunkte | R12-8 | ruhen (Antwort des Entwicklers); braucht eine neue Entscheidung |
| Deutsch als Zweitsprache; Bilder | R23-17, I31-13, I31-11 | Warteliste |
| Nur bei Bedarf | R12-6 (Profil „Nur lokal“), I31-5 (Bedienung mit einem Finger), L25-6 (Startkarte) | erst prüfen, ob jemand es braucht |

## Streichliste

Das soll die Vision nicht enthalten (Bericht 40, Abschnitt 8.2):

| Gestrichen | Grund |
| --- | --- |
| „Mega-Plattform“; eine gemeinsame Landkarte über alle Fächer | nicht leistbar; Scheingenauigkeit |
| „Jede Schule“ oder „der Bezirk“ als Zusage für zwölf Monate | hängt an S1 und an einem Träger, nicht am Code. Realistisch: die eigene Schule förmlich, dann zwei bis drei Pilotschulen |
| Wirkung auf PISA, Abschlüsse, Chancengerechtigkeit | kein Beleg |
| Weitere Sprachen, Brückensprachen (R23-15, -16, -18) | nicht die Zielgruppe; fremde Prüferinnen |
| Lesen live (L21-9, M24-9) | hohe Prüfzeit, neues Raumformat |
| Eigene Tonaufnahmen, Texte der Lehrkraft weitergeben (R12-13, L21-14, L21-15) | Dauerlast je Wort; Rechtsfrage |
| Lernstand über den Server | neuer Datenfluss; widerspricht dem Kern |
| Lehrplanzuordnung in der Oberfläche (W-6); Link in mebis vor der Freigabe (W-8) | Pflege bei jeder Lehrplanänderung; Schulen kämen vor der Klärung |
| Prüfansicht in der App | eine erzeugte Tabelle leistet dasselbe |
| Einstellungsblatt für Hilfen (I31-2), Steuerung nach Erfolgsquote (I31-3) | Antwort des Entwicklers vom 10.11.; dritte Steuerregel ohne Daten |
| Handschrifterkennung, Nachspuren, Anlautlehrgang, eigene Diagnostik | von den Fachberichten selbst ausgeschlossen |

## Siehe auch

- [[Anwendung|Vision]] · [[Kompetenzlandkarte]] · [[Förderkreislauf]] · [[Wettbewerbsvergleich]] · [[Offene Entscheidungen]]
- [[../17 - Entwicklungsplan/Anwendung|Entwicklungsplan]], [[../18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]], [[../21 - Qualitätsgrundlage und Freigabe/Anwendung|Qualitätsgrundlage und Freigabe]]
- Repository: `docs/vision/40-red-team.md`, `docs/umsetzungsplan-audit-welle-3.md`, `docs/version-0.9.7.md`
